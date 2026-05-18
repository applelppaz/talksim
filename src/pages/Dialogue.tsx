import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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
  'Meeting a new coworker for the first time. Small talk about hometowns and hobbies.',
  'Ordering at a restaurant and asking about food allergies.',
  'A job interview at a tech company. Discussing past projects and salary expectations.',
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
      if (recHandleRef.current) recHandleRef.current.cancel();
    };
  }, []);

  // Persist difficulty as user's last-used preference
  const setDifficulty = useCallback(
    (d: Difficulty) => {
      setDifficultyLocal(d);
      if (settings.difficulty !== d) setSettings({ ...settings, difficulty: d });
    },
    [settings, setSettings]
  );

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
      setError('Please enter a situation.');
      return;
    }
    if (!hasAnyKey()) {
      setError('No Gemini API key is set. Register one in Settings.');
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
      setError(err instanceof Error ? err.message : 'Failed to generate dialogue.');
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

  // --- recording / evaluation ---

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
          [lineId]: 'Speech recognition is not available in this browser (Chrome or Edge recommended).',
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
      setError('Pick a role to practice as.');
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
      {!hasKey && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          No API key set.{' '}
          <Link to="/settings" className="underline hover:text-amber-700">
            Open Settings
          </Link>{' '}
          to register a Gemini API key.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(DIFFICULTIES) as Difficulty[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDifficulty(k)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                difficulty === k
                  ? 'border-violet-500 bg-violet-50'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
              title={DIFFICULTIES[k].hint}
            >
              <div className="text-sm font-semibold">{DIFFICULTIES[k].label}</div>
              <div className="text-[11px] text-slate-500 line-clamp-2">{DIFFICULTIES[k].hint}</div>
            </button>
          ))}
        </div>

        <textarea
          rows={3}
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="Describe the situation in English…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <details className="text-xs text-slate-600">
          <summary className="cursor-pointer hover:text-slate-900">Examples</summary>
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

        <div className="flex items-center gap-2 justify-end">
          {error && <span className="text-xs text-red-600 mr-auto">{error}</span>}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !situation.trim()}
            className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {loading ? 'Generating…' : dialogue ? 'Generate again' : 'Generate'}
          </button>
        </div>
      </section>

      {dialogue && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <header className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500">
                {LANGUAGES[dialogue.language].label} · {DIFFICULTIES[dialogue.difficulty].label} ·{' '}
                {dialogue.lines.length} lines
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
                  ■ Stop
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void playAll()}
                  disabled={practicing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50"
                >
                  ▶ Play all
                </button>
              )}
              <button
                type="button"
                onClick={resetSelections}
                disabled={Object.keys(selections).length === 0}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
              >
                Reset swaps
              </button>
            </div>
          </header>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-700 mr-1">Your role:</span>
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
                Listen only
              </button>
              <div className="ml-auto">
                {practicing ? (
                  <button
                    type="button"
                    onClick={stopPractice}
                    className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                  >
                    ■ Stop practice
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startPractice}
                    disabled={!selfSpeaker}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    🎙 Start role-play
                  </button>
                )}
              </div>
            </div>
            {!sttOk && selfSpeaker && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Speech recognition is unavailable in this browser. Use Chrome or Edge for pronunciation feedback.
              </div>
            )}
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
          <h2 className="font-semibold text-sm">Recent dialogues</h2>
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">
                      {DIFFICULTIES[d.difficulty].label}
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
