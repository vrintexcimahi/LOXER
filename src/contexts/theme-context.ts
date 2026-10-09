import { createContext } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextValue {
  /** The effective active theme applied to the DOM ('light' | 'dark') */
  theme: ThemeMode;
  /** The configured preference ('system' | 'light' | 'dark') */
  themePreference: ThemePreference;
  /** Quick toggle between light and dark */
  toggleTheme: () => void;
  /** Explicitly set the theme preference ('system' | 'light' | 'dark') */
  setTheme: (theme: ThemePreference | ThemeMode) => void;
  /** Whether the active theme is dynamically following the OS */
  isSystem: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
