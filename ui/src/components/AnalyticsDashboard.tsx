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
  Trophy
} from 'lucide-react';
import { fetchAnalytics } from '../services/api';
import { AnalyticsData } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export const AnalyticsDashboard: React.FC = () => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchAnalytics();
      setData(res);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chapters = data?.chapters || [];
  const history = data?.history || [];

  // Generate SVG curve points for history scores
  const scoreHistory = history.filter(h => h.score !== null);
  const svgWidth = 600;
  const svgHeight = 160;
  const padding = 20;

  const points = scoreHistory.map((item, idx) => {
    const x = scoreHistory.length > 1 ? padding + (idx / (scoreHistory.length - 1)) * (svgWidth - 2 * padding) : svgWidth / 2;
    const scoreVal = item.score ?? 5;
    const y = svgHeight - padding - ((scoreVal - 0) / 10) * (svgHeight - 2 * padding);
    return { x, y, score: scoreVal, commit: item.commit, phase: item.phase };
  });

  const svgPath = points.length > 1 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'التحليلات والمقاييس' : 'Analytics & Quality Telemetry'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            {t('analytics.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('analytics.subtitle')}
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#23293d] transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('btn.refresh')}</span>
        </button>
      </div>

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Words */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('analytics.total_words')}</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
            {data?.total_words ? data.total_words.toLocaleString() : '0'}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
            {data?.total_chapters || 0} {t('stats.chapters')}
          </div>
        </div>

        {/* Avg Score */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('analytics.avg_score')}</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-600 dark:text-amber-300">
            {data?.average_chapter_score ? `${data.average_chapter_score.toFixed(1)} / 10` : '—'}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
            {data?.average_chapter_score && data.average_chapter_score >= 7.5 ? (lang === 'ar' ? 'جودة نشر ممتازة' : 'Publication Grade') : (lang === 'ar' ? 'قيد المراجعة' : 'In Active Revision')}
          </div>
        </div>

        {/* Overall Fat % */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('analytics.fat_pct')}</span>
            <Scissors className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-rose-600 dark:text-rose-300">
            {data?.overall_fat_percentage !== undefined ? `${data.overall_fat_percentage}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {lang === 'ar' ? 'فائض مقترح حذفه' : 'Estimated cuttable fat'}
          </div>
        </div>

        {/* Convergence State */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{lang === 'ar' ? 'حالة التقارب' : 'Convergence State'}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {history.length > 0 ? (lang === 'ar' ? `دورة ${history.length}` : `Cycle ${history.length}`) : (lang === 'ar' ? 'المسودة الأولى' : 'Draft 1')}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            {lang === 'ar' ? 'تتبع مسار الجودة' : 'Tracking quality iterations'}
          </div>
        </div>
      </div>

      {/* SVG Score Trajectory Sparkline Card */}
      {scoreHistory.length > 0 && (
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{lang === 'ar' ? 'منحنى تقارب الجودة السردية عبر التكرارات' : 'Novel Quality Trajectory (results.tsv)'}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{scoreHistory.length} checkpoints</span>
          </div>

          <div className="w-full overflow-x-auto py-2">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-40 overflow-visible">
              <defs>
                <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
              <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

              {/* Trajectory Path */}
              {points.length > 1 && (
                <>
                  <path
                    d={`${svgPath} L ${points[points.length - 1].x},${svgHeight - padding} L ${points[0].x},${svgHeight - padding} Z`}
                    fill="url(#scoreGrad)"
                  />
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Data Points */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {chapters.map((ch) => {
              const score = ch.score;
              const isHigh = score !== null && score >= 7.5;
              const isMid = score !== null && score >= 6.0 && score < 7.5;

              return (
                <div
                  key={ch.chapter}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isHigh
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30'
                      : isMid
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/30'
                      : 'bg-slate-50 dark:bg-[#0a0d14] border-slate-200 dark:border-[#1e2538]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-amber-500 font-bold">
                      {lang === 'ar' ? `فصل ${ch.chapter.toString().padStart(2, '0')}` : `Ch ${ch.chapter.toString().padStart(2, '0')}`}
                    </span>
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
                  </div>

                  <div className="text-xs font-serif font-semibold text-slate-800 dark:text-slate-200 truncate" title={ch.title}>
                    {ch.title}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-[#1a2233]">
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
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>~{ch.reading_time_min} {lang === 'ar' ? 'د قراءة' : 'min'}</span>
                    <span className="text-amber-500 font-semibold">{ch.elo} ELO</span>
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
