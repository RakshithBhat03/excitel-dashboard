import {
  differenceInMinutes,
  format,
  isValid,
  parseISO,
} from 'date-fns';

export function formatBytes(mb, decimals = 2) {
  if (mb === 0) return '0 MB';

  const gb = mb / 1024;
  if (gb >= 1) {
    return `${gb.toFixed(decimals)} GB`;
  }
  return `${mb.toFixed(decimals)} MB`;
}

export function formatDuration(minutes) {
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) {
    return `${days.toFixed(1)} days`;
  }
  if (hours >= 1) {
    return `${hours.toFixed(1)} hrs`;
  }
  return `${minutes.toFixed(0)} min`;
}

export function formatDate(dateString) {
  try {
    return format(parseISO(dateString), 'MMM dd, HH:mm');
  } catch {
    return dateString;
  }
}

export function formatFullDate(dateString) {
  try {
    // Dates from Excitel API are already in IST
    return format(parseISO(dateString), 'MMM dd, yyyy HH:mm') + ' IST';
  } catch {
    return dateString;
  }
}

export function calculateStats(sessions) {
  if (!sessions || sessions.length === 0) {
    return {
      totalUsage: 0,
      totalTime: 0,
      avgDaily: 0,
      sessionCount: 0,
      uptimePercent: 0,
    };
  }

  const total = sessions.reduce(
    (acc, curr) => ({
      usageTime: Number(curr.usageTime) + Number(acc.usageTime),
      usageVolume: Number(acc.usageVolume) + Number(curr.usageVolume),
    }),
    { usageTime: 0, usageVolume: 0 }
  );

  const totalTimeHours = total.usageTime / 60;
  const totalDays = totalTimeHours / 24;
  const totalUsageGB = total.usageVolume / 1024;
  const avgDayGB = totalDays > 0 ? totalUsageGB / totalDays : 0;

  // Calculate uptime based on total connected time vs total elapsed time
  // Sessions are ordered newest first, so first session is at the end of array
  const firstSession = sessions[sessions.length - 1];
  const lastSession = sessions[0];

  let uptimePercent = 0;
  if (firstSession && lastSession) {
    try {
      const startDate = parseISO(firstSession.sessionStartDate);
      const endDate = parseISO(lastSession.sessionEndDate);
      // Calculate total period in minutes for precision
      const totalPeriodMinutes = differenceInMinutes(endDate, startDate);
      // total.usageTime is already in minutes (sum of all session durations)
      if (totalPeriodMinutes > 0) {
        uptimePercent = Math.min(100, (total.usageTime / totalPeriodMinutes) * 100);
      }
    } catch {
      uptimePercent = 0;
    }
  }

  return {
    totalUsage: totalUsageGB,
    totalTime: totalTimeHours,
    avgDaily: avgDayGB,
    sessionCount: sessions.length,
    uptimePercent,
  };
}

export function processSessionsForChart(sessions) {
  if (!sessions || sessions.length === 0) return [];

  return sessions
    .slice()
    .reverse()
    .map((session, index) => ({
      name: `Session ${index + 1}`,
      date: formatDate(session.sessionStartDate),
      usage: Number(session.usageVolume) / 1024,
      duration: Number(session.usageTime) / 60,
      fullDate: session.sessionStartDate,
    }));
}

export function aggregateSessionsByDay(sessions) {
  if (!sessions || sessions.length === 0) return [];

  const dailyTotals = new Map();

  sessions.forEach((session) => {
    const startDate = parseISO(session.sessionStartDate);

    if (!isValid(startDate)) {
      return;
    }

    const dateKey = format(startDate, 'yyyy-MM-dd');
    const existingDay = dailyTotals.get(dateKey) ?? {
      dateKey,
      label: format(startDate, 'MMM dd'),
      fullLabel: format(startDate, 'MMM dd, yyyy'),
      usage: 0,
      duration: 0,
      sessionCount: 0,
    };

    existingDay.usage += Number(session.usageVolume) / 1024;
    existingDay.duration += Number(session.usageTime) / 60;
    existingDay.sessionCount += 1;

    dailyTotals.set(dateKey, existingDay);
  });

  return Array.from(dailyTotals.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function getTerminationColor(cause) {
  switch (cause) {
    case 'User Request':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'Session Timeout':
      return 'text-sky-600 dark:text-sky-400';
    case 'Lost Carrier':
      return 'text-amber-600 dark:text-amber-400';
    default:
      return 'text-zinc-500 dark:text-zinc-400';
  }
}
