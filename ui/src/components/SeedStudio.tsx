import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Wand2, Check, RefreshCw, BookOpen, Lightbulb } from 'lucide-react';
import { fetchFileContent, saveFileContent, runAction } from '../services/api';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const SeedStudio: React.FC = () => {
  const { t, lang } = useI18n();
  const { isDark } = useTheme();
  const { success, error } = useToast();

  const [seedContent, setSeedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [riffInput, setRiffInput] = useState('');
  const [conceptCount, setConceptCount] = useState(5);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadSeed();
  }, []);

  const loadSeed = async () => {
    try {
      setLoading(true);
      const res = await fetchFileContent('seed.txt');
      setSeedContent(res.content);
    } catch {
      setSeedContent('# Working Title: The Second Son of the House of Bells\n\nHOOK: In a city where tonal law binds reality, a bellmaker\'s second son discovers his father\'s forbidden harmonic.\n\nWORLD: Cantamura, built inside a natural amphitheater where pitch governance dictates civic hierarchy.\n\nMAGIC/COST: Tonal Law enables physical binding, but exposure causes irreversible acoustic tremor.\n');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveFileContent('seed.txt', seedContent);
      setSaved(true);
      success(t('seed.saved'));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      error(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConcepts = async () => {
    try {
      setGenerating(true);
      await runAction('seed', {
        count: conceptCount,
        riff: riffInput.trim() || undefined,
      });
      success(lang === 'ar' ? 'جارٍ توليد الأفكار الروائية! تابع شاشة البث المباشر.' : 'Generating seed concepts! Check Live Terminal.');
    } catch (e: any) {
      error(`Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ٠ • النشأة والتكوين' : 'Phase 0 • Origin & Premise'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-500" />
            {t('seed.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('seed.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSeed}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#23293d] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('btn.refresh')}</span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              saved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? t('seed.saved') : t('seed.save')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main seed.txt Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>{t('seed.editor')}</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {seedContent.split(/\s+/).filter(Boolean).length} {t('stats.words')}
              </span>
            </div>

            <textarea
              value={seedContent}
              onChange={(e) => setSeedContent(e.target.value)}
              rows={14}
              placeholder={lang === 'ar' ? 'اكتب أو الصق فكرة روايتك هنا...' : 'Paste or write your seed premise here...'}
              className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-5 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b2131]">
                <div className="font-semibold text-amber-600 dark:text-amber-400">{lang === 'ar' ? '١. خطاف العالم' : '1. World Hook'}</div>
                <div>{lang === 'ar' ? 'عنصر تميز حسي وملموس' : 'Sensory differentiator'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b2131]">
                <div className="font-semibold text-amber-600 dark:text-amber-400">{lang === 'ar' ? '٢. السحر والتكلفة' : '2. Magic / Cost'}</div>
                <div>{lang === 'ar' ? 'قواعد وتكلفة جسدية' : 'Strict rules, real costs'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b2131]">
                <div className="font-semibold text-amber-600 dark:text-amber-400">{lang === 'ar' ? '٣. القناعة الزائفة' : '3. Central Lie'}</div>
                <div>{lang === 'ar' ? 'وهم البطل الداخلي' : 'Protagonist\'s false belief'}</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1b2131]">
                <div className="font-semibold text-amber-600 dark:text-amber-400">{lang === 'ar' ? '٤. الصراع الجوهري' : '4. Core Tension'}</div>
                <div>{lang === 'ar' ? 'مأزق غير قابل للحل الوسط' : 'Irreconcilable stakes'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Idea Riffing Studio */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-[#20273a] pb-3">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">{t('seed.riffing')}</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {t('seed.riff_desc')}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {t('seed.custom_riff')}
                </label>
                <textarea
                  value={riffInput}
                  onChange={(e) => setRiffInput(e.target.value)}
                  rows={3}
                  placeholder={t('seed.riff_placeholder')}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  {lang === 'ar' ? 'عدد الأفكار المطلوبة' : 'Premise Count'}
                </label>
                <select
                  value={conceptCount}
                  onChange={(e) => setConceptCount(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value={3}>3 {lang === 'ar' ? 'أفكار' : 'Variations'}</option>
                  <option value={5}>5 {lang === 'ar' ? 'أفكار' : 'Variations'}</option>
                  <option value={10}>10 {lang === 'ar' ? 'أفكار' : 'Variations'}</option>
                </select>
              </div>

              <button
                onClick={handleGenerateConcepts}
                disabled={generating}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{generating ? t('seed.btn_riffing') : t('seed.btn_riff')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
