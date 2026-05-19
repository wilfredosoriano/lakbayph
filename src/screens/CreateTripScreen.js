import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createTrip } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const MONTH_LABELS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const EMOJIS = [
  '✈️', '🚢', '🏝️', '🏔️', '🗺️', '🎒',
  '🌊', '🌴', '🏖️', '🗼', '🌋', '🏕️',
  '🚂', '🛵', '🌸', '🍜', '🤿', '🏄',
  '🎑', '🌅', '🦅', '🐚', '🌺', '🎭',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function stripTime(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calcDays(start, end) {
  if (!start || !end) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatRange(start, end) {
  if (!start) return '';
  const o = { month: 'short', day: 'numeric' };
  const oY = { month: 'short', day: 'numeric', year: 'numeric' };
  if (!end) return start.toLocaleDateString('en-PH', oY);
  return `${start.toLocaleDateString('en-PH', o)} – ${end.toLocaleDateString('en-PH', oY)}`;
}

// ── Calendar date-range picker ────────────────────────────────────────────────

function CalendarPicker({ startDate, endDate, onChange }) {
  const today = stripTime(new Date());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day) => {
    // Reset if both already picked or no start yet
    if (!startDate || (startDate && endDate)) {
      onChange({ startDate: day, endDate: null });
      return;
    }
    // Second tap
    if (day < startDate) {
      onChange({ startDate: day, endDate: null });
    } else if (sameDay(day, startDate)) {
      onChange({ startDate: null, endDate: null });
    } else {
      onChange({ startDate, endDate: day });
    }
  };

  // Build grid
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));

  return (
    <View style={cal.wrap}>
      {/* Month navigation */}
      <View style={cal.header}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={s(18)} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={cal.headerTitle}>{MONTH_LABELS[viewMonth]} {viewYear}</Text>
        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={s(18)} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Weekday labels */}
      <View style={cal.weekRow}>
        {DAY_LABELS.map(d => (
          <Text key={d} style={cal.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;

          const isPast   = day < today;
          const isStart  = sameDay(day, startDate);
          const isEnd    = sameDay(day, endDate);
          const inRange  = startDate && endDate && day > startDate && day < endDate;
          const selected = isStart || isEnd;

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[cal.cell, inRange && cal.cellInRange]}
              onPress={() => !isPast && handleDay(day)}
              activeOpacity={isPast ? 1 : 0.7}
            >
              <View style={[
                cal.dayCircle,
                selected && cal.dayCircleSelected,
                isStart && startDate && endDate && cal.dayCircleStart,
                isEnd   && startDate && endDate && cal.dayCircleEnd,
              ]}>
                <Text style={[
                  cal.dayText,
                  selected && cal.dayTextSelected,
                  isPast && cal.dayTextPast,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={cal.legend}>
        {startDate && endDate ? (
          <Text style={cal.legendText}>
            {formatRange(startDate, endDate)} · {calcDays(startDate, endDate)} day{calcDays(startDate, endDate) > 1 ? 's' : ''}
          </Text>
        ) : startDate ? (
          <Text style={cal.legendText}>Now pick your end date</Text>
        ) : (
          <Text style={cal.legendText}>Tap a date to set departure</Text>
        )}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreateTripScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialDestination = route?.params?.initialDestination || '';
  const initialName        = route?.params?.initialName || '';

  const [name,        setName]        = useState(initialName);
  const [destination, setDestination] = useState(initialDestination);
  const [emoji,       setEmoji]       = useState('✈️');
  const [startDate,   setStartDate]   = useState(null);
  const [endDate,     setEndDate]     = useState(null);
  const [saving,      setSaving]      = useState(false);

  const days  = calcDays(startDate, endDate);
  const dates = formatRange(startDate, endDate);

  useEffect(() => {
    if (route?.params?.initialDestination) {
      setDestination(route.params.initialDestination);
    }
    if (route?.params?.initialName) {
      setName(route.params.initialName);
    }
  }, [route?.params?.initialDestination, route?.params?.initialName]);

  const handleBrowseDestinations = () => {
    navigation.navigate('Main', {
      screen: 'Discover',
      params: {
        fromCreateTrip: true,
        draftName: name,
      },
    });
  };

  const handleCreate = async () => {
    if (!name.trim())        { Alert.alert('Missing Info', 'Please enter a trip name.'); return; }
    if (!destination.trim()) { Alert.alert('Missing Info', 'Please enter a destination.'); return; }
    setSaving(true);
    const id = await createTrip({
      name: name.trim(),
      destination: destination.trim(),
      dates: dates || `${days} day${days > 1 ? 's' : ''}`,
      days,
      emoji,
    });
    setSaving(false);
    navigation.replace('TripDetails', {
      trip: {
        id,
        name: name.trim(),
        destination: destination.trim(),
        dates: dates || `${days} day${days > 1 ? 's' : ''}`,
        days,
        emoji,
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Trip</Text>
        <TouchableOpacity onPress={handleBrowseDestinations} style={styles.headerLinkBtn}>
          <Ionicons name="sparkles-outline" size={s(18)} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

        <TouchableOpacity
          style={styles.discoveryCallout}
          activeOpacity={0.85}
          onPress={handleBrowseDestinations}
        >
          <View style={styles.discoveryIconBg}>
            <Ionicons name="sparkles-outline" size={s(16)} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.discoveryTitle}>Browse supported destinations</Text>
            <Text style={styles.discoverySub}>
              Explore ready-made regions first, then come back here with a destination in mind.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={s(18)} color={Colors.primary} />
        </TouchableOpacity>

        {/* Emoji preview + picker */}
        <View style={styles.emojiPreviewRow}>
          <View style={styles.emojiPreview}>
            <Text style={styles.emojiPreviewText}>{emoji}</Text>
          </View>
          <Text style={styles.emojiHint}>Pick an icon for your trip</Text>
        </View>
        <View style={styles.emojiGrid}>
          {EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiCell, emoji === e && styles.emojiCellActive]}
              onPress={() => setEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiCellText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Trip Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Coron Island Escape"
          placeholderTextColor={Colors.grayMedium}
          maxLength={50}
        />

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="e.g. Palawan"
          placeholderTextColor={Colors.grayMedium}
          maxLength={50}
        />

        {/* Date range picker */}
        <Text style={styles.label}>
          Trip Dates
          <Text style={styles.labelOptional}> (optional)</Text>
        </Text>
        <CalendarPicker
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e); }}
        />

        {/* Duration summary */}
        {startDate && (
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={s(16)} color={Colors.primary} />
            <Text style={styles.summaryText}>
              {dates} · <Text style={styles.summaryBold}>{days} day{days > 1 ? 's' : ''}</Text>
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.createBtn, saving && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={saving}
        >
          <Text style={styles.createBtnEmoji}>{emoji}</Text>
          <Text style={styles.createBtnText}>{saving ? 'Creating...' : 'Create Trip'}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  backBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: s(18), fontFamily: Fonts.bold, color: Colors.white },
  headerLinkBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  form: { padding: s(20), gap: s(6), paddingBottom: s(40) },
  discoveryCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: '#FFF8F3',
    borderRadius: s(16),
    padding: s(14),
    borderWidth: 1,
    borderColor: '#F4D7BE',
    marginBottom: s(16),
  },
  discoveryIconBg: {
    width: s(34), height: s(34), borderRadius: s(10),
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  discoveryTitle: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary },
  discoverySub: {
    marginTop: s(4),
    fontSize: s(11),
    lineHeight: s(16),
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
  },

  emojiPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: s(14), marginBottom: s(12), marginTop: s(6) },
  emojiPreview: {
    width: s(64), height: s(64), borderRadius: s(18),
    backgroundColor: Colors.primaryBg, borderWidth: 2, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiPreviewText: { fontSize: s(34) },
  emojiHint: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textSecondary, flex: 1 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(8), marginBottom: s(6) },
  emojiCell: {
    width: s(44), height: s(44), borderRadius: s(12),
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCellActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  emojiCellText: { fontSize: s(22) },

  label: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary, marginTop: s(14), marginBottom: s(6) },
  labelOptional: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.white, borderRadius: s(12),
    paddingHorizontal: s(16), paddingVertical: s(13),
    fontSize: s(14), fontFamily: Fonts.regular, color: Colors.textPrimary,
    borderWidth: 1.5, borderColor: Colors.border,
  },

  summaryRow: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.primaryBg, borderRadius: s(12),
    paddingHorizontal: s(14), paddingVertical: s(10),
    marginTop: s(8), borderWidth: 1, borderColor: Colors.primary + '40',
  },
  summaryText: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textPrimary },
  summaryBold: { fontFamily: Fonts.bold, color: Colors.primary },

  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(8),
    backgroundColor: Colors.primary, borderRadius: s(14),
    paddingVertical: s(16), marginTop: s(28),
  },
  createBtnEmoji: { fontSize: s(18) },
  createBtnText: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.white },
});

const CELL_SIZE = Math.floor((width - s(40) - s(32)) / 7);

const cal = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: s(16),
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: s(16),
    paddingVertical: s(14),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: s(12),
  },
  navBtn: {
    width: s(32), height: s(32), borderRadius: s(16),
    backgroundColor: Colors.bgLight, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: s(15), fontFamily: Fonts.bold, color: Colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: s(6) },
  weekLabel: {
    width: CELL_SIZE, textAlign: 'center',
    fontSize: s(11), fontFamily: Fonts.bold, color: Colors.textSecondary,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: CELL_SIZE, height: CELL_SIZE,
    alignItems: 'center', justifyContent: 'center',
  },
  cellInRange: { backgroundColor: Colors.primaryBg },
  dayCircle: {
    width: CELL_SIZE - s(4), height: CELL_SIZE - s(4),
    borderRadius: (CELL_SIZE - s(4)) / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleSelected: { backgroundColor: Colors.primary },
  dayCircleStart:  { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  dayCircleEnd:    { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  dayText: { fontSize: s(13), fontFamily: Fonts.medium, color: Colors.textPrimary },
  dayTextSelected: { color: Colors.white, fontFamily: Fonts.bold },
  dayTextPast: { color: Colors.grayMedium },
  legend: {
    marginTop: s(12), paddingTop: s(10),
    borderTopWidth: 1, borderTopColor: Colors.border,
    alignItems: 'center',
  },
  legendText: {
    fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary,
  },
});
