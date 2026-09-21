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
  Clock, 
  Hash, 
  Sparkles,
  BookOpen,
  Edit3,
  X,
  RefreshCw
} from 'lucide-react';
import { 
  fetchChapter, 
  saveChapter, 
  runAction, 
  fetchFileContent,
  fetchChapterBeats,
  saveChapterBeats,
  fetchActionStatus
} from '../services/api';
import { waitForJobCompletion } from '../utils/waitForJob';
import { useI18n } from '../i18n';
import { useToast } from './ToastContainer';

export const DraftingRoom: React.FC = () => {
  const { t, lang } = useI18n();
  const { success, error, info: toastInfo } = useToast();

  const [selectedCh, setSelectedCh] = useState<number>(1);
  const [prose, setProse] = useState<string>('');
  const [chapterExists, setChapterExists] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Split-Screen Beats & Outline Context
  const [showOutlinePanel, setShowOutlinePanel] = useState(true);
  const [outlineContent, setOutlineContent] = useState<string>('');
  
  // Chapter Beats State & Editing
  const [beats, setBeats] = useState<string>('');
  const [isEditingBeats, setIsEditingBeats] = useState<boolean>(false);
  const [editedBeatsText, setEditedBeatsText] = useState<string>('');
  const [loadingBeats, setLoadingBeats] = useState<boolean>(false);
  const [savingBeats, setSavingBeats] = useState<boolean>(false);

  // Zen Focus Mode & Typography Preferences
  const [zenMode, setZenMode] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [targetWords, setTargetWords] = useState(3500);

  useEffect(() => {
    setIsEditingBeats(false);
    loadChapterProse(selectedCh);
    loadChapterBeatsData(selectedCh);
    loadOutlineDoc();
  }, [selectedCh]);

  const loadChapterProse = async (chNum: number) => {
    try {
      setLoading(true);
      const res = await fetchChapter(chNum);
      setProse(res.content || '');
      setChapterExists(true);
    } catch {
      setProse('');
      setChapterExists(false);
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

  const getChapterBeatsFallback = (chNum: number, docText: string) => {
    if (!docText) return null;
    const pattern = new RegExp(
      `(?:^|\\n)(#+\\s*(?:الفصل|فصل|Chapter|Ch)\\s+${chNum}(?:[:\\s]|$)[\\s\\S]*?)(?=(?:\\n#+\\s*(?:الفصل|فصل|Chapter|Ch)\\s+\\d+(?:[:\\s]|$))|(?:\\n#+\\s*(?:ACT|MIDPOINT|Foreshadowing|الملاحظات|الملحق|خريطة|نبضات|ممنوعات))|\\Z)`,
      'i'
    );
    const match = docText.match(pattern);
    if (!match) return null;
    let res = match[1].trim();
    res = res.replace(/\\n+---+\\s*$/, '').trim();
    return res;
  };

  const loadChapterBeatsData = async (chNum: number) => {
    try {
      setLoadingBeats(true);
      const res = await fetchChapterBeats(chNum);
      if (res && res.exists && res.beats) {
        setBeats(res.beats);
        setEditedBeatsText(res.beats);
      } else {
        const fallback = getChapterBeatsFallback(chNum, outlineContent);
        setBeats(fallback || '');
        setEditedBeatsText(fallback || '');
      }
    } catch {
      const fallback = getChapterBeatsFallback(chNum, outlineContent);
      setBeats(fallback || '');
      setEditedBeatsText(fallback || '');
    } finally {
      setLoadingBeats(false);
    }
  };

  const handleSaveBeats = async () => {
    try {
      setSavingBeats(true);
      const savedBeats = await saveChapterBeats(selectedCh, editedBeatsText);
      setBeats(savedBeats.beats);
      setEditedBeatsText(savedBeats.beats);
      setIsEditingBeats(false);
      success(t('drafting.beats_saved'));
      await loadOutlineDoc();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      error(`Save beats failed: ${message}`);
    } finally {
      setSavingBeats(false);
    }
  };

  const handleCancelEditBeats = () => {
    setEditedBeatsText(beats);
    setIsEditingBeats(false);
  };

  const handleSaveProse = async () => {
    try {
      setLoading(true);
      await saveChapter(selectedCh, prose);
      setChapterExists(true);
      setSaved(true);
      success(t('seed.saved'));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      error(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runAndWait = async (action: string, params: Record<string, unknown>) => {
    const started = await runAction(action, params);
    await waitForJobCompletion(started.cmd, fetchActionStatus);
  };

  const handleGenerateBeats = async () => {
    if (beats.trim() && !window.confirm(t('drafting.regenerate_beats_warning'))) {
      return;
    }

    try {
      setTriggering(true);
      toastInfo(t('drafting.generating_beats'));
      await runAndWait('generate_chapter_beats', { chapter: selectedCh });
      await Promise.all([loadOutlineDoc(), loadChapterBeatsData(selectedCh)]);
      success(t('drafting.beats_generated'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      error(`${t('drafting.generate_beats_failed')}: ${message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleDraftAction = async () => {
    if (!beats.trim() && !window.confirm(t('drafting.draft_without_beats_warning'))) {
      return;
    }

    try {
      setTriggering(true);
      toastInfo(t('drafting.drafting_selected'));
      await runAndWait('draft_chapter', { chapter: selectedCh });
      await loadChapterProse(selectedCh);
      success(t('drafting.chapter_drafted'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      error(`Drafting failed: ${message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleRedraftFromBeats = async () => {
    try {
      setTriggering(true);
      toastInfo(t('drafting.drafting_selected'));
      await runAndWait('rewrite_chapter_beats', { chapter: selectedCh, mode: 'fresh' });
      await loadChapterProse(selectedCh);
      success(t('drafting.chapter_drafted'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      error(`Re-draft failed: ${message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleReviseWithBeats = async () => {
    try {
      setTriggering(true);
      toastInfo(t('drafting.revising_selected'));
      await runAndWait('rewrite_chapter_beats', { chapter: selectedCh, mode: 'revise' });
      await loadChapterProse(selectedCh);
      success(t('drafting.chapter_revised'));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unexpected error';
      error(`Revision failed: ${message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleBatchDraftAll = async () => {
    try {
      setTriggering(true);
      await runAction('run_drafts', { all: true });
      success(lang === 'ar' ? `بدأ توليد جميع الفصول الـ 24 تلقائياً!` : `Started batch drafting all 24 chapters! Follow live terminal.`);
    } catch (e: any) {
      error(`Batch drafting failed: ${e.message}`);
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

          {!chapterExists ? (
            <button
              onClick={handleDraftAction}
              disabled={triggering}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              title={beats.trim() ? t('drafting.draft_from_beats') : t('drafting.draft_from_outline')}
            >
              {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{t('drafting.draft_selected')} {selectedCh}</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleScoreAction}
                disabled={triggering}
                className="px-3 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Award className="w-4 h-4 text-amber-500" />
                <span>{t('drafting.btn_score')}</span>
              </button>
              <button
                onClick={handleRedraftFromBeats}
                disabled={triggering || !beats.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
                title={beats.trim() ? t('drafting.btn_redraft_title') : t('drafting.generate_beats_first')}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('drafting.btn_redraft_beats')} ({selectedCh})</span>
              </button>
              <button
                onClick={handleReviseWithBeats}
                disabled={triggering || !beats.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 hover:bg-amber-500/35 disabled:opacity-50 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title={beats.trim() ? t('drafting.btn_revise_title') : t('drafting.generate_beats_first')}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('drafting.btn_revise_beats')}</span>
              </button>
            </>
          )}

          {/* Batch Draft All Button */}
          <button
            onClick={handleBatchDraftAll}
            disabled={triggering}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
            title="Sequentially generate all 24 chapters autonomously"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'كتابة كل الفصول' : 'Draft All (1-24)'}</span>
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
              <div className="lg:col-span-4 bg-slate-50 dark:bg-[#0c0f17] border border-slate-200 dark:border-[#1e2538] rounded-2xl p-5 shadow-lg space-y-3 max-h-[700px] flex flex-col justify-between">
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1d2334] pb-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                      <BookOpen className="w-4 h-4" />
                      <span>{lang === 'ar' ? `نبضات ومخطط الفصل ${selectedCh}` : `Chapter ${selectedCh} Beats`}</span>
                    </div>

                    {/* Edit / Save / Cancel Buttons */}
                    <div className="flex items-center gap-1.5">
                      {!isEditingBeats ? (
                        <>
                          <button
                            onClick={handleGenerateBeats}
                            disabled={triggering}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
                            title={beats.trim() ? t('drafting.regenerate_beats') : t('drafting.generate_beats')}
                          >
                            {triggering ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            <span>{beats.trim() ? t('drafting.regenerate_beats') : t('drafting.generate_beats')}</span>
                          </button>
                          <button
                            onClick={() => {
                              setIsEditingBeats(true);
                              setEditedBeatsText(beats);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#151926] hover:bg-slate-100 dark:hover:bg-[#1f2538] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#20283d] text-[11px] font-medium flex items-center gap-1 transition-all shadow-xs"
                            title={t('drafting.edit_beats')}
                          >
                            <Edit3 className="w-3 h-3 text-amber-500" />
                            <span>{t('drafting.edit_beats')}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleCancelEditBeats}
                            disabled={savingBeats}
                            className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-all"
                            title={t('drafting.cancel_beats')}
                          >
                            <X className="w-3 h-3" />
                            <span>{t('drafting.cancel_beats')}</span>
                          </button>
                          <button
                            onClick={handleSaveBeats}
                            disabled={savingBeats}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm"
                            title={t('drafting.save_beats')}
                          >
                            {savingBeats ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            <span>{t('drafting.save_beats')}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditingBeats ? (
                    <div className="space-y-2">
                      <div className="text-[10px] text-slate-400 font-mono">
                        {lang === 'ar' ? 'قم بتعديل النبضات هنا. سيتم حفظ التعديل مباشرة وتحديث outline.md بأمان.' : 'Edit beats here. Changes will synchronize with outline.md.'}
                      </div>
                      <textarea
                        value={editedBeatsText}
                        onChange={(e) => setEditedBeatsText(e.target.value)}
                        rows={16}
                        className="w-full bg-white dark:bg-[#07090e] border border-amber-500/50 rounded-xl p-3.5 text-xs text-slate-800 dark:text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all resize-y"
                        placeholder={`Enter beats for Chapter ${selectedCh}...`}
                      />
                    </div>
                  ) : beats ? (
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap select-text">
                      {beats}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 space-y-3">
                      <p className="italic">
                        {lang === 'ar' ? 'لا توجد نبضات مخصصة لهذا الفصل في outline.md.' : 'No specific beat notes extracted for this chapter.'}
                      </p>
                      <button
                        onClick={handleGenerateBeats}
                        disabled={triggering}
                        className="mx-auto px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 not-italic font-semibold flex items-center gap-1.5 transition-all"
                      >
                        {triggering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{t('drafting.generate_beats')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Downstream continuity hint */}
                {selectedCh < 24 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#1d2334] text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      {lang === 'ar' 
                        ? `${t('drafting.downstream_notice')} (${selectedCh + 1}–24).`
                        : `${t('drafting.downstream_notice')} (${selectedCh + 1}–24).`}
                    </span>
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
                aria-label={lang === 'ar' ? `نص الفصل ${selectedCh}` : `Chapter ${selectedCh} prose`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
