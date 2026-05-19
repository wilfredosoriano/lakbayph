import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, ImageBackground, Image,
  Modal, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getTrips, getBudgetSummary, getAllTripActivities, getSetting } from '../database/db';
import { PLACES_BY_DESTINATION, matchDestination } from '../data/placesData';
import CachedImage from '../components/CachedImage';


const { width, height } = Dimensions.get('window');
const scale = width / 390;
const s = (size) => Math.round(size * scale);

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseTripStartDate(datesStr) {
  if (!datesStr) return null;
  // For ranges like "May 17 – May 18, 2026", parse only the first date.
  const normalized = datesStr.replace(/\s+[–-]\s+.*$/, '');
  const yearMatch = datesStr.match(/(\d{4})/);
  const match = `${normalized}, ${yearMatch?.[1] ?? ''}`.match(/([a-z]+)\s+(\d+),?\s*(\d{4})/i);
  if (match) {
    const month = MONTH_MAP[match[1].toLowerCase().slice(0, 3)];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    if (month !== undefined && day && year) return new Date(year, month, day);
  }
  return null;
}

function getDaysLeft(datesStr) {
  const start = parseTripStartDate(datesStr);
  if (!start) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  return Math.ceil((start - today) / (1000 * 60 * 60 * 24));
}

function getDestImg() {
  return null;
}

// ── Notification helpers ──────────────────────────────────────────────────────

function buildNotifications(trips, budgets, prefs = {}) {
  const notes = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!trips || trips.length === 0) {
    notes.push({
      id: 'no-trip',
      icon: 'calendar-outline',
      color: '#6366f1',
      title: 'No trips planned yet',
      body: 'Start planning your next Philippine adventure!',
    });
    return notes;
  }

  for (const t of trips) {
    const start = parseTripStartDate(t.dates);
    if (!start) continue;
    const startDay = new Date(start); startDay.setHours(0,0,0,0);
    const diff = Math.ceil((startDay - today) / 86400000);

    if (prefs.trip !== false) {
      if (diff === 0) {
        notes.push({
          id: `trip-now-${t.id}`,
          icon: 'airplane',
          color: Colors.primary,
          title: `${t.name} is today! 🎉`,
          body: `Your trip to ${t.destination} starts today. Have a safe journey!`,
        });
      } else if (diff > 0 && diff <= 7) {
        notes.push({
          id: `trip-soon-${t.id}`,
          icon: 'time-outline',
          color: '#f59e0b',
          title: `${t.name} in ${diff} day${diff > 1 ? 's' : ''}`,
          body: `Get ready for ${t.destination}. Check your itinerary!`,
        });
      } else if (diff > 7 && diff <= 30) {
        notes.push({
          id: `trip-coming-${t.id}`,
          icon: 'calendar-outline',
          color: '#6366f1',
          title: `${t.name} coming up`,
          body: `${diff} days until ${t.destination}. Start shaping your itinerary and booking essentials.`,
        });
      }
    }

    if (prefs.budget !== false) {
      const b = budgets?.[String(t.id)];
      if (b && b.total > 0) {
        const pct = Math.round((b.spent / b.total) * 100);
        if (pct >= 100) {
          notes.push({
            id: `budget-over-${t.id}`,
            icon: 'wallet-outline',
            color: '#ef4444',
            title: `Budget exceeded — ${t.name}`,
            body: `You've spent ₱${b.spent.toLocaleString()} of ₱${b.total.toLocaleString()}. Consider adjusting.`,
          });
        } else if (pct >= 80) {
          notes.push({
            id: `budget-warn-${t.id}`,
            icon: 'wallet-outline',
            color: '#f59e0b',
            title: `Budget at ${pct}% — ${t.name}`,
            body: `₱${(b.total - b.spent).toLocaleString()} remaining. Spend wisely!`,
          });
        }
      }
    }
  }

  return notes;
}

// ── Notification Panel ────────────────────────────────────────────────────────

function NotifPanel({ visible, notifications, onClose }) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={notif.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[notif.panel, { top: insets.top + s(52) }]}>
        <View style={notif.header}>
          <Text style={notif.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={s(20)} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        {notifications.length === 0 ? (
          <View style={notif.empty}>
            <Ionicons name="checkmark-circle-outline" size={s(32)} color={Colors.grayMedium} />
            <Text style={notif.emptyText}>You're all caught up!</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.map((n, i) => (
              <View key={n.id}>
                <View style={notif.row}>
                  <View style={[notif.iconBg, { backgroundColor: n.color + '20' }]}>
                    <Ionicons name={n.icon} size={s(18)} color={n.color} />
                  </View>
                  <View style={notif.textWrap}>
                    <Text style={notif.title}>{n.title}</Text>
                    <Text style={notif.body}>{n.body}</Text>
                  </View>
                </View>
                {i < notifications.length - 1 && <View style={notif.divider} />}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, total, color = Colors.primary }) {
  const ratio = total > 0 ? Math.min(value / total, 1) : 0;
  return (
    <View style={styles.progressBg}>
      <View style={styles.progressRow}>
        <View style={[styles.progressFill, { flex: ratio, backgroundColor: color }]} />
        <View style={{ flex: 1 - ratio }} />
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { userName } = useUser();

  const [trip, setTrip]                   = useState(null);
  const [budget, setBudget]               = useState(null);
  const [allBudgets, setAllBudgets]       = useState({});
  const [allTrips, setAllTrips]           = useState([]);
  const [recentPlaces, setRecentPlaces]   = useState([]);
  const [showNotif, setShowNotif]         = useState(false);
  const [notifRead, setNotifRead]         = useState(false);
  const [notifPrefs, setNotifPrefs]       = useState({ trip: true, budget: true });

  useFocusEffect(useCallback(() => {
    let mounted = true;

    // Notification prefs
    Promise.all([
      getSetting('notif_trip', 'true'),
      getSetting('notif_budget', 'true'),
    ]).then(([t, b]) => {
      setNotifPrefs({ trip: t !== 'false', budget: b !== 'false' });
    });

    async function load() {
      const trips = await getTrips();
      if (!mounted) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // ── Upcoming trip ──────────────────────────────────────────────────────
      if (trips.length === 0) {
        setTrip(null); setBudget(null); setRecentPlaces([]); return;
      }

      let upcoming = null;
      let nearestDiff = Infinity;

      for (const t of trips) {
        const start = parseTripStartDate(t.dates);
        if (start) {
          start.setHours(0, 0, 0, 0);
          const diff = start - today;
          if (diff >= 0 && diff < nearestDiff) {
            nearestDiff = diff;
            upcoming = t;
          }
        }
      }
      if (!upcoming) upcoming = trips[0];

      if (!mounted) return;
      setTrip(upcoming);
      setAllTrips(trips);

      const summary = await getBudgetSummary(String(upcoming.id));
      if (mounted) setBudget(summary);

      // Load budgets for all trips (for notification alerts)
      const budgetMap = {};
      for (const t of trips) {
        budgetMap[String(t.id)] = await getBudgetSummary(String(t.id));
      }
      if (mounted) setAllBudgets(budgetMap);

      // ── Recent destinations: activities from started trips ─────────────────
      const visited = []; // { key, name, province, destImg, visitedAt }

      for (const t of trips) {
        const start = parseTripStartDate(t.dates);
        if (!start) continue;
        start.setHours(0, 0, 0, 0);
        if (start > today) continue; // trip hasn't started yet

        const destImg = getDestImg(t.destination);
        const activities = await getAllTripActivities(t.id);

        if (activities.length === 0) {
          // No activities — show the trip destination itself
          visited.push({
            key:       `trip-${t.id}`,
            name:      t.destination,
            province:  t.name,
            destImg,
            visitedAt: start.getTime(),
          });
        } else {
          for (const act of activities) {
            // Date this activity fell on
            const actDate = new Date(start);
            actDate.setDate(actDate.getDate() + (act.day - 1));
            actDate.setHours(0, 0, 0, 0);
            if (actDate > today) continue; // day hasn't happened yet

            visited.push({
              key:       `act-${act.id}`,
              name:      act.title,
              province:  t.destination,
              destImg,
              visitedAt: actDate.getTime() + act.day, // secondary sort by day
            });
          }
        }
      }

      // Sort most recent first, deduplicate by name
      visited.sort((a, b) => b.visitedAt - a.visitedAt);
      const seen = new Set();
      const deduped = visited.filter(p => {
        const k = p.name.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      if (mounted) setRecentPlaces(deduped);
    }

    load();
    setNotifRead(false);
    return () => { mounted = false; };
  }, []));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 18) return 'Magandang gabi,';
    if (hour >= 12) return 'Magandang hapon,';
    return 'Magandang umaga,';
  };

  const HERO_HEIGHT = height * 0.28 + insets.top;
  const MASCOT_SIZE = HERO_HEIGHT * 0.95;

  const daysLeft        = trip ? getDaysLeft(trip.dates) : null;
  const tripDestImg     = trip ? getDestImg(trip.destination) : null;
  const departureDate   = trip ? (() => {
    const d = parseTripStartDate(trip.dates);
    if (!d) return null;
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  })() : null;
  const pct             = budget && budget.total > 0 ? Math.round((budget.spent / budget.total) * 100) : 0;
  const notifications   = useMemo(() => buildNotifications(allTrips, allBudgets, notifPrefs), [allTrips, allBudgets, notifPrefs]);
  const hasUnread       = notifications.length > 0 && !notifRead;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HERO ── */}
      <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
        <ImageBackground
          source={require('../../assets/images/dashboard/background.webp')}
          style={styles.heroBg}
          resizeMode="cover"
        >
          <View style={{ paddingTop: insets.top, flex: 1 }}>
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.notifBtn} onPress={() => navigation.navigate('Search')}>
                <Ionicons name="search-outline" size={s(22)} color={Colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.notifBtn}
                onPress={() => { setShowNotif(true); setNotifRead(true); }}
              >
                <Ionicons name="notifications-outline" size={s(22)} color={Colors.white} />
                {hasUnread && <View style={styles.notifBadge} />}
              </TouchableOpacity>
            </View>
            <View style={styles.greetingBlock}>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.username}>{userName}! ✦</Text>
            </View>
            <View style={styles.heroBottom}>
              <View style={styles.itineraryCard}>
                <View style={styles.itineraryIconBg}>
                  <Ionicons
                    name="list-outline"
                    size={s(16)}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.itineraryTexts}>
                  <Text style={styles.itineraryTitle}>Itinerary First</Text>
                  <Text style={styles.itinerarySub}>
                    Plan your days around must-visit spots, food stops, and practical travel tips.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Image
            source={require('../../assets/images/dashboard/mascot.png')}
            style={{
              position: 'absolute',
              right: -s(38),
              bottom: -(MASCOT_SIZE * 0.5),
              width: MASCOT_SIZE * 0.85,
              height: MASCOT_SIZE,
            }}
            resizeMode="contain"
          />
        </ImageBackground>
      </View>

      {/* ── SCROLL CONTENT ── */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: s(30) }}
      >
        {/* Upcoming Trip */}
        <Text style={styles.sectionTitle}>Upcoming Trip</Text>
        {trip ? (
          <View style={styles.tripCardShadow}>
          <TouchableOpacity
            style={styles.tripCard}
            onPress={() => navigation.navigate('TripDetails', { trip })}
            activeOpacity={0.9}
          >
            <View>
              {/* Destination image — cover photo takes priority */}
              <View style={styles.tripImageWrap}>
                {trip.cover_photo ? (
                  <Image source={{ uri: trip.cover_photo }} style={styles.tripImage} resizeMode="cover" />
                ) : tripDestImg ? (
                  <CachedImage
                    placeId={tripDestImg.id}
                    uri={tripDestImg.uri}
                    style={styles.tripImage}
                    placeholder={
                      <View style={[styles.tripImage, styles.tripImageFallback]}>
                        <Text style={{ fontSize: s(44) }}>{trip.emoji ?? '✈️'}</Text>
                      </View>
                    }
                  />
                ) : (
                  <View style={[styles.tripImage, styles.tripImageFallback]}>
                    <Text style={{ fontSize: s(44) }}>{trip.emoji ?? '✈️'}</Text>
                  </View>
                )}
                <View style={styles.tripImageOverlay} />
                {/* Departure date badge */}
                {daysLeft === 0 ? (
                  <View style={[styles.tripDaysBadge, { backgroundColor: Colors.primary }]}>
                    <Text style={styles.tripDaysBadgeNum}>✈️ It's today!</Text>
                    <Text style={styles.tripDaysBadgeLabel}>Have a safe trip!</Text>
                  </View>
                ) : daysLeft !== null && daysLeft < 0 ? (
                  <View style={[styles.tripDaysBadge, { backgroundColor: '#16a34a' }]}>
                    <Text style={styles.tripDaysBadgeLabel}>In Progress</Text>
                  </View>
                ) : departureDate ? (
                  <View style={styles.tripDaysBadge}>
                    <Text style={styles.tripDaysBadgeLabel}>Departure</Text>
                    <Text style={styles.tripDaysBadgeNum}>{departureDate}</Text>
                  </View>
                ) : null}
              </View>

              {/* Info row */}
              <View style={styles.tripInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripTitle} numberOfLines={1}>{trip.name}</Text>
                  <Text style={styles.tripMeta}>{trip.destination} · {trip.days} Days</Text>
                  <Text style={styles.tripMeta}>{trip.dates}</Text>
                </View>
                <View style={styles.tripChevron}>
                  <Ionicons name="chevron-forward" size={s(18)} color={Colors.primary} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyTripCard}
            onPress={() => navigation.navigate('CreateTrip', {})}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={s(28)} color={Colors.primary} />
            <Text style={styles.emptyTripText}>No upcoming trip yet</Text>
            <Text style={styles.emptyTripSub}>Tap to plan your first adventure</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1.55 }]}>
            <Text style={styles.statLabel}>Budget Overview</Text>
            {budget && budget.total > 0 ? (
              <>
                <Text style={styles.statValue}>₱{budget.spent.toLocaleString()}.00</Text>
                <Text style={styles.statSub}>of ₱{budget.total.toLocaleString()}.00</Text>
                <ProgressBar value={budget.spent} total={budget.total} />
                <Text style={styles.statPct}>{pct}%</Text>
              </>
            ) : (
              <>
                <Text style={styles.statValue}>₱0.00</Text>
                <Text style={styles.statSub}>No budget set yet</Text>
                <ProgressBar value={0} total={1} />
                <Text style={styles.statPct}>0%</Text>
              </>
            )}
          </View>
          <View style={[styles.statCard, { flex: 1, alignItems: 'center' }]}>
            <Text style={styles.statLabel}>Days Left</Text>
            {daysLeft === 0 ? (
              <>
                <Text style={[styles.statBigNum, { fontSize: s(22), color: Colors.primary }]}>Today!</Text>
                <Text style={{ fontSize: s(22) }}>✈️</Text>
                <Text style={styles.statSub}>bon voyage!</Text>
              </>
            ) : daysLeft !== null && daysLeft > 0 ? (
              <>
                <Text style={styles.statBigNum}>{daysLeft}</Text>
                <Text style={{ fontSize: s(22) }}>🌴</Text>
                <Text style={styles.statSub}>days to go</Text>
              </>
            ) : daysLeft !== null && daysLeft < 0 ? (
              <>
                <Text style={[styles.statBigNum, { fontSize: s(26) }]}>Now!</Text>
                <Text style={{ fontSize: s(22) }}>🎉</Text>
                <Text style={styles.statSub}>trip in progress</Text>
              </>
            ) : (
              <>
                <Text style={[styles.statBigNum, { fontSize: s(26), color: Colors.grayMedium }]}>—</Text>
                <Text style={{ fontSize: s(22) }}>🗓️</Text>
                <Text style={styles.statSub}>set a date</Text>
              </>
            )}
          </View>
        </View>

        {/* Recent Destinations */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Destinations</Text>
        </View>
        {recentPlaces.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: s(20) }}>
            {recentPlaces.map((d) => (
              <TouchableOpacity key={d.key} style={styles.destCard}>
                <View style={[styles.destThumb, styles.destThumbFallback]}>
                  <Text style={styles.destThumbEmoji}>📍</Text>
                </View>
                <View style={styles.destOverlay} />
                <View style={styles.destTextWrap}>
                  <Text style={styles.destName} numberOfLines={1}>{d.name}</Text>
                  <Text style={styles.destProv} numberOfLines={1}>{d.province}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRecentWrap}>
            <Text style={styles.emptyRecentText}>Places you visit will appear here</Text>
          </View>
        )}
      </ScrollView>
      <NotifPanel
        visible={showNotif}
        notifications={notifications}
        onClose={() => setShowNotif(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },

  heroContainer: { width, overflow: 'hidden' },
  heroBg: { flex: 1, paddingHorizontal: s(18) },

  topRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    alignItems: 'center', marginTop: s(4), marginBottom: s(8),
    gap: s(8),
  },
  greetingBlock: { marginBottom: s(8) },
  greeting: { fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.85)', fontSize: s(13) },
  username: { fontFamily: Fonts.black, color: Colors.white, fontSize: s(24), marginTop: s(1) },
  notifBtn: {
    width: s(36), height: s(36), borderRadius: s(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute', top: s(6), right: s(6),
    width: s(8), height: s(8), borderRadius: s(4),
    backgroundColor: '#ef4444',
    borderWidth: 1.5, borderColor: Colors.white,
  },

  heroBottom: { flex: 1, justifyContent: 'flex-end', paddingBottom: s(14) },
  itineraryCard: {
    width: width * 0.58, backgroundColor: Colors.white,
    borderRadius: s(14), paddingHorizontal: s(10), paddingVertical: s(10),
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    shadowColor: '#000', shadowOffset: { width: 0, height: s(2) },
    shadowOpacity: 0.12, shadowRadius: s(6), elevation: 5,
  },
  itineraryIconBg: {
    width: s(32), height: s(32), borderRadius: s(9),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  itineraryTexts: { flex: 1 },
  itineraryTitle: { fontFamily: Fonts.bold, fontSize: s(12), color: Colors.textPrimary },
  itinerarySub: {
    fontFamily: Fonts.regular, fontSize: s(10), color: Colors.textSecondary,
    marginTop: s(1), lineHeight: s(13), flexWrap: 'wrap',
  },

  scroll: { flex: 1, backgroundColor: Colors.white },

  sectionTitle: {
    fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textPrimary,
    marginHorizontal: s(20), marginTop: s(18), marginBottom: s(10),
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginHorizontal: s(20), marginTop: s(18),
  },
  seeAll: { color: Colors.primary, fontSize: s(13), fontFamily: Fonts.medium },

  tripCardShadow: {
    marginHorizontal: s(16),
    marginBottom: s(6),
    borderRadius: s(18),
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
  },
  tripCard: {
    borderRadius: s(18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  tripImageWrap: { height: s(148), position: 'relative' },
  tripImage: { width: '100%', height: s(148) },
  tripImageFallback: {
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  tripImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  tripDaysBadge: {
    position: 'absolute', top: s(12), right: s(12),
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: s(10),
    paddingHorizontal: s(10), paddingVertical: s(6),
    alignItems: 'center',
  },
  tripDaysBadgeNum: {
    fontSize: s(13), fontFamily: Fonts.bold, color: Colors.white, lineHeight: s(18),
  },
  tripDaysBadgeLabel: {
    fontSize: s(10), fontFamily: Fonts.medium, color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  tripInfo: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: s(14), paddingVertical: s(12), gap: s(10),
  },
  tripChevron: {
    width: s(30), height: s(30), borderRadius: s(15),
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  tripTitle: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.textPrimary },
  tripMeta: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2) },

  emptyTripCard: {
    backgroundColor: Colors.white, marginHorizontal: s(20), borderRadius: s(16),
    padding: s(24), alignItems: 'center', gap: s(6),
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
  },
  emptyTripText: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary },
  emptyTripSub: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: s(12), marginHorizontal: s(16), marginTop: s(12), marginBottom: s(6) },
  statCard: {
    backgroundColor: Colors.white, borderRadius: s(16), padding: s(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: Colors.border,
  },
  statLabel: { fontSize: s(11), color: Colors.textSecondary, fontFamily: Fonts.medium, marginBottom: s(4) },
  statValue: { fontSize: s(20), fontFamily: Fonts.bold, color: Colors.textPrimary },
  statBigNum: { fontSize: s(38), fontFamily: Fonts.black, color: Colors.primary, lineHeight: s(44) },
  statSub: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2) },
  statPct: { fontSize: s(11), color: Colors.primary, fontFamily: Fonts.bold, marginTop: s(4) },
  progressBg: { height: s(6), backgroundColor: Colors.grayLight, borderRadius: s(3), marginTop: s(8), overflow: 'hidden' },
  progressRow: { flex: 1, flexDirection: 'row', height: s(6) },
  progressFill: { borderRadius: s(3) },

  emptyRecentWrap: {
    marginHorizontal: s(20), marginTop: s(8), paddingVertical: s(18),
    borderRadius: s(12), backgroundColor: Colors.grayLight,
    alignItems: 'center',
  },
  emptyRecentText: {
    fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary,
  },

  destCard: {
    width: s(110), height: s(112), borderRadius: s(16),
    marginRight: s(12), marginBottom: s(4),
    overflow: 'hidden', justifyContent: 'flex-end',
  },
  destThumb: { position: 'absolute', width: s(110), height: s(112) },
  destThumbFallback: { backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center' },
  destThumbEmoji: { fontSize: s(32) },
  destOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.30)' },
  destTextWrap: { padding: s(8) },
  destName: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.white },
  destProv: { fontSize: s(10), fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.85)', marginTop: s(2) },
});

const notif = StyleSheet.create({
  overlay: {
    position: 'absolute', top: -200, bottom: -200, left: -200, right: -200,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  panel: {
    position: 'absolute', left: s(16), right: s(16),
    backgroundColor: Colors.white, borderRadius: s(20),
    maxHeight: '70%',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(8) },
    shadowOpacity: 0.15, shadowRadius: s(20), elevation: 12,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: s(18), paddingTop: s(16), paddingBottom: s(12),
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textPrimary },
  empty: { alignItems: 'center', gap: s(8), paddingVertical: s(32) },
  emptyText: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary },
  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: s(12),
    paddingHorizontal: s(18), paddingVertical: s(14),
  },
  iconBg: {
    width: s(36), height: s(36), borderRadius: s(10),
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary },
  body: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(2), lineHeight: s(17) },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: s(18) },
});
