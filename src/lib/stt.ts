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
  /** Finish gracefully — use a final result if speech was detected. */
  stop: () => void;
  /** Cancel without surfacing an error to the caller. */
  cancel: () => void;
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
    onError(new Error('Speech recognition is not available in this browser. Chrome or Edge is recommended.'));
    onEnd();
    return { stop: () => {}, cancel: () => {} };
  }
  const rec = new Ctor();
  rec.lang = LANGUAGES[lang].bcp47;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  let finished = false;
  let cancelled = false;
  const finishOk = (text: string) => {
    if (finished || cancelled) return;
    finished = true;
    onResult(text);
  };
  const finishErr = (err: Error) => {
    if (finished || cancelled) return;
    finished = true;
    onError(err);
  };

  rec.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript ?? '';
    if (text.trim().length > 0) finishOk(text);
  };
  rec.onerror = (e) => {
    const code = e?.error ?? 'unknown';
    if (code === 'aborted') {
      finished = true;
      return;
    }
    const map: Record<string, string> = {
      'not-allowed': 'Microphone access denied. Allow it from the icon in your browser address bar.',
      'service-not-allowed': 'Speech recognition is unavailable in this browser.',
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Check your device settings.',
      'network': 'Network error while recognizing speech.',
    };
    finishErr(new Error(map[code] ?? `Speech recognition error (${code}).`));
  };
  rec.onend = () => {
    if (!finished && !cancelled) {
      finishErr(new Error('Could not recognize your speech. Try speaking clearly near the microphone.'));
    }
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
    cancel: () => {
      cancelled = true;
      try {
        rec.abort();
      } catch {
        /* noop */
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Chat-mode helper: continuous voice input with interim results.
// ---------------------------------------------------------------------------

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rec.onresult = (ev: any) => {
    let interim = '';
    for (let i = ev.resultIndex ?? 0; i < ev.results.length; i += 1) {
      const result = ev.results[i];
      const alts = result as unknown as ArrayLike<{ transcript?: string }>;
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
    cb.onError?.(ev?.message || ev?.error || '音声認識でエラーが発生しました。');
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
