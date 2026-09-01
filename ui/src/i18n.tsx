import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ar';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Topbar & Navigation
    'app.title': 'Autonovel Studio',
    'app.subtitle': 'Autonomous AI Novel Writing Engine',
    'nav.seed': 'Seed & Concept',
    'nav.foundation': 'Foundation & World',
    'nav.drafting': 'Drafting Room',
    'nav.editorial': 'Editorial & Revision',
    'nav.analytics': 'Quality Analytics',
    'nav.export': 'Production & Export',
    'nav.console': 'Terminal Stream',
    'phase.foundation': 'Foundation',
    'phase.drafting': 'Drafting',
    'phase.revision': 'Revision',
    'phase.export': 'Production',
    'stats.words': 'Words',
    'stats.chapters': 'Chapters',
    'stats.foundation': 'Foundation',
    'btn.run_pipeline': 'Run Pipeline',
    'btn.stop_execution': 'Stop Execution',
    'btn.new_novel': 'New Novel / Reset',
    'btn.refresh': 'Refresh State',
    'btn.settings': 'Engine Settings',
    
    // Modals
    'modal.run.title': 'Launch Pipeline Orchestrator',
    'modal.run.scope': 'Execution Scope',
    'modal.run.all': 'Full Autonomous Pipeline (All Phases)',
    'modal.run.p1': 'Phase 1: Foundation Only',
    'modal.run.p2': 'Phase 2: First Draft Only',
    'modal.run.p3': 'Phase 3: Revision Cycles Only',
    'modal.run.p4': 'Phase 4: Export (PDF/EPUB/Art) Only',
    'modal.run.scratch': 'Start from Scratch',
    'modal.run.scratch_desc': 'Reset state and start fresh from seed.txt',
    'modal.run.cycles': 'Max Revision Cycles',
    'modal.run.start': 'Start Execution',
    'modal.cancel': 'Cancel',

    'modal.reset.title': 'Start a New Novel (Reset Project)',
    'modal.reset.desc': 'This will reset the pipeline state to Phase 1 (Foundation) and clear existing drafts.',
    'modal.reset.safe': 'Safe Archive',
    'modal.reset.safe_desc': 'Your current novel files, chapters, and logs will be automatically backed up to archive/novel_[timestamp]/.',
    'modal.reset.keep_seed': 'Keep current seed.txt',
    'modal.reset.keep_seed_desc': 'Preserve the existing premise in seed.txt',
    'modal.reset.confirm': 'Archive & Reset',

    // Settings Modal
    'settings.title': 'Engine & Model Configuration',
    'settings.desc': 'Configure LLM model providers, sampling temperature, and chapter target lengths.',
    'settings.writer_model': 'Writer Model (Drafting & Rewrites)',
    'settings.judge_model': 'Judge Model (Adversarial Cuts & Evaluation)',
    'settings.temperature': 'Sampling Temperature (Creativity vs Rigor)',
    'settings.target_words': 'Target Words Per Chapter',
    'settings.language': 'Novel Language Mode',
    'settings.save': 'Save Engine Settings',
    'settings.saved': 'Settings Saved Successfully!',

    // Seed Studio
    'seed.title': 'Seed & Concept Studio',
    'seed.subtitle': 'Define the core premise, high-concept hook, magic system constraints, and character tensions.',
    'seed.editor': 'Premise Editor (seed.txt)',
    'seed.save': 'Save Seed',
    'seed.saved': 'Saved!',
    'seed.riffing': 'AI Idea Riffing',
    'seed.riff_desc': 'Generate wild, high-concept premise variants using Gemini Pro.',
    'seed.custom_riff': 'Riff on Custom Concept',
    'seed.riff_placeholder': 'e.g. A desert nomad who can weave memories into glass strings...',
    'seed.btn_riff': 'Generate 5 New Premises',
    'seed.btn_riffing': 'Generating Ideas...',

    // Foundation Hub
    'foundation.title': 'Foundation & Worldbuilding Hub',
    'foundation.subtitle': 'World bible, character registries, 24-chapter outline, and hard canon database.',
    'foundation.score': 'Score Foundation',
    'foundation.gen_world': 'Run gen_world.py',
    'foundation.gen_chars': 'Run gen_characters.py',
    'foundation.gen_outline': 'Run gen_outline.py',
    'foundation.gen_canon': 'Run gen_canon.py',
    'foundation.save_doc': 'Save Changes',
    'foundation.voice_studio': 'Voice Fingerprint Studio',
    'foundation.voice_desc': 'Analyze sentence length variation, rhythm, and sensory vocabulary wells from reference prose.',
    'foundation.voice_sample_placeholder': 'Paste reference prose or excerpt to analyze voice fingerprint...',
    'foundation.voice_analyze': 'Analyze Voice Fingerprint',
    'foundation.voice_analyzing': 'Analyzing Prose...',

    // Drafting Room
    'drafting.title': 'The Drafting Room',
    'drafting.subtitle': 'Sequential autonomous chapter generation with anti-slop rules and strict voice continuity.',
    'drafting.ch_list': 'Manuscript Chapters',
    'drafting.btn_draft': 'Draft Chapter',
    'drafting.btn_score': 'Score Chapter',
    'drafting.no_chapter': 'Select a chapter to read or edit its prose draft.',
    'drafting.ai_slop': 'AI Slop & Anti-Pattern Analysis',
    'drafting.save_prose': 'Save Prose Changes',

    // Editorial Lab
    'editorial.title': 'Editorial & Revision Lab',
    'editorial.subtitle': 'Adversarial 500-word cuts, Elo tournament leaderboards, 4-persona reader panel, and full review.',
    'editorial.tab_cuts': 'Adversarial Cuts',
    'editorial.tab_briefs': 'Revision Briefs & Rewrites',
    'editorial.tab_tournament': 'Elo Tournament',
    'editorial.tab_panel': '4-Reader Panel',
    'editorial.tab_review': 'Manuscript Review',
    'editorial.btn_cuts': 'Run Cuts on All',
    'editorial.btn_panel': 'Run Reader Panel',
    'editorial.btn_review': 'Run Full Review',
    'editorial.apply_selected_cuts': 'Apply Selected Cuts to Chapter',
    'editorial.applying_cuts': 'Applying Cuts...',
    'editorial.cuts_applied_success': 'Successfully removed fat from chapter!',
    'editorial.btn_gen_brief': 'Generate Revision Brief',
    'editorial.btn_rewrite': 'Rewrite Chapter from Brief',
    'editorial.rewriting': 'Rewriting Chapter...',
    'editorial.save_brief': 'Save Brief',

    // Analytics Dashboard
    'analytics.title': 'Novel Convergence & Quality Analytics',
    'analytics.subtitle': 'Track score evolution across revision cycles, per-chapter quality heatmaps, and fat elimination.',
    'analytics.avg_score': 'Average Chapter Score',
    'analytics.total_words': 'Total Manuscript Words',
    'analytics.total_chapters': 'Drafted Chapters',
    'analytics.fat_pct': 'Overall Fat Percentage',
    'analytics.heatmap_title': 'Per-Chapter Quality & Fat Heatmap',
    'analytics.history_title': 'Score Convergence Trajectory (results.tsv)',
    'analytics.no_history': 'No git commit history in results.tsv yet.',

    // Export Studio
    'export.title': 'Export, Typesetting & Multimedia Studio',
    'export.subtitle': 'Compile manuscript into publication-ready book formats, audio scripts, and promotional landing pages.',
    'export.download_md': 'Download Manuscript (.md)',
    'export.compile_tex': 'Compile LaTeX Source (.tex)',
    'export.derive_style': 'Derive Visual Identity',
    'export.gen_prompts': 'Generate Cover Art Prompts',
    'export.parse_audio': 'Parse Audiobook Scripts',
    'export.copy_prompt': 'Copy Prompt',
    'export.copied': 'Copied Prompt!',

    // Live Console
    'console.title': 'Live Terminal Stream',
    'console.subtitle': 'Real-time WebSocket stdout/stderr stream from background pipeline execution.',
    'console.clear': 'Clear Stream',
    'console.status_running': 'Running:',
    'console.status_idle': 'Idle / Ready',
  },
  ar: {
    // Topbar & Navigation
    'app.title': 'استوديو الرواية المؤتمتة',
    'app.subtitle': 'محرك كتابة الروايات بالذكاء الاصطناعي',
    'nav.seed': 'الفكرة والبذرة',
    'nav.foundation': 'العالم والبناء التأسيسي',
    'nav.drafting': 'غرفة المسودة والكتابة',
    'nav.editorial': 'المختبر التحريري والمراجعة',
    'nav.analytics': 'تحليلات الجودة والتطور',
    'nav.export': 'الإنتاج والتصدير',
    'nav.console': 'شاشة البث المباشر',
    'phase.foundation': 'التأسيس',
    'phase.drafting': 'المسودة الأولى',
    'phase.revision': 'المراجعة والتحرير',
    'phase.export': 'الإنتاج النهائي',
    'stats.words': 'الكلمات',
    'stats.chapters': 'الفصول',
    'stats.foundation': 'جودة التأسيس',
    'btn.run_pipeline': 'تشغيل المسار المؤتمت',
    'btn.stop_execution': 'إيقاف التشغيل',
    'btn.new_novel': 'رواية جديدة / تصفير',
    'btn.refresh': 'تحديث الحالة',
    'btn.settings': 'إعدادات المحرك',

    // Modals
    'modal.run.title': 'تشغيل المنسق العام للمسار',
    'modal.run.scope': 'نطاق التنفيذ',
    'modal.run.all': 'المسار المؤتمت الكامل (جميع المراحل)',
    'modal.run.p1': 'المرحلة الأولى: التأسيس فقط',
    'modal.run.p2': 'المرحلة الثانية: كتابة المسودة فقط',
    'modal.run.p3': 'المرحلة الثالثة: دورات المراجعة فقط',
    'modal.run.p4': 'المرحلة الرابعة: التصدير والإنتاج فقط',
    'modal.run.scratch': 'البدء من الصفر',
    'modal.run.scratch_desc': 'تصفير الحالة والبدء برواية جديدة من seed.txt',
    'modal.run.cycles': 'أقصى عدد لدورات المراجعة',
    'modal.run.start': 'بدء التنفيذ',
    'modal.cancel': 'إلغاء',

    'modal.reset.title': 'بدء رواية جديدة (تصفير المشروع)',
    'modal.reset.desc': 'سيؤدي هذا إلى إعادة تعيين حالة المسار إلى المرحلة الأولى وحذف المسودات السابقة بأمان.',
    'modal.reset.safe': 'أرشفة آمنة وتلقائية',
    'modal.reset.safe_desc': 'سيتم نسخ ملفات روايتك الحالية وفصولها وتقاريرها تلقائياً في مجلد archive/novel_[timestamp]/.',
    'modal.reset.keep_seed': 'الاحتفاظ بفكرة seed.txt الحالية',
    'modal.reset.keep_seed_desc': 'الإبقاء على نص الفكرة الحالي في seed.txt دون مسحه',
    'modal.reset.confirm': 'أرشفة وتصفير الآن',

    // Settings Modal
    'settings.title': 'إعدادات المحرك ونماذج الذكاء الاصطناعي',
    'settings.desc': 'تخصيص نماذج الكتابة والتحكيم، ودرجة حرارة الإبداع، وعدد الكلمات المستهدف لكل فصل.',
    'settings.writer_model': 'نموذج الكاتب (المسودة وإعادة الصياغة)',
    'settings.judge_model': 'نموذج المحكم (حذف الحشو والتقييم)',
    'settings.temperature': 'درجة حرارة التوليد (الإبداع مقابل الدقة)',
    'settings.target_words': 'الكلمات المستهدفة لكل فصل',
    'settings.language': 'لغة كتابة الرواية',
    'settings.save': 'حفظ إعدادات المحرك',
    'settings.saved': 'تم حفظ الإعدادات بنجاح!',

    // Seed Studio
    'seed.title': 'استوديو الفكرة والبذرة الروائية',
    'seed.subtitle': 'صياغة الخطاف السردي، قيود نظام السحر، الصراعات الدرامية، وقناعة البطل الزائفة.',
    'seed.editor': 'محرر الفكرة الأساسية (seed.txt)',
    'seed.save': 'حفظ الفكرة',
    'seed.saved': 'تم الحفظ!',
    'seed.riffing': 'توليد وتطوير الأفكار بالذكاء الاصطناعي',
    'seed.riff_desc': 'ابتكار أفكار روائية فانتازية غير تقليدية باستخدام Gemini 2.5 Pro.',
    'seed.custom_riff': 'تطوير فكرة مخصصة',
    'seed.riff_placeholder': 'مثال: صانع زجاج يكتشف أن الأصوات تُحبس كخيوط داخل النوافذ القديمة...',
    'seed.btn_riff': 'توليد 5 أفكار روائية مبتكرة',
    'seed.btn_riffing': 'جارٍ ابتكار الأفكار...',

    // Foundation Hub
    'foundation.title': 'مركز التأسيس وبناء العالم الروائي',
    'foundation.subtitle': 'دليل العالم الشامل، سجل الشخصيات، مخطط الـ 24 فصلاً، وقاعدة الحقائق الثابتة.',
    'foundation.score': 'تقييم جودة التأسيس',
    'foundation.gen_world': 'توليد دليل العالم (gen_world)',
    'foundation.gen_chars': 'توليد سجل الشخصيات (gen_characters)',
    'foundation.gen_outline': 'توليد مخطط الفصول (gen_outline)',
    'foundation.gen_canon': 'استخراج الحقائق (gen_canon)',
    'foundation.save_doc': 'حفظ التعديلات',
    'foundation.voice_studio': 'استوديو البصمة الصوتية الأدبية',
    'foundation.voice_desc': 'تحليل تباين أطوال الجمل، والإيقاع، ومعاجم الألفاظ الحسية والجسدية من نصوص مرجعية.',
    'foundation.voice_sample_placeholder': 'الصق نصاً سردياً مرجعياً أو مقتطفاً لتحليل بصمته الأدبية...',
    'foundation.voice_analyze': 'تحليل البصمة الصوتية',
    'foundation.voice_analyzing': 'جارٍ تحليل النص...',

    // Drafting Room
    'drafting.title': 'غرفة المسودة وكتابة الفصول',
    'drafting.subtitle': 'توليد سردي متسلسل يلتزم بالصوت الأدبي ويمنع الكليشيهات والتكرارات الآلية.',
    'drafting.ch_list': 'فصول الرواية',
    'drafting.btn_draft': 'كتابة الفصل',
    'drafting.btn_score': 'تقييم الفصل',
    'drafting.no_chapter': 'اختر فصلاً من القائمة لقراءة نصه أو تعديله.',
    'drafting.ai_slop': 'تحليل الجودة ومؤشرات التكرار الآلي',
    'drafting.save_prose': 'حفظ التعديلات السردية',

    // Editorial Lab
    'editorial.title': 'مختبر التحرير والمراجعة النقدية',
    'editorial.subtitle': 'حذف الفائض السردي (500 كلمة)، مذكرات التحرير وإعادة الصياغة، دوري مقارنات الفصول Elo، ولجنة القراء الأربعة.',
    'editorial.tab_cuts': 'حذف الحشو (Adversarial Cuts)',
    'editorial.tab_briefs': 'مذكرات التحرير وإعادة الصياغة',
    'editorial.tab_tournament': 'دوري مقارنة الفصول',
    'editorial.tab_panel': 'لجنة القراء الأربعة',
    'editorial.tab_review': 'المراجعة النقدية للرواية',
    'editorial.btn_cuts': 'استخراج الفائض من كل الفصول',
    'editorial.btn_panel': 'تشغيل لجنة القراء',
    'editorial.btn_review': 'تشغيل المراجعة الشاملة',
    'editorial.apply_selected_cuts': 'تطبيق الحذف المختار على الفصل',
    'editorial.applying_cuts': 'جارٍ تطبيق الحذف...',
    'editorial.cuts_applied_success': 'تم تطبيق الحذف بنجاح وتنقيح نص الفصل!',
    'editorial.btn_gen_brief': 'توليد مذكرة تحرير للفصل',
    'editorial.btn_rewrite': 'إعادة كتابة وتنقيح الفصل',
    'editorial.rewriting': 'جارٍ إعادة كتابة الفصل...',
    'editorial.save_brief': 'حفظ مذكرة التحرير',

    // Analytics Dashboard
    'analytics.title': 'لوحة تحليلات الجودة وتطور الرواية',
    'analytics.subtitle': 'متابعة مسار تقييم الجودة عبر دورات المراجعة، وخريطة حرارية لجودة كل فصل ونسبة الحشو.',
    'analytics.avg_score': 'متوسط تقييم الفصول',
    'analytics.total_words': 'إجمالي كلمات المخطوطة',
    'analytics.total_chapters': 'الفصول المكتوبة',
    'analytics.fat_pct': 'نسبة الحشو الكلية',
    'analytics.heatmap_title': 'الخريطة الحرارية لجودة الفصول والحشو',
    'analytics.history_title': 'مسار تصاعد الجودة عبر الدورات (results.tsv)',
    'analytics.no_history': 'لا توجد سجلات بعد في ملف results.tsv.',

    // Export Studio
    'export.title': 'استوديو الإنتاج والتصدير والوسائط',
    'export.subtitle': 'تجميع الرواية في مخطوطة جاهزة للنشر، وتنسيق الطباعة LaTeX، ومطالبات الأغلفة والنصوص الصوتية.',
    'export.download_md': 'تحميل المخطوطة الكاملة (.md)',
    'export.compile_tex': 'تنسيق كتاب الطباعة LaTeX (.tex)',
    'export.derive_style': 'استخلاص الهوية البصرية',
    'export.gen_prompts': 'توليد مطالبات صور الأغلفة',
    'export.parse_audio': 'تجهيز نصوص الكتاب الصوتي',
    'export.copy_prompt': 'نسخ المطالبة',
    'export.copied': 'تم النسخ بنجاح!',

    // Live Console
    'console.title': 'شاشة البث المباشر للطرفية',
    'console.subtitle': 'بث حي ومباشر لسجلات التنفيذ والأوامر البرمجية عبر WebSocket.',
    'console.clear': 'مسح الشاشة',
    'console.status_running': 'قيد التنفيذ:',
    'console.status_idle': 'جاهز / في وضع الاستعداد',
  },
};

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  isRTL: false,
  t: (key: string) => key,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('autonovel_lang');
    return (saved === 'ar' || saved === 'en') ? saved : 'en';
  });

  const isRTL = lang === 'ar';

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('autonovel_lang', newLang);
  };

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRTL]);

  const t = (key: string, fallback?: string): string => {
    return translations[lang]?.[key] || translations.en?.[key] || fallback || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, isRTL, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
