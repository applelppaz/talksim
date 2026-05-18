import type { DialogueLine } from '../types';
import { SwapSlot } from './SwapSlot';

interface Props {
  line: DialogueLine;
  index: number;
  selections: Record<number, number>;
  onSelect: (slotIndex: number, value: number) => void;
  onSpeak: () => void;
  isPlaying: boolean;
  alignRight: boolean;
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
}: Props) {
  const parts = renderTemplate(line, selections, onSelect);

  return (
    <div className={`flex ${alignRight ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] rounded-2xl border p-3 shadow-sm transition ${
          isPlaying
            ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200'
            : alignRight
            ? 'border-slate-200 bg-white'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="text-[11px] font-semibold text-slate-500">
            <span className="inline-block w-5 h-5 mr-1.5 rounded-full bg-slate-900 text-white text-[10px] leading-5 text-center">
              {index + 1}
            </span>
            {line.speaker}
          </div>
          <button
            type="button"
            onClick={onSpeak}
            className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700"
            title="この行を再生"
          >
            🔊 再生
          </button>
        </div>
        <p className="text-lg leading-relaxed break-words">{parts}</p>
        <p className="text-xs text-slate-500 mt-1.5 break-words">{line.translation}</p>
      </div>
    </div>
  );
}

function renderTemplate(
  line: DialogueLine,
  selections: Record<number, number>,
  onSelect: (slotIndex: number, value: number) => void
) {
  const out: (string | JSX.Element)[] = [];
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
