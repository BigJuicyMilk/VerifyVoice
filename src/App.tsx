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
  Sparkles,
  MessageCircle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  RotateCcw
} from 'lucide-react';
import { cn } from './lib/utils';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './components/ProfileScreen';

// --- Types ---
type Screen = 'check' | 'question' | 'results' | 'history' | 'learn' | 'profile';

interface AnalysisResult {
  extractedText: string;
  analysisResult: string;
  savedPath: string;
}

interface HistoryRecord {
  timestamp: string;
  imagePath: string;
  question: string;
  extractedText: string;
  analysisResult: string;
  savedPath: string;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
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
        <h1 className="font-bold text-lg sm:text-2xl tracking-tighter text-primary">Verify Voice</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <button 
          onClick={() => setAudioOn(!audioOn)}
          className={cn(
            "flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full text-white font-bold transition-all active:scale-95 shadow-lg",
            audioOn ? "bg-primary" : "bg-secondary-container"
          )}
        >
          {audioOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          <span className="tracking-widest text-xs sm:text-sm uppercase hidden sm:inline">Audio {audioOn ? 'On' : 'Off'}</span>
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

  const startCamera = useCallback(async () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
        setCameraError('Camera permission denied. Please allow camera access and refresh.');
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setCameraError('This camera is not available on this device.');
      } else {
        setCameraError('Could not access camera: ' + err.message);
      }
    }
  }, [facingMode]);

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
      setUploadError('You must be logged in to save scans.');
      setIsScanning(false);
      return;
    }

    const folderName = user.id;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

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
        if (!res.ok) throw new Error('Upload failed');
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
          if (!res.ok) throw new Error('Upload failed');
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save image. Please try again.');
      setIsScanning(false);
      return;
    }

    setTimeout(() => {
      setIsScanning(false);
      const folderName = user ? user.id : 'anonymous';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const path = selectedFile
        ? `/uploads/${folderName}/${selectedFile.name}`
        : `/uploads/${folderName}/scan_${timestamp}.jpg`;
      onScan(path);
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <div className="text-center mb-4 sm:mb-10">
        <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">Check a Product</h2>
        <p className="text-base sm:text-xl font-medium text-on-surface-variant max-w-2xl mx-auto px-2 sm:px-0">
          Point your camera at an ingredient list to ask questions about what's inside.
        </p>
      </div>

      <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-surface-container-highest group">
        {/* Hidden canvas for capturing video frames */}
        <canvas ref={canvasRef} className="hidden" />

        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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
              Retry Camera
            </button>
          </div>
        ) : (
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

            {/* Flip Camera Button */}
            <button
              onClick={flipCamera}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-12 sm:h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors z-20"
              title="Flip camera"
            >
              <FlipHorizontal className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-8 bg-black/20">
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
                <p className="text-white font-bold text-sm sm:text-lg">Align label within the frame</p>
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
                  <p className="text-lg sm:text-xl font-black text-on-surface">Scanning...</p>
                </div>
              </motion.div>
            )}
          </>
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
            <span className="text-lg sm:text-2xl font-bold">Scan Now</span>
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
            <span>Upload from Device</span>
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
            <h3 className="text-xl sm:text-2xl font-black text-yellow-900 mb-1 sm:mb-2">Trouble scanning?</h3>
            <p className="text-base sm:text-lg text-yellow-800">Check your product manually by typing its name below.</p>
          </div>
          <div className="bg-surface-container-low p-5 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-3 sm:gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Oat Milk"
                className="w-full h-12 sm:h-16 bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 text-base sm:text-xl border-none focus:ring-4 focus:ring-primary/20"
              />
              <Search className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <button className="h-12 sm:h-16 w-full rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl bg-white border-2 border-primary/10 text-primary hover:bg-primary/5 transition-colors">
              Search Manually
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
  onAnalyze: (question: string) => void;
  isAnalyzing: boolean;
}) => {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAnalyzing) return;
    onAnalyze(question.trim());
  };

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full space-y-4 sm:space-y-6"
      >
        <div className="text-center">
          <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">Ask About the Ingredients</h2>
          <p className="text-base sm:text-xl font-medium text-on-surface-variant max-w-2xl mx-auto px-2 sm:px-0">
            We have captured the ingredient list. Ask anything about what's inside.
          </p>
        </div>

        {/* Scanned Image Preview */}
        <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-surface-container-highest">
          <img src={imagePath} alt="Scanned product" className="w-full h-full object-cover" />
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-primary text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider">
            Ingredient List
          </div>
        </div>

        {/* Question Input */}
        <form onSubmit={handleSubmit} className="w-full space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Does this contain palm oil?"
              className="flex-1 h-12 sm:h-16 bg-white rounded-xl sm:rounded-2xl px-4 sm:px-6 text-base sm:text-xl font-bold text-on-surface placeholder:text-on-surface-variant/40 border-none focus:ring-4 focus:ring-primary/20 transition-all shadow-sm"
              disabled={isAnalyzing}
            />
            <button
              type="submit"
              disabled={!question.trim() || isAnalyzing}
              className={cn(
                'h-12 sm:h-16 px-6 sm:px-8 rounded-xl sm:rounded-2xl bg-primary text-white font-bold text-base sm:text-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg whitespace-nowrap',
                (!question.trim() || isAnalyzing) && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isAnalyzing ? (
                <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
                  Analyze
                </>
              )}
            </button>
          </div>

          {/* Quick suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {['Does it contain palm oil?', 'Is it gluten-free?', 'Any allergens?', 'Is it vegan?'].map((q) => (
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
}) => (
  <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-8">
    {/* Header */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-primary-container text-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl flex items-center justify-between shadow-2xl overflow-hidden relative"
    >
      <div className="space-y-1 z-10">
        <span className="text-on-primary-container text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">AI Analysis Complete</span>
        <h2 className="text-2xl sm:text-4xl font-black">Here is the Answer</h2>
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
        <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider">Your Question</p>
      </div>
      <p className="text-lg sm:text-2xl font-bold text-on-surface">{question}</p>
    </motion.div>

    {/* AI Answer */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-gradient-to-br from-primary to-primary-container text-white p-5 sm:p-10 rounded-2xl sm:rounded-3xl shadow-2xl"
    >
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-black uppercase tracking-widest opacity-80">AI Analysis</p>
          <h3 className="text-2xl sm:text-3xl font-black">Expert Verdict</h3>
        </div>
      </div>
      <div className="text-base sm:text-xl font-medium leading-relaxed whitespace-pre-wrap">
        {result.analysisResult}
      </div>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
      {/* Extracted Ingredients / Nutrients */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-3xl shadow-sm border border-black/5 flex flex-col h-full ring-1 ring-black/5"
      >
        <div className="flex justify-between items-start mb-4 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            <h4 className="text-2xl sm:text-3xl font-black">Extracted Ingredients</h4>
          </div>
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
          <h4 className="text-2xl sm:text-3xl font-black">Product Image</h4>
        </div>
        <div className="mt-auto">
          <img
            src={imagePath}
            alt="Scanned product"
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
        Ask Another Question
      </button>
      <button
        onClick={onScanAnother}
        className="bg-primary text-white px-6 sm:px-10 py-3 sm:py-5 rounded-full text-base sm:text-xl font-bold hover:bg-primary-container transition-all active:scale-95 shadow-lg inline-flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-center"
      >
        <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
        Scan Another Product
      </button>
    </motion.div>
  </div>
);

const HistoryView = ({
  onSelect,
}: {
  onSelect: (record: HistoryRecord) => void;
}) => {
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
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setRecords(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin mb-4" />
        <p className="text-lg sm:text-xl font-bold text-on-surface-variant">Loading your history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <HistoryIcon className="w-16 h-16 sm:w-24 sm:h-24 text-red-200 mb-6 sm:mb-8" />
        <h2 className="text-3xl sm:text-4xl font-black mb-3 sm:mb-4">Could Not Load History</h2>
        <p className="text-base sm:text-xl text-on-surface-variant mb-5 sm:mb-6">{error}</p>
        <button
          onClick={loadHistory}
          className="bg-primary text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-bold flex items-center gap-2 active:scale-95 transition-transform"
        >
          <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          Try Again
        </button>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] px-6 sm:px-10 text-center">
        <HistoryIcon className="w-16 h-16 sm:w-24 sm:h-24 text-primary/20 mb-6 sm:mb-8" />
        <h2 className="text-3xl sm:text-4xl font-black mb-3 sm:mb-4">No History Yet</h2>
        <p className="text-base sm:text-xl text-on-surface-variant">Products you scan will appear here.</p>
      </div>
    );
  }

  return (
    <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
      <div className="text-center mb-5 sm:mb-8">
        <h2 className="text-3xl sm:text-5xl font-black leading-tight text-on-surface mb-2 sm:mb-4">Your Scan History</h2>
        <p className="text-base sm:text-xl font-medium text-on-surface-variant px-2 sm:px-0">
          Review your past ingredient-list checks.
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
                  alt="Scanned product"
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
                      <p className="text-xs sm:text-sm font-black text-primary uppercase tracking-wider mb-2">AI Answer</p>
                      <p className="text-base sm:text-lg font-medium text-on-surface whitespace-pre-wrap">{record.analysisResult}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl sm:rounded-2xl p-4 sm:p-5">
                      <p className="text-xs sm:text-sm font-black text-on-surface-variant uppercase tracking-wider mb-2">Extracted Ingredients</p>
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

const LearnView = () => (
  <div className="pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-8 sm:space-y-12">
    <div className="flex items-center gap-3 sm:gap-6 p-4 sm:p-8 bg-surface-container-low rounded-2xl sm:rounded-3xl border-l-[8px] sm:border-l-[12px] border-primary animate-pulse">
      <Mic className="w-7 h-7 sm:w-10 sm:h-10 text-primary flex-shrink-0" />
      <p className="text-base sm:text-2xl font-bold text-primary italic leading-tight">Reading this guide aloud for you...</p>
    </div>

    <section>
      <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-on-surface leading-none tracking-tighter mb-4 sm:mb-6">
        How to spot <br className="hidden sm:block"/><span className="text-primary italic font-serif">a fake.</span>
      </h2>
      <p className="text-xl sm:text-3xl text-on-surface-variant max-w-2xl leading-tight font-medium">
        Stay safe by knowing the signs of a voice scam. We've made it simple to hear and learn.
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
      {[
        { 
          id: '01', 
          title: 'Too Good to be True', 
          color: 'bg-surface-container-high', 
          text: 'If someone offers you free money or prizes over the phone, it is almost always a scam. Scammers use excitement to stop you from thinking clearly.',
          iconColor: 'bg-primary'
        },
        { 
          id: '02', 
          title: 'Hidden Fees', 
          color: 'bg-secondary-fixed', 
          text: 'Requests for "processing fees" or "shipping costs" before you get your prize are a huge red flag. Legitimate companies don\'t ask for payment like this.',
          iconColor: 'bg-secondary'
        },
        { 
          id: '03', 
          title: 'Urgent Tone', 
          color: 'bg-primary-fixed', 
          text: 'Scammers create a "crisis" to make you act fast. "Your bank account is locked" or "You owe taxes." Take a deep breath. Real companies give you time.',
          fullWidth: true,
          isUrgent: true,
          iconColor: 'bg-primary'
        },
        { 
          id: '04', 
          title: 'Unusual Payment', 
          color: 'bg-surface-container-highest', 
          text: 'Be wary if someone asks for payment via Gift Cards, Wire Transfers, or Cryptocurrency. These are nearly impossible to trace or get back.',
          iconColor: 'bg-primary'
        },
        { 
          id: '05', 
          title: 'Impersonation', 
          color: 'bg-white border-2 border-primary/5', 
          text: 'They might sound like your grandson or a police officer. AI can mimic voices. Always hang up and call the person back on their known number.',
          iconColor: 'bg-primary-container'
        }
      ].map((card) => (
        <div 
          key={card.id} 
          className={cn(
            "group relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-10 flex flex-col justify-between min-h-[280px] sm:min-h-[450px] transition-all hover:shadow-2xl hover:-translate-y-2",
            card.color,
            card.fullWidth && "md:col-span-2 md:flex-row md:items-center gap-12"
          )}
        >
          <div className={cn("absolute top-0 right-0 p-4 sm:p-8", card.fullWidth && "relative md:order-last p-0")}>
            <div className={cn(
              "w-14 h-14 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer",
              card.isUrgent ? "bg-white" : card.iconColor
            )}>
              {card.isUrgent ? <Pause className="w-7 h-7 sm:w-12 sm:h-12 text-primary" /> : <Play className="w-7 h-7 sm:w-12 sm:h-12 text-white" />}
            </div>
          </div>
          <div className="flex-1">
            <span className="inline-block px-3 sm:px-5 py-1 sm:py-1.5 bg-primary/10 text-primary font-black rounded-full mb-4 sm:mb-8 uppercase tracking-widest text-xs sm:text-sm">Signal {card.id}</span>
            <h3 className={cn("text-3xl sm:text-5xl font-black mb-3 sm:mb-6 leading-none tracking-tighter", card.isUrgent ? "text-primary" : "text-on-surface")}>
              {card.title}
            </h3>
            <p className={cn("text-base sm:text-2xl font-medium leading-tight", card.isUrgent ? "text-primary/70" : "text-on-surface-variant")}>
              {card.text}
            </p>
            <div className="flex items-center gap-2 sm:gap-3 mt-6 sm:mt-10">
              <span className={cn("flex h-3 w-3 sm:h-4 sm:w-4 rounded-full", card.isUrgent ? "bg-primary animate-pulse" : "bg-tertiary")} />
              <span className={cn("font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs", card.isUrgent ? "text-primary" : "text-tertiary")}>
                {card.isUrgent ? "Voice analysis active" : "Ready to play"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    <section className="text-center pb-8 sm:pb-12">
      <div className="inline-block p-8 sm:p-16 bg-surface-container-high rounded-[2rem] sm:rounded-[4rem] max-w-4xl shadow-2xl border border-white/50">
        <ShieldCheck className="w-12 h-12 sm:w-20 sm:h-20 text-tertiary mx-auto mb-4 sm:mb-8" />
        <h4 className="text-3xl sm:text-5xl font-black mb-4 sm:mb-6 tracking-tighter">You are doing great.</h4>
        <p className="text-lg sm:text-2xl font-medium text-on-surface-variant mb-6 sm:mb-12 leading-tight">
          Learning these simple rules makes you a harder target for scammers. Knowledge is your best shield.
        </p>
        <button className="bg-primary text-white text-lg sm:text-2xl font-black py-4 sm:py-8 px-8 sm:px-16 rounded-full shadow-2xl active:scale-95 transition-transform hover:shadow-primary/40">
          Finish Guide
        </button>
      </div>
    </section>
  </div>
);

// --- Main App ---

export default function App() {
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

  const handleAnalyze = async (question: string) => {
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysisResult({
        extractedText: data.extractedText,
        analysisResult: data.analysisResult,
        savedPath: data.savedPath,
      });
      setCurrentScreen('results');
    } catch (err: any) {
      alert(err.message || 'Analysis failed. Please try again.');
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
      case 'learn': return <LearnView />;
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
          label="Check" 
          active={currentScreen === 'check' || currentScreen === 'question' || currentScreen === 'results'} 
          onClick={() => {
            handleScanAnother();
            setCurrentScreen('check');
          }} 
        />
        <NavItem 
          icon={HistoryIcon} 
          label="History" 
          active={currentScreen === 'history'} 
          onClick={() => setCurrentScreen('history')} 
        />
        <NavItem 
          icon={GraduationCap} 
          label="Learn" 
          active={currentScreen === 'learn'} 
          onClick={() => setCurrentScreen('learn')} 
        />
      </nav>
    </div>
  );
}
