-- Bethel Database Schema
-- Managed by Atlas (https://atlasgo.io)

-- Rooms table
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL DEFAULT 'Untitled',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Strokes table
CREATE TABLE strokes (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    points JSONB NOT NULL,
    color VARCHAR(7) NOT NULL,
    tool VARCHAR(10) NOT NULL CHECK (tool IN ('pen', 'eraser')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_by VARCHAR(36)
);

-- Text blocks table
CREATE TABLE text_blocks (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    width DOUBLE PRECISION NOT NULL,
    height DOUBLE PRECISION NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    font_size DOUBLE PRECISION NOT NULL DEFAULT 24,
    color VARCHAR(7) NOT NULL DEFAULT '#000000',
    font_family VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_strokes_room ON strokes(room_id);
CREATE INDEX idx_strokes_created ON strokes(created_at);
CREATE INDEX idx_text_blocks_room ON text_blocks(room_id);
CREATE INDEX idx_text_blocks_updated ON text_blocks(updated_at);
