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
  project_name: string;
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

export interface BriefItem {
  chapter: number;
  filename: string;
  content: string;
  modified?: number;
}

export interface ChapterMetric {
  chapter: number;
  title: string;
  word_count: number;
  reading_time_min: number;
  score: number | null;
  fat_percentage: number;
  cuttable_words: number;
  elo: number;
}

export interface AnalyticsData {
  history: Array<{
    commit: string;
    phase: string;
    score: number | null;
    word_count: number;
    status: string;
    description: string;
  }>;
  chapters: ChapterMetric[];
  total_words: number;
  total_chapters: number;
  average_chapter_score: number;
  overall_fat_percentage: number;
}

export interface VoiceMetricsData {
  chapters?: Record<string, any>;
  novel_average?: {
    word_count?: number;
    avg_sentence_length?: number;
    sentence_length_cv?: number;
    fragments_pct?: number;
    long_sentences_pct?: number;
    dialogue_ratio?: number;
    well_body_pct?: number;
    well_trade_pct?: number;
  };
  sample?: any;
}

export interface EngineSettings {
  writer_model: string;
  judge_model: string;
  review_model: string;
  temperature: number;
  target_words: number;
  language: string;
  novel_type: string;
  has_gemini_key: boolean;
  has_anthropic_key: boolean;
}
