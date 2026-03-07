import { HardDrive, Clock, TrendingUp, Activity, Percent } from 'lucide-react';
import { cn } from '../lib/utils';
import Header from './Header';
import MonthSelector from './MonthSelector';
import StatsCard from './StatsCard';
import UsageChart from './UsageChart';
import DailyUsageChart from './DailyUsageChart';
import SessionDurationChart from './SessionDurationChart';
import SessionsTable from './SessionsTable';
import { formatBytes, formatDuration } from '../utils/formatters';

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
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--color-background)]">
        <div className={cn('card p-8 max-w-md text-center shadow-lg border-[var(--color-border)]')}>
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-rose-50 flex items-center justify-center">
            <Activity className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">Connection Error</h2>
          <p className="text-[var(--color-muted-foreground)] mb-6 leading-relaxed">{error}</p>
          <button
            onClick={onRefresh}
            className={cn(
              'px-6 py-2.5 rounded-xl border transition-all',
              'bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90',
              'font-medium shadow-md hover:shadow-lg'
            )}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-10 bg-[var(--color-background)]">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header onRefresh={onRefresh} loading={loading} />

        {/* Month Selector */}
        <div>
          <MonthSelector
            months={months}
            selectedMonth={selectedMonth}
            onSelect={onMonthChange}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-[var(--color-muted)] border-t-[var(--color-brand-primary)] rounded-full animate-spin" />
              <p className="text-[var(--color-muted-foreground)] font-medium">Loading your data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatsCard
                title="Total Usage"
                value={formatBytes(stats?.totalUsage * 1024 || 0)}
                subtitle="This month"
                icon={HardDrive}
                color="blue"
              />
              <StatsCard
                title="Connection Time"
                value={formatDuration(stats?.totalTime * 60 || 0)}
                subtitle="Total connected"
                icon={Clock}
                color="amber"
              />
              <StatsCard
                title="Daily Average"
                value={`${stats?.avgDaily?.toFixed(1) || 0} GB`}
                subtitle="Per day"
                icon={TrendingUp}
                color="emerald"
              />
              <StatsCard
                title="Sessions"
                value={stats?.sessionCount || 0}
                subtitle="This month"
                icon={Activity}
                color="violet"
              />
              <StatsCard
                title="Uptime"
                value={`${stats?.uptimePercent?.toFixed(1) || 0}%`}
                subtitle="Connection stability"
                icon={Percent}
                color="teal"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <UsageChart data={dailyUsageData} />
              <DailyUsageChart data={dailyUsageData} />
            </div>

            {/* Session Duration Chart */}
            <div className="card p-1">
              <SessionDurationChart data={sessionChartData} />
            </div>

            {/* Sessions Table */}
            <div className="pt-4">
              <SessionsTable sessions={sessions} dailyUsageData={dailyUsageData} />
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center">
          <p className="text-[var(--color-muted-foreground)] text-sm font-medium">Excitel Usage Dashboard</p>
          <p className="text-[var(--color-muted-foreground)]/60 text-xs mt-1">Updated for modern web</p>
        </footer>
      </div>
    </div>
  );
}
