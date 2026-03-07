import { describe, expect, test } from 'bun:test';
import { aggregateSessionsByDay } from './formatters';

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
    expect(result[0]).toMatchObject({
      dateKey: '2026-03-01',
      label: 'Mar 01',
      fullLabel: 'Mar 01, 2026',
      usage: 3,
      duration: 3,
      sessionCount: 2,
    });
  });

  test('keeps a cross-day session on its start date', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-01T23:00:00',
        sessionEndDate: '2026-03-02T01:00:00',
        usageTime: 120,
        usageVolume: 2048,
      },
    ]);

    expect(result).toEqual([
      {
        dateKey: '2026-03-01',
        label: 'Mar 01',
        fullLabel: 'Mar 01, 2026',
        usage: 2,
        duration: 2,
        sessionCount: 1,
      },
    ]);
  });

  test('keeps multi-day sessions on the start date bucket', () => {
    const result = aggregateSessionsByDay([
      {
        sessionStartDate: '2026-03-01T08:00:00',
        sessionEndDate: '2026-03-03T10:00:00',
        usageTime: 180,
        usageVolume: 3072,
      },
    ]);

    expect(result).toEqual([
      {
        dateKey: '2026-03-01',
        label: 'Mar 01',
        fullLabel: 'Mar 01, 2026',
        usage: 3,
        duration: 3,
        sessionCount: 1,
      },
    ]);
  });

  test('groups by start date and keeps ascending day order', () => {
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
    expect(result[0]).toMatchObject({ usage: 1, duration: 1, sessionCount: 1 });
    expect(result[1]).toMatchObject({ usage: 1, duration: 1, sessionCount: 1 });
    expect(result[2]).toMatchObject({ usage: 1, duration: 2, sessionCount: 1 });
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
});
