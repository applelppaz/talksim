import { RotateCw, X } from 'lucide-react';
import type { PronunciationEval } from '../types';

interface Props {
  result: PronunciationEval;
  onRetry: () => void;
  onDismiss: () => void;
}

export function PracticeFeedback({ result, onRetry, onDismiss }: Props) {
  const scoreColor =
    result.score >= 85
      ? 'text-emerald-700 bg-emerald-50/80 border-emerald-200'
      : result.score >= 60
      ? 'text-amber-700 bg-amber-50/80 border-amber-200'
      : 'text-rose-700 bg-rose-50/80 border-rose-200';

  return (
    <div className="mt-2 rounded-2xl border border-white/70 bg-white/70 backdrop-blur p-3 text-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-full border font-semibold ${scoreColor}`}>
            {result.ok ? 'OK' : 'Needs work'} · {result.score}
          </span>
          <span className="text-slate-700 truncate">{result.summary}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-sky-600 text-white hover:bg-sky-700"
            title="Try again"
          >
            <RotateCw size={12} />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700"
            title="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        <div className="rounded-xl bg-white/80 border border-white/70 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Target</div>
          <div className="text-slate-800 break-words">{result.expected}</div>
        </div>
        <div className="rounded-xl bg-white/80 border border-white/70 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">You said</div>
          <div className="text-slate-800 break-words">{result.transcript || '(not recognized)'}</div>
        </div>
      </div>
      {result.corrected && (
        <div className="mt-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200 p-2">
          <div className="text-[10px] uppercase tracking-wide text-emerald-700 mb-0.5">Corrected</div>
          <div className="text-emerald-900 break-words font-medium">{result.corrected}</div>
        </div>
      )}
      {result.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.issues.map((iss, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold">
                {iss.kind}
              </span>
              <span className="text-slate-700 break-words">{iss.detail}</span>
            </li>
          ))}
        </ul>
      )}
      {result.suggestion && (
        <div className="mt-2 text-slate-700">
          <span className="font-semibold">Tip: </span>
          {result.suggestion}
        </div>
      )}
    </div>
  );
}
