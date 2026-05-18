export type TargetLanguage = 'en' | 'zh' | 'es' | 'fr';

export const LANGUAGES: Record<TargetLanguage, { label: string; bcp47: string; nativeName: string }> = {
  en: { label: 'English', bcp47: 'en-US', nativeName: 'English' },
  zh: { label: 'Chinese', bcp47: 'zh-CN', nativeName: '中文' },
  es: { label: 'Spanish', bcp47: 'es-ES', nativeName: 'Español' },
  fr: { label: 'French', bcp47: 'fr-FR', nativeName: 'Français' },
};

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const DIFFICULTIES: Record<Difficulty, { label: string; hint: string }> = {
  beginner: {
    label: 'Beginner',
    hint: 'Short everyday phrases, present tense, A1–A2 vocabulary',
  },
  intermediate: {
    label: 'Intermediate',
    hint: 'Natural phrasing, common idioms, mixed tenses, B1 vocabulary',
  },
  advanced: {
    label: 'Advanced',
    hint: 'Idiomatic, register-aware, longer subordinate clauses, B2–C1 vocabulary',
  },
  expert: {
    label: 'Expert',
    hint: 'Native-fluent, slang or specialized jargon, nuanced register, complex syntax',
  },
};

export interface VocabAlternative {
  text: string;
  translation: string;
}

export interface DialogueSlot {
  original: string;
  translation: string;
  alternatives: VocabAlternative[];
}

export interface DialogueLine {
  id: string;
  speaker: string;
  template: string;
  translation: string;
  slots: DialogueSlot[];
}

export interface Dialogue {
  id: string;
  language: TargetLanguage;
  situation: string;
  difficulty: Difficulty;
  title: string;
  lines: DialogueLine[];
  createdAt: number;
}

export type SlotSelections = Record<string, Record<number, number>>;

export interface EvalIssue {
  kind: string;
  detail: string;
}

export interface PronunciationEval {
  ok: boolean;
  score: number;
  summary: string;
  issues: EvalIssue[];
  suggestion?: string;
  transcript: string;
  expected: string;
}

export type TtsMode = 'browser' | 'gemini';

export interface ApiKeyState {
  key: string;
  exhaustedAt?: number;
  label?: string;
}

export interface AppSettings {
  apiKeys: ApiKeyState[];
  ttsMode: TtsMode;
  autoPlay: boolean;
  difficulty: Difficulty;
  voicePreference?: string;
}
