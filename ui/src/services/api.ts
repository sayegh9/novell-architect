import { ProjectInfo, PlanningDoc, BriefItem, AnalyticsData, VoiceMetricsData, EngineSettings } from '../types';

const API_BASE = '/api';

export interface ChapterBeatsResponse {
  chapter: number;
  title: string;
  beats: string;
  exists: boolean;
}

export interface SaveChapterBeatsRequest {
  beats: string;
}

export interface SaveChapterBeatsResponse {
  status: 'saved';
  chapter: number;
  backup: string;
  beats: string;
}

interface ApiErrorResponse {
  detail?: string;
}

async function apiError(response: Response, fallback: string): Promise<Error> {
  const payload: ApiErrorResponse = await response.json().catch((): ApiErrorResponse => ({}));
  return new Error(payload.detail || fallback);
}

export async function fetchState(): Promise<ProjectInfo> {
  const res = await fetch(`${API_BASE}/state`);
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function fetchFiles(): Promise<PlanningDoc[]> {
  const res = await fetch(`${API_BASE}/files`);
  if (!res.ok) throw new Error('Failed to fetch files');
  return res.json();
}

export async function fetchFileContent(filename: string): Promise<{ filename: string; content: string; size: number }> {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to fetch ${filename}`);
  return res.json();
}

export async function saveFileContent(filename: string, content: string): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/files/${encodeURIComponent(filename)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save ${filename}`);
  return res.json();
}

export async function fetchChapter(num: number) {
  const res = await fetch(`${API_BASE}/chapters/${num}`);
  if (!res.ok) throw new Error(`Failed to fetch chapter ${num}`);
  return res.json();
}

export async function saveChapter(num: number, content: string) {
  const res = await fetch(`${API_BASE}/chapters/${num}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save chapter ${num}`);
  return res.json();
}

export async function fetchChapterBeats(num: number): Promise<ChapterBeatsResponse> {
  const res = await fetch(`${API_BASE}/chapters/${num}/beats`);
  if (!res.ok) {
    throw await apiError(res, `Failed to fetch beats for chapter ${num}`);
  }
  return res.json();
}

export async function saveChapterBeats(num: number, beats: string): Promise<SaveChapterBeatsResponse> {
  const request: SaveChapterBeatsRequest = { beats };
  const res = await fetch(`${API_BASE}/chapters/${num}/beats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    throw await apiError(res, `Failed to save beats for chapter ${num}`);
  }
  return res.json();
}

export async function fetchEditLogs() {
  const res = await fetch(`${API_BASE}/logs/edit`);
  if (!res.ok) throw new Error('Failed to fetch edit logs');
  return res.json();
}

export async function fetchEvalLogs() {
  const res = await fetch(`${API_BASE}/logs/eval`);
  if (!res.ok) throw new Error('Failed to fetch eval logs');
  return res.json();
}

export async function runAction(action: string, params: Record<string, any> = {}) {
  const res = await fetch(`${API_BASE}/actions/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to run action' }));
    throw new Error(err.detail || 'Failed to run action');
  }
  return res.json();
}

export async function stopAction() {
  const res = await fetch(`${API_BASE}/actions/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop action');
  return res.json();
}

export async function fetchManuscriptExport() {
  const res = await fetch(`${API_BASE}/export/manuscript`);
  if (!res.ok) throw new Error('Failed to fetch manuscript');
  return res.json();
}

export async function fetchArtExport() {
  const res = await fetch(`${API_BASE}/export/art`);
  if (!res.ok) throw new Error('Failed to fetch art data');
  return res.json();
}

export async function fetchAudiobookExport() {
  const res = await fetch(`${API_BASE}/export/audiobook`);
  if (!res.ok) throw new Error('Failed to fetch audiobook data');
  return res.json();
}

// Editorial, Cuts & Briefs
export async function applyCutsCustom(chapter: number, quotes: string[]) {
  const res = await fetch(`${API_BASE}/editorial/apply_cuts_custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chapter, quotes }),
  });
  if (!res.ok) throw new Error('Failed to apply cuts');
  return res.json();
}

export async function fetchBriefs(): Promise<{ briefs: BriefItem[]; total: number }> {
  const res = await fetch(`${API_BASE}/editorial/briefs`);
  if (!res.ok) throw new Error('Failed to fetch briefs');
  return res.json();
}

export async function fetchBrief(chNum: number): Promise<BriefItem> {
  const res = await fetch(`${API_BASE}/editorial/briefs/${chNum}`);
  if (!res.ok) throw new Error(`Failed to fetch brief for ch ${chNum}`);
  return res.json();
}

export async function saveBrief(chNum: number, content: string) {
  const res = await fetch(`${API_BASE}/editorial/briefs/${chNum}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`Failed to save brief for ch ${chNum}`);
  return res.json();
}

// Foundation Voice Fingerprinting
export async function fetchVoiceMetrics(): Promise<VoiceMetricsData> {
  const res = await fetch(`${API_BASE}/foundation/voice_metrics`);
  if (!res.ok) throw new Error('Failed to fetch voice metrics');
  return res.json();
}

export async function analyzeCustomVoice(sampleText: string) {
  const res = await fetch(`${API_BASE}/foundation/voice_fingerprint_custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sample_text: sampleText }),
  });
  if (!res.ok) throw new Error('Failed to analyze sample voice');
  return res.json();
}

// Analytics & Convergence
export async function fetchAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

// Engine Settings
export async function fetchSettings(): Promise<EngineSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings: Partial<EngineSettings>) {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

// Project Management
export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(name: string) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create project' }));
    throw new Error(err.detail || 'Failed to create project');
  }
  return res.json();
}

export async function setActiveProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/set_active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error('Failed to set active project');
  return res.json();
}

export async function deleteProject(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.detail || `Failed to delete project ${id}`);
  }
  return res.json();
}


export async function fetchRevisionHealth() {
  const res = await fetch(`${API_BASE}/analytics/revision_health`);
  if (!res.ok) throw new Error('Failed to fetch revision health');
  return res.json();
}

export async function fetchEvalLog(chNum: number) {
  const res = await fetch(`${API_BASE}/logs/eval/${chNum}`);
  if (!res.ok) throw new Error(`Failed to fetch eval log for chapter ${chNum}`);
  return res.json();
}
