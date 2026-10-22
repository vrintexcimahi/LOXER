import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Briefcase,
  Zap,
  Award,
  Search,
  FileUp,
  RefreshCw,
  LayoutGrid,
  List,
  MapPin,
  Eye,
  Check,
  Trash2,
  X,
  FileText,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Lock,
  Maximize2,
  ZoomIn,
  Archive,
  Camera,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { checkIsSuperAdmin } from '../../lib/constants';
import { maskPhoneNumber } from '../../lib/contactPrivacyService';
import { getDefaultPixarAvatar } from '../../lib/avatarService';
import ProtectedTalentChatModal from '../../components/marketplace/ProtectedTalentChatModal';
import ImageViewerModal from '../../components/ui/ImageViewerModal';
import { openImageSafelyInNewTab } from '../../lib/imageViewerHelper';
import { BulkSmartCvManager } from './BulkSmartCvManager';
import { PdfDocumentSplitter } from './PdfDocumentSplitter';
import { AdminRegeneratePhotoModal } from './AdminRegeneratePhotoModal';
import { CandidateIdentity } from '../../lib/duplicateDetectionService';

export type ToastType = 'success' | 'error' | 'info';

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-800/80 ${className || 'h-6'}`} />;
}

// ==============================================================================
// HOOK: useTalentCatalog - Shared data hook for LOXER Talent & Candidate Catalog
// ==============================================================================
export function useTalentCatalog(onToast: (type: ToastType, message: string) => void) {
  const [talents, setTalents] = useState<TalentMarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTalents = useCallback(async () => {
    setLoading(true);
    try {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('talent_marketplace_posts')
        .select('*, seeker_profiles(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useTalentCatalog] Join query failed, retrying plain select:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('talent_marketplace_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (fallbackError) throw fallbackError;
        setTalents((fallbackData || []) as TalentMarketplacePost[]);
      } else if (data) {
        setTalents(data as TalentMarketplacePost[]);
      }
    } catch (err: unknown) {
      console.error('[useTalentCatalog Error]:', err);
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      onToast('error', `Gagal memuat katalog pelamar: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    fetchTalents();
  }, [fetchTalents]);

  const togglePublish = async (talent: TalentMarketplacePost) => {
    if (!supabase) return;
    const currentStatus = Number(talent.is_published) === 1 ? 1 : 0;
    const newStatus = currentStatus === 1 ? 0 : 1;

    try {
      const { error } = await supabase
        .from('talent_marketplace_posts')
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', talent.id);

      if (error) throw error;
      setTalents((prev) =>
        prev.map((t) => (t.id === talent.id ? { ...t, is_published: newStatus } : t))
      );
      onToast(
        'success',
        `Status ${talent.headline} diubah menjadi ${newStatus === 1 ? 'Aktif (Tayang)' : 'Nonaktif (Draft)'}.`
      );
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Terjadi kesalahan';
      onToast('error', `Gagal mengubah status publikasi: ${errMsg}`);
    }
  };

  const deleteTalent = async (talentId: string, headline: string) => {
    if (!supabase) return;
    const isSuperAdmin = checkIsSuperAdmin();
    if (!isSuperAdmin && !window.confirm(`Yakin ingin menghapus talent "${headline}" dari bursa pelamar LOXER?`)) return;

    try {
      const { error } = await supabase.from('talent_marketplace_posts').delete().eq('id', talentId);
      if (error) throw error;
      setTalents((prev) => prev.filter((t) => t.id !== talentId));
      onToast('success', `Talent "${headline}" berhasil dihapus.`);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Terjadi kesalahan';
      onToast('error', `Gagal menghapus talent: ${errMsg}`);
    }
  };

  return { talents, setTalents, loading, fetchTalents, togglePublish, deleteTalent };
}

// ==============================================================================
// MODAL: AdminTalentDetailModal (Pratinjau Lengkap Biodata Pelamar & Profil)
// ==============================================================================
export function AdminTalentDetailModal({
  talent,
  onClose,
  onTogglePublish,
  onOpenRegeneratePhoto,
}: {
  talent: TalentMarketplacePost | null;
  onClose: () => void;
  onTogglePublish: (talent: TalentMarketplacePost) => void;
  onOpenRegeneratePhoto?: (talent: TalentMarketplacePost) => void;
}) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    downloadFilename?: string;
  } | null>(null);

  if (!talent) return null;

  const fullName = talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat Pelamar';
  const photoUrl = talent.photo_url || talent.seeker_profiles?.photo_url;
  const isPublished = Number(talent.is_published) === 1;

  const parsedSkills: string[] = Array.isArray(talent.skills)
    ? talent.skills
    : typeof talent.skills === 'string'
    ? (() => {
        try {
          return JSON.parse(talent.skills);
        } catch {
          return talent.skills.split(',').map((s) => s.trim()).filter(Boolean);
        }
      })()
    : [];

  const rateLabel =
    talent.rate_type === 'hourly' ? '/ jam' : talent.rate_type === 'project' ? '/ order' : '/ bln';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-cyan-500/30 bg-slate-900 p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/30 to-indigo-600/30 border border-white/10 cursor-pointer group"
              onClick={() => {
                const avatar = photoUrl || getDefaultPixarAvatar(fullName, undefined, talent.bio);
                setViewerImage({
                  url: avatar,
                  title: `Pas Foto - ${fullName}`,
                  subtitle: talent.headline,
                  downloadFilename: `Foto-${fullName.replace(/\s+/g, '_')}.jpg`,
                });
              }}
              title="Klik untuk melihat foto ukuran penuh"
            >
              <img
                src={photoUrl || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                alt={fullName}
                className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(fullName, undefined, talent.bio);
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white drop-shadow" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-cyan-300">
                  {talent.badge || 'SIAP KERJA'}
                </span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                    isPublished
                      ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                      : 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {isPublished ? '● Tayang di Bursa' : '○ Draft / Nonaktif'}
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-white uppercase tracking-wide">{fullName}</h2>
              <p className="text-xs text-cyan-400 font-medium">{talent.headline}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {talent.domicile_city || 'Cimahi / Bandung'}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  {talent.category}
                </span>
              </div>
              {onOpenRegeneratePhoto && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenRegeneratePhoto(talent);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/40 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 text-[11px] font-bold text-indigo-300 transition"
                  title="Perbaiki atau ganti foto profil kandidat"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Regenerate Foto Profil</span>
                </button>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial & Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Ekspektasi Gaji</span>
            <p className="mt-1 text-sm font-extrabold text-cyan-300">
              {talent.expected_salary > 0
                ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                : 'Negosiasi'}
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Ketersediaan Kerja</span>
            <p className="mt-1 text-sm font-bold text-white capitalize">
              {talent.availability || 'fulltime'}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/5 bg-slate-950/60 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400">Pengalaman Kerja</span>
            <p className="mt-1 text-sm font-bold text-white">
              {talent.experience_years ? `${talent.experience_years} Tahun` : 'Fresh Graduate'}
            </p>
          </div>
        </div>

        {/* Bio / Ringkasan Diri */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ringkasan Profil & Biodata</span>
          </h3>
          <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
            {talent.bio || talent.bio_summary || 'Tidak ada deskripsi bio yang dicantumkan.'}
          </div>
        </div>

        {/* Keahlian / Skills */}
        {parsedSkills.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Keahlian & Keterampilan</span>
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {parsedSkills.map((skill, sIdx) => (
                <span
                  key={sIdx}
                  className="rounded-lg border border-cyan-400/20 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Gambar Ke-2: Berkas Dokumen CV Lengkap (Kontak Diblur) */}
        {talent.portfolio_url && (talent.portfolio_url.startsWith('data:image') || /\.(png|jpe?g|webp)($|\?)/i.test(talent.portfolio_url)) && (
          <div className="space-y-2.5 rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Gambar Ke-2: Berkas CV Lengkap (Kontak Terproteksi Privasi)</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewerImage({
                  url: talent.portfolio_url!,
                  title: `Berkas CV Lengkap - ${fullName}`,
                  subtitle: 'Kontak telah disensor secara otomatis demi keamanan & privasi',
                  downloadFilename: `CV-${fullName.replace(/\s+/g, '_')}.jpg`,
                })}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 transition hover:bg-cyan-900/50 cursor-pointer"
                title="Buka berkas CV ukuran penuh dengan zoom & putar"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Buka Gambar Penuh</span>
              </button>
            </div>
            <div
              className="group relative max-h-96 overflow-hidden rounded-xl border border-white/10 bg-slate-900 flex justify-center p-2 cursor-zoom-in"
              onClick={() => setViewerImage({
                url: talent.portfolio_url!,
                title: `Berkas CV Lengkap - ${fullName}`,
                subtitle: 'Kontak telah disensor secara otomatis demi keamanan & privasi',
                downloadFilename: `CV-${fullName.replace(/\s+/g, '_')}.jpg`,
              })}
              title="Klik untuk membuka berkas CV ukuran penuh & zoom"
            >
              <img
                src={talent.portfolio_url}
                alt="Dokumen CV Lengkap Pelamar"
                className="max-w-full h-auto object-contain rounded-lg shadow-xl group-hover:brightness-105 transition"
              />
              <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-cyan-500/40 text-xs font-bold text-cyan-300 shadow-xl backdrop-blur-md">
                  <ZoomIn className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Klik untuk perbesar CV</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400">
              🔒 Seluruh nomor telepon, WhatsApp, email, dan alamat rumah pada berkas CV otomatis disensor/diblur permanen demi privasi pelamar. Semua proses perekrutan wajib di dalam aplikasi LOXER.
            </p>
          </div>
        )}

        {/* Kontak & Saluran Komunikasi Terproteksi */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Saluran Komunikasi Resmi (Sensor Privasi Ketat)</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Sensor Shopee-Grade
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 px-4 py-2 text-xs font-bold text-slate-950 transition shadow-md shadow-cyan-500/20 active:scale-[0.98]"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Buka Ruang Chat Otomatis LOXER</span>
            </button>

            {talent.whatsapp_number ? (
              <span className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-cyan-500/30 px-3.5 py-2 text-xs font-mono text-cyan-300">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{maskPhoneNumber(talent.whatsapp_number)}</span>
                <span className="text-[10px] text-slate-400 font-sans font-medium">(Disensor)</span>
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">Kontak terproteksi sistem LOXER</span>
            )}

            {talent.portfolio_url && (
              <button
                type="button"
                onClick={() => {
                  const portUrl = talent.portfolio_url;
                  if (!portUrl) return;
                  if (portUrl.startsWith('data:image') || /\.(png|jpe?g|webp)($|\?)/i.test(portUrl)) {
                    setViewerImage({
                      url: portUrl,
                      title: `Berkas CV Lengkap - ${fullName}`,
                      subtitle: 'Kontak telah disensor secara otomatis demi keamanan & privasi',
                      downloadFilename: `CV-${fullName.replace(/\s+/g, '_')}.jpg`,
                    });
                  } else {
                    openImageSafelyInNewTab(portUrl, `Portofolio - ${fullName}`);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                title="Buka dokumen CV atau tautan portofolio"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>Lihat Dokumen CV / Portofolio</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
            🛡️ <strong>Kebijakan Keamanan LOXER:</strong> Nomor HP, WhatsApp, dan email pelamar wajib disensor dari ruang publik demi privasi. Wawancara, negosiasi gaji, dan kesepakatan penawaran kerja dilakukan 100% full di dalam aplikasi melalui Ruang Chat Resmi.
          </p>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePublish(talent)}
              className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
                isPublished
                  ? 'border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                  : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              {isPublished ? '✕ Nonaktifkan dari Bursa' : '✓ Terbitkan ke Bursa Publik'}
            </button>
            {onOpenRegeneratePhoto && (
              <button
                type="button"
                onClick={() => onOpenRegeneratePhoto(talent)}
                className="rounded-xl border border-indigo-400/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-2 text-xs font-bold text-indigo-300 transition flex items-center gap-1.5"
                title="Regenerate atau perbaiki foto profil kandidat"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Regenerate Foto</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Tutup
          </button>
        </div>

        {/* Modal Ruang Chat Resmi LOXER */}
        <ProtectedTalentChatModal
          talent={talent}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Fullscreen Image Lightbox Modal */}
        <ImageViewerModal
          isOpen={Boolean(viewerImage)}
          onClose={() => setViewerImage(null)}
          imageUrl={viewerImage?.url || null}
          title={viewerImage?.title}
          subtitle={viewerImage?.subtitle}
          downloadFilename={viewerImage?.downloadFilename}
        />
      </div>
    </div>
  );
}

// ==============================================================================
// SECTION: AdminTalentCatalogSection (Katalog Pelamar Kerja & Talent LOXER)
// ==============================================================================
export function AdminTalentCatalogSection({
  onToast,
  onNavigateToSmartAdd,
}: {
  onToast: (type: ToastType, message: string) => void;
  onNavigateToSmartAdd: () => void;
}) {
  const { talents, setTalents, loading, fetchTalents, togglePublish, deleteTalent } = useTalentCatalog(onToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [cardImageMode, setCardImageMode] = useState<Record<string, 'photo' | 'cv'>>({});
  const [previewTalent, setPreviewTalent] = useState<TalentMarketplacePost | null>(null);
  const [chatTalent, setChatTalent] = useState<TalentMarketplacePost | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [regenerateTalent, setRegenerateTalent] = useState<TalentMarketplacePost | null>(null);

  const handlePhotoRegenerated = (updatedTalent: TalentMarketplacePost) => {
    setTalents((prev) => prev.map((t) => (t.id === updatedTalent.id ? updatedTalent : t)));
    if (previewTalent && previewTalent.id === updatedTalent.id) {
      setPreviewTalent(updatedTalent);
    }
  };

  const TALENT_CATEGORIES = [
    'Semua',
    'Teknologi & IT',
    'Servis Elektronik & Komputer',
    'Bengkel & Otomotif',
    'Pijat, Refleksi & Terapi Kesehatan',
    'Kebersihan & Cleaning Service',
    'Pertukangan & Renovasi Bangunan',
    'Salon, Barbershop & Perawatan',
    'Pengantaran, Logistik & Angkut Barang',
    'Les Privat & Kursus Mandiri',
    'Fotografi & Multimedia',
    'Desain, Percetakan & Sablon',
    'Teknologi & IT Mandiri',
    'Keuangan & Akuntansi',
    'Pemasaran & Digital',
    'Operasional & Logistik',
    'Umum & Jasa',
  ];

  const AVAILABILITY_LABELS: Record<string, string> = {
    fulltime: 'Di Tempat / Bengkel',
    freelance: 'Layanan Panggilan',
    parttime: 'Fleksibel',
    remote: 'Borongan / Jarak Jauh',
  };

  const cities = useMemo(() => {
    const set = new Set<string>();
    talents.forEach((t) => {
      if (t.domicile_city) set.add(t.domicile_city);
    });
    return Array.from(set);
  }, [talents]);

  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      const matchesCategory = selectedCategory === 'Semua' || t.category === selectedCategory;
      const matchesAvail =
        selectedAvailability === 'all' ||
        String(t.availability || '').toLowerCase() === selectedAvailability.toLowerCase() ||
        String(t.availability_status || '').toLowerCase() === selectedAvailability.toLowerCase();
      const matchesCity = selectedCity === 'all' || (t.domicile_city || '').toLowerCase() === selectedCity.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const skillsStr = Array.isArray(t.skills)
        ? t.skills.join(' ')
        : typeof t.skills === 'string'
        ? t.skills
        : '';
      const fullName = t.seeker_profiles?.full_name || '';

      const matchesQuery =
        !q ||
        (t.headline || '').toLowerCase().includes(q) ||
        (t.bio || '').toLowerCase().includes(q) ||
        skillsStr.toLowerCase().includes(q) ||
        fullName.toLowerCase().includes(q) ||
        (t.domicile_city || '').toLowerCase().includes(q);

      return matchesCategory && matchesAvail && matchesCity && matchesQuery;
    });
  }, [talents, selectedCategory, selectedAvailability, selectedCity, searchQuery]);

  const fulltimeCount = useMemo(() => {
    return talents.filter((t) => t.availability === 'fulltime' || t.availability_status === 'fulltime' || t.availability === 'available').length;
  }, [talents]);

  const freelanceCount = useMemo(() => {
    return talents.filter((t) => t.availability === 'freelance' || t.availability_status === 'freelance').length;
  }, [talents]);

  const topTalentCount = useMemo(() => {
    return talents.filter((t) => t.badge === 'TOP TALENT' || t.badge === 'REKOMENDASI').length;
  }, [talents]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-cyan-500/20 bg-slate-900 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-cyan-400 font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Total Talent Pelamar
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{talents.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Tersinkronisasi bursa publik</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-slate-900 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" /> Siap Kerja (Fulltime)
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{fulltimeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Penempatan di tempat/bengkel</p>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-slate-900 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Layanan Panggilan / Jasa
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{freelanceCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kandidat mandiri & freelance</p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-slate-900 p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-rose-400 font-semibold flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5" /> Top Talent Unggulan
          </p>
          <p className="mt-1 text-2xl font-bold text-white">{topTalentCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Kandidat terverifikasi LOXER</p>
        </div>
      </div>

      {/* Control & Filter Card */}
      <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/90 p-4 space-y-3.5 backdrop-blur-md shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pelamar, posisi keahlian, atau domisili kota..."
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGalleryModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-violet-500/20 transition hover:scale-[1.02]"
              title="Buka Galeri Berkas Pelamar (KTP, Ijazah, SKCK, Sertifikat, dll)"
            >
              <Archive className="w-4 h-4" />
              <span>Galeri Berkas</span>
            </button>

            <button
              onClick={onNavigateToSmartAdd}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition hover:scale-[1.02]"
            >
              <FileUp className="w-4 h-4" />
              <span>Smart Add CV</span>
            </button>

            <button
              onClick={fetchTalents}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
              title="Segarkan data talent"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-950 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Grid 1:1"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdowns & Category Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200 dark:border-white/5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {TALENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                Kategori: {cat}
              </option>
            ))}
          </select>

          <select
            value={selectedAvailability}
            onChange={(e) => setSelectedAvailability(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Ketersediaan Kerja</option>
            <option value="fulltime">Di Tempat / Bengkel (Fulltime)</option>
            <option value="freelance">Layanan Panggilan (Freelance)</option>
            <option value="parttime">Fleksibel (Parttime)</option>
            <option value="remote">Borongan / Jarak Jauh (Remote)</option>
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">Semua Kota Domisili ({cities.length} Kota)</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 p-2 sm:p-4 space-y-2 sm:space-y-3">
              <SkeletonBlock className="aspect-square w-full rounded-lg sm:rounded-xl" />
              <SkeletonBlock className="h-4 sm:h-5 w-3/4" />
              <SkeletonBlock className="h-3 sm:h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTalents.length === 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/60 p-12 text-center space-y-3 shadow-sm">
          <Users className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Tidak ada data pelamar yang cocok</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan filter kategori dan domisili untuk menemukan talent.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
              setSelectedAvailability('all');
              setSelectedCity('all');
            }}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 dark:bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 dark:hover:bg-cyan-500/30 transition"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* GRID VIEW: 1:1 Aspect Ratio Photo Cards (Matching Public Feed Layout) */}
      {!loading && viewMode === 'grid' && filteredTalents.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filteredTalents.map((talent) => {
            const fullName = talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat Pelamar';
            const photoUrl = talent.photo_url || talent.seeker_profiles?.photo_url;
            const isPublished = Number(talent.is_published) === 1;

            const parsedSkills: string[] = Array.isArray(talent.skills)
              ? talent.skills
              : typeof talent.skills === 'string'
              ? (() => {
                  try {
                    return JSON.parse(talent.skills);
                  } catch {
                    return talent.skills.split(',').map((s) => s.trim()).filter(Boolean);
                  }
                })()
              : [];

            const badgeTheme =
              talent.badge === 'TOP TALENT' || talent.badge === 'REKOMENDASI'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : talent.badge === 'SIAP PANGGILAN' || talent.badge === 'FREELANCER'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';

            const rateLabel =
              talent.rate_type === 'hourly' ? '/ jam' : talent.rate_type === 'project' ? '/ order' : '/ bln';

            const hasCvImage = Boolean(
              talent.portfolio_url &&
              (talent.portfolio_url.startsWith('data:image') || /\.(png|jpe?g|webp)($|\?)/i.test(talent.portfolio_url))
            );
            const currentMode = cardImageMode[talent.id] || 'photo';
            const displayPhoto = currentMode === 'cv' && hasCvImage ? talent.portfolio_url : photoUrl;

            return (
              <div
                key={talent.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 hover:border-cyan-500/50 hover:shadow-xl dark:hover:bg-slate-900 shadow-sm sm:shadow-md transition-all duration-300"
              >
                {/* 1:1 Aspect Ratio Photo Header (Full-bleed top) */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
                  <img
                    src={displayPhoto || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                    alt={fullName}
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(fullName, undefined, talent.bio);
                    }}
                  />

                  {/* Scrim Overlay: Inline gradient prevents theme light/dark CSS selector collisions */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, rgba(2, 6, 23, 0.90) 0%, rgba(2, 6, 23, 0.45) 32%, rgba(2, 6, 23, 0.05) 60%, transparent 100%)',
                    }}
                  />

                  {/* Top Badges */}
                  <div className="absolute left-2.5 sm:left-3.5 top-2.5 sm:top-3.5 flex items-center gap-1 z-10">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm truncate max-w-[95px] sm:max-w-none ${badgeTheme}`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                    >
                      {talent.badge || 'SIAP KERJA'}
                    </span>
                    {Boolean(talent.availability) && (
                      <span
                        className="hidden sm:flex items-center gap-1 rounded-md border border-emerald-400/50 bg-emerald-950/80 px-2 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md shadow-sm"
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {AVAILABILITY_LABELS[talent.availability] || talent.availability}
                      </span>
                    )}
                  </div>

                  {/* Top Right: Verified / Publish indicator + Mode Switcher */}
                  <div className="absolute right-2.5 sm:right-3.5 top-2.5 sm:top-3.5 flex items-center gap-1 z-10">
                    {hasCvImage && (
                      <div
                        className="flex items-center gap-0.5 rounded-lg bg-black/80 p-0.5 border border-white/20 backdrop-blur-md shadow-md"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setCardImageMode((prev) => ({ ...prev, [talent.id]: 'photo' }))}
                          className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold rounded transition ${
                            currentMode === 'photo' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                          }`}
                          title="Tampilkan Pas Foto"
                        >
                          Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardImageMode((prev) => ({ ...prev, [talent.id]: 'cv' }))}
                          className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold rounded transition ${
                            currentMode === 'cv' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
                          }`}
                          title="Tampilkan Berkas CV Full (Kontak Diblur)"
                        >
                          CV
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRegenerateTalent(talent);
                      }}
                      className="flex items-center gap-1 rounded-full bg-slate-950/85 hover:bg-cyan-600 border border-white/20 hover:border-cyan-400 px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-cyan-300 hover:text-white backdrop-blur-md shadow-md transition"
                      title="Regenerate Foto Profil (Admin Exclusive)"
                    >
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden sm:inline">Regen Foto</span>
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-bold backdrop-blur-md shadow-sm ${
                        isPublished ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50' : 'bg-slate-900/80 text-slate-300 border border-white/20'
                      }`}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                    >
                      {isPublished ? 'Tayang' : 'Draft'}
                    </span>
                  </div>

                  {/* Category & City Bar: Protected dark-glass pill over the bottom gradient scrim */}
                  <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between text-[9px] sm:text-[10px] font-semibold gap-1 z-10 pointer-events-none">
                    <span
                      className="talent-photo-badge talent-category-badge truncate max-w-[110px] sm:max-w-[140px] rounded-md px-2 py-0.5 border shadow-sm font-bold tracking-tight"
                      style={{
                        backgroundColor: 'rgba(2, 6, 23, 0.90)',
                        color: '#38bdf8',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
                      }}
                    >
                      {talent.category}
                    </span>
                    <span
                      className="talent-photo-badge talent-city-badge flex items-center gap-1 rounded-md px-2 py-0.5 border shadow-sm truncate font-semibold"
                      style={{
                        backgroundColor: 'rgba(2, 6, 23, 0.90)',
                        color: '#ffffff',
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
                      }}
                    >
                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{talent.domicile_city || 'Cimahi'}</span>
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight sm:tracking-wide text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition truncate">
                      {fullName}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5 font-medium">{talent.headline}</p>

                    {/* Salary */}
                    <div className="mt-1.5 sm:mt-2 flex items-center justify-between rounded-lg sm:rounded-xl bg-slate-100/90 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/5 px-2 py-1 sm:px-2.5 sm:py-1.5">
                      <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Gaji:</span>
                      <span className={`text-[10px] sm:text-xs font-black truncate ${talent.expected_salary > 0 ? 'text-cyan-700 dark:text-cyan-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {talent.expected_salary > 0
                          ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                          : 'Negosiasi'}
                      </span>
                    </div>

                    {/* Bio snippet (Desktop only) */}
                    <p className="hidden sm:block mt-2 text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {talent.bio || talent.bio_summary || 'Tidak ada deskripsi bio yang dicantumkan.'}
                    </p>

                    {/* Skills pills (Desktop only) */}
                    {parsedSkills.length > 0 && (
                      <div className="hidden sm:flex mt-2 flex-wrap gap-1">
                        {parsedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/90 dark:bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {parsedSkills.length > 3 && (
                          <span className="rounded-md border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-500 dark:text-slate-400">
                            +{parsedSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile Actions Bar (2 buttons) */}
                  <div className="sm:hidden pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewTalent(talent)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-white/10 hover:bg-cyan-100 dark:hover:bg-slate-700 py-1.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300 transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegenerateTalent(talent)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-500/40 py-1.5 px-2 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 transition"
                      title="Regenerate Foto"
                    >
                      <Camera className="w-3 h-3" />
                      <span>Regen</span>
                    </button>
                  </div>

                  {/* Desktop Actions Bar */}
                  <div className="hidden sm:block pt-3 border-t border-slate-200 dark:border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewTalent(talent)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 py-1.5 text-xs font-bold text-slate-800 dark:text-white transition shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Biodata</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRegenerateTalent(talent)}
                        className="flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 p-1.5 text-indigo-700 dark:text-indigo-300 transition shadow-sm"
                        title="Regenerate Foto Profil Kandidat (3D Pixar / Upload Baru)"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setChatTalent(talent)}
                        className="flex items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 p-1.5 text-cyan-700 dark:text-cyan-300 transition shadow-sm"
                        title="Buka Ruang Chat Otomatis (Shopee-Grade)"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => togglePublish(talent)}
                        className={`rounded-xl border p-1.5 transition shadow-sm ${
                          isPublished
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                        title={isPublished ? 'Nonaktifkan dari bursa publik' : 'Aktifkan ke bursa publik'}
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteTalent(talent.id, fullName)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 p-1.5 text-rose-600 dark:text-rose-300 transition shadow-sm"
                        title="Hapus talent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE VIEW */}
      {!loading && viewMode === 'table' && filteredTalents.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="px-4 py-3 text-left">Foto & Nama</th>
                <th className="px-4 py-3 text-left">Posisi / Headline</th>
                <th className="px-4 py-3 text-left">Kategori & Kota</th>
                <th className="px-4 py-3 text-left">Ekspektasi Gaji</th>
                <th className="px-4 py-3 text-left">Ketersediaan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-700 dark:text-slate-300 text-xs">
              {filteredTalents.map((talent, idx) => {
                const fullName = talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat';
                const photoUrl = talent.photo_url || talent.seeker_profiles?.photo_url;
                const isPublished = Number(talent.is_published) === 1;

                return (
                  <tr
                    key={talent.id}
                    className={`transition-colors ${
                      idx % 2 === 0
                        ? 'bg-slate-50/70 hover:bg-cyan-50/70 dark:bg-[#0b1329] dark:hover:bg-[#1e2c4d]'
                        : 'bg-white hover:bg-cyan-50/70 dark:bg-[#162038] dark:hover:bg-[#1e2c4d]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10">
                          <img
                            src={photoUrl || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
                            alt={fullName}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(fullName, undefined, talent.bio);
                            }}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white uppercase">{fullName}</p>
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">{talent.badge || 'SIAP KERJA'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{talent.headline}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900 dark:text-white">{talent.category}</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">{talent.domicile_city || 'Cimahi'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-300">
                      {talent.expected_salary > 0
                        ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} / bln`
                        : 'Negosiasi'}
                    </td>
                    <td className="px-4 py-3 capitalize">{talent.availability || 'fulltime'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isPublished
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {isPublished ? 'Tayang' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewTalent(talent)}
                          className="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        >
                          Biodata
                        </button>
                        <button
                          onClick={() => setRegenerateTalent(talent)}
                          className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1"
                          title="Regenerate Foto Profil"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Regen</span>
                        </button>
                        <button
                          onClick={() => setChatTalent(talent)}
                          className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition flex items-center gap-1"
                          title="Buka Ruang Chat Otomatis"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                        <button
                          onClick={() => togglePublish(talent)}
                          className="rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-2 py-1 hover:bg-slate-100 dark:hover:bg-white/5 transition"
                          title="Ubah publikasi"
                        >
                          {isPublished ? 'Draft' : 'Tayang'}
                        </button>
                        <button
                          onClick={() => deleteTalent(talent.id, fullName)}
                          className="rounded-lg border border-rose-500/30 text-rose-600 dark:text-rose-300 px-2 py-1 hover:bg-rose-500/10 transition"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Biodata Modal */}
      <AdminTalentDetailModal
        talent={previewTalent}
        onClose={() => setPreviewTalent(null)}
        onTogglePublish={togglePublish}
        onOpenRegeneratePhoto={(t) => setRegenerateTalent(t)}
      />

      {/* Regenerate Profile Photo Modal (Admin Exclusive) */}
      <AdminRegeneratePhotoModal
        talent={regenerateTalent}
        isOpen={Boolean(regenerateTalent)}
        onClose={() => setRegenerateTalent(null)}
        onSuccess={handlePhotoRegenerated}
        onToast={onToast}
      />

      {/* Ruang Chat Otomatis Terproteksi */}
      <ProtectedTalentChatModal
        talent={chatTalent}
        isOpen={Boolean(chatTalent)}
        onClose={() => setChatTalent(null)}
        onToast={onToast}
      />

      {/* Modal Galeri Berkas Pelamar */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-5xl my-6 rounded-3xl border border-violet-500/30 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Galeri Berkas Pelamar Kerja</h3>
                  <p className="text-xs text-slate-400">
                    Arsip seluruh halaman berkas yang dipecah dari PDF (KTP, Ijazah, SKCK, Sertifikat) dengan sensor dokumen sensitif
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <PdfDocumentSplitter
              defaultTab="gallery"
              onToast={onToast}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// SECTION: SmartAddCvSection (Unified AI Multimodal CV Engine [Gemini 3.8])
// Otomatis mengenali berkas satuan, screenshot/paste, teks resume, hingga massal
// ==============================================================================
export function SmartAddCvSection({
  onToast,
  onSaved,
}: {
  onToast: (type: ToastType, message: string) => void;
  onSaved: () => void;
}) {
  const [dbTalents, setDbTalents] = useState<CandidateIdentity[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadDatabaseTalents() {
      try {
        if (!supabase) return;
        const { data } = await supabase
          .from('talent_marketplace_posts')
          .select('id, full_name, whatsapp_number, email, headline')
          .order('created_at', { ascending: false });
        if (isMounted && data) {
          setDbTalents(data as CandidateIdentity[]);
        }
      } catch (err) {
        console.warn('[SmartAddCvSection] Failed to load database talents:', err);
      }
    }
    loadDatabaseTalents();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <BulkSmartCvManager
        onToast={onToast}
        onSaved={onSaved}
        existingTalents={dbTalents}
      />
    </div>
  );
}
