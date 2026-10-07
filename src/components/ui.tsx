import { useId, useLayoutEffect, useRef } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';

/* Shared shell pieces. Everything on the page is built from these so the
   sections, headings and tooltips stay identical across charts. */

export function Panel({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLElement>): ReactNode {
  return (
    <section className={cn('sect flex flex-col', className)} {...rest}>
      {children}
    </section>
  );
}

export interface PanelHeadProps {
  title: string;
  meta?: ReactNode | undefined;
  children?: ReactNode | undefined;
}

/** Title, one line of context, and any controls on the right. No eyebrow. */
export function PanelHead({ title, meta, children }: PanelHeadProps): ReactNode {
  return (
    <header className="mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--color-ink)]">
          {title}
        </h2>
        {meta && (
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-[var(--color-ink-3)]">
            {meta}
          </p>
        )}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </header>
  );
}

/** One tooltip shell for every chart on the page. */
export function TipShell({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <div className="min-w-[184px] overflow-hidden rounded-[10px] border border-[var(--color-line-2)] bg-[var(--color-panel)] shadow-[var(--shadow-pop)]">
      <p className="border-b border-[var(--color-line)] px-3 py-2 text-[12px] font-semibold text-[var(--color-ink)]">
        {title}
      </p>
      <div className="space-y-1.5 px-3 py-2.5">{children}</div>
    </div>
  );
}

export function TipRow({
  label,
  value,
  swatch,
}: {
  label: string;
  value: ReactNode;
  swatch?: string | undefined;
}): ReactNode {
  return (
    <div className="flex items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-[12px] text-[var(--color-ink-2)]">
        {swatch && (
          <span
            className="h-2 w-2 shrink-0 rounded-[2px]"
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span className="num text-[12px] font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

export function Empty({
  message,
  detail,
  icon,
  className,
}: {
  message: string;
  detail?: string | undefined;
  icon?: ReactNode | undefined;
  className?: string | undefined;
}): ReactNode {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-start justify-center gap-2 rounded-[10px] bg-[var(--color-inset)] px-6 py-8',
        className
      )}
    >
      {icon && <span className="text-[var(--color-ink-3)]">{icon}</span>}
      <p className="text-[14px] font-medium text-[var(--color-ink)]">{message}</p>
      {detail && <p className="max-w-[44ch] text-[13px] text-[var(--color-ink-3)]">{detail}</p>}
    </div>
  );
}

/** Legend swatch + name. Identity is never carried by colour alone. */
export function LegendItem({
  color,
  name,
  value,
}: {
  color: string;
  name: string;
  value?: ReactNode | undefined;
}): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[12px] text-[var(--color-ink-2)]">{name}</span>
      {value && <span className="num text-[12px] text-[var(--color-ink)]">{value}</span>}
    </span>
  );
}

/**
 * A number that counts to its value. Runs on a motion value and writes the
 * text node directly, so React never re-renders per frame. Counting from the
 * previous value on a period switch shows what changed; reduced motion jumps.
 */
export function Ticker({
  value,
  decimals = 0,
  pad = 0,
  className,
}: {
  value: number;
  decimals?: number | undefined;
  /** Minimum integer digits, zero-filled: the "05" in 99.05. */
  pad?: number | undefined;
  className?: string | undefined;
}): ReactNode {
  const ref = useRef<HTMLSpanElement | null>(null);
  const from = useRef(0);
  const reduce = useReducedMotion();
  const show = (n: number): string => n.toFixed(decimals).padStart(pad, '0');
  const text = show(value);

  // The text node belongs to this effect alone (React renders no children),
  // and it runs before paint, so the final value never flashes first.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (reduce) {
      node.textContent = text;
      from.current = value;
      return undefined;
    }
    const controls = animate(from.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = show(latest);
      },
    });
    from.current = value;
    return () => controls.stop();
    // show only depends on decimals and pad, both listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals, pad, reduce, text]);

  return (
    <span ref={ref} className={className} role="img" aria-label={text} />
  );
}

export function Sparkline({
  data,
  color = 'var(--color-s1)',
  width = 88,
  height = 26,
}: {
  data?: number[] | undefined;
  color?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
}): ReactNode {
  const reactId = useId();
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((value, index) => [
    (index / (data.length - 1)) * width,
    height - 2 - ((value - min) / range) * (height - 4),
  ] as const);

  const line = points
    .map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const gradId = `sp${reactId.replace(/:/g, '')}`;
  const lastPoint = points[points.length - 1];
  if (!lastPoint) return null;
  const [lastX, lastY] = lastPoint;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} stroke="var(--color-canvas)" strokeWidth="1.5" />
    </svg>
  );
}
