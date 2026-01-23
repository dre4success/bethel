package models

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Point represents a single point in a stroke
type Point struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Pressure float64 `json:"pressure"`
}

// Stroke represents a drawing stroke
type Stroke struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId,omitempty"`
	Points    []Point   `json:"points"`
	Color     string    `json:"color"`
	Tool      string    `json:"tool"` // 'pen' or 'eraser'
	CreatedAt time.Time `json:"createdAt,omitempty"`
	CreatedBy string    `json:"createdBy,omitempty"`
}

// CreateStroke adds a new stroke to the database
func CreateStroke(ctx context.Context, pool *pgxpool.Pool, stroke *Stroke) error {
	if stroke.ID == "" {
		stroke.ID = uuid.New().String()
	}
	stroke.CreatedAt = time.Now()

	pointsJSON, err := json.Marshal(stroke.Points)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx,
		`INSERT INTO strokes (id, room_id, points, color, tool, created_at, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (id) DO NOTHING`,
		stroke.ID, stroke.RoomID, pointsJSON, stroke.Color, stroke.Tool, stroke.CreatedAt, stroke.CreatedBy,
	)
	return err
}

// GetStrokesByRoom retrieves all strokes for a room
func GetStrokesByRoom(ctx context.Context, pool *pgxpool.Pool, roomID string) ([]Stroke, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, room_id, points, color, tool, created_at, created_by
		 FROM strokes WHERE room_id = $1 ORDER BY created_at ASC`,
		roomID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var strokes []Stroke
	for rows.Next() {
		var stroke Stroke
		var pointsJSON []byte
		var createdBy *string

		err := rows.Scan(&stroke.ID, &stroke.RoomID, &pointsJSON, &stroke.Color, &stroke.Tool, &stroke.CreatedAt, &createdBy)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal(pointsJSON, &stroke.Points); err != nil {
			return nil, err
		}

		if createdBy != nil {
			stroke.CreatedBy = *createdBy
		}

		strokes = append(strokes, stroke)
	}

	if strokes == nil {
		strokes = []Stroke{}
	}

	return strokes, nil
}

// UpdateStrokePoints updates the points of an existing stroke (for live drawing)
func UpdateStrokePoints(ctx context.Context, pool *pgxpool.Pool, strokeID string, points []Point) error {
	pointsJSON, err := json.Marshal(points)
	if err != nil {
		return err
	}

	_, err = pool.Exec(ctx,
		`UPDATE strokes SET points = $1 WHERE id = $2`,
		pointsJSON, strokeID,
	)
	return err
}

// DeleteStroke removes a stroke from the database
func DeleteStroke(ctx context.Context, pool *pgxpool.Pool, strokeID string) error {
	_, err := pool.Exec(ctx, `DELETE FROM strokes WHERE id = $1`, strokeID)
	return err
}
