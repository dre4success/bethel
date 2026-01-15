import type { Stroke } from '../types'
import { MIN_STROKE_WIDTH, MAX_STROKE_WIDTH } from '../types'

const ERASER_WIDTH = 20

// Calculate stroke width based on pressure
export function getStrokeWidth(pressure: number, isEraser: boolean = false): number {
  if (isEraser) return ERASER_WIDTH
  return MIN_STROKE_WIDTH + pressure * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH)
}

// Draw a single stroke on canvas
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  if (stroke.points.length < 2) return

  const isEraser = stroke.tool === 'eraser'

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = stroke.color
  }

  // Draw segments with varying width based on pressure
  for (let i = 1; i < stroke.points.length; i++) {
    const prev = stroke.points[i - 1]
    const curr = stroke.points[i]

    // Average pressure for smoother transitions (eraser uses fixed width)
    const avgPressure = (prev.pressure + curr.pressure) / 2
    ctx.lineWidth = getStrokeWidth(avgPressure, isEraser)

    ctx.beginPath()
    ctx.moveTo(prev.x, prev.y)

    // Use quadratic curve for smoother lines
    if (i < stroke.points.length - 1) {
      const next = stroke.points[i + 1]
      const midX = (curr.x + next.x) / 2
      const midY = (curr.y + next.y) / 2
      ctx.quadraticCurveTo(curr.x, curr.y, midX, midY)
    } else {
      ctx.lineTo(curr.x, curr.y)
    }

    ctx.stroke()
  }

  ctx.restore()
}

// Redraw all strokes on canvas
export function redrawCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height)

  // Set white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Draw all strokes
  for (const stroke of strokes) {
    drawStroke(ctx, stroke)
  }
}
