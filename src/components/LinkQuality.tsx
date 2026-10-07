import { CheckCircle, Warning } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { formatCompactMinutes } from '../utils/formatters';
import type { DashboardStats, TerminationCauseSummary } from '../types/analytics';
import { Empty, Panel, PanelHead } from './ui';

/** Causes that mean the line dropped on its own, rather than re-authenticating. */
const FAULTS = new Set(['Lost Carrier', 'NAS Error', 'NAS Reboot', 'Port Error']);

function causeStyle(cause: string): { color: string; Glyph: Icon; note: string } {
  if (FAULTS.has(cause)) {
    return { color: 'var(--color-down)', Glyph: Warning, note: 'Line dropped' };
  }
  return { color: 'var(--color-s1)', Glyph: CheckCircle, note: 'Normal reconnect' };
}

interface LinkQualityProps {
  stats: DashboardStats;
  causes: TerminationCauseSummary[];
}

/**
 * Uptime itself lives in the hero. This section explains it: how each
 * session ended, split into normal reconnects and real faults.
 */
export default function LinkQuality({ stats, causes }: LinkQualityProps) {
  if (!stats.sessionCount) {
    return (
      <Panel>
        <PanelHead title="How sessions ended" />
        <Empty message="Nothing to measure yet." />
      </Panel>
    );
  }

  const faults = causes.filter((c) => FAULTS.has(c.cause)).reduce((n, c) => n + c.count, 0);

  return (
    <Panel>
      <PanelHead
        title="How sessions ended"
        meta={
          faults
            ? `${faults} of ${stats.sessionCount} sessions ended in a fault.`
            : `All ${stats.sessionCount} sessions ended normally.`
        }
      />

      <p className="text-[13px] text-[var(--color-ink-3)]">Longest unbroken run</p>
      <p className="figure mt-2 text-[44px] text-[var(--color-ink)]">
        {formatCompactMinutes(stats.longestRunMinutes)}
      </p>

      {/* One bar, one segment per cause, 2px surface gaps between them */}
      <div className="mt-6 flex h-3 w-full gap-[2px]" aria-hidden>
        {causes.map((c) => (
          <span
            key={c.cause}
            className="h-full rounded-[2px] first:rounded-l-[3px] last:rounded-r-[3px]"
            style={{ flexGrow: c.share, flexBasis: 0, minWidth: 3, background: causeStyle(c.cause).color }}
          />
        ))}
      </div>

      <ul className="mt-5 space-y-3">
        {causes.map((c) => {
          const { color, Glyph, note } = causeStyle(c.cause);
          return (
            <li key={c.cause} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <Glyph className="h-[18px] w-[18px] shrink-0" weight="fill" style={{ color }} aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] text-[var(--color-ink)]">{c.cause}</span>
                  <span className="block text-[12px] text-[var(--color-ink-3)]">{note}</span>
                </span>
              </span>
              <span className="num shrink-0 text-right text-[13px] text-[var(--color-ink)]">
                {c.count}
                <span className="ml-2 text-[var(--color-ink-3)]">{(c.share * 100).toFixed(0)}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
