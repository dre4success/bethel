import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Stroke, Point, Tool, TextBlock } from '../../types'
import { DEFAULT_FONT } from '../../types'
import { drawStroke, redrawCanvas } from '../../lib/stroke'
import './Canvas.css'

// Canvas dimensions (larger than viewport for scrolling)
const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 3000

interface TextBlockComponentProps {
  block: TextBlock
  isEditing: boolean
  onStartEdit: () => void
  onEndEdit: (content: string) => void
  onDelete: () => void
}

const TextBlockComponent = memo(function TextBlockComponent({
  block,
  isEditing,
  onStartEdit,
  onEndEdit,
  onDelete,
}: TextBlockComponentProps) {
  const [localContent, setLocalContent] = useState(block.content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setLocalContent(block.content)
  }, [block.content])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [localContent, adjustHeight])

  // Adjust on start edit too
  useEffect(() => {
    if (isEditing) {
      adjustHeight()
    }
  }, [isEditing, adjustHeight])

  const handleBlur = () => {
    if (!localContent.trim()) {
      onDelete()
    } else {
      onEndEdit(localContent)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault()
    } else {
      e.dataTransfer.setData('textBlockId', block.id)
      e.dataTransfer.effectAllowed = 'move'
    }
  }

  return (
    <div
      className={`text-block ${isEditing ? 'editing' : ''}`}
      style={{
        left: block.x,
        top: block.y,
        minWidth: block.width,
        minHeight: block.height,
      }}
      draggable={!isEditing}
      onDragStart={handleDragStart}
    >
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onFocus={onStartEdit}
        onBlur={handleBlur}
        placeholder="Type here..."
        rows={1}
        style={{
          color: block.color,
          fontSize: block.fontSize,
          fontFamily: block.fontFamily,
          fontWeight: 600,
          overflow: 'hidden',
          resize: 'none',
        }}
      />
    </div>
  )
})

interface CanvasProps {
  tool: Tool
  color: string
  strokes: Stroke[]
  textBlocks: TextBlock[]
  onStrokesChange: (strokes: Stroke[]) => void
  onTextBlocksChange: (textBlocks: TextBlock[]) => void
}

export function Canvas({
  tool,
  color,
  strokes,
  textBlocks,
  onStrokesChange,
  onTextBlocksChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)

  // Initialize canvas with fixed size
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1

    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${CANVAS_HEIGHT}px`
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      redrawCanvas(ctx, strokes, CANVAS_WIDTH, CANVAS_HEIGHT)
    }
  }, []) // Only run once on mount

  // Redraw when strokes change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redrawCanvas(ctx, strokes, CANVAS_WIDTH, CANVAS_HEIGHT)
  }, [strokes])

  // Handle native pointer events to prevent scrolling for pen
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleNativePointerDown = (e: PointerEvent) => {
      // If it's a pen, prevent default to stop browser scrolling
      if (e.pointerType === 'pen') {
        e.preventDefault()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Aggressively prevent scrolling if it's a stylus
      const touch = e.touches[0] as any
      if (e.touches.length === 1 && touch.touchType === 'stylus') {
        e.preventDefault()
      }
    }

    // passive: false is critical for preventDefault to work on iOS
    canvas.addEventListener('pointerdown', handleNativePointerDown, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', handleNativePointerDown)
      canvas.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  // Check if this pointer type should draw (pen or mouse, not touch)
  const shouldDraw = useCallback((e: React.PointerEvent): boolean => {
    // Touch = scroll/pan, Pen/Mouse = draw
    return e.pointerType === 'pen' || e.pointerType === 'mouse'
  }, [])

  const getPointerPosition = useCallback((e: React.PointerEvent): Point => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    }
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't draw if clicking on a text block
      if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
        return
      }

      // Touch should scroll (pan), so we just return and let browser handle it
      if (!shouldDraw(e)) {
        return
      }

      if (tool === 'text') {
        const pos = getPointerPosition(e)
        const newTextBlock: TextBlock = {
          id: uuidv4(),
          x: pos.x,
          y: pos.y,
          width: 200,
          height: 40,
          content: '',
          fontSize: 24,
          color: color,
          fontFamily: DEFAULT_FONT,
        }
        onTextBlocksChange([...textBlocks, newTextBlock])
        setEditingTextId(newTextBlock.id)
        return
      }

      // We prevent default here too for good measure (though the native listener does the heavy lifting)
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.setPointerCapture(e.pointerId)
      const point = getPointerPosition(e)

      const newStroke: Stroke = {
        id: uuidv4(),
        points: [point],
        color: tool === 'eraser' ? '#000000' : color,
        tool: tool === 'eraser' ? 'eraser' : 'pen',
      }

      currentStrokeRef.current = newStroke
      setIsDrawing(true)
    },
    [tool, color, textBlocks, getPointerPosition, onTextBlocksChange, shouldDraw]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing || !currentStrokeRef.current) return
      if (!shouldDraw(e)) return

      const point = getPointerPosition(e)
      currentStrokeRef.current.points.push(point)

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      drawStroke(ctx, currentStrokeRef.current)
    },
    [isDrawing, getPointerPosition, shouldDraw]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId)
      }

      if (!isDrawing || !currentStrokeRef.current) return

      // Save stroke (both pen and eraser strokes)
      if (currentStrokeRef.current.points.length > 1) {
        onStrokesChange([...strokes, currentStrokeRef.current])
      }

      currentStrokeRef.current = null
      setIsDrawing(false)
    },
    [isDrawing, strokes, onStrokesChange]
  )

  const handleTextEndEdit = useCallback(
    (id: string, content: string) => {
      onTextBlocksChange(textBlocks.map((tb) => (tb.id === id ? { ...tb, content } : tb)))
      setEditingTextId(null)
    },
    [textBlocks, onTextBlocksChange]
  )

  const handleTextDelete = useCallback(
    (id: string) => {
      onTextBlocksChange(textBlocks.filter((tb) => tb.id !== id))
      setEditingTextId(null)
    },
    [textBlocks, onTextBlocksChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const id = e.dataTransfer.getData('textBlockId')
      if (!id) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      onTextBlocksChange(textBlocks.map((tb) => (tb.id === id ? { ...tb, x, y } : tb)))
    },
    [textBlocks, onTextBlocksChange]
  )

  return (
    <div ref={scrollContainerRef} className="scroll-container">
      <div
        ref={containerRef}
        className="canvas-container"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
      >
        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {textBlocks.map((block) => (
          <TextBlockComponent
            key={block.id}
            block={block}
            isEditing={editingTextId === block.id}
            onStartEdit={() => setEditingTextId(block.id)}
            onEndEdit={(content) => handleTextEndEdit(block.id, content)}
            onDelete={() => handleTextDelete(block.id)}
          />
        ))}
      </div>
    </div>
  )
}
