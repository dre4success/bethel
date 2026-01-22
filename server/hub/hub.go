package hub

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/dre4success/bethel/server/models"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Database connection pool
	DB *pgxpool.Pool

	// Registered clients by room
	Rooms map[string]map[*Client]bool

	// Mutex for thread-safe room access
	RoomsMu sync.RWMutex

	// Register requests from clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Participant colors (cycle through for new clients)
	Colors []string
}

// NewHub creates a new Hub instance
func NewHub(db *pgxpool.Pool) *Hub {
	return &Hub{
		DB:         db,
		Rooms:      make(map[string]map[*Client]bool),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		Colors: []string{
			"#FF3B30", // Red
			"#007AFF", // Blue
			"#34C759", // Green
			"#FF9500", // Orange
			"#AF52DE", // Purple
			"#5AC8FA", // Cyan
			"#FF2D55", // Pink
			"#FFCC00", // Yellow
		},
	}
}

// Run starts the hub's main loop
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.RoomsMu.Lock()

	// Create room if it doesn't exist
	if h.Rooms[client.RoomID] == nil {
		h.Rooms[client.RoomID] = make(map[*Client]bool)
	}

	// Assign a color to the client
	colorIndex := len(h.Rooms[client.RoomID]) % len(h.Colors)
	client.Color = h.Colors[colorIndex]

	// Add client to room
	h.Rooms[client.RoomID][client] = true

	log.Printf("Client %s joined room %s (total: %d)", client.ID, client.RoomID, len(h.Rooms[client.RoomID]))

	// Notify other clients in the room (while holding lock, use unsafe version)
	h.broadcastToRoomUnsafe(client.RoomID, &ServerMessage{
		Type:        "participant_join",
		Participant: &Participant{ID: client.ID, Color: client.Color, Name: client.Name},
	}, client)

	h.RoomsMu.Unlock()

	// Send room state to the new client (after releasing lock)
	go h.sendRoomState(client)
}

func (h *Hub) unregisterClient(client *Client) {
	h.RoomsMu.Lock()
	defer h.RoomsMu.Unlock()

	if room, ok := h.Rooms[client.RoomID]; ok {
		if _, ok := room[client]; ok {
			delete(room, client)
			close(client.Send)

			log.Printf("Client %s left room %s (remaining: %d)", client.ID, client.RoomID, len(room))

			// Notify other clients
			h.broadcastToRoomUnsafe(client.RoomID, &ServerMessage{
				Type:          "participant_leave",
				ParticipantID: client.ID,
			}, nil)

			// Clean up empty rooms
			if len(room) == 0 {
				delete(h.Rooms, client.RoomID)
				log.Printf("Room %s is now empty", client.RoomID)
			}
		}
	}
}

func (h *Hub) sendRoomState(client *Client) {
	// Recover from panic if sending to a closed channel (client disconnected quickly)
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in sendRoomState: %v", r)
		}
	}()

	ctx := context.Background()

    start := time.Now()
	roomState, err := models.GetRoomState(ctx, h.DB, client.RoomID)
    duration := time.Since(start)
    if duration > 100 * time.Millisecond {
        log.Printf("GetRoomState took %v for room %s", duration, client.RoomID)
    }

	if err != nil {
		log.Printf("Failed to get room state: %v", err)
		// Send empty state for new rooms
		roomState = &models.RoomState{
			Room:       models.Room{ID: client.RoomID, Title: "Untitled"},
			Strokes:    []models.Stroke{},
			TextBlocks: []models.TextBlock{},
		}
	}

	// Get current participants and verify client is still connected
	h.RoomsMu.RLock()
    // Verify client is still in the room (prevent sending on closed channel)
    room, roomExists := h.Rooms[client.RoomID]
    if !roomExists || !room[client] {
        h.RoomsMu.RUnlock()
        log.Printf("Client %s disconnected before room state could be sent", client.ID)
        return
    }

	var participants []Participant
    for c := range room {
        participants = append(participants, c.ToParticipant())
    }
	h.RoomsMu.RUnlock()

	msg := &ServerMessage{
		Type:         "room_state",
		RoomState:    roomState,
		Participants: participants,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal room state: %v", err)
		return
	}

    // Recover from panic just in case
	defer func() {
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in sendRoomState: %v", r)
		}
	}()

	select {
	case client.Send <- data:
	default:
		log.Printf("Client %s send buffer full", client.ID)
	}
}

// broadcastToRoom sends a message to all clients in a room except the sender
func (h *Hub) broadcastToRoom(roomID string, msg *ServerMessage, exclude *Client) {
	h.RoomsMu.RLock()
	defer h.RoomsMu.RUnlock()
	h.broadcastToRoomUnsafe(roomID, msg, exclude)
}

// broadcastToRoomUnsafe assumes the caller holds the lock
func (h *Hub) broadcastToRoomUnsafe(roomID string, msg *ServerMessage, exclude *Client) {
	room, ok := h.Rooms[roomID]
	if !ok {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal message: %v", err)
		return
	}

	for client := range room {
		if client != exclude {
			select {
			case client.Send <- data:
			default:
				// Buffer full, skip
				log.Printf("Client %s send buffer full, skipping", client.ID)
			}
		}
	}
}

// GetRoomParticipants returns all participants in a room
func (h *Hub) GetRoomParticipants(roomID string) []Participant {
	h.RoomsMu.RLock()
	defer h.RoomsMu.RUnlock()

	var participants []Participant
	if room, ok := h.Rooms[roomID]; ok {
		for client := range room {
			participants = append(participants, client.ToParticipant())
		}
	}
	return participants
}
