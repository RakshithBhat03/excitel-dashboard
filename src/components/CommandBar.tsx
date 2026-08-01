import { RefreshCw } from 'lucide-react';
import type { SelectableMonth, SelectableMonthId } from '../../shared/contracts';
import { cn } from '../lib/utils';
import type { CurrentLinkState } from '../types/analytics';
import { formatClock } from '../utils/formatters';
import PeriodSelector from './PeriodSelector';
import ThemeToggle from './ThemeToggle';

interface CommandBarProps {
  link: CurrentLinkState;
  months: SelectableMonth[];
  selectedMonth: SelectableMonthId | null;
  onMonthChange: (monthId: SelectableMonthId) => void;
  onRefresh: () => Promise<void>;
  syncing: boolean;
  loading: boolean;
  lastUpdated: Date | null;
}

export default function CommandBar({
  link,
  months,
  selectedMonth,
  onMonthChange,
  onRefresh,
  syncing,
  loading,
  lastUpdated,
}: CommandBarProps) {
  const up = link.up;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-canvas)_88%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1520px] items-center gap-3 px-4 sm:px-6">
        {/* Mark: a fibre strand crossing a junction */}
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden className="shrink-0">
          <rect
            x="0.5"
            y="0.5"
            width="25"
            height="25"
            rx="7"
            fill="var(--color-ink)"
          />
          <path
            d="M5 18.5c4.5 0 4.5-11 9-11s4.5 11 7 11"
            fill="none"
            stroke="var(--color-panel)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="14" cy="7.5" r="2.4" fill="var(--color-s1)" />
        </svg>

        <div className="hidden min-w-0 sm:block">
          <p className="readout readout-wide text-[12px] font-medium leading-none tracking-[0.06em] text-[var(--color-ink)]">
            LINE MONITOR
          </p>
          <p className="label !text-[9px] mt-0.5">Excitel fibre</p>
        </div>

        <span className="mx-1 hidden h-6 w-px bg-[var(--color-line)] sm:block" />

        <span
          className={cn(
            'hidden items-center gap-2 sm:inline-flex',
            up ? 'text-[var(--color-up)]' : 'text-[var(--color-warn)]'
          )}
        >
          <span className="led" />
          <span className="label !text-current">{link.label}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          {lastUpdated && (
            <span className="label hidden lg:inline">
              synced {formatClock(lastUpdated)}
            </span>
          )}
          <ThemeToggle />
          <PeriodSelector
            months={months}
            selected={selectedMonth}
            onSelect={onMonthChange}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={syncing || loading}
            className="btn btn-primary"
          >
            <RefreshCw
              className={cn('w-3.5 h-3.5', syncing && 'animate-spin')}
              strokeWidth={2.2}
            />
            <span className="hidden sm:inline">{syncing ? 'Syncing' : 'Sync'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
