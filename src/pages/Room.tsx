import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { Canvas, CanvasHandle } from '../components/Canvas'
import { Toolbar } from '../components/Toolbar'
import { useCollaboration } from '../hooks/useCollaboration'
import { ParticipantList, ConnectionStatus } from '../components/Presence/ParticipantList'
import { RemoteCursors } from '../components/Presence/Cursor'
import { exportToPNG, exportToPDF, exportToSVG } from '../lib/export'
import type { Tool } from '../types'
import { COLORS, DEFAULT_FONT } from '../types'
import '../App.css'

type Theme = 'light' | 'dark'

// API base URL for room creation
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export function Room() {
  const params = useParams({ strict: false })
  const navigate = useNavigate()
  const roomId = params.roomId as string | undefined

  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<string>(COLORS[0])
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
    if (roomId === 'new' || !roomId) {
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
            navigate({ to: '/room/$roomId', params: { roomId: data.id } })
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
  }, [roomId, navigate])

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
    clearAll,
    setStrokesLocal,
    setTextBlocksLocal,
  } = useCollaboration({
    roomId: roomId && roomId !== 'new' ? roomId : null,
    onError: useCallback((err: string) => setError(err), []),
  })

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
  if (creating || roomId === 'new' || !roomId) {
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
        <button onClick={() => navigate({ to: '/' })}>Go Back</button>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="main-content">
        <div className="room-header">
          <div className="room-info">
            <h2 className="room-title">{roomTitle}</h2>
            <button className="share-button" onClick={copyShareLink}>
              Share Link
            </button>
          </div>
          <div className="room-status">
            <ParticipantList participants={participants} />
            <ConnectionStatus isConnected={isConnected} />
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
          onUndo={() => {}} // Undo/redo not supported in collaborative mode yet
          onRedo={() => {}}
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
            onStrokesChange={(newStrokes) => {
              // Detect new strokes by comparing with current state
              if (newStrokes.length > strokes.length) {
                const newStroke = newStrokes[newStrokes.length - 1]
                addStroke(newStroke)
              } else {
                // Handle other changes (shouldn't happen often)
                setStrokesLocal(newStrokes)
              }
            }}
            onTextBlocksChange={(newTextBlocks) => {
              // Detect adds, updates, deletes
              const existingIds = new Set(textBlocks.map((tb) => tb.id))
              const newIds = new Set(newTextBlocks.map((tb) => tb.id))

              // Check for new blocks
              const addedBlock = newTextBlocks.find((tb) => !existingIds.has(tb.id))
              if (addedBlock) {
                addTextBlock(addedBlock)
                return
              }

              // Check for deleted blocks
              const deletedBlock = textBlocks.find((tb) => !newIds.has(tb.id))
              if (deletedBlock) {
                deleteTextBlock(deletedBlock.id)
                return
              }

              // Check for updates
              for (const newBlock of newTextBlocks) {
                const oldBlock = textBlocks.find((tb) => tb.id === newBlock.id)
                if (oldBlock) {
                  // Check if anything changed
                  const changes: Partial<typeof newBlock> = {}
                  if (oldBlock.x !== newBlock.x) changes.x = newBlock.x
                  if (oldBlock.y !== newBlock.y) changes.y = newBlock.y
                  if (oldBlock.width !== newBlock.width) changes.width = newBlock.width
                  if (oldBlock.height !== newBlock.height) changes.height = newBlock.height
                  if (oldBlock.content !== newBlock.content) changes.content = newBlock.content
                  if (oldBlock.fontSize !== newBlock.fontSize) changes.fontSize = newBlock.fontSize
                  if (oldBlock.color !== newBlock.color) changes.color = newBlock.color
                  if (oldBlock.fontFamily !== newBlock.fontFamily)
                    changes.fontFamily = newBlock.fontFamily

                  if (Object.keys(changes).length > 0) {
                    updateTextBlock(newBlock.id, changes)
                    return
                  }
                }
              }

              // Default: just update local
              setTextBlocksLocal(newTextBlocks)
            }}
            theme={theme}
          />
          <RemoteCursors cursors={cursors} />
        </div>
      </div>
    </div>
  )
}
