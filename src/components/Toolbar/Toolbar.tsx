import { useState } from 'react'
import type { Tool } from '../../types'
import { COLORS } from '../../types'
import './Toolbar.css'

interface ToolbarProps {
  tool: Tool
  color: string
  onToolChange: (tool: Tool) => void
  onColorChange: (color: string) => void
  onClear: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onExportPNG: () => void
  onExportSVG: () => void
  onExportPDF: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export function Toolbar({
  tool,
  color,
  onToolChange,
  onColorChange,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportPNG,
  onExportSVG,
  onExportPDF,
  theme,
  onToggleTheme,
}: ToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false)
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => onToolChange('pen')}
          title="Pen (P)"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
        </button>

        <button
          className={`tool-button ${tool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolChange('eraser')}
          title="Eraser (E)"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.4 2.8c.8-.8 2-.8 2.8 0L21 7.6c.8.8.8 2 0 2.8L11 20" />
            <path d="M6 11l5 5" />
          </svg>
        </button>

        <button
          className={`tool-button ${tool === 'text' ? 'active' : ''}`}
          onClick={() => onToolChange('text')}
          title="Text (T)"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4,7 4,4 20,4 20,7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section colors">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color-button ${color === c ? 'active' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => onColorChange(c)}
            title={`Color: ${c}`}
          />
        ))}
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button className="tool-button" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13" />
          </svg>
        </button>
        <button
          className="tool-button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 7v6h-6" />
            <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64L21 13" />
          </svg>
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <div className="export-dropdown">
          <button
            className="tool-button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            title="Export"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <button
                onClick={() => {
                  onExportPNG()
                  setShowExportMenu(false)
                }}
              >
                Export as PNG
              </button>
              <button
                onClick={() => {
                  onExportSVG()
                  setShowExportMenu(false)
                }}
              >
                Export as SVG
              </button>
              <button
                onClick={() => {
                  onExportPDF()
                  setShowExportMenu(false)
                }}
              >
                Export as PDF
              </button>
            </div>
          )}
        </div>
        <button
          className="tool-button"
          onClick={onToggleTheme}
          title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
        >
          {theme === 'light' ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
        <button className="tool-button danger" onClick={onClear} title="Clear Canvas">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  )
}
