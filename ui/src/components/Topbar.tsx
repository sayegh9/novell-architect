import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ProjectInfo, EngineSettings } from '../types';

import { 
  Play, 
  Square, 
  RefreshCw, 
  Cpu, 
  BookCheck, 
  Award, 
  Zap, 
  RotateCcw, 
  Globe, 
  Settings, 
  Sun, 
  Moon, 
  Search, 
  Check 
} from 'lucide-react';
import { runAction, stopAction, fetchSettings, saveSettings } from '../services/api';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

interface TopbarProps {
  info: ProjectInfo | null;
  onRefresh: () => void;
  onOpenCommandPalette: () => void;
  showRunModal: boolean;
  setShowRunModal: (show: boolean) => void;
  showResetModal: boolean;
  setShowResetModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  info, 
  onRefresh, 
  onOpenCommandPalette,
  showRunModal,
  setShowRunModal,
  showResetModal,
  setShowResetModal,
  showSettingsModal,
  setShowSettingsModal,
}) => {
  const { lang, setLang, t } = useI18n();
  const { theme, toggleTheme, isDark } = useTheme();
  const { success, error } = useToast();

  const [keepSeedOnReset, setKeepSeedOnReset] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [fromScratch, setFromScratch] = useState<boolean>(false);
  const [maxCycles, setMaxCycles] = useState<number>(4);
  const [loading, setLoading] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<EngineSettings>({
    writer_model: 'gemini-2.5-pro',
    judge_model: 'gemini-2.5-pro',
    review_model: 'gemini-2.5-pro',
    temperature: 0.75,
    target_words: 3500,
    language: 'ar',
    has_gemini_key: true,
    has_anthropic_key: false,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const isRunning = info?.is_job_running || false;
  const state = info?.state;

  const loadSettingsData = async () => {
    try {
      const data = await fetchSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleOpenSettings = () => {
    loadSettingsData();
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await saveSettings(settings);
      setSettingsSaved(true);
      success(t('settings.saved'));
      setTimeout(() => setSettingsSaved(false), 2000);
      onRefresh();
    } catch (e: any) {
      error(`Failed to save settings: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPipeline = async () => {
    try {
      setLoading(true);
      await runAction('run_pipeline', {
        phase: selectedPhase === 'all' ? undefined : selectedPhase,
        from_scratch: fromScratch,
        max_cycles: maxCycles,
      });
      setShowRunModal(false);
      success(lang === 'ar' ? 'بدأ تنفيذ المسار الروائي المؤتمت!' : 'Pipeline orchestrator started successfully!');
      onRefresh();
    } catch (e: any) {
      error(`Error starting pipeline: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetProject = async () => {
    try {
      setLoading(true);
      await runAction('reset', { keep_seed: keepSeedOnReset });
      setShowResetModal(false);
      success(lang === 'ar' ? 'تمت أرشفة الرواية وتصفير المشروع بنجاح!' : 'Project reset and archived successfully!');
      onRefresh();
    } catch (e: any) {
      error(`Error resetting project: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      await stopAction();
      success(lang === 'ar' ? 'تم إرسال إشارة إيقاف التنفيذ' : 'Stop signal dispatched');
      onRefresh();
    } catch (e: any) {
      error(`Error stopping process: ${e.message}`);
    }
  };

  const phases = ['foundation', 'drafting', 'revision', 'export'];
  const currentPhaseIndex = phases.indexOf(state?.phase?.toLowerCase() || 'foundation');

  return (
    <header className="h-16 bg-white/80 dark:bg-[#0d1017]/80 backdrop-blur-xl border-b border-slate-200 dark:border-[#202637] px-6 flex items-center justify-between select-none z-30 transition-colors">
      {/* Phase Progression Stepper */}
      <div className="flex items-center gap-2">
        {phases.map((p, idx) => {
          const isDone = idx < currentPhaseIndex;
          const isCurrent = idx === currentPhaseIndex;
          return (
            <React.Fragment key={p}>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                isCurrent 
                  ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : isDone
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-[#151924] text-slate-400 border border-slate-200 dark:border-[#23293d]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isCurrent ? 'bg-amber-500 dark:bg-amber-400 animate-ping' : isDone ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400'
                }`} />
                <span>{t(`phase.${p}`)}</span>
              </div>
              {idx < phases.length - 1 && (
                <div className={`w-3 h-0.5 ${idx < currentPhaseIndex ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-[#23293d]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Novel Metrics Badges & Controls */}
      <div className="flex items-center gap-2.5">
        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141824] hover:bg-slate-200 dark:hover:bg-[#1c2233] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#202637] text-xs font-medium transition-all shadow-sm group"
          title="Search & Commands (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">{lang === 'ar' ? 'الأوامر والبحث...' : 'Search...'}</span>
          <kbd className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#0a0d14] border border-slate-300 dark:border-slate-700 text-slate-400">
            ⌘K
          </kbd>
        </button>

        {/* Word Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141824] border border-slate-200 dark:border-[#202637] text-xs">
          <BookCheck className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-slate-500 dark:text-slate-400">{t('stats.words')}:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
            {info?.total_words ? info.total_words.toLocaleString() : '0'}
          </span>
        </div>

        {/* Chapters */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141824] border border-slate-200 dark:border-[#202637] text-xs">
          <span className="text-slate-500 dark:text-slate-400">{t('stats.chapters')}:</span>
          <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
            {info?.chapters_count || 0}
          </span>
        </div>

        {/* Foundation Score */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#141824] border border-slate-200 dark:border-[#202637] text-xs">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-slate-500 dark:text-slate-400">{t('stats.foundation')}:</span>
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-300">
            {state?.foundation_score ? state.foundation_score.toFixed(1) : '0.0'}
          </span>
        </div>

        {/* Dark/Light Mode Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg bg-slate-100 dark:bg-[#161a26] hover:bg-slate-200 dark:hover:bg-[#202638] text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-[#263045] transition-all shadow-sm"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
        </button>

        {/* Settings Button */}
        <button
          onClick={handleOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#161a26] hover:bg-slate-200 dark:hover:bg-[#202638] text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-[#263045] text-xs font-semibold transition-all shadow-sm"
          title={t('btn.settings')}
        >
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">{t('btn.settings')}</span>
        </button>

        {/* Language Switcher Button */}
        <button
          onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-[#161a26] hover:bg-slate-200 dark:hover:bg-[#202638] text-slate-600 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-[#263045] text-xs font-semibold transition-all shadow-sm"
          title="Toggle Language (English / العربية)"
        >
          <Globe className="w-3.5 h-3.5 text-amber-500" />
          <span>{lang === 'en' ? 'العربية' : 'English'}</span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/10 dark:bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-300 border border-rose-500/40 text-xs font-medium transition-all shadow-sm"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{t('btn.stop_execution')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#181d2a] hover:bg-slate-200 dark:hover:bg-[#202738] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#263045] text-xs font-medium transition-all shadow-sm"
                title={t('modal.reset.desc')}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('btn.new_novel')}</span>
              </button>

              <button
                onClick={() => setShowRunModal(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('btn.run_pipeline')}</span>
              </button>
            </div>
          )}

          <button
            onClick={onRefresh}
            title={t('btn.refresh')}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-[#1b2030] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 border border-transparent hover:border-slate-200 dark:hover:border-[#283045] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowSettingsModal(false); }}
        >
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#262f44] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 my-auto max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#262f44] pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500" />
                {t('settings.title')}
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Writer Model */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('settings.writer_model')}</label>
                <select
                  value={settings.writer_model}
                  onChange={(e) => setSettings({ ...settings, writer_model: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                >
                  <option value="gemini-3.7-flash">Google Gemini 3.7 Flash (High Performance & Reasoning)</option>
                  <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Deepest Architecture & Lore)</option>
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Ultra Fast)</option>
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                  <option value="claude-3-5-sonnet-20241022">Anthropic Claude 3.5 Sonnet</option>
                </select>
              </div>

              {/* Judge Model */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('settings.judge_model')}</label>
                <select
                  value={settings.judge_model}
                  onChange={(e) => setSettings({ ...settings, judge_model: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                >
                  <option value="gemini-3.7-flash">Google Gemini 3.7 Flash (Adversarial Critique & Cuts)</option>
                  <option value="gemini-3.1-pro-preview">Google Gemini 3.1 Pro (Rigorous Literary Judge)</option>
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Fast Evaluation)</option>
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro</option>
                  <option value="claude-3-5-sonnet-20241022">Anthropic Claude 3.5 Sonnet</option>
                </select>
              </div>

              {/* Sampling Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-600 dark:text-slate-300 font-medium">{t('settings.temperature')}</label>
                  <span className="font-mono font-bold text-amber-500">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.1 (Strict / Deterministic)</span>
                  <span>0.75 (Lyrical Prose)</span>
                  <span>1.0 (Wild Creative)</span>
                </div>
              </div>

              {/* Target Words Per Chapter */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('settings.target_words')}</label>
                <select
                  value={settings.target_words}
                  onChange={(e) => setSettings({ ...settings, target_words: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                >
                  <option value="2500">2,500 words (Novella / Rapid)</option>
                  <option value="3500">3,500 words (Standard Epic Chapter)</option>
                  <option value="5000">5,000 words (Dense Literary Novel)</option>
                </select>
              </div>

              {/* Language Default */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('settings.language')}</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                >
                  <option value="ar">العربية الفصحى (Arabic Literary)</option>
                  <option value="en">English (Literary Fiction)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#262f44]">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                {settingsSaved ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{settingsSaved ? t('settings.saved') : t('settings.save')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Reset Project Modal */}
      {showResetModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowResetModal(false); }}
        >
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#262f44] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 my-auto max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#262f44] pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-500" />
                {t('modal.reset.title')}
              </h3>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed">
                {t('modal.reset.desc')}
              </p>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#20273a] space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="text-emerald-500 font-semibold">{t('modal.reset.safe')}</div>
                <div>{t('modal.reset.safe_desc')}</div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#20273a]">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{t('modal.reset.keep_seed')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('modal.reset.keep_seed_desc')}</div>
                </div>
                <input
                  type="checkbox"
                  checked={keepSeedOnReset}
                  onChange={(e) => setKeepSeedOnReset(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#262f44]">
              <button
                onClick={() => setShowResetModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={handleResetProject}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-md shadow-rose-600/20"
              >
                {loading ? '...' : t('modal.reset.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Run Pipeline Modal */}
      {showRunModal && createPortal(
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setShowRunModal(false); }}
        >
          <div className="bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#262f44] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 text-slate-800 dark:text-slate-100 my-auto max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#262f44] pb-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                {t('modal.run.title')}
              </h3>
              <button onClick={() => setShowRunModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('modal.run.scope')}</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">{t('modal.run.all')}</option>
                  <option value="foundation">{t('modal.run.p1')}</option>
                  <option value="drafting">{t('modal.run.p2')}</option>
                  <option value="revision">{t('modal.run.p3')}</option>
                  <option value="export">{t('modal.run.p4')}</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#20273a]">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{t('modal.run.scratch')}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('modal.run.scratch_desc')}</div>
                </div>
                <input
                  type="checkbox"
                  checked={fromScratch}
                  onChange={(e) => setFromScratch(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1.5">{t('modal.run.cycles')}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxCycles}
                  onChange={(e) => setMaxCycles(parseInt(e.target.value) || 4)}
                  className="w-full bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#262f44] rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#262f44]">
              <button
                onClick={() => setShowRunModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {t('modal.cancel')}
              </button>
              <button
                onClick={handleRunPipeline}
                disabled={loading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20"
              >
                {loading ? '...' : t('modal.run.start')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
