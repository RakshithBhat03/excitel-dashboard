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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className={cn(
        'px-4 py-3 rounded-lg border shadow-xl',
        'bg-[var(--color-card)] border-[var(--color-border)]'
      )}>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-1">{payload[0].payload.date}</p>
        <p className="font-semibold text-[var(--color-foreground)]">{payload[0].value.toFixed(1)} hours</p>
        <p className="text-sm" style={{ color: 'var(--color-chart-4)' }}>{payload[0].payload.usage.toFixed(2)} GB</p>
      </div>
    );
  }
  return null;
};

const COLORS = [
  'var(--color-chart-2)',
  'var(--color-chart-5)',
  'var(--color-chart-1)',
  'var(--color-chart-4)',
  'var(--color-chart-3)',
  'var(--color-chart-2)',
  'var(--color-chart-5)',
];

export default function SessionDurationChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className={cn('card p-6 h-80 flex items-center justify-center')}>
        <p className="text-[var(--color-muted-foreground)]">No session data available</p>
      </div>
    );
  }

  return (
    <div className={cn('card p-6')}>
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">Session Duration</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap="20%">
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--color-border)" 
              opacity={0.5} 
              horizontal={true} 
              vertical={false} 
            />
            <XAxis
              type="number"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => `${value}h`}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="var(--color-muted-foreground)"
              tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--color-border)' }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-muted)', fillOpacity: 0.5 }} />
            <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
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
