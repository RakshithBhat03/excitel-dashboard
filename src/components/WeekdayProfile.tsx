import { cn } from '../lib/utils';
import { formatGb, formatGbText } from '../utils/formatters';
import type { WeekdayProfile as WeekdayProfileData } from '../types/analytics';
import { Empty, Panel, PanelHead } from './ui';

/**
 * Average consumption by day of the week. Days without sessions are excluded
 * from their weekday's average so a partial month doesn't drag it down.
 */
export default function WeekdayProfile({ weekdays }: { weekdays: WeekdayProfileData[] }) {
  const measured = weekdays.filter((w) => w.days > 0);

  if (!measured.length) {
    return (
      <Panel>
        <PanelHead title="Weekly rhythm" />
        <Empty message="Not enough days in this period yet." />
      </Panel>
    );
  }

  const max = measured.reduce((m, w) => Math.max(m, w.avg), 0);
  const first = measured[0];
  if (!first) return null;
  const top = measured.reduce((m, w) => (w.avg > m.avg ? w : m), first);

  return (
    <Panel>
      <PanelHead
        title="Weekly rhythm"
        meta={`Average per weekday. ${top.name} runs heaviest at ${formatGbText(top.avg)} a day.`}
      />

      <ul className="grid h-[230px] grid-cols-7 items-end gap-2 pt-5 sm:gap-3">
        {weekdays.map((w, i) => {
          const height = max && w.days ? Math.max(2, (w.avg / max) * 100) : 0;
          const isTop = w.index === top.index;
          const vol = formatGb(w.avg, 1);
          return (
            <li
              key={w.name}
              className="flex h-full min-w-0 flex-col items-stretch justify-end gap-2"
              title={w.days ? `${w.name}: ${formatGbText(w.avg)} average over ${w.days} days` : `${w.name}: no data`}
            >
              <span className="relative block flex-1">
                <span
                  className="num absolute inset-x-0 truncate text-center text-[11px] leading-none text-[var(--color-ink-2)]"
                  style={{ bottom: `calc(${height}% + 8px)` }}
                >
                  {w.days ? vol.value : 'none'}
                </span>
                {w.days > 0 ? (
                  <span
                    className="absolute inset-x-0 bottom-0 origin-bottom rounded-t-[4px]"
                    style={{
                      height: `${height}%`,
                      background: isTop ? 'var(--color-s2)' : 'var(--color-s1)',
                      animation: `ribbon-rise .8s cubic-bezier(.16,1,.3,1) ${i * 50}ms both`,
                    }}
                  />
                ) : (
                  <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[var(--color-line-2)]" />
                )}
              </span>
              <span
                className={cn(
                  'text-center text-[12px] leading-none',
                  isTop ? 'font-semibold text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]'
                )}
              >
                {w.name}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[12px] text-[var(--color-ink-3)]">Values in GB per day.</p>
    </Panel>
  );
}
