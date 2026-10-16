import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  Video as VideoIcon, 
  VideoOff, 
  Monitor, 
  Hand, 
  Settings, 
  LogOut, 
  Grid, 
  User as UserIcon, 
  ShieldCheck, 
  Wifi, 
  Copy, 
  Send, 
  Code, 
  Smile, 
  Paperclip,
  Check,
  Crown,
  Sparkles,
  GitBranch,
  PenTool
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useWebRTC } from '../../hooks/useWebRTC';

export const ActiveCallsView = ({ 
  currentRoom, 
  setCurrentTab, 
  onLeaveRoom 
}) => {
  const { user } = useAuth();
  const { latency } = useSocket();
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

  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'speaker'
  const [rightTab, setRightTab] = useState('chat'); // 'chat' or 'participants'
  const [callDuration, setCallDuration] = useState('00:45:02');
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // In-Call Chat Messages
  const [inCallMessages, setInCallMessages] = useState([
    {
      id: 'c1',
      senderName: 'Sarah Connor',
      time: '10:41 AM',
      text: 'Check lines 84-91 in `meshRouter.ts`. We are dropping packets on failover reroute when the quorum token expires.',
    },
    {
      id: 'c2',
      senderName: 'Jordan Lee',
      time: '10:42 AM',
      text: 'Here is the updated idempotent patch:',
      codeSnippet: `const session = await webrtcMesh.resolvePeers({\n  quorumTimeoutMs: 2500,\n  retryGracePeriod: 3\n});`,
      snippetFile: 'meshRouter.ts:88',
      reactions: [{ emoji: '🚀', count: 4 }, { emoji: '👍', count: 2 }]
    },
    {
      id: 'c3',
      senderName: 'Maya Lin',
      time: '10:43 AM',
      text: 'Applying patch to local test-harness right now. Benchmark running...',
    }
  ]);

  // 10 Full Participants matching Screenshot 3
  const participants = [
    {
      id: 'p1',
      name: 'Sarah Connor',
      role: 'Host',
      isHost: true,
      isSpeaking: true,
      tag: '1080p HD',
      mic: !isMuted,
      avatar: 'SC',
      bgGradient: 'from-blue-900 via-indigo-950 to-slate-900',
    },
    {
      id: 'p2',
      name: 'Marcus Vance',
      tag: '720p',
      mic: false,
      avatar: 'MV',
      bgGradient: 'from-amber-950 via-slate-900 to-stone-900',
    },
    {
      id: 'p3',
      name: 'Priya Patel',
      tag: 'AUDIO ONLY',
      mic: false,
      avatar: 'PP',
      isAudioOnly: true,
    },
    {
      id: 'p4',
      name: 'Alex Chen',
      tag: 'SHARING DISP-2',
      mic: true,
      avatar: 'AC',
      isScreenShare: true,
    },
    {
      id: 'p5',
      name: 'Elena Rostova',
      tag: 'LOW-LIGHT AUTO-AI',
      mic: true,
      avatar: 'ER',
      bgGradient: 'from-purple-950 via-slate-900 to-indigo-950',
    },
    {
      id: 'p6',
      name: 'David Kim',
      tag: 'STANDBY',
      mic: false,
      avatar: 'DK',
      isAudioOnly: true,
    },
    {
      id: 'p7',
      name: 'Fatima Al-Mansoor',
      tag: 'London (UTC+1)',
      mic: false,
      avatar: 'FA',
      bgGradient: 'from-teal-950 via-slate-900 to-sky-950',
    },
    {
      id: 'p8',
      name: 'Jordan Lee',
      tag: '720p 60fps',
      mic: true,
      avatar: 'JL',
      bgGradient: 'from-cyan-950 via-slate-900 to-blue-950',
    },
    {
      id: 'p9',
      name: 'Carlos Mendoza',
      tag: 'CAM MUTED',
      mic: true,
      avatar: 'CM',
      isAudioOnly: true,
    },
    {
      id: 'p10',
      name: 'Maya Lin',
      tag: 'LIVE TYPING',
      mic: false,
      avatar: 'ML',
      bgGradient: 'from-rose-950 via-slate-900 to-slate-900',
    },
  ];

  const handleCopyPatch = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setInCallMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        senderName: user?.name || 'Sarah Connor',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: chatInput.trim(),
        isYou: true,
      }
    ]);
    setChatInput('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#080B12] h-[calc(100vh-3.5rem)] overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-12 bg-[#0B0F17] border-b border-[#1E2638] px-4 flex items-center justify-between text-xs font-mono">
        {/* Left: Back button & branch */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCurrentTab('workspace')}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#141B28] hover:bg-[#1A2336] text-slate-200 border border-[#222E44] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-sans font-semibold">Back to Coding Workspace</span>
          </button>

          <div className="flex items-center space-x-2 text-slate-400">
            <span className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-sky-400" />
              branch:
            </span>
            <span className="text-sky-400 font-semibold">{currentRoom?.activeBranch || 'feat/cluster-sync'}</span>
            <span>•</span>
            <span className="text-slate-200 font-bold">{currentRoom?.name || 'arch-review-cluster'}</span>
            <span className="text-slate-500">{currentRoom?.slug || 'cdt-8924-xk9'}</span>
          </div>
        </div>

        {/* Center / Right: Call stats & controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{callDuration}</span>
          </div>

          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>10 / 10 Max Capacity (Full)</span>
          </div>

          <div className="hidden md:flex items-center space-x-2 text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <Wifi className="w-3 h-3" />
              Latency: {latency || 22}ms
            </span>
            <span>Loss: 0.0%</span>
          </div>

          {/* Grid / Speaker toggle */}
          <div className="flex items-center space-x-1 bg-[#121724] p-0.5 rounded-lg border border-[#222E44]">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                viewMode === 'grid' ? 'bg-[#1C263A] text-white font-semibold' : 'text-slate-400'
              }`}
            >
              <Grid className="w-3 h-3" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('speaker')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
                viewMode === 'speaker' ? 'bg-[#1C263A] text-white font-semibold' : 'text-slate-400'
              }`}
            >
              <UserIcon className="w-3 h-3" />
              <span>Speaker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid + Chat Section */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Tiles Grid (10 Participants) */}
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 h-full auto-rows-fr">
            {participants.map((p) => {
              const isSarah = p.name === 'Sarah Connor';
              return (
                <div
                  key={p.id}
                  className={`relative rounded-xl overflow-hidden bg-[#101522] border transition-all flex flex-col justify-between p-2 shadow-lg ${
                    p.isSpeaking 
                      ? 'border-emerald-400 shadow-emerald-500/20 shadow-lg' 
                      : 'border-[#1E2638] hover:border-slate-700'
                  }`}
                >
                  {/* Speaking indicator halo tag */}
                  <div className="flex items-center justify-between text-[10px] font-mono z-10">
                    {p.isSpeaking ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        SPEAKING
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[9px] uppercase tracking-wider">{p.tag}</span>
                    )}

                    {p.isScreenShare && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500 text-slate-900 font-bold text-[9px]">
                        SHARING DISP-2
                      </span>
                    )}
                  </div>

                  {/* Tile Center: Video Feed / Screen / Audio Avatar */}
                  <div className="my-auto flex items-center justify-center">
                    {p.isScreenShare ? (
                      <div className="w-full h-24 bg-[#090C12] rounded border border-sky-500/30 p-2 font-mono text-[9px] text-sky-400 flex flex-col justify-center space-y-1">
                        <span className="text-slate-500">// CLUSTER MESH ROUTER</span>
                        <span>quorums.init(nodeList);</span>
                        <span className="text-emerald-400">STATUS: REPLICATED</span>
                      </div>
                    ) : p.isAudioOnly ? (
                      <div className="w-16 h-16 rounded-full bg-[#182338] border border-[#2D3E5D] flex items-center justify-center text-lg font-bold text-sky-400 shadow-inner">
                        {p.avatar}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${p.bgGradient} border border-slate-700/50 flex items-center justify-center text-lg font-bold text-white shadow-xl`}>
                          {p.avatar}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tile Bottom: Name & Mic status */}
                  <div className="flex items-center justify-between z-10 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-lg">
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                      {p.isHost && (
                        <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[9px] font-mono">
                          Host
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center space-x-1">
                      {p.mic ? (
                        <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: In-Call Chat & Participants */}
        <div className="w-80 bg-[#0C101A] border-l border-[#1E2638] flex flex-col justify-between shrink-0 select-none">
          {/* Tabs */}
          <div className="h-10 bg-[#0B0F17] border-b border-[#1E2638] flex items-center px-3 space-x-3 text-xs">
            <button
              onClick={() => setRightTab('chat')}
              className={`font-semibold pb-1.5 transition-colors ${
                rightTab === 'chat'
                  ? 'text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              In-Call Chat <span className="text-slate-500">18</span>
            </button>
            <button
              onClick={() => setRightTab('participants')}
              className={`font-semibold pb-1.5 transition-colors ${
                rightTab === 'participants'
                  ? 'text-sky-400 border-b-2 border-sky-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Participants <span className="text-slate-500">10</span>
            </button>
          </div>

          {/* Right Body */}
          {rightTab === 'chat' ? (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              {/* Message List */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
                <div className="text-center text-[10px] font-mono text-slate-500 py-1">
                  Session synced with commit 8e30b19
                </div>

                {inCallMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{msg.senderName}</span>
                      <span className="text-[10px] font-mono text-slate-500">{msg.time}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#121724] border border-[#1A2234] text-slate-300 leading-relaxed text-xs">
                      {msg.text}

                      {msg.codeSnippet && (
                        <div className="mt-2 rounded bg-[#080B12] border border-[#1E2638] p-2 font-mono text-[11px]">
                          <div className="flex items-center justify-between text-slate-500 pb-1 mb-1 border-b border-[#1E2638] text-[10px]">
                            <span>{msg.snippetFile || 'code'}</span>
                            <button
                              onClick={() => handleCopyPatch(msg.codeSnippet)}
                              className="flex items-center gap-1 hover:text-white"
                            >
                              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <pre className="text-sky-400 overflow-x-auto">{msg.codeSnippet}</pre>
                        </div>
                      )}

                      {/* Reactions */}
                      {msg.reactions && (
                        <div className="flex items-center space-x-1.5 mt-2">
                          {msg.reactions.map((r, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded-full bg-[#182032] border border-[#222E44] text-[10px] text-slate-300 flex items-center gap-1">
                              <span>{r.emoji}</span>
                              <span className="font-mono">{r.count}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-2.5 border-t border-[#1E2638] bg-[#0E131F]">
                <div className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send note or markdown snippet..."
                    className="w-full bg-[#080B12] border border-[#1E2638] focus:border-sky-500 rounded-lg pl-3 pr-20 py-2 text-xs text-white placeholder-slate-500 outline-none"
                  />
                  <div className="absolute right-2 top-2 flex items-center space-x-1.5 text-slate-400">
                    <button type="button" className="hover:text-sky-400"><Code className="w-3.5 h-3.5" /></button>
                    <button type="button" className="hover:text-amber-400"><Smile className="w-3.5 h-3.5" /></button>
                    <button type="submit" className="p-1 rounded bg-sky-500 text-white hover:bg-sky-400">
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </form>
            </div>
          ) : (
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-[#111724] border border-[#1E2638]">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
                      {p.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.tag}</div>
                    </div>
                  </div>
                  {p.mic ? <Mic className="w-3.5 h-3.5 text-emerald-400" /> : <MicOff className="w-3.5 h-3.5 text-rose-400" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Control Dock */}
      <div className="h-16 bg-[#0B0F17] border-t border-[#1E2638] px-6 flex items-center justify-between">
        {/* Left: Switch to Code / Whiteboard shortcuts */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentTab('workspace')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161C2C] hover:bg-[#1E263C] text-slate-200 border border-[#26324A] text-xs font-semibold transition-all"
          >
            <Code className="w-3.5 h-3.5 text-sky-400" />
            <span>Code Editor</span>
            <span className="text-[10px] font-mono text-slate-500">~1</span>
          </button>

          <button
            onClick={() => setCurrentTab('whiteboard')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161C2C] hover:bg-[#1E263C] text-slate-200 border border-[#26324A] text-xs font-semibold transition-all"
          >
            <PenTool className="w-3.5 h-3.5 text-emerald-400" />
            <span>Whiteboard</span>
            <span className="text-[10px] font-mono text-slate-500">~2</span>
          </button>
        </div>

        {/* Center: Core Call Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleMute}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isMuted 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-[#182032] hover:bg-[#202B42] text-white border border-[#2D3A54]'
            }`}
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={toggleCamera}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isCameraOff 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-[#182032] hover:bg-[#202B42] text-white border border-[#2D3A54]'
            }`}
          >
            {isCameraOff ? <VideoOff className="w-4 h-4" /> : <VideoIcon className="w-4 h-4 text-sky-400" />}
            <span>{isCameraOff ? 'Start Video' : 'Stop Video'}</span>
          </button>

          <button
            onClick={toggleScreenShare}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              isScreenSharing 
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30' 
                : 'bg-[#182032] hover:bg-[#202B42] text-white border border-[#2D3A54]'
            }`}
          >
            <Monitor className="w-4 h-4 text-sky-400" />
            <span>{isScreenSharing ? 'Stop Screen' : 'Share Screen'}</span>
          </button>

          <button
            onClick={toggleHandRaise}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              isHandRaised 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'bg-[#182032] hover:bg-[#202B42] text-slate-300 border border-[#2D3A54]'
            }`}
          >
            <Hand className="w-4 h-4 text-amber-400" />
            <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>

          <button
            onClick={() => alert('Call Settings: WebRTC VP8/Opus, adaptive bitrate enabled, echo cancellation active')}
            className="p-2 rounded-xl bg-[#182032] hover:bg-[#202B42] text-slate-300 border border-[#2D3A54]"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onLeaveRoom}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>

        {/* Right: Security & E2E Active */}
        <div className="flex items-center space-x-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" />
          <span>E2E Active</span>
        </div>
      </div>
    </div>
  );
};
