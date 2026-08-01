import type {
  BillingMonthId,
  RawExcitelSession,
  SyncResult,
  SyncStatus,
  UpstreamMonth,
} from '../../../shared/contracts';
import { pool } from '../config/database';
import { getErrorMessage } from '../utils/errors';
import { fetchUsageData, login } from './excitelApi';

/** Sync a specific month from Excitel API to the database. */
export async function syncMonth(monthId: BillingMonthId): Promise<SyncResult> {
  console.log(`[SyncService] Starting sync for month: ${monthId}`);

  try {
    await login();
    const data = await fetchUsageData(monthId);

    if (!data.success) {
      throw new Error(data.status?.message || 'Excitel API returned unsuccessful response');
    }

    if (data.result?.months) await syncMonths(data.result.months);

    const sessions = data.result?.sessions ?? [];
    await syncSessions(monthId, sessions);
    await updateSyncMetadata(monthId, sessions.length, 'success');

    console.log(`[SyncService] Successfully synced ${sessions.length} sessions for ${monthId}`);
    return { success: true, sessionCount: sessions.length };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error(`[SyncService] Sync failed for ${monthId}:`, message);
    await updateSyncMetadata(monthId, 0, 'failed', message);
    return { success: false, error: message };
  }
}

async function syncMonths(months: UpstreamMonth[]): Promise<void> {
  const now = new Date();
  const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;

  for (const month of months) {
    const isCurrent = month.id === currentMonthId;
    await pool.query(
      `
      INSERT INTO months (id, title, is_current)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        is_current = EXCLUDED.is_current
    `,
      [month.id, month.title, isCurrent],
    );
  }

  await pool.query(
    `
    UPDATE months
    SET is_current = CASE WHEN id = $1 THEN true ELSE false END
  `,
    [currentMonthId],
  );
}

async function syncSessions(monthId: BillingMonthId, sessions: RawExcitelSession[]): Promise<void> {
  for (const session of sessions) {
    await pool.query(
      `
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
    `,
      [
        session.sessionId,
        monthId,
        session.sessionStartDate,
        session.sessionEndDate,
        Number.parseInt(String(session.usageTime), 10),
        Number.parseFloat(String(session.usageVolume)),
        session.ipAddress,
        session.terminationCause,
      ],
    );
  }
}

async function updateSyncMetadata(
  monthId: BillingMonthId,
  sessionCount: number,
  status: SyncStatus,
  errorMessage: string | null = null,
): Promise<void> {
  await pool.query(
    `
    INSERT INTO sync_metadata (month_id, last_sync_at, session_count, status, error_message)
    VALUES ($1, NOW(), $2, $3, $4)
    ON CONFLICT (month_id) DO UPDATE SET
      last_sync_at = NOW(),
      session_count = EXCLUDED.session_count,
      status = EXCLUDED.status,
      error_message = EXCLUDED.error_message
  `,
    [monthId, sessionCount, status, errorMessage],
  );
}
