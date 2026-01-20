import type { Stroke, TextBlock, Point } from '../types'

// Message types from client to server
export type ClientMessage =
  | { type: 'stroke_add'; stroke: Stroke }
  | { type: 'stroke_update'; strokeId: string; points: Point[] }
  | { type: 'text_add'; textBlock: TextBlock }
  | { type: 'text_update'; textBlockId: string; updates: Partial<TextBlock> }
  | { type: 'text_delete'; textBlockId: string }
  | { type: 'cursor_move'; x: number; y: number }
  | { type: 'clear_all' }

// Message types from server to client
export interface Participant {
  id: string
  color: string
  name?: string
}

export interface RoomState {
  room: {
    id: string
    title: string
    createdAt: string
    updatedAt: string
  }
  strokes: Stroke[]
  textBlocks: TextBlock[]
}

export type ServerMessage =
  | { type: 'room_state'; roomState: RoomState; participants: Participant[] }
  | { type: 'stroke_add'; stroke: Stroke; participantId: string }
  | { type: 'stroke_update'; strokeId: string; points: Point[]; participantId: string }
  | { type: 'text_add'; textBlock: TextBlock; participantId: string }
  | { type: 'text_update'; textBlockId: string; updates: Partial<TextBlock>; participantId: string }
  | { type: 'text_delete'; textBlockId: string; participantId: string }
  | { type: 'cursor_move'; participantId: string; x: number; y: number; color: string }
  | { type: 'participant_join'; participant: Participant }
  | { type: 'participant_leave'; participantId: string }
  | { type: 'clear_all'; participantId: string }
  | { type: 'error'; error: string }

export type MessageHandler = (message: ServerMessage) => void

interface WebSocketClientOptions {
  url: string
  roomId: string
  onMessage: MessageHandler
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private roomId: string
  private onMessage: MessageHandler
  private onConnect?: () => void
  private onDisconnect?: () => void
  private onError?: (error: Event) => void
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private reconnectAttempts = 0
  private reconnectTimeout: number | null = null
  private isIntentionalClose = false

  constructor(options: WebSocketClientOptions) {
    this.url = options.url
    this.roomId = options.roomId
    this.onMessage = options.onMessage
    this.onConnect = options.onConnect
    this.onDisconnect = options.onDisconnect
    this.onError = options.onError
    this.reconnectInterval = options.reconnectInterval ?? 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    const wsUrl = `${this.url}/ws/${this.roomId}`
    this.ws = new WebSocket(wsUrl)

    this.ws.onopen = () => {
      console.log('WebSocket connected to room:', this.roomId)
      this.reconnectAttempts = 0
      this.onConnect?.()
    }

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as ServerMessage
        this.onMessage(message)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.onDisconnect?.()

      if (!this.isIntentionalClose) {
        this.attemptReconnect()
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.onError?.(error)
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`)

    this.reconnectTimeout = window.setTimeout(() => {
      this.connect()
    }, this.reconnectInterval)
  }

  disconnect(): void {
    this.isIntentionalClose = true
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message.type)
    }
  }

  // Convenience methods for common operations
  addStroke(stroke: Stroke): void {
    this.send({ type: 'stroke_add', stroke })
  }

  updateStroke(strokeId: string, points: Point[]): void {
    this.send({ type: 'stroke_update', strokeId, points })
  }

  addTextBlock(textBlock: TextBlock): void {
    this.send({ type: 'text_add', textBlock })
  }

  updateTextBlock(textBlockId: string, updates: Partial<TextBlock>): void {
    this.send({ type: 'text_update', textBlockId, updates })
  }

  deleteTextBlock(textBlockId: string): void {
    this.send({ type: 'text_delete', textBlockId })
  }

  moveCursor(x: number, y: number): void {
    this.send({ type: 'cursor_move', x, y })
  }

  clearAll(): void {
    this.send({ type: 'clear_all' })
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Helper to get WebSocket URL based on current environment
export function getWebSocketUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = import.meta.env.VITE_WS_HOST || 'localhost:8080'
  return `${protocol}//${host}`
}
