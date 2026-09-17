with open("ui/src/components/LibraryModal.tsx", "w") as f:
    f.write("""import React, { useEffect, useState } from 'react';
import { X, Book, Plus, Folder, Check, Trash2, Clock, Globe, FileText, Activity } from 'lucide-react';
import { fetchProjects, createProject, setActiveProject, deleteProject } from '../services/api';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectChanged: () => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, onProjectChanged }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [error, setError] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data.projects);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createProject(newProjectName);
      setNewProjectName('');
      await loadProjects();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleSelect = async (id: string) => {
    setLoading(true);
    setError('');
    try {
      await setActiveProject(id);
      onProjectChanged();
      onClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project? This cannot be undone.')) return;
    setLoading(true);
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0d1017] rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-[#202637] animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-[#202637] flex items-center justify-between bg-slate-50 dark:bg-[#121622]">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-lg text-slate-800 dark:text-slate-100">Project Library</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto bg-slate-50/50 dark:bg-transparent">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-8 bg-white dark:bg-[#121622] p-4 rounded-xl border border-slate-200 dark:border-[#202637] shadow-sm">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter new project name (e.g. My Next Novel)"
              className="flex-1 bg-slate-50 dark:bg-[#0a0d14] border border-slate-200 dark:border-[#202637] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 dark:text-slate-200"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={loading || !newProjectName.trim()}
              className="px-5 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 px-1">Your Projects</h3>
            
            {loading && projects.length === 0 ? (
              <div className="text-center py-12 text-slate-500">Loading library...</div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <Book className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <h4 className="text-slate-600 dark:text-slate-300 font-medium">No projects found</h4>
                <p className="text-slate-400 text-sm mt-1">Create your first project above to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={`group relative p-5 rounded-xl border flex flex-col gap-3 cursor-pointer transition-all ${
                      p.is_active
                        ? 'bg-amber-50/50 dark:bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/20'
                        : 'bg-white dark:bg-[#161a26] border-slate-200 dark:border-[#202637] hover:border-amber-500/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${p.is_active ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-slate-100 dark:bg-[#202637] text-slate-500 dark:text-slate-400'}`}>
                          <Folder className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-base">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={p.path}>
                            {p.id === 'root' ? 'Legacy (Root)' : p.id}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {p.is_active && (
                          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded-md">
                            <Check className="w-3 h-3" /> Active
                          </span>
                        )}
                        {p.id !== 'root' && !p.is_active && (
                          <button 
                            onClick={(e) => handleDelete(p.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-[#202637]">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Activity className="w-3.5 h-3.5" />
                        <span className="capitalize">{p.phase || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{p.chapters_drafted || 0} / {p.chapters_total || 24} Ch</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Book className="w-3.5 h-3.5" />
                        <span>{((p.word_count || 0) / 1000).toFixed(1)}k words</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{p.last_modified ? new Date(p.last_modified * 1000).toLocaleDateString() : 'New'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
""")
