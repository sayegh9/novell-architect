import React, { useState, useEffect } from 'react';
import { 
  Feather, 
  Play, 
  Save, 
  Check, 
  Award, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  PanelLeftClose, 
  PanelLeft, 
  Sliders, 
  Type, 
  Clock, 
  Hash, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { fetchChapter, saveChapter, runAction, fetchFileContent } from '../services/api';
import { ChapterSummary } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const DraftingRoom: React.FC = () => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();
  const { success, error, info: toastInfo } = useToast();

  const [selectedCh, setSelectedCh] = useState<number>(1);
  const [prose, setProse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Split-Screen Beats & Outline Context
  const [showOutlinePanel, setShowOutlinePanel] = useState(true);
  const [outlineContent, setOutlineContent] = useState<string>('');
  
  // Zen Focus Mode & Typography Preferences
  const [zenMode, setZenMode] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [targetWords, setTargetWords] = useState(3500);

  useEffect(() => {
    loadChapterProse(selectedCh);
    loadOutlineDoc();
  }, [selectedCh]);

  const loadChapterProse = async (chNum: number) => {
    try {
      setLoading(true);
      const res = await fetchChapter(chNum);
      setProse(res.content || '');
    } catch {
      setProse(lang === 'ar' 
        ? `// لم تتم كتابة مسودة الفصل ${chNum} بعد.\n// انقر فوق "كتابة الفصل" لصياغته بالذكاء الاصطناعي أو اكتب مباشرة هنا.`
        : `// Chapter ${chNum} draft does not exist yet.\n// Click "Draft Chapter" to generate autonomously, or write here.`);
    } finally {
      setLoading(false);
    }
  };

  const loadOutlineDoc = async () => {
    try {
      const res = await fetchFileContent('outline.md');
      setOutlineContent(res.content || '');
    } catch {
      setOutlineContent('');
    }
  };

  const handleSaveProse = async () => {
    try {
      setLoading(true);
      await saveChapter(selectedCh, prose);
      setSaved(true);
      success(t('seed.saved'));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      error(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftAction = async () => {
    try {
      setTriggering(true);
      await runAction('draft_chapter', { chapter: selectedCh });
      success(lang === 'ar' ? `بدأت كتابة الفصل ${selectedCh} بالذكاء الاصطناعي!` : `Drafting Chapter ${selectedCh} autonomously! Check Live Terminal.`);
    } catch (e: any) {
      error(`Drafting failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleScoreAction = async () => {
    try {
      setTriggering(true);
      await runAction('evaluate_chapter', { chapter: selectedCh });
      success(lang === 'ar' ? `بدأ تقييم الفصل ${selectedCh}!` : `Evaluation started for Chapter ${selectedCh}!`);
    } catch (e: any) {
      error(`Evaluation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  // Word count & progress calculation
  const wordCount = prose.trim() ? prose.trim().split(/\s+/).length : 0;
  const readingTimeMin = Math.max(1, Math.round(wordCount / 225));
  const progressPct = Math.min(100, Math.round((wordCount / targetWords) * 100));

  // Extract beat notes for this chapter from outline.md if found
  const getChapterBeats = (chNum: number) => {
    if (!outlineContent) return null;
    const regex = new RegExp(`(?:##\\s*|###\\s*)(?:Chapter|الفصل)\\s*${chNum}[\\s\\S]*?(?=(?:##\\s*|###\\s*)(?:Chapter|الفصل)|$)`, 'i');
    const match = outlineContent.match(regex);
    return match ? match[0] : null;
  };

  const currentBeats = getChapterBeats(selectedCh);

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-loose',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-[2.2]',
  };

  return (
    <div className={`transition-all ${zenMode ? 'fixed inset-0 z-50 bg-white dark:bg-[#07090e] p-8 overflow-y-auto' : 'p-8 max-w-7xl mx-auto space-y-6'}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ٢ • التوليد السردي والمحرر' : 'Phase 2 • Drafting & Prose Studio'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Feather className="w-6 h-6 text-amber-500" />
            {t('drafting.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('drafting.subtitle')}
          </p>
        </div>

        {/* Action Controls & Zen Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Zen Mode Button */}
          <button
            onClick={() => setZenMode(!zenMode)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              zenMode
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#23293d]'
            }`}
            title={zenMode ? 'Exit Zen Focus Mode (Esc)' : 'Enter Zen Focus Mode'}
          >
            {zenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{zenMode ? (lang === 'ar' ? 'إنهاء وضع التركيز' : 'Exit Zen') : (lang === 'ar' ? 'وضع التركيز الهادئ' : 'Zen Mode')}</span>
          </button>

          {/* Outline Split Toggle */}
          {!zenMode && (
            <button
              onClick={() => setShowOutlinePanel(!showOutlinePanel)}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                showOutlinePanel
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/30'
                  : 'bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#23293d]'
              }`}
              title="Toggle Outline Beats Reference Panel"
            >
              {showOutlinePanel ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              <span className="hidden sm:inline">{lang === 'ar' ? 'لوحة المخطط' : 'Outline Split'}</span>
            </button>
          )}

          {/* Score Chapter Button */}
          <button
            onClick={handleScoreAction}
            disabled={triggering}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t('drafting.btn_score')}</span>
          </button>

          {/* Draft Chapter Button */}
          <button
            onClick={handleDraftAction}
            disabled={triggering}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('drafting.btn_draft')} ({selectedCh})</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveProse}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              saved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? t('seed.saved') : t('drafting.save_prose')}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Chapter Grid Navigator (Hidden in Zen Mode) */}
        {!zenMode && (
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-2.5">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('drafting.ch_list')}</span>
                <span className="text-[11px] font-mono text-slate-400">24 Chapters</span>
              </div>

              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedCh === num;
                  return (
                    <button
                      key={num}
                      onClick={() => setSelectedCh(num)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all ${
                        isSelected
                          ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#171b26] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-amber-500 text-[11px] font-bold">
                          {num.toString().padStart(2, '0')}
                        </span>
                        <span className="font-serif truncate max-w-[120px]">
                          {lang === 'ar' ? `فصل ${num}` : `Chapter ${num}`}
                        </span>
                      </div>
                      {num === selectedCh && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Middle / Right Column: Split Beats Reference (Optional) & Literary Prose Editor */}
        <div className={`${zenMode ? 'lg:col-span-12' : showOutlinePanel ? 'lg:col-span-9' : 'lg:col-span-9'} space-y-4`}>
          {/* Dual Split Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Split Beats Reference Panel */}
            {showOutlinePanel && !zenMode && (
              <div className="lg:col-span-4 bg-slate-50 dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1e2538] rounded-2xl p-5 shadow-lg space-y-3 max-h-[700px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1d2334] pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                    <BookOpen className="w-4 h-4" />
                    <span>{lang === 'ar' ? `نبضات ومخطط الفصل ${selectedCh}` : `Chapter ${selectedCh} Beats`}</span>
                  </div>
                </div>

                {currentBeats ? (
                  <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                    {currentBeats}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 italic">
                    {lang === 'ar' ? 'لا توجد نبضات مخصصة لهذا الفصل في outline.md.' : 'No specific beat notes extracted for this chapter.'}
                  </div>
                )}
              </div>
            )}

            {/* Prose Editor Card */}
            <div className={`${showOutlinePanel && !zenMode ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4`}>
              {/* Top Stats Toolbar */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3 gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-amber-500">
                    {lang === 'ar' ? `الفصل ${selectedCh.toString().padStart(2, '0')}` : `ch_${selectedCh.toString().padStart(2, '0')}.md`}
                  </span>

                  {/* Word Count Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1f2538] text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    <Hash className="w-3 h-3 text-amber-500" />
                    <span>{wordCount.toLocaleString()} {t('stats.words')}</span>
                  </div>

                  {/* Reading Time */}
                  <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1f2538] text-[11px] font-mono text-slate-600 dark:text-slate-300">
                    <Clock className="w-3 h-3 text-emerald-500" />
                    <span>~{readingTimeMin} {lang === 'ar' ? 'د قراءة' : 'min'}</span>
                  </div>
                </div>

                {/* Circular Target Progress & Typography Controls */}
                <div className="flex items-center gap-3">
                  {/* Progress Ring */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span>{progressPct}% {lang === 'ar' ? 'من الهدف' : 'of goal'}</span>
                    <div className="w-12 h-2 rounded-full bg-slate-200 dark:bg-[#1a2030] overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 transition-all duration-300 rounded-full" 
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Font Size Selector */}
                  <div className="flex items-center bg-slate-100 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-lg p-0.5 text-xs font-mono">
                    <button
                      onClick={() => setFontSize('sm')}
                      className={`px-2 py-0.5 rounded ${fontSize === 'sm' ? 'bg-white dark:bg-[#1b2131] text-amber-500 font-bold shadow-xs' : 'text-slate-400'}`}
                    >
                      S
                    </button>
                    <button
                      onClick={() => setFontSize('md')}
                      className={`px-2 py-0.5 rounded ${fontSize === 'md' ? 'bg-white dark:bg-[#1b2131] text-amber-500 font-bold shadow-xs' : 'text-slate-400'}`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => setFontSize('lg')}
                      className={`px-2 py-0.5 rounded ${fontSize === 'lg' ? 'bg-white dark:bg-[#1b2131] text-amber-500 font-bold shadow-xs' : 'text-slate-400'}`}
                    >
                      L
                    </button>
                  </div>
                </div>
              </div>

              {/* Literary Prose Editor Textarea */}
              <textarea
                value={prose}
                onChange={(e) => setProse(e.target.value)}
                rows={zenMode ? 28 : 22}
                className={`w-full bg-slate-50/50 dark:bg-[#080a10] border border-slate-200 dark:border-[#1d2334] rounded-xl p-6 prose-literary text-slate-800 dark:text-slate-100 ${fontSizeClasses[fontSize]} focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all resize-y selection:bg-amber-500/20`}
                placeholder={`Drafting Chapter ${selectedCh}...`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
