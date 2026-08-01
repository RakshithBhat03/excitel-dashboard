import { formatGbText } from '../utils/formatters';
import type { AddressPoolSummary } from '../types/analytics';
import { Empty, Panel, PanelHead } from './ui';

/**
 * The line takes a fresh address on every reconnect, so a "top IPs" ranking
 * would just be the session list. What's actually readable is the pool: how
 * many distinct addresses were handed out, and which /24 blocks they came from.
 */
interface AddressPoolProps {
  pool: AddressPoolSummary;
  sessionCount: number;
}

export default function AddressPool({ pool, sessionCount }: AddressPoolProps) {
  if (!pool.uniqueAddresses) {
    return (
      <Panel className="min-h-[240px]">
        <PanelHead label="Address pool" title="Where the line was placed" />
        <Empty message="No addresses recorded for this period." />
      </Panel>
    );
  }

  const max = pool.subnets.reduce((m, s) => Math.max(m, s.count), 0);

  return (
    <Panel>
      <PanelHead
        label="Address pool"
        title="Where the line was placed"
        meta={`${pool.uniqueAddresses} addresses over ${sessionCount} sessions, drawn from ${pool.prefixes.join(', ')}`}
      />

      <div className="flex-1 p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-line)]">
          <div className="bg-[var(--color-panel)] px-3 py-2.5">
            <dt className="label">Distinct addresses</dt>
            <dd className="num mt-1 text-[17px] font-medium text-[var(--color-ink)]">
              {pool.uniqueAddresses}
            </dd>
          </div>
          <div className="bg-[var(--color-panel)] px-3 py-2.5">
            <dt className="label">/24 blocks used</dt>
            <dd className="num mt-1 text-[17px] font-medium text-[var(--color-ink)]">
              {pool.subnetCount}
            </dd>
          </div>
        </dl>

        <h3 className="label mt-4 mb-2.5">Blocks by session count</h3>
        <ul className="space-y-2">
          {pool.subnets.slice(0, 6).map((s) => (
            <li key={s.subnet} className="flex items-center gap-3">
              <span className="num w-[104px] shrink-0 text-[11px] text-[var(--color-ink)]">
                {s.subnet}
              </span>
              <span className="relative h-4 flex-1 overflow-hidden rounded-[3px] bg-[var(--color-well)]">
                <span
                  className="absolute inset-y-0 left-0 rounded-[3px] bg-[var(--color-s1)]"
                  style={{ width: `${Math.max(2, (s.count / max) * 100)}%` }}
                />
              </span>
              <span className="num w-6 shrink-0 text-right text-[11px] text-[var(--color-ink)]">
                {s.count}
              </span>
              <span className="num w-16 shrink-0 text-right text-[11px] text-[var(--color-ink-2)]">
                {formatGbText(s.gb, 0)}
              </span>
            </li>
          ))}
        </ul>
        {pool.subnets.length > 6 && (
          <p className="label mt-2.5">{pool.subnets.length - 6} more blocks</p>
        )}
      </div>
    </Panel>
  );
}
