import { LANGUAGES, type TargetLanguage } from '../types';

type RecCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getCtor(): RecCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return getCtor() !== null;
}

export interface RecognitionHandle {
  stop: () => void;
}

export interface RecognitionOptions {
  lang: TargetLanguage;
  onResult: (transcript: string) => void;
  onError: (err: Error) => void;
  onEnd: () => void;
}

export function startRecognition({ lang, onResult, onError, onEnd }: RecognitionOptions): RecognitionHandle {
  const Ctor = getCtor();
  if (!Ctor) {
    onError(new Error('このブラウザは音声認識に対応していません。Chrome / Edge を推奨します。'));
    onEnd();
    return { stop: () => {} };
  }
  const rec = new Ctor();
  rec.lang = LANGUAGES[lang].bcp47;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  let finished = false;
  const finishOk = (text: string) => {
    if (finished) return;
    finished = true;
    onResult(text);
  };
  const finishErr = (err: Error) => {
    if (finished) return;
    finished = true;
    onError(err);
  };

  rec.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript ?? '';
    if (text.trim().length > 0) finishOk(text);
  };
  rec.onerror = (e) => {
    const code = e?.error ?? 'unknown';
    const map: Record<string, string> = {
      'not-allowed': 'マイクの使用が許可されていません。ブラウザのアドレスバー左のアイコンから許可してください。',
      'service-not-allowed': 'このブラウザでは音声認識サービスが利用できません。',
      'no-speech': '音声が検出できませんでした。もう一度話してみてください。',
      'audio-capture': 'マイクが見つかりませんでした。デバイス設定を確認してください。',
      'network': 'ネットワークエラーが発生しました。',
      'aborted': '',
    };
    if (code === 'aborted') {
      finished = true;
      return;
    }
    finishErr(new Error(map[code] ?? `音声認識エラー（${code}）`));
  };
  rec.onend = () => {
    if (!finished) finishErr(new Error('音声を認識できませんでした。マイクの近くで明瞭に話してください。'));
    onEnd();
  };

  try {
    rec.start();
  } catch (err) {
    onError(err instanceof Error ? err : new Error(String(err)));
    onEnd();
  }
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    },
  };
}
