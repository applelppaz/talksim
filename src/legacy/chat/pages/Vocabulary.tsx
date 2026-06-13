import { useMemo, useState } from 'react';
import { ArrowRight, Download, Search, Trash2, Volume2, X, Zap } from 'lucide-react';
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
    <div className="space-y-3">
      <div className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-3 flex items-center justify-between gap-2 shadow-sm shadow-slate-900/5">
        <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
          Vocabulary
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={exportJson}
            disabled={vocab.length === 0}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-700 disabled:opacity-50"
            title="Export JSON"
          >
            <Download size={15} />
          </button>
          <button
            onClick={() => {
              if (filtered.length === 0) return;
              setFlashIdx(0);
              setShowAnswer(false);
            }}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-xs font-semibold hover:brightness-110 disabled:opacity-50 shadow"
          >
            <Zap size={14} />
            Flashcards
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-3 shadow-sm shadow-slate-900/5 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
            All · {vocab.length}
          </FilterChip>
          {(Object.keys(LANGUAGES) as TargetLanguage[]).map((l) => (
            <FilterChip key={l} active={filter === l} onClick={() => setFilter(l)}>
              {LANGUAGES[l].label} · {vocab.filter((v) => v.language === l).length}
            </FilterChip>
          ))}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full rounded-2xl border border-white/60 bg-white/70 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-8 text-center text-sm text-slate-500">
          No vocab yet. Finish a chat session to auto-extract items.
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
            void speak(
              filtered[flashIdx].phrase,
              filtered[flashIdx].language,
              settings.ttsMode,
              settings.voicePreference
            )
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
      className={`text-xs px-2.5 py-1 rounded-full border transition ${
        active
          ? 'bg-slate-900 text-white border-slate-900'
          : 'bg-white/60 text-slate-700 border-white/60 hover:bg-white/80'
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
    <li className="rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl p-3 shadow-sm shadow-slate-900/5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900/85 text-white">
              {LANGUAGES[entry.language].label}
            </span>
            <span className="font-medium break-words text-slate-900">{entry.phrase}</span>
          </div>
          <div className="text-sm text-slate-700 mt-1">{entry.meaningJa}</div>
          {entry.example && (
            <div className="text-xs text-slate-500 mt-1 italic">{entry.example}</div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onSpeak}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-700"
            title="Play"
          >
            <Volume2 size={13} />
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-500 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={13} />
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
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/60 bg-white/85 backdrop-blur-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {current} / {total}
          </span>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/70"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="text-center py-8">
          <div className="text-2xl font-semibold break-words text-slate-900">{entry.phrase}</div>
          <button
            onClick={onSpeak}
            className="mt-2 inline-flex items-center gap-1 text-sm text-sky-700 hover:underline"
          >
            <Volume2 size={14} /> Play
          </button>
          {showAnswer && (
            <div className="mt-6 space-y-2">
              <div className="text-base text-slate-800">{entry.meaningJa}</div>
              {entry.example && (
                <div className="text-sm text-slate-500 italic">{entry.example}</div>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          {showAnswer ? (
            <button
              onClick={onNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-sm font-semibold hover:brightness-110 shadow"
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={onReveal}
              className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold"
            >
              Reveal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
