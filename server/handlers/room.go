package handlers

import (
	"encoding/json"
	"net/http"

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
			req.Title = "Untitled"
		}

		if req.Title == "" {
			req.Title = "Untitled"
		}

		room, err := models.CreateRoom(r.Context(), pool, req.Title)
		if err != nil {
			http.Error(w, "Failed to create room", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(room)
	}
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
