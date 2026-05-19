import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, Image, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, StatusBar, Animated,
} from 'react-native';

const MASCOT_SMILING  = require('../../assets/images/assistant/expressions/assistant-mascot-smiling.webp');
const MASCOT_THINKING = require('../../assets/images/assistant/expressions/assistant-mascot-thinking.webp');
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { parseMessage } from '../utils/chatParser';
import {
  addExpense, getBudget, updateBudgetTotal, createTrip, addPackingItem,
} from '../database/db';

const { width } = require('react-native').Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const fmt = (n) => '₱' + Number(n).toLocaleString();

const QUICK_TIPS = [
  'Spent ₱200 on food',
  'Show my trips',
  "How's my budget?",
  'What to do in Baguio?',
  'Must-visit in Pangasinan?',
  'Add sunscreen to packing list',
  'Plan a trip to Vigan for 3 days',
  'How do I ride a jeepney?',
];

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  const dots = [useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current,
                useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const animations = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0,  duration: 300, useNativeDriver: true }),
          Animated.delay(300),
        ])
      )
    );
    animations.forEach(a => a.start());
    return () => animations.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.msgRow}>
      <View style={styles.botAvatar}>
        <Image source={MASCOT_THINKING} style={styles.avatarImg} resizeMode="contain" />
      </View>
      <View style={[styles.bubble, styles.botBubble, styles.typingBubble]}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Message({ msg, onAction }) {
  const isBot    = msg.sender === 'bot';
  const isAction = msg.type === 'action';

  return (
    <View style={[styles.msgRow, !isBot && styles.msgRowRight]}>
      {isBot && (
        <View style={styles.botAvatar}>
          <Image source={MASCOT_SMILING} style={styles.avatarImg} resizeMode="contain" />
        </View>
      )}
      <View style={styles.bubbleCol}>
        <View style={[styles.bubble, isBot ? styles.botBubble : styles.userBubble]}>
          <Text style={[styles.bubbleText, !isBot && styles.userBubbleText]}>{msg.text}</Text>
          <Text style={[styles.bubbleTime, !isBot && styles.userBubbleTime]}>{msg.time}</Text>
        </View>

        {/* Confirm / cancel buttons */}
        {isAction && msg.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => onAction(msg.id, true)}
            >
              <Ionicons name="checkmark" size={s(15)} color={Colors.white} />
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onAction(msg.id, false)}
            >
              <Ionicons name="close" size={s(15)} color={Colors.textSecondary} />
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAction && msg.status === 'confirmed' && (
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={s(13)} color="#10b981" />
            <Text style={[styles.statusText, { color: '#10b981' }]}>Logged</Text>
          </View>
        )}

        {isAction && msg.status === 'cancelled' && (
          <View style={styles.statusPill}>
            <Ionicons name="close-circle" size={s(13)} color={Colors.grayMedium} />
            <Text style={[styles.statusText, { color: Colors.grayMedium }]}>Cancelled</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AIAssistantScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userName } = useUser();
  const scrollRef = useRef(null);
  const [input, setInput] = useState('');
  const [pendingContext, setPendingContext] = useState(null);
  const [isThinking, setIsThinking] = useState(false);

  const initialMessages = useMemo(() => [
    {
      id: '1',
      sender: 'bot',
      type: 'message',
      text: `Kumusta, ${userName}! 😊\n\nI'm your Lakbay planning buddy. I know your trips, budget, packing lists, and all the Philippine destinations in this app — no internet needed.\n\nTry asking:\n• "What to do in Baguio?"\n• "Add sunscreen to packing list"\n• "Spent ₱350 on food"`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ], [userName]);

  const [messages, setMessages] = useState(initialMessages);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const addBotMessage = useCallback((text) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      sender: 'bot',
      type: 'message',
      text,
      time: now(),
    }]);
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  // ── Send message ────────────────────────────────────────────────────────────

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      type: 'message',
      text: input.trim(),
      time: now(),
    };
    setMessages(prev => [...prev, userMsg]);
    const text = input.trim();
    setInput('');
    scrollToEnd();

    setIsThinking(true);
    scrollToEnd();
    const [result] = await Promise.all([
      parseMessage(text, userName, pendingContext),
      new Promise(res => setTimeout(res, 900)),
    ]);
    setIsThinking(false);

    if (result.needsMore) {
      // Bot asks a follow-up — store context for next message
      setPendingContext(result.needsMore.context);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        type: 'message',
        text: result.text,
        time: now(),
      }]);
    } else if (result.action) {
      // Bot has all info — show confirm/cancel card
      setPendingContext(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        type: 'action',
        text: result.text,
        action: result.action,
        status: 'pending',
        time: now(),
      }]);
    } else {
      // Normal info response
      setPendingContext(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        type: 'message',
        text: result.text,
        time: now(),
      }]);
    }

    scrollToEnd();
  };

  // ── Execute confirmed action ────────────────────────────────────────────────

  const handleAction = useCallback(async (msgId, confirmed) => {
    // Find the action message
    let actionData = null;
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        actionData = m.action;
        return { ...m, status: confirmed ? 'confirmed' : 'cancelled' };
      }
      return m;
    }));

    scrollToEnd();

    if (!confirmed) {
      addBotMessage('No problem, nothing was logged! 👍');
      scrollToEnd();
      return;
    }

    if (!actionData) return;

    try {
      const { intent, data } = actionData;

      if (intent === 'LOG_EXPENSE') {
        await addExpense({
          tripId:   '1',
          amount:   data.amount,
          category: data.category,
          note:     data.note || '',
          date:     new Date().toISOString().split('T')[0],
        });
        addBotMessage(`✅ Done! ${fmt(data.amount)} for ${data.category} has been logged in your budget.`);
      }

      else if (intent === 'ADD_TO_BUDGET') {
        const budget = await getBudget('1');
        const newTotal = (budget?.total ?? 0) + data.amount;
        await updateBudgetTotal(newTotal);
        addBotMessage(`✅ Budget updated! Added ${fmt(data.amount)}. Your new total is ${fmt(newTotal)}.`);
      }

      else if (intent === 'SET_BUDGET') {
        await updateBudgetTotal(data.amount);
        addBotMessage(`✅ Budget set to ${fmt(data.amount)}!`);
      }

      else if (intent === 'CREATE_TRIP') {
        await createTrip(data);
        addBotMessage(`✅ "${data.name}" created! Head to your Trips tab to start adding activities.`);
      }

      else if (intent === 'ADD_PACKING_ITEM') {
        await addPackingItem(data.tripId, data.item);
        addBotMessage(`✅ "${data.item}" added to the packing list for "${data.tripName}"!`);
      }

    } catch (_) {
      addBotMessage('Something went wrong. Please try again.');
    }

    scrollToEnd();
  }, [addBotMessage, scrollToEnd]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Lakbay Assistant ✦</Text>
            <Text style={styles.headerSub}>Knows your trips, budget & destinations</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messageList}
          contentContainerStyle={{ padding: s(16), gap: s(12), paddingBottom: s(8) }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <Message key={msg.id} msg={msg} onAction={handleAction} />
          ))}
          {isThinking && <TypingIndicator />}
        </ScrollView>

        {/* Quick actions */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickRow}
          contentContainerStyle={{ paddingHorizontal: s(16), gap: s(8), paddingVertical: s(8) }}
          keyboardShouldPersistTaps="handled"
        >
          {QUICK_TIPS.map((tip) => (
            <TouchableOpacity
              key={tip}
              style={styles.quickChip}
              onPress={() => setInput(tip)}
            >
              <Text style={styles.quickChipText}>{tip}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: insets.bottom + s(8) }]}>
          {pendingContext && (
            <TouchableOpacity style={styles.contextBadge} onPress={() => setPendingContext(null)}>
              <Text style={styles.contextBadgeText}>Waiting for reply  ✕</Text>
            </TouchableOpacity>
          )}
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything or log an expense..."
              placeholderTextColor={Colors.grayMedium}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={s(20)} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    backgroundColor: Colors.primary, paddingHorizontal: s(16), paddingBottom: s(14),
  },
  backBtn: { padding: s(4), marginRight: s(4) },
  headerInfo: { flex: 1 },
  headerTitle: { color: Colors.white, fontSize: s(17), fontFamily: Fonts.bold },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: s(12), fontFamily: Fonts.regular },
  headerAvatar: {
    width: s(42), height: s(42), borderRadius: s(21),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  messageList: { flex: 1 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: s(8) },
  msgRowRight: { flexDirection: 'row-reverse' },
  bubbleCol: { maxWidth: '78%', gap: s(6) },

  botAvatar: {
    width: s(62), height: s(62),
    overflow: 'hidden', flexShrink: 0,
    borderRadius: s(31),
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarImg: { width: s(80), height: s(86), marginTop: -4, marginLeft: -10 },

  bubble: { borderRadius: s(16), padding: s(12) },
  botBubble: {
    backgroundColor: Colors.white, borderBottomLeftRadius: s(4),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: s(4) },
  bubbleText: { fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary, lineHeight: s(20) },
  userBubbleText: { color: Colors.white },
  bubbleTime: { fontSize: s(10), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(4), textAlign: 'right' },
  userBubbleTime: { color: 'rgba(255,255,255,0.6)' },

  // Typing indicator
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: s(5), paddingVertical: s(14), paddingHorizontal: s(16) },
  dot: { width: s(7), height: s(7), borderRadius: s(4), backgroundColor: Colors.grayMedium },

  // Action buttons
  actionRow: { flexDirection: 'row', gap: s(8) },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: Colors.primary, borderRadius: s(10),
    paddingHorizontal: s(14), paddingVertical: s(8),
    flex: 1, justifyContent: 'center',
  },
  confirmText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.white },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: Colors.white, borderRadius: s(10),
    paddingHorizontal: s(14), paddingVertical: s(8),
    borderWidth: 1, borderColor: Colors.border,
    flex: 1, justifyContent: 'center',
  },
  cancelText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(10), paddingVertical: s(4),
    backgroundColor: Colors.white, borderRadius: s(20),
    alignSelf: 'flex-start',
    borderWidth: 1, borderColor: Colors.border,
  },
  statusText: { fontSize: s(11), fontFamily: Fonts.medium },

  // Quick chips
  quickRow: {
    backgroundColor: Colors.white, maxHeight: s(52),
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  quickChip: {
    paddingHorizontal: s(14), paddingVertical: s(8),
    backgroundColor: Colors.primaryBg, borderRadius: s(20),
    borderWidth: 1, borderColor: Colors.border,
  },
  quickChipText: { fontSize: s(13), color: Colors.primary, fontFamily: Fonts.medium },

  // Input
  inputRow: {
    backgroundColor: Colors.white, paddingHorizontal: s(16), paddingTop: s(8),
    borderTopWidth: 1, borderTopColor: Colors.border, gap: s(6),
  },
  inputInner: { flexDirection: 'row', alignItems: 'flex-end', gap: s(10) },
  input: {
    flex: 1, backgroundColor: Colors.grayLight, borderRadius: s(22),
    paddingHorizontal: s(16), paddingVertical: s(10),
    fontSize: s(14), color: Colors.textPrimary, maxHeight: s(100),
  },
  sendBtn: {
    width: s(44), height: s(44), borderRadius: s(22),
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: Colors.grayMedium, shadowOpacity: 0 },

  // Context badge (shows when bot is mid-conversation)
  contextBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryBg,
    borderRadius: s(20), borderWidth: 1, borderColor: Colors.primary + '40',
    paddingHorizontal: s(10), paddingVertical: s(4),
  },
  contextBadgeText: { fontSize: s(11), fontFamily: Fonts.medium, color: Colors.primary },
});
