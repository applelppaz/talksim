import { useMemo, useState } from 'react';
import { useApp } from '../../../store/AppContext';
import { LANGUAGES, type TargetLanguage, type VocabEntry } from '../../../types';
import { speak } from '../../../lib/tts';

export function VocabularyPage() {
  const { vocab, removeVocab, settings } = useApp();
  const [filter, setFilter] = useState<TargetLanguage | 'all'>('all');
  const [search, setSearch] = useState('');
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const filtered = useMemo(() => {
    return vocab.filter((v) => {
      if (filter !== 'all' && v.language !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          v.phrase.toLowerCase().includes(q) ||
          v.meaningJa.toLowerCase().includes(q) ||
          (v.example ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vocab, filter, search]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(vocab, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `talksim-vocab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">語彙・フレーズ</h1>
        <div className="flex gap-2">
          <button
            onClick={exportJson}
            disabled={vocab.length === 0}
            className="text-xs px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
          >
            JSONエクスポート
          </button>
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              setFlashIdx(0);
              setShowAnswer(false);
            }}
            disabled={filtered.length === 0}
            className="text-xs px-3 py-1.5 rounded bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
          >
            フラッシュカード
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          すべて（{vocab.length}）
        </FilterChip>
        {(Object.keys(LANGUAGES) as TargetLanguage[]).map((l) => (
          <FilterChip key={l} active={filter === l} onClick={() => setFilter(l)}>
            {LANGUAGES[l].label}（{vocab.filter((v) => v.language === l).length}）
          </FilterChip>
        ))}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="検索（フレーズ・日本語・例文）"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          まだ語彙が保存されていません。会話を終えると自動で抽出されます。
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((v) => (
            <VocabRow
              key={v.id}
              entry={v}
              onDelete={() => removeVocab(v.id)}
              onSpeak={() =>
                void speak(v.phrase, v.language, settings.ttsMode, settings.voicePreference)
              }
            />
          ))}
        </ul>
      )}

      {flashIdx !== null && filtered[flashIdx] && (
        <FlashCard
          entry={filtered[flashIdx]}
          showAnswer={showAnswer}
          onReveal={() => setShowAnswer(true)}
          onNext={() => {
            if (flashIdx + 1 >= filtered.length) {
              setFlashIdx(null);
              return;
            }
            setFlashIdx(flashIdx + 1);
            setShowAnswer(false);
          }}
          onClose={() => setFlashIdx(null)}
          onSpeak={() =>
            void speak(filtered[flashIdx].phrase, filtered[flashIdx].language, settings.ttsMode, settings.voicePreference)
          }
          total={filtered.length}
          current={flashIdx + 1}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full ${
        active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function VocabRow({
  entry,
  onDelete,
  onSpeak,
}: {
  entry: VocabEntry;
  onDelete: () => void;
  onSpeak: () => void;
}) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {LANGUAGES[entry.language].label}
            </span>
            <span className="font-medium break-words">{entry.phrase}</span>
          </div>
          <div className="text-sm text-slate-700 mt-1">{entry.meaningJa}</div>
          {entry.example && (
            <div className="text-xs text-slate-500 mt-1 italic">例: {entry.example}</div>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={onSpeak} className="text-xs text-slate-500 hover:text-slate-900">
            🔊
          </button>
          <button onClick={onDelete} className="text-xs text-slate-500 hover:text-red-600">
            削除
          </button>
        </div>
      </div>
    </li>
  );
}

function FlashCard({
  entry,
  showAnswer,
  onReveal,
  onNext,
  onClose,
  onSpeak,
  total,
  current,
}: {
  entry: VocabEntry;
  showAnswer: boolean;
  onReveal: () => void;
  onNext: () => void;
  onClose: () => void;
  onSpeak: () => void;
  total: number;
  current: number;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs text-slate-500 mb-2">
          {current} / {total}
        </div>
        <div className="text-center py-8">
          <div className="text-2xl font-semibold break-words">{entry.phrase}</div>
          <button onClick={onSpeak} className="mt-2 text-sm text-sky-700 hover:underline">
            🔊 発音を聞く
          </button>
          {showAnswer && (
            <div className="mt-6 space-y-2">
              <div className="text-base text-slate-800">{entry.meaningJa}</div>
              {entry.example && (
                <div className="text-sm text-slate-500 italic">例: {entry.example}</div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between">
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900">
            終了
          </button>
          {showAnswer ? (
            <button
              onClick={onNext}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium"
            >
              次へ →
            </button>
          ) : (
            <button
              onClick={onReveal}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium"
            >
              意味を見る
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
