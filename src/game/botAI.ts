import { GameMap, Player, WeaponPickup, WeaponType } from '../types';
import { WEAPONS, getWeapon } from '../data/weapons';

export function updateBotAI(
  bot: Player,
  players: Player[],
  pickups: WeaponPickup[],
  map: GameMap,
  deltaTime: number,
  onBotShoot: (bot: Player, angle: number) => void,
  onBotThrowGrenade: (bot: Player, angle: number) => void
) {
  if (bot.isDead) return;

  // Find nearest valid enemy target
  let closestTarget: Player | null = null;
  let minDistance = Infinity;

  for (const other of players) {
    if (other.id === bot.id || other.isDead) continue;
    if (bot.team !== 'none' && other.team === bot.team) continue;

    // Ignore enemies hiding deep in bushes unless nearby
    const dist = Math.hypot(other.x - bot.x, other.y - bot.y);
    if (other.inBush && dist > 250) continue;

    if (dist < minDistance) {
      minDistance = dist;
      closestTarget = other;
    }
  }

  // Difficulty parameters
  let accuracyOffset = 0.25;
  let reactionRate = 0.08;
  let grenadeProbability = 0.002;

  switch (bot.botDifficulty) {
    case 'easy':
      accuracyOffset = 0.35;
      reactionRate = 0.04;
      grenadeProbability = 0.001;
      break;
    case 'medium':
      accuracyOffset = 0.22;
      reactionRate = 0.08;
      grenadeProbability = 0.003;
      break;
    case 'hard':
      accuracyOffset = 0.12;
      reactionRate = 0.14;
      grenadeProbability = 0.006;
      break;
    case 'pro':
      accuracyOffset = 0.04;
      reactionRate = 0.25;
      grenadeProbability = 0.01;
      break;
  }

  // Movement inputs initialized
  let moveLeft = false;
  let moveRight = false;
  let boost = false;
  let crouch = false;
  let aimAngle = bot.aimAngle;

  if (closestTarget) {
    const dx = closestTarget.x - bot.x;
    const dy = closestTarget.y - bot.y;
    const distance = Math.hypot(dx, dy);

    // Aim angle calculation with difficulty spread
    const rawAngle = Math.atan2(dy, dx);
    aimAngle += (rawAngle - aimAngle) * reactionRate + (Math.random() - 0.5) * accuracyOffset * 0.1;

    // Tactical positioning
    const desiredDist = getWeapon(bot.primaryWeapon).category === 'melee' ? 30 : 250;

    if (distance > desiredDist + 50) {
      if (dx > 0) moveRight = true;
      else moveLeft = true;
    } else if (distance < desiredDist - 50) {
      if (dx > 0) moveLeft = true;
      else moveRight = true;
    }

    // Vertical Jetpack boosting if target is higher or vertical platform obstacle
    if (dy < -60 || (!bot.isGrounded && Math.random() < 0.3)) {
      boost = true;
    }

    // Crouch dodging if low health or target has high damage weapon
    if (bot.health < 40 && Math.random() < 0.15) {
      crouch = true;
    }

    // Shooting decision
    if (distance < 600 && Math.random() < reactionRate * 2) {
      onBotShoot(bot, aimAngle);
    }

    // Grenade throw decision
    if (distance > 180 && distance < 450 && Math.random() < grenadeProbability) {
      onBotThrowGrenade(bot, aimAngle);
    }
  } else {
    // Idle Wander Patrol
    if (Math.random() < 0.02) {
      bot.facingRight = !bot.facingRight;
    }
    if (bot.facingRight) moveRight = true;
    else moveLeft = true;

    if (Math.random() < 0.01) {
      boost = true;
    }
  }

  // Check weapon pickups nearby to upgrade weapon
  for (const pickup of pickups) {
    if (pickup.respawnTime > 0) continue;
    const distToPickup = Math.hypot(pickup.x - bot.x, pickup.y - bot.y);
    if (distToPickup < 40) {
      // Pick up heavy/better weapon if holding starter pistol
      const currentCategory = getWeapon(bot.primaryWeapon).category;
      const pickupCategory = getWeapon(pickup.weaponType).category;
      if (currentCategory === 'pistol' || pickupCategory === 'heavy' || pickupCategory === 'special') {
        bot.secondaryWeapon = bot.primaryWeapon;
        bot.primaryWeapon = pickup.weaponType;
        pickup.respawnTime = 8.0; // Auto-spawns after 8s
      }
    }
  }

  return {
    moveLeft,
    moveRight,
    boost,
    crouch,
    aimAngle
  };
}
