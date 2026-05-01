import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';

export default function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();

  const isDark = theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex items-center justify-center h-11 w-11 rounded-full',
        'border border-[var(--color-border)] bg-[var(--color-card)]',
        'text-[var(--color-foreground)]',
        'shadow-[var(--shadow-paper)] hover:shadow-[var(--shadow-lift)]',
        'transition-all duration-300 overflow-hidden',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Sun className={cn('absolute h-4.5 w-4.5 transition-all duration-300',
        isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100')} />
      <Moon className={cn('absolute h-4.5 w-4.5 transition-all duration-300',
        isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0')} />
    </button>
  );
}
