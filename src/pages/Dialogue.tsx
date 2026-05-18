import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { LANGUAGES, type Dialogue, type PronunciationEval, type SlotSelections, type TargetLanguage } from '../types';
import { evaluatePronunciation, generateDialogue } from '../lib/gemini';
import { speak, speakSequence, stopSpeaking } from '../lib/tts';
import { startRecognition, sttSupported, type RecognitionHandle } from '../lib/stt';
import { hasAnyKey } from '../lib/apiKeyManager';
import { DialogueLineCard, renderedLineText } from '../components/DialogueLineCard';

const EXAMPLES = [
  'カフェでコーヒーを注文する。バリスタとサイズや甘さの相談をする。',
  '空港のチェックインカウンターで荷物を預ける。座席を窓側に変更したい。',
  'ホテルのフロントでチェックインする。Wi-Fiのパスワードと朝食の時間を尋ねる。',
  '海外で道に迷った。通行人に最寄りの駅までの行き方を尋ねる。',
  '初対面の同僚と自己紹介をして、出身地や趣味について雑談する。',
  'レストランで料理を注文し、アレルギーについて確認する。',
];

type RecState = 'idle' | 'listening' | 'processing';

export function DialoguePage() {
  const { settings, dialogues, addDialogue } = useApp();
  const [language, setLanguage] = useState<TargetLanguage>('en');
  const [situation, setSituation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [selections, setSelections] = useState<SlotSelections>({});
  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const autoPlayedFor = useRef<string | null>(null);

  // Practice state
  const [selfSpeaker, setSelfSpeaker] = useState<string | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [recState, setRecState] = useState<Record<string, RecState>>({});
  const [recErrors, setRecErrors] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, PronunciationEval>>({});
  const recHandleRef = useRef<RecognitionHandle | null>(null);
  const activeRecLineRef = useRef<string | null>(null);
  const sttOk = sttSupported();

  const hasKey = hasAnyKey();

  useEffect(() => {
    return () => {
      stopSpeaking();
      if (recHandleRef.current) recHandleRef.current.stop();
    };
  }, []);

  // Reset role/eval state on new dialogue
  useEffect(() => {
    if (!dialogue) return;
    const first = dialogue.lines[0]?.speaker ?? null;
    setSelfSpeaker(first);
    setRecState({});
    setRecErrors({});
    setEvaluations({});
    setPracticing(false);
    setActiveLineIdx(null);
  }, [dialogue?.id]);

  const speakers = useMemo<string[]>(() => {
    if (!dialogue) return [];
    return Array.from(new Set(dialogue.lines.map((l) => l.speaker)));
  }, [dialogue]);

  const userOwnsLine = useCallback(
    (speaker: string) => selfSpeaker !== null && speaker === selfSpeaker,
    [selfSpeaker]
  );

  const handleGenerate = useCallback(async () => {
    if (!situation.trim()) {
      setError('シチュエーションを入力してください。');
      return;
    }
    if (!hasAnyKey()) {
      setError('Gemini APIキーが未設定です。設定ページから登録してください。');
      return;
    }
    setError(null);
    setLoading(true);
    stopSpeaking();
    if (recHandleRef.current) recHandleRef.current.stop();
    setPlayingAll(false);
    setPlayingLineId(null);
    try {
      const result = await generateDialogue(situation.trim(), language);
      setDialogue(result);
      setSelections({});
      addDialogue(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '会話の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [situation, language, addDialogue]);

  const playLine = useCallback(
    async (lineId: string) => {
      if (!dialogue) return;
      const line = dialogue.lines.find((l) => l.id === lineId);
      if (!line) return;
      const text = renderedLineText(line, selections[lineId] ?? {});
      stopSpeaking();
      setPlayingAll(false);
      setPlayingLineId(lineId);
      try {
        await speak(text, dialogue.language, settings.ttsMode, settings.voicePreference);
      } finally {
        setPlayingLineId((cur) => (cur === lineId ? null : cur));
      }
    },
    [dialogue, selections, settings.ttsMode, settings.voicePreference]
  );

  const playAll = useCallback(async () => {
    if (!dialogue) return;
    const items = dialogue.lines.map((line) => ({
      text: renderedLineText(line, selections[line.id] ?? {}),
      onStart: () => setPlayingLineId(line.id),
      onEnd: () => setPlayingLineId((cur) => (cur === line.id ? null : cur)),
    }));
    setPlayingAll(true);
    try {
      await speakSequence(items, dialogue.language, settings.ttsMode, settings.voicePreference);
    } finally {
      setPlayingAll(false);
      setPlayingLineId(null);
    }
  }, [dialogue, selections, settings.ttsMode, settings.voicePreference]);

  // Auto-play once after generation if enabled
  useEffect(() => {
    if (!dialogue) return;
    if (!settings.autoPlay) return;
    if (autoPlayedFor.current === dialogue.id) return;
    autoPlayedFor.current = dialogue.id;
    void playAll();
  }, [dialogue, settings.autoPlay, playAll]);

  const handleSelectSlot = useCallback((lineId: string, slotIndex: number, value: number) => {
    setSelections((prev) => {
      const lineSel = { ...(prev[lineId] ?? {}) };
      if (value === -1) {
        delete lineSel[slotIndex];
      } else {
        lineSel[slotIndex] = value;
      }
      const next = { ...prev };
      if (Object.keys(lineSel).length === 0) {
        delete next[lineId];
      } else {
        next[lineId] = lineSel;
      }
      return next;
    });
    setEvaluations((prev) => {
      if (!(lineId in prev)) return prev;
      const { [lineId]: _drop, ...rest } = prev;
      return rest;
    });
  }, []);

  const resetSelections = useCallback(() => {
    setSelections({});
    setEvaluations({});
  }, []);

  const speakerColorMap = useMemo(() => {
    if (!dialogue) return new Map<string, boolean>();
    const map = new Map<string, boolean>();
    speakers.forEach((s, i) => map.set(s, i % 2 === 1));
    return map;
  }, [dialogue, speakers]);

  const loadFromHistory = (d: Dialogue) => {
    stopSpeaking();
    if (recHandleRef.current) recHandleRef.current.stop();
    setPlayingAll(false);
    setPlayingLineId(null);
    autoPlayedFor.current = d.id;
    setDialogue(d);
    setSituation(d.situation);
    setLanguage(d.language);
    setSelections({});
  };

  // --- recording / evaluation ---

  const stopAnyRecording = useCallback(() => {
    if (recHandleRef.current) {
      recHandleRef.current.stop();
      recHandleRef.current = null;
    }
    const id = activeRecLineRef.current;
    activeRecLineRef.current = null;
    if (id) {
      setRecState((prev) => ({ ...prev, [id]: 'idle' }));
    }
  }, []);

  const runEvaluation = useCallback(
    async (lineId: string, transcript: string) => {
      if (!dialogue) return;
      const line = dialogue.lines.find((l) => l.id === lineId);
      if (!line) return;
      const expected = renderedLineText(line, selections[lineId] ?? {});
      setRecState((prev) => ({ ...prev, [lineId]: 'processing' }));
      try {
        const result = await evaluatePronunciation({
          language: dialogue.language,
          speaker: line.speaker,
          expected,
          expectedTranslation: line.translation,
          transcript,
          situation: dialogue.situation,
        });
        setEvaluations((prev) => ({ ...prev, [lineId]: result }));
      } catch (err) {
        setRecErrors((prev) => ({
          ...prev,
          [lineId]: err instanceof Error ? err.message : '評価に失敗しました。',
        }));
      } finally {
        setRecState((prev) => ({ ...prev, [lineId]: 'idle' }));
      }
    },
    [dialogue, selections]
  );

  const startRecord = useCallback(
    (lineId: string) => {
      if (!dialogue) return;
      if (!sttOk) {
        setRecErrors((prev) => ({
          ...prev,
          [lineId]: 'このブラウザは音声認識に対応していません（Chrome / Edge を推奨）。',
        }));
        return;
      }
      stopAnyRecording();
      stopSpeaking();
      setPlayingAll(false);
      setPlayingLineId(null);
      setRecErrors((prev) => {
        if (!(lineId in prev)) return prev;
        const { [lineId]: _drop, ...rest } = prev;
        return rest;
      });
      setEvaluations((prev) => {
        if (!(lineId in prev)) return prev;
        const { [lineId]: _drop, ...rest } = prev;
        return rest;
      });
      setRecState((prev) => ({ ...prev, [lineId]: 'listening' }));
      activeRecLineRef.current = lineId;
      const handle = startRecognition({
        lang: dialogue.language,
        onResult: (transcript) => {
          activeRecLineRef.current = null;
          recHandleRef.current = null;
          void runEvaluation(lineId, transcript);
        },
        onError: (err) => {
          setRecErrors((prev) => ({ ...prev, [lineId]: err.message }));
        },
        onEnd: () => {
          setRecState((prev) => {
            const cur = prev[lineId];
            if (cur === 'listening') return { ...prev, [lineId]: 'idle' };
            return prev;
          });
        },
      });
      recHandleRef.current = handle;
    },
    [dialogue, sttOk, stopAnyRecording, runEvaluation]
  );

  // --- guided practice flow ---

  const startPractice = useCallback(() => {
    if (!dialogue) return;
    if (!selfSpeaker) {
      setError('練習する役を選んでください。');
      return;
    }
    setError(null);
    stopAnyRecording();
    stopSpeaking();
    setPlayingAll(false);
    setPlayingLineId(null);
    setPracticing(true);
    setActiveLineIdx(0);
  }, [dialogue, selfSpeaker, stopAnyRecording]);

  const stopPractice = useCallback(() => {
    stopAnyRecording();
    stopSpeaking();
    setPracticing(false);
    setActiveLineIdx(null);
  }, [stopAnyRecording]);

  const advancePractice = useCallback(() => {
    setActiveLineIdx((cur) => {
      if (cur === null || !dialogue) return null;
      const next = cur + 1;
      if (next >= dialogue.lines.length) {
        setPracticing(false);
        return null;
      }
      return next;
    });
  }, [dialogue]);

  // Drive the guided practice loop: play AI lines automatically.
  useEffect(() => {
    if (!practicing || !dialogue || activeLineIdx === null) return;
    const line = dialogue.lines[activeLineIdx];
    if (!line) return;
    if (userOwnsLine(line.speaker)) return; // wait for user

    let cancelled = false;
    const text = renderedLineText(line, selections[line.id] ?? {});
    setPlayingLineId(line.id);
    (async () => {
      try {
        await speak(text, dialogue.language, settings.ttsMode, settings.voicePreference);
      } catch {
        /* ignore */
      }
      setPlayingLineId((cur) => (cur === line.id ? null : cur));
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      advancePractice();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    practicing,
    activeLineIdx,
    dialogue,
    selections,
    userOwnsLine,
    settings.ttsMode,
    settings.voicePreference,
    advancePractice,
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-sky-500 to-pink-500 text-white p-5 shadow-md">
        <h1 className="text-xl font-bold">TalkSim — 会話生成・語彙入れ替え・発音練習</h1>
        <p className="text-sm opacity-90 mt-1">
          言語を選び日本語でシチュエーションを入力すると、会話文と語彙入れ替え候補が生成されます。役を選んでマイクボタンを押すと、発音や応答内容をAIが評価します。
        </p>
      </section>

      {!hasKey && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">🔑 APIキーが未設定です。</span>{' '}
          <Link to="/settings" className="underline hover:text-amber-700">
            設定ページ
          </Link>{' '}
          で Gemini APIキーを登録してください。
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">1. 学ぶ言語を選ぶ</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(LANGUAGES) as TargetLanguage[]).map((k) => (
              <button
                key={k}
                onClick={() => setLanguage(k)}
                className={`rounded-lg border-2 px-3 py-2 text-left transition ${
                  language === k
                    ? 'border-sky-500 bg-sky-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="text-sm font-semibold">{LANGUAGES[k].label}</div>
                <div className="text-[11px] text-slate-500">{LANGUAGES[k].nativeName}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-600 mb-1.5">
            2. シチュエーションを日本語で入力
          </div>
          <textarea
            rows={3}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="例：カフェで店員さんにラテを注文する。ミルクの種類と砂糖の有無を聞かれる想定。"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <details className="text-xs text-slate-600 mt-1">
            <summary className="cursor-pointer hover:text-slate-900">例文を見る</summary>
            <ul className="mt-2 space-y-1">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => setSituation(ex)}
                    className="text-left text-sky-700 hover:underline"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="flex items-center gap-2 justify-end">
          {error && <span className="text-xs text-red-600 mr-auto">{error}</span>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !situation.trim()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '生成中…' : dialogue ? '別の会話を生成' : '会話を生成'}
          </button>
        </div>
      </section>

      {dialogue && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <header className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                {LANGUAGES[dialogue.language].label}・{dialogue.lines.length}行
              </div>
              <h2 className="font-bold truncate">{dialogue.title}</h2>
              <p className="text-xs text-slate-500 truncate">{dialogue.situation}</p>
            </div>
            <div className="flex gap-2">
              {playingAll || playingLineId ? (
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    setPlayingAll(false);
                    setPlayingLineId(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  ■ 停止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void playAll()}
                  disabled={practicing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  ▶ すべて再生
                </button>
              )}
              <button
                type="button"
                onClick={resetSelections}
                disabled={Object.keys(selections).length === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
              >
                入れ替えをリセット
              </button>
            </div>
          </header>

          {/* Role + Practice control */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-700 mr-1">あなたの役：</span>
              {speakers.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (practicing) return;
                    setSelfSpeaker(s);
                  }}
                  disabled={practicing}
                  className={`text-xs px-2.5 py-1 rounded-full border transition ${
                    selfSpeaker === s
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                  } ${practicing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {selfSpeaker === s ? '● ' : ''}
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (practicing) return;
                  setSelfSpeaker(null);
                }}
                disabled={practicing}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  selfSpeaker === null
                    ? 'border-slate-700 bg-slate-200 text-slate-900 font-semibold'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                } ${practicing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                聞くだけ
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-[11px] text-slate-600">
                {selfSpeaker
                  ? `あなたは「${selfSpeaker}」役。あなたのセリフには🎤録音ボタンが表示され、発音と応答内容をAIが評価します。`
                  : '聞くだけモード。録音ボタンは表示されません。'}
              </p>
              {practicing ? (
                <button
                  type="button"
                  onClick={stopPractice}
                  className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                >
                  ■ 練習を停止
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startPractice}
                  disabled={!selfSpeaker}
                  className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  title={selfSpeaker ? 'ガイド付き練習を開始' : 'まず役を選んでください'}
                >
                  🎙 ロールプレイ練習を開始
                </button>
              )}
            </div>
            {!sttOk && selfSpeaker && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠ このブラウザは音声認識に対応していません。発音評価は Chrome / Edge でご利用ください。
              </div>
            )}
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">使い方：</span>{' '}
            色付きのボタンは入れ替え可能な語彙です。クリックで候補一覧から差し替えられ、再生時にも反映されます。あなたの役のセリフでは「🎤 録音」を押して音読すると、AIが発音と内容をチェックし、間違いがあれば日本語で指摘します。
          </div>

          <div className="space-y-2">
            {dialogue.lines.map((line, i) => (
              <DialogueLineCard
                key={line.id}
                line={line}
                index={i}
                selections={selections[line.id] ?? {}}
                onSelect={(slotIndex, value) => handleSelectSlot(line.id, slotIndex, value)}
                onSpeak={() => void playLine(line.id)}
                isPlaying={playingLineId === line.id}
                alignRight={speakerColorMap.get(line.speaker) ?? false}
                isUser={userOwnsLine(line.speaker)}
                isActive={practicing && activeLineIdx === i}
                recordState={recState[line.id] ?? 'idle'}
                evalResult={evaluations[line.id] ?? null}
                recError={recErrors[line.id] ?? null}
                onStartRecord={() => startRecord(line.id)}
                onStopRecord={stopAnyRecording}
                onRetryRecord={() => startRecord(line.id)}
                onClearEval={() =>
                  setEvaluations((prev) => {
                    if (!(line.id in prev)) return prev;
                    const { [line.id]: _d, ...rest } = prev;
                    return rest;
                  })
                }
                onAdvance={
                  practicing && activeLineIdx === i && userOwnsLine(line.speaker)
                    ? advancePractice
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {dialogues.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="font-semibold text-sm">最近生成した会話</h2>
          <ul className="space-y-1.5">
            {dialogues.slice(0, 8).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => loadFromHistory(d)}
                  className="w-full text-left rounded-lg border border-slate-200 hover:border-sky-400 hover:bg-sky-50 px-3 py-2 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {LANGUAGES[d.language].label}
                    </span>
                    <span className="text-sm font-medium truncate">{d.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{d.situation}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
