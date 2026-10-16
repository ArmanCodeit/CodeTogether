import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  MousePointer, 
  PenTool, 
  ArrowRight, 
  Square, 
  Circle, 
  Diamond, 
  Type, 
  StickyNote, 
  Eraser, 
  RotateCcw, 
  RotateCw, 
  Download, 
  Trash2, 
  Video, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Mic, 
  MicOff, 
  VideoOff, 
  Monitor, 
  Hand, 
  LogOut, 
  Code,
  X,
  Minimize2,
  Sparkles,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../hooks/useWebRTC';

export const WhiteboardView = ({ 
  currentRoom, 
  setCurrentTab, 
  onLeaveRoom 
}) => {
  const { user } = useAuth();
  const { socket, latency } = useSocket();
  const {
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleHandRaise,
  } = useWebRTC(currentRoom?.roomId);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Whiteboard Tools
  const [activeTool, setActiveTool] = useState('select'); // select, pen, arrow, rect, circle, diamond, text, sticky, eraser
  const [strokeColor, setStrokeColor] = useState('#38BDF8');
  const [strokeWidth, setStrokeWidth] = useState(3.0);
  const [fillPercent, setFillPercent] = useState('15%'); // '15%' or 'None'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Floating PIP Video
  const [showPip, setShowPip] = useState(true);
  const [pipMinimized, setPipMinimized] = useState(false);

  // Drawing state
  const [elements, setElements] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Title
  const [boardTitle, setBoardTitle] = useState('Cluster Architecture & WebRTC Signaling Flow v2');
  const [lastSaved, setLastSaved] = useState('2s ago');

  // Load initial elements matching Screenshot 4
  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const res = await fetch(`/api/rooms/${currentRoom?.roomId || 'arch-review-cluster'}/whiteboard`);
        if (res.ok) {
          const data = await res.json();
          if (data.whiteboard?.elements && data.whiteboard.elements.length > 0) {
            setElements(data.whiteboard.elements);
            if (data.whiteboard.title) setBoardTitle(data.whiteboard.title);
            return;
          }
        }
      } catch (err) {
        console.warn('Whiteboard fetch error:', err);
      }

      // Default Architecture Elements matching Screenshot 4
      const defaultElems = [
        {
          id: 'n-client',
          type: 'card',
          x: 240,
          y: 200,
          width: 220,
          height: 110,
          title: 'Next.js 14 WebRTC Client',
          badge: 'TS / React',
          desc: 'Active Peer Mesh: Full P2P RTC\nOperational Transform (OT) sync',
          color: '#38BDF8',
          fillColor: 'rgba(56, 189, 248, 0.12)'
        },
        {
          id: 'n-signal',
          type: 'card',
          x: 560,
          y: 190,
          width: 240,
          height: 130,
          title: 'Signaling Server',
          badge: 'WSS / Socket.IO',
          desc: 'Node.js clustered gateway handling\nroom state & SDP offer/answer.\n4 pods • Heartbeat: 1,000ms',
          color: '#10B981',
          fillColor: 'rgba(16, 185, 129, 0.12)'
        },
        {
          id: 'n-auth',
          type: 'diamond',
          x: 620,
          y: 380,
          width: 120,
          height: 90,
          title: 'Auth\nValid?',
          color: '#F59E0B',
          fillColor: 'rgba(245, 158, 11, 0.12)'
        },
        {
          id: 'n-relay',
          type: 'card',
          x: 560,
          y: 520,
          width: 240,
          height: 120,
          title: 'Coturn Media Relay',
          badge: 'STUN / TURN',
          desc: 'NAT traversal relay for strict corporate\nfirewalls and multi-cloud bridges.\n✓ SRTP Encryption Verified',
          color: '#06B6D4',
          fillColor: 'rgba(6, 182, 212, 0.12)'
        },
        {
          id: 'n-sticky',
          type: 'sticky',
          x: 240,
          y: 520,
          width: 230,
          height: 140,
          title: 'SYSTEM BOUNDARY #01',
          desc: 'Socket room maximum peer\ncapacity is strictly capped at 10\npeers for fully connected mesh\ntopology.\n\n— Sarah C.',
          color: '#FDE047',
          textColor: '#1E293B'
        },
        {
          id: 'n-sla',
          type: 'sticky',
          x: 880,
          y: 540,
          width: 220,
          height: 120,
          title: 'LATENCY SLA',
          desc: 'WebRTC ping budget < 45ms\nacross transatlantic regions.\nEnforce geolocated turn relays.\n\n— Platform Team',
          color: '#10B981',
          fillColor: 'rgba(16, 185, 129, 0.15)',
          textColor: '#E2E8F0'
        },
        {
          id: 'n-mesh-join',
          type: 'pill',
          x: 820,
          y: 410,
          width: 170,
          height: 38,
          title: 'Join Broadcast Mesh',
          badge: 'YES -> Grant',
          color: '#10B981'
        },
        {
          id: 'conn-1',
          type: 'arrow',
          startX: 460,
          startY: 255,
          endX: 560,
          endY: 255,
          label: 'WSS / Socket.IO',
          color: '#64748B'
        },
        {
          id: 'conn-2',
          type: 'arrow',
          startX: 680,
          startY: 320,
          endX: 680,
          endY: 380,
          color: '#F59E0B'
        },
        {
          id: 'conn-3',
          type: 'arrow',
          startX: 680,
          startY: 470,
          endX: 680,
          endY: 520,
          label: 'NO → 403 Forbidden',
          color: '#EF4444'
        },
        {
          id: 'conn-4',
          type: 'arrow',
          startX: 740,
          startY: 425,
          endX: 820,
          endY: 425,
          color: '#10B981'
        },
        {
          id: 'conn-5',
          type: 'curve',
          startX: 350,
          startY: 310,
          endX: 560,
          endY: 550,
          label: 'ICE Candidate Exchange',
          color: '#06B6D4'
        }
      ];

      setElements(defaultElems);
    };

    fetchBoard();
  }, [currentRoom]);

  // Redraw Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Apply Zoom & Pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Render Elements
    elements.forEach(elem => {
      ctx.save();

      if (elem.type === 'pen' && elem.points) {
        ctx.strokeStyle = elem.color || '#38BDF8';
        ctx.lineWidth = elem.width || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        elem.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (elem.type === 'card') {
        // High-tech architecture card
        ctx.fillStyle = elem.fillColor || 'rgba(56, 189, 248, 0.12)';
        ctx.strokeStyle = elem.color || '#38BDF8';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        ctx.roundRect(elem.x, elem.y, elem.width, elem.height, 10);
        ctx.fill();
        ctx.stroke();

        // Card header
        ctx.font = 'bold 13px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(elem.title, elem.x + 14, elem.y + 26);

        if (elem.badge) {
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = elem.color || '#38BDF8';
          ctx.fillText(elem.badge, elem.x + 14, elem.y + 42);
        }

        // Desc lines
        if (elem.desc) {
          ctx.font = '11px Plus Jakarta Sans, sans-serif';
          ctx.fillStyle = '#94A3B8';
          const lines = elem.desc.split('\n');
          lines.forEach((line, li) => {
            ctx.fillText(line, elem.x + 14, elem.y + 64 + (li * 16));
          });
        }
      } else if (elem.type === 'sticky') {
        // Sticky Note
        ctx.fillStyle = elem.fillColor || '#FDE047';
        ctx.beginPath();
        ctx.roundRect(elem.x, elem.y, elem.width, elem.height, 8);
        ctx.fill();

        ctx.font = 'bold 11px JetBrains Mono, monospace';
        ctx.fillStyle = elem.textColor || '#1E293B';
        ctx.fillText(elem.title, elem.x + 14, elem.y + 24);

        if (elem.desc) {
          ctx.font = '11px Plus Jakarta Sans, sans-serif';
          const lines = elem.desc.split('\n');
          lines.forEach((line, li) => {
            ctx.fillText(line, elem.x + 14, elem.y + 44 + (li * 15));
          });
        }
      } else if (elem.type === 'diamond') {
        // Decision Diamond
        const cx = elem.x + elem.width / 2;
        const cy = elem.y + elem.height / 2;

        ctx.fillStyle = elem.fillColor || 'rgba(245, 158, 11, 0.15)';
        ctx.strokeStyle = elem.color || '#F59E0B';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(cx, elem.y);
        ctx.lineTo(elem.x + elem.width, cy);
        ctx.lineTo(cx, elem.y + elem.height);
        ctx.lineTo(elem.x, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#F59E0B';
        ctx.textAlign = 'center';
        const lines = elem.title.split('\n');
        lines.forEach((l, i) => {
          ctx.fillText(l, cx, cy - 4 + (i * 16));
        });
      } else if (elem.type === 'pill') {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        ctx.strokeStyle = elem.color || '#10B981';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(elem.x, elem.y, elem.width, elem.height, 20);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'center';
        ctx.fillText(elem.title, elem.x + elem.width / 2, elem.y + 23);
      } else if (elem.type === 'arrow') {
        ctx.strokeStyle = elem.color || '#64748B';
        ctx.fillStyle = elem.color || '#64748B';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(elem.startX, elem.startY);
        ctx.lineTo(elem.endX, elem.endY);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(elem.endY - elem.startY, elem.endX - elem.startX);
        ctx.beginPath();
        ctx.moveTo(elem.endX, elem.endY);
        ctx.lineTo(elem.endX - 10 * Math.cos(angle - Math.PI / 6), elem.endY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(elem.endX - 10 * Math.cos(angle + Math.PI / 6), elem.endY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if (elem.label) {
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = elem.color || '#94A3B8';
          const midX = (elem.startX + elem.endX) / 2;
          const midY = (elem.startY + elem.endY) / 2;
          ctx.fillText(elem.label, midX - 30, midY - 6);
        }
      } else if (elem.type === 'curve') {
        ctx.strokeStyle = elem.color || '#06B6D4';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(elem.startX, elem.startY);
        const cpX = (elem.startX + elem.endX) / 2 - 40;
        const cpY = (elem.startY + elem.endY) / 2 + 30;
        ctx.quadraticCurveTo(cpX, cpY, elem.endX, elem.endY);
        ctx.stroke();
        ctx.setLineDash([]);

        if (elem.label) {
          ctx.font = '10px JetBrains Mono, monospace';
          ctx.fillStyle = elem.color || '#06B6D4';
          ctx.fillText(elem.label, cpX, cpY);
        }
      }

      ctx.restore();
    });

    // Draw active drawing path
    if (currentPath) {
      ctx.save();
      ctx.strokeStyle = currentPath.color;
      ctx.lineWidth = currentPath.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      currentPath.points.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [elements, currentPath, zoom, pan]);

  // Pointer Handlers
  const handlePointerDown = (e) => {
    // Space pan
    if (e.spaceKey || e.button === 1 || activeTool === 'select') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentPath({
        type: 'pen',
        points: [{ x, y }],
        color: strokeColor,
        width: strokeWidth,
      });
    } else if (activeTool === 'sticky') {
      const newSticky = {
        id: `sticky-${Date.now()}`,
        type: 'sticky',
        x,
        y,
        width: 180,
        height: 120,
        title: 'NOTE #' + (elements.length + 1),
        desc: 'Collaborative note\n— ' + (user?.name || 'Dev'),
        color: strokeColor,
        fillColor: strokeColor === '#38BDF8' ? 'rgba(56, 189, 248, 0.2)' : '#FDE047',
        textColor: '#1E293B'
      };
      setElements(prev => [...prev, newSticky]);
      setActiveTool('select');
      confetti({ particleCount: 15, spread: 30 });
    }
  };

  const handlePointerMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
      return;
    }

    if (isDrawing && currentPath) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setCurrentPath(prev => ({
        ...prev,
        points: [...prev.points, { x, y }],
      }));
    }
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isDrawing && currentPath) {
      setIsDrawing(false);
      const newElems = [...elements, currentPath];
      setElements(newElems);
      setUndoStack(prev => [...prev, elements]);
      setCurrentPath(null);

      // Save to server
      if (currentRoom) {
        fetch(`/api/rooms/${currentRoom.roomId}/whiteboard`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elements: newElems, title: boardTitle }),
        }).catch(err => console.warn(err));
      }
    }
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (confirm('Clear entire whiteboard canvas?')) {
      setUndoStack(prev => [...prev, elements]);
      setElements([]);
      if (socket && currentRoom) {
        socket.emit('whiteboard-clear', { roomId: currentRoom.roomId });
      }
    }
  };

  // Export as PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${boardTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    confetti({ particleCount: 30, spread: 50 });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090E] h-[calc(100vh-3.5rem)] overflow-hidden select-none relative">
      {/* Top Bar matching Screenshot 4 */}
      <div className="h-12 bg-[#0B0F17] border-b border-[#1E2638] px-4 flex items-center justify-between text-xs font-mono z-30">
        {/* Left: Return to IDE */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentTab('workspace')}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#141B28] hover:bg-[#1A2336] text-slate-200 border border-[#222E44] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-sans font-semibold">Return to IDE</span>
            <span className="text-sky-400 font-mono">auth-cluster.ts</span>
          </button>

          {/* Canvas Title & Session Badge */}
          <div className="flex items-center space-x-2">
            <span className="text-white font-bold font-sans text-sm">{boardTitle}</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold">
              LIVE SESSION
            </span>
          </div>
        </div>

        {/* Center: Autosave & Sync */}
        <div className="hidden md:flex items-center space-x-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Autosaved {lastSaved}</span>
          <span>•</span>
          <span className="text-sky-400">Mesh Sync Latency {latency || 14}ms</span>
        </div>

        {/* Right: Zoom controls, avatars, export, clear, PIP */}
        <div className="flex items-center space-x-3">
          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-[#121724] px-1.5 py-0.5 rounded-lg border border-[#222E44]">
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1 hover:text-white"><ZoomOut className="w-3 h-3" /></button>
            <span className="px-1 text-[11px] font-mono">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} className="p-1 hover:text-white"><ZoomIn className="w-3 h-3" /></button>
            <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="px-1 text-[10px] text-slate-400 hover:text-white">Fit</button>
          </div>

          {/* Participant Avatars */}
          <div className="flex -space-x-1.5">
            {['SC', 'MV', 'PP', 'AC'].map((av, i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 border border-[#0B0F17] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
                {av}
              </div>
            ))}
          </div>

          {/* Export & Clear */}
          <button
            onClick={handleExportPNG}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#161C2C] hover:bg-[#20283C] text-slate-200 border border-[#26324A] text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export</span>
          </button>

          <button
            onClick={handleClearCanvas}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {/* PIP Video toggle */}
          <button
            onClick={() => setShowPip(!showPip)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded border text-xs font-semibold transition-all ${
              showPip 
                ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20' 
                : 'bg-[#161C2C] text-slate-300 border-[#26324A]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>PIP Video</span>
          </button>
        </div>
      </div>

      {/* Canvas Workspace Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-crosshair canvas-grid"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full h-full block"
        />

        {/* Floating Left Toolbar matching Screenshot 4 */}
        <div className="absolute left-6 top-6 z-20 flex flex-col space-y-3">
          {/* Tool Selector Bar */}
          <div className="bg-[#101522]/95 backdrop-blur-md border border-[#222E44] rounded-xl p-1.5 shadow-2xl flex flex-col space-y-1">
            {[
              { id: 'select', icon: MousePointer, title: 'Select (V)' },
              { id: 'pen', icon: PenTool, title: 'Draw Pen (P)' },
              { id: 'arrow', icon: ArrowRight, title: 'Arrow (A)' },
              { id: 'rect', icon: Square, title: 'Rectangle (R)' },
              { id: 'circle', icon: Circle, title: 'Circle (O)' },
              { id: 'diamond', icon: Diamond, title: 'Diamond / Decision' },
              { id: 'text', icon: Type, title: 'Text (T)' },
              { id: 'sticky', icon: StickyNote, title: 'Sticky Note (S)' },
              { id: 'eraser', icon: Eraser, title: 'Eraser (E)' },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTool(t.id)}
                  title={t.title}
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-[#1A2336]'
                  }`}
                >
                  <Icon className="w-4 h-4 stroke-[2.2]" />
                </button>
              );
            })}

            <div className="border-t border-[#1E2638] my-1" />

            <button
              onClick={() => {
                if (undoStack.length > 0) {
                  const prev = undoStack[undoStack.length - 1];
                  setRedoStack(r => [...r, elements]);
                  setElements(prev);
                  setUndoStack(u => u.slice(0, -1));
                }
              }}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2336]"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                if (redoStack.length > 0) {
                  const next = redoStack[redoStack.length - 1];
                  setUndoStack(u => [...u, elements]);
                  setElements(next);
                  setRedoStack(r => r.slice(0, -1));
                }
              }}
              title="Redo (Ctrl+Y)"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2336]"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          {/* Stroke & Fill Sub-Palette */}
          <div className="bg-[#101522]/95 backdrop-blur-md border border-[#222E44] rounded-xl p-3 shadow-2xl space-y-3 w-48 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                STROKE PALETTE
              </span>
              <div className="flex items-center space-x-2">
                {[
                  { color: '#38BDF8', name: 'Cyan' },
                  { color: '#8B5CF6', name: 'Purple' },
                  { color: '#F59E0B', name: 'Yellow' },
                  { color: '#EC4899', name: 'Pink' },
                  { color: '#FFFFFF', name: 'White' },
                  { color: '#64748B', name: 'Slate' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setStrokeColor(c.color)}
                    className={`w-5 h-5 rounded-full transition-transform ${
                      strokeColor === c.color ? 'scale-125 ring-2 ring-sky-400 ring-offset-2 ring-offset-[#101522]' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: c.color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1E2638]">
              <span className="text-slate-400 text-[11px]">Weight</span>
              <div className="flex items-center space-x-1">
                {[1.5, 3.0, 6.0].map((w) => (
                  <button
                    key={w}
                    onClick={() => setStrokeWidth(w)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      strokeWidth === w ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:bg-[#1A2336]'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1E2638]">
              <span className="text-slate-400 text-[11px]">Fill</span>
              <div className="flex items-center space-x-1">
                {['15%', 'None'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFillPercent(f)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      fillPercent === f ? 'bg-sky-500 text-white font-bold' : 'text-slate-400 hover:bg-[#1A2336]'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Collaborator Cursor Tag (`You (Sarah)`) */}
        <div 
          className="absolute pointer-events-none z-20 flex items-center space-x-1"
          style={{ top: '420px', left: '560px' }}
        >
          <MousePointer className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="px-2 py-0.5 rounded bg-amber-500 text-[10px] font-mono font-bold text-slate-900 shadow-lg">
            You ({user?.name?.split(' ')[0] || 'Sarah'})
          </span>
        </div>

        {/* Floating Picture-in-Picture (PIP) Huddle Video Window */}
        {showPip && (
          <div className="absolute right-6 top-6 z-20 w-80 bg-[#101522]/95 backdrop-blur-md border border-[#222E44] rounded-xl shadow-2xl overflow-hidden transition-all">
            {/* Header */}
            <div className="h-8 bg-[#0C101A] border-b border-[#1E2638] px-3 flex items-center justify-between text-xs font-mono select-none">
              <div className="flex items-center space-x-1.5 text-slate-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HUDDLE • 4 ACTIVE</span>
              </div>
              <div className="flex items-center space-x-1 text-slate-400">
                <button onClick={() => setPipMinimized(!pipMinimized)} className="p-1 hover:text-white">
                  <Minimize2 className="w-3 h-3" />
                </button>
                <button onClick={() => setShowPip(false)} className="p-1 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Video content */}
            {!pipMinimized && (
              <div className="p-2 space-y-2">
                {/* Main host video tile */}
                <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-emerald-500/50 shadow-md">
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-indigo-950 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center font-bold text-white">
                      SC
                    </div>
                  </div>
                  <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white flex items-center gap-1 font-semibold">
                    <span>Sarah (Host)</span>
                    <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                </div>

                {/* Sub-tiles */}
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="relative rounded bg-slate-900 aspect-video flex items-center justify-center text-[9px] font-bold text-slate-300 border border-[#1E2638]">
                    Marcus
                  </div>
                  <div className="relative rounded bg-emerald-950/40 aspect-video flex items-center justify-center text-[9px] font-bold text-emerald-400 border border-emerald-500/30">
                    Priya
                  </div>
                  <div className="relative rounded bg-slate-900 aspect-video flex items-center justify-center text-[9px] font-bold text-sky-400 border border-[#1E2638]">
                    Alex
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mini-Map Bottom Right */}
        <div className="absolute right-6 bottom-16 z-20 w-36 h-24 bg-[#101522]/90 backdrop-blur-md border border-[#222E44] rounded-lg p-1 shadow-lg pointer-events-none hidden md:block">
          <div className="w-full h-full relative border border-[#1E2638] rounded bg-[#090C12]">
            <div className="absolute top-3 left-4 w-6 h-4 bg-sky-500/50 rounded-sm" />
            <div className="absolute top-3 right-6 w-8 h-4 bg-emerald-500/50 rounded-sm" />
            <div className="absolute bottom-4 left-4 w-7 h-5 bg-yellow-500/50 rounded-sm" />
            <div className="absolute bottom-3 right-5 w-8 h-4 bg-cyan-500/50 rounded-sm" />
            {/* Viewport frame */}
            <div className="absolute inset-1 border border-sky-400/60 rounded" />
          </div>
        </div>
      </div>

      {/* Bottom Status Bar matching Screenshot 4 */}
      <div className="h-12 bg-[#0B0F17] border-t border-[#1E2638] px-4 flex items-center justify-between text-xs font-mono z-30 select-none">
        {/* Left: Room Badge */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-slate-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Room #{currentRoom?.name || 'arch-review-cluster'}</span>
          </div>

          <div className="hidden lg:flex items-center space-x-3 text-slate-500 text-[11px]">
            <span>Hold Space + Drag to Pan</span>
            <span>•</span>
            <span><b className="text-slate-400">P</b> Pen</span>
            <span>•</span>
            <span><b className="text-slate-400">S</b> Sticky</span>
          </div>
        </div>

        {/* Center/Right: Media Controls & Switch to Code Editor */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-[#121724] p-1 rounded-xl border border-[#222E44]">
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg ${isMuted ? 'bg-rose-500/20 text-rose-400' : 'text-slate-300 hover:text-white'}`}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            <button
              onClick={toggleCamera}
              className={`p-1.5 rounded-lg ${isCameraOff ? 'bg-rose-500/20 text-rose-400' : 'text-slate-300 hover:text-white'}`}
            >
              {isCameraOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-sky-400" />}
            </button>

            <button
              onClick={toggleScreenShare}
              className={`p-1.5 rounded-lg ${isScreenSharing ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleHandRaise}
              className={`p-1.5 rounded-lg ${isHandRaised ? 'bg-amber-500/20 text-amber-400' : 'text-slate-300 hover:text-white'}`}
            >
              <Hand className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onLeaveRoom}
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Switch to Code Editor Button */}
          <button
            onClick={() => setCurrentTab('workspace')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs shadow-md shadow-sky-500/25 transition-all font-sans"
          >
            <Code className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Switch to Code Editor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
