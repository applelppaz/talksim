import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { storage } from '../lib/storage';
import type {
  AppSettings,
  ConversationSession,
  Dialogue,
  VocabEntry,
} from '../types';

interface AppContextValue {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;

  // Practice mode
  dialogues: Dialogue[];
  addDialogue: (d: Dialogue) => void;
  removeDialogue: (id: string) => void;

  // Chat mode
  currentSession: ConversationSession | null;
  setCurrentSession: (s: ConversationSession | null) => void;
  pastSessions: ConversationSession[];
  finalizeSession: () => void;
  vocab: VocabEntry[];
  addVocab: (v: VocabEntry) => void;
  removeVocab: (id: string) => void;
  addVocabBatch: (items: VocabEntry[]) => void;

  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const MAX_HISTORY = 20;

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => storage.loadSettings());
  const [dialogues, setDialogues] = useState<Dialogue[]>(() => storage.loadDialogues());

  const [pastSessions, setPastSessions] = useState<ConversationSession[]>(() =>
    storage.loadSessions()
  );
  const [currentSession, setCurrentSessionState] = useState<ConversationSession | null>(null);
  const [vocab, setVocab] = useState<VocabEntry[]>(() => storage.loadVocab());

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    storage.saveDialogues(dialogues);
  }, [dialogues]);
  useEffect(() => {
    storage.saveSessions(pastSessions);
  }, [pastSessions]);
  useEffect(() => {
    storage.saveVocab(vocab);
  }, [vocab]);

  const setSettings = useCallback((s: AppSettings) => setSettingsState(s), []);

  const addDialogue = useCallback((d: Dialogue) => {
    setDialogues((prev) => [d, ...prev.filter((p) => p.id !== d.id)].slice(0, MAX_HISTORY));
  }, []);
  const removeDialogue = useCallback((id: string) => {
    setDialogues((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setCurrentSession = useCallback((s: ConversationSession | null) => {
    setCurrentSessionState(s);
  }, []);

  const finalizeSession = useCallback(() => {
    setCurrentSessionState((cur) => {
      if (!cur) return null;
      const ended: ConversationSession = { ...cur, endedAt: Date.now() };
      setPastSessions((prev) =>
        [ended, ...prev.filter((p) => p.id !== ended.id)].slice(0, MAX_HISTORY)
      );
      return null;
    });
  }, []);

  const addVocab = useCallback((entry: VocabEntry) => {
    setVocab((prev) => [entry, ...prev]);
  }, []);
  const addVocabBatch = useCallback((items: VocabEntry[]) => {
    setVocab((prev) => [...items, ...prev]);
  }, []);
  const removeVocab = useCallback((id: string) => {
    setVocab((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    storage.clearAll();
    setSettingsState(storage.loadSettings());
    setDialogues([]);
    setPastSessions([]);
    setVocab([]);
    setCurrentSessionState(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      setSettings,
      dialogues,
      addDialogue,
      removeDialogue,
      currentSession,
      setCurrentSession,
      pastSessions,
      finalizeSession,
      vocab,
      addVocab,
      addVocabBatch,
      removeVocab,
      clearAll,
    }),
    [
      settings,
      setSettings,
      dialogues,
      addDialogue,
      removeDialogue,
      currentSession,
      setCurrentSession,
      pastSessions,
      finalizeSession,
      vocab,
      addVocab,
      addVocabBatch,
      removeVocab,
      clearAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside an AppProvider');
  return ctx;
}
