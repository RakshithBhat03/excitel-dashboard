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

export default function MonthlyHistory({
  history,
  selectedMonth,
  onSelect,
}: MonthlyHistoryProps) {
  if (!history.length) {
    return (
      <Panel className="min-h-[240px]">
        <PanelHead label="Archive" title="Month by month" />
        <Empty message="The archive is still syncing." />
      </Panel>
    );
  }

  const max = history.reduce((m, h) => Math.max(m, h.gb), 0);
  const first = history[0];
  if (!first) return null;
  const busiest = history.reduce((current, historyEntry) =>
    historyEntry.gb > current.gb ? historyEntry : current,
  first);

  return (
    <Panel>
      <PanelHead
        label="Archive"
        title="Month by month"
        meta={`${history.length} months on record · busiest was ${busiest.fullLabel} at ${formatGbText(busiest.gb)}`}
      />

      <div className="flex-1 p-4 sm:p-5">
        <div className="flex h-[188px] items-end gap-1.5 sm:gap-2">
          {history.map((m) => {
            const active = m.monthId === selectedMonth;
            const height = max ? Math.max(3, (m.gb / max) * 100) : 3;
            const { value, unit } = formatGb(m.gb, m.gb >= 1024 ? 1 : 0);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => onSelect(m.monthId)}
                aria-pressed={active}
                title={`${m.fullLabel} — ${formatGbText(m.gb)}, ${m.sessions} sessions, ${formatCompactMinutes(m.minutes)} online`}
                className="group flex h-full flex-1 flex-col justify-end gap-1.5 rounded-md pb-0 focus:outline-none"
              >
                <span
                  className={cn(
                    'num text-[10px] leading-none transition-colors',
                    active ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)] group-hover:text-[var(--color-ink)]'
                  )}
                >
                  {value}
                  <span className="text-[8px] ml-px">{unit}</span>
                </span>
                <span
                  className={cn(
                    'w-full rounded-t-[4px] transition-colors',
                    active
                      ? 'bg-[var(--color-s2)]'
                      : 'bg-[var(--color-s1)] opacity-55 group-hover:opacity-90'
                  )}
                  style={{ height: `${height}%` }}
                />
                <span
                  className={cn(
                    'label !text-[9px] truncate transition-colors',
                    active && '!text-[var(--color-ink)]'
                  )}
                >
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 flex items-center gap-2 border-t border-[var(--color-line)] pt-3 text-[11px] text-[var(--color-ink-2)]">
          <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--color-s2)]" aria-hidden />
          Selected period
          <span className="ml-2 w-2.5 h-2.5 rounded-[2px] bg-[var(--color-s1)] opacity-55" aria-hidden />
          Other months — pick one to load it
        </p>
      </div>
    </Panel>
  );
}
