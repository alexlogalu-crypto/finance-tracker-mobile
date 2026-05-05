import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../utils/storage';

/**
 * Displays a banner when the device is offline.
 * Hides automatically when connectivity is restored.
 *
 * @param {string} cacheKey  — the cache key (without 'cache_' prefix) to read
 *                             the last-updated timestamp from, e.g. 'transactions'
 */
async function readTimestamp(cacheKey, setLastUpdated) {
  const raw = await storage.getItem('cache_' + cacheKey);
  if (!raw) return;
  try {
    const entry = JSON.parse(raw);
    if (entry?.timestamp) setLastUpdated(entry.timestamp);
  } catch {
    // no-op
  }
}

export default function OfflineBanner({ cacheKey }) {
  const [offline, setOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!cacheKey) return;
    readTimestamp(cacheKey, setLastUpdated);
  }, [cacheKey]);

  useEffect(() => {
    if (!offline || !cacheKey) return;
    readTimestamp(cacheKey, setLastUpdated);
  }, [offline, cacheKey]);

  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.dot}>⚠</Text>
      <Text style={styles.text}>
        You're offline{lastUpdated ? ` · Last updated ${formatAge(lastUpdated)}` : ''}
      </Text>
    </View>
  );
}

function formatAge(timestamp) {
  const diffMs = Date.now() - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d1414',
    borderBottomWidth: 1,
    borderBottomColor: '#5c2323',
    paddingHorizontal: 16,
    paddingVertical: 9,
    gap: 8,
  },
  dot: {
    fontSize: 12,
    color: '#ffb4ab',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffb4ab',
    letterSpacing: 0.2,
  },
});
