package handlers

import (
	"log"
	"net/http"

	"github.com/dre4success/bethel/server/hub"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins for development
		// In production, check against allowed origins
		return true
	},
}

// WebSocketHandler handles WebSocket connections
func WebSocketHandler(h *hub.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		roomID := vars["roomId"]

		if roomID == "" {
			http.Error(w, "Room ID required", http.StatusBadRequest)
			return
		}

		// Upgrade to WebSocket
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}

		// Create client
		client := &hub.Client{
			ID:     uuid.New().String(),
			RoomID: roomID,
			Hub:    h,
			Conn:   conn,
			Send:   make(chan []byte, 256),
		}

		// Register client with hub
		h.Register <- client

		// Start read/write pumps
		go client.WritePump()
		go client.ReadPump()
	}
}
