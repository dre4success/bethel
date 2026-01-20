import { useState } from 'react'
import type { Note } from '../../types'
import './NoteSidebar.css'

interface NoteSidebarProps {
  notes: Note[]
  currentNoteId: string | null
  onSelectNote: (noteId: string) => void
  onCreateNote: () => void
  onDeleteNote: (noteId: string) => void
  onRenameNote: (noteId: string, newTitle: string) => void
  isOpen: boolean
  onToggle: () => void
}

export function NoteSidebar({
  notes,
  currentNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onRenameNote,
  isOpen,
  onToggle,
}: NoteSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
  }

  const handleSaveEdit = (noteId: string) => {
    if (editTitle.trim()) {
      onRenameNote(noteId, editTitle.trim())
    }
    setEditingId(null)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <button className="sidebar-toggle" onClick={onToggle} title="Toggle Sidebar">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className={`note-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Notes</h2>
          <button className="new-note-button" onClick={onCreateNote} title="New Note">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <div className="notes-list">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`note-item ${currentNoteId === note.id ? 'active' : ''}`}
              onClick={() => onSelectNote(note.id)}
            >
              {editingId === note.id ? (
                <input
                  type="text"
                  className="note-title-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleSaveEdit(note.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(note.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="note-info">
                    <span className="note-title">{note.title}</span>
                    <span className="note-date">{formatDate(note.updatedAt)}</span>
                  </div>
                  <div className="note-actions">
                    <button
                      className="note-action-button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartEdit(note)
                      }}
                      title="Rename"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="note-action-button danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm('Delete this note?')) {
                          onDeleteNote(note.id)
                        }
                      }}
                      title="Delete"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  )
}
