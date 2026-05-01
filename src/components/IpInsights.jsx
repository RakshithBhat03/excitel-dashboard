import { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

/**
 * Top IP addresses by usage volume — small leaderboard.
 * Helps spot which IP your line spent the most time on this period.
 */
export default function IpInsights({ sessions = [] }) {
  const ips = useMemo(() => {
    if (!sessions?.length) return [];
    const m = new Map();
    for (const s of sessions) {
      const ip = (s.ipAddress || '').split(' ')[0] || 'Unknown';
      const cur = m.get(ip) || { ip, volume: 0, sessions: 0, time: 0 };
      cur.volume += parseFloat(s.usageVolume) || 0;
      cur.time   += parseFloat(s.usageTime) || 0;
      cur.sessions += 1;
      m.set(ip, cur);
    }
    const arr = [...m.values()].sort((a, b) => b.volume - a.volume).slice(0, 5);
    const max = Math.max(1, ...arr.map(x => x.volume));
    return arr.map(x => ({ ...x, share: x.volume / max }));
  }, [sessions]);

  if (!ips.length) {
    return (
      <div className="card p-6 h-48 flex items-center justify-center">
        <p className="text-[var(--color-muted-foreground)] text-sm">No IP data</p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] font-mono text-[var(--color-muted-foreground)]">
            Where you connected
          </p>
          <h3 className="font-display text-xl font-light tracking-tight text-[var(--color-foreground)] mt-1">
            Top <span className="italic">addresses</span>
          </h3>
        </div>
        <Globe className="w-4 h-4 text-[var(--color-muted-foreground)]" />
      </div>

      <ul className="space-y-3.5">
        {ips.map((row, i) => (
          <li key={row.ip} className="group">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="numeric text-[10px] font-mono text-[var(--color-muted-foreground)] w-5 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="font-mono text-sm text-[var(--color-foreground)] truncate">
                  {row.ip}
                </span>
              </div>
              <span className="numeric text-xs font-medium text-[var(--color-foreground)] shrink-0">
                {formatBytes(row.volume)}
              </span>
            </div>
            <div className="mt-1.5 ml-8 h-1 rounded-full bg-[var(--color-muted)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${row.share * 100}%`,
                  background: i === 0 ? 'var(--color-brand-primary)' : 'var(--color-brand-secondary)',
                  opacity: 1 - i * 0.12,
                }}
              />
            </div>
            <div className="ml-8 mt-1 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.16em] text-[var(--color-muted-foreground)]">
              <span>{row.sessions} sess</span>
              <span>·</span>
              <span>{(row.time / 60).toFixed(1)}h online</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
