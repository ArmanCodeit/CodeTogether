import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { Awareness } from 'y-protocols/awareness';
import {
  Code2,
  PenTool,
  Copy,
  Check,
  LogOut,
  Plus,
  Trash2,
  FileCode,
  Users,
  Mic,
  MicOff,
  VideoOff,
  Crown,
  Play,
  Eye,
  Loader2,
  Terminal as TerminalIcon,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import { WhiteboardView } from '../whiteboard/WhiteboardView';
import { VideoCallPanel } from '../calls/VideoCallPanel';

const SUPPORTED_LANGUAGES = [
  { id: 'c', name: 'C', ext: '.c', monacoLanguage: 'c' },
  { id: 'cpp', name: 'C++', ext: '.cpp', monacoLanguage: 'cpp' },
  { id: 'java', name: 'Java', ext: '.java', monacoLanguage: 'java' },
  { id: 'javascript', name: 'JavaScript', ext: '.js', monacoLanguage: 'javascript' },
  { id: 'typescript', name: 'TypeScript', ext: '.ts', monacoLanguage: 'typescript' },
  { id: 'python', name: 'Python', ext: '.py', monacoLanguage: 'python' },
  { id: 'html', name: 'HTML', ext: '.html', monacoLanguage: 'html' },
  { id: 'css', name: 'CSS', ext: '.css', monacoLanguage: 'css' },
];

const getLangObj = (langIdentifier) => {
  if (!langIdentifier) return SUPPORTED_LANGUAGES[3];
  const lower = langIdentifier.toLowerCase().trim();
  return (
    SUPPORTED_LANGUAGES.find(
      (l) => l.id === lower || l.name.toLowerCase() === lower || l.monacoLanguage === lower
    ) || SUPPORTED_LANGUAGES[3]
  );
};

export const WorkspaceView = ({
  currentRoom,
  currentUser,
  onLeaveRoom,
}) => {
  const { socket, activePeers } = useSocket();
  const roomId = currentRoom?.roomId;

  // View mode: 'code' | 'whiteboard'
  const [viewMode, setViewMode] = useState('code');

  // Single Source of Truth for Selected Language
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const initial = currentRoom?.language || currentRoom?.files?.[0]?.language || 'javascript';
    return getLangObj(initial).id;
  });

  // Confirmation dialog for language change with clearing
  const [pendingLangChange, setPendingLangChange] = useState(null);

  // Room files & active file
  const [files, setFiles] = useState(currentRoom?.files || []);
  const [activeFilePath, setActiveFilePath] = useState(
    currentRoom?.activeFile || currentRoom?.files?.[0]?.path || 'main.js'
  );

  // New file inline input
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  // Invitation copy feedback
  const [copiedLink, setCopiedLink] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving'

  // Video panel collapse state
  const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);

  // --- Execution & Console Output State ---
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [htmlPreviewDoc, setHtmlPreviewDoc] = useState('');

  // Monaco and Yjs refs
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const ydocRef = useRef(null);
  const bindingRef = useRef(null);
  const awarenessRef = useRef(null);

  // WebRTC Call Hook
  const {
    localStream,
    peerStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    inCall,
    callError,
    startCall,
    leaveCall,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
  } = useWebRTC(roomId);

  const activeFile = files.find((f) => f.path === activeFilePath) || files[0] || {
    name: 'main.js',
    path: 'main.js',
    language: 'javascript',
    content: '',
  };

  const currentLangObj = getLangObj(selectedLanguage);

  // Synchronize language state if currentRoom updates from outside
  useEffect(() => {
    if (currentRoom?.language) {
      const matched = getLangObj(currentRoom.language);
      setSelectedLanguage(matched.id);
    }
    if (currentRoom?.files && currentRoom.files.length > 0) {
      setFiles(currentRoom.files);
      if (!activeFilePath || !currentRoom.files.some((f) => f.path === activeFilePath)) {
        setActiveFilePath(currentRoom.activeFile || currentRoom.files[0].path);
      }
    }
  }, [currentRoom]);

  // Setup Yjs binding to Monaco Editor
  const setupYjsBinding = useCallback((editor, monaco, filePath, initialContent) => {
    if (!editor || !monaco) return;

    // Destroy existing binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    if (ydocRef.current) {
      ydocRef.current.destroy();
    }

    const doc = new Y.Doc();
    ydocRef.current = doc;

    const awareness = new Awareness(doc);
    awarenessRef.current = awareness;
    awareness.setLocalStateField('user', {
      name: currentUser?.name || 'Developer',
      color: '#7C9CFF',
    });

    const model = editor.getModel();
    if (!model) return;

    const yText = doc.getText('monaco');
    const binding = new MonacoBinding(yText, model, new Set([editor]), awareness);
    bindingRef.current = binding;

    // Request full CRDT state from server for this file
    if (socket && roomId) {
      socket.emit('yjs-request-init', {
        roomId,
        filePath,
        defaultContent: initialContent || '',
      });
    }

    // Listen to local doc updates and broadcast
    doc.on('update', (update, origin) => {
      if (origin !== 'socket' && origin !== 'server-init') {
        setSaveStatus('saving');
        if (socket && roomId) {
          socket.emit('yjs-update', {
            roomId,
            filePath,
            update: Array.from(update),
          });
        }
        setTimeout(() => setSaveStatus('saved'), 600);
      }
    });
  }, [socket, roomId, currentUser]);

  // Monaco Mount Handler
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set initial model language
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, currentLangObj.monacoLanguage);
    }

    setupYjsBinding(editor, monaco, activeFilePath, activeFile.content);

    // Track cursor for collaborator cursor updates
    editor.onDidChangeCursorPosition((e) => {
      if (socket && roomId) {
        socket.emit('cursor-move', {
          roomId,
          filePath: activeFilePath,
          cursor: { lineNumber: e.position.lineNumber, column: e.position.column },
        });
      }
    });
  };

  // Re-bind Yjs when active file changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeFilePath) {
      setupYjsBinding(
        editorRef.current,
        monacoRef.current,
        activeFilePath,
        activeFile.content
      );
    }
  }, [activeFilePath]);

  // Socket listeners for Yjs, files, language changes
  useEffect(() => {
    if (!socket) return;

    const handleYjsInit = ({ filePath, state, content }) => {
      if (filePath === activeFilePath && ydocRef.current && state) {
        Y.applyUpdate(ydocRef.current, new Uint8Array(state), 'server-init');
        setSaveStatus('saved');
      }
    };

    const handleYjsUpdate = ({ filePath, update, senderSocketId }) => {
      if (filePath === activeFilePath && ydocRef.current && update && senderSocketId !== socket.id) {
        Y.applyUpdate(ydocRef.current, new Uint8Array(update), 'socket');
      }
    };

    const handleFilesUpdated = ({ files: updatedFiles, activeFile: newActive }) => {
      if (Array.isArray(updatedFiles)) {
        setFiles(updatedFiles);
        if (newActive && newActive !== activeFilePath) {
          setActiveFilePath(newActive);
        }
      }
    };

    const handleLanguageUpdated = ({ language, files: updatedFiles, activeFile: newActive, clearContent }) => {
      const langObj = getLangObj(language);
      setSelectedLanguage(langObj.id);

      if (Array.isArray(updatedFiles)) {
        setFiles(updatedFiles);
      }
      if (newActive) {
        setActiveFilePath(newActive);
      }

      // Update Monaco model language
      if (editorRef.current && monacoRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelLanguage(model, langObj.monacoLanguage);
        }
        if (clearContent) {
          editorRef.current.setValue('');
        }
      }

      // Clear Yjs document text
      if (clearContent && ydocRef.current) {
        const ytext = ydocRef.current.getText('monaco');
        if (ytext.length > 0) {
          ydocRef.current.transact(() => {
            ytext.delete(0, ytext.length);
          });
        }
      }
    };

    socket.on('yjs-init', handleYjsInit);
    socket.on('yjs-update', handleYjsUpdate);
    socket.on('files-updated', handleFilesUpdated);
    socket.on('language-updated', handleLanguageUpdated);

    return () => {
      socket.off('yjs-init', handleYjsInit);
      socket.off('yjs-update', handleYjsUpdate);
      socket.off('files-updated', handleFilesUpdated);
      socket.off('language-updated', handleLanguageUpdated);
    };
  }, [socket, activeFilePath]);

  // Request Language Change (prompts confirmation if editor contains unsaved code)
  const handleLanguageChangeRequest = (e) => {
    const targetLangId = e.target.value;
    if (targetLangId === selectedLanguage) return;

    const currentText = editorRef.current ? editorRef.current.getValue() : '';
    if (currentText && currentText.trim().length > 0) {
      setPendingLangChange(targetLangId);
    } else {
      applyLanguageChange(targetLangId);
    }
  };

  // Perform Language Change & Clear Document
  const applyLanguageChange = (targetLangId) => {
    const langObj = getLangObj(targetLangId);
    setSelectedLanguage(langObj.id);

    // 1. Immediately clear Monaco Editor & update language mode
    if (editorRef.current) {
      editorRef.current.setValue('');
      if (monacoRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelLanguage(model, langObj.monacoLanguage);
        }
      }
    }

    // 2. Clear Yjs doc text
    if (ydocRef.current) {
      const ytext = ydocRef.current.getText('monaco');
      if (ytext.length > 0) {
        ydocRef.current.transact(() => {
          ytext.delete(0, ytext.length);
        });
      }
    }

    // 3. Rename active file extension
    let newFileName;
    if (langObj.id === 'java') {
      newFileName = 'Main.java';
    } else if (langObj.id === 'html') {
      newFileName = 'index.html';
    } else if (langObj.id === 'css') {
      newFileName = 'styles.css';
    } else {
      const baseName = activeFile.name.substring(0, activeFile.name.lastIndexOf('.')) || 'main';
      newFileName = `${baseName}${langObj.ext}`;
    }

    const updatedFiles = files.map((f) => {
      if (f.path === activeFilePath) {
        return {
          ...f,
          name: newFileName,
          path: newFileName,
          language: langObj.monacoLanguage,
          content: '',
        };
      }
      return f;
    });

    setFiles(updatedFiles);
    setActiveFilePath(newFileName);
    setExecutionResult(null);

    // 4. Broadcast to room via socket with clearContent: true
    if (socket && roomId) {
      socket.emit('language-change', {
        roomId,
        language: langObj.id,
        filePath: activeFilePath,
        newPath: newFileName,
        clearContent: true,
      });
    }

    // 5. Persist cleared state to DB
    fetch(`/api/rooms/${roomId}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: updatedFiles,
        activeFile: newFileName,
        language: langObj.name,
      }),
    }).catch(console.warn);

    setPendingLangChange(null);
  };

  // --- Real Code Execution & Live Preview ---
  const handleRunOrPreview = async () => {
    const currentCode = editorRef.current ? editorRef.current.getValue() : activeFile.content || '';

    // Handle HTML & CSS Live Preview
    if (selectedLanguage === 'html' || selectedLanguage === 'css') {
      let htmlContent = '';
      let cssContent = '';

      if (selectedLanguage === 'html') {
        htmlContent = currentCode;
        const cssFile = files.find((f) => f.path.endsWith('.css'));
        if (cssFile) cssContent = cssFile.content || '';
      } else {
        cssContent = currentCode;
        const htmlFile = files.find((f) => f.path.endsWith('.html'));
        htmlContent = htmlFile?.content || '<h1>HTML & CSS Preview</h1><p>Edit styles or HTML to preview live.</p>';
      }

      const combinedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 16px; color: #111; }
    ${cssContent}
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

      setHtmlPreviewDoc(combinedHtml);
      setIsConsoleOpen(true);
      return;
    }

    // Execute compiled/interpreted language (C, C++, Java, Python, JS, TS)
    if (!currentCode.trim()) {
      setIsConsoleOpen(true);
      setExecutionResult({
        success: false,
        status: 'Error',
        stderr: 'Source code is empty. Please write some code before executing.',
      });
      return;
    }

    setIsExecuting(true);
    setIsConsoleOpen(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: selectedLanguage,
          code: currentCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setExecutionResult({
          success: false,
          status: 'Error',
          stderr: data.error || 'Execution service error.',
        });
      } else {
        setExecutionResult(data);
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        status: 'Network Error',
        stderr: `Failed to connect to execution service: ${err.message}`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // Create New File
  const handleCreateFile = (e) => {
    e?.preventDefault();
    if (!newFileName.trim()) return;

    const trimmed = newFileName.trim();
    const ext = trimmed.includes('.') ? `.${trimmed.split('.').pop()}` : currentLangObj.ext;
    const finalName = trimmed.includes('.') ? trimmed : `${trimmed}${ext}`;

    const matchedLang = SUPPORTED_LANGUAGES.find((l) => l.ext === ext) || currentLangObj;

    const newFile = {
      name: finalName,
      path: finalName,
      language: matchedLang.monacoLanguage,
      content: '',
    };

    const updatedFiles = [...files, newFile];
    setFiles(updatedFiles);
    setActiveFilePath(finalName);
    setNewFileName('');
    setShowNewFileInput(false);

    if (socket && roomId) {
      socket.emit('file-created', { roomId, file: newFile });
    }

    fetch(`/api/rooms/${roomId}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: updatedFiles, activeFile: finalName }),
    }).catch(console.warn);
  };

  // Delete File
  const handleDeleteFile = (path, e) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('Cannot delete the only file in the workspace.');
      return;
    }
    if (!confirm(`Are you sure you want to delete ${path}?`)) return;

    const filtered = files.filter((f) => f.path !== path);
    const newActive = filtered[0].path;

    setFiles(filtered);
    setActiveFilePath(newActive);

    if (socket && roomId) {
      socket.emit('file-deleted', { roomId, filePath: path });
    }

    fetch(`/api/rooms/${roomId}/files`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: filtered, activeFile: newActive }),
    }).catch(console.warn);
  };

  // Copy shareable invitation link
  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Real participant list
  const allParticipants = [
    {
      userId: currentUser?.id || 'you',
      name: `${currentUser?.name || 'You'} (You)`,
      avatar: (currentUser?.name || 'YOU').substring(0, 2).toUpperCase(),
      isHost: currentRoom?.ownerId === currentUser?.id,
      isMuted,
      isCameraOff,
    },
    ...activePeers.map((p) => ({
      userId: p.socketId,
      name: p.name || 'Peer',
      avatar: (p.name || 'CL').substring(0, 2).toUpperCase(),
      isHost: currentRoom?.ownerId === p.userId,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
    })),
  ];

  const isPreviewMode = selectedLanguage === 'html' || selectedLanguage === 'css';

  return (
    <div className="flex-1 flex flex-col h-screen w-screen overflow-hidden bg-[#101318] text-[#F1F4F9]">
      {/* Top Workspace Header */}
      <header className="h-14 bg-[#171B22] border-b border-[#303744] px-4 flex items-center justify-between select-none z-30 shrink-0">
        {/* Left: Brand & Room Code */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C9CFF] to-[#5173E8] flex items-center justify-center shadow-md">
              <Code2 className="w-4 h-4 text-[#101318] stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-[#F1F4F9] hidden sm:inline">
              CodeTogether
            </span>
          </div>

          {/* Room Code Badge */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-[#1D232D] border border-[#303744] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#66D9C1] animate-pulse" />
            <span className="text-[#9AA5B5]">Room:</span>
            <span className="font-bold text-[#F1F4F9]">{roomId}</span>
          </div>

          {/* Copy Invite Link Button */}
          <button
            onClick={handleCopyInvite}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1D232D] hover:bg-[#252E3B] text-xs font-mono font-medium text-[#7C9CFF] border border-[#303744] transition-all"
            title="Copy Invitation Link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#66D9C1]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Center: View Switcher (Code vs Whiteboard) */}
        <div className="flex items-center bg-[#101318] p-1 rounded-xl border border-[#303744]">
          <button
            onClick={() => setViewMode('code')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'code'
                ? 'bg-[#1D232D] text-[#7C9CFF] shadow-sm font-bold border border-[#303744]'
                : 'text-[#9AA5B5] hover:text-[#F1F4F9]'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Code Editor</span>
          </button>

          <button
            onClick={() => setViewMode('whiteboard')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'whiteboard'
                ? 'bg-[#1D232D] text-[#66D9C1] shadow-sm font-bold border border-[#303744]'
                : 'text-[#9AA5B5] hover:text-[#F1F4F9]'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Whiteboard</span>
          </button>
        </div>

        {/* Right: Participant count & Leave Room button */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs font-mono text-[#9AA5B5]">
            <Users className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span className="font-bold text-[#F1F4F9]">{allParticipants.length}</span>
            <span>/ 10</span>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors"
            title="Leave Workspace"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Leave Room</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Minimal Sidebar (Shown in Code mode) */}
        {viewMode === 'code' && (
          <aside className="w-64 bg-[#171B22] border-r border-[#303744] flex flex-col justify-between select-none shrink-0">
            <div className="p-3 space-y-4 overflow-y-auto">
              {/* Language Selector Dropdown */}
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-[#9AA5B5] mb-1.5">
                  LANGUAGE
                </label>
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChangeRequest}
                  className="w-full bg-[#101318] border border-[#303744] focus:border-[#7C9CFF] text-[#7C9CFF] rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id} className="bg-[#171B22] text-[#F1F4F9]">
                      {lang.name} ({lang.ext})
                    </option>
                  ))}
                </select>
              </div>

              {/* Minimal File Selector */}
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-[#9AA5B5] mb-1.5">
                  <span>FILES ({files.length})</span>
                  <button
                    onClick={() => setShowNewFileInput(!showNewFileInput)}
                    className="p-1 hover:text-[#F1F4F9] hover:bg-[#1D232D] rounded"
                    title="Add File"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#7C9CFF]" />
                  </button>
                </div>

                {/* Inline new file creation input */}
                {showNewFileInput && (
                  <form onSubmit={handleCreateFile} className="mb-2">
                    <input
                      type="text"
                      autoFocus
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onBlur={() => { if (!newFileName) setShowNewFileInput(false); }}
                      placeholder="e.g. utils.js"
                      className="w-full bg-[#101318] border border-[#7C9CFF] rounded px-2 py-1 text-xs font-mono text-[#F1F4F9] outline-none"
                    />
                  </form>
                )}

                {/* Files List */}
                <div className="space-y-1">
                  {files.map((file) => {
                    const isActive = activeFilePath === file.path;
                    return (
                      <div
                        key={file.path}
                        onClick={() => setActiveFilePath(file.path)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-mono group transition-colors ${
                          isActive
                            ? 'bg-[#1D232D] text-[#7C9CFF] font-semibold border-l-2 border-[#7C9CFF]'
                            : 'text-[#9AA5B5] hover:text-[#F1F4F9] hover:bg-[#1D232D]/50'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#7C9CFF]' : 'text-[#9AA5B5]'}`} />
                          <span className="truncate">{file.name || file.path}</span>
                        </div>
                        {files.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteFile(file.path, e)}
                            title="Delete file"
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connected Participant List */}
              <div className="pt-2 border-t border-[#303744]">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-[#9AA5B5] mb-2">
                  <span>PARTICIPANTS ({allParticipants.length}/10)</span>
                </div>
                <div className="space-y-1.5">
                  {allParticipants.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-[#101318] border border-[#303744] text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <div className="w-5 h-5 rounded-full bg-[#7C9CFF]/20 text-[#7C9CFF] flex items-center justify-center font-bold text-[9px] shrink-0">
                          {p.avatar}
                        </div>
                        <span className="font-medium text-[#F1F4F9] truncate text-xs">
                          {p.name}
                        </span>
                        {p.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                      </div>
                      <div className="shrink-0 flex items-center space-x-1">
                        {p.isMuted ? (
                          <MicOff className="w-3 h-3 text-rose-400" />
                        ) : (
                          <Mic className="w-3 h-3 text-[#66D9C1]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sync status indicator */}
            <div className="p-3 border-t border-[#303744] bg-[#101318] flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#9AA5B5]">Auto-sync</span>
              <span className={`font-semibold ${saveStatus === 'saved' ? 'text-[#66D9C1]' : 'text-amber-400'}`}>
                {saveStatus === 'saved' ? '● Saved' : 'Saving...'}
              </span>
            </div>
          </aside>
        )}

        {/* Center Area: Monaco Code Editor OR Whiteboard Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#101318] relative">
          {viewMode === 'code' ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Active Tab bar with Run / Preview Button */}
              <div className="h-10 bg-[#171B22] border-b border-[#303744] px-3 flex items-center justify-between text-xs font-mono select-none">
                <div className="flex items-center space-x-2 text-[#7C9CFF] font-semibold">
                  <FileCode className="w-4 h-4" />
                  <span>{activeFile.name}</span>
                  <span className="text-[10px] text-[#9AA5B5] px-1.5 py-0.5 rounded bg-[#1D232D] border border-[#303744]">
                    {currentLangObj.name}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Compact Run Code / Live Preview Button */}
                  {isPreviewMode ? (
                    <button
                      onClick={handleRunOrPreview}
                      className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-[#66D9C1]/15 hover:bg-[#66D9C1]/25 text-[#66D9C1] border border-[#66D9C1]/30 font-semibold text-xs transition-all shadow-sm"
                      title="Preview HTML & CSS Live"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Live Preview</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleRunOrPreview}
                      disabled={isExecuting}
                      className="flex items-center space-x-1.5 px-3.5 py-1 rounded-lg bg-[#7C9CFF] hover:bg-[#688DFE] active:bg-[#5277E8] text-[#101318] font-bold text-xs transition-all shadow-md shadow-[#7C9CFF]/20 disabled:opacity-50"
                      title={`Execute ${currentLangObj.name} in secure sandbox`}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Run Code</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Toggle output console button */}
                  {(executionResult || htmlPreviewDoc) && (
                    <button
                      onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                      className="p-1 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9]"
                      title={isConsoleOpen ? 'Collapse Output' : 'Expand Output'}
                    >
                      {isConsoleOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 relative overflow-hidden">
                <Editor
                  height="100%"
                  path={activeFilePath}
                  language={currentLangObj.monacoLanguage}
                  theme="vs-dark"
                  onMount={handleEditorDidMount}
                  options={{
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: 14,
                    lineHeight: 22,
                    lineNumbers: 'on',
                    minimap: { enabled: true, side: 'right' },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12, bottom: 12 },
                    cursorBlinking: 'smooth',
                    formatOnPaste: true,
                    suggestOnTriggerCharacters: true,
                  }}
                />
              </div>

              {/* Collapsible Output Console / Live Preview Drawer */}
              {isConsoleOpen && (
                <div className="h-60 bg-[#171B22] border-t border-[#303744] flex flex-col font-mono text-xs select-none">
                  {/* Console Header Bar */}
                  <div className="h-9 px-3 bg-[#101318] border-b border-[#303744] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TerminalIcon className="w-3.5 h-3.5 text-[#7C9CFF]" />
                      <span className="font-bold text-[#F1F4F9] text-xs">
                        {isPreviewMode ? 'HTML / CSS Live Preview' : 'Execution Output'}
                      </span>

                      {/* Status Badges */}
                      {isExecuting && (
                        <span className="px-2 py-0.5 rounded-full bg-[#7C9CFF]/10 text-[#7C9CFF] border border-[#7C9CFF]/30 text-[10px] font-semibold flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running...
                        </span>
                      )}

                      {!isExecuting && executionResult && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            executionResult.success
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {executionResult.status || (executionResult.success ? 'Accepted' : 'Failed')}
                        </span>
                      )}

                      {!isExecuting && executionResult?.time && (
                        <span className="text-[10px] text-[#9AA5B5]">
                          Time: {executionResult.time}
                        </span>
                      )}
                      {!isExecuting && executionResult?.memory && (
                        <span className="text-[10px] text-[#9AA5B5]">
                          Memory: {executionResult.memory}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {isPreviewMode && (
                        <button
                          onClick={handleRunOrPreview}
                          className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] text-[#66D9C1] hover:bg-[#1D232D]"
                          title="Refresh Preview"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Refresh</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setExecutionResult(null);
                          setHtmlPreviewDoc('');
                        }}
                        className="text-[11px] text-[#9AA5B5] hover:text-[#F1F4F9]"
                        title="Clear console"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => setIsConsoleOpen(false)}
                        className="p-1 text-[#9AA5B5] hover:text-[#F1F4F9]"
                        title="Close Console"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Console Body */}
                  <div className="flex-1 p-3 overflow-y-auto font-mono text-xs select-text">
                    {/* Live Preview Iframe for HTML/CSS */}
                    {isPreviewMode ? (
                      <div className="w-full h-full bg-white rounded-lg overflow-hidden shadow-inner">
                        <iframe
                          title="HTML Live Preview"
                          srcDoc={htmlPreviewDoc}
                          sandbox="allow-scripts"
                          className="w-full h-full border-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {isExecuting && (
                          <div className="flex items-center space-x-2 text-[#7C9CFF] py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Compiling and executing in isolated sandbox...</span>
                          </div>
                        )}

                        {!isExecuting && !executionResult && (
                          <div className="text-[#9AA5B5]/60 italic py-2">
                            Click "Run Code" above to compile and execute in a secure sandbox.
                          </div>
                        )}

                        {!isExecuting && executionResult && (
                          <div className="space-y-2">
                            {/* Compilation Errors (C, C++, Java) */}
                            {executionResult.compile_output && (
                              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 whitespace-pre-wrap leading-relaxed">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1">
                                  COMPILATION ERROR:
                                </div>
                                {executionResult.compile_output}
                              </div>
                            )}

                            {/* Standard Error / Runtime Exceptions */}
                            {executionResult.stderr && (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 whitespace-pre-wrap leading-relaxed">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                                  RUNTIME ERROR / STDERR:
                                </div>
                                {executionResult.stderr}
                              </div>
                            )}

                            {/* Standard Output */}
                            {executionResult.stdout && (
                              <div className="text-[#F1F4F9] whitespace-pre-wrap leading-relaxed">
                                {executionResult.stdout}
                              </div>
                            )}

                            {/* No output message */}
                            {!executionResult.stdout && !executionResult.stderr && !executionResult.compile_output && (
                              <div className="text-[#9AA5B5] italic">
                                [Program exited cleanly with status {executionResult.status} (no standard output generated)]
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <WhiteboardView
              roomId={roomId}
              onBackToCode={() => setViewMode('code')}
            />
          )}
        </main>

        {/* Right Dock: Voice and Video Call Panel */}
        <VideoCallPanel
          localStream={localStream}
          peerStreams={peerStreams}
          activePeers={activePeers}
          currentUser={currentUser}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          inCall={inCall}
          callError={callError}
          onStartCall={startCall}
          onLeaveCall={leaveCall}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={toggleScreenShare}
          isCollapsed={isVideoCollapsed}
          onToggleCollapse={() => setIsVideoCollapsed(!isVideoCollapsed)}
        />
      </div>

      {/* Confirmation Modal for Language Change */}
      {pendingLangChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#171B22] border border-[#303744] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F1F4F9]">
                  Change Language to {getLangObj(pendingLangChange).name}?
                </h3>
                <p className="text-xs text-[#9AA5B5]">Editor content will be reset</p>
              </div>
            </div>

            <p className="text-xs text-[#9AA5B5] leading-relaxed">
              Changing the programming language will reset the editor to an empty document for all room participants.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#303744]">
              <button
                onClick={() => setPendingLangChange(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9AA5B5] hover:text-[#F1F4F9] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => applyLanguageChange(pendingLangChange)}
                className="px-3.5 py-1.5 rounded-lg bg-[#7C9CFF] hover:bg-[#688DFE] text-[#101318] font-bold text-xs shadow-md shadow-[#7C9CFF]/20 transition-all"
              >
                Change & Clear Editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
