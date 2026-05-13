import type { AppSettings, ConversationSession, VocabEntry } from '../types';

const KEYS = {
  settings: 'talksim:settings',
  vocab: 'talksim:vocab',
  sessions: 'talksim:sessions',
  currentSession: 'talksim:currentSession',
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: [
    { key: '' },
    { key: '' },
    { key: '' },
  ],
  ttsMode: 'browser',
  autoPlay: true,
};

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
    return s;
  },
  saveSettings(s: AppSettings): void {
    write(KEYS.settings, s);
  },
  loadVocab(): VocabEntry[] {
    return read<VocabEntry[]>(KEYS.vocab, []);
  },
  saveVocab(v: VocabEntry[]): void {
    write(KEYS.vocab, v);
  },
  loadSessions(): ConversationSession[] {
    return read<ConversationSession[]>(KEYS.sessions, []);
  },
  saveSessions(s: ConversationSession[]): void {
    write(KEYS.sessions, s);
  },
  loadCurrentSession(): ConversationSession | null {
    return read<ConversationSession | null>(KEYS.currentSession, null);
  },
  saveCurrentSession(s: ConversationSession | null): void {
    if (s === null) localStorage.removeItem(KEYS.currentSession);
    else write(KEYS.currentSession, s);
  },
  clearAll(): void {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
