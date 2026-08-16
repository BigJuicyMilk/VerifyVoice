import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioLines, Eye, EyeOff, ArrowRight, User, Mail, Lock, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth, type SocialProvider } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

// --- Provider Logos ---

const GoogleLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const WechatLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 0 1 .177-.554C23.087 18.543 24 16.769 24 14.802c0-3.38-3.236-6.126-7.062-5.944zm-2.666 2.89c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.983a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z" />
  </svg>
);

const XLogo = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// --- Social Login Modal ---

function SocialLoginModal({
  provider,
  onClose,
  onSubmit,
}: {
  provider: SocialProvider;
  onClose: () => void;
  onSubmit: (name: string, email: string) => void;
}) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit(name.trim(), email.trim());
  };

  const providerStyles = {
    google: { bg: 'bg-white', text: 'text-gray-700', border: 'border-gray-200', brand: 'Google' },
    wechat: { bg: 'bg-[#07C160]', text: 'text-white', border: 'border-[#07C160]', brand: 'WeChat' },
    x: { bg: 'bg-black', text: 'text-white', border: 'border-black', brand: 'X' },
  };
  const style = providerStyles[provider];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 sm:px-6 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white rounded-2xl sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border',
              style.bg,
              style.border
            )}
          >
            {provider === 'google' && <GoogleLogo />}
            {provider === 'wechat' && <WechatLogo />}
            {provider === 'x' && <XLogo />}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-on-surface">{t('common.continueWith', { brand: style.brand })}</h3>
          <p className="text-on-surface-variant text-sm font-medium mt-1 text-center">
            {t('social.modalDescription', { brand: style.brand })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('common.name')}</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                className="w-full h-12 sm:h-14 bg-surface-container-low rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 text-base sm:text-lg font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('common.email')}</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                className="w-full h-12 sm:h-14 bg-surface-container-low rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 text-base sm:text-lg font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={cn(
              'w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg mt-2',
              provider === 'google' && 'bg-primary text-white shadow-primary/25',
              provider === 'wechat' && 'bg-[#07C160] text-white shadow-[#07C160]/25',
              provider === 'x' && 'bg-black text-white shadow-black/25'
            )}
          >
            {t('common.continueWith', { brand: style.brand })}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// --- Main Auth Screen ---

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);

  const { login, register, socialLogin } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    setTimeout(async () => {
      let result;
      if (mode === 'login') {
        result = await login(email, password);
      } else {
        if (!name.trim()) {
          setError(t('auth.nameRequired'));
          setIsSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError(t('auth.passwordMin'));
          setIsSubmitting(false);
          return;
        }
        result = await register(name, email, password);
      }

      if (!result.success) {
        setError(result.errorKey ? t(result.errorKey) : (result.error || t('auth.somethingWrong')));
      } else {
        onAuthSuccess?.();
      }
      setIsSubmitting(false);
    }, 400);
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
    setName('');
    setEmail('');
    setPassword('');
  };

  const handleSocialSubmit = (socialName: string, socialEmail: string) => {
    if (!socialProvider) return;
    setIsSubmitting(true);
    setTimeout(async () => {
      const result = await socialLogin(socialProvider, socialName, socialEmail);
      if (!result.success) {
        setError(result.errorKey ? t(result.errorKey) : (result.error || t('auth.socialLoginFailed')));
      } else {
        setSocialProvider(null);
        onAuthSuccess?.();
      }
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-12 bg-surface">
      <AnimatePresence>
        {socialProvider && (
          <SocialLoginModal
            provider={socialProvider}
            onClose={() => setSocialProvider(null)}
            onSubmit={handleSocialSubmit}
          />
        )}
      </AnimatePresence>

      {/* Language Switcher */}
      <div className="fixed top-4 end-4 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-xl shadow-primary/20 mb-4 sm:mb-6">
            <AudioLines className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-on-surface">{t('common.appName')}</h1>
          <p className="text-on-surface-variant mt-2 font-medium text-base sm:text-lg">
            {mode === 'login' ? t('common.welcomeBack') : t('common.createAccount')}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-xl shadow-black/5 p-5 sm:p-8 border border-black/5">
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {mode === 'register' && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface uppercase tracking-wider">{t('common.name')}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className="w-full h-12 sm:h-14 bg-surface-container-low rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 text-base sm:text-lg font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface uppercase tracking-wider">{t('common.email')}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full h-12 sm:h-14 bg-surface-container-low rounded-xl sm:rounded-2xl pl-11 sm:pl-12 pr-4 text-base sm:text-lg font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-on-surface uppercase tracking-wider">{t('common.password')}</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? t('auth.passwordPlaceholder') : t('auth.passwordLoginPlaceholder')}
                    className="w-full h-14 bg-surface-container-low rounded-2xl pl-12 pr-12 text-lg font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-4 focus:ring-primary/15 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/60 hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'w-full h-16 rounded-2xl bg-primary text-white text-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-primary/25',
                  isSubmitting && 'opacity-70 cursor-not-allowed'
                )}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    {mode === 'login' ? t('common.signIn') : t('common.createAccount')}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-black/10" />
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">{t('common.orContinueWith')}</span>
            <div className="flex-1 h-px bg-black/10" />
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => setSocialProvider('google')}
              className="h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center gap-2 font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <GoogleLogo />
              <span className="hidden sm:inline">Google</span>
            </button>
            <button
              onClick={() => setSocialProvider('wechat')}
              className="h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-[#07C160] text-white flex items-center justify-center gap-2 font-bold hover:bg-[#06ad56] active:scale-95 transition-all"
            >
              <WechatLogo />
              <span className="hidden sm:inline">WeChat</span>
            </button>
            <button
              onClick={() => setSocialProvider('x')}
              className="h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-black text-white flex items-center justify-center gap-2 font-bold hover:bg-gray-900 active:scale-95 transition-all"
            >
              <XLogo />
              <span className="hidden sm:inline">X</span>
            </button>
          </div>
        </div>

        {/* Toggle */}
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-on-surface-variant font-medium text-sm sm:text-base">
            {mode === 'login' ? t('common.noAccount') : t('common.hasAccount')}{' '}
            <button
              onClick={toggleMode}
              className="text-primary font-bold hover:underline transition-all"
            >
              {mode === 'login' ? t('common.register') : t('common.signIn')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
