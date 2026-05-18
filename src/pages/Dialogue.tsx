import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { LANGUAGES, type Dialogue, type SlotSelections, type TargetLanguage } from '../types';
import { generateDialogue } from '../lib/gemini';
import { speak, speakSequence, stopSpeaking } from '../lib/tts';
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

  const hasKey = hasAnyKey();

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

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
  }, []);

  const resetSelections = useCallback(() => {
    setSelections({});
  }, []);

  const speakerColorMap = useMemo(() => {
    if (!dialogue) return new Map<string, boolean>();
    const speakers = Array.from(new Set(dialogue.lines.map((l) => l.speaker)));
    const map = new Map<string, boolean>();
    speakers.forEach((s, i) => map.set(s, i % 2 === 1));
    return map;
  }, [dialogue]);

  const loadFromHistory = (d: Dialogue) => {
    stopSpeaking();
    setPlayingAll(false);
    setPlayingLineId(null);
    autoPlayedFor.current = d.id;
    setDialogue(d);
    setSituation(d.situation);
    setLanguage(d.language);
    setSelections({});
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-br from-sky-500 to-pink-500 text-white p-5 shadow-md">
        <h1 className="text-xl font-bold">TalkSim — 会話生成と語彙入れ替え練習</h1>
        <p className="text-sm opacity-90 mt-1">
          言語を選んでシチュエーションを日本語で入力すると、その場面で使える会話文と、定型文の語彙入れ替え候補をAIが生成します。
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
                  className="text-xs px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
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

          <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">使い方：</span>{' '}
            色付きのボタン部分が入れ替え可能な語彙です。クリックすると候補一覧から別の表現に差し替えられます。差し替えた状態で「再生」を押すと、新しい文として音声が流れます。
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
