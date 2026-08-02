import type {
  BillingMonthId,
  UpstreamExcitelResponse,
  UpstreamLoginResponse,
} from '../../../shared/contracts';
import { readJsonWithLimit } from '../../../shared/limitedJson';

const BASE_URL = 'https://selfcare.north.excitel.in/api/index_dev.php';
const MAX_UPSTREAM_RESPONSE_BYTES = readPositiveInt('MAX_UPSTREAM_RESPONSE_BYTES', 10 * 1024 * 1024);

let selfcareCookie: string | null = process.env.SELFCARE_COOKIE || null;

function readPositiveInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export async function login(): Promise<UpstreamLoginResponse | undefined> {
  if (process.env.SELFCARE_COOKIE) return undefined;

  const username = process.env.EXCITEL_USERNAME;
  const password = process.env.EXCITEL_PASSWORD;
  if (!username || !password) {
    throw new Error('EXCITEL_USERNAME and EXCITEL_PASSWORD environment variables are required');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&isMobile=0`,
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`Login failed: ${response.status}`);

    const data = await readJsonWithLimit<UpstreamLoginResponse>(response, MAX_UPSTREAM_RESPONSE_BYTES);
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      const match = cookies.match(/selfcare=([^;]+)/);
      if (match?.[1]) selfcareCookie = match[1];
    }

    if (!selfcareCookie) throw new Error('No selfcare cookie received from login');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchUsageData(
  monthId: BillingMonthId,
  allowRetry = true,
): Promise<UpstreamExcitelResponse> {
  if (!selfcareCookie) await login();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const url = `${BASE_URL}/subscriber/showSessions?monthId=${monthId}`;

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'application/json',
    };
    if (selfcareCookie) headers.Cookie = `selfcare=${selfcareCookie}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (!allowRetry) throw new Error('Excitel session expired after retry');
        selfcareCookie = null;
        await login();
        return fetchUsageData(monthId, false);
      }
      throw new Error(`Failed to fetch usage data: ${response.status}`);
    }

    return await readJsonWithLimit<UpstreamExcitelResponse>(response, MAX_UPSTREAM_RESPONSE_BYTES);
  } finally {
    clearTimeout(timeout);
  }
}
