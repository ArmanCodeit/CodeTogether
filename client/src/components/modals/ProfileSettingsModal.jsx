import React, { useState } from 'react';
import { X, User, Settings, Shield, Sliders, Check, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../../context/AuthContext';

export const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, updateProfile, token } = useAuth();

  const [name, setName] = useState(user?.name || 'Sarah Connor');
  const [handle, setHandle] = useState(user?.handle || '@sarah_c');
  const [micMuted, setMicMuted] = useState(user?.settings?.micMutedByDefault || false);
  const [camOff, setCamOff] = useState(user?.settings?.cameraOffByDefault || false);
  const [fontSize, setFontSize] = useState(user?.settings?.fontSize || 14);
  const [tabSize, setTabSize] = useState(user?.settings?.tabSize || 2);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await updateProfile({
      name,
      handle,
      settings: {
        micMutedByDefault: micMuted,
        cameraOffByDefault: camOff,
        fontSize: Number(fontSize),
        tabSize: Number(tabSize),
      },
    });
    setIsSaving(false);
    confetti({ particleCount: 20, spread: 40 });
    onClose();
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token || 'cdt_mock_jwt_token_sample');
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101522] border border-[#222E44] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative select-none">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#1A2336] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-5 pb-3 border-b border-[#1E2638]">
          <Settings className="w-5 h-5 text-sky-400" />
          <h2 className="text-lg font-bold text-white">Account & Workspace Settings</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          {/* User Profile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0A0D14] border border-[#222E44] focus:border-sky-500 rounded-lg px-3 py-2 text-white outline-none font-sans"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full bg-[#0A0D14] border border-[#222E44] focus:border-sky-500 rounded-lg px-3 py-2 text-white outline-none"
              />
            </div>
          </div>

          {/* Pre-flight Audio/Video Defaults */}
          <div className="p-3 rounded-xl bg-[#0C101A] border border-[#1E2638] space-y-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              PRE-FLIGHT DEVICE DEFAULTS
            </span>
            <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={micMuted}
                onChange={(e) => setMicMuted(e.target.checked)}
                className="rounded bg-[#0A0D14] border-[#222E44] text-sky-500 focus:ring-0"
              />
              <span>Mute microphone upon entering rooms</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={camOff}
                onChange={(e) => setCamOff(e.target.checked)}
                className="rounded bg-[#0A0D14] border-[#222E44] text-sky-500 focus:ring-0"
              />
              <span>Turn camera off upon entering rooms</span>
            </label>
          </div>

          {/* Editor Preferences */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Editor Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                className="w-full bg-[#0A0D14] border border-[#222E44] rounded-lg px-3 py-2 text-white outline-none"
              >
                <option value="12">12 px</option>
                <option value="13.5">13.5 px (Default)</option>
                <option value="15">15 px</option>
                <option value="16">16 px</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Tab Size</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(e.target.value)}
                className="w-full bg-[#0A0D14] border border-[#222E44] rounded-lg px-3 py-2 text-white outline-none"
              >
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
              </select>
            </div>
          </div>

          {/* User ID & API Token */}
          <div className="p-3 rounded-xl bg-[#0C101A] border border-[#1E2638] space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
              USER IDENTIFIER & ACCESS TOKEN
            </span>
            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>Account ID:</span>
              <span className="text-sky-400">{user?._id || user?.id || 'usr_89f02c'}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 pt-1">
              <span>JWT Bearer Token:</span>
              <button
                type="button"
                onClick={handleCopyToken}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedToken ? 'Copied' : 'Copy Token'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#182032] hover:bg-[#202B42] text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white text-xs font-semibold shadow-md shadow-sky-500/20"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
