import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) {
  // Define icon styles only - cards are now uniform
  const iconClasses = {
    blue: 'text-[var(--color-card-blue-icon)] bg-[var(--color-card-blue-icon)]/10',
    amber: 'text-[var(--color-card-amber-icon)] bg-[var(--color-card-amber-icon)]/10',
    emerald: 'text-[var(--color-card-emerald-icon)] bg-[var(--color-card-emerald-icon)]/10',
    violet: 'text-[var(--color-card-violet-icon)] bg-[var(--color-card-violet-icon)]/10',
    teal: 'text-[var(--color-card-teal-icon)] bg-[var(--color-card-teal-icon)]/10',
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-rose-500" />;
    return <Minus className="w-4 h-4 text-[var(--color-muted-foreground)]" />;
  };

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-[var(--color-card)] p-6 transition-all duration-300 hover:shadow-lg hover:border-[var(--color-border)]',
        'border-[var(--color-border)]' // Explicit neutral border
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-muted-foreground)] tracking-wide">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-[var(--color-foreground)]">
              {value}
            </span>
          </div>
          {subtitle && (
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-[var(--color-muted-foreground)]">
              {getTrendIcon()}
              <span>{subtitle}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
            iconClasses[color] || iconClasses.blue
          )}>
            <Icon className="h-6 w-6" strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  );
}
