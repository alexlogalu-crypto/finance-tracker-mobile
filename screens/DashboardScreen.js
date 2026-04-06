import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.getParent()?.replace('Login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Failed to load summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  async function handleLogout() {
    await AsyncStorage.removeItem('access_token');
    navigation.getParent()?.replace('Login');
  }

  function confirmLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: handleLogout },
    ]);
  }

  function formatCurrency(amount) {
    return `$${Math.abs(amount ?? 0).toFixed(2)}`;
  }

  function renderTransaction({ item }) {
    const isIncome = item.type === 'income';
    return (
      <TouchableOpacity
        style={styles.txRow}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
        activeOpacity={0.75}
      >
        <View style={styles.txLeft}>
          <Text style={styles.txDescription} numberOfLines={1}>
            {item.description || item.category?.name || 'Transaction'}
          </Text>
          <Text style={styles.txDate}>{item.date || ''}</Text>
        </View>
        <Text style={[styles.txAmount, isIncome ? styles.income : styles.expense]}>
          {isIncome ? '+' : '-'}
          {formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4f6ef7" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchSummary}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmLogout} style={styles.logoutLinkContainer}>
          <Text style={styles.logoutLink}>Log out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const net = parseFloat(summary?.overview?.total_income ?? 0) - parseFloat(summary?.overview?.total_expenses ?? 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Overview</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddTransaction')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary cards */}
      <View style={styles.cards}>
        <View style={[styles.card, styles.cardIncome]}>
          <Text style={styles.cardLabel}>Income</Text>
          <Text style={styles.cardValue}>{formatCurrency(summary?.overview?.total_income)}</Text>
        </View>
        <View style={[styles.card, styles.cardExpense]}>
          <Text style={styles.cardLabel}>Expenses</Text>
          <Text style={styles.cardValue}>{formatCurrency(summary?.overview?.total_expenses)}</Text>
        </View>
        <View style={[styles.card, styles.cardNet, net < 0 && styles.cardNetNegative]}>
          <Text style={[styles.cardLabel, styles.cardLabelNet]}>Net Balance</Text>
          <Text style={[styles.cardValue, styles.cardValueNet]}>
            {net < 0 ? '-' : ''}
            {formatCurrency(net)}
          </Text>
        </View>
      </View>

      {/* Recent transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      {summary?.recent_transactions?.length ? (
        <FlatList
          data={summary.recent_transactions}
          keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchSummary(true)}
              tintColor="#4f6ef7"
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recent transactions</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddTransaction')}
          >
            <Text style={styles.emptyButtonText}>Add Transaction</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#16213e',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f0f4f8',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4f6ef7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fc8181',
  },
  cards: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIncome: {
    backgroundColor: 'rgba(72,187,120,0.15)',
  },
  cardExpense: {
    backgroundColor: 'rgba(252,129,129,0.15)',
  },
  cardNet: {
    backgroundColor: '#4f6ef7',
  },
  cardNetNegative: {
    backgroundColor: '#e53935',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0aec0',
  },
  cardLabelNet: {
    color: 'rgba(255,255,255,0.8)',
  },
  cardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f4f8',
  },
  cardValueNet: {
    color: '#fff',
  },
  income: {
    color: '#48bb78',
  },
  expense: {
    color: '#fc8181',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f4f8',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  txLeft: {
    flex: 1,
    marginRight: 12,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f0f4f8',
  },
  txDate: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    color: '#a0aec0',
    marginBottom: 20,
  },
  emptyButton: {
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    color: '#fc8181',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 32,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutLinkContainer: {
    marginTop: 16,
  },
  logoutLink: {
    fontSize: 14,
    color: '#fc8181',
    fontWeight: '500',
  },
});
