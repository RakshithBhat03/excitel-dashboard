import { AlertTriangle, CircleCheck } from 'lucide-react';
import { formatCompactMinutes } from '../utils/formatters';
import { Empty, Panel, PanelHead } from './ui';

/** Causes that mean the line dropped on its own, rather than re-authenticating. */
const FAULTS = new Set(['Lost Carrier', 'NAS Error', 'NAS Reboot', 'Port Error']);

function causeStyle(cause) {
  if (FAULTS.has(cause)) {
    return { color: 'var(--color-down)', Icon: AlertTriangle, note: 'line dropped' };
  }
  return { color: 'var(--color-s1)', Icon: CircleCheck, note: 'normal reconnect' };
}

export default function LinkQuality({ stats, causes }) {
  if (!stats.sessionCount) {
    return (
      <Panel className="min-h-[280px]">
        <PanelHead label="Link quality" title="Stability of the connection" />
        <Empty message="Nothing to measure yet." />
      </Panel>
    );
  }

  const [whole, frac] = stats.uptimePercent.toFixed(2).split('.');

  return (
    <Panel>
      <PanelHead label="Link quality" title="Stability of the connection" />

      <div className="p-4 sm:p-5">
        <p className="flex items-baseline gap-1">
          <span className="readout text-[52px] leading-none font-medium text-[var(--color-ink)]">
            {whole}
            <span className="text-[var(--color-ink-3)]">.{frac}</span>
          </span>
          <span className="readout text-[20px] text-[var(--color-ink-2)]">%</span>
        </p>
        <p className="label mt-2">
          connected across {formatCompactMinutes(stats.spanMinutes)} of elapsed time
        </p>

        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)]">
          {[
            ['Offline', stats.downMinutes ? formatCompactMinutes(stats.downMinutes) : '0m'],
            ['Drops', String(stats.outageCount)],
            ['Longest run', formatCompactMinutes(stats.longestRunMinutes)],
          ].map(([term, value]) => (
            <div key={term} className="bg-[var(--color-panel)] px-2.5 py-2">
              <dt className="label truncate">{term}</dt>
              <dd className="num mt-1 text-[15px] font-medium text-[var(--color-ink)]">{value}</dd>
            </div>
          ))}
        </dl>

        <h3 className="label mt-5 mb-2.5">How sessions ended</h3>
        <ul className="space-y-2.5">
          {causes.map((c) => {
            const { color, Icon, note } = causeStyle(c.cause);
            return (
              <li key={c.cause}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} aria-hidden />
                    <span className="truncate text-[13px] text-[var(--color-ink)]">{c.cause}</span>
                    <span className="label hidden sm:inline">· {note}</span>
                  </span>
                  <span className="num shrink-0 text-[12px] text-[var(--color-ink)]">
                    {c.count}
                    <span className="text-[var(--color-ink-3)]"> · {(c.share * 100).toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-well)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(1.5, c.share * 100)}%`, background: color }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
