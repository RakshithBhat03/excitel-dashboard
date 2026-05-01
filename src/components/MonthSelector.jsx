import { ChevronDown, Calendar, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

export default function MonthSelector({ months, selectedMonth, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedMonthData = months.find(m => m.id === selectedMonth);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-3 pl-4 pr-3 h-11 rounded-full',
          'bg-[var(--color-card)] text-[var(--color-foreground)]',
          'border border-[var(--color-border)] shadow-[var(--shadow-paper)]',
          'hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lift)]',
          'transition-all duration-200'
        )}
      >
        <Calendar className="w-4 h-4 text-[var(--color-brand-primary)]" />
        <span className="font-medium text-sm">{selectedMonthData?.title || 'Select period'}</span>
        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-muted)]">
          <ChevronDown className={cn('w-3.5 h-3.5 text-[var(--color-muted-foreground)] transition-transform', isOpen ? 'rotate-180' : '')} />
        </span>
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 mt-2 w-72 p-1.5 rounded-2xl shadow-[var(--shadow-lift)]',
          'bg-[var(--color-card)] border border-[var(--color-border)] z-50 max-h-96 overflow-y-auto rise-in'
        )}>
          <p className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            Billing period
          </p>
          {months.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">No months available</div>
          ) : (
            months.map((month) => {
              const isActive = month.id === selectedMonth;
              return (
                <button
                  key={month.id}
                  onClick={() => { onSelect(month.id); setIsOpen(false); }}
                  className={cn(
                    'w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-colors',
                    isActive
                      ? 'bg-[var(--color-brand-primary)]/8 text-[var(--color-foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/60 hover:text-[var(--color-foreground)]'
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full border',
                      isActive
                        ? 'bg-[var(--color-brand-primary)] border-[var(--color-brand-primary)] text-white'
                        : 'border-[var(--color-border)]'
                    )}>
                      {isActive && <Check className="w-3 h-3" />}
                    </span>
                    <span className={cn('text-sm', isActive && 'font-medium')}>{month.title}</span>
                  </span>
                  {month.current && (
                    <span className="pill pill-success !py-0.5 !px-2 !text-[9px]">Live</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
