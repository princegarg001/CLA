// Mirrors the Flutter app's AppConfig: backend URL + shared API key, stored
// per-browser so this can point at a different backend (local dev vs Render)
// without a rebuild.
const BASE_URL_KEY = 'cla_base_url';
const API_KEY_KEY = 'cla_api_key';

export const DEFAULT_BASE_URL = 'https://cla-v2-backend.onrender.com';
// Same shared default the Flutter app ships with — override in Settings once
// Render's CLA_API_KEY is rotated to something private.
export const DEFAULT_API_KEY = 'fertgghtdrtsrtsers';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private browsing / storage disabled — config just won't persist
  }
}

export const config = {
  get baseUrl(): string {
    return safeGet(BASE_URL_KEY) || DEFAULT_BASE_URL;
  },
  get apiKey(): string {
    return safeGet(API_KEY_KEY) || DEFAULT_API_KEY;
  },
  get apiBaseUrl(): string {
    return `${this.baseUrl}/api`;
  },
  update({ baseUrl, apiKey }: { baseUrl?: string; apiKey?: string }) {
    if (baseUrl !== undefined) {
      safeSet(BASE_URL_KEY, baseUrl.trim() || DEFAULT_BASE_URL);
    }
    if (apiKey !== undefined) {
      safeSet(API_KEY_KEY, apiKey.trim());
    }
  },
};
