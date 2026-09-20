// ==============================================================================
// LOXER Admin - Database Backup & Telegram Bot Integration
// ==============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Layers,
  HardDrive,
  Clock,
  Sparkles,
  AlertCircle,
  RefreshCw,
  X,
  Bot,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import {
  fetchDatabaseStats,
  generateBackupPackage,
  validateBackupJson,
  restoreBackupData,
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramMessage,
  sendTelegramBackup,
  TableEntityInfo,
  BackupPackage,
  TelegramConfig,
} from '../../lib/backupService';

export default function DatabaseBackup() {
  // DB Stats
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableEntityInfo[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalSizeBytes, setTotalSizeBytes] = useState(0);

  // Export state
  const [includeLogs, setIncludeLogs] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Restore state
  const [isDragging, setIsDragging] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState<{
    pkg: BackupPackage;
    summary: { tableCount: number; recordCount: number; tablesList: Array<{ name: string; count: number }> };
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Telegram state
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => getTelegramConfig());
  const [showToken, setShowToken] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isSendingBackupTelegram, setIsSendingBackupTelegram] = useState(false);

  // Toasts / Feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await fetchDatabaseStats();
      setTables(stats.tables);
      setTotalRecords(stats.totalRecords);
      setTotalSizeBytes(stats.totalSizeBytes);
    } catch {
      showToast('error', 'Gagal memuat status tabel database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Handle Export JSON
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const pkg = await generateBackupPackage(includeLogs);
      const jsonString = JSON.stringify(pkg, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LOXER_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('success', `Berhasil mengekspor ${pkg.metadata.total_records} record dari ${pkg.metadata.total_tables} tabel!`);
    } catch (err: unknown) {
      showToast('error', `Gagal mengekspor data: ${(err as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Input or Drop
  const handleFileContent = (content: string) => {
    const validation = validateBackupJson(content);
    if (!validation.valid || !validation.packageData || !validation.summary) {
      showToast('error', validation.error || 'Berkas JSON tidak valid.');
      return;
    }

    setRestoreModalData({
      pkg: validation.packageData,
      summary: validation.summary,
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleFileContent(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleFileContent(content);
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const executeRestore = async () => {
    if (!restoreModalData) return;
    setIsRestoring(true);
    try {
      const result = await restoreBackupData(restoreModalData.pkg);
      if (result.success) {
        showToast('success', `Berhasil memulihkan ${result.restoredRecords} record pada ${result.restoredTables} tabel!`);
        setRestoreModalData(null);
        await loadStats();
      } else {
        showToast('error', result.error || 'Gagal memulihkan database.');
      }
    } catch (err: unknown) {
      showToast('error', `Error pemulihan: ${(err as Error).message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  // Telegram Config handlers
  const handleSaveTelegram = () => {
    saveTelegramConfig(telegramConfig);
    showToast('success', 'Pengaturan bot Telegram berhasil disimpan.');
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    try {
      const res = await testTelegramMessage(telegramConfig.botToken, telegramConfig.chatId);
      if (res.ok) {
        showToast('success', res.message);
      } else {
        showToast('error', res.message);
      }
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleSendTelegramBackupManual = async () => {
    setIsSendingBackupTelegram(true);
    try {
      const pkg = await generateBackupPackage(telegramConfig.sendSummaryText);
      const res = await sendTelegramBackup(telegramConfig.botToken, telegramConfig.chatId, pkg);
      if (res.ok) {
        showToast('success', res.message);
        setTelegramConfig(getTelegramConfig());
      } else {
        showToast('error', res.message);
      }
    } catch (err: unknown) {
      showToast('error', `Gagal: ${(err as Error).message}`);
    } finally {
      setIsSendingBackupTelegram(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <GodModeLayout
      title="Backup Database & Telegram Integration"
      description="Ekspor dan impor data terstruktur, verifikasi integritas 22 tabel, dan sinkronisasi bot Telegram."
    >
      <div className="space-y-6">
        {/* Toast Feedback */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-2xl transition animate-in fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : toast.type === 'error'
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : 'bg-sky-500 text-white shadow-sky-500/20'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            {toast.type === 'info' && <Sparkles className="w-4 h-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Total Ukuran Data</p>
                <p className="mt-1 text-2xl font-bold text-white">{formatBytes(totalSizeBytes)}</p>
              </div>
              <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-400 border border-cyan-500/20">
                <HardDrive className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Estimasi payload SQLite offline</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Jumlah Tabel Database</p>
                <p className="mt-1 text-2xl font-bold text-white">{tables.length || 19}</p>
              </div>
              <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400 border border-purple-500/20">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Entitas skema terdaftar &amp; aktif</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Total Record Data</p>
                <p className="mt-1 text-2xl font-bold text-white">{totalRecords.toLocaleString('id-ID')}</p>
              </div>
              <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400 border border-emerald-500/20">
                <Database className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">Akun, loker, lamaran, notifikasi</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Status Bot Telegram</p>
                <p className="mt-1 text-2xl font-bold text-white flex items-center gap-2">
                  <span
                    className={`inline-block w-3 h-3 rounded-full ${
                      telegramConfig.enabled && telegramConfig.botToken ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  {telegramConfig.enabled && telegramConfig.botToken ? 'TERHUBUNG' : 'NONAKTIF'}
                </p>
              </div>
              <div className="rounded-xl bg-sky-500/10 p-3 text-sky-400 border border-sky-500/20">
                <Bot className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              {telegramConfig.lastBackupAt
                ? `Terakhir: ${new Date(telegramConfig.lastBackupAt).toLocaleDateString('id-ID')}`
                : 'Belum ada backup terkirim'}
            </p>
          </div>
        </div>

        {/* Section: Export & Import Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ekspor Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ekspor Data Lengkap</h3>
                  <p className="text-xs text-slate-400">Unduh seluruh koleksi tabel database ke satu berkas JSON terstruktur.</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Cakupan Entitas:</span>
                  <span className="font-semibold text-white">19 Tabel Relasional</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Record Siap Unduh:</span>
                  <span className="font-semibold text-cyan-400">{totalRecords} record</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Format Berkas:</span>
                  <span className="font-mono text-slate-400">.json (Schema v1)</span>
                </div>

                <hr className="border-slate-800 my-2" />

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white transition">
                  <input
                    type="checkbox"
                    checked={includeLogs}
                    onChange={(e) => setIncludeLogs(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Sertakan riwayat log sistem (diagnostic logs)</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={isExporting}
              onClick={handleExportBackup}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 active:scale-98 transition disabled:opacity-60 cursor-pointer"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{isExporting ? 'Membuat Arsip Backup...' : 'Unduh Berkas Backup (.json)'}</span>
            </button>
          </div>

          {/* Impor / Restore Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Impor &amp; Pulihkan Data</h3>
                  <p className="text-xs text-slate-400">Pulihkan tabel dari arsip cadangan dengan dialog safety preview.</p>
                </div>
              </div>

              {/* Drag and drop zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`mt-4 border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".json,application/json"
                  className="hidden"
                />
                <FileJson className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-sm font-medium text-white">Tarik &amp; lepas file .json di sini</p>
                <p className="text-xs text-slate-500 mt-1">atau klik untuk memilih berkas cadangan dari komputer</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Sistem akan menampilkan pratinjau verifikasi sebelum data dimasukkan ke SQLite.</span>
            </div>
          </div>
        </div>

        {/* Section: Telegram Bot Integration Form */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Integrasi Auto-Backup Bot Telegram</h3>
                <p className="text-xs text-slate-400">
                  Otomatisasi pengiriman berkas snapshot database ke grup, channel, atau chat privat Telegram.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramConfig.enabled}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600" />
              <span className="ml-3 text-xs font-semibold text-slate-300">
                {telegramConfig.enabled ? 'Otomasi Aktif' : 'Otomasi Nonaktif'}
              </span>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Telegram Bot Token (dari @BotFather):
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={telegramConfig.botToken}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                  placeholder="Contoh: 123456789:AAFxz_YourSecretTokenHere"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Token tersimpan lokal secara aman di browser.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Target Chat ID / Channel ID:
              </label>
              <input
                type="text"
                value={telegramConfig.chatId}
                onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                placeholder="Contoh: -100123456789 atau 987654321"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <p className="mt-1 text-[11px] text-slate-500">Dapatkan ID via @userinfobot atau @get_id_bot.</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Jadwal Jam Backup Harian:
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="time"
                  value={telegramConfig.backupTime}
                  onChange={(e) => setTelegramConfig({ ...telegramConfig, backupTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Pilihan Payload Telegram:</label>
              <div className="space-y-2 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={telegramConfig.sendDocument}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, sendDocument: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Kirim Berkas Dokumen Cadangan (.json)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={telegramConfig.sendSummaryText}
                    onChange={(e) => setTelegramConfig({ ...telegramConfig, sendSummaryText: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 cursor-pointer"
                  />
                  <span>Kirim Ringkasan Pesan Teks (KPI Statistik)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isTestingTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
                onClick={handleTestTelegram}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                {isTestingTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Uji Coba Kirim Pesan Tes</span>
              </button>

              <button
                type="button"
                disabled={isSendingBackupTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
                onClick={handleSendTelegramBackupManual}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isSendingBackupTelegram ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Kirim Backup ke Telegram Sekarang</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveTelegram}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-sky-500/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Section: Database Explorer Table */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Database Explorer (19 Entitas)</h3>
              <p className="text-xs text-slate-400">Rincian tabel SQLite lokal dan distribusi record aktif.</p>
            </div>
            <button
              type="button"
              onClick={loadStats}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800 tracking-wider">
                <tr>
                  <th className="px-5 py-3">Nama Tabel</th>
                  <th className="px-5 py-3">Deskripsi Data</th>
                  <th className="px-5 py-3 text-right">Jumlah Record</th>
                  <th className="px-5 py-3 text-right">Ukuran Estimasi</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {tables.map((t) => (
                  <tr key={t.name} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>{t.name}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-300 font-sans">
                      <span className="font-semibold text-slate-200">{t.label}:</span>{' '}
                      <span className="text-slate-400">{t.description}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold text-cyan-300">
                      {t.count.toLocaleString('id-ID')}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-400">
                      {formatBytes(t.sizeEstimateBytes)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          t.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Safety Preview Modal */}
        {restoreModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="relative w-full max-w-2xl rounded-2xl border border-purple-500/40 bg-slate-900 shadow-2xl p-6 text-white font-sans">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Safety Preview: Konfirmasi Pemulihan Data</h3>
                    <p className="text-xs text-slate-400">
                      Tinjau isi berkas cadangan sebelum data diterapkan ke SQLite lokal.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRestoreModalData(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="my-5 grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">Total Tabel</p>
                  <p className="text-lg font-bold text-white mt-0.5">{restoreModalData.summary.tableCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">Total Record</p>
                  <p className="text-lg font-bold text-cyan-400 mt-0.5">{restoreModalData.summary.recordCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <p className="text-xs text-slate-400">Tanggal Backup</p>
                  <p className="text-xs font-semibold text-slate-300 mt-1 truncate">
                    {new Date(restoreModalData.pkg.metadata.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>

              {/* Tables Breakdown */}
              <div className="my-4">
                <p className="text-xs font-medium text-slate-300 mb-2">Daftar Tabel yang Akan Dipulihkan:</p>
                <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-1.5 text-xs font-mono">
                  {restoreModalData.summary.tablesList.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-slate-300">
                      <span>• {item.name}</span>
                      <span className="text-cyan-400 font-semibold">{item.count} rows</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Perhatian: Data yang memiliki ID sama akan di-update (upsert), dan record baru akan ditambahkan tanpa
                  menghapus record unik lainnya.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRestoreModalData(null)}
                  disabled={isRestoring}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={executeRestore}
                  disabled={isRestoring}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition cursor-pointer disabled:opacity-60"
                >
                  {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>{isRestoring ? 'Sedang Memulihkan Data...' : 'Pulihkan Sekarang'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GodModeLayout>
  );
}
