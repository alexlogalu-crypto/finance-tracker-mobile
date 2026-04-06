import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INCOME_OPTIONS = [
  { key: 'weekly', label: 'Weekly Job', description: 'Part time job, paid weekly' },
  { key: 'monthly', label: 'Monthly Allowance', description: 'Regular allowance from parents' },
  { key: 'irregular', label: 'Irregular', description: 'Occasional jobs, gifts, varies' },
];

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  async function finishOnboarding(createGoal) {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    if (selectedIncome) {
      await AsyncStorage.setItem('income_frequency', selectedIncome);
    }

    if (createGoal && goalName.trim() && goalAmount.trim()) {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/goals', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: goalName.trim(),
              target_amount: parseFloat(goalAmount),
            }),
          });
        }
      } catch (_) {
        // not logged in yet — skip silently
      }
    }

    navigation.replace('Login');
  }

  // ── Screen 1: Welcome ────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.appName}>FinTrack</Text>
          <Text style={styles.subtitle}>Your personal finance tracker built for teens</Text>
          <Text style={styles.valueProp}>
            Track spending, set goals, and build money habits that last
          </Text>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen 2: Income frequency ───────────────────────────────────────────
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>How do you earn money?</Text>
          {INCOME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.optionCard,
                selectedIncome === opt.key && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedIncome(opt.key)}
              activeOpacity={0.75}
            >
              <Text style={styles.optionLabel}>{opt.label}</Text>
              <Text style={styles.optionDescription}>{opt.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedIncome && styles.primaryBtnDisabled]}
            onPress={() => selectedIncome && setStep(3)}
            disabled={!selectedIncome}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Screen 3: First savings goal ─────────────────────────────────────────
  const canFinish = goalName.trim().length > 0 && goalAmount.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.title}>What are you saving for?</Text>
          <Text style={styles.goalSubtitle}>
            Set your first goal — you can always change it later
          </Text>
          <TextInput
            style={styles.input}
            placeholder="AirPods, car, vacation..."
            placeholderTextColor="#4a5568"
            value={goalName}
            onChangeText={setGoalName}
          />
          <TextInput
            style={styles.input}
            placeholder="Target amount"
            placeholderTextColor="#4a5568"
            value={goalAmount}
            onChangeText={setGoalAmount}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.footer, styles.footerRow]}>
          <TouchableOpacity onPress={() => finishOnboarding(false)}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtnFlex, !canFinish && styles.primaryBtnDisabled]}
            onPress={() => finishOnboarding(canFinish)}
            disabled={!canFinish}
          >
            <Text style={styles.primaryBtnText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 36,
    paddingTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  // Screen 1
  appName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#4f6ef7',
    letterSpacing: -1,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f0f4f8',
    marginBottom: 20,
    lineHeight: 28,
  },
  valueProp: {
    fontSize: 16,
    color: '#a0aec0',
    lineHeight: 24,
  },

  // Screen 2
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f0f4f8',
    marginBottom: 28,
  },
  optionCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#2a2a4a',
  },
  optionCardSelected: {
    borderColor: '#4f6ef7',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f0f4f8',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#a0aec0',
  },

  // Screen 3
  goalSubtitle: {
    fontSize: 15,
    color: '#a0aec0',
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a4a',
    color: '#f0f4f8',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#a0aec0',
    paddingVertical: 14,
  },

  // Buttons
  primaryBtn: {
    height: 52,
    backgroundColor: '#4f6ef7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnFlex: {
    flex: 1,
    height: 52,
    backgroundColor: '#4f6ef7',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
