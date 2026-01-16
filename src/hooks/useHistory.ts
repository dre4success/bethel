import { useState, useCallback, useRef } from 'react'
import type { Stroke, TextBlock } from '../types'

interface HistoryState {
  strokes: Stroke[]
  textBlocks: TextBlock[]
}

interface UseHistoryReturn {
  strokes: Stroke[]
  textBlocks: TextBlock[]
  setStrokes: (strokes: Stroke[]) => void
  setTextBlocks: (textBlocks: TextBlock[]) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  reset: (strokes: Stroke[], textBlocks: TextBlock[]) => void
}

const MAX_HISTORY = 50

export function useHistory(
  initialStrokes: Stroke[] = [],
  initialTextBlocks: TextBlock[] = []
): UseHistoryReturn {
  const [history, setHistory] = useState<HistoryState[]>([
    { strokes: initialStrokes, textBlocks: initialTextBlocks },
  ])
  const [historyIndex, setHistoryIndex] = useState(0)
  const isUndoRedoRef = useRef(false)

  const currentState = history[historyIndex]

  const pushState = useCallback(
    (newState: HistoryState) => {
      if (isUndoRedoRef.current) {
        isUndoRedoRef.current = false
        return
      }

      setHistory((prev) => {
        // Remove any future states if we're not at the end
        const newHistory = prev.slice(0, historyIndex + 1)
        newHistory.push(newState)

        // Limit history size
        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift()
          return newHistory
        }
        return newHistory
      })
      setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1))
    },
    [historyIndex]
  )

  const setStrokes = useCallback(
    (strokes: Stroke[]) => {
      pushState({ strokes, textBlocks: currentState.textBlocks })
    },
    [pushState, currentState.textBlocks]
  )

  const setTextBlocks = useCallback(
    (textBlocks: TextBlock[]) => {
      pushState({ strokes: currentState.strokes, textBlocks })
    },
    [pushState, currentState.strokes]
  )

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoRef.current = true
      setHistoryIndex((prev) => prev - 1)
    }
  }, [historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoRef.current = true
      setHistoryIndex((prev) => prev + 1)
    }
  }, [historyIndex, history.length])

  const reset = useCallback((strokes: Stroke[], textBlocks: TextBlock[]) => {
    setHistory([{ strokes, textBlocks }])
    setHistoryIndex(0)
  }, [])

  return {
    strokes: currentState.strokes,
    textBlocks: currentState.textBlocks,
    setStrokes,
    setTextBlocks,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    reset,
  }
}
