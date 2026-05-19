import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, Modal, Alert, Platform, Keyboard,
  TextInput, Image, FlatList, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { REGION_CATALOG, REGION_DESTINATIONS } from '../data/regionData';
import {
  PLACES_BY_DESTINATION, TRAVEL_MODE_META, CATEGORY_TO_ACTIVITY,
} from '../data/placesData';
import { getTrips, addTripActivity } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const CARD_W    = s(200);
const CARD_H    = s(260);
const SPACING   = s(12);
const ITEM_SIZE = CARD_W + SPACING;

const CATEGORY_EMOJI = {
  beach: '🏖️', nature: '🌿', food: '🍜',
  landmark: '🏛️', activity: '🎯', shopping: '🛍️',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getVisitLength(place) {
  if (place.visitLength) return place.visitLength;
  switch (place.category) {
    case 'food':     return '30–90 min';
    case 'shopping': return '45–90 min';
    case 'landmark': return '45–120 min';
    case 'activity': return place.mustVisit ? '2–4 hrs' : '1–3 hrs';
    case 'beach':    return place.mustVisit ? 'Half–full day' : '2–4 hrs';
    case 'nature':   return place.mustVisit ? '2–4 hrs' : '1–2 hrs';
    default:         return 'About 1–2 hrs';
  }
}

function getBestTime(place) {
  if (place.bestTimeToVisit) return place.bestTimeToVisit;
  const t = `${place.name} ${place.description}`.toLowerCase();
  if (/sunset|viewpoint|overlook/.test(t)) return 'Late afternoon to sunset';
  if (/market|night market/.test(t))       return 'Late afternoon to evening';
  if (/beach|lagoon|island|reef|snorkel|swim|falls|spring/.test(t)) return 'Morning to early afternoon';
  if (/hike|trail|terraces|cave|mount/.test(t)) return 'Early morning';
  return 'Morning or late afternoon';
}

function getPlanningNote(place) {
  if (place.itineraryTip) return place.itineraryTip;
  const t = `${place.name} ${place.description}`.toLowerCase();
  const tr = place?.travel || {};
  const hasBoat = !!tr.ferry;
  const isWater = /lagoon|lake|beach|island|snorkel|reef|swim|falls|spring/.test(t);
  const isHike  = /hike|trail|steps|cliff|terraces|cave|mount/.test(t);
  const isSunset = /sunset|viewpoint|overlook/.test(t);
  if (isSunset) return 'Place this late in the day to end with the best light.';
  if (hasBoat && isWater && place.mustVisit) return 'Make this a main anchor — boat stops shape the whole schedule.';
  if (isHike) return 'Schedule this while energy is high and keep the next stop lighter.';
  if (place.mustVisit) return "Use this as the day's core highlight and build the rest around it.";
  return 'Works well as a flexible stop around your main highlights.';
}

function getTransportSummary(place) {
  if (place.howToGetThere) return place.howToGetThere;
  const options = Object.entries(place?.travel || {}).filter(([, v]) => v);
  if (options.length === 0) return 'Ask locally for the most practical ride from town proper.';
  const summary = options.slice(0, 2)
    .map(([mode, time]) => `${TRAVEL_MODE_META[mode]?.label || mode} in about ${time}`)
    .join(' or ');
  return `Usually reached by ${summary}.`;
}

// ── Add to Trip Modal ────────────────────────────────────────────────────────

function AddToTripModal({ visible, place, trips, onClose }) {
  const insets = useSafeAreaInsets();
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [selectedDay, setSelectedDay]   = useState(1);
  const [hour, setHour]     = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    if (trips.length > 0 && !selectedTrip) setSelectedTrip(trips[0]);
  }, [trips]);

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, (e) => setKbHeight(e.endCoordinates.height));
    const s2 = Keyboard.addListener(hide, () => setKbHeight(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  const reset = () => {
    setSelectedDay(1); setHour(''); setMinute(''); setPeriod('AM');
  };

  const handleAdd = async () => {
    if (!selectedTrip) { Alert.alert('No Trip', 'Create a trip first.'); return; }
    if (!hour.trim())  { Alert.alert('Missing', 'Please enter the hour.'); return; }
    setSaving(true);
    const time = `${hour.padStart(2,'0')}:${(minute||'00').padStart(2,'0')} ${period}`;
    await addTripActivity({
      tripId:   selectedTrip.id,
      day:      selectedDay,
      time,
      title:    place.name,
      subtitle: place.description.split(' — ')[0],
      category: CATEGORY_TO_ACTIVITY[place.category] || 'activity',
      cost:     0,
    });
    setSaving(false);
    reset();
    onClose();
    Alert.alert('Added!', `${place.name} added to Day ${selectedDay} of "${selectedTrip.name}". ✓`);
  };

  const dayNumbers = Array.from({ length: selectedTrip?.days || 1 }, (_, i) => i + 1);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { reset(); onClose(); }} />
        <View style={[modal.sheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={modal.handle} />
          <Text style={modal.title}>Add to Itinerary</Text>
          <Text style={modal.placeName}>{place?.name}</Text>

          {trips.length === 0 ? (
            <Text style={modal.noTrips}>No trips yet. Create one first from the Trips tab.</Text>
          ) : (
            <>
              <Text style={modal.fieldLabel}>Which trip?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: s(8), marginBottom: s(14) }}>
                {trips.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[modal.chip, selectedTrip?.id === t.id && modal.chipActive]}
                    onPress={() => { setSelectedTrip(t); setSelectedDay(1); }}
                  >
                    <Text style={[modal.chipText, selectedTrip?.id === t.id && modal.chipTextActive]}>
                      {t.emoji} {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={modal.fieldLabel}>Which day?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: s(8), marginBottom: s(14) }}>
                {dayNumbers.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[modal.chip, selectedDay === d && modal.chipActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[modal.chipText, selectedDay === d && modal.chipTextActive]}>Day {d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={modal.fieldLabel}>What time?</Text>
              <View style={modal.timeRow}>
                <TextInput
                  style={modal.timeInput}
                  value={hour}
                  onChangeText={v => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="08"
                  placeholderTextColor={Colors.grayMedium}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={modal.timeColon}>:</Text>
                <TextInput
                  style={modal.timeInput}
                  value={minute}
                  onChangeText={v => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="00"
                  placeholderTextColor={Colors.grayMedium}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <View style={modal.periodToggle}>
                  {['AM', 'PM'].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[modal.periodBtn, period === p && modal.periodBtnActive]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text style={[modal.periodText, period === p && modal.periodTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[modal.confirmBtn, saving && { opacity: 0.7 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <Text style={modal.confirmBtnText}>{saving ? 'Adding...' : 'Add to Trip'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Place Detail Modal ───────────────────────────────────────────────────────

function PlaceDetailModal({ visible, place, trips, onClose }) {
  const insets = useSafeAreaInsets();
  const [showAddTrip, setShowAddTrip] = useState(false);

  if (!place) return null;

  const visitLength = getVisitLength(place);
  const bestTime    = getBestTime(place);
  const planNote    = getPlanningNote(place);
  const transport   = getTransportSummary(place);
  const travelModes = Object.entries(place.travel || {}).filter(([, v]) => v);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={[detail.sheet, { paddingBottom: insets.bottom + s(16) }]}>
          <View style={detail.handle} />

          {/* Hero */}
          <View style={detail.heroWrap}>
                    <View style={[detail.heroImg, detail.heroFallback]}>
              <Text style={detail.heroEmoji}>{CATEGORY_EMOJI[place.category] || '📍'}</Text>
            </View>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={detail.heroLabels}>
              {place.mustVisit && (
                <View style={detail.mustBadge}>
                  <Text style={detail.mustBadgeText}>Must-visit</Text>
                </View>
              )}
              <Text style={detail.heroName}>{place.name}</Text>
            </View>
          </View>

          <ScrollView style={detail.body} showsVerticalScrollIndicator={false}>
            {/* Quick chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={detail.chipsRow}>
              <View style={detail.chip}>
                <Ionicons name={place.entranceFee > 0 ? 'cash-outline' : 'checkmark-circle-outline'}
                  size={s(12)} color={place.entranceFee > 0 ? '#FF9500' : '#34C759'} />
                <Text style={[detail.chipText, { color: place.entranceFee > 0 ? '#FF9500' : '#34C759' }]}>
                  {place.entranceFee > 0 ? `PHP ${place.entranceFee}` : 'Free entry'}
                </Text>
              </View>
              <View style={detail.chip}>
                <Ionicons name="time-outline" size={s(12)} color={Colors.primary} />
                <Text style={[detail.chipText, { color: Colors.primary }]}>{visitLength}</Text>
              </View>
              {travelModes.slice(0, 2).map(([mode, time]) => {
                const meta = TRAVEL_MODE_META[mode];
                if (!meta) return null;
                return (
                  <View key={mode} style={detail.chip}>
                    <Text style={detail.travelEmoji}>{meta.emoji}</Text>
                    <Text style={[detail.chipText, { color: Colors.textSecondary }]}>{time} {meta.label.toLowerCase()}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Description */}
            <Text style={detail.desc}>{place.description}</Text>

            {/* Info rows */}
            <View style={detail.infoBlock}>
              <View style={detail.infoRow}>
                <View style={detail.infoIconWrap}>
                  <Ionicons name="navigate-outline" size={s(14)} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detail.infoLabel}>How to get there</Text>
                  <Text style={detail.infoText}>{transport}</Text>
                </View>
              </View>
              <View style={detail.divider} />
              <View style={detail.infoRow}>
                <View style={detail.infoIconWrap}>
                  <Ionicons name="sunny-outline" size={s(14)} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detail.infoLabel}>Best time to visit</Text>
                  <Text style={detail.infoText}>{bestTime}</Text>
                </View>
              </View>
              <View style={detail.divider} />
              <View style={detail.infoRow}>
                <View style={detail.infoIconWrap}>
                  <Ionicons name="bulb-outline" size={s(14)} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={detail.infoLabel}>Itinerary tip</Text>
                  <Text style={detail.infoText}>{planNote}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={detail.addBtn} onPress={() => setShowAddTrip(true)}>
              <Ionicons name="add-circle-outline" size={s(18)} color={Colors.white} />
              <Text style={detail.addBtnText}>Add to Trip</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <AddToTripModal
          visible={showAddTrip}
          place={place}
          trips={trips}
          onClose={() => setShowAddTrip(false)}
        />
      </View>
    </Modal>
  );
}

// ── Coverflow Row ────────────────────────────────────────────────────────────

function CoverflowRow({ places, onPress }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const sidePad = (width - CARD_W) / 2 - SPACING / 2;

  return (
    <Animated.FlatList
      horizontal
      data={places}
      keyExtractor={(item) => item.id}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
      scrollEventThrottle={16}
      snapToInterval={ITEM_SIZE}
      decelerationRate="fast"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: sidePad, paddingVertical: s(10) }}
      renderItem={({ item, index }) => {
        const center = index * ITEM_SIZE;
        const inputRange = [center - ITEM_SIZE * 2, center - ITEM_SIZE, center, center + ITEM_SIZE, center + ITEM_SIZE * 2];

        const scale = scrollX.interpolate({
          inputRange,
          outputRange: [0.72, 0.85, 1, 0.85, 0.72],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.45, 0.7, 1, 0.7, 0.45],
          extrapolate: 'clamp',
        });
        const rotateY = scrollX.interpolate({
          inputRange,
          outputRange: ['-40deg', '-18deg', '0deg', '18deg', '40deg'],
          extrapolate: 'clamp',
        });
        const translateY = scrollX.interpolate({
          inputRange,
          outputRange: [16, 8, 0, 8, 16],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View style={{
            width: CARD_W, height: CARD_H,
            marginHorizontal: SPACING / 2,
            opacity,
            transform: [{ perspective: s(800) }, { scale }, { rotateY }, { translateY }],
          }}>
            <TouchableOpacity style={{ flex: 1, borderRadius: s(18), overflow: 'hidden' }} onPress={() => onPress(item)} activeOpacity={0.92}>
              <View style={{ flex: 1, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: s(64) }}>{CATEGORY_EMOJI[item.category] || '📍'}</Text>
              </View>
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.78)']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0.35 }}
                end={{ x: 0, y: 1 }}
              />
              {item.mustVisit && (
                <View style={cflow.mustBadge}>
                  <Text style={cflow.mustText}>Must-visit</Text>
                </View>
              )}
              <View style={cflow.labelWrap}>
                <Text style={cflow.catLabel}>{item.category?.toUpperCase()}</Text>
                <Text style={cflow.nameLabel} numberOfLines={2}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      }}
    />
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function DestinationsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const draftName = route?.params?.draftName || '';

  const [trips, setTrips]           = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  useFocusEffect(useCallback(() => {
    getTrips().then(setTrips);
  }, []));

  const sections = useMemo(() => {
    return REGION_CATALOG.map(region => {
      const dest = REGION_DESTINATIONS[region.regionKey];
      const places = PLACES_BY_DESTINATION[dest] || [];
      return { region, dest, places };
    }).filter(s => s.places.length > 0);
  }, []);

  const handlePlanTrip = (destinationName) => {
    const tripName = draftName.trim() || `${destinationName} Adventure`;
    const parent = navigation.getParent?.() || navigation;
    parent.navigate('CreateTrip', {
      initialDestination: destinationName,
      initialName: tripName,
    });
  };

  const handlePlacePress = (place) => {
    setSelectedPlace(place);
    setShowDetail(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(14) }]}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSub}>
          Tap any place to see tips, how to get there, and add it to your trip.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map(({ region, dest, places }) => (
          <View key={region.id} style={styles.section}>
            {/* Section header */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionName}>{region.name}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{places.length}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handlePlanTrip(dest)}>
                <Text style={styles.planLink}>Plan Trip →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSub}>{region.subtitle}</Text>

            {/* Coverflow place cards */}
            <CoverflowRow places={places} onPress={handlePlacePress} />
          </View>
        ))}
      </ScrollView>

      <PlaceDetailModal
        visible={showDetail}
        place={selectedPlace}
        trips={trips}
        onClose={() => setShowDetail(false)}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: s(20),
    paddingBottom: s(18),
  },
  headerTitle: { fontSize: s(24), fontFamily: Fonts.black, color: Colors.white },
  headerSub: {
    marginTop: s(4), fontSize: s(12), lineHeight: s(18),
    fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.85)',
  },
  content: { paddingTop: s(16), paddingBottom: s(40) },
  section: { marginBottom: s(24) },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16), marginBottom: s(2),
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  sectionName: { fontSize: s(17), fontFamily: Fonts.bold, color: Colors.textPrimary },
  countBadge: {
    backgroundColor: Colors.primaryBg, borderRadius: s(999),
    paddingHorizontal: s(8), paddingVertical: s(2),
  },
  countBadgeText: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.primary },
  planLink: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.primary },
  sectionSub: {
    fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary,
    paddingHorizontal: s(16), marginBottom: s(10),
  },
});

const cflow = StyleSheet.create({
  mustBadge: {
    position: 'absolute', top: s(12), left: s(12),
    backgroundColor: Colors.primary,
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderRadius: s(20),
  },
  mustText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.white },
  labelWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: s(16),
  },
  catLabel: {
    fontSize: s(9), fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.2, marginBottom: s(4),
  },
  nameLabel: {
    fontSize: s(16), fontFamily: Fonts.bold,
    color: Colors.white, lineHeight: s(22),
  },
});

const detail = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    maxHeight: '90%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: s(16), elevation: 20,
  },
  handle: {
    width: s(36), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.border, alignSelf: 'center', marginTop: s(10), marginBottom: s(4),
  },
  heroWrap: { width: '100%', height: s(180), overflow: 'hidden' },
  heroImg: { width: '100%', height: s(180) },
  heroFallback: { backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  heroEmoji: { fontSize: s(48) },
  heroLabels: {
    position: 'absolute', bottom: s(12), left: s(16), right: s(16),
  },
  mustBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary, borderRadius: s(999),
    paddingHorizontal: s(8), paddingVertical: s(3),
    marginBottom: s(4),
  },
  mustBadgeText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.white, textTransform: 'uppercase' },
  heroName: { fontSize: s(20), fontFamily: Fonts.black, color: Colors.white },

  body: { paddingHorizontal: s(16), paddingTop: s(14) },

  chipsRow: { gap: s(8), paddingBottom: s(12), flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: s(5),
    backgroundColor: Colors.bgLight, borderRadius: s(999),
    paddingHorizontal: s(10), paddingVertical: s(5),
    borderWidth: 1, borderColor: Colors.border,
  },
  chipText: { fontSize: s(11), fontFamily: Fonts.medium },
  travelEmoji: { fontSize: s(12) },

  desc: {
    fontSize: s(13), lineHeight: s(20), fontFamily: Fonts.regular,
    color: Colors.textSecondary, marginBottom: s(14),
  },

  infoBlock: {
    backgroundColor: Colors.bgLight, borderRadius: s(14),
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginBottom: s(16),
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: s(12), padding: s(12),
  },
  infoIconWrap: {
    width: s(28), height: s(28), borderRadius: s(8),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: s(52) },
  infoLabel: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: s(2) },
  infoText: { fontSize: s(13), lineHeight: s(19), fontFamily: Fonts.regular, color: Colors.textPrimary },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8),
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(15), marginBottom: s(8),
  },
  addBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});

const modal = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    paddingHorizontal: s(20), paddingTop: s(8),
  },
  handle: {
    width: s(36), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.border, alignSelf: 'center', marginBottom: s(14),
  },
  title: { fontSize: s(17), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(2) },
  placeName: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary, marginBottom: s(16) },
  noTrips: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', paddingVertical: s(16) },
  fieldLabel: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(8) },
  chip: {
    paddingHorizontal: s(14), paddingVertical: s(8), borderRadius: s(20),
    backgroundColor: Colors.bgLight, borderWidth: 1.5, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(16) },
  timeInput: {
    width: s(58), textAlign: 'center',
    backgroundColor: Colors.bgLight, borderRadius: s(10),
    paddingVertical: s(10), fontSize: s(18), fontFamily: Fonts.bold,
    color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border,
  },
  timeColon: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  periodToggle: {
    flexDirection: 'row', backgroundColor: Colors.bgLight,
    borderRadius: s(10), borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
  },
  periodBtn: { paddingHorizontal: s(14), paddingVertical: s(10) },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  periodTextActive: { color: Colors.white },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(15), alignItems: 'center',
  },
  confirmBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});
