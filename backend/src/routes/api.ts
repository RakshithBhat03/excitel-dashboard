import { Router } from 'express';
import type { Request, Response } from 'express';
import type {
  ApiFailure,
  ApiSuccess,
  MonthsResponsePayload,
  SelectableMonth,
  SelectableMonthId,
  SessionsResponsePayload,
  SyncResponsePayload,
  SyncStatusResponsePayload,
} from '../../../shared/contracts';
import { pool } from '../config/database';
import type { MonthRow, SessionRow, SyncStatusDbRow } from '../types/database';
import { syncMonth } from '../services/syncService';

const router = Router();
const MONTH_ID_PATTERN = /^(0?[1-9]|1[0-2])-\d{4}$/;

function isValidMonthId(monthId: string): monthId is SelectableMonthId {
  return monthId === 'all' || MONTH_ID_PATTERN.test(monthId);
}

function failure(error: string): ApiFailure {
  return { success: false, error };
}

// GET /api/months - Get all available months
router.get('/months', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<MonthRow>(`
      SELECT id, title, is_current as current
      FROM months
      ORDER BY
        CAST(SPLIT_PART(id, '-', 2) AS INTEGER) DESC,
        CAST(SPLIT_PART(id, '-', 1) AS INTEGER) DESC
    `);
    const response: ApiSuccess<MonthsResponsePayload> = {
      success: true,
      result: { months: result.rows },
    };
    res.json(response);
  } catch (error: unknown) {
    console.error('Error fetching months:', error);
    res.status(500).json(failure('Failed to fetch months'));
  }
});

// GET /api/sessions/:monthId - Get sessions for a specific month
router.get(
  '/sessions/:monthId',
  async (req: Request<{ monthId: string }>, res: Response): Promise<void> => {
    try {
      const { monthId } = req.params;

      if (!isValidMonthId(monthId)) {
        res.status(400).json(failure('Invalid month ID format'));
        return;
      }

      if (monthId !== 'all') {
        const [monthNum, year] = monthId.split('-');
        const monthNames = [
          'January',
          'February',
          'March',
          'April',
          'May',
          'June',
          'July',
          'August',
          'September',
          'October',
          'November',
          'December',
        ];
        const monthTitle = `${monthNames[Number.parseInt(monthNum ?? '1', 10) - 1] ?? 'Unknown'} ${year ?? ''}`;

        await pool.query(
          `
          INSERT INTO months (id, title, is_current)
          VALUES ($1, $2, FALSE)
          ON CONFLICT (id) DO NOTHING
        `,
          [monthId, monthTitle],
        );

        await pool.query(
          `
          INSERT INTO months (id, title, is_current)
          VALUES ('12-2025', 'December 2025', FALSE)
          ON CONFLICT (id) DO NOTHING
        `,
        );
      }

      const allMonthsResult = await pool.query<MonthRow>(`
        SELECT id, title, is_current as current
        FROM months
        ORDER BY
          CAST(SPLIT_PART(id, '-', 2) AS INTEGER) DESC,
          CAST(SPLIT_PART(id, '-', 1) AS INTEGER) DESC
      `);

      const allTimeMonth: SelectableMonth = { id: 'all', title: 'All Time', current: false };
      const monthsWithAll: SelectableMonth[] = [allTimeMonth, ...allMonthsResult.rows];

      const sessionsResult = await pool.query<SessionRow>(`
        SELECT
          session_id as "sessionId",
          TO_CHAR(session_start_date, 'YYYY-MM-DD"T"HH24:MI:SS') as "sessionStartDate",
          TO_CHAR(session_end_date, 'YYYY-MM-DD"T"HH24:MI:SS') as "sessionEndDate",
          usage_time as "usageTime",
          usage_volume as "usageVolume",
          ip_address as "ipAddress",
          termination_cause as "terminationCause"
        FROM sessions
        WHERE $1 = 'all' OR month_id = $1
        ORDER BY session_start_date DESC
      `, [monthId]);

      const payload: SessionsResponsePayload = {
        sessions: sessionsResult.rows,
        months: monthsWithAll,
      };
      const response: ApiSuccess<SessionsResponsePayload> = { success: true, result: payload };
      res.json(response);
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error);
      res.status(500).json(failure('Failed to fetch sessions'));
    }
  },
);

// GET /api/sync-status - Get sync status for all months
router.get('/sync-status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<SyncStatusDbRow>(`
      SELECT
        m.id,
        m.title,
        sm.last_sync_at,
        sm.session_count,
        sm.status
      FROM months m
      LEFT JOIN sync_metadata sm ON m.id = sm.month_id
      ORDER BY m.created_at DESC
    `);
    const response: ApiSuccess<SyncStatusResponsePayload> = { success: true, result: result.rows };
    res.json(response);
  } catch {
    res.status(500).json(failure('Failed to fetch sync status'));
  }
});

// POST /api/sync/:monthId - Trigger sync for a specific month from Excitel API
router.post(
  '/sync/:monthId',
  async (req: Request<{ monthId: string }>, res: Response): Promise<void> => {
    try {
      const { monthId } = req.params;

      if (!isValidMonthId(monthId)) {
        res.status(400).json(failure('Invalid month ID format'));
        return;
      }

      if (monthId === 'all') {
        res
          .status(400)
          .json(failure('Cannot sync "all" months. Please select a specific month.'));
        return;
      }

      console.log(`[API] Sync requested for month: ${monthId}`);
      const result = await syncMonth(monthId);

      if (result.success) {
        const payload: SyncResponsePayload = {
          message: `Successfully synced ${result.sessionCount} sessions`,
          sessionCount: result.sessionCount,
        };
        const response: ApiSuccess<SyncResponsePayload> = { success: true, result: payload };
        res.json(response);
        return;
      }

      res.status(502).json(failure('Failed to sync data from Excitel'));
    } catch (error: unknown) {
      console.error('Error triggering sync:', error);
      res.status(500).json(failure('Failed to trigger sync'));
    }
  },
);

export default router;
