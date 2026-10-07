import { Desktop, Moon, Sun } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const OPTIONS: Array<{ key: Theme; Glyph: Icon; label: string }> = [
  { key: 'light', Glyph: Sun, label: 'Light' },
  { key: 'dark', Glyph: Moon, label: 'Dark' },
  { key: 'system', Glyph: Desktop, label: 'Match system' },
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
          <mode.Glyph className="h-4 w-4" weight={theme === mode.key ? 'fill' : 'regular'} />
          <span className="sr-only">{mode.label}</span>
        </button>
      ))}
    </div>
  );
}
