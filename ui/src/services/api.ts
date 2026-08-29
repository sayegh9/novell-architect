import { ProjectInfo, PlanningDoc } from '../types';

const API_BASE = '/api';

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
