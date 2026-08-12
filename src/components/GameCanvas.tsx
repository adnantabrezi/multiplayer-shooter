import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AirDrop, BlueZoneState, Bullet, EndMatchStats, GameMap, GameSettings, GrenadeEntity, KillFeedEntry, Particle, Player, WeaponPickup, HealthCrate } from '../types';
import { MAPS } from '../data/maps';
import { WEAPONS, getWeapon } from '../data/weapons';
import { updateBotAI } from '../game/botAI';
import { updateBullets, updateGrenades, updatePlayerPhysics } from '../game/physics';
import { soundEngine } from '../audio/soundEngine';
import { drawAvatar, drawGunModel } from './renderAvatar';
import { TouchControls } from './TouchControls';
import { networkManager } from '../network/networkManager';
import { Shield, RefreshCw, Volume2, Pause, Crosshair, Zap, Globe, Radio, Maximize2, Minimize2 } from 'lucide-react';

const formatTimer = (seconds: number) => {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Crisp 100% matching gun model HUD preview using drawGunModel
const WeaponSilhouette: React.FC<{ type: string; className?: string }> = ({ type, className = "w-14 h-7" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(6, canvas.height / 2);
    ctx.scale(1.3, 1.3);
    drawGunModel(ctx, type);
    ctx.restore();
  }, [type]);

  return <canvas ref={canvasRef} width={80} height={36} className={`${className} object-contain inline-block`} />;
};

const GrenadeSilhouette: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 40 40" className={`${className} fill-current`}>
    <path d="M12 16 C12 8, 28 8, 28 16 C28 32, 12 32, 12 16 Z" />
    <path d="M17 6 L23 6 L23 10 L17 10 Z M14 8 L17 8 L17 10 L14 10 Z" />
    <path d="M14 18 L26 18 M14 24 L26 24 M20 10 L20 30" stroke="#1f242d" strokeWidth="2" />
  </svg>
);

const RadioSilhouette: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 40 40" className={`${className} fill-current`}>
    <path d="M14 4 L17 4 L17 14 L14 14 Z" />
    <path d="M10 14 L30 14 L30 36 L10 36 Z" />
    <path d="M14 18 L26 18 L26 24 L14 24 Z" fill="#1f242d" />
    <circle cx="16" cy="28" r="1.5" fill="#1f242d" />
    <circle cx="20" cy="28" r="1.5" fill="#1f242d" />
    <circle cx="24" cy="28" r="1.5" fill="#1f242d" />
    <circle cx="16" cy="32" r="1.5" fill="#1f242d" />
    <circle cx="20" cy="32" r="1.5" fill="#1f242d" />
    <circle cx="24" cy="32" r="1.5" fill="#1f242d" />
  </svg>
);

const AmmoStackIcon: React.FC<{ className?: string }> = ({ className = "w-3 h-3" }) => (
  <svg viewBox="0 0 20 20" className={`${className} fill-current`}>
    <rect x="2" y="3" width="16" height="3" rx="1" />
    <rect x="2" y="8.5" width="16" height="3" rx="1" />
    <rect x="2" y="14" width="16" height="3" rx="1" />
  </svg>
);

interface Props {
  settings: GameSettings;
  playerAvatar: any;
  onPause: () => void;
  onMatchEnd: (stats: EndMatchStats) => void;
  isMultiplayer?: boolean;
  roomCode?: string;
}

export const GameCanvas: React.FC<Props> = ({
  settings,
  playerAvatar,
  onPause,
  onMatchEnd,
  isMultiplayer = false,
  roomCode = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const map = MAPS[settings.mapId] || MAPS.outpost;

  // Game State Refs (High speed 60FPS loop)
  const playersRef = useRef<Player[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const grenadesRef = useRef<GrenadeEntity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const pickupsRef = useRef<WeaponPickup[]>([]);
  const healthCratesRef = useRef<HealthCrate[]>([]);
  const boosterCratesRef = useRef<HealthCrate[]>([]);
  const killFeedRef = useRef<KillFeedEntry[]>([]);

  const [hudState, setHudState] = useState({
    health: 100,
    nitro: 100,
    ammo: 30,
    reserve: 120,
    primaryWeapon: 'ar',
    secondaryWeapon: 'smg' as string | null,
    activeSlot: 'primary',
    grenadeCount: 3,
    isReloading: false,
    reloadProgress: 0,
    timeRemaining: settings.matchDuration
  });

  const [scopeZoom, setScopeZoom] = useState<'1X' | '2X' | '4X' | '8X'>('1X');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    const doc = document as any;
    const elem = document.documentElement as any;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => { });
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => { });
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    }
  };

  const cycleScope = useCallback(() => {
    setScopeZoom((prev) => (prev === '1X' ? '2X' : prev === '2X' ? '4X' : prev === '4X' ? '8X' : '1X'));
    soundEngine.playPickup();
  }, []);

  const mousePosRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const touchInputsRef = useRef({ moveX: 0, moveY: 0, isBoosting: false, isCrouching: false, aimAngle: null as number | null, isShooting: false });
  const cameraPosRef = useRef<{ x: number; y: number } | null>(null);

  // Weapon swap, pickup & animation refs
  const pendingSwapWeaponRef = useRef(false);
  const pendingPickUpWeaponRef = useRef(false);
  const pendingThrowGrenadeRef = useRef(false);
  const pendingGrenadeFuseRef = useRef(5.0);
  const pendingMeleeRef = useRef(false);
  const isCookingGrenadeRef = useRef(false);
  const cookStartTimeRef = useRef(0);
  const drawWeaponTimerRef = useRef(0); // 0 -> 250ms draw animation
  const timeRemainingRef = useRef<number>(settings.matchDuration);
  const matchEndedRef = useRef<boolean>(false);

  // PUBG Battle Royale Refs


  const blueZoneRef = useRef<BlueZoneState>({
    centerX: map.width / 2,
    centerY: map.height / 2,
    currentRadius: Math.max(map.width, map.height) * 0.85,
    targetRadius: Math.max(map.width, map.height) * 0.85,
    phase: 1,
    isShrinking: false,
    shrinkTimer: 25.0,
    damagePerSec: 4.0
  });

  const airDropsRef = useRef<AirDrop[]>([]);

  const [cookingFuseRemaining, setCookingFuseRemaining] = useState<number | null>(null);
  const [nearbyPickup, setNearbyPickup] = useState<{ weaponType: string; name: string; ammo: number } | null>(null);

  // Initialize Players, Bots, and Map Weapons
  useEffect(() => {
    // Local Human Player
    const localId = isMultiplayer ? (networkManager.clientId || 'human_1') : 'human_1';
    const humanPlayer: Player = {
      id: localId,
      name: playerAvatar.name || 'Soldier',
      isBot: false,
      team: settings.gameMode === 'team' ? 'blue' : 'none',
      avatar: playerAvatar,
      x: map.spawns[0]?.x || 300,
      y: map.spawns[0]?.y || 300,
      vx: 0,
      vy: 0,
      radius: 18,
      facingRight: true,
      aimAngle: 0,
      isGrounded: false,
      isCrouching: false,
      isBoosting: false,
      isDead: false,
      respawnTimer: 0,
      health: 100,
      maxHealth: 100,
      nitro: 100,
      maxNitro: 100,
      lastDamageTime: 0,
      primaryWeapon: 'ar',
      secondaryWeapon: 'smg',
      activeSlot: 'primary',
      isDualWielding: false,
      currentMag: WEAPONS.ar.magazineSize,
      reserveAmmo: WEAPONS.ar.reserveAmmo,
      isReloading: false,
      reloadProgress: 0,
      lastShotTime: 0,
      grenades: [{ type: 'frag', count: 3 }],
      activeGrenade: 'frag',
      isMeleeAttacking: false,
      meleeTimer: 0,
      kills: 0,
      deaths: 0,
      suicides: 0,
      damageDealt: 0,
      headshots: 0,
      streak: 0,
      opacity: 1,
      inBush: false
    };

    const initialPlayers: Player[] = [humanPlayer];

    // Only spawn client-side AI bots in singleplayer mode
    // In multiplayer, the server owns all player/bot entities
    if (!isMultiplayer) {
      const botNames = ['Bot Bob', 'Bot Alex', 'Bot Viper', 'Bot Razor', 'Bot Titan', 'Bot Ghost', 'Bot Shadow', 'Bot Cobra'];
      const botCount = settings.botCount;

      for (let i = 0; i < botCount; i++) {
        const spawnPt = map.spawns[(i + 1) % map.spawns.length];
        const botPrimary = i % 3 === 0 ? 'sniper' : i % 2 === 0 ? 'ar' : 'smg';
        initialPlayers.push({
          id: `bot_${i}`,
          name: botNames[i % botNames.length],
          isBot: true,
          botDifficulty: settings.botDifficulty,
          team: settings.gameMode === 'team' ? (i % 2 === 0 ? 'red' : 'blue') : 'none',
          avatar: {
            headgear: i % 2 === 0 ? 'helmet_commander' : 'bandana_green',
            hairColor: '#2d3436',
            skinTone: '#ffeaa7',
            eyeStyle: 'angry',
            facialHair: i % 3 === 0 ? 'mustache' : 'none',
            outfitColor: i % 2 === 0 ? '#d35400' : '#2980b9',
            outfitPattern: 'camo',
            name: botNames[i % botNames.length]
          },
          x: spawnPt.x,
          y: spawnPt.y,
          vx: 0,
          vy: 0,
          radius: 18,
          facingRight: true,
          aimAngle: 0,
          isGrounded: false,
          isCrouching: false,
          isBoosting: false,
          isDead: false,
          respawnTimer: 0,
          health: 100,
          maxHealth: 100,
          nitro: 100,
          maxNitro: 100,
          lastDamageTime: 0,
          primaryWeapon: botPrimary,
          secondaryWeapon: 'smg',
          activeSlot: 'primary',
          isDualWielding: false,
          currentMag: getWeapon(botPrimary).magazineSize,
          reserveAmmo: getWeapon(botPrimary).reserveAmmo,
          isReloading: false,
          reloadProgress: 0,
          lastShotTime: 0,
          grenades: [{ type: 'frag', count: 2 }],
          activeGrenade: 'frag',
          isMeleeAttacking: false,
          meleeTimer: 0,
          kills: 0,
          deaths: 0,
          suicides: 0,
          damageDealt: 0,
          headshots: 0,
          streak: 0,
          opacity: 1,
          inBush: false
        });
      }
    }

    playersRef.current = initialPlayers;

    // Map Weapon Spawns
    pickupsRef.current = map.weaponSpawns.map((w, idx) => ({
      id: `pickup_${idx}`,
      weaponType: w.weaponType,
      x: w.x,
      y: w.y,
      vx: 0,
      vy: 0,
      ammo: getWeapon(w.weaponType).magazineSize,
      respawnTime: 0
    }));

    // Health Crates & Booster Refills
    healthCratesRef.current = map.healthSpawns.map((h, idx) => ({
      id: `health_${idx}`,
      x: h.x,
      y: h.y,
      active: true,
      respawnTimer: 0
    }));

    const boosterPositions = map.boosterSpawns || map.healthSpawns.map(h => ({ x: h.x + (h.x > map.width / 2 ? -120 : 120), y: h.y }));
    boosterCratesRef.current = boosterPositions.map((b, idx) => ({
      id: `booster_${idx}`,
      x: b.x,
      y: b.y,
      active: true,
      respawnTimer: 0
    }));

    if (isMultiplayer) {
      networkManager.onSnapshotReceived = (snapshot, interpolatedPlayers) => {
        bulletsRef.current = snapshot.bullets || [];

        // Spawn visual & audio explosion effects from server explosion events
        const explosions = (snapshot as any).explosions || [];
        for (const exp of explosions) {
          spawnExplosion(exp.x, exp.y, exp.shooterId);
        }

        // Also check grenade disappearance as fallback
        const incomingGrenades = snapshot.grenades || [];
        if (explosions.length === 0) {
          for (const prevG of grenadesRef.current) {
            if ((prevG.id.startsWith('g_') || prevG.id.startsWith('gren_')) && !incomingGrenades.some((g) => g.id === prevG.id)) {
              spawnExplosion(prevG.x, prevG.y, prevG.shooterId);
            }
          }
        }
        grenadesRef.current = incomingGrenades;

        pickupsRef.current = snapshot.pickups || [];
        healthCratesRef.current = snapshot.healthCrates || [];
        if (snapshot.boosterCrates) {
          boosterCratesRef.current = snapshot.boosterCrates;
        }
        if (snapshot.blueZone) {
          blueZoneRef.current = snapshot.blueZone;
        }
        if (snapshot.airDrops) {
          airDropsRef.current = snapshot.airDrops;
        }
        if (snapshot.killFeed && snapshot.killFeed.length > 0) {
          killFeedRef.current = snapshot.killFeed;
        }

        if (snapshot.timeRemaining !== undefined) {
          timeRemainingRef.current = snapshot.timeRemaining;
          if (timeRemainingRef.current <= 0 && !matchEndedRef.current) {
            matchEndedRef.current = true;
            const sorted = [...(interpolatedPlayers || [])].sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt);
            const winner = sorted[0];
            onMatchEnd({
              mvpPlayerId: winner ? winner.id : 'human_1',
              players: interpolatedPlayers || [],
              durationPlayed: settings.matchDuration
            });
          }
        }

        const serverId = networkManager.clientId || 'human_1';
        const playerMap = new Map<string, Player>();

        const rawServerPlayers = snapshot.players || interpolatedPlayers || [];

        for (const interpP of rawServerPlayers) {
          const isLocalPlayer = interpP.id === serverId;

          if (isLocalPlayer) {
            // Merge server-authoritative state into the locally-predicted player
            const existingLocal = playersRef.current.find((p) => p.id === 'human_1' || p.id === serverId);
            if (existingLocal) {
              existingLocal.id = 'human_1';
              existingLocal.health = interpP.health;
              existingLocal.nitro = interpP.nitro;
              existingLocal.kills = interpP.kills;
              existingLocal.deaths = interpP.deaths;
              existingLocal.isDead = interpP.isDead;
              if (interpP.primaryWeapon) existingLocal.primaryWeapon = interpP.primaryWeapon;
              if (interpP.secondaryWeapon !== undefined) existingLocal.secondaryWeapon = interpP.secondaryWeapon;
              existingLocal.currentMag = interpP.currentMag;
              existingLocal.reserveAmmo = interpP.reserveAmmo;
              existingLocal.isReloading = interpP.isReloading;
              existingLocal.reloadProgress = interpP.reloadProgress;

              // Smoothly blend local player position if server & client drift > 60px
              const drift = Math.hypot(existingLocal.x - interpP.x, existingLocal.y - interpP.y);
              if (drift > 200) {
                existingLocal.x = interpP.x;
                existingLocal.y = interpP.y;
              } else if (drift > 60) {
                existingLocal.x = existingLocal.x * 0.5 + interpP.x * 0.5;
                existingLocal.y = existingLocal.y * 0.5 + interpP.y * 0.5;
              }
              playerMap.set('human_1', existingLocal);
            } else {
              playerMap.set('human_1', { ...interpP, id: 'human_1' });
            }
          } else {
            // Remote player — track target positions for 60FPS continuous interpolation
            const existingRemote = playersRef.current.find((p) => p.id === interpP.id);
            if (existingRemote) {
              existingRemote.targetX = interpP.x;
              existingRemote.targetY = interpP.y;
              existingRemote.targetAimAngle = interpP.aimAngle;
              existingRemote.vx = interpP.vx;
              existingRemote.vy = interpP.vy;
              existingRemote.health = interpP.health;
              existingRemote.maxHealth = interpP.maxHealth;
              existingRemote.isDead = interpP.isDead;
              existingRemote.primaryWeapon = interpP.primaryWeapon;
              existingRemote.secondaryWeapon = interpP.secondaryWeapon;
              existingRemote.currentMag = interpP.currentMag;
              existingRemote.reserveAmmo = interpP.reserveAmmo;
              existingRemote.facingRight = interpP.facingRight;
              existingRemote.isBoosting = interpP.isBoosting;
              existingRemote.isCrouching = interpP.isCrouching;
              existingRemote.isMeleeAttacking = interpP.isMeleeAttacking;
              existingRemote.kills = interpP.kills;
              existingRemote.deaths = interpP.deaths;
              existingRemote.avatar = interpP.avatar;
              playerMap.set(interpP.id, existingRemote);
            } else {
              playerMap.set(interpP.id, {
                ...interpP,
                targetX: interpP.x,
                targetY: interpP.y,
                targetAimAngle: interpP.aimAngle
              });
            }
          }
        }
        playersRef.current = Array.from(playerMap.values());
      };
    }

  }, [settings, map, playerAvatar, isMultiplayer]);

  // Keyboard and Mouse Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
      if (e.key) keysRef.current[e.key.toLowerCase()] = true;
      if (e.key) keysRef.current[e.key.toUpperCase()] = true;

      const p = playersRef.current.find((pl) => pl.id === 'human_1');
      if (!p || p.isDead) return;

      const keyLower = e.key ? e.key.toLowerCase() : '';

      if (e.code === 'KeyR' || keyLower === 'r') reloadWeapon(p);
      if (e.code === 'KeyE' || keyLower === 'e') pickUpWeapon(p);
      if (e.code === 'KeyQ' || e.code === 'Digit1' || e.code === 'Digit2' || keyLower === 'q' || keyLower === '1' || keyLower === '2') swapWeapon(p);
      if (e.code === 'KeyG' || keyLower === 'g') startCookingGrenade(p);
      if (e.code === 'KeyF' || e.code === 'KeyV' || keyLower === 'f' || keyLower === 'v') performMelee(p);
      if (e.code === 'KeyZ' || e.code === 'KeyC' || keyLower === 'z' || keyLower === 'c') cycleScope();
      if (e.code === 'Escape' || keyLower === 'escape') onPause();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (e.key) keysRef.current[e.key.toLowerCase()] = false;
      if (e.key) keysRef.current[e.key.toUpperCase()] = false;

      const keyLower = e.key ? e.key.toLowerCase() : '';
      if (e.code === 'KeyG' || keyLower === 'g') {
        const p = playersRef.current.find((pl) => pl.id === 'human_1');
        if (p) releaseAndThrowGrenade(p);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        keysRef.current['MouseLeft'] = true;
      } else if (e.button === 2) { // Right Click = Cook Grenade!
        const p = playersRef.current.find((pl) => pl.id === 'human_1');
        if (p && !p.isDead) startCookingGrenade(p);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        keysRef.current['MouseLeft'] = false;
      } else if (e.button === 2) { // Release Right Click = Throw Cooked Grenade!
        const p = playersRef.current.find((pl) => pl.id === 'human_1');
        if (p) releaseAndThrowGrenade(p);
      }
    };

    const handleWheel = (e: WheelEvent) => { // Scroll Wheel = Swap Weapon!
      const p = playersRef.current.find((pl) => pl.id === 'human_1');
      if (p && !p.isDead) swapWeapon(p);
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent right-click browser context menu during gameplay
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [onPause]);

  // Helper Functions
  const shootWeapon = (p: Player, angle: number) => {
    if (p.isDead || p.isReloading) return;

    const now = Date.now();
    const w = getWeapon(p.primaryWeapon);
    const fireInterval = 1000 / w.fireRate;

    if (now - p.lastShotTime < fireInterval) return;
    if (p.currentMag <= 0) {
      reloadWeapon(p);
      return;
    }

    p.currentMag -= 1;
    p.lastShotTime = now;

    // Auto-reload immediately if last bullet in magazine was fired!
    if (p.currentMag <= 0 && p.reserveAmmo > 0) {
      reloadWeapon(p);
    }

    soundEngine.playWeaponShoot(w.id);

    // Jetpack recoil pulse
    p.vx -= Math.cos(angle) * (w.recoil * 0.4);
    p.vy -= Math.sin(angle) * (w.recoil * 0.4);

    // Calculate exact gun muzzle tip position from shoulder pivot
    const shoulderX = p.x + (p.facingRight ? 2 : -2);
    const shoulderY = p.y - (p.isCrouching ? 10 : 2);
    const muzzleDist = 30;
    const startX = shoulderX + Math.cos(angle) * muzzleDist;
    const startY = shoulderY + Math.sin(angle) * muzzleDist;

    // Spawn Bullets / Projectiles
    for (let i = 0; i < w.bulletsPerShot; i++) {
      const spreadAngle = angle + (Math.random() - 0.5) * w.spread;
      const b: Bullet = {
        id: `b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        shooterId: p.id === 'human_1' ? (networkManager.clientId || 'human_1') : p.id,
        weaponType: w.id,
        x: startX,
        y: startY,
        vx: Math.cos(spreadAngle) * w.bulletSpeed,
        vy: Math.sin(spreadAngle) * w.bulletSpeed,
        damage: w.damage,
        color: w.color,
        radius: 3,
        life: 80,
        maxLife: 80,
        maxRange: w.maxRange || 1200,
        distanceTraveled: 0,
        alpha: 1.0,
        isExplosive: false,
        isFlame: false,
        isLaser: false
      };
      bulletsRef.current.push(b);
      if (isMultiplayer && (p.id === 'human_1' || p.id === networkManager.clientId)) {
        networkManager.sendBulletSpawn(b);
      }
    }
  };

  const reloadWeapon = (p: Player) => {
    if (p.isReloading || p.reserveAmmo <= 0) return;
    const w = getWeapon(p.primaryWeapon);
    if (p.currentMag >= w.magazineSize) return;

    p.isReloading = true;
    p.reloadProgress = 0;
    soundEngine.playReload();
  };

  const swapWeapon = (p: Player) => {
    if (!p.secondaryWeapon) return;
    const tempW = p.primaryWeapon;
    p.primaryWeapon = p.secondaryWeapon;
    p.secondaryWeapon = tempW;

    // Swap ammo states cleanly so each weapon retains its magazine and reserve ammo
    const tempMag = p.currentMag;
    const tempReserve = p.reserveAmmo;
    p.currentMag = p.secondaryMag !== undefined ? p.secondaryMag : getWeapon(p.primaryWeapon).magazineSize;
    p.reserveAmmo = p.secondaryReserve !== undefined ? p.secondaryReserve : getWeapon(p.primaryWeapon).reserveAmmo;
    p.secondaryMag = tempMag;
    p.secondaryReserve = tempReserve;

    p.isReloading = false;
    p.reloadProgress = 0;

    // Trigger Gun Draw Animation (250ms timer) & Network Sync
    drawWeaponTimerRef.current = 250;
    pendingSwapWeaponRef.current = true;
    soundEngine.playPickup();
  };

  const pickUpWeapon = useCallback((p: Player) => {
    if (p.isDead) return;

    // In multiplayer, always send the pickup request to server (it does authoritative proximity check)
    if (isMultiplayer) {
      pendingPickUpWeaponRef.current = true;
      drawWeaponTimerRef.current = 250;
      soundEngine.playPickup();
      return;
    }

    const nearby = pickupsRef.current.find(
      (pickup) => pickup.respawnTime <= 0 && Math.hypot(pickup.x - p.x, pickup.y - p.y) < 60
    );
    if (nearby) {
      const newWeaponType = nearby.weaponType;
      const w = getWeapon(newWeaponType);

      const oldPrimary = p.primaryWeapon;
      const oldMag = p.currentMag;
      const oldReserve = p.reserveAmmo;

      p.secondaryWeapon = oldPrimary;
      p.secondaryMag = oldMag;
      p.secondaryReserve = oldReserve;

      p.primaryWeapon = newWeaponType;
      p.currentMag = w.magazineSize;
      p.reserveAmmo = w.reserveAmmo;
      p.isReloading = false;
      p.reloadProgress = 0;

      nearby.respawnTime = 8.0; // 8s respawn timer
      soundEngine.playPickup();
      drawWeaponTimerRef.current = 250;
      pendingPickUpWeaponRef.current = true;
    }
  }, []);

  const startCookingGrenade = (p: Player) => {
    if (p.isDead || isCookingGrenadeRef.current) return;
    const gSlot = p.grenades.find((g) => g.type === p.activeGrenade && g.count > 0);
    if (!gSlot) return;

    isCookingGrenadeRef.current = true;
    cookStartTimeRef.current = Date.now();
    soundEngine.playPickup();
  };

  const throwCookedGrenade = (p: Player, remainingFuse: number) => {
    if (p.isDead) return;
    const gSlot = p.grenades.find((g) => g.type === p.activeGrenade && g.count > 0);
    if (!gSlot) return;

    gSlot.count -= 1;
    pendingThrowGrenadeRef.current = true;
    pendingGrenadeFuseRef.current = Math.max(0.05, remainingFuse);
    soundEngine.playWeaponShoot('throw');

    const speed = 12;
    const g: GrenadeEntity = {
      id: `gren_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      shooterId: p.id === 'human_1' ? (networkManager.clientId || 'human_1') : p.id,
      type: p.activeGrenade,
      x: p.x,
      y: p.y - 10,
      vx: Math.cos(p.aimAngle) * speed,
      vy: Math.sin(p.aimAngle) * speed,
      timer: Math.max(0.1, remainingFuse)
    };
    grenadesRef.current.push(g);
    if (isMultiplayer) {
      networkManager.sendGrenadeSpawn(g);
    }
  };

  const releaseAndThrowGrenade = (p: Player) => {
    if (!isCookingGrenadeRef.current) return;
    isCookingGrenadeRef.current = false;
    setCookingFuseRemaining(null);
    const elapsed = (Date.now() - cookStartTimeRef.current) / 1000.0;
    const remainingFuse = Math.max(0.1, 5.0 - elapsed);
    throwCookedGrenade(p, remainingFuse);
  };

  const throwGrenade = (p: Player) => {
    if (isCookingGrenadeRef.current) {
      releaseAndThrowGrenade(p);
    } else {
      throwCookedGrenade(p, 5.0);
    }
  };

  const performMelee = (p: Player) => {
    if (p.isMeleeAttacking || p.isDead) return;
    p.isMeleeAttacking = true;
    pendingMeleeRef.current = true;
    soundEngine.playWeaponShoot('punch');

    // Explosive Forward Lurch Dash Impulse in direction of aim!
    const dashSpeed = 18.5;
    p.vx += Math.cos(p.aimAngle) * dashSpeed;
    p.vy += Math.sin(p.aimAngle) * (dashSpeed * 0.75);

    let hitTarget = false;

    // Check hit nearby players
    for (const other of playersRef.current) {
      if (other.id === p.id || other.isDead) continue;
      const dist = Math.hypot(other.x - p.x, other.y - p.y);
      if (dist < 78) {
        hitTarget = true;
        other.health -= 65;
        other.lastDamageTime = Date.now();
        p.damageDealt += 65;
        soundEngine.playHitMarker(false);

        if (isMultiplayer) {
          networkManager.sendPlayerHit(other.id, 65, 'Gun Smash Melee');
        }

        // Massive Knockback Impulse launching opponent across the screen!
        other.vx += Math.cos(p.aimAngle) * 24.0;
        other.vy += Math.sin(p.aimAngle) * 20.0 - 5.0;

        // Visual Impact Sparks & Shockwave ring
        for (let i = 0; i < 14; i++) {
          const sparkAngle = Math.random() * Math.PI * 2;
          const sparkSpeed = 3 + Math.random() * 8;
          particlesRef.current.push({
            x: other.x,
            y: other.y,
            vx: Math.cos(sparkAngle) * sparkSpeed,
            vy: Math.sin(sparkAngle) * sparkSpeed,
            life: 0.3 + Math.random() * 0.2,
            maxLife: 0.5,
            color: i % 2 === 0 ? '#ff7675' : '#fdcb6e',
            radius: 3 + Math.random() * 3
          });
        }

        if (other.health <= 0) {
          handleKill(p, other, 'Gun Smash Melee', false);
        }
      }
    }

    if (hitTarget) {
      soundEngine.playExplosion();
    }

    setTimeout(() => {
      p.isMeleeAttacking = false;
    }, 350);
  };

  const spawnExplosion = (x: number, y: number, shooterId: string) => {
    soundEngine.playExplosion();

    // Fire & Smoke Particles
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        color: i % 2 === 0 ? '#e74c3c' : '#f39c12',
        size: Math.random() * 8 + 4,
        alpha: 1,
        decay: 0.04,
        shape: 'fire'
      });
    }

    // Blast Damage
    for (const p of playersRef.current) {
      if (p.isDead) continue;
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 140) {
        const damage = (1 - dist / 140) * 110;
        p.health -= damage;
        p.lastDamageTime = Date.now();

        // Pushback force
        const angle = Math.atan2(p.y - y, p.x - x);
        p.vx += Math.cos(angle) * 8;
        p.vy += Math.sin(angle) * 8;

        if (p.health <= 0) {
          const shooter = playersRef.current.find((s) => s.id === shooterId);
          if (shooter) handleKill(shooter, p, 'Explosion', false);
        }
      }
    }
  };

  const handleKill = (killer: Player, victim: Player, weaponName: string, isHeadshot: boolean) => {
    victim.isDead = true;
    victim.deaths += 1;
    victim.respawnTimer = 4000;

    if (killer.id === victim.id) {
      killer.suicides += 1;
      killer.kills = Math.max(0, killer.kills - 1);
    } else {
      killer.kills += 1;
      killer.streak += 1;
      killer.damageDealt += 100;
      if (isHeadshot) killer.headshots += 1;

      // Announcer kill streak callouts!
      if (killer.id === 'human_1') {
        soundEngine.playHitMarker(isHeadshot);
        if (killer.kills === 1) soundEngine.playAnnouncer('First Blood!');
        else if (killer.streak === 2) soundEngine.playAnnouncer('Double Kill!');
        else if (killer.streak === 3) soundEngine.playAnnouncer('Triple Kill!');
        else if (killer.streak >= 4) soundEngine.playAnnouncer('Unstoppable!');
      }
    }

    // Kill Feed Record
    killFeedRef.current.unshift({
      id: `kf_${Math.random()}`,
      killerName: killer.name,
      killerTeam: killer.team,
      victimName: victim.name,
      victimTeam: victim.team,
      weaponUsed: weaponName,
      isHeadshot,
      timestamp: Date.now()
    });
    if (killFeedRef.current.length > 5) killFeedRef.current.pop();
  };

  // Throttled HUD & Network send refs
  const lastHudUpdateRef = useRef<number>(0);
  const lastStateSendTimeRef = useRef<number>(0);

  // Main 60FPS Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const rawDt = time - lastTime;
      lastTime = time;
      const dt = Math.min(rawDt, 32); // Cap delta time for smooth physics on mobile CPUs

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Robust Canvas Resizing (prevents blank/white screen on mobile layout mount)
      const targetW = Math.floor(canvas.clientWidth || window.innerWidth);
      const targetH = Math.floor(canvas.clientHeight || window.innerHeight);
      if (targetW > 0 && targetH > 0 && (canvas.width !== targetW || canvas.height !== targetH)) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const human = playersRef.current.find((p) => p.id === 'human_1');

      // --- HUMAN INPUT PROCESSING ---
      if (human && !human.isDead) {
        // Keyboard & Smooth Touch Mobile movement
        const moveLeft = keysRef.current['KeyA'] || keysRef.current['ArrowLeft'] || keysRef.current['a'] || keysRef.current['A'] || touchInputsRef.current.moveX < -0.15;
        const moveRight = keysRef.current['KeyD'] || keysRef.current['ArrowRight'] || keysRef.current['d'] || keysRef.current['D'] || touchInputsRef.current.moveX > 0.15;
        const boost = keysRef.current['KeyW'] || keysRef.current['Space'] || keysRef.current['ArrowUp'] || keysRef.current['w'] || keysRef.current['W'] || keysRef.current[' '] || touchInputsRef.current.isBoosting;
        const crouch = keysRef.current['KeyS'] || keysRef.current['ArrowDown'] || keysRef.current['s'] || keysRef.current['S'] || touchInputsRef.current.isCrouching;

        // Calculate Mouse Aim angle relative to exact player screen position
        const zoomFactor = scopeZoom === '8X' ? 0.45 : scopeZoom === '4X' ? 0.65 : scopeZoom === '2X' ? 0.82 : 1.0;

        let aimAngle = human.aimAngle;
        if (settings.showTouchControls) {
          if (touchInputsRef.current.aimAngle !== null) {
            aimAngle = touchInputsRef.current.aimAngle;
          }
        } else {
          const camX = cameraPosRef.current ? cameraPosRef.current.x : human.x - (canvas.width / zoomFactor) / 2;
          const camY = cameraPosRef.current ? cameraPosRef.current.y : human.y - (canvas.height / zoomFactor) / 2;
          const playerScreenX = (human.x - camX) * zoomFactor;
          const playerScreenY = (human.y - camY) * zoomFactor;
          aimAngle = Math.atan2(mousePosRef.current.y - playerScreenY, mousePosRef.current.x - playerScreenX);
        }

        const isShooting = keysRef.current['MouseLeft'] || touchInputsRef.current.isShooting;

        if (drawWeaponTimerRef.current > 0) {
          drawWeaponTimerRef.current = Math.max(0, drawWeaponTimerRef.current - dt * 1000);
        }

        if (isMultiplayer) {
          networkManager.sendInput({
            moveLeft,
            moveRight,
            boost,
            crouch,
            aimAngle,
            isShooting,
            throwGrenade: pendingThrowGrenadeRef.current,
            grenadeFuse: pendingGrenadeFuseRef.current,
            swapWeapon: pendingSwapWeaponRef.current,
            pickUpWeapon: pendingPickUpWeaponRef.current,
            reload: keysRef.current['KeyR'] || human.isReloading || false,
            melee: pendingMeleeRef.current
          });
          pendingSwapWeaponRef.current = false;
          pendingThrowGrenadeRef.current = false;
          pendingGrenadeFuseRef.current = 5.0;
          pendingPickUpWeaponRef.current = false;
          pendingMeleeRef.current = false;
        }

        // Live Cooking Fuse Countdown Tick & Hand-detonation check
        if (isCookingGrenadeRef.current) {
          const elapsed = (Date.now() - cookStartTimeRef.current) / 1000.0;
          const remaining = Math.max(0, 5.0 - elapsed);
          setCookingFuseRemaining(remaining);
          if (remaining <= 0) {
            // BOOM! Explodes in hand!
            isCookingGrenadeRef.current = false;
            setCookingFuseRemaining(null);
            throwCookedGrenade(human, 0.05);
          }
        }

        updatePlayerPhysics(human, map, { moveLeft, moveRight, boost, crouch, aimAngle }, dt);

        if (isMultiplayer && human && time - lastStateSendTimeRef.current > 33) {
          lastStateSendTimeRef.current = time;
          networkManager.sendPlayerState({
            ...human,
            id: networkManager.clientId || 'human_1'
          });
        }

        // Jetpack audio feedback
        if (boost && human.nitro > 0) soundEngine.startJetpack();
        else soundEngine.stopJetpack();

        // Shooting
        if (isShooting) {
          shootWeapon(human, aimAngle);
        }

        // Throttle React HUD updates to 10Hz (every 100ms) to eliminate React re-render micro-stuttering!
        if (time - lastHudUpdateRef.current > 100) {
          lastHudUpdateRef.current = time;

          const nearby = human && !human.isDead
            ? pickupsRef.current.find(p => p.respawnTime <= 0 && Math.hypot(p.x - human.x, p.y - human.y) < 55)
            : null;

          if (nearby) {
            setNearbyPickup({ weaponType: nearby.weaponType, name: getWeapon(nearby.weaponType).name, ammo: nearby.ammo });
          } else {
            setNearbyPickup(null);
          }

          setHudState({
            health: Math.max(0, human.health),
            nitro: Math.max(0, human.nitro),
            ammo: human.currentMag,
            reserve: human.reserveAmmo,
            secondaryMag: human.secondaryMag,
            secondaryReserve: human.secondaryReserve,
            primaryWeapon: human.primaryWeapon,
            secondaryWeapon: human.secondaryWeapon,
            activeSlot: human.activeSlot,
            grenadeCount: human.grenades[0]?.count || 0,
            isReloading: human.isReloading,
            reloadProgress: human.reloadProgress,
            isDrawAnim: drawWeaponTimerRef.current > 0,
            timeRemaining: Math.max(0, timeRemainingRef.current)
          });
        }
      }

      // --- PER-FRAME 60FPS ULTRA-SMOOTH REMOTE PLAYER INTERPOLATION (Multiplayer) ---
      if (isMultiplayer) {
        const serverId = networkManager.clientId || 'human_1';
        playersRef.current.forEach((p) => {
          if (p.id !== 'human_1' && p.id !== serverId) {
            if (p.targetX !== undefined && p.targetY !== undefined) {
              const dx = p.targetX - p.x;
              const dy = p.targetY - p.y;
              const dist = Math.hypot(dx, dy);

              if (dist > 200 || p.isDead) {
                // Instantly snap on respawns / teleports
                p.x = p.targetX;
                p.y = p.targetY;
              } else if (dist > 0.05) {
                // Smooth 60FPS exponential glide with velocity dead-reckoning towards target
                const blend = Math.min(1.0, (dt / 1000) * 22.0); // ~0.35 per frame at 60fps
                p.x += dx * blend + (p.vx || 0) * (dt / 1000) * 0.5;
                p.y += dy * blend + (p.vy || 0) * (dt / 1000) * 0.5;
              }
            }

            if (p.targetAimAngle !== undefined) {
              let diff = p.targetAimAngle - p.aimAngle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              p.aimAngle += diff * Math.min(1.0, (dt / 1000) * 22.0);
            }
          }
        });
      }

      // --- AI BOTS PROCESSING (Offline mode only) ---
      if (!isMultiplayer) {
        playersRef.current.forEach((p) => {
          if (p.isBot) {
            const botInput = updateBotAI(
              p,
              playersRef.current,
              pickupsRef.current,
              map,
              dt,
              (bot, angle) => shootWeapon(bot, angle),
              (bot, angle) => throwGrenade(bot)
            );
            updatePlayerPhysics(p, map, botInput, dt);
          }

          // Respawn logic
          if (p.isDead) {
            p.respawnTimer -= dt;
            if (p.respawnTimer <= 0) {
              const spawnPt = map.spawns[Math.floor(Math.random() * map.spawns.length)];
              p.x = spawnPt.x;
              p.y = spawnPt.y;
              p.vx = 0;
              p.vy = 0;
              p.health = p.maxHealth;
              p.nitro = p.maxNitro;
              p.isDead = false;

              // Reset Primary & Secondary Weapon Ammo and Frags on Respawn
              const primaryW = getWeapon(p.primaryWeapon);
              p.currentMag = primaryW.magazineSize;
              p.reserveAmmo = primaryW.reserveAmmo;

              if (p.secondaryWeapon) {
                const secondaryW = getWeapon(p.secondaryWeapon);
                p.secondaryMag = secondaryW.magazineSize;
                p.secondaryReserve = secondaryW.reserveAmmo;
              }

              p.fragCount = 3;
              p.isReloading = false;
              p.reloadProgress = 0;

              if (p.id === 'human_1') {
                cameraPosRef.current = {
                  x: p.x - canvas.width / 2,
                  y: p.y - canvas.height / 2
                };
              }
            }
          }
        });

        // Offline deterministic reload progress tick and weapon pickup collisions
        playersRef.current.forEach((p) => {
          if (p.isDead) return;

          // Auto reload if magazine is empty and player is not already reloading
          if (p.currentMag <= 0 && !p.isReloading && p.reserveAmmo > 0) {
            reloadWeapon(p);
          }

          // Deterministic Frame-Based Reload Progression & Completion
          if (p.isReloading) {
            p.reloadProgress += dt;
            const w = getWeapon(p.primaryWeapon);
            if (p.reloadProgress >= w.reloadTime) {
              const needed = w.magazineSize - p.currentMag;
              const amount = Math.min(needed, p.reserveAmmo);
              p.currentMag += amount;
              p.reserveAmmo -= amount;
              p.isReloading = false;
              p.reloadProgress = 0;
            }
          }

          pickupsRef.current.forEach((pickup) => {
            if (pickup.respawnTime > 0) return;
            const dist = Math.hypot(pickup.x - p.x, pickup.y - p.y);
            if (p.isBot && dist < 28) {
              if (p.primaryWeapon !== pickup.weaponType) {
                p.secondaryWeapon = p.primaryWeapon;
                p.primaryWeapon = pickup.weaponType;
                const w = getWeapon(pickup.weaponType);
                p.currentMag = w.magazineSize;
                p.reserveAmmo = w.reserveAmmo;
                p.isReloading = false;
                p.reloadProgress = 0;
                soundEngine.playPickup();
                pickup.respawnTime = 8.0; // Auto-spawns after 8s
              }
            }
          });

          // Health Crates collision & HP restore
          healthCratesRef.current.forEach((crate) => {
            if (!crate.active) {
              crate.respawnTimer -= dt;
              if (crate.respawnTimer <= 0) crate.active = true;
              return;
            }
            const dist = Math.hypot(crate.x - p.x, crate.y - p.y);
            if (dist < 32 && p.health < p.maxHealth) {
              p.health = Math.min(p.maxHealth, p.health + 50);
              crate.active = false;
              crate.respawnTimer = 10.0; // Auto-spawns after 10s
              soundEngine.playPickup();
            }
          });

          // Booster Refill Crates collision & Nitro restore
          boosterCratesRef.current.forEach((crate) => {
            if (!crate.active) {
              crate.respawnTimer -= dt;
              if (crate.respawnTimer <= 0) crate.active = true;
              return;
            }
            const dist = Math.hypot(crate.x - p.x, crate.y - p.y);
            if (dist < 32 && p.nitro < p.maxNitro) {
              p.nitro = Math.min(p.maxNitro, p.nitro + 100);
              crate.active = false;
              crate.respawnTimer = 10.0; // Auto-spawns after 10s
              soundEngine.playPickup();
            }
          });
        });
      }
      // --- CLIENT-SIDE BULLET INTERPOLATION (Multiplayer) ---
      // Advance bullet positions locally between 20Hz server snapshots for smooth visuals
      if (isMultiplayer) {
        bulletsRef.current = bulletsRef.current.filter((b) => {
          b.x += b.vx;
          b.y += b.vy;
          b.distanceTraveled = (b.distanceTraveled || 0) + Math.hypot(b.vx, b.vy);
          b.life = (b.life || 80) - 1;
          return b.life > 0;
        });
        grenadesRef.current.forEach((g) => {
          if (!g.isStuck) {
            g.x += g.vx;
            g.y += g.vy;
            g.vy += 0.35; // gravity
          }
        });
      }

      // --- BULLETS & GRENADES UPDATE (Offline mode) ---
      if (!isMultiplayer) {
        bulletsRef.current = updateBullets(
          bulletsRef.current,
          playersRef.current,
          map,
          particlesRef.current,
          spawnExplosion,
          (shooterId, victimId, damage, isHeadshot) => {
            const victim = playersRef.current.find((p) => p.id === victimId);
            const shooter = playersRef.current.find((p) => p.id === shooterId);
            if (victim && shooter) {
              victim.health -= damage;
              victim.lastDamageTime = Date.now();
              shooter.damageDealt += damage;
              if (victim.health <= 0) {
                handleKill(shooter, victim, getWeapon(shooter.primaryWeapon).name, isHeadshot);
              }
            }
          }
        );

        grenadesRef.current = updateGrenades(
          grenadesRef.current,
          playersRef.current,
          map,
          particlesRef.current,
          spawnExplosion
        );

        // --- PUBG BATTLE ROYALE MODE LOGIC ---
        if (settings.gameMode === 'battle-royale') {
          const bz = blueZoneRef.current;
          bz.shrinkTimer -= dt / 1000.0;

          if (bz.shrinkTimer <= 0) {
            if (!bz.isShrinking) {
              bz.isShrinking = true;
              bz.phase += 1;
              bz.targetRadius = Math.max(120, bz.currentRadius * 0.55);
              bz.shrinkTimer = 15.0; // 15s shrinking phase
            } else {
              bz.isShrinking = false;
              bz.shrinkTimer = 20.0; // 20s hold phase
            }
          }

          if (bz.isShrinking && bz.currentRadius > bz.targetRadius) {
            bz.currentRadius -= (dt / 1000.0) * 20.0;
          }

          // Ticking Blue Zone Damage to all players outside circle
          playersRef.current.forEach((p) => {
            if (p.isDead) return;
            const distFromCenter = Math.hypot(p.x - bz.centerX, p.y - bz.centerY);
            if (distFromCenter > bz.currentRadius) {
              p.health -= (dt / 1000.0) * bz.damagePerSec;
              p.lastDamageTime = Date.now();
              if (p.health <= 0) {
                p.health = 0;
                p.isDead = true;
                p.deaths += 1;
              }
            }
          });
        }

        // Offline Match Timer Countdown (Min 2 mins, Max 10 mins)
        if (!matchEndedRef.current) {
          timeRemainingRef.current -= dt / 1000;
          if (timeRemainingRef.current <= 0) {
            timeRemainingRef.current = 0;
            matchEndedRef.current = true;
            const sorted = [...playersRef.current].sort((a, b) => b.kills - a.kills || b.damageDealt - a.damageDealt);
            const winner = sorted[0];
            onMatchEnd({
              mvpPlayerId: winner ? winner.id : 'human_1',
              players: playersRef.current,
              durationPlayed: settings.matchDuration
            });
          }
        }
      }

      // --- RENDER CAMERA VIEWPORT ---
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const zoomFactor = scopeZoom === '8X' ? 0.45 : scopeZoom === '4X' ? 0.65 : scopeZoom === '2X' ? 0.82 : 1.0;

      const targetCamX = human ? human.x - (canvas.width / zoomFactor) / 2 : map.width / 2;
      const targetCamY = human ? human.y - (canvas.height / zoomFactor) / 2 : map.height / 2;

      if (!cameraPosRef.current) {
        cameraPosRef.current = { x: targetCamX, y: targetCamY };
      } else {
        cameraPosRef.current.x += (targetCamX - cameraPosRef.current.x) * 0.16;
        cameraPosRef.current.y += (targetCamY - cameraPosRef.current.y) * 0.16;
      }

      const camX = cameraPosRef.current.x;
      const camY = cameraPosRef.current.y;

      ctx.save();
      ctx.scale(zoomFactor, zoomFactor);
      ctx.translate(-camX, -camY);

      // Sky Background
      ctx.fillStyle = map.backgroundColor;
      ctx.fillRect(0, 0, map.width, map.height);

      // Platforms
      map.platforms.forEach((plat) => {
        ctx.fillStyle = plat.color || '#34495e';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#2c3e50';
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      });

      // Weapon Pickups (Renders actual 2D Vector Gun Models!)
      pickupsRef.current.forEach((pickup) => {
        if (pickup.respawnTime > 0) {
          pickup.respawnTime -= dt;
          return;
        }
        const w = getWeapon(pickup.weaponType);
        const floatOffsetY = Math.sin(Date.now() * 0.004 + pickup.x) * 4;
        const isNearLocal = human && !human.isDead && Math.hypot(pickup.x - human.x, pickup.y - human.y) < 60;

        ctx.save();
        ctx.translate(pickup.x, pickup.y + floatOffsetY);

        // Ground Pedestal Glow Aura
        if (isNearLocal) {
          const pulse = Math.sin(Date.now() * 0.01) * 3;
          ctx.fillStyle = 'rgba(241, 196, 15, 0.6)';
          ctx.beginPath();
          ctx.ellipse(0, 10, 26 + pulse, 8 + pulse * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(241, 196, 15, 0.25)';
          ctx.beginPath();
          ctx.ellipse(0, 10, 22, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Render actual 2D Vector Gun Model centered on ground!
        ctx.save();
        ctx.translate(-15, -2);
        ctx.scale(0.85, 0.85);
        drawGunModel(ctx, pickup.weaponType, false);
        ctx.restore();

        // Weapon Name Tag floating above gun
        ctx.fillStyle = isNearLocal ? '#ffffff' : '#f1c40f';
        ctx.font = isNearLocal ? 'bold 11px monospace' : 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(w.name.toUpperCase(), 0, -18);

        if (isNearLocal) {
          ctx.fillStyle = '#f1c40f';
          ctx.font = 'bold 11px monospace';
          ctx.fillText('⚡ PRESS [E] TO PICKUP ⚡', 0, -32);
        }
        ctx.restore();
      });

      // Health Crates (Medi-Kit Box with Red Cross)
      healthCratesRef.current.forEach((crate) => {
        if (!crate.active) return;
        const floatOffsetY = Math.sin(Date.now() * 0.005 + crate.x) * 3;

        ctx.save();
        ctx.translate(crate.x, crate.y + floatOffsetY);

        // Green Healing Glow Aura
        ctx.fillStyle = 'rgba(46, 204, 113, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // First Aid Box Chassis
        ctx.fillStyle = '#ecf0f1';
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-12, -10, 24, 20, 4);
        ctx.fill();
        ctx.stroke();

        // Red Medical Cross Symbol
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(-3, -7, 6, 14);
        ctx.fillRect(-7, -3, 14, 6);

        // Floating Tag
        ctx.fillStyle = '#2ecc71';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MED-KIT +50 HP', 0, -15);

        ctx.restore();
      });

      // --- PUBG BATTLE ROYALE BLUE ZONE CIRCLE RENDERING ---
      if (settings.gameMode === 'battle-royale') {
        const bz = blueZoneRef.current;
        ctx.save();

        // Electric Blue Ring
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.85)';
        ctx.lineWidth = 6;
        ctx.shadowColor = '#3498db';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(bz.centerX, bz.centerY, bz.currentRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing Inner Danger Warning Line
        ctx.strokeStyle = 'rgba(41, 128, 185, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bz.centerX, bz.centerY, Math.max(0, bz.currentRadius - 8), 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }

      // Booster Refill Pickups (Nitro Gas Cylinder)
      boosterCratesRef.current.forEach((crate) => {
        if (!crate.active) return;
        const floatOffsetY = Math.sin(Date.now() * 0.005 + crate.x + 100) * 3;

        ctx.save();
        ctx.translate(crate.x, crate.y + floatOffsetY);

        // Blue Nitro Glow Aura
        ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        // Metallic Nitro Tank Body
        ctx.fillStyle = '#34495e';
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-8, -12, 16, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Cyan Gauge Stripes
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-6, -4, 12, 3);
        ctx.fillRect(-6, 2, 12, 3);

        // Brass Nozzle Top
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(-3, -15, 6, 3);

        // Floating Tag
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NITRO REFILL ⚡', 0, -18);

        ctx.restore();
      });

      // Players
      playersRef.current.forEach((p) => {
        if (p.isDead) return;

        drawAvatar(
          ctx,
          p.avatar,
          p.x,
          p.y,
          1.0,
          p.aimAngle,
          p.facingRight,
          p.isBoosting,
          p.isCrouching,
          p.primaryWeapon,
          p.isDualWielding,
          p.opacity,
          p.id === 'human_1' ? 1.0 - (Math.max(0, drawWeaponTimerRef.current) / 250) : 1.0,
          p.isMeleeAttacking,
          p.vx || 0,
          p.vy || 0
        );

        // Player Name & Health Bar Tag
        ctx.fillStyle = p.team === 'blue' ? '#3498db' : p.team === 'red' ? '#e74c3c' : '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 42);

        // Cooking Grenade Warning Tag
        if ((p.id === 'human_1' || p.id === networkManager.clientId) && cookingFuseRemaining !== null) {
          ctx.save();
          ctx.fillStyle = 'rgba(231, 76, 60, 0.95)';
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(p.x - 52, p.y - 70, 104, 22, 11);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`💣 COOKING: ${cookingFuseRemaining.toFixed(1)}s`, p.x, p.y - 55);
          ctx.restore();
        }

        // Mini Health Bar
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(p.x - 16, p.y - 38, 32, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(p.x - 16, p.y - 38, (p.health / 100) * 32, 4);

        // High-Visibility Reload Loader Indicator Above Avatar
        if (p.isReloading) {
          const w = getWeapon(p.primaryWeapon);
          const totalReload = w.reloadTime || 1600;
          const ratio = Math.min(1.0, Math.max(0.0, (p.reloadProgress || 0) / totalReload));

          // Reload text tag
          ctx.fillStyle = '#f1c40f';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('⚡ RELOADING...', p.x, p.y - 50);

          // Outer Bar Frame
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(p.x - 22, p.y - 46, 44, 6);
          ctx.strokeStyle = '#f1c40f';
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x - 22, p.y - 46, 44, 6);

          // Animated Yellow Fill Bar
          ctx.fillStyle = '#f1c40f';
          ctx.fillRect(p.x - 21, p.y - 45, 42 * (ratio || 0.4), 4);
        }
      });

      // Tactical Laser Sight Rendering (Only for Local Player, NOT Enemies)
      if (settings.enableLaserSight) {
        const localId = networkManager.clientId || 'human_1';
        playersRef.current.forEach((p) => {
          if (p.isDead || (p.id !== 'human_1' && p.id !== localId)) return;

          const shoulderX = p.x + (p.facingRight ? 2 : -2);
          const shoulderY = p.y - (p.isCrouching ? 10 : 2);
          const muzzleDist = 30;
          const startX = shoulderX + Math.cos(p.aimAngle) * muzzleDist;
          const startY = shoulderY + Math.sin(p.aimAngle) * muzzleDist;

          let endX = startX;
          let endY = startY;
          const maxDist = 700;
          const step = 8;
          const cosA = Math.cos(p.aimAngle);
          const sinA = Math.sin(p.aimAngle);

          for (let d = 0; d < maxDist; d += step) {
            const checkX = startX + cosA * d;
            const checkY = startY + sinA * d;

            const hitPlat = map.platforms.find(
              (plat) => checkX >= plat.x && checkX <= plat.x + plat.w && checkY >= plat.y && checkY <= plat.y + plat.h
            );

            if (hitPlat) {
              endX = checkX;
              endY = checkY;
              break;
            }
            endX = checkX;
            endY = checkY;
          }

          const lColor =
            settings.laserColor === 'green'
              ? '34, 197, 94'
              : settings.laserColor === 'cyan'
                ? '6, 182, 212'
                : settings.laserColor === 'yellow'
                  ? '234, 179, 8'
                  : '239, 68, 68';

          // Outer Glow Line
          ctx.strokeStyle = `rgba(${lColor}, 0.35)`;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Core Beam
          ctx.strokeStyle = `rgba(${lColor}, 0.95)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          // Laser Impact Dot
          ctx.fillStyle = `rgba(${lColor}, 1.0)`;
          ctx.beginPath();
          ctx.arc(endX, endY, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Impact Ring
          ctx.strokeStyle = `rgba(${lColor}, 0.6)`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(endX, endY, 4 + Math.sin(Date.now() * 0.01) * 2, 0, Math.PI * 2);
          ctx.stroke();
        });
      }

      // Bullets with dynamic maxRange fading
      bulletsRef.current.forEach((b) => {
        ctx.globalAlpha = Math.max(0.05, b.alpha ?? 1.0);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.radius * 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx * 1.5, b.y - b.vy * 1.5);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });

      // Grenades
      grenadesRef.current.forEach((g) => {
        ctx.fillStyle = g.type === 'gas' ? '#2ecc71' : g.type === 'mine' ? '#e74c3c' : '#f39c12';
        ctx.beginPath();
        ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Particles
      particlesRef.current.forEach((part, idx) => {
        part.x += part.vx;
        part.y += part.vy;
        part.alpha -= part.decay;
        if (part.alpha <= 0) {
          particlesRef.current.splice(idx, 1);
          return;
        }
        ctx.fillStyle = part.color;
        ctx.globalAlpha = part.alpha;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });

      // Camouflage Bushes (Rendered over players for hiding effect)
      map.bushes.forEach((bush) => {
        ctx.fillStyle = 'rgba(39, 174, 96, 0.75)';
        ctx.beginPath();
        ctx.roundRect(bush.x, bush.y, bush.w, bush.h, 12);
        ctx.fill();
      });

      ctx.restore();

      // --- SCOPE RETICLE & VIGNETTE OVERLAY (Screen Space) ---
      if (scopeZoom !== '1X') {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const radius = Math.min(cx, cy) * 0.92;

        ctx.save();
        // Darkened Outer Vignette
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.rect(0, 0, canvas.width, canvas.height);
        ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
        ctx.fill();

        // Scope Ring Border
        ctx.strokeStyle = '#9b59b6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Scope Crosshair Lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - radius, cy);
        ctx.lineTo(cx + radius, cy);
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx, cy + radius);
        ctx.stroke();

        // Center Scope Reticle Dot & Zoom Tag
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#9b59b6';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCOPE ${scopeZoom}`, cx - radius + 15, cy - radius + 25);
        ctx.restore();
      }

      // --- ENEMY SHOT DIRECTIONAL RED ARROW THREAT INDICATORS (Screen Space) ---
      if (human && !human.isDead) {
        const now = Date.now();
        const localId = networkManager.clientId || 'human_1';

        playersRef.current.forEach((p) => {
          if (p.isDead || p.id === 'human_1' || p.id === localId) return;

          const timeSinceShot = now - (p.lastShotTime || 0);
          if (timeSinceShot < 1600) {
            const dx = p.x - human.x;
            const dy = p.y - human.y;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);
            const fade = 1 - timeSinceShot / 1600;

            const edgeMargin = 85;
            const radiusX = Math.max(50, canvas.width / 2 - edgeMargin);
            const radiusY = Math.max(50, canvas.height / 2 - edgeMargin);

            const arrowX = canvas.width / 2 + Math.cos(angle) * radiusX;
            const arrowY = canvas.height / 2 + Math.sin(angle) * radiusY;

            ctx.save();
            ctx.translate(arrowX, arrowY);
            ctx.rotate(angle);

            // Red Glowing Arrow Pointer
            ctx.fillStyle = `rgba(231, 76, 60, ${0.95 * fade})`;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * fade})`;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(18, 0);
            ctx.lineTo(-14, -11);
            ctx.lineTo(-7, 0);
            ctx.lineTo(-14, 11);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Distance Tag Below Arrow
            ctx.rotate(-angle);
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = `rgba(255, 234, 167, ${fade})`;
            ctx.textAlign = 'center';
            ctx.fillText(`🎯 ${Math.round(dist / 20)}m`, 0, 18);

            ctx.restore();
          }
        });
      }

      // --- PUBG BATTLE ROYALE SCREEN SPACE HUD OVERLAYS ---
      if (settings.gameMode === 'battle-royale') {
        const bz = blueZoneRef.current;
        const alivePlayers = playersRef.current.filter((p) => !p.isDead).length;

        ctx.save();
        // Alive & Kills Top-Right Screen Badge
        const rx = canvas.width - 150;
        const ry = 20;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(rx, ry, 130, 44, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`ALIVE: ${alivePlayers}`, rx + 12, ry + 18);
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`KILLS: ${human?.kills || 0}`, rx + 12, ry + 36);

        // Blue Zone Closing Banner at Screen Top
        ctx.fillStyle = 'rgba(41, 128, 185, 0.85)';
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - 130, 20, 260, 28, 14);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        const bzStatus = bz.isShrinking
          ? `⚡ BLUE ZONE SHRINKING! (PHASE ${bz.phase})`
          : `⚡ ZONE CLOSING IN ${Math.max(0, Math.ceil(bz.shrinkTimer))}s`;
        ctx.fillText(bzStatus, canvas.width / 2, 38);

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [map, settings]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">

      {/* 60FPS Game Rendering Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Ultra-Slim Tactical HUD Overlay */}
      <div className="absolute top-3 left-3 right-3 pointer-events-none flex justify-between items-center z-20">

        {/* Left: Slim Sergeant Major Badge */}
        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full border border-white/20 backdrop-blur-md shadow-xl">
          <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center font-black text-white text-xs border border-white shadow">
            7
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center text-[9px] font-black tracking-widest text-red-400 uppercase">
              <span>SGT. MAJOR</span>
              <span className="font-mono text-white ml-2">{Math.round(hudState.health)}%</span>
            </div>
            <div className="flex gap-1 items-center">
              {/* Slim Health Bar */}
              <div className="w-24 sm:w-32 h-2 bg-gray-900 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-red-600 shadow-[0_0_8px_rgba(239,68,68,0.9)] transition-all duration-75"
                  style={{ width: `${hudState.health}%` }}
                />
              </div>
              {/* Slim Nitro Bar */}
              <div className="w-12 sm:w-16 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/20">
                <div
                  className="h-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.9)] transition-all duration-75"
                  style={{ width: `${hudState.nitro}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top Center: Timer, Go Server Badge & Pause */}
        <div className="flex items-center gap-2">
          {/* Prominent Match Timer Badge */}
          <div className="bg-black/80 border-2 border-yellow-400/80 px-3.5 py-1 rounded-full flex items-center gap-2 backdrop-blur-md shadow-[0_0_15px_rgba(234,179,8,0.4)] pointer-events-auto">
            <span className="text-yellow-400 font-black text-[10px] uppercase tracking-widest animate-pulse">⏱️ TIMER</span>
            <span className="text-white font-mono font-black text-xs sm:text-sm tracking-wider">
              {formatTimer(hudState.timeRemaining)}
            </span>
          </div>

          {isMultiplayer && (
            <div className="bg-black/70 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-md text-[10px] font-mono shadow-lg">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold">GO: {roomCode}</span>
              <span className="text-gray-400">|</span>
              <span className="text-white">{networkManager.pingMs}ms</span>
              <span className="text-yellow-400 font-bold">60Hz</span>
            </div>
          )}

          <div
            className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-white/20 backdrop-blur-md shadow-xl pointer-events-auto cursor-pointer hover:bg-black/80 transition"
            onClick={onPause}
          >
            <div className="w-10 h-5 bg-black/80 border border-green-500/40 rounded relative overflow-hidden flex items-center justify-center">
              <div className="w-1 h-1 bg-green-500 rounded-full shadow-[0_0_4px_#22c55e]"></div>
              <div className="absolute top-1 left-2 w-1 h-1 bg-red-500 rounded-full animate-ping"></div>
              <div className="absolute bottom-1 right-2 w-1 h-1 bg-red-500 rounded-full"></div>
            </div>
            <span className="text-[9px] font-black tracking-widest text-white uppercase font-mono hidden sm:inline">
              {settings.mapId.toUpperCase()}
            </span>
            <Pause className="w-3.5 h-3.5 text-yellow-400" />
          </div>

          {/* Fullscreen Toggle Badge */}
          <div
            onClick={toggleFullscreen}
            className="flex items-center justify-center bg-black/60 p-2 rounded-full border border-white/20 backdrop-blur-md shadow-xl pointer-events-auto cursor-pointer hover:bg-black/80 transition active:scale-90 text-yellow-400"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </div>
        </div>

      </div>

      {/* Middle Bottom Tactical Weapon Inventory & Ammo HUD Bar (3X Scale for clear visibility) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-1.5 select-none scale-[1.85] sm:scale-[2.3] origin-bottom">

        {/* Tactical Weapon Bar Container */}
        <div className="flex items-center bg-[#1e242b]/95 border-2 border-white/30 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md">

          {/* Box 1: Active Weapon Silhouette */}
          <div
            onClick={() => {
              const human = playersRef.current.find(p => p.id === 'human_1');
              if (human) swapWeapon(human);
            }}
            className={`relative flex items-center justify-center px-3 py-1.5 bg-[#2a3038] border-r border-white/10 transition-all cursor-pointer ${hudState.isDrawAnim ? 'bg-[#374151] ring-2 ring-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]' : 'hover:bg-[#343b44]'
              }`}
            title="Active Primary Weapon"
          >
            <WeaponSilhouette type={hudState.primaryWeapon} className="w-16 h-8 text-white drop-shadow" />
          </div>

          {/* Box 2: Secondary Inventory Weapon Slot */}
          {hudState.secondaryWeapon && (
            <div
              onClick={() => {
                const human = playersRef.current.find(p => p.id === 'human_1');
                if (human) swapWeapon(human);
              }}
              className="relative flex items-center justify-center px-2.5 py-1.5 bg-[#22272e] border-r border-white/10 hover:bg-[#2b313a] transition-all cursor-pointer group"
              title="Press Q or click to swap to Secondary Weapon"
            >
              <span className="absolute top-0.5 left-1 text-[7px] font-mono font-black text-yellow-400/80 group-hover:text-yellow-400 transition">
                [ Q ]
              </span>
              <WeaponSilhouette type={hudState.secondaryWeapon} className="w-12 h-6 text-gray-400 group-hover:text-white transition opacity-70 group-hover:opacity-100" />
            </div>
          )}

          {/* Box 3: Ammo Count Box */}
          <div className="flex flex-col justify-center px-3 py-1 bg-[#2a3038] border-r border-white/10 text-white font-mono min-w-[54px]">
            {hudState.isReloading ? (
              <div className="text-center">
                <span className="text-[9px] font-black text-yellow-400 animate-pulse block">RELOAD</span>
                <div className="w-10 bg-black/60 h-1 rounded overflow-hidden mt-0.5 border border-yellow-400/40">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-75"
                    style={{
                      width: `${Math.min(100, Math.max(10, ((hudState.reloadProgress || 0) / (getWeapon(hudState.primaryWeapon)?.reloadTime || 1600)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="text-base font-black leading-none text-white tracking-tight">
                  {hudState.ammo}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold mt-0.5">
                  <AmmoStackIcon className="text-gray-400" />
                  <span>{hudState.reserve}</span>
                </div>
              </>
            )}
          </div>

          {/* Box 4: Frag Grenade Box */}
          <div
            onClick={() => {
              const human = playersRef.current.find(p => p.id === 'human_1');
              if (human) throwGrenade(human);
            }}
            className="relative flex items-center justify-center px-2.5 py-1.5 bg-[#2a3038] border-r border-white/10 hover:bg-[#343b44] transition-all cursor-pointer"
            title="Press G or click to throw Frag Grenade"
          >
            <GrenadeSilhouette className="text-white" />
            <span className="ml-1 text-xs font-black font-mono text-white">
              {hudState.grenadeCount}
            </span>
          </div>

          {/* Box 5: Equipment / Radio Utility Box */}
          <div
            className="relative flex items-center justify-center px-2.5 py-1.5 bg-[#2a3038]"
            title="Tactical Radio Equipment"
          >
            <RadioSilhouette className="text-white" />
            <span className="ml-1 text-xs font-black font-mono text-white">
              1
            </span>
          </div>

        </div>
      </div>

      {/* Animated HUD Highlight Banner when standing near a spawned weapon pickup */}
      {nearbyPickup && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-bounce">
          <div className="bg-yellow-500 text-black px-6 py-2.5 rounded-full border-2 border-white font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-[0_0_25px_rgba(234,179,8,0.95)]">
            <span className="text-base">⚡</span> PRESS <span className="bg-black text-yellow-400 px-2.5 py-0.5 rounded font-mono text-sm">[ E ]</span> TO PICK UP {nearbyPickup.name.toUpperCase()} ({nearbyPickup.ammo} AMMO)
          </div>
        </div>
      )}

      {/* Floating Kill Feed Top-Right */}
      {killFeedRef.current.length > 0 && (
        <div className="absolute top-14 right-3 pointer-events-none z-20 text-right font-mono text-[10px] text-yellow-400 space-y-1 bg-black/50 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm shadow-lg max-w-[180px]">
          {killFeedRef.current.slice(-3).map((kf) => (
            <p key={kf.id} className="truncate leading-tight">
              <span className="text-white font-bold">{kf.killerName}</span> ⚔️ <span className="text-red-400 font-bold">{kf.victimName}</span>
            </p>
          ))}
        </div>
      )}

      {/* Optional Mobile Touch Controls */}
      {settings.showTouchControls && (
        <TouchControls
          onMove={(dx, dy, isBoosting, isCrouching) => {
            touchInputsRef.current.moveX = dx;
            touchInputsRef.current.moveY = dy;
            touchInputsRef.current.isBoosting = isBoosting;
            touchInputsRef.current.isCrouching = isCrouching;
          }}
          onAimShoot={(angle, isShooting) => {
            touchInputsRef.current.aimAngle = angle;
            touchInputsRef.current.isShooting = isShooting;
          }}
          onReload={() => {
            const human = playersRef.current.find((p) => p.id === 'human_1');
            if (human) reloadWeapon(human);
          }}
          onSwapWeapon={() => {
            const human = playersRef.current.find((p) => p.id === 'human_1');
            if (human) swapWeapon(human);
          }}
          onPickUpWeapon={() => {
            const human = playersRef.current.find((p) => p.id === 'human_1');
            if (human) pickUpWeapon(human);
          }}
          onThrowGrenade={() => {
            const human = playersRef.current.find((p) => p.id === 'human_1');
            if (human) throwGrenade(human);
          }}
          onMelee={() => {
            const human = playersRef.current.find((p) => p.id === 'human_1');
            if (human) performMelee(human);
          }}
          onCycleScope={cycleScope}
          scopeZoomLevel={scopeZoom}
          activeWeaponName={getWeapon(hudState.primaryWeapon)?.name || 'Gun'}
          nearbyPickupName={nearbyPickup?.name}
          grenadeCount={hudState.grenadeCount}
          joystickSize={settings.joystickSize}
          joystickPosition={settings.joystickPosition}
        />
      )}

    </div>
  );
};
