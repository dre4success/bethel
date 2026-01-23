import { useState, useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { generateRoomId } from '../utils/id'
import { RecentRoomsService, RecentRoom } from '../services/recentRooms'
import { API_BASE } from '../config'
import './Home.css'

export function Home() {
  const [rooms, setRooms] = useState<RecentRoom[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setRooms(RecentRoomsService.getRecentRooms())
  }, [])

  const handleCreateNew = () => {
    setIsCreating(true)
    fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.id) {
          navigate({ to: '/room/$roomId', params: { roomId: data.id } })
        }
      })
      .catch((err) => {
        console.error(`Failed to create room on server: ${err.message}. Falling back to local room.`)
        // Fallback to local room creation
        const localId = generateRoomId()
        navigate({ to: '/room/$roomId', params: { roomId: localId } })
      })
      .finally(() => setIsCreating(false))
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm('Remove from recent list?')) {
      RecentRoomsService.removeRoom(id)
      setRooms(RecentRoomsService.getRecentRooms())
    }
  }

  const formatDate = (ts: number) => {
    const now = new Date()
    const date = new Date(ts)
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  return (
    <div className="home">
      <header className="home-header">
        <div className="home-brand">
          <h1>Bethel</h1>
          <span className="home-tagline">Collaborative whiteboard</span>
        </div>
        <button
          className="home-new-btn"
          onClick={handleCreateNew}
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : '+ New Canvas'}
        </button>
      </header>

      <main className="home-content">
        {rooms.length === 0 ? (
          <div className="home-empty">
            <div className="home-empty-icon">✏️</div>
            <h2>No recent canvases</h2>
            <p>Create a new canvas to start drawing and collaborating</p>
            <button
              className="home-new-btn home-new-btn-large"
              onClick={handleCreateNew}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Your First Canvas'}
            </button>
          </div>
        ) : (
          <>
            <h2 className="home-section-title">Recent</h2>
            <div className="home-grid">
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  to="/room/$roomId"
                  params={{ roomId: room.id }}
                  className="home-card"
                >
                  <div className="home-card-content">
                    <h3 className="home-card-title">{room.title || 'Untitled'}</h3>
                    <span className="home-card-date">{formatDate(room.accessedAt)}</span>
                  </div>
                  <button
                    className="home-card-delete"
                    onClick={(e) => handleDelete(e, room.id)}
                    title="Remove from recent"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
