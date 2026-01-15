import { useState, useEffect, useCallback } from 'react'
import { Canvas } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { NoteSidebar } from './components/NoteSidebar'
import { useNotes } from './hooks/useNotes'
import type { Tool, Stroke, TextBlock } from './types'
import { COLORS, DEFAULT_FONT } from './types'
import './App.css'

function App() {
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<string>(COLORS[0])
  const [font, setFont] = useState<string>(DEFAULT_FONT)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { notes, currentNote, loading, createNote, selectNote, deleteNote, renameNote, saveNote } =
    useNotes()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          setTool('pen')
          break
        case 'e':
          setTool('eraser')
          break
        case 't':
          setTool('text')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleStrokesChange = useCallback(
    (strokes: Stroke[]) => {
      if (currentNote) {
        saveNote(strokes, currentNote.textBlocks)
      }
    },
    [currentNote, saveNote]
  )

  const handleTextBlocksChange = useCallback(
    (textBlocks: TextBlock[]) => {
      if (currentNote) {
        saveNote(currentNote.strokes, textBlocks)
      }
    },
    [currentNote, saveNote]
  )

  const handleClear = useCallback(() => {
    if (currentNote && confirm('Clear all content from this note?')) {
      saveNote([], [])
    }
  }, [currentNote, saveNote])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <p>Loading Bethel...</p>
      </div>
    )
  }

  return (
    <div className="app">
      <NoteSidebar
        notes={notes}
        currentNoteId={currentNote?.id ?? null}
        onSelectNote={selectNote}
        onCreateNote={createNote}
        onDeleteNote={deleteNote}
        onRenameNote={renameNote}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="main-content">
        <Toolbar
          tool={tool}
          color={color}
          font={font}
          onToolChange={setTool}
          onColorChange={setColor}
          onFontChange={setFont}
          onClear={handleClear}
        />

        <Canvas
          tool={tool}
          color={color}
          font={font}
          strokes={currentNote?.strokes ?? []}
          textBlocks={currentNote?.textBlocks ?? []}
          onStrokesChange={handleStrokesChange}
          onTextBlocksChange={handleTextBlocksChange}
        />
      </div>
    </div>
  )
}

export default App
