import { FC } from 'react'
import './ResizeHandles.css'

interface ResizeHandlesProps {
  onResizeStart: (idx: number, e: React.PointerEvent) => void
}

export const ResizeHandles: FC<ResizeHandlesProps> = ({ onResizeStart }) => {
  return (
    <>
      <div className="resize-handle nw" onPointerDown={(e) => onResizeStart(0, e)} />
      <div className="resize-handle ne" onPointerDown={(e) => onResizeStart(1, e)} />
      <div className="resize-handle se" onPointerDown={(e) => onResizeStart(2, e)} />
      <div className="resize-handle sw" onPointerDown={(e) => onResizeStart(3, e)} />
    </>
  )
}
