import { MapPin, Send, Eye, ShieldCheck, Pin, Lock, ArrowUpRight } from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';
import { getDefaultPixarAvatar } from '../../lib/avatarService';

interface TalentCardProps {
  talent: TalentMarketplacePost;
  onSelect: (talent: TalentMarketplacePost) => void;
  onOfferJob?: (talent: TalentMarketplacePost) => void;
  featured?: boolean;
}

export default function TalentCard({ talent, onSelect, onOfferJob, featured = false }: TalentCardProps) {
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
  const currentDisplayUrl = photoUrl;

  const badgeTheme =
    talent.badge === 'TOP TALENT' || talent.badge === 'REKOMENDASI'
      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20'
      : talent.badge === 'SIAP PANGGILAN' || talent.badge === 'BENGKEL / TEMPAT' || talent.badge === 'FREELANCER' || talent.badge === 'JASA'
        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20'
        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/20';

  const rateLabel =
    talent.rate_type === 'hourly'
      ? '/ jam'
      : talent.rate_type === 'project'
        ? '/ order'
        : '/ bln';

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 ${
        featured
          ? 'border-cyan-400/50 bg-white/95 dark:bg-gradient-to-b dark:from-slate-900/95 dark:via-slate-900 dark:to-slate-950 shadow-md sm:shadow-xl shadow-cyan-500/10 hover:shadow-cyan-500/20'
          : 'border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-slate-900/80 hover:border-cyan-500/50 hover:shadow-xl dark:hover:bg-slate-900 shadow-sm sm:shadow-md'
      }`}
    >
      {/* 1:1 Aspect Ratio Photo Header (Full-bleed top) */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-950">
        <img
          src={currentDisplayUrl || getDefaultPixarAvatar(fullName, undefined, talent.bio)}
          alt={fullName}
          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = getDefaultPixarAvatar(fullName, undefined, talent.bio);
          }}
        />

        {/* Scrim Overlay: Inline gradient prevents theme light/dark CSS selector collisions */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(2, 6, 23, 0.90) 0%, rgba(2, 6, 23, 0.45) 32%, rgba(2, 6, 23, 0.05) 60%, transparent 100%)',
          }}
        />

        {/* Top Badges (Hanya tampil jika ada badge khusus selain SIAP KERJA) */}
        {Boolean(talent.badge && talent.badge !== 'SIAP KERJA') && (
          <div className="absolute left-2.5 sm:left-3.5 top-2.5 sm:top-3.5 flex items-center gap-1 z-10">
            <span
              className={`rounded-md border px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm truncate max-w-[95px] sm:max-w-none ${badgeTheme}`}
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
            >
              {talent.badge}
            </span>
          </div>
        )}

        {/* Pin / Verified Icon (Tanpa tombol Foto/CV yang menutupi gambar) */}
        <div className="absolute right-2.5 sm:right-3.5 top-2.5 sm:top-3.5 flex items-center gap-1 z-20">
          {featured ? (
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-md">
              <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
          ) : (
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-slate-900/80 border border-white/20 text-slate-300 shadow-sm">
              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-cyan-400" />
            </div>
          )}
        </div>

        {/* Category Pill Over Banner */}
        <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3.5 right-2.5 sm:right-3.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
          <span
            className="talent-photo-badge talent-category-badge text-[8px] sm:text-[10px] font-bold truncate rounded-md px-2 py-0.5 border shadow-sm tracking-tight"
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.90)',
              color: '#38bdf8',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            }}
          >
            {talent.category || 'Talent'}
          </span>
          <span
            className="talent-photo-badge talent-city-badge text-[8px] sm:text-[10px] font-semibold flex items-center gap-0.5 truncate rounded-md px-2 py-0.5 border shadow-sm"
            style={{
              backgroundColor: 'rgba(2, 6, 23, 0.90)',
              color: '#ffffff',
              borderColor: 'rgba(255, 255, 255, 0.25)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
            }}
          >
            <MapPin className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
            <span className="truncate">{talent.domicile_city || 'Indonesia'}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
        <div>
          {/* Candidate Name & Title */}
          <div className="cursor-pointer" onClick={() => onSelect(talent)}>
            <h3 className="text-xs sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight sm:tracking-wide uppercase hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors line-clamp-1">
              {fullName}
            </h3>
            <p className="mt-0.5 text-[10px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 line-clamp-1 leading-snug">
              {talent.headline}
            </p>
          </div>

          {/* Protected In-App Contact Bar (Desktop only) */}
          <div className="hidden sm:block mt-2.5">
            <button
              type="button"
              onClick={() => (onOfferJob ? onOfferJob(talent) : onSelect(talent))}
              className="inline-flex w-full items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-950/40 hover:bg-cyan-900/50 hover:border-cyan-400/50 px-3 py-2 text-[11px] font-semibold text-cyan-200 transition-all active:scale-[0.98] group/btn"
              title="Kirim penawaran pekerjaan resmi di dalam aplikasi LOXER"
            >
              <div className="flex items-center gap-1.5 truncate">
                <Lock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span className="truncate text-slate-200 group-hover/btn:text-cyan-200 font-medium">
                  Kontak Terproteksi Sistem
                </span>
              </div>
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider shrink-0 bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-400/30 group-hover/btn:bg-cyan-500/30">
                Tawar di App
              </span>
            </button>
          </div>

          {/* Salary Expectations */}
          <div className="mt-1.5 sm:mt-2.5 flex items-baseline justify-between rounded-md sm:rounded-lg bg-slate-100/90 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/5 px-2 py-1 sm:px-2.5 sm:py-1.5">
            <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Gaji:</span>
            <span className={`text-[10px] sm:text-xs font-bold truncate ${talent.expected_salary > 0 ? 'text-cyan-700 dark:text-cyan-300' : 'text-amber-700 dark:text-amber-300'}`}>
              {talent.expected_salary > 0
                ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                : 'Negosiasi'}
            </span>
          </div>

          {/* Bio Snippet (Desktop only) */}
          <p className="hidden sm:block mt-2 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {talent.bio || talent.bio_summary || 'Siap berkontribusi secara profesional.'}
          </p>

          {/* Skills Chips (Desktop only) */}
          {skills.length > 0 && (
            <div className="hidden sm:flex mt-2.5 flex-wrap gap-1">
              {skills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  className="rounded bg-slate-800/90 border border-white/5 px-2 py-0.5 text-[10px] font-medium text-slate-300"
                >
                  {skill}
                </span>
              ))}
              {skills.length > 3 && (
                <span className="rounded bg-slate-800/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  +{skills.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mobile Action Button (1 column) */}
        <div className="sm:hidden pt-1.5 border-t border-white/5">
          <button
            onClick={() => onSelect(talent)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 px-2 py-1.5 text-[10px] font-bold text-slate-950 shadow-sm hover:from-cyan-400 hover:to-teal-300 active:scale-[0.98] cursor-pointer"
          >
            <span>Lihat Profil</span>
            <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden sm:flex pt-2 border-t border-white/5 items-center gap-2">
          <button
            onClick={() => onSelect(talent)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            Biodata
          </button>

          <button
            onClick={() => (onOfferJob ? onOfferJob(talent) : onSelect(talent))}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 transition-all hover:from-cyan-400 hover:to-teal-300 active:scale-[0.98]"
          >
            <Send className="h-3.5 w-3.5" />
            Tawar Kerja
          </button>
        </div>
      </div>
    </div>
  );
}
