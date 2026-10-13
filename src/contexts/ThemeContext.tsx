import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, ThemeContextValue, ThemeMode, ThemePreference } from './theme-context';

const THEME_STORAGE_KEY = 'loxer-theme';

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveInitialPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function getStoredAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.localStorage.getItem('loxer_local_auth_token') ||
    window.localStorage.getItem('loxer_local_auth_token_admin') ||
    window.sessionStorage.getItem('loxer_local_auth_token') ||
    null
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(resolveInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme);

  // Listen to OS prefers-color-scheme changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mql.addEventListener) {
      mql.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mql.addListener(handleChange);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleChange);
      } else {
        mql.removeListener(handleChange);
      }
    };
  }, []);

  // Compute the resolved active visual theme
  const resolvedTheme: ThemeMode = useMemo(() => {
    if (preference === 'system') {
      return systemTheme;
    }
    return preference;
  }, [preference, systemTheme]);

  // Synchronize DOM classes whenever resolvedTheme or preference changes
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.classList.toggle('theme-light', resolvedTheme === 'light');
    root.classList.toggle('theme-dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;

    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  }, [resolvedTheme, preference]);

  // Sync preference with backend database user_preferences
  const syncPreferenceToBackend = useCallback(async (newMode: ThemePreference) => {
    const token = getStoredAuthToken();
    if (!token) return;

    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: newMode }),
      });
    } catch (err) {
      // Non-blocking background sync failure
      console.debug('[ThemeContext] Preference sync skipped:', err);
    }
  }, []);

  // Load preferences from backend on mount or when token is established
  useEffect(() => {
    let active = true;
    const token = getStoredAuthToken();
    if (!token) return;

    fetch('/api/user/preferences', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.preferences?.theme) return;
        const dbTheme = data.preferences.theme as string;
        if (dbTheme === 'light' || dbTheme === 'dark' || dbTheme === 'system') {
          setPreference(dbTheme as ThemePreference);
        }
      })
      .catch(() => {
        // offline or non-blocking
      });

    return () => {
      active = false;
    };
  }, []);

  // Listen to cross-context preference sync events
  useEffect(() => {
    const handleSync = (event: Event) => {
      const custom = event as CustomEvent<{ theme?: ThemePreference }>;
      if (custom.detail?.theme) {
        setPreference(custom.detail.theme);
      }
    };

    window.addEventListener('loxer:preferences-synced', handleSync);
    return () => {
      window.removeEventListener('loxer:preferences-synced', handleSync);
    };
  }, []);

  const setTheme = useCallback(
    (newTheme: ThemePreference | ThemeMode) => {
      setPreference(newTheme);
      void syncPreferenceToBackend(newTheme);
    },
    [syncPreferenceToBackend]
  );

  const toggleTheme = useCallback(() => {
    setPreference(() => {
      // Quick cycle: if dark -> light, if light -> dark, if system -> toggle opposite of current resolved
      const next: ThemePreference = resolvedTheme === 'dark' ? 'light' : 'dark';
      void syncPreferenceToBackend(next);
      return next;
    });
  }, [resolvedTheme, syncPreferenceToBackend]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: resolvedTheme,
      themePreference: preference,
      toggleTheme,
      setTheme,
      isSystem: preference === 'system',
    }),
    [resolvedTheme, preference, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
