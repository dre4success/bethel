import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Stroke, Point, Tool, TextBlock } from '../../types';
import { drawStroke, redrawCanvas, findStrokeAtPoint } from '../../lib/stroke';
import './Canvas.css';

interface TextBlockComponentProps {
  block: TextBlock;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: (content: string) => void;
  onDelete: () => void;
}

const TextBlockComponent = memo(function TextBlockComponent({
  block,
  isEditing,
  onStartEdit,
  onEndEdit,
  onDelete,
}: TextBlockComponentProps) {
  const [localContent, setLocalContent] = useState(block.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local content when block content changes externally
  useEffect(() => {
    setLocalContent(block.content);
  }, [block.content]);

  // Focus when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (!localContent.trim()) {
      onDelete();
    } else {
      onEndEdit(localContent);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('textBlockId', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`text-block ${isEditing ? 'editing' : ''}`}
      style={{
        left: block.x,
        top: block.y,
        minWidth: block.width,
        minHeight: block.height,
      }}
      draggable={!isEditing}
      onDragStart={handleDragStart}
    >
      <textarea
        ref={textareaRef}
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        onFocus={onStartEdit}
        onBlur={handleBlur}
        placeholder="Type here..."
        style={{ color: block.color, fontSize: block.fontSize }}
      />
    </div>
  );
});

interface CanvasProps {
  tool: Tool;
  color: string;
  strokes: Stroke[];
  textBlocks: TextBlock[];
  onStrokesChange: (strokes: Stroke[]) => void;
  onTextBlocksChange: (textBlocks: TextBlock[]) => void;
}

export function Canvas({
  tool,
  color,
  strokes,
  textBlocks,
  onStrokesChange,
  onTextBlocksChange,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Handle canvas resize
  useEffect(() => {
    const updateCanvasSize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        redrawCanvas(ctx, strokes, rect.width, rect.height);
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [strokes]);

  // Redraw when strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    redrawCanvas(ctx, strokes, rect.width, rect.height);
  }, [strokes]);

  const getPointerPosition = useCallback((e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drawing if clicking on a text block
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }

    if (tool === 'text') {
      const pos = getPointerPosition(e);
      const newTextBlock: TextBlock = {
        id: uuidv4(),
        x: pos.x,
        y: pos.y,
        width: 200,
        height: 40,
        content: '',
        fontSize: 16,
        color: color,
      };
      onTextBlocksChange([...textBlocks, newTextBlock]);
      setEditingTextId(newTextBlock.id);
      return;
    }

    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    const point = getPointerPosition(e);

    if (tool === 'eraser') {
      const strokeId = findStrokeAtPoint(strokes, point.x, point.y);
      if (strokeId) {
        onStrokesChange(strokes.filter(s => s.id !== strokeId));
      }
    }

    const newStroke: Stroke = {
      id: uuidv4(),
      points: [point],
      color: tool === 'eraser' ? '#000000' : color,
      tool: tool === 'eraser' ? 'eraser' : 'pen',
    };

    currentStrokeRef.current = newStroke;
    setIsDrawing(true);
  }, [tool, color, strokes, textBlocks, getPointerPosition, onStrokesChange, onTextBlocksChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;

    const point = getPointerPosition(e);

    if (tool === 'eraser') {
      const strokeId = findStrokeAtPoint(strokes, point.x, point.y);
      if (strokeId) {
        onStrokesChange(strokes.filter(s => s.id !== strokeId));
      }
    }

    currentStrokeRef.current.points.push(point);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawStroke(ctx, currentStrokeRef.current);
  }, [isDrawing, tool, strokes, getPointerPosition, onStrokesChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentStrokeRef.current) return;

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentStrokeRef.current.points.length > 1 && tool !== 'eraser') {
      onStrokesChange([...strokes, currentStrokeRef.current]);
    }

    currentStrokeRef.current = null;
    setIsDrawing(false);
  }, [isDrawing, tool, strokes, onStrokesChange]);

  const handleTextEndEdit = useCallback((id: string, content: string) => {
    onTextBlocksChange(
      textBlocks.map(tb => (tb.id === id ? { ...tb, content } : tb))
    );
    setEditingTextId(null);
  }, [textBlocks, onTextBlocksChange]);

  const handleTextDelete = useCallback((id: string) => {
    onTextBlocksChange(textBlocks.filter(tb => tb.id !== id));
    setEditingTextId(null);
  }, [textBlocks, onTextBlocksChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('textBlockId');
    if (!id) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onTextBlocksChange(
      textBlocks.map(tb => (tb.id === id ? { ...tb, x, y } : tb))
    );
  }, [textBlocks, onTextBlocksChange]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <canvas
        ref={canvasRef}
        className="drawing-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
      {textBlocks.map(block => (
        <TextBlockComponent
          key={block.id}
          block={block}
          isEditing={editingTextId === block.id}
          onStartEdit={() => setEditingTextId(block.id)}
          onEndEdit={(content) => handleTextEndEdit(block.id, content)}
          onDelete={() => handleTextDelete(block.id)}
        />
      ))}
    </div>
  );
}
