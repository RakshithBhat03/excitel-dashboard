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
import { cn } from '../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { duration, sessionCount } = payload[0].payload;

    return (
      <div className={cn(
        'px-4 py-3 rounded-lg border shadow-xl',
        'bg-[var(--color-card)] border-[var(--color-border)]'
      )}>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-1">{label}</p>
        <p className="font-semibold text-[var(--color-foreground)]">{payload[0].value.toFixed(2)} GB</p>
        <p className="text-sm" style={{ color: 'var(--color-chart-2)' }}>{duration.toFixed(1)} hrs</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">{sessionCount} sessions</p>
      </div>
    );
  }
  return null;
};

const COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-1)',
  'var(--color-chart-2)',
];

export default function DailyUsageChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('card p-6 h-80 flex items-center justify-center')}>
        <p className="text-[var(--color-muted-foreground)]">No daily usage data available</p>
      </div>
    );
  }

  return (
    <div className={cn('card p-6')}>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">Usage per Day</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis
              dataKey="label"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => `${value.toFixed(1)} GB`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.5 }} />
            <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
