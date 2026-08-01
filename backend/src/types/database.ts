import type { QueryResultRow } from 'pg';
import type { BillingMonthId, RawExcitelSession, SyncStatus } from '../../../shared/contracts';

export interface MonthRow extends QueryResultRow {
  id: BillingMonthId;
  title: string;
  current: boolean;
}

export interface SessionRow extends QueryResultRow, Omit<RawExcitelSession, 'usageTime' | 'usageVolume'> {
  usageTime: number;
  usageVolume: number | string;
}

export interface SyncStatusDbRow extends QueryResultRow {
  id: BillingMonthId;
  title: string;
  last_sync_at: Date | string | null;
  session_count: number | null;
  status: SyncStatus | null;
}
