import { useState } from 'react';
import { BookmarkPlus, HelpCircle, Languages, Volume2 } from 'lucide-react';
import type { Message, TargetLanguage } from '../../../types';
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
  const [showTranslation, setShowTranslation] = useState(false);
  return (
    <div className={`flex ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${isAi ? '' : 'text-right'}`}>
        <div
          className={`rounded-3xl px-4 py-2.5 inline-block text-left whitespace-pre-wrap break-words shadow-sm ${
            isAi
              ? 'bg-white/80 backdrop-blur border border-white/70 text-slate-900'
              : 'bg-gradient-to-br from-sky-500 to-violet-500 text-white'
          }`}
        >
          {message.text}
        </div>
        {message.translation && showTranslation && (
          <div className="text-xs text-slate-600 mt-1 px-1">{message.translation}</div>
        )}
        <div className={`mt-1 flex gap-1 ${isAi ? '' : 'justify-end'}`}>
          {message.translation && (
            <IconBtn
              onClick={() => setShowTranslation((v) => !v)}
              title={showTranslation ? 'Hide translation' : 'Show translation'}
            >
              <Languages size={13} />
            </IconBtn>
          )}
          {isAi && onSpeak && (
            <IconBtn onClick={onSpeak} title="Play">
              <Volume2 size={13} />
            </IconBtn>
          )}
          {isAi && onAskQuestion && (
            <IconBtn onClick={onAskQuestion} title="Ask about this line">
              <HelpCircle size={13} />
            </IconBtn>
          )}
          {onSave && (
            <IconBtn onClick={onSave} title="Save to vocab">
              <BookmarkPlus size={13} />
            </IconBtn>
          )}
        </div>
        {message.correction && !message.correction.ok && (
          <CorrectionInline correction={message.correction} />
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 hover:bg-white border border-white/60 text-slate-600 hover:text-slate-900"
    >
      {children}
    </button>
  );
}
