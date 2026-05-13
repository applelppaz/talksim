import { LANGUAGES, type TargetLanguage, type TtsMode } from '../types';
import { geminiTts } from './gemini';

let currentUtter: SpeechSynthesisUtterance | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error('このブラウザはAudioContextをサポートしていません。');
    audioCtx = new Ctor();
  }
  return audioCtx;
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  currentUtter = null;
  if (currentSource) {
    try {
      currentSource.stop();
    } catch {
      /* noop */
    }
    currentSource = null;
  }
}

export function browserTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

async function speakBrowser(text: string, lang: TargetLanguage, preferredVoice?: string): Promise<void> {
  if (!browserTtsSupported()) {
    throw new Error('このブラウザは音声合成（TTS）に対応していません。');
  }
  stopSpeaking();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = LANGUAGES[lang].bcp47;
  utter.rate = 1;
  utter.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang === utter.lang && (!preferredVoice || v.name === preferredVoice));
  if (match) utter.voice = match;
  currentUtter = utter;
  return new Promise<void>((resolve) => {
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function parseGeminiPcmMime(mime: string): { sampleRate: number; channels: number } {
  // Gemini TTS returns something like "audio/L16;rate=24000" (16-bit signed PCM).
  let sampleRate = 24000;
  let channels = 1;
  const parts = mime.split(';').map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith('rate=')) sampleRate = parseInt(p.slice(5), 10) || sampleRate;
    if (p.startsWith('channels=')) channels = parseInt(p.slice(9), 10) || channels;
  }
  return { sampleRate, channels };
}

async function speakGemini(text: string): Promise<void> {
  const { data, mimeType } = await geminiTts(text);
  const bytes = base64ToBytes(data);
  const ctx = getAudioContext();
  const lowerMime = mimeType.toLowerCase();

  let audioBuffer: AudioBuffer;
  if (lowerMime.includes('pcm') || lowerMime.includes('l16')) {
    const { sampleRate, channels } = parseGeminiPcmMime(mimeType);
    const samples = bytes.length / 2;
    const buf = ctx.createBuffer(channels, samples / channels, sampleRate);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let c = 0; c < channels; c += 1) {
      const channelData = buf.getChannelData(c);
      for (let i = 0; i < channelData.length; i += 1) {
        const sample = view.getInt16((i * channels + c) * 2, true);
        channelData[i] = sample / 32768;
      }
    }
    audioBuffer = buf;
  } else {
    audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  }

  stopSpeaking();
  const src = ctx.createBufferSource();
  src.buffer = audioBuffer;
  src.connect(ctx.destination);
  currentSource = src;
  await new Promise<void>((resolve) => {
    src.onended = () => resolve();
    src.start();
  });
}

export async function speak(
  text: string,
  lang: TargetLanguage,
  mode: TtsMode,
  preferredVoice?: string
): Promise<void> {
  if (!text.trim()) return;
  if (mode === 'gemini') {
    try {
      await speakGemini(text);
      return;
    } catch (err) {
      console.warn('Gemini TTS failed, falling back to browser TTS', err);
    }
  }
  await speakBrowser(text, lang, preferredVoice);
}
