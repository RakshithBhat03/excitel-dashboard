import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        'px-4 py-3 rounded-lg border shadow-xl',
        'bg-[var(--color-card)] border-[var(--color-border)]'
      )}>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-1">{label}</p>
        <p className="font-semibold text-[var(--color-foreground)]">
          {payload[0].value.toFixed(2)} GB
        </p>
      </div>
    );
  }
  return null;
};

export default function UsageChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('card p-6 h-80 flex items-center justify-center')}>
        <p className="text-[var(--color-muted-foreground)]">No usage data available</p>
      </div>
    );
  }

  const cumulativeData = data.reduce((acc, item, index) => {
    const prevCumulative = index > 0 ? acc[index - 1].cumulativeUsage : 0;
    const newCumulative = Number((prevCumulative + item.usage).toFixed(2));
    return [
      ...acc,
      {
        ...item,
        cumulativeUsage: newCumulative,
      },
    ];
  }, []);

  return (
    <div className={cn('card p-6')}>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">Cumulative Usage</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => `${value.toFixed(1)} GB`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cumulativeUsage"
              stroke="var(--color-chart-1)"
              strokeWidth={2}
              fill="var(--color-chart-1)"
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
