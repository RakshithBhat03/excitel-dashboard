/** Compile-time contracts shared by the browser, API, and sync worker. */

export type NumericValue = number | string;

export type BillingMonthId = `${number}-${number}`;
export type SelectableMonthId = BillingMonthId | 'all';

// Named aliases make the two identifier roles explicit to consumers.
export type BillingMonthIdentifier = BillingMonthId;
export type SelectableMonthIdentifier = SelectableMonthId;

export interface Month {
  id: BillingMonthId;
  title: string;
  current: boolean;
}

export interface SelectableMonth {
  id: SelectableMonthId;
  title: string;
  current: boolean;
}

export interface RawExcitelSession {
  sessionId: string;
  sessionStartDate: string;
  sessionEndDate: string;
  usageTime: NumericValue;
  usageVolume: NumericValue;
  ipAddress: string | null;
  terminationCause: string | null;
}

export interface UpstreamMonth {
  id: BillingMonthId;
  title: string;
}

export interface UpstreamStatus {
  message?: string;
  code?: string | number;
}

export interface UpstreamResult {
  months?: UpstreamMonth[];
  sessions?: RawExcitelSession[];
}

export interface UpstreamSuccessResponse {
  success: true;
  status?: UpstreamStatus;
  result?: UpstreamResult;
}

export interface UpstreamFailureResponse {
  success: false;
  status?: UpstreamStatus;
  result?: UpstreamResult;
}

export type UpstreamExcitelResponse = UpstreamSuccessResponse | UpstreamFailureResponse;
export type UpstreamLoginResponse = Record<string, unknown>;

export interface ApiSuccess<TResult> {
  success: true;
  result: TResult;
}

export interface ApiFailure {
  success: false;
  error: string;
}

export type ApiResponse<TResult> = ApiSuccess<TResult> | ApiFailure;

export interface MonthsResponsePayload {
  months: Month[];
}

export interface SessionsResponsePayload {
  sessions: RawExcitelSession[];
  months: SelectableMonth[];
}

export type SyncStatus = 'success' | 'failed';

export interface SyncStatusRow {
  id: BillingMonthId;
  title: string;
  last_sync_at: string | Date | null;
  session_count: number | null;
  status: SyncStatus | null;
}

export type SyncStatusResponsePayload = SyncStatusRow[];

export interface SyncResponsePayload {
  message: string;
  sessionCount: number;
}

export type SyncFailureReason = 'failed' | 'in-progress';

export type SyncResult =
  | { success: true; sessionCount: number }
  | { success: false; error: string; reason?: SyncFailureReason };

export type WorkerSyncResult = SyncResult;

export interface HealthResponsePayload {
  status: 'healthy' | 'unhealthy';
  database: 'connected' | 'disconnected';
}
