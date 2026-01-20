# Bethel

A collaborative note-taking app with stylus support, real-time sync, and handwritten text.

## Features

- Pen and eraser tools with pressure sensitivity
- Text blocks with 11 handwritten font options
- Real-time collaboration via WebSocket
- Shareable room links
- Export to PNG, SVG, PDF
- Dark mode support
- Local notes with IndexedDB persistence

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://golang.org/) (v1.21+)
- [Docker](https://www.docker.com/) (for PostgreSQL)
- [Atlas](https://atlasgo.io/) (for database migrations)

### Install Atlas (macOS)

```bash
brew install ariga/tap/atlas
```

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

### 2. Apply Database Migrations

```bash
cd server
atlas schema apply --env docker --auto-approve
```

### 3. Start the Backend

```bash
cd server
go run main.go
```

The server runs on `http://localhost:8080`.

### 4. Start the Frontend

In a new terminal:

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## Usage

### Local Mode

- Open `http://localhost:5173`
- Create and manage notes in the sidebar
- Draw with pen, erase, or add text blocks
- Notes are saved locally in IndexedDB

### Collaborative Mode

1. Click **"Create Collaborative Room"** in the header
2. Share the URL with others
3. Draw and edit together in real-time
4. See other participants' cursors

## Project Structure

```
bethel/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities (WebSocket, export)
│   ├── pages/              # Route pages
│   └── types/              # TypeScript types
├── server/                 # Go backend
│   ├── db/                 # Database connection
│   ├── handlers/           # HTTP/WebSocket handlers
│   ├── hub/                # WebSocket hub & rooms
│   ├── models/             # Data models
│   ├── schema.sql          # Database schema
│   └── atlas.hcl           # Atlas config
└── docker-compose.yml      # PostgreSQL container
```

## Environment Variables

### Backend (server/)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/bethel?sslmode=disable` | PostgreSQL connection string |
| `PORT` | `8080` | Server port |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Backend API URL |

## Development

### Build Frontend

```bash
npm run build
```

### Build Backend

```bash
cd server
go build -o bethel-server .
```

## License

MIT
