import React, { useState } from 'react';
import { 
  Code2, 
  Share2, 
  Users, 
  Wifi, 
  Check, 
  Copy, 
  LogOut, 
  User as UserIcon, 
  Settings,
  ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

export const Navbar = ({ 
  currentTab, 
  setCurrentTab, 
  currentRoom, 
  onOpenSettings,
  onOpenAuth 
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { latency, connected } = useSocket();
  const [copied, setCopied] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'whiteboard', label: 'Whiteboard' },
    { id: 'docs', label: 'Docs' },
  ];

  const handleShareInvite = () => {
    const inviteUrl = `${window.location.origin}/?room=${currentRoom?.roomId || 'arch-review-cluster'}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.1, x: 0.9 },
      colors: ['#38BDF8', '#10B981', '#8B5CF6'],
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const activePeersCount = currentRoom?.participants?.length || 4;

  return (
    <header className="h-14 bg-[#0B0F17] border-b border-[#1E2638] px-4 flex items-center justify-between select-none z-40 relative">
      {/* Brand & Tabs */}
      <div className="flex items-center space-x-6">
        {/* Logo */}
        <div 
          onClick={() => setCurrentTab('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Code2 className="w-5 h-5 text-white stroke-[2.5]" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
            CodeTogether
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#161C2C] border border-[#26324A] text-slate-400">
              v2.4
            </span>
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#182032] text-white border border-[#2D3A54] shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121622]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Section: Status Pills & Actions */}
      <div className="flex items-center space-x-3">
        {/* Room identifier pill */}
        <div 
          onClick={handleShareInvite}
          title="Click to copy room invitation"
          className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#121724] border border-[#222E44] text-xs font-mono text-slate-300 hover:border-sky-500/50 cursor-pointer transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="max-w-[150px] truncate text-slate-300">
            room/{currentRoom?.name || 'arch-review-clust...'}
          </span>
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
        </div>

        {/* Latency Pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#121724] border border-[#222E44] text-xs font-mono text-slate-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{latency}ms</span>
          <span className="text-slate-500 font-sans">({connected ? 'Connected' : 'Offline'})</span>
        </div>

        {/* Active Peers Pill */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#121724] border border-[#222E44] text-xs font-mono text-slate-300">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{activePeersCount} / 10</span>
          <span className="text-slate-500 font-sans">Active</span>
        </div>

        {/* Share Invite Blue Button */}
        <button
          onClick={handleShareInvite}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/25 transition-all"
        >
          <Share2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{copied ? 'Copied Link!' : 'Share Invite'}</span>
        </button>

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-1.5 p-1 rounded-lg hover:bg-[#161C2C] border border-transparent hover:border-[#26324A] transition-all"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {user?.avatar || 'SC'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <div 
              onMouseLeave={() => setShowUserMenu(false)}
              className="absolute right-0 mt-2 w-64 bg-[#121724] border border-[#222E44] rounded-xl shadow-2xl py-2 z-50 text-xs"
            >
              <div className="px-3.5 py-2.5 border-b border-[#1E2638]">
                <div className="font-semibold text-white text-sm">{user?.name || 'Sarah Connor'}</div>
                <div className="text-slate-400 font-mono text-[11px] truncate">{user?.email || 'sarah@codetogether.dev'}</div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 font-mono text-[10px]">
                    ID: {user?.id || user?._id || 'usr_89f02c'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                    P2P Ready
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => { setShowUserMenu(false); onOpenSettings(); }}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#1A2234] text-slate-300 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  Account & Workspace Settings
                </button>
              </div>

              <div className="pt-1 border-t border-[#1E2638]">
                {isAuthenticated ? (
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-500/10 text-rose-400 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                ) : (
                  <button
                    onClick={() => { setShowUserMenu(false); onOpenAuth(); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-sky-500/10 text-sky-400 flex items-center gap-2"
                  >
                    <UserIcon className="w-4 h-4" />
                    Sign In / Register
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
