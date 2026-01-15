import { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../lib/db'
import type { Note, Stroke, TextBlock } from '../types'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<number | null>(null)

  // Load all notes on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const allNotes = await db.notes.orderBy('updatedAt').reverse().toArray()
        setNotes(allNotes)

        // Auto-select first note or create one
        if (allNotes.length > 0) {
          setCurrentNote(allNotes[0])
        } else {
          const newNote = createEmptyNote()
          await db.notes.add(newNote)
          setNotes([newNote])
          setCurrentNote(newNote)
        }
      } catch (error) {
        console.error('Failed to load notes:', error)
      } finally {
        setLoading(false)
      }
    }
    loadNotes()
  }, [])

  const createEmptyNote = (): Note => ({
    id: uuidv4(),
    title: 'Untitled Note',
    strokes: [],
    textBlocks: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  const createNote = useCallback(async () => {
    const newNote = createEmptyNote()
    await db.notes.add(newNote)
    setNotes((prev) => [newNote, ...prev])
    setCurrentNote(newNote)
    return newNote
  }, [])

  const selectNote = useCallback(async (noteId: string) => {
    const note = await db.notes.get(noteId)
    if (note) {
      setCurrentNote(note)
    }
  }, [])

  const deleteNote = useCallback(
    async (noteId: string) => {
      await db.notes.delete(noteId)
      setNotes((prev) => prev.filter((n) => n.id !== noteId))

      if (currentNote?.id === noteId) {
        const remaining = notes.filter((n) => n.id !== noteId)
        if (remaining.length > 0) {
          setCurrentNote(remaining[0])
        } else {
          const newNote = createEmptyNote()
          await db.notes.add(newNote)
          setNotes([newNote])
          setCurrentNote(newNote)
        }
      }
    },
    [currentNote, notes]
  )

  const renameNote = useCallback(
    async (noteId: string, newTitle: string) => {
      await db.notes.update(noteId, { title: newTitle, updatedAt: new Date() })
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, title: newTitle, updatedAt: new Date() } : n))
      )
      if (currentNote?.id === noteId) {
        setCurrentNote((prev) =>
          prev ? { ...prev, title: newTitle, updatedAt: new Date() } : null
        )
      }
    },
    [currentNote]
  )

  // Debounced save for strokes/text changes
  const saveNote = useCallback(
    async (strokes: Stroke[], textBlocks: TextBlock[]) => {
      if (!currentNote) return

      // Clear pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Debounce save by 500ms
      saveTimeoutRef.current = window.setTimeout(async () => {
        const updatedNote = {
          ...currentNote,
          strokes,
          textBlocks,
          updatedAt: new Date(),
        }

        await db.notes.put(updatedNote)
        setCurrentNote(updatedNote)
        setNotes((prev) => prev.map((n) => (n.id === currentNote.id ? updatedNote : n)))
      }, 500)
    },
    [currentNote]
  )

  return {
    notes,
    currentNote,
    loading,
    createNote,
    selectNote,
    deleteNote,
    renameNote,
    saveNote,
  }
}
