import { useState } from 'react';
import { useApp } from '../store/AppContext';
import type { TtsMode } from '../types';

const COOLDOWN_HOURS = 24;

export function SettingsPage() {
  const { settings, setSettings, clearAll } = useApp();
  const [reveal, setReveal] = useState<boolean[]>([false, false, false]);

  const updateKey = (index: number, key: string) => {
    const next = { ...settings, apiKeys: settings.apiKeys.map((k, i) => (i === index ? { ...k, key } : k)) };
    setSettings(next);
  };

  const clearExhausted = (index: number) => {
    const next = {
      ...settings,
      apiKeys: settings.apiKeys.map((k, i) => (i === index ? { ...k, exhaustedAt: undefined } : k)),
    };
    setSettings(next);
  };

  const setTtsMode = (mode: TtsMode) => setSettings({ ...settings, ttsMode: mode });
  const setAutoPlay = (autoPlay: boolean) => setSettings({ ...settings, autoPlay });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">🔑 Gemini APIキー（最大3つ）</h2>
        <p className="text-xs text-slate-600">
          以前のバージョンで登録したAPIキーはそのまま使えます。無料枠の使用上限に達した場合、未使用の他キーへ自動で切り替わります。キーはこのブラウザにのみ保存され、サーバには送信されません。
          <br />
          取得：
          <a
            className="text-sky-700 underline"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Google AI Studio
          </a>
        </p>
        <div className="space-y-2">
          {settings.apiKeys.map((state, i) => {
            const cooldownRemaining = state.exhaustedAt
              ? Math.max(0, COOLDOWN_HOURS - (Date.now() - state.exhaustedAt) / (1000 * 60 * 60))
              : 0;
            return (
              <div key={i} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">キー {i + 1}</div>
                  {state.exhaustedAt && cooldownRemaining > 0 && (
                    <button
                      onClick={() => clearExhausted(i)}
                      className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-900 hover:bg-amber-200"
                      title="クールダウンを手動で解除"
                    >
                      上限まで約 {cooldownRemaining.toFixed(1)}h（解除）
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type={reveal[i] ? 'text' : 'password'}
                    value={state.key}
                    onChange={(e) => updateKey(i, e.target.value)}
                    placeholder="AIza..."
                    className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={() => setReveal((r) => r.map((v, j) => (j === i ? !v : v)))}
                    className="text-xs px-2 rounded bg-slate-100 hover:bg-slate-200"
                  >
                    {reveal[i] ? '隠す' : '表示'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">🔊 音声合成（TTS）</h2>
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="tts"
              checked={settings.ttsMode === 'browser'}
              onChange={() => setTtsMode('browser')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium">ブラウザ標準TTS</div>
              <div className="text-xs text-slate-600">
                APIクォータを消費しません。品質はOS・ブラウザに依存します。
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="radio"
              name="tts"
              checked={settings.ttsMode === 'gemini'}
              onChange={() => setTtsMode('gemini')}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-medium">Gemini TTS（高品質）</div>
              <div className="text-xs text-slate-600">
                自然な音声。APIクォータを消費します。失敗時はブラウザTTSにフォールバックします。
              </div>
            </div>
          </label>
        </div>
        <label className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="checkbox"
            checked={settings.autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
          />
          <span className="text-sm">会話生成後に自動で音声を再生する</span>
        </label>
      </section>

      <section className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
        <h2 className="font-semibold text-red-900">⚠ データ管理</h2>
        <p className="text-xs text-red-900">
          全てのAPIキー・生成済み会話の履歴を削除します。元に戻せません。
        </p>
        <button
          onClick={() => {
            if (confirm('全データを削除しますか？元に戻せません。')) clearAll();
          }}
          className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700"
        >
          全データを削除
        </button>
      </section>
    </div>
  );
}
