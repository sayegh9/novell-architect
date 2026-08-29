import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Wand2, Check, RefreshCw, BookOpen, Lightbulb } from 'lucide-react';
import { fetchFileContent, saveFileContent, runAction } from '../services/api';

export const SeedStudio: React.FC = () => {
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
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
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
      alert('Generating seed concepts in background! Check the Live Terminal tab to see results.');
    } catch (e: any) {
      alert(`Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">Phase 0 • Origin</div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-amber-400" />
            Seed Concept Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Define or generate the core speculative premise, central tension, magic costs, and sensory hook for your novel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadSeed}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-300 text-xs border border-[#23293d] transition-all flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload</span>
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
            <span>{saved ? 'Saved to seed.txt' : 'Save seed.txt'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main seed.txt Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#20273a] pb-3">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Active Premise (seed.txt)</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {seedContent.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>

            <textarea
              value={seedContent}
              onChange={(e) => setSeedContent(e.target.value)}
              rows={14}
              placeholder="Paste or write your seed premise here..."
              className="w-full bg-[#0a0d14] border border-[#1e2436] rounded-lg p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/60 transition-all resize-y"
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-[11px] text-slate-400">
              <div className="p-2.5 rounded-lg bg-[#0d1017] border border-[#1b2131]">
                <div className="font-semibold text-amber-400">1. World Hook</div>
                <div>Concrete, sensory differentiator</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1017] border border-[#1b2131]">
                <div className="font-semibold text-amber-400">2. Magic / Cost</div>
                <div>Strict rules, tangible costs</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1017] border border-[#1b2131]">
                <div className="font-semibold text-amber-400">3. Central Lie</div>
                <div>Protagonist's false coping belief</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0d1017] border border-[#1b2131]">
                <div className="font-semibold text-amber-400">4. Core Tension</div>
                <div>Irreconcilable opposing stakes</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: AI Concept Generator & Riffer */}
        <div className="space-y-6">
          <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-[#20273a] pb-3 text-xs font-semibold text-slate-200">
              <Wand2 className="w-4 h-4 text-amber-400" />
              <span>AI Idea Riffing & Discovery</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Riff / Remix Angle</label>
                <input
                  type="text"
                  value={riffInput}
                  onChange={(e) => setRiffInput(e.target.value)}
                  placeholder="e.g. Magic costs memories, inverted gothic towers..."
                  className="w-full bg-[#0a0d14] border border-[#23293d] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Concepts Count</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={conceptCount}
                  onChange={(e) => setConceptCount(parseInt(e.target.value) || 5)}
                  className="w-full bg-[#0a0d14] border border-[#23293d] rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleGenerateConcepts}
                disabled={generating}
                className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Lightbulb className="w-4 h-4 fill-current" />
                <span>{generating ? 'Spawning Agent...' : 'Generate Seed Concepts'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
              Gemini will generate distinct, sensory fantasy premises with hard speculative costs. Outputs stream live into the Live Terminal stream.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
