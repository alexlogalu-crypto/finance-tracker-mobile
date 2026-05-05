import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
} from 'react-native';
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';
import { isOnline } from '../utils/cache';
import { getCategoryEmoji } from '../utils/categoryIcon';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

function getCategoryIcon(categoryName) {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('coffee') || name.includes('cafe')) return 'coffee';
  if (name.includes('food') || name.includes('restaurant') || name.includes('dining')) return 'utensils';
  if (name.includes('grocery') || name.includes('groceries')) return 'shopping-basket';
  if (name.includes('housing') || name.includes('rent') || name.includes('mortgage') || name.includes('apartment')) return 'home';
  if (name.includes('entertainment') || name.includes('movie') || name.includes('film') || name.includes('game')) return 'film';
  if (name.includes('shopping') || name.includes('retail') || name.includes('store')) return 'shopping-bag';
  if (name.includes('transport') || name.includes('gas') || name.includes('fuel') || name.includes('car') || name.includes('uber')) return 'car';
  if (name.includes('health') || name.includes('medical') || name.includes('doctor')) return 'heartbeat';
  if (name.includes('salary') || name.includes('paycheck') || name.includes('wage') || name.includes('income')) return 'money-bill-wave';
  if (name.includes('utility') || name.includes('electric') || name.includes('water') || name.includes('internet')) return 'bolt';
  if (name.includes('travel') || name.includes('vacation') || name.includes('flight')) return 'plane';
  if (name.includes('education') || name.includes('school') || name.includes('tuition')) return 'graduation-cap';
  if (name.includes('fitness') || name.includes('gym') || name.includes('sport')) return 'dumbbell';
  if (name.includes('subscription') || name.includes('software') || name.includes('netflix') || name.includes('spotify')) return 'laptop';
  if (name.includes('invest') || name.includes('stock')) return 'chart-line';
  if (name.includes('insurance')) return 'shield-alt';
  if (name.includes('gift') || name.includes('donation')) return 'gift';
  return 'tag';
}

export default function TransactionDetailScreen({ route, navigation }) {
  const { transaction } = route.params;
  const [deleting, setDeleting] = useState(false);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState(null);
  const [editErrors, setEditErrors] = useState({});

  // Category picker
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const isIncome = transaction.type === 'income';

  useEffect(() => {
    (async () => {
      setCatLoading(true);
      try {
        const res = await apiRequest('/categories');
        if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
        const data = await res.json();
        const raw = [...(data.system ?? []), ...(data.custom ?? [])];
        const normalised = raw.map((c) =>
          typeof c === 'string' ? { id: c, name: c } : { id: c.id ?? c.name, name: c.name }
        );
        setCategories(normalised);
      } catch (err) {
        setCatError(err.message);
      } finally {
        setCatLoading(false);
      }
    })();
  }, []);

  function enterEditMode() {
    setEditAmount(String(Math.abs(parseFloat(transaction.amount) || 0)));
    setEditDate(transaction.date || '');
    setEditDescription(transaction.description || '');
    setEditCategory(
      transaction.category
        ? { id: transaction.category.id, name: transaction.category.name }
        : null
    );
    setEditErrors({});
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditErrors({});
  }

  function validateEdit() {
    const next = {};
    const parsed = parseFloat(editAmount);
    if (!editAmount.trim()) next.amount = 'Amount is required';
    else if (isNaN(parsed) || parsed <= 0) next.amount = 'Enter a valid positive amount';
    if (!editCategory) next.category = 'Please select a category';
    if (!editDate.trim()) next.date = 'Date is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(editDate.trim())) next.date = 'Use format YYYY-MM-DD';
    return next;
  }

  async function handleSave() {
    const errs = validateEdit();
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return;
    }
    setEditErrors({});
    if (Platform.OS === 'web') {
      if (window.confirm('Save changes to this transaction?')) {
        confirmSave();
      }
    } else {
      Alert.alert(
        'Save Changes',
        'Save changes to this transaction?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: confirmSave },
        ]
      );
    }
  }

  async function confirmSave() {
    setSaving(true);
    try {
      const body = {
        amount: parseFloat(editAmount),
        category_id: editCategory.id,
        type: transaction.type,
        description: editDescription.trim(),
        date: editDate.trim(),
      };
      const res = await apiRequest(`/transactions/${transaction.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Save failed (${res.status})`);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  }

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
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Deleting transactions requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Deleting transactions requires an internet connection.');
      }
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this transaction?')) {
        confirmDelete();
      }
    } else {
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
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const res = await apiRequest(`/transactions/${transaction.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        let detail;
        try { detail = JSON.parse(text)?.detail; } catch {}
        throw new Error(detail || `Delete failed (${res.status})`);
      }
      navigation.goBack();
      Alert.alert('Transaction deleted', '');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete transaction.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Edit / Cancel toggle */}
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            {editing ? (
              <TouchableOpacity onPress={cancelEdit} style={styles.editToggleBtn} activeOpacity={0.75}>
                <Text style={styles.cancelToggleText}>Cancel</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={enterEditMode} style={styles.editToggleBtn} activeOpacity={0.75}>
                <Text style={styles.editToggleText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!editing ? (
            /* ── READ MODE ── */
            <View style={styles.content}>
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

              <Text style={styles.description}>
                {transaction.description || transaction.category?.name || 'Transaction'}
              </Text>

              <Text style={[styles.amount, isIncome ? styles.amountIncome : styles.amountExpense]}>
                {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>

              <Text style={styles.date}>{formatDate(transaction.date)}</Text>
            </View>
          ) : (
            /* ── EDIT MODE ── */
            <View style={styles.editContent}>

              {/* Amount */}
              <View style={styles.field}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={[styles.input, editErrors.amount && styles.inputError]}
                  placeholder="0.00"
                  placeholderTextColor="#4b5563"
                  value={editAmount}
                  onChangeText={setEditAmount}
                  keyboardType="decimal-pad"
                />
                {editErrors.amount ? <Text style={styles.fieldError}>{editErrors.amount}</Text> : null}
              </View>

              {/* Category */}
              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                {catLoading ? (
                  <ActivityIndicator style={{ marginTop: 8 }} color="#00E5FF" />
                ) : catError ? (
                  <Text style={styles.fieldError}>{catError}</Text>
                ) : (
                  <TouchableOpacity
                    style={[styles.selectTrigger, editErrors.category && styles.inputError]}
                    onPress={() => setPickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.selectLeft}>
                      <View style={[styles.selectIconBox, !editCategory && { backgroundColor: '#2a2a2a' }]}>
                        <Text style={{ fontSize: 14 }}>
                          {editCategory ? getCategoryEmoji(getCategoryIcon(editCategory.name)) : '🏷️'}
                        </Text>
                      </View>
                      <Text style={editCategory ? styles.selectValue : styles.selectPlaceholder}>
                        {editCategory ? editCategory.name : 'Select a category'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#4b5563' }}>›</Text>
                  </TouchableOpacity>
                )}
                {editErrors.category ? <Text style={styles.fieldError}>{editErrors.category}</Text> : null}
              </View>

              {/* Description */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  Description <Text style={styles.optional}>optional</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grocery run"
                  placeholderTextColor="#4b5563"
                  value={editDescription}
                  onChangeText={setEditDescription}
                />
              </View>

              {/* Date */}
              <View style={styles.field}>
                <Text style={styles.label}>Date</Text>
                <View style={[styles.inputRow, editErrors.date && styles.inputRowError]}>
                  <Text style={{ fontSize: 14, color: '#4b5563', marginRight: 10 }}>📅</Text>
                  <TextInput
                    style={styles.inputInner}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#4b5563"
                    value={editDate}
                    onChangeText={setEditDate}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
                {editErrors.date ? <Text style={styles.fieldError}>{editErrors.date}</Text> : null}
              </View>

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer — Save in edit mode, Delete in read mode */}
      <View style={styles.footer}>
        {editing ? (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#001f24" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        ) : (
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
        )}
      </View>

      {/* Category picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const selected = editCategory?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => { setEditCategory(item); setPickerVisible(false); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.modalItemIcon, selected && styles.modalItemIconSelected]}>
                    <Text style={{ fontSize: 14 }}>{getCategoryEmoji(getCategoryIcon(item.name))}</Text>
                  </View>
                  <Text style={[styles.modalItemText, selected && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                  {selected && (
                    <Text style={{ fontSize: 14, color: '#00E5FF', marginLeft: 'auto' }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  flex: { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Header toggle row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerSpacer: { flex: 1 },
  editToggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00E5FF',
  },
  cancelToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#a0aec0',
  },

  // Read mode
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

  // Edit mode
  editContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a0aec0',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  optional: { fontWeight: '400', color: '#4b5563', textTransform: 'none' },
  fieldError: { fontSize: 11, color: '#fc8181', marginTop: 4 },
  input: {
    height: 50,
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#f0f4f8',
    borderWidth: 1,
    borderColor: 'rgba(160,174,192,0.2)',
  },
  inputError: { borderColor: '#fc8181' },
  inputRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(160,174,192,0.2)',
  },
  inputRowError: { borderColor: '#fc8181' },
  inputInner: { flex: 1, fontSize: 15, color: '#f0f4f8' },

  // Category selector
  selectTrigger: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(160,174,192,0.2)',
  },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectIconBox: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectPlaceholder: { fontSize: 14, color: '#4b5563' },
  selectValue: { fontSize: 14, color: '#f0f4f8', fontWeight: '500' },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 32,
  },
  saveBtn: {
    height: 52,
    backgroundColor: '#00E5FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    color: '#001f24',
    fontSize: 16,
    fontWeight: '700',
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

  // Category picker modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#1e1f25',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 8,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#34343a',
    alignSelf: 'center',
    marginTop: 10, marginBottom: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.2)',
  },
  modalTitle: { fontSize: 15, fontWeight: '700', color: '#e3e1e9' },
  modalDone: { fontSize: 14, fontWeight: '600', color: '#00E5FF' },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  modalItemSelected: { backgroundColor: 'rgba(0,229,255,0.05)' },
  modalItemIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#34343a',
    alignItems: 'center', justifyContent: 'center',
  },
  modalItemIconSelected: { backgroundColor: '#00E5FF' },
  modalItemText: { fontSize: 14, color: '#a0aec0', fontWeight: '500' },
  modalItemTextSelected: { color: '#e3e1e9', fontWeight: '600' },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(59,73,76,0.1)',
    marginHorizontal: 20,
  },
});
