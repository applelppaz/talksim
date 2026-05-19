import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { TtsMode } from '../types';

const COOLDOWN_HOURS = 24;

export function SettingsPage() {
  const { settings, setSettings, clearAll } = useApp();
  const [reveal, setReveal] = useState<boolean[]>(() => settings.apiKeys.map(() => false));

  const updateKey = (index: number, key: string) => {
    const next = { ...settings, apiKeys: settings.apiKeys.map((k, i) => (i === index ? { ...k, key } : k)) };
    setSettings(next);
  };

  const clearExhausted = (index: number) => {
    const next = {
      ...settings,
      apiKeys: settings.apiKeys.map((k, i) => (i === index ? { ...k, exhaustedAt: undefined } : k)),
    };
    setSettings(next);
  };

  const setTtsMode = (mode: TtsMode) => setSettings({ ...settings, ttsMode: mode });
  const setAutoPlay = (autoPlay: boolean) => setSettings({ ...settings, autoPlay });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Gemini API keys (up to 3)</h2>
        <p className="text-xs text-slate-600">
          Keys are stored only in this browser and never sent to a server. When one key hits its daily quota the app switches to the next unused key automatically. Get a key from{' '}
          <a
            className="text-sky-700 underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Google AI Studio
          </a>
          .
        </p>
        <div className="space-y-2">
          {settings.apiKeys.map((state, i) => {
            const cooldownRemaining = state.exhaustedAt
              ? Math.max(0, COOLDOWN_HOURS - (Date.now() - state.exhaustedAt) / (1000 * 60 * 60))
              : 0;
            return (
              <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">Key {i + 1}</div>
                  {state.exhaustedAt && cooldownRemaining > 0 && (
                    <button
                      onClick={() => clearExhausted(i)}
                      className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                      title="Clear cooldown manually"
                    >
                      ~{cooldownRemaining.toFixed(1)}h left (clear)
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={reveal[i] ? 'text' : 'password'}
                    value={state.key}
                    onChange={(e) => updateKey(i, e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={() => setReveal((r) => r.map((v, j) => (j === i ? !v : v)))}
                    className="text-xs px-2 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    {reveal[i] ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Speech synthesis (TTS)</h2>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="tts"
              checked={settings.ttsMode === 'browser'}
              onChange={() => setTtsMode('browser')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium">Browser TTS</div>
              <div className="text-xs text-slate-600">
                No API quota used. Voice quality depends on OS and browser.
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="tts"
              checked={settings.ttsMode === 'gemini'}
              onChange={() => setTtsMode('gemini')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium">Gemini TTS (high quality)</div>
              <div className="text-xs text-slate-600">
                Natural voice. Uses API quota. Falls back to browser TTS on failure.
              </div>
            </div>
          </label>
        </div>
        <label className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="checkbox"
            checked={settings.autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          <span className="text-sm">Auto-play audio after generating a dialogue</span>
        </label>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <h2 className="font-semibold text-red-900">Data</h2>
        <p className="text-xs text-red-900">
          Deletes every API key and dialogue stored in this browser. This cannot be undone.
        </p>
        <button
          onClick={() => {
            if (confirm('Delete all local data? This cannot be undone.')) clearAll();
          }}
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
        >
          Delete all data
        </button>
      </section>
    </div>
  );
}
