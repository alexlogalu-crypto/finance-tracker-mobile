import { storage } from './storage';

const BASE_URL = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

// Register a callback from App.js to handle auth failure (navigate to Login).
// This keeps navigation out of the utility layer.
let _onAuthFailure = null;
export function setAuthFailureHandler(handler) {
  _onAuthFailure = handler;
}

// Deduplicate concurrent refresh calls — only one in-flight at a time.
let _refreshPromise = null;

async function attemptTokenRefresh() {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    const refreshToken = await storage.getItem('refresh_token');
    if (!refreshToken) throw new Error('No refresh token stored');

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) throw new Error('Refresh request failed');

    const data = await res.json();
    await storage.setItem('access_token', data.access_token);
    await storage.setItem('refresh_token', data.refresh_token);
    return data.access_token;
  })().finally(() => {
    _refreshPromise = null;
  });

  return _refreshPromise;
}

async function clearSession() {
  await storage.removeItem('access_token');
  await storage.removeItem('refresh_token');
  if (_onAuthFailure) _onAuthFailure();
}

/**
 * Make an authenticated API request.
 *
 * - Automatically attaches Authorization header from stored access_token.
 * - On 401: attempts a token refresh once, then retries the original request.
 * - If the refresh fails or the retry still 401s: clears both tokens and
 *   calls the registered auth-failure handler (redirects to Login).
 *
 * Usage:
 *   const res = await apiRequest('/transactions');
 *   const data = await res.json();
 *
 * @param {string} endpoint  — path starting with '/', e.g. '/transactions'
 * @param {RequestInit} options — standard fetch options (method, body, headers…)
 * @returns {Response}
 */
export async function apiRequest(endpoint, options = {}) {
  const token = await storage.getItem('access_token');

  const buildHeaders = (t) => ({
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...options.headers,
  });

  let res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(token),
  });

  if (res.status !== 401) return res;

  // ── 401: try to refresh ───────────────────────────────────────────────────
  let newToken;
  try {
    newToken = await attemptTokenRefresh();
  } catch {
    await clearSession();
    // Return the original 401 response so callers can inspect if needed,
    // but the session is already cleared and the failure handler fired.
    return res;
  }

  // Retry original request with the new access token.
  const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(newToken),
  });

  if (retryRes.status === 401) {
    await clearSession();
  }

  return retryRes;
}
