import type { Stroke, TextBlock } from '../types'
import { getStrokeWidth } from './stroke'

interface ContentBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

// Calculate the bounding box of actual content (strokes + text blocks)
function getContentBounds(
  strokes: Stroke[],
  textBlocks: TextBlock[],
  padding: number = 20
): ContentBounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = 0
  let maxY = 0

  // Check strokes
  strokes.forEach((stroke) => {
    if (stroke.tool === 'eraser') return
    stroke.points.forEach((point) => {
      const strokeWidth = getStrokeWidth(point.pressure) / 2
      minX = Math.min(minX, point.x - strokeWidth)
      minY = Math.min(minY, point.y - strokeWidth)
      maxX = Math.max(maxX, point.x + strokeWidth)
      maxY = Math.max(maxY, point.y + strokeWidth)
    })
  })

  // Check text blocks
  textBlocks.forEach((block) => {
    minX = Math.min(minX, block.x)
    minY = Math.min(minY, block.y)
    maxX = Math.max(maxX, block.x + block.width)
    // Estimate text height based on content lines
    const lineCount = block.content.split('\n').length
    const textHeight = lineCount * block.fontSize * 1.2 + 8 // Add padding for textarea
    maxY = Math.max(maxY, block.y + textHeight)
  })

  // Handle empty canvas
  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }
  }

  // Add padding
  minX = Math.max(0, minX - padding)
  minY = Math.max(0, minY - padding)
  maxX = maxX + padding
  maxY = maxY + padding

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

// Export canvas as PNG
export function exportToPNG(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  textBlocks: TextBlock[],
  filename = 'bethel-note.png'
): void {
  const bounds = getContentBounds(strokes, textBlocks)
  const dpr = window.devicePixelRatio || 1

  // Create a temporary canvas cropped to content bounds
  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return

  tempCanvas.width = bounds.width * dpr
  tempCanvas.height = bounds.height * dpr

  // Fill with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // Draw the cropped region from source canvas
  ctx.drawImage(
    canvas,
    bounds.minX * dpr,
    bounds.minY * dpr,
    bounds.width * dpr,
    bounds.height * dpr,
    0,
    0,
    bounds.width * dpr,
    bounds.height * dpr
  )

  // Draw text blocks (adjusted for bounds offset)
  ctx.scale(dpr, dpr)
  textBlocks.forEach((block) => {
    ctx.font = `600 ${block.fontSize}px ${block.fontFamily}`
    ctx.fillStyle = block.color
    ctx.textBaseline = 'top'

    // Handle multiline text - adjust position relative to bounds
    const lines = block.content.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        block.x - bounds.minX + 4,
        block.y - bounds.minY + 4 + i * block.fontSize * 1.2
      )
    })
  })

  // Download
  const link = document.createElement('a')
  link.download = filename
  link.href = tempCanvas.toDataURL('image/png')
  link.click()
}

// Export as PDF using jsPDF (dynamic import)
export async function exportToPDF(
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
  textBlocks: TextBlock[],
  filename = 'bethel-note.pdf'
): Promise<void> {
  const bounds = getContentBounds(strokes, textBlocks)
  const dpr = window.devicePixelRatio || 1

  // Dynamically import jsPDF
  const { jsPDF } = await import('jspdf')

  // Create a temporary canvas cropped to content bounds
  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return

  tempCanvas.width = bounds.width * dpr
  tempCanvas.height = bounds.height * dpr

  // Fill with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // Draw the cropped region from source canvas
  ctx.drawImage(
    canvas,
    bounds.minX * dpr,
    bounds.minY * dpr,
    bounds.width * dpr,
    bounds.height * dpr,
    0,
    0,
    bounds.width * dpr,
    bounds.height * dpr
  )

  // Draw text blocks (adjusted for bounds offset)
  ctx.scale(dpr, dpr)
  textBlocks.forEach((block) => {
    ctx.font = `600 ${block.fontSize}px ${block.fontFamily}`
    ctx.fillStyle = block.color
    ctx.textBaseline = 'top'

    const lines = block.content.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        block.x - bounds.minX + 4,
        block.y - bounds.minY + 4 + i * block.fontSize * 1.2
      )
    })
  })

  // Create PDF (landscape if wider than tall)
  const orientation = bounds.width > bounds.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [bounds.width, bounds.height],
  })

  // Add image
  const imgData = tempCanvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', 0, 0, bounds.width, bounds.height)

  // Save
  pdf.save(filename)
}

// Export as SVG
export function exportToSVG(
  strokes: Stroke[],
  textBlocks: TextBlock[],
  filename = 'bethel-note.svg'
): void {
  const bounds = getContentBounds(strokes, textBlocks)
  const width = bounds.width
  const height = bounds.height
  const minX = bounds.minX
  const minY = bounds.minY

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: white;">`

  // 1. Add Strokes
  strokes.forEach((stroke) => {
    if (stroke.tool === 'eraser') return
    if (stroke.points.length < 2) return

    // Create path data, translating points by (-minX, -minY)
    let d = `M ${stroke.points[0].x - minX} ${stroke.points[0].y - minY}`

    // We can use a simplified path for SVG or try to replicate the smoothing.
    // For exact fidelity, we should ideally use the same smoothing algorithm.
    // But for a simple SVG export, treating points as polyline or simple quadratic is often "good enough" or we can reimplement the smoothing.
    // Let's use simple Q curves similar to the canvas drawing for better look.

    if (stroke.points.length > 2) {
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p1 = stroke.points[i]
        const p2 = stroke.points[i + 1]
        const midX = (p1.x + p2.x) / 2
        const midY = (p1.y + p2.y) / 2
        d += ` Q ${p1.x - minX} ${p1.y - minY}, ${midX - minX} ${midY - minY}`
      }
    } else {
      // Just a line for 2 points
      d += ` L ${stroke.points[1].x - minX} ${stroke.points[1].y - minY}`
    }

    // Simplified avg pressure for stroke width or use a default?
    // SVG paths have constant width usually. Variable width strokes in SVG require complex paths (filling a shape).
    // For now, let's stick to a constant average width or the max width logic.
    // The canvas implementation draws variable width "segments".
    // Representing variable width in standard SVG <path> is impossible without expanding to outline.
    // Compromise: Use average pressure/width for the whole stroke.
    const avgPressure = stroke.points.reduce((acc, p) => acc + p.pressure, 0) / stroke.points.length
    const width = getStrokeWidth(avgPressure)

    svgContent += `
  <path d="${d}" stroke="${stroke.color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
  })

  // 2. Add Text Blocks
  textBlocks.forEach((block) => {
    // Translate position
    const x = block.x - minX
    const y = block.y - minY

    // Split lines
    const lines = block.content.split('\n')
    const lineHeight = block.fontSize * 1.2

    // SVG text
    svgContent += `
  <text x="${x + 4}" y="${y + 4}" font-family="${block.fontFamily}" font-size="${block.fontSize}" fill="${block.color}" font-weight="600" dominant-baseline="text-before-edge">`

    lines.forEach((line, i) => {
      // tspan for multiline
      svgContent += `
    <tspan x="${x + 4}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`
    })

    svgContent += `
  </text>`
  })

  svgContent += `
</svg>`

  // Download
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' })
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
}
