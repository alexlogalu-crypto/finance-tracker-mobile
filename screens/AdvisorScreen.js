import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { storage } from '../utils/storage';
import { apiRequest } from '../utils/api';

const BASE = 'https://finance-tracker-production-e13e.up.railway.app/api/v1';

const GREETING = {
  id: 'greeting',
  role: 'ai',
  text: "Hi! I'm your FinTrack advisor. I can see your spending, budgets, and goals. What would you like to know?",
};

let msgCounter = 1;
function nextId() {
  return String(msgCounter++);
}

const CHIPS = [
  'Analyze spending',
  'Optimize savings',
  'Am I on track?',
  'How are my goals?',
];

export default function AdvisorScreen({ navigation }) {
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendChip = (text) => sendMessage(text);

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { id: nextId(), role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiRequest('/advisor', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? 'Something went wrong.');

      setMessages((prev) => [...prev, { id: nextId(), role: 'ai', text: data.response }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'ai', text: `Sorry, something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    if (isUser) {
      return (
        <View style={styles.userMsgRow}>
          <Text style={styles.userLabel}>You</Text>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      );
    }
    return (
      <View style={styles.aiMsgRow}>
        <Text style={styles.aiLabel}>Financial Advisor</Text>
        <View style={styles.aiBorder}>
          <Text style={styles.aiText}>{item.text}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Advisor</Text>
        <Text style={styles.headerSub}>Ask me anything about your finances</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {loading && (
          <View style={styles.typingRow}>
            <View style={[styles.typingDot, { opacity: 0.8 }]} />
            <View style={[styles.typingDot, { opacity: 0.5 }]} />
            <View style={[styles.typingDot, { opacity: 0.3 }]} />
          </View>
        )}

        {/* Chip prompts */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chipsContent}
        >
          {CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              style={styles.chip}
              onPress={() => sendChip(chip)}
            >
              <Text style={styles.chipText}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your advisor..."
            placeholderTextColor="#4b5563"
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => sendMessage()}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#121318',
  },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59,73,76,0.15)',
    backgroundColor: 'rgba(18,19,24,0.7)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#00E5FF',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#bac9cc',
    marginTop: 3,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 28,
  },
  // AI message
  aiMsgRow: {
    maxWidth: '90%',
    gap: 6,
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c3f5ff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  aiBorder: {
    borderLeftWidth: 2,
    borderLeftColor: '#00E5FF',
    paddingLeft: 14,
    paddingVertical: 4,
  },
  aiText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#e3e1e9',
    fontWeight: '300',
  },
  // User message
  userMsgRow: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    maxWidth: '90%',
    gap: 6,
    marginBottom: 4,
  },
  userLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#bac9cc',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  userText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#e3e1e9',
    fontWeight: '300',
    textAlign: 'right',
  },
  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 4,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#00E5FF',
  },
  // Chips
  chipsScroll: {
    flexGrow: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59,73,76,0.2)',
    paddingVertical: 10,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(52,52,58,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
    borderRadius: 20,
  },
  chipText: {
    color: '#e3e1e9',
    fontSize: 12,
    fontWeight: '500',
  },
  // Input row
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e1f25',
    borderTopWidth: 1,
    borderTopColor: 'rgba(59,73,76,0.2)',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#121318',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: '#e3e1e9',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(59,73,76,0.3)',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#1e1f25',
    borderWidth: 1,
    borderColor: '#3b494c',
  },
  sendBtnText: {
    color: '#001f24',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
