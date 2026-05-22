import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Dimensions, Alert, Modal,
  Platform, Keyboard, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PLACE_CATEGORIES, TRAVEL_MODE_META, CATEGORY_TO_ACTIVITY,
  PLACES_BY_DESTINATION, matchDestination,
} from '../data/placesData';
import { addTripActivity, addSavedLocation, getCachedPlaces, getTrips } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

// ── Category metadata ─────────────────────────────────────────────────────────

const CATEGORY_META = {
  beach:    { bg: '#DBEAFE', accent: '#2563EB', emoji: '🏖️', label: 'Beach' },
  nature:   { bg: '#DCFCE7', accent: '#16A34A', emoji: '🌿', label: 'Nature' },
  food:     { bg: '#FFEDD5', accent: '#EA580C', emoji: '🍜', label: 'Food' },
  landmark: { bg: '#EDE9FE', accent: '#7C3AED', emoji: '🏛️', label: 'Landmark' },
  activity: { bg: '#FFE4E6', accent: '#DC2626', emoji: '🎯', label: 'Activity' },
  shopping: { bg: '#E0F2FE', accent: '#0284C7', emoji: '🛍️', label: 'Shopping' },
};

const getCategoryMeta = (category) =>
  CATEGORY_META[category] || { bg: '#F3F4F6', accent: '#6B7280', emoji: '🗺️', label: 'Place' };

// ── Destination hero colors ───────────────────────────────────────────────────

const DEST_HERO = {
  // Palawan
  'El Nido':          { bg: '#0C4A6E', emoji: '🏝️' },
  Coron:              { bg: '#1E3A5F', emoji: '🤿' },
  'Puerto Princesa':  { bg: '#065F46', emoji: '🚣' },
  // Visayas
  Boracay:            { bg: '#0369A1', emoji: '🏖️' },
  Cebu:               { bg: '#0F766E', emoji: '🐋' },
  Bohol:              { bg: '#92400E', emoji: '🦎' },
  Siargao:            { bg: '#047857', emoji: '🏄' },
  Siquijor:           { bg: '#5B21B6', emoji: '🌊' },
  Iloilo:             { bg: '#1E3A5F', emoji: '🏛️' },
  Carcar:             { bg: '#713F12', emoji: '🏛️' },
  // Mindanao
  Davao:              { bg: '#1E3A5F', emoji: '🦅' },
  Camiguin:           { bg: '#115E59', emoji: '🌋' },
  'Lake Sebu':        { bg: '#14532D', emoji: '🚣' },
  Palimbang:          { bg: '#1A3A2A', emoji: '💦' },
  'Cagayan De Oro':   { bg: '#1C3D5A', emoji: '🏔️' },
  Butuan:             { bg: '#3B1E0A', emoji: '🏺' },
  Zamboanga:          { bg: '#0C3547', emoji: '🌺' },
  // Luzon - Cordillera
  Baguio:             { bg: '#2A5C3A', emoji: '🌲' },
  Sagada:             { bg: '#374151', emoji: '⛰️' },
  Banaue:             { bg: '#713F12', emoji: '🌾' },
  // Luzon - Ilocos
  Vigan:              { bg: '#4A2D6B', emoji: '🏛️' },
  Batac:              { bg: '#3B3047', emoji: '🏛️' },
  Laoag:              { bg: '#2D3047', emoji: '🏔️' },
  // Luzon - Tagaytay/Batangas
  Tagaytay:           { bg: '#4A5E1A', emoji: '🌋' },
  Batangas:           { bg: '#0C4A6E', emoji: '🌊' },
  Taal:               { bg: '#4A1E0C', emoji: '🌋' },
  Calamba:            { bg: '#1A3A2A', emoji: '♨️' },
  'Los Baños':        { bg: '#166534', emoji: '♨️' },
  Pangasinan:         { bg: '#0369A1', emoji: '🏝️' },
  // Luzon - Metro & nearby
  Manila:             { bg: '#1E3A5F', emoji: '🏙️' },
  'Quezon City':      { bg: '#1E3A5F', emoji: '🏛️' },
  Makati:             { bg: '#1C2B3A', emoji: '🏢' },
  Antipolo:           { bg: '#1A3A22', emoji: '⛰️' },
  'San Fernando':     { bg: '#3A1A2E', emoji: '🎑' },
  Malolos:            { bg: '#2D1A3A', emoji: '🏛️' },
  Maragondon:         { bg: '#1A3A30', emoji: '🏰' },
  Kawit:              { bg: '#1A2E3A', emoji: '🏛️' },
  // Quezon
  Lucban:             { bg: '#2A3A1A', emoji: '🎨' },
  Tayabas:            { bg: '#3A2A1A', emoji: '⛪' },
  'San Pablo':        { bg: '#1A3A2E', emoji: '🏞️' },
  'Santa Cruz':       { bg: '#1A2A3A', emoji: '🏞️' },
  Lucena:             { bg: '#2A1A3A', emoji: '🏖️' },
  // Misc
  Angeles:            { bg: '#2A1A1A', emoji: '🎰' },
  Cabanatuan:         { bg: '#1A2A1A', emoji: '🏛️' },
  Batangas:           { bg: '#0C4A6E', emoji: '🌊' },
  Naga:               { bg: '#2A3A2A', emoji: '🏛️' },
  Magdiwang:          { bg: '#0C3A4A', emoji: '🏖️' },
};

const getDestMeta = (key) =>
  DEST_HERO[key] || { bg: Colors.primary, emoji: '🗺️' };

// ── Helper functions ──────────────────────────────────────────────────────────

function getVisitLength(place) {
  if (place.visitLength) return place.visitLength;
  switch (place.category) {
    case 'food':     return '30–90 min';
    case 'shopping': return '45–90 min';
    case 'landmark': return '45 min–2 hrs';
    case 'activity': return place.mustVisit ? '2–4 hrs' : '1–3 hrs';
    case 'beach':    return place.mustVisit ? 'Half–full day' : '2–4 hrs';
    case 'nature':   return place.mustVisit ? '2–4 hrs' : '1–2 hrs';
    default:         return '1–2 hrs';
  }
}

function getBestTimeToVisit(place) {
  if (place.bestTimeToVisit) return place.bestTimeToVisit;
  const text = `${place.name} ${place.description}`.toLowerCase();
  if (/sunset|viewpoint|overlook/.test(text))              return 'Late afternoon to sunset';
  if (/market|night market/.test(text))                    return 'Late afternoon to evening';
  if (/beach|lagoon|island|reef|snorkel|swim|falls|spring/.test(text)) return 'Morning to early afternoon';
  if (/hike|trail|terraces|cave|mount/.test(text))         return 'Early morning';
  return 'Morning or late afternoon';
}

function getPlanningNote(place) {
  if (place.itineraryTip) return place.itineraryTip;
  const text = `${place.name} ${place.description}`.toLowerCase();
  const travel = place?.travel || {};
  const hasBoat = !!travel.ferry;
  const isSunset = /sunset|viewpoint|overlook/.test(text);
  const isMarket = /market|town proper|street food|shopping/.test(text);
  const isWater  = /lagoon|lake|beach|island|snorkel|reef|swim|falls|spring/.test(text);
  const isHike   = /hike|trail|steps|cliff|terraces|cave|mount/.test(text);
  const isCultural = /museum|church|shrine|history|heritage|cathedral|park/.test(text);

  if (place.category === 'food')   return 'Best as a meal stop between bigger activities.';
  if (isSunset)                    return 'Place this late in the day for the best light and views.';
  if (hasBoat && isWater && place.mustVisit) return 'Make this one of your main anchors — boat trips shape the whole schedule.';
  if (hasBoat && isWater)          return 'Pair with other water stops on the same side to minimize transfers.';
  if (isHike)                      return 'Schedule while energy is high and follow with a lighter stop.';
  if (isMarket)                    return 'Great near the start or end of the day for food and supplies.';
  if (isCultural && place.entranceFee > 0) return 'Works well as a focused mid-day stop between outdoor activities.';
  if (place.category === 'shopping') return 'Best near the end of the day before heading back.';
  if (place.mustVisit)             return "Use this as one of the day's core highlights.";
  return 'Works well as a flexible stop around your main highlights.';
}

function getTransportSummary(place) {
  if (place.howToGetThere) return place.howToGetThere;
  const options = Object.entries(place?.travel || {}).filter(([, v]) => v !== null);
  if (options.length === 0) return 'Ask locally for the most practical ride from town proper.';
  const summary = options
    .slice(0, 2)
    .map(([mode, time]) => `${TRAVEL_MODE_META[mode]?.label || mode} in about ${time}`)
    .join(' or ');
  return `Usually reached by ${summary}.`;
}

// ── Add to Trip Modal ─────────────────────────────────────────────────────────
// Two-step when no trip is pre-selected:
//   Step 1 — pick a trip from the list
//   Step 2 — pick a day + time

function AddToTripModal({ visible, place, trip, onClose, onDone }) {
  const insets = useSafeAreaInsets();

  // step: 'trip' | 'schedule'
  const [step,        setStep]        = useState(trip ? 'schedule' : 'trip');
  const [trips,       setTrips]       = useState([]);
  const [activeTrip,  setActiveTrip]  = useState(trip || null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [hour,        setHour]        = useState('');
  const [minute,      setMinute]      = useState('');
  const [period,      setPeriod]      = useState('AM');
  const [saving,      setSaving]      = useState(false);
  const [kbHeight,    setKbHeight]    = useState(0);

  // Keyboard listeners
  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(show, (e) => setKbHeight(e.endCoordinates.height));
    const s2 = Keyboard.addListener(hide, () => setKbHeight(0));
    return () => { s1.remove(); s2.remove(); };
  }, []);

  // Load trips when opening in standalone mode (no pre-selected trip)
  useEffect(() => {
    if (visible && !trip) {
      getTrips().then(setTrips);
      setStep('trip');
      setActiveTrip(null);
    } else if (visible && trip) {
      setStep('schedule');
      setActiveTrip(trip);
    }
  }, [visible, trip]);

  const reset = () => {
    setSelectedDay(1); setHour(''); setMinute(''); setPeriod('AM');
    setActiveTrip(trip || null);
    setStep(trip ? 'schedule' : 'trip');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSelectTrip = (t) => { setActiveTrip(t); setStep('schedule'); };

  const handleAdd = async () => {
    if (!hour.trim()) { Alert.alert('Missing', 'Please enter the hour.'); return; }
    setSaving(true);
    await addTripActivity({
      tripId:   activeTrip.id,
      day:      selectedDay,
      time:     `${hour.padStart(2,'0')}:${(minute||'00').padStart(2,'0')} ${period}`,
      title:    place.name,
      subtitle: (place.description || '').split(' — ')[0],
      category: CATEGORY_TO_ACTIVITY[place.category] || 'activity',
      cost:     0,
    });
    setSaving(false);
    reset();
    onDone();
    onClose();
    Alert.alert('Added!', `${place.name} added to Day ${selectedDay} of "${activeTrip.name}". ✓`);
  };

  const days       = activeTrip?.days || 1;
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent
      onRequestClose={handleClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom:  kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />

          {/* ── Step 1: choose a trip ── */}
          {step === 'trip' && (
            <>
              <Text style={styles.modalTitle}>Add to Itinerary</Text>
              <Text style={styles.modalPlace}>{place?.name}</Text>
              <Text style={styles.fieldLabel}>Choose a trip</Text>

              {trips.length === 0 ? (
                <View style={styles.noTripsBox}>
                  <Text style={styles.noTripsText}>
                    You don't have any trips yet.{'\n'}Create a trip first from the Trips tab.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  style={{ maxHeight: s(280) }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ gap: s(8) }}>
                  {trips.map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={styles.tripRow}
                      onPress={() => handleSelectTrip(t)}
                      activeOpacity={0.75}>
                      <Text style={styles.tripRowEmoji}>{t.emoji || '✈️'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tripRowName} numberOfLines={1}>{t.name}</Text>
                        <Text style={styles.tripRowSub} numberOfLines={1}>
                          {t.destination}  ·  {t.days} {t.days === 1 ? 'day' : 'days'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={s(16)} color={Colors.textTertiary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}

          {/* ── Step 2: choose day + time ── */}
          {step === 'schedule' && (
            <>
              <View style={styles.modalTitleRow}>
                {!trip && (
                  <TouchableOpacity onPress={() => setStep('trip')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={s(20)} color={Colors.primary} />
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Add to Itinerary</Text>
                  <Text style={styles.modalPlace}>{place?.name}</Text>
                </View>
              </View>

              {!trip && activeTrip && (
                <View style={styles.selectedTripBadge}>
                  <Text style={styles.selectedTripEmoji}>{activeTrip.emoji || '✈️'}</Text>
                  <Text style={styles.selectedTripName} numberOfLines={1}>{activeTrip.name}</Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Which day?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: s(8), marginBottom: s(20) }}>
                {dayNumbers.map(d => (
                  <TouchableOpacity key={d}
                    style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
                    onPress={() => setSelectedDay(d)}>
                    <Text style={[styles.dayChipText, selectedDay === d && styles.dayChipTextActive]}>
                      Day {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>What time?</Text>
              <View style={styles.timeRow}>
                <TextInput style={styles.timeInput} value={hour}
                  onChangeText={v => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="08" placeholderTextColor={Colors.grayMedium}
                  keyboardType="number-pad" maxLength={2} />
                <Text style={styles.timeColon}>:</Text>
                <TextInput style={styles.timeInput} value={minute}
                  onChangeText={v => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
                  placeholder="00" placeholderTextColor={Colors.grayMedium}
                  keyboardType="number-pad" maxLength={2} />
                <View style={styles.periodToggle}>
                  {['AM','PM'].map(p => (
                    <TouchableOpacity key={p}
                      style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                      onPress={() => setPeriod(p)}>
                      <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
                onPress={handleAdd} disabled={saving}>
                <Text style={styles.confirmBtnText}>{saving ? 'Adding…' : 'Add to Trip'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Destination Hero ──────────────────────────────────────────────────────────

function DestinationHero({ destKey, effectiveDestination, places }) {
  const destName    = destKey || effectiveDestination;
  const meta        = getDestMeta(destName);
  const mustCount   = places.filter(p => p.mustVisit).length;

  // Category breakdown
  const catCounts = places.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const topCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <View style={[styles.heroBanner, { backgroundColor: meta.bg }]}>
      {/* Decorative circles */}
      <View style={styles.heroCircle1} />
      <View style={styles.heroCircle2} />

      <View style={styles.heroInner}>
        <Text style={styles.heroEmoji}>{meta.emoji}</Text>
        <Text style={styles.heroName}>{destName}</Text>
        <Text style={styles.heroStats}>
          {places.length} places{mustCount > 0 ? `  ·  ${mustCount} must-visit` : ''}
        </Text>

        {topCats.length > 0 && (
          <View style={styles.heroCatRow}>
            {topCats.map(([cat, count]) => {
              const cm = getCategoryMeta(cat);
              return (
                <View key={cat} style={styles.heroCatChip}>
                  <Text style={styles.heroCatEmoji}>{cm.emoji}</Text>
                  <Text style={styles.heroCatText}>{count} {cm.label}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

// ── Place Card ────────────────────────────────────────────────────────────────

function PlaceCard({ place, savedIds, onAdd, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const isSaved   = savedIds.has(place.id);
  const cm        = getCategoryMeta(place.category);
  const visitLen  = getVisitLength(place);
  const transport = getTransportSummary(place);
  const bestTime  = getBestTimeToVisit(place);
  const tip       = getPlanningNote(place);
  const travelModes = Object.entries(place.travel || {}).filter(([, v]) => v !== null);

  return (
    <View style={styles.card}>
      {/* Card header row */}
      <View style={styles.cardHeader}>
        {/* Category icon */}
        <View style={[styles.catIcon, { backgroundColor: cm.bg }]}>
          <Text style={styles.catIconEmoji}>{cm.emoji}</Text>
        </View>

        {/* Name + meta */}
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardName} numberOfLines={2}>{place.name}</Text>
          {!!place.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={s(11)} color={Colors.textTertiary} />
              <Text style={styles.locationText} numberOfLines={1}>{place.location}</Text>
            </View>
          )}
          <View style={styles.cardMetaRow}>
            <Text style={[styles.cardMetaLabel, { color: cm.accent }]}>{cm.label}</Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaValue}>
              {place.entranceFee > 0 ? `PHP ${place.entranceFee}` : 'Free'}
            </Text>
            <Text style={styles.cardMetaDot}>·</Text>
            <Text style={styles.cardMetaValue}>{visitLen}</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, isSaved && styles.saveBtnActive]}
          onPress={() => onSave(place)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={s(16)}
            color={isSaved ? Colors.white : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Must-visit badge */}
      {place.mustVisit && (
        <View style={styles.mustVisitRow}>
          <View style={styles.mustVisitBadge}>
            <Text style={styles.mustVisitText}>⭐  Must-visit</Text>
          </View>
        </View>
      )}

      {/* Description */}
      {!!place.description && (
        <Text style={styles.cardDesc} numberOfLines={expanded ? undefined : 3}>
          {place.description}
        </Text>
      )}

      {/* Travel chips */}
      {travelModes.length > 0 && (
        <View style={styles.travelRow}>
          {travelModes.slice(0, 3).map(([mode, time]) => {
            const tm = TRAVEL_MODE_META[mode];
            if (!tm) return null;
            return (
              <View key={mode} style={styles.travelChip}>
                <Text style={styles.travelEmoji}>{tm.emoji}</Text>
                <Text style={styles.travelTime}>{time} {tm.label.toLowerCase()}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Separator */}
      <View style={styles.divider} />

      {/* Expand toggle */}
      <TouchableOpacity
        style={styles.expandRow}
        onPress={() => setExpanded(p => !p)}
        activeOpacity={0.7}>
        <Text style={styles.expandLabel}>{expanded ? 'Less info' : 'More details'}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={s(14)}
          color={Colors.primary}
        />
      </TouchableOpacity>

      {/* Expanded details */}
      {expanded && (
        <View style={styles.expandedBlock}>
          <DetailRow icon="navigate-outline" label="How to get there" value={transport} />
          <DetailRow icon="sunny-outline"    label="Best time to visit" value={bestTime} />
          <DetailRow icon="bulb-outline"     label="Itinerary tip"      value={tip} />
        </View>
      )}

      {/* Add to trip button */}
      <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(place)}>
        <Ionicons name="add-circle-outline" size={s(16)} color={Colors.white} />
        <Text style={styles.addBtnText}>Add to Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={s(14)} color={Colors.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PlaceDiscoveryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const trip   = route?.params?.trip;
  const destinationOverride   = route?.params?.destinationOverride || '';
  const effectiveDestination  = destinationOverride || trip?.destination || '';
  const destKey               = matchDestination(effectiveDestination);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [savedIds,     setSavedIds]     = useState(new Set());
  const [addTarget,    setAddTarget]    = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cachedPlaces, setCachedPlaces] = useState([]);
  const [loadingCache, setLoadingCache] = useState(true);

  useEffect(() => {
    setLoadingCache(true);
    // Try raw destination first (exact DB key), fall back to normalized destKey
    const primaryLookup   = effectiveDestination;
    const fallbackLookup  = destKey && destKey !== effectiveDestination ? destKey : null;

    if (!primaryLookup && !fallbackLookup) { setLoadingCache(false); return; }

    getCachedPlaces(primaryLookup || fallbackLookup)
      .then(rows => {
        if (rows.length > 0) { setCachedPlaces(rows); setLoadingCache(false); return; }
        if (fallbackLookup) {
          return getCachedPlaces(fallbackLookup).then(r => { setCachedPlaces(r); setLoadingCache(false); });
        }
        setLoadingCache(false);
      })
      .catch(() => setLoadingCache(false));
  }, [destKey, effectiveDestination]);

  const places = useMemo(() => {
    const staticPlaces = destKey ? (PLACES_BY_DESTINATION[destKey] || []) : [];
    if (cachedPlaces.length === 0) return staticPlaces;
    const map = new Map(staticPlaces.map(p => [p.id, p]));
    cachedPlaces.forEach(p => { if (!map.has(p.id)) map.set(p.id, p); });
    return Array.from(map.values());
  }, [destKey, cachedPlaces]);

  const filtered = useMemo(() => {
    let list = [...places].sort(
      (a, b) => Number(b.mustVisit) - Number(a.mustVisit) || a.name.localeCompare(b.name)
    );
    if (activeFilter !== 'all') list = list.filter(p => p.category === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [places, activeFilter, search]);

  const handleSave = async (place) => {
    if (savedIds.has(place.id)) return;
    await addSavedLocation({
      name:      place.name,
      region:    destKey || effectiveDestination || '',
      latitude:  place.coordinates[1],
      longitude: place.coordinates[0],
    });
    setSavedIds(prev => new Set([...prev, place.id]));
    Alert.alert('Saved!', `${place.name} added to your saved places.`);
  };

  const handleAddPress = (place) => {
    setAddTarget(place);
    setShowAddModal(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {destKey ? `Explore ${destKey}` : `Explore ${effectiveDestination || 'Places'}`}
        </Text>
        <View style={{ width: s(36) }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={s(16)} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search places…"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={s(16)} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterBar}>
        {PLACE_CATEGORIES.map(cat => {
          const isActive = activeFilter === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat.key)}>
              <Text style={styles.filterEmoji}>{cat.emoji}</Text>
              <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled">

        {loadingCache && places.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptySub}>Loading places…</Text>
          </View>
        ) : places.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyTitle}>No places found</Text>
            <Text style={styles.emptySub}>
              We don't have data for "{effectiveDestination}" yet.{'\n'}
              Try Baguio, Sagada, Vigan, Siargao, El Nido, or Cebu.
            </Text>
          </View>
        ) : (
          <>
            <DestinationHero
              destKey={destKey}
              effectiveDestination={effectiveDestination}
              places={places}
            />

            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>
                {filtered.length} {filtered.length === 1 ? 'place' : 'places'}
              </Text>
              {activeFilter !== 'all' && (
                <TouchableOpacity onPress={() => setActiveFilter('all')}>
                  <Text style={styles.clearFilter}>Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>

            {filtered.length === 0 ? (
              <View style={styles.emptyStateSmall}>
                <Text style={{ fontSize: s(36) }}>🔍</Text>
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptySub}>Try a different search or filter.</Text>
              </View>
            ) : (
              filtered.map(place => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  savedIds={savedIds}
                  onAdd={handleAddPress}
                  onSave={handleSave}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <AddToTripModal
        visible={showAddModal}
        place={addTarget}
        trip={trip}
        onClose={() => { setShowAddModal(false); setAddTarget(null); }}
        onDone={() => {}}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bgLight },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: s(16), paddingBottom: s(14),
  },
  headerBtn:   { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: s(17), fontFamily: Fonts.bold, color: Colors.white },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.white,
    marginHorizontal: s(16), marginTop: s(12), marginBottom: s(4),
    borderRadius: s(12), paddingHorizontal: s(12), paddingVertical: s(10),
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchInput: {
    flex: 1, fontSize: s(14), fontFamily: Fonts.regular,
    color: Colors.textPrimary, paddingVertical: 0,
  },

  // Filter chips
  filterBar: { maxHeight: s(48), flexShrink: 0 },
  filterRow: {
    paddingHorizontal: s(16), paddingVertical: s(8),
    gap: s(6), alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    paddingHorizontal: s(12), paddingVertical: s(6),
    backgroundColor: Colors.white, borderRadius: s(20),
    borderWidth: 1.5, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterEmoji:      { fontSize: s(12) },
  filterLabel:      { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.textSecondary },
  filterLabelActive:{ color: Colors.white },

  // List
  listContent: { padding: s(16), paddingTop: s(12), gap: s(10), paddingBottom: s(40) },

  // Hero banner
  heroBanner: {
    borderRadius: s(20), overflow: 'hidden',
    padding: s(24), paddingBottom: s(20),
    marginBottom: s(4),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.15, shadowRadius: s(12), elevation: 5,
  },
  heroCircle1: {
    position: 'absolute', width: s(160), height: s(160),
    borderRadius: s(80), backgroundColor: 'rgba(255,255,255,0.06)',
    top: -s(40), right: -s(40),
  },
  heroCircle2: {
    position: 'absolute', width: s(100), height: s(100),
    borderRadius: s(50), backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -s(20), left: s(20),
  },
  heroInner:   { alignItems: 'center', gap: s(6) },
  heroEmoji:   { fontSize: s(56), lineHeight: s(64) },
  heroName: {
    fontSize: s(26), fontFamily: Fonts.bold, color: Colors.white,
    textAlign: 'center', marginTop: s(4),
  },
  heroStats: {
    fontSize: s(13), fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.8)', textAlign: 'center',
  },
  heroCatRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: s(6), marginTop: s(10),
  },
  heroCatChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: s(20), paddingHorizontal: s(10), paddingVertical: s(4),
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  heroCatEmoji: { fontSize: s(11) },
  heroCatText:  { fontSize: s(11), fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.9)' },

  // Result row
  resultRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: s(2),
  },
  resultCount:  { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary },
  clearFilter:  { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.primary },

  // Place card
  card: {
    backgroundColor: Colors.white,
    borderRadius: s(16),
    padding: s(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.06, shadowRadius: s(8), elevation: 2,
    borderWidth: 1, borderColor: Colors.border,
    gap: s(10),
  },

  // Card header
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: s(12) },
  catIcon: {
    width: s(44), height: s(44), borderRadius: s(12),
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  catIconEmoji:   { fontSize: s(22) },
  cardHeaderText: { flex: 1, gap: s(3) },
  cardName: {
    fontSize: s(15), fontFamily: Fonts.bold,
    color: Colors.textPrimary, lineHeight: s(20),
  },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: s(3), marginBottom: s(2) },
  locationText:   { fontSize: s(10), fontFamily: Fonts.regular, color: Colors.textTertiary, flex: 1 },
  cardMetaRow:    { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: s(4) },
  cardMetaLabel:  { fontSize: s(11), fontFamily: Fonts.bold },
  cardMetaDot:    { fontSize: s(11), color: Colors.textTertiary },
  cardMetaValue:  { fontSize: s(11), fontFamily: Fonts.medium, color: Colors.textSecondary },

  // Save button
  saveBtn: {
    width: s(32), height: s(32), borderRadius: s(10),
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
    borderWidth: 1, borderColor: Colors.primary + '30',
    flexShrink: 0,
  },
  saveBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  // Must visit
  mustVisitRow: { marginTop: -s(2) },
  mustVisitBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: s(8), paddingHorizontal: s(10), paddingVertical: s(4),
    borderWidth: 1, borderColor: '#FCD34D',
  },
  mustVisitText: { fontSize: s(11), fontFamily: Fonts.bold, color: '#92400E' },

  // Description
  cardDesc: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, lineHeight: s(19),
  },

  // Travel chips
  travelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6) },
  travelChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: Colors.bgLight, borderRadius: s(8),
    paddingHorizontal: s(8), paddingVertical: s(4),
    borderWidth: 1, borderColor: Colors.border,
  },
  travelEmoji: { fontSize: s(11) },
  travelTime:  { fontSize: s(11), fontFamily: Fonts.medium, color: Colors.textSecondary },

  // Divider
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: s(2) },

  // Expand toggle
  expandRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandLabel: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.primary },

  // Expanded details
  expandedBlock: {
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    padding: s(12), gap: s(10),
    borderWidth: 1, borderColor: Colors.border,
  },
  detailRow:     { flexDirection: 'row', gap: s(10), alignItems: 'flex-start' },
  detailIconWrap:{
    width: s(26), height: s(26), borderRadius: s(8),
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  detailContent: { flex: 1, gap: s(2) },
  detailLabel: {
    fontSize: s(10), fontFamily: Fonts.bold,
    color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: s(12), fontFamily: Fonts.regular,
    color: Colors.textSecondary, lineHeight: s(17),
  },

  // Add to trip
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(6),
    backgroundColor: Colors.primary, borderRadius: s(12),
    paddingVertical: s(12),
  },
  addBtnText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.white },

  // Empty states
  emptyState: {
    alignItems: 'center', gap: s(12),
    paddingHorizontal: s(32), paddingTop: s(80), paddingBottom: s(40),
  },
  emptyStateSmall: {
    alignItems: 'center', gap: s(10),
    backgroundColor: Colors.white, borderRadius: s(16),
    padding: s(24), borderWidth: 1, borderColor: Colors.border,
  },
  emptyEmoji: { fontSize: s(52) },
  emptyTitle: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary },
  emptySub: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: s(19),
  },

  // Modal
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  modalHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(20),
  },
  modalTitle:    { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: s(4) },
  modalPlace:    { fontSize: s(14), fontFamily: Fonts.medium, color: Colors.primary, marginBottom: s(20) },
  fieldLabel:    { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(8) },
  dayChip: {
    paddingHorizontal: s(16), paddingVertical: s(8),
    borderRadius: s(20), backgroundColor: Colors.bgLight,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText:   { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.white },
  timeRow:       { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(20) },
  timeInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary,
    textAlign: 'center', width: s(64),
  },
  timeColon:     { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  periodToggle: {
    flexDirection: 'row', borderRadius: s(12), overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, marginLeft: s(4),
  },
  periodBtn:      { paddingHorizontal: s(14), paddingVertical: s(12), backgroundColor: Colors.white },
  periodBtnActive:{ backgroundColor: Colors.primary },
  periodText:     { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textSecondary },
  periodTextActive:{ color: Colors.white },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center', marginTop: s(4),
  },
  confirmBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },

  // Trip picker (step 1)
  noTripsBox: {
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    padding: s(16), borderWidth: 1, borderColor: Colors.border,
    marginBottom: s(16), alignItems: 'center',
  },
  noTripsText: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: s(19),
  },
  tripRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    backgroundColor: Colors.bgLight, borderRadius: s(14),
    paddingHorizontal: s(14), paddingVertical: s(12),
    borderWidth: 1, borderColor: Colors.border,
  },
  tripRowEmoji: { fontSize: s(22) },
  tripRowName: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary },
  tripRowSub:  { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(1) },

  // Step 2 header with back button
  modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: s(10), marginBottom: s(0) },
  backBtn: {
    width: s(34), height: s(34), borderRadius: s(10),
    backgroundColor: Colors.bgLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border, marginTop: s(2), flexShrink: 0,
  },

  // Selected trip badge
  selectedTripBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.primaryBg, borderRadius: s(10),
    paddingHorizontal: s(12), paddingVertical: s(8),
    borderWidth: 1, borderColor: Colors.primary + '30',
    marginBottom: s(16),
  },
  selectedTripEmoji: { fontSize: s(16) },
  selectedTripName: {
    flex: 1, fontSize: s(13), fontFamily: Fonts.bold, color: Colors.primary,
  },
});
