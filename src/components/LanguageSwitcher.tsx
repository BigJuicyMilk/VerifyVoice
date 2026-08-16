import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Globe, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const options = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी' },
    { code: 'ar', label: 'العربية' },
    { code: 'zh', label: '中文' },
    { code: 'es', label: 'Español' },
  ] as const;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-surface-container-low text-on-surface font-bold hover:bg-surface-container-high transition-colors"
        aria-label={t('common.chooseLanguage')}
      >
        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        <span className="text-xs sm:text-sm uppercase tracking-wider hidden sm:inline">{options.find((o) => o.code === lang)?.label}</span>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute right-0 mt-2 w-40 bg-white rounded-2xl shadow-2xl border border-black/5 overflow-hidden z-[60]"
        >
          {options.map((option) => (
            <button
              key={option.code}
              onClick={() => {
                setLang(option.code as typeof lang);
                setOpen(false);
              }}
              className={cn(
                'w-full px-4 py-3 text-left text-sm font-bold hover:bg-primary/5 transition-colors flex items-center justify-between',
                lang === option.code && 'bg-primary/10 text-primary'
              )}
            >
              {option.label}
              {lang === option.code && <CheckCircle className="w-4 h-4" />}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
