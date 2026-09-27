import { useEffect, useRef, useState } from 'react';
import {
  Search, MapPin, Zap, Users, TrendingUp,
  CheckCircle, ArrowRight, Briefcase, Building2, UserCheck,
  Award, Filter
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

function CountUp({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [displayed, setDisplayed] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        setDisplayed(target);
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
      <section className="relative flex flex-col items-center justify-start pt-16 sm:pt-22 pb-6 sm:pb-10 gradient-hero overflow-hidden px-3 sm:px-4">
        {/* Blob decorations */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full opacity-[0.08] blur-3xl animate-blob" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-sky-400 rounded-full opacity-[0.08] blur-3xl animate-blob" style={{ animationDelay: '-4s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600 rounded-full opacity-[0.05] blur-3xl" />

        <div className="relative z-10 max-w-[min(100%,1280px)] mx-auto text-center px-2 sm:px-4 w-full">
          {/* Banner Slideshow */}
          <HeroBannerSlideshow onRegister={onRegister} />

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1 text-cyan-300 text-xs font-semibold mb-2 sm:mb-3 animate-fade-up">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            Platform Rekrutmen #1 Indonesia
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-2 sm:mb-3 animate-fade-up" style={{ animationDelay: '100ms' }}>
            Temukan Karir <span className="text-gradient">Impian Kamu</span> Mulai Hari Ini
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm md:text-base max-w-2xl mx-auto mb-3 sm:mb-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
            Bergabung dengan 2 juta+ pencari kerja dan 8.000+ perusahaan terpilih. Lamar dalam 1 klik, tanpa upload CV berulang kali.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="flex flex-col sm:flex-row items-stretch gap-2 bg-white/95 backdrop-blur-md rounded-[24px] sm:rounded-[26px] p-1.5 sm:p-2 shadow-2xl shadow-cyan-500/20 max-w-3xl mx-auto border border-white/20">
              <div className="flex min-h-[48px] sm:min-h-[56px] items-center gap-3 flex-1 rounded-2xl px-3 sm:px-4">
                <Search className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Posisi, keahlian, atau perusahaan..."
                  className="flex-1 outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 bg-transparent"
                />
              </div>
              <div className="hidden sm:flex min-h-[56px] items-center gap-3 border-l border-slate-200/80 flex-1 px-4">
                <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <input
                  type="text"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Kota atau Remote"
                  className="flex-1 outline-none text-sm text-slate-800 placeholder-slate-400 bg-transparent"
                />
              </div>
              <button
                type="submit"
                className="gradient-cta inline-flex min-h-[46px] sm:min-h-[56px] items-center justify-center rounded-xl sm:rounded-2xl px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold whitespace-nowrap shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all sm:min-w-[148px]"
              >
                Cari Lowongan
              </button>
            </div>
          </form>

          {/* Quick filters */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 animate-fade-up" style={{ animationDelay: '400ms' }}>
            {['Software Engineer', 'Marketing', 'UI/UX Designer', 'Data Analyst', 'Jakarta'].map((tag) => (
              <button
                key={tag}
                onClick={() => { window.location.href = `/seeker/browse?q=${encodeURIComponent(tag)}`; }}
                className="glass rounded-full px-3 py-1 text-[11px] sm:text-xs text-white/80 hover:text-white hover:bg-white/15 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-5 sm:mt-7 animate-fade-up" style={{ animationDelay: '500ms' }}>
            <button
              onClick={() => onRegister('seeker')}
              className="gradient-cta text-white rounded-full px-6 sm:px-8 py-3 sm:py-4 font-semibold text-sm sm:text-base shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Cari Kerja Sekarang
            </button>
            <button
              onClick={() => onRegister('employer')}
              className="border-2 border-white/30 text-white bg-white/10 backdrop-blur rounded-full px-6 sm:px-8 py-3 sm:py-4 font-semibold text-sm sm:text-base hover:bg-white/20 transition-all duration-200"
            >
              Rekrut Karyawan →
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 mt-4 sm:mt-6 animate-fade-up" style={{ animationDelay: '600ms' }}>
            <div className="flex -space-x-2">
              {heroSocialProofReviews.map((review) => (
                <img
                  key={review.id}
                  src={review.avatarPath}
                  alt={review.name}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border-2 border-[#0369A1] object-cover object-center shadow-lg shadow-slate-950/20"
                />
              ))}
            </div>
            <p className="text-slate-400 text-[11px] sm:text-xs">Bergabung bersama <span className="text-cyan-400 font-semibold">2.1 juta</span> pencari kerja</p>
          </div>
        </div>
      </section>

      {/* ─── STATS STRIP ──────────────────────────────────── */}
      <section className="bg-white py-5 sm:py-8 border-b border-sky-100">
        <div className="max-w-[min(100%,1440px)] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
          {stats.map((s, i) => (
            <div key={i} className={`text-center ${i < 3 ? 'md:border-r md:border-sky-100' : ''}`}>
              <CountUp target={s.value} />
              <p className="text-slate-500 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOR SEEKERS ──────────────────────────────────── */}
      <section id="features" className="bg-sky-50 py-8 sm:py-12 px-3 sm:px-4">
        <div className="max-w-[min(100%,1600px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-5 sm:mb-8">
            <span className="inline-block gradient-badge text-white text-xs font-semibold rounded-full px-3.5 py-1 mb-2.5">Untuk Pencari Kerja</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-2 sm:mb-3">Lamar Lebih Cepat, <span className="text-gradient">Raih Lebih Banyak</span></h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">Profil lengkap sekali, lamar ke ribuan lowongan tanpa repot.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
            {seekerFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-sky-100 overflow-hidden card-hover shadow-sm group">
                <div className="h-1 gradient-cta" />
                <div className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-cta rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-md sm:shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-slate-800 font-bold text-sm sm:text-base mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 sm:mt-6 text-center">
            <button onClick={() => onRegister('seeker')} className="gradient-cta text-white rounded-xl px-6 sm:px-8 py-2.5 sm:py-3.5 font-semibold text-sm shadow-md sm:shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2">
              Mulai Cari Kerja <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FOR EMPLOYERS ────────────────────────────────── */}
      <section className="py-8 sm:py-12 px-3 sm:px-4 gradient-subtle">
        <div className="max-w-[min(100%,1600px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-5 sm:mb-8">
            <span className="inline-block gradient-badge text-white text-xs font-semibold rounded-full px-3.5 py-1 mb-2.5">Untuk Perekrut</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-2 sm:mb-3">Rekrut Lebih Cerdas, <span className="text-gradient">Lebih Efisien</span></h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-xl mx-auto">Dari posting lowongan hingga jadwal interview — semua dalam satu dashboard.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
            {employerFeatures.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-sky-100 overflow-hidden card-hover shadow-sm group">
                <div className="h-1 gradient-cta" />
                <div className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 gradient-card rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-md sm:shadow-lg shadow-sky-500/30 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <h3 className="text-slate-800 font-bold text-sm sm:text-base mb-1.5">{title}</h3>
                  <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 sm:mt-6 text-center">
            <button onClick={() => onRegister('employer')} className="gradient-card text-white rounded-xl px-6 sm:px-8 py-2.5 sm:py-3.5 font-semibold text-sm shadow-md sm:shadow-lg shadow-sky-500/30 hover:brightness-110 active:scale-95 transition-all inline-flex items-center gap-2">
              Daftar sebagai Perekrut <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────── */}
      <section id="how-it-works" className="bg-white py-8 sm:py-12 px-3 sm:px-4">
        <div className="max-w-[min(100%,1440px)] mx-auto px-1 sm:px-4 lg:px-8">
          <div className="text-center mb-5 sm:mb-8">
            <span className="inline-block gradient-badge text-white text-xs font-semibold rounded-full px-3.5 py-1 mb-2.5">Cara Kerja</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-2 sm:mb-3">Mulai dalam <span className="text-gradient">4 Langkah Mudah</span></h2>
          </div>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 gradient-cta opacity-30" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
              {steps.map(({ icon: Icon, title, desc, color }, i) => (
                <div key={i} className="text-center relative">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mx-auto mb-2.5 sm:mb-4 shadow-md sm:shadow-lg shadow-sky-500/25 relative z-10`}>
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 w-5 h-5 sm:w-6 sm:h-6 bg-white border-2 border-sky-200 rounded-full flex items-center justify-center text-sky-600 text-[10px] sm:text-xs font-black">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="text-slate-800 font-bold text-xs sm:text-sm mb-1">{title}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSlider />

      {/* ─── TRUSTED COMPANIES ────────────────────────────── */}
      <section className="bg-white py-6 sm:py-10 px-3 sm:px-4">
        <div className="max-w-[min(100%,1440px)] mx-auto text-center px-2">
          <p className="text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-widest mb-4 sm:mb-6">Dipercaya Perusahaan Terkemuka</p>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-50">
            {['Tokopedia', 'Gojek', 'Traveloka', 'Bukalapak', 'OVO', 'Shopee', 'Grab', 'Dana'].map((c) => (
              <div key={c} className="flex items-center gap-1.5 sm:gap-2">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <span className="text-slate-600 font-semibold text-xs sm:text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ──────────────────────────────────── */}
      <section className="gradient-hero py-8 sm:py-14 px-3 sm:px-4">
        <div className="max-w-[min(100%,1024px)] mx-auto text-center px-2 sm:px-4">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3.5 py-1.5 text-cyan-300 text-xs font-semibold mb-3 sm:mb-4">
            <Briefcase className="w-3.5 h-3.5" /> Mulai Gratis Sekarang
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white mb-2 sm:mb-3">
            Siap Wujudkan <span className="text-gradient">Karir Impianmu?</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-base mb-5 sm:mb-7 max-w-xl mx-auto">
            Buat profil, lamar lowongan, dan dapatkan pekerjaan impian — semua gratis.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={() => onRegister('seeker')}
              className="gradient-cta text-white rounded-full px-8 sm:px-10 py-3 sm:py-4 font-semibold text-sm sm:text-base shadow-xl shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              Daftar Gratis Sekarang
            </button>
            <button
              onClick={onLogin}
              className="border-2 border-white/30 text-white bg-white/10 backdrop-blur rounded-full px-8 sm:px-10 py-3 sm:py-4 font-semibold text-sm sm:text-base hover:bg-white/20 transition-all duration-200"
            >
              Sudah punya akun?
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-5 sm:mt-6">
            {['Gratis Selamanya', 'Tanpa Upload CV', '1-Klik Lamar'].map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-slate-400 text-[11px] sm:text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> {f}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
