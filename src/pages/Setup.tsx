import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { LANGUAGES, type TargetLanguage, type ConversationSession } from '../types';
import { generateOutline } from '../lib/gemini';
import { uid } from '../lib/storage';
import { hasAnyKey } from '../lib/apiKeyManager';

const EXAMPLES = [
  'カフェでコーヒーを注文する。バリスタとサイズや甘さの相談をする。',
  '空港のチェックインカウンターで荷物を預ける。座席を窓側に変更したい。',
  '友人とレストランの予約について電話で相談する。',
  '海外で道に迷った。通行人に最寄りの駅までの行き方を尋ねる。',
];

export function SetupPage() {
  const nav = useNavigate();
  const { setCurrentSession } = useApp();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [situation, setSituation] = useState('');
  const [language, setLanguage] = useState<TargetLanguage | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (lang: TargetLanguage) => {
    if (!hasAnyKey()) {
      setError('APIキーが未設定です。設定ページから登録してください。');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateOutline(situation.trim(), lang);
      setOutline(result);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const start = () => {
    if (!language) return;
    const session: ConversationSession = {
      id: uid(),
      language,
      situation: situation.trim(),
      outline,
      messages: [],
      startedAt: Date.now(),
    };
    setCurrentSession(session);
    nav('/conversation');
  };

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 1 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">ステップ1：シチュエーションを日本語で入力</h2>
          <p className="text-sm text-slate-600">
            どんな場面で会話したいですか？登場人物・場所・目的などを自由に書いてください。
          </p>
          <textarea
            rows={5}
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="例：カフェで店員さんにラテを注文する。ミルクの種類と砂糖の有無を聞かれる想定。"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer hover:text-slate-900">例文を見る</summary>
            <ul className="mt-2 space-y-1.5">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    onClick={() => setSituation(ex)}
                    className="text-left text-sky-700 hover:underline"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!situation.trim()}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
            >
              次へ：言語を選ぶ
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">ステップ2：練習する言語を選択</h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(LANGUAGES) as TargetLanguage[]).map((k) => (
              <button
                key={k}
                onClick={() => {
                  setLanguage(k);
                  void generate(k);
                }}
                disabled={loading}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  language === k ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-400'
                } disabled:opacity-50`}
              >
                <div className="text-lg font-semibold">{LANGUAGES[k].label}</div>
                <div className="text-xs text-slate-600 mt-0.5">{LANGUAGES[k].nativeName}</div>
              </button>
            ))}
          </div>
          {loading && <div className="text-sm text-slate-600">AIが会話の流れを作成中…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              ← 戻る
            </button>
          </div>
        </section>
      )}

      {step === 3 && language && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <h2 className="font-semibold">ステップ3：会話の流れを確認</h2>
          <p className="text-sm text-slate-600">
            {LANGUAGES[language].label}で以下の流れに沿って会話します。必要なら編集できます。
          </p>
          <ol className="space-y-2">
            {outline.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <input
                  value={step}
                  onChange={(e) => {
                    const next = [...outline];
                    next[i] = e.target.value;
                    setOutline(next);
                  }}
                  className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
                <button
                  onClick={() => setOutline(outline.filter((_, j) => j !== i))}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  削除
                </button>
              </li>
            ))}
          </ol>
          <div className="flex gap-2">
            <button
              onClick={() => setOutline([...outline, ''])}
              className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200"
            >
              + ステップを追加
            </button>
            <button
              onClick={() => language && generate(language)}
              disabled={loading}
              className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
            >
              {loading ? '生成中…' : '再生成'}
            </button>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              ← 戻る
            </button>
            <button
              onClick={start}
              disabled={outline.filter((s) => s.trim()).length === 0}
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium disabled:opacity-50"
            >
              会話を開始 →
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['シチュエーション', '言語', '流れ'];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {labels.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                active ? 'bg-sky-600 text-white' : done ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {n}
            </span>
            <span className={active ? 'font-semibold' : 'text-slate-500'}>{label}</span>
            {i < labels.length - 1 && <span className="text-slate-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}
