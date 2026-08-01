import { memo, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import type { DailySummary, NormalizedSession } from '../types/analytics';
import {
  formatCompactMinutes,
  formatGb,
  formatGbText,
  formatStamp,
} from '../utils/formatters';
import { Empty, Panel, PanelHead } from './ui';

const FAULTS = new Set(['Lost Carrier', 'NAS Error', 'NAS Reboot', 'Port Error']);

type TableView = 'days' | 'sessions';
type SortDirection = 'asc' | 'desc';
type SessionSortField = 'start' | 'end' | 'minutes' | 'gb';
type DaySortField = 'dateKey' | 'usage' | 'connectedMinutes' | 'sessionCount';
type ColumnKey = SessionSortField | DaySortField | 'share' | 'ip' | 'cause';

interface SortState<Field extends string> {
  field: Field;
  dir: SortDirection;
}

interface TableColumn {
  key: ColumnKey;
  label: string;
  sortable: boolean;
  align: 'left' | 'right';
}

const VIEWS: Array<{ key: TableView; label: string }> = [
  { key: 'days', label: 'Days' },
  { key: 'sessions', label: 'Sessions' },
];

const SESSION_COLUMNS: TableColumn[] = [
  { key: 'start', label: 'Started', sortable: true, align: 'left' },
  { key: 'end', label: 'Ended', sortable: true, align: 'left' },
  { key: 'minutes', label: 'Duration', sortable: true, align: 'right' },
  { key: 'gb', label: 'Data', sortable: true, align: 'right' },
  { key: 'share', label: '', sortable: false, align: 'left' },
  { key: 'ip', label: 'Address', sortable: false, align: 'left' },
  { key: 'cause', label: 'Ended by', sortable: false, align: 'right' },
];

const DAY_COLUMNS: TableColumn[] = [
  { key: 'dateKey', label: 'Date', sortable: true, align: 'left' },
  { key: 'usage', label: 'Data', sortable: true, align: 'right' },
  { key: 'share', label: '', sortable: false, align: 'left' },
  { key: 'connectedMinutes', label: 'Online', sortable: true, align: 'right' },
  { key: 'sessionCount', label: 'Sessions', sortable: true, align: 'right' },
];

const Sort = memo(function Sort({ on, dir }: { on: boolean; dir: SortDirection }): ReactNode {
  if (!on) return <span className="ml-1 text-[var(--color-line-2)]">↕</span>;
  const Icon = dir === 'asc' ? ArrowUp : ArrowDown;
  return <Icon className="ml-1 inline w-3 h-3 text-[var(--color-s1)]" />;
});
Sort.displayName = 'Sort';

function Bar({
  value,
  max,
  color = 'var(--color-s1)',
}: {
  value: number;
  max: number;
  color?: string | undefined;
}): ReactNode {
  return (
    <span className="block h-1.5 w-full min-w-[52px] overflow-hidden rounded-full bg-[var(--color-well)]">
      <span
        className="block h-full rounded-full"
        style={{ width: `${Math.max(2, (value / (max || 1)) * 100)}%`, background: color }}
      />
    </span>
  );
}

function Value({ gb }: { gb: number }): ReactNode {
  const { value, unit } = formatGb(gb);
  return (
    <>
      {value}
      <span className="ml-0.5 text-[10px] text-[var(--color-ink-3)]">{unit}</span>
    </>
  );
}

function compareSortable(left: string | number | Date, right: string | number | Date): number {
  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;
  if (leftValue === rightValue) return 0;
  return leftValue > rightValue ? 1 : -1;
}

interface SessionsTableProps {
  rows: NormalizedSession[];
  days: DailySummary[];
}

export default function SessionsTable({ rows, days }: SessionsTableProps) {
  const [view, setView] = useState<TableView>('days');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortState<SessionSortField>>({
    field: 'start',
    dir: 'desc',
  });
  const [daySort, setDaySort] = useState<SortState<DaySortField>>({
    field: 'dateKey',
    dir: 'desc',
  });

  const sessionRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (s) =>
            (s.ip || '').toLowerCase().includes(q) ||
            s.cause.toLowerCase().includes(q) ||
            formatStamp(s.start).toLowerCase().includes(q)
        )
      : rows;

    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      return compareSortable(av, bv) * sign;
    });
  }, [rows, query, sort]);

  const dayRows = useMemo(() => {
    const sign = daySort.dir === 'asc' ? 1 : -1;
    return [...days]
      .filter((d) => d.sessionCount > 0)
      .sort((a, b) => {
        const av = a[daySort.field];
        const bv = b[daySort.field];
        return compareSortable(av, bv) * sign;
      });
  }, [days, daySort]);

  const maxSessionGb = useMemo(
    () => rows.reduce((m, s) => Math.max(m, s.gb), 0),
    [rows]
  );
  const maxDayGb = useMemo(() => days.reduce((m, d) => Math.max(m, d.usage), 0), [days]);

  const toggleSessionSort = (field: SessionSortField): void => {
    setSort((current) => ({
      field,
      dir: current.field === field ? (current.dir === 'asc' ? 'desc' : 'asc') : 'desc',
    }));
  };

  const toggleDaySort = (field: DaySortField): void => {
    setDaySort((current) => ({
      field,
      dir: current.field === field ? (current.dir === 'asc' ? 'desc' : 'asc') : 'desc',
    }));
  };

  const isDays = view === 'days';
  const columns = isDays ? DAY_COLUMNS : SESSION_COLUMNS;
  const activeSort = isDays ? daySort : sort;

  return (
    <Panel className="overflow-hidden">
      <PanelHead
        label="Records"
        title={isDays ? 'Daily totals' : 'Session log'}
        meta={
          isDays
            ? `${dayRows.length} days with activity`
            : `${sessionRows.length} of ${rows.length} sessions`
        }
      >
        {!isDays && (
          <label className="hidden items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-inset)] px-2.5 h-8 sm:flex">
            <Search className="w-3.5 h-3.5 text-[var(--color-ink-3)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter address or cause"
              className="w-44 bg-transparent text-[12px] outline-none placeholder:text-[var(--color-ink-3)]"
              aria-label="Filter sessions"
            />
          </label>
        )}
        <div className="seg">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              data-on={view === v.key}
              aria-pressed={view === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </PanelHead>

      {(isDays ? dayRows.length : sessionRows.length) === 0 ? (
        <Empty
          message={
            query ? 'No sessions match that filter.' : 'No records for this period yet.'
          }
        />
      ) : (
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-[var(--color-panel)]">
              <tr className="border-b border-[var(--color-line)]">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cn(
                      'label whitespace-nowrap px-3 py-2 font-medium first:pl-4 last:pr-4 sm:first:pl-5 sm:last:pr-5',
                      c.align === 'right' ? 'text-right' : 'text-left',
                      c.sortable && 'cursor-pointer select-none hover:!text-[var(--color-ink)]'
                    )}
                    onClick={
                      c.sortable
                        ? () => {
                            if (isDays) {
                              toggleDaySort(c.key as DaySortField);
                            } else {
                              toggleSessionSort(c.key as SessionSortField);
                            }
                          }
                        : undefined
                    }
                  >
                    {c.label}
                    {c.sortable && (
                      <Sort on={activeSort.field === c.key} dir={activeSort.dir} />
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isDays
                ? dayRows.map((d) => (
                    <tr
                      key={d.dateKey}
                      className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-inset)]"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 pl-4 text-[13px] text-[var(--color-ink)] sm:pl-5">
                        {d.fullLabel}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] font-medium text-[var(--color-ink)]">
                        <Value gb={d.usage} />
                      </td>
                      <td className="w-[22%] px-3 py-2.5">
                        <Bar value={d.usage} max={maxDayGb} />
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-[var(--color-ink-2)]">
                        {formatCompactMinutes(d.connectedMinutes)}
                      </td>
                      <td className="num px-3 py-2.5 pr-4 text-right text-[12px] text-[var(--color-ink-2)] sm:pr-5">
                        {d.sessionCount}
                      </td>
                    </tr>
                  ))
                : sessionRows.map((s) => (
                    <tr
                      key={s.sessionId}
                      className="border-b border-[var(--color-line)] last:border-0 transition-colors hover:bg-[var(--color-inset)]"
                    >
                      <td className="num whitespace-nowrap px-3 py-2.5 pl-4 text-[12px] text-[var(--color-ink)] sm:pl-5">
                        {formatStamp(s.start)}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-[12px] text-[var(--color-ink-2)]">
                        {formatStamp(s.end)}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] text-[var(--color-ink-2)]">
                        {formatCompactMinutes(s.minutes)}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-[12px] font-medium text-[var(--color-ink)]">
                        <Value gb={s.gb} />
                      </td>
                      <td className="w-[16%] px-3 py-2.5">
                        <Bar value={s.gb} max={maxSessionGb} />
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2.5 text-[11px] text-[var(--color-ink-2)]">
                        {s.ip || '—'}
                      </td>
                      <td className="px-3 py-2.5 pr-4 text-right sm:pr-5">
                        <span
                          className={cn('chip', FAULTS.has(s.cause) ? 'chip-down' : 'chip-up')}
                        >
                          {s.cause}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="label border-t border-[var(--color-line)] px-4 py-2.5 sm:px-5">
        {isDays
          ? `Totalling ${formatGbText(dayRows.reduce((a, d) => a + d.usage, 0))}`
          : `Totalling ${formatGbText(sessionRows.reduce((a, s) => a + s.gb, 0))}`}{' '}
        · times shown in IST
      </p>
    </Panel>
  );
}
