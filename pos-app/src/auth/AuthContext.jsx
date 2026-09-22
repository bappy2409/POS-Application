import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { apiRequest } from '../lib/api.js';

const STORAGE_KEY = 'clothing-pos-auth';
const AuthContext = createContext(null);

function getStoredSession() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  const login = useCallback(async (credentials) => {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    const nextSession = { accessToken: result.accessToken, user: result.user };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    token: session?.accessToken ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    login,
    logout,
  }), [login, logout, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
