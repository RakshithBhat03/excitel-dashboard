import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { SelectableMonth, SelectableMonthId } from '../../shared/contracts';
import { cn } from '../lib/utils';

interface PeriodSelectorProps {
  months: SelectableMonth[];
  selected: SelectableMonthId | null;
  onSelect: (monthId: SelectableMonthId) => void;
  disabled: boolean;
}

export default function PeriodSelector({
  months,
  selected,
  onSelect,
  disabled,
}: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent): void => {
      if (
        ref.current &&
        event.target instanceof Node &&
        !ref.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const current = months.find((m) => m.id === selected);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="btn min-w-[140px] justify-between"
      >
        <span className="num text-[12px]">{current?.title ?? 'Select period'}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-[var(--color-ink-3)] transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="enter absolute right-0 z-50 mt-1.5 w-60 max-h-[340px] overflow-y-auto rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-pop)]"
        >
          {months.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-[var(--color-ink-2)]">
              No periods available yet.
            </p>
          ) : (
            months.map((month) => {
              const active = month.id === selected;
              return (
                <button
                  key={month.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onSelect(month.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                    active
                      ? 'bg-[var(--color-inset)] text-[var(--color-ink)] font-medium'
                      : 'text-[var(--color-ink-2)] hover:bg-[var(--color-inset)] hover:text-[var(--color-ink)]'
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Check
                      className={cn(
                        'w-3.5 h-3.5 text-[var(--color-s1)]',
                        !active && 'opacity-0'
                      )}
                    />
                    {month.title}
                  </span>
                  {month.current && <span className="chip chip-up">Live</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
