import { useMemo } from 'react';
import { HardDrive, Clock, TrendingUp, Activity, Percent, Zap, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import Header from './Header';
import MonthSelector from './MonthSelector';
import StatsCard from './StatsCard';
import UsageChart from './UsageChart';
import DailyUsageChart from './DailyUsageChart';
import SessionDurationChart from './SessionDurationChart';
import SessionsTable from './SessionsTable';
import HealthRing from './HealthRing';
import TerminationBreakdown from './TerminationBreakdown';
import IpInsights from './IpInsights';
import Ticker from './Ticker';
import { formatDuration } from '../utils/formatters';

export default function Dashboard({
  stats,
  sessions,
  months,
  selectedMonth,
  sessionChartData,
  dailyUsageData,
  loading,
  error,
  onMonthChange,
  onRefresh,
}) {
  const selectedMonthTitle = months?.find(m => m.id === selectedMonth)?.title;

  /**
   * Derived sparklines & rolling deltas.
   */
  const insights = useMemo(() => {
    const days = dailyUsageData || [];
    const usageSpark    = days.map(d => d.usage);
    const durationSpark = days.map(d => d.duration);
    const sessionSpark  = days.map(d => d.sessionCount);

    // rolling delta: avg of last 3 days vs avg of previous 3 days
    const tail = days.slice(-3);
    const prev = days.slice(-6, -3);
    const avg = (arr, key) => arr.length ? arr.reduce((s, d) => s + d[key], 0) / arr.length : 0;
    const usageDelta = prev.length && avg(prev, 'usage')
      ? ((avg(tail, 'usage') - avg(prev, 'usage')) / avg(prev, 'usage')) * 100
      : 0;
    const durationDelta = prev.length && avg(prev, 'duration')
      ? ((avg(tail, 'duration') - avg(prev, 'duration')) / avg(prev, 'duration')) * 100
      : 0;

    const peakDay = days.reduce((m, d) => d.usage > (m?.usage ?? 0) ? d : m, null);
    const totalSessions = (sessions || []).length;
    const totalTimeMin = (sessions || []).reduce((s, x) => s + Number(x.usageTime || 0), 0);
    const avgSessionMinutes = totalSessions ? totalTimeMin / totalSessions : 0;

    return {
      usageSpark,
      durationSpark,
      sessionSpark,
      usageDelta,
      durationDelta,
      peakDay,
      avgSessionMinutes,
    };
  }, [dailyUsageData, sessions]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card p-10 max-w-md text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full flex items-center justify-center"
               style={{ background: 'color-mix(in oklab, var(--color-danger) 14%, transparent)' }}>
            <AlertTriangle className="w-6 h-6" style={{ color: 'var(--color-danger)' }} />
          </div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">Signal lost</p>
          <h2 className="font-display font-light text-3xl tracking-tight mt-2">We can't reach the line.</h2>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-3">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-6 inline-flex items-center gap-2 pl-4 pr-3 h-11 rounded-full bg-[var(--color-foreground)] text-[var(--color-background)]"
          >
            <span className="font-medium text-sm">Try again</span>
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-brand-primary)] text-white">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  const tickerItems = stats ? [
    { label: 'Volume',   value: `${(stats.totalUsage || 0).toFixed(2)} GB`,    delta: insights.usageDelta },
    { label: 'Online',   value: formatDuration((stats.totalTime || 0) * 60),   delta: insights.durationDelta },
    { label: 'Sessions', value: `${stats.sessionCount || 0}` },
    { label: 'Uptime',   value: `${(stats.uptimePercent || 0).toFixed(1)}%` },
    { label: 'Avg/day',  value: `${(stats.avgDaily || 0).toFixed(2)} GB` },
    { label: 'Avg sess', value: `${insights.avgSessionMinutes.toFixed(0)} min` },
    ...(insights.peakDay ? [{ label: 'Peak', value: `${insights.peakDay.usage.toFixed(2)} GB · ${insights.peakDay.label}` }] : []),
  ] : [];

  return (
    <div className="min-h-screen relative">
      {/* Page padding container */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-20">
        <Header
          onRefresh={onRefresh}
          loading={loading}
          selectedMonthTitle={selectedMonthTitle}
        />
      </div>

      {/* Ticker — full bleed */}
      {!loading && tickerItems.length > 0 && (
        <Ticker items={tickerItems} />
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 pb-24">
        {/* Toolbar row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <MonthSelector
            months={months}
            selectedMonth={selectedMonth}
            onSelect={onMonthChange}
          />
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            <span className="hidden sm:inline">Auto-synced</span>
            <span className="rule-dotted w-12 hidden sm:block" />
            <span>{loading ? 'Refreshing…' : 'Idle'}</span>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : (
          <div className="space-y-8">
            {/* KPI strip */}
            <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              <StatsCard
                title="Total volume"
                value={(stats?.totalUsage || 0).toFixed(stats?.totalUsage >= 100 ? 0 : 2)}
                unit="GB"
                subtitle="Down + up"
                icon={HardDrive}
                tone="coral"
                trend={insights.usageDelta}
                spark={insights.usageSpark}
              />
              <StatsCard
                title="Online time"
                value={formatDuration((stats?.totalTime || 0) * 60).replace(/ (hrs|days|min)$/, '')}
                unit={(() => {
                  const t = formatDuration((stats?.totalTime || 0) * 60);
                  if (t.endsWith('days')) return 'days';
                  if (t.endsWith('hrs'))  return 'hrs';
                  return 'min';
                })()}
                subtitle="Connected"
                icon={Clock}
                tone="blue"
                trend={insights.durationDelta}
                spark={insights.durationSpark}
              />
              <StatsCard
                title="Daily average"
                value={(stats?.avgDaily || 0).toFixed(2)}
                unit="GB"
                subtitle="Per day"
                icon={TrendingUp}
                tone="emerald"
                spark={insights.usageSpark}
              />
              <StatsCard
                title="Sessions"
                value={(stats?.sessionCount || 0).toString()}
                unit=""
                subtitle="Logged"
                icon={Activity}
                tone="violet"
                spark={insights.sessionSpark}
              />
              <StatsCard
                title="Uptime"
                value={(stats?.uptimePercent || 0).toFixed(1)}
                unit="%"
                subtitle="Connection stability"
                icon={Percent}
                tone="amber"
              />
            </section>

            {/* Hero row: trend chart + health ring */}
            <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <UsageChart data={dailyUsageData} />
              </div>
              <div>
                <HealthRing
                  uptimePercent={stats?.uptimePercent || 0}
                  sessionCount={stats?.sessionCount || 0}
                  totalHours={stats?.totalTime || 0}
                  avgSessionMinutes={insights.avgSessionMinutes}
                />
              </div>
            </section>

            {/* Mid row: daily bars + duration histogram + termination breakdown */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DailyUsageChart data={dailyUsageData} />
              </div>
              <div>
                <TerminationBreakdown sessions={sessions} />
              </div>
            </section>

            {/* Lower row: histogram + IP insights */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SessionDurationChart data={sessionChartData} />
              </div>
              <div>
                <IpInsights sessions={sessions} />
              </div>
            </section>

            {/* Sessions ledger */}
            <section>
              <SessionsTable sessions={sessions} dailyUsageData={dailyUsageData} />
            </section>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-8 rise-in">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} h="h-32" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2"><SkeletonCard h="h-[420px]" /></div>
        <SkeletonCard h="h-[420px]" />
      </div>
      <SkeletonCard h="h-[440px]" />
    </div>
  );
}

function SkeletonCard({ h }) {
  return (
    <div className={cn('card relative overflow-hidden', h)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-[var(--color-muted)]/60 to-transparent" />
      <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-16 pt-8 border-t border-[var(--color-border)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display italic text-lg text-[var(--color-foreground)]">
          The Network Ledger
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] not-italic text-[var(--color-muted-foreground)] ml-3">
            an excitel telemetry edition
          </span>
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
          Built with care · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
