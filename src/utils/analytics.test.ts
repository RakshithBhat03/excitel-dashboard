import { describe, expect, test } from 'bun:test';
import type { Outage } from '../types/analytics';
import {
  buildDays,
  clipSessionsToPeriod,
  findOutages,
  monthPeriod,
  normalizeSessions,
  outageSpanForDay,
} from './analytics';

describe('outageSpanForDay', () => {
  test('fills a multi-day outage across partial and full days', () => {
    const outage: Outage = {
      id: 'aug29-sep1',
      from: new Date(2025, 7, 29, 21, 45),
      to: new Date(2025, 8, 1, 12),
      minutes: 3735,
      cause: 'Lost carrier',
    };

    expect(outageSpanForDay(outage, new Date(2025, 7, 29))).toEqual({
      id: outage.id,
      from: 1305,
      to: 1440,
    });
    expect(outageSpanForDay(outage, new Date(2025, 7, 30))).toEqual({
      id: outage.id,
      from: 0,
      to: 1440,
    });
    expect(outageSpanForDay(outage, new Date(2025, 7, 31))).toEqual({
      id: outage.id,
      from: 0,
      to: 1440,
    });
    expect(outageSpanForDay(outage, new Date(2025, 8, 1))).toEqual({
      id: outage.id,
      from: 0,
      to: 720,
    });
    expect(outageSpanForDay(outage, new Date(2025, 8, 2))).toBeNull();
  });
});

describe('calendar month boundaries', () => {
  test('fills the first day, keeps all 31 August dates, and marks trailing downtime', () => {
    const period = monthPeriod('8-2026', new Date(2026, 8, 2));
    const rows = clipSessionsToPeriod(
      normalizeSessions([
        {
          sessionId: 'july-carryover',
          sessionStartDate: '2026-07-31T04:16:38',
          sessionEndDate: '2026-08-01T04:16:34',
          usageTime: 1439,
          usageVolume: 40960,
          ipAddress: null,
          terminationCause: 'User Request',
        },
        {
          sessionId: 'august-last',
          sessionStartDate: '2026-08-01T04:16:38',
          sessionEndDate: '2026-08-29T21:46:43',
          usageTime: 41250,
          usageVolume: 409600,
          ipAddress: null,
          terminationCause: 'Lost Carrier',
        },
      ]),
      period,
    );
    const days = buildDays(rows, period);
    const outages = findOutages(rows, period);
    const trailing = outages.find((outage) => outage.id === 'period-end');

    expect(days).toHaveLength(31);
    expect(days[0]?.dateKey).toBe('2026-08-01');
    expect(days[0]?.spans.map(({ from, to }) => ({ from, to }))).toEqual([
      { from: 0, to: 256 },
      { from: 256, to: 1440 },
    ]);
    expect(days.at(-1)?.dateKey).toBe('2026-08-31');
    expect(days.some((day) => day.dateKey === '2026-09-01')).toBe(false);
    expect(trailing).toBeDefined();
    expect(outageSpanForDay(trailing!, new Date(2026, 7, 30))).toEqual({
      id: 'period-end',
      from: 0,
      to: 1440,
    });
    expect(outageSpanForDay(trailing!, new Date(2026, 7, 31))).toEqual({
      id: 'period-end',
      from: 0,
      to: 1440,
    });
  });
});
