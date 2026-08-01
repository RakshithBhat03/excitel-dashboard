import { formatCompactMinutes, formatDay, formatClock } from '../utils/formatters';
import { Empty, Panel, PanelHead } from './ui';

/**
 * Every break in service in the period, longest first. A break is the gap
 * between one session ending and the next beginning — measured, not inferred.
 */
export default function OutageLog({ outages, stats }) {
  return (
    <Panel>
      <PanelHead
        label="Service drops"
        title="When the line was down"
        meta={
          outages.length
            ? `${outages.length} break${outages.length > 1 ? 's' : ''} totalling ${formatCompactMinutes(stats.downMinutes)}`
            : undefined
        }
      >
        {outages.length > 0 && (
          <span className="chip chip-down">{formatCompactMinutes(stats.downMinutes)} off</span>
        )}
      </PanelHead>

      {outages.length === 0 ? (
        <Empty message="The line held for the whole period — no breaks between sessions." />
      ) : (
        <ul className="flex-1 divide-y divide-[var(--color-line)]">
          {outages.slice(0, 8).map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
              <span
                className="h-8 w-[3px] shrink-0 rounded-full bg-[var(--color-down)]"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[var(--color-ink)]">{formatDay(o.from)}</p>
                <p className="num text-[11px] text-[var(--color-ink-2)]">
                  {formatClock(o.from)} → {formatClock(o.to)} · after {o.cause.toLowerCase()}
                </p>
              </div>
              <span className="num shrink-0 text-[13px] font-medium text-[var(--color-down)]">
                {formatCompactMinutes(o.minutes)}
              </span>
            </li>
          ))}
          {outages.length > 8 && (
            <li className="px-4 py-2.5 sm:px-5">
              <p className="label">{outages.length - 8} shorter breaks not shown</p>
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}
