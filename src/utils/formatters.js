import {
  addDays,
  format,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns';

/* ── Presentation ────────────────────────────────────────────────── */

/** Volume, given gigabytes. Rolls up to TB so month totals stay readable. */
export function formatGb(gb, decimals) {
  const value = Number(gb) || 0;
  if (value >= 1024) {
    return { value: (value / 1024).toFixed(decimals ?? 2), unit: 'TB' };
  }
  if (value >= 1) {
    return { value: value.toFixed(decimals ?? (value >= 100 ? 1 : 2)), unit: 'GB' };
  }
  return { value: (value * 1024).toFixed(decimals ?? 0), unit: 'MB' };
}

export function formatGbText(gb, decimals) {
  const { value, unit } = formatGb(gb, decimals);
  return `${value} ${unit}`;
}

/** Duration, given minutes. */
export function formatMinutes(minutes) {
  const m = Math.max(0, Number(minutes) || 0);
  if (m < 1) return { value: Math.round(m * 60).toString(), unit: 'sec' };
  if (m < 60) return { value: m.toFixed(0), unit: 'min' };
  const hours = m / 60;
  if (hours < 48) return { value: hours.toFixed(1), unit: 'hrs' };
  return { value: (hours / 24).toFixed(1), unit: 'days' };
}

export function formatMinutesText(minutes) {
  const { value, unit } = formatMinutes(minutes);
  return `${value} ${unit}`;
}

/** Compact duration for dense table cells: 1d 4h, 23h 59m, 7m. */
export function formatCompactMinutes(minutes) {
  const total = Math.round(Math.max(0, Number(minutes) || 0));
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const mins = total % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m`;
}

/** Timestamps arrive already in IST from the Excitel API. */
export function formatStamp(date) {
  const d = date instanceof Date ? date : parseISO(date);
  return isValid(d) ? format(d, 'dd MMM · HH:mm') : '—';
}

export function formatClock(date) {
  const d = date instanceof Date ? date : parseISO(date);
  return isValid(d) ? format(d, 'HH:mm') : '—';
}

export function formatDay(date) {
  const d = date instanceof Date ? date : parseISO(date);
  return isValid(d) ? format(d, 'EEE, dd MMM yyyy') : '—';
}

/** Minute offset within a day → 04:16. Used by the timeline tooltip. */
export function minuteOfDayToClock(minute) {
  const m = Math.max(0, Math.min(1440, Math.round(minute)));
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function signedPercent(value, decimals = 1) {
  const n = Number(value) || 0;
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(decimals)}%`;
}

/* ── Daily aggregation ───────────────────────────────────────────── */

function splitSessionByDay(session) {
  const startDate = parseISO(session.sessionStartDate);
  const endDate = parseISO(session.sessionEndDate);
  const usageTimeMinutes = Number(session.usageTime);
  const usageVolumeMb = Number(session.usageVolume);

  if (!isValid(startDate) || !isValid(endDate) || endDate <= startDate) {
    return [];
  }

  if (!Number.isFinite(usageTimeMinutes) || !Number.isFinite(usageVolumeMb)) {
    return [];
  }

  const totalDurationMs = endDate.getTime() - startDate.getTime();
  let segmentStart = startDate;
  const segments = [];

  while (segmentStart < endDate) {
    const nextDayStart = addDays(startOfDay(segmentStart), 1);
    const segmentEnd = nextDayStart < endDate ? nextDayStart : endDate;
    const segmentDurationMs = segmentEnd.getTime() - segmentStart.getTime();

    if (segmentDurationMs <= 0) {
      break;
    }

    const share = segmentDurationMs / totalDurationMs;

    segments.push({
      dateKey: format(segmentStart, 'yyyy-MM-dd'),
      label: format(segmentStart, 'MMM dd'),
      fullLabel: format(segmentStart, 'MMM dd, yyyy'),
      usage: (usageVolumeMb / 1024) * share,
      duration: (usageTimeMinutes / 60) * share,
      sessionCount: 1,
    });

    segmentStart = segmentEnd;
  }

  return segments;
}

export function aggregateSessionsByDay(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const dailyTotals = new Map();

  sessions.forEach((session) => {
    splitSessionByDay(session).forEach((segment) => {
      const existingDay = dailyTotals.get(segment.dateKey) ?? {
        dateKey: segment.dateKey,
        label: segment.label,
        fullLabel: segment.fullLabel,
        usage: 0,
        duration: 0,
        sessionCount: 0,
      };

      existingDay.usage += segment.usage;
      existingDay.duration += segment.duration;
      existingDay.sessionCount += segment.sessionCount;

      dailyTotals.set(segment.dateKey, existingDay);
    });
  });

  return Array.from(dailyTotals.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
