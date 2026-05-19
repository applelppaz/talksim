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
