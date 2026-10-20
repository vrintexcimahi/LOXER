import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  Inbox,
  UserCheck,
  Phone,
  MapPin,
  Globe,
  FileText,
  Clock,
  Check,
  X,
  Lock,
} from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import TalentCard from '../../components/marketplace/TalentCard';
import TalentDetailModal from '../../components/marketplace/TalentDetailModal';
import { supabase } from '../../lib/supabase';
import { broadcastSync } from '../../lib/realtimeSync';
import { useAuth } from '../../contexts/useAuth';
import { maskPhoneNumber, cleanDomicileCity } from '../../lib/contactPrivacyService';
import {
  TalentMarketplacePost,
  DirectJobOffer,
  SeekerProfile,
  AvailabilityStatus,
  RateType
} from '../../lib/types';

export default function SeekerMarketplace() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'offers'>('profile');
  const [profile, setProfile] = useState<SeekerProfile | null>(null);
  const [existingPost, setExistingPost] = useState<TalentMarketplacePost | null>(null);
  const [offers, setOffers] = useState<DirectJobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedPreviewTalent, setSelectedPreviewTalent] = useState<TalentMarketplacePost | null>(null);

  // Form State
  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState('Servis Elektronik & Komputer');
  const [availability, setAvailability] = useState<AvailabilityStatus>('freelance');
  const [experienceYears, setExperienceYears] = useState(1);
  const [expectedSalary, setExpectedSalary] = useState('');
  const [rateType, setRateType] = useState<RateType>('project');
  const [domicileCity, setDomicileCity] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [badge, setBadge] = useState('SIAP PANGGILAN');
  const [bio, setBio] = useState('');
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const loadData = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);

    try {
      // 1. Fetch Seeker Profile
      const { data: p } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (p) {
        setProfile(p as SeekerProfile);

        // 2. Fetch Existing Marketplace Post
        const { data: post } = await supabase
          .from('talent_marketplace_posts')
          .select('*, seeker_profiles(*)')
          .eq('seeker_id', p.id)
          .maybeSingle();

        if (post) {
          const tPost = post as TalentMarketplacePost;
          setExistingPost(tPost);
          setHeadline(tPost.headline || '');
          setCategory(tPost.category || 'Teknologi & IT');
          setAvailability((tPost.availability as AvailabilityStatus) || 'fulltime');
          setExperienceYears(tPost.experience_years || 1);
          setExpectedSalary(tPost.expected_salary ? String(tPost.expected_salary) : '');
          setRateType(tPost.rate_type || 'monthly');
          setDomicileCity(tPost.domicile_city || p.domicile_city || '');
          setWhatsappNumber(tPost.whatsapp_number || p.phone || '');
          setPortfolioUrl(tPost.portfolio_url || '');
          setResumeUrl(tPost.resume_url || '');
          setBadge(tPost.badge || 'SIAP KERJA');
          setBio(tPost.bio || p.about || '');
          setIsPublished(Boolean(tPost.is_published));

          const parsedSkills: string[] = Array.isArray(tPost.skills)
            ? tPost.skills
            : typeof tPost.skills === 'string'
              ? (() => {
                  try {
                    return JSON.parse(tPost.skills);
                  } catch {
                    return [];
                  }
                })()
              : [];
          setSkillsList(parsedSkills);
        } else {
          // Defaults from Seeker Profile
          setHeadline(p.full_name ? `${p.full_name} — Penyedia Jasa Mandiri` : 'Penyedia Jasa Mandiri');
          setDomicileCity(p.domicile_city || 'Jakarta');
          setWhatsappNumber(p.phone || '');
          setBio(p.about || 'Penyedia jasa mandiri profesional, siap melayani panggilan maupun di tempat dengan hasil terbaik dan terpercaya.');
          setSkillsList(['Layanan Panggilan', 'Keahlian Teruji']);
        }

        // 3. Fetch Direct Job Offers Received
        const { data: directOffers } = await supabase
          .from('direct_job_offers')
          .select('*')
          .eq('seeker_id', p.id)
          .order('created_at', { ascending: false });

        if (directOffers) {
          setOffers(directOffers as DirectJobOffer[]);
        }
      }
    } catch (err) {
      console.error('Error loading seeker marketplace:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Auto-fill from seeker_profiles and seeker_skills
  const handleAutoFillFromProfile = async () => {
    if (!profile) return;
    setHeadline(`${profile.full_name} — Penyedia Jasa Mandiri`);
    setDomicileCity(profile.domicile_city || '');
    setWhatsappNumber(profile.phone || '');
    if (profile.about) setBio(profile.about);
    if (profile.expected_salary_min) {
      setExpectedSalary(String(profile.expected_salary_min));
    }

    try {
      const { data: sSkills } = await supabase
        .from('seeker_skills')
        .select('name')
        .eq('seeker_id', profile.id);

      if (sSkills && sSkills.length > 0) {
        const extracted = sSkills.map((s) => s.name);
        setSkillsList(Array.from(new Set([...skillsList, ...extracted])));
      }
    } catch (err) {
      console.error('Error auto-filling skills:', err);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) {
      setErrorMsg('Profil pencari kerja tidak ditemukan. Pastikan sudah mengisi profil dasar.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSavedSuccess(false);

    try {
      const postId = existingPost ? existingPost.id : `post-${Date.now()}`;
      const payload = {
        id: postId,
        seeker_id: profile.id,
        user_id: user.id,
        headline,
        bio,
        skills: skillsList,
        category,
        availability,
        experience_years: Number(experienceYears) || 0,
        expected_salary: Number(expectedSalary.replace(/\D/g, '')) || 0,
        rate_type: rateType,
        domicile_city: domicileCity,
        whatsapp_number: whatsappNumber,
        portfolio_url: portfolioUrl,
        resume_url: resumeUrl,
        badge,
        photo_url: profile.photo_url || '',
        is_published: isPublished ? 1 : 0,
        updated_at: new Date().toISOString(),
      };

      if (existingPost) {
        const { error } = await supabase
          .from('talent_marketplace_posts')
          .update(payload)
          .eq('id', existingPost.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('talent_marketplace_posts')
          .insert([{ ...payload, views_count: 0, created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      setSavedSuccess(true);
      void loadData();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan postingan marketplace';
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle Offer Response (Accept or Decline)
  const handleOfferResponse = async (offerId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('direct_job_offers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', offerId);

      if (error) throw error;

      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status } : o))
      );

      // Dispatch notification to employer
      const targetOffer = offers.find((o) => o.id === offerId);
      if (targetOffer && targetOffer.employer_id) {
        const isAccepted = status === 'accepted';
        try {
          await supabase.from('notifications').insert({
            user_id: targetOffer.employer_id,
            type: 'offer_response',
            title: isAccepted ? 'Tawaran Kerja Diterima!' : 'Tawaran Kerja Ditolak',
            message: isAccepted
              ? `Kandidat telah menerima tawaran kerja untuk posisi "${targetOffer.position_title}". Segera hubungi kandidat untuk tahap selanjutnya.`
              : `Kandidat belum dapat menerima tawaran untuk posisi "${targetOffer.position_title}".`,
            metadata: JSON.stringify({
              offer_id: offerId,
              status,
              position_title: targetOffer.position_title,
            }),
            is_read: 0,
          });
        } catch (notifErr) {
          console.warn('Gagal dispatch notifikasi respon tawaran:', notifErr);
        }
      }

      broadcastSync('notification');
      broadcastSync('application');
    } catch (err) {
      console.error('Error updating offer:', err);
    }
  };

  // Virtual Talent Post for Live Preview
  const livePreviewPost: TalentMarketplacePost = {
    id: existingPost?.id || 'preview-post',
    seeker_id: profile?.id || 'preview-seeker',
    user_id: user?.id || 'preview-user',
    headline: headline || 'Judul Penawaran Jasa & Keahlian Anda',
    bio: bio || 'Deskripsi singkat mengenai penawaran keahlian dan riwayat profesional Anda...',
    skills: skillsList,
    category,
    availability,
    experience_years: Number(experienceYears) || 1,
    expected_salary: Number(expectedSalary.replace(/\D/g, '')) || 0,
    rate_type: rateType,
    domicile_city: domicileCity || 'Kota Anda',
    whatsapp_number: whatsappNumber || '08123456789',
    portfolio_url: portfolioUrl,
    resume_url: resumeUrl,
    badge,
    photo_url: profile?.photo_url || '',
    views_count: existingPost?.views_count || 0,
    is_published: isPublished ? 1 : 0,
    created_at: existingPost?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seeker_profiles: profile || undefined,
  };

  return (
    <SeekerLayout currentPath="/seeker/marketplace">
      <div className="space-y-6">
        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Biodata &amp; Penawaran Jasa
          </button>

          <button
            onClick={() => setActiveTab('offers')}
            className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 -mb-px ${
              activeTab === 'offers'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Tawaran Kerja Masuk
            {offers.filter((o) => o.status === 'pending').length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {offers.filter((o) => o.status === 'pending').length} Baru
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Profile & Offer Setup */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <form
              onSubmit={handleSavePost}
              className="lg:col-span-7 space-y-5 rounded-2xl border border-white/10 bg-slate-900/80 p-5 sm:p-6 shadow-xl"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Pengaturan Kartu Jasa Mandiri
                  </h3>
                  <p className="text-xs text-slate-400">
                    Informasi ini akan tampil pada katalog bursa jasa &amp; penyedia jasa mandiri publik LOXER.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillFromProfile}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                >
                  ⚡ Auto-isi dari Profil Saya
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Biodata dan penawaran jasa mandiri Anda berhasil diperbarui di marketplace publik!
                </div>
              )}

              {/* Headline */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Judul Layanan / Keahlian Jasa Mandiri *
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Contoh: Service Komputer &amp; Laptop Panggilan, Bengkel Motor, Terapis Pijat Refleksi, dll"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category & Availability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Kategori Keahlian Jasa *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Servis Elektronik & Komputer">Servis Elektronik &amp; Komputer (Laptop, AC, HP)</option>
                    <option value="Bengkel & Otomotif">Bengkel &amp; Otomotif (Motor, Mobil, Tambal Ban)</option>
                    <option value="Pijat, Refleksi & Terapi Kesehatan">Pijat, Refleksi &amp; Terapi Kesehatan</option>
                    <option value="Kebersihan & Cleaning Service">Kebersihan &amp; Cleaning Service</option>
                    <option value="Pertukangan & Renovasi Bangunan">Pertukangan &amp; Renovasi Bangunan</option>
                    <option value="Salon, Barbershop & Perawatan">Salon, Barbershop &amp; Perawatan</option>
                    <option value="Pengantaran, Logistik & Angkut Barang">Pengantaran, Logistik &amp; Angkut Barang</option>
                    <option value="Les Privat & Kursus Mandiri">Les Privat &amp; Kursus Mandiri</option>
                    <option value="Fotografi & Multimedia">Fotografi &amp; Multimedia</option>
                    <option value="Desain, Percetakan & Sablon">Desain, Percetakan &amp; Sablon</option>
                    <option value="Teknologi & IT Mandiri">Teknologi &amp; IT Mandiri</option>
                    <option value="Jasa Rumah Tangga & Lainnya">Jasa Rumah Tangga &amp; Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Ketersediaan / Metode Layanan *
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as AvailabilityStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="freelance">Layanan Panggilan (On-Call / Datang ke Lokasi)</option>
                    <option value="fulltime">Di Tempat / Bengkel / Workshop Sendiri</option>
                    <option value="parttime">Fleksibel (Panggilan &amp; Di Tempat)</option>
                    <option value="remote">Borongan / Per Proyek / Per Hari</option>
                  </select>
                </div>
              </div>

              {/* Rates & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Ekspektasi Tarif Jasa / Biaya Layanan (Rp) *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono select-none">Rp</span>
                      <input
                        type="text"
                        required
                        value={expectedSalary}
                        onChange={(e) => setExpectedSalary(e.target.value)}
                        placeholder="Contoh: 150000"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <select
                      value={rateType}
                      onChange={(e) => setRateType(e.target.value as RateType)}
                      className="px-3 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-cyan-400"
                    >
                      <option value="project">/ Order / Kunjungan</option>
                      <option value="hourly">/ Jam</option>
                      <option value="monthly">/ Hari / Borongan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Pengalaman (Thn)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Domicile & WhatsApp Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Domisili Kota *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={domicileCity}
                      onChange={(e) => setDomicileCity(cleanDomicileCity(e.target.value))}
                      placeholder="Contoh: Bandung / Jakarta"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Nomor Kontak Pribadi (Disembunyikan dari Publik) *
                    </label>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Sensor Shopee-Grade Aktif
                    </span>
                  </div>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-3 text-cyan-400" />
                    <input
                      type="text"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  {whatsappNumber && (
                    <p className="mt-1 text-[10px] text-cyan-300 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>Tampilan Sensor Publik:</span>
                      <strong className="underline">{maskPhoneNumber(whatsappNumber)}</strong>
                    </p>
                  )}
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    🔒 Nomor Anda 100% aman &amp; tersembunyi dari publik. Perusahaan hanya dapat berinteraksi dan mengirimkan tawaran kerja resmi melalui Ruang Chat Otomatis di aplikasi LOXER.
                  </span>
                </div>
              </div>

              {/* Portfolio & Resume URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Link Portofolio (Opsional)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://github.com/ atau portfolio..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Link CV / Resume Online (Opsional)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="url"
                      value={resumeUrl}
                      onChange={(e) => setResumeUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Badge Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Badge Status Layanan
                </label>
                <div className="flex flex-wrap gap-2">
                  {['SIAP PANGGILAN', 'BENGKEL / TEMPAT', 'TERSEDIA', 'REKOMENDASI'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setBadge(b)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                        badge === b
                          ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md'
                          : 'border-white/10 bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Input */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Layanan &amp; Spesialisasi Khusus (Tag)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    placeholder="Ketik layanan (contoh: Pijat Refleksi, Ganti Oli, Service AC, Pasang SSD) lalu Enter"
                    className="flex-1 px-3.5 py-2 rounded-xl border border-white/10 bg-slate-800 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    Tambah
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skillsList.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 border border-white/10 text-cyan-300"
                    >
                      #{skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Bio / Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Deskripsi Lengkap Layanan Jasa Anda *
                </label>
                <textarea
                  required
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Jelaskan pengalaman kerja, jenis layanan yang dilayani (misal: jasa panggilan ke rumah/kantor, punya bengkel sendiri), area jangkauan kota, peralatan kerja yang dibawa, dan garansi kerja..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-800/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* Publishing Status Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-slate-800/40">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Status Tayang di Marketplace Publik
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Aktifkan agar profil Anda dapat dicari oleh perusahaan di seluruh Indonesia.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublished(!isPublished)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPublished ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isPublished ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <a
                  href="/talents"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 border border-white/10"
                >
                  <Eye className="w-4 h-4" />
                  Buka Katalog Publik
                </a>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 hover:from-cyan-300 hover:to-teal-200 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Menyimpan...' : 'Simpan & Publikasikan'}
                </button>
              </div>
            </form>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Preview Kartu Marketplace
                </h3>
                <span className="text-[11px] text-slate-400">Sesuai tampilan publik</span>
              </div>

              <div className="max-w-sm mx-auto">
                <TalentCard
                  talent={livePreviewPost}
                  onSelect={(t) => setSelectedPreviewTalent(t)}
                  onOfferJob={(t) => setSelectedPreviewTalent(t)}
                  featured={true}
                />
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-900/60 p-4 text-xs text-slate-400 space-y-2">
                <span className="font-semibold text-slate-300 block">💡 Tips Sukses Marketplace:</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Cantumkan nomor WhatsApp yang selalu aktif untuk respon cepat.</li>
                  <li>Gunakan foto profil yang profesional dan jelas.</li>
                  <li>Sebutkan keahlian spesifik (misal: "React.js, Next.js" bukan hanya "IT").</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Received Direct Offers */}
        {activeTab === 'offers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Tawaran Pekerjaan Langsung Masuk ({offers.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar penawaran kerja yang diajukan oleh perusahaan langsung kepada Anda melalui platform.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Memuat penawaran pekerjaan...
              </div>
            ) : offers.length === 0 ? (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-white/10 bg-slate-900/40">
                <Inbox className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-white mb-1">
                  Belum Ada Penawaran Pekerjaan Masuk
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                  Pastikan status tayang profil Anda aktif agar perusahaan dapat menemukan dan mengirimkan penawaran pekerjaan.
                </p>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30"
                >
                  Periksa Pengaturan Profil Saya
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {offers.map((offer) => {
                  return (
                    <div
                      key={offer.id}
                      className="p-5 rounded-2xl border border-white/10 bg-slate-900/80 hover:border-cyan-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {offer.position_title}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              offer.status === 'accepted'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : offer.status === 'declined'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {offer.status === 'accepted'
                              ? 'Diterima'
                              : offer.status === 'declined'
                                ? 'Ditolak'
                                : 'Menunggu Respons'}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(offer.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-white/5">
                          "{offer.message}"
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                          {offer.offered_salary > 0 && (
                            <span className="font-semibold text-emerald-400">
                              Tawaran Gaji: Rp {offer.offered_salary.toLocaleString('id-ID')}
                            </span>
                          )}
                          {offer.whatsapp_contact && (
                            <span>Kontak Pengirim: {offer.whatsapp_contact}</span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                        {offer.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleOfferResponse(offer.id, 'accepted')}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 shadow-sm transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Terima Tawaran
                            </button>
                            <button
                              onClick={() => handleOfferResponse(offer.id, 'declined')}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Tolak
                            </button>
                          </>
                        )}

                        {offer.status === 'accepted' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Tawaran Resmi Disetujui
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal for previewing full card detail */}
        <TalentDetailModal
          talent={selectedPreviewTalent}
          isOpen={Boolean(selectedPreviewTalent)}
          onClose={() => setSelectedPreviewTalent(null)}
        />
      </div>
    </SeekerLayout>
  );
}
