import { describe, expect, test } from 'bun:test';
import { aggregateSessionsByDay } from './formatters';
import type { DailyAggregate } from '../types/analytics';

function at<T>(items: T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Expected item at index ${index}`);
  return item;
}

function sumDailyTotals(days: DailyAggregate[]): { usage: number; duration: number } {
  return days.reduce(
    (acc, day) => ({
      usage: acc.usage + day.usage,
      duration: acc.duration + day.duration,
    }),
    { usage: 0, duration: 0 }
  );
}

describe('aggregateSessionsByDay', () => {
  test('returns an empty array for empty input', () => {
    expect(aggregateSessionsByDay([])).toEqual([]);
  });

  test('combines multiple sessions on the same day', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-01T08:00:00',
        sessionEndDate: '2026-03-01T09:00:00',
        usageTime: 60,
        usageVolume: 1024,
      },
      {
        sessionStartDate: '2026-03-01T10:00:00',
        sessionEndDate: '2026-03-01T12:00:00',
        usageTime: 120,
        usageVolume: 2048,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(at(result, 0)).toMatchObject({
      dateKey: '2026-03-01',
      label: 'Mar 01',
      fullLabel: 'Mar 01, 2026',
      usage: 3,
      duration: 3,
      sessionCount: 2,
    });
  });

  test('splits a cross-day session across both days', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-01T23:00:00',
        sessionEndDate: '2026-03-02T01:00:00',
        usageTime: 120,
        usageVolume: 2048,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(at(result, 0)).toMatchObject({
      dateKey: '2026-03-01',
      label: 'Mar 01',
      fullLabel: 'Mar 01, 2026',
      sessionCount: 1,
    });
    expect(at(result, 1)).toMatchObject({
      dateKey: '2026-03-02',
      label: 'Mar 02',
      fullLabel: 'Mar 02, 2026',
      sessionCount: 1,
    });
    expect(at(result, 0).usage).toBeCloseTo(1, 6);
    expect(at(result, 0).duration).toBeCloseTo(1, 6);
    expect(at(result, 1).usage).toBeCloseTo(1, 6);
    expect(at(result, 1).duration).toBeCloseTo(1, 6);

    const totals = sumDailyTotals(result);
    expect(totals.usage).toBeCloseTo(2, 6);
    expect(totals.duration).toBeCloseTo(2, 6);
  });

  test('splits multi-day sessions into daily buckets with full middle days', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-01T20:00:00',
        sessionEndDate: '2026-03-03T08:00:00',
        usageTime: 2160,
        usageVolume: 36864,
      },
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((day) => day.dateKey)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(at(result, 0).usage).toBeCloseTo(4, 6);
    expect(at(result, 0).duration).toBeCloseTo(4, 6);
    expect(at(result, 1).usage).toBeCloseTo(24, 6);
    expect(at(result, 1).duration).toBeCloseTo(24, 6);
    expect(at(result, 2).usage).toBeCloseTo(8, 6);
    expect(at(result, 2).duration).toBeCloseTo(8, 6);
    expect(at(result, 0).sessionCount).toBe(1);
    expect(at(result, 1).sessionCount).toBe(1);
    expect(at(result, 2).sessionCount).toBe(1);

    const totals = sumDailyTotals(result);
    expect(totals.usage).toBeCloseTo(36, 6);
    expect(totals.duration).toBeCloseTo(36, 6);
  });

  test('groups by contributing day and keeps ascending order', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-03T11:00:00',
        sessionEndDate: '2026-03-03T13:00:00',
        usageTime: 120,
        usageVolume: 1024,
      },
      {
        sessionStartDate: '2026-03-01T23:30:00',
        sessionEndDate: '2026-03-02T00:30:00',
        usageTime: 60,
        usageVolume: 1024,
      },
      {
        sessionStartDate: '2026-03-02T08:00:00',
        sessionEndDate: '2026-03-02T09:00:00',
        usageTime: 60,
        usageVolume: 1024,
      },
    ]);

    expect(result).toHaveLength(3);
    expect(result.map((day) => day.dateKey)).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(at(result, 0)).toMatchObject({ usage: 0.5, duration: 0.5, sessionCount: 1 });
    expect(at(result, 1)).toMatchObject({ usage: 1.5, duration: 1.5, sessionCount: 2 });
    expect(at(result, 2)).toMatchObject({ usage: 1, duration: 2, sessionCount: 1 });
  });

  test('includes spillover days outside the selected month range', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-31T22:00:00',
        sessionEndDate: '2026-04-01T02:00:00',
        usageTime: 240,
        usageVolume: 4096,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(at(result, 0).dateKey).toBe('2026-03-31');
    expect(at(result, 1).dateKey).toBe('2026-04-01');
    expect(at(result, 0).usage).toBeCloseTo(2, 6);
    expect(at(result, 0).duration).toBeCloseTo(2, 6);
    expect(at(result, 1).usage).toBeCloseTo(2, 6);
    expect(at(result, 1).duration).toBeCloseTo(2, 6);
  });

  test('preserves single-day formatting for a single session', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-05T06:15:00',
        sessionEndDate: '2026-03-05T06:45:00',
        usageTime: 30,
        usageVolume: 512,
      },
    ]);

    expect(result).toEqual([
      {
        dateKey: '2026-03-05',
        label: 'Mar 05',
        fullLabel: 'Mar 05, 2026',
        usage: 0.5,
        duration: 0.5,
        sessionCount: 1,
      },
    ]);
  });

  test('skips invalid and zero-length sessions safely', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: 'invalid-date',
        sessionEndDate: '2026-03-05T06:45:00',
        usageTime: 30,
        usageVolume: 512,
      },
      {
        sessionStartDate: '2026-03-05T06:15:00',
        sessionEndDate: '2026-03-05T06:15:00',
        usageTime: 30,
        usageVolume: 512,
      },
      {
        sessionStartDate: '2026-03-05T06:15:00',
        sessionEndDate: '2026-03-05T06:45:00',
        usageTime: 30,
        usageVolume: 512,
      },
    ]);

    expect(result).toEqual([
      {
        dateKey: '2026-03-05',
        label: 'Mar 05',
        fullLabel: 'Mar 05, 2026',
        usage: 0.5,
        duration: 0.5,
        sessionCount: 1,
      },
    ]);
  });
});
