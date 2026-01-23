import { useState, useEffect, useCallback, useRef } from 'react'
import type { Stroke, TextBlock, Point } from '../types'
import {
  WebSocketClient,
  getWebSocketUrl,
  type ServerMessage,
  type Participant,
  type RoomState,
} from '../lib/websocket'
import { SyncService } from '../services/sync'

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
  updateRoomTitle: (title: string) => void
  clearAll: () => void

  // For local-only updates (don't broadcast)
  setStrokesLocal: (strokes: Stroke[]) => void
  setTextBlocksLocal: (textBlocks: TextBlock[]) => void
  isDisconnectedPermanently: boolean
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
  const [isDisconnectedPermanently, setIsDisconnectedPermanently] = useState(false)
  const [roomTitle, setRoomTitle] = useState('Untitled')

  const wsRef = useRef<WebSocketClient | null>(null)

  // Load local data on mount
  useEffect(() => {
    if (roomId) {
      SyncService.loadRoom(roomId).then((data) => {
        if (data.room) {
          setRoomTitle(data.room.title)
        }
        setStrokes(data.strokes)
        setTextBlocks(data.textBlocks)
      })
    }
  }, [roomId])

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: ServerMessage) => {
      switch (message.type) {
        case 'room_state':
          // Merge server state with local state?
          // For now, let's just accept server state as truth if valid
          // But since we might have pending local changes, this is tricky.
          // Simplest approach: Server state overrides initial local state for now.
          // In a true CRDT setup, we'd merge.
          // Here, we'll just update if we get new data.
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
        case 'room_update':
          handleRoomUpdate(message.roomTitle)
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
  const handleRoomState = async (roomState: RoomState, roomParticipants: Participant[]) => {
    // 1. Get pending local changes
    let pendingStrokes: Stroke[] = []
    let pendingTextBlocks: TextBlock[] = []
    let deletedStrokeIds = new Set<string>()
    let deletedTextBlockIds = new Set<string>()

    if (roomId) {
      const pending = await SyncService.getPendingState(roomId)
      pendingStrokes = pending.pendingStrokes
      pendingTextBlocks = pending.pendingTextBlocks
      deletedStrokeIds = pending.deletedStrokeIds
      deletedTextBlockIds = pending.deletedTextBlockIds
    }

    // 2. Merge: Server State + Pending Local Changes

    // Strokes
    const serverStrokes = (roomState.strokes || []).filter(s => !deletedStrokeIds.has(s.id))
    const strokeMap = new Map<string, Stroke>()
    serverStrokes.forEach(s => strokeMap.set(s.id, s))
    pendingStrokes.forEach(s => strokeMap.set(s.id, s)) // Local overwrites server
    const uniqueStrokes = Array.from(strokeMap.values())

    // Text Blocks
    const serverTextBlocks = (roomState.textBlocks || []).filter(tb => !deletedTextBlockIds.has(tb.id))
    const textBlockMap = new Map<string, TextBlock>()
    serverTextBlocks.forEach(tb => textBlockMap.set(tb.id, tb))
    pendingTextBlocks.forEach(tb => textBlockMap.set(tb.id, tb)) // Local overwrites server
    const uniqueTextBlocks = Array.from(textBlockMap.values())

    setStrokes(uniqueStrokes)
    setTextBlocks(uniqueTextBlocks)
    setParticipants(roomParticipants || [])
    if (roomState.room) setRoomTitle(roomState.room.title)

    // Also save to local DB to keep it fresh
    if (roomId && roomState.room) {
      SyncService.touchRoom(roomId, roomState.room.title)
      roomState.strokes?.forEach(s => SyncService.saveStroke(s, true))
      roomState.textBlocks?.forEach(tb => SyncService.saveTextBlock(tb, true))
    }
  }

  const handleStrokeAdd = (stroke: Stroke) => {
    setStrokes((prev) => {
      // Avoid duplicates
      if (prev.find(s => s.id === stroke.id)) return prev
      return [...prev, stroke]
    })
    SyncService.saveStroke(stroke, true)
  }

  const handleStrokeUpdate = (strokeId: string, points: Point[]) => {
    setStrokes((prev) => prev.map((s) => (s.id === strokeId ? { ...s, points } : s)))
    if (roomId) SyncService.updateStroke(strokeId, points, roomId, true)
  }

  const handleTextAdd = (textBlock: TextBlock) => {
    setTextBlocks((prev) => {
      if (prev.find(tb => tb.id === textBlock.id)) return prev
      return [...prev, textBlock]
    })
    SyncService.saveTextBlock(textBlock, true)
  }

  const handleTextUpdate = (textBlockId: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) => prev.map((tb) => (tb.id === textBlockId ? { ...tb, ...updates } : tb)))
    if (roomId) SyncService.updateTextBlock(textBlockId, updates, roomId, true)
  }

  const handleTextDelete = (textBlockId: string) => {
    setTextBlocks((prev) => prev.filter((tb) => tb.id !== textBlockId))
    if (roomId) SyncService.deleteTextBlock(textBlockId, roomId, true)
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
    // TODO: Handle clear all in sync service if needed
  }

  const handleRoomUpdate = (roomTitle: string) => {
    setRoomTitle(roomTitle)
    if (roomId) SyncService.updateRoomTitle(roomId, roomTitle, true)
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
      onConnect: () => {
        setIsConnected(true)
        // Trigger sync when connected
        SyncService.sync(client, roomId)
      },
      onDisconnect: () => setIsConnected(false),
      onError: () => console.warn('WebSocket connection failed - working offline'),
      onMaxReconnectAttempts: () => setIsDisconnectedPermanently(true),
    })

    let isCancelled = false
    let isConnected = false

    // Short delay to handle React StrictMode's immediate unmount/remount
    const timer = setTimeout(() => {
      if (!isCancelled) {
        client.connect()
        wsRef.current = client
        isConnected = true
      }
    }, 100)

    // Handle tab visibility changes (iPad/Mobile switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wsRef.current) {
        wsRef.current.connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(timer)
      if (isConnected && wsRef.current === client) {
        client.disconnect()
        wsRef.current = null
      }
    }
  }, [roomId])

  // Action functions
  const addStroke = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke])
    if (wsRef.current?.isConnected) {
      wsRef.current?.addStroke(stroke)
    }
    SyncService.saveStroke(stroke) // Save locally + queue if offline (implied by service logic usually, but here service handles queueing)
  }, [])

  const updateStroke = useCallback((strokeId: string, points: Point[]) => {
    setStrokes((prev) => prev.map((s) => (s.id === strokeId ? { ...s, points } : s)))
    if (wsRef.current?.isConnected) {
      wsRef.current?.updateStroke(strokeId, points)
    }
    if (roomId) SyncService.updateStroke(strokeId, points, roomId)
  }, [roomId])

  const addTextBlock = useCallback((textBlock: TextBlock) => {
    setTextBlocks((prev) => [...prev, textBlock])
    if (wsRef.current?.isConnected) {
      wsRef.current?.addTextBlock(textBlock)
    }
    SyncService.saveTextBlock(textBlock)
  }, [])

  const updateTextBlock = useCallback((textBlockId: string, updates: Partial<TextBlock>) => {
    setTextBlocks((prev) => prev.map((tb) => (tb.id === textBlockId ? { ...tb, ...updates } : tb)))
    if (wsRef.current?.isConnected) {
      wsRef.current?.updateTextBlock(textBlockId, updates)
    }
    if (roomId) SyncService.updateTextBlock(textBlockId, updates, roomId)
  }, [roomId])

  const deleteTextBlock = useCallback((textBlockId: string) => {
    setTextBlocks((prev) => prev.filter((tb) => tb.id !== textBlockId))
    if (wsRef.current?.isConnected) {
      wsRef.current?.deleteTextBlock(textBlockId)
    }
    if (roomId) SyncService.deleteTextBlock(textBlockId, roomId)
  }, [roomId])

  const moveCursor = useCallback((x: number, y: number) => {
    if (wsRef.current?.isConnected) {
      wsRef.current?.moveCursor(x, y)
    }
  }, [])

  const updateRoomTitle = useCallback((title: string) => {
    setRoomTitle(title)
    if (wsRef.current?.isConnected) {
      wsRef.current?.updateRoomTitle(title)
    }
    if (roomId) SyncService.updateRoomTitle(roomId, title)
  }, [roomId])

  const clearAll = useCallback(() => {
    setStrokes([])
    setTextBlocks([])
    if (wsRef.current?.isConnected) {
      wsRef.current?.clearAll()
    }
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
    updateRoomTitle,
    clearAll,
    setStrokesLocal,
    setTextBlocksLocal,
    isDisconnectedPermanently,
  }
}
