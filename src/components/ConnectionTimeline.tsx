import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import type { DailySummary, DashboardStats, Outage } from '../types/analytics';
import { outageSpanForDay } from '../utils/analytics';
import { formatCompactMinutes, formatGb, formatGbText, minuteOfDayToClock } from '../utils/formatters';
import { Empty, LegendItem, Panel, PanelHead, TipRow, TipShell } from './ui';

/**
 * The connection ledger.
 *
 * One row per day, each row a full 24 hours read left to right. Filled
 * stretches are minutes the line was actually connected; colour carries how
 * much data moved that day. Breaks in service fill their exact missing
 * interval in red, including outages that continue across calendar days.
 * The day's volume sits at the end of its row, so the two read together.
 */

const RAMP = [
  'var(--color-ramp-0)',
  'var(--color-ramp-1)',
  'var(--color-ramp-2)',
  'var(--color-ramp-3)',
  'var(--color-ramp-4)',
  'var(--color-ramp-5)',
];

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/** Grid columns: date, the 24h strand, volume bar, volume value. */
const ROW_GRID = 'grid grid-cols-[52px_minmax(0,1fr)_64px] sm:grid-cols-[64px_minmax(0,1fr)_minmax(80px,180px)_76px] items-center gap-x-3 sm:gap-x-4';

function step(usage: number, max: number): number {
  if (!usage || !max) return 0;
  return Math.min(5, Math.max(1, Math.ceil((usage / max) * 5)));
}

interface TimelineRow extends DailySummary {
  tone: string;
  drops: Outage[];
  downtime: NonNullable<ReturnType<typeof outageSpanForDay>>[];
  downMinutes: number;
}

interface ConnectionTimelineProps {
  days: DailySummary[];
  outages: Outage[];
  stats: DashboardStats;
}

export default function ConnectionTimeline({ days, outages, stats }: ConnectionTimelineProps) {
  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo<{ max: number; rows: TimelineRow[] }>(() => {
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
      rows: days.map((d) => {
        const downtime = outages.flatMap((outage) => {
          const span = outageSpanForDay(outage, d.date);
          return span ? [span] : [];
        });
        return {
          ...d,
          tone: RAMP[step(d.usage, max)] ?? 'var(--color-ramp-0)',
          drops: byDay.get(d.dateKey) || [],
          downtime,
          downMinutes: downtime.reduce((total, span) => total + span.to - span.from, 0),
        };
      }),
    };
  }, [days, outages]);

  if (!days.length) {
    return (
      <Panel>
        <PanelHead title="Every hour, every day" />
        <Empty message="No sessions recorded for this period yet." />
      </Panel>
    );
  }

  const { rows, max } = model;

  // Rows shrink as the period grows: a week gets fat bands, a month gets a
  // fine weave, the full archive gets a 2px barcode.
  const rowHeight = Math.max(2, Math.min(34, Math.floor(380 / rows.length) - 3));
  const gap = rowHeight >= 8 ? 3 : rowHeight >= 4 ? 2 : 1;
  const pitch = rowHeight + gap;
  const labelEvery = Math.max(1, Math.ceil(16 / pitch));
  const radius = rowHeight >= 8 ? 3 : 1;
  const active = hover !== null ? rows[hover] ?? null : null;

  return (
    <Panel>
      <PanelHead
        title="Every hour, every day"
        meta={`${rows.length} ${rows.length === 1 ? 'day' : 'days'}, midnight to midnight. Filled time is connected time; the deeper the blue, the more data moved that day.`}
      >
        <div className="hidden items-center gap-4 md:flex">
          <span className="flex items-center gap-2">
            <span className="text-[12px] text-[var(--color-ink-3)]">Less</span>
            <span className="flex gap-[2px]" aria-hidden>
              {RAMP.slice(1).map((tone) => (
                <span key={tone} className="h-3 w-4 rounded-[2px]" style={{ background: tone }} />
              ))}
            </span>
            <span className="text-[12px] text-[var(--color-ink-3)]">More</span>
          </span>
          <LegendItem color="var(--color-down)" name="Offline" />
        </div>
      </PanelHead>

      {/* Hour axis */}
      <div className={cn(ROW_GRID, 'mb-2')} aria-hidden>
        <span />
        <div className="relative h-4">
          {HOUR_MARKS.map((h) => (
            <span
              key={h}
              className={cn(
                'tick absolute top-0 !text-[10px] !tracking-normal',
                h === 0 ? '' : h === 24 ? '-translate-x-full' : '-translate-x-1/2',
                h % 6 !== 0 && 'hidden lg:inline'
              )}
              style={{ left: `${(h / 24) * 100}%` }}
            >
              {String(h).padStart(2, '0')}
            </span>
          ))}
        </div>
        <span className="tick hidden text-left sm:block">Data</span>
        <span className="tick hidden sm:block" />
      </div>

      <div className="relative" onMouseLeave={() => setHover(null)}>
        {/* Hour gridlines run behind every row */}
        <div className={cn(ROW_GRID, 'pointer-events-none absolute inset-0')} aria-hidden>
          <span />
          <div className="relative h-full">
            {HOUR_MARKS.slice(1, -1).map((h) => (
              <span
                key={h}
                className={cn(
                  'absolute inset-y-0 border-l',
                  h % 6 === 0
                    ? 'border-[var(--color-line-2)]'
                    : 'border-dashed border-[var(--color-line)]'
                )}
                style={{ left: `${(h / 24) * 100}%` }}
              />
            ))}
          </div>
        </div>

        <ul className="relative flex flex-col" style={{ gap }}>
          {rows.map((day, i) => {
            const showLabel = rowHeight >= 12 || i % labelEvery === 0;
            const vol = formatGb(day.usage);
            const on = hover === i;
            return (
              <li key={day.dateKey}>
                <button
                  type="button"
                  className={cn(ROW_GRID, 'group w-full cursor-default text-left focus:outline-none')}
                  style={{ height: rowHeight }}
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  aria-label={`${day.fullLabel}: ${formatGbText(day.usage)}, connected ${formatCompactMinutes(
                    day.connectedMinutes
                  )}${day.downMinutes ? `, offline ${formatCompactMinutes(day.downMinutes)}` : ''}`}
                >
                  <span
                    className={cn(
                      'num truncate text-[11.5px] leading-none transition-colors',
                      on ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-3)]',
                      !showLabel && 'invisible'
                    )}
                  >
                    {format(day.date, rowHeight >= 20 ? 'EEE d' : 'MMM d')}
                  </span>

                  <span
                    className="relative block overflow-hidden bg-[var(--color-well)]"
                    style={{ height: rowHeight, borderRadius: radius }}
                  >
                    <span
                      className="absolute inset-0 origin-left"
                      style={{
                        animation: `strand-in .9s cubic-bezier(.16,1,.3,1) ${Math.min(i * 22, 600)}ms both`,
                      }}
                    >
                      {day.spans.map((span, k) => (
                        <span
                          key={k}
                          className="absolute inset-y-0"
                          style={{
                            left: `${(span.from / 1440) * 100}%`,
                            width: `${Math.max(0.15, ((span.to - span.from) / 1440) * 100)}%`,
                            background: day.tone,
                            borderRadius: radius,
                          }}
                        />
                      ))}
                      {day.downtime.map((span) => (
                        <span
                          key={span.id}
                          className="absolute inset-y-0 bg-[var(--color-down)]"
                          style={{
                            left: `${(span.from / 1440) * 100}%`,
                            width: `${Math.max(0.3, ((span.to - span.from) / 1440) * 100)}%`,
                            borderRadius: radius,
                          }}
                        />
                      ))}
                    </span>
                    <span
                      className={cn(
                        'absolute inset-0 transition-shadow',
                        on ? 'shadow-[inset_0_0_0_2px_var(--color-ink)]' : ''
                      )}
                      style={{ borderRadius: radius }}
                    />
                  </span>

                  <span className="hidden h-full min-h-0 items-center sm:flex">
                    <span
                      className="block origin-left transition-colors"
                      style={{
                        height: Math.max(2, Math.min(rowHeight, 10)),
                        width: `${max && day.usage ? Math.max(1.5, (day.usage / max) * 100) : 0}%`,
                        background: on ? 'var(--color-ink)' : 'var(--color-s1)',
                        borderRadius: '0 2px 2px 0',
                        animation: `strand-in .9s cubic-bezier(.16,1,.3,1) ${Math.min(i * 22, 600) + 200}ms both`,
                      }}
                    />
                  </span>

                  <span
                    className={cn(
                      'num text-right text-[12px] leading-none',
                      on ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-2)]',
                      !showLabel && 'invisible'
                    )}
                  >
                    {day.usage ? (
                      <>
                        {vol.value}
                        <span className="ml-0.5 text-[10px] text-[var(--color-ink-3)]">{vol.unit}</span>
                      </>
                    ) : (
                      '-'
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {active && hover !== null && (
          <div
            className="pointer-events-none absolute z-20 hidden sm:block"
            style={{
              top: hover * pitch + rowHeight / 2,
              left: '50%',
              transform: hover / rows.length > 0.5 ? 'translate(-50%, calc(-100% - 14px))' : 'translate(-50%, 14px)',
            }}
          >
            <TipShell title={active.fullLabel}>
              <TipRow label="Data" value={formatGbText(active.usage)} swatch={active.tone} />
              <TipRow label="Connected" value={formatCompactMinutes(active.connectedMinutes)} />
              <TipRow label="Sessions" value={active.sessionCount || '0'} />
              {active.downMinutes > 0 && (
                <TipRow
                  label="Offline"
                  value={formatCompactMinutes(active.downMinutes)}
                  swatch="var(--color-down)"
                />
              )}
              {active.drops.map((d) => (
                <TipRow
                  key={d.id}
                  label={`Drop at ${minuteOfDayToClock(d.from.getHours() * 60 + d.from.getMinutes())}`}
                  value={formatCompactMinutes(d.minutes)}
                  swatch="var(--color-down)"
                />
              ))}
            </TipShell>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 text-[13px] text-[var(--color-ink-3)] sm:grid-cols-3">
        <p>
          Busiest day{' '}
          <span className="num text-[var(--color-ink)]">
            {stats.peakDay ? `${stats.peakDay.label}, ${formatGbText(stats.peakDay.usage)}` : '-'}
          </span>
        </p>
        <p>
          Quietest day{' '}
          <span className="num text-[var(--color-ink)]">
            {stats.quietDay ? `${stats.quietDay.label}, ${formatGbText(stats.quietDay.usage)}` : '-'}
          </span>
        </p>
        <p className="sm:text-right">
          {stats.outageCount ? (
            <>
              <span className="text-[var(--color-down)]">
                {stats.outageCount} service {stats.outageCount > 1 ? 'drops' : 'drop'}
              </span>
              , {formatCompactMinutes(stats.downMinutes)} offline
            </>
          ) : (
            'No service drops in this period'
          )}
        </p>
      </div>
      <span className="sr-only">Peak daily volume in this period is {formatGbText(max)}.</span>
    </Panel>
  );
}
