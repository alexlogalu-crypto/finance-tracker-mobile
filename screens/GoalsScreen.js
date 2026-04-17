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
} from 'react-native';
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';

const API = 'https://finance-tracker-production-e13e.up.railway.app/api/v1/goals';

async function getToken() {
  return storage.getItem('access_token');
}

export default function GoalsScreen({ navigation }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [addVisible, setAddVisible] = useState(false);
  const [addName, setAddName] = useState('');
  const [addTarget, setAddTarget] = useState('');
  const [addDeadline, setAddDeadline] = useState('');
  const [addSaving, setAddSaving] = useState(false);

  const [moneyGoal, setMoneyGoal] = useState(null);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneySaving, setMoneySaving] = useState(false);

  const fetchGoals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/goals');
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

  useFocusEffect(useCallback(() => { fetchGoals(); }, [fetchGoals]));

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
      const body = { name, target_amount: target };
      if (deadline) body.deadline = deadline;
      const res = await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data?.detail || `Request failed (${res.status})`); }
      const newGoal = await res.json();
      setGoals(prev => [newGoal, ...prev]);
      setAddVisible(false);
      setAddName(''); setAddTarget(''); setAddDeadline('');
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
      const goal = moneyGoal;
      const newCurrent = parseFloat(goal.current_amount) + amount;
      const body = { name: goal.name, target_amount: parseFloat(goal.target_amount), current_amount: newCurrent };
      if (goal.deadline) body.deadline = goal.deadline;
      const res = await apiRequest(`/goals/${goal.id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data?.detail || `Request failed (${res.status})`); }
      const updated = await res.json();
      setGoals(prev => prev.map(g => (g.id === updated.id ? updated : g)));
      setMoneyGoal(null); setMoneyAmount('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update goal.');
    } finally {
      setMoneySaving(false);
    }
  }

  async function doDeleteGoal(goal) {
    try {
      const res = await apiRequest(`/goals/${goal.id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) { const data = await res.json().catch(() => ({})); throw new Error(data?.detail || `Request failed (${res.status})`); }
      setGoals(prev => prev.filter(g => g.id !== goal.id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete goal.');
    }
  }

  function handleDelete(goal) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${goal.name}"?`)) doDeleteGoal(goal);
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
        {/* Card header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.goalName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.goalSubLabel}>{complete ? 'Goal Complete' : 'Savings Goal'}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.deleteBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.barOuter}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${pct}%` }]} />
          </View>
        </View>

        {/* Target / Saved footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Target</Text>
            <Text style={styles.footerValue}>${target.toFixed(2)}</Text>
          </View>
          <View>
            <Text style={styles.footerLabel}>Saved</Text>
            <Text style={styles.footerValueCyan}>${current.toFixed(2)}</Text>
          </View>
          {item.deadline && (
            <View>
              <Text style={styles.footerLabel}>Deadline</Text>
              <Text style={styles.footerValue}>{item.deadline}</Text>
            </View>
          )}
        </View>

        {/* Action button */}
        <TouchableOpacity
          style={styles.detailBtn}
          onPress={() => { setMoneyGoal(item); setMoneyAmount(''); }}
          activeOpacity={0.75}
        >
          <Text style={styles.detailBtnText}>+ Add Money</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator size="large" color="#00E5FF" /></SafeAreaView>;
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

  // Aggregate progress
  const totalSaved = goals.reduce((sum, g) => sum + parseFloat(g.current_amount ?? 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + parseFloat(g.target_amount ?? 0), 0);
  const aggPct = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerOverview}>Overview</Text>
          <Text style={styles.headerTitle}>Wealth Goals</Text>
        </View>
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
          <TouchableOpacity style={styles.emptyButton} onPress={() => setAddVisible(true)}>
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchGoals(true)} tintColor="#00E5FF" />}
          ListHeaderComponent={goals.length > 0 ? (
            <View style={styles.statsCard}>
              <Text style={styles.statsLabel}>Aggregate Progress</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsPct}>{aggPct}%</Text>
                <Text style={styles.statsCompleted}>Completed</Text>
              </View>
            </View>
          ) : null}
        />
      )}

      {/* Add Goal Modal */}
      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Goal</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Goal name</Text>
            <TextInput style={styles.input} placeholder="e.g. AirPods" placeholderTextColor="#4a5568" value={addName} onChangeText={setAddName} returnKeyType="next" />
            <Text style={styles.inputLabel}>Target amount ($)</Text>
            <TextInput style={styles.input} placeholder="200.00" placeholderTextColor="#4a5568" value={addTarget} onChangeText={setAddTarget} keyboardType="decimal-pad" returnKeyType="next" />
            <Text style={styles.inputLabel}>Deadline (optional, YYYY-MM-DD)</Text>
            <TextInput style={styles.input} placeholder="2026-12-31" placeholderTextColor="#4a5568" value={addDeadline} onChangeText={setAddDeadline} returnKeyType="done" />
            <TouchableOpacity style={[styles.submitBtn, addSaving && styles.submitBtnDisabled]} onPress={handleAddGoal} disabled={addSaving}>
              {addSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Create Goal</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Money Modal */}
      <Modal visible={!!moneyGoal} transparent animationType="slide" onRequestClose={() => setMoneyGoal(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Money</Text>
              <TouchableOpacity onPress={() => setMoneyGoal(null)}><Text style={styles.modalClose}>✕</Text></TouchableOpacity>
            </View>
            {moneyGoal && <Text style={styles.moneyGoalName}>{moneyGoal.name}</Text>}
            <Text style={styles.inputLabel}>Amount to add ($)</Text>
            <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#4a5568" value={moneyAmount} onChangeText={setMoneyAmount} keyboardType="decimal-pad" returnKeyType="done" autoFocus />
            <TouchableOpacity style={[styles.submitBtn, moneySaving && styles.submitBtnDisabled]} onPress={handleAddMoney} disabled={moneySaving}>
              {moneySaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Add Money</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121318' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121318', paddingHorizontal: 28 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    backgroundColor: 'rgba(18,19,24,0.7)', borderBottomWidth: 1, borderBottomColor: 'rgba(59,73,76,0.15)',
  },
  headerOverview: { fontSize: 10, fontWeight: '600', color: '#bac9cc', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#e3e1e9', letterSpacing: -0.5 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#00E5FF', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#001f24', fontSize: 22, lineHeight: 26, fontWeight: '400' },
  // Stats card
  statsCard: {
    marginHorizontal: 0, marginBottom: 16,
    padding: 20, backgroundColor: '#1a1b21',
    borderLeftWidth: 2, borderLeftColor: '#00E5FF', borderRadius: 8,
  },
  statsLabel: { fontSize: 10, fontWeight: '600', color: '#bac9cc', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  statsPct: { fontSize: 28, fontWeight: '700', color: '#00E5FF', letterSpacing: -0.5 },
  statsCompleted: { fontSize: 14, color: '#bac9cc' },
  listContent: { padding: 24, paddingBottom: 32 },
  separator: { height: 16 },
  // Goal card
  card: {
    backgroundColor: '#1e1f25', borderRadius: 8, padding: 20,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.1)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  goalName: { fontSize: 18, fontWeight: '700', color: '#e3e1e9', letterSpacing: -0.3 },
  goalSubLabel: { fontSize: 11, color: '#bac9cc', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  deleteBtn: { fontSize: 14, color: '#ffb4ab', fontWeight: '600', paddingTop: 2 },
  barOuter: { marginBottom: 16 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 11, color: '#bac9cc', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressPct: { fontSize: 17, fontWeight: '700', color: '#00E5FF' },
  barTrack: { height: 5, backgroundColor: '#34343a', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: '#00E5FF' },
  cardFooter: {
    flexDirection: 'row', gap: 24, marginBottom: 16,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(59,73,76,0.1)',
  },
  footerLabel: { fontSize: 10, color: '#bac9cc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  footerValue: { fontSize: 14, fontWeight: '600', color: '#e3e1e9' },
  footerValueCyan: { fontSize: 14, fontWeight: '600', color: '#00E5FF' },
  detailBtn: {
    height: 36, borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  detailBtnText: { color: '#bac9cc', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12, color: '#34343a' },
  emptyText: { fontSize: 14, color: '#bac9cc', marginBottom: 20 },
  emptyButton: { height: 44, paddingHorizontal: 24, backgroundColor: '#00E5FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { color: '#001f24', fontSize: 14, fontWeight: '700' },
  errorText: { fontSize: 15, color: '#ffb4ab', textAlign: 'center', marginBottom: 20 },
  retryButton: { height: 44, paddingHorizontal: 32, backgroundColor: '#00E5FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  retryButtonText: { color: '#001f24', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: { backgroundColor: '#1e1f25', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#e3e1e9' },
  modalClose: { fontSize: 16, color: '#bac9cc', padding: 4 },
  moneyGoalName: { fontSize: 14, color: '#bac9cc', marginBottom: 16, marginTop: -8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#bac9cc', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { height: 48, backgroundColor: '#121318', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(59,73,76,0.3)', paddingHorizontal: 14, color: '#e3e1e9', fontSize: 15, marginBottom: 14 },
  submitBtn: { height: 50, backgroundColor: '#00E5FF', borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#001f24', fontSize: 16, fontWeight: '700' },
});
