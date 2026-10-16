import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Code,
  PenTool,
  Eraser,
  Minus,
  ArrowRight,
  Square,
  Circle as CircleIcon,
  Type,
  RotateCcw,
  RotateCw,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const COLOR_PALETTE = [
  { name: 'Accent Blue', value: '#7C9CFF' },
  { name: 'Teal Mint', value: '#66D9C1' },
  { name: 'Warm Amber', value: '#F59E0B' },
  { name: 'Coral Red', value: '#EF4444' },
  { name: 'Pure White', value: '#FFFFFF' },
  { name: 'Muted Slate', value: '#9AA5B5' },
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Bold', value: 8 },
];

export const WhiteboardView = ({ roomId, onBackToCode }) => {
  const { socket } = useSocket();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Tools state
  const [activeTool, setActiveTool] = useState('pen'); // 'pen' | 'eraser' | 'line' | 'arrow' | 'rect' | 'circle' | 'text'
  const [strokeColor, setStrokeColor] = useState('#7C9CFF');
  const [strokeWidth, setStrokeWidth] = useState(4);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing elements
  const [elements, setElements] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentElement, setCurrentElement] = useState(null);
  const [remoteStroke, setRemoteStroke] = useState(null);

  // Text input state
  const [textInput, setTextInput] = useState(null); // { x, y, canvasX, canvasY, value }

  // Clear confirmation modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Fetch initial whiteboard state from backend
  useEffect(() => {
    if (!roomId) return;
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/whiteboard`);
        if (res.ok) {
          const data = await res.json();
          if (data.whiteboard && Array.isArray(data.whiteboard.elements)) {
            setElements(data.whiteboard.elements);
          }
        }
      } catch (err) {
        console.warn('Error fetching whiteboard:', err);
      }
    };
    fetchBoard();
  }, [roomId]);

  // Socket sync listeners
  useEffect(() => {
    if (!socket) return;

    const handleSync = ({ elements: remoteElements, senderSocketId }) => {
      if (senderSocketId !== socket.id && Array.isArray(remoteElements)) {
        setElements(remoteElements);
      }
    };

    const handleDrawStep = ({ currentStroke, senderSocketId }) => {
      if (senderSocketId !== socket.id) {
        setRemoteStroke(currentStroke);
      }
    };

    const handleCleared = ({ senderSocketId }) => {
      if (senderSocketId !== socket.id) {
        setElements([]);
        setRemoteStroke(null);
      }
    };

    socket.on('whiteboard-state-sync', handleSync);
    socket.on('whiteboard-draw-step', handleDrawStep);
    socket.on('whiteboard-cleared', handleCleared);

    return () => {
      socket.off('whiteboard-state-sync', handleSync);
      socket.off('whiteboard-draw-step', handleDrawStep);
      socket.off('whiteboard-cleared', handleCleared);
    };
  }, [socket]);

  // Save whiteboard to backend & emit socket update
  const syncElements = useCallback((newElements) => {
    setElements(newElements);
    if (socket && roomId) {
      socket.emit('whiteboard-update', {
        roomId,
        elements: newElements,
      });
    }
    // Persist via REST
    fetch(`/api/rooms/${roomId}/whiteboard`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ elements: newElements }),
    }).catch(console.warn);
  }, [socket, roomId]);

  // Canvas Coordinate Mapping
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  // Redraw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Match parent size
    if (canvas.parentElement) {
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Draw background subtle grid dots
    const gridSize = 32;
    const startX = -pan.x / zoom;
    const startY = -pan.y / zoom;
    const endX = (canvas.width - pan.x) / zoom;
    const endY = (canvas.height - pan.y) / zoom;

    ctx.fillStyle = '#1D232D';
    const firstX = Math.floor(startX / gridSize) * gridSize;
    const firstY = Math.floor(startY / gridSize) * gridSize;

    for (let x = firstX; x < endX; x += gridSize) {
      for (let y = firstY; y < endY; y += gridSize) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // Helper to render an element
    const renderElement = (elem) => {
      ctx.save();
      ctx.strokeStyle = elem.color || '#7C9CFF';
      ctx.fillStyle = elem.color || '#7C9CFF';
      ctx.lineWidth = elem.width || 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (elem.type === 'pen' && elem.points && elem.points.length > 0) {
        ctx.beginPath();
        elem.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (elem.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(elem.x1, elem.y1);
        ctx.lineTo(elem.x2, elem.y2);
        ctx.stroke();
      } else if (elem.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(elem.x1, elem.y1);
        ctx.lineTo(elem.x2, elem.y2);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(elem.y2 - elem.y1, elem.x2 - elem.x1);
        const headLength = Math.max(12, elem.width * 3);
        ctx.beginPath();
        ctx.moveTo(elem.x2, elem.y2);
        ctx.lineTo(
          elem.x2 - headLength * Math.cos(angle - Math.PI / 6),
          elem.y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          elem.x2 - headLength * Math.cos(angle + Math.PI / 6),
          elem.y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (elem.type === 'rect') {
        const x = Math.min(elem.x1, elem.x2);
        const y = Math.min(elem.y1, elem.y2);
        const w = Math.abs(elem.x2 - elem.x1);
        const h = Math.abs(elem.y2 - elem.y1);
        ctx.strokeRect(x, y, w, h);
      } else if (elem.type === 'circle') {
        const cx = (elem.x1 + elem.x2) / 2;
        const cy = (elem.y1 + elem.y2) / 2;
        const rx = Math.abs(elem.x2 - elem.x1) / 2;
        const ry = Math.abs(elem.y2 - elem.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (elem.type === 'text') {
        ctx.font = `${elem.fontSize || 18}px 'Plus Jakarta Sans', sans-serif`;
        ctx.fillText(elem.text, elem.x, elem.y);
      }
      ctx.restore();
    };

    // Render all saved elements
    elements.forEach(renderElement);

    // Render currently active local element
    if (currentElement) {
      renderElement(currentElement);
    }

    // Render remote in-progress stroke
    if (remoteStroke) {
      renderElement(remoteStroke);
    }

    ctx.restore();
  }, [elements, currentElement, remoteStroke, zoom, pan]);

  // Pointer Down
  const handlePointerDown = (e) => {
    // Middle click or Spacebar for pan
    if (e.button === 1 || e.spaceKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'text') {
      const rect = canvasRef.current.getBoundingClientRect();
      setTextInput({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        canvasX: x,
        canvasY: y,
        value: '',
      });
      return;
    }

    if (activeTool === 'eraser') {
      // Find element touched within threshold
      const remaining = elements.filter((elem) => {
        if (elem.type === 'pen' && elem.points) {
          return !elem.points.some((p) => Math.hypot(p.x - x, p.y - y) < 18);
        }
        if (elem.type === 'line' || elem.type === 'arrow') {
          const dist = Math.hypot(elem.x1 - x, elem.y1 - y) + Math.hypot(elem.x2 - x, elem.y2 - y);
          const lineLen = Math.hypot(elem.x2 - elem.x1, elem.y2 - elem.y1);
          return Math.abs(dist - lineLen) > 8;
        }
        if (elem.type === 'rect') {
          const minX = Math.min(elem.x1, elem.x2);
          const maxX = Math.max(elem.x1, elem.x2);
          const minY = Math.min(elem.y1, elem.y2);
          const maxY = Math.max(elem.y1, elem.y2);
          return !(x >= minX - 10 && x <= maxX + 10 && y >= minY - 10 && y <= maxY + 10);
        }
        if (elem.type === 'circle') {
          const cx = (elem.x1 + elem.x2) / 2;
          const cy = (elem.y1 + elem.y2) / 2;
          const rx = Math.abs(elem.x2 - elem.x1) / 2;
          const ry = Math.abs(elem.y2 - elem.y1) / 2;
          const dist = Math.hypot(x - cx, y - cy);
          return Math.abs(dist - (rx + ry) / 2) > 12;
        }
        if (elem.type === 'text') {
          return Math.hypot(elem.x - x, elem.y - y) > 24;
        }
        return true;
      });

      if (remaining.length !== elements.length) {
        setUndoStack((prev) => [...prev, elements]);
        setRedoStack([]);
        syncElements(remaining);
      }
      return;
    }

    if (activeTool === 'pen') {
      const newElem = {
        type: 'pen',
        points: [{ x, y }],
        color: strokeColor,
        width: strokeWidth,
      };
      setCurrentElement(newElem);
      return;
    }

    if (['line', 'arrow', 'rect', 'circle'].includes(activeTool)) {
      const newElem = {
        type: activeTool,
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        color: strokeColor,
        width: strokeWidth,
      };
      setCurrentElement(newElem);
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!currentElement) return;

    const { x, y } = getCanvasCoords(e);

    if (currentElement.type === 'pen') {
      const updated = {
        ...currentElement,
        points: [...currentElement.points, { x, y }],
      };
      setCurrentElement(updated);

      // Emit live stroke step to room
      if (socket && roomId) {
        socket.emit('whiteboard-draw-step', {
          roomId,
          currentStroke: updated,
        });
      }
    } else if (['line', 'arrow', 'rect', 'circle'].includes(currentElement.type)) {
      setCurrentElement((prev) => ({
        ...prev,
        x2: x,
        y2: y,
      }));
    }
  };

  // Pointer Up
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (currentElement) {
      const newElements = [...elements, currentElement];
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      setCurrentElement(null);
      syncElements(newElements);

      // Clear remote stroke preview
      if (socket && roomId) {
        socket.emit('whiteboard-draw-step', {
          roomId,
          currentStroke: null,
        });
      }
    }
  };

  // Finish text entry
  const handleTextSubmit = (e) => {
    e?.preventDefault();
    if (textInput && textInput.value.trim()) {
      const newElem = {
        type: 'text',
        x: textInput.canvasX,
        y: textInput.canvasY,
        text: textInput.value.trim(),
        color: strokeColor,
        fontSize: Math.max(14, strokeWidth * 5),
      };
      const newElements = [...elements, newElem];
      setUndoStack((prev) => [...prev, elements]);
      setRedoStack([]);
      syncElements(newElements);
    }
    setTextInput(null);
  };

  // Undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, elements]);
    setUndoStack((prev) => prev.slice(0, -1));
    syncElements(previous);
  };

  // Redo
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack((prev) => prev.slice(0, -1));
    syncElements(next);
  };

  // Clear Canvas
  const handleConfirmClear = () => {
    setUndoStack((prev) => [...prev, elements]);
    setRedoStack([]);
    setShowClearConfirm(false);
    syncElements([]);
    if (socket && roomId) {
      socket.emit('whiteboard-clear', { roomId });
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#101318] text-[#F1F4F9] h-full overflow-hidden select-none relative">
      {/* Top Whiteboard Sub-Header */}
      <div className="h-11 bg-[#171B22] border-b border-[#303744] px-4 flex items-center justify-between z-20">
        {/* Left: Back to Code button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToCode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D232D] hover:bg-[#252E3B] text-[#7C9CFF] hover:text-[#F1F4F9] border border-[#303744] text-xs font-semibold transition-all shadow-sm"
          >
            <Code className="w-4 h-4 stroke-[2.2]" />
            <span>Back to Code</span>
          </button>
          <span className="text-xs font-mono text-[#9AA5B5] hidden sm:inline">
            Shared Whiteboard
          </span>
        </div>

        {/* Center: Undo, Redo, Clear */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            title="Undo"
            className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
            className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9] disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[#303744] mx-1" />
          <button
            onClick={() => setShowClearConfirm(true)}
            title="Clear Canvas"
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>

        {/* Right: Zoom controls */}
        <div className="flex items-center space-x-1 font-mono text-xs text-[#9AA5B5]">
          <button
            onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
            title="Zoom Out"
            className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center text-[11px] font-semibold text-[#F1F4F9]">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
            title="Zoom In"
            className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            title="Reset View"
            className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9]"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-[#101318] cursor-crosshair"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full block"
        />

        {/* Floating Toolbar on Left */}
        <div className="absolute left-4 top-4 z-20 flex flex-col space-y-3">
          {/* Main Drawing Tools */}
          <div className="bg-[#171B22]/95 backdrop-blur-md border border-[#303744] rounded-xl p-1.5 shadow-xl flex flex-col space-y-1">
            {[
              { id: 'pen', icon: PenTool, title: 'Pen' },
              { id: 'eraser', icon: Eraser, title: 'Eraser' },
              { id: 'line', icon: Minus, title: 'Line' },
              { id: 'arrow', icon: ArrowRight, title: 'Arrow' },
              { id: 'rect', icon: Square, title: 'Rectangle' },
              { id: 'circle', icon: CircleIcon, title: 'Circle' },
              { id: 'text', icon: Type, title: 'Text' },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  title={tool.title}
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-[#7C9CFF] text-[#101318] shadow-md shadow-[#7C9CFF]/25 font-bold'
                      : 'text-[#9AA5B5] hover:text-[#F1F4F9] hover:bg-[#1D232D]'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </button>
              );
            })}
          </div>

          {/* Color & Stroke Width Palette */}
          {activeTool !== 'eraser' && (
            <div className="bg-[#171B22]/95 backdrop-blur-md border border-[#303744] rounded-xl p-2.5 shadow-xl space-y-2.5 w-44">
              {/* Colors */}
              <div>
                <span className="text-[10px] uppercase font-mono font-bold text-[#9AA5B5] block mb-1.5">
                  COLOR
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setStrokeColor(c.value)}
                      title={c.name}
                      className={`w-5 h-5 rounded-full transition-transform ${
                        strokeColor === c.value
                          ? 'scale-125 ring-2 ring-[#7C9CFF] ring-offset-2 ring-offset-[#171B22]'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Stroke Widths */}
              <div className="pt-2 border-t border-[#303744]">
                <span className="text-[10px] uppercase font-mono font-bold text-[#9AA5B5] block mb-1.5">
                  STROKE
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {STROKE_WIDTHS.map((sw) => (
                    <button
                      key={sw.value}
                      onClick={() => setStrokeWidth(sw.value)}
                      className={`py-1 rounded text-[10px] font-mono font-semibold transition-all ${
                        strokeWidth === sw.value
                          ? 'bg-[#1D232D] text-[#7C9CFF] border border-[#7C9CFF]/40'
                          : 'text-[#9AA5B5] hover:text-[#F1F4F9] hover:bg-[#1D232D]'
                      }`}
                    >
                      {sw.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Text Input Box */}
        {textInput && (
          <form
            onSubmit={handleTextSubmit}
            className="absolute z-30"
            style={{ left: textInput.x, top: textInput.y }}
          >
            <input
              type="text"
              autoFocus
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={handleTextSubmit}
              placeholder="Type text & press Enter..."
              className="bg-[#171B22] border-2 border-[#7C9CFF] text-[#F1F4F9] px-2 py-1 rounded text-sm outline-none shadow-2xl min-w-[200px]"
            />
          </form>
        )}
      </div>

      {/* Clear Canvas Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#171B22] border border-[#303744] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F1F4F9]">Clear Whiteboard?</h3>
                <p className="text-xs text-[#9AA5B5]">This will remove all drawings for everyone in the room.</p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#303744]">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#9AA5B5] hover:text-[#F1F4F9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
              >
                Yes, Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
