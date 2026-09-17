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
  Feather,
  Sparkles,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  Search,
  Layers,
  ArrowRight
} from 'lucide-react';
import { fetchEditLogs, runAction, applyCutsCustom, fetchBriefs, saveBrief } from '../services/api';
import { BriefItem } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const EditorialLab: React.FC = () => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'cuts' | 'briefs' | 'tournament' | 'panel' | 'review'>('cuts');
  const [logs, setLogs] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Cuts state
  const [selectedQuotes, setSelectedQuotes] = useState<Record<string, boolean>>({});
  const [applyingCuts, setApplyingCuts] = useState<Record<number, boolean>>({});
  const [cutsFilterType, setCutsFilterType] = useState<string>('ALL');

  // Briefs state
  const [briefs, setBriefs] = useState<BriefItem[]>([]);
  const [selectedBriefCh, setSelectedBriefCh] = useState<number>(1);
  const [briefContent, setBriefContent] = useState<string>('');
  const [briefSaved, setBriefSaved] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);

  // Review Sub-view state
  const [reviewViewMode, setReviewViewMode] = useState<Record<number, 'critic' | 'professor' | 'full'>>({});

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
      setBriefLoading(true);
      const res = await fetchBriefs();
      const loadedBriefs = res.briefs || [];
      setBriefs(loadedBriefs);
      
      const found = loadedBriefs.find(b => b.chapter === selectedBriefCh);
      if (found) {
        setBriefContent(found.content);
      } else if (loadedBriefs.length > 0 && selectedBriefCh === 1) {
        setSelectedBriefCh(loadedBriefs[0].chapter);
        setBriefContent(loadedBriefs[0].content);
      }
    } catch (e) {
      console.error('Failed to load briefs:', e);
    } finally {
      setBriefLoading(false);
    }
  };

  const handleSelectBriefCh = (chNum: number) => {
    setSelectedBriefCh(chNum);
    const found = briefs.find(b => b.chapter === chNum);
    setBriefContent(found ? found.content : (
      lang === 'ar' 
        ? `// لا توجد مذكرة تحرير محفوظة للفصل ${chNum} بعد.\nانقر على "توليد مذكرة التحرير" لإنشاء توجيهات التنقيح الأدبي بناءً على فحص الفصل ونقد لجنة القراء.`
        : `// No brief generated yet for Chapter ${chNum}.\nClick "Generate Revision Brief" to create targeted editorial directives.`
    ));
  };

  const handleSaveBrief = async () => {
    try {
      await saveBrief(selectedBriefCh, briefContent);
      setBriefSaved(true);
      success(lang === 'ar' ? `تم حفظ مذكرة التحرير للفصل ${selectedBriefCh} بنجاح!` : `Revision brief for Chapter ${selectedBriefCh} saved!`);
      setTimeout(() => setBriefSaved(false), 2000);
      loadBriefs();
    } catch (e: any) {
      error(`Failed to save brief: ${e.message}`);
    }
  };

  const handleGenBrief = async () => {
    try {
      setTriggering(true);
      info(lang === 'ar' ? `بدأ استخراج مذكرة التحرير للفصل ${selectedBriefCh}...` : `Generating revision brief for Chapter ${selectedBriefCh}...`);
      await runAction('gen_brief', { chapter: selectedBriefCh });
      success(lang === 'ar' ? `تم إطلاق أمر توليد المذكرة! راقب مخرجات البث.` : `Brief generator running! Watch Terminal stream.`);
      setTimeout(() => {
        loadBriefs();
      }, 4000);
    } catch (e: any) {
      error(`Generation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleRewriteChapter = async () => {
    try {
      setTriggering(true);
      // Auto-save brief first if content is present
      if (briefContent && !briefContent.startsWith('//')) {
        await saveBrief(selectedBriefCh, briefContent);
      }
      info(lang === 'ar' ? `بدأت إعادة صياغة الفصل ${selectedBriefCh} وفق مذكرة التحرير...` : `Rewriting Chapter ${selectedBriefCh} from editorial brief...`);
      await runAction('gen_revision', { chapter: selectedBriefCh });
      success(lang === 'ar' ? `بدأ المنقح الأدبي في إعادة الصياغة!` : `Chapter revision launched!`);
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
        ? `بدأ تنفيذ ${action}! تابع التقدم في شاشة البث الحية.`
        : `Action ${action} started! Follow progress in Live Console.`);
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

  const handleSelectAllCutsForCh = (chNum: number, cuts: any[]) => {
    const anyUnselected = cuts.some(c => !selectedQuotes[`${chNum}::${c.quote}`]);
    const nextState = { ...selectedQuotes };
    cuts.forEach(c => {
      nextState[`${chNum}::${c.quote}`] = anyUnselected;
    });
    setSelectedQuotes(nextState);
  };

  const handleApplySingleCut = async (chNum: number, quote: string) => {
    try {
      setApplyingCuts(prev => ({ ...prev, [chNum]: true }));
      const res = await applyCutsCustom(chNum, [quote]);
      if (res.applied_cuts > 0) {
        success(lang === 'ar' ? `تم حذف الاقتباس بنجاح (~${res.words_removed} كلمة)!` : `Excised quote successfully (~${res.words_removed} words removed)!`);
      } else {
        info(lang === 'ar' ? `تم حذف الاقتباس مسبقاً أو لم يعد موجوداً في المسودة.` : `Quote was already removed or modified in current draft.`);
      }
      loadLogs();
    } catch (e: any) {
      error(`Failed to apply cut: ${e.message}`);
    } finally {
      setApplyingCuts(prev => ({ ...prev, [chNum]: false }));
    }
  };

  const handleApplySelectedCuts = async (chNum: number) => {
    const quotesToCut = Object.keys(selectedQuotes)
      .filter(k => k.startsWith(`${chNum}::`) && selectedQuotes[k])
      .map(k => k.replace(`${chNum}::`, ''));

    if (quotesToCut.length === 0) {
      info(lang === 'ar' ? 'يرجى تحديد اقتباس واحد على الأقل للحذف.' : 'Please select at least one cut quote.');
      return;
    }

    try {
      setApplyingCuts(prev => ({ ...prev, [chNum]: true }));
      const res = await applyCutsCustom(chNum, quotesToCut);
      if (res.applied_cuts > 0) {
        success(lang === 'ar' 
          ? `تم حذف ${res.applied_cuts} اقتباسات بنجاح (تم التخلص من ~${res.words_removed} كلمة حشو)!` 
          : `Applied ${res.applied_cuts} cuts, removing ~${res.words_removed} words of fat!`);
      } else {
        info(lang === 'ar' ? `لم يتم العثور على تطابق للاقتباسات المحددة في المسودة الحالية.` : `Selected quotes were not found in current draft.`);
      }
      loadLogs();
    } catch (e: any) {
      error(`Failed to apply cuts: ${e.message}`);
    } finally {
      setApplyingCuts(prev => ({ ...prev, [chNum]: false }));
    }
  };

  const tournament = logs.tournament;
  const panel = logs.reader_panel;
  const reviews = logs.reviews || [];
  const cutsList = logs.cuts || [];

  // Derived leaderboard for tournament
  const leaderboard = tournament?.leaderboard || (
    tournament?.ranking && tournament?.elo ? tournament.ranking.map((ch: any) => ({
      chapter: parseInt(ch),
      elo: tournament.elo[String(ch)] || 1500
    })) : null
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ٣ • المراجعة والتحرير الجراحي' : 'Phase 3 • Revision & Surgery'}
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
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#23293d] transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'cuts'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Scissors className="w-4 h-4" />
          <span>{t('editorial.tab_cuts')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {cutsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('briefs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'briefs'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t('editorial.tab_briefs')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {briefs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tournament')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'tournament'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t('editorial.tab_tournament')}</span>
          {leaderboard && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono">
              24 ch
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('panel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'panel'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('editorial.tab_panel')}</span>
          {panel?.readers && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono">
              4 Readers
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('review')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
            activeTab === 'review'
              ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <BookOpenCheck className="w-4 h-4" />
          <span>{t('editorial.tab_review')}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
            {reviews.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Adversarial Cuts with Interactive Snip Surgery */}
      {activeTab === 'cuts' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? 'استئصال الحشو والترهل السردي (Interactive Snip Surgery)' : 'Adversarial Cut Extraction & Surgery'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'استخرج المحكم مقاطع الحشو. حدد الاقتباسات واحذفها مباشرة من ملفات الفصول بدقة جراحية.' : 'Excise repetitive filler, over-explanation, and generic AI tropes with one-click surgery.'}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleAction('adversarial_edit', { chapter: 'all' })}
                disabled={triggering}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('editorial.btn_cuts')}</span>
              </button>
            </div>
          </div>

          {cutsList.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-3">
              <TrendingDown className="w-10 h-10 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{lang === 'ar' ? 'لا توجد سجلات لحذف الحشو بعد' : 'No Adversarial Cut Logs Found'}</div>
              <p className="max-w-md mx-auto text-slate-500">{lang === 'ar' ? 'انقر على "استخراج الحشو لجميع الفصول" لإجراء فحص تمحيصي دقيق لاستخراج الاقتباسات الزائدة.' : 'Click "Run Cuts On All Chapters" to extract purple prose and unnecessary exposition.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {cutsList.map((c: any, idx: number) => {
                const cuts = c.data?.cuts || [];
                const chMatch = c.filename.match(/ch(\d+)_cuts/);
                const chNum = chMatch ? parseInt(chMatch[1]) : idx + 1;
                const isApplying = !!applyingCuts[chNum];
                const selectedCount = cuts.filter((cut: any) => selectedQuotes[`${chNum}::${cut.quote}`]).length;

                return (
                  <div key={idx} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-slate-800 dark:text-slate-200">
                            {lang === 'ar' ? `الفصل ${chNum}` : `Chapter ${chNum}`}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">({c.filename})</span>
                        </div>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-300 font-mono font-bold">
                          {c.data?.overall_fat_percentage || 0}% {lang === 'ar' ? 'حشو' : 'fat'} (~{c.data?.total_cuttable_words || 0} {lang === 'ar' ? 'كلمة' : 'words'})
                        </span>
                      </div>

                      {c.data?.one_sentence_verdict && (
                        <p className="text-xs text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-[#0a0d14] p-3 rounded-xl border border-slate-200 dark:border-[#1b2131] leading-relaxed">
                          "{c.data.one_sentence_verdict}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500 font-mono text-[11px]">{cuts.length} {lang === 'ar' ? 'اقتباسات مرشحة للحذف' : 'cut targets'}</span>
                        <button
                          onClick={() => handleSelectAllCutsForCh(chNum, cuts)}
                          className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                        >
                          {selectedCount === cuts.length ? (lang === 'ar' ? 'إلغاء تحديد الكل' : 'Deselect All') : (lang === 'ar' ? 'تحديد الكل' : 'Select All')}
                        </button>
                      </div>

                      <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                        {cuts.map((cut: any, cIdx: number) => {
                          const isSelected = !!selectedQuotes[`${chNum}::${cut.quote}`];
                          return (
                            <div 
                              key={cIdx} 
                              className={`text-[11px] p-3.5 rounded-xl border transition-all space-y-2 ${
                                isSelected 
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 dark:border-rose-500/50 text-rose-900 dark:text-rose-100' 
                                  : 'bg-slate-50/70 dark:bg-[#0d1017] border-slate-200 dark:border-[#1e2538] hover:border-slate-300 dark:hover:border-[#2a344d]'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <div 
                                  onClick={() => toggleQuoteSelect(chNum, cut.quote)}
                                  className="flex items-center gap-1.5 cursor-pointer"
                                >
                                  {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-rose-500" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                                  <span className="font-mono uppercase text-rose-600 dark:text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/40">{cut.type}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-mono text-[10px]">{cut.action}</span>
                                  <button
                                    onClick={() => handleApplySingleCut(chNum, cut.quote)}
                                    title={lang === 'ar' ? 'حذف هذا الاقتباس فوراً' : 'Excise this quote now'}
                                    className="p-1 rounded hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-500 transition-colors"
                                  >
                                    <Scissors className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              <p 
                                onClick={() => toggleQuoteSelect(chNum, cut.quote)}
                                className="text-slate-800 dark:text-slate-200 cursor-pointer font-serif leading-relaxed line-clamp-3"
                              >
                                "{cut.quote}"
                              </p>
                              {cut.reason && <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">{cut.reason}</p>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplySelectedCuts(chNum)}
                      disabled={isApplying || cuts.length === 0}
                      className="w-full mt-3 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-600/20 active:scale-95"
                    >
                      <Scissors className={`w-3.5 h-3.5 ${isApplying ? 'animate-spin' : ''}`} />
                      <span>
                        {isApplying 
                          ? (lang === 'ar' ? 'جارٍ تنفيذ الاستئصال...' : 'Excising...') 
                          : `${t('editorial.apply_selected_cuts')} (${selectedCount})`}
                      </span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? 'مذكرات التحرير وإعادة الصياغة (Revision Briefs & Rewriter)' : 'Revision Directives & Chapter Rewriting'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'مذكرات تحرير موجهة للفصل تدمج نقد لجنة القراء وحذف الحشو، مع زر إعادة صياغة الفصل كاملاً.' : 'Targeted directives combining panel consensus & voice rules. Rewrite whole chapters from brief.'}
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleGenBrief}
                disabled={triggering}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Wand2 className="w-3.5 h-3.5 fill-current" />
                <span>{t('editorial.btn_gen_brief')} ({selectedBriefCh})</span>
              </button>

              <button
                onClick={handleRewriteChapter}
                disabled={triggering}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
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
                  {lang === 'ar' ? 'فصول الرواية (٢٤ فصلاً)' : 'Chapters (24)'}
                </span>
                <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map(num => {
                    const hasBrief = briefs.some(b => b.chapter === num);
                    const isSelected = selectedBriefCh === num;
                    return (
                      <button
                        key={num}
                        onClick={() => handleSelectBriefCh(num)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                          isSelected
                            ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#161a26] border border-transparent'
                        }`}
                      >
                        <span className="font-medium">{lang === 'ar' ? `الفصل ${num}` : `Chapter ${num}`}</span>
                        {hasBrief ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-mono font-bold">Ready</span>
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
              <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-300 font-mono">
                    <FileText className="w-4 h-4" />
                    <span>briefs/ch_{selectedBriefCh.toString().padStart(2, '0')}_brief.md</span>
                  </div>
                  <button
                    onClick={handleSaveBrief}
                    className="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a2030] hover:bg-slate-200 dark:hover:bg-[#232b40] text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    {briefSaved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{briefSaved ? t('seed.saved') : t('editorial.save_brief')}</span>
                  </button>
                </div>

                <textarea
                  value={briefContent}
                  onChange={(e) => setBriefContent(e.target.value)}
                  rows={22}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-5 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
                  placeholder={`Revision directives for Chapter ${selectedBriefCh}...`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tournament Visual Podium */}
      {activeTab === 'tournament' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? 'دوري المقارنات الرأس-برأس (Elo Chapter Tournament)' : 'Head-to-Head Elo Tournament Standings'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'مباريات مقارنة بين الفصول لاحتساب تصنيف Elo الأدبي الحقيقي وكشف الفصول الأضعف والأقوى.' : 'Round-robin pairwise matchups to compute mathematical Elo rankings and decisive moments.'}
              </div>
            </div>
            
            <button
              onClick={() => handleAction('compare_chapters')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{lang === 'ar' ? 'تشغيل دوري المقارنات الكامل' : 'Run Full Elo Tournament'}</span>
            </button>
          </div>

          {!leaderboard || leaderboard.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-3">
              <Trophy className="w-10 h-10 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{lang === 'ar' ? 'لا توجد نتائج لدوري المقارنات بعد' : 'No Tournament Standings Yet'}</div>
              <p className="max-w-md mx-auto text-slate-500">{lang === 'ar' ? 'انقر على "تشغيل دوري المقارنات" لبدء مباريات التصفيات بين الفصول.' : 'Click "Run Full Elo Tournament" to rank all chapters head-to-head.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Podium View for Top 3 */}
              {leaderboard.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto pt-6 text-center">
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Medal className="w-8 h-8 text-slate-400" />
                    <div className="font-serif font-bold text-sm text-slate-700 dark:text-slate-200">
                      {lang === 'ar' ? `فصل ${leaderboard[1].chapter}` : `Chapter ${leaderboard[1].chapter}`}
                    </div>
                    <div className="font-mono text-xs text-amber-500 font-bold">{Math.round(leaderboard[1].elo)} ELO</div>
                    <div className="w-full h-24 rounded-t-2xl bg-slate-200 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-slate-500 text-lg shadow-md">
                      2
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Crown className="w-10 h-10 text-amber-500 animate-bounce" />
                    <div className="font-serif font-bold text-base text-amber-600 dark:text-amber-300">
                      {lang === 'ar' ? `فصل ${leaderboard[0].chapter}` : `Chapter ${leaderboard[0].chapter}`}
                    </div>
                    <div className="font-mono text-sm text-amber-500 font-extrabold">{Math.round(leaderboard[0].elo)} ELO</div>
                    <div className="w-full h-32 rounded-t-2xl bg-gradient-to-t from-amber-500/20 to-amber-500/30 border-2 border-amber-500/60 flex items-center justify-center font-extrabold text-amber-500 text-2xl shadow-xl shadow-amber-500/10">
                      1
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center justify-end space-y-2">
                    <Medal className="w-7 h-7 text-amber-700" />
                    <div className="font-serif font-bold text-sm text-slate-700 dark:text-slate-200">
                      {lang === 'ar' ? `فصل ${leaderboard[2].chapter}` : `Chapter ${leaderboard[2].chapter}`}
                    </div>
                    <div className="font-mono text-xs text-amber-500 font-bold">{Math.round(leaderboard[2].elo)} ELO</div>
                    <div className="w-full h-18 rounded-t-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center font-bold text-slate-500 text-base shadow-md">
                      3
                    </div>
                  </div>
                </div>
              )}

              {/* Full Leaderboard Table */}
              <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-3">
                <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-[#20273a] pb-3">
                  {lang === 'ar' ? 'جدول ترتيب الفصول الكامل' : 'Complete 24-Chapter Elo Standings'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {leaderboard.map((item: any, rank: number) => (
                    <div key={item.chapter} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538] text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                          rank === 0 ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/40' : rank === 1 ? 'bg-slate-300 text-slate-950' : rank === 2 ? 'bg-amber-700 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {rank + 1}
                        </span>
                        <span className="font-serif font-semibold text-slate-800 dark:text-slate-200">{lang === 'ar' ? `الفصل ${item.chapter}` : `Chapter ${item.chapter}`}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-amber-500 font-bold">{Math.round(item.elo)} ELO</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Matchups Highlights */}
              {tournament.matchups && tournament.matchups.length > 0 && (
                <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
                  <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-[#20273a] pb-3">
                    {lang === 'ar' ? 'سجل لحظات الحسم في المواجهات الثنائية' : 'Decisive Matchup Moments'}
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {tournament.matchups.map((m: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {lang === 'ar' ? `الفائز: الفصل ${m.winner_chapter || m.winner_resolved}` : `Winner: Chapter ${m.winner_chapter || m.winner_resolved}`}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono uppercase font-bold">
                            {m.margin || 'decisive'}
                          </span>
                        </div>
                        {m.decisive_moment && (
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 italic font-serif bg-white dark:bg-[#121622] p-2.5 rounded-lg border border-slate-200 dark:border-[#20273a]">
                            "{m.decisive_moment}"
                          </p>
                        )}
                        {m.winner_strength && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            <strong className="uppercase">{lang === 'ar' ? 'نقطة القوة:' : 'Strength:'}</strong> {m.winner_strength}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: 4-Persona Reader Panel */}
      {activeTab === 'panel' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? 'لجنة القراء الأربعة (4-Persona Reader Panel)' : '4-Persona Reader Panel Evaluation'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'تقييم نقدي متكامل لقوس الرواية كاملاً من 4 شخصيات: المحرر، قارئ الفانتازيا، الكاتب، والقارئ العادي.' : 'Holistic full-arc review across prose texture, pacing, structure, and emotional resonance.'}
              </div>
            </div>
            
            <button
              onClick={() => handleAction('reader_panel')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('editorial.btn_panel')}</span>
            </button>
          </div>

          {!panel?.readers ? (
            <div className="p-16 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-3">
              <Users className="w-10 h-10 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{lang === 'ar' ? 'لم يتم تشغيل لجنة القراء بعد' : 'No Reader Panel Feedback Yet'}</div>
              <p className="max-w-md mx-auto text-slate-500">{lang === 'ar' ? 'انقر على "تشغيل لجنة القراء" للاستماع إلى آراء الشخصيات الأربعة الشاملة.' : 'Click "Run Reader Panel" to gather holistic arc critiques.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(panel.readers).map(([readerKey, rData]: [string, any]) => {
                  const personaEmoji = readerKey.includes('editor') ? '🧐' : readerKey.includes('genre') ? '🐉' : readerKey.includes('writer') ? '🖋️' : '📖';
                  const personaTitle = readerKey.includes('editor') ? (lang === 'ar' ? 'المحرر الأدبي' : 'The Editor') : readerKey.includes('genre') ? (lang === 'ar' ? 'قارئ الفانتازيا والتشويق' : 'The Genre Reader') : readerKey.includes('writer') ? (lang === 'ar' ? 'الكاتب الروائي' : 'The Author') : (lang === 'ar' ? 'القارئ العام' : 'The First Reader');
                  
                  return (
                    <div key={readerKey} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{personaEmoji}</span>
                          <div>
                            <span className="font-bold text-sm text-amber-600 dark:text-amber-400 block">{personaTitle}</span>
                            <span className="text-[10px] text-slate-400 font-mono capitalize">{readerKey.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 max-h-80 overflow-y-auto pr-1">
                        {rData.best_scene && (
                          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40">
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase">{lang === 'ar' ? 'أفضل مشهد:' : 'Best Scene:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">{rData.best_scene}</p>
                          </div>
                        )}

                        {rData.momentum_loss && (
                          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40">
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block uppercase">{lang === 'ar' ? 'مواضع تباطؤ السرد:' : 'Momentum Loss:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">{rData.momentum_loss}</p>
                          </div>
                        )}

                        {rData.cut_candidate && (
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">{lang === 'ar' ? 'المرشح الأول للحذف / التكثيف:' : 'Cut Candidate:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">{rData.cut_candidate}</p>
                          </div>
                        )}

                        {rData.thinnest_character && (
                          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40">
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block uppercase">{lang === 'ar' ? 'الشخصية الأقل عمقاً:' : 'Thinnest Character:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">{rData.thinnest_character}</p>
                          </div>
                        )}

                        {rData.haunts_you && (
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538]">
                            <span className="text-[10px] text-slate-500 font-bold block uppercase">{lang === 'ar' ? 'اللحظة التي تظل عالقة في الذاكرة:' : 'Haunting Moment / Line:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 italic mt-1 leading-relaxed">"{rData.haunts_you}"</p>
                          </div>
                        )}

                        {rData.would_recommend && (
                          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-[#151926] border border-amber-200/50 dark:border-[#22293d]">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block uppercase">{lang === 'ar' ? 'حكم التوصية:' : 'Recommendation Verdict:'}</span>
                            <p className="text-[11px] text-slate-800 dark:text-slate-200 font-semibold mt-1 leading-relaxed">"{rData.would_recommend}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Panel Disagreements */}
              {panel.disagreements && panel.disagreements.length > 0 && (
                <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
                  <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono border-b border-slate-100 dark:border-[#20273a] pb-3">
                    {lang === 'ar' ? 'مواضع تباين الآراء بين القراء (نقاط الحسم التحريري)' : 'Editorial Disagreements & Decision Nodes'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {panel.disagreements.map((d: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538] text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-600 dark:text-amber-400">
                            {lang === 'ar' ? `الفصل ${d.chapter}` : `Chapter ${d.chapter}`} — <span className="uppercase text-[10px]">{d.question}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          <strong>{lang === 'ar' ? 'لاحظ الخلل:' : 'Flagged by:'}</strong> {d.flagged_by.join(', ')}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <strong>{lang === 'ar' ? 'لم يعتبره عيباً:' : 'Not flagged by:'}</strong> {d.not_flagged.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Manuscript Reviews */}
      {activeTab === 'review' && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] p-4 rounded-2xl shadow-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'ar' ? 'المراجعة النقدية الشاملة للمخطوطة (Deep Manuscript Review)' : 'Dual-Persona Manuscript Review'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'ar' ? 'قراءة نقدية للرواية كاملة بصوت ناقد أدبي صحفي وأستاذ كتابة روائية محترف.' : 'Full novel critique: Book Review Critic + Fiction Writing Professor.'}
              </div>
            </div>
            
            <button
              onClick={() => handleAction('review')}
              disabled={triggering}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{t('editorial.btn_review')}</span>
            </button>
          </div>

          {reviews.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl text-slate-400 text-xs space-y-3">
              <BookOpenCheck className="w-10 h-10 text-amber-500/50 mx-auto" />
              <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{lang === 'ar' ? 'لا توجد مراجعات نقدية بعد' : 'No Full Reviews Logged Yet'}</div>
              <p className="max-w-md mx-auto text-slate-500">{lang === 'ar' ? 'انقر على "تشغيل المراجعة الشاملة" لإجراء تقييم نقدي للمخطوطة كاملة.' : 'Click "Run Deep Manuscript Review" to generate full literary assessment.'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((r: any, idx: number) => {
                const mode = reviewViewMode[idx] || 'full';
                const stars = r.stars || 4.5;
                const criticText = r.critic_text || r.critic_summary || r.review_text;
                const professorText = r.professor_text || "";
                const profItems = r.professor_items || [];

                return (
                  <div key={idx} className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-5">
                    {/* Review Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#20273a] pb-4">
                      <div className="space-y-1">
                        <span className="font-mono text-xs text-amber-600 dark:text-amber-400 font-bold block">
                          {r.timestamp || `Review #${idx + 1}`}
                        </span>
                        <div className="text-sm font-bold font-serif text-slate-900 dark:text-slate-100">
                          {r.title || 'Novel Manuscript Evaluation'}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-xs">
                          <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                          <span>{stars} / 5</span>
                        </div>
                      </div>
                    </div>

                    {/* Review Body */}
                    <div className="bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538] rounded-xl p-6 max-h-[500px] overflow-y-auto pr-2 text-xs text-slate-800 dark:text-slate-200 font-serif leading-relaxed whitespace-pre-wrap">
                      {r.review_text || r.critic_text || JSON.stringify(r, null, 2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
