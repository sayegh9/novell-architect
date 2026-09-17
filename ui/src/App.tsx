import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SeedStudio } from './components/SeedStudio';
import { FoundationHub } from './components/FoundationHub';
import { DraftingRoom } from './components/DraftingRoom';
import { EditorialLab } from './components/EditorialLab';
import { LiveConsole } from './components/LiveConsole';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { ExportStudio } from './components/ExportStudio';
import { CommandPalette } from './components/CommandPalette';
import { ToastProvider } from './components/ToastContainer';
import { ThemeProvider, useTheme } from './theme';
import { I18nProvider, useI18n } from './i18n';
import { fetchState } from './services/api';
import { ProjectInfo } from './types';
import { LibraryModal } from './components/LibraryModal';

function StudioContent() {
  const [currentTab, setCurrentTab] = useState<string>('seed');
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);

  // Modal states
  const [showRunModal, setShowRunModal] = useState<boolean>(false);
  const [showResetModal, setShowResetModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showLibraryModal, setShowLibraryModal] = useState<boolean>(false);

  const { isRTL } = useI18n();
  const { isDark } = useTheme();

  const loadData = async () => {
    try {
      const data = await fetchState();
      setInfo(data);
    } catch (e) {
      console.error('Failed to load studio state:', e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Global Cmd+K / Ctrl+K keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`flex h-screen w-screen overflow-hidden bg-[#f7f5f0] dark:bg-[#090b10] text-slate-800 dark:text-slate-100 transition-colors ${isRTL ? 'font-arabic' : ''}`}>
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isJobRunning={info?.is_job_running || false}
        activePhase={info?.state.phase || 'foundation'}
        onOpenLibrary={() => setShowLibraryModal(true)}
        projectName={info?.project_name}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          info={info}
          onRefresh={loadData}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          showRunModal={showRunModal}
          setShowRunModal={setShowRunModal}
          showResetModal={showResetModal}
          setShowResetModal={setShowResetModal}
          showSettingsModal={showSettingsModal}
          setShowSettingsModal={setShowSettingsModal}
        />

        <main className="flex-1 overflow-y-auto bg-[#f7f5f0] dark:bg-[#090b10] transition-colors">
          {currentTab === 'seed' && <SeedStudio />}
          {currentTab === 'foundation' && <FoundationHub />}
          {currentTab === 'drafting' && <DraftingRoom />}
          {currentTab === 'editorial' && <EditorialLab />}
          {currentTab === 'analytics' && <AnalyticsDashboard />}
          {currentTab === 'export' && <ExportStudio />}
          {currentTab === 'console' && <LiveConsole />}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={setCurrentTab}
        onOpenRunModal={() => setShowRunModal(true)}
        onOpenResetModal={() => setShowResetModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
      />

      <LibraryModal 
        isOpen={showLibraryModal} 
        onClose={() => setShowLibraryModal(false)}
        onProjectChanged={() => {
          loadData();
          setCurrentTab('seed');
        }}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <StudioContent />
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;

