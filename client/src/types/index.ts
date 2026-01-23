export interface Point {
  x: number
  y: number
  pressure: number
}

export interface Stroke {
  id: string
  items?: never // phantom property to distinguish from other types if needed, but not doing that now.
  roomId: string
  points: Point[]
  color: string
  tool: 'pen' | 'eraser'
}

export interface TextBlock {
  id: string
  roomId: string
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

export const PRESET_COLORS = [
  '#000000', // Black
  '#FF3B30', // Red
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
] as const

export const FONTS = [
  { name: 'Kalam', value: "'Kalam', cursive" },
  { name: 'Caveat', value: "'Caveat', cursive" },
  { name: 'Patrick Hand', value: "'Patrick Hand', cursive" },
  { name: 'Indie Flower', value: "'Indie Flower', cursive" },
  { name: 'Architects Daughter', value: "'Architects Daughter', cursive" },
  { name: 'Shadows Into Light', value: "'Shadows Into Light', cursive" },
  { name: 'Permanent Marker', value: "'Permanent Marker', cursive" },
  { name: 'Gloria Hallelujah', value: "'Gloria Hallelujah', cursive" },
  { name: 'Homemade Apple', value: "'Homemade Apple', cursive" },
  { name: 'Reenie Beanie', value: "'Reenie Beanie', cursive" },
  { name: 'Neucha', value: "'Neucha', cursive" },
] as const

export const DEFAULT_FONT = FONTS[0].value

export const MIN_STROKE_WIDTH = 1
export const MAX_STROKE_WIDTH = 12
