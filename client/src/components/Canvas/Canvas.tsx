import {
  useRef,
  useEffect,
  useCallback,
  useState,
  memo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Stroke, Point, Tool, TextBlock } from '../../types'
import { drawStroke, redrawCanvas, getRenderColor } from '../../lib/stroke'
import './Canvas.css'

// Canvas dimensions - smaller on mobile for performance
const isMobileDevice = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
const CANVAS_WIDTH = isMobileDevice ? 1200 : 3000
const CANVAS_HEIGHT = isMobileDevice ? 1600 : 3000

import { ResizeHandles } from './ResizeHandles'

interface TextBlockComponentProps {
  block: TextBlock
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  onStartEdit: () => void
  onEndEdit: (content: string, width?: number, fontSize?: number) => void
  onUpdate: (updates: Partial<TextBlock>) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
  theme?: 'light' | 'dark'
}

const TextBlockComponent = memo(function TextBlockComponent({
  block,
  isEditing,
  isSelected,
  onSelect,
  onStartEdit,
  onUpdate,
  onDelete,
  theme = 'light',
}: TextBlockComponentProps) {
  const [localContent, setLocalContent] = useState(block.content)
  const [localFontSize, setLocalFontSize] = useState(block.fontSize)
  const [localPosition, setLocalPosition] = useState({ x: block.x, y: block.y })
  const [isResizing, setIsResizing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const blockRef = useRef<HTMLDivElement>(null)

  // Update local content when prop changes, BUT NOT if editing
  useEffect(() => {
    if (!isEditing) {
      setLocalContent(block.content)
    }
  }, [block.content, isEditing])

  // Update local font size when prop changes (safe, usually)
  useEffect(() => {
    if (!isEditing) {
      setLocalFontSize(block.fontSize)
    }
  }, [block.fontSize, isEditing])

  // Update local position when prop changes (after drag commit)
  useEffect(() => {
    setLocalPosition({ x: block.x, y: block.y })
  }, [block.x, block.y])

  // Focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  // Auto-resize logic (updates height)
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [localContent, adjustHeight, localFontSize, block.width])

  // Debounce ref for real-time updates
  const debounceTimeoutRef = useRef<number | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setLocalContent(newContent)

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      window.clearTimeout(debounceTimeoutRef.current)
    }

    // Debounce update to server (100ms for responsiveness)
    debounceTimeoutRef.current = window.setTimeout(() => {
      onUpdate({ content: newContent })
    }, 100)
  }

  const handleBlur = () => {
    if (isEditing) {
      if (debounceTimeoutRef.current) {
        window.clearTimeout(debounceTimeoutRef.current)
      }

      if (!localContent.trim()) {
        onDelete()
      } else {
        // Ensure final state is saved
        onUpdate({ content: localContent })
      }
    }
  }

  // Pointer-based dragging - use local state during drag, commit on release
  const handleDragStart = (e: React.PointerEvent) => {
    if (isEditing || isResizing) return
    e.stopPropagation()
    e.preventDefault()

    onSelect()

    const startX = e.clientX
    const startY = e.clientY
    const startBlockX = block.x
    const startBlockY = block.y

    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      // Update local position for smooth dragging
      setLocalPosition({ x: startBlockX + dx, y: startBlockY + dy })
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      const dx = upEvent.clientX - startX
      const dy = upEvent.clientY - startY
      const finalX = startBlockX + dx
      const finalY = startBlockY + dy
      // Keep local position at final spot, commit to parent
      setLocalPosition({ x: finalX, y: finalY })
      onUpdate({ x: finalX, y: finalY })
      target.releasePointerCapture(e.pointerId)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  // Handle Resize Logic - use local font size during resize, commit on release
  const handleResizeStart = (idx: number, e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsResizing(true)
    const startX = e.clientX
    const startY = e.clientY
    const startFontSize = block.fontSize

    const calcNewSize = (dx: number, dy: number) => {
      // idx: 0=nw, 1=ne, 2=se, 3=sw
      let scaleFactor = 1
      if (idx === 2) {
        // SE
        scaleFactor = (dx + dy) / 2
      } else if (idx === 1) {
        // NE
        scaleFactor = (dx - dy) / 2
      } else if (idx === 3) {
        // SW
        scaleFactor = (-dx + dy) / 2
      } else {
        // NW
        scaleFactor = (-dx - dy) / 2
      }
      return Math.max(12, startFontSize + scaleFactor * 0.5)
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      setLocalFontSize(calcNewSize(dx, dy))
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      const dx = upEvent.clientX - startX
      const dy = upEvent.clientY - startY
      // Commit final font size to parent
      onUpdate({ fontSize: calcNewSize(dx, dy) })
      setIsResizing(false)
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div
      ref={blockRef}
      className={`text-block ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
      style={{
        left: localPosition.x,
        top: localPosition.y,
        width: block.width,
        color: getRenderColor(block.color, theme),
      }}
      onPointerDown={handleDragStart}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onStartEdit()
      }}
    >
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={handleChange}
        onBlur={handleBlur}
        readOnly={!isEditing}
        rows={1}
        style={{
          color: getRenderColor(block.color, theme),
          fontSize: localFontSize,
          fontFamily: block.fontFamily,
          fontWeight: 600,
          overflow: 'hidden',
          resize: 'none',
          pointerEvents: isEditing ? 'auto' : 'none',
        }}
      />
      {isSelected && !isEditing && <ResizeHandles onResizeStart={handleResizeStart} />}
    </div>
  )
})

interface CanvasProps {
  roomId: string
  tool: Tool
  color: string
  font: string
  strokes: Stroke[]
  textBlocks: TextBlock[]
  onStrokesChange: (strokes: Stroke[]) => void
  onTextBlocksChange: (textBlocks: TextBlock[]) => void
  theme?: 'light' | 'dark'
  onStrokeAdded?: (stroke: Stroke) => void
  onTextBlockAdded?: (textBlock: TextBlock) => void
  onTextBlockUpdated?: (id: string, updates: Partial<TextBlock>) => void
  onTextBlockDeleted?: (id: string) => void
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null
}

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(
  {
    roomId,
    tool,
    color,
    font,
    strokes,
    textBlocks,
    onStrokesChange,
    onTextBlocksChange,
    theme,
    onStrokeAdded,
    onTextBlockAdded,
    onTextBlockUpdated,
    onTextBlockDeleted,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
  }))
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)

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
      redrawCanvas(ctx, strokes, CANVAS_WIDTH, CANVAS_HEIGHT, theme)
    }
  }, [])

  // Redraw when strokes or theme change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    redrawCanvas(ctx, strokes, CANVAS_WIDTH, CANVAS_HEIGHT, theme)
  }, [strokes, theme])

  // Handle native pointer events to prevent scrolling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.matchMedia('(max-width: 768px)').matches

    const handleNativePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'pen' || (e.pointerType === 'touch' && isMobile)) {
        e.preventDefault()
      }
    }

    const handleNativePointerMove = (e: PointerEvent) => {
      // Prevent default during drawing to avoid scroll interference
      if (e.pointerType === 'pen' || (e.pointerType === 'touch' && isMobile)) {
        e.preventDefault()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      // On mobile, prevent touch scroll to allow drawing
      if (isMobile || (e.touches[0] as any)?.touchType === 'stylus') {
        e.preventDefault()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isMobile || (e.touches[0] as any)?.touchType === 'stylus') {
        e.preventDefault()
      }
    }

    // passive: false is critical for preventDefault to work
    canvas.addEventListener('pointerdown', handleNativePointerDown, { passive: false })
    canvas.addEventListener('pointermove', handleNativePointerMove, { passive: false })
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false })
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', handleNativePointerDown)
      canvas.removeEventListener('pointermove', handleNativePointerMove)
      canvas.removeEventListener('touchstart', handleTouchStart)
      canvas.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Check if this pointer type should draw
  const shouldDraw = useCallback((e: React.PointerEvent): boolean => {
    // Pen and mouse always draw
    if (e.pointerType === 'pen' || e.pointerType === 'mouse') {
      return true
    }
    // Allow touch on mobile devices (phones)
    // On tablets with stylus (iPad, Samsung tablet), touch is for scrolling
    const isMobilePhone = window.matchMedia('(max-width: 768px)').matches
    return e.pointerType === 'touch' && isMobilePhone
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

  // Track start position for tap detection
  const tapStartRef = useRef<{ x: number; y: number; id: number } | null>(null)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {

      // Don't draw if clicking on a text block
      if (
        (e.target as HTMLElement).tagName === 'TEXTAREA' ||
        (e.target as HTMLElement).classList.contains('text-block')
      ) {
        return
      }

      // Clear selection if clicking empty canvas
      setSelectedTextId(null)
      setEditingTextId(null)

      if (tool === 'text') {
        // For text tool, we record start position to detect a "tap" vs "scroll/drag"
        tapStartRef.current = { x: e.clientX, y: e.clientY, id: e.pointerId }

        // If it's Pen/Mouse, we block default to prevent unwanted selection/etc.
        // If it's Touch, we let it pass so the browser can scroll if the user drags.
        if (shouldDraw(e)) {
          e.preventDefault()
        }
        return
      }

      // Touch should scroll (pan), so we just return and let browser handle it
      if (!shouldDraw(e)) {
        return
      }

      // We prevent default here for drawing
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return

      canvas.setPointerCapture(e.pointerId)
      const point = getPointerPosition(e)

      const newStroke: Stroke = {
        id: uuidv4(),
        roomId,
        points: [point],
        color: tool === 'eraser' ? '#000000' : color,
        tool: tool === 'eraser' ? 'eraser' : 'pen',
      }

      currentStrokeRef.current = newStroke
      setIsDrawing(true)
    },
    [roomId, tool, color, textBlocks, getPointerPosition, onTextBlocksChange, shouldDraw]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // If checking for tap (Text Tool)
      if (tapStartRef.current && tapStartRef.current.id === e.pointerId) {
        const dx = Math.abs(e.clientX - tapStartRef.current.x)
        const dy = Math.abs(e.clientY - tapStartRef.current.y)
        // If moved more than 5px, it's a drag/scroll, not a tap. Cancel tap.
        if (dx > 5 || dy > 5) {
          tapStartRef.current = null
        }
        return
      }

      if (!isDrawing || !currentStrokeRef.current) return
      if (!shouldDraw(e)) return

      const point = getPointerPosition(e)
      currentStrokeRef.current.points.push(point)

      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      drawStroke(ctx, currentStrokeRef.current, theme)
    },
    [isDrawing, getPointerPosition, shouldDraw, theme]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current
      if (canvas) {
        canvas.releasePointerCapture(e.pointerId)
      }

      // Verify Tap for Text Tool
      if (tool === 'text' && tapStartRef.current && tapStartRef.current.id === e.pointerId) {
        // ... (existing text logic)
        const point = getPointerPosition(e)
        const newTextBlock: TextBlock = {
          id: uuidv4(),
          roomId,
          x: point.x,
          y: point.y,
          width: 200,
          height: 40,
          content: '',
          fontSize: 24,
          color: color,
          fontFamily: font,
        }

        // Immediately notify parent of new block
        if (onTextBlockAdded) {
          onTextBlockAdded(newTextBlock)
        }

        onTextBlocksChange([...textBlocks, newTextBlock])
        setEditingTextId(newTextBlock.id)
        setSelectedTextId(newTextBlock.id)

        tapStartRef.current = null
        return
      }
      tapStartRef.current = null

      if (!isDrawing || !currentStrokeRef.current) return

      // Save stroke (both pen and eraser strokes)
      if (currentStrokeRef.current.points.length > 1) {
        console.log('Canvas: finishing stroke', currentStrokeRef.current.id)
        // Explicitly fire onStrokeAdded if provided
        if (onStrokeAdded) {
          onStrokeAdded(currentStrokeRef.current)
        }
        // Also fire full change for controlled component usage (unless onStrokeAdded handles state)
        onStrokesChange([...strokes, currentStrokeRef.current])
      }

      currentStrokeRef.current = null
      setIsDrawing(false)
    },
    [
      isDrawing,
      strokes,
      onStrokesChange,
      tool,
      color,
      font,
      textBlocks,
      getPointerPosition,
      onStrokeAdded,
      onTextBlockAdded,
    ]
  )

  const handleTextUpdate = useCallback(
    (id: string, updates: Partial<TextBlock>) => {
      // Find the block to verify it exists and get complete data if needed
      const block = textBlocks.find((b) => b.id === id)
      if (block && onTextBlockUpdated) {
        onTextBlockUpdated(id, updates)
      }
      onTextBlocksChange(textBlocks.map((tb) => (tb.id === id ? { ...tb, ...updates } : tb)))
    },
    [textBlocks, onTextBlocksChange, onTextBlockUpdated]
  )

  const handleTextEndEdit = useCallback(
    (id: string, content: string, width?: number, fontSize?: number) => {
      if (!content.trim()) {
        if (onTextBlockDeleted) {
          onTextBlockDeleted(id)
        }
        onTextBlocksChange(textBlocks.filter((tb) => tb.id !== id))
      } else {
        const updates = {
          content,
          width,
          fontSize,
        }
        // Filter out undefined values
        if (width === undefined) delete updates.width
        if (fontSize === undefined) delete updates.fontSize

        if (onTextBlockUpdated) {
          onTextBlockUpdated(id, updates)
        }

        onTextBlocksChange(
          textBlocks.map((tb) =>
            tb.id === id
              ? {
                ...tb,
                content,
                width: width ?? tb.width,
                fontSize: fontSize ?? tb.fontSize,
              }
              : tb
          )
        )
      }
      setEditingTextId(null)
    },
    [textBlocks, onTextBlocksChange, onTextBlockDeleted, onTextBlockUpdated]
  )

  const handleTextDelete = useCallback(
    (id: string) => {
      if (onTextBlockDeleted) {
        onTextBlockDeleted(id)
      }
      onTextBlocksChange(textBlocks.filter((tb) => tb.id !== id))
      setEditingTextId(null)
    },
    [textBlocks, onTextBlocksChange, onTextBlockDeleted]
  )

  return (
    <div ref={scrollContainerRef} className="scroll-container">
      <div
        ref={containerRef}
        className="canvas-container"
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
            isSelected={selectedTextId === block.id}
            onSelect={() => {
              if (selectedTextId !== block.id) setSelectedTextId(block.id)
            }}
            onStartEdit={() => {
              setEditingTextId(block.id)
              setSelectedTextId(block.id)
            }}
            onUpdate={(updates) => handleTextUpdate(block.id, updates)}
            onEndEdit={(content, width, fontSize) =>
              handleTextEndEdit(block.id, content, width, fontSize)
            }
            onDragStart={(e) => {
              e.dataTransfer.setData('textBlockId', block.id)
              e.dataTransfer.effectAllowed = 'move'
              if (selectedTextId !== block.id) setSelectedTextId(block.id)
            }}
            onDelete={() => handleTextDelete(block.id)}
            theme={theme}
          />
        ))}
      </div>
    </div>
  )
})
