// ==============================================================================
// LOXER Talent Archive Service
// Layanan Pengarsipan Otomatis Biodata Pelamar Tanpa Foto Profil
// ==============================================================================

import { TalentMarketplacePost } from './types';
import { supabase } from './supabase';
import { resolveAdminToken } from './adminUtils';

export const AUTO_ARCHIVE_STORAGE_KEY = 'loxer_auto_archive_no_photo_enabled';

/**
 * Cek apakah pelamar TIDAK memiliki pas foto profil asli:
 * Mengembalikan true jika foto kosong, null, atau menggunakan profil avatar (kartun, pixar, dicebear, placeholder, dll.).
 * Sesuai aturan: biodata yang menggunakan profil avatar WAJIB diarsip semua.
 */
export function isCandidateMissingPhoto(
  talent: Partial<TalentMarketplacePost> | null | undefined
): boolean {
  if (!talent) return true;
  const rawPhoto = (talent.photo_url || talent.seeker_profiles?.photo_url || '').trim();
  const photo = rawPhoto.toLowerCase();

  // 1. Kosong atau null
  if (!photo) return true;

  // 2. Terdeteksi merupakan avatar / pixar / placeholder / dicebear / kartun
  if (
    photo.includes('avatar') ||
    photo.includes('pixar') ||
    photo.includes('dicebear') ||
    photo.includes('placeholder') ||
    photo.includes('default_avatar') ||
    photo.includes('illustration') ||
    photo.includes('cartoon')
  ) {
    return true;
  }

  // 3. Wajib merupakan foto asli nyata: data:image/ (crop CV) atau URL eksternal CDN valid
  const isRealBase64 = photo.startsWith('data:image/');
  const isRealHttpUrl = photo.startsWith('http://') || photo.startsWith('https://');

  if (!isRealBase64 && !isRealHttpUrl) {
    return true;
  }

  return false;
}

/**
 * Cek apakah status pelamar sedang diarsipkan
 */
export function isCandidateArchived(
  talent: Partial<TalentMarketplacePost> | null | undefined
): boolean {
  if (!talent) return false;
  return Number(talent.is_archived) === 1;
}

/**
 * Eksekusi arsip otomatis untuk semua pelamar yang tidak terdeteksi foto profilnya.
 */
export async function executeAutoArchiveNoPhoto(): Promise<{
  ok: boolean;
  archived_count: number;
  message: string;
}> {
  try {
    const token = await resolveAdminToken();
    const resp = await fetch('/api/admin/talents/auto-archive-no-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ dry_run: false }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        ok: true,
        archived_count: data.archived_count || 0,
        message: data.message || 'Arsip otomatis berhasil diproses.',
      };
    }

    // Fallback via client supabase update jika endpoint server belum tersedia
    if (supabase) {
      const { data: allTalents, error: fetchErr } = await supabase
        .from('talent_marketplace_posts')
        .select('id, photo_url, is_archived');

      if (fetchErr) throw fetchErr;

      const noPhotoIds = (allTalents || [])
        .filter((t: { id: string; photo_url?: string; is_archived?: number }) => isCandidateMissingPhoto(t) && Number(t.is_archived) !== 1)
        .map((t: { id: string }) => t.id);

      if (noPhotoIds.length === 0) {
        return {
          ok: true,
          archived_count: 0,
          message: 'Semua pelamar tanpa foto sudah berada di arsip.',
        };
      }

      const now = new Date().toISOString();
      for (const id of noPhotoIds) {
        await supabase
          .from('talent_marketplace_posts')
          .update({
            is_archived: 1,
            is_published: 0,
            archive_reason: 'Foto profil tidak terdeteksi otomatis (membutuhkan pas foto asli)',
            archived_at: now,
            updated_at: now,
          })
          .eq('id', id);
      }

      return {
        ok: true,
        archived_count: noPhotoIds.length,
        message: `Berhasil mengarsipkan ${noPhotoIds.length} pelamar tanpa pas foto profil.`,
      };
    }

    throw new Error('Koneksi backend/database tidak tersedia');
  } catch (err: unknown) {
    console.error('[executeAutoArchiveNoPhoto Error]:', err);
    const msg = err instanceof Error ? err.message : 'Gagal memproses arsip otomatis';
    return {
      ok: false,
      archived_count: 0,
      message: msg,
    };
  }
}

/**
 * Ubah status arsip untuk satu pelamar
 */
export async function toggleTalentArchive(
  talentId: string,
  isArchived: boolean,
  reason?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await resolveAdminToken();
    const resp = await fetch('/api/admin/talents/toggle-archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        id: talentId,
        is_archived: isArchived,
        reason: reason || (isArchived ? 'Diarsipkan oleh admin' : ''),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return {
        ok: true,
        message: data.message || (isArchived ? 'Biodata berhasil diarsipkan.' : 'Biodata berhasil dipulihkan.'),
      };
    }

    // Fallback supabase
    if (supabase) {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('talent_marketplace_posts')
        .update({
          is_archived: isArchived ? 1 : 0,
          is_published: isArchived ? 0 : 1,
          archive_reason: isArchived ? (reason || 'Diarsipkan oleh admin') : '',
          archived_at: isArchived ? now : null,
          updated_at: now,
        })
        .eq('id', talentId);

      if (error) throw error;
      return {
        ok: true,
        message: isArchived ? 'Biodata berhasil diarsipkan.' : 'Biodata berhasil dipulihkan.',
      };
    }

    throw new Error('Gagal menghubungi database');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { ok: false, message: msg };
  }
}

/**
 * Bulk restore or archive multiple candidates
 */
export async function bulkToggleTalentArchive(
  talentIds: string[],
  isArchived: boolean,
  reason?: string
): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await resolveAdminToken();
    const resp = await fetch('/api/admin/talents/bulk-archive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        ids: talentIds,
        is_archived: isArchived,
        reason: reason || (isArchived ? 'Diarsipkan massal oleh admin' : ''),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return { ok: true, message: data.message };
    }

    // Fallback supabase
    if (supabase) {
      const now = new Date().toISOString();
      for (const id of talentIds) {
        await supabase
          .from('talent_marketplace_posts')
          .update({
            is_archived: isArchived ? 1 : 0,
            is_published: isArchived ? 0 : 1,
            archive_reason: isArchived ? (reason || 'Diarsipkan massal') : '',
            archived_at: isArchived ? now : null,
            updated_at: now,
          })
          .eq('id', id);
      }
      return {
        ok: true,
        message: `${talentIds.length} pelamar berhasil ${isArchived ? 'diarsipkan' : 'dipulihkan'}.`,
      };
    }

    throw new Error('Database tidak dapat diakses');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { ok: false, message: msg };
  }
}
