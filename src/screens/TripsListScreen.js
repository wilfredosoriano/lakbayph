import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Alert, Modal, TextInput, Keyboard, Platform, RefreshControl, Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getTrips, deleteTrip, updateTrip, duplicateTrip } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const EMOJIS = [
  '✈️', '🚢', '🏝️', '🏔️', '🗺️', '🎒',
  '🌊', '🌴', '🏖️', '🗼', '🌋', '🏕️',
  '🚂', '🛵', '🌸', '🍜', '🤿', '🏄',
  '🎑', '🌅', '🦅', '🐚', '🌺', '🎭',
];

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditTripModal({ visible, trip, onClose, onSaved }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [kbHeight, setKbHeight] = useState(0);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setDestination(trip.destination);
      setEmoji(trip.emoji || '✈️');
    }
  }, [trip]);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, (e) => setKbHeight(e.endCoordinates.height));
    const s2 = Keyboard.addListener(hide, () => setKbHeight(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  useEffect(() => {
    if (visible) {
      sheetTranslateY.setValue(0);
    }
  }, [visible, sheetTranslateY]);

  const handlePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          sheetTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6) {
          onClose();
          return;
        }

        if (gestureState.dy > 90) {
          Animated.timing(sheetTranslateY, {
            toValue: 320,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onClose());
          return;
        }

        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    })
  ).current;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Missing Info', 'Please enter a trip name.'); return; }
    if (!destination.trim()) { Alert.alert('Missing Info', 'Please enter a destination.'); return; }
    await updateTrip(trip.id, {
      name: name.trim(),
      destination: destination.trim(),
      dates: trip.dates,
      days: trip.days,
      emoji,
    });
    onSaved({ ...trip, name: name.trim(), destination: destination.trim(), emoji });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[modal.sheet, {
          paddingBottom: kbHeight > 0 ? s(24) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
          transform: [{ translateY: sheetTranslateY }],
        }]}>
          <View
            style={modal.handleTouch}
            {...handlePanResponder.panHandlers}
          >
            <View style={modal.handle} />
          </View>
          <Text style={modal.title}>Edit Trip</Text>

          <View style={modal.emojiPreviewRow}>
            <View style={modal.emojiPreview}>
              <Text style={modal.emojiPreviewText}>{emoji}</Text>
            </View>
            <Text style={modal.emojiHint}>Tap to change icon</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modal.emojiScroll} contentContainerStyle={modal.emojiScrollContent}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[modal.emojiCell, emoji === e && modal.emojiCellActive]}
                onPress={() => setEmoji(e)}
                activeOpacity={0.7}
              >
                <Text style={modal.emojiCellText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={modal.fieldLabel}>Trip Name</Text>
          <TextInput
            style={modal.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Coron Island Escape"
            placeholderTextColor={Colors.grayMedium}
            maxLength={50}
          />

          <Text style={modal.fieldLabel}>Destination</Text>
          <TextInput
            style={modal.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="e.g. Palawan"
            placeholderTextColor={Colors.grayMedium}
            maxLength={50}
          />

          <TouchableOpacity style={modal.saveBtn} onPress={handleSave}>
            <Text style={modal.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Trip Card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress, onLongPress }) {
  const hasDates = !!trip.dates && !trip.dates.match(/^\d+ days?$/i);

  return (
    <TouchableOpacity
      style={styles.cardShadow}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.85}
      delayLongPress={400}
    >
      <View style={styles.card}>
        <View style={styles.emojiBox}>
          <Text style={styles.emoji}>{trip.emoji || '✈️'}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.tripName} numberOfLines={1}>{trip.name}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={s(12)} color={Colors.primary} />
            <Text style={styles.metaText} numberOfLines={1}>{trip.destination}</Text>
          </View>

          {hasDates && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={s(12)} color={Colors.textSecondary} />
              <Text style={styles.metaDates} numberOfLines={1}>{trip.dates}</Text>
            </View>
          )}

          <View style={styles.badgeRow}>
            <View style={styles.daysBadge}>
              <Ionicons name="time-outline" size={s(11)} color={Colors.primary} />
              <Text style={styles.daysText}>{trip.days} {trip.days === 1 ? 'Day' : 'Days'}</Text>
            </View>
            <Text style={styles.holdHint}>Hold to edit</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={s(18)} color={Colors.border} style={styles.chevron} />
      </View>
    </TouchableOpacity>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <Animated.View style={[skeleton.card, { opacity: pulse }]}>
      <View style={skeleton.icon} />
      <View style={skeleton.body}>
        <View style={skeleton.titleLine} />
        <View style={skeleton.subLine} />
        <View style={skeleton.tagLine} />
      </View>
    </Animated.View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onCreate }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Text style={{ fontSize: s(52) }}>🧳</Text>
      </View>
      <Text style={styles.emptyTitle}>No trips yet</Text>
      <Text style={styles.emptySub}>Plan your next Philippine adventure!</Text>
      <TouchableOpacity style={styles.emptyBtn} onPress={onCreate}>
        <Ionicons name="add" size={s(18)} color={Colors.white} />
        <Text style={styles.emptyBtnText}>Create Your First Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function TripsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState([]);
  const [editTrip, setEditTrip] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    getTrips().then(data => { setTrips(data); setLoading(false); });
  }, []));

  const handleRefresh = async () => {
    setRefreshing(true);
    const updated = await getTrips();
    setTrips(updated);
    setRefreshing(false);
  };

  const handleLongPress = (trip) => {
    Alert.alert(
      trip.name,
      'What would you like to do?',
      [
        {
          text: 'Edit Trip',
          onPress: () => setEditTrip(trip),
        },
        {
          text: 'Duplicate Trip',
          onPress: () =>
            Alert.alert('Duplicate Trip', `Copy "${trip.name}" with all its activities?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Duplicate',
                onPress: async () => {
                  await duplicateTrip(trip.id);
                  const updated = await getTrips();
                  setTrips(updated);
                },
              },
            ]),
        },
        {
          text: 'Delete Trip',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Delete Trip', `Are you sure you want to delete "${trip.name}"? This cannot be undone.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                  await deleteTrip(trip.id);
                  setTrips(prev => prev.filter(t => t.id !== trip.id));
                },
              },
            ]),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSaved = (updated) => {
    setTrips(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
  };

  const FREE_TRIP_LIMIT = 3;

  const handleAddTrip = () => {
    if (trips.length >= FREE_TRIP_LIMIT) {
      navigation.navigate('Premium');
      return;
    }
    navigation.navigate('CreateTrip');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(14) }]}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>My Trips</Text>
          {trips.length > 0 && (
            <View style={styles.headerPill}>
              <Text style={styles.headerPillText}>
                {trips.length} trip{trips.length !== 1 ? 's' : ''} planned
              </Text>
              {trips.length < FREE_TRIP_LIMIT && (
                <Text style={styles.headerPillSub}>
                  {FREE_TRIP_LIMIT - trips.length} free slot{FREE_TRIP_LIMIT - trips.length !== 1 ? 's' : ''} left
                </Text>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Search')}>
          <Ionicons name="search-outline" size={s(20)} color={Colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddTrip}>
          <Ionicons name="add" size={s(20)} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </ScrollView>
      ) : trips.length === 0 ? (
        <EmptyState onCreate={handleAddTrip} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
              progressBackgroundColor={Colors.white}
            />
          }
        >
          {trips.map(trip => (
            <TripCard
              key={trip.id}
              trip={trip}
              onPress={() => navigation.navigate('TripDetails', { trip })}
              onLongPress={() => handleLongPress(trip)}
            />
          ))}
        </ScrollView>
      )}

      <EditTripModal
        visible={!!editTrip}
        trip={editTrip}
        onClose={() => setEditTrip(null)}
        onSaved={handleSaved}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: s(20), fontFamily: Fonts.bold,
    color: Colors.white,
  },
  headerPill: {
    alignSelf: 'flex-start', marginTop: s(8),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: s(20), paddingHorizontal: s(10), paddingVertical: s(4),
  },
  headerPillText: {
    fontSize: s(11), fontFamily: Fonts.medium, color: Colors.white,
  },
  headerPillSub: {
    fontSize: s(10), fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.7)',
  },
  addBtn: {
    width: s(34), height: s(34), borderRadius: s(10),
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: s(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.1, shadowRadius: s(4), elevation: 3,
  },

  list: { padding: s(16), gap: s(12), paddingBottom: s(32) },

  cardShadow: {
    borderRadius: s(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.07, shadowRadius: s(8), elevation: 3,
  },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: s(16),
    overflow: 'hidden', gap: s(12), paddingHorizontal: s(12),
    borderWidth: 1, borderColor: Colors.border + '60',
  },
  emojiBox: {
    width: s(54), height: s(54), borderRadius: s(14),
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: s(14),
  },
  emoji: { fontSize: s(28) },
  info: { flex: 1, paddingVertical: s(14) },
  tripName: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(4) },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: s(4), marginTop: s(2) },
  metaText: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary, flex: 1 },
  metaDates: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, flex: 1 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginTop: s(8) },
  daysBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: Colors.primaryBg, borderRadius: s(8),
    paddingHorizontal: s(8), paddingVertical: s(3),
  },
  daysText: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.primary },
  holdHint: { fontSize: s(10), fontFamily: Fonts.regular, color: Colors.grayMedium },
  chevron: { marginLeft: s(4) },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(10), paddingHorizontal: s(40) },
  emptyIconWrap: {
    width: s(100), height: s(100), borderRadius: s(28),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
    marginBottom: s(4),
  },
  emptyTitle: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  emptySub: { fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingHorizontal: s(24), paddingVertical: s(13), marginTop: s(8),
  },
  emptyBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});

const modal = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  handle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium,
  },
  handleTouch: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: s(2),
    paddingBottom: s(10),
    marginBottom: s(8),
  },
  title: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(16) },

  emojiPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: s(12), marginBottom: s(10) },
  emojiPreview: {
    width: s(52), height: s(52), borderRadius: s(14),
    backgroundColor: Colors.primaryBg, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: s(28) },
  emojiHint: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary },

  emojiScroll: { marginBottom: s(14) },
  emojiScrollContent: { gap: s(8), paddingVertical: s(4) },
  emojiCell: {
    width: s(44), height: s(44), borderRadius: s(12),
    backgroundColor: Colors.bgLight, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCellActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  emojiCellText: { fontSize: s(22) },

  fieldLabel: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(6) },
  input: {
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary,
    borderWidth: 1.5, borderColor: Colors.border, marginBottom: s(14),
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center', marginTop: s(4),
  },
  saveBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});

const skeleton = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: s(16),
    padding: s(12), gap: s(12),
    borderWidth: 1, borderColor: Colors.border + '60',
  },
  icon: {
    width: s(54), height: s(54), borderRadius: s(14),
    backgroundColor: Colors.bgLight,
  },
  body: { flex: 1, gap: s(8) },
  titleLine: { height: s(13), borderRadius: s(6), backgroundColor: Colors.bgLight, width: '70%' },
  subLine:   { height: s(11), borderRadius: s(6), backgroundColor: Colors.bgLight, width: '50%' },
  tagLine:   { height: s(11), borderRadius: s(6), backgroundColor: Colors.bgLight, width: '30%' },
});
