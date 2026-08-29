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
  Award
} from 'lucide-react';
import { fetchFileContent, saveFileContent, runAction } from '../services/api';

export const FoundationHub: React.FC = () => {
  const tabs = [
    { id: 'world.md', label: 'World Bible', icon: Globe, generator: 'gen_world' },
    { id: 'characters.md', label: 'Character Registry', icon: Users, generator: 'gen_characters' },
    { id: 'outline.md', label: 'Outline & Beats', icon: ListTree, generator: 'gen_outline' },
    { id: 'canon.md', label: 'Canon Database', icon: ShieldAlert, generator: 'gen_canon' },
    { id: 'voice.md', label: 'Voice Guardrails', icon: Volume2, generator: 'voice_fingerprint' },
    { id: 'MYSTERY.md', label: 'Central Mystery', icon: FileText, generator: null },
  ];

  const [activeTab, setActiveTab] = useState('world.md');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [triggering, setTriggering] = useState(false);

  useEffect(() => {
    loadDoc(activeTab);
  }, [activeTab]);

  const loadDoc = async (filename: string) => {
    try {
      setLoading(true);
      const res = await fetchFileContent(filename);
      setContent(res.content);
    } catch {
      setContent(`// ${filename} has not been generated yet.\n// Click "Generate" or write directly here.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveFileContent(activeTab, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (genAction: string) => {
    try {
      setTriggering(true);
      await runAction(genAction);
      alert(`Started ${genAction}! Follow progress in the Live Terminal tab.`);
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleEvalFoundation = async () => {
    try {
      setTriggering(true);
      await runAction('evaluate_foundation');
      alert('Foundation evaluation started! Check the Live Terminal tab for scores and callouts.');
    } catch (e: any) {
      alert(`Evaluation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const currentTabObj = tabs.find(t => t.id === activeTab);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">Phase 1 • Architecture</div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Compass className="w-6 h-6 text-amber-400" />
            Foundation & Worldbuilding Hub
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Interconnected planning documents that define the world, cast, narrative structure, and hard canon.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleEvalFoundation}
            disabled={triggering}
            className="px-3.5 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Score Foundation</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              saved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#20273a] pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#141824] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className="font-mono text-[10px] text-slate-400 opacity-60">({tab.id})</span>
            </button>
          );
        })}
      </div>

      {/* Editor & Action Card */}
      <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#20273a] pb-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-amber-400 font-semibold">{activeTab}</span>
            <span className="text-xs text-slate-400 font-mono">
              {content.split(/\s+/).filter(Boolean).length} words • {content.length} characters
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentTabObj?.generator && (
              <button
                onClick={() => handleGenerate(currentTabObj.generator!)}
                disabled={triggering}
                className="px-3 py-1.5 rounded-lg bg-[#1a2030] hover:bg-[#232b40] text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span>Run {currentTabObj.generator}.py</span>
              </button>
            )}
            <button
              onClick={() => loadDoc(activeTab)}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-[#1a2030] text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#23293d] transition-all"
              title="Reload from disk"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={22}
          className="w-full bg-[#0a0d14] border border-[#1e2436] rounded-lg p-5 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/60 transition-all resize-y"
          placeholder={`Enter contents for ${activeTab}...`}
        />
      </div>
    </div>
  );
};
