import type { HelpResult } from '../lib/gemini';

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
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">💡 ヘルプ</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            閉じる
          </button>
        </div>
        {loading && <div className="text-sm text-slate-600">AIが提案を生成しています…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {result && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">この場面で言える例文</div>
              <div className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3">
                    <div className="font-medium">{s.text}</div>
                    <div className="text-xs text-slate-600 mt-1">{s.translation}</div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => onSpeak(s.text)}
                        className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
                      >
                        🔊 聞く
                      </button>
                      <button
                        onClick={() => onUseSuggestion(s.text)}
                        className="text-xs px-2 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-900"
                      >
                        この文を使う
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {result.explanation && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">解説</div>
                <div className="text-sm whitespace-pre-wrap rounded-lg bg-slate-50 p-3">
                  {result.explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
