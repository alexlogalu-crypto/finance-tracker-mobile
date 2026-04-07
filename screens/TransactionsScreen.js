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
  RefreshControl,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expenses', value: 'expense' },
];

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const fetchTransactions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${BASE}/transactions`, {
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
      const list = Array.isArray(data) ? data : (data.items ?? data.transactions ?? []);
      setTransactions(list);
    } catch (err) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const filteredTransactions = transactions.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const query = searchText.toLowerCase();
    const matchesSearch =
      !query ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.category?.name || '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  function formatCurrency(amount) {
    return `$${Math.abs(parseFloat(amount) || 0).toFixed(2)}`;
  }

  function renderItem({ item }) {
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
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  }

  const isFiltering = searchText.length > 0 || typeFilter !== 'all';

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
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchTransactions()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor="#6b7280"
          value={searchText}
          onChangeText={setSearchText}
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
      </View>

      {/* Filter pills */}
      <View style={styles.pillRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.pill, typeFilter === f.value && styles.pillActive]}
            onPress={() => setTypeFilter(f.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, typeFilter === f.value && styles.pillTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          isFiltering ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions match your search</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate('AddTransaction')}
              >
                <Text style={styles.emptyButtonText}>Add your first transaction</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTransactions(true)}
            tintColor="#4f6ef7"
          />
        }
      />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#f0f4f8',
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#2a2a4a',
  },
  pillActive: {
    backgroundColor: '#4f6ef7',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0aec0',
  },
  pillTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
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
  income: {
    color: '#48bb78',
  },
  expense: {
    color: '#fc8181',
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    paddingTop: 80,
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
});
