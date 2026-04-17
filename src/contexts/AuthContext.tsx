import { useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserMeta, UserRole } from '../lib/types';
import { DEFAULT_ADMIN_EMAIL } from '../lib/constants';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUserMeta(authUser: Pick<User, 'id' | 'email'>) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('users_meta')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (error) {
      console.error('[AuthContext] Gagal memuat users_meta:', error);
      setUserMeta(null);
      return;
    }

    const isDefaultAdmin = authUser.email?.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL;
    let nextMeta = data as UserMeta | null;

    if (isDefaultAdmin && (!nextMeta || nextMeta.role !== 'admin')) {
      const payload = {
        id: authUser.id,
        email: authUser.email || DEFAULT_ADMIN_EMAIL,
        role: 'admin' as const,
      };

      const { data: repairedMeta, error: repairError } = nextMeta
        ? await supabase.from('users_meta').update(payload).eq('id', authUser.id).select('*').maybeSingle()
        : await supabase.from('users_meta').insert(payload).select('*').maybeSingle();

      if (repairError) {
        // Try server-side repair through local admin proxy (uses service role key when available).
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (token) {
            const res = await fetch('/api/admin/ensure-default-admin', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const payload = (await res.json()) as { meta?: UserMeta };
              if (payload.meta) {
                nextMeta = payload.meta;
              }
            }
          }
        } catch (proxyError) {
          console.warn('[AuthContext] Proxy ensure default admin gagal:', proxyError);
        }

        if (!nextMeta || nextMeta.role !== 'admin') {
          // Final fallback for routing guard: keep default admin account on admin workspace.
          // DB can still be repaired later by service-role endpoint.
          nextMeta = {
            id: authUser.id,
            email: authUser.email || DEFAULT_ADMIN_EMAIL,
            role: 'admin',
            created_at: nextMeta?.created_at || new Date().toISOString(),
            is_banned: Boolean(nextMeta?.is_banned),
          };
        }

        console.warn('[AuthContext] Auto repair default admin gagal, fallback ke role admin lokal:', repairError.message);
      } else if (repairedMeta) {
        nextMeta = repairedMeta as UserMeta;
      }
    }

    setUserMeta(nextMeta);
  }

  async function refreshMeta() {
    if (user) await fetchUserMeta(user);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserMeta(session.user).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await fetchUserMeta(session.user);
        })();
      } else {
        setUserMeta(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user?.id) return;

    const channel = supabase
      .channel(`auth-meta-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_meta', filter: `id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setUserMeta(null);
          return;
        }

        const next = payload.new as UserMeta | null;
        if (next) {
          setUserMeta(next);
          return;
        }

        // Fallback safety in case payload doesn't include row data.
        if (user) fetchUserMeta(user);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  async function signUp(email: string, password: string, role: UserRole, fullName: string) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    if (data.user) {
      const { error: metaError } = await supabase.from('users_meta').insert({
        id: data.user.id,
        email,
        role,
      });
      if (metaError) return { error: metaError };

      if (role === 'seeker') {
        await supabase.from('seeker_profiles').insert({
          user_id: data.user.id,
          full_name: fullName,
        });
      }
    }
    return { error: null };
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  }

  async function signOut() {
    if (!supabase) return;
    setSession(null);
    setUser(null);
    setUserMeta(null);
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, session, userMeta, loading, configured: isSupabaseConfigured, signUp, signIn, signOut, refreshMeta }}
    >
      {children}
    </AuthContext.Provider>
  );
}
