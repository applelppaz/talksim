import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ShieldAlert, Trash2, Volume2 } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { isServerKeyConfigured } from '../lib/gemini';
import type { TtsMode } from '../types';

type KeyStatus = 'unknown' | 'ok' | 'missing';

export function SettingsPage() {
  const { settings, setSettings, clearAll } = useApp();
  const [keyStatus, setKeyStatus] = useState<KeyStatus>('unknown');

  useEffect(() => {
    let active = true;
    isServerKeyConfigured()
      .then((ok) => {
        if (active) setKeyStatus(ok ? 'ok' : 'missing');
      })
      .catch(() => {
        if (active) setKeyStatus('missing');
      });
    return () => {
      active = false;
    };
  }, []);

  const setTtsMode = (mode: TtsMode) => setSettings({ ...settings, ttsMode: mode });
  const setAutoPlay = (autoPlay: boolean) => setSettings({ ...settings, autoPlay });

  return (
    <div className="space-y-4">
      <Glass>
        <KeyStatusRow status={keyStatus} />
      </Glass>

      <Glass>
        <SectionLabel icon={<Volume2 size={14} />}>Voice</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Choice
            checked={settings.ttsMode === 'browser'}
            onSelect={() => setTtsMode('browser')}
            title="Browser"
            note="No quota"
          />
          <Choice
            checked={settings.ttsMode === 'gemini'}
            onSelect={() => setTtsMode('gemini')}
            title="Gemini"
            note="Natural"
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
          Reset
        </SectionLabel>
        <p className="text-xs text-rose-900 mt-1.5">
          Removes saved dialogues, chat history and vocab from this browser.
        </p>
        <button
          onClick={() => {
            if (confirm('Delete everything stored on this device?')) clearAll();
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700"
        >
          <Trash2 size={13} />
          Delete local data
        </button>
      </Glass>
    </div>
  );
}

function KeyStatusRow({ status }: { status: KeyStatus }) {
  if (status === 'unknown') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 size={16} className="animate-spin" />
        Checking API key…
      </div>
    );
  }
  if (status === 'ok') {
    return (
      <div className="flex items-start gap-2 text-sm">
        <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold text-slate-900">API key configured</div>
          <div className="text-xs text-slate-600">
            <code className="text-[11px] px-1 rounded bg-white/80 border border-white/70">
              GEMINI_API_KEY
            </code>{' '}
            is set on the server. Works on every device that visits this URL.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 text-sm">
      <ShieldAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold text-amber-900">API key not set</div>
        <div className="text-xs text-amber-900/90">
          Add{' '}
          <code className="text-[11px] px-1 rounded bg-white/80 border border-white/70">
            GEMINI_API_KEY
          </code>{' '}
          to your Vercel project's Environment Variables. Get a key from{' '}
          <a
            className="text-sky-700 underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Google AI Studio
          </a>
          .
        </div>
      </div>
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
      className={`text-left rounded-2xl border p-2.5 transition ${
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
