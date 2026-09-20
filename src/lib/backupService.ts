// ==============================================================================
// LOXER Database Backup & Telegram Bot Service
// ==============================================================================

import { supabase } from './supabase';

export interface TableEntityInfo {
  name: string;
  label: string;
  description: string;
  count: number;
  sizeEstimateBytes: number;
  status: 'active' | 'empty';
}

export interface BackupMetadata {
  app: string;
  backup_version: string;
  created_at: string;
  schema_version: string;
  total_tables: number;
  total_records: number;
  include_logs: boolean;
}

export interface BackupPackage {
  metadata: BackupMetadata;
  tables: Record<string, unknown[]>;
  logs?: unknown[];
}

export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
  backupTime: string;
  sendDocument: boolean;
  sendSummaryText: boolean;
  lastBackupAt?: string;
  lastStatus?: 'success' | 'failed' | 'idle';
  lastMessage?: string;
}

const TELEGRAM_CONFIG_KEY = 'loxer_telegram_backup_config_v1';

export const ALL_TABLE_DEFINITIONS: Array<{ name: string; label: string; description: string }> = [
  { name: 'users', label: 'Akun Pengguna', description: 'Kredensial email dan password hash pengguna' },
  { name: 'users_meta', label: 'Metadata Pengguna', description: 'Role, status suspend, dan waktu pembuatan' },
  { name: 'seeker_profiles', label: 'Profil Pencari Kerja', description: 'Data pribadi, kontak, bio, dan domisili seeker' },
  { name: 'seeker_education', label: 'Riwayat Pendidikan', description: 'Data institusi, gelar, dan tahun kelulusan' },
  { name: 'seeker_experience', label: 'Pengalaman Kerja', description: 'Riwayat karir, posisi, perusahaan, dan periode' },
  { name: 'seeker_skills', label: 'Keahlian Pelamar', description: 'Daftar skill dan tingkat kemahiran seeker' },
  { name: 'companies', label: 'Profil Perusahaan', description: 'Nama bisnis, legalitas, industri, dan verifikasi' },
  { name: 'company_members', label: 'Anggota Perusahaan', description: 'Relasi anggota tim pengelola perusahaan' },
  { name: 'job_listings', label: 'Lowongan Kerja', description: 'Daftar lowongan, deskripsi, gaji, dan status aktif' },
  { name: 'applications', label: 'Lamaran Kerja', description: 'Data pengajuan lamaran dan status penerimaan' },
  { name: 'interview_invitations', label: 'Undangan Interview', description: 'Jadwal, tautan meet, dan lokasi wawancara' },
  { name: 'notifications', label: 'Notifikasi Sistem', description: 'Pemberitahuan status lamaran dan pengumuman' },
  { name: 'pages', label: 'CMS Halaman Web', description: 'Data tata letak Puck visual editor homepage' },
  { name: 'audit_logs', label: 'Jejak Audit Admin', description: 'Rekam aktivitas sensitif yang dilakukan admin' },
  { name: 'feature_flags', label: 'Feature Flags', description: 'Pengaturan toggle fitur dan rollout platform' },
  { name: 'moderation_queue', label: 'Antrean Moderasi', description: 'Review konten berbahaya dan skor risiko AI' },
  { name: 'broadcast_campaigns', label: 'Kampanye Broadcast', description: 'Jadwal siaran notifikasi massal pengguna' },
  { name: 'ip_blocks', label: 'Blokir IP Address', description: 'Daftar IP terindikasi penyerangan/dibatasi' },
  { name: 'admin_sessions', label: 'Sesi Login Admin', description: 'Jejak login dan autentikasi aktif administrator' },
  { name: 'user_devices', label: 'Perangkat Pengguna', description: 'Registry device intelligence, OS, browser, dan fingerprint' },
  { name: 'user_preferences', label: 'Preferensi Pengguna', description: 'Pengaturan tema, bahasa, densitas, dan navigasi user' },
  { name: 'user_activity_logs', label: 'Log Aktivitas Pengguna', description: 'Rekam aktivitas login, navigasi, dan interaksi device' },
];

export async function fetchDatabaseStats(): Promise<{
  tables: TableEntityInfo[];
  totalRecords: number;
  totalSizeBytes: number;
}> {
  const result: TableEntityInfo[] = [];
  let totalRecords = 0;
  let totalSizeBytes = 0;

  for (const def of ALL_TABLE_DEFINITIONS) {
    try {
      const { data, count } = await supabase.from(def.name).select('*', { count: 'exact' });
      const recordCount = typeof count === 'number' ? count : (Array.isArray(data) ? data.length : 0);
      const jsonString = JSON.stringify(data || []);
      const sizeBytes = new TextEncoder().encode(jsonString).length;

      totalRecords += recordCount;
      totalSizeBytes += sizeBytes;

      result.push({
        name: def.name,
        label: def.label,
        description: def.description,
        count: recordCount,
        sizeEstimateBytes: sizeBytes,
        status: recordCount > 0 ? 'active' : 'empty',
      });
    } catch {
      result.push({
        name: def.name,
        label: def.label,
        description: def.description,
        count: 0,
        sizeEstimateBytes: 0,
        status: 'empty',
      });
    }
  }

  return { tables: result, totalRecords, totalSizeBytes };
}

export async function generateBackupPackage(includeLogs = true): Promise<BackupPackage> {
  const tablesData: Record<string, unknown[]> = {};
  let totalRecords = 0;

  for (const def of ALL_TABLE_DEFINITIONS) {
    try {
      const { data } = await supabase.from(def.name).select('*');
      const rows = Array.isArray(data) ? data : [];
      tablesData[def.name] = rows;
      totalRecords += rows.length;
    } catch {
      tablesData[def.name] = [];
    }
  }

  let logsData: unknown[] = [];
  if (includeLogs && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('loxer_system_logs_v1');
      if (raw) logsData = JSON.parse(raw) as unknown[];
    } catch {
      // ignore
    }
  }

  const pkg: BackupPackage = {
    metadata: {
      app: 'LOXER',
      backup_version: '1.0',
      created_at: new Date().toISOString(),
      schema_version: '2026-09-18-local-v1',
      total_tables: Object.keys(tablesData).length,
      total_records: totalRecords,
      include_logs: includeLogs,
    },
    tables: tablesData,
    logs: logsData,
  };

  return pkg;
}

export function validateBackupJson(content: string): {
  valid: boolean;
  packageData?: BackupPackage;
  error?: string;
  summary?: { tableCount: number; recordCount: number; tablesList: Array<{ name: string; count: number }> };
} {
  try {
    const parsed = JSON.parse(content) as BackupPackage;
    if (!parsed || typeof parsed !== 'object' || !parsed.tables || typeof parsed.tables !== 'object') {
      return { valid: false, error: 'Berkas JSON tidak memiliki struktur database LOXER yang valid.' };
    }

    const tablesList: Array<{ name: string; count: number }> = [];
    let recordCount = 0;

    for (const [tableName, rows] of Object.entries(parsed.tables)) {
      if (Array.isArray(rows)) {
        tablesList.push({ name: tableName, count: rows.length });
        recordCount += rows.length;
      }
    }

    return {
      valid: true,
      packageData: parsed,
      summary: {
        tableCount: tablesList.length,
        recordCount,
        tablesList,
      },
    };
  } catch (err: unknown) {
    return { valid: false, error: `Format JSON korup: ${(err as Error).message}` };
  }
}

export async function restoreBackupData(pkg: BackupPackage): Promise<{ success: boolean; restoredTables: number; restoredRecords: number; error?: string }> {
  try {
    let restoredTables = 0;
    let restoredRecords = 0;

    for (const [tableName, rows] of Object.entries(pkg.tables)) {
      if (Array.isArray(rows) && rows.length > 0) {
        // Upsert rows into table
        for (const row of rows) {
          await supabase.from(tableName).upsert(row, { onConflict: 'id' });
          restoredRecords += 1;
        }
        restoredTables += 1;
      }
    }

    // Also restore logs if included
    if (pkg.logs && Array.isArray(pkg.logs) && typeof window !== 'undefined') {
      localStorage.setItem('loxer_system_logs_v1', JSON.stringify(pkg.logs));
      window.dispatchEvent(new CustomEvent('loxer:system-log-change', { detail: { count: pkg.logs.length } }));
    }

    return { success: true, restoredTables, restoredRecords };
  } catch (err: unknown) {
    return { success: false, restoredTables: 0, restoredRecords: 0, error: (err as Error).message };
  }
}

// ---------------------------------------------------------------------------
// Telegram Bot Integration
// ---------------------------------------------------------------------------

export function getTelegramConfig(): TelegramConfig {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      botToken: '',
      chatId: '',
      backupTime: '23:59',
      sendDocument: true,
      sendSummaryText: true,
      lastStatus: 'idle',
    };
  }

  try {
    const raw = localStorage.getItem(TELEGRAM_CONFIG_KEY);
    if (!raw) {
      return {
        enabled: false,
        botToken: '',
        chatId: '',
        backupTime: '23:59',
        sendDocument: true,
        sendSummaryText: true,
        lastStatus: 'idle',
      };
    }
    return JSON.parse(raw) as TelegramConfig;
  } catch {
    return {
      enabled: false,
      botToken: '',
      chatId: '',
      backupTime: '23:59',
      sendDocument: true,
      sendSummaryText: true,
      lastStatus: 'idle',
    };
  }
}

export function saveTelegramConfig(config: TelegramConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TELEGRAM_CONFIG_KEY, JSON.stringify(config));
}

export async function testTelegramMessage(token: string, chatId: string): Promise<{ ok: boolean; message: string }> {
  if (!token.trim() || !chatId.trim()) {
    return { ok: false, message: 'Token Bot dan Chat ID wajib diisi.' };
  }

  try {
    const url = `https://api.telegram.org/bot${encodeURIComponent(token.trim())}/sendMessage`;
    const now = new Date().toLocaleString('id-ID', { timeZoneName: 'short' });
    const text = `🔔 *LOXER Telegram Bot Verification*\n\nKoneksi berhasil! Bot siap menerima notifikasi dan berkas backup berkala.\n\n📅 Waktu Uji: ${now}\n🚀 Platform: LOXER Offline SQLite Engine`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      return { ok: true, message: 'Pesan tes berhasil dikirim ke Telegram!' };
    }
    return { ok: false, message: data.description || 'Gagal mengirim pesan via Telegram API.' };
  } catch (err: unknown) {
    return { ok: false, message: `Koneksi gagal: ${(err as Error).message}` };
  }
}

export async function sendTelegramBackup(
  token: string,
  chatId: string,
  pkg: BackupPackage
): Promise<{ ok: boolean; message: string }> {
  if (!token.trim() || !chatId.trim()) {
    return { ok: false, message: 'Token Bot dan Chat ID belum dikonfigurasi.' };
  }

  const jsonString = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = `LOXER_BACKUP_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const sizeKb = (blob.size / 1024).toFixed(1);
  const now = new Date().toLocaleString('id-ID', { timeZoneName: 'short' });

  try {
    // 1. Send Document
    const formData = new FormData();
    formData.append('chat_id', chatId.trim());
    formData.append('document', blob, filename);
    formData.append(
      'caption',
      `📦 *LOXER Database Backup Snapshot*\n\n📅 Tanggal: ${now}\n📊 Total Entitas: ${pkg.metadata.total_tables} Tabel\n📝 Total Record: ${pkg.metadata.total_records}\n💾 Ukuran File: ${sizeKb} KB\n🔐 Versi Skema: ${pkg.metadata.schema_version}`
    );
    formData.append('parse_mode', 'Markdown');

    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token.trim())}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      // Update config last backup
      const config = getTelegramConfig();
      config.lastBackupAt = new Date().toISOString();
      config.lastStatus = 'success';
      config.lastMessage = `Backup berhasil dikirim (${sizeKb} KB)`;
      saveTelegramConfig(config);

      return { ok: true, message: `Backup dokumen berhasil dikirim ke Telegram (${sizeKb} KB)!` };
    }

    const config = getTelegramConfig();
    config.lastStatus = 'failed';
    config.lastMessage = data.description || 'Gagal mengirim dokumen backup.';
    saveTelegramConfig(config);

    return { ok: false, message: data.description || 'Gagal mengirim dokumen backup ke Telegram.' };
  } catch (err: unknown) {
    const errorMsg = (err as Error).message;
    const config = getTelegramConfig();
    config.lastStatus = 'failed';
    config.lastMessage = errorMsg;
    saveTelegramConfig(config);

    return { ok: false, message: `Gagal mengirim dokumen: ${errorMsg}` };
  }
}
