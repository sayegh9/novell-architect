import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 

  Sparkles, 
  Compass, 
  Feather, 
  Scissors, 
  Layers, 
  BookOpen, 
  Terminal, 
  Sun, 
  Moon, 
  Globe, 
  Play, 
  RotateCcw,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useToast } from './ToastContainer';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: string) => void;
  onOpenRunModal: () => void;
  onOpenResetModal: () => void;
  onOpenSettingsModal: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onOpenRunModal,
  onOpenResetModal,
  onOpenSettingsModal,
}) => {
  const { lang, setLang, t, isRTL } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { info } = useToast();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const items = [
    // Navigation
    { id: 'nav-seed', label: t('nav.seed'), category: 'Navigation', icon: Sparkles, action: () => { onSelectTab('seed'); onClose(); } },
    { id: 'nav-foundation', label: t('nav.foundation'), category: 'Navigation', icon: Compass, action: () => { onSelectTab('foundation'); onClose(); } },
    { id: 'nav-drafting', label: t('nav.drafting'), category: 'Navigation', icon: Feather, action: () => { onSelectTab('drafting'); onClose(); } },
    { id: 'nav-editorial', label: t('nav.editorial'), category: 'Navigation', icon: Scissors, action: () => { onSelectTab('editorial'); onClose(); } },
    { id: 'nav-analytics', label: t('nav.analytics'), category: 'Navigation', icon: Layers, action: () => { onSelectTab('analytics'); onClose(); } },
    { id: 'nav-export', label: t('nav.export'), category: 'Navigation', icon: BookOpen, action: () => { onSelectTab('export'); onClose(); } },
    { id: 'nav-console', label: t('nav.console'), category: 'Navigation', icon: Terminal, action: () => { onSelectTab('console'); onClose(); } },

    // Orchestrator Actions
    { id: 'act-run', label: t('btn.run_pipeline'), category: 'Orchestrator', icon: Play, action: () => { onClose(); onOpenRunModal(); } },
    { id: 'act-settings', label: t('btn.settings'), category: 'Orchestrator', icon: Zap, action: () => { onClose(); onOpenSettingsModal(); } },
    { id: 'act-reset', label: t('btn.new_novel'), category: 'Orchestrator', icon: RotateCcw, action: () => { onClose(); onOpenResetModal(); } },

    // Preferences
    { id: 'pref-theme', label: theme === 'dark' ? (lang === 'ar' ? 'الوضع النهاري (فاتح)' : 'Switch to Light Mode') : (lang === 'ar' ? 'الوضع الليلي (داكن)' : 'Switch to Dark Mode'), category: 'Preferences', icon: theme === 'dark' ? Sun : Moon, action: () => { toggleTheme(); onClose(); } },
    { id: 'pref-lang', label: lang === 'en' ? 'التحويل للغة العربية' : 'Switch to English', category: 'Preferences', icon: Globe, action: () => { setLang(lang === 'en' ? 'ar' : 'en'); onClose(); } },
  ];

  // Add quick chapter items
  for (let i = 1; i <= 24; i++) {
    items.push({
      id: `ch-${i}`,
      label: lang === 'ar' ? `الانتقال إلى الفصل ${i}` : `Jump to Chapter ${i}`,
      category: 'Chapters',
      icon: Feather,
      action: () => {
        onSelectTab('drafting');
        onClose();
        info(lang === 'ar' ? `تم فتح غرفة المسودة للفصل ${i}` : `Opened Drafting Room for Chapter ${i}`);
      },
    });
  }

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md z-[100] flex items-start justify-center pt-24 p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#111520] border border-slate-200 dark:border-[#22293d] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-[#1f2538] gap-3">
          <Search className="w-4 h-4 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن شاشة، أمر، أو فصل روائي...' : 'Search commands, phases, or chapters (e.g. Chapter 3, Settings)...'}
            className="w-full py-4 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-[#181d2c] border border-slate-300 dark:border-slate-700 text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">
              {lang === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching commands found.'}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#181d2c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-50">{item.category}</span>
                    <ArrowRight className={`w-3 h-3 transition-transform ${isSelected ? 'opacity-100 translate-x-0.5' : 'opacity-0'}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-[#0c0e15] border-t border-slate-200 dark:border-[#1f2538] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>↑↓ {lang === 'ar' ? 'للتنقل' : 'to navigate'}</span>
          <span>↵ {lang === 'ar' ? 'للاختيار' : 'to select'}</span>
          <span>esc {lang === 'ar' ? 'للإغلاق' : 'to close'}</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

