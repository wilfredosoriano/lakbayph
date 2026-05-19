import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, Dimensions, Modal,
  Animated, PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

// ── Static offline transport data ────────────────────────────────────────────
const TRANSPORT_DATA = [
  {
    id: 'jeepney',
    name: 'Jeepney',
    tagline: 'The king of the road',
    icon: 'jeepney',
    filter: 'Jeepney',
    fare: '₱13 – ₱15 minimum',
    bestFor: 'Short city routes, local experience',
    howToUse: [
      'Flag it down from the roadside — raise your hand.',
      'Check the route sign on the side or front windshield.',
      'Tell the driver or conductor your destination.',
      'Pass your fare forward to the driver if there\'s no conductor.',
      'Say "Para!" (or knock on the roof) to stop.',
    ],
    tips: [
      'Keep ₱13–₱20 in small bills ready — drivers rarely have change for large bills.',
      'The barker at terminals shouts the destination — listen for your stop.',
      'Sit near the exit if you\'re getting off soon.',
      'In Baguio and Cebu, jeepney routes can be confusing — ask locals for the right one.',
      'Exact change is greatly appreciated by drivers.',
    ],
  },
  {
    id: 'tricycle',
    name: 'Tricycle',
    tagline: 'Your neighborhood ride',
    icon: 'tricycle',
    filter: 'Tricycle',
    fare: '₱10 – ₱50 per person (local)',
    bestFor: 'Short distances, barangay-level travel',
    howToUse: [
      'Flag one down anywhere — they\'re everywhere in towns.',
      'Tell the driver your destination before getting in.',
      'Negotiate the fare upfront for non-fixed routes.',
      'For regular routes, a fixed rate applies — ask how much first.',
      'You can charter the whole tricycle for a higher flat rate.',
    ],
    tips: [
      'Always agree on the fare before riding — don\'t wait until you arrive.',
      'Charter rate (special trip) is 3–4x the per-person rate but you get the whole sidecar.',
      'Tricycles don\'t go on national highways — they\'re for barangay and municipal roads.',
      'In tourist areas, fares can be much higher — negotiate firmly.',
      'At night, fares may double — this is common and expected.',
    ],
  },
  {
    id: 'ferry',
    name: 'Ferry / Boat',
    tagline: 'For island hopping & inter-island travel',
    icon: 'ferry',
    filter: 'Ferry',
    fare: '₱150 – ₱2,000+ depending on route',
    bestFor: 'Island hopping, inter-island travel (Visayas, Palawan, Mindanao)',
    howToUse: [
      'Buy tickets at the port terminal or online (2GO, OceanJet).',
      'Arrive at least 30–45 minutes before departure.',
      'Bring your ticket and valid ID for boarding.',
      'For bangka (outrigger boat), boarding is usually first-come, first-served.',
      'Large ferries have different classes: tourist, aircon, economy.',
    ],
    tips: [
      'Book in advance during Holy Week, summer (March–May), and long weekends.',
      'Major operators: 2GO, OceanJet, Starlite, Montenegro, Gothong Southern.',
      'For rough seas, sit in the middle of the vessel — less rocking.',
      'Bring motion sickness medicine if you\'re not used to sea travel.',
      'Check weather and sea conditions — trips can be cancelled due to storms.',
      'For island hopping (El Nido, Coron, Siargao), bangka boats are common and usually booked as packages.',
    ],
  },
  {
    id: 'bus',
    name: 'Bus',
    tagline: 'Inter-city and provincial travel',
    icon: 'bus',
    filter: 'Bus',
    fare: '₱50 – ₱800 depending on distance and type',
    bestFor: 'Inter-provincial travel, long-distance routes, Luzon',
    howToUse: [
      'Go to the bus terminal for your destination region.',
      'Buy a ticket at the booth — or board first and pay on some ordinary buses.',
      'Check the destination sign on the bus windshield.',
      'For provincial buses, a conductor collects fare on board.',
      'P2P (Point-to-Point) buses are air-conditioned and go between specific stops only.',
    ],
    tips: [
      'Major operators: Victory Liner (Luzon North), Partas (Ilocos), Florida Bus (Mountain Province), Ceres (Visayas).',
      'Ordinary buses are cheaper; aircon buses cost more but are far more comfortable.',
      'For Baguio, Banaue, and Sagada — book seats the night before or very early morning.',
      'Night buses (overnight trips) save time and accommodation cost for long routes.',
      'Keep your baggage close — overhead compartments or under-seat storage.',
      'For mountain routes like Sagada, the road is winding — sit on the aisle side if you get dizzy.',
    ],
  },
  {
    id: 'van',
    name: 'Van / FX Shuttle',
    tagline: 'Faster and more direct than a bus',
    icon: 'shuttle',
    filter: 'Van',
    fare: '₱80 – ₱500 per seat',
    bestFor: 'Provincial routes, mountain towns, when buses are scarce',
    howToUse: [
      'Find the van terminal — usually near the public market or main bus terminal.',
      'Tell the driver your destination and they\'ll tell you if they pass through.',
      'Vans depart when full — no fixed schedule on most routes.',
      'Pay the conductor or driver once seated.',
      'For chartered vans, negotiate the full vehicle rate upfront.',
    ],
    tips: [
      'Vans are faster than buses but routes are less predictable.',
      'For Sagada, Banaue, and Batad — vans or "jeepney" are often the only option.',
      'Morning departures (before 8 AM) are most reliable.',
      'Bring a light jacket — van drivers love their aircon very cold.',
      'Your luggage may go on the roof rack — keep valuables in your bag with you.',
    ],
  },
  {
    id: 'habal',
    name: 'Habal-Habal',
    tagline: 'The mountain roads motorcycle',
    icon: 'habal',
    filter: 'Habal-Habal',
    fare: '₱20 – ₱200 depending on distance',
    bestFor: 'Remote areas, mountain roads, trails, last-mile travel',
    howToUse: [
      'Common in rural areas, farm-to-market roads, and mountain barangays.',
      'Flag one down or ask at the local terminal/waiting area.',
      'Agree on the fare before riding — always.',
      'Helmet is often not provided — bring your own if possible.',
      'One rider or two can usually fit, sometimes more in remote areas.',
    ],
    tips: [
      'Essential in Camiguin, remote Cebu, Mindanao highlands, and mountain barangays.',
      'Hold onto the driver or the side rails, especially on steep roads.',
      'Not always legal for passengers on national highways — used mainly on barangay roads.',
      'Morning trips are safer — better visibility and less mud on trails.',
      'If you\'re going to a waterfall or viewpoint deep in the mountains, this is often your only option.',
    ],
  },
];

const FILTERS = ['All', 'Jeepney', 'Tricycle', 'Ferry', 'Bus', 'Van', 'Habal-Habal'];

const TRANSPORT_IMAGES = {
  jeepney:  require('../../assets/images/transportation/jeepney.webp'),
  ferry:    require('../../assets/images/transportation/ferry.webp'),
  bus:      require('../../assets/images/transportation/bus.webp'),
  shuttle:  require('../../assets/images/transportation/van.webp'),
  tricycle: require('../../assets/images/transportation/tricycle.webp'),
  habal:    require('../../assets/images/transportation/habal.webp'),
};

// ── Detail bottom sheet ───────────────────────────────────────────────────────
function DetailModal({ item, onClose }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 120 || g.vy > 0.8) {
        Animated.timing(translateY, {
          toValue: 800, duration: 220, useNativeDriver: true,
        }).start(onClose);
      } else {
        Animated.spring(translateY, {
          toValue: 0, useNativeDriver: true, bounciness: 4,
        }).start();
      }
    },
  })).current;

  if (!item) return null;

  return (
    <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[modal.sheet, { paddingBottom: insets.bottom + s(16) }, { transform: [{ translateY }] }]}>
        <View style={modal.handleArea} {...panResponder.panHandlers}>
          <View style={modal.handle} />
        </View>
        <View style={modal.headerRow}>
          <View style={modal.headerLeft}>
            <Text style={modal.title}>{item.name}</Text>
            <Text style={modal.tagline}>{item.tagline}</Text>
          </View>
          {item.icon && TRANSPORT_IMAGES[item.icon]
            ? <Image source={TRANSPORT_IMAGES[item.icon]} style={modal.thumb} resizeMode="contain" />
            : <Text style={modal.emoji}>{item.emojiIcon}</Text>
          }
        </View>
        <View style={modal.metaRow}>
          <View style={modal.metaChip}>
            <Ionicons name="cash-outline" size={s(14)} color={Colors.primary} />
            <Text style={modal.metaText}>{item.fare}</Text>
          </View>
          <View style={[modal.metaChip, { flex: 1 }]}>
            <Ionicons name="checkmark-circle-outline" size={s(14)} color={Colors.primary} />
            <Text style={modal.metaText} numberOfLines={1}>{item.bestFor}</Text>
          </View>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: s(4) }}>
          <Text style={modal.sectionLabel}>How to Use</Text>
          {item.howToUse.map((step, i) => (
            <View key={i} style={modal.stepRow}>
              <View style={modal.stepNum}>
                <Text style={modal.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={modal.stepText}>{step}</Text>
            </View>
          ))}
          <Text style={[modal.sectionLabel, { marginTop: s(16) }]}>Tips</Text>
          {item.tips.map((tip, i) => (
            <View key={i} style={modal.tipRow}>
              <Text style={modal.tipBullet}>•</Text>
              <Text style={modal.tipText}>{tip}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Transport card ────────────────────────────────────────────────────────────
function TransportCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardDesc}>{item.tagline}</Text>
        <View style={styles.learnRow}>
          <Text style={styles.learnText}>Learn More</Text>
          <Ionicons name="arrow-forward" size={s(13)} color={Colors.primary} />
        </View>
      </View>
      {item.icon && TRANSPORT_IMAGES[item.icon] ? (
        <Image source={TRANSPORT_IMAGES[item.icon]} style={styles.cardImage} resizeMode="contain" />
      ) : (
        <Text style={styles.cardEmoji}>{item.emojiIcon}</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function TransportScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const filtered = activeFilter === 'All'
    ? TRANSPORT_DATA
    : TRANSPORT_DATA.filter(t => t.filter === activeFilter);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transport Guide</Text>
        <View style={{ width: s(36) }} />
      </View>

      {/* Filter chips */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Cards */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {filtered.map((item) => (
          <TransportCard key={item.id} item={item} onPress={() => setSelected(item)} />
        ))}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 General Travel Tips</Text>
          {[
            'Agree on the fare before boarding tricycles and habal-habal.',
            'Keep small bills ready — exact change is always appreciated.',
            'Book ferry tickets in advance during Holy Week and summer.',
            'For mountain areas, always check if the road is passable.',
            'Ask locals for the best and cheapest way to your destination.',
          ].map((tip, i) => (
            <Text key={i} style={styles.tipItem}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>

      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
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
  headerBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: s(18), fontFamily: Fonts.bold, color: Colors.white, textAlign: 'center' },

  filterBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filterContent: { paddingHorizontal: s(16), paddingVertical: s(12), gap: s(8) },
  filterChip: {
    paddingHorizontal: s(18), paddingVertical: s(8),
    borderRadius: s(20), overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  filterTextActive: { color: Colors.white },

  listContent: { padding: s(16), gap: s(12) },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: s(16),
    padding: s(16), gap: s(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.06, shadowRadius: s(8), elevation: 3,
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary },
  cardDesc: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(4), lineHeight: s(19) },
  learnRow: { flexDirection: 'row', alignItems: 'center', gap: s(4), marginTop: s(10) },
  learnText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.primary },
  cardImage: { width: s(120), height: s(90) },
  cardEmoji: { fontSize: s(56), width: s(80), textAlign: 'center' },

  tipsCard: {
    backgroundColor: Colors.primaryBg, borderRadius: s(16), padding: s(16),
    borderWidth: 1, borderColor: Colors.border,
  },
  tipsTitle: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.primary, marginBottom: s(10) },
  tipItem: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, lineHeight: s(20), marginBottom: s(4),
  },
});

const modal = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    paddingHorizontal: s(20), paddingTop: 0,
    maxHeight: '85%',
  },
  handleArea: {
    alignSelf: 'stretch', alignItems: 'center',
    paddingVertical: s(12), marginBottom: s(4),
  },
  handle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium,
  },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: s(12) },
  headerLeft: { flex: 1 },
  title: { fontSize: s(22), fontFamily: Fonts.black, color: Colors.textPrimary },
  tagline: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2) },
  thumb: { width: s(90), height: s(65) },
  emoji: { fontSize: s(52), width: s(80), textAlign: 'center' },

  metaRow: { flexDirection: 'row', gap: s(8), marginBottom: s(16) },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(6),
    backgroundColor: Colors.primaryBg, borderRadius: s(20),
    paddingHorizontal: s(12), paddingVertical: s(6),
  },
  metaText: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.primary, flexShrink: 1 },

  sectionLabel: {
    fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(10),
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10), marginBottom: s(10) },
  stepNum: {
    width: s(22), height: s(22), borderRadius: s(11),
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    marginTop: s(1), flexShrink: 0,
  },
  stepNumText: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.white },
  stepText: { flex: 1, fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textPrimary, lineHeight: s(19) },

  tipRow: { flexDirection: 'row', gap: s(8), marginBottom: s(8) },
  tipBullet: { fontSize: s(14), color: Colors.primary, fontFamily: Fonts.bold, marginTop: s(1) },
  tipText: { flex: 1, fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: s(19) },
});
