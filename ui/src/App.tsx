import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { SeedStudio } from './components/SeedStudio';
import { FoundationHub } from './components/FoundationHub';
import { DraftingRoom } from './components/DraftingRoom';
import { EditorialLab } from './components/EditorialLab';
import { LiveConsole } from './components/LiveConsole';
import { ExportStudio } from './components/ExportStudio';
import { fetchState } from './services/api';
import { ProjectInfo } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('seed');
  const [info, setInfo] = useState<ProjectInfo | null>(null);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090b10] text-slate-100">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isJobRunning={info?.is_job_running || false}
        activePhase={info?.state.phase || 'foundation'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar info={info} onRefresh={loadData} />

        <main className="flex-1 overflow-y-auto bg-[#090b10]">
          {currentTab === 'seed' && <SeedStudio />}
          {currentTab === 'foundation' && <FoundationHub />}
          {currentTab === 'drafting' && <DraftingRoom />}
          {currentTab === 'editorial' && <EditorialLab />}
          {currentTab === 'export' && <ExportStudio />}
          {currentTab === 'console' && <LiveConsole />}
        </main>
      </div>
    </div>
  );
}

export default App;
