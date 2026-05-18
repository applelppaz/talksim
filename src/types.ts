export type TargetLanguage = 'en' | 'zh' | 'es' | 'fr';

export const LANGUAGES: Record<TargetLanguage, { label: string; bcp47: string; nativeName: string }> = {
  en: { label: 'English', bcp47: 'en-US', nativeName: 'English' },
  zh: { label: '中国語', bcp47: 'zh-CN', nativeName: '中文' },
  es: { label: 'スペイン語', bcp47: 'es-ES', nativeName: 'Español' },
  fr: { label: 'フランス語', bcp47: 'fr-FR', nativeName: 'Français' },
};

export interface VocabAlternative {
  text: string;
  translation: string;
}

export interface DialogueSlot {
  original: string;
  translation: string;
  alternatives: VocabAlternative[];
}

export interface DialogueLine {
  id: string;
  speaker: string;
  template: string;
  translation: string;
  slots: DialogueSlot[];
}

export interface Dialogue {
  id: string;
  language: TargetLanguage;
  situation: string;
  title: string;
  lines: DialogueLine[];
  createdAt: number;
}

export type SlotSelections = Record<string, Record<number, number>>;

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
