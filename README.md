# TalkSim — 多言語会話練習アプリ

英語・中国語・スペイン語・フランス語の会話練習とリスニング力向上を目的とした、Gemini API を使った日本語UIのWebアプリです。

## 主な機能

### 1. 対話シミュレーションの設定
- **(a)** シチュエーションを日本語で自由記述
- **(b)** 練習する言語を選択（English / 中文 / Español / Français）
- **(c)** AIが日本語で会話の流れ（アウトライン）を自動生成。確認・編集・再生成可

### 2. 会話中のサポート
- **(a)** AI発話の音声を**自動再生**（ブラウザ標準TTS or Gemini高品質TTSを選択可）
- **(b) 💡 ヘルプボタン**：「次に何と言えばいいか分からない」時に、その場面で使える例文＋日本語解説を表示
- **(c) ❓ 質問ボタン**：AIの発話に対して日本語で質問し、その場で解説を受けられる
- **(d) 添削**：ユーザーの発話に文法や自然さの問題があれば、日本語で即時指摘

### 3. 学習・管理
- **(a) 語彙ページ**：会話終了時にAIが重要表現を自動抽出。手動でフレーズを保存することも可能。フラッシュカードモード搭載
- **(b)** Gemini API（`gemini-2.5-flash`、`gemini-2.5-flash-preview-tts`）を利用
- **(c)** APIキーを **3つ登録**でき、無料枠の上限到達（429/RESOURCE_EXHAUSTED）時に**自動でローテーション**。24時間経過で自動復帰

## セットアップ

```bash
npm install
npm run dev
```

`http://localhost:5173` を開きます。

### APIキーの取得
1. [Google AI Studio](https://aistudio.google.com/apikey) で無料のGemini APIキーを作成
2. アプリの「設定」ページに最大3つまで貼り付けて保存
3. キーはブラウザの localStorage にのみ保存され、外部送信されません

## 動作環境

- Chrome / Edge を推奨（Web Speech APIによる音声認識・音声合成の対応が最も安定）
- マイク使用時はブラウザの許可が必要です
- 中国語の音声合成はOS依存。品質が気になる場合は設定で Gemini TTS に切り替えてください

## ビルド & デプロイ

```bash
npm run build      # dist/ を生成
npm run preview    # ローカルでビルド結果を確認
```

`netlify.toml` を同梱しています。Netlify にリポジトリを接続すれば、追加設定なしでデプロイ可能です（Vercel等でも同様に動作します）。

## 技術スタック

- Vite + React 18 + TypeScript
- Tailwind CSS
- React Router v6
- `@google/genai`（公式 Gemini SDK）
- Web Speech API（音声入力・標準音声合成）

## データの取り扱い

すべてのデータ（APIキー・会話履歴・語彙）は、お使いのブラウザの `localStorage` にのみ保存されます。サーバには一切送信されません。
