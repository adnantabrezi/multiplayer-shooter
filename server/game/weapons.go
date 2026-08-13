package game

var Weapons = map[string]Weapon{
	"punch": {
		ID:              "punch",
		Name:            "Fists / Punch",
		Category:        "melee",
		Damage:          35,
		FireRate:        2.5,
		ReloadTime:      0,
		MagazineSize:    999,
		ReserveAmmo:     999,
		Spread:          0,
		BulletSpeed:     0,
		BulletsPerShot:  1,
		Recoil:          0,
		Color:           "#f39c12",
		ZoomFactor:      1.0,
		IsDualWieldable: false,
	},
	"smg": {
		ID:              "smg",
		Name:            "Submachine Gun (SMG)",
		Category:        "pistol",
		Damage:          18,
		FireRate:        13.0,
		ReloadTime:      1200,
		MagazineSize:    35,
		ReserveAmmo:     140,
		Spread:          0.08,
		BulletSpeed:     36,
		BulletsPerShot:  1,
		Recoil:          0.9,
		Color:           "#3498db",
		ZoomFactor:      1.0,
		IsDualWieldable: true,
		MaxRange:        950,
	},
	"ar": {
		ID:              "ar",
		Name:            "Assault Rifle (AR-15)",
		Category:        "rifle",
		Damage:          26,
		FireRate:        9.0,
		ReloadTime:      1600,
		MagazineSize:    30,
		ReserveAmmo:     120,
		Spread:          0.05,
		BulletSpeed:     44,
		BulletsPerShot:  1,
		Recoil:          1.6,
		Color:           "#e67e22",
		ZoomFactor:      1.15,
		IsDualWieldable: false,
		MaxRange:        1350,
	},
	"sniper": {
		ID:              "sniper",
		Name:            "Heavy Sniper Rifle",
		Category:        "heavy",
		Damage:          120,
		FireRate:        0.85,
		ReloadTime:      1800,
		MagazineSize:    6,
		ReserveAmmo:     30,
		Spread:          0.0,
		BulletSpeed:     110,
		BulletsPerShot:  1,
		Recoil:          4.5,
		Color:           "#a855f7",
		ZoomFactor:      1.5,
		IsDualWieldable: false,
		MaxRange:        2800,
	},
}

func GetWeapon(id string) Weapon {
	if w, exists := Weapons[id]; exists {
		return w
	}
	if id == "sniper" || id == "m200" || id == "rifle" {
		return Weapons["sniper"]
	}
	if id == "smg" || id == "pistol" || id == "uzi" || id == "mac10" || id == "mp5" {
		return Weapons["smg"]
	}
	return Weapons["ar"]
}
