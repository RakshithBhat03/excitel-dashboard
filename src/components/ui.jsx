import { useId } from 'react';
import { cn } from '../lib/utils';

/* Shared shell pieces. Everything on the page is built from these so the
   panels, headings and tooltips stay identical across charts. */

export function Panel({ className, children, ...rest }) {
  return (
    <section className={cn('panel flex flex-col', className)} {...rest}>
      {children}
    </section>
  );
}

export function PanelHead({ label, title, meta, children }) {
  return (
    <header className="panel-head">
      <div className="min-w-0">
        {label && <p className="label">{label}</p>}
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-ink)] mt-0.5">
          {title}
        </h2>
        {meta && <p className="text-xs text-[var(--color-ink-2)] mt-1">{meta}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
}

/** One tooltip shell for every chart on the page. */
export function TipShell({ title, children }) {
  return (
    <div className="rounded-lg border border-[var(--color-line-2)] bg-[var(--color-panel)] shadow-[var(--shadow-pop)] min-w-[168px] overflow-hidden">
      <p className="label px-2.5 pt-2 pb-1.5 !text-[var(--color-ink-2)]">{title}</p>
      <div className="px-2.5 pb-2 space-y-1">{children}</div>
    </div>
  );
}

export function TipRow({ label, value, swatch }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-ink-2)]">
        {swatch && (
          <span
            className="w-2 h-2 rounded-[2px] shrink-0"
            style={{ background: swatch }}
            aria-hidden
          />
        )}
        {label}
      </span>
      <span className="num text-[11px] font-medium text-[var(--color-ink)]">{value}</span>
    </div>
  );
}

export function Empty({ message, className }) {
  return (
    <div className={cn('flex flex-1 items-center justify-center p-8 text-center', className)}>
      <p className="text-[13px] text-[var(--color-ink-2)]">{message}</p>
    </div>
  );
}

/** Legend swatch + name. Identity is never carried by colour alone. */
export function LegendItem({ color, name, value }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-[2px] shrink-0"
        style={{ background: color }}
        aria-hidden
      />
      <span className="text-[11px] text-[var(--color-ink-2)]">{name}</span>
      {value && <span className="num text-[11px] text-[var(--color-ink)]">{value}</span>}
    </span>
  );
}

export function Sparkline({ data, color = 'var(--color-s1)', width = 76, height = 22 }) {
  const reactId = useId();
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * width,
    height - 2 - ((v - min) / range) * (height - 4),
  ]);

  const line = pts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const gradId = `sp${reactId.replace(/:/g, '')}`;
  const [lx, ly] = pts[pts.length - 1];

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
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r="2" fill={color} />
    </svg>
  );
}
