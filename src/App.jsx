import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import { useExcitelData } from './hooks/useExcitelData';

function App() {
  const {
    stats,
    sessions,
    months,
    selectedMonth,
    sessionChartData,
    dailyUsageData,
    loading,
    error,
    changeMonth,
    refresh,
  } = useExcitelData();

  return (
    <ThemeProvider defaultTheme="system" storageKey="excitel-theme">
      <Dashboard
        stats={stats}
        sessions={sessions}
        months={months}
        selectedMonth={selectedMonth}
        sessionChartData={sessionChartData}
        dailyUsageData={dailyUsageData}
        loading={loading}
        error={error}
        onMonthChange={changeMonth}
        onRefresh={refresh}
      />
    </ThemeProvider>
  );
}

export default App;
