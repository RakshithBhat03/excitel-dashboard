import { cn } from '../lib/utils';
import { formatCompactMinutes, formatGb, formatGbText } from '../utils/formatters';
import type { MonthlyHistoryEntry } from '../types/analytics';
import type { SelectableMonthId } from '../../shared/contracts';
import { Empty, Panel, PanelHead } from './ui';

/**
 * Month-over-month totals across the whole archive. Clicking a month loads it,
 * so the strip doubles as navigation.
 */
interface MonthlyHistoryProps {
  history: MonthlyHistoryEntry[];
  selectedMonth: SelectableMonthId | null;
  onSelect: (monthId: SelectableMonthId) => void;
}

export default function MonthlyHistory({ history, selectedMonth, onSelect }: MonthlyHistoryProps) {
  if (!history.length) {
    return (
      <Panel>
        <PanelHead title="Month by month" />
        <Empty message="The archive is still syncing." />
      </Panel>
    );
  }

  const max = history.reduce((m, h) => Math.max(m, h.gb), 0);
  const first = history[0];
  if (!first) return null;
  const busiest = history.reduce((current, entry) => (entry.gb > current.gb ? entry : current), first);
  const total = history.reduce((sum, h) => sum + h.gb, 0);

  return (
    <Panel>
      <PanelHead
        title="Month by month"
        meta={`${formatGbText(total, 1)} over ${history.length} months on record. The busiest was ${busiest.fullLabel} at ${formatGbText(busiest.gb)}. Pick any month to open it.`}
      />

      <div className="flex h-[260px] items-end gap-1.5 pt-5 sm:gap-3">
        {history.map((m, i) => {
          const active = m.monthId === selectedMonth;
          const height = max ? Math.max(2, (m.gb / max) * 100) : 2;
          const { value, unit } = formatGb(m.gb, m.gb >= 1024 ? 1 : 0);
          const newYear = i === 0 || history[i - 1]?.fullLabel.slice(-4) !== m.fullLabel.slice(-4);
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onSelect(m.monthId)}
              aria-pressed={active}
              aria-label={`${m.fullLabel}: ${formatGbText(m.gb)}, ${m.sessions} sessions, ${formatCompactMinutes(m.minutes)} online`}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end gap-2 focus:outline-none"
            >
              <span className="relative block flex-1">
                <span
                  className={cn(
                    'num absolute inset-x-0 truncate text-center text-[11px] leading-none transition-colors',
                    active
                      ? 'font-semibold text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink)]'
                  )}
                  style={{ bottom: `calc(${height}% + 8px)` }}
                >
                  {value}
                  <span className="ml-px text-[9px]">{unit}</span>
                </span>
                <span
                  className={cn(
                    'absolute inset-x-0 bottom-0 origin-bottom rounded-t-[4px] transition-colors duration-200',
                    active
                      ? 'bg-[var(--color-s1)]'
                      : 'bg-[var(--color-well)] group-hover:bg-[var(--color-line-2)]'
                  )}
                  style={{
                    height: `${height}%`,
                    animation: `ribbon-rise .8s cubic-bezier(.16,1,.3,1) ${i * 40}ms both`,
                  }}
                />
              </span>
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    'text-[12px] leading-none transition-colors',
                    active ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]'
                  )}
                >
                  {m.label}
                </span>
                <span className="num mt-1 h-3 text-[10px] leading-none text-[var(--color-ink-3)]">
                  {newYear ? m.fullLabel.slice(-4) : ''}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
