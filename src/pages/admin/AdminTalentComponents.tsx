import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Phone,
  Check,
  Trash2,
  CheckCircle2,
  X,
  FileText,
  Sparkles,
  ExternalLink,
  Upload,
  ArrowRight,
  Bot,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import { supabase } from '../../lib/supabase';

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
    } catch (err: any) {
      console.error('[useTalentCatalog Error]:', err);
      onToast('error', `Gagal memuat katalog pelamar: ${err.message}`);
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
    } catch (err: any) {
      onToast('error', `Gagal mengubah status publikasi: ${err.message}`);
    }
  };

  const deleteTalent = async (talentId: string, headline: string) => {
    if (!supabase) return;
    if (!window.confirm(`Yakin ingin menghapus talent "${headline}" dari bursa pelamar LOXER?`)) return;

    try {
      const { error } = await supabase.from('talent_marketplace_posts').delete().eq('id', talentId);
      if (error) throw error;
      setTalents((prev) => prev.filter((t) => t.id !== talentId));
      onToast('success', `Talent "${headline}" berhasil dihapus.`);
    } catch (err: any) {
      onToast('error', `Gagal menghapus talent: ${err.message}`);
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
}: {
  talent: TalentMarketplacePost | null;
  onClose: () => void;
  onTogglePublish: (talent: TalentMarketplacePost) => void;
}) {
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
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/30 to-indigo-600/30 border border-white/10">
              {photoUrl ? (
                <img src={photoUrl} alt={fullName} className="h-full w-full object-cover object-center" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-extrabold text-2xl text-cyan-300">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
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
            <span className="text-[10px] uppercase font-bold text-slate-400">Ekspektasi Tarif / Gaji</span>
            <p className="mt-1 text-sm font-extrabold text-cyan-300">
              {talent.expected_salary > 0
                ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                : 'Dapat dinegosiasikan'}
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

        {/* Kontak Kandidat */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Kontak & Saluran Komunikasi</span>
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {talent.whatsapp_number ? (
              <a
                href={`https://wa.me/${talent.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Halo ${fullName}, kami menghubungi Anda dari LOXER terkait profil lowongan kerja / biodata Anda di platform kami.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Hubungi WhatsApp ({talent.whatsapp_number})</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">Nomor WhatsApp belum dicantumkan</span>
            )}

            {talent.portfolio_url && (
              <a
                href={talent.portfolio_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tautan Portfolio / CV</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
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

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            Tutup
          </button>
        </div>
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
  const { talents, loading, fetchTalents, togglePublish, deleteTalent } = useTalentCatalog(onToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedAvailability, setSelectedAvailability] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [previewTalent, setPreviewTalent] = useState<TalentMarketplacePost | null>(null);

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
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 space-y-3.5 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pelamar, posisi keahlian, atau domisili kota..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToSmartAdd}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition hover:scale-[1.02]"
            >
              <FileUp className="w-4 h-4" />
              <span>Smart Add CV</span>
            </button>

            <button
              onClick={fetchTalents}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
              title="Segarkan data talent"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>

            <div className="flex items-center rounded-xl border border-white/10 bg-slate-950 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Grid 1:1"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 shadow' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dropdowns & Category Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 border-t border-white/5">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
            className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="rounded-2xl border border-white/10 bg-slate-900 p-4 space-y-3">
              <SkeletonBlock className="aspect-square w-full rounded-xl" />
              <SkeletonBlock className="h-5 w-3/4" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredTalents.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Tidak ada data pelamar yang cocok</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan filter kategori dan domisili untuk menemukan talent.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
              setSelectedAvailability('all');
              setSelectedCity('all');
            }}
            className="rounded-xl border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* GRID VIEW: 1:1 Aspect Ratio Photo Cards (Matching Public Feed Layout) */}
      {!loading && viewMode === 'grid' && filteredTalents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

            return (
              <div
                key={talent.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 hover:border-cyan-500/40 hover:bg-slate-900 shadow-lg shadow-black/40 transition-all duration-300"
              >
                {/* 1:1 Aspect Ratio Photo Header */}
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-950/40 p-3">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={fullName}
                      className="h-full w-full object-cover object-center rounded-2xl opacity-90 transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-indigo-600/30 text-cyan-300 font-extrabold text-5xl">
                      {fullName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none rounded-2xl m-3" />

                  {/* Top Badges */}
                  <div className="absolute left-5 top-5 flex items-center gap-1.5">
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md ${badgeTheme}`}
                    >
                      {talent.badge || 'SIAP KERJA'}
                    </span>
                    {Boolean(talent.availability) && (
                      <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {AVAILABILITY_LABELS[talent.availability] || talent.availability}
                      </span>
                    )}
                  </div>

                  {/* Top Right: Verified / Publish indicator */}
                  <div className="absolute right-5 top-5 flex items-center gap-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold backdrop-blur-md ${
                        isPublished ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-slate-800/80 text-slate-400 border border-white/10'
                      }`}
                    >
                      {isPublished ? 'Tayang' : 'Draft'}
                    </span>
                  </div>

                  {/* Category & City Bar */}
                  <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] font-semibold text-slate-300">
                    <span className="truncate max-w-[120px] rounded-md bg-slate-950/70 border border-white/10 px-2 py-0.5 backdrop-blur-md">
                      {talent.category}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-slate-950/70 border border-white/10 px-2 py-0.5 backdrop-blur-md">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {talent.domicile_city || 'Cimahi'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wide text-white group-hover:text-cyan-300 transition truncate">
                      {fullName}
                    </h3>
                    <p className="text-xs text-slate-300 line-clamp-1 mt-0.5 font-medium">{talent.headline}</p>

                    {/* Salary / Rate */}
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-950/60 border border-white/5 px-2.5 py-1.5">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Ekspektasi:</span>
                      <span className="text-xs font-black text-cyan-300">
                        {talent.expected_salary > 0
                          ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                          : 'Dapat dinegosiasikan'}
                      </span>
                    </div>

                    {/* Bio snippet */}
                    <p className="mt-2 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {talent.bio || talent.bio_summary || 'Tidak ada deskripsi bio yang dicantumkan.'}
                    </p>

                    {/* Skills pills */}
                    {parsedSkills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {parsedSkills.slice(0, 3).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md border border-white/10 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
                          >
                            {skill}
                          </span>
                        ))}
                        {parsedSkills.length > 3 && (
                          <span className="rounded-md border border-white/5 bg-slate-900 px-1.5 py-0.5 text-[9px] text-slate-400">
                            +{parsedSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewTalent(talent)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/90 hover:bg-slate-700 py-1.5 text-xs font-bold text-white transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Biodata</span>
                      </button>

                      {talent.whatsapp_number && (
                        <a
                          href={`https://wa.me/${talent.whatsapp_number.replace(/\D/g, '')}?text=${encodeURIComponent(
                            `Halo ${fullName}, kami dari LOXER tertarik dengan profil Anda di platform kami.`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 p-1.5 text-emerald-300 transition"
                          title="Hubungi WhatsApp"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}

                      <button
                        onClick={() => togglePublish(talent)}
                        className={`rounded-xl border p-1.5 transition ${
                          isPublished
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={isPublished ? 'Nonaktifkan dari bursa publik' : 'Aktifkan ke bursa publik'}
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => deleteTalent(talent.id, fullName)}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 p-1.5 text-rose-300 transition"
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
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left">Foto & Nama</th>
                <th className="px-4 py-3 text-left">Posisi / Headline</th>
                <th className="px-4 py-3 text-left">Kategori & Kota</th>
                <th className="px-4 py-3 text-left">Ekspektasi Tarif</th>
                <th className="px-4 py-3 text-left">Ketersediaan</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-300 text-xs">
              {filteredTalents.map((talent, idx) => {
                const fullName = talent.seeker_profiles?.full_name || talent.headline.split(' / ')[0] || 'Kandidat';
                const photoUrl = talent.photo_url || talent.seeker_profiles?.photo_url;
                const isPublished = Number(talent.is_published) === 1;

                return (
                  <tr
                    key={talent.id}
                    className={`transition-colors ${
                      idx % 2 === 0 ? '!bg-[#0b1329] hover:!bg-[#1e2c4d]' : '!bg-[#162038] hover:!bg-[#1e2c4d]'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-800 border border-white/10">
                          {photoUrl ? (
                            <img src={photoUrl} alt={fullName} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-bold text-cyan-300">
                              {fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white uppercase">{fullName}</p>
                          <span className="text-[10px] text-cyan-400 font-semibold">{talent.badge || 'SIAP KERJA'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-200">{talent.headline}</td>
                    <td className="px-4 py-3">
                      <p className="text-white">{talent.category}</p>
                      <p className="text-slate-400 text-[11px]">{talent.domicile_city || 'Cimahi'}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-cyan-300">
                      {talent.expected_salary > 0
                        ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} / bln`
                        : 'Nego'}
                    </td>
                    <td className="px-4 py-3 capitalize">{talent.availability || 'fulltime'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isPublished
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/10'
                        }`}
                      >
                        {isPublished ? 'Tayang' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewTalent(talent)}
                          className="rounded-lg border border-white/10 bg-slate-800 px-2.5 py-1 text-xs text-white hover:bg-slate-700 transition"
                        >
                          Biodata
                        </button>
                        <button
                          onClick={() => togglePublish(talent)}
                          className="rounded-lg border border-white/10 px-2 py-1 hover:bg-white/5 transition"
                          title="Ubah publikasi"
                        >
                          {isPublished ? 'Draft' : 'Tayang'}
                        </button>
                        <button
                          onClick={() => deleteTalent(talent.id, fullName)}
                          className="rounded-lg border border-rose-500/30 text-rose-300 px-2 py-1 hover:bg-rose-500/10 transition"
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
      />
    </div>
  );
}

// ==============================================================================
// SECTION: SmartAddCvSection (AI Multimodal CV Parser & Extractor [Gemini 3.8])
// ==============================================================================
export function SmartAddCvSection({
  onToast,
  onSaved,
}: {
  onToast: (type: ToastType, message: string) => void;
  onSaved: () => void;
}) {
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [fileType, setFileType] = useState<'pdf' | 'image' | 'text'>('file' as any);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [cvText, setCvText] = useState<string>('');

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStep, setExtractStep] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    full_name: string;
    headline: string;
    category: string;
    availability: string;
    experience_years: number;
    expected_salary: number;
    rate_type: 'monthly' | 'hourly' | 'project';
    domicile_city: string;
    whatsapp_number: string;
    email: string;
    bio: string;
    skills: string[];
    portfolio_url: string;
    badge: string;
    photo_url: string;
    ai_notes: string;
    confidence_score: number;
  } | null>(null);

  const [skillInput, setSkillInput] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPdfJs = async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjs);
        } else {
          reject(new Error('PDF.js tidak terdefinisi'));
        }
      };
      script.onerror = () => reject(new Error('Gagal memuat modul pembaca PDF'));
      document.head.appendChild(script);
    });
  };

  const handleProcessFile = async (file: File) => {
    setExtractError(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(`${Math.round(file.size / 1024)} KB`);

    if (file.type.startsWith('image/')) {
      setFileType('image');
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        setFilePreviewUrl(res);
        setFileBase64(res);
      };
      reader.readAsDataURL(file);
      onToast('info', `Berkas gambar "${file.name}" siap diekstrak.`);
      return;
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setFileType('pdf');
      try {
        const pdfjs = await loadPdfJs();
        if (pdfjs) {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

          let extractedFullText = '';
          const pagesToRead = Math.min(pdf.numPages, 3);

          for (let i = 1; i <= pagesToRead; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const textItems = textContent.items.map((item: any) => item.str).join(' ');
            extractedFullText += `\n--- Halaman ${i} ---\n` + textItems;

            if (i === 1) {
              const viewport = page.getViewport({ scale: 1.5 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport }).promise;
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                setFilePreviewUrl(dataUrl);
                setFileBase64(dataUrl);
              }
            }
          }

          setCvText(extractedFullText);
          onToast('info', `Berkas PDF "${file.name}" (${pdf.numPages} halaman) siap diproses.`);
          return;
        }
      } catch (err: any) {
        console.warn('PDF.js client parse warning:', err);
      }

      // Fallback: read raw base64
      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
      onToast('info', `Berkas PDF "${file.name}" siap diproses oleh AI Gemini 3.8.`);
      return;
    }

    onToast('error', 'Format berkas tidak didukung. Harap upload PDF, JPG, PNG, atau WEBP.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleLoadSampleCv = () => {
    setSelectedFileName('CV_Azqy_Ahmad_Saputra_2026.pdf');
    setSelectedFileSize('245 KB');
    setFileType('pdf');
    const samplePhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    setFilePreviewUrl(samplePhoto);
    setFileBase64('');
    setCvText(`CURRICULUM VITAE
Nama: AZQY AHMAD SAPUTRA
Posisi Target: Operator Gudang & Packing / Logistik
Domisili: Kota Cimahi, Jawa Barat
WhatsApp / HP: 081223344556
Email: azqy.ahmad@example.com

RINGKASAN PROFIL:
Tenaga kerja muda berdedikasi tinggi dengan pengalaman 2+ tahun di bidang pergudangan, packing barang e-commerce, sortir kiriman, dan stock opname. Disiplin, fisik prima, terbiasa target harian dan kerja tim sistem shift.

KEAHLIAN UTAMA:
- Packing Barang Cepat & Aman
- Stock Opname & Manajemen Stok Gudang
- Sortir Pesanan & Labeling Resi
- Pengoperasian Hand Pallet & Forklift Manual
- Microsoft Excel Dasar (Input Data Stok)

PENGALAMAN KERJA:
1. PT Indologistik Prima - Cimahi
   Posisi: Operator Gudang & Packing (Januari 2022 - Desember 2023)
   - Bertanggung jawab mempacking lebih dari 350 paket e-commerce per hari sesuai SOP keamanan.
   - Melakukan stock opname mingguan dan meminimalisir selisih stok hingga di bawah 0.1%.
   - Mengoperasikan hand pallet untuk bongkar muat armada kurir.

2. Toko Sparepart Bandung - Bandung
   Posisi: Staf Sortir & Gudang (Maret 2021 - November 2021)
   - Sortir dan penataan rak sparepart otomotif.

PENDIDIKAN:
- SMK Negeri 1 Cimahi (Teknik Komputer & Jaringan, Lulus 2021)

EKSPEKTASI GAJI: Rp 4.200.000 / bulan (Nego)
STATUS: Siap Kerja Segera (Fulltime)`);

    onToast('info', 'Contoh CV Azqy Ahmad Saputra berhasil dimuat. Silakan klik "Mulai Ekstraksi AI".');
  };

  const handleSmartExtract = async () => {
    if (!fileBase64 && !cvText.trim()) {
      onToast('error', 'Harap upload berkas CV (PDF / Gambar) atau isi teks resume terlebih dahulu.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractStep(1);

    try {
      const stepTimer1 = setTimeout(() => setExtractStep(2), 1200);
      const stepTimer2 = setTimeout(() => setExtractStep(3), 3200);

      const { data: sessionData } = await (supabase ? supabase.auth.getSession() : { data: { session: null } });
      const token = sessionData?.session?.access_token || '';

      const resp = await fetch('/api/admin/smart-cv-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64: fileBase64,
          cvText: cvText.trim(),
          fileName: selectedFileName || 'CV Pelamar',
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${resp.status} dari 9Router Gemini 3.8`);
      }

      const resData = await resp.json();
      const cv = resData.cv;
      if (!cv) throw new Error('Data biodata CV tidak ditemukan dalam respon AI.');

      setFormData({
        full_name: cv.full_name || 'Pelamar Kerja',
        headline: cv.headline || 'Pencari Kerja Aktif',
        category: cv.category || 'Umum & Jasa',
        availability: cv.availability || 'fulltime',
        experience_years: Number(cv.experience_years) || 0,
        expected_salary: Number(cv.expected_salary) || 0,
        rate_type: cv.rate_type || 'monthly',
        domicile_city: cv.domicile_city || 'Cimahi / Bandung',
        whatsapp_number: cv.whatsapp_number || '',
        email: cv.email || '',
        bio: cv.bio || '',
        skills: Array.isArray(cv.skills) && cv.skills.length > 0 ? cv.skills : ['Komunikasi', 'Kerja Tim'],
        portfolio_url: cv.portfolio_url || '',
        badge: cv.badge || 'SIAP KERJA',
        photo_url: cv.photo_url || filePreviewUrl || '',
        ai_notes: cv.ai_notes || 'Biodata diekstrak secara otomatis oleh Agen AI Gemini 3.8 LOXER',
        confidence_score: cv.confidence_score || 95,
      });

      setIsExtracting(false);
      setExtractStep(0);
      onToast('success', 'Biodata CV berhasil diekstrak oleh Agen AI Gemini 3.8!');
    } catch (err: any) {
      console.error('[SmartAddCv Extract Error]:', err);
      setIsExtracting(false);
      setExtractStep(0);
      setExtractError(err.message || 'Gagal mengekstrak biodata CV.');
      onToast('error', `Gagal ekstrak CV: ${err.message}`);
    }
  };

  const handleAddSkill = () => {
    if (!formData) return;
    const trimmed = skillInput.trim();
    if (trimmed && !formData.skills.includes(trimmed)) {
      setFormData({ ...formData, skills: [...formData.skills, trimmed] });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skillToRemove),
    });
  };

  const handlePublishCv = async () => {
    if (!formData) return;
    if (!formData.full_name || !formData.headline) {
      onToast('error', 'Nama lengkap dan headline posisi wajib diisi.');
      return;
    }

    setIsPublishing(true);
    try {
      const { data: sessionData } = await (supabase ? supabase.auth.getSession() : { data: { session: null } });
      const token = sessionData?.session?.access_token || '';

      const resp = await fetch('/api/admin/publish-smart-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!resp.ok) {
        // Fallback: direct Supabase insert
        if (supabase) {
          const now = new Date().toISOString();
          const pId = `post_${Date.now()}`;
          const sId = `skr_${Date.now()}`;
          const uId = `usr_${Date.now()}`;

          await supabase.from('seeker_profiles').insert([
            {
              id: sId,
              user_id: uId,
              full_name: formData.full_name,
              photo_url: formData.photo_url || '',
              domicile_city: formData.domicile_city,
              about: formData.bio,
              phone: formData.whatsapp_number,
              expected_salary_min: formData.expected_salary,
              expected_salary_max: Math.round(formData.expected_salary * 1.3),
              created_at: now,
              updated_at: now,
            },
          ]);

          const { error: postErr } = await supabase.from('talent_marketplace_posts').insert([
            {
              id: pId,
              seeker_id: sId,
              user_id: uId,
              headline: formData.headline,
              category: formData.category,
              bio: formData.bio,
              bio_summary: formData.bio ? formData.bio.slice(0, 200) : '',
              skills: formData.skills,
              experience_years: formData.experience_years,
              availability: formData.availability,
              availability_status: formData.availability,
              expected_salary: formData.expected_salary,
              rate_type: formData.rate_type,
              domicile_city: formData.domicile_city,
              whatsapp_number: formData.whatsapp_number,
              portfolio_url: formData.portfolio_url,
              badge: formData.badge,
              photo_url: formData.photo_url,
              views_count: 0,
              is_published: 1,
              created_at: now,
              updated_at: now,
            },
          ]);

          if (postErr) throw postErr;
        } else {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.message || 'Gagal menerbitkan biodata pelamar');
        }
      }

      onToast('success', `Pelamar "${formData.full_name}" berhasil diterbitkan ke Bursa Talent LOXER!`);
      onSaved();
    } catch (err: any) {
      onToast('error', `Gagal menerbitkan pelamar: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: AI Smart Add CV Engine */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 p-6 shadow-xl backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Smart Add CV • 9Router Gemini 3.8 Multimodal OCR</span>
              <span className="rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-200">
                PDF & JPG Vision
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Unggah Berkas CV & Ekstraksi Biodata Otomatis</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload berkas CV pelamar (PDF, JPG, PNG, WEBP) atau paste teks biodata. Agen AI Gemini 3.8 membaca berkas visual secara mendalam, mengekstrak kualifikasi, riwayat kerja, pendidikan, dan kontak, lalu langsung menyesuaikannya ke dalam format bursa talent LOXER.
            </p>
          </div>

          <button
            onClick={handleLoadSampleCv}
            disabled={isExtracting}
            className="flex items-center gap-2 self-start md:self-center whitespace-nowrap rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
            title="Klik untuk mencoba otomatis dengan contoh CV Azqy Ahmad Saputra"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>⚡ Muat Contoh CV Pelamar</span>
          </button>
        </div>
      </div>

      {/* Input Source Selector Card */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-md shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Langkah 1: Masukkan Berkas CV Pelamar</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pilih metode input: unggah berkas dokumen CV (PDF / JPG / PNG) atau tempelkan teks resume langsung
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-950/80 p-1">
            <button
              onClick={() => setInputMode('file')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                inputMode === 'file'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Upload Berkas (PDF / JPG)</span>
            </button>
            <button
              onClick={() => setInputMode('text')}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                inputMode === 'text'
                  ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Teks CV / Resume</span>
            </button>
          </div>
        </div>

        {/* Mode: File Upload (PDF / Image) */}
        {inputMode === 'file' && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!filePreviewUrl && !fileBase64 ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-white/15 hover:border-cyan-400/50 rounded-2xl p-8 text-center transition group bg-slate-950/40 hover:bg-slate-950/70"
              >
                <div className="mx-auto w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  Tarik & lepas berkas CV ke sini, atau <span className="text-cyan-400 underline">pilih dari perangkat</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Mendukung format <strong>PDF</strong>, <strong>JPG</strong>, <strong>PNG</strong>, atau <strong>WEBP</strong> (Maks 15MB). AI Gemini 3.8 membaca visual & teks secara presisi.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-cyan-500/30 bg-slate-950/70 p-4">
                {filePreviewUrl ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                    <img src={filePreviewUrl} alt="CV Preview" className="h-full w-full object-cover object-center" />
                    <span className="absolute bottom-1 right-1 rounded bg-slate-950/80 px-1 text-[9px] font-bold text-cyan-300 uppercase">
                      {fileType}
                    </span>
                  </div>
                ) : (
                  <div className="h-20 w-20 shrink-0 flex items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300 font-bold">
                    PDF
                  </div>
                )}

                <div className="flex-1 text-center sm:text-left space-y-1">
                  <p className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{selectedFileName || 'Berkas CV Terpilih'}</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Ukuran: {selectedFileSize || 'Siap diekstrak'} • Siap diproses oleh AI Multimodal Gemini 3.8
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/10 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition"
                  >
                    Ganti Berkas
                  </button>
                  <button
                    onClick={() => {
                      setFilePreviewUrl(null);
                      setFileBase64('');
                      setSelectedFileName('');
                      setCvText('');
                    }}
                    className="rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 text-xs transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode: Paste Text */}
        {inputMode === 'text' && (
          <div className="space-y-3">
            <textarea
              rows={6}
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Tempel teks resume / biodata pelamar di sini (pengalaman, keahlian, pendidikan, kontak)..."
              className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed font-mono"
            />
          </div>
        )}

        {/* Action Button & Progress */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-slate-400">
            {isExtracting
              ? 'Sedang memproses... Harap tunggu beberapa detik.'
              : 'Klik tombol di samping untuk memindai berkas dan menyusun data kandidat.'}
          </p>

          <button
            onClick={handleSmartExtract}
            disabled={isExtracting || (!fileBase64 && !cvText.trim())}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className={`w-4 h-4 ${isExtracting ? 'animate-spin' : ''}`} />
            <span>{isExtracting ? 'Mengekstrak dengan Gemini 3.8...' : 'Mulai Ekstraksi AI dengan Gemini 3.8'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Extraction Step Progress */}
        {isExtracting && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-cyan-300 flex items-center gap-2">
                <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
                <span>Memproses Dokumen CV dengan Gemini 3.8 Multimodal</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-400">Langkah {extractStep} / 3</span>
            </div>

            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-400 to-cyan-400 h-1.5 transition-all duration-700"
                style={{ width: extractStep === 1 ? '33%' : extractStep === 2 ? '66%' : '95%' }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
              <span className={extractStep >= 1 ? 'text-cyan-300 font-bold' : ''}>1. Membaca visual & teks berkas</span>
              <span className={extractStep >= 2 ? 'text-cyan-300 font-bold' : ''}>2. Analisis kualifikasi & pengalaman</span>
              <span className={extractStep >= 3 ? 'text-cyan-300 font-bold' : ''}>3. Menyusun struktur bursa talent</span>
            </div>
          </div>
        )}

        {extractError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{extractError}</span>
          </div>
        )}
      </div>

      {/* Langkah 2: Review Form & Live Preview */}
      {formData && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Langkah 2: Tinjau & Sesuaikan Hasil Ekstraksi AI</span>
            </h3>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-[11px] font-bold text-emerald-300">
              Keyakinan AI: {formData.confidence_score}%
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Inputs (Left: 7 cols) */}
            <div className="lg:col-span-7 space-y-4 rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Nama Lengkap Pelamar *
                  </label>
                  <input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Headline Posisi / Profesi *
                  </label>
                  <input
                    value={formData.headline}
                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                    placeholder="Contoh: Operator Gudang & Packing"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Kategori Keahlian LOXER
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Teknologi & IT">Teknologi & IT</option>
                    <option value="Operasional & Logistik">Operasional & Logistik</option>
                    <option value="Keuangan & Akuntansi">Keuangan & Akuntansi</option>
                    <option value="Servis Elektronik & Komputer">Servis Elektronik & Komputer</option>
                    <option value="Bengkel & Otomotif">Bengkel & Otomotif</option>
                    <option value="Kebersihan & Cleaning Service">Kebersihan & Cleaning Service</option>
                    <option value="Desain, Percetakan & Sablon">Desain, Percetakan & Sablon</option>
                    <option value="Pemasaran & Digital">Pemasaran & Digital</option>
                    <option value="Umum & Jasa">Umum & Jasa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Ketersediaan Kerja
                  </label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="fulltime">Di Tempat / Bengkel (Fulltime)</option>
                    <option value="freelance">Layanan Panggilan (Freelance)</option>
                    <option value="parttime">Fleksibel (Parttime)</option>
                    <option value="remote">Borongan / Jarak Jauh (Remote)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Ekspektasi Gaji (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.expected_salary}
                    onChange={(e) => setFormData({ ...formData, expected_salary: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Tipe Tarif
                  </label>
                  <select
                    value={formData.rate_type}
                    onChange={(e) => setFormData({ ...formData, rate_type: e.target.value as any })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="monthly">Per Bulan</option>
                    <option value="hourly">Per Jam</option>
                    <option value="project">Per Proyek / Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Pengalaman (Tahun)
                  </label>
                  <input
                    type="number"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: Number(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Kota Domisili
                  </label>
                  <input
                    value={formData.domicile_city}
                    onChange={(e) => setFormData({ ...formData, domicile_city: e.target.value })}
                    placeholder="Contoh: Cimahi"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Nomor WhatsApp / HP
                  </label>
                  <input
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                    placeholder="Contoh: 08123456789"
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Ringkasan Profil (Bio)
                </label>
                <textarea
                  rows={3}
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white focus:outline-none focus:border-cyan-500 leading-relaxed"
                />
              </div>

              {/* Skills Tags Editor */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Keahlian & Tag Keterampilan
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.skills.map((skill, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-950/40 px-2.5 py-1 text-xs text-cyan-300 font-medium"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Tambah keahlian baru (tekan Enter)..."
                    className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="rounded-xl border border-cyan-500/30 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30 transition"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Badge Khusus
                  </label>
                  <select
                    value={formData.badge}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="SIAP KERJA">SIAP KERJA</option>
                    <option value="TOP TALENT">TOP TALENT</option>
                    <option value="FREELANCER">FREELANCER</option>
                    <option value="TERVERIFIKASI">TERVERIFIKASI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    URL Foto Profil / Dokumen
                  </label>
                  <input
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="data:image/... atau https://..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono truncate"
                  />
                </div>
              </div>

              {/* AI Notes */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Catatan Evaluasi AI Gemini 3.8</span>
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{formData.ai_notes}</p>
              </div>

              {/* Publish Action Buttons */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setFormData(null)}
                  className="rounded-xl border border-white/10 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  Batal / Reset
                </button>

                <button
                  type="button"
                  onClick={handlePublishCv}
                  disabled={isPublishing}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/25 transition disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isPublishing ? 'Menerbitkan ke LOXER...' : 'Terbitkan ke Bursa Talent LOXER'}</span>
                </button>
              </div>
            </div>

            {/* Live 1:1 Preview Card (Right: 5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pratinjau Kartu Pelamar (1:1 Aspect Ratio)
                </span>
                <span className="text-[10px] text-cyan-400 font-semibold">Tampilan Bursa Publik</span>
              </div>

              {/* Exact Card Component */}
              <div className="overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-2xl">
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-950/40 p-3">
                  {formData.photo_url ? (
                    <img
                      src={formData.photo_url}
                      alt={formData.full_name}
                      className="h-full w-full object-cover object-center rounded-2xl opacity-90"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-indigo-600/30 text-cyan-300 font-extrabold text-5xl">
                      {formData.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none rounded-2xl m-3" />

                  {/* Badges */}
                  <div className="absolute left-5 top-5 flex items-center gap-1.5">
                    <span className="rounded-md border border-cyan-400/40 bg-cyan-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-300 backdrop-blur-md">
                      {formData.badge || 'SIAP KERJA'}
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {formData.availability === 'fulltime' ? 'Di Tempat / Bengkel' : formData.availability}
                    </span>
                  </div>

                  <div className="absolute right-5 top-5">
                    <ShieldCheck className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] font-semibold text-slate-300">
                    <span className="truncate max-w-[130px] rounded-md bg-slate-950/70 border border-white/10 px-2 py-0.5 backdrop-blur-md">
                      {formData.category}
                    </span>
                    <span className="flex items-center gap-1 rounded-md bg-slate-950/70 border border-white/10 px-2 py-0.5 backdrop-blur-md">
                      <MapPin className="w-3 h-3 text-cyan-400" />
                      {formData.domicile_city || 'Cimahi'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="text-sm font-black uppercase tracking-wide text-white truncate">
                    {formData.full_name || 'Nama Pelamar'}
                  </h3>
                  <p className="text-xs text-slate-300 font-medium line-clamp-1">{formData.headline}</p>

                  <div className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-white/5 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Ekspektasi:</span>
                    <span className="text-xs font-black text-cyan-300">
                      {formData.expected_salary > 0
                        ? `Rp ${formData.expected_salary.toLocaleString('id-ID')} / bln`
                        : 'Dapat dinegosiasikan'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {formData.bio || 'Ringkasan profil profesional kandidat.'}
                  </p>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {formData.skills.slice(0, 4).map((skill, idx) => (
                      <span
                        key={idx}
                        className="rounded-md border border-white/10 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <div className="flex-1 text-center rounded-xl bg-cyan-500/20 border border-cyan-400/30 py-2 text-xs font-bold text-cyan-300">
                      👁️ Pratinjau Biodata
                    </div>
                    {formData.whatsapp_number && (
                      <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/30 p-2 text-emerald-300">
                        <Phone className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
