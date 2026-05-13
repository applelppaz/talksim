export type TargetLanguage = 'en' | 'zh' | 'es' | 'fr';

export const LANGUAGES: Record<TargetLanguage, { label: string; bcp47: string; nativeName: string }> = {
  en: { label: 'English', bcp47: 'en-US', nativeName: 'English' },
  zh: { label: '中国語', bcp47: 'zh-CN', nativeName: '中文' },
  es: { label: 'スペイン語', bcp47: 'es-ES', nativeName: 'Español' },
  fr: { label: 'フランス語', bcp47: 'fr-FR', nativeName: 'Français' },
};

export type MessageRole = 'ai' | 'user';

export interface Message {
  id: string;
  role: MessageRole;
  text: string;
  translation?: string;
  correction?: Correction;
  createdAt: number;
}

export interface Correction {
  ok: boolean;
  issues: string[];
  improved?: string;
  comment?: string;
}

export interface ConversationSession {
  id: string;
  language: TargetLanguage;
  situation: string;
  outline: string[];
  messages: Message[];
  startedAt: number;
  endedAt?: number;
}

export interface VocabEntry {
  id: string;
  language: TargetLanguage;
  phrase: string;
  meaningJa: string;
  example?: string;
  sourceSessionId?: string;
  sourceSituation?: string;
  createdAt: number;
}

export type TtsMode = 'browser' | 'gemini';

export interface ApiKeyState {
  key: string;
  exhaustedAt?: number;
  label?: string;
}

export interface AppSettings {
  apiKeys: ApiKeyState[];
  ttsMode: TtsMode;
  autoPlay: boolean;
  voicePreference?: string;
}
