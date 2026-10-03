// ==============================================================================
// LOXER Admin - Developer Mode (Role-Focused Testing Workbench & Demo Access)
// v3.0 - Fokus Tampilan Per-Role + Akses Login Khusus User Demo
// ==============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Smartphone, Monitor, RotateCw, Lock,
  Maximize2, Minimize2, Wifi, Battery, Sparkles,
  Columns, Shield, Briefcase, Users, LayoutGrid,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';

export type ActiveRoleTab = 'quad-roles' | 'dual-view';

interface SubFeatureLink {
  label: string;
  path: string;
  icon: string;
  description: string;
}

interface TestChecklistItem {
  title: string;
  desc: string;
  targetPath: string;
}

interface RoleConfig {
  id: 'seeker' | 'employer' | 'freelancer' | 'admin';
  tabId?: string;
  title: string;
  shortLabel: string;
  badge: string;
  badgeClass: string;
  accentColor: 'cyan' | 'emerald' | 'amber' | 'rose';
  icon: typeof Users;
  demoUser: {
    name: string;
    email: string;
    password: string;
    headline: string;
    city: string;
    stats: string;
    redirectPath: string;
    summary: string;
  };
  subFeatures: SubFeatureLink[];
  testChecklist: TestChecklistItem[];
}

const ROLE_CONFIGS: RoleConfig[] = [
  {
    id: 'seeker',
    tabId: 'role-seeker',
    title: 'Pencari Kerja',
    shortLabel: 'Pencari Kerja',
    badge: 'ROLE 1 · PENCARI KERJA',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    accentColor: 'cyan',
    icon: Users,
    demoUser: {
      name: 'Budi Santoso',
      email: 'seeker@demo.com',
      password: 'seeker123',
      headline: 'Software Engineer (Frontend & TypeScript)',
      city: 'Jakarta Selatan',
      stats: '1 Lamaran Aktif · 5 Keahlian Terverifikasi · Profil Lengkap',
      redirectPath: '/seeker/dashboard',
      summary: 'Akun demo Pencari Kerja terverifikasi. Dilengkapi dengan riwayat lamaran kerja, profil CV digital, portofolio skill, dan akses penuh ke lowongan kerja nasional.',
    },
    subFeatures: [
      { label: 'Dashboard Seeker', path: '/seeker/dashboard', icon: '📊', description: 'Statistik lamaran, status verifikasi, & rekomendasi pekerjaan' },
      { label: 'Jelajah Lowongan', path: '/browse', icon: '🔍', description: 'Cari & filter loker berdasarkan gaji, lokasi, dan kategori kerja' },
      { label: 'Status Lamaran', path: '/seeker/applications', icon: '📄', description: 'Tracking tahapan seleksi (Terkirim, Review, Interview)' },
      { label: 'Profil & CV Digital', path: '/seeker/profile', icon: '👤', description: 'Kelola data diri, riwayat pendidikan, & skill keahlian' },
      { label: 'Marketplace Biodata', path: '/seeker/marketplace', icon: '🌟', description: 'Publikasikan profil ke bursa talent agar dilirik perusahaan' },
    ],
    testChecklist: [
      { title: 'Uji Lamar 1-Klik', desc: 'Buka lowongan dan klik "Lamar Sekarang" tanpa upload dokumen tambahan', targetPath: '/browse' },
      { title: 'Tracking Status Seleksi', desc: 'Periksa progress lamaran di halaman Status Lamaran', targetPath: '/seeker/applications' },
      { title: 'Kelola Portofolio & Skill', desc: 'Edit keahlian dan data pendidikan di profil pencari kerja', targetPath: '/seeker/profile' },
      { title: 'Publikasi Biodata Terbuka', desc: 'Atur visibilitas biodata agar muncul di bursa talent nasional', targetPath: '/seeker/marketplace' },
    ],
  },
  {
    id: 'employer',
    tabId: 'role-employer',
    title: 'Perusahaan / HRD',
    shortLabel: 'Perusahaan (HRD)',
    badge: 'ROLE 2 · PERUSAHAAN / HRD',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    accentColor: 'emerald',
    icon: Briefcase,
    demoUser: {
      name: 'PT Vrintex Solusi Teknologi',
      email: 'employer@demo.com',
      password: 'employer123',
      headline: 'Tech Enterprise & Talent Solutions',
      city: 'Jakarta Selatan',
      stats: '3 Lowongan Aktif · Pipeline Pelamar Masuk · Perusahaan Terverifikasi',
      redirectPath: '/employer/dashboard',
      summary: 'Akun demo HRD Perusahaan terverifikasi resmi. Dilengkapi 3 lowongan aktif, sistem screening pelamar masuk, manajemen lowongan, dan pencarian talent terampil.',
    },
    subFeatures: [
      { label: 'Dashboard HRD', path: '/employer/dashboard', icon: '📊', description: 'Ringkasan metrik pelamar masuk, status lowongan, & aktivitas' },
      { label: 'Pasang Loker Baru', path: '/employer/jobs/new', icon: '➕', description: 'Form pembuatan lowongan baru lengkap dengan kuota & gaji' },
      { label: 'Kelola Lowongan', path: '/employer/jobs', icon: '📋', description: 'Daftar loker aktif, tutup/buka lowongan, & edit spesifikasi' },
      { label: 'Review Pelamar Masuk', path: '/employer/applicants', icon: '👥', description: 'Screening pipeline kandidat (Review, Interview, Keputusan)' },
      { label: 'Profil Perusahaan', path: '/employer/company', icon: '🏢', description: 'Branding profil kantor, logo, website, & informasi industri' },
      { label: 'Sourcing Talent Market', path: '/talents', icon: '🔎', description: 'Cari & undang langsung kandidat terbaik dari marketplace talent' },
    ],
    testChecklist: [
      { title: 'Pasang Lowongan Baru', desc: 'Uji form posting lowongan dengan range gaji dan kualifikasi', targetPath: '/employer/jobs/new' },
      { title: 'Review & Seleksi Kandidat', desc: 'Buka pelamar masuk dan ubah status ke interview atau diterima', targetPath: '/employer/applicants' },
      { title: 'Kelola Status Lowongan', desc: 'Edit lowongan aktif atau tutup lowongan yang telah terpenuhi', targetPath: '/employer/jobs' },
      { title: 'Direct Hiring via WhatsApp', desc: 'Cari talent di bursa dan kontak via tombol WhatsApp langsung', targetPath: '/talents' },
    ],
  },
  {
    id: 'freelancer',
    tabId: 'role-freelancer',
    title: 'Jasa (Penyedia Jasa Mandiri)',
    shortLabel: 'Jasa',
    badge: 'ROLE 3 · PENYEDIA JASA MANDIRI',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentColor: 'amber',
    icon: Sparkles,
    demoUser: {
      name: 'Arifin Ahmad',
      email: 'arifin.ahmad@example.com',
      password: 'seeker123',
      headline: 'Teknisi Servis Komputer & Panggilan AC',
      city: 'Bandung',
      stats: 'Badge SIAP PANGGILAN · Tarif Rp 150.000/kunjungan · Bengkel & Panggilan',
      redirectPath: '/seeker/marketplace',
      summary: 'Akun demo Penyedia Jasa Mandiri (misal: jasa pijat, bengkel motor/mobil, servis komputer, pertukangan). Memiliki posting jasa aktif di marketplace dengan penawaran layanan langsung.',
    },
    subFeatures: [
      { label: 'Kelola Jasa', path: '/seeker/marketplace', icon: '🌟', description: 'Atur posting jasa mandiri, tarif layanan, bio, & kesiapan panggilan' },
      { label: 'Katalog Jasa', path: '/talents', icon: '🌐', description: 'Tampilan profil di bursa jasa mandiri yang dilihat pelanggan publik' },
      { label: 'Panggilan', path: '/talents?availability=freelance', icon: '🛵', description: 'Katalog jasa mandiri siap dipanggil ke lokasi pemesan' },
      { label: 'Bengkel & Servis', path: '/talents?category=Servis+Elektronik+%26+Komputer', icon: '🔧', description: 'Kategori spesifik bengkel motor dan servis komputer/elektronik' },
      { label: 'Profil & Kontak WA', path: '/seeker/profile', icon: '👤', description: 'Kelola identitas penyedia jasa dan nomor kontak pemesanan' },
    ],
    testChecklist: [
      { title: 'Edit Penawaran Tarif Jasa', desc: 'Uji update tarif per layanan, per kunjungan, atau per jam di marketplace', targetPath: '/seeker/marketplace' },
      { title: 'Verifikasi Badge Penyedia Jasa', desc: 'Pastikan profil jasa tampil dengan badge aktif di katalog marketplace', targetPath: '/talents' },
      { title: 'Simulasi Kontak Layanan Panggilan', desc: 'Uji respon order dan penerimaan tawaran kerja jasa mandiri', targetPath: '/seeker/marketplace' },
      { title: 'Integrasi WhatsApp Direct', desc: 'Uji tombol kontak langsung untuk pemesanan jasa dari pelanggan', targetPath: '/talents' },
    ],
  },
  {
    id: 'admin',
    tabId: 'role-admin',
    title: 'Super Admin (God Mode)',
    shortLabel: 'Super Admin',
    badge: 'ROLE 4 · SUPER ADMIN (GOD MODE)',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    accentColor: 'rose',
    icon: Shield,
    demoUser: {
      name: 'Super Admin (vrintex)',
      email: 'vrintex',
      password: 'kayaraya3+',
      headline: 'Platform Master Controller & Chief Administrator',
      city: 'System Server',
      stats: 'God Mode Active · Bypass Auth · Full Database Read/Write',
      redirectPath: '/admin/dashboard',
      summary: 'Akun Super Admin dengan hak akses tak terbatas (God Mode). Dilengkapi kontrol audit sistem, manajemen user, kontrol device, integrasi API lowongan, dan monitoring database.',
    },
    subFeatures: [
      { label: 'Overview Monitoring', path: '/admin/dashboard', icon: '📊', description: 'Statistik ekosistem real-time, aktivitas transaksi, & status node' },
      { label: 'Manajemen Users', path: '/admin/users', icon: '👥', description: 'Manajemen akun, role, device intelligence, & registry perangkat' },
      { label: 'Integrasi API Lowongan', path: '/admin/integrations', icon: '🔌', description: 'Status koneksi provider lowongan mitra & publik' },
      { label: 'Database & Backup', path: '/admin/backup', icon: '💾', description: 'Snapshot database SQLite & restore point sistem' },
      { label: 'Audit Log Monitoring', path: '/admin/monitoring', icon: '📋', description: 'Log realtime HTTP request, autentikasi, & error tracing' },
    ],
    testChecklist: [
      { title: 'Uji Manajemen Users', desc: 'Buka pusat kendali user, role, device intelligence, dan audit sesi', targetPath: '/admin/users' },
      { title: 'Validasi Integrasi API', desc: 'Periksa status provider lowongan dan endpoint live', targetPath: '/admin/integrations' },
      { title: 'Database Health Check', desc: 'Cek status ukuran database dan tabel utama platform', targetPath: '/admin/backup' },
    ],
  },
];

export default function DeveloperWorkbench() {
  const [activeTab, setActiveTab] = useState<ActiveRoleTab>('quad-roles');
  const cacheBuster = false;
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('09:41');

  // Paths per role
  const [rolePaths] = useState<Record<string, string>>({
    seeker: '/seeker/dashboard',
    employer: '/employer/dashboard',
    freelancer: '/seeker/marketplace',
    admin: '/admin/dashboard',
  });

  // Dual View state
  const [dualPath, setDualPath] = useState('/');
  const [dualInputUrl, setDualInputUrl] = useState('/');
  const [splitRatio, setSplitRatio] = useState<number>(25);

  // Refs for Iframes
  const iframeSeekerRef = useRef<HTMLIFrameElement | null>(null);
  const iframeEmployerRef = useRef<HTMLIFrameElement | null>(null);
  const iframeFreelancerRef = useRef<HTMLIFrameElement | null>(null);
  const iframeAdminRef = useRef<HTMLIFrameElement | null>(null);
  const iframeDualMobileRef = useRef<HTMLIFrameElement | null>(null);
  const iframeDualDesktopRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time updater
  useEffect(() => {
    const upd = () => {
      const n = new Date();
      setCurrentTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
    };
    upd();
    const t = setInterval(upd, 10000);
    return () => clearInterval(t);
  }, []);

  const getRoleRef = (roleId: string) => {
    if (roleId === 'seeker') return iframeSeekerRef;
    if (roleId === 'employer') return iframeEmployerRef;
    if (roleId === 'freelancer') return iframeFreelancerRef;
    return iframeAdminRef;
  };

  const getIframeUrl = useCallback((path: string, previewRole?: string) => {
    const cp = path.startsWith('/') ? path : `/${path}`;
    const sep = cp.includes('?') ? '&' : '?';
    let url = cp;
    if (previewRole) {
      url = `${cp}${sep}sim_role=${previewRole}&preview_role=${previewRole}`;
    }
    if (cacheBuster) {
      const cbSep = url.includes('?') ? '&' : '?';
      url = `${url}${cbSep}_cb=${Date.now()}`;
    }
    return url;
  }, [cacheBuster]);

  const reloadRole = (roleId: string) => {
    const current = rolePaths[roleId];
    const ref = getRoleRef(roleId);
    if (ref.current) {
      ref.current.src = getIframeUrl(current, roleId);
    }
  };

  const navigateDual = (targetPath: string) => {
    const cp = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    setDualPath(cp);
    setDualInputUrl(cp);
    const url = getIframeUrl(cp);
    if (iframeDualMobileRef.current) iframeDualMobileRef.current.src = url;
    if (iframeDualDesktopRef.current) iframeDualDesktopRef.current.src = url;
  };

  const reloadDual = () => navigateDual(dualPath);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <GodModeLayout
      title="Developer Mode Workbench (Quad-Role Testing)"
      description="Simulator multi-layar 4 role serentak (Pencari Kerja, Perusahaan, Jasa, Admin)"
      actions={
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('quad-roles')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'quad-roles'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="4 Layar Simultan"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">4 Layar</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dual-view')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'dual-view'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Dual View (Mobile & Desktop)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dual View</span>
            </button>
          </div>

          {/* Reload All Frames */}
          <button
            type="button"
            onClick={() => ROLE_CONFIGS.forEach(r => reloadRole(r.id))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 transition cursor-pointer"
            title="Reload Semua Frame"
          >
            <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden lg:inline">Reload</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh (Fullscreen)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      }
    >
      <div ref={containerRef} className={isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-3 overflow-y-auto' : ''}>
        {/* ═══════════════════════════════════════════════════════════════════
            MODE: QUAD ROLES SIMULTAN (4 LAYAR BERSAMAAN) - OPTIMAL TAMPILAN FRAME
        ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'quad-roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start animate-fade-in">
            {ROLE_CONFIGS.map(role => {
              const activePath = rolePaths[role.id];
              const iRef = getRoleRef(role.id);

              return (
                <div key={role.id} className="flex flex-col w-full min-w-0">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-125px)] min-h-[720px] max-h-[960px] w-full">
                    <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
                      <iframe
                        ref={iRef}
                        src={getIframeUrl(activePath, role.id)}
                        title={`${role.title} Quad`}
                        className="w-full h-full border-none bg-slate-950"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            MODE: DUAL VIEW (MOBILE & DESKTOP COMPARATOR)
        ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dual-view' && (
          <div className="space-y-4 animate-fade-in">
            {/* Dual View Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateDual(dualInputUrl);
                }}
                className="flex-1 w-full flex items-center gap-2"
              >
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-3 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <Lock className="w-3.5 h-3.5" />
                    <span>loxer.web.id</span>
                  </span>
                  <input
                    type="text"
                    value={dualInputUrl}
                    onChange={e => setDualInputUrl(e.target.value)}
                    placeholder="/browse atau /seeker/marketplace"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-32 pr-14 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button type="submit" className="absolute right-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer">
                    Go
                  </button>
                </div>
                <button
                  type="button"
                  onClick={reloadDual}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </form>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-400">Rasio:</span>
                <select
                  value={splitRatio}
                  onChange={e => setSplitRatio(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value={25}>Mobile 25% : Desktop 75%</option>
                  <option value={33}>Mobile 33% : Desktop 67%</option>
                  <option value={50}>Seimbang 50% : 50%</option>
                  <option value={100}>Hanya Mobile</option>
                  <option value={0}>Hanya Desktop</option>
                </select>
              </div>
            </div>

            {/* Split Screen */}
            <div className="flex flex-col xl:flex-row gap-4 items-start w-full">
              {/* Mobile View */}
              <div
                style={{
                  width: splitRatio === 100 ? '100%' : splitRatio === 0 ? '0%' : `${splitRatio}%`,
                  display: splitRatio === 0 ? 'none' : 'flex',
                }}
                className="flex-col items-center justify-start shrink-0 min-w-[300px] max-w-full transition-all duration-300"
              >
                <div className="mb-2 flex items-center justify-between w-full px-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span>Mobile Phone</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">iPhone 15 Pro (393px)</span>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[720px] w-full max-w-[393px]">
                  <div className="h-6 bg-slate-950 flex items-center justify-between px-3 shrink-0 text-[10px] border-b border-white/5">
                    <span className="font-bold font-mono text-white">{currentTime}</span>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <span className="text-[9px] font-mono">5G</span>
                      <Wifi className="w-3 h-3" />
                      <Battery className="w-3 h-3 fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 w-full bg-white relative overflow-hidden">
                    <iframe ref={iframeDualMobileRef} src={getIframeUrl(dualPath)} title="Mobile Dual" className="w-full h-full border-none" />
                  </div>
                </div>
              </div>

              {/* Desktop View */}
              <div
                style={{
                  width: splitRatio === 0 ? '100%' : splitRatio === 100 ? '0%' : `calc(${100 - splitRatio}% - 1rem)`,
                  display: splitRatio === 100 ? 'none' : 'flex',
                }}
                className="flex-1 flex-col transition-all duration-300 min-w-0"
              >
                <div className="mb-2 flex items-center justify-between px-2 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    <span>Desktop Browser</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">Fluid Responsive</span>
                </div>
                <div className="rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[720px]">
                  <div className="flex-1 w-full bg-white relative overflow-hidden">
                    <iframe ref={iframeDualDesktopRef} src={getIframeUrl(dualPath)} title="Desktop Dual" className="w-full h-full border-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



      </div>
    </GodModeLayout>
  );
}
