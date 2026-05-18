import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../lib/storage';
import type { AppSettings, Dialogue } from '../types';

interface AppContextValue {
  settings: AppSettings;
  setSettings: (s: AppSettings) => void;
  dialogues: Dialogue[];
  addDialogue: (d: Dialogue) => void;
  removeDialogue: (id: string) => void;
  clearAll: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const MAX_HISTORY = 20;

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => storage.loadSettings());
  const [dialogues, setDialogues] = useState<Dialogue[]>(() => storage.loadDialogues());

  useEffect(() => {
    storage.saveSettings(settings);
  }, [settings]);
  useEffect(() => {
    storage.saveDialogues(dialogues);
  }, [dialogues]);

  const setSettings = useCallback((s: AppSettings) => setSettingsState(s), []);

  const addDialogue = useCallback((d: Dialogue) => {
    setDialogues((prev) => [d, ...prev.filter((p) => p.id !== d.id)].slice(0, MAX_HISTORY));
  }, []);

  const removeDialogue = useCallback((id: string) => {
    setDialogues((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    storage.clearAll();
    setSettingsState(storage.loadSettings());
    setDialogues([]);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      settings,
      setSettings,
      dialogues,
      addDialogue,
      removeDialogue,
      clearAll,
    }),
    [settings, setSettings, dialogues, addDialogue, removeDialogue, clearAll]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
