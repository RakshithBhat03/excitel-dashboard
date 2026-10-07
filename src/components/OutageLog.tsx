import { ShieldCheck } from '@phosphor-icons/react';
import { formatClock, formatCompactMinutes } from '../utils/formatters';
import { format } from 'date-fns';
import type { DashboardStats, Outage } from '../types/analytics';
import { Empty, Panel, PanelHead } from './ui';

/**
 * Every break in service in the period, longest first. A break is the gap
 * between one session ending and the next beginning: measured, not inferred.
 */
interface OutageLogProps {
  outages: Outage[];
  stats: DashboardStats;
}

export default function OutageLog({ outages, stats }: OutageLogProps) {
  return (
    <Panel>
      <PanelHead
        title="Service drops"
        meta={
          outages.length
            ? `${outages.length} ${outages.length > 1 ? 'breaks' : 'break'} totalling ${formatCompactMinutes(stats.downMinutes)}.`
            : undefined
        }
      />

      {outages.length === 0 ? (
        <Empty
          icon={<ShieldCheck className="h-6 w-6 text-[var(--color-up)]" weight="duotone" />}
          message="No drops"
          detail="The line held for the whole period. There were no gaps between sessions."
        />
      ) : (
        <ol className="space-y-2">
          {outages.slice(0, 6).map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-4 rounded-[10px] bg-[var(--color-inset)] px-4 py-3"
            >
              <span className="w-10 shrink-0 text-center">
                <span className="block text-[11px] leading-none text-[var(--color-ink-3)]">
                  {format(o.from, 'MMM')}
                </span>
                <span className="figure mt-1 block text-[22px] text-[var(--color-ink)]">
                  {format(o.from, 'd')}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="num block text-[13px] text-[var(--color-ink)]">
                  {formatClock(o.from)} to {formatClock(o.to)}
                </span>
                <span className="block truncate text-[12px] text-[var(--color-ink-3)]">
                  After {o.cause.toLowerCase()}
                </span>
              </span>
              <span className="chip chip-down num shrink-0">{formatCompactMinutes(o.minutes)} off</span>
            </li>
          ))}
          {outages.length > 6 && (
            <li className="px-1 pt-1 text-[12px] text-[var(--color-ink-3)]">
              {outages.length - 6} shorter {outages.length - 6 === 1 ? 'break' : 'breaks'} not shown
            </li>
          )}
        </ol>
      )}
    </Panel>
  );
}
