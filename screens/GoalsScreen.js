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
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://finance-tracker-production-e13e.up.railway.app/api/v1/goals';

async function getToken() {
  return AsyncStorage.getItem('access_token');
}

export default function GoalsScreen({ navigation }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Add goal modal
  const [addVisible, setAddVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [addDeadline, setAddDeadline] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  // Add money modal
  const [moneyGoal, setMoneyGoal] = useState(null);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySaving, setMoneySaving] = useState(false);

  const fetchGoals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(API, {
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
      setGoals(data);
    } catch (err) {
      setError(err.message || 'Failed to load goals.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  async function handleAddGoal() {
    const name = addName.trim();
    const target = parseFloat(addTarget);
    if (!name) return Alert.alert('Error', 'Please enter a goal name.');
    if (isNaN(target) || target <= 0) return Alert.alert('Error', 'Please enter a valid target amount.');
    const deadline = addDeadline.trim();
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return Alert.alert('Error', 'Deadline must be in YYYY-MM-DD format.');
    }
    setAddSaving(true);
    try {
      const token = await getToken();
      const body = { name, target_amount: target };
      if (deadline) body.deadline = deadline;
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      const newGoal = await res.json();
      setGoals(prev => [newGoal, ...prev]);
      setAddVisible(false);
      setAddName('');
      setAddTarget('');
      setAddDeadline('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to create goal.');
    } finally {
      setAddSaving(false);
    }
  }

  async function handleAddMoney() {
    const amount = parseFloat(moneyAmount);
    if (isNaN(amount) || amount <= 0) return Alert.alert('Error', 'Please enter a valid amount.');
    setMoneySaving(true);
    try {
      const token = await getToken();
      const goal = moneyGoal;
      const newCurrent = parseFloat(goal.current_amount) + amount;
      const body = {
        name: goal.name,
        target_amount: parseFloat(goal.target_amount),
        current_amount: newCurrent,
      };
      if (goal.deadline) body.deadline = goal.deadline;
      const res = await fetch(`${API}/${goal.id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      const updated = await res.json();
      setGoals(prev => prev.map(g => (g.id === updated.id ? updated : g)));
      setMoneyGoal(null);
      setMoneyAmount('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update goal.');
    } finally {
      setMoneySaving(false);
    }
  }

  async function doDeleteGoal(goal) {
    try {
      const token = await getToken();
      const url = `${API}/${goal.id}`;
      console.log('[GoalDelete] token:', token);
      console.log('[GoalDelete] url:', url);
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('[GoalDelete] status:', res.status);
      if (res.status === 401) {
        await AsyncStorage.removeItem('access_token');
        navigation.getParent()?.replace('Login');
        return;
      }
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `Request failed (${res.status})`);
      }
      setGoals(prev => prev.filter(g => g.id !== goal.id));
    } catch (err) {
      console.log('[GoalDelete] error:', err.message);
      Alert.alert('Error', err.message || 'Failed to delete goal.');
    }
  }

  function handleDelete(goal) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${goal.name}"?`)) {
        doDeleteGoal(goal);
      }
      return;
    }
    Alert.alert('Delete Goal', `Delete "${goal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => doDeleteGoal(goal) },
    ]);
  }

  function renderGoal({ item }) {
    const current = parseFloat(item.current_amount);
    const target = parseFloat(item.target_amount);
    const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const complete = current >= target;
    const remaining = Math.max(target - current, 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.goalName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.currentAmount}>${current.toFixed(2)}</Text>
          <Text style={styles.targetAmount}> / ${target.toFixed(2)}</Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${pct}%`, backgroundColor: complete ? '#4f6ef7' : '#48bb78' },
            ]}
          />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.remainingText}>
            {complete ? 'Goal reached! 🎉' : `$${remaining.toFixed(2)} remaining`}
          </Text>
          {item.deadline ? (
            <Text style={styles.deadlineText}>By {item.deadline}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.addMoneyBtn}
          onPress={() => { setMoneyGoal(item); setMoneyAmount(''); }}
          activeOpacity={0.75}
        >
          <Text style={styles.addMoneyBtnText}>+ Add Money</Text>
        </TouchableOpacity>
      </View>
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
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchGoals()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Goals</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => { setAddName(''); setAddTarget(''); setAddDeadline(''); setAddVisible(true); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {goals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyText}>No goals yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setAddVisible(true)}
          >
            <Text style={styles.emptyButtonText}>Create a Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderGoal}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchGoals(true)}
              tintColor="#4f6ef7"
            />
          }
        />
      )}

      {/* Add Goal Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Goal name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AirPods"
              placeholderTextColor="#4a5568"
              value={addName}
              onChangeText={setAddName}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Target amount ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="200.00"
              placeholderTextColor="#4a5568"
              value={addTarget}
              onChangeText={setAddTarget}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>Deadline (optional, YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor="#4a5568"
              value={addDeadline}
              onChangeText={setAddDeadline}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={[styles.submitBtn, addSaving && styles.submitBtnDisabled]}
              onPress={handleAddGoal}
              disabled={addSaving}
            >
              {addSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Create Goal</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Money Modal */}
      <Modal visible={!!moneyGoal} transparent animationType="slide" onRequestClose={() => setMoneyGoal(null)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setMoneyGoal(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {moneyGoal && (
              <Text style={styles.moneyGoalName}>{moneyGoal.name}</Text>
            )}

            <Text style={styles.inputLabel}>Amount to add ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#4a5568"
              value={moneyAmount}
              onChangeText={setMoneyAmount}
              keyboardType="decimal-pad"
              returnKeyType="done"
              autoFocus
            />

            <TouchableOpacity
              style={[styles.submitBtn, moneySaving && styles.submitBtnDisabled]}
              onPress={handleAddMoney}
              disabled={moneySaving}
            >
              {moneySaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>Add Money</Text>}
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
    paddingBottom: 32,
  },
  separator: {
    height: 12,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a4a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f4f8',
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    fontSize: 14,
    color: '#fc8181',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f0f4f8',
  },
  targetAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a0aec0',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#2a2a4a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  remainingText: {
    fontSize: 13,
    color: '#a0aec0',
  },
  deadlineText: {
    fontSize: 12,
    color: '#a0aec0',
  },
  addMoneyBtn: {
    height: 38,
    backgroundColor: 'rgba(79,110,247,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f6ef7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoneyBtnText: {
    color: '#4f6ef7',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    color: '#4a5568',
  },
  emptyText: {
    fontSize: 15,
    color: '#a0aec0',
    marginBottom: 20,
  },
  emptyButton: {
    height: 44,
    paddingHorizontal: 24,
    backgroundColor: '#4f6ef7',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: '#2a2a4a',
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
    padding: 4,
  },
  moneyGoalName: {
    fontSize: 14,
    color: '#a0aec0',
    marginBottom: 16,
    marginTop: -8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a0aec0',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    paddingHorizontal: 14,
    color: '#f0f4f8',
    fontSize: 15,
    marginBottom: 14,
  },
  submitBtn: {
    height: 50,
    backgroundColor: '#4f6ef7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
