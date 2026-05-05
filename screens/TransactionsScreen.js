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
  Alert,
  Platform,
} from 'react-native';
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';
import { saveCache, readCache, isOnline } from '../utils/cache';
import { getCategoryEmoji } from '../utils/categoryIcon';
import OfflineBanner from '../components/OfflineBanner';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

const TYPE_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expenses', value: 'expense' },
];

// Map category name → FontAwesome5 icon
function getCategoryIcon(categoryName, type) {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('coffee') || name.includes('cafe') || name.includes('starbucks')) return 'coffee';
  if (name.includes('food') || name.includes('restaurant') || name.includes('dining') || name.includes('eat')) return 'utensils';
  if (name.includes('grocery') || name.includes('groceries') || name.includes('supermarket')) return 'shopping-basket';
  if (name.includes('housing') || name.includes('rent') || name.includes('mortgage') || name.includes('apartment')) return 'home';
  if (name.includes('entertainment') || name.includes('movie') || name.includes('film') || name.includes('game')) return 'film';
  if (name.includes('shopping') || name.includes('retail') || name.includes('store') || name.includes('amazon') || name.includes('apple')) return 'shopping-bag';
  if (name.includes('transport') || name.includes('gas') || name.includes('fuel') || name.includes('car') || name.includes('uber') || name.includes('lyft')) return 'car';
  if (name.includes('health') || name.includes('medical') || name.includes('doctor') || name.includes('pharmacy')) return 'heartbeat';
  if (name.includes('salary') || name.includes('paycheck') || name.includes('direct deposit') || name.includes('wage')) return 'money-bill-wave';
  if (name.includes('utility') || name.includes('electric') || name.includes('water') || name.includes('internet') || name.includes('phone')) return 'bolt';
  if (name.includes('travel') || name.includes('vacation') || name.includes('flight') || name.includes('hotel')) return 'plane';
  if (name.includes('education') || name.includes('school') || name.includes('tuition') || name.includes('course')) return 'graduation-cap';
  if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return 'dumbbell';
  if (name.includes('subscription') || name.includes('software') || name.includes('netflix') || name.includes('spotify') || name.includes('adobe')) return 'laptop';
  if (name.includes('invest') || name.includes('stock') || name.includes('dividend')) return 'chart-line';
  if (name.includes('crypto') || name.includes('bitcoin') || name.includes('eth')) return 'coins';
  if (name.includes('insurance')) return 'shield-alt';
  if (name.includes('gift') || name.includes('donation')) return 'gift';
  if (type === 'income') return 'money-bill-wave';
  return 'tag';
}

function TxIcon({ categoryName, type }) {
  const isIncome = type === 'income';
  const iconName = getCategoryIcon(categoryName, type);
  return (
    <View style={[styles.iconBox, isIncome && styles.iconBoxIncome]}>
      <Text style={{ fontSize: 18 }}>{getCategoryEmoji(iconName)}</Text>
    </View>
  );
}

function formatDateHeader(dateStr) {
  if (!dateStr) return 'Unknown Date';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const date = new Date(dateStr + 'T12:00:00');
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (dateStr === todayStr) return `Today, ${formatted}`;
  if (dateStr === yesterdayStr) return `Yesterday, ${formatted}`;
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(transactions) {
  const groups = {};
  transactions.forEach((tx) => {
    const key = tx.date || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  const flat = [];
  Object.entries(groups)
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .forEach(([date, txs]) => {
      flat.push({ _type: 'header', date });
      txs.forEach((tx) => flat.push({ _type: 'item', ...tx }));
    });
  return flat;
}

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
      const online = await isOnline();
      if (online) {
        const res = await apiRequest('/transactions');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || `Request failed (${res.status})`);
        }
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.items ?? data.transactions ?? []);
        await saveCache('transactions', list);
        setTransactions(list);
      } else {
        const cached = await readCache('transactions');
        if (cached) setTransactions(cached);
      }
    } catch (err) {
      setError(err.message || 'Failed to load transactions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(useCallback(() => { fetchTransactions(); }, [fetchTransactions]));

  const filtered = transactions.filter((item) => {
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const query = searchText.toLowerCase();
    const matchesSearch =
      !query ||
      (item.description || '').toLowerCase().includes(query) ||
      (item.category?.name || '').toLowerCase().includes(query);
    return matchesType && matchesSearch;
  });

  const flatList = groupByDate(filtered);

  const monthlySpend = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

  function formatCurrency(amount) {
    return `$${Math.abs(parseFloat(amount) || 0).toFixed(2)}`;
  }

  function renderRow({ item }) {
    if (item._type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{formatDateHeader(item.date)}</Text>
        </View>
      );
    }
    const isIncome = item.type === 'income';
    const categoryName = item.category?.name || (isIncome ? 'Income' : 'Expense');
    return (
      <TouchableOpacity
        style={styles.txRow}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
        activeOpacity={0.75}
      >
        <TxIcon categoryName={categoryName} type={item.type} />
        <View style={styles.txLeft}>
          <Text style={styles.txDescription} numberOfLines={1}>
            {item.description || categoryName}
          </Text>
          <Text style={styles.txCategory}>{categoryName}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
          <Text style={styles.txDate}>{item.date || ''}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  async function handleAddTransaction() {
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Adding transactions requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Adding transactions requires an internet connection.');
      }
      return;
    }
    navigation.navigate('AddTransaction');
  }

  const isFiltering = searchText.length > 0 || typeFilter !== 'all';

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#00E5FF" />
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
      <OfflineBanner cacheKey="transactions" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transactions</Text>
      </View>

      <FlatList
        data={flatList}
        keyExtractor={(item, index) =>
          item._type === 'header' ? `hdr-${item.date}` : item.id?.toString() ?? index.toString()
        }
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchTransactions(true)} tintColor="#00E5FF" />
        }
        ListHeaderComponent={
          <>
            {/* Monthly Spend Card */}
            <View style={styles.spendCard}>
              <Text style={styles.spendLabel}>Monthly Spend</Text>
              <Text style={styles.spendAmount}>
                ${monthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <View style={styles.spendBadgeRow}>
                <View style={styles.spendBadgeDot} />
                <Text style={styles.spendBadgeText}>YOUR TRANSACTION HISTORY</Text>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
              <Text style={[styles.searchIcon, { fontSize: 14, color: '#4b5563' }]}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search transactions..."
                placeholderTextColor="#4b5563"
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
          </>
        }
        ListEmptyComponent={
          isFiltering ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions match your search</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddTransaction}>
                <Text style={styles.emptyButtonText}>Add your first transaction</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318' },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#121318', paddingHorizontal: 28,
  },
  header: {
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: 'rgba(18,19,24,0.7)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(59,73,76,0.15)',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#00E5FF', letterSpacing: -0.5 },
  // Monthly spend card
  spendCard: {
    marginHorizontal: 24, marginTop: 20, marginBottom: 4,
    padding: 20, backgroundColor: '#1a1b21',
    borderLeftWidth: 2, borderLeftColor: '#00E5FF', borderRadius: 8,
  },
  spendLabel: {
    fontSize: 10, fontWeight: '600', color: '#bac9cc',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
  },
  spendAmount: { fontSize: 30, fontWeight: '700', color: '#e3e1e9', letterSpacing: -0.5 },
  spendBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  spendBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00E5FF' },
  spendBadgeText: {
    fontSize: 9, fontWeight: '600', color: '#00E5FF',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  // Search
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 24, marginTop: 16, marginBottom: 8,
    backgroundColor: '#1a1b21', borderRadius: 8,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.2)',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#e3e1e9' },
  // Filter pills
  pillRow: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 8, gap: 8 },
  pill: {
    paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.3)', backgroundColor: '#121318',
  },
  pillActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#bac9cc' },
  pillTextActive: { color: '#001f24' },
  // Date header
  dateHeader: {
    paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8,
  },
  dateHeaderText: {
    fontSize: 10, fontWeight: '600', color: '#bac9cc',
    textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.7,
  },
  // List
  listContent: { paddingBottom: 32 },
  // Transaction row
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1b21',
    paddingVertical: 13, paddingHorizontal: 14,
    marginHorizontal: 24, marginBottom: 8, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.15)',
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: '#34343a',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12, flexShrink: 0,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.15)',
    overflow: 'hidden',
  },
  iconBoxIncome: {
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
  },
  txLeft: { flex: 1, marginRight: 10 },
  txDescription: { fontSize: 13, fontWeight: '600', color: '#e3e1e9' },
  txCategory: {
    fontSize: 10, color: '#bac9cc', marginTop: 2,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 13, fontWeight: '700' },
  txDate: { fontSize: 9, color: '#849396', marginTop: 2 },
  incomeText: { color: '#00E5FF' },
  expenseText: { color: '#bac9cc' },
  // Empty
  emptyContainer: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { fontSize: 14, color: '#bac9cc', marginBottom: 20 },
  emptyButton: {
    height: 44, paddingHorizontal: 24, backgroundColor: '#00E5FF',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  emptyButtonText: { color: '#001f24', fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 15, color: '#ffb4ab', textAlign: 'center', marginBottom: 20 },
  retryButton: {
    height: 44, paddingHorizontal: 32, backgroundColor: '#00E5FF',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  retryButtonText: { color: '#001f24', fontSize: 15, fontWeight: '700' },
});
