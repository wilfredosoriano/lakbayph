import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { PLACES_BY_DESTINATION } from '../data/placesData';
import { getCachedDestinations } from '../database/db';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const CARD_W = (width - s(16) * 2 - s(10)) / 2;

// ── Destination metadata (color + emoji) ──────────────────────────────────────

const DEST_META = {
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
  // Luzon - South
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
  Angeles:            { bg: '#2A1A1A', emoji: '🏛️' },
  Cabanatuan:         { bg: '#1A2A1A', emoji: '🏛️' },
  Naga:               { bg: '#2A3A2A', emoji: '🏛️' },
  Magdiwang:          { bg: '#0C3A4A', emoji: '🏖️' },
  // Quezon
  Lucban:             { bg: '#2A3A1A', emoji: '🎨' },
  Tayabas:            { bg: '#3A2A1A', emoji: '⛪' },
  'San Pablo':        { bg: '#1A3A2E', emoji: '🏞️' },
  'Santa Cruz':       { bg: '#1A2A3A', emoji: '🏞️' },
  Lucena:             { bg: '#2A1A3A', emoji: '🏖️' },
};

const getDestMeta = (name) =>
  DEST_META[name] || { bg: Colors.primary, emoji: '🗺️' };

// ── Destination Card ──────────────────────────────────────────────────────────

function DestCard({ name, count, onPress }) {
  const meta = getDestMeta(name);
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: meta.bg }]}
      onPress={onPress}
      activeOpacity={0.88}>
      <Text style={styles.cardEmoji}>{meta.emoji}</Text>
      <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
      <View style={styles.cardBadge}>
        <Text style={styles.cardBadgeText}>{count} places</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function DestinationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [search, setSearch]               = useState('');
  const [cachedDests, setCachedDests]     = useState([]);

  // Load cached destinations from SQLite whenever screen is focused
  useFocusEffect(useCallback(() => {
    getCachedDestinations().then(rows => setCachedDests(rows));
  }, []));

  // Merge static destinations + cached destinations
  const allDestinations = useMemo(() => {
    const map = new Map();

    // Static curated places
    Object.keys(PLACES_BY_DESTINATION).forEach(key => {
      const places = PLACES_BY_DESTINATION[key];
      map.set(key, { name: key, count: places.length });
    });

    // Cached gist places — add new ones, update count for existing
    cachedDests.forEach(({ destination, count }) => {
      if (map.has(destination)) {
        const existing = map.get(destination);
        map.set(destination, { ...existing, count: existing.count + count });
      } else {
        map.set(destination, { name: destination, count });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [cachedDests]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allDestinations;
    const q = search.toLowerCase();
    return allDestinations.filter(d => d.name.toLowerCase().includes(q));
  }, [allDestinations, search]);

  const handlePress = (destName) => {
    navigation.navigate('PlaceDiscovery', { destinationOverride: destName });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + s(14) }]}>
        <Text style={styles.headerTitle}>Discover</Text>
        <Text style={styles.headerSub}>Explore tourist spots across the Philippines</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={s(16)} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search destination…"
          placeholderTextColor={Colors.textTertiary}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={s(16)} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Count */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {filtered.length} destination{filtered.length !== 1 ? 's' : ''}
        </Text>
        {cachedDests.length > 0 && (
          <View style={styles.syncBadge}>
            <Ionicons name="cloud-done-outline" size={s(11)} color={Colors.success} />
            <Text style={styles.syncText}>Updated</Text>
          </View>
        )}
      </View>

      {/* Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}>
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: s(40) }}>🔍</Text>
            <Text style={styles.emptyTitle}>No destinations found</Text>
            <Text style={styles.emptySub}>Try a different search term.</Text>
          </View>
        ) : (
          filtered.map(dest => (
            <DestCard
              key={dest.name}
              name={dest.name}
              count={dest.count}
              onPress={() => handlePress(dest.name)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgLight },

  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: s(20),
    paddingBottom: s(18),
  },
  headerTitle: { fontSize: s(24), fontFamily: Fonts.black, color: Colors.white },
  headerSub: {
    marginTop: s(2), fontSize: s(12),
    fontFamily: Fonts.regular, color: 'rgba(255,255,255,0.8)',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: s(8),
    backgroundColor: Colors.white,
    marginHorizontal: s(16), marginTop: s(12), marginBottom: s(10),
    borderRadius: s(12), paddingHorizontal: s(12), paddingVertical: s(10),
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  searchInput: {
    flex: 1, fontSize: s(14), fontFamily: Fonts.regular,
    color: Colors.textPrimary, paddingVertical: 0,
  },

  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: s(18), marginBottom: s(8),
  },
  countText: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textSecondary },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: s(4),
    backgroundColor: '#F0FDF4', borderRadius: s(20),
    paddingHorizontal: s(8), paddingVertical: s(3),
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  syncText: { fontSize: s(10), fontFamily: Fonts.bold, color: Colors.success },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: s(16), gap: s(10),
    paddingBottom: s(40),
  },

  // Destination card
  card: {
    width: CARD_W, height: s(150),
    borderRadius: s(18), overflow: 'hidden',
    padding: s(14), justifyContent: 'flex-end',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(3) },
    shadowOpacity: 0.15, shadowRadius: s(8), elevation: 4,
  },
  cardEmoji: { fontSize: s(36), lineHeight: s(42), marginBottom: s(4) },
  cardName: {
    fontSize: s(14), fontFamily: Fonts.bold,
    color: Colors.white, lineHeight: s(19),
  },
  cardBadge: {
    alignSelf: 'flex-start', marginTop: s(4),
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: s(20), paddingHorizontal: s(8), paddingVertical: s(2),
  },
  cardBadgeText: { fontSize: s(10), fontFamily: Fonts.bold, color: 'rgba(255,255,255,0.9)' },

  empty: { flex: 1, alignItems: 'center', gap: s(10), paddingTop: s(60), width: '100%' },
  emptyTitle: { fontSize: s(17), fontFamily: Fonts.bold, color: Colors.textPrimary },
  emptySub: { fontSize: s(13), fontFamily: Fonts.regular, color: Colors.textSecondary },
});
