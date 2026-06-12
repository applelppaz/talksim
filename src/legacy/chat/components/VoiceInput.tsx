import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Mic, Send, Square } from 'lucide-react';
import { startListening, sttSupported, type SttHandle } from '../../../lib/stt';
import type { TargetLanguage } from '../../../types';

interface Props {
  language: TargetLanguage;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onHelp: () => void;
  busy?: boolean;
}

export function VoiceInput({ language, disabled, onSubmit, onHelp, busy }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<SttHandle | null>(null);
  const supported = sttSupported();

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
    };
  }, []);

  const handleStart = () => {
    setError(null);
    setListening(true);
    handleRef.current = startListening(language, {
      onInterim: (t) => setText(t),
      onFinal: (t) => setText(t),
      onError: (msg) => {
        setError(msg);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
  };

  const handleStop = () => {
    handleRef.current?.stop();
    setListening(false);
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  const blocked = disabled || busy;

  return (
    <div className="sticky bottom-0 -mx-4 px-4 pt-3 pb-3 backdrop-blur-xl bg-white/55 border-t border-white/40">
      {error && <div className="mb-1.5 text-[11px] text-rose-700">{error}</div>}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={blocked}
            placeholder={listening ? 'Listening…' : 'Type or use the mic'}
            className="w-full resize-none rounded-2xl border border-white/60 bg-white/70 backdrop-blur px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:bg-white/40 placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              onClick={onHelp}
              disabled={blocked}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 disabled:opacity-50"
              title="Hint"
            >
              <HelpCircle size={12} />
              Hint
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {supported && (
            <button
              type="button"
              onClick={listening ? handleStop : handleStart}
              disabled={blocked}
              className={`relative inline-flex items-center justify-center w-14 h-14 rounded-full shadow-lg ${
                listening
                  ? 'bg-gradient-to-br from-rose-500 to-pink-500 text-white shadow-rose-300/50'
                  : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-300/50 hover:brightness-110'
              } disabled:opacity-50`}
              title={listening ? 'Stop' : 'Record'}
            >
              {listening && (
                <span className="absolute inset-0 rounded-full bg-rose-400/40 animate-ping" />
              )}
              {listening ? (
                <Square size={20} strokeWidth={2.4} className="relative" fill="currentColor" />
              ) : (
                <Mic size={22} strokeWidth={2.4} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={blocked || !text.trim()}
            className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-300/50 hover:brightness-110 disabled:opacity-50"
            title="Send (⌘/Ctrl+Enter)"
          >
            <Send size={20} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
