import React, { useState } from 'react';
import {
  X,
  Briefcase,
  ExternalLink,
  ShieldCheck,
  Send,
  CheckCircle,
  FileText,
  Building,
  Sparkles,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';
import { supabase } from '../../lib/supabase';
import { broadcastSync } from '../../lib/realtimeSync';
import { maskPhoneNumber } from '../../lib/contactPrivacyService';
import ProtectedTalentChatModal from './ProtectedTalentChatModal';

const AVAILABILITY_LABELS: Record<string, string> = {
  fulltime: 'Purna Waktu',
  freelance: 'Lepas / Proyek',
  parttime: 'Paruh Waktu',
  remote: 'Jarak Jauh (Remote)',
};

interface TalentDetailModalProps {
  talent: TalentMarketplacePost | null;
  isOpen: boolean;
  onClose: () => void;
  onOfferSuccess?: () => void;
}

export default function TalentDetailModal({
  talent,
  isOpen,
  onClose,
  onOfferSuccess,
}: TalentDetailModalProps) {
  const { user, userMeta } = useAuth();
  const { requireApp } = useAppAccess();
  const [showChatRoom, setShowChatRoom] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [positionTitle, setPositionTitle] = useState('');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [message, setMessage] = useState('');
  const [whatsappContact, setWhatsappContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !talent) return null;

  const skills: string[] = Array.isArray(talent.skills)
    ? talent.skills
    : typeof talent.skills === 'string'
      ? (() => {
          try {
            return JSON.parse(talent.skills);
          } catch {
            return [];
          }
        })()
      : [];

  const fullName = talent.seeker_profiles?.full_name || talent.headline.split(' ')[0] || 'Kandidat';
  const photoUrl = talent.photo_url || talent.seeker_profiles?.photo_url;

  const rateLabel =
    talent.rate_type === 'hourly'
      ? '/ jam'
      : talent.rate_type === 'project'
        ? '/ proyek'
        : '/ bln';

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!positionTitle || !message) {
      setErrorMsg('Mohon lengkapi judul posisi dan pesan penawaran.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      let companyId = userMeta?.company_id;
      if (!companyId && user?.id) {
        const { data: comp } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (comp) companyId = comp.id;
      }
      if (!companyId && user?.id) {
        const { data: newComp } = await supabase.from('companies').insert({
          user_id: user.id,
          name: user.email?.split('@')[0] || 'Perusahaan',
        }).select('id').maybeSingle();
        if (newComp) companyId = newComp.id;
      }

      if (!companyId) {
        throw new Error('Profil perusahaan tidak ditemukan. Pastikan Anda masuk sebagai perusahaan.');
      }

      const offerId = `offer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        id: offerId,
        post_id: talent.id,
        seeker_id: talent.seeker_id,
        employer_id: user?.id || 'guest-employer',
        company_id: companyId,
        position_title: positionTitle,
        offered_salary: parseInt(offeredSalary.replace(/\D/g, ''), 10) || talent.expected_salary || 0,
        message,
        whatsapp_contact: whatsappContact || user?.email || '',
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('direct_job_offers').insert([payload]);

      if (error) {
        throw error;
      }

      // Dispatch in-app notification to talent
      try {
        const talentUserId = talent.user_id || talent.seeker_profiles?.user_id;
        if (talentUserId) {
          await supabase.from('notifications').insert({
            user_id: talentUserId,
            type: 'direct_offer',
            title: 'Penawaran Kerja Baru!',
            message: `Perusahaan mengirim penawaran kerja untuk posisi "${positionTitle}" dengan estimasi Rp ${(payload.offered_salary || 0).toLocaleString('id-ID')}.`,
            metadata: JSON.stringify({
              offer_id: offerId,
              post_id: talent.id,
              position_title: positionTitle,
              company_id: companyId,
            }),
            is_read: 0,
          });
        }
      } catch (notifErr) {
        console.warn('Gagal dispatch notifikasi penawaran kerja:', notifErr);
      }

      broadcastSync('notification');
      broadcastSync('application');

      setOfferSuccess(true);
      setShowOfferForm(false);
      if (onOfferSuccess) onOfferSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim penawaran kerja';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl my-0 sm:my-8 max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 bg-slate-900 shadow-2xl text-slate-100 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 bg-slate-900">
          <div className="w-12 h-1 bg-slate-600/70 rounded-full" />
        </div>
        {/* Header Background Gradient */}
        <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-black/40 backdrop-blur-md text-cyan-300 border border-cyan-400/30">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {talent.badge || 'SIAP KERJA'}
            </span>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Identity Bar (1:1 Ratio Avatar) */}
          <div className="flex items-end gap-4 z-10 translate-y-8">
            <div className="relative aspect-square h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-2xl overflow-hidden border-4 border-slate-900 shadow-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-3xl font-black text-white">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="h-full w-full object-cover object-center aspect-square"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                fullName.slice(0, 2).toUpperCase()
              )}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight drop-shadow-md">
                  {fullName}
                </h3>
                <span title="Terverifikasi LOXER">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200 font-medium">
                {talent.headline}
              </p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="pt-12 px-6 pb-6 space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                Ekspektasi Tarif
              </span>
              <span className="text-base sm:text-lg font-bold text-emerald-400 block mt-0.5">
                {talent.expected_salary > 0 ? `Rp ${talent.expected_salary.toLocaleString('id-ID')}` : '-'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">
                {talent.expected_salary > 0 ? rateLabel : 'Tidak dicantumkan'}
              </span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                Ketersediaan
              </span>
              <span className="text-sm sm:text-base font-bold text-cyan-300 block mt-0.5">
                {AVAILABILITY_LABELS[talent.availability] || talent.availability}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Tipe Pekerjaan</span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                Pengalaman
              </span>
              <span className="text-base sm:text-lg font-bold text-white block mt-0.5">
                {talent.experience_years} Tahun
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{talent.category}</span>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-800/60 p-3">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                Domisili
              </span>
              <span className="text-sm sm:text-base font-bold text-white block mt-0.5 truncate">
                {talent.domicile_city || 'Indonesia'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Lokasi Kerja</span>
            </div>
          </div>

          {/* Protected In-App Transaction Banner & Offer CTA */}
          <div className="space-y-3">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/30 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-cyan-300 block mb-0.5">
                  Sistem Rekrutmen Terproteksi &amp; Sensor Privasi Ketat (Shopee Standard)
                </span>
                Nomor kontak ({maskPhoneNumber(talent.whatsapp_number)}), email, dan akun sosmed disensor ketat untuk privasi pelamar. Seluruh penawaran kerja, kesepakatan honor, dan verifikasi dilakukan full melalui Ruang Chat Otomatis di aplikasi LOXER.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!requireApp('Membuka Ruang Chat')) return;
                  setShowChatRoom(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-teal-200 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Buka Ruang Chat Otomatis</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!requireApp('Menawarkan Pekerjaan')) return;
                  setShowOfferForm(!showOfferForm);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white bg-slate-800 hover:bg-slate-700 border border-white/10 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 text-cyan-400" />
                <span>{showOfferForm ? 'Tutup Formulir' : 'Form Penawaran Kerja'}</span>
              </button>
            </div>
          </div>

          {/* Success Alert */}
          {offerSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>
                Penawaran pekerjaan resmi berhasil dikirimkan ke <strong>{fullName}</strong>. Kandidat akan menerima notifikasi dan dapat merespons tawaran Anda.
              </span>
            </div>
          )}

          {/* Direct Offer Form (Expandable) */}
          {showOfferForm && (
            <form
              onSubmit={handleSendOffer}
              className="p-5 rounded-2xl border border-indigo-500/30 bg-slate-800/80 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Building className="w-4 h-4" />
                  Formulir Penawaran Pekerjaan Langsung
                </div>
                <span className="text-xs text-slate-400">
                  Kandidat: <span className="text-white font-medium">{fullName}</span>
                </span>
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Posisi / Judul Pekerjaan *
                  </label>
                  <input
                    type="text"
                    required
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    placeholder="Contoh: Senior Fullstack Engineer"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Penawaran Gaji / Budget (Rp)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400 font-mono select-none">Rp</span>
                    <input
                      type="text"
                      value={offeredSalary}
                      onChange={(e) => setOfferedSalary(e.target.value)}
                      placeholder={talent.expected_salary ? `Contoh: ${talent.expected_salary.toLocaleString('id-ID')}` : 'Nominal gaji'}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Email / Kontak Resmi Perusahaan Anda *
                </label>
                <input
                  type="text"
                  required
                  value={whatsappContact}
                  onChange={(e) => setWhatsappContact(e.target.value)}
                  placeholder="hr@perusahaan.com atau ID Perusahaan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  🔒 Kontak hanya dibagikan secara resmi jika kandidat menerima tawaran kerja.
                </span>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-medium block mb-1.5">
                  Pesan & Deskripsi Singkat Penawaran *
                </label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Jelaskan kebutuhan proyek, benefit, atau undangan wawancara langsung..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOfferForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Penawaran'}
                </button>
              </div>
            </form>
          )}

          {/* Description & Bio */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Tentang & Penawaran Keahlian
            </h4>
            <div className="rounded-xl border border-white/5 bg-slate-800/40 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-line">
              {talent.bio || 'Tidak ada deskripsi tambahan.'}
            </div>
          </div>

          {/* Skills Badges */}
          {skills.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Keahlian & Spesialisasi
              </h4>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-800 border border-white/10 text-cyan-300"
                  >
                    #{skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Berkas CV Lengkap (Gambar Ke-2) Terproteksi */}
          {Boolean(talent.portfolio_url) && (
            <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Gambar Ke-2: Berkas CV Lengkap
                    </h4>
                    <p className="text-[11px] text-cyan-300/80">
                      Seluruh informasi kontak telah disensor demi privasi & perekrutan resmi via aplikasi
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                  🔒 Kontak Diblur Otomatis
                </span>
              </div>

              {(talent.portfolio_url && (talent.portfolio_url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(talent.portfolio_url))) ? (
                <div className="relative flex justify-center rounded-xl bg-slate-900/90 border border-white/10 p-2 sm:p-4 overflow-hidden">
                  <img
                    src={talent.portfolio_url}
                    alt="Berkas CV Lengkap Kandidat (Kontak Terproteksi)"
                    className="max-h-[600px] w-auto rounded-lg shadow-xl object-contain border border-white/5 cursor-zoom-in hover:brightness-105 transition-all"
                    onClick={() => window.open(talent.portfolio_url, '_blank')}
                    title="Klik untuk membuka dokumen ukuran penuh"
                  />
                </div>
              ) : (
                <a
                  href={talent.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 transition-colors text-xs font-medium text-cyan-300"
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-cyan-400" />
                    Buka Berkas Portofolio CV Lengkap
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              )}
            </div>
          )}

          {/* External Links: Portfolio & Resume */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {talent.portfolio_url && !talent.portfolio_url.startsWith('data:image') && !/\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(talent.portfolio_url) ? (
              <a
                href={talent.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 transition-colors text-xs font-medium text-cyan-300"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-cyan-400" />
                  Lihat Portofolio Online
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/20 text-xs text-slate-500">
                <Briefcase className="w-4 h-4" />
                Portofolio online via dokumen CV
              </div>
            )}

            {talent.resume_url ? (
              <a
                href={talent.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-slate-800/60 hover:bg-slate-800 transition-colors text-xs font-medium text-emerald-300"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Unduh CV / Resume Lengkap
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-white/5 bg-slate-800/20 text-xs text-slate-500">
                <FileText className="w-4 h-4" />
                Resume via profil platform
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="border-t border-white/5 bg-slate-950/60 px-6 py-3.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>ID Talent: #{talent.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <span>Dipublikasikan di Marketplace LOXER Indonesia</span>
        </div>

        {/* Ruang Chat Otomatis Resmi Terproteksi */}
        <ProtectedTalentChatModal
          talent={talent}
          isOpen={showChatRoom}
          onClose={() => setShowChatRoom(false)}
        />
      </div>
    </div>
  );
}
