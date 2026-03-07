import { useState, memo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  HardDrive,
  Wifi,
  AlertCircle,
  CalendarDays,
  Layers3,
} from 'lucide-react';
import { formatFullDate, formatBytes, formatDuration, getTerminationColor } from '../utils/formatters';
import { cn } from '../lib/utils';

const SortIcon = memo(({ sortField, sortDirection, field }) => {
  if (sortField !== field) return null;
  return sortDirection === 'asc' ? (
    <ChevronUp className="w-4 h-4 inline ml-1" />
  ) : (
    <ChevronDown className="w-4 h-4 inline ml-1" />
  );
});

SortIcon.displayName = 'SortIcon';

export default function SessionsTable({ sessions, dailyUsageData }) {
  const [activeTab, setActiveTab] = useState('daily');
  const [sortField, setSortField] = useState('sessionStartDate');
  const [sortDirection, setSortDirection] = useState('desc');

  const hasSessions = sessions && sessions.length > 0;
  const hasDailyUsage = dailyUsageData && dailyUsageData.length > 0;

  if (!hasSessions && !hasDailyUsage) {
    return (
      <div className={cn('card p-6 flex items-center justify-center h-48')}>
        <p className="text-[var(--color-muted-foreground)]">No sessions found</p>
      </div>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'usageVolume' || sortField === 'usageTime') {
      aVal = parseFloat(aVal);
      bVal = parseFloat(bVal);
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const sortedDailyUsage = [...(dailyUsageData || [])].sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const tabLabel = activeTab === 'daily'
    ? `${sortedDailyUsage.length} days this month`
    : `${sessions.length} sessions this month`;

  return (
    <div className={cn('card overflow-hidden')}>
      <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Session History</h3>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">{tabLabel}</p>
        <div className="mt-4 inline-flex rounded-xl bg-[var(--color-muted)] p-1">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'daily'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            <CalendarDays className="h-4 w-4" />
            Day Wise
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sessions')}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'sessions'
                ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
            )}
          >
            <Layers3 className="h-4 w-4" />
            Sessions
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        {activeTab === 'daily' ? (
          sortedDailyUsage.length === 0 ? (
            <div className="flex h-48 items-center justify-center px-6 py-4">
              <p className="text-[var(--color-muted-foreground)]">No daily usage data available</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-[var(--color-muted)]">
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                    <CalendarDays className="w-4 h-4 inline mr-2" />
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                    <HardDrive className="w-4 h-4 inline mr-2" />
                    Total Usage
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Total Duration
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                    Sessions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {sortedDailyUsage.map((day) => (
                  <tr key={day.dateKey}>
                    <td className="px-6 py-4 text-sm text-[var(--color-foreground)]">
                      {day.fullLabel}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-chart-4)' }}>
                      {formatBytes(day.usage * 1024)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-chart-2)' }}>
                      {formatDuration(day.duration * 60)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--color-muted-foreground)]">
                      {day.sessionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-muted)]">
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)] cursor-pointer"
                  onClick={() => handleSort('sessionStartDate')}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Start Date
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="sessionStartDate" />
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                  End Date
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)] cursor-pointer"
                  onClick={() => handleSort('usageTime')}
                >
                  Duration
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="usageTime" />
                </th>
                <th
                  className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)] cursor-pointer"
                  onClick={() => handleSort('usageVolume')}
                >
                  <HardDrive className="w-4 h-4 inline mr-2" />
                  Usage
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="usageVolume" />
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                  <Wifi className="w-4 h-4 inline mr-2" />
                  IP Address
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-[var(--color-muted-foreground)]">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {sortedSessions.map((session) => (
                <tr key={session.sessionId}>
                  <td className="px-6 py-4 text-sm text-[var(--color-foreground)]">
                    {formatFullDate(session.sessionStartDate)}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-muted-foreground)]">
                    {formatFullDate(session.sessionEndDate)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-chart-2)' }}>
                    {formatDuration(parseFloat(session.usageTime))}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium" style={{ color: 'var(--color-chart-4)' }}>
                    {formatBytes(parseFloat(session.usageVolume))}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-muted-foreground)] font-mono text-xs">
                    {session.ipAddress?.split(' ')[0] || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-muted)]', getTerminationColor(session.terminationCause))}>
                      {session.terminationCause}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
