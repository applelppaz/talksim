import type { PronunciationEval } from '../types';

interface Props {
  result: PronunciationEval;
  onRetry: () => void;
  onDismiss: () => void;
}

export function PracticeFeedback({ result, onRetry, onDismiss }: Props) {
  const scoreColor =
    result.score >= 85 ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : result.score >= 60 ? 'text-amber-700 bg-amber-50 border-amber-200'
    : 'text-rose-700 bg-rose-50 border-rose-200';

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full border font-semibold ${scoreColor}`}>
            {result.ok ? 'OK' : 'Needs work'} · {result.score}
          </span>
          <span className="text-slate-700">{result.summary}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={onRetry}
            className="px-2 py-0.5 rounded bg-sky-600 text-white hover:bg-sky-700"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300"
            title="Dismiss feedback"
          >
            ×
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded bg-white border border-slate-200 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Target</div>
          <div className="text-slate-800 break-words">{result.expected}</div>
        </div>
        <div className="rounded bg-white border border-slate-200 p-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-0.5">Your speech (recognized)</div>
          <div className="text-slate-800 break-words">{result.transcript || '(not recognized)'}</div>
        </div>
      </div>
      {result.issues.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.issues.map((iss, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
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
