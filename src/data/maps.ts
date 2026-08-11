import { GameMap, MapId } from '../types';

export const MAPS: Record<MapId, GameMap> = {
  outpost: {
    id: 'outpost',
    name: 'Outpost (Classic)',
    width: 2000,
    height: 1200,
    backgroundColor: '#1e272c',
    skyColor: '#2c3e50',
    platforms: [
      // Outer boundaries / Ground
      { x: 0, y: 1140, w: 2000, h: 60, type: 'rock', color: '#34495e' },
      { x: 0, y: 0, w: 40, h: 1200, type: 'rock', color: '#2c3e50' },
      { x: 1960, y: 0, w: 40, h: 1200, type: 'rock', color: '#2c3e50' },
      { x: 0, y: 0, w: 2000, h: 40, type: 'rock', color: '#2c3e50' },

      // Main Center Bunker / Outpost Tower
      { x: 750, y: 700, w: 500, h: 30, type: 'metal', color: '#7f8c8d' },
      { x: 800, y: 480, w: 400, h: 25, type: 'metal', color: '#95a5a6' },
      { x: 850, y: 280, w: 300, h: 25, type: 'metal', color: '#bdc3c7' },

      // Center Support Pillars & Stairways
      { x: 880, y: 730, w: 30, h: 410, type: 'metal', color: '#7f8c8d' },
      { x: 1090, y: 730, w: 30, h: 410, type: 'metal', color: '#7f8c8d' },

      // Left Base Structure & Bridges
      { x: 200, y: 920, w: 350, h: 25, type: 'metal', color: '#95a5a6' },
      { x: 120, y: 680, w: 300, h: 25, type: 'metal', color: '#7f8c8d' },
      { x: 250, y: 440, w: 300, h: 25, type: 'one-way', color: '#bdc3c7' },

      // Right Base Structure & Bridges
      { x: 1450, y: 920, w: 350, h: 25, type: 'metal', color: '#95a5a6' },
      { x: 1580, y: 680, w: 300, h: 25, type: 'metal', color: '#7f8c8d' },
      { x: 1450, y: 440, w: 300, h: 25, type: 'one-way', color: '#bdc3c7' },

      // High Sniper Platforms
      { x: 450, y: 220, w: 200, h: 20, type: 'one-way', color: '#e74c3c' },
      { x: 1350, y: 220, w: 200, h: 20, type: 'one-way', color: '#e74c3c' },

      // Underground Tunnel Bunkers
      { x: 500, y: 1050, w: 300, h: 20, type: 'one-way', color: '#34495e' },
      { x: 1200, y: 1050, w: 300, h: 20, type: 'one-way', color: '#34495e' }
    ],
    bushes: [
      { x: 860, y: 235, w: 120, h: 45 },
      { x: 280, y: 395, w: 140, h: 45 },
      { x: 1500, y: 395, w: 140, h: 45 },
      { x: 220, y: 875, w: 160, h: 45 },
      { x: 1520, y: 875, w: 160, h: 45 },
      { x: 920, y: 1095, w: 160, h: 45 }
    ],
    spawns: [
      { x: 250, y: 620 },
      { x: 1750, y: 620 },
      { x: 1000, y: 220 },
      { x: 1000, y: 640 },
      { x: 300, y: 1080 },
      { x: 1700, y: 1080 },
      { x: 500, y: 160 },
      { x: 1500, y: 160 }
    ],
    weaponSpawns: [
      { x: 1000, y: 250, weaponType: 'sniper' },
      { x: 1000, y: 660, weaponType: 'ar' },
      { x: 280, y: 640, weaponType: 'smg' },
      { x: 1720, y: 640, weaponType: 'ar' },
      { x: 350, y: 880, weaponType: 'smg' },
      { x: 1600, y: 880, weaponType: 'sniper' },
      { x: 500, y: 180, weaponType: 'ar' },
      { x: 1450, y: 180, weaponType: 'smg' },
      { x: 600, y: 1010, weaponType: 'sniper' },
      { x: 1350, y: 1010, weaponType: 'ar' }
    ],
    healthSpawns: [
      { x: 1000, y: 440 },
      { x: 150, y: 640 },
      { x: 1800, y: 640 },
      { x: 1000, y: 1080 }
    ]
  },
  catacombs: {
    id: 'catacombs',
    name: 'Catacombs (Cavern)',
    width: 2200,
    height: 1400,
    backgroundColor: '#1b120c',
    skyColor: '#2c1810',
    platforms: [
      // Outer rock borders
      { x: 0, y: 1340, w: 2200, h: 60, type: 'rock', color: '#4a3525' },
      { x: 0, y: 0, w: 50, h: 1400, type: 'rock', color: '#4a3525' },
      { x: 2150, y: 0, w: 50, h: 1400, type: 'rock', color: '#4a3525' },
      { x: 0, y: 0, w: 2200, h: 50, type: 'rock', color: '#4a3525' },

      // Central cavern rock arch & shafts
      { x: 800, y: 800, w: 600, h: 40, type: 'rock', color: '#5d4037' },
      { x: 650, y: 550, w: 900, h: 35, type: 'rock', color: '#5d4037' },
      { x: 900, y: 320, w: 400, h: 30, type: 'rock', color: '#6d4c41' },

      // Left cavern chambers
      { x: 150, y: 1100, w: 450, h: 30, type: 'rock', color: '#5d4037' },
      { x: 200, y: 820, w: 350, h: 30, type: 'rock', color: '#5d4037' },
      { x: 100, y: 500, w: 400, h: 30, type: 'rock', color: '#5d4037' },
      { x: 250, y: 250, w: 300, h: 25, type: 'one-way', color: '#8d6e63' },

      // Right cavern chambers
      { x: 1600, y: 1100, w: 450, h: 30, type: 'rock', color: '#5d4037' },
      { x: 1650, y: 820, w: 350, h: 30, type: 'rock', color: '#5d4037' },
      { x: 1700, y: 500, w: 400, h: 30, type: 'rock', color: '#5d4037' },
      { x: 1650, y: 250, w: 300, h: 25, type: 'one-way', color: '#8d6e63' },

      // Vertical shaft dividers
      { x: 600, y: 830, w: 35, h: 300, type: 'rock', color: '#4a3525' },
      { x: 1565, y: 830, w: 35, h: 300, type: 'rock', color: '#4a3525' }
    ],
    bushes: [
      { x: 1020, y: 280, w: 160, h: 40 },
      { x: 1020, y: 510, w: 160, h: 40 },
      { x: 320, y: 780, w: 140, h: 40 },
      { x: 1720, y: 780, w: 140, h: 40 },
      { x: 980, y: 1300, w: 240, h: 40 }
    ],
    spawns: [
      { x: 300, y: 440 },
      { x: 1900, y: 440 },
      { x: 1100, y: 260 },
      { x: 1100, y: 740 },
      { x: 350, y: 1040 },
      { x: 1850, y: 1040 }
    ],
    weaponSpawns: [
      { x: 1100, y: 280, weaponType: 'sniper' },
      { x: 1100, y: 510, weaponType: 'ar' },
      { x: 300, y: 460, weaponType: 'smg' },
      { x: 1900, y: 460, weaponType: 'sniper' },
      { x: 350, y: 1060, weaponType: 'ar' },
      { x: 1850, y: 1060, weaponType: 'smg' },
      { x: 1100, y: 760, weaponType: 'ar' }
    ],
    healthSpawns: [
      { x: 1100, y: 480 },
      { x: 250, y: 780 },
      { x: 1950, y: 780 }
    ]
  },
  hightower: {
    id: 'hightower',
    name: 'High Tower (Sky Battle)',
    width: 2400,
    height: 1500,
    backgroundColor: '#0c1b2b',
    skyColor: '#1a365d',
    platforms: [
      // Bottom Void Danger & Base Platform
      { x: 0, y: 1440, w: 2400, h: 60, type: 'rock', color: '#1a202c' },
      { x: 0, y: 0, w: 40, h: 1500, type: 'rock', color: '#1a202c' },
      { x: 2360, y: 0, w: 40, h: 1500, type: 'rock', color: '#1a202c' },

      // Center High Tower Structure
      { x: 1050, y: 200, w: 300, h: 1200, type: 'metal', color: '#2d3748' },
      { x: 950, y: 200, w: 500, h: 30, type: 'metal', color: '#4a5568' },
      { x: 900, y: 450, w: 600, h: 30, type: 'metal', color: '#4a5568' },
      { x: 850, y: 700, w: 700, h: 30, type: 'metal', color: '#4a5568' },
      { x: 800, y: 950, w: 800, h: 30, type: 'metal', color: '#4a5568' },
      { x: 750, y: 1200, w: 900, h: 35, type: 'metal', color: '#4a5568' },

      // Side Floating Sky Platforms (Left)
      { x: 250, y: 350, w: 350, h: 25, type: 'one-way', color: '#3182ce' },
      { x: 150, y: 650, w: 400, h: 25, type: 'one-way', color: '#3182ce' },
      { x: 300, y: 950, w: 350, h: 25, type: 'one-way', color: '#3182ce' },

      // Side Floating Sky Platforms (Right)
      { x: 1800, y: 350, w: 350, h: 25, type: 'one-way', color: '#3182ce' },
      { x: 1850, y: 650, w: 400, h: 25, type: 'one-way', color: '#3182ce' },
      { x: 1750, y: 950, w: 350, h: 25, type: 'one-way', color: '#3182ce' }
    ],
    bushes: [
      { x: 1120, y: 160, w: 160, h: 40 },
      { x: 350, y: 310, w: 140, h: 40 },
      { x: 1910, y: 310, w: 140, h: 40 },
      { x: 1120, y: 660, w: 160, h: 40 },
      { x: 1120, y: 1160, w: 160, h: 40 }
    ],
    spawns: [
      { x: 1200, y: 140 },
      { x: 400, y: 300 },
      { x: 2000, y: 300 },
      { x: 1200, y: 640 },
      { x: 300, y: 600 },
      { x: 2100, y: 600 },
      { x: 1200, y: 1140 }
    ],
    weaponSpawns: [
      { x: 1200, y: 160, weaponType: 'sniper' },
      { x: 1200, y: 410, weaponType: 'ar' },
      { x: 1200, y: 660, weaponType: 'smg' },
      { x: 400, y: 320, weaponType: 'ar' },
      { x: 2000, y: 320, weaponType: 'smg' },
      { x: 300, y: 620, weaponType: 'ar' },
      { x: 2100, y: 620, weaponType: 'sniper' },
      { x: 1200, y: 1160, weaponType: 'smg' }
    ],
    healthSpawns: [
      { x: 1200, y: 900 },
      { x: 350, y: 910 },
      { x: 1950, y: 910 }
    ]
  }
};
