package models

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Room represents a collaborative drawing room
type Room struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// RoomState represents the full state of a room (for sync)
type RoomState struct {
	Room       Room        `json:"room"`
	Strokes    []Stroke    `json:"strokes"`
	TextBlocks []TextBlock `json:"textBlocks"`
}

// GenerateRoomID creates a short random room code
func GenerateRoomID() string {
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

// CreateRoom creates a new room in the database
func CreateRoom(ctx context.Context, pool *pgxpool.Pool, title string) (*Room, error) {
	room := &Room{
		ID:        GenerateRoomID(),
		Title:     title,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	_, err := pool.Exec(ctx,
		`INSERT INTO rooms (id, title, created_at, updated_at) VALUES ($1, $2, $3, $4)`,
		room.ID, room.Title, room.CreatedAt, room.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	return room, nil
}

// GetRoom retrieves a room by ID
func GetRoom(ctx context.Context, pool *pgxpool.Pool, id string) (*Room, error) {
	room := &Room{}
	err := pool.QueryRow(ctx,
		`SELECT id, title, created_at, updated_at FROM rooms WHERE id = $1`,
		id,
	).Scan(&room.ID, &room.Title, &room.CreatedAt, &room.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return room, nil
}

// GetRoomState retrieves the full state of a room
func GetRoomState(ctx context.Context, pool *pgxpool.Pool, roomID string) (*RoomState, error) {
	room, err := GetRoom(ctx, pool, roomID)
	if err != nil {
		return nil, err
	}

	strokes, err := GetStrokesByRoom(ctx, pool, roomID)
	if err != nil {
		return nil, err
	}

	textBlocks, err := GetTextBlocksByRoom(ctx, pool, roomID)
	if err != nil {
		return nil, err
	}

	return &RoomState{
		Room:       *room,
		Strokes:    strokes,
		TextBlocks: textBlocks,
	}, nil
}

// UpdateRoomTimestamp updates the room's updated_at timestamp
func UpdateRoomTimestamp(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx,
		`UPDATE rooms SET updated_at = $1 WHERE id = $2`,
		time.Now(), id,
	)
	return err
}

// UpdateRoomTitle updates the room's title
func UpdateRoomTitle(ctx context.Context, pool *pgxpool.Pool, id string, title string) error {
	_, err := pool.Exec(ctx,
		`UPDATE rooms SET title = $1, updated_at = $2 WHERE id = $3`,
		title, time.Now(), id,
	)
	return err
}

// DeleteRoom deletes a room and all its content (cascade)
func DeleteRoom(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM rooms WHERE id = $1`, id)
	return err
}

// ClearRoom removes all strokes and text blocks from a room
func ClearRoom(ctx context.Context, pool *pgxpool.Pool, roomID string) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM strokes WHERE room_id = $1`, roomID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `DELETE FROM text_blocks WHERE room_id = $1`, roomID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `UPDATE rooms SET updated_at = $1 WHERE id = $2`, time.Now(), roomID); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
