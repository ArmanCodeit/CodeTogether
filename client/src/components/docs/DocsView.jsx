import React, { useState } from 'react';
import { 
  Book, 
  Code2, 
  Layers, 
  Terminal, 
  ShieldCheck, 
  Network, 
  Keyboard, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';

export const DocsView = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'overview', label: 'Architecture Overview', icon: Layers },
    { id: 'webrtc', label: 'WebRTC P2P Mesh (10 Peers)', icon: Network },
    { id: 'realtime', label: 'Real-Time Sync & CRDT', icon: Code2 },
    { id: 'coturn', label: 'STUN / TURN Relays', icon: ShieldCheck },
    { id: 'api', label: 'REST & Socket.IO Spec', icon: Terminal },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  ];

  return (
    <div className="flex-1 bg-[#0A0D14] flex overflow-hidden select-none">
      {/* Docs Sub-navigation */}
      <div className="w-64 bg-[#0C101A] border-r border-[#1E2638] p-4 flex flex-col space-y-2 shrink-0">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold px-2 mb-1">
          CODETOGETHER SYSTEM MANUAL
        </div>
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#182032] text-white border-l-2 border-sky-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121622]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* Docs Content */}
      <div className="flex-1 p-8 overflow-y-auto max-w-4xl space-y-6 text-sm text-slate-300">
        {activeSection === 'overview' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">CodeTogether v2.4 Architecture</h2>
            <p className="leading-relaxed text-slate-400">
              CodeTogether is an enterprise-grade live collaborative developer workspace combining Monaco Editor, WebRTC audio/video mesh, interactive HTML5 canvas doodle board, and MongoDB version snapshots.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-[#121724] border border-[#1E2638]">
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-sky-400" />
                  Monaco Collaborative Engine
                </h3>
                <p className="text-xs text-slate-400">
                  Full syntax highlighting, language servers for TypeScript, JavaScript, Python, Go, Rust, and live collaborator presence markers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121724] border border-[#1E2638]">
                <h3 className="font-bold text-white text-base mb-1 flex items-center gap-2">
                  <Network className="w-4 h-4 text-emerald-400" />
                  WebRTC Full Mesh
                </h3>
                <p className="text-xs text-slate-400">
                  Strictly capped at 10 peers per room to maintain low-latency peer-to-peer transport without degrading upload bandwidth.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'webrtc' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">WebRTC P2P Mesh Topology</h2>
            <p className="text-slate-400 leading-relaxed">
              In a full mesh topology, every participant maintains a peer connection with all other participants in the room. For N participants, each node maintains N - 1 connections.
            </p>

            <div className="p-4 rounded-xl bg-[#121724] border border-amber-500/30 text-amber-300 text-xs">
              <b>Capacity Constraint:</b> At N = 10, each client manages 9 upstream and 9 downstream streams, which is the mathematically optimal limit before CPU encoding saturation occurs on standard developer hardware.
            </div>

            <div className="rounded-xl bg-[#080B12] border border-[#1E2638] p-4 font-mono text-xs text-sky-400">
              <code>{`// WebRTC Atomic Room Gatekeeper
if (clientsInRoom.size >= 10 && !isAlreadyInRoom) {
  socket.emit('room-full', {
    message: 'Room capacity reached (10/10 active peers). Connection rejected.'
  });
  return;
}`}</code>
            </div>
          </div>
        )}

        {activeSection === 'realtime' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">Real-Time Synchronization & CRDT</h2>
            <p className="text-slate-400 leading-relaxed">
              File tabs, text deltas, and cursor positions are synchronized over Socket.IO using operational transform and CRDT synchronization deltas.
            </p>
            <div className="p-4 rounded-xl bg-[#121724] border border-[#1E2638] space-y-2 text-xs">
              <div className="font-semibold text-white">Supported Synchronized Operations:</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>Incremental code changes with version checking</li>
                <li>Multi-user remote cursor and selection coordinates</li>
                <li>Live file creation, renaming, and tab focus</li>
                <li>Autosave checkpoints directly committed to MongoDB</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'coturn' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">STUN & TURN Server Configuration</h2>
            <p className="text-slate-400 leading-relaxed">
              When symmetric NAT or corporate firewalls block direct UDP hole punching, WebRTC utilizes STUN/TURN relays to traverse firewalls with DTLS/SRTP encryption.
            </p>
            <div className="rounded-xl bg-[#080B12] border border-[#1E2638] p-4 font-mono text-xs text-emerald-400">
              <code>{`// coturn.conf example
listening-port=3478
tls-listening-port=5349
min-port=49152
max-port=65535
realm=codetogether.net
use-auth-secret
static-auth-secret=ENTERPRISE_SECRET_KEY`}</code>
            </div>
          </div>
        )}

        {activeSection === 'shortcuts' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold text-white">Keyboard Shortcuts</h2>
            <div className="divide-y divide-[#1E2638] bg-[#121724] rounded-xl border border-[#1E2638] text-xs">
              {[
                { key: '⌘ / Ctrl + ↵', action: 'Run Tests & Execute Code' },
                { key: 'Option + Shift + F', action: 'Format Document via Prettier/Monaco' },
                { key: 'Hold Space + Drag', action: 'Pan Architecture Canvas' },
                { key: 'P', action: 'Select Drawing Pen on Whiteboard' },
                { key: 'S', action: 'Create Sticky Note' },
                { key: '~1', action: 'Switch to Live Code Editor' },
                { key: '~2', action: 'Switch to Whiteboard' },
              ].map((s, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <span className="font-mono px-2 py-1 rounded bg-[#182032] border border-[#26324A] text-sky-400 font-bold">
                    {s.key}
                  </span>
                  <span className="text-slate-300">{s.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
