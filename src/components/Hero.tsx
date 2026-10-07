import type { ReactNode } from 'react';
import type { SelectableMonth, SelectableMonthId } from '../../shared/contracts';
import type { DashboardStats } from '../types/analytics';
import { formatCompactMinutes, formatDay, formatGbText } from '../utils/formatters';
import PeriodSelector from './PeriodSelector';
import { Ticker } from './ui';

/**
 * The top of the page answers two questions before anything else: what period
 * am I looking at, and did the line hold? Left is the period and a one-line
 * account of it; right is uptime, the single number that matters most.
 */
interface HeroProps {
  stats: DashboardStats;
  months: SelectableMonth[];
  selectedMonth: SelectableMonthId | null;
  selectedMonthTitle: string | null;
  loading: boolean;
  onMonthChange: (monthId: SelectableMonthId) => void;
}

function Em({ children }: { children: ReactNode }) {
  return <span className="font-medium text-[var(--color-ink)]">{children}</span>;
}

export default function Hero({
  stats,
  months,
  selectedMonth,
  selectedMonthTitle,
  loading,
  onMonthChange,
}: HeroProps) {
  const hasData = !loading && stats.sessionCount > 0;
  const range =
    stats.periodStart && stats.periodEnd
      ? `${formatDay(stats.periodStart)}  to  ${formatDay(stats.periodEnd)}`
      : 'Reading the line';

  const [wholeText = '0', fracText = '00'] = stats.uptimePercent.toFixed(2).split('.');
  const whole = Number(wholeText);
  const frac = Number(fracText);

  return (
    <section className="grid grid-cols-1 gap-10 pt-10 pb-12 md:pt-14 lg:grid-cols-12 lg:gap-8">
      {/* The entrance animation gives this column its own stacking context,
          which would trap the period menu under the uptime column below it on
          narrow screens. Lift the whole column above its sibling. */}
      <div className="enter relative z-10 lg:col-span-7">
        <p className="num whitespace-pre text-[12px] text-[var(--color-ink-3)]">{range}</p>
        <div className="mt-3">
          <PeriodSelector
            months={months}
            selected={selectedMonth}
            title={selectedMonthTitle}
            onSelect={onMonthChange}
            disabled={loading}
          />
        </div>
        {hasData && (
          <p className="mt-6 max-w-[34ch] text-[19px] leading-[1.5] text-[var(--color-ink-2)] sm:text-[21px]">
            <Em>{formatGbText(stats.totalGb)}</Em> moved across <Em>{stats.sessionCount}</Em>{' '}
            {stats.sessionCount === 1 ? 'session' : 'sessions'} in <Em>{stats.dayCount}</Em>{' '}
            {stats.dayCount === 1 ? 'day' : 'days'}.{' '}
            {stats.outageCount === 0 ? (
              <>The line held the whole way through.</>
            ) : (
              <>
                <Em>
                  {stats.outageCount} {stats.outageCount === 1 ? 'drop' : 'drops'}
                </Em>{' '}
                cost <Em>{formatCompactMinutes(stats.downMinutes)}</Em> offline.
              </>
            )}
          </p>
        )}
      </div>

      {hasData && (
        <div
          className="enter flex flex-col justify-end lg:col-span-5 lg:items-end"
          style={{ animationDelay: '120ms' }}
        >
          <p className="text-[13px] text-[var(--color-ink-3)] lg:text-right">Time connected</p>
          <p className="mt-2 flex items-start text-[var(--color-ink)]">
            <Ticker value={whole} className="figure text-[88px] sm:text-[112px]" />
            <span className="figure text-[88px] text-[var(--color-ink-3)] sm:text-[112px]">.</span>
            <Ticker
              value={frac}
              pad={2}
              className="figure text-[88px] text-[var(--color-ink-3)] sm:text-[112px]"
            />
            <span className="figure mt-2 ml-1 text-[32px] text-[var(--color-s1)] sm:text-[40px]">%</span>
          </p>
          <dl className="mt-6 grid w-full max-w-[420px] grid-cols-3 gap-6">
            {[
              ['Offline', stats.downMinutes ? formatCompactMinutes(stats.downMinutes) : '0m'],
              ['Drops', String(stats.outageCount)],
              ['Longest run', formatCompactMinutes(stats.longestRunMinutes)],
            ].map(([term, value]) => (
              <div key={term} className="border-t border-[var(--color-line-2)] pt-2.5">
                <dt className="text-[12px] text-[var(--color-ink-3)]">{term}</dt>
                <dd className="num mt-1 text-[17px] font-medium text-[var(--color-ink)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
