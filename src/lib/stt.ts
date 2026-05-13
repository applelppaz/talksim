import { LANGUAGES, type TargetLanguage } from '../types';

interface SpeechRecognitionResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionAlternativeList {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionResultItem;
  length: number;
}

interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function sttSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null;
}

export interface SttHandle {
  stop: () => void;
}

export interface SttCallbacks {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}

export function startListening(lang: TargetLanguage, cb: SttCallbacks): SttHandle {
  const Ctor = getCtor();
  if (!Ctor) {
    cb.onError?.('このブラウザは音声認識に対応していません。');
    return { stop: () => {} };
  }
  const rec = new Ctor();
  rec.lang = LANGUAGES[lang].bcp47;
  rec.continuous = false;
  rec.interimResults = true;

  let finalText = '';

  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const result = ev.results[i];
      const alts = result as unknown as SpeechRecognitionAlternativeList;
      const text = alts[0]?.transcript ?? '';
      if (result.isFinal) {
        finalText += text;
      } else {
        interim += text;
      }
    }
    if (interim) cb.onInterim?.(finalText + interim);
  };
  rec.onerror = (ev) => {
    cb.onError?.(ev.message || ev.error || '音声認識でエラーが発生しました。');
  };
  rec.onend = () => {
    if (finalText.trim()) cb.onFinal(finalText.trim());
    cb.onEnd?.();
  };

  try {
    rec.start();
  } catch (err) {
    cb.onError?.(err instanceof Error ? err.message : '音声認識を開始できませんでした。');
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
