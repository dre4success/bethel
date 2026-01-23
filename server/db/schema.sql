-- Bethel Database Schema
-- Managed by Atlas (https://atlasgo.io)

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) DEFAULT 'Untitled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Strokes table
CREATE TABLE IF NOT EXISTS strokes (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
    points JSONB NOT NULL,
    color VARCHAR(7) NOT NULL,
    tool VARCHAR(10) NOT NULL CHECK (tool IN ('pen', 'eraser')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36)
);

-- Text blocks table
CREATE TABLE IF NOT EXISTS text_blocks (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) REFERENCES rooms(id) ON DELETE CASCADE,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    font_size DOUBLE PRECISION NOT NULL DEFAULT 24,
    color VARCHAR(7) NOT NULL DEFAULT '#000000',
    font_family VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_strokes_room ON strokes(room_id);
CREATE INDEX IF NOT EXISTS idx_strokes_created ON strokes(created_at);
CREATE INDEX IF NOT EXISTS idx_text_blocks_room ON text_blocks(room_id);
CREATE INDEX IF NOT EXISTS idx_text_blocks_updated ON text_blocks(updated_at);

-- Migrations (Idempotent)
DO $$ 
BEGIN 
    -- Migrate Room IDs and Foreign Keys if they are short strings (from VARCHAR(12))
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'id' AND character_maximum_length < 36) THEN
        ALTER TABLE text_blocks DROP CONSTRAINT IF EXISTS text_blocks_room_id_fkey;
        ALTER TABLE strokes DROP CONSTRAINT IF EXISTS strokes_room_id_fkey;
        
        ALTER TABLE rooms ALTER COLUMN id TYPE VARCHAR(36);
        ALTER TABLE strokes ALTER COLUMN room_id TYPE VARCHAR(36);
        ALTER TABLE text_blocks ALTER COLUMN room_id TYPE VARCHAR(36);
        
        ALTER TABLE strokes ADD CONSTRAINT strokes_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
        ALTER TABLE text_blocks ADD CONSTRAINT text_blocks_room_id_fkey FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;

    -- Migrate IDs from UUID type to VARCHAR(36) if needed (for consistency)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'strokes' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE strokes ALTER COLUMN id TYPE VARCHAR(36);
        ALTER TABLE text_blocks ALTER COLUMN id TYPE VARCHAR(36);
    END IF;
END $$;
