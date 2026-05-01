import { useState, useMemo, memo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  HardDrive,
  Wifi,
  AlertCircle,
  CalendarDays,
  Layers3,
  Search,
} from 'lucide-react';
import { formatFullDate, formatBytes, formatDuration } from '../utils/formatters';
import { cn } from '../lib/utils';

const SortIcon = memo(({ sortField, sortDirection, field }) => {
  if (sortField !== field) return <span className="opacity-25">↕</span>;
  return sortDirection === 'asc' ? (
    <ChevronUp className="w-3.5 h-3.5 inline ml-1 text-[var(--color-brand-primary)]" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 inline ml-1 text-[var(--color-brand-primary)]" />
  );
});
SortIcon.displayName = 'SortIcon';

function statusPillClass(cause) {
  switch (cause) {
    case 'User Request':    return 'pill pill-success';
    case 'Session Timeout': return 'pill pill-info';
    case 'Lost Carrier':    return 'pill pill-warn';
    default:                return 'pill';
  }
}

/**
 * Visual usage-bar showing this row's usage relative to the day's max.
 * Adds an at-a-glance heatmap feel without extra columns.
 */
function UsageBar({ value, max, color = 'var(--color-chart-1)' }) {
  const pct = Math.max(0.04, Math.min(1, value / (max || 1)));
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--color-muted)] overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function SessionsTable({ sessions, dailyUsageData }) {
  const [activeTab, setActiveTab] = useState('daily');
  const [sortField, setSortField] = useState('sessionStartDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [query, setQuery] = useState('');

  const hasSessions = sessions && sessions.length > 0;
  const hasDailyUsage = dailyUsageData && dailyUsageData.length > 0;

  const sortedSessions = useMemo(() => {
    let rows = [...(sessions || [])];
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter(s =>
        (s.ipAddress || '').toLowerCase().includes(q) ||
        (s.terminationCause || '').toLowerCase().includes(q) ||
        (s.sessionStartDate || '').toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      let aV = a[sortField], bV = b[sortField];
      if (sortField === 'usageVolume' || sortField === 'usageTime') {
        aV = parseFloat(aV); bV = parseFloat(bV);
      }
      return sortDirection === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
    });
    return rows;
  }, [sessions, sortField, sortDirection, query]);

  const sortedDailyUsage = useMemo(() => {
    return [...(dailyUsageData || [])].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [dailyUsageData]);

  const maxSessionVol = useMemo(
    () => Math.max(1, ...sortedSessions.map(s => parseFloat(s.usageVolume) || 0)),
    [sortedSessions]
  );
  const maxDailyVol = useMemo(
    () => Math.max(1, ...sortedDailyUsage.map(d => d.usage)),
    [sortedDailyUsage]
  );

  if (!hasSessions && !hasDailyUsage) {
    return (
      <div className="card p-6 flex items-center justify-center h-48">
        <p className="text-[var(--color-muted-foreground)]">No sessions found</p>
      </div>
    );
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const tabLabel = activeTab === 'daily'
    ? `${sortedDailyUsage.length} entries`
    : `${sortedSessions.length} of ${sessions.length} sessions`;

  return (
    <div className="card overflow-hidden">
      {/* Ledger header */}
      <div className="px-6 sm:px-7 pt-6 pb-4 border-b border-[var(--color-border)] flex flex-wrap gap-4 items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            The ledger
          </p>
          <h3 className="font-display text-2xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            <span className="italic">Session</span> history
          </h3>
          <p className="text-[11px] font-mono text-[var(--color-muted-foreground)] mt-1">{tabLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'sessions' && (
            <div className="flex items-center gap-2 px-3 h-9 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] w-56">
              <Search className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Filter IPs, status…"
                className="bg-transparent outline-none text-xs placeholder:text-[var(--color-muted-foreground)] w-full"
              />
            </div>
          )}
          <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)] text-xs font-mono">
            <button
              onClick={() => setActiveTab('daily')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all',
                activeTab === 'daily'
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-[var(--shadow-paper)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Day-wise
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all',
                activeTab === 'sessions'
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-[var(--shadow-paper)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              <Layers3 className="w-3.5 h-3.5" /> Sessions
            </button>
          </div>
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
                <tr className="text-left text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                  <th className="px-6 sm:px-7 py-3 font-medium">
                    <CalendarDays className="w-3.5 h-3.5 inline mr-1.5" /> Date
                  </th>
                  <th className="px-4 py-3 font-medium">
                    <HardDrive className="w-3.5 h-3.5 inline mr-1.5" /> Volume
                  </th>
                  <th className="px-4 py-3 font-medium">Distribution</th>
                  <th className="px-4 py-3 font-medium">
                    <Clock className="w-3.5 h-3.5 inline mr-1.5" /> Online
                  </th>
                  <th className="px-6 sm:px-7 py-3 font-medium text-right">Sessions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDailyUsage.map((day, i) => (
                  <tr
                    key={day.dateKey}
                    className={cn(
                      'border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-muted)]/40',
                      i === 0 && 'bg-[var(--color-brand-primary)]/5'
                    )}
                  >
                    <td className="px-6 sm:px-7 py-3.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-[var(--color-foreground)] font-medium">{day.fullLabel}</span>
                        {i === 0 && <span className="text-[9px] font-mono uppercase tracking-[0.16em] text-[var(--color-brand-primary)]">Latest</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 numeric text-sm font-medium text-[var(--color-foreground)]">
                      {formatBytes(day.usage * 1024)}
                    </td>
                    <td className="px-4 py-3.5">
                      <UsageBar value={day.usage} max={maxDailyVol} color="var(--color-chart-1)" />
                    </td>
                    <td className="px-4 py-3.5 numeric text-sm text-[var(--color-foreground)]">
                      {formatDuration(day.duration * 60)}
                    </td>
                    <td className="px-6 sm:px-7 py-3.5 text-right numeric text-sm text-[var(--color-muted-foreground)]">
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
              <tr className="text-left text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
                <th
                  className="px-6 sm:px-7 py-3 font-medium cursor-pointer select-none hover:text-[var(--color-foreground)]"
                  onClick={() => handleSort('sessionStartDate')}
                >
                  <Clock className="w-3.5 h-3.5 inline mr-1.5" /> Started
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="sessionStartDate" />
                </th>
                <th className="px-4 py-3 font-medium">Ended</th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer select-none hover:text-[var(--color-foreground)]"
                  onClick={() => handleSort('usageTime')}
                >
                  Duration
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="usageTime" />
                </th>
                <th
                  className="px-4 py-3 font-medium cursor-pointer select-none hover:text-[var(--color-foreground)]"
                  onClick={() => handleSort('usageVolume')}
                >
                  <HardDrive className="w-3.5 h-3.5 inline mr-1.5" /> Volume
                  <SortIcon sortField={sortField} sortDirection={sortDirection} field="usageVolume" />
                </th>
                <th className="px-4 py-3 font-medium">Share</th>
                <th className="px-4 py-3 font-medium">
                  <Wifi className="w-3.5 h-3.5 inline mr-1.5" /> IP
                </th>
                <th className="px-6 sm:px-7 py-3 font-medium text-right">
                  <AlertCircle className="w-3.5 h-3.5 inline mr-1.5" /> Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center px-6 py-8 text-[var(--color-muted-foreground)] text-sm">
                    No matches.
                  </td>
                </tr>
              ) : sortedSessions.map((session) => {
                const vol = parseFloat(session.usageVolume) || 0;
                return (
                  <tr key={session.sessionId} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-muted)]/40">
                    <td className="px-6 sm:px-7 py-3.5 text-sm text-[var(--color-foreground)] whitespace-nowrap">
                      {formatFullDate(session.sessionStartDate)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[var(--color-muted-foreground)] whitespace-nowrap">
                      {formatFullDate(session.sessionEndDate)}
                    </td>
                    <td className="px-4 py-3.5 numeric text-sm text-[var(--color-foreground)]">
                      {formatDuration(parseFloat(session.usageTime))}
                    </td>
                    <td className="px-4 py-3.5 numeric text-sm font-medium text-[var(--color-foreground)]">
                      {formatBytes(vol)}
                    </td>
                    <td className="px-4 py-3.5">
                      <UsageBar value={vol} max={maxSessionVol} />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[var(--color-muted-foreground)]">
                      {session.ipAddress?.split(' ')[0] || '—'}
                    </td>
                    <td className="px-6 sm:px-7 py-3.5 text-right">
                      <span className={statusPillClass(session.terminationCause)}>
                        {session.terminationCause || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
