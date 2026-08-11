package game

import (
	"fmt"
	"math"
	"math/rand"
	"time"
)

const (
	Gravity         = 0.40
	JetpackThrust   = 0.72
	MaxJetpackSpeed = 7.2
	GroundFriction  = 0.82
	AirResistance   = 0.95
)

type RayHit struct {
	Hit  bool
	T    float64
	HitX float64
	HitY float64
}

func LineSegmentIntersectsBox(x1, y1, x2, y2, rx, ry, rw, rh float64) RayHit {
	dx := x2 - x1
	dy := y2 - y1

	tMin := 0.0
	tMax := 1.0

	if math.Abs(dx) < 1e-8 {
		if x1 < rx || x1 > rx+rw {
			return RayHit{Hit: false, T: 1}
		}
	} else {
		t1 := (rx - x1) / dx
		t2 := (rx + rw - x1) / dx
		if t1 > t2 {
			t1, t2 = t2, t1
		}
		tMin = math.Max(tMin, t1)
		tMax = math.Min(tMax, t2)
		if tMin > tMax {
			return RayHit{Hit: false, T: 1}
		}
	}

	if math.Abs(dy) < 1e-8 {
		if y1 < ry || y1 > ry+rh {
			return RayHit{Hit: false, T: 1}
		}
	} else {
		t1 := (ry - y1) / dy
		t2 := (ry + rh - y1) / dy
		if t1 > t2 {
			t1, t2 = t2, t1
		}
		tMin = math.Max(tMin, t1)
		tMax = math.Min(tMax, t2)
		if tMin > tMax {
			return RayHit{Hit: false, T: 1}
		}
	}

	return RayHit{
		Hit:  true,
		T:    tMin,
		HitX: x1 + dx*tMin,
		HitY: y1 + dy*tMin,
	}
}

func UpdatePlayerPhysics(p *Player, gameMap GameMap, input ClientInput, deltaTime float64) {
	if p.IsDead {
		p.RespawnTimer -= deltaTime
		return
	}

	p.AimAngle = input.AimAngle
	p.FacingRight = math.Cos(input.AimAngle) >= 0
	p.IsCrouching = input.Crouch && p.IsGrounded

	maxSpeed := 4.8
	if p.IsGrounded {
		if p.IsCrouching {
			maxSpeed = 1.8
		} else {
			maxSpeed = 3.8
		}
	}

	targetVx := 0.0
	if input.MoveRight {
		targetVx = maxSpeed
	} else if input.MoveLeft {
		targetVx = -maxSpeed
	}

	if p.IsGrounded {
		p.Vx += (targetVx - p.Vx) * 0.35
		p.Vx *= GroundFriction
	} else {
		if targetVx != 0 {
			p.Vx += (targetVx - p.Vx) * 0.15
		} else {
			p.Vx *= AirResistance
		}
	}

	if input.Boost && p.Nitro > 0 {
		p.IsBoosting = true
		p.Nitro = math.Max(0, p.Nitro-0.40)
		p.Vy -= JetpackThrust
		if p.Vy < -MaxJetpackSpeed {
			p.Vy = p.Vy*0.82 + (-MaxJetpackSpeed)*0.18
		}
	} else {
		p.IsBoosting = false
		if p.IsGrounded {
			p.Nitro = math.Min(p.MaxNitro, p.Nitro+0.6)
		}
	}

	p.Vy += Gravity
	if !p.IsGrounded {
		p.Vy *= AirResistance
	}

	pTopOffset := 38.0
	pBottomOffset := 24.0
	if p.IsCrouching {
		pTopOffset = 16.0
		pBottomOffset = 12.0
	}
	playerWidth := 24.0

	totalSpeed := math.Hypot(p.Vx, p.Vy)
	steps := int(math.Max(2, math.Ceil(totalSpeed/3.0)))
	subVx := p.Vx / float64(steps)
	subVy := p.Vy / float64(steps)

	p.IsGrounded = false

	for s := 0; s < steps; s++ {
		// X Movement
		p.X += subVx
		for _, plat := range gameMap.Platforms {
			if plat.Type == "one-way" {
				continue
			}
			pLeft := p.X - playerWidth/2
			pRight := p.X + playerWidth/2
			pTop := p.Y - pTopOffset
			pBottom := p.Y + pBottomOffset

			if pRight > plat.X && pLeft < plat.X+plat.W && pBottom > plat.Y+2 && pTop < plat.Y+plat.H-2 {
				if subVx > 0 {
					p.X = plat.X - playerWidth/2
				} else if subVx < 0 {
					p.X = plat.X + plat.W + playerWidth/2
				}
				p.Vx = 0
				subVx = 0
			}
		}

		// Y Movement
		p.Y += subVy
		for _, plat := range gameMap.Platforms {
			pLeft := p.X - playerWidth/2
			pRight := p.X + playerWidth/2
			pTop := p.Y - pTopOffset
			pBottom := p.Y + pBottomOffset

			if pRight > plat.X+2 && pLeft < plat.X+plat.W-2 {
				if plat.Type == "one-way" {
					if subVy >= 0 && !(input.Crouch && input.Boost) && pBottom >= plat.Y && (pBottom-subVy) <= plat.Y+12 {
						p.Y = plat.Y - pBottomOffset
						p.Vy = 0
						subVy = 0
						p.IsGrounded = true
					}
				} else {
					if pBottom > plat.Y && pTop < plat.Y+plat.H {
						if subVy > 0 && (pBottom-subVy) <= plat.Y+12 {
							p.Y = plat.Y - pBottomOffset
							p.Vy = 0
							subVy = 0
							p.IsGrounded = true
						} else if subVy < 0 && (pTop-subVy) >= plat.Y+plat.H-12 {
							p.Y = plat.Y + plat.H + pTopOffset
							p.Vy = 0
							subVy = 0
						}
					}
				}
			}
		}
	}

	// Safety un-embed
	for _, plat := range gameMap.Platforms {
		if plat.Type == "one-way" {
			continue
		}
		pLeft := p.X - playerWidth/2
		pRight := p.X + playerWidth/2
		pTop := p.Y - pTopOffset
		pBottom := p.Y + pBottomOffset

		if pRight > plat.X && pLeft < plat.X+plat.W && pBottom > plat.Y && pTop < plat.Y+plat.H {
			oLeft := pRight - plat.X
			oRight := (plat.X + plat.W) - pLeft
			oTop := pBottom - plat.Y
			oBottom := (plat.Y + plat.H) - pTop

			minO := math.Min(math.Min(oLeft, oRight), math.Min(oTop, oBottom))
			switch minO {
			case oTop:
				p.Y = plat.Y - pBottomOffset
				p.Vy = 0
				p.IsGrounded = true
			case oBottom:
				p.Y = plat.Y + plat.H + pTopOffset
				p.Vy = 0
			case oLeft:
				p.X = plat.X - playerWidth/2
				p.Vx = 0
			case oRight:
				p.X = plat.X + plat.W + playerWidth/2
				p.Vx = 0
			}
		}
	}

	// Map boundaries
	p.X = math.Max(playerWidth/2+10, math.Min(gameMap.Width-playerWidth/2-10, p.X))
	p.Y = math.Max(pTopOffset+10, math.Min(gameMap.Height-pBottomOffset-10, p.Y))

	// Bush concealment
	p.InBush = false
	for _, bush := range gameMap.Bushes {
		if p.X >= bush.X && p.X <= bush.X+bush.W && p.Y >= bush.Y && p.Y <= bush.Y+bush.H {
			p.InBush = true
			break
		}
	}
	if p.InBush {
		p.Opacity = 0.35
	} else {
		p.Opacity = 1.0
	}

	if input.Seq > p.LastProcessedSeq {
		p.LastProcessedSeq = input.Seq
	}
}

func UpdateBullets(bullets []Bullet, players []*Player, gameMap GameMap, deltaTime float64, onKill func(killer, victim *Player, weapon string, isHeadshot bool)) ([]Bullet, []GrenadeEntity) {
	activeBullets := make([]Bullet, 0, len(bullets))
	var newGrenades []GrenadeEntity

	for i := range bullets {
		b := bullets[i]
		b.Life -= deltaTime

		// Distance Traveled & Max Range Fading / Despawn
		stepDist := math.Hypot(b.Vx, b.Vy)
		b.DistanceTraveled += stepDist

		maxRange := b.MaxRange
		if maxRange <= 0 {
			if w, ok := Weapons[b.WeaponType]; ok && w.MaxRange > 0 {
				maxRange = w.MaxRange
			} else {
				maxRange = 1200.0
			}
		}

		fadeStart := maxRange * 0.70
		if b.DistanceTraveled > fadeStart {
			b.Alpha = math.Max(0.0, 1.0-(b.DistanceTraveled-fadeStart)/(maxRange-fadeStart))
		} else {
			b.Alpha = 1.0
		}

		if b.Life <= 0 || b.DistanceTraveled >= maxRange || b.Alpha <= 0.02 {
			if b.IsExplosive {
				newGrenades = append(newGrenades, GrenadeEntity{
					ID:        fmt.Sprintf("gren_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
					ShooterID: b.ShooterID,
					Type:      "frag",
					X:         b.X,
					Y:         b.Y,
					Vx:        0,
					Vy:        0,
					Timer:     0.01,
				})
			}
			continue
		}

		// High-Precision Sub-Step Raycasting (Max 10px per step segment for 100% accuracy at high velocities)
		numSubSteps := int(math.Max(1.0, math.Ceil(stepDist/10.0)))
		hitOccurred := false

		var shooter *Player
		for _, p := range players {
			if p.ID == b.ShooterID {
				shooter = p
				break
			}
		}

		for s := 0; s < numSubSteps; s++ {
			subStartX := b.X + (b.Vx/float64(numSubSteps))*float64(s)
			subStartY := b.Y + (b.Vy/float64(numSubSteps))*float64(s)
			subEndX := b.X + (b.Vx/float64(numSubSteps))*float64(s+1)
			subEndY := b.Y + (b.Vy/float64(numSubSteps))*float64(s+1)

			// 1. Raycast collision against platforms
			if !b.IsLaser {
				for _, plat := range gameMap.Platforms {
					if plat.Type == "one-way" {
						continue
					}
					hit := LineSegmentIntersectsBox(subStartX, subStartY, subEndX, subEndY, plat.X, plat.Y, plat.W, plat.H)
					if hit.Hit {
						hitOccurred = true
						b.X = hit.HitX
						b.Y = hit.HitY
						if b.IsExplosive {
							newGrenades = append(newGrenades, GrenadeEntity{
								ID:        fmt.Sprintf("gren_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
								ShooterID: b.ShooterID,
								Type:      "frag",
								X:         hit.HitX,
								Y:         hit.HitY,
								Vx:        0,
								Vy:        0,
								Timer:     0.01,
							})
						}
						break
					}
				}
			}

			if hitOccurred {
				break
			}

			// 2. Check collision against players with expanded AABB
			for _, p := range players {
				if p.IsDead || p.ID == b.ShooterID {
					continue
				}
				if shooter != nil && shooter.Team != "none" && shooter.Team == p.Team {
					continue
				}

				pHeight := 44.0
				if p.IsCrouching {
					pHeight = 28.0
				}
				pWidth := 34.0
				radiusBuffer := b.Radius + 3.0
				if radiusBuffer < 5.0 {
					radiusBuffer = 6.0
				}

				boxX := p.X - pWidth/2.0 - radiusBuffer
				boxY := p.Y - 24.0 - radiusBuffer
				if p.IsCrouching {
					boxY = p.Y - 12.0 - radiusBuffer
				}
				boxW := pWidth + radiusBuffer*2.0
				boxH := pHeight + radiusBuffer*2.0

				res := LineSegmentIntersectsBox(subStartX, subStartY, subEndX, subEndY, boxX, boxY, boxW, boxH)
				if res.Hit {
					hitOccurred = true
					b.X = res.HitX
					b.Y = res.HitY
					isHeadshot := (res.HitY < p.Y-8.0)
					damage := b.Damage
					if isHeadshot {
						damage *= 1.5
					}

					p.Health -= damage
					p.LastDamageTime = time.Now().UnixMilli()

					if shooter != nil {
						shooter.DamageDealt += damage
					}

					if p.Health <= 0 {
						p.Health = 0
						p.IsDead = true
						p.RespawnTimer = 3.0 // 3 sec respawn timer
						p.Deaths++

						if shooter != nil {
							if shooter.ID == p.ID {
								shooter.Suicides++
							} else {
								shooter.Kills++
								shooter.Streak++
								if isHeadshot {
									shooter.Headshots++
								}
							}
						}

						onKill(shooter, p, b.WeaponType, isHeadshot)
					}

					if b.IsExplosive {
						newGrenades = append(newGrenades, GrenadeEntity{
							ID:        fmt.Sprintf("gren_%d_%d", time.Now().UnixNano(), rand.Intn(1000)),
							ShooterID: b.ShooterID,
							Type:      "frag",
							X:         p.X,
							Y:         p.Y,
							Vx:        0,
							Vy:        0,
							Timer:     0.01,
						})
					}

					if !b.IsLaser {
						break
					}
				}
			}

			if hitOccurred && !b.IsLaser {
				break
			}
		}

		if !hitOccurred || b.IsLaser {
			b.X += b.Vx
			b.Y += b.Vy
			activeBullets = append(activeBullets, b)
		}
	}

	return activeBullets, newGrenades
}

func UpdateGrenades(grenades []GrenadeEntity, players []*Player, gameMap GameMap, deltaTime float64, onKill func(killer, victim *Player, weapon string, isHeadshot bool)) ([]GrenadeEntity, []Explosion) {
	activeGrenades := make([]GrenadeEntity, 0, len(grenades))
	var explosions []Explosion

	for i := range grenades {
		g := grenades[i]
		g.Timer -= deltaTime // deltaTime is in seconds (e.g. 0.016s)

		// Mine arming logic
		if g.Type == "mine" && g.IsArming {
			if g.Timer <= 0 {
				g.IsArming = false
			}
			activeGrenades = append(activeGrenades, g)
			continue
		}

		// Proximity mine trigger check
		if g.Type == "mine" && !g.IsArming {
			for _, p := range players {
				if p.IsDead {
					continue
				}
				if math.Hypot(p.X-g.X, p.Y-g.Y) < 60 {
					g.Timer = 0 // Detonate instantly
					break
				}
			}
		}

		// Detonate when timer reaches 0
		if g.Timer <= 0 {
			// Explosion damage radius
			radius := 180.0
			maxDamage := 120.0
			if g.Type == "gas" {
				radius = 220.0
				maxDamage = 60.0
			}

			var shooter *Player
			for _, p := range players {
				if p.ID == g.ShooterID {
					shooter = p
					break
				}
			}

			for _, p := range players {
				if p.IsDead {
					continue
				}
				dist := math.Hypot(p.X-g.X, p.Y-g.Y)
				if dist < radius {
					dmg := maxDamage * (1.0 - dist/radius)
					p.Health -= dmg
					p.LastDamageTime = time.Now().UnixMilli()

					// Explosive impulse knockback
					angle := math.Atan2(p.Y-g.Y, p.X-g.X)
					p.Vx += math.Cos(angle) * (14.0 * (1.0 - dist/radius))
					p.Vy += math.Sin(angle) * (14.0 * (1.0 - dist/radius))

					if shooter != nil {
						shooter.DamageDealt += dmg
					}

					if p.Health <= 0 {
						p.Health = 0
						p.IsDead = true
						p.RespawnTimer = 3.0 // 3 sec respawn timer
						p.Deaths++

						if shooter != nil {
							if shooter.ID == p.ID {
								shooter.Suicides++
							} else {
								shooter.Kills++
								shooter.Streak++
							}
						}

						onKill(shooter, p, g.Type, false)
					}
				}
			}
			explosions = append(explosions, Explosion{X: g.X, Y: g.Y, ShooterID: g.ShooterID, Type: g.Type})
			continue
		}

		// Physics motion & continuous raycast bouncing
		if !g.IsStuck {
			g.Vy += Gravity * 0.8
			startX := g.X
			startY := g.Y
			endX := g.X + g.Vx
			endY := g.Y + g.Vy

			hitPlat := false
			for _, plat := range gameMap.Platforms {
				if plat.Type == "one-way" {
					continue
				}
				hit := LineSegmentIntersectsBox(startX, startY, endX, endY, plat.X, plat.Y, plat.W, plat.H)
				if hit.Hit {
					hitPlat = true
					g.X = hit.HitX
					g.Y = hit.HitY
					if g.Type == "mine" {
						g.IsStuck = true
						g.Vx = 0
						g.Vy = 0
					} else {
						g.Vy = -g.Vy * 0.5
						g.Vx *= 0.7
					}
					break
				}
			}

			if !hitPlat {
				g.X = endX
				g.Y = endY
				g.Vx *= 0.98
				g.Vy *= 0.98
			}
		}

		activeGrenades = append(activeGrenades, g)
	}

	return activeGrenades, explosions
}

func UpdatePickupsAndHealth(pickups []WeaponPickup, healthCrates []HealthCrate, boosterCrates []HealthCrate, players []*Player, deltaTime float64) ([]WeaponPickup, []HealthCrate, []HealthCrate) {
	// Update Weapon Pickups
	for i := range pickups {
		if pickups[i].RespawnTime > 0 {
			pickups[i].RespawnTime -= deltaTime
			continue
		}
		for _, p := range players {
			if p.IsDead || p.IsBot {
				continue
			}
			dist := math.Hypot(p.X-pickups[i].X, p.Y-pickups[i].Y)
			if dist < 35 {
				// Move current primary to secondary slot and set new weapon as primary
				p.SecondaryWeapon = p.PrimaryWeapon
				p.SecondaryMag = p.CurrentMag
				p.SecondaryReserve = p.ReserveAmmo
				p.PrimaryWeapon = pickups[i].WeaponType
				p.IsReloading = false
				p.ReloadProgress = 0
				if w, ok := Weapons[pickups[i].WeaponType]; ok {
					p.CurrentMag = w.MagazineSize
					p.ReserveAmmo = w.ReserveAmmo
				}
				pickups[i].RespawnTime = 8.0 // Auto-spawns after 8s
				break
			}
		}
	}

	// Update Health Crates
	for i := range healthCrates {
		if !healthCrates[i].Active {
			healthCrates[i].RespawnTimer -= deltaTime
			if healthCrates[i].RespawnTimer <= 0 {
				healthCrates[i].Active = true
			}
			continue
		}

		for _, p := range players {
			if p.IsDead {
				continue
			}
			dist := math.Hypot(p.X-healthCrates[i].X, p.Y-healthCrates[i].Y)
			if dist < 30 && p.Health < p.MaxHealth {
				p.Health = math.Min(p.MaxHealth, p.Health+50.0)
				healthCrates[i].Active = false
				healthCrates[i].RespawnTimer = 10.0 // Auto-spawns after 10s
				break
			}
		}
	}

	// Update Booster Refill Crates (Nitro Gas)
	for i := range boosterCrates {
		if !boosterCrates[i].Active {
			boosterCrates[i].RespawnTimer -= deltaTime
			if boosterCrates[i].RespawnTimer <= 0 {
				boosterCrates[i].Active = true
			}
			continue
		}

		for _, p := range players {
			if p.IsDead {
				continue
			}
			dist := math.Hypot(p.X-boosterCrates[i].X, p.Y-boosterCrates[i].Y)
			if dist < 32 && p.Nitro < p.MaxNitro {
				p.Nitro = math.Min(p.MaxNitro, p.Nitro+100.0)
				boosterCrates[i].Active = false
				boosterCrates[i].RespawnTimer = 10.0 // Auto-spawns after 10s
				break
			}
		}
	}

	return pickups, healthCrates, boosterCrates
}
