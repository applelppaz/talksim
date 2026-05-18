import { GoogleGenAI } from '@google/genai';
import { withKeyRotation } from './apiKeyManager';
import type { Dialogue, DialogueLine, TargetLanguage } from '../types';
import { uid } from './storage';
import { DIALOGUE_PROMPT } from './prompts';

const CHAT_MODEL = 'gemini-2.5-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

function client(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

interface JsonGenOptions {
  prompt: string;
  model?: string;
}

async function generateJson<T>({ prompt, model = CHAT_MODEL }: JsonGenOptions): Promise<T> {
  return withKeyRotation(async (apiKey) => {
    const ai = client(apiKey);
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });
    const raw = response.text ?? '';
    return parseJsonLoose<T>(raw);
  });
}

function parseJsonLoose<T>(raw: string): T {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error(`AIからの応答をJSONとして解釈できませんでした: ${trimmed.slice(0, 120)}`);
  }
}

interface RawDialogue {
  title?: string;
  lines?: {
    speaker?: string;
    template?: string;
    translation?: string;
    slots?: {
      original?: string;
      translation?: string;
      alternatives?: { text?: string; translation?: string }[];
    }[];
  }[];
}

export async function generateDialogue(
  situation: string,
  language: TargetLanguage
): Promise<Dialogue> {
  const raw = await generateJson<RawDialogue>({
    prompt: DIALOGUE_PROMPT(situation, language),
  });

  const lines: DialogueLine[] = (raw.lines ?? []).map((line) => ({
    id: uid(),
    speaker: line.speaker?.trim() || '—',
    template: line.template ?? '',
    translation: line.translation ?? '',
    slots: (line.slots ?? []).map((slot) => ({
      original: slot.original ?? '',
      translation: slot.translation ?? '',
      alternatives: (slot.alternatives ?? [])
        .filter((alt) => (alt.text ?? '').trim().length > 0)
        .map((alt) => ({
          text: alt.text ?? '',
          translation: alt.translation ?? '',
        })),
    })),
  }));

  if (lines.length === 0) {
    throw new Error('AIが会話を生成できませんでした。シチュエーションを少し具体的にして再試行してください。');
  }

  return {
    id: uid(),
    language,
    situation: situation.trim(),
    title: raw.title?.trim() || situation.trim().slice(0, 24),
    lines,
    createdAt: Date.now(),
  };
}

export async function geminiTts(text: string): Promise<{ data: string; mimeType: string }> {
  return withKeyRotation(async (apiKey) => {
    const ai = client(apiKey);
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: text,
      config: {
        responseModalities: ['AUDIO'],
      },
    });
    const part = response.candidates?.[0]?.content?.parts?.[0];
    const inline = part?.inlineData;
    if (!inline?.data) {
      throw new Error('Gemini TTSから音声データを取得できませんでした。');
    }
    return { data: inline.data, mimeType: inline.mimeType ?? 'audio/pcm' };
  });
}
