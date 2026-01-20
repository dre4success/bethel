package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect establishes a connection pool to PostgreSQL
func Connect(databaseURL string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("unable to parse database URL: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("unable to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}

	return pool, nil
}

// RunMigrations creates the database tables if they don't exist
func RunMigrations(pool *pgxpool.Pool) error {
	ctx := context.Background()

	migrations := []string{
		// Rooms table
		`CREATE TABLE IF NOT EXISTS rooms (
			id VARCHAR(12) PRIMARY KEY,
			title VARCHAR(255) DEFAULT 'Untitled',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,

		// Strokes table
		`CREATE TABLE IF NOT EXISTS strokes (
			id UUID PRIMARY KEY,
			room_id VARCHAR(12) REFERENCES rooms(id) ON DELETE CASCADE,
			points JSONB NOT NULL,
			color VARCHAR(7) NOT NULL,
			tool VARCHAR(10) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			created_by VARCHAR(36)
		)`,

		// Text blocks table
		`CREATE TABLE IF NOT EXISTS text_blocks (
			id UUID PRIMARY KEY,
			room_id VARCHAR(12) REFERENCES rooms(id) ON DELETE CASCADE,
			x FLOAT NOT NULL,
			y FLOAT NOT NULL,
			width FLOAT NOT NULL,
			height FLOAT NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			font_size FLOAT NOT NULL DEFAULT 24,
			color VARCHAR(7) NOT NULL DEFAULT '#000000',
			font_family VARCHAR(100) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)`,

		// Indexes
		`CREATE INDEX IF NOT EXISTS idx_strokes_room ON strokes(room_id)`,
		`CREATE INDEX IF NOT EXISTS idx_text_blocks_room ON text_blocks(room_id)`,
	}

	for _, migration := range migrations {
		if _, err := pool.Exec(ctx, migration); err != nil {
			return fmt.Errorf("migration failed: %w", err)
		}
	}

	return nil
}
