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
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';

const INCOME_OPTIONS = [
  { key: 'weekly',    label: 'Weekly Job',        description: 'Part time job, paid weekly',       icon: '💼' },
  { key: 'monthly',  label: 'Monthly Allowance',  description: 'Regular allowance from parents',   icon: '📅' },
  { key: 'irregular',label: 'Irregular',          description: 'Occasional jobs, gifts, varies',   icon: '🔀' },
];

// Step indicator
function StepDots({ total, current }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i + 1 === current && styles.dotActive]} />
      ))}
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  async function finishOnboarding(createGoal) {
    await storage.setItem('onboarding_complete', 'true');
    if (selectedIncome) {
      await storage.setItem('income_frequency', selectedIncome);
    }
    if (createGoal && goalName.trim() && goalAmount.trim()) {
      try {
        await apiRequest('/goals', {
          method: 'POST',
          body: JSON.stringify({ name: goalName.trim(), target_amount: parseFloat(goalAmount) }),
        });
      } catch (_) {}
    }
    navigation.replace('Main');
  }

  // ── Step 1: Welcome ───────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.glowTop} pointerEvents="none" />
        <View style={styles.content}>
          <View style={styles.brandMark}>
            <Text style={{ fontSize: 28 }}>📈</Text>
          </View>
          <Text style={styles.appName}>Wealth Ledger</Text>
          <Text style={styles.subtitle}>Your personal finance tracker</Text>
          <Text style={styles.valueProp}>
            Track spending, set savings goals, and build money habits that last.
          </Text>

          <View style={styles.featureList}>
            {[
              { icon: '👛', text: 'Track every transaction' },
              { icon: '🎯', text: 'Set and reach savings goals' },
              { icon: '🤖', text: 'AI-powered financial advice' },
            ].map((f) => (
              <View key={f.icon} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Text style={{ fontSize: 14 }}>{f.icon}</Text>
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.footer}>
          <StepDots total={3} current={1} />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 2: Income frequency ──────────────────────────────────────────────
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
            <Text style={{ fontSize: 16, color: '#bac9cc' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Step 2 of 3</Text>
          <Text style={styles.title}>How do you earn money?</Text>
          <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>

          <View style={styles.optionList}>
            {INCOME_OPTIONS.map((opt) => {
              const selected = selectedIncome === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.optionCard, selected && styles.optionCardSelected]}
                  onPress={() => setSelectedIncome(opt.key)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                    <Text style={{ fontSize: 16 }}>{opt.icon}</Text>
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.optionDescription}>{opt.description}</Text>
                  </View>
                  {selected && (
                    <Text style={{ fontSize: 16, color: '#00E5FF' }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.footer}>
          <StepDots total={3} current={2} />
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedIncome && styles.primaryBtnDisabled]}
            onPress={() => selectedIncome && setStep(3)}
            disabled={!selectedIncome}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Next</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step 3: First savings goal ────────────────────────────────────────────
  const canFinish = goalName.trim().length > 0 && goalAmount.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.backBtn}>
            <Text style={{ fontSize: 16, color: '#bac9cc' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>Step 3 of 3</Text>
          <Text style={styles.title}>What are you saving for?</Text>
          <Text style={styles.stepSubtitle}>Set your first goal — you can always change it later</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Goal name</Text>
            <TextInput
              style={styles.input}
              placeholder="AirPods, car, vacation..."
              placeholderTextColor="#4b5563"
              value={goalName}
              onChangeText={setGoalName}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Target amount</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountPrefix}>$</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="#4b5563"
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
        <View style={[styles.footer, styles.footerRow]}>
          <StepDots total={3} current={3} />
          <View style={styles.footerBtns}>
            <TouchableOpacity onPress={() => finishOnboarding(false)} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtnFlex, !canFinish && styles.primaryBtnDisabled]}
              onPress={() => finishOnboarding(canFinish)}
              disabled={!canFinish}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Finish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121318',
  },
  glowTop: {
    position: 'absolute',
    top: -80, right: -80,
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0,229,255,0.04)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
  },
  footer: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 12,
  },
  footerRow: {
    gap: 0,
  },
  footerBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 4,
  },

  // Step dots
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#34343a',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#00E5FF',
  },

  // Step 1
  brandMark: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.15)',
  },
  appName: {
    fontSize: 38,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e3e1e9',
    marginBottom: 12,
  },
  valueProp: {
    fontSize: 14,
    color: '#bac9cc',
    lineHeight: 22,
    marginBottom: 36,
  },
  featureList: { gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(0,229,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(0,229,255,0.12)',
  },
  featureText: { fontSize: 14, color: '#e3e1e9', fontWeight: '500' },

  // Steps 2 & 3 shared
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: '#1a1b21',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.3)',
  },
  stepLabel: {
    fontSize: 10, fontWeight: '600',
    color: '#bac9cc', textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 8,
  },
  title: {
    fontSize: 26, fontWeight: '700',
    color: '#e3e1e9', letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 13, color: '#bac9cc',
    lineHeight: 20, marginBottom: 28,
  },

  // Option cards
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1a1b21',
    borderRadius: 8, padding: 16,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.2)',
  },
  optionCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0,229,255,0.05)',
  },
  optionIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#34343a',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  optionIconSelected: { backgroundColor: '#00E5FF' },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 14, fontWeight: '600', color: '#e3e1e9', marginBottom: 2,
  },
  optionLabelSelected: { color: '#00E5FF' },
  optionDescription: { fontSize: 12, color: '#bac9cc' },

  // Step 3 fields
  field: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 10, fontWeight: '600', color: '#bac9cc',
    textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8,
  },
  input: {
    height: 50, backgroundColor: '#1a1b21',
    borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    paddingHorizontal: 16, fontSize: 14,
    color: '#e3e1e9',
  },
  amountRow: {
    height: 50, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a1b21', borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(59,73,76,0.3)',
    paddingHorizontal: 16,
  },
  amountPrefix: { fontSize: 16, color: '#bac9cc', marginRight: 4 },
  amountInput: { flex: 1, fontSize: 14, color: '#e3e1e9' },

  // Buttons
  primaryBtn: {
    height: 52, backgroundColor: '#00E5FF',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnFlex: {
    flex: 1, height: 52, backgroundColor: '#00E5FF',
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: { color: '#001f24', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  skipBtn: { paddingVertical: 14, paddingHorizontal: 4 },
  skipText: { fontSize: 14, fontWeight: '500', color: '#bac9cc' },
});
