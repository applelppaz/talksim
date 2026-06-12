import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  KeyRound,
  Languages,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  StopCircle,
  Wand2,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import {
  DIFFICULTIES,
  LANGUAGES,
  type Difficulty,
  type Dialogue,
  type PronunciationEval,
  type SlotSelections,
  type TargetLanguage,
} from '../types';
import { evaluatePronunciation, generateDialogue } from '../lib/gemini';
import { speak, speakSequence, stopSpeaking } from '../lib/tts';
import { startRecognition, sttSupported, type RecognitionHandle } from '../lib/stt';
import { hasAnyKey } from '../lib/apiKeyManager';
import { DialogueLineCard, renderedLineText } from '../components/DialogueLineCard';

const EXAMPLES = [
  'Ordering coffee at a café. The barista asks about size and sweetness.',
  'Checking in luggage at an airport counter. You want a window seat.',
  'Checking in at a hotel front desk. Asking about Wi-Fi and breakfast hours.',
  'Lost in a foreign city. Asking a passerby for the way to the nearest station.',
  'Meeting a new coworker. Small talk about hometowns and hobbies.',
  'Ordering at a restaurant and asking about food allergies.',
  'A job interview at a tech company. Discussing past projects and salary.',
  'Negotiating the price of a used car with a private seller.',
];

type RecState = 'idle' | 'listening' | 'processing';

export function DialoguePage() {
  const { settings, setSettings, dialogues, addDialogue } = useApp();
  const [language, setLanguage] = useState<TargetLanguage>('en');
  const [difficulty, setDifficultyLocal] = useState<Difficulty>(settings.difficulty);
  const [situation, setSituation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [selections, setSelections] = useState<SlotSelections>({});
  const [playingLineId, setPlayingLineId] = useState<string | null>(null);
  const [playingAll, setPlayingAll] = useState(false);
  const autoPlayedFor = useRef<string | null>(null);

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
      if (recHandleRef.current) recHandleRef.current.cancel();
    };
  }, []);

  const setDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficultyLocal(d);
      if (settings.difficulty !== d) setSettings({ ...settings, difficulty: d });
    },
    [settings, setSettings]
  );

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
      setError('Enter a situation first.');
      return;
    }
    if (!hasAnyKey()) {
      setError('Add a Gemini API key in Settings first.');
      return;
    }
    setError(null);
    setLoading(true);
    stopSpeaking();
    if (recHandleRef.current) recHandleRef.current.cancel();
    setPlayingAll(false);
    setPlayingLineId(null);
    try {
      const result = await generateDialogue(situation.trim(), language, difficulty);
      setDialogue(result);
      setSelections({});
      addDialogue(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }, [situation, language, difficulty, addDialogue]);

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
    if (recHandleRef.current) recHandleRef.current.cancel();
    setPlayingAll(false);
    setPlayingLineId(null);
    autoPlayedFor.current = d.id;
    setDialogue(d);
    setSituation(d.situation);
    setLanguage(d.language);
    setDifficulty(d.difficulty);
    setSelections({});
  };

  const stopAnyRecording = useCallback(() => {
    if (recHandleRef.current) {
      recHandleRef.current.cancel();
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
          [lineId]: err instanceof Error ? err.message : 'Evaluation failed.',
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
          [lineId]: 'Speech recognition is unavailable in this browser (use Chrome or Edge).',
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

  const startPractice = useCallback(() => {
    if (!dialogue) return;
    if (!selfSpeaker) {
      setError('Pick a role first.');
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

  useEffect(() => {
    if (!practicing || !dialogue || activeLineIdx === null) return;
    const line = dialogue.lines[activeLineIdx];
    if (!line) return;
    if (userOwnsLine(line.speaker)) return;

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
    <div className="space-y-4">
      {!hasKey && (
        <Glass className="flex items-center gap-2 text-sm text-amber-900 bg-amber-50/70 border-amber-200/70">
          <KeyRound size={16} className="text-amber-700" />
          <span>
            No API key set.{' '}
            <Link to="/settings" className="underline">
              Open Settings
            </Link>
          </span>
        </Glass>
      )}

      <Glass>
        <SectionLabel icon={<Languages size={14} />}>Language</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          {(Object.keys(LANGUAGES) as TargetLanguage[]).map((k) => (
            <button
              key={k}
              onClick={() => setLanguage(k)}
              className={`px-2 py-1.5 rounded-xl text-xs font-medium transition border ${
                language === k
                  ? 'bg-slate-900 text-white border-slate-900 shadow'
                  : 'bg-white/60 text-slate-700 border-white/60 hover:bg-white/80'
              }`}
            >
              <div className="leading-none">{LANGUAGES[k].label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{LANGUAGES[k].nativeName}</div>
            </button>
          ))}
        </div>

        <SectionLabel icon={<Sparkles size={14} />} className="mt-3">Difficulty</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDifficulty(k)}
              title={DIFFICULTIES[k].hint}
              className={`px-2 py-1.5 rounded-xl text-xs font-medium transition border ${
                difficulty === k
                  ? 'bg-violet-600 text-white border-violet-600 shadow'
                  : 'bg-white/60 text-slate-700 border-white/60 hover:bg-white/80'
              }`}
            >
              {DIFFICULTIES[k].label}
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="Describe the situation in English…"
          className="mt-3 w-full rounded-2xl border border-white/60 bg-white/60 backdrop-blur px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 placeholder:text-slate-400"
        />
        <details className="text-xs text-slate-600 mt-1.5">
          <summary className="cursor-pointer hover:text-slate-900">Examples</summary>
          <ul className="mt-1.5 space-y-1">
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

        {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !situation.trim()}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 hover:brightness-110 text-white text-sm font-semibold disabled:opacity-50 shadow-lg shadow-sky-300/50"
        >
          {loading ? (
            <>
              <Wand2 size={18} className="animate-pulse" />
              Generating…
            </>
          ) : (
            <>
              <Wand2 size={18} />
              {dialogue ? 'Generate again' : 'Generate dialogue'}
            </>
          )}
        </button>
      </Glass>

      {dialogue && (
        <Glass>
          <header className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                {LANGUAGES[dialogue.language].label} · {DIFFICULTIES[dialogue.difficulty].label} ·{' '}
                {dialogue.lines.length} lines
              </div>
              <h2 className="font-bold truncate text-slate-900">{dialogue.title}</h2>
              <p className="text-xs text-slate-500 truncate">{dialogue.situation}</p>
            </div>
            <div className="flex gap-1.5">
              {playingAll || playingLineId ? (
                <IconChip
                  onClick={() => {
                    stopSpeaking();
                    setPlayingAll(false);
                    setPlayingLineId(null);
                  }}
                  tone="danger"
                  title="Stop"
                >
                  <Pause size={15} />
                </IconChip>
              ) : (
                <IconChip
                  onClick={() => void playAll()}
                  disabled={practicing}
                  tone="primary"
                  title="Play all"
                >
                  <Play size={15} />
                </IconChip>
              )}
              <IconChip
                onClick={resetSelections}
                disabled={Object.keys(selections).length === 0}
                title="Reset swaps"
              >
                <RotateCcw size={15} />
              </IconChip>
            </div>
          </header>

          <div className="mt-3 rounded-2xl border border-white/60 bg-white/45 backdrop-blur p-2.5">
            <div className="flex items-center flex-wrap gap-1.5">
              {speakers.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (practicing) return;
                    setSelfSpeaker(s);
                  }}
                  disabled={practicing}
                  className={`text-xs px-3 py-1 rounded-full border transition ${
                    selfSpeaker === s
                      ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 font-semibold'
                      : 'border-white/60 bg-white/60 text-slate-700 hover:bg-white/80'
                  } ${practicing ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
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
                className={`text-xs px-3 py-1 rounded-full border transition ${
                  selfSpeaker === null
                    ? 'border-slate-700 bg-slate-200 text-slate-900 font-semibold'
                    : 'border-white/60 bg-white/60 text-slate-700 hover:bg-white/80'
                } ${practicing ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                Listen only
              </button>

              <div className="ml-auto">
                {practicing ? (
                  <button
                    type="button"
                    onClick={stopPractice}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow"
                  >
                    <StopCircle size={14} />
                    Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startPractice}
                    disabled={!selfSpeaker}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 shadow"
                  >
                    <Mic size={14} />
                    Practice
                  </button>
                )}
              </div>
            </div>
            {!sttOk && selfSpeaker && (
              <div className="mt-1.5 text-[11px] text-amber-700">
                Speech recognition is unavailable in this browser. Use Chrome or Edge for feedback.
              </div>
            )}
          </div>

          <div className="mt-3 space-y-2">
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
        </Glass>
      )}

      {dialogues.length > 0 && (
        <Glass>
          <SectionLabel>Recent dialogues</SectionLabel>
          <ul className="mt-1.5 space-y-1.5">
            {dialogues.slice(0, 8).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => loadFromHistory(d)}
                  className="w-full text-left rounded-xl border border-white/60 bg-white/55 hover:bg-white/80 backdrop-blur-sm px-3 py-2 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-900/85 text-white">
                      {LANGUAGES[d.language].label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-800">
                      {DIFFICULTIES[d.difficulty].label}
                    </span>
                    <span className="text-sm font-medium truncate text-slate-900">{d.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{d.situation}</div>
                </button>
              </li>
            ))}
          </ul>
        </Glass>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small UI primitives used by this page.
// ---------------------------------------------------------------------------

function Glass({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-sm shadow-slate-900/5 p-4 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionLabel({
  children,
  icon,
  className = '',
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-slate-500 ${className}`}>
      {icon}
      {children}
    </div>
  );
}

function IconChip({
  children,
  onClick,
  disabled,
  title,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  tone?: 'neutral' | 'primary' | 'danger';
}) {
  const toneClass =
    tone === 'primary'
      ? 'bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50'
      : tone === 'danger'
      ? 'bg-rose-600 text-white hover:bg-rose-700'
      : 'bg-white/70 text-slate-700 hover:bg-white border border-white/60 disabled:opacity-50';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full shadow-sm ${toneClass}`}
    >
      {children}
    </button>
  );
}

