import {
  addDays,
  differenceInMinutes,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { NumericValue, RawExcitelSession } from '../../shared/contracts';
import type {
  AddressPoolSummary,
  DashboardStats,
  DailySummary,
  CurrentLinkState,
  MonthlyHistoryEntry,
  NormalizedSession,
  Outage,
  SubnetSummary,
  TerminationCauseSummary,
  WeekdayProfile,
} from '../types/analytics';

/**
 * Everything on the dashboard is derived here, from the session records the
 * backend stores. Nothing is estimated beyond one documented case: a session
 * that spans midnight has its volume split across the days it covers in
 * proportion to the time spent in each. Uptime, gaps and counts are exact.
 */

const MB_PER_GB = 1024;
const MIN_GAP_MINUTES = 1;

function num(value: NumericValue | null | undefined): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function parse(value: string): Date | null {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

/** Sessions sorted oldest → newest, with parsed dates attached. */
export function normalizeSessions(sessions: RawExcitelSession[] = []): NormalizedSession[] {
  return sessions
    .map((session): NormalizedSession | null => {
      const start = parse(session.sessionStartDate);
      const end = parse(session.sessionEndDate);
      if (!start || !end || end <= start) return null;
      return {
        ...session,
        start,
        end,
        minutes: num(session.usageTime),
        gb: num(session.usageVolume) / MB_PER_GB,
        ip: session.ipAddress?.split(' ')[0] || null,
        cause: session.terminationCause || 'Unknown',
      };
    })
    .filter((session): session is NormalizedSession => session !== null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * One row per calendar day covered by the period, each carrying the minute
 * ranges the line was actually connected. This is what the timeline draws.
 */
export function buildDays(rows: NormalizedSession[]): DailySummary[] {
  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  if (!firstRow || !lastRow) return [];

  const first = startOfDay(firstRow.start);
  const last = startOfDay(lastRow.end);
  const days = new Map<string, DailySummary>();

  for (let date = first; date <= last; date = addDays(date, 1)) {
    const key = format(date, 'yyyy-MM-dd');
    days.set(key, {
      dateKey: key,
      date,
      label: format(date, 'MMM d'),
      shortLabel: format(date, 'd'),
      fullLabel: format(date, 'EEE, MMM d yyyy'),
      weekday: date.getDay(),
      usage: 0,
      duration: 0,
      connectedMinutes: 0,
      sessionCount: 0,
      spans: [],
    });
  }

  for (const session of rows) {
    const totalMs = session.end.getTime() - session.start.getTime();
    let cursor = session.start;

    while (cursor < session.end) {
      const dayStart = startOfDay(cursor);
      const nextDay = addDays(dayStart, 1);
      const segmentEnd = nextDay < session.end ? nextDay : session.end;
      const key = format(dayStart, 'yyyy-MM-dd');
      const day = days.get(key);
      if (!day) break;

      const share = (segmentEnd.getTime() - cursor.getTime()) / totalMs;
      const fromMin = differenceInMinutes(cursor, dayStart);
      const toMin = differenceInMinutes(segmentEnd, dayStart);

      day.usage += session.gb * share;
      day.duration += (session.minutes / 60) * share;
      day.connectedMinutes += toMin - fromMin;
      day.sessionCount += 1;
      day.spans.push({ from: fromMin, to: toMin, cause: session.cause });

      cursor = segmentEnd;
    }
  }

  return [...days.values()];
}

/** Real breaks in service: the line was down between these two sessions. */
export function findOutages(rows: NormalizedSession[]): Outage[] {
  const outages: Outage[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const next = rows[index];
    if (!previous || !next) continue;
    const minutes = differenceInMinutes(next.start, previous.end);
    if (minutes >= MIN_GAP_MINUTES) {
      outages.push({
        id: `${previous.sessionId}-${next.sessionId}`,
        from: previous.end,
        to: next.start,
        minutes,
        cause: previous.cause,
      });
    }
  }
  return outages.sort((a, b) => b.minutes - a.minutes);
}

export function summarize(
  rows: NormalizedSession[],
  days: DailySummary[],
  outages: Outage[],
): DashboardStats {
  if (!rows.length) {
    return {
      totalGb: 0,
      totalMinutes: 0,
      dailyAvgGb: 0,
      sessionCount: 0,
      uptimePercent: 0,
      downMinutes: 0,
      outageCount: 0,
      peakDay: null,
      quietDay: null,
      longestSession: null,
      longestRunMinutes: 0,
      periodStart: null,
      periodEnd: null,
      spanMinutes: 0,
      medianDailyGb: 0,
      dayCount: 0,
    };
  }

  const firstRow = rows[0];
  const lastRow = rows[rows.length - 1];
  if (!firstRow || !lastRow) return summarize([], [], []);

  const totalGb = rows.reduce((total, session) => total + session.gb, 0);
  const totalMinutes = rows.reduce((total, session) => total + session.minutes, 0);
  const periodStart = firstRow.start;
  const periodEnd = lastRow.end;
  const spanMinutes = Math.max(1, differenceInMinutes(periodEnd, periodStart));
  const downMinutes = outages.reduce((total, outage) => total + outage.minutes, 0);

  const active = days.filter((day) => day.sessionCount > 0);
  const sortedUsage = active.map((day) => day.usage).sort((a, b) => a - b);
  const middle = Math.floor(sortedUsage.length / 2);
  const middleValue = sortedUsage[middle] ?? 0;
  const medianDailyGb = sortedUsage.length
    ? sortedUsage.length % 2
      ? middleValue
      : ((sortedUsage[middle - 1] ?? 0) + middleValue) / 2
    : 0;

  const ordered = [...outages].sort((a, b) => a.from.getTime() - b.from.getTime());
  let runStart = periodStart;
  let longestRunMinutes = 0;
  for (const outage of ordered) {
    longestRunMinutes = Math.max(
      longestRunMinutes,
      differenceInMinutes(outage.from, runStart),
    );
    runStart = outage.to;
  }
  longestRunMinutes = Math.max(
    longestRunMinutes,
    differenceInMinutes(periodEnd, runStart),
  );

  const peakDay = active.reduce<DailySummary | null>(
    (best, day) => (!best || day.usage > best.usage ? day : best),
    null,
  );
  const quietDay = active.reduce<DailySummary | null>(
    (best, day) => (!best || day.usage < best.usage ? day : best),
    null,
  );
  const longestSession = rows.reduce<NormalizedSession | null>(
    (longest, session) => (!longest || session.minutes > longest.minutes ? session : longest),
    null,
  );

  return {
    totalGb,
    totalMinutes,
    longestRunMinutes,
    dailyAvgGb: active.length ? totalGb / active.length : 0,
    medianDailyGb,
    sessionCount: rows.length,
    uptimePercent: Math.min(100, (totalMinutes / spanMinutes) * 100),
    downMinutes,
    outageCount: outages.length,
    peakDay,
    quietDay,
    longestSession,
    periodStart,
    periodEnd,
    spanMinutes,
    dayCount: active.length,
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Average consumption per weekday — only days with sessions count. */
export function weekdayProfile(days: DailySummary[]): WeekdayProfile[] {
  const buckets: WeekdayProfile[] = WEEKDAYS.map((name, index) => ({
    index,
    name,
    total: 0,
    days: 0,
    avg: 0,
  }));

  for (const day of days) {
    if (!day.sessionCount) continue;
    const bucket = buckets[day.weekday];
    if (!bucket) continue;
    bucket.total += day.usage;
    bucket.days += 1;
  }

  for (const bucket of buckets) bucket.avg = bucket.days ? bucket.total / bucket.days : 0;

  return [...buckets.slice(1), buckets[0]].filter(
    (bucket): bucket is WeekdayProfile => bucket !== undefined,
  );
}

/** How sessions ended, ranked. Causes map to status, not to chart series. */
export function terminationBreakdown(rows: NormalizedSession[]): TerminationCauseSummary[] {
  const counts = new Map<string, number>();
  for (const session of rows) {
    counts.set(session.cause, (counts.get(session.cause) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([cause, count]) => ({ cause, count, share: rows.length ? count / rows.length : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** The CGNAT pool this line lands in — every reconnect draws a new address. */
export function addressPool(rows: NormalizedSession[]): AddressPoolSummary {
  const addresses = new Set<string>();
  const subnets = new Map<string, SubnetSummary>();

  for (const session of rows) {
    if (!session.ip) continue;
    addresses.add(session.ip);
    const parts = session.ip.split('.');
    const first = parts[0];
    const second = parts[1];
    const third = parts[2];
    if (parts.length !== 4 || first === undefined || second === undefined || third === undefined) {
      continue;
    }
    const key = `${first}.${second}.${third}.0/24`;
    const current = subnets.get(key) ?? { subnet: key, count: 0, gb: 0 };
    current.count += 1;
    current.gb += session.gb;
    subnets.set(key, current);
  }

  const ranked = [...subnets.values()].sort((a, b) => b.count - a.count);
  const prefixes = new Set(
    [...addresses]
      .map((ip) => ip.split('.').slice(0, 2).join('.'))
      .filter((prefix) => prefix.length > 0),
  );

  return {
    uniqueAddresses: addresses.size,
    reuseRate: addresses.size ? rows.length / addresses.size : 0,
    subnets: ranked,
    subnetCount: ranked.length,
    prefixes: [...prefixes].sort(),
  };
}

/** Month-by-month totals across the whole archive. */
export function monthlyTotals(rows: NormalizedSession[]): MonthlyHistoryEntry[] {
  const months = new Map<string, MonthlyHistoryEntry>();

  for (const session of rows) {
    const key = format(session.start, 'yyyy-MM');
    const current = months.get(key) ?? {
      key,
      label: format(session.start, 'MMM'),
      fullLabel: format(session.start, 'MMMM yyyy'),
      monthId: `${session.start.getMonth() + 1}-${session.start.getFullYear()}`,
      gb: 0,
      minutes: 0,
      sessions: 0,
    };
    current.gb += session.gb;
    current.minutes += session.minutes;
    current.sessions += 1;
    months.set(key, current);
  }

  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Is the line up right now? Derived from the newest session's end time. */
export function linkState(rows: NormalizedSession[]): CurrentLinkState {
  const latest = rows[rows.length - 1];
  if (!latest) return { up: false, label: 'No data', since: null };
  const minutesSince = differenceInMinutes(new Date(), latest.end);
  if (minutesSince <= 90) {
    return { up: true, label: 'Link up', since: latest.start, staleMinutes: minutesSince };
  }
  return { up: false, label: 'Awaiting sync', since: latest.end, staleMinutes: minutesSince };
}
