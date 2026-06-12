import { useState } from 'react';
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
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full sm:max-w-lg sm:mx-4 bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg">📝 フレーズを保存</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900">
            閉じる
          </button>
        </div>
        <div className="space-y-3 text-sm">
          <Field label="フレーズ（学習言語）">
            <input
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </Field>
          <Field label="日本語訳・意味">
            <input
              value={meaningJa}
              onChange={(e) => setMeaningJa(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </Field>
          <Field label="例文・メモ（任意）">
            <textarea
              rows={3}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => phrase.trim() && onSave({ phrase: phrase.trim(), meaningJa: meaningJa.trim(), example: example.trim() || undefined })}
            disabled={!phrase.trim()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
