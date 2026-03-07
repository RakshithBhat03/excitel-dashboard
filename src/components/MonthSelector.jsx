import { ChevronDown, Calendar } from 'lucide-react';
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
          'flex items-center gap-3 px-5 py-3 rounded-xl border transition-all duration-200',
          'bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-brand-primary)]',
          'border-[var(--color-border)] shadow-sm hover:shadow-md'
        )}
      >
        <Calendar className="w-5 h-5 text-[var(--color-brand-primary)]" />
        <span className="font-medium">
          {selectedMonthData?.title || 'Select Month'}
        </span>
        <ChevronDown className={cn('w-5 h-5 text-[var(--color-muted-foreground)] transition-transform duration-200', isOpen ? 'rotate-180' : '')} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 mt-2 w-64 py-2 rounded-xl border shadow-lg',
          'bg-[var(--color-card)] border-[var(--color-border)] z-50 max-h-80 overflow-y-auto'
        )}>
          {months.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">No months available</div>
          ) : (
            months.map((month) => (
            <button
              key={month.id}
              onClick={() => {
                onSelect(month.id);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2.5 text-left flex items-center justify-between transition-colors',
                month.id === selectedMonth 
                  ? 'bg-[var(--color-muted)] text-[var(--color-foreground)] font-medium' 
                  : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50 hover:text-[var(--color-foreground)]'
              )}
            >
              <span>{month.title}</span>
              {month.current && (
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  'bg-[var(--color-brand-secondary)]/10 text-[var(--color-brand-secondary)]'
                )}>
                  Current
                </span>
              )}
              </button>
            ))
          )}
        </div>
        )}
      </div>
  );
}
