import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import { useBudgetAlert } from '../context/BudgetAlertContext';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

function RingProgress({ size, strokeWidth, progress, color, backgroundColor }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(Math.max(progress, 0), 1);
  const offset = circumference * (1 - clampedProgress);
  const center = size / 2;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function BudgetScreen({ navigation }) {
  const [token, setToken] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [performanceMap, setPerformanceMap] = useState({});
  const { setAlertCount } = useBudgetAlert();

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (tok) => {
    if (!tok) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' };
      const [budgetsRes, categoriesRes, summaryRes] = await Promise.all([
        fetch(`${BASE}/budgets`, { headers }),
        fetch(`${BASE}/categories`, { headers }),
        fetch(`${BASE}/summary`, { headers }),
      ]);

      if (budgetsRes.status === 401 || categoriesRes.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.getParent()?.replace('Login');
        return;
      }

      if (!budgetsRes.ok) {
        const d = await budgetsRes.json().catch(() => ({}));
        throw new Error(d?.detail || `Budgets fetch failed (${budgetsRes.status})`);
      }
      if (!categoriesRes.ok) {
        const d = await categoriesRes.json().catch(() => ({}));
        throw new Error(d?.detail || `Categories fetch failed (${categoriesRes.status})`);
      }

      const [budgetsData, categoriesData] = await Promise.all([
        budgetsRes.json(),
        categoriesRes.json(),
      ]);

      console.log('[BudgetScreen] budgets raw data:', JSON.stringify(budgetsData));
      const budgetList = Array.isArray(budgetsData) ? budgetsData : (budgetsData.items ?? []);
      setBudgets(budgetList);
      setCategories([...(categoriesData.system ?? []), ...(categoriesData.custom ?? [])]);

      const summaryData = summaryRes.ok ? await summaryRes.json() : null;
      const perfMap = {};
      for (const perf of (summaryData?.budget_performance ?? [])) {
        if (perf.category?.id) perfMap[perf.category.id] = perf;
      }
      setPerformanceMap(perfMap);
      const alertCount = Object.values(perfMap).filter(
        (b) => (b.percentage_used ?? 0) >= 80
      ).length;
      setAlertCount(alertCount);
    } catch (err) {
      console.error('[BudgetScreen] fetchData error:', err);
      setError(err.message || 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    AsyncStorage.getItem('access_token')
      .then(tok => {
        if (!tok) {
          navigation.getParent()?.replace('Login');
        } else {
          console.log('[BudgetScreen] token loaded');
          setToken(tok);
        }
      })
      .catch(err => console.error('[BudgetScreen] failed to load token:', err));
  }, [navigation]);

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, fetchData]);

  useFocusEffect(
    useCallback(() => {
      if (token) fetchData(token);
    }, [token, fetchData])
  );

  function openAddModal() {
    setEditingBudget(null);
    setSelectedCategory(null);
    setAmount('');
    setModalVisible(true);
  }

  function openEditModal(budget) {
    setEditingBudget(budget);
    setSelectedCategory(
      (Array.isArray(categories) ? categories : []).find((c) => c.id === (budget.category_id ?? budget.category?.id)) ?? null
    );
    setAmount(String(budget.amount ?? ''));
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditingBudget(null);
    setSelectedCategory(null);
    setAmount('');
  }

  async function handleSave() {
    if (!selectedCategory) {
      Alert.alert('Validation', 'Please select a category.');
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Enter a valid budget amount.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      const body = {
        category_id: selectedCategory.id,
        amount: parsed,
        month,
        year,
      };
      if (editingBudget?.id) {
        body.id = editingBudget.id;
      }

      console.log('[BudgetScreen] saving budget, body:', JSON.stringify(body));

      const res = await fetch(`${BASE}/budgets`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('[BudgetScreen] save response status:', res.status);

      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.getParent()?.replace('Login');
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Save failed (${res.status})`);
      }

      closeModal();
      await fetchData(token);
    } catch (err) {
      console.error('[BudgetScreen] handleSave error:', err);
      Alert.alert('Error', err.message || 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(val) {
    return `$${Math.abs(val ?? 0).toFixed(2)}`;
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
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(token)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Compute totals for the hero ring
  const totalSpent = budgets.reduce((sum, item) => {
    const perf = performanceMap[item.category?.id];
    return sum + parseFloat(perf?.spent_amount ?? 0);
  }, 0);
  const totalBudget = budgets.reduce((sum, item) => {
    const perf = performanceMap[item.category?.id];
    return sum + parseFloat(perf?.budget_amount ?? item.amount ?? 0);
  }, 0);
  const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
  const totalProgress = totalBudget > 0 ? totalSpent / totalBudget : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budgets</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero ring */}
        <View style={styles.heroContainer}>
          <View style={styles.ringWrapper}>
            <RingProgress
              size={200}
              strokeWidth={12}
              progress={totalProgress}
              color="#00E5FF"
              backgroundColor="#2a2a4a"
            />
            <View style={styles.ringInner}>
              <Text style={styles.heroAmount}>${totalSpent.toFixed(2)}</Text>
              <Text style={styles.heroSub}>
                of ${totalBudget.toFixed(2)} ({totalPct}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Category list */}
        {budgets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No budgets set</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
              <Text style={styles.emptyButtonText}>Create a budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Monthly Spending Limits</Text>
            {budgets.map((item, index) => {
              const perf = performanceMap[item.category?.id];
              const spent = parseFloat(perf?.spent_amount ?? 0);
              const total = parseFloat(perf?.budget_amount ?? item.amount ?? 0);
              const pct = perf?.percentage_used ?? (total > 0 ? (spent / total) * 100 : 0);
              const progress = Math.min(pct / 100, 1);
              const categoryName = item.category?.name ?? 'Category';
              const ringColor = pct >= 100 ? '#fc8181' : pct >= 80 ? '#f97316' : '#00E5FF';

              return (
                <TouchableOpacity
                  key={item.id?.toString() ?? index.toString()}
                  style={styles.categoryRow}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.75}
                >
                  {/* Small ring */}
                  <View style={styles.smallRingWrapper}>
                    <RingProgress
                      size={48}
                      strokeWidth={4}
                      progress={progress}
                      color={ringColor}
                      backgroundColor="#2a2a4a"
                    />
                  </View>

                  {/* Name */}
                  <Text style={styles.categoryName} numberOfLines={1}>{categoryName}</Text>

                  {/* Right side: spent + pct */}
                  <View style={styles.categoryRight}>
                    <Text style={[styles.categorySpent, pct >= 100 && styles.overBudgetText]}>
                      {formatCurrency(spent)}
                    </Text>
                    <Text style={[styles.categoryPct, pct >= 100 && styles.overBudgetText]}>
                      {Math.round(pct)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Bottom padding for FAB */}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add / Edit modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Category picker */}
            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
              contentContainerStyle={styles.categoryScrollContent}
            >
              {(Array.isArray(categories) ? categories : []).map((cat) => {
                const selected = selectedCategory?.id === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Amount input */}
            <Text style={styles.fieldLabel}>Monthly Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#a0aec0"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Budget</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  scrollContent: {
    paddingTop: 8,
  },
  // Hero ring
  heroContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  ringWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  heroSub: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  // Category list
  listSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f0f4f8',
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
  },
  smallRingWrapper: {
    width: 48,
    height: 48,
    flexShrink: 0,
  },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#f0f4f8',
  },
  categoryRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  categorySpent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f0f4f8',
  },
  categoryPct: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    marginTop: 2,
  },
  overBudgetText: {
    color: '#fc8181',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '300',
    color: '#1a1a2e',
  },
  // Empty state
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
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#1a1a2e',
    fontSize: 15,
    fontWeight: '600',
  },
  // Error
  errorText: {
    fontSize: 15,
    color: '#fc8181',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 32,
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#1a1a2e',
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
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#a0aec0',
  },
  categoryChipTextSelected: {
    color: '#1a1a2e',
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
    backgroundColor: '#00E5FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: '600',
  },
});
