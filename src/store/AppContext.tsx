import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../lib/storage';
import type { AppSettings, ConversationSession, VocabEntry } from '../types';

interface AppContextValue {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  vocab: VocabEntry[];
  addVocab: (entries: VocabEntry[]) => void;
  removeVocab: (id: string) => void;
  sessions: ConversationSession[];
  currentSession: ConversationSession | null;
  setCurrentSession: (s: ConversationSession | null) => void;
  finalizeSession: (s: ConversationSession) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => storage.loadSettings());
  const [vocab, setVocab] = useState<VocabEntry[]>(() => storage.loadVocab());
  const [sessions, setSessions] = useState<ConversationSession[]>(() => storage.loadSessions());
  const [currentSession, setCurrentSessionState] = useState<ConversationSession | null>(() => storage.loadCurrentSession());

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    storage.saveVocab(vocab);
  }, [vocab]);
  useEffect(() => {
    storage.saveSessions(sessions);
  }, [sessions]);
  useEffect(() => {
    storage.saveCurrentSession(currentSession);
  }, [currentSession]);

  const setSettings = useCallback((s: AppSettings) => setSettingsState(s), []);
  const addVocab = useCallback((entries: VocabEntry[]) => {
    setVocab((prev) => [...entries, ...prev]);
  }, []);
  const removeVocab = useCallback((id: string) => {
    setVocab((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const setCurrentSession = useCallback((s: ConversationSession | null) => {
    setCurrentSessionState(s);
  }, []);

  const finalizeSession = useCallback((s: ConversationSession) => {
    setSessions((prev) => {
      const exists = prev.find((p) => p.id === s.id);
      if (exists) return prev.map((p) => (p.id === s.id ? s : p));
      return [s, ...prev];
    });
  }, []);

  const clearAll = useCallback(() => {
    storage.clearAll();
    setSettingsState(storage.loadSettings());
    setVocab([]);
    setSessions([]);
    setCurrentSessionState(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      setSettings,
      vocab,
      addVocab,
      removeVocab,
      sessions,
      currentSession,
      setCurrentSession,
      finalizeSession,
      clearAll,
    }),
    [settings, setSettings, vocab, addVocab, removeVocab, sessions, currentSession, setCurrentSession, finalizeSession, clearAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
