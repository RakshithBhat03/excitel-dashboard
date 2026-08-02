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

const MAX_SESSIONS_PER_SYNC = readPositiveInt('MAX_SESSIONS_PER_SYNC', 20_000);
const MAX_MONTHS_PER_RESPONSE = readPositiveInt('MAX_MONTHS_PER_RESPONSE', 120);
const MONTH_ID_PATTERN = /^(0?[1-9]|1[0-2])-(\d{4})$/;
const MIN_SUPPORTED_YEAR = 2000;
let activeSyncMonth: BillingMonthId | null = null;

function readPositiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function normalizeMonthId(monthId: string): BillingMonthId | null {
  const match = MONTH_ID_PATTERN.exec(monthId);
  const month = Number.parseInt(match?.[1] ?? '', 10);
  const year = Number.parseInt(match?.[2] ?? '', 10);
  const maxSupportedYear = new Date().getFullYear() + 1;

  if (
    !match ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    year < MIN_SUPPORTED_YEAR ||
    year > maxSupportedYear
  ) {
    return null;
  }

  return `${month}-${year}`;
}

function assertBoundedResponse(
  months: UpstreamMonth[] | undefined,
  sessions: RawExcitelSession[] | undefined,
): void {
  if (months !== undefined && !Array.isArray(months)) {
    throw new Error('Excitel API returned an invalid month list');
  }
  if (sessions !== undefined && !Array.isArray(sessions)) {
    throw new Error('Excitel API returned an invalid session list');
  }
  if ((months?.length ?? 0) > MAX_MONTHS_PER_RESPONSE) {
    throw new Error('Excitel API returned too many months');
  }
  if ((sessions?.length ?? 0) > MAX_SESSIONS_PER_SYNC) {
    throw new Error('Excitel API returned too many sessions');
  }
}

function assertSessionIsSafe(session: RawExcitelSession, index: number): void {
  if (!session || typeof session.sessionId !== 'string' || session.sessionId.length === 0) {
    throw new Error(`Excitel API returned an invalid session at index ${index}`);
  }
  if (session.sessionId.length > 100) {
    throw new Error(`Excitel API returned an oversized session ID at index ${index}`);
  }
  if (session.ipAddress !== null && (typeof session.ipAddress !== 'string' || session.ipAddress.length > 100)) {
    throw new Error(`Excitel API returned an invalid IP address at index ${index}`);
  }
  if (
    session.terminationCause !== null &&
    (typeof session.terminationCause !== 'string' || session.terminationCause.length > 50)
  ) {
    throw new Error(`Excitel API returned an invalid termination cause at index ${index}`);
  }

  const usageTime = Number.parseInt(String(session.usageTime), 10);
  const usageVolume = Number.parseFloat(String(session.usageVolume));
  if (!Number.isSafeInteger(usageTime) || !Number.isFinite(usageVolume)) {
    throw new Error(`Excitel API returned invalid usage values at index ${index}`);
  }
}

export function isSyncInProgress(_monthId: BillingMonthId): boolean {
  return activeSyncMonth !== null;
}

/** Sync a specific month from Excitel API to the database. */
export async function syncMonth(monthId: BillingMonthId): Promise<SyncResult> {
  if (activeSyncMonth !== null) {
    return {
      success: false,
      error: `A sync for ${activeSyncMonth} is already in progress`,
      reason: 'in-progress',
    };
  }

  activeSyncMonth = monthId;
  console.log(`[SyncService] Starting sync for month: ${monthId}`);

  try {
    await login();
    const data = await fetchUsageData(monthId);

    if (!data.success) {
      throw new Error(data.status?.message || 'Excitel API returned unsuccessful response');
    }

    const months = data.result?.months;
    const sessions = data.result?.sessions;
    assertBoundedResponse(months, sessions);

    if (months) await syncMonths(months);

    const sessionRows = sessions ?? [];
    await syncSessions(monthId, sessionRows);
    await updateSyncMetadata(monthId, sessionRows.length, 'success');

    console.log(`[SyncService] Successfully synced ${sessionRows.length} sessions for ${monthId}`);
    return { success: true, sessionCount: sessionRows.length };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error(`[SyncService] Sync failed for ${monthId}:`, message);
    await updateSyncMetadata(monthId, 0, 'failed', message);
    return { success: false, error: message, reason: 'failed' };
  } finally {
    activeSyncMonth = null;
  }
}

async function syncMonths(months: UpstreamMonth[]): Promise<void> {
  const now = new Date();
  const currentMonthId = `${now.getMonth() + 1}-${now.getFullYear()}`;

  for (const month of months) {
    if (typeof month.id !== 'string' || typeof month.title !== 'string' || month.title.length > 100) {
      throw new Error('Excitel API returned an invalid month');
    }
    const normalizedMonthId = normalizeMonthId(month.id);
    if (!normalizedMonthId) throw new Error('Excitel API returned an unsupported month');

    const isCurrent = normalizedMonthId === currentMonthId;
    await pool.query(
      `
      INSERT INTO months (id, title, is_current)
      VALUES ($1, $2, $3)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        is_current = EXCLUDED.is_current
    `,
      [normalizedMonthId, month.title, isCurrent],
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
  for (const [index, session] of sessions.entries()) {
    assertSessionIsSafe(session, index);
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
