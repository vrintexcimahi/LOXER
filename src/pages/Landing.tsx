import { useEffect, useRef, useState } from 'react';
import {
  Search, MapPin, Zap, Users, TrendingUp,
  CheckCircle, ArrowRight, Briefcase, Building2, UserCheck,
  Award, Filter, Sparkles
} from 'lucide-react';
import TestimonialsSlider from '../components/reviews/TestimonialsSlider';
import { allReviews } from '../lib/reviews';
import HeroBannerSlideshow from '../components/banner/HeroBannerSlideshow';

import { UserRole } from '../lib/types';

interface LandingProps {
  onLogin: () => void;
  onRegister: (role?: UserRole) => void;
}

const stats = [
  { value: '125K+', label: 'Lowongan Aktif' },
  { value: '8,400+', label: 'Perusahaan' },
  { value: '2.1M+', label: 'Pencari Kerja' },
  { value: '340K+', label: 'Berhasil Rekrut' },
];

const heroSocialProofReviews = [1, 3, 6, 9]
  .map((avatarNumber) => allReviews[avatarNumber - 1])
  .filter(Boolean);

const seekerFeatures = [
  {
    icon: Zap,
    title: '1-Click Apply',
    desc: 'Lamar pekerjaan seketika — profil kamu adalah CV-mu. Tidak perlu upload berkas.',
  },
  {
    icon: MapPin,
    title: 'Berdasarkan Lokasi',
    desc: 'Temukan lowongan terdekat dari domisilimu dengan filter jarak otomatis.',
  },
  {
    icon: TrendingUp,
    title: 'Lacak Lamaran',
    desc: 'Pantau status lamaranmu secara real-time dari Applied hingga Hired.',
  },
];

const employerFeatures = [
  {
    icon: Filter,
    title: 'Magic Filter',
    desc: 'Saring kandidat secara cerdas berdasarkan kecocokan profil, domisili, pendidikan, dan keahlian.',
  },
  {
    icon: UserCheck,
    title: '1-Click Interview Invite',
    desc: 'Kirim undangan interview langsung dari dashboard — jadwal, lokasi, dan konfirmasi otomatis.',
  },
  {
    icon: Users,
    title: 'Kolaborasi Tim HR',
    desc: 'Ajak anggota tim untuk bersama-sama mengelola proses rekrutmen dalam satu platform.',
  },
];

const steps = [
  { icon: UserCheck, title: 'Buat Profil', desc: 'Isi data diri, pendidikan, pengalaman, dan keahlianmu dalam satu halaman.', color: 'from-sky-500 to-cyan-400' },
  { icon: Search, title: 'Temukan Lowongan', desc: 'Cari ribuan lowongan berdasarkan posisi, lokasi, dan kisaran gaji.', color: 'from-cyan-400 to-teal-400' },
  { icon: Zap, title: 'Lamar 1-Klik', desc: 'Kirim lamaran seketika tanpa upload dokumen — profil kamu sudah cukup.', color: 'from-sky-600 to-sky-400' },
  { icon: Award, title: 'Dapatkan Pekerjaan', desc: 'Terima notifikasi, jadwal interview, dan tawaran kerja langsung di appmu.', color: 'from-sky-400 to-cyan-300' },
];

const SEARCH_PLACEHOLDERS = [
  'Posisi, keahlian, atau perusahaan...',
  'Software Engineer di Jakarta...',
  'UI/UX Designer Remote...',
  'Digital Marketing Specialist...',
  'Data Analyst & Python...',
  'Admin Operasional & Finance...',
];

function CountUp({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const cleanStr = target.replace(/[^0-9.]/g, '');
        const targetNum = parseFloat(cleanStr);
        const hasDecimals = cleanStr.includes('.');
        const extraSuffix = target.replace(/[0-9.,]/g, '');

        let startTimestamp: number | null = null;
        const duration = 1500;

        const step = (timestamp: number) => {
          if (!startTimestamp) startTimestamp = timestamp;
          const progress = Math.min((timestamp - startTimestamp) / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = targetNum * easeOut;

          if (hasDecimals) {
            setDisplayed(currentVal.toFixed(1) + extraSuffix);
          } else if (target.includes(',')) {
            setDisplayed(Math.floor(currentVal).toLocaleString('en-US') + extraSuffix);
          } else {
            setDisplayed(Math.floor(currentVal) + extraSuffix);
          }

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            setDisplayed(target);
          }
        };

        requestAnimationFrame(step);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <div ref={ref} className="text-3xl lg:text-4xl font-black text-gradient animate-count-up">{displayed}{suffix}</div>;
}

export default function Landing({ onLogin, onRegister }: LandingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Animated Typing Placeholder Effect
  useEffect(() => {
    if (searchQuery) return;

    const currentText = SEARCH_PLACEHOLDERS[placeholderIndex];
    const typingSpeed = isDeleting ? 30 : 60;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayedPlaceholder.length < currentText.length) {
          setDisplayedPlaceholder(currentText.slice(0, displayedPlaceholder.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayedPlaceholder.length > 0) {
          setDisplayedPlaceholder(currentText.slice(0, displayedPlaceholder.length - 1));
        } else {
          setIsDeleting(false);
          setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [displayedPlaceholder, isDeleting, placeholderIndex, searchQuery]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (searchLocation) params.set('location', searchLocation);
    window.location.href = `/seeker/browse?${params.toString()}`;
  }

  return (
    <div className="overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-start pt-20 sm:pt-24 lg:pt-28 pb-10 sm:pb-16 gradient-hero overflow-hidden px-3 sm:px-4">
        {/* Dynamic Multi-Layer Ambient Background Mesh */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[110px] animate-ambient-drift pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[420px] h-[420px] bg-sky-500/15 rounded-full blur-[120px] animate-ambient-drift pointer-events-none" style={{ animationDelay: '-6s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[150px] animate-pulse-glow pointer-events-none" />

        {/* Subtle Tech Cyber Grid Background Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 max-w-[min(100%,1280px)] mx-auto text-center px-2 sm:px-4 w-full">
          {/* Banner Slideshow */}
          <HeroBannerSlideshow onRegister={onRegister} />

          {/* Eyebrow Badge with Pulsing Live Radar */}
          <div className="inline-flex items-center gap-2.5 glass rounded-full px-4 py-1.5 text-cyan-300 text-xs font-semibold mb-3 sm:mb-4 animate-fade-up border border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-radar absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
            </span>
            <span className="tracking-wide">Platform Rekrutmen &amp; Karir #1 Indonesia</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-3 sm:mb-4 animate-fade-up max-w-4xl mx-auto" style={{ animationDelay: '100ms' }}>
            Temukan Karir <span className="text-gradient drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">Impian Kamu</span> Mulai Hari Ini
          </h1>

          {/* Subtitle */}
          <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-6 sm:mb-8 animate-fade-up leading-relaxed" style={{ animationDelay: '200ms' }}>
            Bergabung dengan <span className="text-white font-semibold">2.1 juta+</span> pencari kerja dan <span className="text-white font-semibold">8.400+</span> perusahaan terverifikasi. Lamar dalam 1-klik, tanpa upload berkas CV berulang kali.
          </p>

          {/* Interactive Floating Live Success Badges (Desktop Only) */}
          <div className="relative max-w-3xl mx-auto">
            {/* Left Floating Card: Live Hired Activity */}
            <div className="hidden xl:flex items-center gap-3 p-3.5 rounded-2xl glass-card-interactive absolute -left-48 top-4 z-20 max-w-[250px] text-left animate-float-subtle shadow-xl shadow-cyan-950/40 pointer-events-none border border-cyan-400/25">
              <div className="relative">
                <img
                  src={heroSocialProofReviews[0]?.avatarPath || '/branding/icon64.png'}
                  alt="Candidate Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Baru Diterima</span>
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                </div>
                <p className="text-xs font-bold text-white truncate">UI Designer</p>
                <p className="text-[10px] text-slate-400">di Tech Unicorn • 2m lalu</p>
              </div>
            </div>

            {/* Right Floating Card: Live Openings Ticker */}
            <div className="hidden xl:flex items-center gap-3 p-3.5 rounded-2xl glass-card-interactive absolute -right-48 top-16 z-20 max-w-[250px] text-left animate-float-reverse shadow-xl shadow-sky-950/40 pointer-events-none border border-sky-400/25">
              <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-cyan-300">125K+ Lowongan</span>
                </div>
                <p className="text-xs font-bold text-white truncate">1-Klik Lamar Aktif</p>
                <p className="text-[10px] text-slate-400">Update Tiap Menit</p>
              </div>
            </div>

            {/* Glassmorphism Search Bar */}
            <form onSubmit={handleSearch} className="animate-fade-up relative z-10" style={{ animationDelay: '300ms' }}>
              <div className="flex flex-col sm:flex-row items-stretch gap-2 glass-panel rounded-[24px] sm:rounded-[26px] p-2 sm:p-2.5 shadow-2xl transition-all duration-300">
                {/* Keyword Input */}
                <div className="flex min-h-[48px] sm:min-h-[54px] items-center gap-3 flex-1 rounded-2xl px-3.5 sm:px-4 bg-slate-950/40 border border-slate-700/50 focus-within:border-cyan-400/60 focus-within:bg-slate-950/70 transition-all">
                  <Search className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={displayedPlaceholder || 'Posisi, keahlian, atau perusahaan...'}
                    className="flex-1 outline-none text-xs sm:text-sm text-white placeholder-slate-400 bg-transparent min-w-0"
                  />
                </div>

                {/* Location Input */}
                <div className="hidden sm:flex min-h-[54px] items-center gap-3 flex-1 rounded-2xl px-4 bg-slate-950/40 border border-slate-700/50 focus-within:border-cyan-400/60 focus-within:bg-slate-950/70 transition-all">
                  <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    placeholder="Kota atau Remote"
                    className="flex-1 outline-none text-sm text-white placeholder-slate-400 bg-transparent min-w-0"
                  />
                </div>

                {/* Search Button with Shimmer Sweep Ray */}
                <button
                  type="submit"
                  className="relative group overflow-hidden gradient-cta inline-flex min-h-[46px] sm:min-h-[54px] items-center justify-center rounded-xl sm:rounded-2xl px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white whitespace-nowrap shadow-lg shadow-cyan-500/35 hover:brightness-110 active:scale-95 transition-all duration-200 sm:min-w-[155px] cursor-pointer"
                >
                  <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
                  <span className="flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-white" />
                    <span>Cari Lowongan</span>
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Filters / Popular Tags */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 sm:mt-5 animate-fade-up" style={{ animationDelay: '400ms' }}>
            <span className="text-[11px] sm:text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Pencarian Populer:</span>
            {['Software Engineer', 'Marketing', 'UI/UX Designer', 'Data Analyst', 'Jakarta', 'Remote'].map((tag) => (
              <button
                key={tag}
                onClick={() => { window.location.href = `/seeker/browse?q=${encodeURIComponent(tag)}`; }}
                className="glass rounded-full px-3 sm:px-3.5 py-1 text-[11px] sm:text-xs text-cyan-200/90 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Differentiated Persona CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 animate-fade-up" style={{ animationDelay: '500ms' }}>
            <button
              onClick={() => onRegister('seeker')}
              className="relative group overflow-hidden gradient-cta text-white rounded-full px-7 sm:px-9 py-3 sm:py-3.5 font-bold text-sm sm:text-base shadow-xl shadow-cyan-500/35 hover:shadow-cyan-400/50 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2"
            >
              <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
              <span>Cari Kerja Sekarang</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onRegister('employer')}
              className="relative group overflow-hidden border border-cyan-400/40 text-cyan-200 bg-slate-900/60 hover:bg-cyan-500/15 hover:border-cyan-300 hover:text-white backdrop-blur-md rounded-full px-7 sm:px-9 py-3 sm:py-3.5 font-semibold text-sm sm:text-base hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg shadow-black/20"
            >
              <span>Rekrut Karyawan</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

          {/* Social Proof with Glowing Border Avatars */}
          <div className="flex items-center justify-center gap-2.5 mt-5 sm:mt-7 animate-fade-up" style={{ animationDelay: '600ms' }}>
            <div className="flex -space-x-2">
              {heroSocialProofReviews.map((review) => (
                <img
                  key={review.id}
                  src={review.avatarPath}
                  alt={review.name}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-cyan-400 object-cover object-center shadow-lg shadow-cyan-950/40"
                />
              ))}
            </div>
            <p className="text-slate-300 text-[11px] sm:text-xs">
              Bergabung bersama <span className="text-cyan-400 font-bold">2.1 juta+</span> pencari kerja aktif
            </p>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ──────────────────────────────────── */}
      <section className="bg-slate-900/90 dark:bg-slate-950/90 border-y border-cyan-500/15 py-6 sm:py-8 backdrop-blur-md relative z-10">
        <div className="max-w-[min(100%,1440px)] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((s, i) => (
            <div key={i} className={`text-center ${i < 3 ? 'md:border-r md:border-cyan-500/15' : ''}`}>
              <CountUp target={s.value} />
              <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOR SEEKERS ──────────────────────────────────── */}
      <section id="features" className="bg-slate-950 py-10 sm:py-16 px-3 sm:px-4 relative">
        <div className="max-w-[min(100%,1600px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block gradient-badge text-slate-950 text-xs font-bold rounded-full px-4 py-1 mb-3 shadow-md shadow-cyan-500/20">
              Untuk Pencari Kerja
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
              Lamar Lebih Cepat, <span className="text-gradient">Raih Lebih Banyak</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Profil lengkap satu kali, lamar ke ribuan lowongan impian tanpa repot unggah CV berulang.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {seekerFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group relative bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-cyan-400/50 p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-cyan-500/15 overflow-hidden flex flex-col justify-between">
                <div className="h-1 bg-gradient-to-r from-cyan-400 to-sky-500 absolute top-0 inset-x-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="w-12 h-12 gradient-cta rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 sm:mt-10 text-center">
            <button onClick={() => onRegister('seeker')} className="gradient-cta text-white rounded-xl px-7 sm:px-9 py-3 sm:py-3.5 font-bold text-sm shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer">
              <span>Mulai Cari Kerja</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOR EMPLOYERS ────────────────────────────────── */}
      <section className="py-10 sm:py-16 px-3 sm:px-4 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-[min(100%,1600px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block gradient-badge text-slate-950 text-xs font-bold rounded-full px-4 py-1 mb-3 shadow-md shadow-sky-500/20">
              Untuk Perekrut &amp; Perusahaan
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
              Rekrut Lebih Cerdas, <span className="text-gradient">Lebih Efisien</span>
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
              Dari posting lowongan hingga jadwal interview — kelola seluruh alur rekrutmen dalam satu dashboard terpusat.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {employerFeatures.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group relative bg-slate-900/80 rounded-2xl border border-slate-800 hover:border-sky-400/50 p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-sky-500/15 overflow-hidden flex flex-col justify-between"
              >
                <div className="h-1 bg-gradient-to-r from-sky-400 to-cyan-500 absolute top-0 inset-x-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                <div>
                  <div className="w-12 h-12 gradient-card rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-sky-500/30 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-base sm:text-lg mb-2">{title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 text-center">
            <button
              onClick={() => onRegister('employer')}
              className="gradient-card text-white rounded-xl px-7 sm:px-9 py-3 sm:py-3.5 font-bold text-sm shadow-lg shadow-sky-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Daftar sebagai Perekrut</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-950 py-10 sm:py-16 px-3 sm:px-4 border-t border-slate-800">
        <div className="max-w-[min(100%,1440px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <span className="inline-block gradient-badge text-slate-950 text-xs font-bold rounded-full px-4 py-1 mb-3">
              Cara Kerja
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
              Mulai dalam <span className="text-gradient">4 Langkah Mudah</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm max-w-lg mx-auto">
              Proses cepat tanpa birokrasi berbelit, langsung terhubung dengan hiring manager.
            </p>
          </div>

          <div className="relative">
            {/* Glowing Progressive Connector line */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 opacity-40 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {steps.map(({ icon: Icon, title, desc, color }, i) => (
                <div
                  key={i}
                  className="text-center relative p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-cyan-400/40 transition-all duration-300 hover:-translate-y-1.5"
                >
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-sky-500/25 relative z-10 group`}>
                    <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-slate-950 border-2 border-cyan-400 rounded-full flex items-center justify-center text-cyan-300 text-xs font-black shadow-md">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-sm sm:text-base mb-1.5">{title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSlider />

      {/* ─── TRUSTED COMPANIES ────────────────────────────── */}
      <section className="bg-slate-900/80 py-8 sm:py-12 px-3 sm:px-4 border-y border-slate-800">
        <div className="max-w-[min(100%,1440px)] mx-auto text-center px-2">
          <p className="text-slate-400 text-xs sm:text-sm font-semibold uppercase tracking-widest mb-6">
            Dipercaya Perusahaan &amp; Startup Terkemuka
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-75">
            {['Tokopedia', 'Gojek', 'Traveloka', 'Bukalapak', 'OVO', 'Shopee', 'Grab', 'Dana'].map((c) => (
              <div key={c} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                <span className="text-slate-300 font-bold text-xs sm:text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ──────────────────────────────────── */}
      <section className="gradient-hero py-12 sm:py-20 px-3 sm:px-4 relative overflow-hidden">
        {/* Dynamic ambient pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-[min(100%,1024px)] mx-auto text-center px-2 sm:px-4">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-cyan-300 text-xs font-semibold mb-4 border border-cyan-400/30">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Mulai Gratis Tanpa Biaya Tersembunyi</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 sm:mb-4">
            Siap Wujudkan <span className="text-gradient">Karir Impianmu?</span>
          </h2>

          <p className="text-slate-300 text-xs sm:text-base mb-6 sm:mb-8 max-w-xl mx-auto leading-relaxed">
            Buat profil digital, lamar lowongan favorit, dan raih kesempatan kerja terbaik sekarang.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onRegister('seeker')}
              className="relative group overflow-hidden gradient-cta text-white rounded-full px-8 sm:px-10 py-3.5 sm:py-4 font-bold text-sm sm:text-base shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <span className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />
              <span>Daftar Gratis Sekarang</span>
            </button>
            <button
              onClick={onLogin}
              className="border-2 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full px-8 sm:px-10 py-3.5 sm:py-4 font-semibold text-sm sm:text-base hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Sudah punya akun? Masuk
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8 mt-6 sm:mt-8 flex-wrap">
            {['100% Gratis Selamanya', 'Tanpa Repot Upload CV', 'Lamar Cepat 1-Klik'].map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-slate-300 text-xs">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
