import React, { useState, useEffect } from 'react';
import { 
  Scissors, 
  Trophy, 
  Users, 
  BookOpenCheck, 
  Play, 
  RefreshCw, 
  Star, 
  AlertCircle,
  TrendingDown,
  Quote
} from 'lucide-react';
import { fetchEditLogs, runAction } from '../services/api';

export const EditorialLab: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'cuts' | 'tournament' | 'panel' | 'review'>('cuts');
  const [logs, setLogs] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchEditLogs();
      setLogs(res || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, params: any = {}) => {
    try {
      setTriggering(true);
      await runAction(action, params);
      alert(`Action ${action} started! Check the Live Terminal stream for output.`);
    } catch (e: any) {
      alert(`Execution failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const tournament = logs.tournament;
  const panel = logs.reader_panel;
  const reviews = logs.reviews || [];
  const cutsList = logs.cuts || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">Phase 3 • Revision</div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Scissors className="w-6 h-6 text-amber-400" />
            Editorial & Revision Lab
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Adversarial mechanical cuts, head-to-head Elo tournament rankings, 4-persona panel consensus, and full novel review.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs border border-[#23293d] transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#20273a] pb-2">
        <button
          onClick={() => setActiveTab('cuts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'cuts'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>Adversarial Cuts ({cutsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tournament')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'tournament'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Elo Tournament Rankings</span>
        </button>

        <button
          onClick={() => setActiveTab('panel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'panel'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4-Persona Reader Panel</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'review'
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>Manuscript Reviews ({reviews.length})</span>
        </button>
      </div>

      {/* Tab 1: Adversarial Cuts View */}
      {activeTab === 'cuts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Cuts extracted by asking the judge to ruthlessly remove 500 words of fat per chapter.
            </div>
            <button
              onClick={() => handleAction('adversarial_edit', { chapter: 'all' })}
              disabled={triggering}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Cuts On All Chapters</span>
            </button>
          </div>

          {cutsList.length === 0 ? (
            <div className="p-12 text-center bg-[#12151f] border border-[#23293d] rounded-xl text-slate-400 text-xs space-y-2">
              <TrendingDown className="w-8 h-8 text-amber-400/50 mx-auto" />
              <div className="font-semibold text-slate-300">No Adversarial Cut Logs Found</div>
              <div>Click "Run Cuts On All Chapters" to generate fat-removal targets.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cutsList.map((c: any, idx: number) => {
                const cuts = c.data?.cuts || [];
                return (
                  <div key={idx} className="bg-[#12151f] border border-[#23293d] rounded-xl p-5 shadow-lg space-y-3">
                    <div className="flex items-center justify-between border-b border-[#20273a] pb-2">
                      <span className="font-mono text-xs font-semibold text-amber-400">{c.filename}</span>
                      <span className="text-xs text-slate-400 font-mono">{cuts.length} cuts flagged</span>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {cuts.map((cut: any, cIdx: number) => (
                        <div key={cIdx} className="p-2.5 rounded-lg bg-[#0a0d14] border border-[#1b2030] text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 font-semibold">
                              {cut.type || 'OVER-EXPLAIN'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">-{cut.words || '?'} words</span>
                          </div>
                          <div className="text-slate-300 italic text-[11px] font-serif">
                            "{cut.quote || cut.text}"
                          </div>
                          {cut.reason && (
                            <div className="text-[11px] text-slate-400">{cut.reason}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Tournament View */}
      {activeTab === 'tournament' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Round-robin head-to-head chapter match-ups yielding true literary quality rankings.
            </div>
            <button
              onClick={() => handleAction('compare_chapters')}
              disabled={triggering}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Elo Tournament</span>
            </button>
          </div>

          {!tournament ? (
            <div className="p-12 text-center bg-[#12151f] border border-[#23293d] rounded-xl text-slate-400 text-xs space-y-2">
              <Trophy className="w-8 h-8 text-amber-400/50 mx-auto" />
              <div className="font-semibold text-slate-300">No Tournament Results Yet</div>
              <div>Run the comparative tournament to generate Elo rankings.</div>
            </div>
          ) : (
            <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Elo Chapter Rankings</h3>
              <pre className="p-4 rounded-lg bg-[#0a0d14] border border-[#1e2436] font-mono text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(tournament, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Reader Panel View */}
      {activeTab === 'panel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              4 distinct personas (The Editor, Genre Reader, Literary Writer, First Reader) reading arc summary.
            </div>
            <button
              onClick={() => handleAction('reader_panel')}
              disabled={triggering}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Reader Panel</span>
            </button>
          </div>

          {!panel ? (
            <div className="p-12 text-center bg-[#12151f] border border-[#23293d] rounded-xl text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 text-amber-400/50 mx-auto" />
              <div className="font-semibold text-slate-300">No Reader Panel Evaluations Yet</div>
              <div>Run the 4-persona reader panel to collect consensus priorities.</div>
            </div>
          ) : (
            <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Panel Feedback & Consensus</h3>
              <pre className="p-4 rounded-lg bg-[#0a0d14] border border-[#1e2436] font-mono text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(panel, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Reviews View */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Dual-persona full novel review (Literary Critic + Professor of Fiction).
            </div>
            <button
              onClick={() => handleAction('review')}
              disabled={triggering}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Deep Manuscript Review</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 text-center bg-[#12151f] border border-[#23293d] rounded-xl text-slate-400 text-xs space-y-2">
              <BookOpenCheck className="w-8 h-8 text-amber-400/50 mx-auto" />
              <div className="font-semibold text-slate-300">No Deep Reviews Recorded</div>
              <div>Run review.py to generate full-manuscript craft feedback and star ratings.</div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev: any, rIdx: number) => (
                <div key={rIdx} className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#20273a] pb-3">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-400 fill-current" />
                      <span className="font-semibold text-sm text-slate-100">
                        {rev.stars ? `${rev.stars} / 5 Stars` : 'Manuscript Review'}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {rev.total_items || 0} Actionable Items ({rev.major_items || 0} major)
                    </span>
                  </div>

                  <pre className="p-4 rounded-lg bg-[#0a0d14] border border-[#1e2436] font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                    {JSON.stringify(rev, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
