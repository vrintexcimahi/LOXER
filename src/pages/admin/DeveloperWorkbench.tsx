// ==============================================================================
// LOXER Admin - Developer Mode (Role-Focused Testing Workbench & Demo Access)
// v3.0 - Fokus Tampilan Per-Role + Akses Login Khusus User Demo
// ==============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Smartphone, Monitor, RotateCw, Lock,
  Maximize2, Minimize2, Wifi, Battery, Sparkles, Zap,
  Columns, Shield, Briefcase, Users, LayoutGrid, LogIn,
  ExternalLink,
  Copy, Check,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';
import { seedSimRoleSession, clearSimRoleSession, SimRole } from '../../lib/simSession';

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
    title: 'Penyedia Jasa & Freelance',
    shortLabel: 'Jasa & Freelance',
    badge: 'ROLE 3 · PENYEDIA JASA & FREELANCE',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    accentColor: 'amber',
    icon: Sparkles,
    demoUser: {
      name: 'Arifin Ahmad',
      email: 'arifin.ahmad@example.com',
      password: 'seeker123',
      headline: 'Senior Fullstack Engineer (React, Node.js & TypeScript)',
      city: 'Bandung',
      stats: 'TOP TALENT Badge · Tarif Rp 14.000.000/bln · Siap Kerja Remote/Gigs',
      redirectPath: '/seeker/marketplace',
      summary: 'Akun demo TOP TALENT Freelancer & Penyedia Jasa profesional. Memiliki posting jasa aktif di Marketplace Talent, portofolio skill tinggi, dan ketersediaan kerja fleksibel.',
    },
    subFeatures: [
      { label: 'Kelola Posting Jasa', path: '/seeker/marketplace', icon: '🌟', description: 'Atur publikasi jasa, tarif penawaran, bio, & status ketersediaan' },
      { label: 'Katalog Talent Publik', path: '/talents', icon: '🌐', description: 'Tampilan profil di bursa pencarian talent yang dilihat perusahaan' },
      { label: 'Remote Gigs', path: '/browse?type=remote', icon: '💻', description: 'Lowongan kerja jarak jauh & project-based gigs' },
      { label: 'Proyek Freelance', path: '/browse?category=freelance', icon: '🏷️', description: 'Kategori pekerjaan freelance spesifik kebutuhan industri' },
      { label: 'Portofolio & Kontak WA', path: '/seeker/profile', icon: '👤', description: 'Tampilkan portofolio karya dan tautan kontak direct messaging' },
    ],
    testChecklist: [
      { title: 'Edit Penawaran Tarif Jasa', desc: 'Uji update tarif per jam, per proyek, atau bulanan di marketplace', targetPath: '/seeker/marketplace' },
      { title: 'Verifikasi Badge TOP TALENT', desc: 'Pastikan profil tampil dengan badge terverifikasi di katalog bursa talent', targetPath: '/talents' },
      { title: 'Filter Lowongan Remote', desc: 'Jelajahi pekerjaan freelance dengan preferensi lokasi kerja jarak jauh', targetPath: '/browse?type=remote' },
      { title: 'Integrasi WhatsApp Direct', desc: 'Uji tombol kontak langsung untuk calon klien atau rekruter', targetPath: '/talents' },
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

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
      title={`Salin ${label || text}`}
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
      <span>{copied ? 'Tersalin!' : (label || text)}</span>
    </button>
  );
}

export default function DeveloperWorkbench() {
  const [activeTab, setActiveTab] = useState<ActiveRoleTab>('quad-roles');
  const [cacheBuster, setCacheBuster] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState('09:41');

  // Paths per role
  const [rolePaths, setRolePaths] = useState<Record<string, string>>({
    seeker: '/seeker/dashboard',
    employer: '/employer/dashboard',
    freelancer: '/seeker/marketplace',
    admin: '/admin/dashboard',
  });
  const [roleInputUrls, setRoleInputUrls] = useState<Record<string, string>>({
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

  const navigateRole = (roleId: string, targetPath: string) => {
    const cp = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    setRolePaths(prev => ({ ...prev, [roleId]: cp }));
    setRoleInputUrls(prev => ({ ...prev, [roleId]: cp }));
    const ref = getRoleRef(roleId);
    if (ref.current) {
      ref.current.src = getIframeUrl(cp, roleId);
    }
  };

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

  // Build the 1-Click Standalone Browser URL with isolated session
  const buildAutoLoginUrl = (demo: RoleConfig['demoUser'], roleId: string) => {
    const sep = demo.redirectPath.includes('?') ? '&' : '?';
    return `${demo.redirectPath}${sep}sim_role=${roleId}&preview_role=${roleId}`;
  };

  const loginRoleSession = async (roleId: string) => {
    if (['seeker', 'employer', 'freelancer', 'admin'].includes(roleId)) {
      await seedSimRoleSession(roleId as SimRole);
      reloadRole(roleId);
    }
  };

  const resetRoleSession = (roleId: string) => {
    if (['seeker', 'employer', 'freelancer', 'admin'].includes(roleId)) {
      clearSimRoleSession(roleId as SimRole);
      reloadRole(roleId);
    }
  };



  return (
    <GodModeLayout
      title="Developer Mode Workbench (Quad-Role Testing)"
      description="Uji seluruh detail fitur tiap role (Pencari Kerja, Perusahaan, Jasa, Admin) dengan simulator multi-layar simultan dan dual-view."
    >
      <div ref={containerRef} className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''}`}>

        {/* ═══════════════════════════════════════════════════════════════════
            TOP ROLE SELECTOR BAR (FOKUS TIAP ROLE)
        ═════════════════════════════════════════════════════════════════════ */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-3 sm:p-4 shadow-xl space-y-3">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('quad-roles')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                  activeTab === 'quad-roles'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span>4 Layar Simultan</span>
                <span className="text-[9px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full font-black">4</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('dual-view')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer active:scale-95 ${
                  activeTab === 'dual-view'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5 shrink-0" />
                <span>Dual View</span>
              </button>
            </div>

            {/* Quick Tools (Cache Buster / Fullscreen) */}
            <div className="flex items-center gap-2 shrink-0 self-end xl:self-auto">
              <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                cacheBuster ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}>
                <input type="checkbox" checked={cacheBuster} onChange={e => setCacheBuster(e.target.checked)} className="sr-only" />
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anti-Cache</span>
              </label>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="Fullscreen Workbench"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            MODE: QUAD ROLES SIMULTAN (4 LAYAR BERSAMAAN)
        ═════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'quad-roles' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-extrabold text-white">4 Sesi Role Serentak</span>
                <span className="text-[11px] text-slate-400 hidden sm:inline">— Uji interaksi multi-role secara berdampingan</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  ROLE_CONFIGS.forEach(r => reloadRole(r.id));
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                <span>Reload Semua 4 Layar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {ROLE_CONFIGS.map(role => {
                const Icon = role.icon;
                const activePath = rolePaths[role.id];
                const inputUrl = roleInputUrls[role.id];
                const iRef = getRoleRef(role.id);

                return (
                  <div key={role.id} className="flex flex-col w-full min-w-0">
                    <div className="mb-2 flex items-center justify-between px-1 text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${role.badgeClass}`}>
                          {role.title}
                        </span>
                      </span>
                    </div>

                    {/* Mandiri Browser & Isolated Session Toolbar */}
                    <div className="mb-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-1.5 shadow-sm">
                      <div className="flex items-center justify-between gap-1 text-[10px]">
                        <span className="font-mono text-slate-300 truncate font-semibold flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="truncate">{role.demoUser.name.split(' ')[0]}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => loginRoleSession(role.id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-[9px] font-bold transition cursor-pointer active:scale-95"
                            title={`Login ulang sesi mandiri ${role.title}`}
                          >
                            <LogIn className="w-2.5 h-2.5" />
                            <span>Login Sesi</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => resetRoleSession(role.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                            title={`Reset / Hapus Sesi ${role.title}`}
                          >
                            <RotateCw className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-[9px]">
                        <a
                          href={buildAutoLoginUrl(role.demoUser, role.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold transition"
                          title="Buka tampilan role ini di jendela / tab browser mandiri terisolasi"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Buka Browser Mandiri</span>
                        </a>
                        <CopyButton text={role.demoUser.email} label="salin" />
                      </div>
                    </div>

                    {/* Window Frame */}
                    <div className="rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[650px] xl:h-[700px] w-full">
                      {/* Controls */}
                      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-2.5 py-1.5 shrink-0">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#ff5f56] inline-block" />
                          <span className="w-2 h-2 rounded-full bg-[#ffbd2e] inline-block" />
                          <span className="w-2 h-2 rounded-full bg-[#27c93f] inline-block" />
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            navigateRole(role.id, inputUrl);
                          }}
                          className="flex-1 mx-2"
                        >
                          <input
                            type="text"
                            value={inputUrl}
                            onChange={(e) => setRoleInputUrls(prev => ({ ...prev, [role.id]: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                          />
                        </form>

                        <button
                          type="button"
                          onClick={() => reloadRole(role.id)}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Sub-nav quick pills */}
                      <div className="bg-slate-900/90 border-b border-slate-800 px-2 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
                        {role.subFeatures.slice(0, 4).map(feat => {
                          const isActive = activePath === feat.path;
                          return (
                            <button
                              key={feat.path}
                              type="button"
                              onClick={() => navigateRole(role.id, feat.path)}
                              className={`px-2 py-0.5 rounded-md whitespace-nowrap font-mono text-[9px] transition cursor-pointer ${
                                isActive
                                  ? `${role.badgeClass} font-bold shadow-sm`
                                  : 'bg-slate-950 text-slate-400 hover:text-white'
                              }`}
                            >
                              {feat.label.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>

                      {/* Iframe */}
                      <div className="flex-1 w-full bg-white relative overflow-hidden">
                        <iframe
                          ref={iRef}
                          src={getIframeUrl(activePath, role.id)}
                          title={`${role.title} Quad`}
                          className="w-full h-full border-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
