import { Bullet, GrenadeEntity, GameMap, Particle, Player, WeaponPickup, HealthCrate, Platform, WeaponType } from '../types';
import { WEAPONS } from '../data/weapons';

export const GRAVITY = 0.40;
export const JETPACK_THRUST = 0.72;
export const MAX_JETPACK_SPEED = 7.2;
export const GROUND_FRICTION = 0.82;
export const AIR_RESISTANCE = 0.95;

/**
 * Continuous raycast against an Axis-Aligned Bounding Box (AABB)
 * Uses the slab method to determine exact collision point & distance parameter t in [0, 1]
 */
export function lineSegmentIntersectsBox(
  x1: number, y1: number, x2: number, y2: number,
  rx: number, ry: number, rw: number, rh: number
): { hit: boolean; t: number; hitX: number; hitY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;

  let tMin = 0;
  let tMax = 1;

  // X slab
  if (Math.abs(dx) < 1e-8) {
    if (x1 < rx || x1 > rx + rw) return { hit: false, t: 1, hitX: 0, hitY: 0 };
  } else {
    let t1 = (rx - x1) / dx;
    let t2 = (rx + rw - x1) / dx;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return { hit: false, t: 1, hitX: 0, hitY: 0 };
  }

  // Y slab
  if (Math.abs(dy) < 1e-8) {
    if (y1 < ry || y1 > ry + rh) return { hit: false, t: 1, hitX: 0, hitY: 0 };
  } else {
    let t1 = (ry - y1) / dy;
    let t2 = (ry + rh - y1) / dy;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return { hit: false, t: 1, hitX: 0, hitY: 0 };
  }

  return {
    hit: true,
    t: tMin,
    hitX: x1 + dx * tMin,
    hitY: y1 + dy * tMin
  };
}

export function updatePlayerPhysics(
  player: Player,
  map: GameMap,
  input: {
    moveLeft: boolean;
    moveRight: boolean;
    boost: boolean;
    crouch: boolean;
    aimAngle: number;
  },
  deltaTime: number
) {
  if (player.isDead) {
    player.respawnTimer -= deltaTime;
    return;
  }

  // Aim direction
  player.aimAngle = input.aimAngle;
  // Hysteresis: only flip facing direction when aim clearly crosses threshold,
  // prevents flickering when aiming near vertical (cos ~= 0)
  const cosAim = Math.cos(input.aimAngle);
  if (cosAim > 0.1) {
    player.facingRight = true;
  } else if (cosAim < -0.1) {
    player.facingRight = false;
  }
  // When cosAim is between -0.1 and 0.1 (near vertical), keep the previous facingRight value

  // Crouch state
  player.isCrouching = input.crouch && player.isGrounded;

  // Horizontal Movement with smooth acceleration & air control
  const maxSpeed = player.isGrounded ? (player.isCrouching ? 1.8 : 3.8) : 4.8;
  const targetVx = input.moveRight ? maxSpeed : input.moveLeft ? -maxSpeed : 0;

  if (player.isGrounded) {
    player.vx += (targetVx - player.vx) * 0.35;
    player.vx *= GROUND_FRICTION;
  } else {
    if (targetVx !== 0) {
      player.vx += (targetVx - player.vx) * 0.15;
    } else {
      player.vx *= AIR_RESISTANCE;
    }
  }

  // Jetpack Boost with smooth force blending
  if (input.boost && player.nitro > 0) {
    player.isBoosting = true;
    player.nitro = Math.max(0, player.nitro - 0.45);
    player.vy -= JETPACK_THRUST;
    if (player.vy < -MAX_JETPACK_SPEED) {
      player.vy = player.vy * 0.82 + (-MAX_JETPACK_SPEED) * 0.18;
    }
  } else {
    player.isBoosting = false;
    // Recharge Nitro (faster when grounded, gradual while airborne)
    if (player.isGrounded) {
      player.nitro = Math.min(player.maxNitro, player.nitro + 0.65);
    } else {
      player.nitro = Math.min(player.maxNitro, player.nitro + 0.25);
    }
  }

  // Apply Gravity & Air Resistance
  player.vy += GRAVITY;
  if (!player.isGrounded) {
    player.vy *= AIR_RESISTANCE;
  }

  const pTopOffset = player.isCrouching ? 30 : 38;
  const pBottomOffset = player.isCrouching ? 18 : 24;
  const playerWidth = 24;

  // Sub-step movement & collision resolution
  const totalSpeed = Math.hypot(player.vx, player.vy);
  const steps = Math.max(2, Math.ceil(totalSpeed / 3));
  let subVx = player.vx / steps;
  let subVy = player.vy / steps;

  player.isGrounded = false;

  for (let s = 0; s < steps; s++) {
    // 1. Resolve X movement
    player.x += subVx;
    for (const plat of map.platforms) {
      if (plat.type === 'one-way') continue;

      const pLeft = player.x - playerWidth / 2;
      const pRight = player.x + playerWidth / 2;
      const pTop = player.y - pTopOffset;
      const pBottom = player.y + pBottomOffset;

      if (
        pRight > plat.x &&
        pLeft < plat.x + plat.w &&
        pBottom > plat.y + 2 &&
        pTop < plat.y + plat.h - 2
      ) {
        if (subVx > 0) {
          player.x = plat.x - playerWidth / 2;
        } else if (subVx < 0) {
          player.x = plat.x + plat.w + playerWidth / 2;
        }
        player.vx = 0;
        subVx = 0;
      }
    }

    // 2. Resolve Y movement
    player.y += subVy;
    for (const plat of map.platforms) {
      const pLeft = player.x - playerWidth / 2;
      const pRight = player.x + playerWidth / 2;
      const pTop = player.y - pTopOffset;
      const pBottom = player.y + pBottomOffset;

      if (pRight > plat.x + 2 && pLeft < plat.x + plat.w - 2) {
        if (plat.type === 'one-way') {
          // One-way platforms: allow dropping down when crouched + boost
          if (
            subVy >= 0 &&
            !(input.crouch && input.boost) &&
            pBottom >= plat.y &&
            pBottom - subVy <= plat.y + 12
          ) {
            player.y = plat.y - pBottomOffset;
            player.vy = 0;
            subVy = 0;
            player.isGrounded = true;
          }
        } else {
          // Solid platforms Y collision
          if (pBottom > plat.y && pTop < plat.y + plat.h) {
            if (subVy > 0 && pBottom - subVy <= plat.y + 12) {
              player.y = plat.y - pBottomOffset;
              player.vy = 0;
              subVy = 0;
              player.isGrounded = true;
            } else if (subVy < 0 && pTop - subVy >= plat.y + plat.h - 12) {
              player.y = plat.y + plat.h + pTopOffset;
              player.vy = 0;
              subVy = 0;
            }
          }
        }
      }
    }
  }

  // Safety un-embed check for solid platforms
  for (const plat of map.platforms) {
    if (plat.type === 'one-way') continue;
    const pLeft = player.x - playerWidth / 2;
    const pRight = player.x + playerWidth / 2;
    const pTop = player.y - pTopOffset;
    const pBottom = player.y + pBottomOffset;

    if (
      pRight > plat.x &&
      pLeft < plat.x + plat.w &&
      pBottom > plat.y &&
      pTop < plat.y + plat.h
    ) {
      const overlapLeft = pRight - plat.x;
      const overlapRight = (plat.x + plat.w) - pLeft;
      const overlapTop = pBottom - plat.y;
      const overlapBottom = (plat.y + plat.h) - pTop;

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapTop) {
        player.y = plat.y - pBottomOffset;
        player.vy = 0;
        player.isGrounded = true;
      } else if (minOverlap === overlapBottom) {
        player.y = plat.y + plat.h + pTopOffset;
        player.vy = 0;
      } else if (minOverlap === overlapLeft) {
        player.x = plat.x - playerWidth / 2;
        player.vx = 0;
      } else if (minOverlap === overlapRight) {
        player.x = plat.x + plat.w + playerWidth / 2;
        player.vx = 0;
      }
    }
  }

  // Map boundary constraints
  player.x = Math.max(playerWidth / 2 + 10, Math.min(map.width - playerWidth / 2 - 10, player.x));
  player.y = Math.max(pTopOffset + 10, Math.min(map.height - pBottomOffset - 10, player.y));

  // Bush concealment check
  player.inBush = false;
  for (const bush of map.bushes) {
    if (
      player.x >= bush.x &&
      player.x <= bush.x + bush.w &&
      player.y >= bush.y &&
      player.y <= bush.y + bush.h
    ) {
      player.inBush = true;
      break;
    }
  }
  player.opacity = player.inBush ? 0.35 : 1.0;

  // Health Regeneration after delay
  if (Date.now() - player.lastDamageTime > 4000 && player.health < player.maxHealth) {
    player.health = Math.min(player.maxHealth, player.health + 0.15);
  }
}

export function updateBullets(
  bullets: Bullet[],
  players: Player[],
  map: GameMap,
  particles: Particle[],
  spawnExplosion: (x: number, y: number, shooterId: string) => void,
  onHit: (shooterId: string, victimId: string, damage: number, isHeadshot: boolean) => void
): Bullet[] {
  const activeBullets: Bullet[] = [];

  for (const b of bullets) {
    b.life -= 1;

    // Track Distance & Max Range Despawn / Fading
    const stepDist = Math.hypot(b.vx, b.vy);
    b.distanceTraveled = (b.distanceTraveled || 0) + stepDist;
    const maxRange = b.maxRange || (WEAPONS[b.weaponType as WeaponType]?.maxRange || 1200);

    const fadeStart = maxRange * 0.70;
    if (b.distanceTraveled > fadeStart) {
      b.alpha = Math.max(0, 1 - (b.distanceTraveled - fadeStart) / (maxRange - fadeStart));
    } else {
      b.alpha = 1.0;
    }

    if (b.life <= 0 || b.distanceTraveled >= maxRange || b.alpha <= 0.02) {
      if (b.isExplosive) {
        spawnExplosion(b.x, b.y, b.shooterId);
      }
      continue; // Despawn bullet
    }

    // High-Precision Sub-Step Raycasting (Max 10px per micro step for 100% hit detection accuracy)
    const numSubSteps = Math.max(1, Math.ceil(stepDist / 10));
    let hitOccurred = false;

    for (let s = 0; s < numSubSteps; s++) {
      const subStartX = b.x + (b.vx / numSubSteps) * s;
      const subStartY = b.y + (b.vy / numSubSteps) * s;
      const subEndX = b.x + (b.vx / numSubSteps) * (s + 1);
      const subEndY = b.y + (b.vy / numSubSteps) * (s + 1);

      let closestHitT = 1.0;
      let hitType: 'none' | 'platform' | 'player' = 'none';
      let hitVictimId: string | null = null;
      let hitX = subEndX;
      let hitY = subEndY;
      let hitHeadshot = false;

      // 1. Raycast against Map Platforms
      for (const plat of map.platforms) {
        const res = lineSegmentIntersectsBox(
          subStartX, subStartY, subEndX, subEndY,
          plat.x, plat.y, plat.w, plat.h
        );
        if (res.hit && res.t <= closestHitT) {
          closestHitT = res.t;
          hitType = 'platform';
          hitX = res.hitX;
          hitY = res.hitY;
        }
      }

      // 2. Raycast against Players with expanded bullet radius AABB
      for (const p of players) {
        if (p.isDead || p.id === b.shooterId) continue;

        const pHeight = p.isCrouching ? 28 : 44;
        const pWidth = 34;
        const radiusBuffer = (b.radius || 4) + 3;

        const boxX = p.x - pWidth / 2 - radiusBuffer;
        const boxY = p.isCrouching ? (p.y - 12 - radiusBuffer) : (p.y - 24 - radiusBuffer);
        const boxW = pWidth + radiusBuffer * 2;
        const boxH = pHeight + radiusBuffer * 2;

        const res = lineSegmentIntersectsBox(
          subStartX, subStartY, subEndX, subEndY,
          boxX, boxY, boxW, boxH
        );

        if (res.hit && res.t < closestHitT) {
          closestHitT = res.t;
          hitType = 'player';
          hitVictimId = p.id;
          hitX = res.hitX;
          hitY = res.hitY;
          hitHeadshot = hitY < p.y - 8;
        }
      }

      // Process Hit Resolution
      if (hitType === 'platform') {
        b.x = hitX;
        b.y = hitY;
        hitOccurred = true;
        if (b.isExplosive) {
          spawnExplosion(b.x, b.y, b.shooterId);
        } else {
          // Wall spark particles
          for (let i = 0; i < 4; i++) {
            particles.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              color: '#f39c12',
              size: 2,
              alpha: 1,
              decay: 0.1,
              shape: 'spark'
            });
          }
        }
        break; // Stop sub-steps, bullet consumed
      } else if (hitType === 'player' && hitVictimId) {
        b.x = hitX;
        b.y = hitY;
        hitOccurred = true;
        const finalDamage = hitHeadshot ? b.damage * 1.5 : b.damage;
        onHit(b.shooterId, hitVictimId, finalDamage, hitHeadshot);

        if (b.isExplosive) {
          spawnExplosion(b.x, b.y, b.shooterId);
        } else {
          // Blood hit particles
          for (let i = 0; i < 5; i++) {
            particles.push({
              x: b.x,
              y: b.y,
              vx: (Math.random() - 0.5) * 3,
              vy: (Math.random() - 0.5) * 3,
              color: '#c0392b',
              size: 3,
              alpha: 1,
              decay: 0.08,
              shape: 'circle'
            });
          }
        }
        break; // Stop sub-steps, bullet consumed
      }
    }

    if (!hitOccurred) {
      b.x += b.vx;
      b.y += b.vy;
      activeBullets.push(b);
    }
  }

  return activeBullets;
}

// Update Grenades
export function updateGrenades(
  grenades: GrenadeEntity[],
  players: Player[],
  map: GameMap,
  particles: Particle[],
  spawnExplosion: (x: number, y: number, shooterId: string) => void
): GrenadeEntity[] {
  const activeGrenades: GrenadeEntity[] = [];

  for (const g of grenades) {
    g.timer -= 1 / 60; // frame step in seconds

    if (!g.isStuck) {
      g.vy += GRAVITY;
      const startX = g.x;
      const startY = g.y;
      const endX = g.x + g.vx;
      const endY = g.y + g.vy;

      let hitPlat = false;
      for (const plat of map.platforms) {
        const res = lineSegmentIntersectsBox(startX, startY, endX, endY, plat.x, plat.y, plat.w, plat.h);
        if (res.hit) {
          hitPlat = true;
          g.x = res.hitX;
          g.y = res.hitY;
          if (g.type === 'mine') {
            g.isStuck = true;
            g.vx = 0;
            g.vy = 0;
          } else {
            g.vy *= -0.5;
            g.vx *= 0.7;
          }
          break;
        }
      }
      if (!hitPlat) {
        g.x = endX;
        g.y = endY;
      }
    }

    // Proximity mine trigger check
    if (g.type === 'mine' && g.isStuck) {
      for (const p of players) {
        if (p.isDead || p.id === g.shooterId) continue;
        const dist = Math.hypot(p.x - g.x, p.y - g.y);
        if (dist < 80) { // Beep and detonate!
          g.timer = 0;
        }
      }
    }

    // Gas grenade cloud particles
    if (g.type === 'gas') {
      particles.push({
        x: g.x + (Math.random() - 0.5) * 40,
        y: g.y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 1.5,
        color: '#2ecc71',
        size: Math.random() * 10 + 10,
        alpha: 0.4,
        decay: 0.02,
        shape: 'smoke'
      });

      // Gas damage to nearby players
      for (const p of players) {
        if (p.isDead) continue;
        const dist = Math.hypot(p.x - g.x, p.y - g.y);
        if (dist < 100) {
          p.health -= 0.35;
          p.lastDamageTime = Date.now();
        }
      }
    }

    if (g.timer <= 0) {
      spawnExplosion(g.x, g.y, g.shooterId);
    } else {
      activeGrenades.push(g);
    }
  }

  return activeGrenades;
}

