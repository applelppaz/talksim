import { GoogleGenAI } from '@google/genai';
import { withKeyRotation } from './apiKeyManager';
import type {
  Correction,
  Difficulty,
  Dialogue,
  DialogueLine,
  Message,
  PronunciationEval,
  TargetLanguage,
  VocabEntry,
} from '../types';
import { uid } from './storage';
import {
  CHECK_PROMPT,
  DIALOGUE_PROMPT,
  EVAL_PROMPT,
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
    throw new Error(`Failed to parse AI response as JSON: ${trimmed.slice(0, 120)}`);
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
  language: TargetLanguage,
  difficulty: Difficulty
): Promise<Dialogue> {
  const raw = await generateJson<RawDialogue>({
    prompt: DIALOGUE_PROMPT(situation, language, difficulty),
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
    throw new Error('The model returned no dialogue. Try a more specific situation.');
  }

  return {
    id: uid(),
    language,
    situation: situation.trim(),
    difficulty,
    title: raw.title?.trim() || situation.trim().slice(0, 24),
    lines,
    createdAt: Date.now(),
  };
}

interface RawEval {
  ok?: boolean;
  score?: number;
  summary?: string;
  issues?: { kind?: string; detail?: string }[];
  corrected?: string | null;
  suggestion?: string;
}

export async function evaluatePronunciation(params: {
  language: TargetLanguage;
  speaker: string;
  expected: string;
  expectedTranslation: string;
  transcript: string;
  situation: string;
}): Promise<PronunciationEval> {
  const raw = await generateJson<RawEval>({
    prompt: EVAL_PROMPT(
      params.language,
      params.speaker,
      params.expected,
      params.expectedTranslation,
      params.transcript,
      params.situation
    ),
  });
  const score = Math.max(0, Math.min(100, Math.round(raw.score ?? 0)));
  const correctedRaw = typeof raw.corrected === 'string' ? raw.corrected.trim() : '';
  const corrected =
    correctedRaw.length > 0 && correctedRaw.toLowerCase() !== 'null' && correctedRaw !== params.transcript.trim()
      ? correctedRaw
      : undefined;
  return {
    ok: Boolean(raw.ok),
    score,
    summary: raw.summary ?? '',
    issues: (raw.issues ?? [])
      .filter((i) => (i.detail ?? '').trim().length > 0)
      .map((i) => ({ kind: i.kind?.trim() || 'Note', detail: i.detail ?? '' })),
    suggestion: raw.suggestion,
    corrected,
    transcript: params.transcript,
    expected: params.expected,
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
      throw new Error('Gemini TTS returned no audio data.');
    }
    return { data: inline.data, mimeType: inline.mimeType ?? 'audio/pcm' };
  });
}

// ---------------------------------------------------------------------------
// Chat-mode helpers (legacy roleplay chat).
// ---------------------------------------------------------------------------

export async function generateOutline(situation: string, lang: TargetLanguage): Promise<string[]> {
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
  return generateJson<AiTurnResult>({ prompt: FIRST_TURN_PROMPT(situation, outline, lang) });
}

export async function generateNextTurn(
  situation: string,
  outline: string[],
  lang: TargetLanguage,
  history: Message[]
): Promise<AiTurnResult> {
  return generateJson<AiTurnResult>({ prompt: NEXT_TURN_PROMPT(situation, outline, lang, history) });
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
  return generateJson<HelpResult>({ prompt: HELP_PROMPT(situation, outline, lang, history) });
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
  return generateJson<Correction>({ prompt: CHECK_PROMPT(lang, history, userText) });
}

export async function extractVocab(
  lang: TargetLanguage,
  situation: string,
  history: Message[],
  sessionId: string
): Promise<VocabEntry[]> {
  const result = await generateJson<{
    items: { phrase: string; meaning_ja: string; example?: string }[];
  }>({ prompt: VOCAB_PROMPT(lang, situation, history) });
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
