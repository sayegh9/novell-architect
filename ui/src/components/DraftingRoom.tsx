import React, { useState, useEffect } from 'react';
import { 
  Feather, 
  Play, 
  Award, 
  Save, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  BookOpen, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { fetchChapter, saveChapter, runAction, fetchState } from '../services/api';
import { ChapterSummary } from '../types';

export const DraftingRoom: React.FC = () => {
  const [chapters, setChapters] = useState<ChapterSummary[]>([]);
  const [selectedCh, setSelectedCh] = useState<number>(1);
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);

  useEffect(() => {
    loadChaptersList();
  }, []);

  useEffect(() => {
    if (selectedCh) {
      loadChapterData(selectedCh);
    }
  }, [selectedCh]);

  const loadChaptersList = async () => {
    try {
      const res = await fetchState();
      setChapters(res.chapters || []);
      if (res.chapters && res.chapters.length > 0 && !selectedCh) {
        setSelectedCh(res.chapters[0].number);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadChapterData = async (num: number) => {
    try {
      setLoading(true);
      const res = await fetchChapter(num);
      setContent(res.content || '');
      setTitle(res.title || `Chapter ${num}`);
    } catch {
      setContent(`// Chapter ${num} not written yet.\n// Click "Draft Chapter" to generate.`);
      setTitle(`Chapter ${num}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveChapter(selectedCh, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadChaptersList();
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = async () => {
    try {
      setTriggering(true);
      await runAction('draft_chapter', { chapter: selectedCh });
      alert(`Drafting Chapter ${selectedCh} started in background! Follow progress in the Live Terminal stream.`);
    } catch (e: any) {
      alert(`Draft failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setTriggering(true);
      await runAction('evaluate_chapter', { chapter: selectedCh });
      alert(`Evaluation for Chapter ${selectedCh} started! Check the Live Terminal stream.`);
    } catch (e: any) {
      alert(`Evaluation failed: ${e.message}`);
    } finally {
      setTriggering(false);
    }
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.ceil(wordCount / 225);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-amber-400 font-semibold tracking-wider uppercase mb-1">Phase 2 • Drafting</div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Feather className="w-6 h-6 text-amber-400" />
            Drafting Room & Chapter Editor
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Sequential chapter generation, anti-pattern suppression, and real-time mechanical slop evaluation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDraft}
            disabled={triggering}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Draft Ch {selectedCh}</span>
          </button>

          <button
            onClick={handleEvaluate}
            disabled={triggering}
            className="px-3.5 py-2 rounded-lg bg-[#1a2030] hover:bg-[#232b40] text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Score Ch {selectedCh}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              saved 
                ? 'bg-emerald-600 text-white' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Col: Chapter Navigator */}
        <div className="lg:col-span-1 space-y-3">
          <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#20273a] pb-2.5">
              <span className="text-xs font-semibold text-slate-200">Chapters ({chapters.length})</span>
              <button onClick={loadChaptersList} className="p-1 text-slate-400 hover:text-slate-200">
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {Array.from({ length: Math.max(chapters.length, 24) }, (_, i) => i + 1).map(num => {
                const chInfo = chapters.find(c => c.number === num);
                const isSelected = selectedCh === num;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedCh(num)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left ${
                      isSelected
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                        : 'text-slate-300 hover:bg-[#161a26] border border-transparent'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-[11px] text-amber-400/80 mr-1.5">Ch {num.toString().padStart(2, '0')}</span>
                      <span className="truncate">{chInfo ? chInfo.title : 'Unwritten'}</span>
                    </div>
                    {chInfo ? (
                      <span className="font-mono text-[10px] text-slate-400">{chInfo.word_count.toLocaleString()}w</span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">empty</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Prose Reader & Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#12151f] border border-[#23293d] rounded-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#20273a] pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-amber-300">{title}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>•</span>
                  <span>~{readingTime} min read</span>
                  <span>•</span>
                  <span>Third-person limited POV</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  ch_{selectedCh.toString().padStart(2, '0')}.md
                </span>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={22}
              className="w-full bg-[#0a0d14] border border-[#1e2436] rounded-lg p-6 prose-literary text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/60 transition-all resize-y"
              placeholder={`Write or view prose for Chapter ${selectedCh}...`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
