import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  Platform,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';
import { saveCache, readCache, isOnline } from '../utils/cache';
import { getStreak } from '../utils/streak';
import { getCategoryEmoji } from '../utils/categoryIcon';
import { useBudgetAlert } from '../context/BudgetAlertContext';
import OfflineBanner from '../components/OfflineBanner';

const QUICK_ACTIONS = [
  { label: 'Expense', icon: '↑', type: 'expense' },
  { label: 'Income', icon: '↓', type: 'income' },
  { label: 'History', icon: '⏱', type: null },
];

function buildChartPaths(trend) {
  if (!trend || trend.length < 2) return null;
  const W = 400, H = 100, PAD = 14;
  const nets = trend.map(d => parseFloat(d.net ?? (d.income - d.expenses) ?? 0));
  const min = Math.min(...nets);
  const max = Math.max(...nets);
  const range = max - min || 1;
  const pts = nets.map((v, i) => ({
    x: (i / (nets.length - 1)) * W,
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }));
  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const cpx = ((pts[i].x + pts[i + 1].x) / 2).toFixed(1);
    line += ` C ${cpx} ${pts[i].y.toFixed(1)}, ${cpx} ${pts[i + 1].y.toFixed(1)}, ${pts[i + 1].x.toFixed(1)} ${pts[i + 1].y.toFixed(1)}`;
  }
  const area = line + ` L ${pts[pts.length - 1].x} ${H} L 0 ${H} Z`;
  return { line, area };
}

function MiniChart({ trend }) {
  const paths = buildChartPaths(trend);
  return (
    <View style={styles.chartContainer}>
      <Svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {paths ? (
          <>
            <Path d={paths.area} fill="url(#chartGrad)" />
            <Path d={paths.line} fill="none" stroke="#00E5FF" strokeWidth="2.5" />
          </>
        ) : (
          <>
            <Path
              d="M0 80 Q 50 20, 100 70 T 200 40 T 300 80 T 400 30 V 100 H 0 Z"
              fill="url(#chartGrad)"
            />
            <Path
              d="M0 80 Q 50 20, 100 70 T 200 40 T 300 80 T 400 30"
              fill="none" stroke="#00E5FF" strokeWidth="2.5"
            />
          </>
        )}
      </Svg>
    </View>
  );
}

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
  if (name.includes('education') || name.includes('school') || name.includes('tuition')) return 'graduation-cap';
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
    <View style={[styles.txIconBox, isIncome && styles.txIconBoxIncome]}>
      <Text style={{ fontSize: 18 }}>{getCategoryEmoji(iconName)}</Text>
    </View>
  );
}

export default function DashboardScreen({ navigation }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [streak, setStreak] = useState(0);
  const [trendData, setTrendData] = useState(null);
  const { setAlertCount } = useBudgetAlert();

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const res = await apiRequest('/summary');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.detail || `Request failed (${res.status})`);
        }
        const data = await res.json();
        await saveCache('summary', data);
        setSummary(data);
      } else {
        const cached = await readCache('summary');
        if (cached) setSummary(cached);
      }
    } catch (err) {
      setError(err.message || 'Failed to load summary.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  const fetchTrend = useCallback(async () => {
    try {
      const online = await isOnline();
      if (online) {
        const res = await apiRequest('/summary/monthly-trend?months=6');
        if (res.ok) {
          const data = await res.json();
          await saveCache('summary_trend', data);
          setTrendData(data.trend ?? []);
        }
      } else {
        const cached = await readCache('summary_trend');
        if (cached) setTrendData(cached.trend ?? []);
      }
    } catch (_) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchTrend();
      getStreak().then(setStreak);
    }, [fetchSummary, fetchTrend])
  );

  const budgetAlerts = useMemo(
    () => (summary?.budget_performance ?? []).filter((item) => parseFloat(item.percentage_used) >= 80),
    [summary]
  );

  useEffect(() => {
    setAlertCount(budgetAlerts.length);
  }, [budgetAlerts.length, setAlertCount]);

  async function handleLogout() {
    await storage.removeItem('access_token');
    await storage.removeItem('refresh_token');
    navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Login' }] });
  }

  function confirmLogout() {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to log out?')) handleLogout();
      return;
    }
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: handleLogout },
    ]);
  }

  function formatCurrency(amount) {
    return `$${Math.abs(amount ?? 0).toFixed(2)}`;
  }

  async function handleQuickAction(action) {
    if (action.type === null) {
      navigation.navigate('Transactions');
      return;
    }
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Adding transactions requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Adding transactions requires an internet connection.');
      }
      return;
    }
    navigation.navigate('AddTransaction', { defaultType: action.type });
  }

  function renderTransaction({ item, index }) {
    const isIncome = item.type === 'income';
    const isFirst = index === 0;
    return (
      <TouchableOpacity
        style={[styles.txRow, isFirst && styles.txRowFirst]}
        onPress={() => navigation.navigate('TransactionDetail', { transaction: item })}
        activeOpacity={0.75}
      >
        <TxIcon categoryName={item.category?.name} type={item.type} />
        <View style={styles.txLeft}>
          <Text style={styles.txDescription} numberOfLines={1}>
            {item.description || item.category?.name || 'Transaction'}
          </Text>
          <Text style={styles.txDate}>{item.date || ''}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, isIncome ? styles.incomeText : styles.expenseText]}>
            {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

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
        <TouchableOpacity style={styles.retryButton} onPress={fetchSummary}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmLogout} style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, color: '#ffb4ab', fontWeight: '500' }}>Log out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const income = parseFloat(summary?.overview?.total_income ?? 0);
  const expenses = parseFloat(summary?.overview?.total_expenses ?? 0);
  const net = income - expenses;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner cacheKey="summary" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wealth Ledger</Text>
        <View style={styles.headerRight}>
          {streak >= 2 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakText}>🔥 {streak}d</Text>
            </View>
          )}
          <TouchableOpacity onPress={confirmLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={summary?.recent_transactions ?? []}
        keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
        renderItem={renderTransaction}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchSummary(true)}
            tintColor="#00E5FF"
          />
        }
        ListHeaderComponent={
          <>
            {/* Hero balance */}
            <View style={styles.heroSection}>
              <Text style={styles.heroLabel}>Total Balance</Text>
              <Text style={styles.heroAmount}>
                {net < 0 ? '-' : ''}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
              <MiniChart trend={trendData} />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickBtn}
                  onPress={() => handleQuickAction(action)}
                  activeOpacity={0.75}
                >
                  <View style={styles.quickBtnIcon}>
                    <Text style={{ fontSize: 18, color: '#00E5FF' }}>{action.icon}</Text>
                  </View>
                  <Text style={styles.quickBtnLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Budget alert */}
            {budgetAlerts.length > 0 && (
              <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>Budget Alert</Text>
                {budgetAlerts.map((item, i) => {
                  const pct = parseFloat(item.percentage_used);
                  const name = item.category?.name || item.category_name || item.name || 'Category';
                  return (
                    <Text key={i} style={[styles.alertItem, pct > 100 && styles.alertOverBudget]}>
                      {name} — {pct > 100 ? 'OVER BUDGET' : `${Math.round(pct)}% used`}
                    </Text>
                  );
                })}
              </View>
            )}

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
                <Text style={styles.sectionLink}>View Ledger</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent transactions</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate('AddTransaction')}>
              <Text style={styles.emptyButtonText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121318',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121318',
    paddingHorizontal: 28,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(18,19,24,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.15)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakPill: {
    backgroundColor: '#1e1f25',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f97316',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#bac9cc',
  },
  // Hero
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#bac9cc',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 46,
    fontWeight: '700',
    color: '#e3e1e9',
    letterSpacing: -1,
    marginBottom: 4,
  },
  // Chart
  chartContainer: {
    height: 100,
    width: '100%',
    marginTop: 16,
    backgroundColor: 'rgba(13,14,19,0.5)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 10,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#1a1b21',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.1)',
  },
  quickBtnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,229,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBtnLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bac9cc',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Alert
  alertCard: {
    marginHorizontal: 24,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(255,180,171,0.1)',
    borderLeftWidth: 2,
    borderLeftColor: '#ffb4ab',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffb4ab',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  alertItem: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffb4ab',
    marginTop: 2,
  },
  alertOverBudget: {
    fontWeight: '700',
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e3e1e9',
    letterSpacing: -0.3,
  },
  sectionLink: {
    fontSize: 12,
    color: 'rgba(0,229,255,0.8)',
    fontWeight: '500',
  },
  // Transaction rows
  listContent: {
    paddingBottom: 32,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,14,19,0.5)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 24,
    marginBottom: 10,
    borderRadius: 12,
  },
  txRowFirst: {
    borderLeftWidth: 2,
    borderLeftColor: '#00E5FF',
  },
  txIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#34343a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.15)',
    overflow: 'hidden',
  },
  txIconBoxIncome: {
    borderLeftWidth: 3,
    borderLeftColor: '#00E5FF',
  },
  txLeft: {
    flex: 1,
    marginRight: 12,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e3e1e9',
  },
  txDate: {
    fontSize: 10,
    color: '#bac9cc',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  incomeText: { color: '#00E5FF' },
  expenseText: { color: '#e3e1e9' },
  emptyContainer: {
    paddingTop: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#bac9cc',
    marginBottom: 20,
  },
  emptyButton: {
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#001f24',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    color: '#ffb4ab',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 32,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#001f24',
    fontSize: 15,
    fontWeight: '700',
  },
});
