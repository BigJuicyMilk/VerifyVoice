import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { uuid } from '../lib/utils';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export type SocialProvider = 'google' | 'wechat' | 'x';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; errorKey?: string; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; errorKey?: string; error?: string }>;
  socialLogin: (provider: SocialProvider, name: string, email: string) => Promise<{ success: boolean; errorKey?: string; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'verifyvoice_session';

async function loadUsers(): Promise<User[]> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function saveUsers(users: User[]) {
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(users),
    });
  } catch {
    // silently fail
  }
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSession);
  const isAuthenticated = user !== null;

  const login = useCallback(async (email: string, password: string) => {
    const users = await loadUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      return { success: false, errorKey: 'auth.noAccount' };
    }
    if (found.password !== password) {
      return { success: false, errorKey: 'auth.incorrectPassword' };
    }
    setUser(found);
    saveSession(found);
    return { success: true };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const users = await loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, errorKey: 'auth.emailExists' };
    }
    const newUser: User = {
      id: uuid(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    };
    users.push(newUser);
    await saveUsers(users);
    setUser(newUser);
    saveSession(newUser);
    return { success: true };
  }, []);

  const socialLogin = useCallback(async (provider: SocialProvider, name: string, email: string) => {
    const users = await loadUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const existing = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      setUser(existing);
      saveSession(existing);
      return { success: true };
    }
    const newUser: User = {
      id: uuid(),
      name: name.trim(),
      email: normalizedEmail,
      password: uuid(),
    };
    users.push(newUser);
    await saveUsers(users);
    setUser(newUser);
    saveSession(newUser);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    saveSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, register, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
