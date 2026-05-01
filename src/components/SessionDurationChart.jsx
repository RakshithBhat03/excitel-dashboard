import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

/**
 * Distribution histogram of session durations (in hours).
 * Shows how sessions are spread across short/medium/long buckets — way more
 * insight than a per-session bar chart for long lists.
 */
const BUCKETS = [
  { key: '<5m',     min: 0,        max: 5/60,  label: '< 5 min' },
  { key: '5-30m',   min: 5/60,     max: 0.5,   label: '5–30 min' },
  { key: '30m-2h',  min: 0.5,      max: 2,     label: '30 min – 2 h' },
  { key: '2-6h',    min: 2,        max: 6,     label: '2–6 h' },
  { key: '6-12h',   min: 6,        max: 12,    label: '6–12 h' },
  { key: '12-24h',  min: 12,       max: 24,    label: '12–24 h' },
  { key: '>1d',     min: 24,       max: Infinity, label: '> 1 day' },
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-lift)] overflow-hidden min-w-[160px]">
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">{p.label}</p>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--color-muted-foreground)]">Sessions</span>
            <span className="numeric font-medium text-[var(--color-foreground)]">{p.count}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--color-muted-foreground)]">Volume</span>
            <span className="numeric font-medium text-[var(--color-foreground)]">{p.volume.toFixed(2)} GB</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function SessionDurationChart({ data }) {
  const histogram = useMemo(() => {
    if (!data || !data.length) return [];
    const buckets = BUCKETS.map(b => ({ ...b, count: 0, volume: 0 }));
    for (const s of data) {
      const hours = Number(s.duration);
      const vol = Number(s.usage);
      const b = buckets.find(b => hours >= b.min && hours < b.max);
      if (b) { b.count += 1; b.volume += vol; }
    }
    return buckets;
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="card p-8 h-[260px] flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">No session data available</p>
      </div>
    );
  }

  const total = histogram.reduce((s, b) => s + b.count, 0);
  const maxBucket = histogram.reduce((m, b) => b.count > (m?.count ?? -1) ? b : m, null);

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            Session shape
          </p>
          <h3 className="font-display text-2xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            <span className="italic">Duration</span> distribution
          </h3>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Most sessions are <span className="font-medium text-[var(--color-foreground)]">{maxBucket?.label}</span>
        </p>
      </div>

      <div className="h-[220px] -mx-2 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="hist-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--color-chart-2)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="hist-fill-active" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--color-chart-1)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="key"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.4 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {histogram.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry === maxBucket ? 'url(#hist-fill-active)' : 'url(#hist-fill)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-muted-foreground)] mt-3 text-right">
        n = {total}
      </p>
    </div>
  );
}
