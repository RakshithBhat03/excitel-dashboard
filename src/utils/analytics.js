import {
  addDays,
  differenceInMinutes,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

/**
 * Everything on the dashboard is derived here, from the session records the
 * backend stores. Nothing is estimated beyond one documented case: a session
 * that spans midnight has its volume split across the days it covers in
 * proportion to the time spent in each. Uptime, gaps and counts are exact.
 */

const MB_PER_GB = 1024;
const MIN_GAP_MINUTES = 1; // shorter than this is the daily re-auth, not an outage

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function parse(value) {
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** Sessions sorted oldest → newest, with parsed dates attached. */
export function normalizeSessions(sessions) {
  return (sessions || [])
    .map((s) => {
      const start = parse(s.sessionStartDate);
      const end = parse(s.sessionEndDate);
      if (!start || !end || end <= start) return null;
      return {
        ...s,
        start,
        end,
        minutes: num(s.usageTime),
        gb: num(s.usageVolume) / MB_PER_GB,
        ip: (s.ipAddress || '').split(' ')[0] || null,
        cause: s.terminationCause || 'Unknown',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

/**
 * One row per calendar day covered by the period, each carrying the minute
 * ranges the line was actually connected. This is what the timeline draws.
 */
export function buildDays(rows) {
  if (!rows.length) return [];

  const first = startOfDay(rows[0].start);
  const last = startOfDay(rows[rows.length - 1].end);
  const days = new Map();

  for (let d = first; d <= last; d = addDays(d, 1)) {
    const key = format(d, 'yyyy-MM-dd');
    days.set(key, {
      dateKey: key,
      date: d,
      label: format(d, 'MMM d'),
      shortLabel: format(d, 'd'),
      fullLabel: format(d, 'EEE, MMM d yyyy'),
      weekday: d.getDay(),
      usage: 0,
      duration: 0,
      connectedMinutes: 0,
      sessionCount: 0,
      spans: [],
    });
  }

  for (const s of rows) {
    const totalMs = s.end - s.start;
    let cursor = s.start;

    while (cursor < s.end) {
      const dayStart = startOfDay(cursor);
      const nextDay = addDays(dayStart, 1);
      const segEnd = nextDay < s.end ? nextDay : s.end;
      const key = format(dayStart, 'yyyy-MM-dd');
      const day = days.get(key);
      if (!day) break;

      const share = (segEnd - cursor) / totalMs;
      const fromMin = differenceInMinutes(cursor, dayStart);
      const toMin = differenceInMinutes(segEnd, dayStart);

      day.usage += s.gb * share;
      day.duration += (s.minutes / 60) * share;
      day.connectedMinutes += toMin - fromMin;
      day.sessionCount += 1;
      day.spans.push({ from: fromMin, to: toMin, cause: s.cause });

      cursor = segEnd;
    }
  }

  return [...days.values()];
}

/** Real breaks in service: the line was down between these two sessions. */
export function findOutages(rows) {
  const outages = [];
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const next = rows[i];
    const minutes = differenceInMinutes(next.start, prev.end);
    if (minutes >= MIN_GAP_MINUTES) {
      outages.push({
        id: `${prev.sessionId}-${next.sessionId}`,
        from: prev.end,
        to: next.start,
        minutes,
        cause: prev.cause,
      });
    }
  }
  return outages.sort((a, b) => b.minutes - a.minutes);
}

export function summarize(rows, days, outages) {
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

  const totalGb = rows.reduce((a, s) => a + s.gb, 0);
  const totalMinutes = rows.reduce((a, s) => a + s.minutes, 0);
  const periodStart = rows[0].start;
  const periodEnd = rows[rows.length - 1].end;
  const spanMinutes = Math.max(1, differenceInMinutes(periodEnd, periodStart));
  const downMinutes = outages.reduce((a, o) => a + o.minutes, 0);

  const active = days.filter((d) => d.sessionCount > 0);
  const sortedUsage = active.map((d) => d.usage).sort((a, b) => a - b);
  const mid = Math.floor(sortedUsage.length / 2);
  const medianDailyGb = sortedUsage.length
    ? sortedUsage.length % 2
      ? sortedUsage[mid]
      : (sortedUsage[mid - 1] + sortedUsage[mid]) / 2
    : 0;

  // Longest unbroken stretch: from the period start (or the end of one outage)
  // to the start of the next outage (or the period end).
  const ordered = [...outages].sort((a, b) => a.from - b.from);
  let runStart = periodStart;
  let longestRunMinutes = 0;
  for (const outage of ordered) {
    longestRunMinutes = Math.max(longestRunMinutes, differenceInMinutes(outage.from, runStart));
    runStart = outage.to;
  }
  longestRunMinutes = Math.max(longestRunMinutes, differenceInMinutes(periodEnd, runStart));

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
    peakDay: active.reduce((m, d) => (!m || d.usage > m.usage ? d : m), null),
    quietDay: active.reduce((m, d) => (!m || d.usage < m.usage ? d : m), null),
    longestSession: rows.reduce((m, s) => (!m || s.minutes > m.minutes ? s : m), null),
    periodStart,
    periodEnd,
    spanMinutes,
    dayCount: active.length,
  };
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Average consumption per weekday — only days with sessions count. */
export function weekdayProfile(days) {
  const buckets = WEEKDAYS.map((name, index) => ({
    index,
    name,
    total: 0,
    days: 0,
    avg: 0,
  }));

  for (const day of days) {
    if (!day.sessionCount) continue;
    const b = buckets[day.weekday];
    b.total += day.usage;
    b.days += 1;
  }

  for (const b of buckets) b.avg = b.days ? b.total / b.days : 0;

  // Weeks read Monday-first here; the ISP's billing week is irrelevant to usage.
  return [...buckets.slice(1), buckets[0]];
}

/** How sessions ended, ranked. Causes map to status, not to chart series. */
export function terminationBreakdown(rows) {
  const counts = new Map();
  for (const s of rows) counts.set(s.cause, (counts.get(s.cause) || 0) + 1);
  return [...counts.entries()]
    .map(([cause, count]) => ({ cause, count, share: count / rows.length }))
    .sort((a, b) => b.count - a.count);
}

/** The CGNAT pool this line lands in — every reconnect draws a new address. */
export function addressPool(rows) {
  const addresses = new Set();
  const subnets = new Map();

  for (const s of rows) {
    if (!s.ip) continue;
    addresses.add(s.ip);
    const parts = s.ip.split('.');
    if (parts.length !== 4) continue;
    const key = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    const cur = subnets.get(key) || { subnet: key, count: 0, gb: 0 };
    cur.count += 1;
    cur.gb += s.gb;
    subnets.set(key, cur);
  }

  const ranked = [...subnets.values()].sort((a, b) => b.count - a.count);
  const prefixes = new Set(
    [...addresses].map((ip) => ip.split('.').slice(0, 2).join('.'))
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
export function monthlyTotals(rows) {
  const months = new Map();

  for (const s of rows) {
    const key = format(s.start, 'yyyy-MM');
    const cur = months.get(key) || {
      key,
      label: format(s.start, 'MMM'),
      fullLabel: format(s.start, 'MMMM yyyy'),
      monthId: `${s.start.getMonth() + 1}-${s.start.getFullYear()}`,
      gb: 0,
      minutes: 0,
      sessions: 0,
    };
    cur.gb += s.gb;
    cur.minutes += s.minutes;
    cur.sessions += 1;
    months.set(key, cur);
  }

  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** Is the line up right now? Derived from the newest session's end time. */
export function linkState(rows) {
  if (!rows.length) return { up: false, label: 'No data', since: null };
  const latest = rows[rows.length - 1];
  const minutesSince = differenceInMinutes(new Date(), latest.end);
  if (minutesSince <= 90) {
    return { up: true, label: 'Link up', since: latest.start, staleMinutes: minutesSince };
  }
  return { up: false, label: 'Awaiting sync', since: latest.end, staleMinutes: minutesSince };
}
