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

export type AppMode = 'practice' | 'chat';

// --- Practice mode (current dialogue-generation app) ---

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
  /** A corrected version of what the learner actually said, when their utterance has grammar or usage errors. */
  corrected?: string;
  transcript: string;
  expected: string;
}

// --- Chat mode (legacy roleplay chat) ---

export type MessageRole = 'ai' | 'user';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  translation?: string;
  correction?: Correction;
  createdAt: number;
}

export interface Correction {
  ok: boolean;
  issues: string[];
  improved?: string;
  comment?: string;
}

export interface ConversationSession {
  id: string;
  language: TargetLanguage;
  situation: string;
  outline: string[];
  messages: Message[];
  startedAt: number;
  endedAt?: number;
}

export interface VocabEntry {
  id: string;
  language: TargetLanguage;
  phrase: string;
  /** Short English meaning. Field stays named `meaningJa` for storage backward-compat. */
  meaningJa: string;
  example?: string;
  sourceSessionId?: string;
  sourceSituation?: string;
  createdAt: number;
}

// --- Shared ---

export type TtsMode = 'browser' | 'gemini';

export interface AppSettings {
  ttsMode: TtsMode;
  autoPlay: boolean;
  difficulty: Difficulty;
  mode: AppMode;
  voicePreference?: string;
}
