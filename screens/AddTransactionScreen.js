import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { storage } from '../utils/storage';
import { recordTransaction } from '../utils/streak';
import { getCategoryEmoji } from '../utils/categoryIcon';

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

export default function AddTransactionScreen({ navigation, route }) {
  const defaultType = route?.params?.defaultType ?? 'expense';

  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null);
  const [type, setType] = useState(defaultType);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());

  const [pickerVisible, setPickerVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await storage.getItem('access_token');
        const res = await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/categories', {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  function validate() {
    const next = {};
    const parsed = parseFloat(amount);
    if (!amount.trim()) next.amount = 'Amount is required';
    else if (isNaN(parsed) || parsed <= 0) next.amount = 'Enter a valid positive amount';
    if (!category) next.category = 'Please select a category';
    if (!date.trim()) next.date = 'Date is required';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) next.date = 'Use format YYYY-MM-DD';
    return next;
  }

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const token = await storage.getItem('access_token');
      const body = {
        amount: parseFloat(amount),
        category_id: category.id,
        type,
        description: description.trim(),
        date: date.trim(),
      };
      const res = await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        await storage.removeItem('access_token');
        navigation.replace('Login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Submission failed (${res.status})`);
      }
      await recordTransaction();
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  }

  const isIncome = type === 'income';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Type toggle */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpenseActive]}
              onPress={() => setType('expense')}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, marginBottom: 4, color: type === 'expense' ? '#ffb4ab' : '#bac9cc' }}>↑</Text>
              <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextExpenseActive]}>
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeBtn, type === 'income' && styles.typeBtnIncomeActive]}
              onPress={() => setType('income')}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16, marginBottom: 4, color: type === 'income' ? '#001f24' : '#bac9cc' }}>↓</Text>
              <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextIncomeActive]}>
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount hero field */}
          <View style={styles.amountSection}>
            <Text style={styles.amountPrefix}>{isIncome ? '+' : '-'}</Text>
            <TextInput
              style={[styles.amountInput, errors.amount && styles.amountInputError]}
              placeholder="0.00"
              placeholderTextColor="#2a2a2a"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              selectionColor="#00E5FF"
            />
          </View>
          {errors.amount ? (
            <Text style={styles.fieldError}>{errors.amount}</Text>
          ) : null}

          <View style={styles.divider} />

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            {catLoading ? (
              <ActivityIndicator style={{ marginTop: 8 }} color="#00E5FF" />
            ) : catError ? (
              <Text style={styles.fieldError}>{catError}</Text>
            ) : (
              <TouchableOpacity
                style={[styles.selectTrigger, errors.category && styles.selectTriggerError]}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.selectLeft}>
                  <View style={[styles.selectIconBox, !category && { backgroundColor: '#2a2a2a' }]}>
                    <Text style={{ fontSize: 14 }}>
                      {category ? getCategoryEmoji(getCategoryIcon(category.name)) : '🏷️'}
                    </Text>
                  </View>
                  <Text style={category ? styles.selectValue : styles.selectPlaceholder}>
                    {category ? category.name : 'Select a category'}
                  </Text>
                </View>
                <Text style={{ fontSize: 14, color: '#4b5563' }}>›</Text>
              </TouchableOpacity>
            )}
            {errors.category ? <Text style={styles.fieldError}>{errors.category}</Text> : null}
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
              value={description}
              onChangeText={setDescription}
              returnKeyType="next"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <View style={[styles.inputRow, errors.date && styles.inputRowError]}>
              <Text style={{ fontSize: 14, color: '#4b5563', marginRight: 10 }}>📅</Text>
              <TextInput
                style={styles.inputInner}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#4b5563"
                value={date}
                onChangeText={setDate}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            {errors.date ? <Text style={styles.fieldError}>{errors.date}</Text> : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#001f24" />
            ) : (
              <Text style={styles.submitBtnText}>Save Transaction</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

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
              const selected = category?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.modalItem, selected && styles.modalItemSelected]}
                  onPress={() => { setCategory(item); setPickerVisible(false); }}
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
  safeArea: { flex: 1, backgroundColor: '#121318' },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  // Type toggle
  typeToggle: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1a1b21',
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.2)',
  },
  typeBtnExpenseActive: {
    backgroundColor: 'rgba(255,180,171,0.15)',
    borderColor: 'rgba(255,180,171,0.4)',
  },
  typeBtnIncomeActive: {
    backgroundColor: '#00E5FF',
    borderColor: '#00E5FF',
  },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#bac9cc' },
  typeBtnTextExpenseActive: { color: '#ffb4ab' },
  typeBtnTextIncomeActive: { color: '#001f24' },

  // Amount
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  amountPrefix: {
    fontSize: 36,
    fontWeight: '300',
    color: '#bac9cc',
    marginRight: 4,
    lineHeight: 60,
  },
  amountInput: {
    fontSize: 52,
    fontWeight: '700',
    color: '#e3e1e9',
    letterSpacing: -1,
    minWidth: 120,
    textAlign: 'center',
  },
  amountInputError: { color: '#ffb4ab' },

  divider: {
    height: 1,
    backgroundColor: 'rgba(59,73,76,0.2)',
    marginVertical: 24,
  },

  // Fields
  field: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bac9cc',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  optional: { fontWeight: '400', color: '#4b5563', textTransform: 'none' },
  fieldError: { fontSize: 11, color: '#ffb4ab', marginTop: 4 },

  // Category selector
  selectTrigger: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1b21',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },
  selectTriggerError: { borderColor: '#ffb4ab' },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectIconBox: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(0,229,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  selectPlaceholder: { fontSize: 14, color: '#4b5563' },
  selectValue: { fontSize: 14, color: '#e3e1e9', fontWeight: '500' },

  // Text input
  input: {
    height: 50,
    backgroundColor: '#1a1b21',
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#e3e1e9',
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },

  // Date input with icon
  inputRow: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1b21',
    borderRadius: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },
  inputRowError: { borderColor: '#ffb4ab' },
  inputInner: { flex: 1, fontSize: 14, color: '#e3e1e9' },

  // Submit
  submitBtn: {
    height: 52,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#001f24', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Modal
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
  modalItemText: { fontSize: 14, color: '#bac9cc', fontWeight: '500' },
  modalItemTextSelected: { color: '#e3e1e9', fontWeight: '600' },
  modalSeparator: {
    height: 1,
    backgroundColor: 'rgba(59,73,76,0.1)',
    marginHorizontal: 20,
  },
});
