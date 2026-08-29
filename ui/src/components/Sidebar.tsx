import React from 'react';
import { 
  Sparkles, 
  Compass, 
  Feather, 
  Scissors, 
  Terminal, 
  BookOpen, 
  Layers, 
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isJobRunning: boolean;
  activePhase: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isJobRunning,
  activePhase,
}) => {
  const navItems = [
    { id: 'seed', label: 'Seed & Concept', icon: Sparkles, badge: 'Phase 0' },
    { id: 'foundation', label: 'Foundation & World', icon: Compass, badge: 'Phase 1' },
    { id: 'drafting', label: 'Drafting Room', icon: Feather, badge: 'Phase 2' },
    { id: 'editorial', label: 'Editorial & Revision', icon: Scissors, badge: 'Phase 3' },
    { id: 'export', label: 'Export & Production', icon: BookOpen, badge: 'Phase 4' },
    { id: 'console', label: 'Live Terminal Stream', icon: Terminal, isLive: isJobRunning },
  ];

  return (
    <aside className="w-64 bg-[#0d1017] border-r border-[#202637] flex flex-col justify-between select-none">
      <div>
        {/* Studio Branding */}
        <div className="p-5 border-b border-[#202637] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-serif font-bold text-xl">
            A
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-slate-100 flex items-center gap-1.5">
              AUTONOVEL
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                STUDIO
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono">Gemini Engine v1.0</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Pipeline Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-300 hover:bg-[#161a26] hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.isLive && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-[#202637] bg-[#090b10]/60 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400">Current Phase:</span>
          <span className="font-mono text-amber-400 capitalize font-medium">{activePhase || 'Foundation'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className={`h-2 w-2 rounded-full ${isJobRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span>{isJobRunning ? 'Subprocess Active' : 'Engine Idle'}</span>
        </div>
      </div>
    </aside>
  );
};
