import { useEffect, useRef, useState } from 'react';
import { startListening, sttSupported, type SttHandle } from '../lib/stt';
import type { TargetLanguage } from '../types';

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

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-3">
      {error && <div className="mb-2 text-xs text-red-600">{error}</div>}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled || busy}
          placeholder={listening ? '音声を聞き取り中…' : 'マイクで話すか、ここに入力'}
          className="flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-slate-100"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex flex-col gap-1.5">
          {supported && (
            <button
              type="button"
              onClick={listening ? handleStop : handleStart}
              disabled={disabled || busy}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                listening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              } disabled:opacity-50`}
              title="音声入力"
            >
              {listening ? '⏹ 停止' : '🎤 録音'}
            </button>
          )}
          <button
            type="button"
            onClick={onHelp}
            disabled={disabled || busy}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 disabled:opacity-50"
            title="ヘルプ"
          >
            💡 ヘルプ
          </button>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || busy || !text.trim()}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
        >
          送信 (⌘/Ctrl+Enter)
        </button>
      </div>
      {!supported && (
        <div className="mt-1 text-[11px] text-slate-500">
          このブラウザは音声認識に対応していません。テキスト入力をご利用ください（Chrome推奨）。
        </div>
      )}
    </div>
  );
}
