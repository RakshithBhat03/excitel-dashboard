import { formatGbText } from '../utils/formatters';
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
      <Panel className="min-h-[240px]">
        <PanelHead label="Weekly rhythm" title="Average by weekday" />
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
        label="Weekly rhythm"
        title="Average by weekday"
        meta={`${top.name} runs heaviest at ${formatGbText(top.avg)} a day`}
      />

      <div className="flex-1 p-4 sm:p-5">
        <ul className="space-y-2">
          {weekdays.map((w) => {
            const width = max && w.days ? Math.max(1.5, (w.avg / max) * 100) : 0;
            const isTop = w.index === top.index;
            return (
              <li key={w.name} className="flex items-center gap-3">
                <span className="label w-8 shrink-0 !text-[10px]">{w.name}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-[4px] bg-[var(--color-well)]">
                  {w.days > 0 && (
                    <span
                      className="absolute inset-y-0 left-0 rounded-[4px]"
                      style={{
                        width: `${width}%`,
                        background: isTop ? 'var(--color-s2)' : 'var(--color-s1)',
                        opacity: isTop ? 1 : 0.75,
                      }}
                    />
                  )}
                </span>
                <span className="num w-20 shrink-0 text-right text-[12px] text-[var(--color-ink)]">
                  {w.days ? formatGbText(w.avg, 1) : '—'}
                </span>
                <span className="label w-12 shrink-0 text-right !text-[9px]">
                  {w.days ? `${w.days}d` : 'no data'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
