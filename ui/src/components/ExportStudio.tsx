import React, { useState } from 'react';
import { BookOpen, FileCode, Headphones, Image as ImageIcon, Download, ExternalLink, Play } from 'lucide-react';
import { runAction } from '../services/api';

export const ExportStudio: React.FC = () => {
  const [triggering, setTriggering] = useState(false);

  const handleAction = async (action: string) => {
    try {
      setTriggering(true);
      await runAction(action);
      alert(`Action ${action} started! Check the Live Terminal stream for logs.`);
    } catch (e: any) {
      alert(`Execution failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">Phase 4 • Production</div>
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <BookOpen className="w-6 h-6 text-amber-400" />
          Export, Typesetting & Multimedia Studio
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Compile manuscript into publication-ready book formats, audio scripts, and promotional landing pages.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Manuscript & Typesetting */}
        <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">Typeset PDF & EPUB</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Compile all drafted chapters into a formatted LaTeX book with chapter ornaments, front matter, and typography.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#20273a]">
            <button
              onClick={() => alert('LaTeX typesetting utilizes tectonic. Run typeset/build_tex.py or export phase.')}
              className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Compile LaTeX Book</span>
            </button>
          </div>
        </div>

        {/* Card 2: Cover Art & Illustrations */}
        <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">Visual Style & Art Curation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generate visual art style definitions, cover concepts, and chapter header illustrations.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#20273a]">
            <button
              onClick={() => alert('Visual style is configured in art/visual_style.json. Run gen_art.py to generate.')}
              className="w-full py-2 px-3 rounded-lg bg-[#1a2030] hover:bg-[#232b40] text-sky-300 border border-sky-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Generate Art Directions</span>
            </button>
          </div>
        </div>

        {/* Card 3: Audiobook Script */}
        <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Headphones className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-sm text-slate-100">Audiobook Script Parser</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Convert raw chapter markdown into speaker-attributed, emotional-tag scripts for ElevenLabs voice generation.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t border-[#20273a]">
            <button
              onClick={() => alert('Run gen_audiobook_script.py to parse chapters into audiobook segments.')}
              className="w-full py-2 px-3 rounded-lg bg-[#1a2030] hover:bg-[#232b40] text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Parse Audiobook Scripts</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
