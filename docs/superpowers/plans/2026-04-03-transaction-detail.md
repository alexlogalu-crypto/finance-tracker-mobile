# Transaction Detail + Transactions List + Dark Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TransactionDetailScreen and TransactionsScreen, register them in navigation, make transaction rows tappable across the app, and retheme all screens to the dark/blue palette.

**Architecture:** Two new screen files added to the existing React Navigation stack+tab setup. Color constants are inlined per-file (no shared theme file — following existing codebase pattern). Dashboard and Transactions list rows both navigate to TransactionDetail via stack navigation.

**Tech Stack:** React Native (Expo), @react-navigation/native, @react-navigation/native-stack, @react-navigation/bottom-tabs, AsyncStorage

**Base URL:** `https://finance-tracker-production-e13e.up.railway.app/api/v1`

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `screens/TransactionDetailScreen.js` | New screen — view + delete a transaction |
| Create | `screens/TransactionsScreen.js` | New screen — paginated list of all transactions |
| Modify | `App.js` | Add 2 stack screens, add Transactions tab, retheme tab bar |
| Modify | `screens/LoginScreen.js` | Dark theme colors |
| Modify | `screens/DashboardScreen.js` | Dark theme + tappable transaction rows |
| Modify | `screens/AddTransactionScreen.js` | Dark theme colors |
| Modify | `screens/BudgetScreen.js` | Dark theme colors |

---

## Color Reference (use these exact values in every file)

```
BG:         #1a1a2e   (screen backgrounds)
SURFACE:    #16213e   (cards, inputs, modals)
ACCENT:     #4f6ef7   (buttons, active states)
TEXT:       #f0f4f8   (primary text)
TEXT_MUTED: #a0aec0   (secondary/date text)
INCOME:     #48bb78   (income amounts)
EXPENSE:    #fc8181   (expense amounts + errors)
BORDER:     #2a2a4a   (dividers, input borders)
```

---

## Task 1: Create TransactionDetailScreen

**Files:**
- Create: `screens/TransactionDetailScreen.js`

- [ ] **Step 1: Create the file with full implementation**

```js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

export default function TransactionDetailScreen({ route, navigation }) {
  const { transaction } = route.params;
  const [deleting, setDeleting] = useState(false);

  const isIncome = transaction.type === 'income';

  function formatCurrency(amount) {
    return `$${Math.abs(parseFloat(amount) || 0).toFixed(2)}`;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
  }

  async function handleDelete() {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDelete,
        },
      ]
    );
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(`${BASE}/transactions/${transaction.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.replace('Login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Delete failed (${res.status})`);
      }
      Alert.alert('Transaction deleted', '', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete transaction.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Category row */}
        <View style={styles.categoryRow}>
          <View
            style={[
              styles.categoryDot,
              { backgroundColor: transaction.category?.color || '#4f6ef7' },
            ]}
          />
          <Text style={styles.categoryName}>
            {transaction.category?.name || 'Uncategorized'}
          </Text>
          <View style={[styles.typeBadge, isIncome ? styles.typeBadgeIncome : styles.typeBadgeExpense]}>
            <Text style={styles.typeBadgeText}>
              {isIncome ? 'Income' : 'Expense'}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>
          {transaction.description || transaction.category?.name || 'Transaction'}
        </Text>

        {/* Amount */}
        <Text style={[styles.amount, isIncome ? styles.amountIncome : styles.amountExpense]}>
          {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
        </Text>

        {/* Date */}
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>

      {/* Delete button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete Transaction</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 10,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a0aec0',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeBadgeIncome: {
    backgroundColor: 'rgba(72,187,120,0.2)',
  },
  typeBadgeExpense: {
    backgroundColor: 'rgba(252,129,129,0.2)',
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f0f4f8',
  },
  description: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f0f4f8',
    marginBottom: 16,
  },
  amount: {
    fontSize: 40,
    fontWeight: '800',
    marginBottom: 12,
  },
  amountIncome: {
    color: '#48bb78',
  },
  amountExpense: {
    color: '#fc8181',
  },
  date: {
    fontSize: 15,
    color: '#a0aec0',
  },
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  deleteBtn: {
    height: 52,
    backgroundColor: '#e53935',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add screens/TransactionDetailScreen.js
git commit -m "feat: add TransactionDetailScreen with delete"
```

---

## Task 2: Create TransactionsScreen

**Files:**
- Create: `screens/TransactionsScreen.js`

- [ ] **Step 1: Create the file with full implementation**

```js
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

export default function TransactionsScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
      {transactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transactions yet.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => item.id?.toString() ?? index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchTransactions(true)}
              tintColor="#4f6ef7"
            />
          }
        />
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
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#a0aec0',
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
```

- [ ] **Step 2: Commit**

```bash
git add screens/TransactionsScreen.js
git commit -m "feat: add TransactionsScreen with full list and pull-to-refresh"
```

---

## Task 3: Update App.js — Add screens, Transactions tab, retheme tab bar

**Files:**
- Modify: `App.js`

- [ ] **Step 1: Replace App.js with the updated version**

```js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import BudgetScreen from './screens/BudgetScreen';
import AddTransactionScreen from './screens/AddTransactionScreen';
import TransactionsScreen from './screens/TransactionsScreen';
import TransactionDetailScreen from './screens/TransactionDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  const icons = { Dashboard: '◈', Transactions: '≡', Budget: '◉' };
  return (
    <Text style={{ fontSize: 20, color: focused ? '#4f6ef7' : '#a0aec0' }}>
      {icons[label] ?? '●'}
    </Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarActiveTintColor: '#4f6ef7',
        tabBarInactiveTintColor: '#a0aec0',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#2a2a4a',
          backgroundColor: '#16213e',
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Budget" component={BudgetScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{
            headerShown: true,
            title: 'Add Transaction',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#f0f4f8',
            headerTitleStyle: { color: '#f0f4f8' },
          }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{
            headerShown: true,
            title: 'Transaction',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#16213e' },
            headerTintColor: '#f0f4f8',
            headerTitleStyle: { color: '#f0f4f8' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add App.js
git commit -m "feat: add Transactions tab and TransactionDetail stack screen, retheme nav"
```

---

## Task 4: Retheme LoginScreen

**Files:**
- Modify: `screens/LoginScreen.js`

- [ ] **Step 1: Replace the StyleSheet in LoginScreen.js**

Replace the entire `const styles = StyleSheet.create({ ... });` block (lines 122–203) with:

```js
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f0f4f8',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#a0aec0',
    marginBottom: 36,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f0f4f8',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#f0f4f8',
    backgroundColor: '#16213e',
  },
  inputError: {
    borderColor: '#fc8181',
  },
  errorText: {
    fontSize: 12,
    color: '#fc8181',
  },
  button: {
    height: 50,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#a0aec0',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f6ef7',
    textDecorationLine: 'underline',
  },
});
```

Also update `placeholderTextColor="#aaa"` on both `TextInput` elements to `placeholderTextColor="#a0aec0"`.

- [ ] **Step 2: Commit**

```bash
git add screens/LoginScreen.js
git commit -m "style: retheme LoginScreen to dark/blue palette"
```

---

## Task 5: Retheme DashboardScreen + make rows tappable

**Files:**
- Modify: `screens/DashboardScreen.js`

- [ ] **Step 1: Make transaction rows tappable**

In `DashboardScreen.js`, replace the `renderTransaction` function (lines 68–84):

```js
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
```

- [ ] **Step 2: Replace the StyleSheet in DashboardScreen.js**

Replace the entire `const styles = StyleSheet.create({ ... });` block (lines 167–343) with:

```js
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#a0aec0',
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
```

- [ ] **Step 3: Commit**

```bash
git add screens/DashboardScreen.js
git commit -m "feat: make Dashboard transaction rows tappable; retheme to dark/blue"
```

---

## Task 6: Retheme AddTransactionScreen

**Files:**
- Modify: `screens/AddTransactionScreen.js`

- [ ] **Step 1: Replace the StyleSheet in AddTransactionScreen.js**

Replace the entire `const styles = StyleSheet.create({ ... });` block (lines 263–422) with:

```js
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f0f4f8',
    marginBottom: 6,
  },
  optional: {
    fontWeight: '400',
    color: '#a0aec0',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#f0f4f8',
    backgroundColor: '#16213e',
  },
  inputError: {
    borderColor: '#fc8181',
  },
  errorText: {
    fontSize: 12,
    color: '#fc8181',
    marginTop: 4,
  },
  toggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#16213e',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActiveExpense: {
    backgroundColor: '#fc8181',
  },
  toggleBtnActiveIncome: {
    backgroundColor: '#48bb78',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0aec0',
  },
  toggleBtnTextActive: {
    color: '#fff',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: '#a0aec0',
  },
  pickerValue: {
    fontSize: 15,
    color: '#f0f4f8',
  },
  pickerChevron: {
    fontSize: 20,
    color: '#a0aec0',
    lineHeight: 22,
  },
  catLoader: {
    marginTop: 8,
  },
  submitBtn: {
    height: 50,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '55%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a4a',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f4f8',
  },
  modalClose: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4f6ef7',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalItemText: {
    fontSize: 15,
    color: '#f0f4f8',
  },
  modalItemCheck: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4f6ef7',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#2a2a4a',
    marginHorizontal: 20,
  },
});
```

Also update `placeholderTextColor="#aaa"` on all `TextInput` elements to `placeholderTextColor="#a0aec0"`.

Also update `<ActivityIndicator style={styles.catLoader} color="#111" />` to `color="#4f6ef7"`.

- [ ] **Step 2: Commit**

```bash
git add screens/AddTransactionScreen.js
git commit -m "style: retheme AddTransactionScreen to dark/blue palette"
```

---

## Task 7: Retheme BudgetScreen

**Files:**
- Modify: `screens/BudgetScreen.js`

- [ ] **Step 1: Replace the StyleSheet in BudgetScreen.js**

Replace the entire `const styles = StyleSheet.create({ ... });` block (lines 345–557) with:

```js
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
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 12,
  },
  budgetCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  budgetCategory: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f4f8',
    flex: 1,
    marginRight: 8,
  },
  budgetMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a0aec0',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#2a2a4a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressNormal: {
    backgroundColor: '#4f6ef7',
  },
  progressOver: {
    backgroundColor: '#fc8181',
  },
  budgetRemaining: {
    fontSize: 12,
    color: '#a0aec0',
  },
  overBudgetText: {
    color: '#fc8181',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#a0aec0',
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
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#16213e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f0f4f8',
  },
  modalClose: {
    fontSize: 16,
    color: '#a0aec0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a0aec0',
    marginBottom: 8,
  },
  categoryScroll: {
    marginBottom: 20,
  },
  categoryScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2a2a4a',
    backgroundColor: '#1a1a2e',
  },
  categoryChipSelected: {
    backgroundColor: '#4f6ef7',
    borderColor: '#4f6ef7',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a0aec0',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#f0f4f8',
    backgroundColor: '#1a1a2e',
    marginBottom: 24,
  },
  saveButton: {
    height: 50,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

Also update `<ActivityIndicator size="large" color="#111" />` in the loading state to `color="#4f6ef7"`.

Also update `placeholderTextColor="#aaa"` on the `TextInput` to `placeholderTextColor="#a0aec0"`.

- [ ] **Step 2: Commit**

```bash
git add screens/BudgetScreen.js
git commit -m "style: retheme BudgetScreen to dark/blue palette"
```

---

## Verification Checklist

After all tasks are complete, verify in the running app:

- [ ] Login screen has dark background, blue Sign In button
- [ ] Dashboard shows dark cards, tapping a transaction row opens TransactionDetail
- [ ] New "Transactions" tab appears in bottom nav, shows full list
- [ ] Tapping a transaction in Transactions tab opens TransactionDetail
- [ ] TransactionDetail shows description, category, amount (green/red), date, type badge
- [ ] Delete button shows confirm dialog, then deletes and goes back
- [ ] Budget screen has dark background, blue progress bar, blue save button
- [ ] Add Transaction screen has dark background, blue save button
- [ ] Tab bar is dark with blue active tint
