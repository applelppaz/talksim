import { useState } from 'react';
import { BookmarkPlus, X } from 'lucide-react';
import type { Message, TargetLanguage } from '../../../types';

interface Props {
  message: Message;
  language: TargetLanguage;
  onSave: (data: { phrase: string; meaningJa: string; example?: string }) => void;
  onClose: () => void;
}

export function VocabModal({ message, onSave, onClose }: Props) {
  const [phrase, setPhrase] = useState(message.text);
  const [meaningJa, setMeaningJa] = useState(message.translation ?? '');
  const [example, setExample] = useState('');

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
          <h3 className="font-semibold text-slate-900">Save phrase</h3>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/70 text-slate-500"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <Field label="Phrase">
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </Field>
          <Field label="Meaning">
            <input
              value={meaningJa}
              onChange={(e) => setMeaningJa(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </Field>
          <Field label="Example or note (optional)">
            <textarea
              rows={3}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-full rounded-2xl border border-white/60 bg-white/70 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-300"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() =>
              phrase.trim() &&
              onSave({
                phrase: phrase.trim(),
                meaningJa: meaningJa.trim(),
                example: example.trim() || undefined,
              })
            }
            disabled={!phrase.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-sm font-semibold hover:brightness-110 disabled:opacity-50 shadow"
          >
            <BookmarkPlus size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}
