import type { Message, TargetLanguage } from '../types';
import { CorrectionInline } from './CorrectionInline';

interface Props {
  message: Message;
  language: TargetLanguage;
  onSpeak?: () => void;
  onAskQuestion?: () => void;
  onSave?: () => void;
}

export function MessageBubble({ message, onSpeak, onAskQuestion, onSave }: Props) {
  const isAi = message.role === 'ai';
  const [showTranslation, setShowTranslation] = useToggle(false);
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${isAi ? '' : 'text-right'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 inline-block text-left whitespace-pre-wrap break-words ${
            isAi ? 'bg-white border border-slate-200' : 'bg-sky-600 text-white'
          }`}
        >
          {message.text}
        </div>
        {message.translation && (
          <div className="mt-1">
            <button
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800 underline"
              onClick={() => setShowTranslation()}
            >
              {showTranslation ? '訳を隠す' : '訳を表示'}
            </button>
            {showTranslation && (
              <div className="text-xs text-slate-600 mt-0.5">{message.translation}</div>
            )}
          </div>
        )}
        <div className={`mt-1 flex gap-2 text-xs ${isAi ? '' : 'justify-end'}`}>
          {isAi && onSpeak && (
            <button onClick={onSpeak} className="text-slate-500 hover:text-slate-900">
              🔊 再生
            </button>
          )}
          {isAi && onAskQuestion && (
            <button onClick={onAskQuestion} className="text-slate-500 hover:text-slate-900">
              ❓ 質問
            </button>
          )}
          {onSave && (
            <button onClick={onSave} className="text-slate-500 hover:text-slate-900">
              📝 保存
            </button>
          )}
        </div>
        {message.correction && !message.correction.ok && (
          <CorrectionInline correction={message.correction} />
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
function useToggle(initial: boolean): [boolean, () => void] {
  const [v, setV] = useState(initial);
  return [v, () => setV((x) => !x)];
}
