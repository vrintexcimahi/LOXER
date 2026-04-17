import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';

interface NotificationBellProps {
  variant?: 'light' | 'dark';
  compact?: boolean;
}

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function NotificationBell({
  variant = 'light',
  compact = false,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { notifications, loading, unreadCount, markAllRead } = useNotifications();

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const shellClass =
    variant === 'dark'
      ? 'bg-slate-900 border border-white/10 shadow-2xl shadow-slate-950/50'
      : 'bg-white border border-sky-100 shadow-2xl';
  const headerClass =
    variant === 'dark'
      ? 'border-b border-white/10 bg-slate-800/80'
      : 'gradient-subtle border-b border-sky-100';
  const titleClass = variant === 'dark' ? 'text-slate-100' : 'text-slate-800';
  const bodyTextClass = variant === 'dark' ? 'text-slate-300' : 'text-slate-500';
  const emptyClass = variant === 'dark' ? 'text-slate-500' : 'text-slate-400';
  const buttonClass =
    variant === 'dark'
      ? 'border border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
      : 'text-slate-400 hover:text-slate-700';
  const itemHoverClass = variant === 'dark' ? 'hover:bg-white/5 border-white/5' : 'hover:bg-sky-50 border-sky-50';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={`relative rounded-lg p-2 transition-colors ${buttonClass}`}
        aria-label="Buka notifikasi"
        title="Notifikasi"
      >
        <Bell className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl ${shellClass} ${
            compact ? 'sm:w-80' : ''
          }`}
        >
          <div className={`flex items-center justify-between px-4 py-3 ${headerClass}`}>
            <h3 className={`text-sm font-bold ${titleClass}`}>Notifikasi</h3>
            {unreadCount > 0 ? (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
              >
                Tandai semua dibaca
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="space-y-2 p-4">
                <div className="h-14 animate-pulse rounded-xl bg-slate-200/20" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-200/20" />
                <div className="h-14 animate-pulse rounded-xl bg-slate-200/20" />
              </div>
            ) : notifications.length === 0 ? (
              <div className={`py-8 text-center text-sm ${emptyClass}`}>Belum ada notifikasi</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b px-4 py-3 transition-colors ${itemHoverClass} ${
                    !notification.is_read ? 'border-l-2 border-l-cyan-400' : ''
                  }`}
                >
                  <p className={`text-sm font-medium ${titleClass}`}>{notification.title}</p>
                  <p className={`mt-0.5 text-xs ${bodyTextClass}`}>{notification.message}</p>
                  <p className={`mt-1 text-[10px] ${emptyClass}`}>{formatNotificationTime(notification.created_at)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
