package hub

import (
	"context"
	"encoding/json"
	"log"

	"github.com/dre4success/bethel/server/models"
)

// ClientMessage represents messages from client to server
type ClientMessage struct {
	Type string `json:"type"`

	// For stroke operations
	Stroke   *models.Stroke  `json:"stroke,omitempty"`
	StrokeID string          `json:"strokeId,omitempty"`
	Points   []models.Point  `json:"points,omitempty"`

	// For text operations
	TextBlock     *models.TextBlock       `json:"textBlock,omitempty"`
	TextBlockID   string                  `json:"textBlockId,omitempty"`
	TextUpdates   *models.TextBlockUpdate `json:"updates,omitempty"`

	// For cursor
	X float64 `json:"x,omitempty"`
	Y float64 `json:"y,omitempty"`
}

// ServerMessage represents messages from server to client
type ServerMessage struct {
	Type string `json:"type"`

	// For room_state
	RoomState    *models.RoomState `json:"roomState,omitempty"`
	Participants []Participant     `json:"participants,omitempty"`

	// For participant events
	Participant   *Participant `json:"participant,omitempty"`
	ParticipantID string       `json:"participantId,omitempty"`

	// For stroke events
	Stroke   *models.Stroke `json:"stroke,omitempty"`
	StrokeID string         `json:"strokeId,omitempty"`
	Points   []models.Point `json:"points,omitempty"`

	// For text events
	TextBlock   *models.TextBlock       `json:"textBlock,omitempty"`
	TextBlockID string                  `json:"textBlockId,omitempty"`
	TextUpdates *models.TextBlockUpdate `json:"updates,omitempty"`

	// For cursor
	X     float64 `json:"x,omitempty"`
	Y     float64 `json:"y,omitempty"`
	Color string  `json:"color,omitempty"`

	// For errors
	Error string `json:"error,omitempty"`
}

// HandleMessage processes incoming client messages
func (h *Hub) HandleMessage(client *Client, msg *ClientMessage) {
	ctx := context.Background()

	switch msg.Type {
	case "stroke_add":
		h.handleStrokeAdd(ctx, client, msg)

	case "stroke_update":
		h.handleStrokeUpdate(ctx, client, msg)

	case "text_add":
		h.handleTextAdd(ctx, client, msg)

	case "text_update":
		h.handleTextUpdate(ctx, client, msg)

	case "text_delete":
		h.handleTextDelete(ctx, client, msg)

	case "cursor_move":
		h.handleCursorMove(client, msg)

	case "clear_all":
		h.handleClearAll(ctx, client)

	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (h *Hub) handleStrokeAdd(ctx context.Context, client *Client, msg *ClientMessage) {
	if msg.Stroke == nil {
		return
	}

	stroke := msg.Stroke
	stroke.RoomID = client.RoomID
	stroke.CreatedBy = client.ID

	// Persist to database
	if err := models.CreateStroke(ctx, h.DB, stroke); err != nil {
		log.Printf("Failed to save stroke: %v", err)
		h.sendError(client, "Failed to save stroke")
		return
	}

	// Broadcast to other clients
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "stroke_add",
		Stroke:        stroke,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleStrokeUpdate(ctx context.Context, client *Client, msg *ClientMessage) {
	if msg.StrokeID == "" || msg.Points == nil {
		return
	}

	// Update in database
	if err := models.UpdateStrokePoints(ctx, h.DB, msg.StrokeID, msg.Points); err != nil {
		log.Printf("Failed to update stroke: %v", err)
		return
	}

	// Broadcast to other clients
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "stroke_update",
		StrokeID:      msg.StrokeID,
		Points:        msg.Points,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleTextAdd(ctx context.Context, client *Client, msg *ClientMessage) {
	if msg.TextBlock == nil {
		return
	}

	textBlock := msg.TextBlock
	textBlock.RoomID = client.RoomID

	// Persist to database
	if err := models.CreateTextBlock(ctx, h.DB, textBlock); err != nil {
		log.Printf("Failed to save text block: %v", err)
		h.sendError(client, "Failed to save text block")
		return
	}

	// Broadcast to other clients
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "text_add",
		TextBlock:     textBlock,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleTextUpdate(ctx context.Context, client *Client, msg *ClientMessage) {
	if msg.TextBlockID == "" || msg.TextUpdates == nil {
		return
	}

	// Update in database
	if err := models.UpdateTextBlock(ctx, h.DB, msg.TextBlockID, msg.TextUpdates); err != nil {
		log.Printf("Failed to update text block: %v", err)
		return
	}

	// Broadcast to other clients
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "text_update",
		TextBlockID:   msg.TextBlockID,
		TextUpdates:   msg.TextUpdates,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleTextDelete(ctx context.Context, client *Client, msg *ClientMessage) {
	if msg.TextBlockID == "" {
		return
	}

	// Delete from database
	if err := models.DeleteTextBlock(ctx, h.DB, msg.TextBlockID); err != nil {
		log.Printf("Failed to delete text block: %v", err)
		return
	}

	// Broadcast to other clients
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "text_delete",
		TextBlockID:   msg.TextBlockID,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleCursorMove(client *Client, msg *ClientMessage) {
	// Broadcast cursor position to other clients (no persistence needed)
	h.broadcastToRoom(client.RoomID, &ServerMessage{
		Type:          "cursor_move",
		X:             msg.X,
		Y:             msg.Y,
		Color:         client.Color,
		ParticipantID: client.ID,
	}, client)
}

func (h *Hub) handleClearAll(ctx context.Context, client *Client) {
	// Clear room content in database
	if err := models.ClearRoom(ctx, h.DB, client.RoomID); err != nil {
		log.Printf("Failed to clear room: %v", err)
		h.sendError(client, "Failed to clear room")
		return
	}

	// Broadcast to all clients including sender
	h.RoomsMu.RLock()
	defer h.RoomsMu.RUnlock()

	msg := &ServerMessage{
		Type:          "clear_all",
		ParticipantID: client.ID,
	}

	data, _ := json.Marshal(msg)

	if room, ok := h.Rooms[client.RoomID]; ok {
		for c := range room {
			select {
			case c.Send <- data:
			default:
			}
		}
	}
}

func (h *Hub) sendError(client *Client, errMsg string) {
	msg := &ServerMessage{
		Type:  "error",
		Error: errMsg,
	}
	data, _ := json.Marshal(msg)
	select {
	case client.Send <- data:
	default:
	}
}
