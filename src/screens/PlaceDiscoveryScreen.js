import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Dimensions, Alert, Modal,
  Platform, Keyboard, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  PLACE_CATEGORIES, TRAVEL_MODE_META, CATEGORY_TO_ACTIVITY,
  PLACES_BY_DESTINATION, matchDestination,
} from '../data/placesData';
import { addTripActivity, addSavedLocation } from '../database/db';
import CachedImage from '../components/CachedImage';
import { PLACE_IMAGES } from '../data/placeImages';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);


function getVisitLength(place) {
  if (place.visitLength) return place.visitLength;
  switch (place.category) {
    case 'food':
      return '30 to 90 min stop';
    case 'shopping':
      return '45 to 90 min';
    case 'landmark':
      return '45 to 120 min';
    case 'activity':
      return place.mustVisit ? '2 to 4 hrs' : '1 to 3 hrs';
    case 'beach':
      return place.mustVisit ? 'Half day to full day' : '2 to 4 hrs';
    case 'nature':
      return place.mustVisit ? '2 to 4 hrs' : '1 to 2 hrs';
    default:
      return 'About 1 to 2 hrs';
  }
}

function getBestTimeToVisit(place) {
  if (place.bestTimeToVisit) return place.bestTimeToVisit;

  const text = `${place.name} ${place.description}`.toLowerCase();
  if (/sunset|viewpoint|overlook/.test(text)) return 'Late afternoon to sunset';
  if (/market|night market/.test(text)) return 'Late afternoon to evening';
  if (/beach|lagoon|island|reef|snorkel|swim|falls|spring/.test(text)) return 'Morning to early afternoon';
  if (/hike|trail|terraces|cave|mount/.test(text)) return 'Early morning';
  return 'Morning or late afternoon';
}

function getPlanningNote(place) {
  if (place.itineraryTip) return place.itineraryTip;
  const text = `${place.name} ${place.description}`.toLowerCase();
  const travel = place?.travel || {};
  const hasBoat = !!travel.ferry;
  const hasWalk = !!travel.walk;
  const hasVan = !!travel.van;
  const hasTricycle = !!travel.tricycle;
  const isSunsetSpot = /sunset|viewpoint|overlook/.test(text);
  const isMarketOrTown = /market|town proper|street food|shops|shopping/.test(text);
  const isWaterSpot = /lagoon|lake|beach|island|snorkel|reef|swim|falls|spring/.test(text);
  const isHikeSpot = /hike|trail|steps|cliff|terraces|cave|mount/.test(text);
  const isCulturalSpot = /museum|church|shrine|history|heritage|cathedral|park/.test(text);

  if (place.category === 'food') {
    return place.entranceFee > 0
      ? 'Good as a planned food stop after a paid activity nearby.'
      : 'Best as a meal stop between bigger activities or before heading back.';
  }

  if (isSunsetSpot) {
    return 'Place this late in the day so you can end the itinerary with the best light and views.';
  }

  if (hasBoat && isWaterSpot && place.mustVisit) {
    return 'Make this one of your main anchors for the day since boat-based stops usually shape the whole schedule.';
  }

  if (hasBoat && isWaterSpot) {
    return 'Pair this with other water stops on the same side of the destination to avoid wasting transfer time.';
  }

  if (isHikeSpot && hasWalk) {
    return 'Schedule this while energy is high and keep the next stop lighter so the day still feels balanced.';
  }

  if (isMarketOrTown) {
    return 'Great near the start or end of the day for food, supplies, or an easy flexible stop.';
  }

  if (isCulturalSpot && place.entranceFee > 0) {
    return 'Works well as a focused mid-day stop between outdoor activities and meal breaks.';
  }

  if (place.category === 'shopping') {
    return 'Best near the end of the day or before your trip back so you are not carrying extra items around.';
  }

  if (place.mustVisit && hasVan) {
    return 'Anchor this into the day early since longer land transfers can affect the timing of everything after it.';
  }

  if (place.mustVisit && hasTricycle) {
    return 'Easy to build around as one of your key highlights, then fill the day with nearby lighter stops.';
  }

  if (place.category === 'beach' || place.category === 'nature') {
    return 'Best paired with one food stop and one lighter activity nearby so the day does not feel too packed.';
  }

  if (place.mustVisit) {
    return 'Use this as one of the day’s core highlights and build the rest of the itinerary around it.';
  }

  return 'Works well as a flexible stop around your main highlights or as a backup if time opens up.';
}

function getTransportSummary(place) {
  if (place.howToGetThere) return place.howToGetThere;
  const options = Object.entries(place?.travel || {}).filter(([, value]) => value);
  if (options.length === 0) return 'Ask locally for the most practical ride from town proper.';
  const summary = options
    .slice(0, 2)
    .map(([mode, time]) => `${TRAVEL_MODE_META[mode]?.label || mode} in about ${time}`)
    .join(' or ');
  return `Usually reached by ${summary}.`;
}

// ── Add to Trip Modal ────────────────────────────────────────────────────────

function AddToTripModal({ visible, place, trip, destKey, onClose, onDone }) {
  const insets = useSafeAreaInsets();
  const [selectedDay, setSelectedDay] = useState(1);
  const [hour, setHour]     = useState('');
  const [minute, setMinute] = useState('');
  const [period, setPeriod] = useState('AM');
  const [saving, setSaving] = useState(false);
  const [kbHeight, setKbHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const days = trip?.days || 1;
  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1);

  const reset = () => {
    setSelectedDay(1); setHour(''); setMinute(''); setPeriod('AM');
  };

  const handleAdd = async () => {
    if (!hour.trim()) { Alert.alert('Missing', 'Please enter the hour.'); return; }
    setSaving(true);
    const time = `${hour.padStart(2,'0')}:${(minute||'00').padStart(2,'0')} ${period}`;
    await addTripActivity({
      tripId:   trip.id,
      day:      selectedDay,
      time,
      title:    place.name,
      subtitle: place.description.split(' — ')[0],
      category: CATEGORY_TO_ACTIVITY[place.category] || 'activity',
      cost:     0,
    });
    setSaving(false);
    reset();
    onDone();
    onClose();
    Alert.alert('Added!', `${place.name} added to Day ${selectedDay}. ✓`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { reset(); onClose(); }}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { reset(); onClose(); }} />
        <View style={[styles.modalSheet, {
          paddingBottom: kbHeight > 0 ? s(32) : insets.bottom + s(16),
          marginBottom: kbHeight > 0 ? kbHeight + s(12) : 0,
        }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Add to Itinerary</Text>
          <Text style={styles.modalPlace}>{place?.name}</Text>

          <Text style={styles.fieldLabel}>Which day?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: s(8), marginBottom: s(16) }}>
            {dayNumbers.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
                onPress={() => setSelectedDay(d)}
              >
                <Text style={[styles.dayChipText, selectedDay === d && styles.dayChipTextActive]}>Day {d}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>What time?</Text>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={hour}
              onChangeText={v => setHour(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="08"
              placeholderTextColor={Colors.grayMedium}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={styles.timeColon}>:</Text>
            <TextInput
              style={styles.timeInput}
              value={minute}
              onChangeText={v => setMinute(v.replace(/[^0-9]/g, '').slice(0, 2))}
              placeholder="00"
              placeholderTextColor={Colors.grayMedium}
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.periodToggle}>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                onPress={() => setPeriod('AM')}
              >
                <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                onPress={() => setPeriod('PM')}
              >
                <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>


          <TouchableOpacity
            style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
            onPress={handleAdd}
            disabled={saving}
          >
            <Text style={styles.confirmBtnText}>{saving ? 'Adding...' : 'Add to Trip'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Place Card ───────────────────────────────────────────────────────────────

function PlaceCard({ place, savedIds, onAdd, onSave }) {
  const isSaved = savedIds.has(place.id);
  const travelModes = Object.entries(place.travel).filter(([, v]) => v !== null);
  const visitLength = getVisitLength(place);
  const bestTimeToVisit = getBestTimeToVisit(place);
  const planningNote = getPlanningNote(place);
  const transportSummary = getTransportSummary(place);
  const [showDetails, setShowDetails] = useState(false);

  const hasImage = PLACE_IMAGES[place.id] || place.image;

  return (
    <View style={styles.placeCard}>
      {hasImage && (
        <CachedImage
          placeId={place.id}
          uri={place.image}
          style={styles.placeCardImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.placeCardHeader}>
        <View style={styles.placeTitleWrap}>
          <Text style={styles.placeName}>{place.name}</Text>
          {place.mustVisit && (
            <View style={styles.mustVisitBadgeInline}>
              <Text style={styles.mustVisitTextInline}>Must-visit</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[styles.saveIconBtn, isSaved && styles.saveIconBtnActive]}
          onPress={() => onSave(place)}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={s(14)}
            color={isSaved ? Colors.white : Colors.primary}
          />
          <Text style={[styles.saveIconBtnText, isSaved && styles.saveIconBtnTextActive]}>
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.placeInfo}>
        <Text style={styles.placeDesc}>{place.description}</Text>

        <View style={styles.travelRow}>
          <View style={place.entranceFee > 0 ? styles.feeBadge : styles.freeBadge}>
            <Text style={place.entranceFee > 0 ? styles.feeText : styles.freeText}>
              {place.entranceFee > 0 ? `Entrance: PHP ${place.entranceFee}` : 'Free entry'}
            </Text>
          </View>
          <View style={styles.infoBadge}>
            <Ionicons name="time-outline" size={s(12)} color={Colors.primary} />
            <Text style={styles.infoBadgeText}>{visitLength}</Text>
          </View>
          {travelModes.length > 0 ? (
            travelModes.slice(0, 3).map(([mode, time]) => {
              const meta = TRAVEL_MODE_META[mode];
              if (!meta) return null;
              return (
                <View key={mode} style={styles.travelChip}>
                  <Text style={styles.travelEmoji}>{meta.emoji}</Text>
                  <Text style={styles.travelTime}>{`${time} ${meta.label.toLowerCase()}`}</Text>
                </View>
              );
            })
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.detailsToggle}
          onPress={() => setShowDetails((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={styles.detailsToggleText}>
            {showDetails ? 'Hide details' : 'More details'}
          </Text>
          <Ionicons
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={s(14)}
            color={Colors.primary}
          />
        </TouchableOpacity>

        {showDetails ? (
          <>
            <View style={styles.planSection}>
              <Text style={styles.planSectionTitle}>How to get there</Text>
              <Text style={styles.planSectionText}>{transportSummary}</Text>
            </View>

            <View style={styles.planSection}>
              <Text style={styles.planSectionTitle}>Best time to visit</Text>
              <Text style={styles.planSectionText}>{bestTimeToVisit}</Text>
            </View>

            <View style={styles.planSection}>
              <Text style={styles.planSectionTitle}>Itinerary tip</Text>
              <Text style={styles.planSectionText}>{planningNote}</Text>
            </View>
          </>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addPrimaryBtn} onPress={() => onAdd(place)}>
            <Ionicons name="add" size={s(16)} color={Colors.white} />
            <Text style={styles.addPrimaryBtnText}>Add to Trip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function DestinationHero({ destKey, effectiveDestination, places }) {
  const mustVisitCount = places.filter((place) => place.mustVisit).length;
  const heroPlace = places.find(p => p.mustVisit) || places[0];
  const hasImage  = heroPlace && (PLACE_IMAGES[heroPlace.id] || heroPlace.image);

  return (
    <View style={styles.heroCard}>
      {hasImage ? (
        <CachedImage
          placeId={heroPlace.id}
          uri={heroPlace.image}
          style={styles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroImage, styles.heroFallback]}>
          <Ionicons name="sparkles-outline" size={s(32)} color={Colors.primary} />
        </View>
      )}
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>Explore {destKey || effectiveDestination}</Text>
        <Text style={styles.heroTitle}>{destKey || effectiveDestination}</Text>
        <Text style={styles.heroMeta}>{`${places.length} places • ${mustVisitCount} must-visit`}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function PlaceDiscoveryScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const trip   = route?.params?.trip;
  const destinationOverride = route?.params?.destinationOverride || '';
  const effectiveDestination = destinationOverride || trip?.destination || '';

  const destKey = matchDestination(effectiveDestination);
  const places  = destKey ? (PLACES_BY_DESTINATION[destKey] || []) : [];
  const canAddToTrip = !!trip?.id;

  const [search,          setSearch]          = useState('');
  const [activeFilter,    setActiveFilter]    = useState('all');
  const [savedIds,        setSavedIds]        = useState(new Set());
  const [addTarget,       setAddTarget]       = useState(null);
  const [showAddModal,    setShowAddModal]    = useState(false);

  const filtered = useMemo(() => {
    let list = [...places].sort((a, b) => Number(b.mustVisit) - Number(a.mustVisit) || a.name.localeCompare(b.name));
    if (activeFilter !== 'all') list = list.filter(p => p.category === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
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
    if (!canAddToTrip) {
      navigation.navigate('CreateTrip', {
        initialDestination: effectiveDestination,
        initialName: `${effectiveDestination} Adventure`,
      });
      return;
    }
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
        {canAddToTrip ? (
          <View style={{ width: s(36) }} />
        ) : (
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateTrip', {
              initialDestination: effectiveDestination,
              initialName: `${effectiveDestination} Adventure`,
            })}
            style={styles.headerActionBtn}
          >
            <Ionicons name="add" size={s(20)} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {!canAddToTrip && effectiveDestination ? (
        <View style={styles.exploreBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.exploreBannerTitle}>Explore {destKey || effectiveDestination}</Text>
            <Text style={styles.exploreBannerSub}>
              Browse must-visit places, local food spots, and activity ideas before you build your itinerary.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.exploreBannerBtn}
            onPress={() => navigation.navigate('CreateTrip', {
              initialDestination: effectiveDestination,
              initialName: `${effectiveDestination} Adventure`,
            })}
          >
            <Text style={styles.exploreBannerBtnText}>Set Trip</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Search bar */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={s(18)} color={Colors.grayMedium} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search places..."
          placeholderTextColor={Colors.grayMedium}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={s(18)} color={Colors.grayMedium} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterBar}
      >
        {PLACE_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterChip, activeFilter === cat.key && styles.filterChipActive]}
            onPress={() => setActiveFilter(cat.key)}
          >
            <Text style={styles.filterEmoji}>{cat.emoji}</Text>
            <Text
              numberOfLines={1}
              style={[styles.filterLabel, activeFilter === cat.key && styles.filterLabelActive]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        style={{ flex: 1 }}
      >
        {places.length === 0 ? (
          <View style={styles.noDestState}>
            <Text style={{ fontSize: s(52) }}>🗺️</Text>
            <Text style={styles.noDestTitle}>No places found</Text>
            <Text style={styles.noDestSub}>
              We don't have data for "{effectiveDestination}" yet.{'\n'}Try Coron, El Nido, Siargao, Bohol, Baguio, Vigan, Sagada, or Banaue.
            </Text>
          </View>
        ) : (
          <>
            <DestinationHero
              destKey={destKey}
              effectiveDestination={effectiveDestination}
              places={places}
            />
            <Text style={styles.resultCount}>{filtered.length} places in {destKey || effectiveDestination}</Text>
            {filtered.length === 0 ? (
              <View style={styles.noDestStateCompact}>
                <Text style={{ fontSize: s(40) }}>🔍</Text>
                <Text style={styles.noDestTitle}>No results</Text>
                <Text style={styles.noDestSub}>Try a different search or filter.</Text>
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

      {canAddToTrip ? (
        <AddToTripModal
          visible={showAddModal}
          place={addTarget}
          trip={trip}
          destKey={destKey}
          onClose={() => { setShowAddModal(false); setAddTarget(null); }}
          onDone={() => {}}
        />
      ) : null}
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: s(17), fontFamily: Fonts.bold, color: Colors.white },
  headerActionBtn: {
    width: s(36), height: s(36),
    alignItems: 'center', justifyContent: 'center',
  },

  exploreBanner: {
    marginHorizontal: s(16),
    marginTop: s(14),
    backgroundColor: Colors.white,
    borderRadius: s(16),
    padding: s(14),
    borderWidth: 1.5,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  exploreBannerTitle: {
    fontSize: s(14),
    fontFamily: Fonts.bold,
    color: Colors.textPrimary,
  },
  exploreBannerSub: {
    marginTop: s(4),
    fontSize: s(12),
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: s(18),
  },
  exploreBannerBtn: {
    backgroundColor: Colors.primary,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
  },
  exploreBannerBtnText: {
    fontSize: s(12),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.white, marginHorizontal: s(16), marginTop: s(12),
    borderRadius: s(12), paddingHorizontal: s(12), paddingVertical: s(8),
    borderWidth: 1.5, borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: s(14),
    fontFamily: Fonts.regular,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },

  filterBar: {
    maxHeight: s(44),
    marginTop: s(4),
    marginBottom: 0,
    flexShrink: 0,
  },
  filterRow: {
    paddingHorizontal: s(16),
    paddingVertical: 0,
    gap: s(6),
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(3),
    minHeight: s(32),
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    backgroundColor: Colors.white,
    borderRadius: s(16),
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterEmoji: {
    fontSize: s(12),
    lineHeight: s(12),
  },
  filterLabel: {
    flexShrink: 0,
    fontSize: s(11),
    lineHeight: s(12),
    fontFamily: Fonts.bold,
    color: Colors.textSecondary,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  filterLabelActive: { color: Colors.white },

  list: { padding: s(16), paddingTop: s(12), gap: s(12) },
  resultCount: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary },

  heroCard: {
    position: 'relative',
    borderRadius: s(18),
    overflow: 'hidden',
    minHeight: s(184),
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(3) },
    shadowOpacity: 0.08,
    shadowRadius: s(10),
    elevation: 4,
  },
  heroImage: {
    width: '100%',
    height: s(184),
  },
  heroFallback: {
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  heroContent: {
    position: 'absolute',
    left: s(16),
    right: s(16),
    bottom: s(16),
  },
  heroEyebrow: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: 'rgba(255,255,255,0.82)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    marginTop: s(6),
    fontSize: s(24),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  heroMeta: {
    marginTop: s(4),
    fontSize: s(12),
    fontFamily: Fonts.medium,
    color: 'rgba(255,255,255,0.9)',
  },

  // Place card
  placeCard: {
    backgroundColor: Colors.white, borderRadius: s(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.07, shadowRadius: s(8), elevation: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  placeCardImage: {
    width: '100%',
    height: s(160),
  },
  placeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: s(10),
    paddingHorizontal: s(14),
    paddingTop: s(14),
  },
  placeTitleWrap: {
    flex: 1,
    gap: s(8),
  },
  mustVisitBadgeInline: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF2E3',
    borderRadius: s(999),
    paddingHorizontal: s(10),
    paddingVertical: s(4),
  },
  mustVisitTextInline: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: '#A85A11',
  },
  saveIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: Colors.white,
    borderWidth: 1.25,
    borderColor: Colors.primary,
    borderRadius: s(999),
    paddingHorizontal: s(10),
    paddingVertical: s(7),
  },
  saveIconBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  saveIconBtnText: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },
  saveIconBtnTextActive: { color: Colors.white },

  placeInfo: { padding: s(14), paddingTop: s(10) },
  placeName: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textPrimary },
  placeDesc: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: s(18) },

  travelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: s(6), marginTop: s(10) },
  travelChip: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: Colors.bgLight, borderRadius: s(8),
    paddingHorizontal: s(8), paddingVertical: s(4),
    borderWidth: 1, borderColor: Colors.border,
  },
  travelEmoji: { fontSize: s(12) },
  travelTime: { fontSize: s(11), fontFamily: Fonts.medium, color: Colors.textSecondary },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    backgroundColor: Colors.primaryBg,
    borderRadius: s(8),
    paddingHorizontal: s(8),
    paddingVertical: s(4),
    borderWidth: 1,
    borderColor: Colors.primary + '35',
  },
  infoBadgeText: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.primary },
  freeBadge: {
    backgroundColor: '#E8FFF3', borderRadius: s(8),
    paddingHorizontal: s(8), paddingVertical: s(4),
    borderWidth: 1, borderColor: '#10B981',
  },
  freeText: { fontSize: s(11), fontFamily: Fonts.bold, color: '#10B981' },
  feeBadge: {
    backgroundColor: Colors.primaryBg, borderRadius: s(8),
    paddingHorizontal: s(8), paddingVertical: s(4),
    borderWidth: 1, borderColor: Colors.primary,
  },
  feeText: { fontSize: s(11), fontFamily: Fonts.bold, color: Colors.primary },
  detailsToggle: {
    marginTop: s(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryBg,
    borderRadius: s(10),
    paddingHorizontal: s(12),
    paddingVertical: s(10),
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  detailsToggleText: {
    fontSize: s(12),
    fontFamily: Fonts.bold,
    color: Colors.primary,
  },

  planSection: {
    marginTop: s(10),
    backgroundColor: '#FFF8F3',
    borderRadius: s(12),
    padding: s(10),
    borderWidth: 1,
    borderColor: '#F4D7BE',
  },
  planSectionTitle: {
    fontSize: s(11),
    fontFamily: Fonts.bold,
    color: '#A85A11',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  planSectionText: {
    marginTop: s(4),
    fontSize: s(12),
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    lineHeight: s(17),
  },

  actionRow: { marginTop: s(12) },
  addPrimaryBtn: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(4),
    backgroundColor: Colors.primary,
    borderRadius: s(12),
    paddingHorizontal: s(14),
    paddingVertical: s(12),
  },
  addPrimaryBtnText: {
    fontSize: s(13),
    fontFamily: Fonts.bold,
    color: Colors.white,
  },

  // No destination state
  noDestState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(12),
    paddingHorizontal: s(32),
    paddingTop: s(72),
    paddingBottom: s(40),
  },
  noDestStateCompact: {
    backgroundColor: Colors.white,
    borderRadius: s(16),
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.05,
    shadowRadius: s(8),
    elevation: 2,
    alignItems: 'center',
    gap: s(12),
    paddingHorizontal: s(20),
    paddingVertical: s(24),
  },
  noDestTitle: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  noDestSub: { fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: s(20) },

  // Modal
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: s(24), borderTopRightRadius: s(24),
    padding: s(24), paddingTop: s(12),
  },
  modalHandle: {
    width: s(40), height: s(4), borderRadius: s(2),
    backgroundColor: Colors.grayMedium, alignSelf: 'center', marginBottom: s(20),
  },
  modalTitle: { fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary },
  modalPlace: { fontSize: s(14), fontFamily: Fonts.medium, color: Colors.primary, marginBottom: s(16) },
  fieldLabel: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, marginBottom: s(8) },
  dayChip: {
    paddingHorizontal: s(16), paddingVertical: s(8), borderRadius: s(20),
    backgroundColor: Colors.grayLight, borderWidth: 1.5, borderColor: Colors.border,
  },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipText: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.white },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: s(8), marginBottom: s(16) },
  timeInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(12),
    fontSize: s(18), fontFamily: Fonts.bold, color: Colors.textPrimary,
    textAlign: 'center', width: s(64),
  },
  timeColon: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  periodToggle: {
    flexDirection: 'row', borderRadius: s(12), overflow: 'hidden',
    borderWidth: 1.5, borderColor: Colors.border, marginLeft: s(4),
  },
  periodBtn: { paddingHorizontal: s(14), paddingVertical: s(12), backgroundColor: Colors.white },
  periodBtnActive: { backgroundColor: Colors.primary },
  periodText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textSecondary },
  periodTextActive: { color: Colors.white },
  feeNote: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.primaryBg, borderRadius: s(10),
    padding: s(10), marginBottom: s(16),
  },
  feeNoteText: { flex: 1, fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(14), alignItems: 'center',
  },
  confirmBtnText: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.white },
});
