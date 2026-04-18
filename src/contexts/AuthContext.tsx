import { useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { UserMeta, UserRole } from '../lib/types';
import { DEFAULT_ADMIN_EMAIL, isDefaultAdminEmail } from '../lib/constants';
import { AuthContext } from './auth-context';

const OAUTH_SIGNUP_STORAGE_KEY = 'loxer-oauth-signup-intent';

interface OAuthSignupIntent {
  role: UserRole;
  fullName: string;
  phone: string;
  mode: 'login' | 'register';
  createdAt: number;
}

function readOAuthSignupIntent() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(OAUTH_SIGNUP_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<OAuthSignupIntent>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.createdAt !== 'number') return null;

    const maxAgeMs = 30 * 60 * 1000;
    if (Date.now() - parsed.createdAt > maxAgeMs) {
      window.localStorage.removeItem(OAUTH_SIGNUP_STORAGE_KEY);
      return null;
    }

    return {
      role: parsed.role === 'employer' ? 'employer' : 'seeker',
      fullName: String(parsed.fullName || ''),
      phone: String(parsed.phone || ''),
      mode: parsed.mode === 'register' ? 'register' : 'login',
      createdAt: parsed.createdAt,
    } satisfies OAuthSignupIntent;
  } catch {
    return null;
  }
}

function writeOAuthSignupIntent(intent: OAuthSignupIntent) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(OAUTH_SIGNUP_STORAGE_KEY, JSON.stringify(intent));
}

function clearOAuthSignupIntent() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(OAUTH_SIGNUP_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);

  async function ensureOAuthProvisioning(authUser: User, currentMeta: UserMeta | null) {
    if (!supabase) return currentMeta;

    const pendingIntent = readOAuthSignupIntent();
    if (!pendingIntent && currentMeta) return currentMeta;

    let nextMeta = currentMeta;
    const desiredRole = pendingIntent?.role || currentMeta?.role || 'seeker';
    const derivedFullName =
      pendingIntent?.fullName.trim() ||
      String(authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Pengguna LOXER');
    const derivedPhone = pendingIntent?.phone.trim() || String(authUser.user_metadata?.phone || '');

    if (!nextMeta) {
      const { data: createdMeta, error: metaError } = await supabase
        .from('users_meta')
        .insert({
          id: authUser.id,
          email: authUser.email || '',
          role: desiredRole,
        })
        .select('*')
        .maybeSingle();

      if (metaError) {
        console.warn('[AuthContext] Gagal membuat users_meta untuk OAuth:', metaError.message);
      } else if (createdMeta) {
        nextMeta = createdMeta as UserMeta;
      }
    }

    if (desiredRole === 'seeker') {
      const { data: existingProfile, error: profileError } = await supabase
        .from('seeker_profiles')
        .select('id, full_name, phone')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.warn('[AuthContext] Gagal memeriksa seeker_profiles OAuth:', profileError.message);
      } else if (!existingProfile) {
        const { error: insertProfileError } = await supabase.from('seeker_profiles').insert({
          user_id: authUser.id,
          full_name: derivedFullName,
          phone: derivedPhone,
        });

        if (insertProfileError) {
          console.warn('[AuthContext] Gagal membuat seeker_profiles untuk OAuth:', insertProfileError.message);
        }
      }
    }

    if (nextMeta) clearOAuthSignupIntent();
    return nextMeta;
  }

  async function fetchUserMeta(authUser: User) {
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

    const isDefaultAdmin = isDefaultAdminEmail(authUser.email);
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

    if (!isDefaultAdmin) {
      nextMeta = await ensureOAuthProvisioning(authUser, nextMeta);
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

  async function signUp(email: string, password: string, role: UserRole, fullName: string, phone: string) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedFullName = fullName.trim();
    const normalizedPhone = phone.trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedFullName,
          phone: normalizedPhone,
          role,
        },
      },
    });
    if (error) return { error };
    if (data.user) {
      const { error: metaError } = await supabase.from('users_meta').insert({
        id: data.user.id,
        email: normalizedEmail,
        role,
      });
      if (metaError) return { error: metaError };

      if (role === 'seeker') {
        await supabase.from('seeker_profiles').insert({
          user_id: data.user.id,
          full_name: normalizedFullName,
          phone: normalizedPhone,
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

  async function signInWithGoogle(options?: { role?: UserRole; fullName?: string; phone?: string; mode?: 'login' | 'register' }) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };

    const intent: OAuthSignupIntent = {
      role: options?.role === 'employer' ? 'employer' : 'seeker',
      fullName: (options?.fullName || '').trim(),
      phone: (options?.phone || '').trim(),
      mode: options?.mode === 'register' ? 'register' : 'login',
      createdAt: Date.now(),
    };
    writeOAuthSignupIntent(intent);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      clearOAuthSignupIntent();
      return { error: error as Error | null };
    }

    return { error: null };
  }

  async function requestOtp(params: { channel: 'email' | 'sms'; email?: string; phone?: string }) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };

    if (params.channel === 'sms') {
      const phone = (params.phone || '').trim();
      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: false,
          channel: 'sms',
        },
      });
      return { error: error as Error | null };
    }

    const email = (params.email || '').trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    });
    return { error: error as Error | null };
  }

  async function verifyOtpCode(params: { channel: 'email' | 'sms'; email?: string; phone?: string; token: string }) {
    if (!supabase) return { error: new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.') };

    const token = params.token.trim();
    if (params.channel === 'sms') {
      const phone = (params.phone || '').trim();
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      return { error: error as Error | null };
    }

    const email = (params.email || '').trim().toLowerCase();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });
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
      value={{
        user,
        session,
        userMeta,
        loading,
        configured: isSupabaseConfigured,
        signUp,
        signIn,
        signInWithGoogle,
        requestOtp,
        verifyOtpCode,
        signOut,
        refreshMeta,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
