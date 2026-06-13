import { useState } from 'react';
import { Send, X } from 'lucide-react';
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
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-3xl border border-white/60 bg-white/85 backdrop-blur-xl shadow-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">Ask about this line</h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/70 text-slate-500"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="rounded-2xl bg-white/70 border border-white/60 p-3 text-sm mb-3">
          <div className="font-medium text-slate-900">{message.text}</div>
          {message.translation && (
            <div className="text-xs text-slate-600 mt-1">{message.translation}</div>
          )}
        </div>
        <textarea
          rows={3}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="What's a different way to say it? Why this word order? …"
          className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => q.trim() && onAsk(q.trim())}
            disabled={!q.trim() || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
          >
            <Send size={13} />
            {loading ? 'Asking…' : 'Ask'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-rose-700">{error}</div>}
        {answer && (
          <div className="mt-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-3 text-sm whitespace-pre-wrap">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}
