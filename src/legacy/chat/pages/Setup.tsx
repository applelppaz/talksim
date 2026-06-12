import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useApp } from '../../../store/AppContext';
import { LANGUAGES, type TargetLanguage, type ConversationSession } from '../../../types';
import { ServerKeyMissingError, generateOutline } from '../../../lib/gemini';
import { uid } from '../../../lib/storage';

const EXAMPLES = [
  'Ordering coffee at a café. The barista asks about size and sweetness.',
  'Checking in luggage at the airport. You want a window seat.',
  'Calling a friend to discuss restaurant reservations.',
  'Lost in a foreign city. Asking a passerby for the way to the nearest station.',
];

export function SetupPage() {
  const nav = useNavigate();
  const { setCurrentSession } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [situation, setSituation] = useState('');
  const [language, setLanguage] = useState<TargetLanguage | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (lang: TargetLanguage) => {
    setError(null);
    setLoading(true);
    try {
      const result = await generateOutline(situation.trim(), lang);
      setOutline(result);
      setStep(3);
    } catch (err) {
      if (err instanceof ServerKeyMissingError) {
        setError('Server API key is not set. Open Settings for details.');
      } else {
        setError(err instanceof Error ? err.message : 'Generation failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const start = () => {
    if (!language) return;
    const session: ConversationSession = {
      id: uid(),
      language,
      situation: situation.trim(),
      outline: outline.filter((s) => s.trim()),
      messages: [],
      startedAt: Date.now(),
    };
    setCurrentSession(session);
    nav('/chat/conversation');
  };

  return (
    <div className="space-y-4">
      <Stepper step={step} />

      {step === 1 && (
        <Glass>
          <textarea
            rows={5}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Describe the situation in English…"
            className="w-full rounded-2xl border border-white/60 bg-white/60 backdrop-blur px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400"
          />
          <details className="text-xs text-slate-600 mt-1.5">
            <summary className="cursor-pointer hover:text-slate-900">Examples</summary>
            <ul className="mt-1.5 space-y-1">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    onClick={() => setSituation(ex)}
                    className="text-left text-sky-700 hover:underline"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!situation.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
            >
              Next
              <ArrowRight size={15} />
            </button>
          </div>
        </Glass>
      )}

      {step === 2 && (
        <Glass>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(LANGUAGES) as TargetLanguage[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setLanguage(k);
                  void generate(k);
                }}
                disabled={loading}
                className={`rounded-2xl border-2 p-3 text-left transition ${
                  language === k
                    ? 'border-sky-500 bg-sky-50/80'
                    : 'border-white/60 bg-white/60 hover:bg-white/80'
                } disabled:opacity-50`}
              >
                <div className="text-base font-semibold">{LANGUAGES[k].label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{LANGUAGES[k].nativeName}</div>
              </button>
            ))}
          </div>
          {loading && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
              <Loader2 size={14} className="animate-spin" />
              Drafting outline…
            </div>
          )}
          {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
          <div className="mt-3 flex">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-white/70"
            >
              <ArrowLeft size={14} />
              Back
            </button>
          </div>
        </Glass>
      )}

      {step === 3 && language && (
        <Glass>
          <ol className="space-y-1.5">
            {outline.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  value={s}
                  onChange={(e) => {
                    const next = [...outline];
                    next[i] = e.target.value;
                    setOutline(next);
                  }}
                  className="flex-1 rounded-xl border border-white/60 bg-white/60 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-300"
                />
                <button
                  onClick={() => setOutline(outline.filter((_, j) => j !== i))}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/60 border border-white/60 text-slate-500 hover:text-rose-600 hover:bg-white"
                  title="Remove step"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => setOutline([...outline, ''])}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-white/70 border border-white/60 hover:bg-white"
            >
              <Plus size={12} /> Add
            </button>
            <button
              onClick={() => language && generate(language)}
              disabled={loading}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-white/70 border border-white/60 hover:bg-white disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Regenerate
            </button>
          </div>
          {error && <div className="mt-2 text-sm text-rose-700">{error}</div>}
          <div className="mt-3 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 hover:bg-white/70"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              onClick={start}
              disabled={outline.filter((s) => s.trim()).length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 hover:brightness-110 text-white text-sm font-semibold disabled:opacity-50 shadow"
            >
              <Sparkles size={15} />
              Start
            </button>
          </div>
        </Glass>
      )}
    </div>
  );
}

function Glass({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-4 shadow-sm shadow-slate-900/5">
      {children}
    </section>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Situation', 'Language', 'Outline'];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                active
                  ? 'bg-sky-600 text-white'
                  : done
                  ? 'bg-slate-900 text-white'
                  : 'bg-white/70 text-slate-500 border border-white/60'
              }`}
            >
              {n}
            </span>
            <span className={active ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
            {i < labels.length - 1 && <span className="text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
