import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { apiRequest } from '../utils/api';
import { saveCache, readCache, isOnline } from '../utils/cache';
import { getCategoryEmoji } from '../utils/categoryIcon';
import OfflineBanner from '../components/OfflineBanner';

function today() {
  return new Date().toISOString().split('T')[0];
}

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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function formatCurrency(val) {
  return `$${Math.abs(parseFloat(val) || 0).toFixed(2)}`;
}

const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

export default function RecurringScreen({ navigation }) {
  const [recurring, setRecurring] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Create modal ──────────────────────────────────────────────────────────
  const [createVisible, setCreateVisible] = useState(false);
  const [createType, setCreateType] = useState('expense');
  const [createAmount, setCreateAmount] = useState('');
  const [createCategory, setCreateCategory] = useState(null);
  const [createFrequency, setCreateFrequency] = useState('monthly');
  const [createStartDate, setCreateStartDate] = useState(today());
  const [createDescription, setCreateDescription] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [createErrors, setCreateErrors] = useState({});
  const [catPickerVisible, setCatPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSaving, setEditSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const online = await isOnline();
      if (online) {
        const [recRes, catRes] = await Promise.all([
          apiRequest('/recurring'),
          apiRequest('/categories'),
        ]);
        if (!recRes.ok) {
          const d = await recRes.json().catch(() => ({}));
          throw new Error(d?.detail || `Failed to load recurring (${recRes.status})`);
        }
        if (!catRes.ok) {
          const d = await catRes.json().catch(() => ({}));
          throw new Error(d?.detail || `Failed to load categories (${catRes.status})`);
        }
        const recData = await recRes.json();
        const catData = await catRes.json();
        const recList = Array.isArray(recData) ? recData : [];
        const catList = [...(catData.system ?? []), ...(catData.custom ?? [])];
        await saveCache('recurring', recList);
        await saveCache('recurring_categories', catList);
        setRecurring(recList);
        setCategories(catList);
      } else {
        const cachedRec = await readCache('recurring');
        const cachedCat = await readCache('recurring_categories');
        if (cachedRec) setRecurring(cachedRec);
        if (cachedCat) setCategories(cachedCat);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // ── Create ────────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateType('expense');
    setCreateAmount('');
    setCreateCategory(null);
    setCreateFrequency('monthly');
    setCreateStartDate(today());
    setCreateDescription('');
    setCreateEndDate('');
    setCreateErrors({});
    setCreateVisible(true);
  }

  function closeCreate() {
    setCreateVisible(false);
  }

  function validateCreate() {
    const errs = {};
    const parsed = parseFloat(createAmount);
    if (!createAmount.trim()) errs.amount = 'Amount is required';
    else if (isNaN(parsed) || parsed <= 0) errs.amount = 'Enter a valid positive amount';
    if (!createCategory) errs.category = 'Please select a category';
    if (!createStartDate.trim()) errs.startDate = 'Start date is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(createStartDate.trim())) errs.startDate = 'Use format YYYY-MM-DD';
    if (createEndDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(createEndDate.trim())) errs.endDate = 'Use format YYYY-MM-DD';
    return errs;
  }

  async function handleCreate() {
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Creating rules requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Creating rules requires an internet connection.');
      }
      return;
    }
    const errs = validateCreate();
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }
    setCreateErrors({});
    setSaving(true);
    try {
      const body = {
        type: createType,
        amount: parseFloat(createAmount),
        category_id: createCategory.id,
        frequency: createFrequency,
        start_date: createStartDate.trim(),
      };
      if (createDescription.trim()) body.description = createDescription.trim();
      if (createEndDate.trim()) body.end_date = createEndDate.trim();

      const res = await apiRequest('/recurring', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Create failed (${res.status})`);
      }
      closeCreate();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create recurring rule.');
    } finally {
      setSaving(false);
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────

  function openEdit(item) {
    setEditingItem(item);
    setEditAmount(String(item.amount ?? ''));
    setEditDescription(item.description ?? '');
    setEditEndDate(item.end_date ?? '');
    setEditIsActive(item.is_active ?? true);
    setEditVisible(true);
  }

  function closeEdit() {
    setEditVisible(false);
    setEditingItem(null);
  }

  async function handleEditSave() {
    if (!editingItem) return;
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Saving changes requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Saving changes requires an internet connection.');
      }
      return;
    }
    const parsed = parseFloat(editAmount);
    if (!editAmount.trim() || isNaN(parsed) || parsed <= 0) {
      Alert.alert('Validation', 'Enter a valid positive amount.');
      return;
    }
    if (editEndDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(editEndDate.trim())) {
      Alert.alert('Validation', 'End date must be in YYYY-MM-DD format.');
      return;
    }
    setEditSaving(true);
    try {
      const body = {
        amount: parsed,
        description: editDescription.trim() || null,
        end_date: editEndDate.trim() || null,
        is_active: editIsActive,
      };
      const res = await apiRequest(`/recurring/${editingItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Update failed (${res.status})`);
      }
      closeEdit();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update recurring rule.');
    } finally {
      setEditSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(item) {
    const online = await isOnline();
    if (!online) {
      if (Platform.OS === 'web') {
        window.alert('You\'re offline · Deleting rules requires an internet connection.');
      } else {
        Alert.alert('You\'re offline', 'Deleting rules requires an internet connection.');
      }
      return;
    }
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this recurring rule?')) {
        confirmDelete(item);
      }
    } else {
      Alert.alert(
        'Delete Rule',
        'Are you sure you want to delete this recurring rule?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(item) },
        ]
      );
    }
  }

  async function confirmDelete(item) {
    setDeleting(true);
    try {
      const res = await apiRequest(`/recurring/${item.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.detail || `Delete failed (${res.status})`);
      }
      closeEdit();
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete recurring rule.');
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator size="large" color="#00E5FF" />
    </SafeAreaView>
  );

  if (error) return (
    <SafeAreaView style={styles.centered}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner cacheKey="recurring" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recurring</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {recurring.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔁</Text>
            <Text style={styles.emptyTitle}>No recurring rules</Text>
            <Text style={styles.emptySubtitle}>
              Set up automatic transactions for bills, subscriptions, and income.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openCreate}>
              <Text style={styles.emptyButtonText}>Add a rule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.sectionTitle}>Scheduled Rules</Text>
            <View style={styles.divider} />
            {recurring.map((item, index) => {
              const isExpense = item.type === 'expense';
              const isActive = item.is_active;
              const categoryName = item.category?.name ?? 'Category';
              const emoji = getCategoryEmoji(getCategoryIcon(categoryName));
              const amountColor = isExpense ? '#ffb4ab' : '#00E5FF';
              const amountPrefix = isExpense ? '-' : '+';

              return (
                <TouchableOpacity
                  key={item.id?.toString() ?? index.toString()}
                  style={[styles.ruleRow, !isActive && styles.ruleRowInactive]}
                  onPress={() => openEdit(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.ruleIconBox}>
                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                  </View>
                  <View style={styles.ruleMiddle}>
                    <Text style={[styles.ruleName, !isActive && styles.ruleNameInactive]} numberOfLines={1}>
                      {item.description || categoryName}
                    </Text>
                    <View style={styles.ruleMetaRow}>
                      <View style={styles.freqBadge}>
                        <Text style={styles.freqBadgeText}>{capitalize(item.frequency)}</Text>
                      </View>
                      {item.description ? (
                        <Text style={styles.ruleCategoryText} numberOfLines={1}>{categoryName}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.ruleNextDue}>Next: {item.next_due_date ?? '—'}</Text>
                  </View>
                  <View style={styles.ruleRight}>
                    <Text style={[styles.ruleAmount, { color: amountColor }, !isActive && styles.ruleAmountInactive]}>
                      {amountPrefix}{formatCurrency(item.amount)}
                    </Text>
                    <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                      <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextInactive]}>
                        {isActive ? 'Active' : 'Paused'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      <Modal visible={createVisible} animationType="slide" transparent onRequestClose={closeCreate}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <ScrollView
              contentContainerStyle={styles.modalSheetContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Recurring Rule</Text>
                <TouchableOpacity onPress={closeCreate} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Type */}
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeBtn, createType === 'expense' && styles.typeBtnExpenseActive]}
                  onPress={() => setCreateType('expense')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, createType === 'expense' && styles.typeBtnTextExpenseActive]}>
                    ↑  Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, createType === 'income' && styles.typeBtnIncomeActive]}
                  onPress={() => setCreateType('income')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeBtnText, createType === 'income' && styles.typeBtnTextIncomeActive]}>
                    ↓  Income
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={[styles.input, createErrors.amount && styles.inputError]}
                placeholder="0.00"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                value={createAmount}
                onChangeText={setCreateAmount}
              />
              {createErrors.amount ? <Text style={styles.fieldError}>{createErrors.amount}</Text> : null}

              {/* Category */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Category</Text>
              <TouchableOpacity
                style={[styles.selectTrigger, createErrors.category && styles.selectTriggerError]}
                onPress={() => setCatPickerVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectLeft}>
                  <View style={[styles.selectIconBox, !createCategory && { backgroundColor: '#2a2a2a' }]}>
                    <Text style={{ fontSize: 14 }}>
                      {createCategory ? getCategoryEmoji(getCategoryIcon(createCategory.name)) : '🏷️'}
                    </Text>
                  </View>
                  <Text style={createCategory ? styles.selectValue : styles.selectPlaceholder}>
                    {createCategory ? createCategory.name : 'Select a category'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#4b5563' }}>›</Text>
              </TouchableOpacity>
              {createErrors.category ? <Text style={styles.fieldError}>{createErrors.category}</Text> : null}

              {/* Frequency */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Frequency</Text>
              <View style={styles.chipRow}>
                {FREQUENCIES.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, createFrequency === f && styles.chipSelected]}
                    onPress={() => setCreateFrequency(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, createFrequency === f && styles.chipTextSelected]}>
                      {capitalize(f)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Start Date */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Start Date</Text>
              <View style={[styles.inputRow, createErrors.startDate && styles.inputRowError]}>
                <Text style={{ fontSize: 14, color: '#4b5563', marginRight: 10 }}>📅</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4b5563"
                  value={createStartDate}
                  onChangeText={setCreateStartDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {createErrors.startDate ? <Text style={styles.fieldError}>{createErrors.startDate}</Text> : null}

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Description <Text style={styles.optionalLabel}>optional</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Netflix subscription"
                placeholderTextColor="#6b7280"
                value={createDescription}
                onChangeText={setCreateDescription}
              />

              {/* End Date */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                End Date <Text style={styles.optionalLabel}>optional</Text>
              </Text>
              <View style={[styles.inputRow, createErrors.endDate && styles.inputRowError]}>
                <Text style={{ fontSize: 14, color: '#4b5563', marginRight: 10 }}>📅</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4b5563"
                  value={createEndDate}
                  onChangeText={setCreateEndDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              {createErrors.endDate ? <Text style={styles.fieldError}>{createErrors.endDate}</Text> : null}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled, { marginTop: 24 }]}
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving
                  ? <ActivityIndicator color="#001f24" />
                  : <Text style={styles.saveButtonText}>Create Rule</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={closeEdit}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Rule</Text>
                <TouchableOpacity onPress={closeEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              {editingItem && (
                <View style={styles.editInfoRow}>
                  <View style={styles.editInfoIcon}>
                    <Text style={{ fontSize: 20 }}>
                      {getCategoryEmoji(getCategoryIcon(editingItem.category?.name ?? ''))}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.editInfoName} numberOfLines={1}>
                      {editingItem.description || editingItem.category?.name || 'Rule'}
                    </Text>
                    <Text style={styles.editInfoMeta}>
                      {capitalize(editingItem.frequency)} · {capitalize(editingItem.type)} · starts {editingItem.start_date}
                    </Text>
                  </View>
                </View>
              )}

              {/* Amount */}
              <Text style={styles.fieldLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#6b7280"
                keyboardType="decimal-pad"
                value={editAmount}
                onChangeText={setEditAmount}
              />

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                Description <Text style={styles.optionalLabel}>optional</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Netflix subscription"
                placeholderTextColor="#6b7280"
                value={editDescription}
                onChangeText={setEditDescription}
              />

              {/* End Date */}
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
                End Date <Text style={styles.optionalLabel}>optional</Text>
              </Text>
              <View style={styles.inputRow}>
                <Text style={{ fontSize: 14, color: '#4b5563', marginRight: 10 }}>📅</Text>
                <TextInput
                  style={styles.inputInner}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#4b5563"
                  value={editEndDate}
                  onChangeText={setEditEndDate}
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              {/* Active toggle */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Active</Text>
                  <Text style={styles.toggleSubLabel}>Pause or resume this rule</Text>
                </View>
                <Switch
                  value={editIsActive}
                  onValueChange={setEditIsActive}
                  trackColor={{ false: '#34343a', true: 'rgba(0,229,255,0.35)' }}
                  thumbColor={editIsActive ? '#00E5FF' : '#6b7280'}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, (editSaving || deleting) && styles.saveButtonDisabled, { marginTop: 24 }]}
                onPress={handleEditSave}
                disabled={editSaving || deleting}
                activeOpacity={0.85}
              >
                {editSaving
                  ? <ActivityIndicator color="#001f24" />
                  : <Text style={styles.saveButtonText}>Save Changes</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteButton, (editSaving || deleting) && styles.saveButtonDisabled]}
                onPress={() => handleDelete(editingItem)}
                disabled={editSaving || deleting}
                activeOpacity={0.85}
              >
                {deleting
                  ? <ActivityIndicator color="#ffb4ab" />
                  : <Text style={styles.deleteButtonText}>Delete Rule</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Category Picker Modal ────────────────────────────────────────── */}
      <Modal visible={catPickerVisible} animationType="slide" transparent onRequestClose={() => setCatPickerVisible(false)}>
        <TouchableOpacity
          style={styles.catOverlay}
          activeOpacity={1}
          onPress={() => setCatPickerVisible(false)}
        />
        <View style={styles.catSheet}>
          <View style={styles.catHandle} />
          <View style={styles.catHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setCatPickerVisible(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const selected = createCategory?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.catItem, selected && styles.catItemSelected]}
                  onPress={() => { setCreateCategory(item); setCatPickerVisible(false); }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.catItemIcon, selected && styles.catItemIconSelected]}>
                    <Text style={{ fontSize: 14 }}>{getCategoryEmoji(getCategoryIcon(item.name))}</Text>
                  </View>
                  <Text style={[styles.catItemText, selected && styles.catItemTextSelected]}>
                    {item.name}
                  </Text>
                  {selected && <Text style={{ fontSize: 14, color: '#00E5FF', marginLeft: 'auto' }}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.catSeparator} />}
            contentContainerStyle={{ paddingBottom: 32 }}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121318', paddingHorizontal: 28 },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: 'rgba(18,19,24,0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.15)',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#00E5FF', letterSpacing: -0.5 },
  scrollContent: { paddingTop: 8 },

  // List
  listSection: { paddingHorizontal: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#bac9cc', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(59,73,76,0.2)', marginBottom: 12 },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1b21',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.1)',
  },
  ruleRowInactive: { opacity: 0.5 },
  ruleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ruleMiddle: { flex: 1 },
  ruleName: { fontSize: 14, fontWeight: '600', color: '#e3e1e9', marginBottom: 5 },
  ruleNameInactive: { color: '#bac9cc' },
  ruleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  freqBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(0,229,255,0.1)',
  },
  freqBadgeText: { fontSize: 10, fontWeight: '600', color: '#00E5FF', textTransform: 'uppercase', letterSpacing: 0.5 },
  ruleCategoryText: { fontSize: 11, color: '#bac9cc' },
  ruleNextDue: { fontSize: 11, color: '#6b7280' },
  ruleRight: { alignItems: 'flex-end', flexShrink: 0 },
  ruleAmount: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  ruleAmountInactive: { opacity: 0.6 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusActive: { backgroundColor: 'rgba(0,229,255,0.1)' },
  statusInactive: { backgroundColor: 'rgba(107,114,128,0.15)' },
  statusText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statusTextActive: { color: '#00E5FF' },
  statusTextInactive: { color: '#6b7280' },

  // Empty state
  emptyContainer: { paddingTop: 60, alignItems: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#e3e1e9', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: '#bac9cc', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyButton: { height: 44, paddingHorizontal: 28, backgroundColor: '#00E5FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { color: '#001f24', fontSize: 14, fontWeight: '700' },

  // Error / retry
  errorText: { fontSize: 15, color: '#ffb4ab', textAlign: 'center', marginBottom: 20 },
  retryButton: { height: 44, paddingHorizontal: 32, backgroundColor: '#00E5FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: '#001f24', fontSize: 15, fontWeight: '700' },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: { fontSize: 30, lineHeight: 34, fontWeight: '300', color: '#001f24' },

  // Modal shared
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: '#1e1f25',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
  },
  modalSheetContent: {
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
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e3e1e9' },
  modalClose: { fontSize: 16, color: '#bac9cc' },
  modalDone: { fontSize: 14, fontWeight: '600', color: '#00E5FF' },

  // Form fields
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#bac9cc',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  optionalLabel: { fontWeight: '400', color: '#4b5563', textTransform: 'none', letterSpacing: 0 },
  fieldError: { fontSize: 11, color: '#ffb4ab', marginTop: 4, marginBottom: 4 },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#e3e1e9',
    backgroundColor: '#121318',
    marginBottom: 4,
  },
  inputError: { borderColor: '#ffb4ab' },

  inputRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121318',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    marginBottom: 4,
  },
  inputRowError: { borderColor: '#ffb4ab' },
  inputInner: { flex: 1, fontSize: 15, color: '#e3e1e9' },

  // Type toggle
  typeToggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  typeBtn: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#121318',
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },
  typeBtnExpenseActive: { backgroundColor: 'rgba(255,180,171,0.12)', borderColor: 'rgba(255,180,171,0.4)' },
  typeBtnIncomeActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#bac9cc' },
  typeBtnTextExpenseActive: { color: '#ffb4ab' },
  typeBtnTextIncomeActive: { color: '#001f24' },

  // Category selector
  selectTrigger: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121318',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    marginBottom: 4,
  },
  selectTriggerError: { borderColor: '#ffb4ab' },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectIconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectPlaceholder: { fontSize: 14, color: '#4b5563' },
  selectValue: { fontSize: 14, color: '#e3e1e9', fontWeight: '500' },

  // Frequency chips
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    backgroundColor: '#121318',
  },
  chipSelected: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#bac9cc' },
  chipTextSelected: { color: '#001f24', fontWeight: '700' },

  // Active toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#121318',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#e3e1e9', marginBottom: 2 },
  toggleSubLabel: { fontSize: 11, color: '#6b7280' },

  // Edit info row
  editInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.2)',
  },
  editInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editInfoName: { fontSize: 15, fontWeight: '700', color: '#e3e1e9', marginBottom: 3 },
  editInfoMeta: { fontSize: 11, color: '#bac9cc' },

  // Save / delete buttons
  saveButton: {
    height: 50,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#001f24', fontSize: 15, fontWeight: '700' },
  deleteButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.3)',
    backgroundColor: 'rgba(255,180,171,0.06)',
  },
  deleteButtonText: { color: '#ffb4ab', fontSize: 15, fontWeight: '600' },

  // Category picker
  catOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  catSheet: {
    backgroundColor: '#1e1f25',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 8,
  },
  catHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34343a',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.2)',
  },
  catItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
  },
  catItemSelected: { backgroundColor: 'rgba(0,229,255,0.05)' },
  catItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#34343a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catItemIconSelected: { backgroundColor: '#00E5FF' },
  catItemText: { fontSize: 14, color: '#bac9cc', fontWeight: '500' },
  catItemTextSelected: { color: '#e3e1e9', fontWeight: '600' },
  catSeparator: { height: 1, backgroundColor: 'rgba(59,73,76,0.1)', marginHorizontal: 20 },
});
