import { pool } from '../config/database.js';
import { login, fetchUsageData } from './excitelApi.js';

export async function syncCurrentMonth() {
  const now = new Date();
  const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;

  console.log(`Syncing current month: ${currentMonthId}`);

  try {
    await login();
    const data = await fetchUsageData(currentMonthId);

    if (!data.success) {
      throw new Error(data.status?.message || 'API returned unsuccessful response');
    }

    // Sync months
    if (data.result?.months) {
      await syncMonths(data.result.months);
    }

    // Sync sessions
    if (data.result?.sessions) {
      await syncSessions(currentMonthId, data.result.sessions);
    }

    // Update sync metadata
    await updateSyncMetadata(currentMonthId, data.result?.sessions?.length || 0, 'success');

    console.log(`Successfully synced ${data.result?.sessions?.length || 0} sessions for ${currentMonthId}`);
  } catch (error) {
    console.error(`Sync failed for ${currentMonthId}:`, error.message);
    await updateSyncMetadata(currentMonthId, 0, 'failed', error.message);
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

export async function syncAllMonths() {
  try {
    await login();

    const now = new Date();
    const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;

    const data = await fetchUsageData(currentMonthId);

    if (data.result?.months) {
      for (const month of data.result.months) {
        console.log(`Syncing month: ${month.id}`);
        const monthData = await fetchUsageData(month.id);

        if (monthData.success && monthData.result?.sessions) {
          await syncMonths(monthData.result.months);
          await syncSessions(month.id, monthData.result.sessions);
          await updateSyncMetadata(month.id, monthData.result.sessions.length, 'success');
          console.log(`Successfully synced ${monthData.result.sessions.length} sessions for ${month.id}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error('Failed to sync all months:', error.message);
  }
}
