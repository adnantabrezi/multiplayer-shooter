package game

var Maps = map[string]GameMap{
	"outpost": {
		ID:              "outpost",
		Name:            "Outpost (Classic)",
		Width:           2000,
		Height:          1200,
		BackgroundColor: "#1e272c",
		SkyColor:        "#2c3e50",
		Platforms: []Platform{
			// Outer boundaries / Ground
			{X: 0, Y: 1140, W: 2000, H: 60, Type: "rock", Color: "#34495e"},
			{X: 0, Y: 0, W: 40, H: 1200, Type: "rock", Color: "#2c3e50"},
			{X: 1960, Y: 0, W: 40, H: 1200, Type: "rock", Color: "#2c3e50"},
			{X: 0, Y: 0, W: 2000, H: 40, Type: "rock", Color: "#2c3e50"},

			// Main Center Bunker / Outpost Tower
			{X: 750, Y: 700, W: 500, H: 30, Type: "metal", Color: "#7f8c8d"},
			{X: 800, Y: 480, W: 400, H: 25, Type: "metal", Color: "#95a5a6"},
			{X: 850, Y: 280, W: 300, H: 25, Type: "metal", Color: "#bdc3c7"},

			// Center Support Pillars & Stairways
			{X: 880, Y: 730, W: 30, H: 410, Type: "metal", Color: "#7f8c8d"},
			{X: 1090, Y: 730, W: 30, H: 410, Type: "metal", Color: "#7f8c8d"},

			// Left Base Structure & Bridges
			{X: 200, Y: 920, W: 350, H: 25, Type: "metal", Color: "#95a5a6"},
			{X: 120, Y: 680, W: 300, H: 25, Type: "metal", Color: "#7f8c8d"},
			{X: 250, Y: 440, W: 300, H: 25, Type: "one-way", Color: "#bdc3c7"},

			// Right Base Structure & Bridges
			{X: 1450, Y: 920, W: 350, H: 25, Type: "metal", Color: "#95a5a6"},
			{X: 1580, Y: 680, W: 300, H: 25, Type: "metal", Color: "#7f8c8d"},
			{X: 1450, Y: 440, W: 300, H: 25, Type: "one-way", Color: "#bdc3c7"},

			// High Sniper Platforms
			{X: 450, Y: 220, W: 200, H: 20, Type: "one-way", Color: "#e74c3c"},
			{X: 1350, Y: 220, W: 200, H: 20, Type: "one-way", Color: "#e74c3c"},

			// Underground Tunnel Bunkers
			{X: 500, Y: 1050, W: 300, H: 20, Type: "one-way", Color: "#34495e"},
			{X: 1200, Y: 1050, W: 300, H: 20, Type: "one-way", Color: "#34495e"},
		},
		Bushes: []Bush{
			{X: 860, Y: 235, W: 120, H: 45},
			{X: 280, Y: 395, W: 140, H: 45},
			{X: 1500, Y: 395, W: 140, H: 45},
			{X: 220, Y: 875, W: 160, H: 45},
			{X: 1520, Y: 875, W: 160, H: 45},
			{X: 920, Y: 1095, W: 160, H: 45},
		},
		Spawns: []Vector2D{
			{X: 250, Y: 620},
			{X: 1750, Y: 620},
			{X: 1000, Y: 220},
			{X: 1000, Y: 640},
			{X: 300, Y: 1080},
			{X: 1700, Y: 1080},
			{X: 500, Y: 160},
			{X: 1500, Y: 160},
		},
		WeaponSpawns: []WeaponSpawn{
			{X: 1000, Y: 250, WeaponType: "sniper"},
			{X: 1000, Y: 660, WeaponType: "ar"},
			{X: 280, Y: 640, WeaponType: "smg"},
			{X: 1720, Y: 640, WeaponType: "ar"},
			{X: 350, Y: 880, WeaponType: "smg"},
			{X: 1600, Y: 880, WeaponType: "sniper"},
			{X: 500, Y: 180, WeaponType: "ar"},
			{X: 1450, Y: 180, WeaponType: "smg"},
			{X: 600, Y: 1010, WeaponType: "sniper"},
			{X: 1350, Y: 1010, WeaponType: "ar"},
		},
		HealthSpawns: []Vector2D{
			{X: 1000, Y: 440},
			{X: 150, Y: 640},
			{X: 1800, Y: 640},
			{X: 1000, Y: 1080},
		},
		BoosterSpawns: []Vector2D{
			{X: 880, Y: 440},
			{X: 1120, Y: 440},
			{X: 270, Y: 640},
			{X: 1680, Y: 640},
		},
	},
	"catacombs": {
		ID:              "catacombs",
		Name:            "Catacombs (Cavern)",
		Width:           2200,
		Height:          1400,
		BackgroundColor: "#1b120c",
		SkyColor:        "#2c1810",
		Platforms: []Platform{
			// Outer rock borders
			{X: 0, Y: 1340, W: 2200, H: 60, Type: "rock", Color: "#4a3525"},
			{X: 0, Y: 0, W: 50, H: 1400, Type: "rock", Color: "#4a3525"},
			{X: 2150, Y: 0, W: 50, H: 1400, Type: "rock", Color: "#4a3525"},
			{X: 0, Y: 0, W: 2200, H: 50, Type: "rock", Color: "#4a3525"},

			// Central cavern rock arch & shafts
			{X: 800, Y: 800, W: 600, H: 40, Type: "rock", Color: "#5d4037"},
			{X: 650, Y: 550, W: 900, H: 35, Type: "rock", Color: "#5d4037"},
			{X: 900, Y: 320, W: 400, H: 30, Type: "rock", Color: "#6d4c41"},

			// Left cavern chambers
			{X: 150, Y: 1100, W: 450, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 200, Y: 820, W: 350, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 100, Y: 500, W: 400, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 250, Y: 250, W: 300, H: 25, Type: "one-way", Color: "#8d6e63"},

			// Right cavern chambers
			{X: 1600, Y: 1100, W: 450, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 1650, Y: 820, W: 350, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 1700, Y: 500, W: 400, H: 30, Type: "rock", Color: "#5d4037"},
			{X: 1650, Y: 250, W: 300, H: 25, Type: "one-way", Color: "#8d6e63"},

			// Vertical shaft dividers
			{X: 600, Y: 830, W: 35, H: 300, Type: "rock", Color: "#4a4a25"},
			{X: 1565, Y: 830, W: 35, H: 300, Type: "rock", Color: "#4a4a25"},
		},
		Bushes: []Bush{
			{X: 1020, Y: 280, W: 160, H: 40},
			{X: 1020, Y: 510, W: 160, H: 40},
			{X: 320, Y: 780, W: 140, H: 40},
			{X: 1720, Y: 780, W: 140, H: 40},
			{X: 980, Y: 1300, W: 240, H: 40},
		},
		Spawns: []Vector2D{
			{X: 300, Y: 440},
			{X: 1900, Y: 440},
			{X: 1100, Y: 260},
			{X: 1100, Y: 740},
			{X: 350, Y: 1040},
			{X: 1850, Y: 1040},
		},
		WeaponSpawns: []WeaponSpawn{
			{X: 1100, Y: 280, WeaponType: "sniper"},
			{X: 1100, Y: 510, WeaponType: "ar"},
			{X: 300, Y: 460, WeaponType: "smg"},
			{X: 1900, Y: 460, WeaponType: "sniper"},
			{X: 350, Y: 1060, WeaponType: "ar"},
			{X: 1850, Y: 1060, WeaponType: "smg"},
			{X: 1100, Y: 760, WeaponType: "ar"},
		},
		HealthSpawns: []Vector2D{
			{X: 1100, Y: 480},
			{X: 250, Y: 780},
			{X: 1950, Y: 780},
		},
	},
	"hightower": {
		ID:              "hightower",
		Name:            "High Tower (Sky Battle)",
		Width:           2400,
		Height:          1500,
		BackgroundColor: "#0c1b2b",
		SkyColor:        "#1a365d",
		Platforms: []Platform{
			// Bottom Void Danger & Base Platform
			{X: 0, Y: 1440, W: 2400, H: 60, Type: "rock", Color: "#1a202c"},
			{X: 0, Y: 0, W: 40, H: 1500, Type: "rock", Color: "#1a202c"},
			{X: 2360, Y: 0, W: 40, H: 1500, Type: "rock", Color: "#1a202c"},

			// Center High Tower Structure
			{X: 1050, Y: 200, W: 300, H: 1200, Type: "metal", Color: "#2d3748"},
			{X: 950, Y: 200, W: 500, H: 30, Type: "metal", Color: "#4a5568"},
			{X: 900, Y: 450, W: 600, H: 30, Type: "metal", Color: "#4a5568"},
			{X: 850, Y: 700, W: 700, H: 30, Type: "metal", Color: "#4a5568"},
			{X: 800, Y: 950, W: 800, H: 30, Type: "metal", Color: "#4a5568"},
			{X: 750, Y: 1200, W: 900, H: 35, Type: "metal", Color: "#4a5568"},

			// Side Floating Sky Platforms (Left)
			{X: 250, Y: 350, W: 350, H: 25, Type: "one-way", Color: "#3182ce"},
			{X: 150, Y: 650, W: 400, H: 25, Type: "one-way", Color: "#3182ce"},
			{X: 300, Y: 950, W: 350, H: 25, Type: "one-way", Color: "#3182ce"},

			// Side Floating Sky Platforms (Right)
			{X: 1800, Y: 350, W: 350, H: 25, Type: "one-way", Color: "#3182ce"},
			{X: 1850, Y: 650, W: 400, H: 25, Type: "one-way", Color: "#3182ce"},
			{X: 1750, Y: 950, W: 350, H: 25, Type: "one-way", Color: "#3182ce"},
		},
		Bushes: []Bush{
			{X: 1120, Y: 160, W: 160, H: 40},
			{X: 350, Y: 310, W: 140, H: 40},
			{X: 1910, Y: 310, W: 140, H: 40},
			{X: 1120, Y: 660, W: 160, H: 40},
			{X: 1120, Y: 1160, W: 160, H: 40},
		},
		Spawns: []Vector2D{
			{X: 1200, Y: 140},
			{X: 400, Y: 300},
			{X: 2000, Y: 300},
			{X: 1200, Y: 640},
			{X: 300, Y: 600},
			{X: 2100, Y: 600},
			{X: 1200, Y: 1140},
		},
		WeaponSpawns: []WeaponSpawn{
			{X: 1200, Y: 160, WeaponType: "sniper"},
			{X: 1200, Y: 410, WeaponType: "ar"},
			{X: 1200, Y: 660, WeaponType: "smg"},
			{X: 400, Y: 320, WeaponType: "ar"},
			{X: 2000, Y: 320, WeaponType: "smg"},
			{X: 300, Y: 620, WeaponType: "ar"},
			{X: 2100, Y: 620, WeaponType: "sniper"},
			{X: 1200, Y: 1160, WeaponType: "smg"},
		},
		HealthSpawns: []Vector2D{
			{X: 1200, Y: 900},
			{X: 350, Y: 910},
			{X: 1950, Y: 910},
		},
	},
}
