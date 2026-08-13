import { AvatarConfig, Player } from '../types';
import { WEAPONS } from '../data/weapons';

export function drawAvatar(
  ctx: CanvasRenderingContext2D,
  avatar: AvatarConfig,
  x: number,
  y: number,
  scale: number = 1.0,
  aimAngle: number = 0,
  facingRight: boolean = true,
  isBoosting: boolean = false,
  isCrouching: boolean = false,
  weaponType?: string,
  isDualWielding: boolean = false,
  opacity: number = 1.0,
  drawProgress: number = 1.0, // 0.0 (just swapped) -> 1.0 (fully drawn)
  isMeleeAttacking: boolean = false,
  vx: number = 0,
  vy: number = 0
) {
  const crouchOffsetY = isCrouching ? 14 : 0;

  // Local velocity relative to avatar facing direction
  const localVx = facingRight ? vx : -vx;
  const localVy = vy;
  const speed = Math.hypot(localVx, localVy);

  // --- MINI MILITIA STYLE BODY TILT ---
  // Body stays mostly upright. Only a subtle lean from horizontal movement.
  // The arm+gun handle aim direction independently (section 2 below).
  const forwardLean = localVx * 0.02;                       // gentle lean when running
  const fallLean = (localVy > 1 ? localVy * 0.015 : 0);     // slight forward lean when falling
  let tiltAngle = forwardLean + fallLean;
  tiltAngle = Math.max(-0.26, Math.min(0.26, tiltAngle));   // clamp ±15 degrees

  // --- 1. RENDER AVATAR BODY & HEAD (FACING DIRECTION & TILT TRANSFORM) ---
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * (facingRight ? 1 : -1), scale);
  ctx.rotate(tiltAngle);
  ctx.globalAlpha = opacity;

  // --- JETPACK & ROCKET BOOTS FLAME ---
  if (isBoosting) {
    ctx.save();
    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.arc(-10, 18 - (crouchOffsetY * 0.4) + (Math.random() * 6), 8, 0, Math.PI * 2);
    ctx.arc(10, 18 - (crouchOffsetY * 0.4) + (Math.random() * 6), 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fdcb6e';
    ctx.beginPath();
    ctx.arc(-10, 22 - (crouchOffsetY * 0.4) + (Math.random() * 8), 5, 0, Math.PI * 2);
    ctx.arc(10, 22 - (crouchOffsetY * 0.4) + (Math.random() * 8), 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-10, 20 - (crouchOffsetY * 0.4), 3, 0, Math.PI * 2);
    ctx.arc(10, 20 - (crouchOffsetY * 0.4), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- BOOTS / LEGS (PROPER CROUCHING STANCE vs STANDING LEGS) ---
  ctx.fillStyle = '#2d3436';
  if (isCrouching) {
    // Folded bent legs for low crouch stance
    ctx.fillRect(-14, 10 - crouchOffsetY, 12, 6);
    ctx.fillRect(2, 10 - crouchOffsetY, 12, 6);
    ctx.fillRect(-14, 14 - crouchOffsetY, 6, 7);
    ctx.fillRect(8, 14 - crouchOffsetY, 6, 7);
  } else {
    // Standing legs
    ctx.fillRect(-12, 12, 8, 12);
    ctx.fillRect(4, 12, 8, 12);
  }

  // --- TORSO / UNIFORM ---
  ctx.fillStyle = avatar.outfitColor || '#27ae60';
  ctx.beginPath();
  const torsoHeight = isCrouching ? 18 : 24;
  ctx.roundRect(-14, -8 - crouchOffsetY, 28, torsoHeight, 6);
  ctx.fill();

  // Camo pattern details
  if (avatar.outfitPattern === 'camo') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(-10, -4 - crouchOffsetY, 8, 5);
    ctx.fillRect(2, 2 - crouchOffsetY, 8, 5);
  }

  // --- HEAD & SKIN ---
  const headY = -22 - crouchOffsetY;
  ctx.fillStyle = avatar.skinTone || '#ffeaa7';
  ctx.beginPath();
  ctx.arc(0, headY, 14, 0, Math.PI * 2);
  ctx.fill();

  // --- EYES ---
  ctx.fillStyle = '#2d3436';
  if (avatar.eyeStyle === 'shades') {
    ctx.fillStyle = '#000';
    ctx.fillRect(2, headY - 4, 10, 6);
  } else if (avatar.eyeStyle === 'angry') {
    ctx.beginPath();
    ctx.arc(6, headY - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, headY - 6);
    ctx.lineTo(10, headY - 3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(6, headY - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- FACIAL HAIR ---
  if (avatar.facialHair !== 'none') {
    ctx.fillStyle = avatar.hairColor || '#2d3436';
    if (avatar.facialHair === 'mustache') {
      ctx.fillRect(2, headY + 3, 8, 3);
    } else {
      ctx.fillRect(2, headY + 2, 10, 6);
    }
  }

  // --- HEADGEAR ---
  ctx.fillStyle = '#27ae60';
  switch (avatar.headgear) {
    case 'helmet_commander':
      ctx.fillStyle = '#2c3e50';
      ctx.beginPath();
      ctx.arc(0, headY - 2, 16, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-16, headY - 4, 32, 6);
      break;
    case 'beret_red':
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.ellipse(2, headY - 10, 16, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana_green':
      ctx.fillStyle = '#16a085';
      ctx.fillRect(-14, headY - 10, 28, 7);
      break;
    case 'cap_backwards':
      ctx.fillStyle = '#2980b9';
      ctx.beginPath();
      ctx.arc(0, headY - 4, 15, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-18, headY - 6, 10, 4);
      break;
    case 'afro':
      ctx.fillStyle = avatar.hairColor || '#2d3436';
      ctx.beginPath();
      ctx.arc(0, headY - 6, 20, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'mask_gas':
      ctx.fillStyle = '#7f8c8d';
      ctx.beginPath();
      ctx.arc(4, headY + 4, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();

  // --- 2. RENDER ARM & GUN AT EXACT WORLD AIM ANGLE WITH ROTATED SHOULDER ---
  const localShoulderX = 2;
  const localShoulderY = -2 - crouchOffsetY;

  // Rotate local shoulder offset by tiltAngle
  const cosT = Math.cos(tiltAngle);
  const sinT = Math.sin(tiltAngle);
  const rotShoulderX = localShoulderX * cosT - localShoulderY * sinT;
  const rotShoulderY = localShoulderX * sinT + localShoulderY * cosT;

  const shoulderX = x + (facingRight ? rotShoulderX : -rotShoulderX) * scale;
  const shoulderY = y + rotShoulderY * scale;

  ctx.save();
  ctx.globalAlpha = opacity;

  let renderAngle = aimAngle;
  let forwardThrust = 0;

  // Gun Draw / Unholster dip (only during active 250ms swap transition)
  if (drawProgress < 1.0) {
    const unholsterDip = Math.sin(drawProgress * Math.PI) * 0.3;
    renderAngle += unholsterDip;
  }

  // Gun Smash Melee Strike Animation (| to __ smash chop in aim direction)
  if (isMeleeAttacking) {
    const smashProgress = Math.min(1.0, Math.max(0.0, (Date.now() % 350) / 350));
    const chopAngle = -0.95 + (1.2 * Math.sin(smashProgress * Math.PI));
    forwardThrust = 24 * Math.sin(smashProgress * Math.PI);
    renderAngle += chopAngle;

    // 50-Degree Impact Arc Wave
    const arcCenterX = shoulderX + Math.cos(aimAngle) * 32 * scale;
    const arcCenterY = shoulderY + Math.sin(aimAngle) * 32 * scale;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 234, 167, 0.95)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, 28 * scale, aimAngle - 0.7, aimAngle + 0.3);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(231, 76, 60, 0.9)';
    ctx.lineWidth = 2.5 * scale;
    ctx.beginPath();
    ctx.arc(arcCenterX, arcCenterY, 26 * scale, aimAngle - 0.65, aimAngle + 0.25);
    ctx.stroke();
    ctx.restore();
  }

  const pivotX = shoulderX + Math.cos(aimAngle) * forwardThrust * scale;
  const pivotY = shoulderY + Math.sin(aimAngle) * forwardThrust * scale;

  ctx.translate(pivotX, pivotY);
  ctx.rotate(renderAngle);
  if (!facingRight) {
    ctx.scale(1, -1); // Keep gun upright without Y-component angle distortion
  }

  // Draw Arm
  ctx.fillStyle = avatar.skinTone || '#ffeaa7';
  ctx.fillRect(0, -3, 14, 6);

  // Draw Gun/Weapon (Pointed 100% directly along aimAngle!)
  drawGunModel(ctx, weaponType || 'ar', isDualWielding);

  ctx.restore();
}

export function drawGunModel(
  ctx: CanvasRenderingContext2D,
  weaponType: string,
  isDualWielding: boolean = false
) {
  const type = weaponType ? weaponType.toLowerCase() : 'ar';

  if (type === 'ar' || type === 'assault' || type === 'ak47' || type === 'm4') {
    // --- ASSAULT RIFLE (AR-15) ---
    // Receiver & Body
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(8, -3, 14, 6);
    ctx.fillStyle = '#d35400'; // Wooden Stock & Grip
    ctx.fillRect(1, -2, 7, 5);
    // Barrel & Front Sight
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(22, -2, 14, 3);
    ctx.fillStyle = '#e67e22'; // Flash hider / Front sight
    ctx.fillRect(34, -4, 3, 5);
    // Curved Banana Magazine
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(16, 3, 5, 9);
    // Carrying Rail / Top Scope
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(10, -5, 10, 2);
  } else if (type === 'smg' || type === 'uzi' || type === 'pistol') {
    // --- SUBMACHINE GUN (SMG) ---
    // Main Body
    ctx.fillStyle = '#34495e';
    ctx.fillRect(8, -4, 14, 7);
    // Suppressor / Compact Barrel
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(22, -3, 10, 5);
    // Extended Straight Mag
    ctx.fillStyle = '#3498db';
    ctx.fillRect(14, 3, 4, 11);
    // Red Dot Sight
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(14, -6, 4, 2);
  } else if (type === 'sniper' || type === 'm200' || type === 'rifle') {
    // --- HEAVY SNIPER RIFLE ---
    // Main Chassis
    ctx.fillStyle = '#1e272c';
    ctx.fillRect(6, -4, 20, 8);
    // Long Heavy Barrel & Muzzle Brake
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(26, -2, 22, 4);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(46, -3, 4, 6);
    // High Optical Scope
    ctx.fillStyle = '#9b59b6';
    ctx.fillRect(12, -9, 14, 4);
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(24, -8, 2, 2); // Scope Lens Glint
    // Heavy Magazine
    ctx.fillStyle = '#34495e';
    ctx.fillRect(18, 4, 6, 8);
  } else if (type === 'punch' || type === 'fist') {
    // --- COMBAT FIST ---
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(16, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default AR Fallback Model
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(8, -3, 14, 6);
    ctx.fillStyle = '#d35400';
    ctx.fillRect(1, -2, 7, 5);
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(22, -2, 14, 3);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(16, 3, 5, 9);
  }

  if (isDualWielding && (type === 'smg' || type === 'uzi')) {
    ctx.fillStyle = '#34495e';
    ctx.fillRect(10, -12, 12, 5);
  }
}
