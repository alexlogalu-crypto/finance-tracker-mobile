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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { recordTransaction } from '../utils/streak';

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function AddTransactionScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState(null);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(null); // { id, name }
  const [type, setType] = useState('expense');    // 'income' | 'expense'
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());

  const [pickerVisible, setPickerVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
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
      const token = await AsyncStorage.getItem('access_token');
      const body = {
        amount: parseFloat(amount),
        category_id: category.id,
        type,
        description: description.trim(),
        date: date.trim(),
      };
      const res = await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Type toggle */}
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.toggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, type === 'expense' && styles.toggleBtnActiveExpense]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.toggleBtnText, type === 'expense' && styles.toggleBtnTextActive]}>
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, type === 'income' && styles.toggleBtnActiveIncome]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.toggleBtnText, type === 'income' && styles.toggleBtnTextActive]}>
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.field}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              placeholder="0.00"
              placeholderTextColor="#a0aec0"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
            {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            {catLoading ? (
              <ActivityIndicator style={styles.catLoader} color="#4f6ef7" />
            ) : catError ? (
              <Text style={styles.errorText}>{catError}</Text>
            ) : (
              <TouchableOpacity
                style={[styles.input, styles.pickerTrigger, errors.category && styles.inputError]}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={category ? styles.pickerValue : styles.pickerPlaceholder}>
                  {category ? category.name : 'Select a category'}
                </Text>
                <Text style={styles.pickerChevron}>›</Text>
              </TouchableOpacity>
            )}
            {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description <Text style={styles.optional}>(optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Grocery run"
              placeholderTextColor="#a0aec0"
              value={description}
              onChangeText={setDescription}
              returnKeyType="next"
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={[styles.input, errors.date && styles.inputError]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#a0aec0"
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
            />
            {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <TouchableOpacity onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                  setCategory(item);
                  setPickerVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{item.name}</Text>
                {category?.id === item.id && <Text style={styles.modalItemCheck}>✓</Text>}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
