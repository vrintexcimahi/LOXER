import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  VolumeX,
  Check,
  AlertCircle,
  Eye,
  Info,
  Shield,
  Layers,
  Wand2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  Monitor,
  Flame,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Handle generic image upload to dataURL
  const handleImageUpload = (field: keyof SystemSettings['assets'], file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('error', 'File harus berupa gambar (PNG, JPG, SVG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Ukuran gambar maksimal 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        updateSettings((prev) => ({
          ...prev,
          assets: {
            ...prev.assets,
            [field]: result,
          },
        }));
        showToast('success', `Aset gambar berhasil dimuat!`);
      }
    };
    reader.readAsDataURL(file);
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
        {/* TAB 2: ASET GAMBAR & LOGO */}
        {/* ========================================================================= */}
        {activeTab === 'assets' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>Manajemen Aset Gambar & Logo Seluruh App</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unggah file baru (PNG/SVG/JPG/WEBP) atau masukkan URL gambar eksternal untuk mengganti logo dan banner platform.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. App Logo Navbar */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">1. Logo Utama (Navbar Header)</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    {settings.assets.appLogoUrl ? (
                      <img src={settings.assets.appLogoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <img src="/branding/icon32.png" alt="LOXER" className="h-8 w-8 object-contain" />
                        <span className="font-extrabold text-white text-base">LOXER</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL Gambar / Path Logo..."
                      value={settings.assets.appLogoUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, appLogoUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                    <label className="block">
                      <span className="sr-only">Upload File</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('appLogoUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 2. Favicon Browser */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">2. Favicon (Tab Browser)</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={settings.assets.appFaviconUrl || '/branding/icon32.png'}
                      alt="Favicon"
                      className="h-10 w-10 object-contain shadow-md"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL Favicon..."
                      value={settings.assets.appFaviconUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, appFaviconUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
                    />
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload('appFaviconUrl', file);
                        }}
                        className="block w-full text-[10px] text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Hero Banner Beranda */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">3. Banner Utama (Hero Beranda)</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    {settings.assets.heroBannerUrl ? (
                      <img src={settings.assets.heroBannerUrl} alt="Hero" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">Menggunakan Gradient Bawaan</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL Banner Hero..."
                      value={settings.assets.heroBannerUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, heroBannerUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
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

                {/* 4. Background Auth / Login Modal */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">4. Background Auth / Login Modal</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    {settings.assets.authBgUrl ? (
                      <img src={settings.assets.authBgUrl} alt="Auth BG" className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-xs text-slate-500 italic">Gradient Standar</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="URL Background Login..."
                      value={settings.assets.authBgUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, authBgUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
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

                {/* 5. Default Avatar Pelamar Pria */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">5. Default Avatar Kandidat Pria</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={settings.assets.defaultMaleAvatarUrl || '/avatars/pixar_male_1.jpg'}
                      alt="Male Avatar"
                      className="h-16 w-16 rounded-full object-cover border-2 border-cyan-400 shadow-md"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Path Avatar Pria..."
                      value={settings.assets.defaultMaleAvatarUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, defaultMaleAvatarUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
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

                {/* 6. Default Avatar Pelamar Wanita */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
                  <span className="text-xs font-bold text-white">6. Default Avatar Kandidat Wanita</span>
                  <div className="h-24 rounded-xl border border-white/10 bg-slate-900/80 flex items-center justify-center overflow-hidden p-2">
                    <img
                      src={settings.assets.defaultFemaleAvatarUrl || '/avatars/pixar_female_1.jpg'}
                      alt="Female Avatar"
                      className="h-16 w-16 rounded-full object-cover border-2 border-rose-400 shadow-md"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Path Avatar Wanita..."
                      value={settings.assets.defaultFemaleAvatarUrl}
                      onChange={(e) =>
                        updateSettings((prev) => ({
                          ...prev,
                          assets: { ...prev.assets, defaultFemaleAvatarUrl: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500"
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
              </div>
            </div>
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
