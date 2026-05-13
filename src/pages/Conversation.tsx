import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { LANGUAGES, type ConversationSession, type Message, type VocabEntry } from '../types';
import {
  answerQuestion,
  checkResponse,
  extractVocab,
  generateFirstTurn,
  generateNextTurn,
  getHelp,
  type HelpResult,
} from '../lib/gemini';
import { speak, stopSpeaking } from '../lib/tts';
import { uid } from '../lib/storage';
import { MessageBubble } from '../components/MessageBubble';
import { VoiceInput } from '../components/VoiceInput';
import { HelpPanel } from '../components/HelpPanel';
import { QuestionDialog } from '../components/QuestionDialog';
import { VocabModal } from '../components/VocabModal';

export function ConversationPage() {
  const nav = useNavigate();
  const { currentSession, setCurrentSession, settings, addVocab, finalizeSession } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpResult, setHelpResult] = useState<HelpResult | null>(null);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [questionTarget, setQuestionTarget] = useState<Message | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionAnswer, setQuestionAnswer] = useState<string | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [savingMessage, setSavingMessage] = useState<Message | null>(null);
  const [endingLoading, setEndingLoading] = useState(false);
  const firstTurnInitiated = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const session = currentSession;

  useEffect(() => {
    if (!session) {
      nav('/setup', { replace: true });
    }
  }, [session, nav]);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [session?.messages.length]);

  const updateSession = useCallback(
    (mutator: (s: ConversationSession) => ConversationSession) => {
      setCurrentSession(session ? mutator(session) : null);
    },
    [session, setCurrentSession]
  );

  const playAiAudio = useCallback(
    async (text: string) => {
      if (!session) return;
      if (!settings.autoPlay) return;
      try {
        await speak(text, session.language, settings.ttsMode, settings.voicePreference);
      } catch {
        /* silent */
      }
    },
    [session, settings.autoPlay, settings.ttsMode, settings.voicePreference]
  );

  const speakText = useCallback(
    async (text: string) => {
      if (!session) return;
      try {
        await speak(text, session.language, settings.ttsMode, settings.voicePreference);
      } catch (err) {
        setError(err instanceof Error ? err.message : '音声の再生に失敗しました。');
      }
    },
    [session, settings.ttsMode, settings.voicePreference]
  );

  // Kick off the first AI turn once.
  useEffect(() => {
    if (!session || session.messages.length > 0 || firstTurnInitiated.current) return;
    firstTurnInitiated.current = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const ai = await generateFirstTurn(session.situation, session.outline, session.language);
        const message: Message = {
          id: uid(),
          role: 'ai',
          text: ai.text,
          translation: ai.translation,
          createdAt: Date.now(),
        };
        updateSession((s) => ({ ...s, messages: [...s.messages, message] }));
        void playAiAudio(ai.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AIの応答取得に失敗しました。');
      } finally {
        setBusy(false);
      }
    })();
  }, [session, updateSession, playAiAudio]);

  const handleSubmitUser = async (text: string) => {
    if (!session) return;
    const userMsg: Message = {
      id: uid(),
      role: 'user',
      text,
      createdAt: Date.now(),
    };
    updateSession((s) => ({ ...s, messages: [...s.messages, userMsg] }));
    setBusy(true);
    setError(null);
    try {
      const [correction, ai] = await Promise.all([
        checkResponse(session.language, session.messages, text).catch(() => null),
        generateNextTurn(session.situation, session.outline, session.language, [
          ...session.messages,
          userMsg,
        ]),
      ]);
      updateSession((s) => {
        const messages = s.messages.map((m) =>
          m.id === userMsg.id && correction ? { ...m, correction } : m
        );
        const aiMsg: Message = {
          id: uid(),
          role: 'ai',
          text: ai.text,
          translation: ai.translation,
          createdAt: Date.now(),
        };
        return { ...s, messages: [...messages, aiMsg] };
      });
      void playAiAudio(ai.text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AIの応答取得に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleHelp = async () => {
    if (!session) return;
    setHelpOpen(true);
    setHelpLoading(true);
    setHelpResult(null);
    setHelpError(null);
    try {
      const result = await getHelp(session.situation, session.outline, session.language, session.messages);
      setHelpResult(result);
    } catch (err) {
      setHelpError(err instanceof Error ? err.message : 'ヘルプの取得に失敗しました。');
    } finally {
      setHelpLoading(false);
    }
  };

  const handleAskQuestion = async (q: string) => {
    if (!session || !questionTarget) return;
    setQuestionLoading(true);
    setQuestionAnswer(null);
    setQuestionError(null);
    try {
      const ans = await answerQuestion(session.language, session.messages, questionTarget, q);
      setQuestionAnswer(ans);
    } catch (err) {
      setQuestionError(err instanceof Error ? err.message : '回答の取得に失敗しました。');
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleSaveVocab = (data: { phrase: string; meaningJa: string; example?: string }) => {
    if (!session) return;
    const entry: VocabEntry = {
      id: uid(),
      language: session.language,
      phrase: data.phrase,
      meaningJa: data.meaningJa,
      example: data.example,
      sourceSessionId: session.id,
      sourceSituation: session.situation,
      createdAt: Date.now(),
    };
    addVocab([entry]);
    setSavingMessage(null);
  };

  const handleEnd = async () => {
    if (!session) return;
    setEndingLoading(true);
    setError(null);
    try {
      const items = await extractVocab(session.language, session.situation, session.messages, session.id);
      if (items.length > 0) addVocab(items);
      const finalized: ConversationSession = { ...session, endedAt: Date.now() };
      finalizeSession(finalized);
      setCurrentSession(null);
      nav('/vocabulary', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '会話の終了処理に失敗しました。');
      setEndingLoading(false);
    }
  };

  const langLabel = useMemo(() => (session ? LANGUAGES[session.language].label : ''), [session]);

  if (!session) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-white border border-slate-200 p-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">{langLabel}での会話</div>
          <div className="text-sm font-medium truncate">{session.situation}</div>
        </div>
        <button
          onClick={handleEnd}
          disabled={endingLoading || session.messages.length === 0}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs hover:bg-slate-700 disabled:opacity-50"
        >
          {endingLoading ? '語彙を抽出中…' : '会話を終了'}
        </button>
      </div>

      <div
        ref={scrollRef}
        className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3 min-h-[55vh] max-h-[60vh] overflow-y-auto"
      >
        {session.messages.length === 0 && busy && (
          <div className="text-sm text-slate-500">AIが最初の発話を準備しています…</div>
        )}
        {session.messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            language={session.language}
            onSpeak={m.role === 'ai' ? () => speakText(m.text) : undefined}
            onAskQuestion={
              m.role === 'ai'
                ? () => {
                    setQuestionTarget(m);
                    setQuestionAnswer(null);
                    setQuestionError(null);
                  }
                : undefined
            }
            onSave={() => setSavingMessage(m)}
          />
        ))}
        {busy && session.messages.length > 0 && (
          <div className="text-xs text-slate-500">AIが応答を生成中…</div>
        )}
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <VoiceInput
        language={session.language}
        onSubmit={handleSubmitUser}
        onHelp={handleHelp}
        busy={busy || endingLoading}
      />

      {helpOpen && (
        <HelpPanel
          loading={helpLoading}
          result={helpResult}
          error={helpError}
          onClose={() => setHelpOpen(false)}
          onSpeak={(t) => void speakText(t)}
          onUseSuggestion={(t) => {
            setHelpOpen(false);
            void handleSubmitUser(t);
          }}
        />
      )}
      {questionTarget && (
        <QuestionDialog
          message={questionTarget}
          loading={questionLoading}
          answer={questionAnswer}
          error={questionError}
          onAsk={(q) => void handleAskQuestion(q)}
          onClose={() => setQuestionTarget(null)}
        />
      )}
      {savingMessage && (
        <VocabModal
          message={savingMessage}
          language={session.language}
          onSave={handleSaveVocab}
          onClose={() => setSavingMessage(null)}
        />
      )}
    </div>
  );
}
