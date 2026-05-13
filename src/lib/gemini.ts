import { GoogleGenAI } from '@google/genai';
import { withKeyRotation } from './apiKeyManager';
import type { Correction, Message, TargetLanguage, VocabEntry } from '../types';
import { uid } from './storage';
import {
  CHECK_PROMPT,
  FIRST_TURN_PROMPT,
  HELP_PROMPT,
  NEXT_TURN_PROMPT,
  OUTLINE_PROMPT,
  QUESTION_PROMPT,
  VOCAB_PROMPT,
} from './prompts';

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
        temperature: 0.7,
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

export async function generateOutline(
  situation: string,
  lang: TargetLanguage
): Promise<string[]> {
  const result = await generateJson<{ outline: string[] }>({
    prompt: OUTLINE_PROMPT(situation, lang),
  });
  return result.outline ?? [];
}

export interface AiTurnResult {
  text: string;
  translation: string;
}

export async function generateFirstTurn(
  situation: string,
  outline: string[],
  lang: TargetLanguage
): Promise<AiTurnResult> {
  return generateJson<AiTurnResult>({
    prompt: FIRST_TURN_PROMPT(situation, outline, lang),
  });
}

export async function generateNextTurn(
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
): Promise<AiTurnResult> {
  return generateJson<AiTurnResult>({
    prompt: NEXT_TURN_PROMPT(situation, outline, lang, history),
  });
}

export interface HelpResult {
  suggestions: { text: string; translation: string }[];
  explanation: string;
}

export async function getHelp(
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
): Promise<HelpResult> {
  return generateJson<HelpResult>({
    prompt: HELP_PROMPT(situation, outline, lang, history),
  });
}

export async function answerQuestion(
  lang: TargetLanguage,
  history: Message[],
  targetMessage: Message,
  question: string
): Promise<string> {
  const result = await generateJson<{ answer: string }>({
    prompt: QUESTION_PROMPT(lang, history, targetMessage, question),
  });
  return result.answer;
}

export async function checkResponse(
  lang: TargetLanguage,
  history: Message[],
  userText: string
): Promise<Correction> {
  return generateJson<Correction>({
    prompt: CHECK_PROMPT(lang, history, userText),
  });
}

export async function extractVocab(
  lang: TargetLanguage,
  situation: string,
  history: Message[],
  sessionId: string
): Promise<VocabEntry[]> {
  const result = await generateJson<{
    items: { phrase: string; meaning_ja: string; example?: string }[];
  }>({
    prompt: VOCAB_PROMPT(lang, situation, history),
  });
  const now = Date.now();
  return (result.items ?? []).map((it) => ({
    id: uid(),
    language: lang,
    phrase: it.phrase,
    meaningJa: it.meaning_ja,
    example: it.example,
    sourceSessionId: sessionId,
    sourceSituation: situation,
    createdAt: now,
  }));
}

/**
 * Returns a base64-encoded PCM WAV-compatible audio payload from Gemini TTS.
 * Throws on failure (caller may fall back to browser TTS).
 */
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
