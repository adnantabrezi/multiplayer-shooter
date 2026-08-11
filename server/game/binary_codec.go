package game

import (
	"encoding/binary"
	"encoding/json"
	"math"
)

const (
	PacketTypeJSON     byte = 0x00
	PacketTypeInput    byte = 0x01
	PacketTypeSnapshot byte = 0x02
)

// DecodeBinaryInput parses a 15+ byte client input packet
// Byte 0: 0x01
// Bytes 1-4: Seq (uint32)
// Byte 5: Flags1 (moveLeft, moveRight, boost, crouch, isShooting, throwGrenade, swapWeapon, pickUpWeapon)
// Byte 6: Flags2 (reload, melee)
// Bytes 7-10: AimAngle (float32)
// Bytes 11-14: GrenadeFuse (float32)
func DecodeBinaryInput(data []byte) (ClientInput, bool) {
	if len(data) < 15 || data[0] != PacketTypeInput {
		return ClientInput{}, false
	}

	seq := uint64(binary.LittleEndian.Uint32(data[1:5]))
	flags1 := data[5]
	flags2 := data[6]

	aimBits := binary.LittleEndian.Uint32(data[7:11])
	aimAngle := float64(math.Float32frombits(aimBits))

	fuseBits := binary.LittleEndian.Uint32(data[11:15])
	grenadeFuse := float64(math.Float32frombits(fuseBits))

	return ClientInput{
		Seq:          seq,
		MoveLeft:     (flags1 & (1 << 0)) != 0,
		MoveRight:    (flags1 & (1 << 1)) != 0,
		Boost:        (flags1 & (1 << 2)) != 0,
		Crouch:       (flags1 & (1 << 3)) != 0,
		IsShooting:   (flags1 & (1 << 4)) != 0,
		ThrowGrenade: (flags1 & (1 << 5)) != 0,
		SwapWeapon:   (flags1 & (1 << 6)) != 0,
		PickUpWeapon: (flags1 & (1 << 7)) != 0,
		Reload:       (flags2 & (1 << 0)) != 0,
		Melee:        (flags2 & (1 << 1)) != 0,
		AimAngle:     aimAngle,
		GrenadeFuse:  grenadeFuse,
	}, true
}

// EncodeBinarySnapshot builds a binary ArrayBuffer frame for 20Hz WebRTC UDP snapshot broadcasting
func EncodeBinarySnapshot(msg *ServerMessage) []byte {
	jsonBytes, err := json.Marshal(msg)
	if err != nil {
		return nil
	}

	// Packet layout: [0x02, 4-byte json length, json bytes]
	buf := make([]byte, 5+len(jsonBytes))
	buf[0] = PacketTypeSnapshot
	binary.LittleEndian.PutUint32(buf[1:5], uint32(len(jsonBytes)))
	copy(buf[5:], jsonBytes)
	return buf
}
