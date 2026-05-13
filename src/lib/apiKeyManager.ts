import { storage } from './storage';
import type { ApiKeyState } from '../types';

const QUOTA_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export class NoUsableKeyError extends Error {
  constructor() {
    super('利用可能なAPIキーがありません。設定画面でAPIキーを登録するか、上限の解除をお待ちください。');
    this.name = 'NoUsableKeyError';
  }
}

export class AllKeysExhaustedError extends Error {
  constructor() {
    super('登録されている全てのAPIキーが本日の上限に達しました。明日以降に再度お試しください。');
    this.name = 'AllKeysExhaustedError';
  }
}

function isFresh(state: ApiKeyState): boolean {
  if (!state.exhaustedAt) return true;
  return Date.now() - state.exhaustedAt > QUOTA_COOLDOWN_MS;
}

export function listUsableKeys(): { index: number; key: string }[] {
  const s = storage.loadSettings();
  return s.apiKeys
    .map((state, index) => ({ state, index }))
    .filter(({ state }) => state.key.trim().length > 0 && isFresh(state))
    .map(({ state, index }) => ({ index, key: state.key.trim() }));
}

export function hasAnyKey(): boolean {
  const s = storage.loadSettings();
  return s.apiKeys.some((k) => k.key.trim().length > 0);
}

export function markKeyExhausted(index: number): void {
  const s = storage.loadSettings();
  if (!s.apiKeys[index]) return;
  s.apiKeys[index] = { ...s.apiKeys[index], exhaustedAt: Date.now() };
  storage.saveSettings(s);
}

export function clearExhaustedFlag(index: number): void {
  const s = storage.loadSettings();
  if (!s.apiKeys[index]) return;
  s.apiKeys[index] = { ...s.apiKeys[index], exhaustedAt: undefined };
  storage.saveSettings(s);
}

export function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('exceeded')
  );
}

export function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();
  return (
    lower.includes('api key') ||
    lower.includes('api_key') ||
    lower.includes('unauthorized') ||
    lower.includes('permission_denied') ||
    lower.includes('invalid') ||
    lower.includes('401') ||
    lower.includes('403')
  );
}

/**
 * Try the operation with each usable key in order; on quota/auth failure,
 * mark the key exhausted and advance. Throws when none remain.
 */
export async function withKeyRotation<T>(op: (apiKey: string) => Promise<T>): Promise<T> {
  if (!hasAnyKey()) throw new NoUsableKeyError();
  let usable = listUsableKeys();
  if (usable.length === 0) throw new AllKeysExhaustedError();
  let lastErr: unknown;
  for (const { index, key } of usable) {
    try {
      return await op(key);
    } catch (err) {
      lastErr = err;
      if (isQuotaError(err) || isAuthError(err)) {
        markKeyExhausted(index);
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  throw new AllKeysExhaustedError();
}
