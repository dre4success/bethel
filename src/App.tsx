import { useState, useEffect, useCallback, useRef } from 'react'
import { Canvas, CanvasHandle } from './components/Canvas'
import { Toolbar } from './components/Toolbar'
import { NoteSidebar } from './components/NoteSidebar'
import { useNotes } from './hooks/useNotes'
import { useHistory } from './hooks/useHistory'
import { exportToPNG, exportToPDF, exportToSVG } from './lib/export'
import type { Tool } from './types'
import { COLORS } from './types'
import './App.css'

type Theme = 'light' | 'dark'

function App() {
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState<string>(COLORS[0])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('bethel-theme')
    return (saved as Theme) || 'light'
  })
  const canvasRef = useRef<CanvasHandle>(null)

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('bethel-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const { notes, currentNote, loading, createNote, selectNote, deleteNote, renameNote, saveNote } =
    useNotes()

  const { strokes, textBlocks, setStrokes, setTextBlocks, undo, redo, canUndo, canRedo, reset } =
    useHistory(currentNote?.strokes ?? [], currentNote?.textBlocks ?? [])

  // Reset history when switching notes
  useEffect(() => {
    if (currentNote) {
      reset(currentNote.strokes, currentNote.textBlocks)
    }
  }, [currentNote?.id])

  // Save to DB when strokes/textBlocks change
  useEffect(() => {
    if (currentNote) {
      saveNote(strokes, textBlocks)
    }
  }, [strokes, textBlocks])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo/Redo work even in text fields
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      // Other shortcuts don't work in text fields
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
  }, [undo, redo])

  const handleClear = useCallback(() => {
    if (currentNote && confirm('Clear all content from this note?')) {
      setStrokes([])
      setTextBlocks([])
    }
  }, [currentNote, setStrokes, setTextBlocks])

  const handleExportPNG = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas()
    if (canvas) {
      const filename = `${currentNote?.title || 'note'}.png`
      exportToPNG(canvas, strokes, textBlocks, filename)
    }
  }, [strokes, textBlocks, currentNote?.title])

  const handleExportPDF = useCallback(async () => {
    const canvas = canvasRef.current?.getCanvas()
    if (canvas) {
      const filename = `${currentNote?.title || 'note'}.pdf`
      await exportToPDF(canvas, strokes, textBlocks, filename)
    }
  }, [strokes, textBlocks, currentNote?.title])

  const handleExportSVG = useCallback(() => {
    const filename = `${currentNote?.title || 'note'}.svg`
    exportToSVG(strokes, textBlocks, filename)
  }, [strokes, textBlocks, currentNote?.title])

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
          onToolChange={setTool}
          onColorChange={setColor}
          onClear={handleClear}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportPDF={handleExportPDF}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <Canvas
          ref={canvasRef}
          tool={tool}
          color={color}
          strokes={strokes}
          textBlocks={textBlocks}
          onStrokesChange={setStrokes}
          onTextBlocksChange={setTextBlocks}
          theme={theme}
        />
      </div>
    </div>
  )
}

export default App
