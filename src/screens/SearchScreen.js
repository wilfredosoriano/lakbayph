import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { searchTrips, searchActivities } from '../database/db';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const CATEGORY_ICON = {
  bus: 'bus-outline', ferry: 'boat-outline', van: 'car-outline',
  food: 'restaurant-outline', accommodation: 'bed-outline',
  activity: 'compass-outline', shop: 'bag-handle-outline', other: 'location-outline',
};

export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [trips, setTrips] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (text) => {
    if (!text.trim()) {
      setTrips([]); setActivities([]); setSearched(false); return;
    }
    setLoading(true);
    const [t, a] = await Promise.all([searchTrips(text), searchActivities(text)]);
    setTrips(t);
    setActivities(a);
    setSearched(true);
    setLoading(false);
  }, []);

  const handleChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 350);
  };

  const hasResults = trips.length > 0 || activities.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={s(18)} color={Colors.grayMedium} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search trips, activities, notes…"
            placeholderTextColor={Colors.grayMedium}
            value={query}
            onChangeText={handleChange}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: s(40) }} color={Colors.primary} />
      ) : !searched ? (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={s(44)} color={Colors.grayMedium} />
          <Text style={styles.emptyTitle}>Search everything</Text>
          <Text style={styles.emptySubtitle}>Find trips, activities, notes, and locations</Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Ionicons name="file-tray-outline" size={s(44)} color={Colors.grayMedium} />
          <Text style={styles.emptyTitle}>No results</Text>
          <Text style={styles.emptySubtitle}>Try a different keyword</Text>
        </View>
      ) : (
        <FlatList
          data={[
            ...(trips.length > 0 ? [{ type: 'header', id: 'h1', label: 'Trips' }, ...trips.map(t => ({ ...t, type: 'trip' }))] : []),
            ...(activities.length > 0 ? [{ type: 'header', id: 'h2', label: 'Activities' }, ...activities.map(a => ({ ...a, type: 'activity' }))] : []),
          ]}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionHeader}>{item.label}</Text>;
            }
            if (item.type === 'trip') {
              return (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.75}
                  onPress={() => navigation.navigate('TripDetails', { trip: item })}
                >
                  <View style={styles.tripIconBox}>
                    <Text style={styles.tripEmoji}>{item.emoji || '✈️'}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardSub}>{item.destination} · {item.days} day{item.days !== 1 ? 's' : ''}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={s(16)} color={Colors.grayMedium} />
                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('TripDetails', { trip: { id: item.trip_id, name: item.trip_name, destination: item.destination, emoji: item.trip_emoji } })}
              >
                <View style={styles.actIconBox}>
                  <Ionicons name={CATEGORY_ICON[item.category] || CATEGORY_ICON.other} size={s(18)} color={Colors.primary} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSub}>
                    {item.trip_name} · Day {item.day}
                    {item.location ? ` · ${item.location}` : ''}
                  </Text>
                  {!!item.notes && <Text style={styles.cardNote} numberOfLines={1}>{item.notes}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={s(16)} color={Colors.grayMedium} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: s(10),
    paddingHorizontal: s(16), paddingVertical: s(10),
    backgroundColor: Colors.white,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.bgLight, borderRadius: s(12),
    paddingHorizontal: s(12), paddingVertical: s(9),
  },
  searchInput: { flex: 1, fontSize: s(15), fontFamily: Fonts.regular, color: Colors.textPrimary, padding: 0 },
  cancelBtn: { paddingVertical: s(6) },
  cancelText: { fontSize: s(15), fontFamily: Fonts.medium, color: Colors.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: s(10), paddingBottom: s(60) },
  emptyTitle: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.grayMedium, textAlign: 'center', paddingHorizontal: s(40) },
  list: { padding: s(16), gap: s(8) },
  sectionHeader: { fontSize: s(12), fontFamily: Fonts.bold, color: Colors.grayMedium, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: s(8), marginBottom: s(4) },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: s(12),
    backgroundColor: Colors.white, borderRadius: s(14),
    padding: s(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: s(4), elevation: 1,
  },
  tripIconBox: {
    width: s(42), height: s(42), borderRadius: s(10),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  tripEmoji: { fontSize: s(22) },
  actIconBox: {
    width: s(42), height: s(42), borderRadius: s(10),
    backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: s(14), fontFamily: Fonts.bold, color: Colors.textPrimary },
  cardSub: { fontSize: s(12), fontFamily: Fonts.regular, color: Colors.grayMedium, marginTop: s(2) },
  cardNote: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.grayMedium, marginTop: s(3), fontStyle: 'italic' },
});
