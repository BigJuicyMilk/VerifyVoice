/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AudioLines, 
  Volume2, 
  VolumeX, 
  CheckCircle, 
  Mic, 
  History as HistoryIcon, 
  GraduationCap, 
  Search, 
  QrCode, 
  ShieldCheck,
  Zap,
  Play,
  Pause,
  LucideIcon,
  Upload,
  X,
  FlipHorizontal,
  VideoOff,
  Video,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw,
  RefreshCw,
  Scale
} from 'lucide-react';
import { cn, uuid } from './lib/utils';
import { useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';
import LanguageSwitcher from './components/LanguageSwitcher';

// --- Types ---
type Screen = 'check' | 'question' | 'results' | 'history' | 'learn' | 'profile' | 'compare';

interface AnalysisResult {
  extractedText: string;
  analysisResult: string;
  savedPath: string;
  healthScore?: number | null;
  healthReason?: string;
}

interface HistoryRecord {
  timestamp: string;
  imagePath: string;
  question: string;
  extractedText: string;
  analysisResult: string;
  savedPath: string;
  healthScore?: number | null;
  healthReason?: string;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}

interface ProductInput {
  name: string;
  ingredients: string;
  nutrition: string;
}

interface ProductCompareResult extends ProductInput {
  healthScore: number;
  pros: string[];
  cons: string[];
}

interface CompareResult {
  winner: number | 'tie';
  products: ProductCompareResult[];
  explanation: string;
}

// --- Components ---

const NavItem = ({ icon: Icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center transition-all duration-300 px-3 sm:px-6 py-2 rounded-full",
      active 
        ? "bg-primary text-white scale-105 sm:scale-110 shadow-lg -translate-y-1 sm:-translate-y-2" 
        : "text-on-surface/60 hover:bg-surface-container-low"
    )}
  >
    <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", active && "fill-current")} />
    <span className="text-[10px] uppercase tracking-widest font-bold mt-1">{label}</span>
  </button>
);

const SpeechButton = ({ text, className, speechLang, ariaLabel }: { text: string; className?: string; speechLang: string; ariaLabel: string }) => {
  const [speaking, setSpeaking] = useState(false);

  const handleClick = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = speechLang;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speaking]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center rounded-full transition-all active:scale-90",
        speaking ? "bg-primary text-white" : "bg-white/90 text-primary hover:bg-white",
        className
      )}
      aria-label={ariaLabel}
    >
      {speaking ? <Pause className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
    </button>
  );
};

const Header = ({ 
  audioOn, 
  setAudioOn, 
  user, 
  onProfileClick 
}: { 
  audioOn: boolean; 
  setAudioOn: (v: boolean) => void;
  user: { name: string } | null;
  onProfileClick: () => void;
}) => {
  const { t } = useLanguage();
  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-3 sm:px-6 py-2 sm:py-4 h-14 sm:h-20 bg-[#f9f9ff]/80 backdrop-blur-md">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="text-primary">
          <AudioLines className="w-6 h-6 sm:w-8 sm:h-8" />
        </div>
        <h1 className="font-bold text-lg sm:text-2xl tracking-tighter text-primary">{t('common.appName')}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <button 
          onClick={() => setAudioOn(!audioOn)}
          className={cn(
            "flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-white font-bold transition-all active:scale-95 shadow-lg",
            audioOn ? "bg-primary" : "bg-secondary-container"
          )}
        >
          {audioOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          <span className="tracking-widest text-xs sm:text-sm uppercase hidden sm:inline">{audioOn ? t('common.audioOn') : t('common.audioOff')}</span>
        </button>
        {user && (
          <button
            onClick={onProfileClick}
            className="w-9 h-9 sm:w-11 sm:h-11 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 active:scale-95 transition-transform"
          >
            {initials}
          </button>
        )}
      </div>
    </header>
  );
};

// --- Screen Views ---

const ScannerView = ({ onScan }: { onScan: (imagePath: string) => void }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(true);

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (!cameraActive) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(null);
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(t('scanner.cameraPermissionDenied'));
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setCameraError(t('scanner.cameraNotAvailable'));
      } else {
        setCameraError(t('scanner.cameraAccessError', { message: err.message }));
      }
    }
  }, [facingMode, cameraActive, t]);

  useEffect(() => {
    let cancelled = false;
    startCamera().then(() => {
      if (cancelled && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    });
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  const flipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleCamera = () => {
    setCameraActive((prev) => {
      const next = !prev;
      if (!next && streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      return next;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const captureVideoFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleScan = async () => {
    setIsScanning(true);
    setUploadError('');

    if (!user) {
      setUploadError(t('scanner.loginRequired'));
      setIsScanning(false);
      return;
    }

    const folderName = user.id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let uploadedPath = '';

    try {
      if (selectedFile) {
        // Upload the selected file
        const dataUrl = await readFileAsDataURL(selectedFile);
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: folderName,
            filename: selectedFile.name,
            data: dataUrl,
          }),
        });
        if (!res.ok) throw new Error(t('scanner.uploadFailed'));
        const result = await res.json();
        uploadedPath = result.path;
      } else if (!cameraError && videoRef.current) {
        // Capture the current camera frame and upload it
        const frame = captureVideoFrame();
        if (frame) {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: folderName,
              filename: `scan_${timestamp}.jpg`,
              data: frame,
            }),
          });
          if (!res.ok) throw new Error(t('scanner.uploadFailed'));
          const result = await res.json();
          uploadedPath = result.path;
        }
      }
    } catch (err: any) {
      setUploadError(err.message || t('scanner.failedSave'));
      setIsScanning(false);
      return;
    }

    setTimeout(() => {
      setIsScanning(false);
      if (uploadedPath) {
        onScan(uploadedPath);
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div className="text-center mb-4 sm:mb-10">
        <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">{t('scanner.title')}</h2>
        <p className="text-base sm:text-xl font-medium text-on-surface-variant max-w-2xl mx-auto px-2 sm:px-0">
          {t('scanner.description')}
        </p>
      </div>

      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-surface-container-highest group">
        {/* Hidden canvas for capturing video frames */}
        <canvas ref={canvasRef} className="hidden" />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt={t('common.previewAlt')} className="w-full h-full object-cover" />
            <button
              onClick={clearSelection}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors z-20"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        ) : cameraError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-surface-container-high text-center space-y-3 sm:space-y-4">
            <QrCode className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30" />
            <p className="text-sm sm:text-lg font-bold text-on-surface">{cameraError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-bold active:scale-95 transition-transform text-sm sm:text-base"
            >
              {t('scanner.retryCamera')}
            </button>
          </div>
        ) : cameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "w-full h-full object-cover",
                facingMode === 'user' && "scale-x-[-1]"
              )}
            />

            {/* Turn Camera Off Button */}
            <button
              onClick={toggleCamera}
              className="absolute top-3 left-3 sm:top-4 sm:left-4 w-9 h-9 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
              title={t('scanner.turnCameraOff')}
            >
              <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Flip Camera Button */}
            <button
              onClick={flipCamera}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
              title={t('scanner.flipCamera')}
            >
              <FlipHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 bg-black/20 pointer-events-none">
              <div className="relative w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 border-4 border-white/40 rounded-2xl sm:rounded-3xl">
                <div className="absolute -top-1 -left-1 w-7 h-7 sm:w-10 sm:h-10 border-t-4 sm:border-t-8 border-l-4 sm:border-l-8 border-yellow-400 rounded-tl-lg sm:rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-7 h-7 sm:w-10 sm:h-10 border-t-4 sm:border-t-8 border-r-4 sm:border-r-8 border-yellow-400 rounded-tr-lg sm:rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-7 h-7 sm:w-10 sm:h-10 border-b-4 sm:border-b-8 border-l-4 sm:border-l-8 border-yellow-400 rounded-bl-lg sm:rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-10 sm:h-10 border-b-4 sm:border-b-8 border-r-4 sm:border-r-8 border-yellow-400 rounded-br-lg sm:rounded-br-xl" />

                {/* Scan Line Animation */}
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-yellow-400 shadow-[0_0_15px_#facc15] z-10"
                />
              </div>

              <div className="mt-6 sm:mt-12 bg-black/60 backdrop-blur-md px-4 sm:px-8 py-2 sm:py-3 rounded-full border border-white/20">
                <p className="text-white font-bold text-sm sm:text-lg">{t('scanner.alignLabel')}</p>
              </div>
            </div>

            {isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-primary/20 backdrop-blur-sm z-30 flex items-center justify-center"
              >
                <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col items-center gap-3 sm:gap-4 shadow-2xl">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-primary/20 border-t-primary rounded-full"
                  />
                  <p className="text-lg sm:text-xl font-black text-on-surface">{t('scanner.scanning')}</p>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-surface-container-high text-center space-y-3 sm:space-y-4">
            <VideoOff className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30" />
            <p className="text-sm sm:text-lg font-bold text-on-surface">{t('scanner.cameraOff')}</p>
            <button
              onClick={toggleCamera}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-primary text-white rounded-full font-bold active:scale-95 transition-transform text-sm sm:text-base flex items-center gap-2"
            >
              <Video className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('scanner.turnCameraOn')}
            </button>
          </div>
        )}

        <div className="absolute bottom-4 sm:bottom-10 left-3 right-3 sm:left-6 sm:right-6 z-20 space-y-2 sm:space-y-3">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className={cn(
              "bg-gradient-to-br from-primary to-primary-container text-white w-full h-14 sm:h-20 rounded-xl sm:rounded-2xl shadow-2xl flex items-center justify-center gap-2 sm:gap-4 active:scale-95 transition-transform",
              isScanning && "opacity-60 cursor-not-allowed"
            )}
          >
            <QrCode className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-lg sm:text-2xl font-bold">{t('scanner.scanNow')}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className={cn(
              "w-full h-11 sm:h-14 rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-md text-primary font-bold flex items-center justify-center gap-2 sm:gap-3 active:scale-95 transition-transform border border-primary/10 text-sm sm:text-base",
              isScanning && "opacity-60 cursor-not-allowed"
            )}
          >
            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{t('scanner.uploadFromDevice')}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="mt-3 sm:mt-4 bg-red-50 text-red-700 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 w-full max-w-4xl">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      <div className="mt-8 sm:mt-12 flex flex-col items-center gap-4 sm:gap-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full mt-4 sm:mt-6">
          <div className="bg-yellow-100/50 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-l-[8px] sm:border-l-[12px] border-yellow-400">
            <h3 className="text-xl sm:text-2xl font-black text-yellow-900 mb-1 sm:mb-2">{t('scanner.troubleScanning')}</h3>
            <p className="text-base sm:text-lg text-yellow-800">{t('scanner.troubleDescription')}</p>
          </div>
          <div className="bg-surface-container-low p-5 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('scanner.searchPlaceholder')}
                className="w-full h-12 sm:h-16 bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 text-base sm:text-xl border-none focus:ring-4 focus:ring-primary/20"
              />
              <Search className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <button className="h-12 sm:h-16 w-full rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl bg-white border-2 border-primary/10 text-primary hover:bg-primary/5 transition-colors">
              {t('scanner.searchManually')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestionView = ({
  imagePath,
  onAnalyze,
  isAnalyzing,
}: {
  imagePath: string;
  onAnalyze: (question: string, mode: 'short' | 'detailed') => void;
  isAnalyzing: boolean;
}) => {
  const { t } = useLanguage();
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAnalyzing) return;
    onAnalyze(question.trim(), 'detailed');
  };

  const handleQuick = () => {
    if (!question.trim() || isAnalyzing) return;
    onAnalyze(question.trim(), 'short');
  };

  const suggestions = [
    t('question.healthy'),
    t('question.highSugar'),
    t('question.palmOil'),
    t('question.glutenFree'),
    t('question.allergens'),
    t('question.vegan'),
  ];

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full space-y-4 sm:space-y-6"
      >
        <div className="text-center">
          <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">{t('question.title')}</h2>
          <p className="text-base sm:text-xl font-medium text-on-surface-variant max-w-2xl mx-auto px-2 sm:px-0">
            {t('question.description')}
          </p>
        </div>

        {/* Scanned Image Preview */}
        <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-surface-container-highest">
          <img src={imagePath} alt={t('common.scannedProductAlt')} className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-primary text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider">
            {t('question.ingredientList')}
          </div>
        </div>

        {/* Question Input */}
        <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('question.placeholder')}
            className="w-full h-12 sm:h-16 bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 text-base sm:text-xl font-bold text-on-surface placeholder:text-on-surface-variant/40 border-none focus:ring-4 focus:ring-primary/20 transition-all shadow-sm"
            disabled={isAnalyzing}
          />

          {/* Answer mode buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleQuick}
              disabled={!question.trim() || isAnalyzing}
              className={cn(
                'h-14 sm:h-20 px-3 sm:px-6 rounded-xl sm:rounded-2xl bg-white border-2 border-primary text-primary font-bold flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all active:scale-95 shadow-lg',
                (!question.trim() || isAnalyzing) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <>
                  <span className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-xl">
                    <Zap className="w-4 h-4 sm:w-6 sm:h-6" />
                    {t('question.quickAnswer')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium opacity-70">{t('question.quickAnswerHint')}</span>
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={!question.trim() || isAnalyzing}
              className={cn(
                'h-14 sm:h-20 px-3 sm:px-6 rounded-xl sm:rounded-2xl bg-primary text-white font-bold flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all active:scale-95 shadow-lg',
                (!question.trim() || isAnalyzing) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <>
                  <span className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-xl">
                    <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
                    {t('question.detailedAnswer')}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium opacity-70">{t('question.detailedAnswerHint')}</span>
                </>
              )}
            </button>
          </div>

          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setQuestion(q)}
                disabled={isAnalyzing}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-surface-container-low rounded-full text-xs sm:text-sm font-bold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ResultsView = ({
  imagePath,
  question,
  result,
  onScanAnother,
  onAskAnother,
}: {
  imagePath: string;
  question: string;
  result: AnalysisResult;
  onScanAnother: () => void;
  onAskAnother: () => void;
}) => {
  const { t, speechLang } = useLanguage();
  return (
    <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-primary-container text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl flex items-center justify-between shadow-2xl overflow-hidden relative"
      >
        <div className="space-y-1 z-10">
          <span className="text-on-primary-container text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">{t('results.aiAnalysisComplete')}</span>
          <h2 className="text-2xl sm:text-4xl font-black">{t('results.hereIsAnswer')}</h2>
        </div>
        <div className="z-10">
          <Sparkles className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
        </div>
        <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-white/5 rounded-full -mr-10 -mt-10 sm:-mr-20 sm:-mt-20 blur-3xl" />
      </motion.div>

      {/* Question Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-black/5"
      >
        <div className="flex items-center gap-3 mb-3 sm:mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider">{t('results.yourQuestion')}</p>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-on-surface">{question}</p>
      </motion.div>

      {/* Answer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-gradient-to-br from-primary to-primary-container text-white p-5 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">{t('results.aiAnalysis')}</p>
              <h3 className="text-2xl sm:text-3xl font-black">{t('results.expertVerdict')}</h3>
            </div>
          </div>
          <SpeechButton text={result.analysisResult} speechLang={speechLang} ariaLabel={t('common.readAloud')} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
        </div>
        <div className="text-base sm:text-xl font-medium leading-relaxed whitespace-pre-wrap">
          {result.analysisResult}
        </div>
      </motion.div>

      {/* Health Rating */}
      {result.healthScore != null && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-primary/20 ring-2 ring-primary/10"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl sm:text-4xl font-black text-primary">{result.healthScore}</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider">{t('results.healthRating')}</p>
                <h3 className="text-xl sm:text-2xl font-black text-on-surface">
                  {result.healthScore >= 7 ? t('results.healthyChoice') : result.healthScore >= 4 ? t('results.okayModeration') : t('results.limitProduct')}
                </h3>
              </div>
            </div>
            {result.healthReason && (
              <SpeechButton text={result.healthReason} speechLang={speechLang} ariaLabel={t('common.readAloud')} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
            )}
          </div>
          {result.healthReason && (
            <p className="mt-4 text-base sm:text-lg font-medium text-on-surface-variant leading-relaxed">
              {result.healthReason}
            </p>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {/* Extracted Ingredients / Nutrients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-black/5 flex flex-col h-full ring-1 ring-black/5"
        >
          <div className="flex justify-between items-start mb-4 sm:mb-8 gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <h4 className="text-2xl sm:text-3xl font-black">{t('results.extractedIngredients')}</h4>
            </div>
            <SpeechButton text={result.extractedText} speechLang={speechLang} ariaLabel={t('common.readAloud')} className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-medium leading-relaxed text-on-surface-variant whitespace-pre-wrap flex-grow">
            {result.extractedText}
          </div>
        </motion.div>

        {/* Product Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-black/5 flex flex-col h-full ring-1 ring-black/5"
        >
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-8">
            <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-tertiary" />
            <h4 className="text-2xl sm:text-3xl font-black">{t('results.productImage')}</h4>
          </div>
          <div className="mt-auto">
            <img
              src={imagePath}
              alt={t('common.scannedProductAlt')}
              className="w-full h-48 sm:h-64 object-cover rounded-xl sm:rounded-2xl shadow-inner"
            />
          </div>
        </motion.div>
      </div>

      {/* Continue or scan another */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="text-center pt-4 sm:pt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
      >
        <button
          onClick={onAskAnother}
          className="bg-white text-primary border-2 border-primary px-6 sm:px-10 py-3 sm:py-5 rounded-full text-base sm:text-xl font-bold hover:bg-primary/5 transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center"
        >
          <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          {t('results.askAnother')}
        </button>
        <button
          onClick={onScanAnother}
          className="bg-primary text-white px-6 sm:px-10 py-3 sm:py-5 rounded-full text-base sm:text-xl font-bold hover:bg-primary-container transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center"
        >
          <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
          {t('results.scanAnother')}
        </button>
      </motion.div>
    </div>
  );
};

const MAX_COMPARE_PRODUCTS = 50;

interface CompareProduct {
  id: string;
  previewUrl: string;
  imagePath: string;
  name: string;
  ingredients: string;
  nutrition: string;
  status: 'uploading' | 'extracting' | 'done' | 'error';
  error?: string;
}

const CompareView = ({ onBack }: { onBack: () => void }) => {
  const { t, speechLang, lang } = useLanguage();
  const { user } = useAuth();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const addProduct = async (file: File) => {
    const id = uuid();
    const previewUrl = URL.createObjectURL(file);
    const defaultName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    setProducts((prev) => [
      ...prev,
      {
        id,
        previewUrl,
        imagePath: '',
        name: defaultName,
        ingredients: '',
        nutrition: '',
        status: 'uploading',
      },
    ]);

    try {
      const dataUrl = await readFileAsDataURL(file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.id || 'anonymous',
          filename: file.name,
          data: dataUrl,
        }),
      });
      if (!uploadRes.ok) throw new Error(t('scanner.uploadFailed'));
      const uploadData = await uploadRes.json();
      const imagePath: string = uploadData.path;

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, imagePath, status: 'extracting' } : p))
      );

      const extractRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePath }),
      });
      if (!extractRes.ok) throw new Error(t('common.error'));
      const extractData = await extractRes.json();

      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ingredients: extractData.extractedText, status: 'done' } : p
        )
      );
    } catch (err: any) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: 'error', error: err.message || t('compare.failedProcess') } : p
        )
      );
    }
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;
    const remaining = MAX_COMPARE_PRODUCTS - products.length;
    if (remaining <= 0) {
      setError(t('compare.limitError', { max: MAX_COMPARE_PRODUCTS }));
      return;
    }
    setError('');
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => addProduct(file));
    e.target.value = '';
  };

  const updateProduct = (id: string, field: keyof CompareProduct, value: string) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCompare = async () => {
    const ready = products.filter((p) => p.status === 'done');
    if (ready.length < 2) {
      setError(t('compare.needTwo'));
      return;
    }

    setComparing(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: ready.map((p) => ({ name: p.name, ingredients: p.ingredients, nutrition: p.nutrition })),
          language: lang,
        }),
      });
      if (!res.ok) throw new Error(`${t('common.error')} ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || t('compare.compareFailed'));
    } finally {
      setComparing(false);
    }
  };

  const winnerName =
    result?.winner === 'tie'
      ? t('compare.itsATie')
      : result?.products[result.winner as number]?.name ?? '';

  const fullResultText = result
    ? `${t('compare.healthiestChoice')}: ${winnerName}. ${result.explanation}`
    : '';

  const statusBadge = (status: CompareProduct['status'], err?: string) => {
    switch (status) {
      case 'uploading':
        return <span className="text-xs font-black uppercase tracking-wider text-primary">{t('compare.uploading')}</span>;
      case 'extracting':
        return <span className="text-xs font-black uppercase tracking-wider text-primary">{t('compare.readingLabel')}</span>;
      case 'error':
        return <span className="text-xs font-black uppercase tracking-wider text-red-600">{err || t('common.error')}</span>;
      default:
        return <span className="text-xs font-black uppercase tracking-wider text-green-600">{t('compare.ready')}</span>;
    }
  };

  return (
    <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-6xl mx-auto w-full min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full space-y-6 sm:space-y-10"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant font-bold hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </button>

        <section>
          <h2 className="text-4xl sm:text-6xl font-black text-on-surface leading-none tracking-tighter mb-4">
            {t('compare.title')}
          </h2>
          <p className="text-xl sm:text-2xl text-on-surface-variant max-w-3xl leading-tight font-medium">
            {t('compare.description', { max: MAX_COMPARE_PRODUCTS })}
          </p>
        </section>

        {/* Upload area */}
        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-black/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-on-surface">{t('compare.uploadPhotos')}</h3>
              <p className="text-sm text-on-surface-variant font-medium">
                {t('compare.productsCount', { count: products.length, max: MAX_COMPARE_PRODUCTS })}
              </p>
            </div>
            {products.length >= MAX_COMPARE_PRODUCTS && (
              <span className="text-xs font-black text-red-600 uppercase tracking-wider">{t('compare.limitReached')}</span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFilesChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={products.length >= MAX_COMPARE_PRODUCTS}
            className="w-full h-14 sm:h-20 rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center gap-2 sm:gap-3 text-primary font-bold hover:bg-primary/5 transition-colors disabled:opacity-50 text-sm sm:text-base"
          >
            <Upload className="w-5 h-5 sm:w-6 sm:h-6" />
            {t('compare.choosePhotos')}
          </button>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Product cards */}
        {products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {products.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-4 sm:p-6 rounded-3xl shadow-sm border border-black/5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low">
                    <img src={product.previewUrl} alt={product.name} className="w-full h-full object-cover" />
                    {product.status !== 'done' && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {product.status === 'error' ? (
                          <X className="w-6 h-6 text-white" />
                        ) : (
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">{statusBadge(product.status, product.error)}</p>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                      placeholder={t('compare.productNamePlaceholder')}
                      className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-bold text-sm placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors"
                    aria-label={t('compare.removeProduct')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <textarea
                  value={product.ingredients}
                  onChange={(e) => updateProduct(product.id, 'ingredients', e.target.value)}
                  placeholder={t('compare.ingredientsPlaceholder')}
                  rows={3}
                  disabled={product.status !== 'done' && product.status !== 'error'}
                  className="w-full p-3 rounded-2xl bg-surface-container-low text-on-surface text-sm font-medium placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none disabled:opacity-60"
                />
                <textarea
                  value={product.nutrition}
                  onChange={(e) => updateProduct(product.id, 'nutrition', e.target.value)}
                  placeholder={t('compare.nutritionPlaceholder')}
                  rows={2}
                  className="w-full p-3 rounded-2xl bg-surface-container-low text-on-surface text-sm font-medium placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Compare button */}
        {products.length > 0 && (
          <button
            onClick={handleCompare}
            disabled={comparing || products.filter((p) => p.status === 'done').length < 2}
            className="w-full h-14 sm:h-20 rounded-2xl bg-primary text-white text-lg sm:text-2xl font-bold flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-transform disabled:opacity-70"
          >
            {comparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Scale className="w-6 h-6" />}
            {comparing ? t('compare.comparing') : t('compare.analyzeCompare')}
          </button>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 sm:space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-primary to-primary-container text-white p-6 sm:p-10 rounded-3xl shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">{t('compare.healthiestChoice')}</p>
                  <h3 className="text-3xl sm:text-5xl font-black">{winnerName}</h3>
                </div>
                <SpeechButton text={fullResultText} speechLang={speechLang} ariaLabel={t('common.readAloud')} className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0" />
              </div>
              <p className="text-base sm:text-xl font-medium leading-relaxed whitespace-pre-wrap">
                {result.explanation}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
              {result.products.map((product, idx) => {
                const isWinner = result.winner === idx;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * idx }}
                    className={cn(
                      'bg-white p-5 sm:p-6 rounded-3xl shadow-sm border space-y-4',
                      isWinner ? 'border-primary ring-2 ring-primary/20' : 'border-black/5'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-lg sm:text-xl font-black text-on-surface truncate">{product.name}</h4>
                      {isWinner && <span className="px-3 py-1 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-full flex-shrink-0">{t('compare.winner')}</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-4xl sm:text-5xl font-black text-primary">{product.healthScore}</div>
                      <div className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">/ 10<br />{t('compare.healthScore')}</div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-green-700 mb-1">{t('compare.pros')}</p>
                        <ul className="list-disc list-inside text-sm text-on-surface font-medium space-y-1">
                          {product.pros.map((pro, i) => <li key={i}>{pro}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-red-700 mb-1">{t('compare.cons')}</p>
                        <ul className="list-disc list-inside text-sm text-on-surface font-medium space-y-1">
                          {product.cons.map((con, i) => <li key={i}>{con}</li>)}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const HistoryView = ({
  onSelect,
}: {
  onSelect: (record: HistoryRecord) => void;
}) => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/history/${encodeURIComponent(user.id)}`);
      if (!res.ok) throw new Error(t('history.couldNotLoad'));
      const data = await res.json();
      setRecords(data);
    } catch (e: any) {
      setError(e.message || t('history.couldNotLoad'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString(lang);
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin mb-4" />
        <p className="text-lg sm:text-xl font-bold text-on-surface-variant">{t('history.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <HistoryIcon className="w-16 h-16 sm:w-24 sm:h-24 text-red-200 mb-6 sm:mb-8" />
        <h2 className="text-3xl sm:text-4xl font-black mb-3 sm:mb-4">{t('history.couldNotLoad')}</h2>
        <p className="text-base sm:text-xl text-on-surface-variant mb-5 sm:mb-6">{error}</p>
        <button
          onClick={loadHistory}
          className="bg-primary text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('history.tryAgain')}
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <HistoryIcon className="w-16 h-16 sm:w-24 sm:h-24 text-primary/20 mb-6 sm:mb-8" />
        <h2 className="text-3xl sm:text-4xl font-black mb-3 sm:mb-4">{t('history.noHistory')}</h2>
        <p className="text-base sm:text-xl text-on-surface-variant">{t('history.noHistoryDescription')}</p>
      </div>
    );
  }

  return (
    <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
      <div className="text-center mb-5 sm:mb-8">
        <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">{t('history.title')}</h2>
        <p className="text-base sm:text-xl font-medium text-on-surface-variant px-2 sm:px-0">
          {t('history.description')}
        </p>
      </div>

      {records.map((record, index) => {
        const isExpanded = expandedId === record.savedPath;
        return (
          <motion.div
            key={record.savedPath}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-black/5 overflow-hidden"
          >
            <div className="p-4 sm:p-6 flex items-start gap-3 sm:gap-4">
              <button
                onClick={() => onSelect(record)}
                className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container-low"
              >
                <img
                  src={record.imagePath}
                  alt={t('common.scannedProductAlt')}
                  className="w-full h-full object-cover"
                />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onSelect(record)}
                  className="text-left w-full"
                >
                  <p className="text-base sm:text-xl font-bold text-on-surface mb-1">
                    {record.question}
                  </p>
                </button>
                <div className="flex items-center gap-2 text-on-surface-variant text-xs sm:text-sm font-medium">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  {formatDate(record.timestamp)}
                </div>
              </div>
              <button
                onClick={() => setExpandedId(isExpanded ? null : record.savedPath)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface-container-low flex items-center justify-center text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    <div className="bg-primary/5 rounded-xl sm:rounded-2xl p-4 sm:p-5">
                      <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider mb-2">{t('history.aiAnswer')}</p>
                      <p className="text-base sm:text-lg font-medium text-on-surface whitespace-pre-wrap">{record.analysisResult}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl sm:rounded-2xl p-4 sm:p-5">
                      <p className="text-xs sm:text-sm font-black text-on-surface-variant uppercase tracking-wider mb-2">{t('history.extractedIngredients')}</p>
                      <p className="text-sm sm:text-base font-medium text-on-surface-variant whitespace-pre-wrap">{record.extractedText}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

const LearnView = ({ onFinish }: { onFinish: () => void }) => {
  const { t, speechLang, facts, lang } = useLanguage();
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [visibleFacts, setVisibleFacts] = useState<{ id: string; title: string; color: string; text: string; iconColor: string }[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [askError, setAskError] = useState('');

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
  }, []);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsAsking(true);
    setAskError('');
    setAnswer('');

    try {
      const res = await fetch('/api/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), language: lang }),
      });

      if (!res.ok) {
        throw new Error(`${t('common.error')} ${res.status}`);
      }

      const data = await res.json();
      setAnswer(data.answer);
    } catch (err: any) {
      setAskError(err.message || t('learn.couldNotAnswer'));
    } finally {
      setIsAsking(false);
    }
  };

  const speakCard = useCallback((card: { id: string; title: string; text: string }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert(t('learn.noSpeechSupport'));
      return;
    }

    if (speakingId === card.id) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`${card.title}. ${card.text}`);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = speechLang;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
    setSpeakingId(card.id);
  }, [speakingId, stopSpeaking, speechLang, t]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const [shownIds, setShownIds] = useState<string[]>([]);

  const pickFacts = useCallback((pool: typeof facts, count: number) => {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }, []);

  useEffect(() => {
    if (visibleFacts.length === 0 && facts.length >= 2) {
      const first = pickFacts(facts, 2);
      setVisibleFacts(first);
      setShownIds(first.map((f) => f.id));
    }
  }, [pickFacts, visibleFacts.length, facts]);

  const refreshFacts = () => {
    stopSpeaking();
    const currentIds = visibleFacts.map((f) => f.id);
    const alreadySeen = [...shownIds, ...currentIds];
    let pool = facts.filter((f) => !alreadySeen.includes(f.id));

    if (pool.length < 2) {
      // All facts have been shown. Reset history but avoid repeating the current pair.
      pool = facts.filter((f) => !currentIds.includes(f.id));
      setShownIds([...currentIds]);
    } else {
      setShownIds((prev) => [...prev, ...currentIds]);
    }

    const next = pickFacts(pool, 2);
    setVisibleFacts(next);
  };

  const isSpeaking = speakingId !== null;

  return (
    <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-8 sm:space-y-12">
      <div className={cn(
        "flex items-center gap-3 sm:gap-6 p-4 sm:p-8 bg-surface-container-low rounded-2xl sm:rounded-3xl border-l-[8px] sm:border-l-[12px] border-primary",
        isSpeaking && "animate-pulse"
      )}>
        <Mic className="w-7 h-7 sm:w-10 sm:h-10 text-primary flex-shrink-0" />
        <p className="text-base sm:text-2xl font-bold text-primary italic leading-tight">
          {isSpeaking ? t('learn.readingAloud') : t('learn.tapPlay')}
        </p>
      </div>

      <section className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-on-surface leading-none tracking-tighter mb-4 sm:mb-6">
            {t('learn.title')}
          </h2>
          <p className="text-xl sm:text-3xl text-on-surface-variant max-w-2xl leading-tight font-medium">
            {t('learn.description')}
          </p>
        </div>
        <button
          onClick={refreshFacts}
          className="self-start sm:self-auto flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-primary text-white font-bold shadow-lg active:scale-95 transition-transform hover:shadow-primary/40"
        >
          <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-sm sm:text-base">{t('learn.newFacts')}</span>
        </button>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
        {visibleFacts.map((card) => {
          const active = speakingId === card.id;
          return (
            <div
              key={card.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-10 flex flex-col justify-between min-h-[280px] sm:min-h-[450px] transition-all hover:shadow-2xl hover:-translate-y-2",
                card.color
              )}
            >
              <div className="absolute top-0 right-0 p-4 sm:p-8">
                <button
                  onClick={() => speakCard(card)}
                  className={cn(
                    "w-14 h-14 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer",
                    active ? "bg-white" : card.iconColor
                  )}
                  aria-label={active ? t('learn.stopReading') : t('learn.readAloud')}
                >
                  {active ? <Pause className="w-7 h-7 sm:w-12 sm:h-12 text-primary" /> : <Play className="w-7 h-7 sm:w-12 sm:h-12 text-white" />}
                </button>
              </div>
              <div className="flex-1">
                <span className="inline-block px-3 sm:px-5 py-1 sm:py-1.5 bg-primary/10 text-primary font-black rounded-full mb-4 sm:mb-8 uppercase tracking-widest text-xs sm:text-sm">{t('learn.factPrefix')} {card.id}</span>
                <h3 className={cn("text-3xl sm:text-5xl font-black mb-3 sm:mb-6 leading-none tracking-tighter", active ? "text-primary" : "text-on-surface")}>
                  {card.title}
                </h3>
                <p className={cn("text-base sm:text-2xl font-medium leading-tight", active ? "text-primary/70" : "text-on-surface-variant")}>
                  {card.text}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 mt-6 sm:mt-10">
                  <span className={cn("flex h-3 w-3 sm:h-4 sm:w-4 rounded-full", active ? "bg-primary animate-pulse" : "bg-tertiary")} />
                  <span className={cn("font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs", active ? "text-primary" : "text-tertiary")}>
                    {active ? t('learn.playingAudio') : t('learn.readyToPlay')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <section className="bg-white p-6 sm:p-10 rounded-3xl shadow-sm border border-black/5 space-y-4">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-on-surface">{t('learn.askAI')}</h3>
            <p className="text-sm sm:text-base text-on-surface-variant font-medium">
              {t('learn.askAIDescription')}
            </p>
          </div>
        </div>

        <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t('learn.placeholder')}
            className="flex-1 h-12 sm:h-14 px-4 sm:px-6 rounded-2xl bg-surface-container-low text-on-surface font-bold placeholder:text-on-surface-variant/50 focus:ring-4 focus:ring-primary/20 outline-none"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="h-12 sm:h-14 px-5 sm:px-6 rounded-2xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition-transform"
          >
            {isAsking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            <span>{isAsking ? t('learn.thinking') : t('learn.ask')}</span>
          </button>
        </form>

        {askError && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
            {askError}
          </div>
        )}

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/5 p-4 sm:p-6 rounded-2xl border border-primary/10"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider">{t('learn.aiAnswer')}</p>
              <SpeechButton text={answer} speechLang={speechLang} ariaLabel={t('common.readAloud')} className="w-8 h-8 sm:w-9 sm:h-9" />
            </div>
            <p className="text-on-surface font-medium leading-relaxed whitespace-pre-wrap">{answer}</p>
          </motion.div>
        )}
      </section>

      <section className="text-center pb-8 sm:pb-12">
        <div className="inline-block p-8 sm:p-16 bg-surface-container-high rounded-[2rem] sm:rounded-[4rem] max-w-4xl shadow-2xl border border-white/50">
          <ShieldCheck className="w-12 h-12 sm:w-20 sm:h-20 text-tertiary mx-auto mb-4 sm:mb-8" />
          <h4 className="text-3xl sm:text-5xl font-black mb-4 sm:mb-6 tracking-tighter">{t('learn.doingGreat')}</h4>
          <p className="text-lg sm:text-2xl font-medium text-on-surface-variant mb-6 sm:mb-12 leading-tight">
            {t('learn.doingGreatDescription')}
          </p>
          <button
            onClick={() => {
              stopSpeaking();
              onFinish();
            }}
            className="bg-primary text-white text-lg sm:text-2xl font-black py-4 sm:py-8 px-8 sm:px-16 rounded-full shadow-2xl active:scale-95 transition-transform hover:shadow-primary/40"
          >
            {t('learn.finishGuide')}
          </button>
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const { t, lang } = useLanguage();
  const [currentScreen, setCurrentScreen] = useState<Screen>('check');
  const [audioOn, setAudioOn] = useState(true);
  const [scanImagePath, setScanImagePath] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleScan = (imagePath: string) => {
    setScanImagePath(imagePath);
    setAnalysisResult(null);
    setUserQuestion('');
    setCurrentScreen('question');
  };

  const handleAnalyze = async (question: string, mode: 'short' | 'detailed' = 'detailed') => {
    if (!scanImagePath || !user) return;
    setUserQuestion(question);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          imagePath: scanImagePath,
          question,
          language: lang,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('common.error'));
      }

      setAnalysisResult({
        extractedText: data.extractedText,
        analysisResult: data.analysisResult,
        savedPath: data.savedPath,
        healthScore: data.healthScore ?? null,
        healthReason: data.healthReason ?? '',
      });
      setCurrentScreen('results');
    } catch (err: any) {
      alert(err.message || t('common.error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleScanAnother = () => {
    setScanImagePath(null);
    setAnalysisResult(null);
    setUserQuestion('');
    setCurrentScreen('check');
  };

  const handleAskAnotherQuestion = () => {
    setAnalysisResult(null);
    setUserQuestion('');
    setCurrentScreen('question');
  };

  const handleHistorySelect = (record: HistoryRecord) => {
    setScanImagePath(record.imagePath);
    setUserQuestion(record.question);
    setAnalysisResult({
      extractedText: record.extractedText,
      analysisResult: record.analysisResult,
      savedPath: record.savedPath,
      healthScore: record.healthScore ?? null,
      healthReason: record.healthReason ?? '',
    });
    setCurrentScreen('results');
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'check': return <ScannerView onScan={handleScan} />;
      case 'question':
        return scanImagePath ? (
          <QuestionView
            imagePath={scanImagePath}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        ) : (
          <ScannerView onScan={handleScan} />
        );
      case 'results':
        return scanImagePath && analysisResult ? (
          <ResultsView
            imagePath={scanImagePath}
            question={userQuestion}
            result={analysisResult}
            onScanAnother={handleScanAnother}
            onAskAnother={handleAskAnotherQuestion}
          />
        ) : (
          <ScannerView onScan={handleScan} />
        );
      case 'learn': return <LearnView onFinish={() => setCurrentScreen('check')} />;
      case 'compare': return <CompareView onBack={() => setCurrentScreen('check')} />;
      case 'history': return <HistoryView onSelect={handleHistorySelect} />;
      case 'profile': return <ProfileScreen onBack={() => setCurrentScreen('check')} />;
      default: return <ScannerView onScan={handleScan} />;
    }
  };

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen pb-32">
      <Header 
        audioOn={audioOn} 
        setAudioOn={setAudioOn} 
        user={user}
        onProfileClick={() => setCurrentScreen('profile')}
      />
      
      <main className="pt-20 sm:pt-24 min-h-[calc(100vh-80px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-end px-2 sm:px-4 pb-4 sm:pb-8 pt-2 sm:pt-4 bg-white/90 backdrop-blur-xl border-t border-primary/10 rounded-t-3xl sm:rounded-t-[48px] shadow-[0_-10px_20px_rgba(0,0,0,0.05)] sm:shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
        <NavItem 
          icon={CheckCircle} 
          label={t('nav.check')} 
          active={currentScreen === 'check' || currentScreen === 'question' || currentScreen === 'results'} 
          onClick={() => {
            handleScanAnother();
            setCurrentScreen('check');
          }} 
        />
        <NavItem 
          icon={HistoryIcon} 
          label={t('nav.history')} 
          active={currentScreen === 'history'} 
          onClick={() => setCurrentScreen('history')} 
        />
        <NavItem 
          icon={GraduationCap} 
          label={t('nav.learn')} 
          active={currentScreen === 'learn'} 
          onClick={() => setCurrentScreen('learn')} 
        />
        <NavItem 
          icon={Scale} 
          label={t('nav.compare')} 
          active={currentScreen === 'compare'} 
          onClick={() => setCurrentScreen('compare')} 
        />
      </nav>
    </div>
  );
}
