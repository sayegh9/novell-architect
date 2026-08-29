import React, { useState } from 'react';
import { ProjectInfo } from '../types';
import { Play, Square, RefreshCw, Cpu, BookCheck, Award, Zap } from 'lucide-react';
import { runAction, stopAction } from '../services/api';

interface TopbarProps {
  info: ProjectInfo | null;
  onRefresh: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ info, onRefresh }) => {
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [fromScratch, setFromScratch] = useState<boolean>(false);
  const [maxCycles, setMaxCycles] = useState<number>(4);
  const [loading, setLoading] = useState(false);

  const isRunning = info?.is_job_running || false;
  const state = info?.state;

  const handleRunPipeline = async () => {
    try {
      setLoading(true);
      await runAction('run_pipeline', {
        phase: selectedPhase === 'all' ? undefined : selectedPhase,
        from_scratch: fromScratch,
        max_cycles: maxCycles,
      });
      setShowRunModal(false);
      onRefresh();
    } catch (e: any) {
      alert(`Error starting pipeline: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      await stopAction();
      onRefresh();
    } catch (e: any) {
      alert(`Error stopping process: ${e.message}`);
    }
  };

  const phases = ['foundation', 'drafting', 'revision', 'export'];
  const currentPhaseIndex = phases.indexOf(state?.phase?.toLowerCase() || 'foundation');

  return (
    <header className="h-16 bg-[#0d1017] border-b border-[#202637] px-6 flex items-center justify-between select-none">
      {/* Phase Progression Stepper */}
      <div className="flex items-center gap-2">
        {phases.map((p, idx) => {
          const isDone = idx < currentPhaseIndex;
          const isCurrent = idx === currentPhaseIndex;
          return (
            <React.Fragment key={p}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isCurrent 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : isDone
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#151924] text-slate-400 border border-[#23293d]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isCurrent ? 'bg-amber-400 animate-ping' : isDone ? 'bg-emerald-400' : 'bg-slate-400'
                }`} />
                <span className="capitalize">{p}</span>
              </div>
              {idx < phases.length - 1 && (
                <div className={`w-3 h-0.5 ${idx < currentPhaseIndex ? 'bg-emerald-500/50' : 'bg-[#23293d]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Novel Metrics Badges */}
      <div className="flex items-center gap-4">
        {/* Word Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#202637] text-xs">
          <BookCheck className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Words:</span>
          <span className="font-mono font-semibold text-slate-100">
            {info?.total_words ? info.total_words.toLocaleString() : '0'}
          </span>
        </div>

        {/* Chapters */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#202637] text-xs">
          <span className="text-slate-400">Chapters:</span>
          <span className="font-mono font-semibold text-slate-100">
            {info?.chapters_count || 0}
          </span>
        </div>

        {/* Foundation Score */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-[#202637] text-xs">
          <Award className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400">Foundation:</span>
          <span className="font-mono font-semibold text-amber-300">
            {state?.foundation_score ? state.foundation_score.toFixed(1) : '0.0'}
          </span>
        </div>

        {/* Engine Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/60 border border-slate-700/60 text-[11px] font-mono text-slate-300">
          <Cpu className="w-3 h-3 text-emerald-400" />
          <span>{info?.env_keys.writer_model || 'gemini-2.5-pro'}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Execution</span>
            </button>
          ) : (
            <button
              onClick={() => setShowRunModal(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Pipeline</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            title="Refresh State"
            className="p-1.5 rounded-lg hover:bg-[#1b2030] text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#283045] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Run Pipeline Modal */}
      {showRunModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121622] border border-[#262f44] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#262f44] pb-3">
              <h3 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Launch Pipeline Orchestrator
              </h3>
              <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Execution Scope</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-[#262f44] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Full Autonomous Pipeline (All Phases)</option>
                  <option value="foundation">Phase 1: Foundation Only</option>
                  <option value="drafting">Phase 2: First Draft Only</option>
                  <option value="revision">Phase 3: Revision Cycles Only</option>
                  <option value="export">Phase 4: Export (PDF/EPUB/Art) Only</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-[#0a0d14] border border-[#20273a]">
                <div>
                  <div className="font-medium text-slate-200">Start from Scratch</div>
                  <div className="text-[11px] text-slate-400">Reset state and start fresh from seed.txt</div>
                </div>
                <input
                  type="checkbox"
                  checked={fromScratch}
                  onChange={(e) => setFromScratch(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Max Revision Cycles</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxCycles}
                  onChange={(e) => setMaxCycles(parseInt(e.target.value) || 4)}
                  className="w-full bg-[#0a0d14] border border-[#262f44] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#262f44]">
              <button
                onClick={() => setShowRunModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRunPipeline}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
              >
                {loading ? 'Starting...' : 'Start Execution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
