import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { 
  FileCode, 
  Folder, 
  FolderOpen, 
  Plus, 
  RefreshCw, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  PenTool, 
  Users, 
  MessageSquare, 
  LogOut, 
  Play, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  RotateCw, 
  Settings, 
  Maximize2, 
  Send, 
  Smile, 
  Code, 
  Copy, 
  Check, 
  Crown,
  ChevronRight,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../hooks/useWebRTC';

const DEFAULT_AUTH_CODE = `import { RedisCluster, ClusterNode } from '@ioredis/cluster';
import { SignJWT, jwtVerify } from 'jose';
import type { SessionClaim, MeshPeer } from '../types';

// Distributed token rate limiter and WebRTC session ticket validator
export class AuthClusterMesh {
  private readonly cluster: RedisCluster;
  private readonly maxSlidingWindowMs: number = 60_000;
  private readonly sharedKeySecret: Uint8Array;

  constructor(nodes: ClusterNode[], rawSecret: string) {
    this.cluster = new RedisCluster(nodes, { enableReadyCheck: true });
    this.sharedKeySecret = new TextEncoder().encode(rawSecret);
  }

  public async verifySessionTicket(ticket: string): Promise<SessionClaim> {
    const { payload } = await jwtVerify(ticket, this.sharedKeySecret, {
      algorithms: ['HS512', 'EdDSA'],
    });
    return payload as unknown as SessionClaim;
  }

  /** Sliding-log throttle per remote client address */
  public async enforceRateLimit(peerIp: string, burstQuota: number): Promise<boolean> {
    const epochNow = Date.now();
    const bucketKey = \`ratelimit:\${peerIp}\`;
    const pipeline = this.cluster.pipeline();
    pipeline.zremrangebyscore(bucketKey, 0, epochNow - this.maxSlidingWindowMs);
    pipeline.zadd(bucketKey, epochNow, \`\${epochNow}-\${Math.random()}\`);
    pipeline.zcard(bucketKey);
    pipeline.expire(bucketKey, Math.ceil(this.maxSlidingWindowMs / 1000));
    
    const results = await pipeline.exec();
    const count = (results?.[2]?.[1] as number) || 0;
    return count <= burstQuota;
  }
}
`;

const INITIAL_FALLBACK_FILES = [
  { name: 'auth-cluster.ts', path: 'src/services/auth-cluster.ts', language: 'typescript', content: DEFAULT_AUTH_CODE },
  { name: 'index.ts', path: 'src/services/index.ts', language: 'typescript', content: `import { AuthClusterMesh } from './auth-cluster';\n\nexport const auth = new AuthClusterMesh([], 'secret');\n` },
  { name: 'types.d.ts', path: 'src/services/types.d.ts', language: 'typescript', content: `export interface SessionClaim { sub: string; exp: number; }\nexport interface MeshPeer { id: string; name: string; }\n` },
  { name: 'schema.prisma', path: 'schema.prisma', language: 'prisma', content: `datasource db { provider = "postgresql" url = env("DATABASE_URL") }\n` },
  { name: 'package.json', path: 'package.json', language: 'json', content: `{\n  "name": "cluster-mesh",\n  "version": "1.0.0"\n}\n` },
  { name: 'docker-compose.yml', path: 'docker-compose.yml', language: 'yaml', content: `version: '3.8'\nservices:\n  redis:\n    image: redis:7-alpine\n` },
];

export const WorkspaceView = ({ 
  currentRoom, 
  setCurrentTab, 
  onLeaveRoom,
  initialMediaState 
}) => {
  const { user } = useAuth();
  const { socket, latency } = useSocket();
  const {
    localStream,
    screenStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    initMedia
  } = useWebRTC(currentRoom?.roomId);

  // Active files and tabs
  const [files, setFiles] = useState(
    currentRoom?.files && currentRoom.files.length > 0 ? currentRoom.files : INITIAL_FALLBACK_FILES
  );
  const [activeFilePath, setActiveFilePath] = useState(
    currentRoom?.activeFile || 'src/services/auth-cluster.ts'
  );
  const [openTabs, setOpenTabs] = useState([
    'src/services/auth-cluster.ts',
    'src/services/index.ts',
    'src/services/types.d.ts'
  ]);

  // Code state
  const activeFile = files.find(f => f.path === activeFilePath) || files[0];
  const [codeContent, setCodeContent] = useState(activeFile?.content || DEFAULT_AUTH_CODE);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Synchronize when currentRoom updates with real backend files
  useEffect(() => {
    if (currentRoom?.files && currentRoom.files.length > 0) {
      setFiles(currentRoom.files);
      const active = currentRoom.activeFile || currentRoom.files[0].path;
      setActiveFilePath(active);
      const file = currentRoom.files.find(f => f.path === active) || currentRoom.files[0];
      if (file) setCodeContent(file.content);
    }
  }, [currentRoom]);

  // Collaborator presence / cursors
  const [collaboratorCursors, setCollaboratorCursors] = useState({
    priya: { line: 15, col: 2, name: 'Priya', color: '#10B981' }
  });

  // Bottom Console Drawer state
  const [consoleTab, setConsoleTab] = useState('console'); // console, tests, socket, problems
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState([
    { time: '14:48:02.112', type: 'info', text: 'INFO Cluster mesh handshake established with master node-02 (latency 14.2ms)' },
    { time: '14:48:02.190', type: 'info', text: 'ICE Candidate pair selected: host (127.0.0.1:5000)' },
    { time: '14:48:04.004', type: 'stream', text: 'STREAMS room/arch-review-cluster:editor-crdt' },
  ]);
  const [testResults, setTestResults] = useState([
    { name: 'AuthClusterMesh > verifies HMAC SHA-512 session ticket', time: '14ms', status: 'pass' },
    { name: 'AuthClusterMesh > enforces sliding window rate limit threshold', time: '8ms', status: 'pass' },
    { name: 'AuthClusterMesh > purges stale redis sliding log keys', time: '6ms', status: 'pass' }
  ]);

  // Right Panel: Videos & Chat
  const [rightPanelTab, setRightPanelTab] = useState('mesh'); // 'mesh' or 'chat'
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      senderName: 'Priya Patel',
      senderAvatar: 'PP',
      time: '14:46',
      text: 'Check the Redis client pooling logic on L24. We need auto-pipelining enabled for concurrent tickets.',
    },
    {
      id: '2',
      senderName: 'Marcus Vance',
      senderAvatar: 'MV',
      time: '14:47',
      text: 'Merged the token expiry fix. Running benchmark specs now with `npm test`.',
      codeSnippet: 'npm test',
    },
    {
      id: '3',
      senderName: user?.name || 'Sarah Connor',
      senderAvatar: user?.avatar || 'SC',
      isYou: true,
      time: '14:48',
      text: 'Looking good. I am locking down the sliding window budget to 60k ms.',
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  // File tree expanded folders
  const [openFolders, setOpenFolders] = useState({
    src: true,
    services: true,
  });

  // Initialize media on load
  useEffect(() => {
    initMedia(!initialMediaState?.isMuted, !initialMediaState?.isCameraOff);
  }, []);

  // Sync active file content
  useEffect(() => {
    if (activeFile) {
      setCodeContent(activeFile.content);
    }
  }, [activeFilePath, activeFile]);

  // Socket event listeners for real-time code and chat
  useEffect(() => {
    if (!socket) return;

    socket.on('code-update', ({ filePath, content, senderSocketId }) => {
      if (senderSocketId !== socket.id) {
        setFiles(prev => prev.map(f => f.path === filePath ? { ...f, content } : f));
        if (filePath === activeFilePath) {
          setCodeContent(content);
        }
      }
    });

    socket.on('cursor-update', ({ name, filePath, cursor }) => {
      if (filePath === activeFilePath && cursor) {
        setCollaboratorCursors(prev => ({
          ...prev,
          [name.toLowerCase()]: { line: cursor.lineNumber, col: cursor.column, name, color: '#10B981' }
        }));
      }
    });

    socket.on('new-chat-message', (msg) => {
      setChatMessages(prev => [...prev, {
        id: msg._id || Math.random().toString(),
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar,
        time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: msg.text,
        codeSnippet: msg.codeSnippet?.code,
        isYou: msg.senderId === (user?._id || user?.id),
      }]);
    });

    socket.on('test-run-output', ({ logs }) => {
      setConsoleLogs(prev => [...prev, ...logs]);
      setConsoleTab('tests');
      confetti({ particleCount: 25, spread: 45 });
    });

    return () => {
      socket.off('code-update');
      socket.off('cursor-update');
      socket.off('new-chat-message');
      socket.off('test-run-output');
    };
  }, [socket, activeFilePath, user]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, rightPanelTab]);

  // Handle Code Change in Monaco
  const handleEditorChange = (newContent) => {
    setCodeContent(newContent);
    // Update local file
    setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, content: newContent } : f));
    // Emit to peers
    if (socket && currentRoom) {
      socket.emit('code-change', {
        roomId: currentRoom.roomId,
        filePath: activeFilePath,
        content: newContent,
      });
    }
  };

  // Handle Monaco Mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    if (codeContent) {
      editor.setValue(codeContent);
    }

    // Listen to cursor changes
    editor.onDidChangeCursorPosition((e) => {
      if (socket && currentRoom) {
        socket.emit('cursor-move', {
          roomId: currentRoom.roomId,
          filePath: activeFilePath,
          cursor: { lineNumber: e.position.lineNumber, column: e.position.column },
        });
      }
    });
  };

  // Run Tests Handler
  const handleRunTests = () => {
    if (socket && currentRoom) {
      socket.emit('run-tests', { roomId: currentRoom.roomId });
    }
    setConsoleTab('tests');
  };

  // Format Code
  const handleFormatCode = () => {
    editorRef.current?.getAction('editor.action.formatDocument')?.run();
    confetti({ particleCount: 15, spread: 40 });
  };

  // Send Chat Message
  const handleSendChat = (e) => {
    e?.preventDefault();
    if (!chatInput.trim()) return;

    if (socket && currentRoom) {
      socket.emit('send-chat-message', {
        roomId: currentRoom.roomId,
        text: chatInput.trim(),
      });
    } else {
      // Local fallback
      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        senderName: user?.name || 'Sarah Connor',
        senderAvatar: user?.avatar || 'SC',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: chatInput.trim(),
        isYou: true,
      }]);
    }
    setChatInput('');
  };

  // Tab switching
  const handleSelectTab = (path) => {
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
    setActiveFilePath(path);
  };

  const closeTab = (path, e) => {
    e.stopPropagation();
    const filtered = openTabs.filter(p => p !== path);
    setOpenTabs(filtered);
    if (activeFilePath === path && filtered.length > 0) {
      setActiveFilePath(filtered[filtered.length - 1]);
    }
  };

  const activePeers = [
    { name: 'Sarah Connor', role: 'Host', isHost: true, avatar: 'SC', mic: !isMuted, status: 'Host' },
    { name: 'Marcus Vance', role: 'peer', avatar: 'MV', mic: true, status: 'Active' },
    { name: 'Priya Patel', role: 'peer', avatar: 'PP', mic: false, status: 'Viewing Selection' },
    { name: 'Alex Chen', role: 'peer', avatar: 'AC', mic: true, isScreen: true, status: 'Sharing canvas' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[#0A0D14] h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Main Workspace Body: 3-column split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Breadcrumb, Live Mesh list, File Tree, Media actions, Console */}
        <div className="w-72 bg-[#0C101A] border-r border-[#1E2638] flex flex-col justify-between shrink-0 select-none">
          {/* Top Section */}
          <div className="flex-1 overflow-y-auto">
            {/* Breadcrumb */}
            <div className="px-3.5 py-2 border-b border-[#1A2234] text-[11px] font-mono text-slate-400 flex items-center space-x-1.5 truncate">
              <span className="text-slate-500">src</span>
              <span>/</span>
              <span className="text-slate-500">services</span>
              <span>/</span>
              <span className="text-sky-400 font-semibold">{activeFile?.name || 'auth-cluster.ts'}</span>
            </div>

            {/* LIVE MESH (4/10) */}
            <div className="p-3 border-b border-[#1A2234]">
              <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                <span className="text-slate-400 flex items-center gap-1.5 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE MESH ({activePeers.length}/10)
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </div>

              {/* Peers list */}
              <div className="space-y-1.5">
                {activePeers.map((peer, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-[#111724] border border-[#1A2336] text-xs">
                    <div className="flex items-center space-x-2 truncate">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                        {peer.avatar}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-slate-200 text-xs truncate">{peer.name}</span>
                          {peer.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono leading-none">
                          {peer.status}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-1">
                      {peer.isScreen && <Monitor className="w-3 h-3 text-sky-400" />}
                      {peer.mic ? (
                        <Mic className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3 h-3 text-rose-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PROJECT ROOT File Tree */}
            <div className="p-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 uppercase font-semibold mb-2">
                <span>PROJECT ROOT</span>
                <div className="flex items-center space-x-1 text-slate-500">
                  <button 
                    onClick={() => {
                      const name = prompt('Enter new file name: (e.g. redis-cache.ts)');
                      if (name) {
                        const newF = { name, path: `src/services/${name}`, language: 'typescript', content: `// ${name}\n` };
                        setFiles([...files, newF]);
                        setOpenTabs([...openTabs, newF.path]);
                        setActiveFilePath(newF.path);
                      }
                    }} 
                    title="Add file" 
                    className="p-1 hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button title="Refresh" className="p-1 hover:text-white"><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              {/* Tree files */}
              <div className="space-y-1 text-xs font-mono">
                {/* src folder */}
                <div>
                  <div 
                    onClick={() => setOpenFolders(p => ({ ...p, src: !p.src }))}
                    className="flex items-center space-x-1.5 py-1 px-1 rounded text-slate-300 hover:bg-[#141B2A] cursor-pointer"
                  >
                    {openFolders.src ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                    <Folder className="w-3.5 h-3.5 text-amber-400" />
                    <span>src</span>
                  </div>

                  {openFolders.src && (
                    <div className="pl-4 space-y-1">
                      {/* services folder */}
                      <div 
                        onClick={() => setOpenFolders(p => ({ ...p, services: !p.services }))}
                        className="flex items-center space-x-1.5 py-1 px-1 rounded text-slate-300 hover:bg-[#141B2A] cursor-pointer"
                      >
                        {openFolders.services ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                        <span>services</span>
                      </div>

                      {openFolders.services && (
                        <div className="pl-4 space-y-0.5">
                          {files.filter(f => f.path.startsWith('src/services/')).map(f => (
                            <div
                              key={f.path}
                              onClick={() => handleSelectTab(f.path)}
                              className={`flex items-center justify-between py-1 px-2 rounded cursor-pointer transition-colors ${
                                activeFilePath === f.path
                                  ? 'bg-[#182338] text-white font-semibold'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#111724]'
                              }`}
                            >
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className="text-[10px] font-bold text-sky-400">TS</span>
                                <span className="truncate">{f.name}</span>
                              </div>
                              {activeFilePath === f.path && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Root files */}
                {files.filter(f => !f.path.startsWith('src/')).map(f => (
                  <div
                    key={f.path}
                    onClick={() => handleSelectTab(f.path)}
                    className={`flex items-center space-x-1.5 py-1 px-2 rounded cursor-pointer transition-colors ${
                      activeFilePath === f.path
                        ? 'bg-[#182338] text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#111724]'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Dock: Room Checkpoint + Quick Media Controls */}
          <div className="border-t border-[#1E2638] bg-[#0A0D14] p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>ROOM CHECKPOINT</span>
              <span className="text-emerald-400 font-bold">V0.8.2</span>
            </div>

            {/* Quick Media Action Bar */}
            <div className="flex items-center justify-between bg-[#111724] border border-[#1E2638] p-1.5 rounded-xl">
              <button
                onClick={toggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
                className={`p-1.5 rounded-lg transition-colors ${isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-[#182032] text-slate-300 hover:text-white'}`}
              >
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleCamera}
                title={isCameraOff ? 'Start Camera' : 'Stop Camera'}
                className={`p-1.5 rounded-lg transition-colors ${isCameraOff ? 'bg-rose-500/20 text-rose-400' : 'bg-[#182032] text-slate-300 hover:text-white'}`}
              >
                {isCameraOff ? <VideoOff className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleScreenShare}
                title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                className={`p-1.5 rounded-lg transition-colors ${isScreenSharing ? 'bg-sky-500 text-white' : 'bg-[#182032] text-slate-300 hover:text-white'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>

              {/* Doodle Board Syncing Button */}
              <button
                onClick={() => setCurrentTab('whiteboard')}
                title="Switch to Doodle Board"
                className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-mono font-semibold hover:bg-sky-500/20 transition-colors"
              >
                <PenTool className="w-3 h-3" />
                <span>Doodle Board</span>
                <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
              </button>

              {/* Leave Room Red Button */}
              <button
                onClick={onLeaveRoom}
                title="Leave Room"
                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Monaco Editor Panel */}
        <div className="flex-1 flex flex-col bg-[#0F1420] overflow-hidden">
          {/* Top File Tabs Bar */}
          <div className="h-10 bg-[#0B0F17] border-b border-[#1E2638] flex items-center justify-between px-2 select-none">
            <div className="flex items-center space-x-1 overflow-x-auto h-full">
              {openTabs.map((path) => {
                const name = path.split('/').pop();
                const isActive = activeFilePath === path;
                return (
                  <div
                    key={path}
                    onClick={() => setActiveFilePath(path)}
                    className={`h-full flex items-center space-x-2 px-3 border-r border-[#1E2638] text-xs font-mono cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#0F1420] text-sky-400 border-t-2 border-t-sky-400 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#111724]'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-sky-400">TS</span>
                    <span>{name}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                  </div>
                );
              })}

              <button
                onClick={() => {
                  const name = prompt('New tab filename:');
                  if (name) {
                    const newPath = `src/services/${name}`;
                    setFiles([...files, { name, path: newPath, content: `// ${name}\n` }]);
                    setOpenTabs([...openTabs, newPath]);
                    setActiveFilePath(newPath);
                  }
                }}
                className="p-1.5 text-slate-500 hover:text-slate-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Actions Right of Tabs */}
            <div className="flex items-center space-x-2 text-xs font-mono">
              <span className="text-slate-400 text-[11px] hidden lg:inline">
                Synced with Socket.IO stream
              </span>
              <span className="text-sky-400 text-[11px]">{latency}ms</span>
              <span className="text-emerald-400 text-[11px]">main • clean</span>
            </div>
          </div>

          {/* Sub-toolbar */}
          <div className="h-9 bg-[#111724] border-b border-[#1E2638] px-3 flex items-center justify-between text-xs select-none">
            <div className="flex items-center space-x-3">
              <select 
                value={activeFile?.language || 'typescript'}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setFiles(prev => prev.map(f => f.path === activeFilePath ? { ...f, language: newLang } : f));
                }}
                className="bg-[#0B0F17] border border-[#222E44] text-sky-400 rounded px-2 py-0.5 text-xs font-mono outline-none"
              >
                <option value="typescript">TypeScript v5.4</option>
                <option value="javascript">JavaScript ES2024</option>
                <option value="python">Python 3.12</option>
                <option value="go">Go 1.22</option>
                <option value="rust">Rust 1.78</option>
              </select>

              <button
                onClick={handleFormatCode}
                className="px-2 py-0.5 rounded hover:bg-[#1A2336] text-slate-300 font-medium transition-colors"
              >
                Format
              </button>

              <button
                onClick={handleRunTests}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-xs shadow-sm transition-all"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>Run Tests</span>
                <span className="text-[10px] font-mono opacity-80">⌘↵</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 text-slate-400">
              <button onClick={() => editorRef.current?.trigger('', 'undo')} title="Undo" className="p-1 hover:text-white"><RotateCcw className="w-3.5 h-3.5" /></button>
              <button onClick={() => editorRef.current?.trigger('', 'redo')} title="Redo" className="p-1 hover:text-white"><RotateCw className="w-3.5 h-3.5" /></button>
              <button onClick={() => alert('Editor Settings: Monaco 0.46, JetBrains Mono font, 14px')} title="Settings" className="p-1 hover:text-white"><Settings className="w-3.5 h-3.5" /></button>
              <button onClick={() => setIsConsoleExpanded(!isConsoleExpanded)} title="Toggle Console" className="p-1 hover:text-white"><Maximize2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              path={activeFilePath}
              defaultLanguage="typescript"
              defaultValue={DEFAULT_AUTH_CODE}
              language={activeFile?.language || 'typescript'}
              theme="vs-dark"
              value={codeContent}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              options={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13.5,
                lineHeight: 22,
                minimap: { enabled: true, side: 'right' },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                formatOnPaste: true,
                suggestOnTriggerCharacters: true,
              }}
            />

            {/* Collaborator Cursor Badge (Priya Patel on L15) */}
            <div 
              className="absolute pointer-events-none z-20 flex items-center space-x-1 transition-all duration-300"
              style={{ top: '320px', left: '160px' }}
            >
              <div className="w-0.5 h-5 bg-emerald-400 animate-pulse" />
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[10px] font-mono font-bold text-slate-900 shadow-md">
                Priya
              </span>
            </div>
          </div>

          {/* Bottom Drawer: Console & Test Runner */}
          {isConsoleExpanded && (
            <div className="h-44 bg-[#0B0F17] border-t border-[#1E2638] flex flex-col font-mono text-xs">
              {/* Drawer Tabs */}
              <div className="h-8 bg-[#0D121D] border-b border-[#1E2638] px-3 flex items-center justify-between select-none">
                <div className="flex items-center space-x-2">
                  {[
                    { id: 'console', label: 'Console (Node.js v20.11)', icon: Terminal },
                    { id: 'tests', label: 'Test Runner (3 passed)', icon: CheckCircle2, color: 'text-emerald-400' },
                    { id: 'socket', label: 'Socket.IO Events', icon: Layers },
                    { id: 'problems', label: 'Problems (0)', icon: AlertCircle },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isActive = consoleTab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setConsoleTab(t.id)}
                        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-[11px] transition-colors ${
                          isActive
                            ? 'bg-[#182032] text-white font-semibold border-b-2 border-sky-400'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${t.color || 'text-slate-400'}`} />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500">
                  Latency: <span className="text-emerald-400 font-bold">{latency}ms</span>
                </div>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 p-3 overflow-y-auto space-y-1 text-[11px]">
                {consoleTab === 'console' && (
                  <>
                    {consoleLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start space-x-2 leading-relaxed">
                        <span className="text-emerald-400">[{log.time}]</span>
                        <span className="text-slate-300">{log.text}</span>
                      </div>
                    ))}
                  </>
                )}

                {consoleTab === 'tests' && (
                  <div className="space-y-1.5">
                    <div className="text-emerald-400 font-bold">
                      PASS src/services/auth-cluster.test.ts (3 passed)
                    </div>
                    {testResults.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between text-slate-300 pl-4">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {t.name}
                        </span>
                        <span className="text-slate-500">{t.time}</span>
                      </div>
                    ))}
                    <div className="pt-1 text-slate-400 text-[10px]">
                      Test Suites: 1 passed, 1 total • Snapshots: 0 total • Time: 0.842s
                    </div>
                  </div>
                )}

                {consoleTab === 'socket' && (
                  <div className="space-y-1 text-slate-400">
                    <div>[SOCKET] Connected with ID: {socket?.id || 'demo-client-socket-42'}</div>
                    <div>[SOCKET] Subscribed to rooms: arch-review-cluster, feat/cluster-sync</div>
                    <div>[SOCKET] Transport: websocket • Encryption: TLSv1.3</div>
                  </div>
                )}

                {consoleTab === 'problems' && (
                  <div className="text-slate-500 py-2">No problems detected in workspace.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Video Mesh & Chat */}
        <div className="w-80 bg-[#0C101A] border-l border-[#1E2638] flex flex-col justify-between shrink-0 select-none">
          {/* Top Tabs */}
          <div className="h-10 bg-[#0B0F17] border-b border-[#1E2638] flex items-center justify-between px-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setRightPanelTab('mesh')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  rightPanelTab === 'mesh'
                    ? 'bg-[#182032] text-white border border-[#26324A]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <VideoIcon className="w-3.5 h-3.5 text-sky-400" />
                <span>Mesh Video (4)</span>
              </button>

              <button
                onClick={() => setRightPanelTab('chat')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                  rightPanelTab === 'chat'
                    ? 'bg-[#182032] text-white border border-[#26324A]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Chat ({chatMessages.length})</span>
              </button>
            </div>

            <button
              onClick={() => setCurrentTab('sessions')}
              title="Expand to Full Active Calls Grid"
              className="p-1 text-slate-500 hover:text-slate-300"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Panel Body */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mesh Video Tiles (Top half of right column or toggleable) */}
            <div className="p-3 border-b border-[#1E2638] bg-[#0A0D14]">
              <div className="grid grid-cols-2 gap-2">
                {/* Tile 1: Sarah (Host) */}
                <div className="relative rounded-lg overflow-hidden bg-[#121622] border border-emerald-500/50 aspect-video flex items-center justify-center group shadow-sm">
                  {/* Real video if local stream available or simulated webcam feed */}
                  <div className="w-full h-full bg-gradient-to-br from-slate-800 to-indigo-950 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                      SC
                    </div>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1">
                    <span>Sarah (Host)</span>
                    <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                </div>

                {/* Tile 2: Marcus Vance */}
                <div className="relative rounded-lg overflow-hidden bg-[#121622] border border-[#1E2638] aspect-video flex items-center justify-center">
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-xs">
                      MV
                    </div>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1">
                    <span>Marcus Vance</span>
                    <Mic className="w-2.5 h-2.5 text-emerald-400" />
                  </div>
                </div>

                {/* Tile 3: Priya Patel (Audio only) */}
                <div className="relative rounded-lg overflow-hidden bg-[#121622] border border-[#1E2638] aspect-video flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xs">
                    PP
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-slate-300 font-medium flex items-center gap-1">
                    <span>Priya Patel</span>
                    <MicOff className="w-2.5 h-2.5 text-rose-400" />
                  </div>
                  <span className="absolute top-1 right-1 text-[8px] font-mono px-1 rounded bg-black/50 text-slate-400">
                    AUDIO ONLY
                  </span>
                </div>

                {/* Tile 4: Alex's Screen */}
                <div className="relative rounded-lg overflow-hidden bg-[#121622] border border-sky-500/40 aspect-video flex items-center justify-center">
                  <div className="w-full h-full bg-[#080B12] p-2 flex flex-col justify-center text-[8px] font-mono text-sky-400 leading-tight">
                    <span className="text-slate-500">// DISPLAY 2</span>
                    <span>mesh.subscribe(quorums)</span>
                    <span className="text-emerald-400">READY (4 nodes)</span>
                  </div>
                  <div className="absolute top-1 left-1 bg-sky-500 text-slate-900 font-bold px-1 rounded text-[8px] font-mono">
                    SCREEN
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                    Alex's Screen
                  </div>
                </div>
              </div>
            </div>

            {/* Room Chat Section */}
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0A0D14]">
              {/* Chat Stream Header */}
              <div className="px-3 py-1.5 border-b border-[#1E2638] flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="text-slate-300 font-semibold">#CLUSTER-SYNC-STREAM</span>
                <span className="text-sky-400">3 New</span>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-semibold text-slate-200">{msg.senderName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
                      {msg.isYou && (
                        <span className="text-[9px] font-mono px-1 rounded bg-sky-500/10 text-sky-400">
                          You
                        </span>
                      )}
                    </div>
                    <div className={`p-2.5 rounded-lg text-xs leading-relaxed ${
                      msg.isYou 
                        ? 'bg-[#1E293B] text-slate-100 border border-sky-500/20' 
                        : 'bg-[#121724] text-slate-300 border border-[#1A2234]'
                    }`}>
                      {msg.text}
                      {msg.codeSnippet && (
                        <div className="mt-1.5 p-1.5 rounded bg-[#090C12] border border-[#1E2638] font-mono text-[11px] text-sky-400 flex items-center justify-between">
                          <code>{msg.codeSnippet}</code>
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.codeSnippet)} 
                            title="Copy snippet" 
                            className="text-slate-500 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChat} className="p-2 border-t border-[#1E2638] bg-[#0E131F]">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Message room or paste code..."
                    className="w-full bg-[#080B12] border border-[#1E2638] focus:border-sky-500 rounded-lg pl-3 pr-20 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <div className="absolute right-2 top-2 flex items-center space-x-1.5 text-slate-400">
                    <button
                      type="button"
                      onClick={() => setChatInput(p => p + ' `npm test`')}
                      title="Insert code snippet"
                      className="hover:text-sky-400"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatInput(p => p + ' 🚀')}
                      title="Insert emoji"
                      className="hover:text-amber-400"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="submit"
                      className="p-1 rounded bg-sky-500 text-white hover:bg-sky-400 transition-colors"
                    >
                      <Send className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
