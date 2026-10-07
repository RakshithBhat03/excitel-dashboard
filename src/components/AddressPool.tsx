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
      <Panel>
        <PanelHead title="Address pool" />
        <Empty message="No addresses recorded for this period." />
      </Panel>
    );
  }

  const max = pool.subnets.reduce((m, s) => Math.max(m, s.count), 0);

  return (
    <Panel>
      <PanelHead
        title="Address pool"
        meta={`Drawn from ${pool.prefixes.join(', ')} over ${sessionCount} ${sessionCount === 1 ? 'session' : 'sessions'}.`}
      />

      <dl className="grid grid-cols-2 gap-6">
        <div>
          <dt className="text-[13px] text-[var(--color-ink-3)]">Distinct addresses</dt>
          <dd className="figure mt-2 text-[44px] text-[var(--color-ink)]">{pool.uniqueAddresses}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-[var(--color-ink-3)]">/24 blocks</dt>
          <dd className="figure mt-2 text-[44px] text-[var(--color-ink)]">{pool.subnetCount}</dd>
        </div>
      </dl>

      <ul className="mt-6 space-y-3">
        {pool.subnets.slice(0, 5).map((s) => (
          <li key={s.subnet}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="num truncate text-[12.5px] text-[var(--color-ink)]">{s.subnet}</span>
              <span className="num shrink-0 text-[12px] text-[var(--color-ink-3)]">
                {s.count} {s.count === 1 ? 'session' : 'sessions'}, {formatGbText(s.gb, 0)}
              </span>
            </div>
            <span
              className="mt-1.5 block h-[3px] rounded-[2px] bg-[var(--color-s1)]"
              style={{ width: `${Math.max(2, (s.count / max) * 100)}%` }}
              aria-hidden
            />
          </li>
        ))}
      </ul>
      {pool.subnets.length > 5 && (
        <p className="mt-3 text-[12px] text-[var(--color-ink-3)]">
          {pool.subnets.length - 5} more blocks
        </p>
      )}
    </Panel>
  );
}
