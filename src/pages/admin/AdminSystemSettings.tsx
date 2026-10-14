import React, { useState, useEffect, useRef } from 'react';
import {
  Palette,
  Image as ImageIcon,
  Volume2,
  Video,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  Download,
  Upload,
  Play,
  Check,
  AlertCircle,
  Eye,
  Shield,
  Layers,
  Wand2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  CheckCircle2,
  UploadCloud,
  FileCode,
  Sun,
  Moon,
  Share2,
  Globe,
  Building2,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import AppLogo from '../../components/ui/AppLogo';
import {
  SystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  THEME_COLOR_PRESETS,
  fetchSystemSettings,
  saveSystemSettings,
  resetSystemSettings,
  applySystemSettingsToDom,
  playSystemSound,
} from '../../lib/systemSettingsService';

export default function AdminSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [activeTab, setActiveTab] = useState<'theme' | 'assets' | 'audio' | 'video' | 'general'>('theme');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [previewDeviceMode, setPreviewDeviceMode] = useState<'desktop' | 'mobile'>('desktop');

  // Asset Studio enhanced state
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<'all' | 'logo' | 'banner' | 'avatar' | 'browser'>('all');
  const [logoInputMode, setLogoInputMode] = useState<'upload' | 'url' | 'svg' | 'presets'>('upload');
  const [previewNavbarTheme, setPreviewNavbarTheme] = useState<'dark' | 'light'>('dark');
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  const importJsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSystemSettings().then((loaded) => {
      setSettings(loaded);
    });
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Live real-time preview on change
  const updateSettings = (updater: (prev: SystemSettings) => SystemSettings) => {
    setSettings((prev) => {
      const next = updater(prev);
      applySystemSettingsToDom(next);
      return next;
    });
  };

  // Apply theme preset
  const handleApplyPreset = (presetKey: string) => {
    const presetObj = THEME_COLOR_PRESETS[presetKey];
    if (!presetObj) return;

    updateSettings((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        ...presetObj.theme,
        preset: presetKey,
      },
    }));
    showToast('info', `Preset tema "${presetObj.label}" diterapkan ke pratinjau!`);
  };

  // Save to database
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const ok = await saveSystemSettings(settings);
      if (ok) {
        showToast('success', 'Pengaturan sistem level-max berhasil disimpan & diterapkan ke seluruh aplikasi!');
      } else {
        showToast('error', 'Gagal menyinkronkan ke server backend, namun tersimpan di browser lokal.');
      }
    } catch (err: any) {
      showToast('error', `Terjadi kesalahan: ${err.message || 'Gagal menyimpan'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (!window.confirm('Yakin ingin mereset seluruh pengaturan tema, warna, aset, dan suara ke default pabrik?')) {
      return;
    }
    const def = await resetSystemSettings();
    setSettings(def);
    showToast('info', 'Pengaturan sistem berhasil dikembalikan ke standar awal.');
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `loxer_system_settings_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('success', 'File konfigurasi sistem berhasil diekspor!');
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          updateSettings(() => parsed);
          showToast('success', 'Konfigurasi sistem berhasil diimpor & diterapkan!');
        }
      } catch (err) {
        showToast('error', 'File JSON tidak valid atau rusak.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Handle generic image upload to server storage / dataURL fallback
  const handleImageUpload = async (field: keyof SystemSettings['assets'], file: File) => {
    if (!file.type.startsWith('image/') && !file.name.endsWith('.svg')) {
      showToast('error', 'Berkas harus berupa gambar valid (PNG, JPG, SVG, WEBP).');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'Ukuran berkas maksimal 8MB.');
      return;
    }

    setUploadingField(String(field));

    // If it's an SVG file and user is editing appLogoUrl or appLogoSvgCode, read text as well
    if (file.name.endsWith('.svg') || file.type.includes('svg')) {
      const textReader = new FileReader();
      textReader.onload = (ev) => {
        const svgContent = ev.target?.result as string;
        if (svgContent && svgContent.includes('<svg')) {
          updateSettings((prev) => ({
            ...prev,
            assets: {
              ...prev.assets,
              appLogoSvgCode: svgContent,
            },
          }));
        }
      };
      textReader.readAsText(file);
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      if (!dataUri) {
        setUploadingField(null);
        return;
      }

      // 1. Instant local preview
      updateSettings((prev) => ({
        ...prev,
        assets: {
          ...prev.assets,
          [field]: dataUri,
        },
      }));

      // 2. Upload to storage endpoint for clean persistent URL
      try {
        const res = await fetch('/api/storage/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: dataUri,
            folder: 'branding',
            filenamePrefix: String(field).toLowerCase().replace(/url$/i, ''),
          }),
        });

        if (res.ok) {
          const payload = await res.json();
          if (payload?.ok && payload?.data?.url) {
            updateSettings((prev) => ({
              ...prev,
              assets: {
                ...prev.assets,
                [field]: payload.data.url,
              },
            }));
            showToast('success', `Aset ${String(field)} berhasil diunggah ke server!`);
            setUploadingField(null);
            return;
          }
        }
      } catch (err) {
        console.warn('Storage upload fallback to dataURI:', err);
      }

      setUploadingField(null);
      showToast('success', `Aset gambar berhasil dimuat ke pratinjau!`);
    };
    reader.readAsDataURL(file);
  };

  // Reset individual asset
  const handleResetAsset = (field: keyof SystemSettings['assets']) => {
    const defaultVal = (DEFAULT_SYSTEM_SETTINGS.assets as any)[field];
    updateSettings((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        [field]: defaultVal,
        ...(field === 'appLogoUrl' ? { appLogoSvgCode: '', appLogoHeight: 32 } : {}),
      },
    }));
    showToast('info', `Aset ${String(field)} dikembalikan ke pengaturan bawaan.`);
  };

  // Test sound effect
  const handleTestAudio = (type: 'chat' | 'applied' | 'alert' | 'success', customUrl?: string) => {
    setIsPlayingAudio(type);
    playSystemSound(type, customUrl, settings.audio.masterVolume);
    setTimeout(() => setIsPlayingAudio(null), 1200);
  };

  return (
    <GodModeLayout
      title="Pengaturan Sistem (Level Max)"
      description="Pusat kendali tema warna manual, aset media (gambar, logo, audio, video), identitas platform & mode pemeliharaan"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            title="Ekspor Konfigurasi JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ekspor JSON</span>
          </button>

          <button
            type="button"
            onClick={() => importJsonRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
            title="Impor Konfigurasi JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Impor JSON</span>
          </button>
          <input ref={importJsonRef} type="file" accept=".json" onChange={handleImportJson} className="hidden" />

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition"
            title="Reset ke Default Pabrik"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Default</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:scale-[1.02] disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 stroke-[2.5]" />}
            <span>Simpan & Terapkan Global</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast Notifikasi */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-md animate-fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-cyan-400" />
            )}
            <p className="text-xs font-bold">{toast.message}</p>
          </div>
        )}

        {/* Tab Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'theme'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>1. Warna & Tema Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'assets'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-emerald-400" />
            <span>2. Aset Gambar & Logo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'audio'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>3. Audio & Notifikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'video'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Video className="w-4 h-4 text-indigo-400" />
            <span>4. Video & Media Panduan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'general'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-rose-400" />
            <span>5. Identitas & Kontrol Sistem</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: WARNA & TEMA MANUAL */}
        {/* ========================================================================= */}
        {activeTab === 'theme' && (
          <div className="space-y-6">
            {/* Preset Palet Warna Siap Pakai */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span>Preset Palet Tema 1-Klik</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Pilih gaya visual yang dirancang khusus, atau sesuaikan warna manual di bawah ini.
                  </p>
                </div>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                  Preset Aktif: {THEME_COLOR_PRESETS[settings.theme.preset]?.label || 'Kustom Manual'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(THEME_COLOR_PRESETS).map(([key, item]) => {
                  const isSelected = settings.theme.preset === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleApplyPreset(key)}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/10'
                          : 'border-white/10 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950/90'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full border border-white/30 shadow-sm"
                            style={{ backgroundColor: item.badgeColor }}
                          />
                          <span className="text-xs font-bold text-white truncate">{item.label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Manual Color Editor & Live Preview Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Manual Color Pickers (7 Cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span>Kontrol Warna Halaman Manual (Level Max)</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">Nilai HEX / RGB Real-Time</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Primary Color */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Warna Utama (Primary Accent)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.primaryColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryColor: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryColor: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Primary Hover Color */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Warna Hover Utama</span>
                      <span className="font-mono text-cyan-400">{settings.theme.primaryHover}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.primaryHover}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryHover: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.primaryHover}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryHover: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Accent Cyan / Highlight */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Warna Highlight (Accent)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.accentCyan}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.accentCyan}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, accentCyan: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.accentCyan}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, accentCyan: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Glow Color */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Warna Glow Neon & Bayangan</span>
                      <span className="font-mono text-cyan-400">{settings.theme.glowColor}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={settings.theme.glowColor}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, glowColor: e.target.value, preset: 'custom' },
                          }))
                        }
                        placeholder="rgba(6, 182, 212, 0.40)"
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Background Light Start & End */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Latar Light Mode (Mulai)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.bgLightStart}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.bgLightStart}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgLightStart: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.bgLightStart}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgLightStart: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Latar Light Mode (Akhir)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.bgLightEnd}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.bgLightEnd}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgLightEnd: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.bgLightEnd}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgLightEnd: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Background Dark Start & End */}
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Latar Dark Mode (Mulai)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.bgDarkStart}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.bgDarkStart}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgDarkStart: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.bgDarkStart}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgDarkStart: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>Latar Dark Mode (Akhir)</span>
                      <span className="font-mono text-cyan-400">{settings.theme.bgDarkEnd}</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.theme.bgDarkEnd}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgDarkEnd: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="h-9 w-12 rounded-lg border border-white/20 bg-transparent cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={settings.theme.bgDarkEnd}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, bgDarkEnd: e.target.value, preset: 'custom' },
                          }))
                        }
                        className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Sandbox Preview (5 Cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span>Live UI Preview Sandbox</span>
                  </h3>
                  <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMode('desktop')}
                      className={`p-1.5 rounded-md transition ${
                        previewDeviceMode === 'desktop' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDeviceMode('mobile')}
                      className={`p-1.5 rounded-md transition ${
                        previewDeviceMode === 'mobile' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sandbox Card with dynamic applied styles */}
                <div
                  className="rounded-2xl border p-4 space-y-3.5 transition-all shadow-xl"
                  style={{
                    backgroundColor: settings.theme.surfaceDark,
                    borderColor: settings.theme.borderDark,
                    boxShadow: `0 10px 25px -5px ${settings.theme.glowColor}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full animate-pulse"
                        style={{ backgroundColor: settings.theme.accentCyan }}
                      />
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Pratinjau Komponen
                      </span>
                    </div>
                    <span
                      className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md"
                      style={{
                        backgroundColor: `${settings.theme.primaryColor}25`,
                        color: settings.theme.accentCyan,
                        border: `1px solid ${settings.theme.accentCyan}50`,
                      }}
                    >
                      LIVE TEMA
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Setiap tombol, border, dan gradasi di seluruh aplikasi langsung mengikuti nilai warna yang Anda tentukan di panel sebelah kiri.
                  </p>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white shadow-md transition hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(90deg, ${settings.theme.primaryColor}, ${settings.theme.accentCyan})`,
                        }}
                      >
                        Tombol Utama CTA
                      </button>
                      <button
                        type="button"
                        className="py-2 px-3 rounded-xl text-xs font-bold border transition"
                        style={{
                          borderColor: `${settings.theme.primaryColor}60`,
                          color: settings.theme.accentCyan,
                          backgroundColor: `${settings.theme.primaryColor}15`,
                        }}
                      >
                        Outline
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-xl p-2.5 bg-slate-950/70 border border-white/5">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Status Sistem</span>
                      <span
                        className="text-xs font-black uppercase"
                        style={{ color: settings.theme.accentCyan }}
                      >
                        ● Aktif & Sinkron
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ASET GAMBAR & LOGO (STUDIO LEVEL MAX) */}
        {/* ========================================================================= */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            {/* Header & Filter Kategori */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-cyan-400" />
                    <span>Studio Manajemen Aset & Logo (Level Max)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Ganti logo utama, logo footer, logo auth, favicon tab, banner hero, background modal, dan avatar kandidat secara manual atau unggah file baru.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-white/10">
                  {[
                    { key: 'all', label: 'Semua Aset' },
                    { key: 'logo', label: 'Logo & Brand' },
                    { key: 'browser', label: 'Browser & Favicon' },
                    { key: 'banner', label: 'Banner & Latar' },
                    { key: 'avatar', label: 'Avatar Pengguna' },
                  ].map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setAssetCategoryFilter(cat.key as any)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                        assetCategoryFilter === cat.key
                          ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* 1. MASTER LOGO SUITE (FEATURED SUITE) */}
            {/* =================================================================== */}
            {(assetCategoryFilter === 'all' || assetCategoryFilter === 'logo') && (
              <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-5 md:p-6 space-y-6 shadow-xl shadow-cyan-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>1. Logo Utama (Navbar Header, Sidebar, & Seluruh App)</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-semibold">
                          Aset Prioritas
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Atur logo identitas utama yang tampil di seluruh bilah navigasi pengguna, portal pelamar, perusahaan, dan admin.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetAsset('appLogoUrl')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition"
                      title="Kembalikan Logo Utama ke Bawaan"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Bawaan</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Live Logo Visual Display Box */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">Pratinjau Logo Langsung</span>
                      <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-white/10 text-[10px]">
                        <button
                          type="button"
                          onClick={() => setPreviewNavbarTheme('dark')}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition ${
                            previewNavbarTheme === 'dark' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Moon className="w-3 h-3" /> Gelap
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewNavbarTheme('light')}
                          className={`px-2 py-0.5 rounded flex items-center gap-1 font-semibold transition ${
                            previewNavbarTheme === 'light' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Sun className="w-3 h-3" /> Terang
                        </button>
                      </div>
                    </div>

                    <div
                      className={`h-40 rounded-2xl border transition-all flex flex-col items-center justify-center p-4 relative overflow-hidden ${
                        previewNavbarTheme === 'dark'
                          ? 'border-white/10 bg-slate-950 text-white'
                          : 'border-slate-300 bg-white text-slate-900 shadow-inner'
                      }`}
                    >
                      <div className="relative z-10 flex items-center justify-center scale-110">
                        <AppLogo variant="navbar" height={settings.assets.appLogoHeight || 32} />
                      </div>

                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] opacity-60">
                        <span>Tinggi: {settings.assets.appLogoHeight || 32}px</span>
                        <span>Mode: {settings.assets.appLogoDisplayMode || 'both'}</span>
                      </div>
                    </div>

                    {/* Mode Tampilan Selector */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">Mode Tampilan di Navigasi:</span>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950 border border-white/10 text-xs">
                        {[
                          { key: 'both', label: 'Logo + Teks' },
                          { key: 'image_only', label: 'Hanya Logo' },
                          { key: 'text_only', label: 'Hanya Teks' },
                        ].map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() =>
                              updateSettings((prev) => ({
                                ...prev,
                                assets: { ...prev.assets, appLogoDisplayMode: m.key as any },
                              }))
                            }
                            className={`py-1.5 px-2 rounded-lg font-semibold text-center transition ${
                              (settings.assets.appLogoDisplayMode || 'both') === m.key
                                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Height Slider */}
                    <div className="space-y-1.5 bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tinggi Ukuran Logo</span>
                        </span>
                        <span className="text-cyan-300 font-mono font-bold">
                          {settings.assets.appLogoHeight || 32}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={64}
                        step={2}
                        value={settings.assets.appLogoHeight || 32}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, appLogoHeight: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>20px (Kecil)</span>
                        <span>32px (Standar)</span>
                        <span>64px (Besar)</span>
                      </div>
                    </div>

                    {/* Custom Brand Text */}
                    <div className="space-y-1.5 bg-slate-950/60 border border-white/5 p-3 rounded-xl">
                      <label className="text-xs font-semibold text-slate-300 block">
                        Teks Nama Brand (di samping logo)
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: LOXER atau NAMA PERUSAHAAN"
                        value={settings.assets.appLogoText ?? 'LOXER'}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, appLogoText: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Right Column: Input Mode Switcher & Editors */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Method Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
                      {[
                        { key: 'upload', label: '1. Unggah Berkas Baru', icon: UploadCloud },
                        { key: 'url', label: '2. URL Gambar Manual', icon: ExternalLink },
                        { key: 'svg', label: '3. Kode Vektor SVG', icon: FileCode },
                        { key: 'presets', label: '4. Preset Logo Siap Pakai', icon: Wand2 },
                      ].map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => setLogoInputMode(item.key as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              logoInputMode === item.key
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/20'
                                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Mode 1: Drag & Drop File Upload */}
                    {logoInputMode === 'upload' && (
                      <div className="space-y-3">
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverField('appLogoUrl');
                          }}
                          onDragLeave={() => setDragOverField(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setDragOverField(null);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageUpload('appLogoUrl', file);
                          }}
                          className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                            dragOverField === 'appLogoUrl'
                              ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
                              : 'border-white/15 bg-slate-950/60 hover:border-cyan-400/50 hover:bg-slate-950'
                          }`}
                          onClick={() => {
                            const el = document.getElementById('logo-file-input');
                            if (el) el.click();
                          }}
                        >
                          <input
                            id="logo-file-input"
                            type="file"
                            accept="image/*,.svg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload('appLogoUrl', file);
                            }}
                          />
                          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center text-cyan-400 mb-3">
                            <UploadCloud className="w-6 h-6 animate-pulse" />
                          </div>
                          <p className="text-sm font-bold text-white mb-1">
                            {uploadingField === 'appLogoUrl'
                              ? 'Mengunggah & Memproses Logo...'
                              : 'Pilih Berkas atau Tarik ke Sini'}
                          </p>
                          <p className="text-xs text-slate-400 max-w-sm">
                            Mendukung berkas PNG transparan, SVG vektor, WEBP, atau JPG resolusi tinggi (maksimal 8MB).
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/30 transition">
                            <Upload className="w-3.5 h-3.5" /> Telusuri Berkas Komputer
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Manual URL */}
                    {logoInputMode === 'url' && (
                      <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                        <label className="text-xs font-semibold text-slate-300 block">
                          Tautan URL Gambar Logo
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://domain.com/logo.png atau /branding/icon64.png"
                            value={settings.assets.appLogoUrl}
                            onChange={(e) =>
                              updateSettings((prev) => ({
                                ...prev,
                                assets: { ...prev.assets, appLogoUrl: e.target.value, appLogoSvgCode: '' },
                              }))
                            }
                            className="flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                          />
                          {settings.assets.appLogoUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSettings((prev) => ({
                                  ...prev,
                                  assets: { ...prev.assets, appLogoUrl: '' },
                                }))
                              }
                              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                          <span>Saran cepat:</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateSettings((prev) => ({
                                ...prev,
                                assets: { ...prev.assets, appLogoUrl: '/branding/icon64.png', appLogoSvgCode: '' },
                              }))
                            }
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono"
                          >
                            /branding/icon64.png
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateSettings((prev) => ({
                                ...prev,
                                assets: { ...prev.assets, appLogoUrl: '/branding/icon32.png', appLogoSvgCode: '' },
                              }))
                            }
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 font-mono"
                          >
                            /branding/icon32.png
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Mode 3: Raw SVG Vector Code */}
                    {logoInputMode === 'svg' && (
                      <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-slate-300">
                            Tempel Kode SVG Vektor Murni (&lt;svg ...&gt;)
                          </label>
                          <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                            Resolusi Tajam Tanpa Batas
                          </span>
                        </div>
                        <textarea
                          rows={5}
                          placeholder="<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>...</svg>"
                          value={settings.assets.appLogoSvgCode || ''}
                          onChange={(e) =>
                            updateSettings((prev) => ({
                              ...prev,
                              assets: { ...prev.assets, appLogoSvgCode: e.target.value },
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-900 p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-400 resize-none"
                        />
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Kode SVG langsung diinjeksi secara aman ke navigasi.</span>
                          {settings.assets.appLogoSvgCode && (
                            <button
                              type="button"
                              onClick={() =>
                                updateSettings((prev) => ({
                                  ...prev,
                                  assets: { ...prev.assets, appLogoSvgCode: '' },
                                }))
                              }
                              className="text-rose-400 hover:underline"
                            >
                              Bersihkan Kode SVG
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mode 4: Presets Siap Pakai */}
                    {logoInputMode === 'presets' && (
                      <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-white/10">
                        {[
                          {
                            name: 'LOXER Cyan Cube',
                            type: 'url',
                            val: '/branding/icon64.png',
                            brand: 'LOXER',
                            desc: 'Kubus 3D Cyan khas LOXER',
                          },
                          {
                            name: 'Sapphire Hex Mark',
                            type: 'svg',
                            val: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><defs><linearGradient id="g-saph" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38BDF8"/><stop offset="100%" stop-color="#1D4ED8"/></linearGradient></defs><polygon points="50,8 90,32 90,72 50,94 10,72 10,32" fill="url(#g-saph)" stroke="#67E8F9" stroke-width="3"/><path d="M50 8 L50 94 M10 32 L90 72 M10 72 L90 32" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2"/><circle cx="50" cy="50" r="14" fill="#FFFFFF" fill-opacity="0.95"/></svg>`,
                            brand: 'SAPPHIRE',
                            desc: 'Vektor heksagonal safir modern',
                          },
                          {
                            name: 'Emerald Shield Tech',
                            type: 'svg',
                            val: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><defs><linearGradient id="g-emr" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#34D399"/><stop offset="100%" stop-color="#047857"/></linearGradient></defs><path d="M50 10 L86 24 L86 54 C86 74 50 92 50 92 C50 92 14 74 14 54 L14 24 Z" fill="url(#g-emr)" stroke="#A7F3D0" stroke-width="3"/><path d="M36 50 L46 62 L66 38" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
                            brand: 'EMERALD',
                            desc: 'Perisai hijau keamanan kerja',
                          },
                          {
                            name: 'Cyber Purple Nexus',
                            type: 'svg',
                            val: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="w-full h-full"><defs><linearGradient id="g-purp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#C084FC"/><stop offset="100%" stop-color="#6D28D9"/></linearGradient></defs><rect x="14" y="14" width="72" height="72" rx="22" fill="url(#g-purp)" stroke="#F472B6" stroke-width="3"/><polygon points="50,26 74,50 50,74 26,50" fill="#FFFFFF" fill-opacity="0.9"/></svg>`,
                            brand: 'CYBER',
                            desc: 'Futuristik ungu neon studio',
                          },
                        ].map((preset, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              if (preset.type === 'svg') {
                                updateSettings((prev) => ({
                                  ...prev,
                                  assets: {
                                    ...prev.assets,
                                    appLogoSvgCode: preset.val,
                                    appLogoUrl: '',
                                    appLogoText: preset.brand,
                                  },
                                }));
                              } else {
                                updateSettings((prev) => ({
                                  ...prev,
                                  assets: {
                                    ...prev.assets,
                                    appLogoUrl: preset.val,
                                    appLogoSvgCode: '',
                                    appLogoText: preset.brand,
                                  },
                                }));
                              }
                              showToast('success', `Preset "${preset.name}" diterapkan!`);
                            }}
                            className="p-3 rounded-xl border border-white/10 bg-slate-900/80 hover:border-cyan-400 hover:bg-slate-800 cursor-pointer transition flex items-center gap-3 group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center p-1.5 shrink-0 border border-white/10 group-hover:scale-105 transition">
                              {preset.type === 'svg' ? (
                                <div
                                  className="w-full h-full"
                                  dangerouslySetInnerHTML={{ __html: preset.val }}
                                />
                              ) : (
                                <img src={preset.val} alt={preset.name} className="w-full h-full object-contain" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                                {preset.name}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{preset.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Live Navbar Mockup Simulator */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Simulasi Tampilan Bilah Navigasi Pengguna (Live Navbar)</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Pratinjau Nyata</span>
                      </div>

                      <div
                        className={`rounded-2xl border p-3.5 transition-all flex items-center justify-between gap-4 overflow-x-auto ${
                          previewNavbarTheme === 'dark'
                            ? 'border-white/10 bg-[#0F172A] text-white shadow-xl shadow-cyan-950/20'
                            : 'border-slate-300 bg-white text-slate-900 shadow-md'
                        }`}
                      >
                        <div className="shrink-0 flex items-center">
                          <AppLogo variant="navbar" height={settings.assets.appLogoHeight || 32} />
                        </div>

                        <div className="hidden sm:flex items-center gap-4 text-xs font-medium">
                          <span className="text-cyan-400 font-semibold cursor-pointer">Iklan Loker</span>
                          <span className={previewNavbarTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                            Pelamar
                          </span>
                          <span className={previewNavbarTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                            Perusahaan
                          </span>
                          <span className={previewNavbarTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}>
                            Marketplace
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            type="button"
                            className="px-3 py-1 rounded-xl bg-cyan-400 text-slate-950 text-xs font-bold shadow-sm"
                          >
                            Masuk
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 2. LOGO SEGUNDER (FOOTER & AUTH MODAL) */}
            {/* =================================================================== */}
            {(assetCategoryFilter === 'all' || assetCategoryFilter === 'logo') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Logo Footer */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Logo Khusus Footer (Bagian Bawah)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('appLogoFooterUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="h-24 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-3">
                    <AppLogo variant="footer" height={28} />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Kosongkan untuk menyamakan dengan Logo Utama..."
                      value={settings.assets.appLogoFooterUrl || ''}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, appLogoFooterUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <span className="sr-only">Unggah File</span>
                        <input
                          type="file"
                          accept="image/*,.svg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload('appLogoFooterUrl', file);
                          }}
                          className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, appLogoFooterUrl: prev.assets.appLogoUrl },
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-semibold"
                        title="Salin dari Logo Utama"
                      >
                        Sama dg Logo Utama
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logo Auth Modal */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Logo Modal Auth / Login / Registrasi</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('appLogoAuthUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="h-24 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-3">
                    <AppLogo variant="auth" height={32} />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Kosongkan untuk menyamakan dengan Logo Utama..."
                      value={settings.assets.appLogoAuthUrl || ''}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, appLogoAuthUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <div className="flex items-center gap-2">
                      <label className="flex-1">
                        <span className="sr-only">Unggah File</span>
                        <input
                          type="file"
                          accept="image/*,.svg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload('appLogoAuthUrl', file);
                          }}
                          className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, appLogoAuthUrl: prev.assets.appLogoUrl },
                          }))
                        }
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] text-slate-300 font-semibold"
                        title="Salin dari Logo Utama"
                      >
                        Sama dg Logo Utama
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 3. BROWSER & SOCIAL MEDIA ASSETS */}
            {/* =================================================================== */}
            {(assetCategoryFilter === 'all' || assetCategoryFilter === 'browser') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Favicon Browser */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Favicon (Tab Browser Chrome/Edge/Firefox)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('appFaviconUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Chrome Tab Simulator */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                    <span className="text-[10px] text-slate-400 font-semibold block">Simulasi Tab Browser:</span>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-slate-800/90 border-t border-l border-r border-white/15 text-xs text-white max-w-xs shadow-sm">
                      <img
                        src={settings.assets.appFaviconUrl || '/branding/icon32.png'}
                        alt="Favicon"
                        className="w-4 h-4 object-contain rounded-sm shrink-0"
                      />
                      <span className="truncate font-medium">{settings.general.appName || 'LOXER'} — Bursa Kerja</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="URL Favicon (PNG/ICO/SVG)..."
                      value={settings.assets.appFaviconUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, appFaviconUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*,.ico,.svg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('appFaviconUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Social Share Card (Open Graph 1200x630) */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Social Share Thumbnail (OpenGraph WA/FB/Twitter)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('ogImageUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  {/* Social Preview Mockup */}
                  <div className="h-32 rounded-xl border border-white/10 bg-slate-950 overflow-hidden relative flex items-center justify-center">
                    {settings.assets.ogImageUrl ? (
                      <img
                        src={settings.assets.ogImageUrl}
                        alt="OG Share"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <Share2 className="w-6 h-6 text-slate-500 mx-auto mb-1" />
                        <span className="text-xs text-slate-400">Gambar 1200x630 untuk pratinjau tautan media sosial</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="URL Thumbnail Berbagi (1200x630)..."
                      value={settings.assets.ogImageUrl || ''}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, ogImageUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('ogImageUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 4. BANNER & LATAR BELAKANG */}
            {/* =================================================================== */}
            {(assetCategoryFilter === 'all' || assetCategoryFilter === 'banner') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hero Banner Beranda */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Banner Utama (Hero Beranda)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('heroBannerUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset Bawaan
                    </button>
                  </div>

                  <div className="h-32 rounded-xl border border-white/10 bg-slate-950 overflow-hidden relative flex items-center justify-center">
                    {settings.assets.heroBannerUrl ? (
                      <div className="w-full h-full relative">
                        <img
                          src={settings.assets.heroBannerUrl}
                          alt="Hero Banner"
                          className="w-full h-full object-cover"
                        />
                        <div
                          className="absolute inset-0 bg-slate-950"
                          style={{ opacity: (settings.assets.heroBannerOverlayOpacity ?? 40) / 100 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow">
                            Pratinjau Teks di Atas Banner
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-3 text-xs text-slate-500 italic">
                        Menggunakan latar gradien dinamis bawaan
                      </div>
                    )}
                  </div>

                  {/* Scrim Overlay Slider */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tingkat Kegelapan Overlay (Kontras Teks):</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {settings.assets.heroBannerOverlayOpacity ?? 40}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={90}
                      step={5}
                      value={settings.assets.heroBannerOverlayOpacity ?? 40}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: {
                            ...prev.assets,
                            heroBannerOverlayOpacity: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="URL Gambar Banner Hero..."
                      value={settings.assets.heroBannerUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, heroBannerUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('heroBannerUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Background Auth / Login Modal */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Background Auth / Modal Login</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('authBgUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset Bawaan
                    </button>
                  </div>

                  <div className="h-32 rounded-xl border border-white/10 bg-slate-950 overflow-hidden relative flex items-center justify-center">
                    {settings.assets.authBgUrl ? (
                      <div className="w-full h-full relative">
                        <img
                          src={settings.assets.authBgUrl}
                          alt="Auth Background"
                          className="w-full h-full object-cover"
                          style={{ filter: `blur(${settings.assets.authBgBlur || 0}px)` }}
                        />
                        <div className="absolute inset-0 bg-slate-950/40" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-white drop-shadow">
                            Pratinjau Kartu Dialog Login
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-3 text-xs text-slate-500 italic">
                        Menggunakan latar gelap frosted glass bawaan
                      </div>
                    )}
                  </div>

                  {/* Blur Slider */}
                  <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Efek Blur Latar Belakang:</span>
                      <span className="font-mono text-cyan-300 font-bold">
                        {settings.assets.authBgBlur || 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={16}
                      step={1}
                      value={settings.assets.authBgBlur || 0}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: {
                            ...prev.assets,
                            authBgBlur: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="URL Background Modal Login..."
                      value={settings.assets.authBgUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, authBgUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('authBgUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* 5. DEFAULT AVATARS & PLACEHOLDERS */}
            {/* =================================================================== */}
            {(assetCategoryFilter === 'all' || assetCategoryFilter === 'avatar') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Default Avatar Pelamar Pria */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Default Avatar Pelamar Pria</span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('defaultMaleAvatarUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="h-24 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-2">
                    <img
                      src={settings.assets.defaultMaleAvatarUrl || '/avatars/pixar_male_1.jpg'}
                      alt="Avatar Pria"
                      className="h-16 w-16 rounded-full object-cover border-2 border-cyan-400 shadow-md shadow-cyan-500/20"
                    />
                  </div>

                  {/* Pixar Male Presets */}
                  <div className="flex items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-white/5">
                    {[
                      { src: '/avatars/pixar_male_1.jpg', label: 'Pria 1' },
                      { src: '/avatars/pixar_male_2.jpg', label: 'Pria 2' },
                      { src: '/avatars/pixar_male_3.jpg', label: 'Pria 3' },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, defaultMaleAvatarUrl: p.src },
                          }))
                        }
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition ${
                          settings.assets.defaultMaleAvatarUrl === p.src
                            ? 'border-cyan-400 scale-105 shadow-sm shadow-cyan-400/50'
                            : 'border-white/15 opacity-60 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Path / URL Avatar..."
                      value={settings.assets.defaultMaleAvatarUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, defaultMaleAvatarUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('defaultMaleAvatarUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Default Avatar Pelamar Wanita */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Default Avatar Pelamar Wanita</span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('defaultFemaleAvatarUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="h-24 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-2">
                    <img
                      src={settings.assets.defaultFemaleAvatarUrl || '/avatars/pixar_female_1.jpg'}
                      alt="Avatar Wanita"
                      className="h-16 w-16 rounded-full object-cover border-2 border-rose-400 shadow-md shadow-rose-500/20"
                    />
                  </div>

                  {/* Pixar Female Presets */}
                  <div className="flex items-center justify-center gap-2 p-1.5 rounded-xl bg-slate-950 border border-white/5">
                    {[
                      { src: '/avatars/pixar_female_1.jpg', label: 'Wanita 1' },
                      { src: '/avatars/pixar_female_2.jpg', label: 'Wanita 2' },
                      { src: '/avatars/pixar_female_3.jpg', label: 'Wanita 3' },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          updateSettings((prev) => ({
                            ...prev,
                            assets: { ...prev.assets, defaultFemaleAvatarUrl: p.src },
                          }))
                        }
                        className={`w-9 h-9 rounded-full overflow-hidden border-2 transition ${
                          settings.assets.defaultFemaleAvatarUrl === p.src
                            ? 'border-rose-400 scale-105 shadow-sm shadow-rose-400/50'
                            : 'border-white/15 opacity-60 hover:opacity-100'
                        }`}
                        title={p.label}
                      >
                        <img src={p.src} alt={p.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Path / URL Avatar..."
                      value={settings.assets.defaultFemaleAvatarUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, defaultFemaleAvatarUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('defaultFemaleAvatarUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Default Logo Perusahaan */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Default Logo Perusahaan / Mitra</span>
                    <button
                      type="button"
                      onClick={() => handleResetAsset('defaultCompanyLogoUrl')}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="h-24 rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center p-2">
                    {settings.assets.defaultCompanyLogoUrl ? (
                      <img
                        src={settings.assets.defaultCompanyLogoUrl}
                        alt="Company Logo"
                        className="h-16 w-16 rounded-xl object-contain border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-400">
                        <Building2 className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-10">
                    <input
                      type="text"
                      placeholder="URL Logo Perusahaan..."
                      value={settings.assets.defaultCompanyLogoUrl || ''}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, defaultCompanyLogoUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('defaultCompanyLogoUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AUDIO & NOTIFIKASI */}
        {/* ========================================================================= */}
        {activeTab === 'audio' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Manajemen Efek Suara (Web Audio Synthesizer & File Custom)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Atur volume, nyalakan/matikan efek suara, dan dengarkan sampel audio notifikasi interaktif.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.audio.enabled}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          audio: { ...prev.audio, enabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-cyan-400 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-white">Efek Suara Aktif</span>
                  </label>
                </div>
              </div>

              {/* Master Volume Slider */}
              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">Master Volume Suara</span>
                  <span className="font-mono text-xs font-bold text-cyan-400">{settings.audio.masterVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.audio.masterVolume}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, masterVolume: parseInt(e.target.value) },
                    }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Sound Triggers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Chat Sound */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">1. Notifikasi Chat Masuk</span>
                    <button
                      type="button"
                      onClick={() => handleTestAudio('chat', settings.audio.chatSoundUrl)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        isPlayingAudio === 'chat'
                          ? 'bg-cyan-400 text-slate-950 border-cyan-400 animate-pulse'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Tes Suara</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Default: Two-tone Chime Synthesizer (atau masukkan URL MP3/WAV)..."
                    value={settings.audio.chatSoundUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        audio: { ...prev.audio, chatSoundUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                {/* 2. Job Applied Sound */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">2. Lamaran Terkirim (Apply Success)</span>
                    <button
                      type="button"
                      onClick={() => handleTestAudio('applied', settings.audio.appliedSoundUrl)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        isPlayingAudio === 'applied'
                          ? 'bg-emerald-400 text-slate-950 border-emerald-400 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Tes Suara</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Default: Triad Ascending Fanfare (atau masukkan URL MP3)..."
                    value={settings.audio.appliedSoundUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        audio: { ...prev.audio, appliedSoundUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                {/* 3. Alert Sound */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">3. Peringatan / Error Alert</span>
                    <button
                      type="button"
                      onClick={() => handleTestAudio('alert', settings.audio.alertSoundUrl)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        isPlayingAudio === 'alert'
                          ? 'bg-rose-400 text-slate-950 border-rose-400 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Tes Suara</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Default: Soft Warning Tone (atau URL audio)..."
                    value={settings.audio.alertSoundUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        audio: { ...prev.audio, alertSoundUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                </div>

                {/* 4. Match / Success Sound */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">4. Kesepakatan Kerja / Transaksi</span>
                    <button
                      type="button"
                      onClick={() => handleTestAudio('success', settings.audio.successSoundUrl)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition ${
                        isPlayingAudio === 'success'
                          ? 'bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Tes Suara</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Default: Major Fanfare (atau URL audio)..."
                    value={settings.audio.successSoundUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        audio: { ...prev.audio, successSoundUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: VIDEO & MEDIA PANDUAN */}
        {/* ========================================================================= */}
        {activeTab === 'video' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-indigo-400" />
                  <span>Manajemen Video Edukasi & Background Hero</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tautkan video onboarding (MP4 langsung atau YouTube Embed) untuk memandu pelamar dan mitra bisnis.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Onboarding Video Card */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Video Onboarding Pengguna Baru</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.video.showOnboardingVideo}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            video: { ...prev.video, showOnboardingVideo: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-cyan-400"
                      />
                      <span className="text-[11px] font-bold text-cyan-300">Tampilkan</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="URL Video (YouTube / Vimeo / MP4)..."
                    value={settings.video.onboardingVideoUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        video: { ...prev.video, onboardingVideoUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500"
                  />

                  {/* Video Player Preview */}
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
                    {settings.video.onboardingVideoUrl ? (
                      settings.video.onboardingVideoUrl.includes('youtube.com') || settings.video.onboardingVideoUrl.includes('youtu.be') ? (
                        <iframe
                          src={settings.video.onboardingVideoUrl.replace('watch?v=', 'embed/')}
                          title="Onboarding Video"
                          className="h-full w-full"
                          allowFullScreen
                        />
                      ) : (
                        <video src={settings.video.onboardingVideoUrl} controls className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <span>Pratinjau Video Akan Tampil Di Sini</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hero Loop Background Video */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Video Latar Belakang Hero (Looping)</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.video.enableHeroVideo}
                        onChange={(e) =>
                          updateSettings((prev) => ({
                            ...prev,
                            video: { ...prev.video, enableHeroVideo: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 rounded accent-cyan-400"
                      />
                      <span className="text-[11px] font-bold text-cyan-300">Aktifkan Loop</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    placeholder="URL Video MP4 Ringan..."
                    value={settings.video.heroBackgroundVideoUrl}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        video: { ...prev.video, heroBackgroundVideoUrl: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500"
                  />

                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
                    {settings.video.heroBackgroundVideoUrl ? (
                      <video
                        src={settings.video.heroBackgroundVideoUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 text-slate-500 text-xs">
                        <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <span>Hero Background Video Nonaktif</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: IDENTITAS & KONTROL SISTEM */}
        {/* ========================================================================= */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-rose-400" />
                  <span>Identitas Brand, Pengumuman & Mode Pemeliharaan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sesuaikan nama platform, informasi kontak resmi, teks pengumuman, dan mode maintenance.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* App Name */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nama Aplikasi / Platform</label>
                  <input
                    type="text"
                    value={settings.general.appName}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, appName: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Tagline */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Tagline / Slogan Resmi</label>
                  <input
                    type="text"
                    value={settings.general.appTagline}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, appTagline: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* WhatsApp Support */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nomor WhatsApp CS Admin</label>
                  <input
                    type="text"
                    placeholder="Contoh: 6281234567890"
                    value={settings.general.supportWhatsapp}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, supportWhatsapp: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* Email Support */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Email Bantuan Resmi</label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, supportEmail: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>

                {/* UI Animation Speed */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Kecepatan Animasi UI Global</label>
                  <select
                    value={settings.general.uiAnimationSpeed}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, uiAnimationSpeed: e.target.value as any },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  >
                    <option value="normal">Normal (Halus & Responsif)</option>
                    <option value="fast">Cepat (Ringan)</option>
                    <option value="off">Mati (Hemat Daya / No Animation)</option>
                  </select>
                </div>

                {/* Company Name */}
                <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3.5 space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Nama Perusahaan Pengelola</label>
                  <input
                    type="text"
                    value={settings.general.companyName}
                    onChange={(e) =>
                      updateSettings((prev) => ({
                        ...prev,
                        general: { ...prev.general, companyName: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Running Announcement Bar */}
              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Banner Teks Berjalan (Pengumuman Platform)</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.announcementEnabled}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, announcementEnabled: e.target.checked },
                        }))
                      }
                      className="h-4 w-4 rounded accent-cyan-400"
                    />
                    <span className="text-xs font-bold text-cyan-300">Tampilkan di Atas Navbar</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Ketik pengumuman atau info penting di sini..."
                  value={settings.general.announcementText}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      general: { ...prev.general, announcementText: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Maintenance Mode */}
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-rose-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Mode Pemeliharaan (Maintenance Mode)</p>
                      <p className="text-[11px] text-slate-400">
                        Kunci sementara akses publik. Hanya admin yang tetap dapat login.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.general.maintenanceMode}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, maintenanceMode: e.target.checked },
                        }))
                      }
                      className="h-5 w-5 rounded accent-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-rose-300">
                      {settings.general.maintenanceMode ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </label>
                </div>

                {settings.general.maintenanceMode && (
                  <div className="space-y-1.5 pt-2">
                    <label className="text-[11px] font-bold text-rose-300">Pesan Pemeliharaan untuk Pengunjung:</label>
                    <textarea
                      rows={2}
                      value={settings.general.maintenanceMessage}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          general: { ...prev.general, maintenanceMessage: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-rose-500/30 bg-slate-950 p-2.5 text-xs text-white"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
