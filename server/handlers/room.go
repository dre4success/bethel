package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/dre4success/bethel/server/models"
	"github.com/gorilla/mux"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateRoomRequest represents the request body for room creation
type CreateRoomRequest struct {
	Title string `json:"title"`
}

// CreateRoom handles POST /api/rooms
func CreateRoom(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req CreateRoomRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			// Default title if none provided
			req.Title = generateFunName()
		}

		if req.Title == "" {
			req.Title = generateFunName()
		}

		room, err := models.CreateRoom(r.Context(), pool, "", req.Title)
		if err != nil {
			http.Error(w, "Failed to create room", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(room)
	}
}

func generateFunName() string {
	adjectives := []string{
		"Cosmic", "Velvet", "Neon", "Quiet", "Paper", "Wild", "Lazy", "Hidden", "Silent", "Rapid",
		"Misty", "Golden", "Silver", "Electric", "Secret", "Hollow", "Living", "Dancing", "Flying",
	}
	nouns := []string{
		"Sketch", "Canvas", "Thoughts", "Storm", "Dreams", "Ink", "River", "Forest", "Mountain", "Sky",
		"Ocean", "Spark", "Flame", "Shadow", "Light", "Echo", "Galaxy", "Star", "Moon",
	}

    // Use current time purely for pseudo-random selection to avoid global seed issues
    nano := time.Now().UnixNano()
    adj := adjectives[int(nano)%len(adjectives)]
    noun := nouns[int(nano/2)%len(nouns)]
    
	return adj + " " + noun
}

// GetRoom handles GET /api/rooms/{id}
func GetRoom(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		vars := mux.Vars(r)
		roomID := vars["id"]

		roomState, err := models.GetRoomState(r.Context(), pool, roomID)
		if err != nil {
			http.Error(w, "Room not found", http.StatusNotFound)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(roomState)
	}
}
