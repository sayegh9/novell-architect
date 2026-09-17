import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  BookOpen, 
  Scissors, 
  RefreshCw, 
  Flame, 
  Sparkles,
  Trophy,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { fetchAnalytics, fetchRevisionHealth, fetchEvalLog } from '../services/api';
import { AnalyticsData } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export const AnalyticsDashboard: React.FC = () => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedCh, setExpandedCh] = useState<number | null>(null);
  const [evalLogs, setEvalLogs] = useState<Record<number, any>>({});

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, healthRes] = await Promise.all([
        fetchAnalytics(),
        fetchRevisionHealth().catch(() => null)
      ]);
      setData(analyticsRes);
      if (healthRes) setHealthData(healthRes);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleChapter = async (chNum: number) => {
    if (expandedCh === chNum) {
      setExpandedCh(null);
      return;
    }
    setExpandedCh(chNum);
    if (!evalLogs[chNum]) {
      try {
        const log = await fetchEvalLog(chNum);
        setEvalLogs(prev => ({ ...prev, [chNum]: log }));
      } catch (e) {
        console.error('Failed to load eval log', e);
      }
    }
  };

  const chapters = data?.chapters || [];
  const history = data?.history || [];

  // Generate SVG curve points for history scores
  const scoreHistory = history.filter(h => h.score !== null);
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = 20;

  const points = scoreHistory.map((item, idx) => {
    const x = scoreHistory.length > 1 ? padding + (idx / (scoreHistory.length - 1)) * (svgWidth - 2 * padding) : svgWidth / 2;
    const scores = scoreHistory.map(h => h.score!);
    const maxS = Math.max(...scores, 10);
    const minS = Math.min(...scores, 0);
    const range = maxS - minS || 1;
    const y = svgHeight - padding - ((item.score! - minS) / range) * (svgHeight - 2 * padding);
    return { x, y, score: item.score };
  });
  const pathD = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';

  return (
    <div className={`p-4 md:p-8 space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            {t('analytics.title')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('analytics.subtitle')}</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-lg text-slate-500 hover:text-amber-500 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
        </button>
      </div>

      {healthData && (
        <div className={`bg-gradient-to-r ${healthData.ready_to_export ? 'from-emerald-500/10 to-teal-500/5' : 'from-indigo-500/10 to-blue-500/5'} border ${healthData.ready_to_export ? 'border-emerald-500/30' : 'border-indigo-500/30'} rounded-2xl p-6 shadow-sm`}>
          <h3 className={`font-bold text-sm flex items-center gap-2 mb-4 ${healthData.ready_to_export ? 'text-emerald-700 dark:text-emerald-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
            <Activity className="w-4 h-4" />
            Revision Health & Export Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-mono mb-1">Cycle</div>
              <div className="font-bold text-lg text-slate-800 dark:text-slate-200">{healthData.current_cycle}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl">
              <div className="text-xs text-slate-500 font-mono mb-1">Score Delta</div>
              <div className="font-bold text-lg text-slate-800 dark:text-slate-200">{healthData.score_delta > 0 ? '+' : ''}{healthData.score_delta}</div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-500 font-mono mb-1">Plateau</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {healthData.plateau_approaching ? 'Approaching' : 'Improving'}
                </div>
              </div>
              {healthData.plateau_approaching && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            </div>
            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl flex items-center gap-3">
              <div>
                <div className="text-xs text-slate-500 font-mono mb-1">Status</div>
                <div className={`font-bold text-sm ${healthData.ready_to_export ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                  {healthData.ready_to_export ? 'Ready for Export' : 'Iterating'}
                </div>
              </div>
              {healthData.ready_to_export && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg text-amber-600 dark:text-amber-500">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('stats.words')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
            {data?.total_words ? (data.total_words / 1000).toFixed(1) + 'k' : '0'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-500">
              <Award className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('stats.score')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
            {data?.average_chapter_score?.toFixed(1) || '0.0'}
          </p>
        </div>

        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-500">
              <Scissors className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{lang === 'ar' ? 'نسبة الحشو' : 'Fat %'}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
            {data?.overall_fat_percentage?.toFixed(1) || '0.0'}%
          </p>
        </div>

        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-500">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('stats.chapters')}</h3>
          </div>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-mono">
            {data?.total_chapters || '0'}
          </p>
        </div>
      </div>

      {/* Progress Chart */}
      {scoreHistory.length > 0 && (
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {t('analytics.progress_title')}
            </h3>
          </div>
          <div className="w-full overflow-x-auto relative h-[180px] flex items-center justify-center">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full max-w-2xl h-full drop-shadow-sm">
              <path d={pathD} fill="none" stroke="currentColor" strokeWidth="3" className="text-amber-500/30" />
              {points.map((p, idx) => (
                <g key={idx} className="cursor-pointer group">
                  <circle cx={p.x} cy={p.y} r="5" className="fill-amber-500 stroke-white dark:stroke-[#12151f] stroke-2 transition-transform group-hover:scale-125" />
                  <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[10px] font-mono fill-slate-700 dark:fill-slate-300 font-bold">
                    {p.score}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Chapter Quality & Fat Heatmap */}
      <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500" />
            {t('analytics.heatmap_title')}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {chapters.length} {t('stats.chapters')}
          </span>
        </div>

        {chapters.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs italic">
            {lang === 'ar' ? 'لا توجد فصول مكتوبة بعد لعرض الخريطة الحرارية.' : 'No drafted chapters found yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {chapters.map((ch) => {
              const score = ch.score;
              const isHigh = score !== null && score >= 7.5;
              const isMid = score !== null && score >= 6.0 && score < 7.5;
              const isExpanded = expandedCh === ch.chapter;
              const log = evalLogs[ch.chapter];

              return (
                <div
                  key={ch.chapter}
                  onClick={() => toggleChapter(ch.chapter)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isHigh
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'
                      : isMid
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                      : 'bg-slate-50 dark:bg-[#0a0d14] border-slate-200 dark:border-[#1e2538]'
                  }`}
                >
                  <div className="flex flex-col space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-amber-500 font-bold">
                        {lang === 'ar' ? `فصل ${ch.chapter.toString().padStart(2, '0')}` : `Ch ${ch.chapter.toString().padStart(2, '0')}`}
                      </span>
                      <div className="flex items-center gap-2">
                        {score !== null ? (
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                            isHigh 
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' 
                              : isMid 
                              ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300' 
                              : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300'
                          }`}>
                            {score.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">Unscored</span>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    <div className="text-sm font-serif font-bold text-slate-800 dark:text-slate-200 truncate" title={ch.title}>
                      {ch.title}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{t('stats.words')}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{ch.word_count.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{lang === 'ar' ? 'حشو' : 'Fat'}</span>
                        <span className={ch.fat_percentage > 15 ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {ch.fat_percentage}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-amber-500 font-semibold">{ch.elo} ELO</span>
                      </div>
                    </div>

                    {isExpanded && log && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {log.dimensions && (
                          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                            {Object.entries(log.dimensions).map(([key, value]) => (
                              <div key={key} className="bg-white/50 dark:bg-black/20 p-2 rounded-lg flex justify-between items-center">
                                <span className="text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{value as number}/10</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {log.editor_notes && (
                          <div className="bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
                            <h4 className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-500 mb-1">Editor Notes</h4>
                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{log.editor_notes}</p>
                          </div>
                        )}
                        {log.slop_and_cliches && (
                          <div className="bg-rose-50/50 dark:bg-rose-900/10 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
                            <h4 className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-500 mb-1">Slop Detect</h4>
                            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                              <div><strong>Clichés:</strong> {log.slop_and_cliches.cliche_count}</div>
                              {log.slop_and_cliches.examples?.length > 0 && (
                                <ul className="list-disc pl-4 mt-1 space-y-1">
                                  {log.slop_and_cliches.examples.map((ex: string, i: number) => (
                                    <li key={i}>{ex}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Results History Table */}
      <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            {t('analytics.history_title')}
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {history.length} {lang === 'ar' ? 'تسجيل' : 'entries'}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs italic">
            {t('analytics.no_history')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left select-text">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#20273a] text-[11px] text-slate-400 font-mono uppercase">
                  <th className="py-2.5 px-3">Commit</th>
                  <th className="py-2.5 px-3">Phase</th>
                  <th className="py-2.5 px-3">Score</th>
                  <th className="py-2.5 px-3">Words</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#182030] font-mono text-[11px]">
                {history.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-[#151a28] transition-colors">
                    <td className="py-2.5 px-3 text-amber-500">{row.commit}</td>
                    <td className="py-2.5 px-3 capitalize text-slate-700 dark:text-slate-300">{row.phase}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">{row.score !== null ? row.score : '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{row.word_count ? row.word_count.toLocaleString() : '0'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        row.status === 'PASS' || row.status === 'SUCCESS' 
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
