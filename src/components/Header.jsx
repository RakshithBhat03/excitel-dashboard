import { RefreshCw, Search, Radio } from 'lucide-react';
import { cn } from '../lib/utils';
import ThemeToggle from './ThemeToggle';

export default function Header({ onRefresh, loading, selectedMonthTitle }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <header className="relative">
      {/* Top meta strip — like a newspaper folio */}
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--color-muted-foreground)] pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          <span className="live-dot" aria-hidden />
          <span>Live · {today}</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>Issue №{new Date().getFullYear()}</span>
          <span className="opacity-50">/</span>
          <span>Excitel Telemetry</span>
        </div>
      </div>

      {/* Masthead */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-6 pb-6">
        <div className="flex items-end gap-4">
          {/* Logo mark — bold geometric monogram */}
          <a href="#" className="group relative">
            <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0" aria-hidden>
              <rect x="2" y="2" width="52" height="52" rx="14" fill="var(--color-foreground)"/>
              <path d="M16 18 H40 M16 28 H32 M16 38 H40" stroke="var(--color-background)" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="44" cy="14" r="4" fill="var(--color-brand-primary)"/>
            </svg>
          </a>
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-brand-primary)]">
              The Network Ledger
            </p>
            <h1 className="font-display font-light text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[0.95] text-[var(--color-foreground)] -mt-0.5">
              <span className="italic">Realtime</span> Overview
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)] mt-2 max-w-md">
              {selectedMonthTitle
                ? <>Telemetry from your fibre line · <span className="font-medium text-[var(--color-foreground)]">{selectedMonthTitle}</span></>
                : 'Telemetry from your fibre line, charted with care.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-card)] w-64 shadow-[var(--shadow-paper)]">
            <Search className="w-4 h-4 text-[var(--color-muted-foreground)]" />
            <input
              type="text"
              placeholder="Search sessions, IPs…"
              className="bg-transparent outline-none text-sm placeholder:text-[var(--color-muted-foreground)] w-full"
            />
            <kbd className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-[var(--color-border)] text-[var(--color-muted-foreground)]">⌘K</kbd>
          </div>

          <ThemeToggle />

          <button
            onClick={onRefresh}
            disabled={loading}
            className={cn(
              'group flex items-center gap-2 pl-4 pr-3 h-11 rounded-full',
              'bg-[var(--color-foreground)] text-[var(--color-background)]',
              'shadow-[var(--shadow-paper)] hover:shadow-[var(--shadow-lift)]',
              'transition-all duration-300',
              'disabled:opacity-60'
            )}
          >
            <span className="font-medium text-sm tracking-tight">{loading ? 'Syncing' : 'Sync now'}</span>
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-brand-primary)] text-white">
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} strokeWidth={2.5}/>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
