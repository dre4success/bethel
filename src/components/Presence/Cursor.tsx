import { memo } from 'react'
import './Presence.css'

interface CursorProps {
  x: number
  y: number
  color: string
  name?: string
}

export const Cursor = memo(function Cursor({ x, y, color, name }: CursorProps) {
  return (
    <div
      className="remote-cursor"
      style={
        {
          left: x,
          top: y,
          '--cursor-color': color,
        } as React.CSSProperties
      }
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="1">
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.48 0 .72-.58.38-.92L6.35 2.85a.5.5 0 0 0-.85.36z" />
      </svg>
      {name && (
        <span className="cursor-label" style={{ backgroundColor: color }}>
          {name}
        </span>
      )}
    </div>
  )
})
