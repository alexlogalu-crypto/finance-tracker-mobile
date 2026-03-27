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
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

async function authedFetch(path, options = {}) {
  const token = await AsyncStorage.getItem('access_token');
  return fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

export default function BudgetScreen({ navigation }) {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsRes, categoriesRes] = await Promise.all([
        authedFetch('/budgets'),
        authedFetch('/categories'),
      ]);

      if (budgetsRes.status === 401 || categoriesRes.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.replace('Login');
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

      setBudgets(budgetsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(err.message || 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
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
      categories.find((c) => c.id === (budget.category_id ?? budget.category?.id)) ?? null
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
      const body = {
        category_id: selectedCategory.id,
        amount: parsed,
      };
      if (editingBudget?.id) {
        body.id = editingBudget.id;
      }

      const res = await authedFetch('/budgets', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.replace('Login');
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Save failed (${res.status})`);
      }

      closeModal();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save budget.');
    } finally {
      setSaving(false);
    }
  }

  function formatCurrency(val) {
    return `$${Math.abs(val ?? 0).toFixed(2)}`;
  }

  function renderBudget({ item }) {
    const spent = item.spent ?? 0;
    const total = item.amount ?? 0;
    const ratio = total > 0 ? Math.min(spent / total, 1) : 0;
    const overBudget = spent > total;
    const categoryName =
      item.category_name ?? item.category?.name ?? `Category ${item.category_id}`;

    return (
      <TouchableOpacity style={styles.budgetCard} onPress={() => openEditModal(item)} activeOpacity={0.8}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetCategory}>{categoryName}</Text>
          <Text style={[styles.budgetMeta, overBudget && styles.overBudgetText]}>
            {formatCurrency(spent)} / {formatCurrency(total)}
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(ratio * 100)}%` },
              overBudget ? styles.progressOver : styles.progressNormal,
            ]}
          />
        </View>

        <Text style={[styles.budgetRemaining, overBudget && styles.overBudgetText]}>
          {overBudget
            ? `${formatCurrency(spent - total)} over budget`
            : `${formatCurrency(total - spent)} remaining`}
        </Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#111" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Budgets</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={openAddModal}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {budgets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No budgets set. Tap + to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item, i) => item.id?.toString() ?? i.toString()}
          renderItem={renderBudget}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

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
              {categories.map((cat) => {
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
              placeholderTextColor="#aaa"
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
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111',
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
    backgroundColor: '#fff',
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
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  budgetMeta: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressNormal: {
    backgroundColor: '#111',
  },
  progressOver: {
    backgroundColor: '#e53935',
  },
  budgetRemaining: {
    fontSize: 12,
    color: '#888',
  },
  overBudgetText: {
    color: '#e53935',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
  },
  errorText: {
    fontSize: 15,
    color: '#c62828',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    height: 44,
    paddingHorizontal: 32,
    backgroundColor: '#111',
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
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
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
    color: '#111',
  },
  modalClose: {
    fontSize: 16,
    color: '#888',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
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
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  categoryChipSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
    marginBottom: 24,
  },
  saveButton: {
    height: 50,
    backgroundColor: '#111',
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
