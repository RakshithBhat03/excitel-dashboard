import { cn } from '../lib/utils';
import { Sparkline } from './ui';
import type { ReactNode } from 'react';

/**
 * A readout, not a card. Label on top, the number as the whole point, one
 * line of context underneath. No icons — the label already says what it is.
 */
interface MetricTileProps {
  label: string;
  value: string;
  unit: string;
  note: string;
  spark?: number[] | undefined;
  sparkColor?: string | undefined;
  accent?: string | undefined;
  className?: string | undefined;
}

export default function MetricTile({
  label,
  value,
  unit,
  note,
  spark,
  sparkColor = 'var(--color-s1)',
  accent,
  className,
}: MetricTileProps): ReactNode {
  return (
    <div
      className={cn(
        'panel relative px-3.5 pt-3 pb-3 overflow-hidden',
        'transition-colors duration-150 hover:border-[var(--color-line-2)]',
        className
      )}
    >
      {accent && (
        <span
          className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full"
          style={{ background: accent }}
          aria-hidden
        />
      )}

      <p className="label truncate">{label}</p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="readout text-[28px] leading-none font-medium text-[var(--color-ink)]">
          {value}
        </span>
        {unit && (
          <span className="label !text-[10.5px] !text-[var(--color-ink-2)]">{unit}</span>
        )}
      </p>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <p className="text-[11px] leading-tight text-[var(--color-ink-2)] truncate">{note}</p>
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor} />}
      </div>
    </div>
  );
}
