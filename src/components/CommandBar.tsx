import { ArrowsClockwise } from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import type { CurrentLinkState } from '../types/analytics';
import { formatClock } from '../utils/formatters';
import ThemeToggle from './ThemeToggle';

interface CommandBarProps {
  link: CurrentLinkState;
  onRefresh: () => Promise<void>;
  syncing: boolean;
  loading: boolean;
  lastUpdated: Date | null;
}

export default function CommandBar({
  link,
  onRefresh,
  syncing,
  loading,
  lastUpdated,
}: CommandBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-canvas)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-8">
        {/* Mark: a fibre strand crossing a junction */}
        <svg width="28" height="28" viewBox="0 0 26 26" aria-hidden className="shrink-0">
          <rect x="0.5" y="0.5" width="25" height="25" rx="8" fill="var(--color-ink)" />
          <path
            d="M5 18.5c4.5 0 4.5-11 9-11s4.5 11 7 11"
            fill="none"
            stroke="var(--color-canvas)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="14" cy="7.5" r="2.4" fill="var(--color-s1)" />
        </svg>

        <p className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          Line Monitor
        </p>

        <span
          className={cn(
            'hidden items-center gap-2 rounded-full border border-[var(--color-line)] px-3 py-1 sm:inline-flex',
            link.up ? 'text-[var(--color-up)]' : 'text-[var(--color-warn)]'
          )}
        >
          <span className="led" />
          <span className="text-[12px] font-medium">{link.label}</span>
        </span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {lastUpdated && (
            <span className="hidden text-[12px] text-[var(--color-ink-3)] lg:inline">
              Synced at <span className="num text-[var(--color-ink-2)]">{formatClock(lastUpdated)}</span>
            </span>
          )}
          <ThemeToggle />
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={syncing || loading}
            className="btn btn-primary"
          >
            <ArrowsClockwise
              className={cn('h-4 w-4', syncing && 'animate-spin')}
              weight="bold"
            />
            <span className="hidden sm:inline">{syncing ? 'Syncing' : 'Sync now'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
