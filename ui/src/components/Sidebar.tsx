import React from 'react';
import { 
  Sparkles, 
  Compass, 
  Feather, 
  Scissors, 
  Terminal, 
  BookOpen, 
  Layers, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isJobRunning: boolean;
  activePhase: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isJobRunning,
  activePhase,
}) => {
  const { t, lang, isRTL } = useI18n();
  const { isDark } = useTheme();

  const navItems = [
    { id: 'seed', label: t('nav.seed'), icon: Sparkles, badge: lang === 'ar' ? 'المرحلة ٠' : 'Phase 0' },
    { id: 'foundation', label: t('nav.foundation'), icon: Compass, badge: lang === 'ar' ? 'المرحلة ١' : 'Phase 1' },
    { id: 'drafting', label: t('nav.drafting'), icon: Feather, badge: lang === 'ar' ? 'المرحلة ٢' : 'Phase 2' },
    { id: 'editorial', label: t('nav.editorial'), icon: Scissors, badge: lang === 'ar' ? 'المرحلة ٣' : 'Phase 3' },
    { id: 'analytics', label: t('nav.analytics'), icon: Layers },
    { id: 'export', label: t('nav.export'), icon: BookOpen, badge: lang === 'ar' ? 'المرحلة ٤' : 'Phase 4' },
    { id: 'console', label: t('nav.console'), icon: Terminal, isLive: isJobRunning },
  ];

  return (
    <aside className={`w-64 bg-slate-50/90 dark:bg-[#0d1017]/90 backdrop-blur-xl ${isRTL ? 'border-l' : 'border-r'} border-slate-200 dark:border-[#202637] flex flex-col justify-between select-none transition-colors z-20`}>
      <div>
        {/* Studio Branding */}
        <div className="p-5 border-b border-slate-200 dark:border-[#202637] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 text-white font-serif font-bold text-xl ring-2 ring-amber-500/30">
            A
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              {lang === 'ar' ? 'أوتونوفل' : 'AUTONOVEL'}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-mono font-bold">
                {lang === 'ar' ? 'استوديو' : 'STUDIO'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Autonomous Engine</p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {lang === 'ar' ? 'مراحل الإنتاج الروائي' : 'Writing Pipeline'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-600 dark:text-amber-300 font-semibold shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-[#161a26]'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-2 bottom-2 w-1 rounded-full bg-amber-500`} />
                )}

                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive 
                      ? 'text-amber-500 dark:text-amber-400' 
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.isLive ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full animate-pulse border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      LIVE
                    </span>
                  ) : item.badge ? (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Phase Footer Card */}
      <div className="p-4 border-t border-slate-200 dark:border-[#202637]">
        <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-[#121622]/80 border border-slate-200 dark:border-[#232a3d] space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>{lang === 'ar' ? 'المرحلة النشطة' : 'Active Pipeline Phase'}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="font-semibold text-slate-800 dark:text-slate-200 capitalize font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {t(`phase.${activePhase.toLowerCase()}`, activePhase)}
          </div>
        </div>
      </div>
    </aside>
  );
};
