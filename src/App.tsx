import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './components/Dashboard';
import { useExcitelData } from './hooks/useExcitelData';

function App() {
  const data = useExcitelData();

  return (
    <ThemeProvider defaultTheme="system" storageKey="excitel-theme">
      <Dashboard
        {...data}
        onMonthChange={data.changeMonth}
        onRefresh={data.refresh}
      />
    </ThemeProvider>
  );
}

export default App;
