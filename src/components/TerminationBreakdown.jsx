import { useMemo } from 'react';

/**
 * Breakdown of how sessions ended.
 * Renders as a horizontal stacked bar + a sorted legend.
 */
const COLOR_MAP = {
  'User Request':    'var(--color-success)',
  'Session Timeout': 'var(--color-info)',
  'Lost Carrier':    'var(--color-warning)',
};
const FALLBACK_COLOR = 'var(--color-muted-foreground)';

export default function TerminationBreakdown({ sessions = [] }) {
  const data = useMemo(() => {
    if (!sessions?.length) return [];
    const m = new Map();
    for (const s of sessions) {
      const k = s.terminationCause || 'Unknown';
      m.set(k, (m.get(k) || 0) + 1);
    }
    const total = sessions.length;
    return [...m.entries()]
      .map(([cause, count]) => ({
        cause,
        count,
        share: count / total,
        color: COLOR_MAP[cause] || FALLBACK_COLOR,
      }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  if (!data.length) {
    return (
      <div className="card p-6 h-48 flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)] text-sm">No termination data</p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            How sessions ended
          </p>
          <h3 className="font-display text-xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            Termination <span className="italic">causes</span>
          </h3>
        </div>
      </div>

      {/* Stacked bar */}
      <div className="mt-5 flex h-3.5 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-muted)]">
        {data.map((d, i) => (
          <div
            key={d.cause}
            className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${d.share * 100}%`,
              background: d.color,
              opacity: 1 - i * 0.08,
            }}
            title={`${d.cause}: ${d.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 space-y-2.5">
        {data.map(d => (
          <div key={d.cause} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="truncate text-[var(--color-foreground)]">{d.cause}</span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              <span className="numeric text-[var(--color-muted-foreground)] text-xs">
                {(d.share * 100).toFixed(1)}%
              </span>
              <span className="numeric text-[var(--color-foreground)] font-medium text-sm tabular-nums">
                {d.count}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
