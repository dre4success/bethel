# Bethel

A collaborative whiteboard app with stylus support, real-time sync, and handwritten fonts.

[**Live Demo**](https://bethel.dre4success.com)

## Features

- Pen and eraser tools with pressure sensitivity
- Text blocks with 11 handwritten font options
- Real-time collaboration via WebSocket
- Shareable room links
- Export to PNG, SVG, PDF
- Dark mode support
- Offline support with auto-sync when reconnected

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Go, Gorilla WebSocket
- **Database:** PostgreSQL
- **Storage:** IndexedDB (offline), PostgreSQL (sync)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Go](https://golang.org/) (v1.24+)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick Start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on port 5433 (mapped to 5432 internally).

### 2. Start the Backend

```bash
cd server
go run main.go
```

The server runs on `http://localhost:8080`. Database migrations run automatically on startup.

### 3. Start the Frontend

In a new terminal:

```bash
cd client
npm install
npm run dev
```

The app runs on `http://localhost:5173`. Vite proxies API and WebSocket requests to the backend.

## Usage

1. Open `http://localhost:5173`
2. Click **"+ New Canvas"** to create a room
3. Share the URL with others to collaborate
4. Draw with pen, erase, or add text blocks
5. See other participants' cursors in real-time

### Offline Support

- Works offline using IndexedDB
- Changes sync automatically when connection is restored

### Database Admin (Optional)

Adminer is included for database inspection:

- URL: `http://localhost:3334`
- System: PostgreSQL
- Server: `postgres`
- Username: `postgres`
- Password: `postgres`
- Database: `bethel`

## Environment Variables

### Backend (server/)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5433/bethel?sslmode=disable` | PostgreSQL connection |
| `PORT` | `8080` | Server port |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS allowed origins (comma-separated) |

### Frontend (client/)

No environment variables needed for development. Vite proxy handles API routing.

For production builds, the frontend is served from the Go binary (same-origin).

## Project Structure

```
bethel/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # React hooks (useCollaboration, etc.)
│   │   ├── lib/            # WebSocket client, IndexedDB
│   │   ├── pages/          # Home, Room pages
│   │   └── services/       # Sync service
│   └── vite.config.ts
├── server/                 # Go backend
│   ├── db/                 # Database connection, migrations
│   ├── handlers/           # HTTP & WebSocket handlers
│   ├── hub/                # WebSocket hub, room management
│   ├── models/             # Data models
│   └── main.go
├── docker-compose.yml      # Local development (PostgreSQL + Adminer)
├── docker-compose.prod.yml # Production deployment
└── Dockerfile              # Production build
```

## Build

### Frontend

```bash
cd client
npm run build
```

### Backend

```bash
cd server
go build -o bethel-server .
```

### Docker (Production)

```bash
docker build -t bethel .
```

This builds a single container with frontend + backend.

## Deployment

The app is deployed on a VPS with:
- **Traefik** as reverse proxy (auto SSL)
- **GitHub Actions** for CI/CD
- **PostgreSQL** for persistence

See `docker-compose.prod.yml` for production configuration.

## License

MIT
