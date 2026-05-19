import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions,
  StatusBar, Modal, TextInput, Keyboard, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { initDB } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const AVATAR_SIZE = s(100);
const BANNER_H    = s(85);

const RANK_IMAGES = [
  require('../../assets/images/profile/new-explorer.webp'),
  require('../../assets/images/profile/wanderer.webp'),
  require('../../assets/images/profile/adventurer.webp'),
  require('../../assets/images/profile/road-warrior.webp'),
  require('../../assets/images/profile/legend.webp'),
];

const RANKS = [
  { label: 'New Explorer',    minTrips: 0,  maxTrips: 1,    icon: '🗺️' },
  { label: 'Wanderer',        minTrips: 1,  maxTrips: 3,    icon: '🧭' },
  { label: 'Adventurer',      minTrips: 3,  maxTrips: 6,    icon: '⛺' },
  { label: 'Road Warrior',    minTrips: 6,  maxTrips: 10,   icon: '🎖️' },
  { label: 'LakbayPH Legend', minTrips: 10, maxTrips: null, icon: '🏆' },
];

function getRank(trips) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (trips >= RANKS[i].minTrips) return { rank: RANKS[i], index: i };
  }
  return { rank: RANKS[0], index: 0 };
}

const MENU_ITEMS = [
  { icon: 'sparkles-outline',           label: 'Destinations',    screen: 'Discover' },
  { icon: 'car-outline',                label: 'Transport Guide', screen: 'Transport' },
  { icon: 'chatbubble-ellipses-outline', label: 'Travel Buddy',   screen: 'TravelBuddy' },
  { icon: 'star-outline',               label: 'Go Premium',      screen: 'Premium' },
  { icon: 'settings-outline',           label: 'Settings',        screen: 'Settings' },
];


function EditNameModal({ visible, currentName, onClose, onSave }) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(currentName);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const handleSave = () => {
    if (value.trim()) {
      onSave(value.trim());
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Edit Nickname</Text>
          <Text style={styles.fieldLabel}>Your name</Text>
          <TextInput
            style={styles.nameInput}
            value={value}
            onChangeText={setValue}
            placeholder="Enter your nickname"
            placeholderTextColor={Colors.grayMedium}
            maxLength={30}
            autoFocus
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function MoreScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userName, setUserName } = useUser();
  const [showEditName, setShowEditName] = useState(false);
  const [stats, setStats] = useState({ trips: 0, places: 0, days: 0 });

  const { rank, index: rankIndex } = getRank(stats.trips);
  const nextRank = RANKS[rankIndex + 1] ?? null;
  const rankProgress = nextRank
    ? Math.min((stats.trips - rank.minTrips) / (nextRank.minTrips - rank.minTrips), 1)
    : 1;

  useFocusEffect(
    useCallback(() => {
      async function loadStats() {
        const d = await initDB();
        const tripsRow  = await d.getFirstAsync(`SELECT COUNT(*) as count FROM trips`);
        const placesRow = await d.getFirstAsync(`SELECT COUNT(*) as count FROM trip_activities`);
        const daysRow   = await d.getFirstAsync(`SELECT SUM(days) as total FROM trips`);
        setStats({
          trips:  tripsRow?.count  ?? 0,
          places: placesRow?.count ?? 0,
          days:   daysRow?.total   ?? 0,
        });
      }
      loadStats();
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── RED HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <Text style={styles.headerTitle}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: s(40) }}>

        {/* ── PROFILE CARD ── */}
        <View style={styles.profileCard}>

          {/* Hero banner with decorative circles */}
          <View style={styles.heroBanner}>
            <View style={styles.bannerCircle1} />
            <View style={styles.bannerCircle2} />
          </View>

          {/* Avatar overlapping banner */}
          <Image
            source={RANK_IMAGES[rankIndex]}
            style={styles.avatarImage}
            resizeMode="cover"
          />

          {/* Name + edit */}
          <View style={styles.profileNameRow}>
            <Text style={styles.profileName}>{userName}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setShowEditName(true)}>
              <Ionicons name="pencil-outline" size={s(14)} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Rank badge */}
          <View style={styles.rankBadge}>
            <Text style={styles.rankIcon}>{rank.icon}</Text>
            <Text style={styles.rankLabel}>{rank.label}</Text>
          </View>

          {/* Rank progress bar */}
          {nextRank && (
            <View style={styles.rankProgressWrap}>
              <View style={styles.rankProgressBg}>
                <View style={[styles.rankProgressFill, { flex: rankProgress }]} />
                <View style={{ flex: 1 - rankProgress }} />
              </View>
              <Text style={styles.rankProgressText}>
                {stats.trips} / {nextRank.minTrips} trips to {nextRank.icon} {nextRank.label}
              </Text>
            </View>
          )}
          {!nextRank && (
            <Text style={styles.rankMaxText}>You've reached the highest rank! 🎉</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.trips}</Text>
              <Text style={styles.statLabel}>Trips</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.places}</Text>
              <Text style={styles.statLabel}>Activities</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.days}</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>

        </View>

        {/* ── MENU ITEMS ── */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                style={styles.menuRow}
                activeOpacity={0.75}
                onPress={() => item.screen && navigation.navigate(item.screen)}
              >
                <View style={styles.menuIconBg}>
                  <Ionicons name={item.icon} size={s(20)} color={Colors.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={s(18)} color={Colors.grayMedium} />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

      </ScrollView>

      <EditNameModal
        visible={showEditName}
        currentName={userName}
        onClose={() => setShowEditName(false)}
        onSave={setUserName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5' },

  // ── Red header
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: s(20), paddingBottom: s(14),
  },
  headerTitle: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.white },

  // ── Profile card
  profileCard: {
    backgroundColor: Colors.white,
    margin: s(16),
    borderRadius: s(20),
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.06, shadowRadius: s(8), elevation: 3,
    alignItems: 'center',
    paddingBottom: s(20),
  },

  // Banner
  heroBanner: {
    width: '100%',
    height: BANNER_H,
    backgroundColor: Colors.primary,
    overflow: 'hidden',
  },
  bannerCircle1: {
    position: 'absolute',
    width: s(130), height: s(130), borderRadius: s(65),
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -s(45), right: s(10),
  },
  bannerCircle2: {
    position: 'absolute',
    width: s(90), height: s(90), borderRadius: s(45),
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -s(30), left: s(20),
  },

  // Avatar overlapping banner
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    marginTop: -(AVATAR_SIZE / 2),
    borderWidth: 3,
    borderColor: Colors.white,
  },

  // Name row
  profileNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    marginTop: s(6),
  },
  profileName: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary },
  editBtn: {
    width: s(26), height: s(26), borderRadius: s(13),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  // Rank badge
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: Colors.primaryBg,
    borderRadius: s(20), paddingHorizontal: s(12), paddingVertical: s(5),
    marginTop: s(6), borderWidth: 1, borderColor: Colors.primary + '30',
  },
  rankIcon: { fontSize: s(13) },
  rankLabel: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.primary },

  // Rank progress
  rankProgressWrap: { width: '80%', alignItems: 'center', marginTop: s(10), gap: s(4) },
  rankProgressBg: {
    width: '100%', height: s(6), borderRadius: s(3),
    backgroundColor: Colors.grayLight, flexDirection: 'row', overflow: 'hidden',
  },
  rankProgressFill: { backgroundColor: Colors.primary, borderRadius: s(3) },
  rankProgressText: {
    fontSize: s(10), fontFamily: Fonts.medium,
    color: Colors.textSecondary, textAlign: 'center',
  },
  rankMaxText: {
    fontSize: s(11), fontFamily: Fonts.medium,
    color: Colors.primary, marginTop: s(8),
  },

  // Stats
  statsDivider: {
    width: '85%', height: 1,
    backgroundColor: Colors.border, marginTop: s(16),
  },
  statsRow: {
    flexDirection: 'row', width: '100%',
    paddingHorizontal: s(16), paddingTop: s(14),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.primary },
  statLabel: { fontSize: s(11), fontFamily: Fonts.medium, color: Colors.textSecondary, marginTop: s(2) },
  statSep: { width: 1, height: s(36), backgroundColor: Colors.border, alignSelf: 'center' },

  // ── Menu card
  menuCard: {
    backgroundColor: Colors.white, marginHorizontal: s(16),
    borderRadius: s(16), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.05, shadowRadius: s(4), elevation: 2,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    paddingHorizontal: s(16), paddingVertical: s(14),
  },
  menuIconBg: {
    width: s(38), height: s(38), borderRadius: s(10),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary, flex: 1 },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: s(16) },

  // ── Edit name modal
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  modalHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(20),
  },
  modalTitle: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(16) },
  fieldLabel: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(8) },
  nameInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(16), paddingVertical: s(12),
    fontSize: s(15), fontFamily: Fonts.regular, color: Colors.textPrimary,
    marginBottom: s(20),
  },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center',
  },
  saveBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});
