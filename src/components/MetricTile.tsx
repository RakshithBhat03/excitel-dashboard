import { cn } from '../lib/utils';
import { Sparkline, Ticker } from './ui';
import type { ReactNode } from 'react';

/**
 * A readout, not a card. Label, the number as the whole point, one line of
 * context. Tiles sit in a row separated by hairlines; no boxes, no icons.
 */
interface MetricTileProps {
  label: string;
  value: string;
  unit: string;
  note: string;
  spark?: number[] | undefined;
  sparkColor?: string | undefined;
  className?: string | undefined;
}

export default function MetricTile({
  label,
  value,
  unit,
  note,
  spark,
  sparkColor = 'var(--color-s1)',
  className,
}: MetricTileProps): ReactNode {
  const numeric = Number(value);
  const decimals = value.includes('.') ? (value.split('.')[1]?.length ?? 0) : 0;

  return (
    <div className={cn('relative min-w-0 border-l border-[var(--color-line)] px-5 py-1', className)}>
      <p className="truncate text-[13px] text-[var(--color-ink-3)]">{label}</p>

      <p className="mt-3 flex items-baseline gap-1.5">
        {Number.isFinite(numeric) ? (
          <Ticker
            value={numeric}
            decimals={decimals}
            className="figure text-[38px] text-[var(--color-ink)]"
          />
        ) : (
          <span className="figure text-[38px] text-[var(--color-ink)]">{value}</span>
        )}
        {unit && <span className="text-[14px] font-medium text-[var(--color-ink-3)]">{unit}</span>}
      </p>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="truncate text-[12.5px] leading-tight text-[var(--color-ink-2)]">{note}</p>
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor} width={64} height={22} />}
      </div>
    </div>
  );
}
