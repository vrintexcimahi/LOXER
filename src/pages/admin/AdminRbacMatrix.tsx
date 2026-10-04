import { useState, useEffect, useMemo, type ComponentType } from 'react';
import {
  RotateCcw,
  Lock,
  Sliders,
  Headphones,
  Check,
  X,
  LayoutGrid,
  Users,
  Briefcase,
  FileText,
  Building2,
  Wrench,
  AlertTriangle,
  Megaphone,
  Sparkles,
  CheckCircle2,
  BarChart,
  Layers,
  Smartphone,
  Terminal,
  Database,
  Zap,
  Code,
  ShieldCheck,
  UserCheck,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logAdminAction } from '../../lib/adminUtils';

export type InternalRoleKey = 'admin' | 'marketing' | 'customer_service';

export interface RbacModuleItem {
  id: string;
  name: string;
  category: 'UTAMA' | 'OPERASIONAL' | 'MARKETING' | 'CUSTOMER SERVICE' | 'KEAMANAN' | 'SISTEM' | 'DEVELOPER';
  icon: ComponentType<{ className?: string }>;
  description: string;
  defaultRoles: {
    admin: boolean;
    marketing: boolean;
    customer_service: boolean;
  };
}

export const RBAC_MODULES: RbacModuleItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard & Statistik Ringkas',
    category: 'UTAMA',
    icon: LayoutGrid,
    description: 'Ringkasan KPI, analitik rekrutmen, grafik lamaran, dan data transaksi platform.',
    defaultRoles: { admin: true, marketing: true, customer_service: true },
  },
  {
    id: 'users',
    name: 'Manajemen Pengguna & Akun Internal',
    category: 'OPERASIONAL',
    icon: Users,
    description: 'Kelola data pengguna, perizinan role, verifikasi akun, dan suspensi pengguna.',
    defaultRoles: { admin: true, marketing: false, customer_service: true },
  },
  {
    id: 'jobs',
    name: 'Manajemen Lowongan Kerja (Job Listings)',
    category: 'OPERASIONAL',
    icon: Briefcase,
    description: 'Moderasi, persetujuan posting loker baru, verifikasi gaji, dan filter lowongan.',
    defaultRoles: { admin: true, marketing: true, customer_service: false },
  },
  {
    id: 'applications',
    name: 'Manajemen Pelamar & Smart CV Pipeline',
    category: 'OPERASIONAL',
    icon: FileText,
    description: 'Manajemen berkas pelamar, verifikasi CV pintar, dan status seleksi lamaran.',
    defaultRoles: { admin: true, marketing: false, customer_service: true },
  },
  {
    id: 'companies',
    name: 'Verifikasi & Database Perusahaan (Employer)',
    category: 'OPERASIONAL',
    icon: Building2,
    description: 'Verifikasi legalitas perusahaan dan manajemen profil employer terdaftar.',
    defaultRoles: { admin: true, marketing: true, customer_service: true },
  },
  {
    id: 'jasa',
    name: 'Marketplace Jasa & Layanan Freelance',
    category: 'OPERASIONAL',
    icon: Wrench,
    description: 'Katalog jasa pencari kerja, manajemen order jasa, dan moderasi portofolio.',
    defaultRoles: { admin: true, marketing: true, customer_service: false },
  },
  {
    id: 'moderation',
    name: 'Moderasi Konten & Queue Laporan',
    category: 'OPERASIONAL',
    icon: AlertTriangle,
    description: 'Antrian review laporan user, lowongan mencurigakan, dan verifikasi dokumen.',
    defaultRoles: { admin: true, marketing: false, customer_service: true },
  },
  {
    id: 'broadcast',
    name: 'Broadcast System & Notifikasi Massal',
    category: 'MARKETING',
    icon: Megaphone,
    description: 'Kirim pengumuman massal, blast push notification, dan email kampanye.',
    defaultRoles: { admin: true, marketing: true, customer_service: false },
  },
  {
    id: 'promotions',
    name: 'Banner Promosi, Featured Jobs & Sponsor',
    category: 'MARKETING',
    icon: Sparkles,
    description: 'Kelola slot banner homepage, slot iklan sponsor, dan promosi loker unggulan.',
    defaultRoles: { admin: true, marketing: true, customer_service: false },
  },
  {
    id: 'customer_care',
    name: 'Customer Care & Tiket Bantuan Pengguna',
    category: 'CUSTOMER SERVICE',
    icon: Headphones,
    description: 'Kelola keluhan pengguna, penanganan masalah akun, dan tiket bantuan teknis.',
    defaultRoles: { admin: true, marketing: false, customer_service: true },
  },
  {
    id: 'faq_center',
    name: 'Pusat Bantuan & Panduan Operasional',
    category: 'CUSTOMER SERVICE',
    icon: CheckCircle2,
    description: 'Manajemen artikel panduan FAQ untuk pencari kerja dan rekruter perusahaan.',
    defaultRoles: { admin: true, marketing: true, customer_service: true },
  },
  {
    id: 'analytics',
    name: 'Advanced Analytics & Metrik Rekrutmen',
    category: 'UTAMA',
    icon: BarChart,
    description: 'Laporan rasio konversi rekrutmen, waktu hiring, dan tren industri kerja.',
    defaultRoles: { admin: true, marketing: true, customer_service: false },
  },
  {
    id: 'device_intel',
    name: 'Data & Device Intelligence Security',
    category: 'KEAMANAN',
    icon: Layers,
    description: 'Audit fingerprint perangkat, deteksi VPN/Proxy, dan profil sesi browser.',
    defaultRoles: { admin: true, marketing: false, customer_service: false },
  },
  {
    id: 'device_registry',
    name: 'Registry Perangkat & Audit Sesi Aktif',
    category: 'KEAMANAN',
    icon: Smartphone,
    description: 'Manajemen daftar device terdaftar dan remote force logout sesi berbahaya.',
    defaultRoles: { admin: true, marketing: false, customer_service: false },
  },
  {
    id: 'logs',
    name: 'Log Monitoring & Audit Trail Keamanan',
    category: 'SISTEM',
    icon: Terminal,
    description: 'Catatan jejak aktivitas admin, pergantian role, dan log error sistem.',
    defaultRoles: { admin: true, marketing: false, customer_service: false },
  },
  {
    id: 'database_backup',
    name: 'Database Backup & Disaster Recovery',
    category: 'SISTEM',
    icon: Database,
    description: 'Ekspor database snapshot, backup SQLite/Supabase berkala.',
    defaultRoles: { admin: false, marketing: false, customer_service: false },
  },
  {
    id: 'feature_flags',
    name: 'Feature Flags & Konfigurasi Fitur',
    category: 'SISTEM',
    icon: Zap,
    description: 'Sakelar aktivasi modul baru, mode maintenance, dan konfigurasi API.',
    defaultRoles: { admin: false, marketing: false, customer_service: false },
  },
  {
    id: 'developer_workbench',
    name: 'Developer Workbench & Webhook Simulator',
    category: 'DEVELOPER',
    icon: Code,
    description: 'Simulator webhook, direct SQL playground, dan debug environment.',
    defaultRoles: { admin: false, marketing: false, customer_service: false },
  },
];

const STORAGE_KEY = 'loxer_rbac_matrix_v1';

function getDefaultPermissions(): Record<InternalRoleKey, Record<string, boolean>> {
  const result: Record<InternalRoleKey, Record<string, boolean>> = {
    admin: {},
    marketing: {},
    customer_service: {},
  };
  for (const mod of RBAC_MODULES) {
    result.admin[mod.id] = mod.defaultRoles.admin;
    result.marketing[mod.id] = mod.defaultRoles.marketing;
    result.customer_service[mod.id] = mod.defaultRoles.customer_service;
  }
  return result;
}

interface AdminRbacMatrixProps {
  adminId: string;
  adminEmail: string;
  isSuperAdmin?: boolean;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  onBackToAccounts?: () => void;
}

export default function AdminRbacMatrix({
  adminId,
  adminEmail,
  isSuperAdmin: _isSuperAdmin,
  onToast,
  onBackToAccounts,
}: AdminRbacMatrixProps) {
  const [permissions, setPermissions] = useState<Record<InternalRoleKey, Record<string, boolean>>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const defaults = getDefaultPermissions();
        return {
          admin: { ...defaults.admin, ...(parsed.admin || {}) },
          marketing: { ...defaults.marketing, ...(parsed.marketing || {}) },
          customer_service: { ...defaults.customer_service, ...(parsed.customer_service || {}) },
        };
      }
    } catch {
      // fallback to defaults
    }
    return getDefaultPermissions();
  });

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 12,
    activeUsers: 12,
    internalStaff: 4,
    superAdminCount: 1,
  });

  // Load real stats if available
  useEffect(() => {
    async function loadStats() {
      if (!supabase) return;
      try {
        const { data, count } = await supabase.from('users_meta').select('id, role, banned_until', { count: 'exact' });
        if (data && count !== null) {
          const total = count || data.length;
          const active = data.filter((u: { banned_until?: string | null }) => !u.banned_until).length;
          const internal = data.filter((u: { role?: string }) => u.role === 'marketing' || u.role === 'customer_service' || u.role === 'admin').length;
          const supers = data.filter((u: { role?: string }) => u.role === 'superadmin').length || 1;
          setStats({
            totalUsers: total,
            activeUsers: active,
            internalStaff: internal || 4,
            superAdminCount: supers,
          });
        }
      } catch {
        // use default placeholder stats
      }
    }
    loadStats();
  }, []);

  const saveToStorage = (newPerms: Record<InternalRoleKey, Record<string, boolean>>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPerms));
      window.dispatchEvent(new Event('loxer_rbac_updated'));
      setIsSavedRecently(true);
      setTimeout(() => setIsSavedRecently(false), 2500);
    } catch (err) {
      console.error('Failed to save RBAC:', err);
    }
  };

  const togglePermission = (role: InternalRoleKey, moduleId: string) => {
    setPermissions((prev) => {
      const nextRolePerms = {
        ...prev[role],
        [moduleId]: !prev[role][moduleId],
      };
      const updated = {
        ...prev,
        [role]: nextRolePerms,
      };
      saveToStorage(updated);
      return updated;
    });
  };

  const toggleAll = (role: InternalRoleKey, enable: boolean) => {
    setPermissions((prev) => {
      const nextRolePerms: Record<string, boolean> = {};
      for (const mod of RBAC_MODULES) {
        nextRolePerms[mod.id] = enable;
      }
      const updated = {
        ...prev,
        [role]: nextRolePerms,
      };
      saveToStorage(updated);
      onToast('info', `${enable ? 'Semua modul diaktifkan' : 'Semua modul dinonaktifkan'} untuk peran ${role.toUpperCase()}.`);
      return updated;
    });
  };

  const resetDefault = () => {
    const defaults = getDefaultPermissions();
    setPermissions(defaults);
    saveToStorage(defaults);
    onToast('info', 'Matriks hak akses berhasil di-reset ke pengaturan standar bawaan.');
    logAdminAction(adminId, adminEmail, 'reset_rbac_matrix', 'system', 'rbac', 'Reset RBAC permissions to default');
  };

  const handleManualSave = () => {
    saveToStorage(permissions);
    onToast('success', 'Matriks hak akses fitur berhasil disimpan.');
    logAdminAction(adminId, adminEmail, 'save_rbac_matrix', 'system', 'rbac', 'Updated and saved RBAC module permissions');
  };

  // Filter modules
  const filteredModules = useMemo(() => {
    return RBAC_MODULES.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.category.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      const matchCategory = selectedCategory === 'all' || m.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [search, selectedCategory]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    RBAC_MODULES.forEach((m) => set.add(m.category));
    return ['all', ...Array.from(set)];
  }, []);

  // Counts of active modules
  const adminActiveCount = useMemo(() => {
    return Object.values(permissions.admin).filter(Boolean).length;
  }, [permissions.admin]);

  const marketingActiveCount = useMemo(() => {
    return Object.values(permissions.marketing).filter(Boolean).length;
  }, [permissions.marketing]);

  const csActiveCount = useMemo(() => {
    return Object.values(permissions.customer_service).filter(Boolean).length;
  }, [permissions.customer_service]);

  return (
    <section className="space-y-4">
      {/* ── Top Header Card (Matching Image 2) ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 shadow-xl shadow-black/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-inner">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Matriks Hak Akses Fitur
                </h3>
                <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-black text-amber-300">
                  RBAC
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-400">
                Atur izin modul operasional untuk setiap peran kerja di sistem LOXER.
              </p>
            </div>
          </div>

          {/* Action buttons on the right */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onBackToAccounts && (
              <button
                type="button"
                onClick={onBackToAccounts}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Staf & Akun</span>
              </button>
            )}
            <button
              type="button"
              onClick={resetDefault}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Default</span>
            </button>
            <button
              type="button"
              onClick={handleManualSave}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all shadow-lg ${
                isSavedRecently
                  ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 shadow-emerald-900/30'
                  : 'border border-amber-500/40 bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-900/30 hover:from-amber-500 hover:to-orange-500'
              }`}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSavedRecently ? 'Tersimpan' : 'Simpan'}</span>
            </button>
          </div>
        </div>

        {/* ── 4 Quick Stat Cards (Matching Image 2) ── */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 pt-5 border-t border-white/5">
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Users className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pengguna</p>
              <p className="text-sm font-black text-white">{stats.totalUsers} Akun Terdaftar</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Akun Aktif</p>
              <p className="text-sm font-black text-white">{stats.activeUsers} Pengguna Aktif</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Headphones className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tim Pengelola</p>
              <p className="text-sm font-black text-white">{stats.internalStaff} Staf CS & Mkt</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Super Administrator</p>
              <p className="text-sm font-black text-white">{stats.superAdminCount} Akun Pemilik</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── The RBAC Matrix Table Container (Matching Image 2) ── */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md shadow-xl shadow-black/20 overflow-hidden">
        {/* Matrix Header Banner */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Sliders className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm sm:text-base font-black text-white">
                  Matriks Perizinan Modul — {RBAC_MODULES.length} Fitur × 4 Peran
                </h4>
                <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  MODE EDIT AKTIF
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Klik ikon centang / silang untuk mengubah akses modul setiap peran secara instan.
              </p>
            </div>
          </div>

          {/* Quick Search and Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-60">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari modul / fitur..."
                className="w-full rounded-lg border border-white/10 bg-slate-800/80 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            {categories.length > 2 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-white/10 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-200 focus:border-amber-500/50 focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                {categories.filter((c) => c !== 'all').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-xs">
                <th className="py-4 px-4 sm:px-6 font-bold uppercase tracking-wider text-slate-400 w-2/5 min-w-[280px]">
                  Modul / Fitur Aplikasi ({RBAC_MODULES.length})
                </th>
                
                {/* 1. SUPER ADMIN */}
                <th className="py-4 px-3 text-center min-w-[130px]">
                  <div className="inline-flex flex-col items-center">
                    <span className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-300 shadow-sm shadow-amber-950/40">
                      SUPER ADMIN
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                      <Lock className="h-3 w-3 inline" /> Full ({RBAC_MODULES.length})
                    </span>
                  </div>
                </th>

                {/* 2. ADMIN */}
                <th className="py-4 px-3 text-center min-w-[140px]">
                  <div className="inline-flex flex-col items-center">
                    <span className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1 text-xs font-black text-cyan-300 shadow-sm shadow-cyan-950/40">
                      ADMIN
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-cyan-400">
                      {adminActiveCount}/{RBAC_MODULES.length} Modul Aktif
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => toggleAll('admin', true)}
                        className="hover:text-cyan-300 transition-colors underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => toggleAll('admin', false)}
                        className="hover:text-rose-300 transition-colors underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>
                </th>

                {/* 3. MARKETING */}
                <th className="py-4 px-3 text-center min-w-[140px]">
                  <div className="inline-flex flex-col items-center">
                    <span className="rounded-lg border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs font-black text-orange-300 shadow-sm shadow-orange-950/40">
                      MARKETING
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-orange-400">
                      {marketingActiveCount}/{RBAC_MODULES.length} Modul Aktif
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => toggleAll('marketing', true)}
                        className="hover:text-orange-300 transition-colors underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => toggleAll('marketing', false)}
                        className="hover:text-rose-300 transition-colors underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>
                </th>

                {/* 4. CUSTOMER SERVICE */}
                <th className="py-4 px-3 text-center min-w-[140px]">
                  <div className="inline-flex flex-col items-center">
                    <span className="rounded-lg border border-teal-500/40 bg-teal-500/15 px-3 py-1 text-xs font-black text-teal-300 shadow-sm shadow-teal-950/40">
                      CUSTOMER SERVICE
                    </span>
                    <span className="mt-1 text-[11px] font-bold text-teal-400">
                      {csActiveCount}/{RBAC_MODULES.length} Modul Aktif
                    </span>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => toggleAll('customer_service', true)}
                        className="hover:text-teal-300 transition-colors underline cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => toggleAll('customer_service', false)}
                        className="hover:text-rose-300 transition-colors underline cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filteredModules.map((mod) => {
                const IconComponent = mod.icon;
                const isAdminActive = Boolean(permissions.admin[mod.id]);
                const isMarketingActive = Boolean(permissions.marketing[mod.id]);
                const isCsActive = Boolean(permissions.customer_service[mod.id]);

                return (
                  <tr
                    key={mod.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Module info */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-cyan-400 group-hover:border-amber-500/30 group-hover:text-amber-400 transition-colors">
                          <IconComponent className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white tracking-tight leading-snug">
                            {mod.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                              {mod.category}
                            </span>
                            <span className="text-slate-600 hidden sm:inline">·</span>
                            <p className="text-xs text-slate-400 truncate max-w-sm hidden sm:block">
                              {mod.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Super Admin: Locked / Full access */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-bold shadow-sm shadow-amber-950/40 cursor-not-allowed select-none"
                          title="Super Admin memiliki akses penuh mutlak untuk seluruh modul"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </td>

                    {/* Admin Toggle */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('admin', mod.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                            isAdminActive
                              ? 'border border-teal-500/50 bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-950/40 hover:scale-110 hover:border-teal-400'
                              : 'border border-slate-800 bg-slate-900/80 text-slate-600 hover:text-slate-400 hover:border-slate-700 hover:scale-110'
                          }`}
                          title={`Klik untuk ${isAdminActive ? 'menonaktifkan' : 'mengaktifkan'} akses ${mod.name} untuk Admin`}
                        >
                          {isAdminActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Marketing Toggle */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('marketing', mod.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                            isMarketingActive
                              ? 'border border-teal-500/50 bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-950/40 hover:scale-110 hover:border-teal-400'
                              : 'border border-slate-800 bg-slate-900/80 text-slate-600 hover:text-slate-400 hover:border-slate-700 hover:scale-110'
                          }`}
                          title={`Klik untuk ${isMarketingActive ? 'menonaktifkan' : 'mengaktifkan'} akses ${mod.name} untuk Marketing`}
                        >
                          {isMarketingActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>

                    {/* Customer Service Toggle */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => togglePermission('customer_service', mod.id)}
                          className={`flex h-7 w-7 items-center justify-center rounded-full transition-all cursor-pointer ${
                            isCsActive
                              ? 'border border-teal-500/50 bg-teal-500/20 text-teal-300 shadow-sm shadow-teal-950/40 hover:scale-110 hover:border-teal-400'
                              : 'border border-slate-800 bg-slate-900/80 text-slate-600 hover:text-slate-400 hover:border-slate-700 hover:scale-110'
                          }`}
                          title={`Klik untuk ${isCsActive ? 'menonaktifkan' : 'mengaktifkan'} akses ${mod.name} untuk Customer Service`}
                        >
                          {isCsActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3 w-3" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredModules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Tidak ada modul yang cocok dengan pencarian &ldquo;{search}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Note */}
        <div className="p-4 bg-slate-950/50 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <p className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>Peran Super Admin selalu memiliki akses absolut penuh ke seluruh modul sistem demi keamanan kontrol.</span>
          </p>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">Sinkronisasi Izin Otomatis</span>
          </div>
        </div>
      </div>
    </section>
  );
}
