import { useState, type FormEvent } from 'react';
import { ArrowRight, Briefcase, Building2, Check, Crown, MapPin, Search, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react';
import AppLogo from './AppLogo';
import type { UserRole } from '../../lib/types';
import { navigateTo } from '../../lib/navigation';

const roles = [
  { title: 'Pencari Kerja', description: 'Temukan peluang untuk langkah karir berikutnya.', icon: Briefcase, href: '/browse', avatar: '/avatars/pixar_male_1.jpg', label: 'Cari pekerjaan' },
  { title: 'Perusahaan (HRD)', description: 'Temukan talenta dan kelola rekrutmen lebih mudah.', icon: Building2, href: '/#employer-section', avatar: '/avatars/pixar_female_1.jpg', label: 'Rekrut talenta' },
  { title: 'Penyedia Jasa', description: 'Tampilkan keahlian dan terhubung dengan pelanggan.', icon: Wrench, href: '/talents?availability=freelance', avatar: '/avatars/pixar_male_2.jpg', label: 'Jelajahi jasa' },
  { title: 'Super Admin', description: 'Pantau dan kelola seluruh ekosistem LOXER.', icon: Crown, href: '/admin-login', avatar: '/avatars/pixar_male_2.jpg', label: 'Akses administrator' },
];

export default function ClayHero({ onRegister }: { onRegister: (role?: UserRole) => void }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  function handleSearch(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (location.trim()) params.set('location', location.trim());
    const targetUrl = params.toString() ? `/browse?${params.toString()}` : '/browse';
    navigateTo(targetUrl);
  }

  return (
    <section className="clay-hero">
      <div className="clay-orb clay-orb-one" aria-hidden="true" />
      <div className="clay-orb clay-orb-two" aria-hidden="true" />
      <div className="clay-hero-inner">
        <div className="clay-hero-grid">
          <div className="clay-hero-copy">
            <span className="clay-eyebrow"><Sparkles size={16} /> Satu platform, banyak peluang</span>
            <h1>Talenta. Peluang.<br /><span>Solusi.</span></h1>
            <p>Temukan pekerjaan impian, rekrut talenta terbaik, dan tawarkan keahlian Anda. Semua terhubung dalam satu ekosistem LOXER.</p>
            <div className="clay-hero-actions">
              <a className="clay-button" href="/browse">Temukan peluang <ArrowRight size={18} /></a>
              <button className="clay-button-secondary" onClick={() => onRegister('employer')}>Untuk perusahaan <Building2 size={18} /></button>
            </div>
            <div className="clay-trust"><ShieldCheck size={18} /> Profil terverifikasi <span /> Peluang dalam satu tempat</div>
            <a href="/mitra" className="inline-flex items-center gap-2 mt-4 text-xs font-semibold text-sky-600 dark:text-sky-400">Berkembang bersama sebagai mitra LOXER <ArrowRight size={14} /></a>
          </div>
          <div className="clay-showcase" aria-label="Temukan peluang melalui LOXER">
            <div className="clay-floating-tag"><span className="clay-icon"><Check size={18} /></span><div>Langkah baru Anda<strong>Dimulai di sini</strong></div></div>
            <div className="clay-preview-card">
              <div className="clay-preview-header">
                <AppLogo variant="compact" height={22} textClassName="text-sm font-black" />
                <span className="clay-preview-badge">Karir & Jasa</span>
              </div>
              <div className="clay-preview-greeting"><div><small>Halo, talenta hebat 👋</small><h2>Siap meraih<br />peluang baru?</h2></div><img src="/avatars/pixar_male_1.jpg" alt="Ilustrasi pencari kerja" /></div>
              <a className="clay-preview-search" href="/browse"><Search size={18} /> Cari pekerjaan impian Anda <ArrowRight size={16} /></a>
              <div className="clay-preview-promo"><div><span>Waktunya berkembang</span><h3>Keahlian Anda,<br />peluang tanpa batas.</h3><a href="/talents?availability=freelance">Jelajahi jasa <ArrowRight size={15} /></a></div><div className="clay-large-icon"><Briefcase size={64} strokeWidth={1.6} /></div></div>
              <div className="clay-preview-options"><a href="/browse"><Building2 size={22} /><span>Cari kerja</span></a><a href="/talents"><Users size={22} /><span>Talenta</span></a><a href="/talents?availability=freelance"><Wrench size={22} /><span>Jasa</span></a></div>
            </div>
            <div className="clay-floating-bottom"><span className="clay-icon"><Users size={22} /></span><div>Terhubung lebih mudah<strong>Talenta · Perusahaan · Jasa</strong></div></div>
          </div>
        </div>
        <form className="clay-search-bar" onSubmit={handleSearch} role="search" aria-label="Cari lowongan">
          <label><Search size={21} /><span className="sr-only">Posisi, keahlian, atau perusahaan</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Posisi, keahlian, atau perusahaan" /></label>
          <label><MapPin size={21} /><span className="sr-only">Lokasi pekerjaan</span><input value={location} onChange={event => setLocation(event.target.value)} placeholder="Kota atau lokasi" /></label>
          <button className="clay-button" type="submit">Cari lowongan <ArrowRight size={18} /></button>
        </form>
        <div className="clay-role-grid">
          {roles.map(({ title, description, icon: Icon, href, avatar, label }) => <a className="clay-role-card" href={href} key={title} aria-label={`${title}: ${label}`}><div className="clay-role-visual"><span className="clay-role-icon"><Icon size={36} strokeWidth={1.7} /></span><img src={avatar} alt="" /></div><div className="clay-role-content"><h2>{title}</h2><p>{description}</p><span className="clay-role-arrow"><ArrowRight size={18} /></span></div></a>)}
        </div>
      </div>
    </section>
  );
}
