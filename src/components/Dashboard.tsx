import { lazy, Suspense, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowsClockwise, WarningCircle } from '@phosphor-icons/react';
import type { SelectableMonth, SelectableMonthId } from '../../shared/contracts';
import { cn } from '../lib/utils';
import type {
  AddressPoolSummary,
  DashboardStats,
  DailySummary,
  CurrentLinkState,
  MonthlyHistoryEntry,
  NormalizedSession,
  Outage,
  TerminationCauseSummary,
  WeekdayProfile as WeekdayProfileData,
} from '../types/analytics';
import {
  formatCompactMinutes,
  formatGb,
  formatGbText,
  formatMinutes,
} from '../utils/formatters';
import AddressPool from './AddressPool';
import CommandBar from './CommandBar';
import Hero from './Hero';
import ConnectionTimeline from './ConnectionTimeline';
import LinkQuality from './LinkQuality';
import MetricTile from './MetricTile';
import MonthlyHistory from './MonthlyHistory';
import OutageLog from './OutageLog';
import SessionsTable from './SessionsTable';
import WeekdayProfile from './WeekdayProfile';

// VolumeChart is the only panel that pulls in Recharts, which is most of the
// bundle. Splitting it out keeps the charting library off the critical path;
// the effect below starts fetching the chunk on mount so it downloads
// alongside the session request rather than after it.
const VolumeChart = lazy(() => import('./VolumeChart'));

interface DashboardProps {
  rows: NormalizedSession[];
  days: DailySummary[];
  outages: Outage[];
  stats: DashboardStats;
  weekdays: WeekdayProfileData[];
  causes: TerminationCauseSummary[];
  pool: AddressPoolSummary;
  link: CurrentLinkState;
  history: MonthlyHistoryEntry[];
  months: SelectableMonth[];
  selectedMonth: SelectableMonthId | null;
  selectedMonthTitle: string | null;
  loading: boolean;
  syncing: boolean;
  lastUpdated: Date | null;
  error: string | null;
  onMonthChange: (monthId: SelectableMonthId) => void;
  onRefresh: () => Promise<void>;
}

interface MetricTileData {
  label: string;
  value: string;
  unit: string;
  note: string;
  spark?: number[] | undefined;
}

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
}: DashboardProps) {
  // Warm the chart chunk while the session request is still in flight, so the
  // panel is ready to render the moment the data lands.
  useEffect(() => {
    void import('./VolumeChart');
  }, []);

  const tiles = useMemo<MetricTileData[]>(() => {
    const spark = days.map((d) => d.usage);
    const total = formatGb(stats.totalGb);
    const online = formatMinutes(stats.totalMinutes);
    const avg = formatGb(stats.dailyAvgGb);
    const peak = stats.peakDay ? formatGb(stats.peakDay.usage) : { value: '-', unit: '' };

    return [
      {
        label: 'Data moved',
        value: total.value,
        unit: total.unit,
        note: `${stats.dayCount} active days`,
        spark,
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
        note: stats.peakDay ? stats.peakDay.fullLabel.replace(/,.*/, '') + ', ' + stats.peakDay.label : 'No data',
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
          : 'No data',
      },
      {
        label: 'Service drops',
        value: String(stats.outageCount),
        unit: '',
        note: stats.outageCount
          ? `${formatCompactMinutes(stats.downMinutes)} offline`
          : 'line held throughout',
      },
    ];
  }, [days, stats]);

  return (
    <div className="min-h-[100dvh]">
      <CommandBar
        link={link}
        onRefresh={onRefresh}
        syncing={syncing}
        loading={loading}
        lastUpdated={lastUpdated}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-20 sm:px-8">
        <Hero
          stats={stats}
          months={months}
          selectedMonth={selectedMonth}
          selectedMonthTitle={selectedMonthTitle}
          loading={loading}
          onMonthChange={onMonthChange}
        />

        {error && <ErrorNote message={error} onRetry={onRefresh} />}

        {loading ? (
          <Loading />
        ) : stats.sessionCount === 0 ? (
          <NoData onRefresh={onRefresh} />
        ) : (
          <div className="space-y-16 sm:space-y-20">
            {/* Readouts: hairline-separated, no boxes. The -ml-px tucks each
                row's leading rule out of sight. */}
            <div className="enter overflow-hidden border-t border-[var(--color-line)] pt-7" style={{ animationDelay: '180ms' }}>
              <div className="-ml-px grid grid-cols-2 gap-y-8 md:grid-cols-3 xl:grid-cols-6">
                {tiles.map((t) => (
                  <MetricTile key={t.label} {...t} />
                ))}
              </div>
            </div>

            <Reveal>
              <ConnectionTimeline days={days} outages={outages} stats={stats} />
            </Reveal>

            <Reveal className="grid grid-cols-1 gap-x-12 gap-y-16 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <Suspense fallback={<Block className="h-[380px]" />}>
                  <VolumeChart days={days} stats={stats} />
                </Suspense>
              </div>
              <div className="lg:col-span-4">
                <LinkQuality stats={stats} causes={causes} />
              </div>
            </Reveal>

            <Reveal>
              <MonthlyHistory
                history={history}
                selectedMonth={selectedMonth}
                onSelect={onMonthChange}
              />
            </Reveal>

            <Reveal className="grid grid-cols-1 gap-x-12 gap-y-16 md:grid-cols-2 xl:grid-cols-12">
              <div className="md:col-span-2 xl:col-span-5">
                <WeekdayProfile weekdays={weekdays} />
              </div>
              <div className="xl:col-span-4">
                <OutageLog outages={outages} stats={stats} />
              </div>
              <div className="xl:col-span-3">
                <AddressPool pool={pool} sessionCount={stats.sessionCount} />
              </div>
            </Reveal>

            <Reveal>
              <SessionsTable rows={rows} days={days} />
            </Reveal>
          </div>
        )}

        <footer className="mt-24 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-6 text-[12px] text-[var(--color-ink-3)]">
          <p>Every figure comes from your own Excitel session records.</p>
          <p>All times IST</p>
        </footer>
      </main>
    </div>
  );
}

/** Sections settle into place as they reach the viewport. */
function Reveal({ className, children }: { className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ErrorNote({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => Promise<void>;
}) {
  return (
    <div
      role="alert"
      className="mb-10 flex flex-wrap items-center gap-4 rounded-[10px] bg-[color-mix(in_oklab,var(--color-down)_10%,transparent)] px-5 py-4"
    >
      <WarningCircle className="h-5 w-5 shrink-0 text-[var(--color-down)]" weight="fill" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-[var(--color-ink)]">Couldn&apos;t reach the line</p>
        <p className="text-[13px] text-[var(--color-ink-2)]">{message}</p>
      </div>
      <button type="button" onClick={() => void onRetry()} className="btn">
        Try again
      </button>
    </div>
  );
}

function NoData({ onRefresh }: { onRefresh: () => Promise<void> }) {
  return (
    <div className="sect flex flex-col items-start gap-3 py-20">
      <h2 className="text-[24px] font-semibold tracking-[-0.03em] text-[var(--color-ink)]">
        No sessions in this period yet
      </h2>
      <p className="max-w-[46ch] text-[15px] text-[var(--color-ink-2)]">
        Pick another month from the title above, or sync to pull the latest records from Excitel.
      </p>
      <button type="button" onClick={() => void onRefresh()} className="btn btn-primary mt-3">
        <ArrowsClockwise className="h-4 w-4" weight="bold" />
        Sync now
      </button>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-16" aria-busy="true" aria-label="Loading line data">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Block key={i} className="h-[112px]" />
        ))}
      </div>
      <Block className="h-[420px]" />
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <Block className="h-[380px] lg:col-span-8" />
        <Block className="h-[380px] lg:col-span-4" />
      </div>
    </div>
  );
}

function Block({ className }: { className: string }) {
  return <div className={cn('skeleton', className)} />;
}
