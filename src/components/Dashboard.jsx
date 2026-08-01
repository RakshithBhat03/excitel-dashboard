import { useMemo } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  formatCompactMinutes,
  formatDay,
  formatGb,
  formatGbText,
  formatMinutes,
} from '../utils/formatters';
import AddressPool from './AddressPool';
import CommandBar from './CommandBar';
import ConnectionTimeline from './ConnectionTimeline';
import LinkQuality from './LinkQuality';
import MetricTile from './MetricTile';
import MonthlyHistory from './MonthlyHistory';
import OutageLog from './OutageLog';
import SessionsTable from './SessionsTable';
import VolumeChart from './VolumeChart';
import WeekdayProfile from './WeekdayProfile';

export default function Dashboard({
  rows,
  days,
  outages,
  stats,
  weekdays,
  causes,
  pool,
  link,
  history,
  months,
  selectedMonth,
  selectedMonthTitle,
  loading,
  syncing,
  lastUpdated,
  error,
  onMonthChange,
  onRefresh,
}) {
  const tiles = useMemo(() => {
    const spark = days.map((d) => d.usage);
    const total = formatGb(stats.totalGb);
    const online = formatMinutes(stats.totalMinutes);
    const avg = formatGb(stats.dailyAvgGb);
    const peak = stats.peakDay ? formatGb(stats.peakDay.usage) : { value: '—', unit: '' };

    return [
      {
        label: 'Data moved',
        value: total.value,
        unit: total.unit,
        note: `${stats.dayCount} active days`,
        spark,
        accent: 'var(--color-s1)',
      },
      {
        label: 'Daily average',
        value: avg.value,
        unit: avg.unit,
        note: `median ${formatGbText(stats.medianDailyGb, 1)}`,
      },
      {
        label: 'Busiest day',
        value: peak.value,
        unit: peak.unit,
        note: stats.peakDay ? stats.peakDay.fullLabel.replace(/,.*/, '') + ', ' + stats.peakDay.label : '—',
      },
      {
        label: 'Time online',
        value: online.value,
        unit: online.unit,
        note: `${stats.uptimePercent.toFixed(2)}% of the period`,
      },
      {
        label: 'Sessions',
        value: String(stats.sessionCount),
        unit: '',
        note: stats.longestSession
          ? `longest ${formatCompactMinutes(stats.longestSession.minutes)}`
          : '—',
      },
      {
        label: 'Service drops',
        value: String(stats.outageCount),
        unit: '',
        note: stats.outageCount
          ? `${formatCompactMinutes(stats.downMinutes)} offline`
          : 'line held throughout',
        accent: stats.outageCount ? 'var(--color-down)' : undefined,
      },
    ];
  }, [days, stats]);

  const periodNote = stats.periodStart
    ? `${formatDay(stats.periodStart)} → ${formatDay(stats.periodEnd)}`
    : null;

  return (
    <div className="min-h-screen">
      <CommandBar
        link={link}
        months={months}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        onRefresh={onRefresh}
        syncing={syncing}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <main className="mx-auto max-w-[1520px] px-4 pb-16 pt-5 sm:px-6">
        {/* Period heading */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <h1 className="readout readout-wide text-[26px] leading-none font-medium tracking-[0.01em] text-[var(--color-ink)]">
              {selectedMonthTitle ?? 'Loading period'}
            </h1>
            <p className="label mt-2">{periodNote ?? 'Reading the line'}</p>
          </div>
          {!loading && stats.sessionCount > 0 && (
            <p className="text-[13px] leading-relaxed text-[var(--color-ink-2)]">
              <span className="num text-[var(--color-ink)]">{formatGbText(stats.totalGb)}</span>{' '}
              moved over{' '}
              <span className="num text-[var(--color-ink)]">{stats.sessionCount}</span> sessions ·{' '}
              <span className="num text-[var(--color-ink)]">
                {stats.uptimePercent.toFixed(2)}%
              </span>{' '}
              uptime ·{' '}
              <span className="num text-[var(--color-ink)]">{stats.outageCount}</span>{' '}
              {stats.outageCount === 1 ? 'drop' : 'drops'}
            </p>
          )}
        </div>

        {error && <ErrorNote message={error} onRetry={onRefresh} />}

        {loading ? (
          <Loading />
        ) : stats.sessionCount === 0 ? (
          <NoData onRefresh={onRefresh} />
        ) : (
          <div className="enter space-y-4">
            <ConnectionTimeline days={days} outages={outages} stats={stats} />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
              {tiles.map((t) => (
                <MetricTile key={t.label} {...t} />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="xl:col-span-2">
                <VolumeChart days={days} stats={stats} />
              </div>
              <LinkQuality stats={stats} causes={causes} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <MonthlyHistory
                history={history}
                selectedMonth={selectedMonth}
                onSelect={onMonthChange}
              />
              <WeekdayProfile weekdays={weekdays} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <OutageLog outages={outages} stats={stats} />
              <AddressPool pool={pool} sessionCount={stats.sessionCount} />
            </div>

            <SessionsTable rows={rows} days={days} />
          </div>
        )}

        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-5">
          <p className="label">
            Excitel line monitor · figures come from your own session records
          </p>
          <p className="label">All times IST</p>
        </footer>
      </main>
    </div>
  );
}

function ErrorNote({ message, onRetry }) {
  return (
    <div className="panel mb-4 flex flex-wrap items-center gap-3 border-[color-mix(in_oklab,var(--color-down)_40%,transparent)] px-4 py-3">
      <TriangleAlert className="w-4 h-4 shrink-0 text-[var(--color-down)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-[var(--color-ink)]">
          Couldn&apos;t reach the line
        </p>
        <p className="text-[12px] text-[var(--color-ink-2)]">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="btn">
        Try again
      </button>
    </div>
  );
}

function NoData({ onRefresh }) {
  return (
    <div className="panel flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
      <p className="label">No records</p>
      <h2 className="text-[17px] font-semibold text-[var(--color-ink)]">
        This period has no sessions yet
      </h2>
      <p className="max-w-sm text-[13px] text-[var(--color-ink-2)]">
        Pick another period from the archive, or sync to pull the latest records from
        Excitel.
      </p>
      <button type="button" onClick={onRefresh} className="btn btn-primary mt-1">
        Sync now
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading line data">
      <Block className="h-[340px]" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-[104px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Block className="h-[360px] xl:col-span-2" />
        <Block className="h-[360px]" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Block className="h-[280px]" />
        <Block className="h-[280px]" />
      </div>
    </div>
  );
}

function Block({ className }) {
  return <div className={cn('panel skeleton', className)} />;
}
