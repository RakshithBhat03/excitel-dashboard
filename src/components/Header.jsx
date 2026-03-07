import { Wifi, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import ThemeToggle from './ThemeToggle';

export default function Header({ onRefresh, loading }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-[var(--color-brand-primary)]/10 border border-[var(--color-brand-primary)]/20 shadow-sm">
          <Wifi className="w-6 h-6 text-[var(--color-brand-primary)]" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
            Overview
          </h1>
          <p className="text-[var(--color-muted-foreground)] text-sm font-medium mt-0.5">Excitel Network Dashboard</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-200',
            'bg-[var(--color-card)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]',
            'border-[var(--color-border)] shadow-sm hover:shadow',
            'disabled:opacity-50 disabled:hover:shadow-none'
          )}
        >
          <RefreshCw className={cn('w-4 h-4', loading ? 'animate-spin' : '')} />
          <span className="font-medium text-sm">Refresh Data</span>
        </button>
      </div>
    </header>
  );
}
