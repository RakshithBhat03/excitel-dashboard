import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCompactMinutes, formatGbText } from '../utils/formatters';
import { Empty, Panel, PanelHead, TipRow, TipShell } from './ui';

const VIEWS = [
  { key: 'daily', label: 'Per day' },
  { key: 'cumulative', label: 'Running total' },
];

function DailyTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TipShell title={d.fullLabel}>
      <TipRow label="Data" value={formatGbText(d.usage)} swatch="var(--color-s1)" />
      <TipRow label="Online" value={formatCompactMinutes(d.connectedMinutes)} />
      <TipRow label="Sessions" value={d.sessionCount || '—'} />
    </TipShell>
  );
}

function CumulativeTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <TipShell title={d.fullLabel}>
      <TipRow label="Total so far" value={formatGbText(d.cumulative)} swatch="var(--color-s1)" />
      <TipRow label="Added that day" value={formatGbText(d.usage)} />
    </TipShell>
  );
}

export default function VolumeChart({ days, stats }) {
  const [view, setView] = useState('daily');

  const data = useMemo(
    () =>
      days.reduce((acc, d) => {
        const previous = acc.length ? acc[acc.length - 1].cumulative : 0;
        acc.push({ ...d, cumulative: previous + d.usage });
        return acc;
      }, []),
    [days]
  );

  if (!days.length) {
    return (
      <Panel className="min-h-[360px]">
        <PanelHead label="Data volume" title="How much moved, day by day" />
        <Empty message="No usage recorded for this period yet." />
      </Panel>
    );
  }

  const peak = stats.peakDay?.usage ?? 0;
  const avg = stats.dailyAvgGb;

  return (
    <Panel>
      <PanelHead
        label="Data volume"
        title="How much moved, day by day"
        meta={
          view === 'daily'
            ? `Average ${formatGbText(avg)} a day · median ${formatGbText(stats.medianDailyGb)}`
            : `${formatGbText(stats.totalGb)} across ${stats.dayCount} active days`
        }
      >
        <div className="seg">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              data-on={view === v.key}
              aria-pressed={view === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </PanelHead>

      <div className="flex-1 p-4 pl-1 sm:pl-2">
        <div className="h-[268px]">
          <ResponsiveContainer width="100%" height="100%">
            {view === 'daily' ? (
              <BarChart data={data} margin={{ top: 12, right: 14, left: 4, bottom: 0 }}>
                <CartesianGrid
                  stroke="var(--color-line)"
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-line)"
                  tick={{ fill: 'var(--color-ink-3)' }}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis
                  stroke="var(--color-line)"
                  tick={{ fill: 'var(--color-ink-3)' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => `${v.toFixed(0)}`}
                  label={{
                    value: 'GB',
                    position: 'top',
                    offset: 12,
                    fill: 'var(--color-ink-3)',
                    fontSize: 9.5,
                  }}
                />
                <Tooltip
                  content={<DailyTip />}
                  cursor={{ fill: 'var(--color-inset)' }}
                />
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-ink-3)"
                  strokeDasharray="4 3"
                  strokeWidth={1}
                  label={{
                    value: `avg ${avg.toFixed(0)}`,
                    position: 'right',
                    fill: 'var(--color-ink-3)',
                    fontSize: 9.5,
                  }}
                />
                <Bar dataKey="usage" radius={[4, 4, 0, 0]} maxBarSize={26}>
                  {data.map((d) => (
                    <Cell
                      key={d.dateKey}
                      fill={d.usage === peak ? 'var(--color-s2)' : 'var(--color-s1)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 12, right: 14, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumulative-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-s1)" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="var(--color-s1)" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--color-line)"
                  strokeDasharray="2 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="var(--color-line)"
                  tick={{ fill: 'var(--color-ink-3)' }}
                  tickLine={false}
                  minTickGap={22}
                />
                <YAxis
                  stroke="var(--color-line)"
                  tick={{ fill: 'var(--color-ink-3)' }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  tickFormatter={(v) => `${v.toFixed(0)}`}
                  label={{
                    value: 'GB',
                    position: 'top',
                    offset: 12,
                    fill: 'var(--color-ink-3)',
                    fontSize: 9.5,
                  }}
                />
                <Tooltip
                  content={<CumulativeTip />}
                  cursor={{
                    stroke: 'var(--color-ink-3)',
                    strokeWidth: 1,
                    strokeDasharray: '3 3',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="var(--color-s1)"
                  strokeWidth={2}
                  fill="url(#cumulative-fill)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: 'var(--color-s1)',
                    stroke: 'var(--color-panel)',
                    strokeWidth: 2,
                  }}
                  animationDuration={600}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </Panel>
  );
}
