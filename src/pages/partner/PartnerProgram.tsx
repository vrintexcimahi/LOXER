import { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Copy,
  Globe2,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Zap,
  Check,
  ChevronDown,
  Layers,
  Smartphone,
  Download,
} from 'lucide-react';
import BrandText from '../../components/ui/BrandText';
import PartnerBannerCarousel from '../../components/partner/PartnerBannerCarousel';

export default function PartnerProgram() {
  // Quick Application Form State
  const [businessName, setBusinessName] = useState('');
  const [suggestedSlug, setSuggestedSlug] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  // Profit Calculator State
  const [jobPostCount, setJobPostCount] = useState(20);
  const [applicantCount, setApplicantCount] = useState(300);

  // FAQ Accordion State
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  // Auto clean slug
  const handleSlugChange = (val: string) => {
    const cleaned = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/^-+|-+$/g, '');
    setSuggestedSlug(cleaned);
  };

  // Estimate partner revenue calculations (in IDR)
  // Commission: approx Rp 50,000 per premium job post + Rp 15,000 per verified applicant matching
  const estimatedJobRevenue = jobPostCount * 50000;
  const estimatedApplicantRevenue = applicantCount * 15000;
  const estimatedMonthlyTotal = estimatedJobRevenue + estimatedApplicantRevenue;

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // WhatsApp Pre-filled message generator
  const generateWaMessage = () => {
    return encodeURIComponent(
      `Halo Tim Kemitraan LOXER,\n\nSaya tertarik mendaftar sebagai Mitra Resmi Child Panel LOXER.\n\n` +
      `*Detail Pengajuan Mitra:*\n` +
      `• Nama Usaha / Komunitas: ${businessName || '-'}\n` +
      `• Usulan Slug Cabang: /p/${suggestedSlug || 'cabang-saya'}\n` +
      `• Wilayah / Kota: ${city || '-'}\n` +
      `• Nomor WhatsApp PIC: ${phone || '-'}\n` +
      `• Keterangan Tambahan: ${notes || '-'}\n\n` +
      `Mohon informasi langkah verifikasi dan aktivasi Child Panel kami. Terima kasih!`
    );
  };

  const handleCopyApplication = () => {
    const text =
      `PENGALAMAN PENGAJUAN MITRA LOXER\n` +
      `Nama Usaha: ${businessName || '-'}\n` +
      `Usulan Slug: /p/${suggestedSlug || 'cabang-saya'}\n` +
      `Wilayah/Kota: ${city || '-'}\n` +
      `WhatsApp: ${phone || '-'}\n` +
      `Catatan: ${notes || '-'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const faqs = [
    {
      q: 'Apa itu program Child Panel Mitra LOXER?',
      a: 'Child Panel adalah solusi multi-tenant eksklusif di mana Anda memiliki cabang portal kerja digital sendiri (misalnya: loxer.web.id/p/nama-cabang-anda). Seluruh teknologi inti (sistem loker, pencarian talenta, AI ekstraksi CV, sensor privasi kontak) dikelola oleh LOXER pusat, sementara Anda fokus membangun jaringan pengguna dan bisnis lokal.',
    },
    {
      q: 'Apakah saya membutuhkan keahlian coding atau mengelola server?',
      a: 'Sama sekali tidak! Platform LOXER telah menyediakan arsitektur cloud server, pemeliharaan database, integrasi AI, keamanan SSL HTTPS, dan backup berkala. Anda hanya mengelola branding, logo, dan interaksi pengguna cabang melalui portal admin khusus.',
    },
    {
      q: 'Bagaimana model pembagian hasil (revenue sharing) bagi mitra?',
      a: 'Mitra memperoleh bagi hasil transparan dari transaksi yang terjadi di cabangnya, termasuk posting lowongan kerja berbayar, subscription akses kontak kandidat, verifikasi talenta, serta modul marketplace. Komisi dihitung otomatis dan dicairkan secara terjadwal.',
    },
    {
      q: 'Berapa lama proses verifikasi dan aktivasi Child Panel?',
      a: 'Setelah formulir pengajuan dikirimkan, Superadmin LOXER akan meninjau kelayakan data dan mengaktifkan Child Panel Anda dalam waktu maksimal 1x24 jam kerja.',
    },
    {
      q: 'Apakah data pengguna di cabang saya aman dan terpisah dari cabang lain?',
      a: 'Ya, 100% terisolasi. Arsitektur multi-tenant LOXER memastikan setiap cabang memiliki ruang kerja independen. Pengguna yang mendaftar di cabang Anda secara khusus terdata di bawah ID tenant Anda.',
    },
    {
      q: 'Bisakah saya menggunakan domain atau subdomain khusus di masa mendatang?',
      a: 'Tentu. Format standar saat ini adalah loxer.web.id/p/[slug-anda], dan tim LOXER dapat mengkonfigurasikan mapping custom domain (misalnya: karir.namabisnis.com) untuk mitra tier terpilih.',
    },
  ];

  return (
    <main className="min-h-screen bg-[#071527] text-white selection:bg-cyan-500/30">
      {/* Top Glassmorphic Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071527]/85 backdrop-blur-xl transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a href="/" aria-label="Beranda LOXER" className="flex items-center gap-2">
              <BrandText />
              <span className="rounded-full bg-cyan-500/10 border border-cyan-400/30 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase tracking-wider hidden sm:inline-block">
                PARTNER
              </span>
            </a>

            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-300">
              <a href="#keuntungan" className="hover:text-cyan-300 transition">
                Keuntungan
              </a>
              <a href="#cara-bergabung" className="hover:text-cyan-300 transition text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cara Bergabung</span>
              </a>
              <a href="#kalkulator-profit" className="hover:text-cyan-300 transition">
                Kalkulator Profit
              </a>
              <a href="#faq" className="hover:text-cyan-300 transition">
                Tanya Jawab
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/downloads/loxer-mitra.apk"
              download="loxer-mitra.apk"
              className="rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 hover:from-emerald-500/25 hover:to-teal-500/25 text-emerald-300 hover:text-white px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm hover:shadow-emerald-500/20 group"
              title="Unduh Aplikasi Android Khusus Mitra LOXER (.apk)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span>Unduh APK Mitra</span>
            </a>
            <a
              href="/portal-mitra"
              className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 px-4 py-2 text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>Akses Portal Mitra</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-white transition hidden sm:inline-block"
            >
              Kembali ke LOXER
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section with Carousel Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-12">
        {/* Banner Carousel */}
        <div className="mb-10">
          <PartnerBannerCarousel variant="public" />
        </div>

        {/* Value Proposition Highlights Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 p-4 sm:p-6 rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">16+ Kategori</p>
              <p className="text-xs text-slate-400">Loker &amp; Jasa Lokal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">100% Terisolasi</p>
              <p className="text-xs text-slate-400">Multi-Tenant Aman</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Rp 0 Biaya Server</p>
              <p className="text-xs text-slate-400">Gratis Cloud &amp; AI</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Bagi Hasil Adil</p>
              <p className="text-xs text-slate-400">Monetisasi Mandiri</p>
            </div>
          </div>
        </div>
      </section>

      {/* Keuntungan Kemitraan (Bento Grid) */}
      <section id="keuntungan" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-[0.25em]">
            Kenapa Menjadi Mitra LOXER?
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Keuntungan Eksklusif Memiliki Cabang Digital
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Dapatkan hak kelola platform rekrutmen lengkap dengan ekosistem teknologi terkini yang siap menghasilkan revenue sejak hari pertama.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-cyan-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/15 border border-cyan-400/30 flex items-center justify-center text-cyan-300 group-hover:scale-110 transition">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Alamat &amp; Identitas Cabang Sendiri</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Miliki URL khusus <code className="text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded">loxer.id/p/nama-usaha</code> lengkap dengan logo usaha, judul beranda, dan nomor WhatsApp Customer Service Anda.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-emerald-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition">
              <WalletCards className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Bagi Hasil Transparan &amp; Berkelanjutan</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Peroleh komisi dari pemasangan loker berbayar oleh perusahaan lokal, verifikasi kandidat, hingga transaksi modul produk kerja di cabang Anda.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-amber-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-110 transition">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Teknologi AI Gemini 3.8 Otomatis</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Pelamar kerja cabang Anda otomatis diproses oleh sistem AI mutakhir LOXER: cropping pas foto 1:1, penajaman gambar otomatis, dan sensor privasi kontak Shopee-grade.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-violet-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300 group-hover:scale-110 transition">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Database Pengguna Cabang Terpisah</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Pengguna (pencari kerja, freelancer, maupun employer) yang mendaftar melalui cabang Anda terikat khusus pada panel operasional cabang Anda.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-sky-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-300 group-hover:scale-110 transition">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Dashboard Analitik Real-Time</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Pantau jumlah anggota terdaftar, status akun, aktivitas rekrutmen, dan pertumbuhan cabang secara visual langsung di ruang kerja mitra.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-7 space-y-4 hover:border-rose-400/40 transition group shadow-lg">
            <div className="h-12 w-12 rounded-xl bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-300 group-hover:scale-110 transition">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Keamanan &amp; Audit Terpusat</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Platform diperkuat proteksi DDoS, sanitasi input, audit trail aktivitas, dan perlindungan privasi kontak pelamar dari risiko penyalahgunaan data.
            </p>
          </article>
        </div>
      </section>

      {/* SECTION CARA BERGABUNG (#cara-bergabung) - AUDITED & FULLY OPTIMIZED */}
      <section id="cara-bergabung" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-cyan-950/30 via-slate-900 to-slate-950 p-6 sm:p-10 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Decorative Background Glows */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

          {/* Section Header */}
          <div className="relative z-10 max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-400/15 border border-cyan-400/30 px-3.5 py-1 text-xs font-bold text-cyan-300 uppercase tracking-wider mb-4">
              <Building2 className="w-4 h-4" />
              <span>Panduan &amp; Formulir Pendaftaran Mitra</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Cara Mudah Bergabung Menjadi <span className="bg-gradient-to-r from-cyan-300 to-sky-300 bg-clip-text text-transparent">Mitra Resmi LOXER</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-4 leading-relaxed">
              Proses pendaftaran cepat dan terstruktur. Cukup isi formulir profil cabang Anda, tim Superadmin LOXER akan memverifikasi dan mengaktifkan Child Panel Anda dalam 1x24 jam.
            </p>
          </div>

          {/* 4-Step Process Cards */}
          <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-3 relative group hover:border-cyan-400/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-cyan-400 font-mono bg-cyan-950/80 px-2 py-1 rounded-md border border-cyan-400/30">
                  LANGKAH 01
                </span>
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                Ajukan Profil &amp; Slug Cabang
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tentukan nama usaha dan usulan slug URL (contoh: <span className="text-slate-200 font-mono">/p/bandung-karir</span>) melalui form pengajuan di bawah.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-3 relative group hover:border-amber-400/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 font-mono bg-amber-950/80 px-2 py-1 rounded-md border border-amber-400/30">
                  LANGKAH 02
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition">
                Verifikasi Superadmin Pusat
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tim Superadmin LOXER meninjau kelayakan profil mitra dan menyetujui akun pemilik cabang dalam 1x24 jam kerja.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-3 relative group hover:border-emerald-400/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-950/80 px-2 py-1 rounded-md border border-emerald-400/30">
                  LANGKAH 03
                </span>
                <Layers className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                Dapatkan Child Panel &amp; Setup
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Akses portal mitra Anda, unggah logo cabang, tentukan headline beranda, dan tautkan nomor WhatsApp Customer Service.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 space-y-3 relative group hover:border-violet-400/40 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-violet-400 font-mono bg-violet-950/80 px-2 py-1 rounded-md border border-violet-400/30">
                  LANGKAH 04
                </span>
                <Zap className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-violet-300 transition">
                Luncurkan &amp; Mulai Monetisasi
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bagikan link cabang ke komunitas dan perusahaan di wilayah Anda, rekrut talenta, dan peroleh revenue secara mandiri.
              </p>
            </div>
          </div>

          {/* Grid: Persyaratan & Interactive Application Form */}
          <div className="relative z-10 grid lg:grid-cols-12 gap-8 items-start">
            {/* Checklist Persyaratan (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">Syarat Menjadi Mitra Cabang</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                LOXER menyambut berbagai entitas bisnis, lembaga pendidikan, komunitas pencari kerja, maupun profesional perorangan:
              </p>

              <div className="space-y-3.5">
                {[
                  'Memiliki entitas usaha, LPK, agensi, komunitas lokal, atau perorangan terverifikasi.',
                  'Memiliki penanggung jawab (PIC) dengan nomor WhatsApp aktif untuk koordinasi.',
                  'Memiliki target jangkauan wilayah kota / kabupaten yang jelas.',
                  'Berkomitmen menjaga etika privasi pelamar (tidak menyebarluaskan kontak di luar platform).',
                  'Memiliki akun LOXER yang valid sebagai kredensial kepemilikan Child Panel.',
                ].map((req, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs text-slate-300">
                    <div className="h-5 w-5 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    <span>{req}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 space-y-1.5">
                <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Garansi Bebas Risiko &amp; Tanpa Biaya Server</span>
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tidak ada biaya langganan server bulanan untuk tahap inisiasi cabang. Seluruh infrastruktur dan pembaruan AI ditanggung LOXER pusat.
                </p>
              </div>

              {/* Box Unduh APK Khusus Mitra */}
              <div className="rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-950/50 to-slate-900 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Aplikasi Android Khusus Mitra</h4>
                      <p className="text-[10px] text-emerald-400 font-medium">Versi 1.0.0 • Ukuran 1.6 MB</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">APK Resmi</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Kelola cabang digital Anda secara praktis langsung dari smartphone. Pantau pendaftar dan lowongan tanpa perlu browser URL bar.
                </p>
                <a
                  href="/downloads/loxer-mitra.apk"
                  download="loxer-mitra.apk"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs py-2.5 px-4 shadow-md transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh File .APK Mitra (1.6 MB)</span>
                </a>
              </div>
            </div>

            {/* Interactive Application Form (7 Cols) */}
            <div className="lg:col-span-7 rounded-2xl border border-cyan-400/30 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span>Formulir Pengajuan Mitra Cepat</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Isi detail rencana cabang Anda untuk verifikasi instan tim Superadmin
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2.5 py-1 rounded-full">
                  TERBUKA 2026
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nama Usaha / Nama Komunitas / Nama Cabang *
                  </label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Contoh: Digital Karir Cimahi / LPK Mitra Sukses"
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Usulan Slug URL Cabang *
                    </label>
                    <div className="relative">
                      <input
                        value={suggestedSlug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="contoh: bandung-karir"
                        className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      URL Anda nantinya:{' '}
                      <strong className="text-cyan-300 font-mono">
                        loxer.id/p/{suggestedSlug || 'slug-anda'}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Kota / Wilayah Operasional *
                    </label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Contoh: Cimahi / Bandung Barat"
                      className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nomor WhatsApp Aktif Penanggung Jawab (PIC) *
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 087820070258"
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Catatan / Rencana Bisnis Singkat (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Memiliki komunitas 500+ alumni SMK jurusan TI & Otomotif yang siap disalurkan ke loker."
                    className="w-full rounded-xl border border-white/15 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    href={`https://wa.me/6287820070258?text=${generateWaMessage()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 px-5 py-3 font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <MessageSquare className="w-4 h-4 fill-slate-950" />
                    <span>Kirim Pengajuan via WhatsApp Resmi</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyApplication}
                    className="w-full sm:w-auto rounded-xl border border-white/20 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-400" />
                        <span>Salin Format</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 text-center pt-1">
                  🔒 Data Anda hanya digunakan untuk verifikasi kemitraan resmi LOXER. Tim kami akan menghubungi Anda melalui nomor WhatsApp yang dicantumkan.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KALKULATOR POTENSI PROFIT MITRA */}
      <section id="kalkulator-profit" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-md">
          <div className="max-w-2xl mb-8 space-y-2">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">
              Simulasi Pendapatan Mandiri
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Kalkulator Estimasi Potensi Keuntungan Cabang
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Geser nilai perkiraan aktivitas di wilayah Anda untuk melihat potensi perolehan bagi hasil bulanan dan tahunan:
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-8 items-center">
            {/* Sliders (7 Cols) */}
            <div className="md:col-span-7 space-y-6">
              {/* Slider 1: Job Posts */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Jumlah Lowongan Kerja Dipasang per Bulan:</span>
                  <span className="text-cyan-300 font-bold text-sm font-mono">{jobPostCount} Loker</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={jobPostCount}
                  onChange={(e) => setJobPostCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>5 Loker</span>
                  <span>50 Loker</span>
                  <span>100 Loker</span>
                </div>
              </div>

              {/* Slider 2: Verified Applicants */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Pencari Kerja Aktif di Cabang per Bulan:</span>
                  <span className="text-emerald-300 font-bold text-sm font-mono">{applicantCount} Orang</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1500"
                  step="50"
                  value={applicantCount}
                  onChange={(e) => setApplicantCount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>50 Pelamar</span>
                  <span>750 Pelamar</span>
                  <span>1.500 Pelamar</span>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/80 p-4 text-xs space-y-1 text-slate-300">
                <p className="font-semibold text-white">Catatan Model Finansial:</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Estimasi didasarkan pada perolehan rata-rata komisi posting lowongan premium dan verifikasi biodata/keahlian pelamar. Pendapatan riil dapat lebih tinggi dengan adanya modul sponsorship, subscription, dan transaksi jasa mandiri.
                </p>
              </div>
            </div>

            {/* Results Bento Box (5 Cols) */}
            <div className="md:col-span-5 rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-950/60 to-slate-950 p-6 text-center space-y-4 shadow-xl">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-widest">
                Estimasi Bagi Hasil Mitra
              </span>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  {formatRupiah(estimatedMonthlyTotal)}
                </p>
                <span className="text-xs text-slate-400">per bulan</span>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-left">
                <div className="flex justify-between text-slate-300">
                  <span>Komisi Loker Perusahaan:</span>
                  <span className="font-mono font-bold text-cyan-300">{formatRupiah(estimatedJobRevenue)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Komisi Verifikasi Pelamar:</span>
                  <span className="font-mono font-bold text-emerald-300">{formatRupiah(estimatedApplicantRevenue)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between font-bold text-white">
                  <span>Proyeksi Tahunan:</span>
                  <span className="font-mono text-amber-300">{formatRupiah(estimatedMonthlyTotal * 12)}</span>
                </div>
              </div>

              <a
                href="#cara-bergabung"
                className="w-full inline-block rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 py-3 text-xs font-bold transition shadow-md"
              >
                Mulai Dapatkan Hasil Cabang Anda
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 py-12 scroll-mt-20">
        <div className="text-center mb-8 space-y-2">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-wider">
            Pertanyaan Umum
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Tanya Jawab Seputar Program Mitra
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="text-sm font-bold text-white">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-cyan-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/80 via-slate-900 to-sky-950/80 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
            Siap Membangun Bursa Kerja Digital di Wilayah Anda?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Dapatkan teknologi platform rekrutmen terdepan Indonesia. Tidak ada biaya komitmen awal, verifikasi 1x24 jam langsung dari Superadmin LOXER.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <a
              href="#cara-bergabung"
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 px-7 py-3.5 text-sm font-bold shadow-lg shadow-cyan-500/25 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
            >
              <span>Ajukan Kemitraan Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/portal-mitra"
              className="rounded-xl border border-white/20 bg-slate-900/80 hover:bg-slate-800 text-white px-6 py-3.5 text-sm font-semibold transition"
            >
              Sudah Memiliki Cabang? Masuk Portal
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 bg-slate-950 text-center text-xs text-slate-500 space-y-2">
        <p>LOXER Partner Network · Teknologi Terpusat, Ruang Kerja dan Identitas Milik Anda.</p>
        <p>© 2026 LOXER Platform Rekrutmen Terpercaya Indonesia. All rights reserved.</p>
      </footer>
    </main>
  );
}
