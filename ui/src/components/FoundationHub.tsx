import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Globe, 
  Users, 
  ListTree, 
  ShieldAlert, 
  FileText, 
  Save, 
  Play, 
  Check, 
  RefreshCw, 
  Volume2,
  Award,
  Sparkles,
  Fingerprint,
  Sliders
} from 'lucide-react';
import { fetchFileContent, saveFileContent, runAction, fetchVoiceMetrics, analyzeCustomVoice } from '../services/api';
import { VoiceMetricsData } from '../types';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const FoundationHub: React.FC = () => {
  const { t, lang } = useI18n();
  const { isDark } = useTheme();
  const { success, error } = useToast();

  const tabs = [
    { id: 'world.md', label: lang === 'ar' ? 'دليل العالم' : 'World Bible', icon: Globe, generator: 'gen_world' },
    { id: 'characters.md', label: lang === 'ar' ? 'سجل الشخصيات' : 'Character Registry', icon: Users, generator: 'gen_characters' },
    { id: 'outline.md', label: lang === 'ar' ? 'المخطط والنبضات' : 'Outline & Beats', icon: ListTree, generator: 'gen_outline' },
    { id: 'canon.md', label: lang === 'ar' ? 'قاعدة الحقائق الثابتة' : 'Canon Database', icon: ShieldAlert, generator: 'gen_canon' },
    { id: 'voice.md', label: lang === 'ar' ? 'محددات الصوت الأدبي' : 'Voice Guardrails', icon: Volume2, generator: 'voice_fingerprint' },
    { id: 'MYSTERY.md', label: lang === 'ar' ? 'اللغز الجوهري' : 'Central Mystery', icon: FileText, generator: null },
  ];

  const [activeTab, setActiveTab] = useState('world.md');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);

  // Voice Fingerprint Studio state
  const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetricsData | null>(null);
  const [sampleText, setSampleText] = useState('');
  const [analyzingSample, setAnalyzingSample] = useState(false);

  useEffect(() => {
    loadDoc(activeTab);
    if (activeTab === 'voice.md') {
      loadVoiceMetrics();
    }
  }, [activeTab]);

  const loadDoc = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetchFileContent(filename);
      setContent(res.content);
    } catch {
      setContent(lang === 'ar' 
        ? `// لم يتم توليد ${filename} بعد.\n// انقر فوق "تشغيل التوليد" أو اكتب المحتوى هنا مباشرة.`
        : `// ${filename} has not been generated yet.\n// Click "Generate" or write directly here.`);
    } finally {
      setLoading(false);
    }
  };

  const loadVoiceMetrics = async () => {
    try {
      const res = await fetchVoiceMetrics();
      setVoiceMetrics(res);
    } catch (e) {
      console.error('Failed to load voice metrics:', e);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveFileContent(activeTab, content);
      setSaved(true);
      success(t('seed.saved'));
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      error(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (genAction: string) => {
    try {
      setTriggering(true);
      await runAction(genAction);
      success(lang === 'ar' ? `تم بدء ${genAction}! تابع التقدم في شاشة البث.` : `Started ${genAction}! Follow progress in Live Terminal.`);
      if (genAction === 'voice_fingerprint') {
        setTimeout(loadVoiceMetrics, 3000);
      }
    } catch (e: any) {
      error(`Generation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleAnalyzeSample = async () => {
    if (!sampleText.trim()) {
      alert(lang === 'ar' ? 'يرجى لصق نص مرجعي لتحليله.' : 'Please paste reference text first.');
      return;
    }
    try {
      setAnalyzingSample(true);
      const res = await analyzeCustomVoice(sampleText);
      setVoiceMetrics(prev => ({
        ...prev,
        sample: res.metrics,
      }));
      success(lang === 'ar' ? 'تم تحليل البصمة الصوتية للعينة بنجاح!' : 'Voice fingerprint analyzed!');
    } catch (e: any) {
      error(`Analysis failed: ${e.message}`);
    } finally {
      setAnalyzingSample(false);
    }
  };

  const handleEvalFoundation = async () => {
    try {
      setTriggering(true);
      await runAction('evaluate_foundation');
      success(lang === 'ar' ? 'بدأ تقييم جودة التأسيس!' : 'Foundation evaluation started!');
    } catch (e: any) {
      error(`Evaluation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const currentTabObj = tabs.find(t => t.id === activeTab);
  const avgVoice = voiceMetrics?.novel_average;
  const sampleVoice = voiceMetrics?.sample;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ١ • البنية المعمارية' : 'Phase 1 • Architecture & World'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-amber-500" />
            {t('foundation.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('foundation.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvalFoundation}
            disabled={triggering}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Award className="w-4 h-4 text-amber-500" />
            <span>{t('foundation.score')}</span>
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
            <span>{saved ? t('seed.saved') : t('foundation.save_doc')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-[#20273a] pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#141824] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-slate-400 opacity-60">({tab.id})</span>
            </button>
          );
        })}
      </div>

      {/* Voice Fingerprint Studio (Specific to voice.md) */}
      {activeTab === 'voice.md' && (
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
            <div className="flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t('foundation.voice_studio')}</h3>
            </div>
            <button
              onClick={() => handleGenerate('voice_fingerprint')}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/25 text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تحديث بصمة الفصول' : 'Recompute Chapters Fingerprint'}</span>
            </button>
          </div>

          {/* Metric Cards */}
          {avgVoice && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">{lang === 'ar' ? 'متوسط طول الجملة' : 'Avg Sentence Length'}</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold text-base">{avgVoice.avg_sentence_length || 0} {lang === 'ar' ? 'كلمات' : 'words'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">{lang === 'ar' ? 'نسبة الحوار' : 'Dialogue Ratio'}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base">{Math.round((avgVoice.dialogue_ratio || 0) * 100)}%</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">{lang === 'ar' ? 'معجم الجسد والحواس' : 'Sensory / Body Well'}</span>
                <span className="text-amber-500 font-bold text-base">{avgVoice.well_body_pct || 0}%</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2538]">
                <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase">{lang === 'ar' ? 'تباين الجمل (CV)' : 'Sentence Variance (CV)'}</span>
                <span className="text-sky-500 font-bold text-base">{avgVoice.sentence_length_cv || 0}</span>
              </div>
            </div>
          )}

          {/* Custom Sample Analyzer */}
          <div className="space-y-3 pt-2">
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {t('foundation.voice_desc')}
            </div>
            <div className="flex gap-3">
              <textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                rows={3}
                placeholder={t('foundation.voice_sample_placeholder')}
                className="flex-1 bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={handleAnalyzeSample}
                disabled={analyzingSample}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex flex-col items-center justify-center gap-1 shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{analyzingSample ? t('foundation.voice_analyzing') : t('foundation.voice_analyze')}</span>
              </button>
            </div>

            {sampleVoice && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0d1017] border border-slate-200 dark:border-[#1e2538] text-xs font-mono space-y-1 text-slate-700 dark:text-slate-300">
                <span className="text-amber-500 font-bold block">{lang === 'ar' ? 'نتائج العينة المرجعية:' : 'Sample Analysis Results:'}</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div>Words: {sampleVoice.word_count}</div>
                  <div>Avg Sent: {sampleVoice.avg_sentence_length}w</div>
                  <div>Dialogue: {Math.round(sampleVoice.dialogue_ratio * 100)}%</div>
                  <div>Body Well: {sampleVoice.well_body_pct}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Editor & Action Card */}
      <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-amber-500 font-semibold">{activeTab}</span>
            <span className="text-xs text-slate-400 font-mono">
              {content.split(/\s+/).filter(Boolean).length} {t('stats.words')} • {content.length} {lang === 'ar' ? 'حرف' : 'chars'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentTabObj?.generator && (
              <button
                onClick={() => handleGenerate(currentTabObj.generator!)}
                disabled={triggering}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#1a2030] hover:bg-slate-200 dark:hover:bg-[#232b40] text-amber-600 dark:text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-amber-500 fill-current" />
                <span>{lang === 'ar' ? `تشغيل ${currentTabObj.generator}.py` : `Run ${currentTabObj.generator}.py`}</span>
              </button>
            )}
            <button
              onClick={() => loadDoc(activeTab)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1a2030] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
              title={t('btn.refresh')}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] rounded-xl p-5 font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500 transition-all resize-y"
          placeholder={`${activeTab}...`}
        />
      </div>
    </div>
  );
};
