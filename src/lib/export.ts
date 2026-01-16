import type { Stroke, TextBlock } from '../types'
import { getStrokeWidth } from './stroke'

// Export canvas as PNG
export function exportToPNG(
  canvas: HTMLCanvasElement,
  textBlocks: TextBlock[],
  filename = 'bethel-note.png'
): void {
  // Create a temporary canvas to combine drawing + text
  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height

  // Fill with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // Draw the original canvas content
  ctx.drawImage(canvas, 0, 0)

  // Draw text blocks
  ctx.scale(dpr, dpr)
  textBlocks.forEach((block) => {
    ctx.font = `600 ${block.fontSize}px ${block.fontFamily}`
    ctx.fillStyle = block.color
    ctx.textBaseline = 'top'

    // Handle multiline text
    const lines = block.content.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, block.x + 4, block.y + 4 + i * block.fontSize * 1.2)
    })
  })

  // Download
  const link = document.createElement('a')
  link.download = filename
  link.href = tempCanvas.toDataURL('image/png')
  link.click()
}

// Export as SVG
export function exportToSVG(
  strokes: Stroke[],
  textBlocks: TextBlock[],
  width: number,
  height: number,
  filename = 'bethel-note.svg'
): void {
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="white"/>
  <g id="strokes">
`

  // Add strokes as paths
  strokes.forEach((stroke) => {
    if (stroke.tool === 'eraser' || stroke.points.length < 2) return

    const pathData = strokeToSVGPath(stroke)
    const avgPressure = stroke.points.reduce((sum, p) => sum + p.pressure, 0) / stroke.points.length
    const strokeWidth = getStrokeWidth(avgPressure)

    svg += `    <path d="${pathData}" stroke="${stroke.color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`
  })

  svg += `  </g>\n  <g id="text">\n`

  // Add text blocks
  textBlocks.forEach((block) => {
    const lines = block.content.split('\n')
    lines.forEach((line, i) => {
      const y = block.y + 4 + block.fontSize + i * block.fontSize * 1.2
      svg += `    <text x="${block.x + 4}" y="${y}" font-family="${block.fontFamily}" font-size="${block.fontSize}" font-weight="600" fill="${block.color}">${escapeXml(line)}</text>\n`
    })
  })

  svg += `  </g>\n</svg>`

  // Download
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const link = document.createElement('a')
  link.download = filename
  link.href = URL.createObjectURL(blob)
  link.click()
  URL.revokeObjectURL(link.href)
}

// Convert stroke points to SVG path data
function strokeToSVGPath(stroke: Stroke): string {
  const points = stroke.points
  if (points.length === 0) return ''

  let path = `M ${points[0].x} ${points[0].y}`

  if (points.length === 1) {
    return path
  }

  if (points.length === 2) {
    path += ` L ${points[1].x} ${points[1].y}`
    return path
  }

  // Use quadratic curves for smoothing
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    path += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`
  }

  // Last point
  const last = points[points.length - 1]
  path += ` L ${last.x} ${last.y}`

  return path
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Export as PDF using jsPDF (dynamic import)
export async function exportToPDF(
  canvas: HTMLCanvasElement,
  textBlocks: TextBlock[],
  filename = 'bethel-note.pdf'
): Promise<void> {
  // Dynamically import jsPDF
  const { jsPDF } = await import('jspdf')

  // Create a temporary canvas with text rendered
  const tempCanvas = document.createElement('canvas')
  const ctx = tempCanvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height

  // Fill with white background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // Draw the original canvas content
  ctx.drawImage(canvas, 0, 0)

  // Draw text blocks
  ctx.scale(dpr, dpr)
  textBlocks.forEach((block) => {
    ctx.font = `600 ${block.fontSize}px ${block.fontFamily}`
    ctx.fillStyle = block.color
    ctx.textBaseline = 'top'

    const lines = block.content.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, block.x + 4, block.y + 4 + i * block.fontSize * 1.2)
    })
  })

  // Get dimensions in CSS pixels
  const width = tempCanvas.width / dpr
  const height = tempCanvas.height / dpr

  // Create PDF (landscape if wider than tall)
  const orientation = width > height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [width, height],
  })

  // Add image
  const imgData = tempCanvas.toDataURL('image/png')
  pdf.addImage(imgData, 'PNG', 0, 0, width, height)

  // Save
  pdf.save(filename)
}
