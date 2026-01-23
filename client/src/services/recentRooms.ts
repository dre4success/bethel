export interface RecentRoom {
    id: string
    title: string
    accessedAt: number // timestamp
}

const STORAGE_KEY = 'bethel-recent-rooms'

export const RecentRoomsService = {
    getRecentRooms(): RecentRoom[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (!stored) return []
            return JSON.parse(stored).sort((a: RecentRoom, b: RecentRoom) => b.accessedAt - a.accessedAt)
        } catch {
            return []
        }
    },

    addOrUpdateRoom(id: string, title: string) {
        const rooms = this.getRecentRooms()
        const existingIndex = rooms.findIndex(r => r.id === id)
        const now = Date.now()

        if (existingIndex >= 0) {
            // Update existing
            rooms[existingIndex].title = title
            rooms[existingIndex].accessedAt = now
        } else {
            // Add new to top
            rooms.unshift({ id, title, accessedAt: now })
        }

        // Keep only top 50 to avoid bloat
        const trimmed = rooms.sort((a, b) => b.accessedAt - a.accessedAt).slice(0, 50)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    },

    removeRoom(id: string) {
        const rooms = this.getRecentRooms().filter(r => r.id !== id)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms))
    }
}
