package models

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// TextBlock represents a text element on the canvas
type TextBlock struct {
	ID         string    `json:"id"`
	RoomID     string    `json:"roomId,omitempty"`
	X          float64   `json:"x"`
	Y          float64   `json:"y"`
	Width      float64   `json:"width"`
	Height     float64   `json:"height"`
	Content    string    `json:"content"`
	FontSize   float64   `json:"fontSize"`
	Color      string    `json:"color"`
	FontFamily string    `json:"fontFamily"`
	CreatedAt  time.Time `json:"createdAt,omitempty"`
	UpdatedAt  time.Time `json:"updatedAt,omitempty"`
}

// TextBlockUpdate represents partial updates to a text block
type TextBlockUpdate struct {
	X          *float64 `json:"x,omitempty"`
	Y          *float64 `json:"y,omitempty"`
	Width      *float64 `json:"width,omitempty"`
	Height     *float64 `json:"height,omitempty"`
	Content    *string  `json:"content,omitempty"`
	FontSize   *float64 `json:"fontSize,omitempty"`
	Color      *string  `json:"color,omitempty"`
	FontFamily *string  `json:"fontFamily,omitempty"`
}

// CreateTextBlock adds a new text block to the database
func CreateTextBlock(ctx context.Context, pool *pgxpool.Pool, tb *TextBlock) error {
	if tb.ID == "" {
		tb.ID = uuid.New().String()
	}
	tb.CreatedAt = time.Now()
	tb.UpdatedAt = time.Now()

	_, err := pool.Exec(ctx,
		`INSERT INTO text_blocks (id, room_id, x, y, width, height, content, font_size, color, font_family, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		tb.ID, tb.RoomID, tb.X, tb.Y, tb.Width, tb.Height, tb.Content, tb.FontSize, tb.Color, tb.FontFamily, tb.CreatedAt, tb.UpdatedAt,
	)
	return err
}

// GetTextBlocksByRoom retrieves all text blocks for a room
func GetTextBlocksByRoom(ctx context.Context, pool *pgxpool.Pool, roomID string) ([]TextBlock, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, room_id, x, y, width, height, content, font_size, color, font_family, created_at, updated_at
		 FROM text_blocks WHERE room_id = $1 ORDER BY created_at ASC`,
		roomID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var textBlocks []TextBlock
	for rows.Next() {
		var tb TextBlock
		err := rows.Scan(&tb.ID, &tb.RoomID, &tb.X, &tb.Y, &tb.Width, &tb.Height, &tb.Content, &tb.FontSize, &tb.Color, &tb.FontFamily, &tb.CreatedAt, &tb.UpdatedAt)
		if err != nil {
			return nil, err
		}
		textBlocks = append(textBlocks, tb)
	}

	if textBlocks == nil {
		textBlocks = []TextBlock{}
	}

	return textBlocks, nil
}

// UpdateTextBlock updates an existing text block
func UpdateTextBlock(ctx context.Context, pool *pgxpool.Pool, id string, updates *TextBlockUpdate) error {
	// Build dynamic update query based on provided fields
	query := `UPDATE text_blocks SET updated_at = $1`
	args := []interface{}{time.Now()}
	argNum := 2

	if updates.X != nil {
		query += `, x = $` + string(rune('0'+argNum))
		args = append(args, *updates.X)
		argNum++
	}
	if updates.Y != nil {
		query += `, y = $` + string(rune('0'+argNum))
		args = append(args, *updates.Y)
		argNum++
	}
	if updates.Width != nil {
		query += `, width = $` + string(rune('0'+argNum))
		args = append(args, *updates.Width)
		argNum++
	}
	if updates.Height != nil {
		query += `, height = $` + string(rune('0'+argNum))
		args = append(args, *updates.Height)
		argNum++
	}
	if updates.Content != nil {
		query += `, content = $` + string(rune('0'+argNum))
		args = append(args, *updates.Content)
		argNum++
	}
	if updates.FontSize != nil {
		query += `, font_size = $` + string(rune('0'+argNum))
		args = append(args, *updates.FontSize)
		argNum++
	}
	if updates.Color != nil {
		query += `, color = $` + string(rune('0'+argNum))
		args = append(args, *updates.Color)
		argNum++
	}
	if updates.FontFamily != nil {
		query += `, font_family = $` + string(rune('0'+argNum))
		args = append(args, *updates.FontFamily)
		argNum++
	}

	query += ` WHERE id = $` + string(rune('0'+argNum))
	args = append(args, id)

	_, err := pool.Exec(ctx, query, args...)
	return err
}

// DeleteTextBlock removes a text block from the database
func DeleteTextBlock(ctx context.Context, pool *pgxpool.Pool, id string) error {
	_, err := pool.Exec(ctx, `DELETE FROM text_blocks WHERE id = $1`, id)
	return err
}
