const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchUsageData(monthId) {
  const response = await fetch(`${API_BASE}/sessions/${monthId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch usage data');
  }

  return response.json();
}

export async function fetchMonths() {
  const response = await fetch(`${API_BASE}/months`);

  if (!response.ok) {
    throw new Error('Failed to fetch months');
  }

  return response.json();
}

/**
 * Trigger a sync from Excitel API for a specific month
 * @param {string} monthId - The month ID in format "M-YYYY" (e.g., "1-2026")
 * @returns {Promise<{success: boolean, result?: object, error?: string}>}
 */
export async function triggerSync(monthId) {
  const response = await fetch(`${API_BASE}/sync/${monthId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to sync data');
  }

  return response.json();
}
