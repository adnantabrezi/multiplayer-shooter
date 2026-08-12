package game

type Vector2D struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type AvatarConfig struct {
	Headgear      string `json:"headgear"`
	HairColor     string `json:"hairColor"`
	SkinTone      string `json:"skinTone"`
	EyeStyle      string `json:"eyeStyle"`
	FacialHair    string `json:"facialHair"`
	OutfitColor   string `json:"outfitColor"`
	OutfitPattern string `json:"outfitPattern"`
	Name          string `json:"name"`
}

type Weapon struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Category        string  `json:"category"`
	Damage          float64 `json:"damage"`
	FireRate        float64 `json:"fireRate"`
	ReloadTime      float64 `json:"reloadTime"`
	MagazineSize    int     `json:"magazineSize"`
	ReserveAmmo     int     `json:"reserveAmmo"`
	Spread          float64 `json:"spread"`
	BulletSpeed     float64 `json:"bulletSpeed"`
	BulletsPerShot  int     `json:"bulletsPerShot"`
	Recoil          float64 `json:"recoil"`
	Color           string  `json:"color"`
	ZoomFactor      float64 `json:"zoomFactor"`
	IsDualWieldable bool    `json:"isDualWieldable"`
	MaxRange        float64 `json:"maxRange,omitempty"`
}

type Platform struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	W     float64 `json:"w"`
	H     float64 `json:"h"`
	Type  string  `json:"type"` // "solid", "one-way", "metal", "rock"
	Color string  `json:"color,omitempty"`
}

type Bush struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
	W float64 `json:"w"`
	H float64 `json:"h"`
}

type WeaponSpawn struct {
	X          float64 `json:"x"`
	Y          float64 `json:"y"`
	WeaponType string  `json:"weaponType"`
}

type GameMap struct {
	ID              string        `json:"id"`
	Name            string        `json:"name"`
	Width           float64       `json:"width"`
	Height          float64       `json:"height"`
	BackgroundColor string        `json:"backgroundColor"`
	SkyColor        string        `json:"skyColor"`
	Platforms       []Platform    `json:"platforms"`
	Bushes          []Bush        `json:"bushes"`
	Spawns          []Vector2D    `json:"spawns"`
	WeaponSpawns    []WeaponSpawn `json:"weaponSpawns"`
	HealthSpawns    []Vector2D    `json:"healthSpawns"`
	BoosterSpawns   []Vector2D    `json:"boosterSpawns,omitempty"`
}

type Player struct {
	ID            string       `json:"id"`
	Name          string       `json:"name"`
	IsBot         bool         `json:"isBot"`
	BotDifficulty string       `json:"botDifficulty,omitempty"`
	Team          string       `json:"team"` // "red", "blue", "none"
	Avatar        AvatarConfig `json:"avatar"`

	// Position & Physics
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	Vx           float64 `json:"vx"`
	Vy           float64 `json:"vy"`
	Radius       float64 `json:"radius"`
	FacingRight  bool    `json:"facingRight"`
	AimAngle     float64 `json:"aimAngle"`
	IsGrounded   bool    `json:"isGrounded"`
	IsCrouching  bool    `json:"isCrouching"`
	IsBoosting   bool    `json:"isBoosting"`
	IsDead       bool    `json:"isDead"`
	RespawnTimer float64 `json:"respawnTimer"`

	// Stats / Meters
	Health         float64 `json:"health"`
	MaxHealth      float64 `json:"maxHealth"`
	Nitro          float64 `json:"nitro"`
	MaxNitro       float64 `json:"maxNitro"`
	LastDamageTime int64   `json:"lastDamageTime"`

	// Loadout
	PrimaryWeapon    string  `json:"primaryWeapon"`
	SecondaryWeapon  string  `json:"secondaryWeapon"`
	ActiveSlot       string  `json:"activeSlot"` // "primary", "secondary"
	IsDualWielding   bool    `json:"isDualWielding"`
	CurrentMag       int     `json:"currentMag"`
	ReserveAmmo      int     `json:"reserveAmmo"`
	SecondaryMag     int     `json:"secondaryMag"`
	SecondaryReserve int     `json:"secondaryReserve"`
	IsReloading      bool    `json:"isReloading"`
	ReloadProgress   float64 `json:"reloadProgress"`
	LastShotTime     int64   `json:"lastShotTime"`

	// Grenades & Melee
	ActiveGrenade    string  `json:"activeGrenade"`
	FragCount        int     `json:"fragCount"`
	GasCount         int     `json:"gasCount"`
	MineCount        int     `json:"mineCount"`
	IsMeleeAttacking bool    `json:"isMeleeAttacking"`
	MeleeTimer       float64 `json:"meleeTimer"`

	// Score stats
	Kills       int     `json:"kills"`
	Deaths      int     `json:"deaths"`
	Suicides    int     `json:"suicides"`
	DamageDealt float64 `json:"damageDealt"`
	Headshots   int     `json:"headshots"`
	Streak      int     `json:"streak"`

	// Visuals
	Opacity float64 `json:"opacity"`
	InBush  bool    `json:"inBush"`

	// Last processed client input sequence
	LastProcessedSeq uint64 `json:"lastProcessedSeq"`
}

type Bullet struct {
	ID          string  `json:"id"`
	ShooterID   string  `json:"shooterId"`
	WeaponType  string  `json:"weaponType"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Vx          float64 `json:"vx"`
	Vy          float64 `json:"vy"`
	Damage      float64 `json:"damage"`
	Color       string  `json:"color"`
	Radius      float64 `json:"radius"`
	Life        float64 `json:"life"`
	MaxLife     float64 `json:"maxLife"`
	IsExplosive      bool    `json:"isExplosive,omitempty"`
	IsFlame          bool    `json:"isFlame,omitempty"`
	IsLaser          bool    `json:"isLaser,omitempty"`
	DistanceTraveled float64 `json:"distanceTraveled,omitempty"`
	MaxRange         float64 `json:"maxRange,omitempty"`
	Alpha            float64 `json:"alpha,omitempty"`
}

type GrenadeEntity struct {
	ID        string  `json:"id"`
	ShooterID string  `json:"shooterId"`
	Type      string  `json:"type"`
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	Vx        float64 `json:"vx"`
	Vy        float64 `json:"vy"`
	Timer     float64 `json:"timer"`
	IsArming  bool    `json:"isArming,omitempty"`
	IsStuck   bool    `json:"isStuck,omitempty"`
}

type Explosion struct {
	X         float64 `json:"x"`
	Y         float64 `json:"y"`
	ShooterID string  `json:"shooterId"`
	Type      string  `json:"type"`
}

type WeaponPickup struct {
	ID          string  `json:"id"`
	WeaponType  string  `json:"weaponType"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	Vx          float64 `json:"vx"`
	Vy          float64 `json:"vy"`
	Ammo        int     `json:"ammo"`
	RespawnTime float64 `json:"respawnTime"`
}

type HealthCrate struct {
	ID           string  `json:"id"`
	X            float64 `json:"x"`
	Y            float64 `json:"y"`
	Active       bool    `json:"active"`
	RespawnTimer float64 `json:"respawnTimer"`
}

type KillFeedEntry struct {
	ID         string `json:"id"`
	KillerName string `json:"killerName"`
	KillerTeam string `json:"killerTeam"`
	VictimName string `json:"victimName"`
	VictimTeam string `json:"victimTeam"`
	WeaponUsed string `json:"weaponUsed"`
	IsHeadshot bool   `json:"isHeadshot"`
	Timestamp  int64  `json:"timestamp"`
}

type ClientInput struct {
	Seq          uint64  `json:"seq"`
	MoveLeft     bool    `json:"moveLeft"`
	MoveRight    bool    `json:"moveRight"`
	Boost        bool    `json:"boost"`
	Crouch       bool    `json:"crouch"`
	AimAngle     float64 `json:"aimAngle"`
	IsShooting   bool    `json:"isShooting"`
	ThrowGrenade bool    `json:"throwGrenade"`
	GrenadeFuse  float64 `json:"grenadeFuse"`
	SwapWeapon   bool    `json:"swapWeapon"`
	PickUpWeapon bool    `json:"pickUpWeapon"`
	Reload       bool    `json:"reload"`
	Melee        bool    `json:"melee"`
}

type PlayerHit struct {
	TargetID  string  `json:"targetId"`
	Damage    float64 `json:"damage"`
	ShooterID string  `json:"shooterId"`
	Weapon    string  `json:"weapon"`
}

type ClientMessage struct {
	Type          string         `json:"type"` // "create_room", "join_room", "leave_room", "input", "player_state", "spawn_bullet", "spawn_grenade", "player_hit", "kill_event", "ping"
	RoomCode      string         `json:"roomCode"`
	MapID         string         `json:"mapId"`
	Mode          string         `json:"mode"`
	BotCount      int            `json:"botCount"`
	BotDifficulty string         `json:"botDifficulty"`
	MatchDuration int            `json:"matchDuration,omitempty"`
	Avatar        AvatarConfig   `json:"avatar"`
	Input         ClientInput    `json:"input"`
	PlayerState   *Player        `json:"playerState,omitempty"`
	Bullet        *Bullet        `json:"bullet,omitempty"`
	Grenade       *GrenadeEntity `json:"grenade,omitempty"`
	Hit           *PlayerHit     `json:"hit,omitempty"`
	Kill          *KillFeedEntry `json:"kill,omitempty"`
	Timestamp     int64          `json:"timestamp"`
}

type BlueZoneState struct {
	CenterX       float64 `json:"centerX"`
	CenterY       float64 `json:"centerY"`
	CurrentRadius float64 `json:"currentRadius"`
	TargetRadius  float64 `json:"targetRadius"`
	Phase         int     `json:"phase"`
	IsShrinking   bool    `json:"isShrinking"`
	ShrinkTimer   float64 `json:"shrinkTimer"`
	DamagePerSec  float64 `json:"damagePerSec"`
}

type AirDrop struct {
	ID          string  `json:"id"`
	X           float64 `json:"x"`
	Y           float64 `json:"y"`
	TargetY     float64 `json:"targetY"`
	Vy          float64 `json:"vy"`
	IsLanding   bool    `json:"isLanding"`
	HasLanded   bool    `json:"hasLanded"`
	WeaponType  string  `json:"weaponType"`
	LootClaimed bool    `json:"lootClaimed"`
}

type ServerMessage struct {
	Type          string          `json:"type"` // "joined", "snapshot", "pong", "error", "room_list", "match_end"
	Tick          uint64          `json:"tick"`
	RoomCode      string          `json:"roomCode"`
	MapID         string          `json:"mapId"`
	TimeRemaining float64         `json:"timeRemaining"`
	Players       []Player        `json:"players"`
	Bullets       []Bullet        `json:"bullets"`
	Grenades      []GrenadeEntity `json:"grenades"`
	Explosions    []Explosion     `json:"explosions,omitempty"`
	BlueZone      *BlueZoneState  `json:"blueZone,omitempty"`
	AirDrops      []AirDrop       `json:"airDrops,omitempty"`
	Pickups       []WeaponPickup  `json:"pickups"`
	HealthCrates  []HealthCrate   `json:"healthCrates"`
	BoosterCrates []HealthCrate   `json:"boosterCrates,omitempty"`
	KillFeed      []KillFeedEntry `json:"killFeed"`
	PingTs        int64           `json:"pingTs,omitempty"`
	Error         string          `json:"error,omitempty"`
	ClientID      string          `json:"clientId,omitempty"`
}

type RoomInfo struct {
	Code        string `json:"code"`
	MapID       string `json:"mapId"`
	GameMode    string `json:"gameMode"`
	PlayerCount int    `json:"playerCount"`
	MaxPlayers  int    `json:"maxPlayers"`
	BotCount    int    `json:"botCount"`
	IsStarted   bool   `json:"isStarted"`
}

type SessionDescription struct {
	SDP  string `json:"sdp"`
	Type string `json:"type"`
}

