import type {
  ApiResponse,
  MonthsResponsePayload,
  SelectableMonthId,
  SyncResponsePayload,
  SessionsResponsePayload,
} from '../../shared/contracts';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function requestJson<TResult>(
  path: string,
  init: RequestInit | undefined,
  failureMessage: string,
): Promise<ApiResponse<TResult>> {
  const response = await fetch(`${API_BASE}${path}`, init);
  let data: ApiResponse<TResult>;

  try {
    data = (await response.json()) as ApiResponse<TResult>;
  } catch {
    throw new Error(failureMessage);
  }

  if (!response.ok) {
    throw new Error(data.success ? failureMessage : data.error || failureMessage);
  }

  return data;
}

export function fetchUsageData(
  monthId: SelectableMonthId,
): Promise<ApiResponse<SessionsResponsePayload>> {
  return requestJson(`/sessions/${monthId}`, undefined, 'Failed to fetch usage data');
}

export function fetchMonths(): Promise<ApiResponse<MonthsResponsePayload>> {
  return requestJson('/months', undefined, 'Failed to fetch months');
}

export function triggerSync(monthId: Exclude<SelectableMonthId, 'all'>): Promise<ApiResponse<SyncResponsePayload>> {
  return requestJson(
    `/sync/${monthId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    'Failed to sync data',
  );
}
