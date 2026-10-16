import React from 'react';
import { AlertTriangle, Lock, Users, ArrowLeft } from 'lucide-react';

export const RoomFullModal = ({ isOpen, onClose, onReturnToDashboard }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#121622] border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold mb-2">
            <Lock className="w-3 h-3" />
            <span>ATOMIC LIMIT: 10 / 10 PEERS</span>
          </div>
          <h2 className="text-xl font-bold text-white">Room Full (Access Locked)</h2>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            This collaborative room has already reached its hard limit of <b>10 active participants</b>. The 11th connection was rejected by the cluster mesh to prevent WebRTC bitrate collapse and CRDT concurrency conflicts.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-[#090C12] border border-[#1E2638] text-[11px] font-mono text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Active Mesh Peers
          </span>
          <span className="text-amber-400 font-bold">10 / 10 Max Capacity</span>
        </div>

        <div className="pt-2 flex items-center justify-center space-x-3">
          <button
            onClick={onReturnToDashboard}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
