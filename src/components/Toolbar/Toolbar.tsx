import type { Tool } from '../../types';
import { COLORS, FONTS } from '../../types';
import './Toolbar.css';

interface ToolbarProps {
  tool: Tool;
  color: string;
  font: string;
  onToolChange: (tool: Tool) => void;
  onColorChange: (color: string) => void;
  onFontChange: (font: string) => void;
  onClear: () => void;
}

export function Toolbar({
  tool,
  color,
  font,
  onToolChange,
  onColorChange,
  onFontChange,
  onClear,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <button
          className={`tool-button ${tool === 'pen' ? 'active' : ''}`}
          onClick={() => onToolChange('pen')}
          title="Pen (P)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L13.4 2.8c.8-.8 2-.8 2.8 0L21 7.6c.8.8.8 2 0 2.8L11 20" />
            <path d="M6 11l5 5" />
          </svg>
        </button>

        <button
          className={`tool-button ${tool === 'text' ? 'active' : ''}`}
          onClick={() => onToolChange('text')}
          title="Text (T)"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <select
          className="font-select"
          value={font}
          onChange={(e) => onFontChange(e.target.value)}
          title="Font"
        >
          {FONTS.map((f) => (
            <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className="tool-button danger"
          onClick={onClear}
          title="Clear Canvas"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </div>
  );
}
