import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const cum = payload.find(p => p.dataKey === 'cumulativeUsage')?.value ?? 0;
    const day = payload.find(p => p.dataKey === 'usage')?.value ?? 0;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-lift)] overflow-hidden min-w-[160px]">
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
            {label}
          </p>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <Row label="Total" value={`${cum.toFixed(2)} GB`} dot="var(--color-chart-1)" />
          <Row label="That day" value={`${day.toFixed(2)} GB`} dot="var(--color-chart-2)" />
        </div>
      </div>
    );
  }
  return null;
};

const Row = ({ label, value, dot }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
    <span className="numeric text-xs font-medium text-[var(--color-foreground)]">{value}</span>
  </div>
);

export default function UsageChart({ data }) {
  const [view, setView] = useState('cumulative'); // 'cumulative' | 'daily'

  if (!data || data.length === 0) {
    return (
      <div className="card p-8 h-[360px] flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">No usage data available</p>
      </div>
    );
  }

  const cumulativeData = data.reduce((acc, item, index) => {
    const prev = index > 0 ? acc[index - 1].cumulativeUsage : 0;
    return [...acc, { ...item, cumulativeUsage: Number((prev + item.usage).toFixed(2)) }];
  }, []);

  const total = cumulativeData[cumulativeData.length - 1]?.cumulativeUsage ?? 0;
  const peakDay = data.reduce((m, d) => d.usage > (m?.usage ?? 0) ? d : m, null);
  const avg = cumulativeData.length ? total / cumulativeData.length : 0;

  return (
    <div className="card p-6 sm:p-7 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            Usage trend
          </p>
          <h3 className="font-display text-3xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            <span className="italic">Data</span> over time
          </h3>
        </div>

        {/* Inline metric chips embedded in title row, like marketing dashboard */}
        <div className="flex items-center gap-2 flex-wrap">
          <Chip label="Total" value={`${total.toFixed(1)} GB`} dot="var(--color-chart-1)" />
          <Chip label="Avg/day" value={`${avg.toFixed(1)} GB`} dot="var(--color-chart-2)" />
          {peakDay && <Chip label="Peak" value={`${peakDay.usage.toFixed(1)} GB`} dot="var(--color-chart-3)" />}
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between mb-4 mt-4">
        <div className="inline-flex items-center p-0.5 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)] text-xs font-mono">
          {[['cumulative','Cumulative'],['daily','Daily']].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setView(k)}
              className={cn(
                'px-3 py-1.5 rounded-full transition-all',
                view === k
                  ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-[var(--shadow-paper)]'
                  : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] hidden sm:block">
          {data.length} days
        </span>
      </div>

      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulativeData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="trend-fill-2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value.toFixed(0)}`}
              width={32}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'var(--color-foreground)', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            {peakDay && (
              <ReferenceLine
                x={peakDay.label}
                stroke="var(--color-chart-3)"
                strokeDasharray="2 3"
                strokeOpacity={0.5}
              />
            )}
            {view === 'cumulative' ? (
              <Area
                type="monotone"
                dataKey="cumulativeUsage"
                stroke="var(--color-chart-1)"
                strokeWidth={2.5}
                fill="url(#trend-fill)"
                animationDuration={800}
                dot={false}
                activeDot={{ r: 5, fill: 'var(--color-chart-1)', stroke: 'var(--color-card)', strokeWidth: 2 }}
              />
            ) : (
              <Area
                type="monotone"
                dataKey="usage"
                stroke="var(--color-chart-2)"
                strokeWidth={2.5}
                fill="url(#trend-fill-2)"
                animationDuration={800}
                dot={false}
                activeDot={{ r: 5, fill: 'var(--color-chart-2)', stroke: 'var(--color-card)', strokeWidth: 2 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Chip({ label, value, dot }) {
  return (
    <div className="flex items-center gap-2 pl-2.5 pr-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
      <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">{label}</span>
      <span className="numeric text-xs font-medium text-[var(--color-foreground)]">{value}</span>
    </div>
  );
}
