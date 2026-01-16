export interface Point {
  x: number
  y: number
  pressure: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  tool: 'pen' | 'eraser'
}

export interface TextBlock {
  id: string
  x: number
  y: number
  width: number
  height: number
  content: string
  fontSize: number
  color: string
  fontFamily: string
}

export interface Note {
  id: string
  title: string
  strokes: Stroke[]
  textBlocks: TextBlock[]
  createdAt: Date
  updatedAt: Date
}

export type Tool = 'pen' | 'eraser' | 'text'

export interface CanvasState {
  tool: Tool
  color: string
  strokeWidth: number
  strokes: Stroke[]
  currentStroke: Stroke | null
  textBlocks: TextBlock[]
}

export const COLORS = [
  '#000000', // Black
  '#FF3B30', // Red
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
] as const

export const DEFAULT_FONT = "'Kalam', cursive"

export const MIN_STROKE_WIDTH = 1
export const MAX_STROKE_WIDTH = 12
