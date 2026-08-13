import { Weapon, WeaponType } from '../types';

export const WEAPONS: Record<WeaponType, Weapon> = {
  smg: {
    id: 'smg',
    name: 'Submachine Gun (SMG)',
    category: 'pistol',
    damage: 18,
    fireRate: 13.0,
    reloadTime: 1200,
    magazineSize: 35,
    reserveAmmo: 140,
    spread: 0.08,
    bulletSpeed: 36,
    bulletsPerShot: 1,
    recoil: 0.9,
    color: '#3498db',
    zoomFactor: 1.0,
    isDualWieldable: true,
    description: 'Blazing fast submachine gun with high mobility and rapid fire.',
    iconSymbol: '⚡',
    maxRange: 950
  },
  ar: {
    id: 'ar',
    name: 'Assault Rifle (AR-15)',
    category: 'rifle',
    damage: 26,
    fireRate: 9.0,
    reloadTime: 1600,
    magazineSize: 30,
    reserveAmmo: 120,
    spread: 0.05,
    bulletSpeed: 44,
    bulletsPerShot: 1,
    recoil: 1.6,
    color: '#e67e22',
    zoomFactor: 1.15,
    isDualWieldable: false,
    description: 'Full-auto military assault rifle with high stopping power.',
    iconSymbol: '⚔️',
    maxRange: 1350
  },
  sniper: {
    id: 'sniper',
    name: 'Sniper Rifle (M200)',
    category: 'heavy',
    damage: 120,
    fireRate: 0.85,
    reloadTime: 1800,
    magazineSize: 6,
    reserveAmmo: 30,
    spread: 0.0,
    bulletSpeed: 110,
    bulletsPerShot: 1,
    recoil: 4.5,
    color: '#a855f7',
    zoomFactor: 1.5,
    isDualWieldable: false,
    description: 'One-shot high precision long-range sniper rifle with scope zoom.',
    iconSymbol: '🔭',
    maxRange: 2800
  }
};

export const getWeapon = (type: string | undefined | null): Weapon => {
  if (type && WEAPONS[type as WeaponType]) {
    return WEAPONS[type as WeaponType];
  }
  if (type === 'sniper' || type === 'm200' || type === 'rifle') return WEAPONS.sniper;
  if (type === 'smg' || type === 'pistol' || type === 'uzi' || type === 'mac10' || type === 'mp5') return WEAPONS.smg;
  return WEAPONS.ar;
};
