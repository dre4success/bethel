import { db, type PendingAction } from '../lib/db'
import type { Stroke, TextBlock, Point } from '../types'
import type { WebSocketClient } from '../lib/websocket'

export class SyncService {
    private static isSyncing = false

    static async loadRoom(roomId: string) {
        const room = await db.rooms.get(roomId)
        const strokes = await db.strokes.where('roomId').equals(roomId).sortBy('createdAt') // Assuming stroke ID or added field for sort
        const textBlocks = await db.textBlocks.where('roomId').equals(roomId).toArray()
        return { room, strokes, textBlocks }
    }

    static async touchRoom(roomId: string, title: string = 'Untitled') {
        const existing = await db.rooms.get(roomId)
        await db.rooms.put({
            id: roomId,
            title: existing?.title || title,
            updatedAt: new Date().toISOString()
        })
    }

    // --- Persistence Wrappers ---

    static async saveStroke(stroke: Stroke, isRemote: boolean = false) {
        await db.strokes.put(stroke)
        if (!isRemote) {
            await this.queueAction(stroke.roomId, 'stroke_add', stroke)
        }
        await this.touchRoom(stroke.roomId)
    }

    static async updateStroke(strokeId: string, points: Point[], roomId: string, isRemote: boolean = false) {
        const stroke = await db.strokes.get(strokeId)
        if (stroke) {
            stroke.points = points
            await db.strokes.put(stroke)
            if (!isRemote) {
                await this.queueAction(roomId, 'stroke_update', { strokeId, points })
            }
            await this.touchRoom(roomId)
        }
    }

    static async saveTextBlock(textBlock: TextBlock, isRemote: boolean = false) {
        await db.textBlocks.put(textBlock)
        if (!isRemote) {
            await this.queueAction(textBlock.roomId, 'text_add', textBlock)
        }
        await this.touchRoom(textBlock.roomId)
    }

    static async updateTextBlock(textBlockId: string, updates: Partial<TextBlock>, roomId: string, isRemote: boolean = false) {
        const textBlock = await db.textBlocks.get(textBlockId)
        if (textBlock) {
            Object.assign(textBlock, updates)
            await db.textBlocks.put(textBlock)
            if (!isRemote) {
                await this.queueAction(roomId, 'text_update', { textBlockId, updates })
            }
            await this.touchRoom(roomId)
        }
    }

    static async deleteTextBlock(textBlockId: string, roomId: string, isRemote: boolean = false) {
        await db.textBlocks.delete(textBlockId)
        if (!isRemote) {
            await this.queueAction(roomId, 'text_delete', { textBlockId })
        }
        await this.touchRoom(roomId)
    }

    static async updateRoomTitle(roomId: string, title: string, isRemote: boolean = false) {
        await this.touchRoom(roomId, title)
        if (!isRemote) {
            await this.queueAction(roomId, 'room_update', { title })
        }
    }

    static async clearRoom(roomId: string, isRemote: boolean = false) {
        await db.strokes.where('roomId').equals(roomId).delete()
        await db.textBlocks.where('roomId').equals(roomId).delete()

        await this.touchRoom(roomId)

        if (!isRemote) {
            await this.queueAction(roomId, 'clear_all', {})
        }
    }

    // --- Queue Management ---

    private static async queueAction(roomId: string, type: PendingAction['type'], payload: any) {
        await db.pendingActions.add({
            roomId,
            type,
            payload,
            createdAt: Date.now()
        })
    }

    // --- Sync Logic ---

    static async sync(client: WebSocketClient, roomId: string) {
        if (this.isSyncing) return
        this.isSyncing = true

        try {
            const actions = await db.pendingActions
                .where('roomId')
                .equals(roomId)
                .sortBy('createdAt')

            for (const action of actions) {
                try {
                    // Replay action to server
                    switch (action.type) {
                        case 'stroke_add':
                            client.addStroke(action.payload)
                            break
                        case 'stroke_update':
                            client.updateStroke(action.payload.strokeId, action.payload.points)
                            break
                        case 'text_add':
                            client.addTextBlock(action.payload)
                            break
                        case 'text_update':
                            client.updateTextBlock(action.payload.textBlockId, action.payload.updates)
                            break
                        case 'text_delete':
                            client.deleteTextBlock(action.payload.textBlockId)
                            break
                        case 'room_update':
                            client.updateRoomTitle(action.payload.title)
                            break
                        case 'clear_all':
                            client.clearAll()
                            break
                    }

                    // Remove successfully processed action
                    if (action.id) {
                        await db.pendingActions.delete(action.id)
                    }

                    // Small delay to prevent flooding
                    await new Promise(r => setTimeout(r, 10))

                } catch (e) {
                    console.error('Failed to sync action', action, e)
                    // If it fails, we keep it in the queue for next retry?
                    // Or maybe we should have a retry count.
                    // For now, let's just abort sync if we hit a hard error to preserve order
                    // But webSocket send usually doesn't throw unless socket is closed.
                }
            }
        } finally {
            this.isSyncing = false
        }
    }

    // --- State Merging ---

    static async getPendingState(roomId: string) {
        const actions = await db.pendingActions
            .where('roomId')
            .equals(roomId)
            .sortBy('createdAt')

        const dirtyStrokeIds = new Set<string>()
        const dirtyTextBlockIds = new Set<string>()
        const deletedStrokeIds = new Set<string>()
        const deletedTextBlockIds = new Set<string>()

        // Identify modified/deleted items
        for (const action of actions) {
            switch (action.type) {
                case 'stroke_add':
                case 'stroke_update':
                    if (action.payload.id || action.payload.strokeId) {
                        dirtyStrokeIds.add(action.payload.id || action.payload.strokeId)
                        deletedStrokeIds.delete(action.payload.id || action.payload.strokeId)
                    }
                    break
                case 'text_add':
                case 'text_update':
                    if (action.payload.id || action.payload.textBlockId) {
                        dirtyTextBlockIds.add(action.payload.id || action.payload.textBlockId)
                        deletedTextBlockIds.delete(action.payload.id || action.payload.textBlockId)
                    }
                    break
                case 'text_delete':
                    if (action.payload.textBlockId) {
                        deletedTextBlockIds.add(action.payload.textBlockId)
                        dirtyTextBlockIds.delete(action.payload.textBlockId)
                    }
                    break
                // stroke_delete not implemented yet
            }
        }

        // Fetch latest state for dirty items from local DB
        const pendingStrokes: Stroke[] = []
        if (dirtyStrokeIds.size > 0) {
            const strokes = await db.strokes.bulkGet(Array.from(dirtyStrokeIds))
            strokes.forEach(s => { if (s) pendingStrokes.push(s) })
        }

        const pendingTextBlocks: TextBlock[] = []
        if (dirtyTextBlockIds.size > 0) {
            const textBlocks = await db.textBlocks.bulkGet(Array.from(dirtyTextBlockIds))
            textBlocks.forEach(tb => { if (tb) pendingTextBlocks.push(tb) })
        }

        return {
            pendingStrokes,
            pendingTextBlocks,
            deletedStrokeIds,
            deletedTextBlockIds
        }
    }
}
