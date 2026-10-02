import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Sparkles,
  Users,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import TalentCard from '../../components/marketplace/TalentCard';
import TalentDetailModal from '../../components/marketplace/TalentDetailModal';
import AuthModal from '../auth/AuthModal';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import HeroBannerSlideshow from '../../components/banner/HeroBannerSlideshow';
import { TalentMarketplacePost, UserRole } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';

const CATEGORIES = [
  'Semua',
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
  'Jasa Rumah Tangga & Lainnya',
];

export default function TalentMarketplace() {
  const { user } = useAuth();
  const { requireApp } = useAppAccess();
  const parseAvailabilityFromUrl = () => {
    if (typeof window === 'undefined') return 'all';
    const params = new URLSearchParams(window.location.search);
    const avail = params.get('availability');
    if (avail && ['all', 'fulltime', 'freelance', 'parttime', 'remote'].includes(avail.toLowerCase())) {
      return avail.toLowerCase();
    }
    const type = params.get('type') || params.get('tab');
    if (type === 'pelamar' || type === 'pelamar-kerja' || type === 'fulltime') return 'fulltime';
    if (type === 'freelance' || type === 'freelancer' || type === 'jasa') return 'freelance';
    return 'all';
  };

  const [talents, setTalents] = useState<TalentMarketplacePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('q') || '';
  });
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (typeof window === 'undefined') return 'Semua';
    const cat = new URLSearchParams(window.location.search).get('category');
    return cat && CATEGORIES.includes(cat) ? cat : 'Semua';
  });
  const [selectedAvailability, setSelectedAvailability] = useState<string>(parseAvailabilityFromUrl);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedTalent, setSelectedTalent] = useState<TalentMarketplacePost | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');

  useEffect(() => {
    const handleUrlChange = () => {
      setSelectedAvailability(parseAvailabilityFromUrl());
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q !== null) setSearchQuery(q);
      const cat = params.get('category');
      if (cat && CATEGORIES.includes(cat)) setSelectedCategory(cat);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  const heroContent = useMemo(() => {
    if (selectedAvailability === 'fulltime') {
      return {
        badge: 'Bursa Pelamar Kerja & Talent Terverifikasi',
        title: 'Temukan Pelamar Kerja Siap Rekrut Langsung',
        highlight: 'Karir Purna Waktu (Fulltime)',
        desc: 'Jelajahi portofolio, biodata, dan keahlian pelamar kerja aktif yang siap bergabung secara profesional di perusahaan Anda.',
        icon: Users,
      };
    }
    if (selectedAvailability === 'freelance') {
      return {
        badge: 'Bursa Penyedia Jasa Mandiri & Layanan Panggilan',
        title: 'Temukan Penyedia Jasa Mandiri Terpercaya',
        highlight: 'Layanan Panggilan & Di Tempat',
        desc: 'Pesan jasa pijat & refleksi, bengkel motor/mobil, servis komputer & elektronik, pertukangan, kebersihan, dan aneka keahlian jasa mandiri profesional.',
        icon: Zap,
      };
    }
    return {
      badge: 'Marketplace Pencari Kerja & Reverse Hiring',
      title: 'Temukan Talent Siap Kerja &',
      highlight: 'Tawarkan Pekerjaan Langsung',
      desc: 'Jelajahi portofolio, biodata, dan keahlian pencari kerja terverifikasi. Perusahaan dapat langsung menawarkan posisi kerja resmi dengan proteksi transaksi dan kontrak kerja terintegrasi di platform LOXER.',
      icon: Sparkles,
    };
  }, [selectedAvailability]);

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('talent_marketplace_posts')
        .select('*, seeker_profiles(*)')
        .eq('is_published', 1)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching talent posts:', error);
        // Fallback: try querying without join if profiles join fails
        const { data: fallbackData } = await supabase
          .from('talent_marketplace_posts')
          .select('*')
          .eq('is_published', 1)
          .order('created_at', { ascending: false });

        if (fallbackData) {
          setTalents(fallbackData as TalentMarketplacePost[]);
        }
      } else if (data) {
        setTalents(data as TalentMarketplacePost[]);
      }
    } catch (err) {
      console.error('Error loading marketplace:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTalents();
  }, []);

  const cities = useMemo(() => {
    const set = new Set<string>();
    talents.forEach((t) => {
      if (t.domicile_city) set.add(t.domicile_city);
    });
    return Array.from(set);
  }, [talents]);

  const filteredTalents = useMemo(() => {
    return talents.filter((t) => {
      const matchesCategory =
        selectedCategory === 'Semua' || t.category === selectedCategory;

      const matchesAvailability =
        selectedAvailability === 'all' ||
        t.availability.toLowerCase() === selectedAvailability.toLowerCase();

      const matchesCity =
        selectedCity === 'all' ||
        t.domicile_city.toLowerCase() === selectedCity.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const skillsStr = Array.isArray(t.skills)
        ? t.skills.join(' ')
        : typeof t.skills === 'string'
          ? t.skills
          : '';

      const matchesQuery =
        !q ||
        t.headline.toLowerCase().includes(q) ||
        t.bio.toLowerCase().includes(q) ||
        skillsStr.toLowerCase().includes(q) ||
        (t.seeker_profiles?.full_name || '').toLowerCase().includes(q);

      return matchesCategory && matchesAvailability && matchesCity && matchesQuery;
    });
  }, [talents, selectedCategory, selectedAvailability, selectedCity, searchQuery]);

  const handleOpenRegister = (role: UserRole = 'seeker') => {
    if (!requireApp('Mendaftar Akun')) {
      return;
    }
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  const handleNavigatePost = () => {
    if (!requireApp('Posting Biodata & Jasa')) {
      return;
    }
    if (!user) {
      setAuthInitialRole('seeker');
      setAuthMode('login');
      return;
    }
    window.location.href = '/seeker/marketplace';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black pb-20 md:pb-0">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={handleOpenRegister}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section: Large Slideshow on Top, Compact Text Underneath */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 p-4 sm:p-6 lg:p-7 shadow-2xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -bottom-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* 1. Large Slideshow on Top */}
          <div className="relative z-10 w-full mb-4 sm:mb-5">
            <HeroBannerSlideshow
              initialSlide={selectedAvailability === 'freelance' ? 2 : 1}
              variant="embedded"
              onRegister={handleOpenRegister}
            />
          </div>

          {/* 2. Compact Text & Actions Below */}
          <div className="relative z-10 border-t border-white/10 pt-3.5 sm:pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  <heroContent.icon className="w-3 h-3 text-cyan-400" />
                  <span>{heroContent.badge}</span>
                </span>
              </div>

              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug">
                {heroContent.title}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                  {heroContent.highlight}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                {heroContent.desc}
              </p>
            </div>

            {/* Quick Actions & Seeker Promo */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleNavigatePost}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-md shadow-cyan-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Posting Biodata &amp; Jasa
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transaksi Resmi</span>
              </div>
            </div>
          </div>
        </section>

        {/* Search & Filter Bar */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keahlian (React, Barista, Desain), nama, atau posisi..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 shadow-inner"
              />
            </div>

            {/* Availability Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedAvailability}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAvailability(val);
                  const params = new URLSearchParams(window.location.search);
                  if (val === 'all') {
                    params.delete('availability');
                    params.delete('type');
                    params.delete('tab');
                  } else {
                    params.set('availability', val);
                  }
                  const newSearch = params.toString() ? `?${params.toString()}` : '';
                  window.history.pushState({}, '', `${window.location.pathname}${newSearch}`);
                }}
                className="px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Kategori (Marketplace)</option>
                <option value="fulltime">Pelamar Kerja (Fulltime)</option>
                <option value="freelance">Jasa (Penyedia Jasa Mandiri)</option>
                <option value="parttime">Part-time</option>
                <option value="remote">Layanan Panggilan / Remote</option>
              </select>

              {/* City Filter */}
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Kota</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                onClick={fetchTalents}
                title="Segarkan data"
                className="p-2.5 rounded-2xl border border-white/10 bg-slate-900 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                      : 'bg-slate-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Talent Grid Display */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Daftar Talent ({filteredTalents.length})
            </h2>
            <span className="text-xs text-slate-400">
              Format Grid Foto 1:1 &amp; Rekrut Terproteksi
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-2xl border border-white/5 bg-slate-900/50 animate-pulse p-4 space-y-4"
                >
                  <div className="h-36 rounded-xl bg-slate-800" />
                  <div className="h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-4 w-1/2 rounded bg-slate-800" />
                </div>
              ))}
            </div>
          ) : filteredTalents.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-white/10 bg-slate-900/30">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">
                Belum ada talent yang cocok dengan pencarian
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Coba ubah kata kunci pencarian atau bersihkan filter kategori dan domisili.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Semua');
                  setSelectedAvailability('all');
                  setSelectedCity('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredTalents.map((talent) => (
                <TalentCard
                  key={talent.id}
                  talent={talent}
                  onSelect={(t) => setSelectedTalent(t)}
                  onOfferJob={(t) => setSelectedTalent(t)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Detail & Direct Offer Modal */}
      <TalentDetailModal
        talent={selectedTalent}
        isOpen={Boolean(selectedTalent)}
        onClose={() => setSelectedTalent(null)}
      />

      {/* Auth Modal for Guests */}
      {authMode && (
        <AuthModal
          mode={authMode}
          initialRole={authInitialRole}
          onClose={() => setAuthMode(null)}
          onSwitchMode={setAuthMode}
        />
      )}

      {/* Public Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Bar for Mobile Visitors */}
      <PublicMobileBottomNav
        currentPath="/talents"
        onLogin={() => setAuthMode('login')}
      />
    </div>
  );
}
