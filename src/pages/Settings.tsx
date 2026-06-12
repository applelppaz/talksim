import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Trash2, Volume2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import type { TtsMode } from '../types';

const COOLDOWN_HOURS = 24;

export function SettingsPage() {
  const { settings, setSettings, clearAll } = useApp();
  const [reveal, setReveal] = useState<boolean[]>(() => settings.apiKeys.map(() => false));

  const updateKey = (index: number, key: string) => {
    setSettings({
      ...settings,
      apiKeys: settings.apiKeys.map((k, i) => (i === index ? { ...k, key } : k)),
    });
  };

  const clearExhausted = (index: number) => {
    setSettings({
      ...settings,
      apiKeys: settings.apiKeys.map((k, i) =>
        i === index ? { ...k, exhaustedAt: undefined } : k
      ),
    });
  };

  const setTtsMode = (mode: TtsMode) => setSettings({ ...settings, ttsMode: mode });
  const setAutoPlay = (autoPlay: boolean) => setSettings({ ...settings, autoPlay });

  return (
    <div className="space-y-4">
      <Glass>
        <SectionLabel icon={<KeyRound size={14} />}>Gemini API keys</SectionLabel>
        <p className="text-xs text-slate-600 mt-1.5">
          Stored only in this browser. When a key hits its daily quota, TalkSim rotates to the next.{' '}
          <a
            className="text-sky-700 underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Get a key
          </a>
        </p>
        <div className="mt-2.5 space-y-1.5">
          {settings.apiKeys.map((state, i) => {
            const cooldownRemaining = state.exhaustedAt
              ? Math.max(
                  0,
                  COOLDOWN_HOURS - (Date.now() - state.exhaustedAt) / (1000 * 60 * 60)
                )
              : 0;
            return (
              <div
                key={i}
                className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                    Key {i + 1}
                  </div>
                  {state.exhaustedAt && cooldownRemaining > 0 && (
                    <button
                      onClick={() => clearExhausted(i)}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 hover:bg-amber-200"
                      title="Clear cooldown manually"
                    >
                      ~{cooldownRemaining.toFixed(1)}h left
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 items-center">
                  <input
                    type={reveal[i] ? 'text' : 'password'}
                    value={state.key}
                    onChange={(e) => updateKey(i, e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  <button
                    onClick={() =>
                      setReveal((r) => r.map((v, j) => (j === i ? !v : v)))
                    }
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-700"
                    title={reveal[i] ? 'Hide' : 'Show'}
                  >
                    {reveal[i] ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Glass>

      <Glass>
        <SectionLabel icon={<Volume2 size={14} />}>Speech synthesis</SectionLabel>
        <div className="mt-2 space-y-1.5">
          <Choice
            checked={settings.ttsMode === 'browser'}
            onSelect={() => setTtsMode('browser')}
            title="Browser"
            note="No API quota used. Quality depends on OS/browser."
          />
          <Choice
            checked={settings.ttsMode === 'gemini'}
            onSelect={() => setTtsMode('gemini')}
            title="Gemini"
            note="Natural voice. Uses API quota. Falls back to browser on failure."
          />
        </div>
        <label className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/60">
          <input
            type="checkbox"
            checked={settings.autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          <span className="text-sm text-slate-800">Auto-play after generation</span>
        </label>
      </Glass>

      <Glass className="bg-rose-50/70 border-rose-200/70">
        <SectionLabel icon={<Trash2 size={14} />} className="text-rose-700">
          Danger zone
        </SectionLabel>
        <p className="text-xs text-rose-900 mt-1.5">
          Deletes every API key and stored item in this browser. Cannot be undone.
        </p>
        <button
          onClick={() => {
            if (confirm('Delete all local data? This cannot be undone.')) clearAll();
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700"
        >
          <Trash2 size={13} />
          Delete all data
        </button>
      </Glass>
    </div>
  );
}

function Glass({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-sm shadow-slate-900/5 p-4 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionLabel({
  children,
  icon,
  className = '',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500 ${className}`}
    >
      {icon}
      {children}
    </div>
  );
}

function Choice({
  checked,
  onSelect,
  title,
  note,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  note: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border p-2.5 transition ${
        checked
          ? 'bg-slate-900 text-white border-slate-900 shadow'
          : 'bg-white/60 border-white/60 hover:bg-white/80 text-slate-800'
      }`}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className={`text-[11px] ${checked ? 'text-white/80' : 'text-slate-500'}`}>{note}</div>
    </button>
  );
}
