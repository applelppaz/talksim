import { Link } from 'react-router-dom';
import { useApp } from '../../../store/AppContext';
import { hasAnyKey } from '../../../lib/apiKeyManager';
import { LANGUAGES } from '../../../types';

export function HomePage() {
  const { vocab, pastSessions, currentSession } = useApp();
  const hasKey = hasAnyKey();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-sky-500 to-pink-500 text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold">TalkSim</h1>
        <p className="text-sm opacity-90 mt-1">
          英語・中国語・スペイン語・フランス語を、リアルなシチュエーションで練習しよう。
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {currentSession ? (
            <Link
              to="/chat/conversation"
              className="px-4 py-2 rounded-lg bg-white text-slate-900 font-medium text-sm hover:bg-slate-100"
            >
              続きから会話する
            </Link>
          ) : null}
          <Link
            to="/chat/setup"
            className="px-4 py-2 rounded-lg bg-white text-slate-900 font-medium text-sm hover:bg-slate-100"
          >
            {currentSession ? '新しい会話を始める' : '会話を始める'}
          </Link>
        </div>
      </section>

      {!hasKey && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold mb-1">🔑 APIキーが未設定です</div>
          会話を始める前に、Gemini APIキーを登録してください。3つまで登録でき、上限に達したら自動で切り替わります。
          <div className="mt-2">
            <Link
              to="/settings"
              className="inline-block px-3 py-1.5 rounded bg-amber-700 text-white text-xs hover:bg-amber-800"
            >
              設定ページへ
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link to="/chat/vocab" className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow">
          <div className="text-xs text-slate-500">学習した語彙</div>
          <div className="text-2xl font-bold">{vocab.length}</div>
          <div className="text-xs text-slate-600 mt-1">語彙ページで復習する →</div>
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">完了した会話</div>
          <div className="text-2xl font-bold">{pastSessions.length}</div>
          <div className="text-xs text-slate-600 mt-1">セッション数</div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="font-semibold mb-2">対応言語</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(LANGUAGES).map(([k, v]) => (
            <span
              key={k}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700"
            >
              {v.label}（{v.nativeName}）
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
