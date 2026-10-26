import { useState, useMemo } from 'react';
import {
  Archive,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  CheckCircle2,
  ShieldCheck,
  CheckSquare,
  Square,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import {
  isCandidateMissingPhoto,
  isCandidateArchived,
  executeAutoArchiveNoPhoto,
  toggleTalentArchive,
  bulkToggleTalentArchive,
  bulkDeleteTalents,
  deleteTalent,
} from '../../lib/talentArchiveService';
import { getDefaultPixarAvatar } from '../../lib/avatarService';
import { ToastType } from './AdminTalentComponents';

interface AdminTalentArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  talents: TalentMarketplacePost[];
  onRefreshTalents: () => void;
  onToast: (type: ToastType, message: string) => void;
  onOpenRegeneratePhoto: (talent: TalentMarketplacePost) => void;
}

export function AdminTalentArchiveModal({
  isOpen,
  onClose,
  talents,
  onRefreshTalents,
  onToast,
  onOpenRegeneratePhoto,
}: AdminTalentArchiveModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'no_photo' | 'manual'>('all');
  const [isProcessingAuto, setIsProcessingAuto] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Talents that are currently archived
  const archivedTalents = useMemo(() => {
    return talents.filter((t) => isCandidateArchived(t));
  }, [talents]);

  // Talents that are NOT yet archived but MISSING real photo
  const unarchivedMissingPhotoTalents = useMemo(() => {
    return talents.filter((t) => !isCandidateArchived(t) && isCandidateMissingPhoto(t));
  }, [talents]);

  // Filtered archived list based on search & tab
  const filteredArchived = useMemo(() => {
    return archivedTalents.filter((t) => {
      const isMissing = isCandidateMissingPhoto(t);
      if (activeTab === 'no_photo' && !isMissing) return false;
      if (activeTab === 'manual' && isMissing) return false;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const fullName = t.seeker_profiles?.full_name || '';
      return (
        fullName.toLowerCase().includes(q) ||
        (t.headline || '').toLowerCase().includes(q) ||
        (t.domicile_city || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.archive_reason || '').toLowerCase().includes(q)
      );
    });
  }, [archivedTalents, activeTab, searchQuery]);

  if (!isOpen) return null;

  // Handle 1-Click Auto Archive for candidates lacking real photos
  const handleAutoArchive = async () => {
    setIsProcessingAuto(true);
    try {
      const res = await executeAutoArchiveNoPhoto();
      if (res.ok) {
        onToast('success', res.message);
        onRefreshTalents();
      } else {
        onToast('error', res.message);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal arsip otomatis';
      onToast('error', msg);
    } finally {
      setIsProcessingAuto(false);
    }
  };

  // Restore single candidate
  const handleRestore = async (talent: TalentMarketplacePost) => {
    const res = await toggleTalentArchive(talent.id, false);
    if (res.ok) {
      onToast('success', `Biodata ${talent.seeker_profiles?.full_name || talent.headline} berhasil dipulihkan ke Bursa Aktif!`);
      onRefreshTalents();
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(talent.id);
        return next;
      });
    } else {
      onToast('error', res.message);
    }
  };

  // Selection toggles
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredArchived.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredArchived.map((t) => t.id)));
    }
  };

  // Bulk restore selected
  const handleBulkRestore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkToggleTalentArchive(ids, false);
      if (res.ok) {
        onToast('success', `${ids.length} biodata pelamar berhasil dipulihkan.`);
        setSelectedIds(new Set());
        onRefreshTalents();
      } else {
        onToast('error', res.message);
      }
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Bulk delete selected
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const confirmMsg = `Yakin ingin menghapus ${count} biodata pelamar yang ditandai secara permanen? Data yang dihapus tidak dapat dipulihkan.`;
    if (!window.confirm(confirmMsg)) return;

    setIsBulkProcessing(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await bulkDeleteTalents(ids);
      if (res.ok) {
        onToast('success', `${count} biodata pelamar berhasil dihapus permanen.`);
        setSelectedIds(new Set());
        onRefreshTalents();
      } else {
        onToast('error', res.message);
      }
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Single delete candidate
  const handleSingleDelete = async (talent: TalentMarketplacePost) => {
    const name = talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat';
    if (!window.confirm(`Yakin ingin menghapus permanen biodata "${name}"?`)) return;

    const res = await deleteTalent(talent.id);
    if (res.ok) {
      onToast('success', `Biodata "${name}" berhasil dihapus permanen.`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(talent.id);
        return next;
      });
      onRefreshTalents();
    } else {
      onToast('error', res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/85 p-3 sm:p-5 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col max-h-[92vh] w-full max-w-4xl rounded-3xl border border-amber-500/30 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-inner">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Pusat Arsip Biodata Pelamar
                </h3>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-500/30">
                  {archivedTalents.length} Diarsipkan
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemisahan otomatis pelamar yang tidak terdeteksi pas foto asli agar Bursa Talent LOXER tetap terpercaya.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Prominent Auto-Archive Banner: If there are unarchived candidates missing real photos */}
          {unarchivedMissingPhotoTalents.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/40 p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-400 border border-amber-500/40 shrink-0">
                    <AlertTriangle className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Terdeteksi {unarchivedMissingPhotoTalents.length} Pelamar Tanpa Foto Profil Asli!
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Biodata pelamar ini saat ini masih tayang publik menggunakan avatar kartun/pixar atau foto kosong.
                      Sistem siap mengarsipkan seluruhnya secara otomatis dengan 1-klik agar bursa pelamar tetap profesional.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAutoArchive}
                  disabled={isProcessingAuto}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition hover:scale-[1.02] shrink-0 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isProcessingAuto ? 'animate-spin' : ''}`} />
                  <span>
                    {isProcessingAuto ? 'Memproses Arsip...' : `⚡ Arsipkan Otomatis (${unarchivedMissingPhotoTalents.length})`}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-emerald-300 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Seluruh biodata pelamar tanpa pas foto asli telah aman diarsipkan. Bursa publik bersih & kredibel.</span>
              </div>
              <button
                onClick={onRefreshTalents}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <RefreshCw className="w-3 h-3" /> Cek Ulang
              </button>
            </div>
          )}

          {/* Stats & Filters Card */}
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'all'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Semua Arsip ({archivedTalents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('no_photo')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                    activeTab === 'no_photo'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Tanpa Foto ({archivedTalents.filter((t) => isCandidateMissingPhoto(t)).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'manual'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Arsip Manual ({archivedTalents.filter((t) => !isCandidateMissingPhoto(t)).length})
                </button>
              </div>

              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, posisi, kota..."
                  className="w-full rounded-xl border border-white/10 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Bulk Actions Bar if items selected */}
            {filteredArchived.length > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="flex items-center gap-1.5 hover:text-white transition font-medium"
                >
                  {selectedIds.size === filteredArchived.length ? (
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-500" />
                  )}
                  <span>Pilih Semua ({selectedIds.size}/{filteredArchived.length})</span>
                </button>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkRestore}
                      disabled={isBulkProcessing}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition shadow disabled:opacity-50 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Pulihkan {selectedIds.size} Pelamar</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={isBulkProcessing}
                      className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition shadow shadow-rose-500/20 disabled:opacity-50 cursor-pointer"
                      title="Hapus permanen semua biodata pelamar yang ditandai"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus {selectedIds.size} Pelamar</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Archived Talents List */}
          {filteredArchived.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-10 text-center space-y-2">
              <Archive className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-white">Tidak ada pelamar dalam arsip ini</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? 'Tidak ada data arsip yang cocok dengan pencarian kata kunci.'
                  : 'Semua pelamar berstatus aktif tayang di Bursa Talent.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredArchived.map((talent) => {
                const fullName =
                  talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat Pelamar';
                const isMissingPhoto = isCandidateMissingPhoto(talent);
                const isSelected = selectedIds.has(talent.id);

                return (
                  <div
                    key={talent.id}
                    className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-950/30'
                        : 'border-white/10 bg-slate-950/60 hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(talent.id)}
                        className="mt-1 text-slate-500 hover:text-white transition"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      {/* Photo Thumbnail */}
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                        <img
                          src={getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                          alt={fullName}
                          className="h-full w-full object-cover grayscale opacity-75"
                        />
                        {isMissingPhoto && (
                          <div
                            className="absolute inset-0 bg-amber-950/60 flex items-center justify-center"
                            title="Pas foto profil asli belum ada"
                          >
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white truncate uppercase">
                            {fullName}
                          </h4>
                          {isMissingPhoto && (
                            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-500/40">
                              Tanpa Foto
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-cyan-400 truncate mt-0.5">{talent.headline}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span>{talent.category}</span>
                          <span>•</span>
                          <span>{talent.domicile_city || 'Cimahi'}</span>
                        </div>
                        {talent.archive_reason && (
                          <p className="mt-1.5 text-[10px] text-amber-300/90 bg-amber-500/10 rounded-md px-2 py-0.5 border border-amber-500/20 truncate">
                            {talent.archive_reason}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRegeneratePhoto(talent);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-2.5 py-1 text-[11px] font-bold text-indigo-300 transition"
                        title="Buat pas foto dengan AI Imagen"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Regen Foto AI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRestore(talent)}
                        className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 px-2.5 py-1 text-[11px] font-bold text-emerald-300 transition"
                        title="Kembalikan biodata ke katalog bursa aktif"
                      >
                        <RotateCcw className="w-3 h-3 text-emerald-400" />
                        <span>Pulihkan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSingleDelete(talent)}
                        className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 px-2.5 py-1 text-[11px] font-bold text-rose-300 transition"
                        title="Hapus permanen biodata pelamar ini"
                      >
                        <Trash2 className="w-3 h-3 text-rose-400" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3.5 bg-slate-900/90 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Kandidat dalam arsip tidak dapat diakses atau dilihat oleh publik maupun pencari kerja luar.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-bold text-white transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
