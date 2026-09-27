import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '../../contexts/useTheme';

interface ThemeToggleProps {
  compact?: boolean;
  variant?: 'light' | 'dark';
}

export default function ThemeToggle({ compact = false, variant = 'light' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const variantClass =
    variant === 'dark'
      ? 'border-white/10 bg-slate-900/90 text-slate-200 shadow-sm hover:border-rose-500/40 hover:text-rose-300'
      : compact
        ? 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-cyan-400/30 dark:hover:text-cyan-300'
        : 'gap-2 border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-200 hover:text-sky-600 dark:border-white/10 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-cyan-400/30 dark:hover:text-cyan-300';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
      title={isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode'}
      className={`inline-flex items-center justify-center rounded-xl border transition-all ${
        compact ? 'h-9 w-9 sm:h-10 sm:w-10' : ''
      } ${variantClass}`}
    >
      {isDark ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact ? <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span> : null}
    </button>
  );
}
