import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Canvas, CanvasHandle } from '../components/Canvas'
import { Toolbar } from '../components/Toolbar'
import { useCollaboration } from '../hooks/useCollaboration'
import { ParticipantList } from '../components/Presence/ParticipantList'
import { RemoteCursors } from '../components/Presence/Cursor'
import { exportToPNG, exportToPDF, exportToSVG } from '../lib/export'
import { API_BASE } from '../config'
import { RecentRoomsService } from '../services/recentRooms'
import type { Tool } from '../types'
import { PRESET_COLORS, DEFAULT_FONT } from '../types'
import '../App.css'

type Theme = 'light' | 'dark'

const ConnectionIndicator = ({ isConnected }: { isConnected: boolean }) => (
  <div style={{
    fontSize: '12px',
    color: isConnected ? '#4caf50' : '#ff9800',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: isConnected ? '#4caf50' : '#ff9800',
      boxShadow: isConnected ? '0 0 4px #4caf50' : 'none'
    }} />
    {isConnected ? 'Connected' : 'Connecting...'}
  </div>
)

function EditableTitle({ title, onUpdate }: { title: string; onUpdate: (t: string) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [localTitle, setLocalTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocalTitle(title)
  }, [title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleBlur = () => {
    setIsEditing(false)
    if (localTitle.trim() && localTitle !== title) {
      onUpdate(localTitle)
    } else {
      setLocalTitle(title)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="room-title-input"
        value={localTitle}
        onChange={(e) => setLocalTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <h2 className="room-title editable" onClick={() => setIsEditing(true)} title="Click to rename">
      {title}
    </h2>
  )
}

export function Room() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const urlRoomId = params.roomId as string | undefined

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<string>(PRESET_COLORS[0])
  const [font, setFont] = useState<string>(DEFAULT_FONT)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bethel-theme')
    return (saved as Theme) || 'light'
  })
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const canvasRef = useRef<CanvasHandle>(null)
  const creatingRef = useRef(false) // Prevent double creation in StrictMode

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('bethel-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  // Create new room if navigated to /room/new
  useEffect(() => {
    if (urlRoomId === 'new' || !urlRoomId) {
      // Prevent double creation in StrictMode
      if (creatingRef.current) {
        return
      }
      creatingRef.current = true
      setCreating(true)

      fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            navigate({ to: '/room/$roomId', params: { roomId: data.id }, replace: true })
          } else {
            setError('Failed to create room')
            creatingRef.current = false
          }
        })
        .catch((err) => {
          setError(`Failed to create room: ${err.message}`)
          creatingRef.current = false
        })
        .finally(() => setCreating(false))
    }
  }, [urlRoomId])

  // Use collaboration hook
  const {
    strokes,
    textBlocks,
    participants,
    cursors,
    isConnected,
    roomTitle,
    addStroke,
    updateTextBlock,
    deleteTextBlock,
    addTextBlock,
    moveCursor,
    updateRoomTitle,
    clearAll,
    setStrokesLocal,
    setTextBlocksLocal,
  } = useCollaboration({
    roomId: (urlRoomId === 'new' || !urlRoomId) ? null : urlRoomId,
    onError: useCallback((err: string) => setError(err), []),
  })

  // Track recent rooms
  useEffect(() => {
    if (isConnected && urlRoomId && roomTitle) {
      RecentRoomsService.addOrUpdateRoom(urlRoomId, roomTitle)
    }
  }, [isConnected, urlRoomId, roomTitle])

  // Handle cursor movement on canvas
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isConnected) {
        const rect = e.currentTarget.getBoundingClientRect()
        moveCursor(e.clientX - rect.left, e.clientY - rect.top)
      }
    },
    [isConnected, moveCursor]
  )

  const handleClear = useCallback(() => {
    if (confirm('Clear all content from this room?')) {
      clearAll()
    }
  }, [clearAll])

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas()
    if (canvas) {
      const filename = `${roomTitle || 'room'}.png`
      exportToPNG(canvas, strokes, textBlocks, filename)
    }
  }, [strokes, textBlocks, roomTitle])

  const handleExportPDF = useCallback(async () => {
    const canvas = canvasRef.current?.getCanvas()
    if (canvas) {
      const filename = `${roomTitle || 'room'}.pdf`
      await exportToPDF(canvas, strokes, textBlocks, filename)
    }
  }, [strokes, textBlocks, roomTitle])

  const handleExportSVG = useCallback(() => {
    const filename = `${roomTitle || 'room'}.svg`
    exportToSVG(strokes, textBlocks, filename)
  }, [strokes, textBlocks, roomTitle])

  // Copy shareable link
  const copyShareLink = useCallback(() => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      alert('Link copied to clipboard!')
    })
  }, [])

  // Show loading while creating room
  if (creating || !urlRoomId || urlRoomId === 'new') {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Creating collaborative room...</p>
      </div>
    )
  }

  // Show error
  if (error) {
    return (
      <div className="loading">
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => window.location.href = '/'}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="main-content">
        <div className="room-header">
          <div className="room-info">
            <EditableTitle title={roomTitle} onUpdate={updateRoomTitle} />
            <button className="share-button" onClick={copyShareLink}>
              Share Link
            </button>
          </div>
          <div className="room-status">
            <ParticipantList participants={participants} />
            <ConnectionIndicator isConnected={isConnected} />
          </div>
        </div>

        <Toolbar
          tool={tool}
          color={color}
          font={font}
          onToolChange={setTool}
          onColorChange={setColor}
          onFontChange={setFont}
          onClear={handleClear}
          onUndo={() => { }} // Undo/redo not supported in collaborative mode yet
          onRedo={() => { }}
          canUndo={false}
          canRedo={false}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportPDF={handleExportPDF}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <div className="canvas-wrapper" onMouseMove={handleMouseMove}>
          <Canvas
            ref={canvasRef}
            tool={tool}
            color={color}
            font={font}
            strokes={strokes}
            textBlocks={textBlocks}
            onStrokeAdded={addStroke}
            onStrokesChange={(newStrokes) => {
              // Just update local state for now
              setStrokesLocal(newStrokes)
            }}
            onTextBlockAdded={addTextBlock}
            onTextBlockUpdated={updateTextBlock}
            onTextBlockDeleted={deleteTextBlock}
            onTextBlocksChange={setTextBlocksLocal}
            theme={theme}
          />
          <RemoteCursors cursors={cursors} />
        </div>
      </div>
    </div>
  )
}
