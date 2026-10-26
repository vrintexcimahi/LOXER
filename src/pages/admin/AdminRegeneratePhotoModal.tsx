import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Upload,
  RefreshCw,
  Check,
  X,
  Sliders,
  CheckCircle2,
  Wand2,
  Camera,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import {
  detectGender,
  getDefaultPixarAvatar,
} from '../../lib/avatarService';
import { enhancePortraitCanvas } from '../../lib/cvImageProcessor';
import { ToastType } from './AdminTalentComponents';

interface AdminRegeneratePhotoModalProps {
  talent: TalentMarketplacePost | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedTalent: TalentMarketplacePost) => void;
  onToast: (type: ToastType, message: string) => void;
}

export function AdminRegeneratePhotoModal({
  talent,
  isOpen,
  onClose,
  onSuccess,
  onToast,
}: AdminRegeneratePhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'recrop'>('upload');
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [customFilePreview, setCustomFilePreview] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [cropZoom, setCropZoom] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived candidate details
  const fullName = useMemo(() => {
    if (!talent) return 'Kandidat';
    return talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat';
  }, [talent]);

  const currentPhoto = useMemo(() => {
    if (!talent) return '';
    return talent.photo_url || talent.seeker_profiles?.photo_url || '';
  }, [talent]);

  const detectedGender = useMemo(() => {
    if (!talent) return 'male';
    return detectGender(fullName, undefined, talent.bio);
  }, [talent, fullName]);

  const hasCvDocumentImage = useMemo(() => {
    if (!talent?.portfolio_url) return false;
    return (
      talent.portfolio_url.startsWith('data:image') ||
      /\.(png|jpe?g|webp)($|\?)/i.test(talent.portfolio_url)
    );
  }, [talent]);

  // Reset state when talent changes or modal opens
  useEffect(() => {
    if (isOpen && talent) {
      setSelectedPhoto(currentPhoto || getDefaultPixarAvatar(fullName, undefined, talent.bio));
      setCustomFilePreview(null);
      setRotationAngle(0);
      setCropZoom(1);
      setActiveTab(hasCvDocumentImage ? 'recrop' : 'upload');
    }
  }, [isOpen, talent, currentPhoto, fullName, hasCvDocumentImage]);

  if (!isOpen || !talent) return null;

  // Handle File Upload from Admin PC
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onToast('error', 'File harus berupa gambar (JPG, PNG, atau WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      onToast('error', 'Ukuran gambar maksimal 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomFilePreview(result);
        setSelectedPhoto(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Enhance Selected Custom Photo with Studio Canvas Filter
  const handleEnhancePhoto = async () => {
    if (!selectedPhoto) return;
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.naturalWidth, img.naturalHeight, 800);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        // Center Crop 1:1
        const startX = (img.naturalWidth - size) / 2;
        const startY = (img.naturalHeight - size) / 2;
        ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);

        // Apply Unsharp Masking & Vibrancy Boost
        enhancePortraitCanvas(ctx, size, size, {
          contrastBoost: 1.20,
          vibrancyBoost: 1.15,
          sharpenStrength: 0.70,
        });

        const enhancedUrl = canvas.toDataURL('image/jpeg', 0.92);
        setSelectedPhoto(enhancedUrl);
        setIsProcessing(false);
        onToast('success', 'Foto profil berhasil ditingkatkan ketajaman & warnanya!');
      };
      img.onerror = () => {
        setIsProcessing(false);
        onToast('error', 'Gagal memproses peningkatan gambar.');
      };
      img.src = selectedPhoto;
    } catch (err) {
      setIsProcessing(false);
      console.error(err);
    }
  };

  // Re-crop from CV document with interactive rotation / zoom
  const handleCropFromCv = () => {
    if (!talent.portfolio_url) return;
    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 500;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        const natW = img.naturalWidth;
        const natH = img.naturalHeight;

        // Crop top portion of the CV where passport photos usually reside
        // Apply admin zoom and rotation
        const boxDim = Math.min(natW, natH) * (0.45 / cropZoom);
        const startX = Math.max(0, (natW - boxDim) / 2);
        const startY = Math.max(0, natH * 0.05); // usually top 5-25%

        ctx.save();
        if (rotationAngle !== 0) {
          ctx.translate(size / 2, size / 2);
          ctx.rotate((rotationAngle * Math.PI) / 180);
          ctx.drawImage(img, startX, startY, boxDim, boxDim, -size / 2, -size / 2, size, size);
        } else {
          ctx.drawImage(img, startX, startY, boxDim, boxDim, 0, 0, size, size);
        }
        ctx.restore();

        enhancePortraitCanvas(ctx, size, size, {
          contrastBoost: 1.15,
          vibrancyBoost: 1.10,
          sharpenStrength: 0.50,
        });

        const resultUrl = canvas.toDataURL('image/jpeg', 0.92);
        setSelectedPhoto(resultUrl);
        setIsProcessing(false);
        onToast('success', 'Berhasil mengekstrak pas foto baru dari dokumen CV!');
      } catch {
        setIsProcessing(false);
        onToast('error', 'Gagal memproses potongan foto dari CV.');
      }
    };
    img.onerror = () => {
      setIsProcessing(false);
      onToast('error', 'Gagal memuat dokumen CV untuk pemotongan foto.');
    };
    img.src = talent.portfolio_url;
  };

  // Save changes to database (talent_marketplace_posts & seeker_profiles)
  const handleSave = async () => {
    if (!selectedPhoto) {
      onToast('error', 'Pilih atau unggah foto terlebih dahulu.');
      return;
    }

    if (!supabase) {
      onToast('error', 'Koneksi database tidak tersedia.');
      return;
    }

    setIsSaving(true);
    try {
      const nowIso = new Date().toISOString();

      const isArchived = Number(talent.is_archived) === 1;

      // 1. Update talent_marketplace_posts (auto unarchive and publish once valid photo is provided)
      const { error: talentError } = await supabase
        .from('talent_marketplace_posts')
        .update({
          photo_url: selectedPhoto,
          is_archived: 0,
          is_published: 1,
          archive_reason: '',
          updated_at: nowIso,
        })
        .eq('id', talent.id);

      if (talentError) throw talentError;

      // 2. Update seeker_profiles if seeker_id exists
      if (talent.seeker_id) {
        const { error: seekerError } = await supabase
          .from('seeker_profiles')
          .update({
            photo_url: selectedPhoto,
            updated_at: nowIso,
          })
          .eq('id', talent.seeker_id);

        if (seekerError) {
          console.warn('[AdminRegeneratePhoto] Seeker profile update note:', seekerError.message);
        }
      }

      // Build updated talent object
      const updatedTalent: TalentMarketplacePost = {
        ...talent,
        photo_url: selectedPhoto,
        is_archived: 0,
        is_published: 1,
        archive_reason: '',
        seeker_profiles: talent.seeker_profiles
          ? {
              ...talent.seeker_profiles,
              photo_url: selectedPhoto,
            }
          : undefined,
      };

      onSuccess(updatedTalent);
      onToast(
        'success',
        isArchived
          ? `Foto profil ${fullName} berhasil diperbarui & otomatis dipulihkan ke Bursa Publik!`
          : `Foto profil ${fullName} berhasil diperbarui & disimpan!`
      );
      onClose();
    } catch (err: unknown) {
      console.error('[AdminRegeneratePhoto Error]:', err);
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      onToast('error', `Gagal menyimpan foto profil: ${errMsg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const isCurrentPhotoEqualSelected = selectedPhoto === currentPhoto;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-6 rounded-3xl border border-cyan-500/30 bg-slate-900 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 shadow-inner">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-300">
                  ADMIN TOOL
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {talent.category}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Regenerate Foto Profil: <span className="text-cyan-300">{fullName}</span>
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Live Side-by-Side Comparison Preview */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-6">
              {/* Foto Lama */}
              <div className="flex flex-col items-center text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Foto Saat Ini (Sebelumnya)
                </span>
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-md">
                  <img
                    src={currentPhoto || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                    alt="Foto Saat Ini"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(
                        fullName,
                        undefined,
                        talent.bio
                      );
                    }}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-[9px] font-bold text-slate-300 py-0.5 text-center">
                    Original
                  </div>
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="flex flex-col items-center justify-center text-cyan-400">
                <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 animate-spin text-cyan-300" style={{ animationDuration: '6s' }} />
                </div>
                <span className="text-[10px] font-bold text-cyan-300 mt-1">Regenerasi</span>
              </div>

              {/* Foto Baru yang Dipilih */}
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Hasil Foto Baru (Pratinjau)
                  </span>
                  {!isCurrentPhotoEqualSelected && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold px-1.5 py-0.5 border border-emerald-500/40">
                      Berubah
                    </span>
                  )}
                </div>
                <div className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-2xl overflow-hidden border-2 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-4 ring-cyan-500/10">
                  <img
                    src={selectedPhoto || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                    alt="Pratinjau Foto Baru"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(
                        fullName,
                        undefined,
                        talent.bio
                      );
                    }}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-cyan-950/90 text-[9px] font-black text-cyan-300 py-0.5 text-center border-t border-cyan-500/40 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-cyan-300" />
                    Siap Diterapkan
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Bar under preview */}
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Gender Terdeteksi:</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold capitalize ${
                    detectedGender === 'female'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {detectedGender === 'female' ? '♀ Wanita' : '♂ Pria'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleEnhancePhoto}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-300 transition disabled:opacity-50"
                  title="Tingkatkan kontras, ketajaman, dan kecerahan foto"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>✨ Auto-Enhance HD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'upload'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>1. Unggah Pas Foto Baru</span>
            </button>

            {hasCvDocumentImage && (
              <button
                type="button"
                onClick={() => setActiveTab('recrop')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                  activeTab === 'recrop'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4 text-indigo-400" />
                <span>2. Re-Crop dari Berkas CV</span>
              </button>
            )}
          </div>

          {/* TAB 2: UPLOAD CUSTOM PHOTO */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Unggah pas foto formal baru (format JPG atau PNG) dari perangkat admin.
              </p>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/60 hover:bg-slate-950/90 p-8 text-center transition space-y-3 group"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Klik untuk memilih file pas foto</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Format file JPG, PNG, atau WEBP. Rekomendasi rasio 1:1 atau pas foto resmi 3x4 / 4x6.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {customFilePreview && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-emerald-400/40 shrink-0">
                      <img src={customFilePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300">Foto Baru Berhasil Dimuat</p>
                      <p className="text-[10px] text-slate-400">Siap diterapkan ke profil kandidat.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleEnhancePhoto}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Auto-Tajamkan</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RE-CROP CV */}
          {activeTab === 'recrop' && hasCvDocumentImage && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Ekstrak ulang pas foto dari dokumen CV kandidat dengan pengaturan rotasi sudut dan pembesaran (zoom).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Sudut Rotasi:</span>
                      <span className="text-cyan-400 font-mono">{rotationAngle}°</span>
                    </label>
                    <div className="flex items-center gap-2 mt-2">
                      {[0, 90, 180, 270].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => setRotationAngle(deg)}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition ${
                            rotationAngle === deg
                              ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                              : 'border-white/10 bg-slate-900 text-slate-400 hover:text-white'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                      <span>Perbesaran (Zoom):</span>
                      <span className="text-cyan-400 font-mono">{cropZoom.toFixed(1)}x</span>
                    </label>
                    <input
                      type="range"
                      min="0.8"
                      max="2.5"
                      step="0.1"
                      value={cropZoom}
                      onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                      className="w-full mt-2 accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCropFromCv}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Potong Ulang dari CV</span>
                  </button>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950 p-2 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 mb-2">Pratinjau Dokumen CV Sumber:</span>
                  <div className="max-h-56 overflow-hidden rounded-lg border border-white/10">
                    <img
                      src={talent.portfolio_url}
                      alt="CV Sumber"
                      className="max-h-56 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-white/10 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Batal
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !selectedPhoto}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Terapkan Foto Profil Baru</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
