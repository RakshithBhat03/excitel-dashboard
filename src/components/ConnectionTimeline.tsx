import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import type { DailySummary, Outage } from '../types/analytics';
import { formatCompactMinutes, formatGbText, minuteOfDayToClock } from '../utils/formatters';
import { Empty, Panel, PanelHead, TipRow, TipShell } from './ui';

/**
 * The connection timeline.
 *
 * One column per day, each column a full 24 hours read top to bottom. Filled
 * minutes are minutes the line was actually connected; colour carries how much
 * data moved that day. Breaks in service are marked at the minute they
 * happened — they are real but brief, so they get an annotation rule rather
 * than an exaggerated gap.
 */

const RAMP = [
  'var(--color-ramp-0)',
  'var(--color-ramp-1)',
  'var(--color-ramp-2)',
  'var(--color-ramp-3)',
  'var(--color-ramp-4)',
  'var(--color-ramp-5)',
];

const HOUR_MARKS = [0, 6, 12, 18, 24];

function step(usage: number, max: number): number {
  if (!usage || !max) return 0;
  return Math.min(5, Math.max(1, Math.ceil((usage / max) * 5)));
}

interface TimelineColumn extends DailySummary {
  tone: string;
  drops: Outage[];
}

interface ConnectionTimelineProps {
  days: DailySummary[];
  outages: Outage[];
  stats: import('../types/analytics').DashboardStats;
}

export default function ConnectionTimeline({
  days,
  outages,
  stats,
}: ConnectionTimelineProps) {
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo<{ max: number; columns: TimelineColumn[] }>(() => {
    const max = days.reduce((m, d) => Math.max(m, d.usage), 0);
    const byDay = new Map<string, Outage[]>();
    for (const outage of outages) {
      const key = format(outage.from, 'yyyy-MM-dd');
      const dayOutages = byDay.get(key) ?? [];
      dayOutages.push(outage);
      byDay.set(key, dayOutages);
    }
    return {
      max,
      columns: days.map((d) => ({
        ...d,
        tone: RAMP[step(d.usage, max)] ?? RAMP[0] ?? 'var(--color-ramp-0)',
        drops: byDay.get(d.dateKey) || [],
      })),
    };
  }, [days, outages]);

  if (!days.length) {
    return (
      <Panel className="min-h-[280px]">
        <PanelHead label="Connection timeline" title="Every hour of the period" />
        <Empty message="No sessions recorded for this period yet." />
      </Panel>
    );
  }

  const { columns, max } = model;
  const dense = columns.length > 45;
  const active = hover !== null ? columns[hover] ?? null : null;

  // Date ticks: first, last, and a handful in between.
  const tickEvery = Math.max(1, Math.round(columns.length / 8));

  return (
    <Panel className="overflow-hidden">
      <PanelHead
        label="Connection timeline"
        title="Every hour of the period"
        meta={`${columns.length} days · 00:00 to 24:00 top to bottom · colour is data moved`}
      >
        <div className="hidden sm:flex items-center gap-2">
          <span className="label !text-[var(--color-ink-3)]">less</span>
          <span className="flex gap-[2px]" aria-hidden>
            {RAMP.slice(1).map((tone) => (
              <span
                key={tone}
                className="w-4 h-3 rounded-[2px] border border-[var(--color-line)]"
                style={{ background: tone }}
              />
            ))}
          </span>
          <span className="label !text-[var(--color-ink-3)]">more</span>
        </div>
      </PanelHead>

      <div className="p-4 pt-6 sm:p-5 sm:pt-7">
        <div className="flex gap-3">
          {/* Hour rail */}
          <div className="relative w-6 shrink-0 h-[240px] hidden sm:block" aria-hidden>
            {HOUR_MARKS.map((h) => (
              <span
                key={h}
                className="label absolute right-0 -translate-y-1/2 !text-[9.5px] !tracking-normal"
                style={{ top: `${(h / 24) * 100}%` }}
              >
                {String(h).padStart(2, '0')}
              </span>
            ))}
          </div>

          <div className="relative flex-1 min-w-0">
            {/* Hour gridlines sit behind the columns */}
            <div className="absolute inset-x-0 top-0 h-[240px] pointer-events-none" aria-hidden>
              {HOUR_MARKS.map((h) => (
                <span
                  key={h}
                  className="absolute left-0 right-0 border-t border-dashed border-[var(--color-line-2)] opacity-70"
                  style={{ top: `${(h / 24) * 100}%` }}
                />
              ))}
            </div>

            <div
              className={cn(
                'relative flex h-[240px] items-stretch',
                dense ? 'gap-px' : 'gap-[2px] sm:gap-[5px]'
              )}
              onMouseLeave={() => setHover(null)}
            >
              {columns.map((day, i) => (
                <button
                  key={day.dateKey}
                  type="button"
                  className="group relative flex-1 min-w-0 rounded-[3px] bg-[var(--color-well)] focus:outline-none"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${day.fullLabel}: ${formatGbText(day.usage)}, connected ${formatCompactMinutes(
                    day.connectedMinutes
                  )}${day.drops.length ? `, ${day.drops.length} service drop` : ''}`}
                >
                  {day.spans.map((span, k) => (
                    <span
                      key={k}
                      className="absolute left-0 right-0 rounded-[2px] origin-bottom"
                      style={{
                        top: `${(span.from / 1440) * 100}%`,
                        height: `${Math.max(0.4, ((span.to - span.from) / 1440) * 100)}%`,
                        background: day.tone,
                        animation: `ribbon-rise .5s cubic-bezier(.22,.68,.28,1) ${Math.min(i * 8, 400)}ms both`,
                      }}
                    />
                  ))}

                  {/* Service drops: annotated at the minute they happened */}
                  {day.drops.map((drop) => (
                    <span
                      key={drop.id}
                      className="absolute left-0 right-0 h-[2px] bg-[var(--color-down)]"
                      style={{
                        top: `${((drop.from.getHours() * 60 + drop.from.getMinutes()) / 1440) * 100}%`,
                      }}
                    />
                  ))}

                  <span
                    className={cn(
                      'absolute inset-0 rounded-[3px] ring-inset transition-shadow',
                      hover === i ? 'ring-2 ring-[var(--color-ink)]' : 'ring-0'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Date axis */}
            <div className="relative mt-2 h-3">
              {columns.map((day, i) =>
                i % tickEvery === 0 || i === columns.length - 1 ? (
                  <span
                    key={day.dateKey}
                    className="label absolute -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${((i + 0.5) / columns.length) * 100}%` }}
                  >
                    {day.label}
                  </span>
                ) : null
              )}
            </div>

            {active && hover !== null && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{
                  left: `${((hover + 0.5) / columns.length) * 100}%`,
                  top: 0,
                  transform: `translate(${
                    hover / columns.length > 0.65 ? 'calc(-100% - 10px)' : '10px'
                  }, 0)`,
                }}
              >
                <TipShell title={active.fullLabel}>
                  <TipRow label="Data" value={formatGbText(active.usage)} swatch={active.tone} />
                  <TipRow label="Connected" value={formatCompactMinutes(active.connectedMinutes)} />
                  <TipRow label="Sessions" value={active.sessionCount || '—'} />
                  {active.drops.length > 0 && (
                    <TipRow
                      label="Drop"
                      value={active.drops
                        .map(
                          (d) =>
                            `${minuteOfDayToClock(
                              d.from.getHours() * 60 + d.from.getMinutes()
                            )} · ${formatCompactMinutes(d.minutes)}`
                        )
                        .join(', ')}
                      swatch="var(--color-down)"
                    />
                  )}
                </TipShell>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 mt-4 pt-3 border-t border-[var(--color-line)]">
          <p className="text-xs text-[var(--color-ink-2)]">
            Busiest day{' '}
            <span className="num text-[var(--color-ink)]">
              {stats.peakDay ? `${stats.peakDay.label} · ${formatGbText(stats.peakDay.usage)}` : '—'}
            </span>
            <span className="mx-2 text-[var(--color-line-2)]">/</span>
            Quietest{' '}
            <span className="num text-[var(--color-ink)]">
              {stats.quietDay
                ? `${stats.quietDay.label} · ${formatGbText(stats.quietDay.usage)}`
                : '—'}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-ink-2)]">
            <span className="w-3.5 h-[2px] bg-[var(--color-down)] rounded-full" aria-hidden />
            {stats.outageCount
              ? `${stats.outageCount} service drop${stats.outageCount > 1 ? 's' : ''}, ${formatCompactMinutes(
                  stats.downMinutes
                )} offline`
              : 'No service drops in this period'}
          </p>
        </div>
      </div>
      <span className="sr-only">
        Peak daily volume in this period is {formatGbText(max)}.
      </span>
    </Panel>
  );
}
