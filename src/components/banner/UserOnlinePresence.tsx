import { useState, useEffect } from 'react';

export interface PresenceGroup {
  key: string;
  label: string;
  description: string;
  minOnline: number;
  maxOnline: number;
}

export const USER_PRESENCE_GROUPS: PresenceGroup[] = [
  {
    key: 'seeker',
    label: 'Seeker',
    description: 'Pencari Kerja',
    minOnline: 750,
    maxOnline: 16500,
  },
  {
    key: 'employer',
    label: 'Employer',
    description: 'Perusahaan',
    minOnline: 250,
    maxOnline: 3500,
  },
  {
    key: 'freelancer',
    label: 'Jasa',
    description: 'Penyedia Jasa Mandiri',
    minOnline: 150,
    maxOnline: 1750,
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
    <div className={`flex flex-wrap items-center justify-center gap-2 sm:gap-3 ${className}`}>
      {userPresence.map((group) => (
        <div
          key={group.key}
          className="animate-status-pill flex items-center gap-2.5 rounded-2xl border border-cyan-400/25 bg-slate-900/80 hover:bg-slate-900/95 hover:border-cyan-400/50 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs text-slate-100 shadow-lg shadow-cyan-950/40 backdrop-blur-md transition-all duration-200"
        >
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.7)] flex-shrink-0">
            <span className="absolute inset-0 rounded-full bg-emerald-300/70 animate-ping" />
          </span>
          <div className="leading-tight text-left">
            <p className="font-semibold text-white text-xs sm:text-[13px]">
              {group.label} <span className="text-slate-300 font-medium text-[11px]">({group.description})</span>
            </p>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-cyan-200 font-medium mt-0.5">
              <span className="text-cyan-100 font-bold">{group.online}</span>
              <span>online</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
