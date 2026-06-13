import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { DialogueSlot } from '../types';

interface Props {
  slot: DialogueSlot;
  selected: number;
  onSelect: (index: number) => void;
}

export function SwapSlot({ slot, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const currentText = selected === -1 ? slot.original : slot.alternatives[selected]?.text ?? slot.original;
  const currentTranslation =
    selected === -1 ? slot.translation : slot.alternatives[selected]?.translation ?? slot.translation;

  return (
    <span ref={wrapRef} className="relative inline-block align-baseline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-baseline gap-0.5 px-1.5 py-0.5 rounded-xl border text-base leading-snug transition ${
          selected === -1
            ? 'border-sky-300/70 bg-sky-50/80 text-sky-900 hover:bg-sky-100/80'
            : 'border-emerald-400/70 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-100/80'
        }`}
        title={currentTranslation}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-semibold">{currentText}</span>
        <ChevronDown size={11} className="text-slate-500" />
      </button>
      {open && (
        <span className="absolute z-20 mt-1 left-0 min-w-[14rem] max-w-[20rem] max-h-72 overflow-y-auto rounded-2xl border border-white/70 bg-white/90 backdrop-blur-xl shadow-xl text-sm">
          <span className="block px-3 py-1.5 text-[10px] uppercase tracking-wide text-slate-500 bg-white/60 border-b border-white/70">
            Swap options ({slot.alternatives.length + 1})
          </span>
          <Option
            label={slot.original}
            sub={slot.translation}
            isCurrent={selected === -1}
            marker="•"
            onClick={() => {
              onSelect(-1);
              setOpen(false);
            }}
          />
          {slot.alternatives.map((alt, i) => (
            <Option
              key={i}
              label={alt.text}
              sub={alt.translation}
              isCurrent={selected === i}
              marker={String(i + 1)}
              onClick={() => {
                onSelect(i);
                setOpen(false);
              }}
            />
          ))}
        </span>
      )}
    </span>
  );
}

function Option({
  label,
  sub,
  isCurrent,
  marker,
  onClick,
}: {
  label: string;
  sub: string;
  isCurrent: boolean;
  marker: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-slate-50 ${
        isCurrent ? 'bg-emerald-50' : ''
      }`}
    >
      <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center justify-center">
        {marker}
      </span>
      <span className="min-w-0">
        <span className="block font-medium break-words">{label}</span>
        <span className="block text-xs text-slate-500 break-words">{sub}</span>
      </span>
    </button>
  );
}
