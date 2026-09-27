import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import type { Notification as AppNotification } from '../lib/types';
import { useRealtimeSync } from './useRealtimeSync';

export default function useNotifications(limit = 10) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isInitialRef = useRef(true);

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return window.Notification.permission;
    }
    return 'default';
  });

  const requestPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await window.Notification.requestPermission();
        setPermission(res);
        return res;
      } catch {
        return 'denied' as NotificationPermission;
      }
    }
    return 'denied' as NotificationPermission;
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async (isSilent = false) => {
    if (!supabase || !user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (!isSilent) {
      setLoading(true);
    }
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      const items = (data || []) as AppNotification[];

      // Check for incoming new unread notifications if already initialized
      if (!isInitialRef.current) {
        const newUnread = items.filter((item) => !item.is_read && !knownIdsRef.current.has(item.id));
        if (newUnread.length > 0 && typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
          const latest = newUnread[0];
          try {
            const systemNotif = new window.Notification(latest.title || 'Notifikasi Baru LOXER', {
              body: latest.message,
              icon: '/branding/icon192.png',
              badge: '/branding/icon32.png',
              tag: latest.id,
            });
            systemNotif.onclick = () => {
              window.focus();
              const targetUrl = (latest.metadata?.link as string) || (latest.metadata?.url as string);
              if (targetUrl) {
                window.location.href = targetUrl;
              }
            };
          } catch {
            // ignore if notification display is blocked by browser policy
          }
        }
      }

      // Track known IDs
      items.forEach((item) => knownIdsRef.current.add(item.id));
      isInitialRef.current = false;

      setNotifications(items);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [limit, user]);

  const markAllRead = useCallback(async () => {
    if (!supabase || !user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }, [user]);

  useEffect(() => {
    fetchNotifications(false);
  }, [fetchNotifications]);

  useRealtimeSync(fetchNotifications, { enabled: Boolean(user), intervalMs: 15000, filterType: 'notification' });

  useEffect(() => {
    if (!supabase || !user) return;
    const db = supabase;

    const channel = db
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications(true);
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
  }, [fetchNotifications, user]);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAllRead,
    permission,
    requestPermission,
  };
}
