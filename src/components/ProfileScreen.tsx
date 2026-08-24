import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { User, Mail, LogOut, ShieldCheck, ArrowLeft, Upload, Image as ImageIcon, X, Loader2, Star } from 'lucide-react';
import { cn, imageSrc } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface ProfileScreenProps {
  onBack: () => void;
}

function getUserFolder(user: { id: string }): string {
  return user.id;
}

export default function ProfileScreen({ onBack }: ProfileScreenProps) {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const [images, setImages] = useState<{ url: string; rating: number | null }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/images/${encodeURIComponent(getUserFolder(user))}`);
      if (res.ok) {
        const data = await res.json();
        setImages(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleLogout = () => {
    logout();
    onBack();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    setError('');

    try {
      const dataUrl = await readFileAsDataURL(selectedFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: getUserFolder(user),
          filename: selectedFile.name,
          data: dataUrl,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || t('scanner.uploadFailed'));
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadImages();
    } catch (e: any) {
      setError(e.message || t('scanner.failedSave'));
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRate = async (imageUrl: string, rating: number) => {
    try {
      const res = await fetch('/api/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, rating }),
      });
      if (!res.ok) throw new Error('Failed to save rating');
      setImages((prev) =>
        prev.map((img) => (img.url === imageUrl ? { ...img, rating } : img))
      );
    } catch {
      // silently fail
    }
  };

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 pb-24 sm:pb-32 px-4 sm:px-6 max-w-2xl mx-auto w-full min-h-[calc(100vh-80px)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full space-y-5 sm:space-y-8"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant font-bold hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          {t('common.back')}
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-28 h-28 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/20">
            {initials}
          </div>
          <div>
            <h2 className="text-4xl font-black text-on-surface tracking-tight">{user?.name}</h2>
            <p className="text-lg text-on-surface-variant font-medium mt-1">{user?.email}</p>
          </div>
          <div className="flex items-center gap-2 bg-tertiary/10 text-tertiary px-4 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-bold uppercase tracking-wider">{t('profile.verifiedAccount')}</span>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center gap-5">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{t('profile.fullName')}</p>
              <p className="text-xl font-bold text-on-surface">{user?.name}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 flex items-center gap-5">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{t('profile.emailAddress')}</p>
              <p className="text-xl font-bold text-on-surface">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-on-surface">{t('profile.myPictures')}</h3>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium">{t('profile.myPicturesDescription')}</p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!selectedFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-14 sm:h-20 rounded-xl sm:rounded-2xl border-2 border-dashed border-primary/30 flex items-center justify-center gap-2 sm:gap-3 text-primary font-bold hover:bg-primary/5 transition-colors text-sm sm:text-base"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              {t('profile.choosePicture')}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-black/5">
                <img src={previewUrl!} alt={t('common.previewAlt')} className="w-full h-40 sm:h-48 object-cover" />
                <button
                  onClick={clearSelection}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={cn(
                    'flex-1 h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-95',
                    uploading && 'opacity-70 cursor-not-allowed'
                  )}
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  {uploading ? t('profile.uploading') : t('profile.uploadPicture')}
                </button>
                <button
                  onClick={clearSelection}
                  disabled={uploading}
                  className="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Gallery */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {images.map((img) => (
                <div key={img.url} className="relative aspect-square rounded-2xl overflow-hidden border border-black/5 bg-surface-container-low">
                  <img src={imageSrc(img.url)} alt={t('common.uploadedAlt')} className="w-full h-full object-cover" />
                  <div className="absolute inset-x-0 top-0 p-2 sm:p-3 flex justify-center">
                    <div className="flex flex-col items-center gap-1 bg-black/70 backdrop-blur-sm rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-lg">
                      <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider">
                        {img.rating ? t('profile.rating', { rating: img.rating }) : t('profile.rateProduct')}
                      </span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRate(img.url, star)}
                            className="p-0.5 focus:outline-none"
                            aria-label={t('profile.rateStarAria', { star })}
                          >
                            <Star
                              className={cn(
                                'w-6 h-6 sm:w-7 sm:h-7 transition-colors drop-shadow-md',
                                (img.rating ?? 0) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-white/70'
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'w-full h-12 sm:h-16 rounded-xl sm:rounded-2xl bg-red-50 text-red-600 text-lg sm:text-xl font-bold flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-95 hover:bg-red-100 border border-red-100'
          )}
        >
          <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
          {t('common.signOut')}
        </button>
      </motion.div>
    </div>
  );
}
