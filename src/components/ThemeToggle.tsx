import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const OPTIONS: Array<{ key: Theme; Icon: LucideIcon; label: string }> = [
  { key: 'light', Icon: Sun, label: 'Light' },
  { key: 'dark', Icon: Moon, label: 'Dark' },
  { key: 'system', Icon: Monitor, label: 'Match system' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="seg" role="group" aria-label="Appearance">
      {OPTIONS.map((mode) => (
        <button
          key={mode.key}
          type="button"
          onClick={() => setTheme(mode.key)}
          data-on={theme === mode.key}
          aria-pressed={theme === mode.key}
          title={mode.label}
          className="!px-2"
        >
          <mode.Icon className="w-3.5 h-3.5" strokeWidth={2} />
          <span className="sr-only">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
