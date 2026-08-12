package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"mini-militia-server/game"

	"github.com/gorilla/websocket"
	"github.com/pion/webrtc/v3"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	hub := game.NewHub()

	// WebSocket Endpoint for Real-time Game Networking over TCP (Render Cloud compatible)
	http.HandleFunc("/api/ws", func(w http.ResponseWriter, r *http.Request) {
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("WebSocket Upgrade error:", err)
			return
		}
		defer ws.Close()

		clientID := fmt.Sprintf("client_%d", time.Now().UnixNano())
		var clientRoom *game.Room
		var clientConn *game.ClientConn
		var connMu sync.Mutex

		defer func() {
			connMu.Lock()
			if clientRoom != nil {
				clientRoom.RemoveClient(clientID)
				clientRoom = nil
				clientConn = nil
			}
			connMu.Unlock()
		}()

		for {
			messageType, message, err := ws.ReadMessage()
			if err != nil {
				break
			}

			connMu.Lock()
			// Binary Input Packet (0x01)
			if messageType == websocket.BinaryMessage || (len(message) > 0 && message[0] == game.PacketTypeInput) {
				if input, ok := game.DecodeBinaryInput(message); ok {
					if clientRoom != nil {
						clientRoom.ProcessInput(clientID, input)
					}
				}
				connMu.Unlock()
				continue
			}

			// Text / JSON Message
			var clientMsg game.ClientMessage
			err = json.Unmarshal(message, &clientMsg)
			if err != nil {
				connMu.Unlock()
				continue
			}

			switch clientMsg.Type {
			case "create_room":
				if clientRoom != nil {
					clientRoom.RemoveClient(clientID)
					clientRoom = nil
					clientConn = nil
				}

				mapID := clientMsg.MapID
				if mapID == "" {
					mapID = "outpost"
				}
				mode := clientMsg.Mode
				if mode == "" {
					mode = "custom"
				}
				room := hub.CreateRoom(clientMsg.RoomCode, mapID, mode, clientMsg.BotCount, clientMsg.BotDifficulty, clientMsg.MatchDuration)
				clientRoom = room
				clientConn = room.AddClientWS(ws, clientID, clientMsg.Avatar)

			case "join_room":
				if clientRoom != nil {
					clientRoom.RemoveClient(clientID)
					clientRoom = nil
					clientConn = nil
				}

				code := clientMsg.RoomCode
				room, exists := hub.GetRoom(code)
				if !exists {
					errMsg := game.ServerMessage{
						Type:  "error",
						Error: "Room not found. Please check room code or create a new room!",
					}
					if clientConn != nil {
						clientConn.WriteJSON(errMsg)
					} else {
						ws.WriteJSON(errMsg)
					}
					connMu.Unlock()
					continue
				}
				clientRoom = room
				clientConn = room.AddClientWS(ws, clientID, clientMsg.Avatar)

			case "player_state":
				if clientRoom != nil && clientMsg.PlayerState != nil {
					clientRoom.ProcessPlayerState(clientID, clientMsg.PlayerState)
				}

			case "spawn_bullet", "spawn_grenade", "player_hit", "kill_event":
				if clientRoom != nil {
					relayMsg := game.ServerMessage{
						Type:     clientMsg.Type,
						ClientID: clientID,
					}
					if clientMsg.Bullet != nil {
						relayMsg.Bullets = []game.Bullet{*clientMsg.Bullet}
					}
					if clientMsg.Grenade != nil {
						relayMsg.Grenades = []game.GrenadeEntity{*clientMsg.Grenade}
					}
					if clientMsg.Kill != nil {
						relayMsg.KillFeed = []game.KillFeedEntry{*clientMsg.Kill}
					}
					clientRoom.RelayMessage(clientID, relayMsg)
				}

			case "input":
				if clientRoom != nil {
					clientRoom.ProcessInput(clientID, clientMsg.Input)
				}

			case "ping":
				pongMsg := game.ServerMessage{
					Type:   "pong",
					PingTs: clientMsg.Timestamp,
				}
				if clientConn != nil {
					clientConn.WriteJSON(pongMsg)
				} else {
					ws.WriteJSON(pongMsg)
				}

			case "leave_room":
				if clientRoom != nil {
					clientRoom.RemoveClient(clientID)
					clientRoom = nil
					clientConn = nil
				}
			}
			connMu.Unlock()
		}
	})

	// REST Endpoint: List Rooms
	http.HandleFunc("/api/rooms", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		rooms := hub.GetRoomList()
		json.NewEncoder(w).Encode(rooms)
	})

	// WebRTC UDP Signaling Endpoint
	http.HandleFunc("/api/rtc/offer", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var offer game.SessionDescription
		if err := json.NewDecoder(r.Body).Decode(&offer); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// WebRTC PeerConnection configuration with public STUN servers
		config := webrtc.Configuration{
			ICEServers: []webrtc.ICEServer{
				{
					URLs: []string{
						"stun:stun.l.google.com:19302",
						"stun:stun1.l.google.com:19302",
					},
				},
			},
		}

		peerConnection, err := webrtc.NewPeerConnection(config)
		if err != nil {
			log.Println("Error creating PeerConnection:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		clientID := fmt.Sprintf("client_%d", time.Now().UnixNano())
		var clientRoom *game.Room
		var clientConn *game.ClientConn
		var connMu sync.Mutex

		peerConnection.OnDataChannel(func(dc *webrtc.DataChannel) {
			dc.OnOpen(func() {
				// DataChannel is open and ready over UDP
			})

			dc.OnMessage(func(msg webrtc.DataChannelMessage) {
				connMu.Lock()
				defer connMu.Unlock()

				// Fast path: Handle Binary Input Packet (0x01)
				if len(msg.Data) > 0 && msg.Data[0] == game.PacketTypeInput {
					if input, ok := game.DecodeBinaryInput(msg.Data); ok {
						if clientRoom != nil {
							clientRoom.ProcessInput(clientID, input)
						}
					}
					return
				}

				// Slow path: JSON Control Messages (create_room, join_room, etc.)
				var clientMsg game.ClientMessage
				err := json.Unmarshal(msg.Data, &clientMsg)
				if err != nil {
					return
				}

				switch clientMsg.Type {
				case "create_room":
					if clientRoom != nil {
						clientRoom.RemoveClient(clientID)
						clientRoom = nil
						clientConn = nil
					}

					mapID := clientMsg.MapID
					if mapID == "" {
						mapID = "outpost"
					}
					mode := clientMsg.Mode
					if mode == "" {
						mode = "custom"
					}
					room := hub.CreateRoom(clientMsg.RoomCode, mapID, mode, clientMsg.BotCount, clientMsg.BotDifficulty, clientMsg.MatchDuration)
					clientRoom = room
					clientConn = room.AddClient(dc, clientID, clientMsg.Avatar)

				case "join_room":
					if clientRoom != nil {
						clientRoom.RemoveClient(clientID)
						clientRoom = nil
						clientConn = nil
					}

					code := clientMsg.RoomCode
					room, exists := hub.GetRoom(code)
					if !exists {
						errMsg := game.ServerMessage{
							Type:  "error",
							Error: "Room not found. Please check room code or create a new room!",
						}
						if clientConn != nil {
							clientConn.WriteJSON(errMsg)
						} else {
							bytes, _ := json.Marshal(errMsg)
							dc.SendText(string(bytes))
						}
						return
					}
					clientRoom = room
					clientConn = room.AddClient(dc, clientID, clientMsg.Avatar)

				case "player_state":
					if clientRoom != nil && clientMsg.PlayerState != nil {
						clientRoom.ProcessPlayerState(clientID, clientMsg.PlayerState)
					}

				case "spawn_bullet", "spawn_grenade", "player_hit", "kill_event":
					if clientRoom != nil {
						relayMsg := game.ServerMessage{
							Type:     clientMsg.Type,
							ClientID: clientID,
						}
						if clientMsg.Bullet != nil {
							relayMsg.Bullets = []game.Bullet{*clientMsg.Bullet}
						}
						if clientMsg.Grenade != nil {
							relayMsg.Grenades = []game.GrenadeEntity{*clientMsg.Grenade}
						}
						if clientMsg.Kill != nil {
							relayMsg.KillFeed = []game.KillFeedEntry{*clientMsg.Kill}
						}
						clientRoom.RelayMessage(clientID, relayMsg)
					}

				case "input":
					if clientRoom != nil {
						clientRoom.ProcessInput(clientID, clientMsg.Input)
					}

				case "ping":
					pongMsg := game.ServerMessage{
						Type:   "pong",
						PingTs: clientMsg.Timestamp,
					}
					if clientConn != nil {
						clientConn.WriteJSON(pongMsg)
					} else {
						bytes, _ := json.Marshal(pongMsg)
						dc.SendText(string(bytes))
					}

				case "leave_room":
					if clientRoom != nil {
						clientRoom.RemoveClient(clientID)
						clientRoom = nil
						clientConn = nil
					}
				}
			})

			dc.OnClose(func() {
				connMu.Lock()
				defer connMu.Unlock()
				if clientRoom != nil {
					clientRoom.RemoveClient(clientID)
					clientRoom = nil
					clientConn = nil
				}
			})
		})

		peerConnection.OnConnectionStateChange(func(s webrtc.PeerConnectionState) {
			if s == webrtc.PeerConnectionStateFailed || s == webrtc.PeerConnectionStateClosed {
				connMu.Lock()
				defer connMu.Unlock()
				if clientRoom != nil {
					clientRoom.RemoveClient(clientID)
					clientRoom = nil
					clientConn = nil
				}
			}
		})

		// Set Remote Description from SDP offer
		err = peerConnection.SetRemoteDescription(webrtc.SessionDescription{
			SDP:  offer.SDP,
			Type: webrtc.SDPTypeOffer,
		})
		if err != nil {
			log.Println("Error setting RemoteDescription:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Create SDP Answer
		answer, err := peerConnection.CreateAnswer(nil)
		if err != nil {
			log.Println("Error creating SDP Answer:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Gather ICE Candidates completely before returning answer
		gatherComplete := webrtc.GatheringCompletePromise(peerConnection)
		err = peerConnection.SetLocalDescription(answer)
		if err != nil {
			log.Println("Error setting LocalDescription:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		<-gatherComplete

		// Send SDP Answer back to client
		response := game.SessionDescription{
			SDP:  peerConnection.LocalDescription().SDP,
			Type: "answer",
		}
		json.NewEncoder(w).Encode(response)
	})

	// Static Build File Server for HTML5 Client
	distDir := "./dist"
	if _, err := os.Stat(distDir); os.IsNotExist(err) {
		if _, err := os.Stat("../dist"); err == nil {
			distDir = "../dist"
		}
	}

	fs := http.FileServer(http.Dir(distDir))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")

		if r.URL.Path == "/api/rooms" || r.URL.Path == "/api/rtc/offer" || r.URL.Path == "/api/ws" {
			return
		}

		filePath := filepath.Join(distDir, filepath.Clean(r.URL.Path))
		info, err := os.Stat(filePath)
		if os.IsNotExist(err) || info.IsDir() {
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})

	fmt.Printf("🚀 Mini Militia Go Server running on http://localhost:%s\n", port)
	fmt.Printf("⚡ Fast UDP WebRTC DataChannel Endpoint: http://localhost:%s/api/rtc/offer\n", port)
	fmt.Printf("📁 Serving HTML5 Client static build from %s on /\n", distDir)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

