import React, { useState, useEffect } from 'react';
import { BookOpen, FileCode, Headphones, Image as ImageIcon, Download, Play, CheckCircle2, Copy, Sparkles, RefreshCw, Palette, Mic, Check } from 'lucide-react';
import { runAction, fetchManuscriptExport, fetchArtExport, fetchAudiobookExport } from '../services/api';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

export const ExportStudio: React.FC = () => {
  const { t, lang } = useI18n();
  const { isDark } = useTheme();
  const { success, error } = useToast();

  const [loading, setLoading] = useState(false);
  const [manuscriptData, setManuscriptData] = useState<any>(null);
  const [artData, setArtData] = useState<any>(null);
  const [audiobookData, setAudiobookData] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, a, au] = await Promise.all([
        fetchManuscriptExport().catch(() => null),
        fetchArtExport().catch(() => null),
        fetchAudiobookExport().catch(() => null),
      ]);
      setManuscriptData(m);
      setArtData(a);
      setAudiobookData(au);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (action: string, params: Record<string, any> = {}) => {
    try {
      setLoading(true);
      await runAction(action, params);
      success(lang === 'ar' 
        ? `بدأ تنفيذ ${action}! تابع المخرجات عبر شاشة البث.`
        : `Started ${action}! Track progress in Terminal Stream.`);
      setTimeout(loadData, 3000);
    } catch (e: any) {
      error(`Action failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadManuscript = () => {
    if (!manuscriptData?.full_text) {
      alert(lang === 'ar' ? 'لا توجد فصول مكتوبة للتصدير بعد!' : 'No drafted chapters found to export. Draft chapters in Phase 2 first!');
      return;
    }
    const blob = new Blob([manuscriptData.full_text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(manuscriptData.title || 'novel').toLowerCase().replace(/\s+/g, '_')}_manuscript.md`;
    a.click();
    URL.revokeObjectURL(url);
    success(lang === 'ar' ? 'تم تنزيل المخطوطة بنجاح!' : 'Manuscript downloaded successfully!');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    success(t('export.copied'));
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const visualStyle = artData?.visual_style || {};
  const coverDirections = artData?.directions?.cover || [];
  const audioScripts = audiobookData?.scripts || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            {lang === 'ar' ? 'المرحلة ٤ • الإنتاج والتصدير' : 'Phase 4 • Production & Typesetting'}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-500" />
            {t('export.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('export.subtitle')}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#141824] hover:bg-slate-100 dark:hover:bg-[#1c2233] text-slate-700 dark:text-slate-300 text-xs border border-slate-200 dark:border-[#20273a] transition-all shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('btn.refresh')}</span>
        </button>
      </div>

      {/* Primary Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Manuscript Markdown */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t('export.download_md')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar' ? 'تجميع كافة الفصول الروائية المكتوبة في ملف Markdown موحد مع إحصاءات الكلمات.' : 'Combine all drafted chapters into a single master manuscript file ready for reading.'}
            </p>
            <div className="pt-2 text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1">
              <div>{manuscriptData?.chapters_count || 0} {t('stats.chapters')}</div>
              <div>{manuscriptData?.total_words?.toLocaleString() || 0} {t('stats.words')}</div>
            </div>
          </div>

          <button
            onClick={handleDownloadManuscript}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{t('export.download_md')}</span>
          </button>
        </div>

        {/* Card 2: LaTeX Typesetting */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t('export.compile_tex')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar' ? 'تحويل المخطوطة إلى كود LaTeX مجهز للطباعة والتنسيق الأدبي الفاخر.' : 'Generate professional LaTeX book source code formatted for 6x9 trade paperback.'}
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              {manuscriptData?.has_typeset ? (lang === 'ar' ? '✓ ملف LaTeX جاهز للطباعة' : '✓ LaTeX source generated') : (lang === 'ar' ? 'لم يتم توليد LaTeX بعد' : 'Not compiled yet')}
            </div>
          </div>

          <button
            onClick={() => handleAction('build_tex')}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1a2030] hover:bg-slate-200 dark:hover:bg-[#222b40] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2a344d] font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{t('export.compile_tex')}</span>
          </button>
        </div>

        {/* Card 3: Visual Identity & Art */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-500 flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t('export.derive_style')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar' ? 'استخلاص الهوية البصرية من دليل العالم ومطالبات الأغلفة لتوليدها بـ Midjourney.' : 'Derive visual art direction & Midjourney prompts from world lore.'}
            </p>
            <div className="pt-2 text-xs font-mono text-sky-600 dark:text-sky-400">
              {coverDirections.length > 0 ? `${coverDirections.length} ${lang === 'ar' ? 'مطالبات جاهزة' : 'art directions ready'}` : (lang === 'ar' ? 'لا توجد مطالبات بعد' : 'No art prompts generated')}
            </div>
          </div>

          <button
            onClick={() => handleAction('gen_art_directions', { type: 'cover' })}
            disabled={loading}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-[#1a2030] hover:bg-slate-200 dark:hover:bg-[#222b40] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2a344d] font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('export.gen_prompts')}</span>
          </button>
        </div>

        {/* Card 4: Studio User Manual PDF */}
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
              {lang === 'ar' ? 'دليل الاستخدام الشامل (PDF)' : 'Studio User Manual (PDF)'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'ar' ? 'دليل شامل يوضح مسار بناء الرواية عبر المراحل الخمس مع المخططات والأمثلة.' : 'Comprehensive guide detailing the 5-phase novel pipeline, diagrams, and concrete examples.'}
            </p>
            <div className="pt-2 text-xs font-mono text-amber-600 dark:text-amber-400">
              ✓ PDF Publication Ready
            </div>
          </div>

          <a
            href="/api/export/manual_pdf"
            download="Autonovel_Studio_User_Manual.pdf"
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'ar' ? 'تحميل دليل الاستخدام PDF' : 'Download Manual (PDF)'}</span>
          </a>
        </div>
      </div>


      {/* Art Directions & Prompts Section */}
      {coverDirections.length > 0 && (
        <div className="bg-white dark:bg-[#12151f] border border-slate-200 dark:border-[#23293d] rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#20273a] pb-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <span>{lang === 'ar' ? 'مطالبات توليد أغلفة الرواية (Midjourney Prompts)' : 'Cover Illustration Art Prompts'}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{coverDirections.length} directions</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverDirections.map((dir: any, idx: number) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#1e2436] space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>{dir.title || `Concept #${idx + 1}`}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">2:3 Aspect</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-mono leading-relaxed bg-white dark:bg-[#06080e] p-3 rounded-lg border border-slate-200 dark:border-[#1a2030] select-text">
                    {dir.prompt || dir.description}
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(dir.prompt || dir.description, `cover_${idx}`)}
                  className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-[#161a26] hover:bg-slate-200 dark:hover:bg-[#202638] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border border-slate-200 dark:border-[#222b3e]"
                >
                  {copiedIndex === `cover_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === `cover_${idx}` ? t('export.copied') : t('export.copy_prompt')}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
