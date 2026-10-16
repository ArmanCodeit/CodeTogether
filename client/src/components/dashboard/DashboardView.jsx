import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Layers, 
  Terminal, 
  HardDrive, 
  PlusCircle, 
  LogIn, 
  ShieldCheck, 
  Lock, 
  Search, 
  Copy, 
  Check, 
  RotateCcw, 
  Download, 
  ArrowRight,
  Radio,
  RadioTower,
  Sparkles,
  GitBranch,
  Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const DashboardView = ({ onEnterRoom, setCurrentTab }) => {
  const { user } = useAuth();
  const { joinRoom } = useSocket();

  // Create room form state
  const [newRoomName, setNewRoomName] = useState('auth-cluster-refactor');
  const [newRoomLanguage, setNewRoomLanguage] = useState('TypeScript (Node.js 20)');
  const [accessPolicy, setAccessPolicy] = useState('invite-only');
  const [isCreating, setIsCreating] = useState(false);

  // Join room form state
  const [joinCode, setJoinCode] = useState('');
  const [joinMuted, setJoinMuted] = useState(false);
  const [joinCameraOff, setJoinCameraOff] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Table state
  const [rooms, setRooms] = useState([]);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [copiedId, setCopiedId] = useState(null);

  // Load rooms and snapshots from API
  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`/api/rooms?filter=${filterTab}&search=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }

      const snapRes = await fetch('/api/rooms/snapshots');
      if (snapRes.ok) {
        const snapData = await snapRes.json();
        setSnapshots(snapData.snapshots || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch error:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterTab, searchQuery]);

  // Handle Room Creation
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoomName.trim(),
          language: newRoomLanguage,
          accessPolicy,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        confetti({ particleCount: 30, spread: 50 });
        onEnterRoom(data.room);
      }
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().replace(/^.*[?&]room=/, '');
    if (!cleanCode) {
      setJoinError('Please provide a valid room code or invite URL.');
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ micMuted: joinMuted, cameraOff: joinCameraOff }),
      });

      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.message || 'Failed to join room.');
        return;
      }

      onEnterRoom(data.room, { isMuted: joinMuted, isCameraOff: joinCameraOff });
    } catch (err) {
      setJoinError('Network error joining room.');
    } finally {
      setIsJoining(false);
    }
  };

  // Restore snapshot
  const handleRestoreSnapshot = async (snapshotId) => {
    try {
      const res = await fetch(`/api/rooms/snapshots/${snapshotId}/restore`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        confetti({ particleCount: 40, spread: 60 });
        onEnterRoom(data.room);
      }
    } catch (err) {
      console.error('Error restoring snapshot:', err);
    }
  };

  const copyRoomInvite = (room) => {
    const url = `${window.location.origin}/?room=${room.roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 bg-[#0A0D14] p-6 overflow-y-auto space-y-6">
      {/* Top Banner / Cluster Node Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#1E2638] gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>CLUSTER NODE // US-EAST-1D ACTIVE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] || 'Sarah'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Ready to build together? 4 teammates are online across your organization.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#121724] border border-[#222E44] text-slate-300">
            ID: <span className="text-sky-400">{user?._id || user?.id || 'usr_89f02c'}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center space-x-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>P2P Ready</span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Rooms */}
        <div className="bg-[#121724] border border-[#1E2638] hover:border-[#2A364E] p-4 rounded-xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">ACTIVE ROOMS</span>
            <RadioTower className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white flex items-baseline gap-2">
            2 <span className="text-xs font-normal text-emerald-400">Live Now</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">
            4 / 20 Total Concurrency
          </div>
        </div>

        {/* Card 2: Collab Sessions */}
        <div className="bg-[#121724] border border-[#1E2638] hover:border-[#2A364E] p-4 rounded-xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">COLLAB SESSIONS</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">28 <span className="text-xs font-normal text-slate-400">Total Sessions</span></div>
          <div className="text-xs text-slate-500 mt-1">Avg. 46 min pair time</div>
        </div>

        {/* Card 3: Languages Used */}
        <div className="bg-[#121724] border border-[#1E2638] hover:border-[#2A364E] p-4 rounded-xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">LANGUAGES USED</span>
            <Terminal className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center space-x-1.5 my-1">
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">TS</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">PY</span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold">GO</span>
            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-mono font-bold">RS</span>
          </div>
          <div className="text-xs text-slate-500 font-mono">TypeScript 62% distribution</div>
        </div>

        {/* Card 4: Snapshot Storage */}
        <div className="bg-[#121724] border border-[#1E2638] hover:border-[#2A364E] p-4 rounded-xl shadow-sm transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-medium uppercase tracking-wider">SNAPSHOT STORAGE</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white">14.2 MB</span>
            <span className="text-xs font-mono text-slate-400">500 MB Max</span>
          </div>
          <div className="w-full bg-[#182032] h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-sky-400 h-full rounded-full" style={{ width: '2.8%' }} />
          </div>
        </div>
      </div>

      {/* Two Action Panels: Create Room & Join Room */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Room Card */}
        <div className="bg-[#121724] border border-[#1E2638] rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-white">Create New Coding Room</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-[10px] font-semibold">
                Max 10 peers
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Spin up a synchronized live workspace with terminal & WebRTC audio
            </p>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-slate-400">Room Name / Slug</label>
                    <span className="text-[10px] font-mono text-sky-400">required</span>
                  </div>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="auth-cluster-refactor"
                    required
                    className="w-full bg-[#0B0F17] border border-[#222E44] focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono text-slate-400">Language & Runtime</label>
                    <span className="text-[10px] font-mono text-slate-500">Language Server</span>
                  </div>
                  <select
                    value={newRoomLanguage}
                    onChange={(e) => setNewRoomLanguage(e.target.value)}
                    className="w-full bg-[#0B0F17] border border-[#222E44] focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white outline-none transition-colors"
                  >
                    <option value="TypeScript (Node.js 20)">TypeScript (Node.js 20)</option>
                    <option value="JavaScript (ESM / Node.js 20)">JavaScript (ESM / Node.js 20)</option>
                    <option value="Python 3.12">Python 3.12</option>
                    <option value="Go 1.22">Go 1.22</option>
                    <option value="Rust 1.78">Rust 1.78 (Tokio)</option>
                    <option value="HTML / CSS / JS Sandbox">HTML / CSS / JS Sandbox</option>
                  </select>
                </div>
              </div>

              {/* Room Access Policy */}
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-2">Room Access Policy</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    onClick={() => setAccessPolicy('invite-only')}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      accessPolicy === 'invite-only'
                        ? 'bg-[#182236] border-sky-500/60 text-white'
                        : 'bg-[#0B0F17] border-[#222E44] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access"
                      checked={accessPolicy === 'invite-only'}
                      onChange={() => setAccessPolicy('invite-only')}
                      className="mt-0.5 text-sky-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Invite-Only Access</div>
                      <div className="text-[10px] text-slate-500">Requires workspace team auth token</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setAccessPolicy('public')}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      accessPolicy === 'public'
                        ? 'bg-[#182236] border-sky-500/60 text-white'
                        : 'bg-[#0B0F17] border-[#222E44] text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="access"
                      checked={accessPolicy === 'public'}
                      onChange={() => setAccessPolicy('public')}
                      className="mt-0.5 text-sky-500 focus:ring-0"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">Public URL Link</div>
                      <div className="text-[10px] text-slate-500">Anyone with URL can view / pair</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-[#1E2638]">
                <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Encrypted WebRTC P2P Data Mesh</span>
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition-all disabled:opacity-50"
                >
                  <span>{isCreating ? 'Launching...' : 'Launch Room'}</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Join Room Card */}
        <div className="bg-[#121724] border border-[#1E2638] rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <LogIn className="w-5 h-5 text-sky-400" />
              <h2 className="text-base font-bold text-white">Join Existing Room</h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Enter code or paste instant session link
            </p>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-slate-400 mb-1">Room Code or Invite URL</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="cdt-8924-xk9 or https://..."
                  className="w-full bg-[#0B0F17] border border-[#222E44] focus:border-sky-500 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 outline-none transition-colors"
                />
                {joinError && (
                  <p className="text-[11px] text-rose-400 mt-1 font-mono">{joinError}</p>
                )}
              </div>

              {/* Pre-flight device state */}
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 font-semibold">
                  PRE-FLIGHT DEVICE STATE
                </span>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinMuted}
                      onChange={(e) => setJoinMuted(e.target.checked)}
                      className="rounded bg-[#0B0F17] border-[#222E44] text-sky-500 focus:ring-0"
                    />
                    <span>Join with microphone muted</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={joinCameraOff}
                      onChange={(e) => setJoinCameraOff(e.target.checked)}
                      className="rounded bg-[#0B0F17] border-[#222E44] text-sky-500 focus:ring-0"
                    />
                    <span>Join with camera turned off</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isJoining}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-[#182032] hover:bg-[#202B42] text-slate-200 border border-[#2D3A54] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  <RadioTower className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isJoining ? 'Connecting...' : 'Connect & Enter Room'}</span>
                </button>
              </div>

              {/* Strict 10-peer warning lock */}
              <div className="flex items-start space-x-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300/90 text-[11px]">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Rooms automatically enforce read-only locking when 10 active peers connect to prevent sync conflicts.
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Section: Rooms List Table & Snapshots Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rooms Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#121724] border border-[#1E2638] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            {/* Table Header Filter Tabs */}
            <div className="p-3 border-b border-[#1E2638] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-1">
                {[
                  { id: 'all', label: `All Rooms (${rooms.length})` },
                  { id: 'hosted', label: 'My Hosted' },
                  { id: 'shared', label: 'Shared With Me' },
                  { id: 'archived', label: 'Archived' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterTab(t.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filterTab === t.id
                        ? 'bg-[#182032] text-white border border-[#2D3A54]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter rooms by name..."
                  className="w-full bg-[#0B0F17] border border-[#222E44] focus:border-sky-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 outline-none font-mono"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#1E2638] text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5">ROOM & IDENTIFIER</th>
                    <th className="px-4 py-2.5">STACK / RUNTIME</th>
                    <th className="px-4 py-2.5">LIVE PRESENCE</th>
                    <th className="px-4 py-2.5">LAST ACTIVITY</th>
                    <th className="px-4 py-2.5 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A2234]">
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No active rooms found matching your filter.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => {
                      const isLive = room.participants && room.participants.length > 0;
                      return (
                        <tr key={room.roomId} className="hover:bg-[#161C2C] transition-colors group">
                          {/* Room & Identifier */}
                          <td className="px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                              <div className="font-semibold text-slate-200 group-hover:text-sky-400 transition-colors cursor-pointer" onClick={() => onEnterRoom(room)}>
                                {room.name}
                              </div>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 mt-0.5">
                              <span>{room.slug || room.roomId}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1 text-slate-400">
                                <GitBranch className="w-3 h-3 text-sky-400/80" />
                                {room.activeBranch || 'feat/cluster-sync'}
                              </span>
                            </div>
                          </td>

                          {/* Stack / Runtime */}
                          <td className="px-4 py-3 font-mono">
                            <span className="px-2 py-0.5 rounded bg-[#182032] border border-[#26324A] text-slate-300 text-[11px]">
                              {room.language || 'TypeScript 5.4'}
                            </span>
                          </td>

                          {/* Live Presence */}
                          <td className="px-4 py-3 font-mono">
                            {isLive ? (
                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{room.participants.length}/10 Live</span>
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Idle (0/10)</span>
                            )}
                          </td>

                          {/* Last Activity */}
                          <td className="px-4 py-3 text-slate-400">
                            <div>2 mins ago</div>
                            <div className="text-[10px] text-slate-500">by @{room.ownerName?.toLowerCase().replace(/ /g, '_') || 'sarah_c'}</div>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => copyRoomInvite(room)}
                                title="Copy room invite link"
                                className="p-1.5 rounded hover:bg-[#1E2638] text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                {copiedId === room.roomId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => onEnterRoom(room)}
                                className="px-3 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs transition-colors shadow-sm"
                              >
                                {isLive ? 'Enter' : 'Resume'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-[#1E2638] flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Showing {rooms.length} of {rooms.length} active configurations</span>
            <div className="flex items-center space-x-1.5">
              <button className="px-2.5 py-1 rounded bg-[#161C2C] text-slate-400 hover:text-white border border-[#222E44]">Prev</button>
              <button className="px-2.5 py-1 rounded bg-[#161C2C] text-slate-400 hover:text-white border border-[#222E44]">Next</button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Snapshots & Versions + Mesh Status */}
        <div className="space-y-6">
          {/* Snapshots & Versions Card */}
          <div className="bg-[#121724] border border-[#1E2638] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2638] mb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Snapshots & Versions
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">{snapshots.length || 12} Saved</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Automatic time-machine commits captured during collaborative coding sessions.
            </p>

            <div className="space-y-2.5">
              {snapshots.map((snap) => (
                <div key={snap.snapshotId} className="p-2.5 rounded-lg bg-[#0E131F] border border-[#1E2638] hover:border-slate-700 transition-all text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sky-400 font-semibold flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-sky-400" />
                      {snap.versionTag}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">18m ago</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                    {snap.description}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-[#182032]">
                    <span className="text-slate-500 font-mono text-[10px] truncate max-w-[120px]">
                      {snap.roomName || snap.roomId}
                    </span>
                    <button
                      onClick={() => handleRestoreSnapshot(snap.snapshotId)}
                      className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                    >
                      <span>Restore</span>
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 mt-3 border-t border-[#1E2638] flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  confetti({ particleCount: 20 });
                  alert('Exporting project tarball bundle...');
                }}
                className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Tarball</span>
              </button>
              <button
                onClick={() => setCurrentTab('sessions')}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 font-medium"
              >
                <span>View All 12</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* MESH STATUS Card */}
          <div className="bg-[#121724] border border-[#1E2638] rounded-xl p-4 shadow-sm font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2638] mb-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">MESH STATUS</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                Operational
              </span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Signaling Server</span>
                <span className="text-slate-300 break-all">wss://signal.us-east.codetogether.net</span>
              </div>
              <div className="pt-2 border-t border-[#1E2638] flex items-center justify-between">
                <span className="text-slate-500">STUN / TURN Relays</span>
                <span className="text-emerald-400">3 / 3 Active (low latency)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
