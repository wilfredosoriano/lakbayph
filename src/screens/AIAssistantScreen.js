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
import { usePremium } from '../context/PremiumContext';
import { parseMessage } from '../utils/chatParser';
import {
  addExpense, getBudget, updateBudgetTotal, createTrip, addPackingItem, getTrips,
  getSetting, setSetting,
} from '../database/db';

const { width } = require('react-native').Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const fmt = (n) => '₱' + Number(n).toLocaleString();

// Fallback chips when user has no trips yet
const DEFAULT_CHIPS = [
  'Plan a trip to Baguio for 3 days',
  'What to do in Boracay?',
  'What to do in El Nido?',
  "How's my budget?",
  'Add sunscreen to packing list',
  'How do I ride a jeepney?',
  'Spent ₱200 on food',
  'Show my trips',
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

function Message({ msg, onAction, lang = 'en' }) {
  const isBot    = msg.sender === 'bot';
  const isAction = msg.type === 'action';
  const TL       = lang === 'tl';

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
              <Text style={styles.confirmText}>{TL ? 'Kumpirmahin' : 'Confirm'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => onAction(msg.id, false)}
            >
              <Ionicons name="close" size={s(15)} color={Colors.textSecondary} />
              <Text style={styles.cancelText}>{TL ? 'Kanselahin' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isAction && msg.status === 'confirmed' && (
          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={s(13)} color="#10b981" />
            <Text style={[styles.statusText, { color: '#10b981' }]}>{TL ? 'Na-log' : 'Logged'}</Text>
          </View>
        )}

        {isAction && msg.status === 'cancelled' && (
          <View style={styles.statusPill}>
            <Ionicons name="close-circle" size={s(13)} color={Colors.grayMedium} />
            <Text style={[styles.statusText, { color: Colors.grayMedium }]}>{TL ? 'Kinansela' : 'Cancelled'}</Text>
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
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const scrollRef = useRef(null);
  const [input, setInput] = useState('');
  const [pendingContext, setPendingContext] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [quickChips, setQuickChips] = useState(DEFAULT_CHIPS);
  const [lang, setLang] = useState('en');

  // Load saved language preference
  useEffect(() => {
    getSetting('assistant_lang', 'en').then(val => {
      if (val === 'tl' || val === 'en') setLang(val);
    });
  }, []);

  // Rebuild quick chips whenever trips or language changes
  useEffect(() => {
    getTrips().then(trips => {
      const chips = [];
      if (trips && trips.length > 0) {
        trips.slice(0, 3).forEach(tr => {
          chips.push(lang === 'tl'
            ? `Ano ang gagawin sa ${tr.destination}?`
            : `What to do in ${tr.destination}?`);
          chips.push(lang === 'tl'
            ? `Listahan ng dala para sa ${tr.name}`
            : `Packing list for ${tr.name}`);
        });
      }
      if (lang === 'tl') {
        chips.push('Kumusta ang budget ko?');
        chips.push('Ipakita ang aking mga trips');
        chips.push('Nagastos ng ₱200 sa pagkain');
        chips.push('Paano sumakay ng jeepney?');
      } else {
        chips.push("How's my budget?");
        chips.push('Show my trips');
        chips.push('Spent ₱200 on food');
        chips.push('How do I ride a jeepney?');
      }
      if (chips.length > 0) setQuickChips(chips);
    });
  }, [lang]);

  const initialMessages = useMemo(() => [
    {
      id: '1',
      sender: 'bot',
      type: 'message',
      text: lang === 'tl'
        ? `Kumusta, ${userName}! 😊\n\nAko ang iyong Lakbay planning buddy. Alam ko ang iyong mga trips, budget, listahan ng dala, at lahat ng destinasyon sa Pilipinas — hindi kailangan ng internet.\n\nSubukan mong tanungin:\n• "Ano ang gagawin sa Baguio?"\n• "Dagdag sunscreen sa listahan ng dala"\n• "Nagastos ng ₱350 sa pagkain"`
        : `Kumusta, ${userName}! 😊\n\nI'm your Lakbay planning buddy. I know your trips, budget, packing lists, and all the Philippine destinations in this app — no internet needed.\n\nTry asking:\n• "What to do in Baguio?"\n• "Add sunscreen to packing list"\n• "Spent ₱350 on food"`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ], [userName, lang]);

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

  // ── Language toggle ─────────────────────────────────────────────────────────

  const toggleLang = useCallback(async () => {
    const next = lang === 'en' ? 'tl' : 'en';
    setLang(next);
    await setSetting('assistant_lang', next);
    // Announce the switch in the new language
    addBotMessage(next === 'tl'
      ? 'Filipino mode! Sasagutin na kita sa Tagalog. 🇵🇭'
      : 'English mode! I\'ll reply in English now. 🇬🇧');
  }, [lang, addBotMessage]);

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
      parseMessage(text, userName, pendingContext, lang),
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
      addBotMessage(lang === 'tl' ? 'Sige lang, walang na-log! 👍' : 'No problem, nothing was logged! 👍');
      scrollToEnd();
      return;
    }

    if (!actionData) return;

    try {
      const { intent, data } = actionData;

      const TL = lang === 'tl';

      if (intent === 'LOG_EXPENSE') {
        await addExpense({
          tripId:   '1',
          amount:   data.amount,
          category: data.category,
          note:     data.note || '',
          date:     new Date().toISOString().split('T')[0],
        });
        addBotMessage(TL
          ? `✅ Tapos na! ${fmt(data.amount)} para sa ${data.category} ay na-log na sa iyong budget.`
          : `✅ Done! ${fmt(data.amount)} for ${data.category} has been logged in your budget.`);
      }

      else if (intent === 'ADD_TO_BUDGET') {
        const budget = await getBudget('1');
        const newTotal = (budget?.total ?? 0) + data.amount;
        await updateBudgetTotal(newTotal);
        addBotMessage(TL
          ? `✅ Na-update ang budget! Nadagdag ang ${fmt(data.amount)}. Ang bagong kabuuan ay ${fmt(newTotal)}.`
          : `✅ Budget updated! Added ${fmt(data.amount)}. Your new total is ${fmt(newTotal)}.`);
      }

      else if (intent === 'SET_BUDGET') {
        await updateBudgetTotal(data.amount);
        addBotMessage(TL
          ? `✅ Na-set ang budget sa ${fmt(data.amount)}!`
          : `✅ Budget set to ${fmt(data.amount)}!`);
      }

      else if (intent === 'CREATE_TRIP') {
        await createTrip(data);
        addBotMessage(TL
          ? `✅ Nagawa na ang "${data.name}"! Pumunta sa Trips tab para magdagdag ng mga aktibidad.`
          : `✅ "${data.name}" created! Head to your Trips tab to start adding activities.`);
      }

      else if (intent === 'ADD_PACKING_ITEM') {
        await addPackingItem(data.tripId, data.item);
        addBotMessage(TL
          ? `✅ Nadagdag ang "${data.item}" sa listahan ng dala para sa "${data.tripName}"!`
          : `✅ "${data.item}" added to the packing list for "${data.tripName}"!`);
      }

    } catch (_) {
      addBotMessage(lang === 'tl' ? 'May nagkamali. Subukan muli.' : 'Something went wrong. Please try again.');
    }

    scrollToEnd();
  }, [addBotMessage, scrollToEnd, lang]);

  // ── Premium gate ────────────────────────────────────────────────────────────
  if (!premiumLoading && !isPremium) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <View style={[styles.header, { paddingTop: insets.top + s(12) }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lakbay Assistant</Text>
          <View style={{ width: s(36) }} />
        </View>
        <View style={styles.gateWrap}>
          <Image source={MASCOT_SMILING} style={styles.gateMascot} resizeMode="contain" />
          <Text style={styles.gateTitle}>Meet your Lakbay Assistant</Text>
          <Text style={styles.gateSub}>
            Plan trips, track budgets, build packing lists, and discover destinations — all with your AI companion. Available with Premium.
          </Text>
          <View style={styles.gateFeatureList}>
            {['Trip planning & itinerary ideas', 'Budget tracking & tips', 'Packing list builder', 'Destination recommendations'].map((f) => (
              <View key={f} style={styles.gateFeatureRow}>
                <Ionicons name="checkmark-circle" size={s(16)} color={Colors.primary} />
                <Text style={styles.gateFeatureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.gateBtn}
            onPress={() => navigation.navigate('Premium')}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={s(16)} color={Colors.white} />
            <Text style={styles.gateBtnText}>Upgrade to Premium — ₱199</Text>
          </TouchableOpacity>
          <Text style={styles.gateNote}>One-time · No subscription · Yours forever</Text>
        </View>
      </View>
    );
  }

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
            <Text style={styles.headerSub}>
              {lang === 'tl' ? 'May alam sa trips, budget at destinasyon' : 'Knows your trips, budget & destinations'}
            </Text>
          </View>
          {/* Language toggle pill */}
          <TouchableOpacity style={styles.langToggle} onPress={toggleLang} activeOpacity={0.8}>
            <Text style={[styles.langOption, lang === 'en' && styles.langOptionActive]}>EN</Text>
            <Text style={styles.langDivider}>|</Text>
            <Text style={[styles.langOption, lang === 'tl' && styles.langOptionActive]}>FIL</Text>
          </TouchableOpacity>
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
            <Message key={msg.id} msg={msg} onAction={handleAction} lang={lang} />
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
          {quickChips.map((tip) => (
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
              <Text style={styles.contextBadgeText}>
                {lang === 'tl' ? 'Naghihintay ng sagot  ✕' : 'Waiting for reply  ✕'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.inputInner}>
            <TextInput
              style={styles.input}
              placeholder={lang === 'tl' ? 'Magtanong o mag-log ng gastos...' : 'Ask anything or log an expense...'}
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

  // Language toggle pill
  langToggle: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: s(20), paddingHorizontal: s(10), paddingVertical: s(5),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  langOption: {
    fontSize: s(12), fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.55)',
  },
  langOptionActive: {
    color: Colors.white,
  },
  langDivider: {
    fontSize: s(12), color: 'rgba(255,255,255,0.35)',
    marginHorizontal: s(4),
  },

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

  // ── Premium gate styles
  gateWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: s(28), gap: s(12),
  },
  gateMascot: { width: s(130), height: s(130), marginBottom: s(4) },
  gateTitle: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary, textAlign: 'center' },
  gateSub: {
    fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary,
    textAlign: 'center', lineHeight: s(19),
  },
  gateFeatureList: { alignSelf: 'stretch', gap: s(8), marginVertical: s(4) },
  gateFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: s(10) },
  gateFeatureText: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textPrimary },
  gateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), paddingHorizontal: s(24),
    alignSelf: 'stretch', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.35, shadowRadius: s(8), elevation: 4,
    marginTop: s(4),
  },
  gateBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
  gateNote: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textTertiary },
});
