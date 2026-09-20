// ==============================================================================
// LOXER Local Database & Auth Client Adapter
// Drop-in compatible with SupabaseClient for local SQLite operation
// ==============================================================================

const STORAGE_TOKEN_KEY = 'loxer_local_auth_token';
const STORAGE_USER_KEY = 'loxer_local_auth_user';

export interface LocalUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LocalSession {
  access_token: string;
  token_type: string;
  user: LocalUser | null;
}

type AuthChangeCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED', session: LocalSession | null) => void;
const authListeners: Set<AuthChangeCallback> = new Set();

function notifyAuthChange(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED', session: LocalSession | null) {
  authListeners.forEach((listener) => {
    try {
      listener(event, session);
    } catch (e) {
      console.warn('[LocalAuth] Error in auth change listener:', e);
    }
  });
}

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
  count?: number;
}

class QueryBuilder<T = unknown> implements PromiseLike<QueryResult<T>> {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private columns = '*';
  private actionData: unknown = null;
  private filters: Array<{ column: string; op: string; value: unknown }> = [];
  private orderConfig?: { column: string; ascending: boolean };
  private limitCount?: number;
  private rangeConfig?: { from: number; to: number };
  private onConflictKey?: string;
  private countOption?: string;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', options?: { count?: 'exact' }) {
    this.action = 'select';
    this.columns = columns;
    if (options?.count) {
      this.countOption = options.count;
    }
    return this;
  }

  insert(data: unknown) {
    this.action = 'insert';
    this.actionData = data;
    return this;
  }

  update(data: unknown) {
    this.action = 'update';
    this.actionData = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  upsert(data: unknown, options?: { onConflict?: string }) {
    this.action = 'upsert';
    this.actionData = data;
    this.onConflictKey = options?.onConflict || 'id';
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  in(column: string, value: unknown[]) {
    this.filters.push({ column, op: 'in', value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, op: 'gte', value });
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push({ column, op: 'lte', value });
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  ilike(column: string, value: string) {
    this.filters.push({ column, op: 'ilike', value });
    return this;
  }

  like(column: string, value: string) {
    this.filters.push({ column, op: 'like', value });
    return this;
  }

  order(column: string, options: { ascending?: boolean } = { ascending: true }) {
    this.orderConfig = { column, ascending: options.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeConfig = { from, to };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async execute(): Promise<QueryResult<T>> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_TOKEN_KEY) : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        table: this.table,
        action: this.action,
        columns: this.columns,
        data: this.actionData,
        filters: this.filters,
        order: this.orderConfig,
        limit: this.limitCount,
        range: this.rangeConfig,
        onConflict: this.onConflictKey,
        count: this.countOption,
      };

      const response = await fetch('/api/local/db/query', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return {
          data: null,
          error: result.error || { message: `HTTP ${response.status}` },
        };
      }

      let data = result.data as T | null;
      if (this.isMaybeSingle) {
        data = Array.isArray(data) ? (data.length > 0 ? (data[0] as T) : null) : data;
      } else if (this.isSingle) {
        data = Array.isArray(data) ? (data[0] as T) : data;
      }

      // Notify realtime listeners for mutations
      if (typeof window !== 'undefined' && ['insert', 'update', 'delete', 'upsert'].includes(this.action)) {
        window.dispatchEvent(
          new CustomEvent('loxer:db-event', {
            detail: { table: this.table, action: this.action, data },
          })
        );
      }

      return {
        data,
        error: null,
        count: result.count,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? { message: error.message } : { message: String(error) },
      };
    }
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

class LocalChannel {
  public readonly channelName: string;
  private listener: ((e: Event) => void) | null = null;

  constructor(name: string) {
    this.channelName = name;
  }

  on(
    _event: string,
    config: { event: string; schema?: string; table?: string; filter?: string },
    callback: (payload: { eventType: string; new: unknown; old: unknown }) => void
  ) {
    void _event;
    this.listener = (customEvent: Event) => {
      const detail = (customEvent as CustomEvent).detail || {};
      if (config.table && detail.table !== config.table) return;

      callback({
        eventType: (typeof detail.action === 'string' ? detail.action.toUpperCase() : 'UPDATE'),
        new: detail.data,
        old: null,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('loxer:db-event', this.listener as EventListener);
    }

    return this;
  }

  subscribe() {
    return this;
  }

  unsubscribe() {
    if (this.listener && typeof window !== 'undefined') {
      window.removeEventListener('loxer:db-event', this.listener as EventListener);
      this.listener = null;
    }
  }
}

export const localClient = {
  auth: {
    async signUp(params: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const res = await fetch('/api/local/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          return { data: { user: null, session: null }, error: result.error || new Error(`HTTP ${res.status}`) };
        }

        if (result.data?.session?.access_token) {
          localStorage.setItem(STORAGE_TOKEN_KEY, result.data.session.access_token);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.data.user));
          notifyAuthChange('SIGNED_IN', result.data.session);
        }

        return { data: result.data, error: null };
      } catch (err) {
        return { data: { user: null, session: null }, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },

    async signInWithPassword(credentials: { email: string; password: string }) {
      try {
        const res = await fetch('/api/local/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const result = await res.json();
        if (!res.ok || result.error) {
          return { data: { user: null, session: null }, error: result.error || new Error('Login gagal') };
        }

        if (result.data?.session?.access_token) {
          localStorage.setItem(STORAGE_TOKEN_KEY, result.data.session.access_token);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.data.user));
          notifyAuthChange('SIGNED_IN', result.data.session);
        }

        return { data: result.data, error: null };
      } catch (err) {
        return { data: { user: null, session: null }, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },

    async signInWithOAuth(options?: { provider?: string; options?: { redirectTo?: string; queryParams?: Record<string, string> } }) {
      try {
        void options;
        const intentStr = typeof window !== 'undefined' ? localStorage.getItem('loxer_oauth_signup_intent') : null;
        let intent: Record<string, unknown> = {};
        if (intentStr) {
          try {
            intent = JSON.parse(intentStr) as Record<string, unknown>;
          } catch {
            // ignore
          }
        }

        const email = typeof intent.email === 'string' && intent.email.trim() ? intent.email.trim() : 'pengguna.google@gmail.com';
        const fullName = typeof intent.fullName === 'string' ? intent.fullName.trim() : '';
        const phone = typeof intent.phone === 'string' ? intent.phone.trim() : '';
        const role = intent.role === 'employer' ? 'employer' : 'seeker';
        const avatarUrl = typeof intent.avatarUrl === 'string' ? intent.avatarUrl.trim() : '';

        const res = await fetch('/api/local/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName, phone, role, avatarUrl }),
        });

        const result = await res.json();
        if (!res.ok || result.error) {
          return { data: { provider: 'google', url: null }, error: result.error || new Error('Google login gagal') };
        }

        if (result.data?.session?.access_token) {
          localStorage.setItem(STORAGE_TOKEN_KEY, result.data.session.access_token);
          localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(result.data.user));
          notifyAuthChange('SIGNED_IN', result.data.session);
        }

        return { data: { provider: 'google', url: null }, error: null };
      } catch (err) {
        return { data: { provider: null, url: null }, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },

    async signInWithOtp(options?: unknown) {
      void options;
      return {
        data: { user: null, session: null },
        error: new Error('OTP login tidak didukung di local offline database mode. Silakan gunakan email & password.'),
      };
    },

    async verifyOtp(options?: unknown) {
      void options;
      return {
        data: { user: null, session: null },
        error: new Error('OTP verification tidak didukung di local offline database mode.'),
      };
    },

    async signOut() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_TOKEN_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
        try {
          await fetch('/api/local/auth/logout', { method: 'POST' });
        } catch {
          // ignore
        }
        notifyAuthChange('SIGNED_OUT', null);
      }
      return { error: null };
    },

    async getSession() {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const token = localStorage.getItem(STORAGE_TOKEN_KEY);
      const userStr = localStorage.getItem(STORAGE_USER_KEY);

      if (!token || !userStr) {
        return { data: { session: null }, error: null };
      }

      try {
        const user = JSON.parse(userStr) as LocalUser;
        const session: LocalSession = {
          access_token: token,
          token_type: 'bearer',
          user,
        };
        return { data: { session }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },

    async getUser(token?: string) {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const activeToken = token || localStorage.getItem(STORAGE_TOKEN_KEY);
      if (!activeToken) return { data: { user: null }, error: null };

      try {
        const res = await fetch('/api/local/auth/user', {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        const result = await res.json();
        if (res.ok && result.data?.user) {
          return { data: { user: result.data.user as LocalUser }, error: null };
        }
      } catch {
        // fallback to cached localStorage user
      }

      const userStr = localStorage.getItem(STORAGE_USER_KEY);
      const user = userStr ? (JSON.parse(userStr) as LocalUser) : null;
      return { data: { user }, error: null };
    },

    onAuthStateChange(callback: AuthChangeCallback) {
      authListeners.add(callback);
      // Trigger initial state
      this.getSession().then(({ data }) => {
        callback(data.session ? 'SIGNED_IN' : 'SIGNED_OUT', data.session);
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners.delete(callback);
            },
          },
        },
      };
    },
  },

  from(table: string) {
    return new QueryBuilder(table);
  },

  channel(name: string) {
    return new LocalChannel(name);
  },

  removeChannel(channelInstance: LocalChannel) {
    if (channelInstance && typeof channelInstance.unsubscribe === 'function') {
      channelInstance.unsubscribe();
    }
  },
};
