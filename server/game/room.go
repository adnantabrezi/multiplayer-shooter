package game

import (
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

type ClientConn struct {
	ID        string
	DataChan  *webrtc.DataChannel
	WSConn    *websocket.Conn
	Player    *Player
	LastInput ClientInput
	writeMu   sync.Mutex
	Mu        sync.Mutex
}

func (c *ClientConn) WriteJSON(v interface{}) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.WSConn != nil {
		return c.WSConn.WriteJSON(v)
	}
	if c.DataChan != nil && c.DataChan.ReadyState() == webrtc.DataChannelStateOpen {
		bytes, err := json.Marshal(v)
		if err != nil {
			return err
		}
		return c.DataChan.SendText(string(bytes))
	}
	return fmt.Errorf("connection closed")
}

func (c *ClientConn) WriteBinary(data []byte) error {
	c.writeMu.Lock()
	defer c.writeMu.Unlock()
	if c.WSConn != nil {
		return c.WSConn.WriteMessage(websocket.BinaryMessage, data)
	}
	if c.DataChan != nil && c.DataChan.ReadyState() == webrtc.DataChannelStateOpen {
		return c.DataChan.Send(data)
	}
	return fmt.Errorf("connection closed")
}


type Room struct {
	Code          string
	MapID         string
	GameMode      string
	BotCount      int
	BotDifficulty string
	MaxPlayers    int
	TimeRemaining float64
	IsStarted     bool

	mu           sync.RWMutex
	clients      map[string]*ClientConn
	players      []*Player
	bullets      []Bullet
	grenades     []GrenadeEntity
	explosions   []Explosion // pending explosion events for next snapshot
	pickups       []WeaponPickup
	healthCrates  []HealthCrate
	boosterCrates []HealthCrate
	killFeed      []KillFeedEntry
	blueZone      *BlueZoneState
	airDrops      []AirDrop

	tickSeq        uint64
	snapshotCounter int // counter to throttle snapshot broadcast to 20Hz
	stopChan chan struct{}
	hub      *Hub
}

func NewRoom(code, mapID, mode string, botCount int, botDiff string, matchDuration int, hub *Hub) *Room {
	gameMap, ok := Maps[mapID]
	if !ok {
		gameMap = Maps["outpost"]
	}

	duration := float64(matchDuration)
	if duration < 120.0 {
		duration = 300.0 // 5 min default
	} else if duration > 600.0 {
		duration = 600.0 // 10 min max
	}

	r := &Room{
		Code:          code,
		MapID:         mapID,
		GameMode:      mode,
		BotCount:      0,
		BotDifficulty: botDiff,
		MaxPlayers:    8,
		TimeRemaining: duration,
		IsStarted:     true,

		clients:  make(map[string]*ClientConn),
		players:  make([]*Player, 0),
		bullets:  make([]Bullet, 0),
		grenades:   make([]GrenadeEntity, 0),
		explosions: make([]Explosion, 0),
		stopChan: make(chan struct{}),
		hub:      hub,
	}

	if mode == "battle-royale" {
		r.blueZone = &BlueZoneState{
			CenterX:       gameMap.Width / 2.0,
			CenterY:       gameMap.Height / 2.0,
			CurrentRadius: math.Max(gameMap.Width, gameMap.Height) * 0.85,
			TargetRadius:  math.Max(gameMap.Width, gameMap.Height) * 0.85,
			Phase:         1,
			IsShrinking:   false,
			ShrinkTimer:   25.0,
			DamagePerSec:  4.0,
		}
	}

	// Initialize Map Pickups & Crates with Random Weapons
	availWeapons := []string{"ar", "sniper", "smg"}
	for i, w := range gameMap.WeaponSpawns {
		randW := availWeapons[rand.Intn(len(availWeapons))]
		r.pickups = append(r.pickups, WeaponPickup{
			ID:          fmt.Sprintf("pickup_%d", i),
			WeaponType:  randW,
			X:           w.X,
			Y:           w.Y,
			Ammo:        Weapons[randW].MagazineSize,
			RespawnTime: 0,
		})
	}

	for i, h := range gameMap.HealthSpawns {
		r.healthCrates = append(r.healthCrates, HealthCrate{
			ID:           fmt.Sprintf("health_%d", i),
			X:            h.X,
			Y:            h.Y,
			Active:       true,
			RespawnTimer: 0,
		})
	}

	bSpawns := gameMap.BoosterSpawns
	if len(bSpawns) == 0 {
		for _, h := range gameMap.HealthSpawns {
			bSpawns = append(bSpawns, Vector2D{X: h.X + 120, Y: h.Y})
		}
	}
	for i, b := range bSpawns {
		r.boosterCrates = append(r.boosterCrates, HealthCrate{
			ID:           fmt.Sprintf("booster_%d", i),
			X:            b.X,
			Y:            b.Y,
			Active:       true,
			RespawnTimer: 0,
		})
	}

	// Multiplayer is human players only - NO BOTS in multiplayer rooms
	// r.spawnBots(gameMap)

	// Start 60Hz Server Tick Loop
	go r.runLoop()

	return r
}

func (r *Room) spawnBots(gameMap GameMap) {
	botNames := []string{"Bot Bob", "Bot Alex", "Bot Viper", "Bot Razor", "Bot Titan", "Bot Ghost", "Bot Shadow", "Bot Cobra"}
	for i := 0; i < r.BotCount; i++ {
		spawnPt := gameMap.Spawns[(i+1)%len(gameMap.Spawns)]
		botID := fmt.Sprintf("bot_%d_%d", time.Now().UnixNano(), i)
		name := botNames[i%len(botNames)]

		bot := &Player{
			ID:            botID,
			Name:          name,
			IsBot:         true,
			BotDifficulty: r.BotDifficulty,
			Team:          "none",
			Avatar: AvatarConfig{
				Headgear:      "helmet_commander",
				HairColor:     "#2d3436",
				SkinTone:      "#ffeaa7",
				EyeStyle:      "angry",
				FacialHair:    "mustache",
				OutfitColor:   "#d35400",
				OutfitPattern: "camo",
				Name:          name,
			},
			X:               spawnPt.X,
			Y:               spawnPt.Y,
			Radius:          18,
			FacingRight:     true,
			Health:          100,
			MaxHealth:       100,
			Nitro:           100,
			MaxNitro:        100,
			PrimaryWeapon:   "m4",
			SecondaryWeapon: "pistol",
			ActiveSlot:      "primary",
			CurrentMag:      30,
			ReserveAmmo:     120,
			FragCount:       2,
			Opacity:         1.0,
		}
		r.players = append(r.players, bot)
	}
}

func (r *Room) AddClient(dc *webrtc.DataChannel, clientID string, avatar AvatarConfig) *ClientConn {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Guard: If this client already exists in the room, remove the old player first
	// This prevents duplicate characters when a client re-joins or double-clicks
	if _, exists := r.clients[clientID]; exists {
		delete(r.clients, clientID)
		newPlayers := make([]*Player, 0, len(r.players))
		for _, p := range r.players {
			if p.ID != clientID {
				newPlayers = append(newPlayers, p)
			}
		}
		r.players = newPlayers
	}

	gameMap := Maps[r.MapID]
	spawnPt := gameMap.Spawns[len(r.clients)%len(gameMap.Spawns)]

	p := &Player{
		ID:              clientID,
		Name:            avatar.Name,
		IsBot:           false,
		Team:            "none",
		Avatar:          avatar,
		X:               spawnPt.X,
		Y:               spawnPt.Y,
		Radius:          18,
		FacingRight:     true,
		Health:          100,
		MaxHealth:       100,
		Nitro:           100,
		MaxNitro:        100,
		PrimaryWeapon:   "ar",
		SecondaryWeapon: "smg",
		ActiveSlot:      "primary",
		CurrentMag:      30,
		ReserveAmmo:     120,
		SecondaryMag:    35,
		SecondaryReserve: 140,
		FragCount:       3,
		ActiveGrenade:   "frag",
		Opacity:         1.0,
	}

	c := &ClientConn{
		ID:       clientID,
		DataChan: dc,
		Player:   p,
	}

	r.clients[clientID] = c
	r.players = append(r.players, p)

	// Send initial joined confirmation
	msg := ServerMessage{
		Type:     "joined",
		RoomCode: r.Code,
		MapID:    r.MapID,
		ClientID: clientID,
	}
	c.WriteJSON(msg)

	return c
}

func (r *Room) AddClientWS(ws *websocket.Conn, clientID string, avatar AvatarConfig) *ClientConn {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.clients[clientID]; exists {
		delete(r.clients, clientID)
		newPlayers := make([]*Player, 0, len(r.players))
		for _, p := range r.players {
			if p.ID != clientID {
				newPlayers = append(newPlayers, p)
			}
		}
		r.players = newPlayers
	}

	gameMap := Maps[r.MapID]
	spawnPt := gameMap.Spawns[len(r.clients)%len(gameMap.Spawns)]

	p := &Player{
		ID:               clientID,
		Name:             avatar.Name,
		IsBot:            false,
		Team:             "none",
		Avatar:           avatar,
		X:                spawnPt.X,
		Y:                spawnPt.Y,
		Radius:           18,
		FacingRight:      true,
		Health:           100,
		MaxHealth:        100,
		Nitro:            100,
		MaxNitro:         100,
		PrimaryWeapon:    "ar",
		SecondaryWeapon:  "smg",
		ActiveSlot:       "primary",
		CurrentMag:       30,
		ReserveAmmo:      120,
		SecondaryMag:     35,
		SecondaryReserve: 140,
		FragCount:        3,
		ActiveGrenade:    "frag",
		Opacity:          1.0,
	}

	c := &ClientConn{
		ID:     clientID,
		WSConn: ws,
		Player: p,
	}

	r.clients[clientID] = c
	r.players = append(r.players, p)

	msg := ServerMessage{
		Type:     "joined",
		RoomCode: r.Code,
		MapID:    r.MapID,
		ClientID: clientID,
	}
	c.WriteJSON(msg)

	return c
}

func (r *Room) RemoveClient(clientID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.clients, clientID)
	newPlayers := make([]*Player, 0, len(r.players))
	for _, p := range r.players {
		if p.ID != clientID {
			newPlayers = append(newPlayers, p)
		}
	}
	r.players = newPlayers

	if len(r.clients) == 0 {
		close(r.stopChan)
		r.hub.RemoveRoom(r.Code)
	}
}

func (r *Room) ProcessInput(clientID string, input ClientInput) {
	r.mu.RLock()
	c, ok := r.clients[clientID]
	r.mu.RUnlock()

	if !ok || c.Player.IsDead {
		return
	}

	c.Mu.Lock()
	c.LastInput = input
	c.Player.AimAngle = input.AimAngle
	c.Mu.Unlock()

	// Firing / Actions
	r.mu.Lock()
	p := c.Player
	gameMap := Maps[r.MapID]

	// Handle weapon shooting
	w := GetWeapon(p.PrimaryWeapon)
	if input.IsShooting && time.Now().UnixMilli()-p.LastShotTime > int64(1000.0/w.FireRate) {
		if p.CurrentMag > 0 && !p.IsReloading {
			p.CurrentMag--
			p.LastShotTime = time.Now().UnixMilli()

			if p.CurrentMag <= 0 && p.ReserveAmmo > 0 {
				p.IsReloading = true
				p.ReloadProgress = 0
			}

			// Jetpack recoil pulse
			p.Vx -= math.Cos(p.AimAngle) * (w.Recoil * 0.4)
			p.Vy -= math.Sin(p.AimAngle) * (w.Recoil * 0.4)

			// Calculate exact gun muzzle tip position from shoulder pivot (matching client)
			shoulderX := p.X
			if p.FacingRight {
				shoulderX += 2
			} else {
				shoulderX -= 2
			}
			shoulderY := p.Y - 2
			if p.IsCrouching {
				shoulderY = p.Y - 10
			}
			startX := shoulderX + math.Cos(p.AimAngle)*30
			startY := shoulderY + math.Sin(p.AimAngle)*30

			for b := 0; b < w.BulletsPerShot; b++ {
				spreadAngle := p.AimAngle + (rand.Float64()-0.5)*w.Spread
				vx := math.Cos(spreadAngle) * w.BulletSpeed
				vy := math.Sin(spreadAngle) * w.BulletSpeed

				r.bullets = append(r.bullets, Bullet{
					ID:               fmt.Sprintf("b_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
					ShooterID:        p.ID,
					WeaponType:       w.ID,
					X:                startX,
					Y:                startY,
					Vx:               vx,
					Vy:               vy,
					Damage:           w.Damage,
					Color:            w.Color,
					Radius:           3,
					Life:             80,
					MaxLife:          80,
					MaxRange:         w.MaxRange,
					DistanceTraveled: 0,
					Alpha:            1.0,
					IsExplosive:      w.Category == "heavy" && w.ID == "rocket",
				})
			}
		}
	}

	// Handle throwing grenade
	if input.ThrowGrenade && p.FragCount > 0 {
		p.FragCount--
		vx := math.Cos(p.AimAngle) * 14.0
		vy := math.Sin(p.AimAngle) * 14.0
		fuse := input.GrenadeFuse
		if fuse <= 0.05 || fuse > 5.0 {
			fuse = 5.0
		}
		r.grenades = append(r.grenades, GrenadeEntity{
			ID:        fmt.Sprintf("gren_%d", time.Now().UnixNano()),
			ShooterID: p.ID,
			Type:      p.ActiveGrenade,
			X:         p.X,
			Y:         p.Y,
			Vx:        vx,
			Vy:        vy,
			Timer:     fuse,
		})
	}

	// Weapon swap
	if input.SwapWeapon && p.SecondaryWeapon != "" {
		p.PrimaryWeapon, p.SecondaryWeapon = p.SecondaryWeapon, p.PrimaryWeapon
		p.CurrentMag, p.SecondaryMag = p.SecondaryMag, p.CurrentMag
		p.ReserveAmmo, p.SecondaryReserve = p.SecondaryReserve, p.ReserveAmmo
		p.IsReloading = false
		p.ReloadProgress = 0
		c.LastInput.SwapWeapon = false
	}

	// Weapon pickup via E key
	if input.PickUpWeapon {
		for i := range r.pickups {
			if r.pickups[i].RespawnTime > 0 {
				continue
			}
			dist := math.Hypot(p.X-r.pickups[i].X, p.Y-r.pickups[i].Y)
			if dist < 70.0 {
				p.SecondaryWeapon = p.PrimaryWeapon
				p.SecondaryMag = p.CurrentMag
				p.SecondaryReserve = p.ReserveAmmo
				p.PrimaryWeapon = r.pickups[i].WeaponType
				p.IsReloading = false
				p.ReloadProgress = 0
				if w, ok := Weapons[r.pickups[i].WeaponType]; ok {
					p.CurrentMag = w.MagazineSize
					p.ReserveAmmo = w.ReserveAmmo
				}
				r.pickups[i].RespawnTime = 8.0
				break
			}
		}
	}

	// Reload (Manual or Auto when magazine is empty)
	if (input.Reload || p.CurrentMag <= 0) && !p.IsReloading && p.ReserveAmmo > 0 {
		w := GetWeapon(p.PrimaryWeapon)
		if p.CurrentMag < w.MagazineSize {
			p.IsReloading = true
			p.ReloadProgress = 0
		}
	}
	// Melee attack (Gun Smash) via F key or button
	if input.Melee && !p.IsMeleeAttacking && !p.IsDead {
		p.IsMeleeAttacking = true
		p.MeleeTimer = 0.35

		// Explosive Forward Lurch Dash Impulse in direction of aim
		dashSpeed := 18.5
		p.Vx += math.Cos(p.AimAngle) * dashSpeed
		p.Vy += math.Sin(p.AimAngle) * (dashSpeed * 0.75)

		// Damage & knockback nearby players
		for _, other := range r.players {
			if other.ID == p.ID || other.IsDead {
				continue
			}
			dist := math.Hypot(other.X-p.X, other.Y-p.Y)
			if dist < 78.0 {
				damage := 65.0
				other.Health -= damage
				other.LastDamageTime = time.Now().UnixMilli()
				p.DamageDealt += damage

				// Massive Knockback Impulse launching opponent across the screen!
				other.Vx += math.Cos(p.AimAngle) * 24.0
				other.Vy += math.Sin(p.AimAngle)*20.0 - 5.0

				if other.Health <= 0 {
					other.Health = 0
					other.IsDead = true
					other.RespawnTimer = 3.0
					other.Deaths++
					p.Kills++
					p.Streak++

					r.killFeed = append(r.killFeed, KillFeedEntry{
						ID:         fmt.Sprintf("kf_%d", time.Now().UnixNano()),
						KillerName: p.Name,
						KillerTeam: p.Team,
						VictimName: other.Name,
						VictimTeam: other.Team,
						WeaponUsed: "Gun Smash Melee",
						IsHeadshot: false,
						Timestamp:  time.Now().UnixMilli(),
					})
				}
			}
		}
	}

	r.mu.Unlock()

	_ = gameMap
}

func (r *Room) ProcessPlayerState(clientID string, state *Player) {
	r.mu.Lock()
	defer r.mu.Unlock()

	c, ok := r.clients[clientID]
	if !ok || state == nil {
		return
	}

	state.ID = clientID

	if c.Player != nil && c.Player.PrimaryWeapon != state.PrimaryWeapon {
		c.LastInput.SwapWeapon = false
	}

	c.Player = state

	found := false
	for i, p := range r.players {
		if p.ID == clientID {
			r.players[i] = state
			found = true
			break
		}
	}
	if !found {
		r.players = append(r.players, state)
	}
}

func (r *Room) RelayMessage(senderID string, msg ServerMessage) {
	r.mu.RLock()
	clientsSlice := make([]*ClientConn, 0, len(r.clients))
	for id, c := range r.clients {
		if id != senderID {
			clientsSlice = append(clientsSlice, c)
		}
	}
	r.mu.RUnlock()

	for _, c := range clientsSlice {
		go func(conn *ClientConn) {
			_ = conn.WriteJSON(msg)
		}(c)
	}
}

func (r *Room) runLoop() {
	ticker := time.NewTicker(time.Second / 60) // 60Hz Physics & Game Simulation Ticker
	defer ticker.Stop()

	lastTime := time.Now()

	for {
		select {
		case <-r.stopChan:
			return
		case <-ticker.C:
			now := time.Now()
			dt := now.Sub(lastTime).Seconds()
			lastTime = now

			r.mu.Lock()
			r.tickSeq++
			r.TimeRemaining = math.Max(0, r.TimeRemaining-dt)
			gameMap := Maps[r.MapID]

			// 1. Process client inputs & step player physics server-side
			for _, c := range r.clients {
				c.Mu.Lock()
				input := c.LastInput
				p := c.Player
				c.Mu.Unlock()

				if p != nil && !p.IsDead {
					UpdatePlayerPhysics(p, gameMap, input, dt)

					// Process Reloading Progression & Ammo Refill (Authoritative Server Side)
					if p.IsReloading {
						p.ReloadProgress += dt
						w := GetWeapon(p.PrimaryWeapon)
						reloadDurationSec := w.ReloadTime / 1000.0
						if reloadDurationSec <= 0 {
							reloadDurationSec = 1.6
						}
						if p.ReloadProgress >= reloadDurationSec {
							needed := w.MagazineSize - p.CurrentMag
							amount := needed
							if amount > p.ReserveAmmo {
								amount = p.ReserveAmmo
							}
							if amount > 0 {
								p.CurrentMag += amount
								p.ReserveAmmo -= amount
							}
							p.IsReloading = false
							p.ReloadProgress = 0
						}
					}
				} else if p != nil && p.IsDead {
					p.RespawnTimer -= dt
					if p.RespawnTimer <= 0 {
						p.IsDead = false
						p.Health = p.MaxHealth
						p.Nitro = p.MaxNitro
						p.Opacity = 1.0

						// Random weapon pool for exciting respawns
						weaponPool := []string{"ar", "smg", "shotgun", "sniper", "desert_eagle", "revolver", "m4", "ak47", "uzi", "mac10", "sawed_off", "mp5"}
						randPrimary := weaponPool[rand.Intn(len(weaponPool))]
						randSecondary := weaponPool[rand.Intn(len(weaponPool))]
						for randSecondary == randPrimary {
							randSecondary = weaponPool[rand.Intn(len(weaponPool))]
						}

						p.PrimaryWeapon = randPrimary
						p.SecondaryWeapon = randSecondary

						if w, ok := Weapons[randPrimary]; ok {
							p.CurrentMag = w.MagazineSize
							p.ReserveAmmo = w.ReserveAmmo
						} else {
							p.CurrentMag = 30
							p.ReserveAmmo = 120
						}
						if w, ok := Weapons[randSecondary]; ok {
							p.SecondaryMag = w.MagazineSize
							p.SecondaryReserve = w.ReserveAmmo
						} else {
							p.SecondaryMag = 35
							p.SecondaryReserve = 140
						}
						p.FragCount = 3
						p.IsReloading = false
						p.ReloadProgress = 0
						spawnPt := gameMap.Spawns[rand.Intn(len(gameMap.Spawns))]
						p.X = spawnPt.X
						p.Y = spawnPt.Y
						p.Vx = 0
						p.Vy = 0
					}
				}
			}

			// 2. Step bullets
			var newGrenadesFromBullets []GrenadeEntity
			r.bullets, newGrenadesFromBullets = UpdateBullets(r.bullets, r.players, gameMap, dt, func(killer, victim *Player, weapon string, isHeadshot bool) {
				if victim == nil {
					return
				}
				killerName := "Suicide"
				killerTeam := "none"
				if killer != nil {
					killerName = killer.Name
					killerTeam = killer.Team
				}
				r.killFeed = append(r.killFeed, KillFeedEntry{
					ID:         fmt.Sprintf("kf_%d", time.Now().UnixNano()),
					KillerName: killerName,
					KillerTeam: killerTeam,
					VictimName: victim.Name,
					VictimTeam: victim.Team,
					WeaponUsed: weapon,
					IsHeadshot: isHeadshot,
					Timestamp:  time.Now().UnixMilli(),
				})
			})
			r.grenades = append(r.grenades, newGrenadesFromBullets...)

			// 3. Step grenades
			var newExplosions []Explosion
			r.grenades, newExplosions = UpdateGrenades(r.grenades, r.players, gameMap, dt, func(killer, victim *Player, weapon string, isHeadshot bool) {
				if victim == nil {
					return
				}
				killerName := "Suicide"
				killerTeam := "none"
				if killer != nil {
					killerName = killer.Name
					killerTeam = killer.Team
				}
				r.killFeed = append(r.killFeed, KillFeedEntry{
					ID:         fmt.Sprintf("kf_%d", time.Now().UnixNano()),
					KillerName: killerName,
					KillerTeam: killerTeam,
					VictimName: victim.Name,
					VictimTeam: victim.Team,
					WeaponUsed: weapon,
					IsHeadshot: isHeadshot,
					Timestamp:  time.Now().UnixMilli(),
				})
			})
			r.explosions = append(r.explosions, newExplosions...)

			// 4. Step pickups, health crates, booster crates
			r.pickups, r.healthCrates, r.boosterCrates = UpdatePickupsAndHealth(r.pickups, r.healthCrates, r.boosterCrates, r.players, dt)

			r.snapshotCounter++
			shouldBroadcast := (r.snapshotCounter % 2 == 0) // Broadcast at 30Hz to save bandwidth
			r.mu.Unlock()

			if shouldBroadcast {
				r.broadcastSnapshot()
			}
		}
	}
}

func (r *Room) broadcastSnapshot() {
	r.mu.Lock()

	playersSlice := make([]Player, len(r.players))
	for i, p := range r.players {
		playersSlice[i] = *p
	}

	explosions := r.explosions
	r.explosions = r.explosions[:0]

	clientsSlice := make([]*ClientConn, 0, len(r.clients))
	for _, c := range r.clients {
		clientsSlice = append(clientsSlice, c)
	}

	msg := ServerMessage{
		Type:          "snapshot",
		Tick:          r.tickSeq,
		RoomCode:      r.Code,
		MapID:         r.MapID,
		TimeRemaining: r.TimeRemaining,
		Players:       playersSlice,
		Bullets:       r.bullets,
		Grenades:      r.grenades,
		Explosions:    explosions,
		BlueZone:      r.blueZone,
		AirDrops:      r.airDrops,
		Pickups:       r.pickups,
		HealthCrates:  r.healthCrates,
		BoosterCrates: r.boosterCrates,
		KillFeed:      r.killFeed,
	}
	r.mu.Unlock()

	binMsg := EncodeBinarySnapshot(&msg)

	for _, c := range clientsSlice {
		go c.WriteBinary(binMsg)
	}
}

func (r *Room) GetInfo() RoomInfo {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return RoomInfo{
		Code:        r.Code,
		MapID:       r.MapID,
		GameMode:    r.GameMode,
		PlayerCount: len(r.clients),
		MaxPlayers:  r.MaxPlayers,
		BotCount:    r.BotCount,
		IsStarted:   r.IsStarted,
	}
}
