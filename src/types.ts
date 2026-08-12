export type GameMode = 'quick' | 'survival' | 'team' | 'custom' | 'practice' | 'battle-royale';
export type MapId = 'outpost' | 'catacombs' | 'hightower';
export type BotDifficulty = 'easy' | 'medium' | 'hard' | 'pro';

export interface BlueZoneState {
  centerX: number;
  centerY: number;
  currentRadius: number;
  targetRadius: number;
  phase: number;
  isShrinking: boolean;
  shrinkTimer: number;
  damagePerSec: number;
}

export interface AirDrop {
  id: string;
  x: number;
  y: number;
  targetY: number;
  vy: number;
  isLanding: boolean;
  hasLanded: boolean;
  weaponType: WeaponType;
  lootClaimed: boolean;
}

export type WeaponType = 
  | 'punch'
  | 'smg'
  | 'ar'
  | 'sniper';

export type GrenadeType = 'frag' | 'gas' | 'mine';

export interface Weapon {
  id: WeaponType;
  name: string;
  category: 'melee' | 'pistol' | 'rifle' | 'heavy' | 'special';
  damage: number;
  fireRate: number; // shots per sec
  reloadTime: number; // ms
  magazineSize: number;
  reserveAmmo: number;
  spread: number;
  bulletSpeed: number;
  bulletsPerShot: number;
  recoil: number;
  color: string;
  zoomFactor: number; // 1.0 = normal, 1.4 = sniper zoom
  isDualWieldable: boolean;
  description: string;
  iconSymbol: string;
  maxRange?: number;
}

export interface AvatarConfig {
  headgear: 'helmet_commander' | 'beret_red' | 'bandana_green' | 'afro' | 'mask_gas' | 'cap_backwards' | 'none';
  hairColor: string;
  skinTone: string;
  eyeStyle: 'determined' | 'angry' | 'psycho' | 'shades' | 'normal';
  facialHair: 'none' | 'mustache' | 'beard_stubblem' | 'full_beard';
  outfitColor: string; // camo green, desert tan, urban blue, dark ops
  outfitPattern: 'camo' | 'solid' | 'stripe';
  name: string;
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
  team: 'red' | 'blue' | 'none';
  avatar: AvatarConfig;
  
  // Position & Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facingRight: boolean;
  aimAngle: number; // radians
  isGrounded: boolean;
  isCrouching: boolean;
  isBoosting: boolean; // Jetpack active
  isDead: boolean;
  respawnTimer: number;

  // Stats / Meters
  health: number; // 0 - 100
  maxHealth: number;
  nitro: number; // 0 - 100
  maxNitro: number;
  lastDamageTime: number;

  // Loadout
  primaryWeapon: WeaponType;
  secondaryWeapon: WeaponType | null;
  activeSlot: 'primary' | 'secondary';
  isDualWielding: boolean;
  currentMag: number;
  reserveAmmo: number;
  secondaryMag?: number;
  secondaryReserve?: number;
  isReloading: boolean;
  reloadProgress: number; // 0 - 1
  lastShotTime: number;
  
  // Grenades & Melee
  grenades: { type: GrenadeType; count: number }[];
  activeGrenade: GrenadeType;
  isMeleeAttacking: boolean;
  meleeTimer: number;

  // Score stats in match
  kills: number;
  deaths: number;
  suicides: number;
  damageDealt: number;
  headshots: number;
  streak: number;
  
  // Visuals
  opacity: number; // reduced in bushes
  inBush: boolean;

  // Smoothing & Interpolation Targets
  targetX?: number;
  targetY?: number;
  targetAimAngle?: number;
}

export interface Bullet {
  id: string;
  shooterId: string;
  weaponType: WeaponType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
  isExplosive?: boolean;
  isFlame?: boolean;
  isLaser?: boolean;
  distanceTraveled?: number;
  maxRange?: number;
  alpha?: number;
}

export interface GrenadeEntity {
  id: string;
  shooterId: string;
  type: GrenadeType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  timer: number; // count to explosion
  isArming?: boolean; // for proximity mine
  isStuck?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  shape?: 'circle' | 'square' | 'line' | 'smoke' | 'fire' | 'blood' | 'spark';
  rotation?: number;
  vRot?: number;
}

export interface WeaponPickup {
  id: string;
  weaponType: WeaponType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ammo: number;
  respawnTime: number; // if picked up
}

export interface HealthCrate {
  id: string;
  x: number;
  y: number;
  active: boolean;
  respawnTimer: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'solid' | 'one-way' | 'metal' | 'rock';
  color?: string;
}

export interface Bush {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameMap {
  id: MapId;
  name: string;
  width: number;
  height: number;
  backgroundColor: string;
  skyColor: string;
  platforms: Platform[];
  bushes: Bush[];
  spawns: Vector2D[];
  weaponSpawns: { x: number; y: number; weaponType: WeaponType }[];
  healthSpawns: Vector2D[];
  boosterSpawns?: Vector2D[];
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam: 'red' | 'blue' | 'none';
  victimName: string;
  victimTeam: 'red' | 'blue' | 'none';
  weaponUsed: string;
  isHeadshot: boolean;
  timestamp: number;
}

export interface GameSettings {
  soundVolume: number; // 0-1
  musicVolume: number; // 0-1
  botCount: number;
  botDifficulty: BotDifficulty;
  matchDuration: number; // in seconds, e.g. 300 = 5 mins
  killLimit: number; // e.g. 15
  goreEnabled: boolean;
  showTouchControls: boolean;
  joystickSize: 'small' | 'medium' | 'large';
  joystickPosition: 'bottom' | 'mid' | 'high';
  enableLaserSight: boolean;
  laserColor: 'red' | 'green' | 'cyan' | 'yellow';
  mapId: MapId;
  gameMode: GameMode;
}

export interface EndMatchStats {
  winnerTeam?: 'red' | 'blue';
  mvpPlayerId: string;
  players: Player[];
  durationPlayed: number;
}
