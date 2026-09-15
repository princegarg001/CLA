// Backend URL + the API key handed out by a real login (POST /api/auth/login)
// — nothing secret ships in the JS bundle itself, since this is now deployed
// at a public URL rather than living only on one phone.
const BASE_URL_KEY = 'cla_base_url';
const API_KEY_KEY = 'cla_api_key';
const NAME_KEY = 'cla_user_name';
const USERNAME_KEY = 'cla_username';

export const DEFAULT_BASE_URL = 'https://cla-v2-backend.onrender.com';

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

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const config = {
  get baseUrl(): string {
    return safeGet(BASE_URL_KEY) || DEFAULT_BASE_URL;
  },
  get apiKey(): string {
    return safeGet(API_KEY_KEY) || '';
  },
  get name(): string {
    return safeGet(NAME_KEY) || '';
  },
  get username(): string {
    return safeGet(USERNAME_KEY) || '';
  },
  get apiBaseUrl(): string {
    return `${this.baseUrl}/api`;
  },
  get isLoggedIn(): boolean {
    return !!this.apiKey;
  },
  update({ baseUrl, apiKey }: { baseUrl?: string; apiKey?: string }) {
    if (baseUrl !== undefined) {
      safeSet(BASE_URL_KEY, baseUrl.trim() || DEFAULT_BASE_URL);
    }
    if (apiKey !== undefined) {
      safeSet(API_KEY_KEY, apiKey.trim());
    }
  },
  /** Called after a successful /api/auth/login or /setup. */
  setSession({ name, username, apiKey }: { name: string; username: string; apiKey: string }) {
    safeSet(NAME_KEY, name);
    safeSet(USERNAME_KEY, username);
    safeSet(API_KEY_KEY, apiKey);
  },
  logout() {
    safeRemove(API_KEY_KEY);
    safeRemove(NAME_KEY);
    safeRemove(USERNAME_KEY);
  },
};
