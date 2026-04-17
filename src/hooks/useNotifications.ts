import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import { Notification } from '../lib/types';

export default function useNotifications(limit = 10) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    setNotifications((data || []) as Notification[]);
    setLoading(false);
  }, [limit, user]);

  const markAllRead = useCallback(async () => {
    if (!supabase || !user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
          fetchNotifications();
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
  };
}
