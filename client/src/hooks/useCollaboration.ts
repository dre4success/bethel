import { useState, useEffect, useCallback, useRef } from 'react'
import type { Stroke, TextBlock, Point } from '../types'
import {
  WebSocketClient,
  getWebSocketUrl,
  type ServerMessage,
  type Participant,
  type RoomState,
} from '../lib/websocket'

interface CursorPosition {
  participantId: string
  x: number
  y: number
  color: string
}

interface UseCollaborationOptions {
  roomId: string | null
  onError?: (error: string) => void
}

interface UseCollaborationReturn {
  // State
  strokes: Stroke[]
  textBlocks: TextBlock[]
  participants: Participant[]
  cursors: CursorPosition[]
  isConnected: boolean
  roomTitle: string

  // Actions
  addStroke: (stroke: Stroke) => void
  updateStroke: (strokeId: string, points: Point[]) => void
  addTextBlock: (textBlock: TextBlock) => void
  updateTextBlock: (textBlockId: string, updates: Partial<TextBlock>) => void
  deleteTextBlock: (textBlockId: string) => void
  moveCursor: (x: number, y: number) => void
  clearAll: () => void

  // For local-only updates (don't broadcast)
  setStrokesLocal: (strokes: Stroke[]) => void
  setTextBlocksLocal: (textBlocks: TextBlock[]) => void
}

export function useCollaboration({
  roomId,
  onError,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [textBlocks, setTextBlocks] = useState<TextBlock[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [cursors, setCursors] = useState<CursorPosition[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [roomTitle, setRoomTitle] = useState('Untitled')

  const wsRef = useRef<WebSocketClient | null>(null)

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'room_state':
          handleRoomState(message.roomState, message.participants)
          break
        case 'stroke_add':
          handleStrokeAdd(message.stroke)
          break
        case 'stroke_update':
          handleStrokeUpdate(message.strokeId, message.points)
          break
        case 'text_add':
          handleTextAdd(message.textBlock)
          break
        case 'text_update':
          handleTextUpdate(message.textBlockId, message.updates)
          break
        case 'text_delete':
          handleTextDelete(message.textBlockId)
          break
        case 'cursor_move':
          handleCursorMove(message.participantId, message.x, message.y, message.color)
          break
        case 'participant_join':
          handleParticipantJoin(message.participant)
          break
        case 'participant_leave':
          handleParticipantLeave(message.participantId)
          break
        case 'clear_all':
          handleClearAll()
          break
        case 'error':
          onError?.(message.error)
          break
      }
    },
    [onError]
  )

  // Message handlers
  const handleRoomState = (roomState: RoomState, roomParticipants: Participant[]) => {
    setStrokes(roomState.strokes || [])
    setTextBlocks(roomState.textBlocks || [])
    setParticipants(roomParticipants || [])
    setRoomTitle(roomState.room.title)
  }

  const handleStrokeAdd = (stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke])
  }

  const handleStrokeUpdate = (strokeId: string, points: Point[]) => {
    setStrokes((prev) => prev.map((s) => (s.id === strokeId ? { ...s, points } : s)))
  }

  const handleTextAdd = (textBlock: TextBlock) => {
    setTextBlocks((prev) => [...prev, textBlock])
  }

  const handleTextUpdate = (textBlockId: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) => prev.map((tb) => (tb.id === textBlockId ? { ...tb, ...updates } : tb)))
  }

  const handleTextDelete = (textBlockId: string) => {
    setTextBlocks((prev) => prev.filter((tb) => tb.id !== textBlockId))
  }

  const handleCursorMove = (participantId: string, x: number, y: number, color: string) => {
    setCursors((prev) => {
      const existing = prev.findIndex((c) => c.participantId === participantId)
      const cursor = { participantId, x, y, color }
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = cursor
        return updated
      }
      return [...prev, cursor]
    })
  }

  const handleParticipantJoin = (participant: Participant) => {
    setParticipants((prev) => [...prev, participant])
  }

  const handleParticipantLeave = (participantId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId))
    setCursors((prev) => prev.filter((c) => c.participantId !== participantId))
  }

  const handleClearAll = () => {
    setStrokes([])
    setTextBlocks([])
  }

  // Connect/disconnect based on roomId
  useEffect(() => {
    if (!roomId) {
      return
    }

    const wsUrl = getWebSocketUrl()
    const client = new WebSocketClient({
      url: wsUrl,
      roomId,
      onMessage: handleMessage,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: () => onError?.('WebSocket connection error'),
    })

    let isCancelled = false
    const timer = setTimeout(() => {
      if (!isCancelled) {
        client.connect()
        wsRef.current = client
      }
    }, 300)

    // Handle tab visibility changes (iPad/Mobile switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wsRef.current) {
        // Force immediate reconnect check if visible
        // (WebSocketClient.connect handles deduplication)
        wsRef.current.connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timer)
      client.disconnect()
      wsRef.current = null
    }
  }, [roomId])

  // Action functions
  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke])
    wsRef.current?.addStroke(stroke)
  }, [])

  const updateStroke = useCallback((strokeId: string, points: Point[]) => {
    setStrokes((prev) => prev.map((s) => (s.id === strokeId ? { ...s, points } : s)))
    wsRef.current?.updateStroke(strokeId, points)
  }, [])

  const addTextBlock = useCallback((textBlock: TextBlock) => {
    setTextBlocks((prev) => [...prev, textBlock])
    wsRef.current?.addTextBlock(textBlock)
  }, [])

  const updateTextBlock = useCallback((textBlockId: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) => prev.map((tb) => (tb.id === textBlockId ? { ...tb, ...updates } : tb)))
    wsRef.current?.updateTextBlock(textBlockId, updates)
  }, [])

  const deleteTextBlock = useCallback((textBlockId: string) => {
    setTextBlocks((prev) => prev.filter((tb) => tb.id !== textBlockId))
    wsRef.current?.deleteTextBlock(textBlockId)
  }, [])

  const moveCursor = useCallback((x: number, y: number) => {
    wsRef.current?.moveCursor(x, y)
  }, [])

  const clearAll = useCallback(() => {
    setStrokes([])
    setTextBlocks([])
    wsRef.current?.clearAll()
  }, [])

  // Local-only setters (for when we need to update without broadcasting)
  const setStrokesLocal = useCallback((newStrokes: Stroke[]) => {
    setStrokes(newStrokes)
  }, [])

  const setTextBlocksLocal = useCallback((newTextBlocks: TextBlock[]) => {
    setTextBlocks(newTextBlocks)
  }, [])

  return {
    strokes,
    textBlocks,
    participants,
    cursors,
    isConnected,
    roomTitle,
    addStroke,
    updateStroke,
    addTextBlock,
    updateTextBlock,
    deleteTextBlock,
    moveCursor,
    clearAll,
    setStrokesLocal,
    setTextBlocksLocal,
  }
}
