import { Router } from 'express';
import { pool } from '../config/database.js';
import { syncMonth } from '../services/syncService.js';

const router = Router();

// GET /api/months - Get all available months
router.get('/months', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, title, is_current as current
      FROM months
      ORDER BY
        CAST(SPLIT_PART(id, '-', 2) AS INTEGER) DESC,
        CAST(SPLIT_PART(id, '-', 1) AS INTEGER) DESC
    `);
    res.json({ success: true, result: { months: result.rows } });
  } catch (error) {
    console.error('Error fetching months:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch months' });
  }
});

// GET /api/sessions/:monthId - Get sessions for a specific month
router.get('/sessions/:monthId', async (req, res) => {
  try {
    const { monthId } = req.params;

    if (monthId !== 'all') {
      const [monthNum, year] = monthId.split('-');
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      const monthTitle = `${monthNames[parseInt(monthNum) - 1]} ${year}`;

      await pool.query(`
        INSERT INTO months (id, title, is_current)
        VALUES ($1, $2, FALSE)
        ON CONFLICT (id) DO NOTHING
      `, [monthId, monthTitle]);

      await pool.query(`
        INSERT INTO months (id, title, is_current)
        VALUES ('12-2025', 'December 2025', FALSE)
        ON CONFLICT (id) DO NOTHING
      `);
    }

    const allMonthsResult = await pool.query(`
      SELECT id, title, is_current as current
      FROM months
      ORDER BY
        CAST(SPLIT_PART(id, '-', 2) AS INTEGER) DESC,
        CAST(SPLIT_PART(id, '-', 1) AS INTEGER) DESC
    `);

    const allTimeMonth = { id: 'all', title: 'All Time', current: false };
    const monthsWithAll = [allTimeMonth, ...allMonthsResult.rows];

    const sessionsResult = await pool.query(`
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

    res.json({
      success: true,
      result: {
        sessions: sessionsResult.rows,
        months: monthsWithAll
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

// GET /api/sync-status - Get sync status for all months
router.get('/sync-status', async (req, res) => {
  try {
    const result = await pool.query(`
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
    res.json({ success: true, result: result.rows });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to fetch sync status' });
  }
});

// POST /api/sync/:monthId - Trigger sync for a specific month from Excitel API
router.post('/sync/:monthId', async (req, res) => {
  try {
    const { monthId } = req.params;

    // Validate monthId format (M-YYYY or MM-YYYY)
    if (monthId !== 'all' && !/^\d{1,2}-\d{4}$/.test(monthId)) {
      return res.status(400).json({ success: false, error: 'Invalid month ID format' });
    }

    // "all" is not supported for manual sync - only sync specific months
    if (monthId === 'all') {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot sync "all" months. Please select a specific month.' 
      });
    }

    console.log(`[API] Sync requested for month: ${monthId}`);

    const result = await syncMonth(monthId);

    if (result.success) {
      res.json({ 
        success: true, 
        result: { 
          message: `Successfully synced ${result.sessionCount} sessions`,
          sessionCount: result.sessionCount 
        }
      });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger sync' });
  }
});

export default router;
