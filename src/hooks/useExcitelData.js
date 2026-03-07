import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUsageData, triggerSync } from '../services/api';
import {
  aggregateSessionsByDay,
  calculateStats,
  processSessionsForChart,
} from '../utils/formatters';

export function useExcitelData() {
  const [data, setData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [stats, setStats] = useState(null);
  const [sessionChartData, setSessionChartData] = useState([]);
  const [dailyUsageData, setDailyUsageData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isInitialized = useRef(false);

  const fetchData = useCallback(async (monthId) => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchUsageData(monthId);

      if (result.success) {
        setData(result);
        setSessions(result.result.sessions || []);
        setMonths(result.result.months || []);
        setStats(calculateStats(result.result.sessions));
        setSessionChartData(processSessionsForChart(result.result.sessions));
        setDailyUsageData(aggregateSessionsByDay(result.result.sessions));

        if (!isInitialized.current && result.result.months?.length > 0) {
          const currentMonth = result.result.months.find(m => m.current) || result.result.months[0];
          setSelectedMonth(currentMonth.id);
          isInitialized.current = true;
        }
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;
      await fetchData(currentMonthId);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [fetchData]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const changeMonth = useCallback((monthId) => {
    setSelectedMonth(monthId);
    fetchData(monthId);
  }, [fetchData]);

  const refresh = useCallback(async () => {
    if (selectedMonth) {
      try {
        setLoading(true);
        setError(null);

        // "all" is not a real month - skip sync for it
        if (selectedMonth !== 'all') {
          // First, trigger sync from Excitel API
          await triggerSync(selectedMonth);
        }

        // Then fetch the updated data from database
        await fetchData(selectedMonth);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }
  }, [selectedMonth, fetchData]);

  return {
    data,
    sessions,
    months,
    selectedMonth,
    stats,
    sessionChartData,
    dailyUsageData,
    loading,
    error,
    changeMonth,
    refresh,
  };
}
