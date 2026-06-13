import { Loader2, Send, Volume2, X } from 'lucide-react';
import type { HelpResult } from '../../../lib/gemini';

interface Props {
  loading: boolean;
  result: HelpResult | null;
  error: string | null;
  onClose: () => void;
  onUseSuggestion: (text: string) => void;
  onSpeak: (text: string) => void;
}

export function HelpPanel({ loading, result, error, onClose, onUseSuggestion, onSpeak }: Props) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-white/60 bg-white/85 backdrop-blur-xl shadow-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Hint</h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/70 text-slate-500"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        {loading && (
          <div className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Loader2 size={14} className="animate-spin" />
            Drafting suggestions…
          </div>
        )}
        {error && <div className="text-sm text-rose-700">{error}</div>}
        {result && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {result.suggestions.map((s, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur p-3"
                >
                  <div className="font-medium text-slate-900">{s.text}</div>
                  <div className="text-xs text-slate-600 mt-1">{s.translation}</div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => onSpeak(s.text)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/80 border border-white/60 hover:bg-white"
                    >
                      <Volume2 size={12} /> Play
                    </button>
                    <button
                      onClick={() => onUseSuggestion(s.text)}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-sky-600 text-white hover:bg-sky-700"
                    >
                      <Send size={12} /> Use this
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {result.explanation && (
              <div className="rounded-2xl bg-white/70 border border-white/60 p-3 text-sm text-slate-800 whitespace-pre-wrap">
                {result.explanation}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
