import Dexie, { type EntityTable } from 'dexie'
import type { Note, Stroke, TextBlock } from '../types'

export interface Room {
  id: string
  title: string
  updatedAt: string
}

export interface PendingAction {
  id?: number
  roomId: string
  type: 'stroke_add' | 'stroke_update' | 'text_add' | 'text_update' | 'text_delete' | 'room_update'
  payload: any
  createdAt: number
}

const db = new Dexie('BethelDB') as Dexie & {
  notes: EntityTable<Note, 'id'>
  rooms: EntityTable<Room, 'id'>
  strokes: EntityTable<Stroke, 'id'>
  textBlocks: EntityTable<TextBlock, 'id'>
  pendingActions: EntityTable<PendingAction, 'id'>
}

db.version(1).stores({
  notes: 'id, title, createdAt, updatedAt',
})

// Version 2: Add offline support tables
db.version(2).stores({
  rooms: 'id, title, updatedAt',
  strokes: 'id, roomId, [roomId+createdAt]',
  textBlocks: 'id, roomId',
  pendingActions: '++id, roomId, type, createdAt'
})

export { db }
