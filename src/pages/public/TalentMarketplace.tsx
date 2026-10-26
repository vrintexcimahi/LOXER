import { useEffect, useState, useMemo } from 'react';
import {
  Search,
  Users,
  RefreshCw,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import TalentCard from '../../components/marketplace/TalentCard';
import TalentDetailModal from '../../components/marketplace/TalentDetailModal';
import ProtectedTalentChatModal from '../../components/marketplace/ProtectedTalentChatModal';
import AuthModal from '../auth/AuthModal';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import { TalentMarketplacePost, UserRole } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { navigateTo } from '../../lib/navigation';

const CATEGORIES = [
  'Semua',
  'Administrasi & HRD',
  'Kasir, Barista & F&B',
  'Sales, Marketing & Promosi',
  'Operator Produksi & Gudang',
  'Teknisi, IT & Multimedia',
  'Driver, Logistik & Pengantaran',
  'Keuangan & Akuntansi',
  'Customer Service & Resepsionis',
  'Pendidikan & Pengajar',
];

export default function TalentMarketplace() {
  const { user } = useAuth();
  const { requireApp } = useAppAccess();

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
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedTalent, setSelectedTalent] = useState<TalentMarketplacePost | null>(null);
  const [chatTalent, setChatTalent] = useState<TalentMarketplacePost | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');

  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q !== null) setSearchQuery(q);
      const cat = params.get('category');
      if (cat && CATEGORIES.includes(cat)) setSelectedCategory(cat);
    };

    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, []);

  // Hero content removed for clean layout

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
      // Pastikan kandidat yang diarsipkan atau non-aktif tidak pernah tampil di bursa publik
      if (Number(t.is_archived) === 1 || Number(t.is_published) !== 1) {
        return false;
      }

      const matchesCategory =
        selectedCategory === 'Semua' || t.category === selectedCategory;

      const matchesCity =
        selectedCity === 'all' ||
        (t.domicile_city || '').toLowerCase() === selectedCity.toLowerCase();

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

      return matchesCategory && matchesCity && matchesQuery;
    });
  }, [talents, selectedCategory, selectedCity, searchQuery]);

  const handleOpenRegister = (role: UserRole = 'seeker') => {
    if (!requireApp('Mendaftar Akun')) {
      return;
    }
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  const handleNavigatePost = () => {
    if (!requireApp('Lengkapi Profil CV Pekerja')) {
      return;
    }
    if (!user) {
      setAuthInitialRole('seeker');
      setAuthMode('login');
      return;
    }
    navigateTo('/seeker/profile');
  };
  void handleNavigatePost;

  return (
    <div className="loxer-workspace min-h-screen bg-slate-50 dark:bg-[#071220] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black pb-20 md:pb-0 transition-colors duration-200">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={handleOpenRegister}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-1 sm:pt-2 pb-6 sm:pb-8 space-y-5 sm:space-y-6">
        

        {/* Search & Filter Bar */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                aria-label="Cari keahlian, nama, atau posisi"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari keahlian (React, Barista, Desain), nama, atau posisi..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/90 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400 shadow-sm"
              />
            </div>

            {/* City Filter & Refresh */}
            <div className="loxer-talent-filters flex items-center gap-2">
              <select
                aria-label="Kota talent"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-white focus:outline-none focus:border-cyan-400 shadow-sm"
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
                className="p-2.5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
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
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="h-64 sm:h-80 rounded-xl sm:rounded-2xl border border-white/5 bg-slate-900/50 animate-pulse p-2.5 sm:p-4 space-y-2.5 sm:space-y-4"
                >
                  <div className="h-28 sm:h-36 rounded-lg sm:rounded-xl bg-slate-800" />
                  <div className="h-3 sm:h-4 w-3/4 rounded bg-slate-800" />
                  <div className="h-3 sm:h-4 w-1/2 rounded bg-slate-800" />
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
                  setSelectedCity('all');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-5">
              {filteredTalents.map((talent) => (
                <TalentCard
                  key={talent.id}
                  talent={talent}
                  onSelect={(t) => setSelectedTalent(t)}
                  onOfferJob={(t) => setChatTalent(t)}
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

      {/* Ruang Chat Otomatis Resmi Terproteksi */}
      <ProtectedTalentChatModal
        talent={chatTalent}
        isOpen={Boolean(chatTalent)}
        onClose={() => setChatTalent(null)}
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

      {/* Footer removed from TalentMarketplace page */}

      {/* Mobile Bottom Navigation Bar for Mobile Visitors */}
      <PublicMobileBottomNav
        currentPath="/talents"
        onLogin={() => setAuthMode('login')}
      />
    </div>
  );
}
