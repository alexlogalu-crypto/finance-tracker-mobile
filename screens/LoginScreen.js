import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { storage } from '../utils/storage';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    else if (password.length < 6) next.password = 'At least 6 characters';
    return next;
  }

  async function handleLogin() {
    console.log('login pressed');
    const errs = validate();
    console.log('validation errors:', JSON.stringify(errs));
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch('https://finance-tracker-production-e13e.up.railway.app/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('fetch status:', res.status);
      const data = await res.json();
      if (!res.ok) {
        const message = data?.detail || 'Login failed. Please try again.';
        Alert.alert('Login Failed', message);
        return;
      }
      console.log('token stored:', data.access_token ? 'yes' : 'MISSING');
      await storage.setItem('access_token', data.access_token);
      console.log('navigating to Main');
      navigation.replace('Main');
    } catch (err) {
      console.log('login error:', err.message);
      Alert.alert('Error', err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.brandTitle}>Wealth Ledger</Text>
          <Text style={styles.brandSub}>Sign in to your account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor="#4b5563"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError]}
              placeholder="••••••••"
              placeholderTextColor="#4b5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#001f24" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Registration is not available yet.')}>
            <Text style={styles.footerLink}>Create account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ambient glow */}
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121318',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  brand: {
    marginBottom: 44,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: -1,
    marginBottom: 6,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '500',
    color: '#bac9cc',
    letterSpacing: 0.3,
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#bac9cc',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.4)',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#e3e1e9',
    backgroundColor: '#1a1b21',
  },
  inputError: {
    borderColor: '#ffb4ab',
  },
  fieldError: {
    fontSize: 12,
    color: '#ffb4ab',
    marginTop: 2,
  },
  button: {
    height: 52,
    backgroundColor: '#00E5FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#001f24',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 13,
    color: '#bac9cc',
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00E5FF',
  },
  glowTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(0,229,255,0.04)',
    transform: [{ scaleX: 1.5 }],
  },
  glowBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,229,255,0.03)',
  },
});
