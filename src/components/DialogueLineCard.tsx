import type { ReactNode } from 'react';
import type { DialogueLine, PronunciationEval } from '../types';
import { SwapSlot } from './SwapSlot';
import { PracticeFeedback } from './PracticeFeedback';

interface Props {
  line: DialogueLine;
  index: number;
  selections: Record<number, number>;
  onSelect: (slotIndex: number, value: number) => void;
  onSpeak: () => void;
  isPlaying: boolean;
  alignRight: boolean;
  isUser: boolean;
  isActive: boolean;
  recordState: 'idle' | 'listening' | 'processing';
  evalResult: PronunciationEval | null;
  recError: string | null;
  onStartRecord: () => void;
  onStopRecord: () => void;
  onRetryRecord: () => void;
  onClearEval: () => void;
  onAdvance?: () => void;
}

const SLOT_RE = /\{(\d+)\}/g;

export function DialogueLineCard({
  line,
  index,
  selections,
  onSelect,
  onSpeak,
  isPlaying,
  alignRight,
  isUser,
  isActive,
  recordState,
  evalResult,
  recError,
  onStartRecord,
  onStopRecord,
  onRetryRecord,
  onClearEval,
  onAdvance,
}: Props) {
  const parts = renderTemplate(line, selections, onSelect);

  const cardClass = isActive
    ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
    : isPlaying
    ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
    : isUser
    ? 'border-emerald-200 bg-white'
    : 'border-slate-200 bg-white';

  return (
    <div className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[92%] rounded-2xl border p-3 shadow-sm transition ${cardClass}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] leading-5 text-center">
              {index + 1}
            </span>
            <span>{line.speaker}</span>
            {isUser && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px]">You</span>
            )}
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={onSpeak}
              className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Play this line"
            >
              🔊 Play
            </button>
            {isUser && (
              <MicButton
                state={recordState}
                onStart={onStartRecord}
                onStop={onStopRecord}
              />
            )}
          </div>
        </div>
        <p className="text-lg leading-relaxed break-words">{parts}</p>
        <p className="text-xs text-slate-500 mt-1.5 break-words">{line.translation}</p>

        {isUser && recError && !evalResult && recordState === 'idle' && (
          <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800 flex items-center justify-between gap-2">
            <span>{recError}</span>
            <button
              type="button"
              onClick={onRetryRecord}
              className="px-2 py-0.5 rounded bg-rose-600 text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}
        {isUser && recordState === 'processing' && !evalResult && (
          <div className="mt-2 text-xs text-slate-600">Evaluating your pronunciation…</div>
        )}
        {evalResult && (
          <PracticeFeedback
            result={evalResult}
            onRetry={onRetryRecord}
            onDismiss={onClearEval}
          />
        )}
        {isActive && onAdvance && (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={onAdvance}
              className="text-xs px-3 py-1 rounded bg-slate-900 text-white hover:bg-slate-700"
            >
              {evalResult ? 'Next →' : 'Skip →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MicButton({
  state,
  onStart,
  onStop,
}: {
  state: 'idle' | 'listening' | 'processing';
  onStart: () => void;
  onStop: () => void;
}) {
  if (state === 'listening') {
    return (
      <button
        type="button"
        onClick={onStop}
        className="text-xs px-2 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1"
        title="Stop recording"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
        Recording
      </button>
    );
  }
  if (state === 'processing') {
    return (
      <button
        type="button"
        disabled
        className="text-xs px-2 py-1 rounded-md bg-slate-200 text-slate-500"
      >
        Evaluating…
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      className="text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
      title="Record your line for evaluation"
    >
      🎤 Record
    </button>
  );
}

function renderTemplate(
  line: DialogueLine,
  selections: Record<number, number>,
  onSelect: (slotIndex: number, value: number) => void
) {
  const out: ReactNode[] = [];
  let lastIndex = 0;
  const template = line.template;
  let match: RegExpExecArray | null;
  SLOT_RE.lastIndex = 0;
  while ((match = SLOT_RE.exec(template)) !== null) {
    if (match.index > lastIndex) {
      out.push(template.slice(lastIndex, match.index));
    }
    const slotIndex = parseInt(match[1], 10);
    const slot = line.slots[slotIndex];
    if (slot) {
      const selected = selections[slotIndex] ?? -1;
      out.push(
        <SwapSlot
          key={`s-${match.index}`}
          slot={slot}
          selected={selected}
          onSelect={(v) => onSelect(slotIndex, v)}
        />
      );
    } else {
      out.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    out.push(template.slice(lastIndex));
  }
  return out;
}

export function renderedLineText(
  line: DialogueLine,
  selections: Record<number, number>
): string {
  return line.template.replace(SLOT_RE, (_m, n: string) => {
    const idx = parseInt(n, 10);
    const slot = line.slots[idx];
    if (!slot) return '';
    const sel = selections[idx] ?? -1;
    if (sel === -1) return slot.original;
    return slot.alternatives[sel]?.text ?? slot.original;
  });
}
