import { useEffect, useRef, useState } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import type { SelectableMonth, SelectableMonthId } from '../../shared/contracts';
import { cn } from '../lib/utils';

/**
 * The period is the page's headline, so the headline is the picker. Clicking
 * the month title opens the archive list right under it.
 */
interface PeriodSelectorProps {
  months: SelectableMonth[];
  selected: SelectableMonthId | null;
  title: string | null;
  onSelect: (monthId: SelectableMonthId) => void;
  disabled: boolean;
}

export default function PeriodSelector({
  months,
  selected,
  title,
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

  return (
    <div className="relative" ref={ref}>
      <h1>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className="group -ml-1 inline-flex items-center gap-3 rounded-[10px] px-1 text-left disabled:cursor-default"
        >
          <span className="text-[40px] leading-[1.05] font-semibold tracking-[-0.045em] text-[var(--color-ink)] sm:text-[56px]">
            {title ?? 'Reading the line'}
          </span>
          <span
            className={cn(
              'mt-2 grid h-9 w-9 place-items-center rounded-full border border-[var(--color-line-2)] text-[var(--color-ink-2)] transition-all duration-200',
              'group-hover:border-[var(--color-s1)] group-hover:text-[var(--color-s1)]',
              open && 'rotate-180 border-[var(--color-s1)] text-[var(--color-s1)]'
            )}
            aria-hidden
          >
            <CaretDown className="h-4 w-4" weight="bold" />
          </span>
          <span className="sr-only">Change period</span>
        </button>
      </h1>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="absolute left-0 z-50 mt-2 max-h-[380px] w-72 origin-top-left overflow-y-auto rounded-[12px] border border-[var(--color-line-2)] bg-[var(--color-panel)] p-1.5 shadow-[var(--shadow-pop)]"
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
                      'flex w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2.5 text-left text-[14px] transition-colors',
                      active
                        ? 'bg-[var(--color-inset)] font-medium text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-2)] hover:bg-[var(--color-inset)] hover:text-[var(--color-ink)]'
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <Check
                        className={cn('h-4 w-4 text-[var(--color-s1)]', !active && 'opacity-0')}
                        weight="bold"
                      />
                      {month.title}
                    </span>
                    {month.current && (
                      <span className="text-[12px] font-medium text-[var(--color-s1)]">In progress</span>
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
