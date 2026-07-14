import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { apiGet, apiPost, ApiError, setCsrfToken } from './api';

// login/signup/me all return the user plus this session's CSRF token.
type AuthResponse = User & { csrfToken?: string };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiGet<AuthResponse>('/auth/me')
      .then((u) => {
        if (cancelled) return;
        setCsrfToken(u.csrfToken ?? null);
        setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiPost<AuthResponse>('/auth/login', { email, password });
    setCsrfToken(u.csrfToken ?? null);
    setUser(u);
    return u;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string, phone?: string) => {
    const u = await apiPost<AuthResponse>('/auth/signup', { email, password, name, phone });
    setCsrfToken(u.csrfToken ?? null);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost('/auth/logout');
    } catch (e) {
      // ignore network errors on logout
    }
    setCsrfToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { ApiError };
