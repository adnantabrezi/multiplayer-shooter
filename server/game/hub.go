package game

import (
	"math/rand"
	"sync"
	"time"
)

type Hub struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

func NewHub() *Hub {
	return &Hub{
		rooms: make(map[string]*Room),
	}
}

func (h *Hub) GenerateRoomCode() string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	rand.Seed(time.Now().UnixNano())

	for {
		codeBytes := make([]byte, 5)
		for i := range codeBytes {
			codeBytes[i] = charset[rand.Intn(len(charset))]
		}
		code := string(codeBytes)
		if _, exists := h.rooms[code]; !exists {
			return code
		}
	}
}

func (h *Hub) CreateRoom(code, mapID, mode string, botCount int, botDiff string, matchDuration int) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()

	if code == "" {
		code = h.GenerateRoomCode()
	}

	room := NewRoom(code, mapID, mode, botCount, botDiff, matchDuration, h)
	h.rooms[code] = room
	return room
}

func (h *Hub) GetRoom(code string) (*Room, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	room, exists := h.rooms[code]
	return room, exists
}

func (h *Hub) RemoveRoom(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	delete(h.rooms, code)
}

func (h *Hub) GetRoomList() []RoomInfo {
	h.mu.RLock()
	defer h.mu.RUnlock()

	list := make([]RoomInfo, 0, len(h.rooms))
	for _, room := range h.rooms {
		list = append(list, room.GetInfo())
	}
	return list
}
