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
import { storage } from '../utils/storage';

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
      const token = await storage.getItem('access_token');
      console.log('[Delete] token:', token ? 'present' : 'MISSING');
      console.log('[Delete] url:', `${BASE}/transactions/${transaction.id}`);
      const res = await fetch(`${BASE}/transactions/${transaction.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[Delete] status:', res.status);
      if (res.status === 401) {
        await storage.removeItem('access_token');
        navigation.replace('Login');
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.log('[Delete] error body:', text);
        let detail;
        try { detail = JSON.parse(text)?.detail; } catch {}
        throw new Error(detail || `Delete failed (${res.status})`);
      }
      navigation.goBack();
      Alert.alert('Transaction deleted', '');
    } catch (err) {
      console.log('[Delete] caught error:', err.message);
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
