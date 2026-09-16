import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../core/apiClient';
import { config } from '../core/config';

type AuthStatus = 'checking' | 'needsSetup' | 'needsLogin' | 'authenticated';

interface Session {
  name: string;
  username: string;
  apiKey: string;
}

interface AuthState {
  status: AuthStatus;
  name: string;
  setup: (name: string, username: string, password: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  reset: (username: string, newPassword: string, apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [name, setName] = useState(config.name);

  useEffect(() => {
    if (config.isLoggedIn) {
      setStatus('authenticated');
      return;
    }
    api
      .get<{ hasUser: boolean }>('/auth/status')
      .then((r) => setStatus(r.hasUser ? 'needsLogin' : 'needsSetup'))
      .catch(() => setStatus('needsLogin'));
  }, []);

  const applySession = useCallback((s: Session) => {
    config.setSession(s);
    setName(s.name);
    setStatus('authenticated');
  }, []);

  const setup = useCallback(
    async (name: string, username: string, password: string) => {
      const session = await api.post<Session>('/auth/setup', { name, username, password });
      applySession(session);
    },
    [applySession]
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const session = await api.post<Session>('/auth/login', { username, password });
      applySession(session);
    },
    [applySession]
  );

  const reset = useCallback(
    async (username: string, newPassword: string, apiKey: string) => {
      const session = await api.post<Session>('/auth/reset', { username, newPassword, apiKey });
      applySession(session);
    },
    [applySession]
  );

  const logout = useCallback(() => {
    config.logout();
    setName('');
    setStatus('needsLogin');
  }, []);

  return <AuthCtx.Provider value={{ status, name, setup, login, reset, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function authErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return 'Something went wrong — try again.';
}
