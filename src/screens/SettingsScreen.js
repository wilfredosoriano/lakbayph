import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert, Modal, TextInput,
  Platform, Linking, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getSetting, setSetting, initDB } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onValueChange }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={[styles.toggleTrack, value && styles.toggleTrackOn]}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
    </TouchableOpacity>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </>
  );
}

function Row({ icon, iconColor, label, sub, right, onPress, danger }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.iconBg, iconColor && { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={s(20)} color={iconColor ?? Colors.primary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, danger && { color: '#ef4444' }]}>{label}</Text>
        {!!sub && <Text style={styles.rowSub}>{sub}</Text>}
      </View>
      {right}
    </Wrap>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
function FeedbackModal({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    const subject = encodeURIComponent('LakbayPH Feedback');
    const body    = encodeURIComponent(message.trim());
    const url     = `mailto:lakbayph.app@gmail.com?subject=${subject}&body=${body}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        setMessage('');
        onClose();
      } else {
        Alert.alert('No email app found', 'Please send your feedback to lakbayph.app@gmail.com');
      }
    } catch (_) {
      Alert.alert('Error', 'Could not open mail app. Please email lakbayph.app@gmail.com');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fbOverlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.fbSheet, { paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16), marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0 }]}>
          <View style={styles.fbHandle} />
          <Text style={styles.fbTitle}>Send Feedback</Text>
          <Text style={styles.fbSub}>Your message will be sent to the developer.</Text>
          <TextInput
            style={styles.fbInput}
            value={message}
            onChangeText={setMessage}
            placeholder="What's on your mind? Bug reports, suggestions, anything..."
            placeholderTextColor={Colors.grayMedium}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            scrollEnabled
          />
          <Text style={styles.fbCount}>{message.length}/1000</Text>
          <TouchableOpacity
            style={[styles.fbSendBtn, !message.trim() && styles.fbSendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || sending}
          >
            <Ionicons name="send" size={s(16)} color={Colors.white} />
            <Text style={styles.fbSendText}>{sending ? 'Opening mail…' : 'Send Feedback'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [notifTrip,     setNotifTrip]    = useState(true);
  const [notifBudget,   setNotifBudget]  = useState(true);
  const [showFeedback,  setShowFeedback] = useState(false);

  useFocusEffect(useCallback(() => {
    getSetting('notif_trip',         'true').then(v  => setNotifTrip(v !== 'false'));
    getSetting('notif_budget',       'true').then(v  => setNotifBudget(v !== 'false'));
  }, []));

  const toggle = (key, setter) => (val) => {
    setter(val);
    setSetting(key, String(val));
  };

  const handleClearTrips = () => {
    Alert.alert(
      'Clear All Trips',
      'This will permanently delete all your trips, itineraries, and expenses. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const db = await initDB();
            await db.execAsync(`
              DELETE FROM trips;
              DELETE FROM trip_activities;
              DELETE FROM expenses;
              DELETE FROM budgets;
            `);
            Alert.alert('Done', 'All trip data has been cleared.');
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Reset All App Data',
      'This will delete everything — trips, expenses, saved places, and settings. The app will be like new. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything', style: 'destructive',
          onPress: async () => {
            const db = await initDB();
            await db.execAsync(`
              DELETE FROM trips;
              DELETE FROM trip_activities;
              DELETE FROM expenses;
              DELETE FROM budgets;
              DELETE FROM saved_locations;
              DELETE FROM settings;
            `);
            // Reset toggles
            setNotifTrip(true); setNotifBudget(true);
            Alert.alert('Done', 'App has been reset to defaults.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: s(36) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Notifications */}
        <Section title="Notifications">
          <Row
            icon="calendar-outline"
            iconColor="#6366f1"
            label="Trip Reminders"
            sub="Notify when a trip is within 7 days or starts today"
            right={<Toggle value={notifTrip} onValueChange={toggle('notif_trip', setNotifTrip)} />}
          />
          <Divider />
          <Row
            icon="wallet-outline"
            iconColor="#f59e0b"
            label="Budget Alerts"
            sub="Notify when you've used 80% or more of your budget"
            right={<Toggle value={notifBudget} onValueChange={toggle('notif_budget', setNotifBudget)} />}
          />
        </Section>

        {/* Data */}
        <Section title="Data">
          <Row
            icon="trash-outline"
            iconColor="#ef4444"
            label="Clear All Trips & Expenses"
            sub="Permanently delete all trips, itineraries, and expenses"
            onPress={handleClearTrips}
            right={<Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />}
          />
          <Divider />
          <Row
            icon="warning-outline"
            iconColor="#ef4444"
            label="Reset All App Data"
            sub="Delete everything and start fresh"
            onPress={handleClearAll}
            danger
            right={<Ionicons name="chevron-forward" size={s(18)} color="#ef4444" />}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Row
            icon="information-circle-outline"
            label="Version"
            right={<Text style={styles.valueText}>1.0.0</Text>}
          />
          <Divider />
          <Row
            icon="chatbox-ellipses-outline"
            iconColor="#6366f1"
            label="Send Feedback"
            sub="Report a bug or suggest a feature"
            onPress={() => setShowFeedback(true)}
            right={<Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />}
          />
          <Divider />
          <Row
            icon="heart-outline"
            iconColor="#ef4444"
            label="Rate LakbayPH"
            right={<Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />}
          />
          <Divider />
          <Row
            icon="document-text-outline"
            iconColor="#6366f1"
            label="Terms & Conditions"
            onPress={() => Linking.openURL('https://wilfredosoriano.github.io/lakbayph-legal/terms.html')}
            right={<Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />}
          />
          <Divider />
          <Row
            icon="shield-checkmark-outline"
            iconColor="#10b981"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://wilfredosoriano.github.io/lakbayph-legal/privacy.html')}
            right={<Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />}
          />

        </Section>

      </ScrollView>

      <FeedbackModal visible={showFeedback} onClose={() => setShowFeedback(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: s(18), fontFamily: Fonts.bold, color: Colors.white, textAlign: 'center' },

  content: { padding: s(16), paddingBottom: s(40), gap: s(4) },

  sectionTitle: {
    fontSize: s(12), fontFamily: Fonts.bold,
    color: Colors.textSecondary, textTransform: 'uppercase',
    letterSpacing: 0.8, marginTop: s(20), marginBottom: s(8),
    marginLeft: s(4),
  },
  card: {
    backgroundColor: Colors.white, borderRadius: s(16), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.05, shadowRadius: s(4), elevation: 2,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    paddingHorizontal: s(16), paddingVertical: s(13),
  },
  iconBg: {
    width: s(36), height: s(36), borderRadius: s(10),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary },
  rowSub: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2), lineHeight: s(15) },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: s(64) },
  valueText: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary },

  toggleTrack: {
    width: s(46), height: s(26), borderRadius: s(13),
    backgroundColor: Colors.grayMedium, justifyContent: 'center', paddingHorizontal: s(3),
  },
  toggleTrackOn: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: s(20), height: s(20), borderRadius: s(10), backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleThumbOn: { alignSelf: 'flex-end' },

  // ── Feedback modal
  fbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  fbSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  fbHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(20),
  },
  fbTitle: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(4) },
  fbSub: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary, marginBottom: s(16) },
  fbInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(16), paddingVertical: s(12),
    fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary,
    height: s(100), marginBottom: s(4),
  },
  fbCount: {
    fontSize: s(11), fontFamily: Fonts.regular,
    color: Colors.grayMedium, textAlign: 'right', marginBottom: s(16),
  },
  fbSendBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: s(8),
  },
  fbSendBtnDisabled: { opacity: 0.4 },
  fbSendText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});
