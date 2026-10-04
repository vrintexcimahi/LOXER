import { useState, useEffect } from 'react';

export interface PresenceGroup {
  key: string;
  label: string;
  description: string;
  shortDescription?: string;
  minOnline: number;
  maxOnline: number;
  href: string;
}

export const USER_PRESENCE_GROUPS: PresenceGroup[] = [
  {
    key: 'seeker',
    label: 'Seeker',
    description: 'Pencari Kerja',
    shortDescription: 'Pencari Kerja',
    minOnline: 750,
    maxOnline: 16500,
    href: '/browse',
  },
  {
    key: 'employer',
    label: 'Employer',
    description: 'Perusahaan',
    shortDescription: 'Perusahaan',
    minOnline: 250,
    maxOnline: 3500,
    href: '/talents?availability=fulltime',
  },
  {
    key: 'freelancer',
    label: 'Jasa',
    description: 'Penyedia Jasa Mandiri',
    shortDescription: 'Jasa Mandiri',
    minOnline: 150,
    maxOnline: 1750,
    href: '/talents?availability=freelance',
  },
];

function formatOnlineCount(value: number) {
  return value.toLocaleString('id-ID');
}

function getRandomOnlineUsers(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampValue(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStepSize(current: number, min: number, max: number) {
  const range = max - min;
  const progress = range === 0 ? 0 : (current - min) / range;

  if (progress < 0.2) return Math.max(6, Math.round(range * 0.018));
  if (progress < 0.5) return Math.max(8, Math.round(range * 0.014));
  if (progress < 0.8) return Math.max(6, Math.round(range * 0.01));
  return Math.max(4, Math.round(range * 0.006));
}

function getNextOnlineUsers(current: number, min: number, max: number) {
  const range = max - min;
  const upwardBias = current < min + range * 0.72;
  const direction = upwardBias
    ? (Math.random() < 0.82 ? 1 : -1)
    : (Math.random() < 0.64 ? -1 : 1);
  const baseStep = getStepSize(current, min, max);
  const variance = Math.max(6, Math.round(baseStep * 0.35));
  const delta = baseStep + Math.floor(Math.random() * variance);

  return clampValue(current + (direction * delta), min, max);
}

export interface UserOnlinePresenceProps {
  className?: string;
}

export default function UserOnlinePresence({ className = '' }: UserOnlinePresenceProps) {
  const [onlineUsersByGroup, setOnlineUsersByGroup] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      USER_PRESENCE_GROUPS.map((group) => [
        group.key,
        getRandomOnlineUsers(group.minOnline, group.maxOnline),
      ]),
    ),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOnlineUsersByGroup((current) =>
        Object.fromEntries(
          USER_PRESENCE_GROUPS.map((group) => [
            group.key,
            getNextOnlineUsers(
              current[group.key] ?? group.minOnline,
              group.minOnline,
              group.maxOnline,
            ),
          ]),
        ),
      );
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, []);

  const userPresence = USER_PRESENCE_GROUPS.map((group) => ({
    ...group,
    online: formatOnlineCount(onlineUsersByGroup[group.key] ?? group.minOnline),
  }));

  return (
    <div
      className={`w-full grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4 ${className}`}
      role="region"
      aria-label="Statistik Pengguna Online Real-time"
    >
      {userPresence.map((group) => (
        <a
          key={group.key}
          href={group.href}
          className="animate-status-pill group relative flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-cyan-400/25 bg-slate-900/85 hover:bg-slate-900/95 hover:border-cyan-400/50 p-2 sm:px-4 sm:py-2.5 text-slate-100 shadow-lg shadow-cyan-950/40 backdrop-blur-md transition-all duration-200 min-w-0 w-full overflow-hidden active:scale-[0.98]"
          title={`${group.label} (${group.description}) - ${group.online} online. Klik untuk membuka.`}
        >
          {/* Subtle gradient hover highlight */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Glowing emerald ping dot */}
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
          </span>

          {/* Text Information */}
          <div className="leading-tight text-left min-w-0 flex-1">
            <p className="font-bold text-white text-[11px] sm:text-xs md:text-sm truncate">
              {group.label}
              <span className="hidden sm:inline lg:hidden text-slate-300 font-normal text-[10px] sm:text-xs ml-1">
                ({group.shortDescription || group.description})
              </span>
              <span className="hidden lg:inline text-slate-300 font-normal text-[10px] sm:text-xs ml-1">
                ({group.description})
              </span>
            </p>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs mt-0.5">
              <span className="font-bold text-cyan-300 group-hover:text-cyan-100 transition-colors">
                {group.online}
              </span>
              <span className="text-slate-400 text-[9px] sm:text-[11px]">online</span>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
