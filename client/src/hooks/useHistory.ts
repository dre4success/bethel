import { useState, useCallback } from 'react'
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
  // Combined state to ensure atomicity
  const [state, setState] = useState<{
    history: HistoryState[]
    index: number
  }>({
    history: [{ strokes: initialStrokes, textBlocks: initialTextBlocks }],
    index: 0,
  })

  // We still use a ref for the pushState callback ensures we always have access to the latest state
  // without adding it to the dependency array, avoiding infinite loops if used in effects.
  // However, with the functional update pattern of useState, we might not strictly need it,
  // but it's good practice for complex state logic.
  // Actually, with the single state object and functional updates, we don't need refs for state access inside setState!

  const currentState = state.history[state.index] || { strokes: [], textBlocks: [] }

  const pushState = useCallback(
    (stateUpdate: HistoryState | ((prev: HistoryState) => HistoryState)) => {
      setState((prevState) => {
        const { history, index } = prevState
        const currentHead = history[index]

        const newState = typeof stateUpdate === 'function' ? stateUpdate(currentHead) : stateUpdate

        // If strict equality check passes, don't update (optional optimization)
        if (newState === currentHead) return prevState

        const newHistory = history.slice(0, index + 1)
        newHistory.push(newState)

        if (newHistory.length > MAX_HISTORY) {
          newHistory.shift()
        }

        return {
          history: newHistory,
          index: newHistory.length - 1,
        }
      })
    },
    []
  )

  const setStrokes = useCallback(
    (strokes: Stroke[]) => {
      pushState((current) => ({ ...current, strokes }))
    },
    [pushState]
  )

  const setTextBlocks = useCallback(
    (textBlocks: TextBlock[]) => {
      pushState((current) => ({ ...current, textBlocks }))
    },
    [pushState]
  )

  const undo = useCallback(() => {
    setState((prevState) => {
      if (prevState.index > 0) {
        return { ...prevState, index: prevState.index - 1 }
      }
      return prevState
    })
  }, [])

  const redo = useCallback(() => {
    setState((prevState) => {
      if (prevState.index < prevState.history.length - 1) {
        return { ...prevState, index: prevState.index + 1 }
      }
      return prevState
    })
  }, [])

  const reset = useCallback((strokes: Stroke[], textBlocks: TextBlock[]) => {
    setState({
      history: [{ strokes, textBlocks }],
      index: 0,
    })
  }, [])

  return {
    strokes: currentState.strokes,
    textBlocks: currentState.textBlocks,
    setStrokes,
    setTextBlocks,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
    reset,
  }
}
