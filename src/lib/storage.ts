import type {
  AppMode,
  AppSettings,
  ConversationSession,
  Difficulty,
  Dialogue,
  TtsMode,
  VocabEntry,
} from '../types';
import { DIFFICULTIES } from '../types';

const KEYS = {
  settings: 'talksim:settings',
  dialogues: 'talksim:dialogues',
  sessions: 'talksim:sessions',
  vocab: 'talksim:vocab',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: [{ key: '' }, { key: '' }, { key: '' }],
  ttsMode: 'browser',
  autoPlay: true,
  difficulty: 'intermediate',
  mode: 'practice',
};

function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && v in DIFFICULTIES;
}

function isTtsMode(v: unknown): v is TtsMode {
  return v === 'browser' || v === 'gemini';
}

function isMode(v: unknown): v is AppMode {
  return v === 'practice' || v === 'chat';
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadSettings(): AppSettings {
    const s = read<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
    while (s.apiKeys.length < 3) s.apiKeys.push({ key: '' });
    if (typeof s.autoPlay !== 'boolean') s.autoPlay = true;
    if (!isTtsMode(s.ttsMode)) s.ttsMode = 'browser';
    if (!isDifficulty(s.difficulty)) s.difficulty = 'intermediate';
    if (!isMode(s.mode)) s.mode = 'practice';
    return s;
  },
  saveSettings(s: AppSettings): void {
    write(KEYS.settings, s);
  },
  loadDialogues(): Dialogue[] {
    const list = read<Dialogue[]>(KEYS.dialogues, []);
    return list.map((d) => ({
      ...d,
      difficulty: isDifficulty(d.difficulty) ? d.difficulty : 'intermediate',
    }));
  },
  saveDialogues(d: Dialogue[]): void {
    write(KEYS.dialogues, d);
  },
  loadSessions(): ConversationSession[] {
    return read<ConversationSession[]>(KEYS.sessions, []);
  },
  saveSessions(s: ConversationSession[]): void {
    write(KEYS.sessions, s);
  },
  loadVocab(): VocabEntry[] {
    return read<VocabEntry[]>(KEYS.vocab, []);
  },
  saveVocab(v: VocabEntry[]): void {
    write(KEYS.vocab, v);
  },
  clearAll(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
