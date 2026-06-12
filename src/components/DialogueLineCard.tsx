import type { ReactNode } from 'react';
import { ChevronRight, Loader2, Mic, Volume2 } from 'lucide-react';
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
    ? 'border-amber-300/80 bg-amber-50/80 ring-2 ring-amber-200/60'
    : isPlaying
    ? 'border-sky-300/80 bg-sky-50/80 ring-2 ring-sky-200/60'
    : 'border-white/60 bg-white/70';

  return (
    <div className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative max-w-[94%] rounded-3xl border backdrop-blur-xl p-3 shadow-sm shadow-slate-900/5 transition ${cardClass}`}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white text-[10px]">
              {index + 1}
            </span>
            <span>{line.speaker}</span>
            {isUser && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">You</span>
            )}
          </div>
          <button
            type="button"
            onClick={onSpeak}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-700"
            title="Play this line"
          >
            <Volume2 size={14} />
          </button>
        </div>
        <p className="text-[17px] leading-relaxed break-words text-slate-900">{parts}</p>
        <p className="text-xs text-slate-500 mt-1.5 break-words">{line.translation}</p>

        {/* User-line: big circular mic */}
        {isUser && (
          <div className="mt-3 flex items-center justify-end gap-2">
            {recError && !evalResult && recordState === 'idle' && (
              <span className="text-[11px] text-rose-700 max-w-[60%] truncate">{recError}</span>
            )}
            <MicButton
              state={recordState}
              onStart={onStartRecord}
              onStop={onStopRecord}
            />
          </div>
        )}
        {isUser && recordState === 'processing' && !evalResult && (
          <div className="mt-2 text-xs text-slate-600">Evaluating…</div>
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
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800"
            >
              {evalResult ? 'Next' : 'Skip'}
              <ChevronRight size={14} />
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
        className="relative inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-300/50"
        title="Stop recording"
      >
        <span className="absolute inset-0 rounded-full bg-rose-400/40 animate-ping" />
        <Mic size={22} strokeWidth={2.4} className="relative" />
      </button>
    );
  }
  if (state === 'processing') {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-200 text-slate-500"
      >
        <Loader2 size={22} className="animate-spin" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-300/50 hover:brightness-110"
      title="Record your line for evaluation"
    >
      <Mic size={22} strokeWidth={2.4} />
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
