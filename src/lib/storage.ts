import type { AppSettings, Difficulty, Dialogue, TtsMode } from '../types';
import { DIFFICULTIES } from '../types';

const KEYS = {
  settings: 'talksim:settings',
  dialogues: 'talksim:dialogues',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: [
    { key: '' },
    { key: '' },
    { key: '' },
  ],
  ttsMode: 'browser',
  autoPlay: true,
  difficulty: 'intermediate',
};

function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && v in DIFFICULTIES;
}

function isTtsMode(v: unknown): v is TtsMode {
  return v === 'browser' || v === 'gemini';
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
  clearAll(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
