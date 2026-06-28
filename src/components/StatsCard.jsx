import { useId } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Editorial KPI card.
 * - Tiny label + giant numeric reading
 * - Optional sparkline behind the number
 * - Color tone shifts the accent rule
 */
export default function StatsCard({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  trend,
  spark = [],
  tone = 'neutral',
}) {
  const toneVar = {
    neutral: 'var(--color-foreground)',
    coral:   'var(--color-brand-primary)',
    blue:    'var(--color-brand-secondary)',
    emerald: 'var(--color-brand-tertiary)',
    violet:  'var(--color-chart-4)',
    amber:   'var(--color-chart-5)',
  }[tone] || 'var(--color-foreground)';

  return (
    <div className={cn(
      'group relative overflow-hidden rounded-2xl border bg-[var(--color-card)] px-5 pt-5 pb-4',
      'border-[var(--color-border)] transition-all duration-300',
      'hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5'
    )}>
      {/* Top accent rule */}
      <div className="absolute top-0 left-5 right-5 h-px" style={{ background: toneVar, opacity: 0.7 }} />

      {/* Header row: label + icon */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.18em] font-mono text-[var(--color-muted-foreground)]">
          {title}
        </p>
        {Icon && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: `color-mix(in oklab, ${toneVar} 14%, transparent)`, color: toneVar }}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2.4} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span
          className="font-mono tracking-tight font-light text-4xl leading-none text-[var(--color-foreground)]"
          style={{ wordSpacing: '-0.06em' }}
        >
          <DecimalValue value={value} />
        </span>
        {unit && (
          <span className="text-sm font-mono text-[var(--color-muted-foreground)] uppercase tracking-wider">
            {unit}
          </span>
        )}
      </div>

      {/* Sparkline + subtitle */}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--color-muted-foreground)]">
          <TrendBadge trend={trend} />
          <span className="truncate">{subtitle}</span>
        </div>

        {spark && spark.length > 1 && (
          <Sparkline data={spark} color={toneVar} />
        )}
      </div>
    </div>
  );
}

function TrendBadge({ trend }) {
  if (trend === undefined || trend === null) return null;
  if (trend > 0) return <TrendingUp className="w-3.5 h-3.5 text-[var(--color-success)]" />;
  if (trend < 0) return <TrendingDown className="w-3.5 h-3.5 text-[var(--color-danger)]" />;
  return <Minus className="w-3.5 h-3.5 text-[var(--color-muted-foreground)]" />;
}

function DecimalValue({ value }) {
  const parts = String(value).split('.');
  if (parts.length < 2) return value;
  return (
    <>
      {parts[0]}
      <span className="tracking-[-0.06em]">.</span>
      {parts[1]}
    </>
  );
}

function Sparkline({ data, color }) {
  const reactId = useId();
  const W = 88;
  const H = 28;
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return [x, y];
  });

  const pathD = points.map(([x, y], i) =>
    i === 0 ? `M${x.toFixed(1)},${y.toFixed(1)}` : `L${x.toFixed(1)},${y.toFixed(1)}`
  ).join(' ');

  const areaD = `${pathD} L${W},${H} L0,${H} Z`;
  const last = points[points.length - 1];
  const gradId = `spark-${reactId.replace(/:/g, '')}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.2" fill={color} />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} fillOpacity="0.25" />
    </svg>
  );
}
