import { pool } from '../config/database.js';
import { login, fetchUsageData } from './excitelApi.js';

/**
 * Sync a specific month from Excitel API to the database
 * @param {string} monthId - The month ID in format "M-YYYY" (e.g., "1-2026")
 * @returns {Promise<{success: boolean, sessionCount?: number, error?: string}>}
 */
export async function syncMonth(monthId) {
  console.log(`[SyncService] Starting sync for month: ${monthId}`);

  try {
    // Login to Excitel API
    await login();

    // Fetch usage data from Excitel
    const data = await fetchUsageData(monthId);

    if (!data.success) {
      throw new Error(data.status?.message || 'Excitel API returned unsuccessful response');
    }

    // Sync months metadata
    if (data.result?.months) {
      await syncMonths(data.result.months);
    }

    // Sync sessions
    const sessionCount = data.result?.sessions?.length || 0;
    if (data.result?.sessions) {
      await syncSessions(monthId, data.result.sessions);
    }

    // Update sync metadata
    await updateSyncMetadata(monthId, sessionCount, 'success');

    console.log(`[SyncService] Successfully synced ${sessionCount} sessions for ${monthId}`);

    return { success: true, sessionCount };
  } catch (error) {
    console.error(`[SyncService] Sync failed for ${monthId}:`, error.message);
    await updateSyncMetadata(monthId, 0, 'failed', error.message);
    return { success: false, error: error.message };
  }
}

async function syncMonths(months) {
  const now = new Date();
  const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;

  for (const month of months) {
    const isCurrent = month.id === currentMonthId;

    await pool.query(`
      INSERT INTO months (id, title, is_current)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        is_current = EXCLUDED.is_current
    `, [month.id, month.title, isCurrent]);
  }

  // Ensure only one month is marked as current
  await pool.query(`
    UPDATE months
    SET is_current = CASE WHEN id = $1 THEN true ELSE false END
  `, [currentMonthId]);
}

async function syncSessions(monthId, sessions) {
  for (const session of sessions) {
    await pool.query(`
      INSERT INTO sessions (
        session_id, month_id, session_start_date, session_end_date,
        usage_time, usage_volume, ip_address, termination_cause
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (session_id) DO UPDATE SET
        session_end_date = EXCLUDED.session_end_date,
        usage_time = EXCLUDED.usage_time,
        usage_volume = EXCLUDED.usage_volume,
        termination_cause = EXCLUDED.termination_cause
    `, [
      session.sessionId,
      monthId,
      session.sessionStartDate,
      session.sessionEndDate,
      parseInt(session.usageTime),
      parseFloat(session.usageVolume),
      session.ipAddress,
      session.terminationCause
    ]);
  }
}

async function updateSyncMetadata(monthId, sessionCount, status, errorMessage = null) {
  await pool.query(`
    INSERT INTO sync_metadata (month_id, last_sync_at, session_count, status, error_message)
    VALUES ($1, NOW(), $2, $3, $4)
    ON CONFLICT (month_id) DO UPDATE SET
      last_sync_at = NOW(),
      session_count = EXCLUDED.session_count,
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message
  `, [monthId, sessionCount, status, errorMessage]);
}
