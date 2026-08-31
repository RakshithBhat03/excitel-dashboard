import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BillingMonthId,
  RawExcitelSession,
  SelectableMonth,
  SelectableMonthId,
} from '../../shared/contracts';
import { getErrorMessage } from '../lib/errors';
import { fetchUsageData, triggerSync } from '../services/api';
import type { UseExcitelDataResult } from '../types/analytics';
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

function getCurrentMonthId(): BillingMonthId {
  const now = new Date();
  return `${now.getMonth() + 1}-${now.getFullYear()}`;
}

export function useExcitelData(): UseExcitelDataResult {
  const [rawSessions, setRawSessions] = useState<RawExcitelSession[]>([]);
  const [months, setMonths] = useState<SelectableMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<SelectableMonthId | null>(null);
  const [archive, setArchive] = useState<RawExcitelSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFallenBack = useRef(false);
  // Guards against an older month request landing after a newer one when the
  // user clicks through the archive faster than the API responds.
  const requestId = useRef(0);

  const fetchData = useCallback(async (monthId: SelectableMonthId): Promise<void> => {
    // loading only gates the very first paint (it starts true and is cleared
    // below). Month switches keep the previous panels mounted and swap data in
    // place; toggling the skeleton here is what caused the flash on each click.
    const request = ++requestId.current;
    setError(null);

    let nextMonthId = monthId;

    try {
      // A billing month that has only just started carries no sessions yet.
      // On first load, fall back to the most recent month that has records
      // rather than landing the user on an empty page.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const result = await fetchUsageData(nextMonthId);
        if (request !== requestId.current) return;
        if (!result.success) throw new Error(result.error || 'Failed to fetch data');

        const sessions = result.result.sessions || [];
        const monthList = result.result.months || [];

        const index = monthList.findIndex((month) => month.id === nextMonthId);
        const previous = index >= 0 ? monthList[index + 1] : undefined;
        const shouldFallBack =
          !hasFallenBack.current && sessions.length === 0 && index !== -1 && previous !== undefined;

        if (shouldFallBack && previous) {
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
    } catch (caught) {
      if (request !== requestId.current) return;
      setError(getErrorMessage(caught));
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  }, []);

  // The archive backs the month-over-month strip. It is fetched once and is
  // allowed to fail quietly — the rest of the page does not depend on it.
  const fetchArchive = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchUsageData('all');
      if (result.success) setArchive(result.result.sessions || []);
    } catch {
      setArchive([]);
    }
  }, []);

  useEffect(() => {
    void fetchData(getCurrentMonthId());
    void fetchArchive();
  }, [fetchData, fetchArchive]);

  const changeMonth = useCallback(
    (monthId: SelectableMonthId): void => {
      setSelectedMonth(monthId);
      void fetchData(monthId);
    },
    [fetchData],
  );

  const refresh = useCallback(async (): Promise<void> => {
    if (selectedMonth === null) return;
    setSyncing(true);
    setError(null);

    try {
      // "all" is a view, not a billing period — there is nothing to sync.
      if (selectedMonth !== 'all') await triggerSync(selectedMonth);
      await fetchData(selectedMonth);
      await fetchArchive();
    } catch (caught) {
      setError(getErrorMessage(caught));
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

  const history = useMemo(() => monthlyTotals(normalizeSessions(archive)), [archive]);

  const selectedMonthTitle = useMemo(
    () => months.find((month) => month.id === selectedMonth)?.title ?? null,
    [months, selectedMonth],
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
