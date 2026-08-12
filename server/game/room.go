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

	// Initialize Map Pickups & Crates
	for i, w := range gameMap.WeaponSpawns {
		r.pickups = append(r.pickups, WeaponPickup{
			ID:          fmt.Sprintf("pickup_%d", i),
			WeaponType:  w.WeaponType,
			X:           w.X,
			Y:           w.Y,
			Ammo:        Weapons[w.WeaponType].MagazineSize,
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

			for b := 0; b < w.BulletsPerShot; b++ {
				spreadAngle := p.AimAngle + (rand.Float64()-0.5)*w.Spread
				vx := math.Cos(spreadAngle) * w.BulletSpeed
				vy := math.Sin(spreadAngle) * w.BulletSpeed

				r.bullets = append(r.bullets, Bullet{
					ID:               fmt.Sprintf("b_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
					ShooterID:        p.ID,
					WeaponType:       w.ID,
					X:                p.X + math.Cos(p.AimAngle)*22,
					Y:                p.Y + math.Sin(p.AimAngle)*22,
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
	}

	// Weapon pickup via E key
	if input.PickUpWeapon {
		for i := range r.pickups {
			if r.pickups[i].RespawnTime > 0 {
				continue
			}
			dist := math.Hypot(p.X-r.pickups[i].X, p.Y-r.pickups[i].Y)
			if dist < 50.0 {
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

func (r *Room) runLoop() {
	ticker := time.NewTicker(time.Second / 60) // 60Hz Physics Timestep (Normal Game Speed)
	const snapshotInterval = 3 // broadcast snapshot every 3rd tick = 20Hz
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
			gameMap := Maps[r.MapID]
			r.tickSeq++
			r.TimeRemaining = math.Max(0, r.TimeRemaining-(dt))

			// 1. Process Player Physics & Bot AI
			for _, p := range r.players {
				if p.IsMeleeAttacking {
					p.MeleeTimer -= dt
					if p.MeleeTimer <= 0 {
						p.IsMeleeAttacking = false
						p.MeleeTimer = 0
					}
				}

				if p.IsDead {
					p.RespawnTimer -= dt
					if p.RespawnTimer <= 0 {
						p.IsDead = false
						p.Health = p.MaxHealth
						p.Nitro = p.MaxNitro

						// Reset Weapons & Ammo loadout on respawn
						p.PrimaryWeapon = "ar"
						p.SecondaryWeapon = "smg"
						p.ActiveSlot = "primary"
						if w, ok := Weapons[p.PrimaryWeapon]; ok {
							p.CurrentMag = w.MagazineSize
							p.ReserveAmmo = w.ReserveAmmo
						}
						if w, ok := Weapons[p.SecondaryWeapon]; ok {
							p.SecondaryMag = w.MagazineSize
							p.SecondaryReserve = w.ReserveAmmo
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
					continue
				}

				var input ClientInput
				if p.IsBot {
					botInput, shouldShoot, shouldGrenade := UpdateServerBotAI(p, r.players, r.pickups, gameMap, dt)
					input = botInput
					w := GetWeapon(p.PrimaryWeapon)
					if shouldShoot && time.Now().UnixMilli()-p.LastShotTime > int64(1000.0/w.FireRate) {
						p.LastShotTime = time.Now().UnixMilli()
						r.bullets = append(r.bullets, Bullet{
							ID:               fmt.Sprintf("b_bot_%d", time.Now().UnixNano()),
							ShooterID:        p.ID,
							WeaponType:       w.ID,
							X:                p.X,
							Y:                p.Y,
							Vx:               math.Cos(input.AimAngle) * w.BulletSpeed,
							Vy:               math.Sin(input.AimAngle) * w.BulletSpeed,
							Damage:           w.Damage,
							Color:            w.Color,
							Radius:           3,
							Life:             80,
							MaxLife:          80,
							MaxRange:         w.MaxRange,
							DistanceTraveled: 0,
							Alpha:            1.0,
						})
					}
					if shouldGrenade && p.FragCount > 0 {
						p.FragCount--
						r.grenades = append(r.grenades, GrenadeEntity{
							ID:        fmt.Sprintf("g_bot_%d", time.Now().UnixNano()),
							ShooterID: p.ID,
							Type:      "frag",
							X:         p.X,
							Y:         p.Y,
							Vx:        math.Cos(input.AimAngle) * 12,
							Vy:        math.Sin(input.AimAngle) * 12,
							Timer:     3.0,
						})
					}
				} else {
					if c, ok := r.clients[p.ID]; ok {
						c.Mu.Lock()
						input = c.LastInput
						c.Mu.Unlock()
					}
				}

				UpdatePlayerPhysics(p, gameMap, input, dt)

				if p.IsReloading {
					p.ReloadProgress += dt * 1000.0
					w := GetWeapon(p.PrimaryWeapon)
					if p.ReloadProgress >= float64(w.ReloadTime) {
						needed := w.MagazineSize - p.CurrentMag
						amount := needed
						if p.ReserveAmmo < amount {
							amount = p.ReserveAmmo
						}
						p.CurrentMag += amount
						p.ReserveAmmo -= amount
						p.IsReloading = false
						p.ReloadProgress = 0
					}
				}
			}

			// 2. Update Bullets
			var newGrenades []GrenadeEntity
			r.bullets, newGrenades = UpdateBullets(r.bullets, r.players, gameMap, dt, func(killer, victim *Player, weapon string, isHeadshot bool) {
				kName := "World"
				kTeam := "none"
				if killer != nil {
					kName = killer.Name
					kTeam = killer.Team
				}
				r.killFeed = append(r.killFeed, KillFeedEntry{
					ID:         fmt.Sprintf("kf_%d", time.Now().UnixNano()),
					KillerName: kName,
					KillerTeam: kTeam,
					VictimName: victim.Name,
					VictimTeam: victim.Team,
					WeaponUsed: weapon,
					IsHeadshot: isHeadshot,
					Timestamp:  time.Now().UnixMilli(),
				})
				if len(r.killFeed) > 5 {
					r.killFeed = r.killFeed[len(r.killFeed)-5:]
				}
			})
			r.grenades = append(r.grenades, newGrenades...)

			// 3. Update Grenades
			var grenadeExplosions []Explosion
			r.grenades, grenadeExplosions = UpdateGrenades(r.grenades, r.players, gameMap, dt, func(killer, victim *Player, weapon string, isHeadshot bool) {
				kName := "World"
				kTeam := "none"
				if killer != nil {
					kName = killer.Name
					kTeam = killer.Team
				}
				r.killFeed = append(r.killFeed, KillFeedEntry{
					ID:         fmt.Sprintf("kf_%d", time.Now().UnixNano()),
					KillerName: kName,
					KillerTeam: kTeam,
					VictimName: victim.Name,
					VictimTeam: victim.Team,
					WeaponUsed: weapon,
					IsHeadshot: isHeadshot,
					Timestamp:  time.Now().UnixMilli(),
				})
			})
			r.explosions = append(r.explosions, grenadeExplosions...)

			// 4. Update Weapon, Health, & Nitro Booster Pickups
			r.pickups, r.healthCrates, r.boosterCrates = UpdatePickupsAndHealth(r.pickups, r.healthCrates, r.boosterCrates, r.players, dt)

			// 5. Authoritative PUBG Blue Zone & Air Drop Processing
			if r.GameMode == "battle-royale" && r.blueZone != nil {
				bz := r.blueZone
				bz.ShrinkTimer -= dt

				if bz.ShrinkTimer <= 0 {
					if !bz.IsShrinking {
						bz.IsShrinking = true
						bz.Phase++
						bz.TargetRadius = math.Max(120, bz.CurrentRadius*0.55)
						bz.ShrinkTimer = 15.0
					} else {
						bz.IsShrinking = false
						bz.ShrinkTimer = 20.0
					}
				}

				if bz.IsShrinking && bz.CurrentRadius > bz.TargetRadius {
					bz.CurrentRadius -= dt * 20.0
				}

				for _, p := range r.players {
					if p.IsDead {
						continue
					}
					dist := math.Hypot(p.X-bz.CenterX, p.Y-bz.CenterY)
					if dist > bz.CurrentRadius {
						p.Health -= dt * bz.DamagePerSec
						p.LastDamageTime = time.Now().UnixMilli()
						if p.Health <= 0 {
							p.Health = 0
							p.IsDead = true
							p.Deaths++
						}
					}
				}
			}

			// Throttle snapshot broadcast to 20Hz (every 3rd physics tick)
			r.snapshotCounter++
			shouldBroadcast := r.snapshotCounter >= snapshotInterval
			if shouldBroadcast {
				r.snapshotCounter = 0
			}
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

	// Capture and clear pending explosions
	explosions := r.explosions
	r.explosions = r.explosions[:0]

	// Copy client connections slice to write JSON outside lock
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

	// Perform WebRTC WriteBinary outside of room lock so slow network buffers never block physics tick!
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
