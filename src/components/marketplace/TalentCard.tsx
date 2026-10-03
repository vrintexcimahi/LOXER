import { useState } from 'react';
import { MapPin, Send, Eye, ShieldCheck, Pin, Lock, FileText } from 'lucide-react';
import { TalentMarketplacePost } from '../../lib/types';

interface TalentCardProps {
  talent: TalentMarketplacePost;
  onSelect: (talent: TalentMarketplacePost) => void;
  onOfferJob?: (talent: TalentMarketplacePost) => void;
  featured?: boolean;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  fulltime: 'Di Tempat / Bengkel',
  freelance: 'Layanan Panggilan',
  parttime: 'Fleksibel',
  remote: 'Borongan / Panggilan',
};

export default function TalentCard({ talent, onSelect, onOfferJob, featured = false }: TalentCardProps) {
  const [activeMedia, setActiveMedia] = useState<'photo' | 'cv'>('photo');

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
  const currentDisplayUrl = (activeMedia === 'cv' && talent.portfolio_url) ? talent.portfolio_url : photoUrl;

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
          ? 'border-cyan-400/50 bg-gradient-to-b from-slate-900/95 via-slate-900 to-slate-950 shadow-md sm:shadow-xl shadow-cyan-500/10 hover:shadow-cyan-500/20'
          : 'border-white/10 bg-slate-900/80 hover:border-cyan-500/40 hover:bg-slate-900 shadow-md sm:shadow-lg shadow-black/40'
      }`}
    >
      {/* 1:1 Aspect Ratio Photo Header (Ratio 1:1) */}
      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-cyan-950/40 p-1.5 sm:p-3">
        {currentDisplayUrl ? (
          <img
            src={currentDisplayUrl}
            alt={fullName}
            className={`h-full w-full rounded-lg sm:rounded-2xl opacity-90 transition-transform duration-500 group-hover:scale-105 ${
              activeMedia === 'cv' ? 'object-contain bg-slate-950/90' : 'object-cover object-center'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg sm:rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-indigo-600/30 text-cyan-300 font-extrabold text-2xl sm:text-5xl">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent pointer-events-none rounded-lg sm:rounded-2xl m-1.5 sm:m-3" />

        {/* Top Badges */}
        <div className="absolute left-2.5 sm:left-5 top-2.5 sm:top-5 flex items-center gap-1 z-10">
          <span className={`rounded border px-1 sm:px-2 py-0.2 sm:py-0.5 text-[7px] sm:text-[9px] font-black uppercase tracking-wider shadow-sm backdrop-blur-md truncate max-w-[65px] sm:max-w-none ${badgeTheme}`}>
            {talent.badge || 'SIAP KERJA'}
          </span>
          {Boolean(talent.availability) && (
            <span className="hidden sm:flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {AVAILABILITY_LABELS[talent.availability] || talent.availability}
            </span>
          )}
        </div>

        {/* Pin / Verified Icon & Media Switcher */}
        <div className="absolute right-2.5 sm:right-5 top-2.5 sm:top-5 flex items-center gap-1 z-20">
          {Boolean(talent.portfolio_url) && (
            <div className="flex items-center bg-black/80 backdrop-blur-md rounded-lg p-0.5 border border-white/20 shadow-sm mr-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMedia('photo');
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold transition-all cursor-pointer ${
                  activeMedia === 'photo'
                    ? 'bg-cyan-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Tampilkan Pas Foto"
              >
                Foto
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMedia('cv');
                }}
                className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold transition-all cursor-pointer ${
                  activeMedia === 'cv'
                    ? 'bg-cyan-400 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Tampilkan Berkas CV (Diblur)"
              >
                CV
              </button>
            </div>
          )}
          {featured ? (
            <div className="flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 shadow-md">
              <Pin className="h-2 w-2 sm:h-3 sm:w-3" />
            </div>
          ) : (
            <div className="flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-slate-900/60 border border-white/20 text-slate-300">
              <ShieldCheck className="h-2 w-2 sm:h-3 sm:w-3 text-cyan-400" />
            </div>
          )}
        </div>

        {/* Category Pill Over Banner */}
        <div className="absolute bottom-2 sm:bottom-4 left-2.5 sm:left-5 right-2.5 sm:right-5 flex items-center justify-between gap-1 z-10">
          <span className="text-[7px] sm:text-[10px] font-semibold text-cyan-200/90 drop-shadow truncate">
            {talent.category || 'Talent'}
          </span>
          <span className="text-[7px] sm:text-[10px] font-mono text-slate-300 drop-shadow flex items-center gap-0.5 truncate">
            <MapPin className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-cyan-400 shrink-0" />
            <span className="truncate">{talent.domicile_city || 'Indonesia'}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-3">
        <div>
          {/* Candidate Name & Title */}
          <div className="cursor-pointer" onClick={() => onSelect(talent)}>
            <h3 className="text-[10px] sm:text-base font-extrabold text-white tracking-tight sm:tracking-wide uppercase hover:text-cyan-400 transition-colors line-clamp-1">
              {fullName}
            </h3>
            <p className="mt-0.5 text-[8px] sm:text-xs font-medium text-slate-300 line-clamp-1 leading-snug">
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

          {/* Salary / Rate Expectations */}
          <div className="mt-1 sm:mt-2.5 flex flex-col sm:flex-row sm:items-baseline sm:justify-between rounded-md sm:rounded-lg bg-slate-950/60 border border-white/5 px-1.5 py-0.5 sm:px-2.5 sm:py-1.5">
            <span className="text-[7px] sm:text-[10px] text-slate-400">Tarif:</span>
            <span className="text-[8px] sm:text-xs font-bold text-cyan-300 truncate">
              {talent.expected_salary > 0
                ? `Rp ${talent.expected_salary.toLocaleString('id-ID')} ${rateLabel}`
                : '-'}
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
        <div className="sm:hidden pt-1 border-t border-white/5">
          <button
            onClick={() => onSelect(talent)}
            className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 px-1.5 py-1 text-[9px] font-bold text-slate-950 shadow-sm hover:from-cyan-400 hover:to-teal-300 active:scale-[0.98] cursor-pointer"
          >
            <span>Lihat</span>
            <Eye className="h-2.5 w-2.5" />
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
