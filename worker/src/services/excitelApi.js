const BASE_URL = 'https://selfcare.north.excitel.in/api/index_dev.php';

let selfcareCookie = process.env.SELFCARE_COOKIE || null;

export async function login() {
  if (process.env.SELFCARE_COOKIE) {
    return;
  }
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

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }

  const data = await response.json();

  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    const match = cookies.match(/selfcare=([^;]+)/);
    if (match) {
      selfcareCookie = match[1];
    }
  }

  if (!selfcareCookie) {
    throw new Error('No selfcare cookie received from login');
  }

  return data;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export async function fetchUsageData(monthId) {
  if (!selfcareCookie) {
    await login();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const url = `${BASE_URL}/subscriber/showSessions?monthId=${monthId}`;

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    };

    if (selfcareCookie) {
      headers['Cookie'] = `selfcare=${selfcareCookie}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401) {
        selfcareCookie = null;
        await login();
        return fetchUsageData(monthId);
      }
      throw new Error(`Failed to fetch usage data: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}
