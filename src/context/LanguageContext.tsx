import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { type Lang, defaultLang, locales, storageKey, t as translate, getFacts } from '../lib/i18n';

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  speechLang: string;
  facts: { id: string; title: string; text: string; color: string; iconColor: string }[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function loadLang(): Lang {
  if (typeof window === 'undefined') return defaultLang;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && stored in locales) return stored as Lang;
  } catch {
    // ignore
  }
  return defaultLang;
}

function saveLang(lang: Lang) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, lang);
  } catch {
    // ignore
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    saveLang(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang]
  );

  const { dir, speechLang } = locales[lang];
  const facts = useMemo(() => getFacts(lang), [lang]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, speechLang, facts }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
