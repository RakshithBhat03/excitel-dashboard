import { ArrowUpRight } from 'lucide-react';

function TightDecimal({ str }) {
  const dotIndex = str.indexOf('.');
  if (dotIndex === -1) return str;
  return (
    <>
      {str.slice(0, dotIndex)}
      <span className="tracking-[-0.06em]">.</span>
      {str.slice(dotIndex + 1)}
    </>
  );
}

/**
 * Marquee ticker showing key telemetry across the top, like a stock ribbon.
 */
export default function Ticker({ items = [] }) {
  if (!items.length) return null;

  // duplicate so the marquee loop is seamless
  const reel = [...items, ...items];

  return (
    <div className="relative overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-card)]/60 backdrop-blur">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(90deg, var(--color-background), transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
           style={{ background: 'linear-gradient(270deg, var(--color-background), transparent)' }} />
      <div className="ticker-track flex gap-10 py-2.5 whitespace-nowrap">
        {reel.map((it, i) => (
          <div key={i} className="flex items-center gap-2.5 text-xs font-mono">
            <span className="uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
              {it.label}
            </span>
            <span className="text-[var(--color-foreground)] font-medium">
              <TightDecimal str={it.value} />
            </span>
            {it.delta !== undefined && (
              <span className={
                it.delta > 0 ? 'text-[var(--color-success)] flex items-center'
                : it.delta < 0 ? 'text-[var(--color-danger)] flex items-center'
                : 'text-[var(--color-muted-foreground)]'
              }>
                <ArrowUpRight className={`w-3 h-3 ${it.delta < 0 ? 'rotate-90' : ''}`} />
                <TightDecimal str={`${Math.abs(it.delta).toFixed(1)}%`} />
              </span>
            )}
            <span className="text-[var(--color-border-strong)]">·</span>
          </div>
        ))}
      </div>
    </div>
  );
}
