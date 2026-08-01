import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { fetchUsageData, triggerSync } from '../services/api';
import {
  addressPool,
  buildDays,
  findOutages,
  linkState,
  monthlyTotals,
  normalizeSessions,
  summarize,
  terminationBreakdown,
  weekdayProfile,
} from '../utils/analytics';

export function useExcitelData() {
  const [rawSessions, setRawSessions] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [archive, setArchive] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const hasFallenBack = useRef(false);

  const fetchData = useCallback(async (monthId) => {
    setLoading(true);
    setError(null);

    let nextMonthId = monthId;

    try {
      // A billing month that has only just started carries no sessions yet.
      // On first load, fall back to the most recent month that has records
      // rather than landing the user on an empty page.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await fetchUsageData(nextMonthId);
        if (!result.success) throw new Error(result.error || 'Failed to fetch data');

        const sessions = result.result.sessions || [];
        const monthList = result.result.months || [];

        const index = monthList.findIndex((m) => m.id === nextMonthId);
        const previous = monthList[index + 1];
        const shouldFallBack =
          !hasFallenBack.current && sessions.length === 0 && index !== -1 && previous;

        if (shouldFallBack) {
          hasFallenBack.current = true;
          nextMonthId = previous.id;
          continue;
        }

        setRawSessions(sessions);
        setMonths(monthList);
        setSelectedMonth(nextMonthId);
        setLastUpdated(new Date());
        break;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // The archive backs the month-over-month strip. It is fetched once and is
  // allowed to fail quietly — the rest of the page does not depend on it.
  const fetchArchive = useCallback(async () => {
    try {
      const result = await fetchUsageData('all');
      if (result.success) setArchive(result.result.sessions || []);
    } catch {
      setArchive([]);
    }
  }, []);

  useEffect(() => {
    const now = new Date();
    fetchData(`${now.getMonth() + 1}-${now.getFullYear()}`);
    fetchArchive();
  }, [fetchData, fetchArchive]);

  const changeMonth = useCallback(
    (monthId) => {
      setSelectedMonth(monthId);
      fetchData(monthId);
    },
    [fetchData]
  );

  const refresh = useCallback(async () => {
    if (!selectedMonth) return;
    setSyncing(true);
    setError(null);

    try {
      // "all" is a view, not a billing period — there is nothing to sync.
      if (selectedMonth !== 'all') await triggerSync(selectedMonth);
      await fetchData(selectedMonth);
      await fetchArchive();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  }, [selectedMonth, fetchData, fetchArchive]);

  const analytics = useMemo(() => {
    const rows = normalizeSessions(rawSessions);
    const days = buildDays(rows);
    const outages = findOutages(rows);

    return {
      rows,
      days,
      outages,
      stats: summarize(rows, days, outages),
      weekdays: weekdayProfile(days),
      causes: terminationBreakdown(rows),
      pool: addressPool(rows),
      link: linkState(rows),
    };
  }, [rawSessions]);

  const history = useMemo(
    () => monthlyTotals(normalizeSessions(archive)),
    [archive]
  );

  const selectedMonthTitle = useMemo(
    () => months.find((m) => m.id === selectedMonth)?.title ?? null,
    [months, selectedMonth]
  );

  return {
    ...analytics,
    history,
    months,
    selectedMonth,
    selectedMonthTitle,
    loading,
    syncing,
    lastUpdated,
    error,
    changeMonth,
    refresh,
  };
}
