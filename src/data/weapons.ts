import { Weapon, WeaponType } from '../types';

export const WEAPONS: Record<WeaponType, Weapon> = {
  punch: {
    id: 'punch',
    name: 'Fists / Punch',
    category: 'melee',
    damage: 35,
    fireRate: 2.5,
    reloadTime: 0,
    magazineSize: Infinity,
    reserveAmmo: Infinity,
    spread: 0,
    bulletSpeed: 0,
    bulletsPerShot: 1,
    recoil: 0,
    color: '#f39c12',
    zoomFactor: 1.0,
    isDualWieldable: false,
    description: 'Fast melee punch for close encounters.',
    iconSymbol: '✊'
  },
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
    damage: 95,
    fireRate: 1.0,
    reloadTime: 2400,
    magazineSize: 5,
    reserveAmmo: 25,
    spread: 0.005,
    bulletSpeed: 93,
    bulletsPerShot: 1,
    recoil: 5.0,
    color: '#9b59b6',
    zoomFactor: 1.5,
    isDualWieldable: false,
    description: 'One-shot high precision long-range sniper rifle with scope zoom.',
    iconSymbol: '🔭',
    maxRange: 2400
  }
};

export const getWeapon = (type: string | undefined | null): Weapon => {
  if (type && WEAPONS[type as WeaponType]) {
    return WEAPONS[type as WeaponType];
  }
  if (type === 'sniper') return WEAPONS.sniper;
  if (type === 'smg' || type === 'uzi' || type === 'pistol' || type === 'deagle') return WEAPONS.smg;
  return WEAPONS.ar;
};
