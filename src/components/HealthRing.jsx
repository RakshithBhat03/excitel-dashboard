import { Activity } from 'lucide-react';

/**
 * Circular gauge showing connection uptime % alongside compact health stats.
 * Stroke-dashoffset based ring with editorial typography in the center.
 */
export default function HealthRing({ uptimePercent = 0, sessionCount = 0, totalHours = 0, avgSessionMinutes = 0 }) {
  const pct = Math.max(0, Math.min(100, uptimePercent));
  const r = 64;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - pct / 100);

  let tone = 'var(--color-success)';
  let label = 'Excellent';
  if (pct < 95) { tone = 'var(--color-warning)'; label = 'Good'; }
  if (pct < 80) { tone = 'var(--color-danger)';  label = 'Spotty'; }

  return (
    <div className="card p-6 sm:p-7 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            Connection
          </p>
          <h3 className="font-display text-2xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            <span className="italic">Health</span> index
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em]">
          <span className="live-dot" aria-hidden />
          <span className="text-[var(--color-muted-foreground)]">{label}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center mt-3">
        <svg viewBox="0 0 160 160" width="180" height="180" className="my-2">
          {/* Track */}
          <circle
            cx="80" cy="80" r={r}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="14"
          />
          {/* Filled arc */}
          <circle
            cx="80" cy="80" r={r}
            fill="none"
            stroke={tone}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 80 80)"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)' }}
          />
          {/* Tick marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
            const r1 = 50;
            const r2 = 56;
            const x1 = 80 + Math.cos(angle) * r1;
            const y1 = 80 + Math.sin(angle) * r1;
            const x2 = 80 + Math.cos(angle) * r2;
            const y2 = 80 + Math.sin(angle) * r2;
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--color-border-strong)"
                strokeOpacity={i % 5 === 0 ? 1 : 0.35}
                strokeWidth={i % 5 === 0 ? 1.5 : 1}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <p className="font-mono tracking-tight font-light text-[34px] leading-none text-[var(--color-foreground)]">
            {(() => {
              const [whole, frac] = pct.toFixed(1).split('.');
              return <>{whole}<span className="tracking-[-0.06em]">.</span>{frac}</>;
            })()}
            <span className="text-2xl text-[var(--color-muted-foreground)] ml-0.5">%</span>
          </p>
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] mt-1">
            uptime
          </p>
        </div>
      </div>

      {/* Inline stats */}
      <div className="grid grid-cols-3 gap-3 pt-5 mt-2 border-t border-[var(--color-border)]">
        <Stat label="Sessions" value={sessionCount.toString()} />
        <Stat label="Hours up" value={totalHours.toFixed(0)} />
        <Stat label="Avg sess" value={`${avgSessionMinutes.toFixed(0)}m`} />
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.16em] font-mono text-[var(--color-muted-foreground)]">{label}</p>
      <p className="numeric text-base font-medium text-[var(--color-foreground)] mt-0.5">{value}</p>
    </div>
  );
}
