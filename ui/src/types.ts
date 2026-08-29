export interface ProjectState {
  phase: string;
  current_focus?: string;
  iteration: number;
  foundation_score: number;
  lore_score: number;
  chapters_drafted: number;
  chapters_total: number;
  novel_score: number;
  revision_cycle: number;
  debts: string[];
}

export interface ChapterSummary {
  number: number;
  filename: string;
  title: string;
  word_count: number;
}

export interface ResultRow {
  commit: string;
  phase: string;
  score: string;
  word_count: string;
  status: string;
  description: string;
}

export interface ProjectInfo {
  state: ProjectState;
  results: ResultRow[];
  chapters: ChapterSummary[];
  total_words: number;
  chapters_count: number;
  is_job_running: boolean;
  current_cmd: string;
  env_keys: {
    has_gemini: boolean;
    has_anthropic: boolean;
    writer_model: string;
    judge_model: string;
  };
}

export interface PlanningDoc {
  name: string;
  exists: boolean;
  size: number;
  modified: number | null;
}
