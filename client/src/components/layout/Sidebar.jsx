import React from 'react';
import { 
  Code2, 
  PenTool, 
  Video, 
  LayoutGrid, 
  FileText, 
  GitBranch, 
  Activity 
} from 'lucide-react';

export const Sidebar = ({ 
  currentTab, 
  setCurrentTab,
  activeBranch = 'feat/cluster-sync'
}) => {
  const toolingItems = [
    { id: 'workspace', label: 'Live Editor', icon: Code2 },
    { id: 'whiteboard', label: 'Architecture Canvas', icon: PenTool },
    { id: 'sessions', label: 'Active Calls', icon: Video },
    { id: 'dashboard', label: 'Session Overview', icon: LayoutGrid },
    { id: 'docs', label: 'Documentation', icon: FileText },
  ];

  return (
    <aside className="w-56 bg-[#0B0F17] border-r border-[#1E2638] flex flex-col justify-between select-none shrink-0 h-[calc(100vh-3.5rem)]">
      {/* Top Nav */}
      <div className="p-3">
        <div className="px-3 pt-3 pb-2 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
          WORKSPACE TOOLING
        </div>
        <nav className="space-y-1">
          {toolingItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#141B2A] text-white border-l-2 border-sky-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#101522]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Status Panel */}
      <div className="p-3 border-t border-[#1E2638] text-[11px] font-mono space-y-2 bg-[#090C13]">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            WebRTC Mesh
          </span>
          <span className="text-emerald-400 font-semibold">Optimal</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-sky-400" />
            Active Branch
          </span>
          <span className="text-sky-400 font-medium truncate max-w-[90px]" title={activeBranch}>
            {activeBranch}
          </span>
        </div>
      </div>
    </aside>
  );
};
