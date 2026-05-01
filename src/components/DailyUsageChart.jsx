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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { duration, sessionCount } = payload[0].payload;
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-lift)] overflow-hidden min-w-[160px]">
        <div className="px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">{label}</p>
        </div>
        <div className="px-3 py-2.5 space-y-1.5">
          <Row label="Volume" value={`${payload[0].value.toFixed(2)} GB`} dot="var(--color-chart-1)" />
          <Row label="Online" value={`${duration.toFixed(1)} hrs`}    dot="var(--color-chart-2)" />
          <Row label="Sessions" value={`${sessionCount}`}             dot="var(--color-chart-4)" />
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

export default function DailyUsageChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-8 h-[360px] flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)]">No daily usage data available</p>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.usage));

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            By the day
          </p>
          <h3 className="font-display text-2xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            <span className="italic">Daily</span> consumption
          </h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">Peak</p>
          <p className="numeric text-sm font-medium text-[var(--color-foreground)]">{max.toFixed(2)} GB</p>
        </div>
      </div>

      <div className="h-[280px] -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="22%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--color-chart-1)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="bar-fill-peak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="var(--color-chart-3)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke="var(--color-chart-grid)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}`}
              width={28}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.4 }} />
            <Bar dataKey="usage" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.usage === max ? 'url(#bar-fill-peak)' : 'url(#bar-fill)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
