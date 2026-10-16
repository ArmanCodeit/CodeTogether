import React, { useState, useEffect } from 'react';
import {
  Code2,
  PenTool,
  Video,
  ArrowRight,
  Plus,
  LogIn,
  Copy,
  Check,
  AlertCircle,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';

const LANGUAGES = [
  { id: 'c', label: 'C (.c)' },
  { id: 'cpp', label: 'C++ (.cpp)' },
  { id: 'java', label: 'Java (.java)' },
  { id: 'javascript', label: 'JavaScript (.js)' },
  { id: 'typescript', label: 'TypeScript (.ts)' },
  { id: 'python', label: 'Python (.py)' },
  { id: 'html', label: 'HTML (.html)' },
  { id: 'css', label: 'CSS (.css)' },
];

export const HomePage = ({
  onEnterRoom,
  initialRoomCode = '',
  initialError = '',
}) => {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem('cdt_display_name') || ''
  );

  // Create room state
  const [createRoomName, setCreateRoomName] = useState('Pairing Session');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isCreating, setIsCreating] = useState(false);

  // Join room state
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [isJoining, setIsJoining] = useState(false);

  // Created room preview modal state
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Error feedback
  const [error, setError] = useState(initialError || '');

  useEffect(() => {
    if (initialError) {
      setError(initialError);
    }
  }, [initialError]);

  useEffect(() => {
    if (initialRoomCode) {
      setJoinCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const saveName = (name) => {
    setDisplayName(name);
    localStorage.setItem('cdt_display_name', name);
  };

  // Handle Create Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const finalName = displayName.trim() || 'Host Developer';
    saveName(finalName);
    setError('');
    setIsCreating(true);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createRoomName.trim() || 'Collaborative Room',
          language: selectedLanguage,
          creatorName: finalName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create room.');
      }

      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#7C9CFF', '#66D9C1', '#F1F4F9'],
      });

      // Show room code and shareable invitation link modal
      setCreatedRoomData({
        room: data.room,
        user: data.creator,
        inviteUrl: `${window.location.origin}/?room=${data.room.roomId}`,
      });
    } catch (err) {
      setError(err.message || 'Network error creating room.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().replace(/^.*[?&]room=/, '');
    if (!cleanCode) {
      setError('Please enter a room code or invite link.');
      return;
    }

    const finalName = displayName.trim() || 'Developer';
    saveName(finalName);
    setError('');
    setIsJoining(true);

    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: finalName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Room could not be accessed.');
      }

      onEnterRoom(data.room, data.user);
    } catch (err) {
      setError(err.message || 'Could not join room.');
    } finally {
      setIsJoining(false);
    }
  };

  const copyInvite = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#101318] text-[#F1F4F9] flex flex-col justify-between selection:bg-[#7C9CFF]/30">
      {/* Top Minimal Navbar */}
      <header className="h-16 px-6 md:px-12 border-b border-[#303744] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7C9CFF] to-[#5173E8] flex items-center justify-center shadow-lg shadow-[#7C9CFF]/20">
            <Code2 className="w-5 h-5 text-[#101318] stroke-[2.5]" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#F1F4F9]">
            CodeTogether
          </span>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-[#9AA5B5]">
          <span className="w-2 h-2 rounded-full bg-[#66D9C1] animate-pulse" />
          <span>Real-time Collab Ready</span>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 flex flex-col space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[#F1F4F9]">
            Code Together.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C9CFF] to-[#66D9C1]">
              Build Together.
            </span>
          </h1>
          <p className="text-sm md:text-base text-[#9AA5B5] leading-relaxed">
            Real-time collaborative coding, shared whiteboard sketching, and live voice & video calls. No sign up required.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-xl mx-auto w-full p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Action Cards: Create Room & Join Room */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* Card 1: Create Room */}
          <div className="bg-[#171B22] border border-[#303744] hover:border-[#7C9CFF]/40 rounded-2xl p-6 shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-1 text-[#7C9CFF]">
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <h2 className="text-base font-bold text-[#F1F4F9]">Create a Room</h2>
              </div>
              <p className="text-xs text-[#9AA5B5] mb-5">
                Generate a unique room ID and invite up to 9 peers.
              </p>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9AA5B5] uppercase font-semibold mb-1">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => saveName(e.target.value)}
                    placeholder="e.g. Alex"
                    required
                    className="w-full bg-[#101318] border border-[#303744] focus:border-[#7C9CFF] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F1F4F9] placeholder-[#9AA5B5]/40 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9AA5B5] uppercase font-semibold mb-1">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={createRoomName}
                    onChange={(e) => setCreateRoomName(e.target.value)}
                    placeholder="e.g. Interview Prep"
                    className="w-full bg-[#101318] border border-[#303744] focus:border-[#7C9CFF] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F1F4F9] placeholder-[#9AA5B5]/40 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9AA5B5] uppercase font-semibold mb-1">
                    Programming Language
                  </label>
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-full bg-[#101318] border border-[#303744] focus:border-[#7C9CFF] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F1F4F9] outline-none transition-colors cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.id} value={lang.id} className="bg-[#171B22] text-[#F1F4F9]">
                        {lang.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-2 py-2.5 rounded-xl bg-[#7C9CFF] hover:bg-[#688DFE] text-[#101318] font-bold text-xs shadow-md shadow-[#7C9CFF]/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isCreating ? 'Creating Room...' : 'Create Room'}</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </form>
            </div>
          </div>

          {/* Card 2: Join Room */}
          <div className="bg-[#171B22] border border-[#303744] hover:border-[#66D9C1]/40 rounded-2xl p-6 shadow-xl transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2.5 mb-1 text-[#66D9C1]">
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                <h2 className="text-base font-bold text-[#F1F4F9]">Join a Room</h2>
              </div>
              <p className="text-xs text-[#9AA5B5] mb-5">
                Enter an existing room code or invitation link.
              </p>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#9AA5B5] uppercase font-semibold mb-1">
                    Your Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => saveName(e.target.value)}
                    placeholder="e.g. Sam"
                    required
                    className="w-full bg-[#101318] border border-[#303744] focus:border-[#7C9CFF] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F1F4F9] placeholder-[#9AA5B5]/40 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#9AA5B5] uppercase font-semibold mb-1">
                    Room Code or Invite Link
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g. cdt-xxxx-xxxx or https://..."
                    required
                    className="w-full bg-[#101318] border border-[#303744] focus:border-[#66D9C1] rounded-xl px-3.5 py-2 text-xs font-mono text-[#F1F4F9] placeholder-[#9AA5B5]/40 outline-none transition-colors"
                  />
                </div>

                <div className="pt-7">
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="w-full py-2.5 rounded-xl bg-[#1D232D] hover:bg-[#252E3B] text-[#F1F4F9] border border-[#303744] hover:border-[#66D9C1]/50 font-bold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <span>{isJoining ? 'Joining Room...' : 'Join Room'}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.2] text-[#66D9C1]" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* 3 Core Features Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-[#303744]">
          <div className="bg-[#171B22]/60 border border-[#303744] p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#7C9CFF]/10 text-[#7C9CFF] flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F1F4F9]">Collaborative Code Editor</h3>
            <p className="text-xs text-[#9AA5B5] leading-relaxed">
              Monaco-based editor with syntax highlighting for 8 languages and CRDT real-time typing sync.
            </p>
          </div>

          <div className="bg-[#171B22]/60 border border-[#303744] p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-[#66D9C1]/10 text-[#66D9C1] flex items-center justify-center">
              <PenTool className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F1F4F9]">Shared Doodle Board</h3>
            <p className="text-xs text-[#9AA5B5] leading-relaxed">
              Intuitive whiteboard canvas with pen, eraser, geometric shapes, text, undo/redo, and instant sync.
            </p>
          </div>

          <div className="bg-[#171B22]/60 border border-[#303744] p-5 rounded-2xl space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 text-amber-400 flex items-center justify-center">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#F1F4F9]">Live Voice & Video Calls</h3>
            <p className="text-xs text-[#9AA5B5] leading-relaxed">
              Browser-based WebRTC calls with camera, microphone mute, screen sharing, and up to 10 participants.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-[#303744] px-6 flex items-center justify-between text-xs font-mono text-[#9AA5B5] shrink-0">
        <span>CodeTogether • Clean Real-time Collaboration</span>
        <span>Max 10 participants per room</span>
      </footer>

      {/* Created Room Invitation Modal */}
      {createdRoomData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#171B22] border border-[#303744] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#F1F4F9]">Room Created Successfully!</h3>
              <p className="text-xs text-[#9AA5B5]">
                Share the room code or link with your friends to start collaborating.
              </p>
            </div>

            {/* Room Code Display */}
            <div className="p-3.5 rounded-xl bg-[#101318] border border-[#303744] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-[#9AA5B5]">Room Code</span>
              <div className="flex items-center justify-between">
                <span className="text-base font-mono font-bold text-[#66D9C1]">
                  {createdRoomData.room.roomId}
                </span>
                <button
                  onClick={() => copyInvite(createdRoomData.room.roomId)}
                  className="p-1.5 rounded hover:bg-[#1D232D] text-[#9AA5B5] hover:text-[#F1F4F9]"
                  title="Copy Code"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-[#66D9C1]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Shareable Invitation Link */}
            <div className="p-3.5 rounded-xl bg-[#101318] border border-[#303744] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-[#9AA5B5]">Invitation Link</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-[#7C9CFF] truncate">
                  {createdRoomData.inviteUrl}
                </span>
                <button
                  onClick={() => copyInvite(createdRoomData.inviteUrl)}
                  className="px-2.5 py-1 rounded bg-[#1D232D] border border-[#303744] hover:bg-[#252E3B] text-xs font-mono text-[#F1F4F9] flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#66D9C1]" />
                      <span className="text-[#66D9C1]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onEnterRoom(createdRoomData.room, createdRoomData.user)}
                className="w-full py-3 rounded-xl bg-[#7C9CFF] hover:bg-[#688DFE] text-[#101318] font-bold text-xs shadow-lg shadow-[#7C9CFF]/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
