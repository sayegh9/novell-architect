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
  Quote,
  FileText,
  CheckSquare,
  Square,
  Save,
  Check,
  Wand2,
  Crown,
  Medal,
  Activity,
  Flame,
  Feather
} from 'lucide-react';
import { fetchEditLogs, runAction, applyCutsCustom, fetchBriefs, saveBrief } from '../services/api';
import { BriefItem } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const EditorialLab: React.FC = () => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState<'cuts' | 'briefs' | 'tournament' | 'panel' | 'review'>('cuts');
  const [logs, setLogs] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Cuts state
  const [selectedQuotes, setSelectedQuotes] = useState<Record<string, boolean>>({});
  const [applyingCuts, setApplyingCuts] = useState(false);

  // Briefs state
  const [briefs, setBriefs] = useState<BriefItem[]>([]);
  const [selectedBriefCh, setSelectedBriefCh] = useState<number>(1);
  const [briefContent, setBriefContent] = useState<string>('');
  const [briefSaved, setBriefSaved] = useState(false);

  useEffect(() => {
    loadLogs();
    loadBriefs();
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

  const loadBriefs = async () => {
    try {
      const res = await fetchBriefs();
      setBriefs(res.briefs || []);
      if (res.briefs && res.briefs.length > 0) {
        const found = res.briefs.find(b => b.chapter === selectedBriefCh) || res.briefs[0];
        setSelectedBriefCh(found.chapter);
        setBriefContent(found.content);
      }
    } catch (e) {
      console.error('Failed to load briefs:', e);
    }
  };

  const handleSelectBriefCh = (chNum: number) => {
    setSelectedBriefCh(chNum);
    const found = briefs.find(b => b.chapter === chNum);
    setBriefContent(found ? found.content : `// No brief generated yet for Chapter ${chNum}.\nClick "Generate Revision Brief" to analyze panel feedback.`);
  };

  const handleSaveBrief = async () => {
    try {
      await saveBrief(selectedBriefCh, briefContent);
      setBriefSaved(true);
      success(lang === 'ar' ? 'تم حفظ مذكرة التحرير بنجاح!' : 'Revision brief saved successfully!');
      setTimeout(() => setBriefSaved(false), 2000);
      loadBriefs();
    } catch (e: any) {
      error(`Failed to save brief: ${e.message}`);
    }
  };

  const handleGenBrief = async () => {
    try {
      setTriggering(true);
      await runAction('gen_brief', { chapter: selectedBriefCh });
      success(lang === 'ar' ? `بدأ توليد مذكرة التحرير للفصل ${selectedBriefCh}!` : `Generating brief for Chapter ${selectedBriefCh}!`);
      setTimeout(loadBriefs, 3000);
    } catch (e: any) {
      error(`Generation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleRewriteChapter = async () => {
    try {
      setTriggering(true);
      await runAction('gen_revision', { chapter: selectedBriefCh });
      success(lang === 'ar' ? `بدأت إعادة صياغة الفصل ${selectedBriefCh}!` : `Rewriting Chapter ${selectedBriefCh} from revision brief!`);
    } catch (e: any) {
      error(`Rewrite failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleAction = async (action: string, params: any = {}) => {
    try {
      setTriggering(true);
      await runAction(action, params);
      success(lang === 'ar' 
        ? `بدأ تنفيذ ${action}! تابع المخرجات في شاشة البث.`
        : `Action ${action} started! Follow output in Terminal Stream.`);
    } catch (e: any) {
      error(`Execution failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const toggleQuoteSelect = (chNum: number, quote: string) => {
    const key = `${chNum}::${quote}`;
    setSelectedQuotes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplySelectedCuts = async (chNum: number) => {
    const quotesToCut = Object.keys(selectedQuotes)
      .filter(k => k.startsWith(`${chNum}::`) && selectedQuotes[k])
      .map(k => k.replace(`${chNum}::`, ''));

    if (quotesToCut.length === 0) {
      alert(lang === 'ar' ? 'يرجى تحديد اقتباس واحد على الأقل للحذف.' : 'Please select at least one cut quote.');
      return;
    }

    try {
      setApplyingCuts(true);
      const res = await applyCutsCustom(chNum, quotesToCut);
      success(lang === 'ar' ? `تم حذف ${res.applied_cuts} اقتباسات (~${res.words_removed} كلمة) بنجاح!` : `Applied ${res.applied_cuts} cuts, removing ${res.words_removed} words!`);
      loadLogs();
    } catch (e: any) {
      error(`Failed to apply cuts: ${e.message}`);
    } finally {
      setApplyingCuts(false);
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
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ٣ • المراجعة والتحرير' : 'Phase 3 • Revision & Surgery'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Scissors className="w-6 h-6 text-amber-500" />
            {t('editorial.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('editorial.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadLogs(); loadBriefs(); }}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#23293d] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('btn.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-[#20273a] pb-2">
        <button
          onClick={() => setActiveTab('cuts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'cuts'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{t('editorial.tab_cuts')} ({cutsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('briefs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'briefs'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('editorial.tab_briefs')} ({briefs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('tournament')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'tournament'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t('editorial.tab_tournament')}</span>
        </button>

        <button
          onClick={() => setActiveTab('panel')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'panel'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('editorial.tab_panel')}</span>
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'review'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>{t('editorial.tab_review')} ({reviews.length})</span>
        </button>
      </div>

      {/* Tab 1: Adversarial Cuts with Interactive Snip Surgery */}
      {activeTab === 'cuts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'اقتطاعات استخرجها المحكم لحذف الفائض السردي. حدد الاقتباسات وطبق الحذف مباشرة على مسودة الفصل.' : 'Cuts extracted by the judge. Select quotes and click "Apply Selected Cuts" to excise repetitive prose.'}
            </div>
            <button
              onClick={() => handleAction('adversarial_edit', { chapter: 'all' })}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('editorial.btn_cuts')}</span>
            </button>
          </div>

          {cutsList.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-2">
              <TrendingDown className="w-8 h-8 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? 'لا توجد سجلات حذف حشو بعد' : 'No Adversarial Cut Logs Found'}</div>
              <div>{lang === 'ar' ? 'انقر على الزر أعلاه لاستخراج الحشو من الفصول.' : 'Click "Run Cuts On All Chapters" to generate fat-removal targets.'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cutsList.map((c: any, idx: number) => {
                const cuts = c.data?.cuts || [];
                const chMatch = c.filename.match(/ch(\d+)_cuts/);
                const chNum = chMatch ? parseInt(chMatch[1]) : idx + 1;

                return (
                  <div key={idx} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-2.5">
                        <span className="font-mono text-xs text-amber-500 font-semibold">{c.filename}</span>
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-mono font-bold">
                          {c.data?.overall_fat_percentage || 0}% {lang === 'ar' ? 'حشو' : 'fat'} (~{c.data?.total_cuttable_words || 0} {lang === 'ar' ? 'كلمة' : 'words'})
                        </span>
                      </div>

                      {c.data?.one_sentence_verdict && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-[#0a0d14] p-3 rounded-xl border border-slate-200 dark:border-[#1b2131]">
                          "{c.data.one_sentence_verdict}"
                        </p>
                      )}

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {cuts.map((cut: any, cIdx: number) => {
                          const isSelected = !!selectedQuotes[`${chNum}::${cut.quote}`];
                          return (
                            <div 
                              key={cIdx} 
                              onClick={() => toggleQuoteSelect(chNum, cut.quote)}
                              className={`text-[11px] p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                                isSelected 
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-500/50 text-rose-900 dark:text-rose-100' 
                                  : 'bg-slate-50/70 dark:bg-[#0d1017] border-slate-200 dark:border-[#1e2538] hover:border-slate-300 dark:hover:border-[#2a344d]'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <div className="flex items-center gap-1.5">
                                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-rose-500" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                                  <span className="font-mono uppercase text-rose-600 dark:text-rose-400 font-bold">{cut.type}</span>
                                </div>
                                <span className="text-slate-400">{cut.action}</span>
                              </div>
                              <p className="text-slate-800 dark:text-slate-200 line-clamp-2">"{cut.quote}"</p>
                              {cut.reason && <p className="text-[10px] text-slate-500 italic">{cut.reason}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplySelectedCuts(chNum)}
                      disabled={applyingCuts}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl bg-rose-600/10 dark:bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>{t('editorial.apply_selected_cuts')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Revision Briefs & Chapter Rewriter */}
      {activeTab === 'briefs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'مذكرات تحرير موجهة لكل فصل مبنية على توافق آراء لجنة القراء، مع إمكانية إعادة صياغة الفصل كاملاً.' : 'Targeted chapter revision briefs based on reader critique consensus. Rewrite chapters with one click.'}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGenBrief}
                disabled={triggering}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Wand2 className="w-3.5 h-3.5 fill-current" />
                <span>{t('editorial.btn_gen_brief')} ({selectedBriefCh})</span>
              </button>

              <button
                onClick={handleRewriteChapter}
                disabled={triggering}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('editorial.btn_rewrite')} ({selectedBriefCh})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Col: Briefs selector */}
            <div className="lg:col-span-1 space-y-3">
              <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-4 shadow-xl space-y-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block border-b border-slate-100 dark:border-[#20273a] pb-2">
                  {lang === 'ar' ? 'اختر الفصل' : 'Select Chapter'}
                </span>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(num => {
                    const hasBrief = briefs.some(b => b.chapter === num);
                    const isSelected = selectedBriefCh === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleSelectBriefCh(num)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161a26] border border-transparent'
                        }`}
                      >
                        <span>{lang === 'ar' ? `فصل ${num}` : `Chapter ${num}`}</span>
                        {hasBrief ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold">Ready</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">none</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 3 Cols: Brief Editor */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-300 font-mono">
                    <FileText className="w-4 h-4" />
                    <span>ch_{selectedBriefCh.toString().padStart(2, '0')}_brief.md</span>
                  </div>
                  <button
                    onClick={handleSaveBrief}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a2030] hover:bg-slate-200 dark:hover:bg-[#232b40] text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
                  >
                    {briefSaved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{briefSaved ? t('seed.saved') : t('editorial.save_brief')}</span>
                  </button>
                </div>

                <textarea
                  value={briefContent}
                  onChange={(e) => setBriefContent(e.target.value)}
                  rows={20}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-5 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
                  placeholder={`Revision instructions for Chapter ${selectedBriefCh}...`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tournament Visual Podium */}
      {activeTab === 'tournament' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'دوري المقارنات الرأس برأس بين الفصول لاحتساب تصنيف Elo الأدبي.' : 'Head-to-head chapter match-ups for true literary quality rankings.'}
            </div>
            <button
              onClick={() => handleAction('compare_chapters')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{lang === 'ar' ? 'تشغيل دوري المقارنات' : 'Run Elo Tournament'}</span>
            </button>
          </div>

          {!tournament?.leaderboard ? (
            <div className="p-12 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-2">
              <Trophy className="w-8 h-8 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? 'لا توجد نتائج لدوري المقارنات بعد' : 'No Tournament Standings Yet'}</div>
              <div>{lang === 'ar' ? 'انقر أعلاه لبدء مباريات المقارنة بين الفصول.' : 'Click "Run Elo Tournament" to rank your chapters.'}</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium View for Top 3 */}
              {tournament.leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 text-center">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Medal className="w-7 h-7 text-slate-400" />
                    <div className="font-serif font-bold text-sm text-slate-700 dark:text-slate-200">
                      {lang === 'ar' ? `فصل ${tournament.leaderboard[1].chapter}` : `Chapter ${tournament.leaderboard[1].chapter}`}
                    </div>
                    <div className="font-mono text-xs text-amber-500 font-bold">{Math.round(tournament.leaderboard[1].elo)} ELO</div>
                    <div className="w-full h-24 rounded-t-2xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-500 text-lg">
                      2
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Crown className="w-9 h-9 text-amber-500 animate-bounce" />
                    <div className="font-serif font-bold text-base text-amber-600 dark:text-amber-300">
                      {lang === 'ar' ? `فصل ${tournament.leaderboard[0].chapter}` : `Chapter ${tournament.leaderboard[0].chapter}`}
                    </div>
                    <div className="font-mono text-sm text-amber-500 font-extrabold">{Math.round(tournament.leaderboard[0].elo)} ELO</div>
                    <div className="w-full h-32 rounded-t-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center font-extrabold text-amber-500 text-2xl shadow-lg shadow-amber-500/10">
                      1
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Medal className="w-6 h-6 text-amber-700" />
                    <div className="font-serif font-bold text-sm text-slate-700 dark:text-slate-200">
                      {lang === 'ar' ? `فصل ${tournament.leaderboard[2].chapter}` : `Chapter ${tournament.leaderboard[2].chapter}`}
                    </div>
                    <div className="font-mono text-xs text-amber-500 font-bold">{Math.round(tournament.leaderboard[2].elo)} ELO</div>
                    <div className="w-full h-18 rounded-t-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-slate-500 text-base">
                      3
                    </div>
                  </div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-2">
                {tournament.leaderboard.map((item: any, rank: number) => (
                  <div key={item.chapter} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538] text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        rank === 0 ? 'bg-amber-500 text-slate-950' : rank === 1 ? 'bg-slate-300 text-slate-950' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {rank + 1}
                      </span>
                      <span className="font-serif font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? `الفصل ${item.chapter}` : `Chapter ${item.chapter}`}</span>
                    </div>
                    <span className="font-mono text-amber-500 font-bold">{Math.round(item.elo)} ELO</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 4-Persona Reader Panel */}
      {activeTab === 'panel' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'تقييم نقدي متعمق من 4 شخصيات قارئة: المحرر، قارئ الفانتازيا، الكاتب الروائي، والقارئ العادي.' : 'Holistic full-arc review from 4 distinct reader personas.'}
            </div>
            <button
              onClick={() => handleAction('reader_panel')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('editorial.btn_panel')}</span>
            </button>
          </div>

          {!panel?.readers ? (
            <div className="p-12 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-2">
              <Users className="w-8 h-8 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? 'لم يتم تشغيل لجنة القراء بعد' : 'No Reader Panel Feedback Yet'}</div>
              <div>{lang === 'ar' ? 'انقر على "تشغيل لجنة القراء" للاستماع إلى آراء الشخصيات الأربعة.' : 'Click "Run Reader Panel" to gather holistic arc critiques.'}</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.entries(panel.readers).map(([readerKey, rData]: [string, any]) => {
                const personaEmoji = readerKey.includes('editor') ? '🧐' : readerKey.includes('genre') ? '🐉' : readerKey.includes('writer') ? '🖋️' : '📖';
                return (
                  <div key={readerKey} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{personaEmoji}</span>
                        <span className="font-semibold text-xs text-amber-600 dark:text-amber-400 capitalize">{readerKey.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto pr-1">
                      {rData.best_scene && (
                        <div>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">{lang === 'ar' ? 'أفضل مشهد:' : 'Best Scene:'}</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">{rData.best_scene}</p>
                        </div>
                      )}
                      {rData.momentum_loss && (
                        <div>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase">{lang === 'ar' ? 'مواضع تباطؤ السرد:' : 'Momentum Loss:'}</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">{rData.momentum_loss}</p>
                        </div>
                      )}
                      {rData.would_recommend && (
                        <div>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">{lang === 'ar' ? 'حكم التوصية:' : 'Verdict / Recommendation:'}</span>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">{rData.would_recommend}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Manuscript Reviews */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? 'مراجعة أدبية عميقة للرواية كاملة بصوت ناقد أدبي وأستاذ كتابة روائية.' : 'Deep novel review by a literary critic & fiction professor.'}
            </div>
            <button
              onClick={() => handleAction('review')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('editorial.btn_review')}</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-2">
              <BookOpenCheck className="w-8 h-8 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? 'لا توجد مراجعات نقدية بعد' : 'No Full Reviews Logged Yet'}</div>
              <div>{lang === 'ar' ? 'انقر على "تشغيل المراجعة الشاملة" لإجراء تقييم نقدي للمخطوطة.' : 'Click "Run Full Review" to run the deep literary evaluation.'}</div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                    <span className="font-semibold text-xs text-amber-600 dark:text-amber-300 font-mono">{r.timestamp || `Review #${idx + 1}`}</span>
                    {r.stars && (
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>{r.stars} / 5</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto pr-2 font-mono">
                    {r.review_text || JSON.stringify(r, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
