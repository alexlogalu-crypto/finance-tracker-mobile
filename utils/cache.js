import NetInfo from '@react-native-community/netinfo';
import { storage } from './storage';

const CACHE_PREFIX = 'cache_';

/**
 * Save data to cache under a key, storing the value alongside a timestamp.
 *
 * @param {string} key
 * @param {any} value  — will be JSON-serialised
 */
export async function saveCache(key, value) {
  const entry = {
    timestamp: Date.now(),
    data: value,
  };
  await storage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
}

/**
 * Read the stored value for a key.
 * Returns the data, or null if nothing is cached.
 *
 * @param {string} key
 * @returns {any|null}
 */
export async function readCache(key) {
  const raw = await storage.getItem(CACHE_PREFIX + key);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw);
    return entry.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Check whether cached data for a key is still fresh.
 * Compares the stored timestamp against maxAgeMs.
 *
 * @param {string} key
 * @param {number} maxAgeMs  — maximum acceptable age in milliseconds
 *                            e.g. 5 * 60 * 1000 for 5 minutes
 * @returns {boolean}  true if fresh, false if stale or missing
 */
export async function isCacheFresh(key, maxAgeMs) {
  const raw = await storage.getItem(CACHE_PREFIX + key);
  if (!raw) return false;
  try {
    const entry = JSON.parse(raw);
    if (!entry.timestamp) return false;
    return Date.now() - entry.timestamp < maxAgeMs;
  } catch {
    return false;
  }
}

/**
 * Clear the cached entry for a specific key, forcing a fresh fetch next time.
 *
 * @param {string} key
 */
export async function clearCache(key) {
  await storage.removeItem(CACHE_PREFIX + key);
}

/**
 * Detect whether the device currently has a network connection.
 * Uses the @react-native-community/netinfo API.
 *
 * @returns {boolean}  true if online, false if offline
 */
export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected === true;
}
