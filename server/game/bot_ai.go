package game

import (
	"math"
	"math/rand"
)

func UpdateServerBotAI(bot *Player, players []*Player, pickups []WeaponPickup, gameMap GameMap, deltaTime float64) (ClientInput, bool, bool) {
	if bot.IsDead {
		return ClientInput{}, false, false
	}

	var closestTarget *Player
	minDist := math.Inf(1)

	for _, other := range players {
		if other.ID == bot.ID || other.IsDead {
			continue
		}
		if bot.Team != "none" && other.Team == bot.Team {
			continue
		}

		dist := math.Hypot(other.X-bot.X, other.Y-bot.Y)
		if other.InBush && dist > 250 {
			continue
		}
		if dist < minDist {
			minDist = dist
			closestTarget = other
		}
	}

	accuracyOffset := 0.25
	reactionRate := 0.08
	grenadeProb := 0.003

	switch bot.BotDifficulty {
	case "easy":
		accuracyOffset = 0.35
		reactionRate = 0.04
		grenadeProb = 0.001
	case "medium":
		accuracyOffset = 0.22
		reactionRate = 0.08
		grenadeProb = 0.003
	case "hard":
		accuracyOffset = 0.12
		reactionRate = 0.14
		grenadeProb = 0.006
	case "pro":
		accuracyOffset = 0.04
		reactionRate = 0.25
		grenadeProb = 0.01
	}

	var input ClientInput
	shouldShoot := false
	shouldThrowGrenade := false

	if closestTarget != nil {
		dx := closestTarget.X - bot.X
		dy := closestTarget.Y - bot.Y
		dist := math.Hypot(dx, dy)

		rawAngle := math.Atan2(dy, dx)
		bot.AimAngle += (rawAngle-bot.AimAngle)*reactionRate + (rand.Float64()-0.5)*accuracyOffset*0.1
		input.AimAngle = bot.AimAngle

		desiredDist := 250.0
		if w, ok := Weapons[bot.PrimaryWeapon]; ok && w.Category == "melee" {
			desiredDist = 30.0
		}

		if dist > desiredDist+50 {
			if dx > 0 {
				input.MoveRight = true
			} else {
				input.MoveLeft = true
			}
		} else if dist < desiredDist-50 {
			if dx > 0 {
				input.MoveLeft = true
			} else {
				input.MoveRight = true
			}
		}

		if dy < -60 || (!bot.IsGrounded && rand.Float64() < 0.3) {
			input.Boost = true
		}

		if bot.Health < 40 && rand.Float64() < 0.15 {
			input.Crouch = true
		}

		if dist < 600 && rand.Float64() < reactionRate*2 {
			shouldShoot = true
		}

		if dist > 180 && dist < 450 && rand.Float64() < grenadeProb {
			shouldThrowGrenade = true
		}

		// Check for nearby weapon pickups
		for _, pickup := range pickups {
			if pickup.RespawnTime <= 0 && math.Hypot(pickup.X-bot.X, pickup.Y-bot.Y) < 35.0 {
				if bot.PrimaryWeapon != pickup.WeaponType {
					input.PickUpWeapon = true
					break
				}
			}
		}
	} else {
		// Idle patrol
		if rand.Float64() < 0.02 {
			bot.FacingRight = !bot.FacingRight
		}
		if bot.FacingRight {
			input.MoveRight = true
		} else {
			input.MoveLeft = true
		}
		if rand.Float64() < 0.01 {
			input.Boost = true
		}
		input.AimAngle = bot.AimAngle
	}

	return input, shouldShoot, shouldThrowGrenade
}
