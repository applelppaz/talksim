import { useState } from 'react';
import type { Message } from '../../../types';

interface Props {
  message: Message;
  loading: boolean;
  answer: string | null;
  error: string | null;
  onAsk: (question: string) => void;
  onClose: () => void;
}

export function QuestionDialog({ message, loading, answer, error, onAsk, onClose }: Props) {
  const [q, setQ] = useState('');
  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">❓ この発話について質問</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            閉じる
          </button>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm mb-3">
          <div className="font-medium">{message.text}</div>
          {message.translation && <div className="text-xs text-slate-600 mt-1">{message.translation}</div>}
        </div>
        <textarea
          rows={3}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="例：この単語の意味は？ / なぜこの語順？ / 別の言い方はある？"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => q.trim() && onAsk(q.trim())}
            disabled={!q.trim() || loading}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
          >
            {loading ? '回答中…' : '質問する'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {answer && (
          <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}
