import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ImageBackground, Image, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const MASCOT_SIZE  = s(270);
const SHEET_H      = height * 0.60;
const MASCOT_COVER = MASCOT_SIZE * 0.26;

const FEATURES = [
  { icon: 'briefcase',   title: 'Unlimited Trips',             sub: 'No cap — plan as many adventures as you want.' },
  { icon: 'restaurant',  title: 'More Must-Try Food Picks',    sub: 'Unlock richer dining suggestions for every destination.' },
  { icon: 'location',    title: 'More Must-Visit Places',      sub: 'Unlock extended place suggestions for every region.' },
  { icon: 'car',         title: 'Richer Local Transport Tips', sub: 'Get better ride advice, fare context, and travel know-how.' },
  { icon: 'chatbubbles', title: 'Trip Assistant Unlocked',     sub: 'Chat with your personal travel planning assistant.' },
];

export default function PremiumScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── 1. Full background ── */}
      <ImageBackground
        source={require('../../assets/images/premium/background.webp')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {/* ── 2. Mascot — behind sheet ── */}
      <Image
        source={require('../../assets/images/premium/mascot.webp')}
        style={styles.mascot}
        resizeMode="contain"
        pointerEvents="none"
      />

      {/* ── 3. White sheet — covers mascot bottom ── */}
      <View style={styles.sheet}>

        {/* Features checklist */}
        <View style={styles.featuresWrap}>
          {FEATURES.map((feat, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIconBg}>
                <Ionicons name={feat.icon} size={s(18)} color={Colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feat.title}</Text>
                <Text style={styles.featureSub}>{feat.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Price strip */}
        <View style={styles.priceStrip}>
          <View style={styles.priceLeft}>
            <Text style={styles.priceAmount}>₱199</Text>
            <Text style={styles.priceForever}>one-time only</Text>
          </View>
          <View style={styles.priceRight}>
            <Text style={styles.priceTag}>✦  No subscriptions</Text>
            <Text style={styles.priceTag}>✦  All future updates</Text>
            <Text style={styles.priceTag}>✦  Yours forever</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => Alert.alert('Premium', 'Get LakbayPH Premium for ₱199!')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Get Premium — ₱199</Text>
        </TouchableOpacity>

        <Text style={[styles.cancelNote, { paddingBottom: insets.bottom || s(10) }]}>
          One-time payment · No subscription · Yours forever
        </Text>
      </View>

      {/* ── 4. Floating UI ── */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + s(10) }]}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="close" size={s(20)} color={Colors.white} />
      </TouchableOpacity>

      <View style={[styles.heroTextWrap, { top: insets.top + s(46) }]}>
        <Text style={styles.heroTitle}>LAKBAYPH PREMIUM ✦</Text>
        <Text style={styles.heroSub}>Unlock more magic for your adventures!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  mascot: {
    position: 'absolute',
    bottom: SHEET_H - MASCOT_COVER,
    alignSelf: 'center',
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    zIndex: 5,
  },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_H,
    backgroundColor: Colors.white,
    borderTopLeftRadius: s(32), borderTopRightRadius: s(32),
    zIndex: 10,
    paddingTop: MASCOT_COVER + s(-45),
    paddingHorizontal: s(22),
    paddingBottom: s(4),
    justifyContent: 'space-between',
  },

  // ── Features
  featuresWrap: { gap: s(12) },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: s(12) },
  featureIconBg: {
    width: s(38), height: s(38), borderRadius: s(11),
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: { fontSize: s(13), fontFamily: Fonts.bold, color: Colors.textPrimary },
  featureSub: { fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: s(1) },

  // ── Price strip
  priceStrip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: s(18), borderWidth: 1.5, borderColor: Colors.primary + '40',
    paddingVertical: s(14), paddingHorizontal: s(18), gap: s(16),
  },
  priceLeft: { alignItems: 'center', gap: s(2) },
  priceAmount: { fontSize: s(38), fontFamily: Fonts.bold, color: Colors.primary, lineHeight: s(42) },
  priceForever: { fontSize: s(10), fontFamily: Fonts.medium, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  priceRight: { flex: 1, gap: s(5) },
  priceTag: { fontSize: s(12), fontFamily: Fonts.medium, color: Colors.textPrimary },

  // ── CTA
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: s(16),
    paddingVertical: s(15), alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: s(4) },
    shadowOpacity: 0.4, shadowRadius: s(10), elevation: 6,
  },
  ctaText: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.white },

  cancelNote: {
    textAlign: 'center', paddingTop: s(8),
    fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary,
  },

  // ── Floating UI
  closeBtn: {
    position: 'absolute', left: s(16), zIndex: 20,
    width: s(34), height: s(34), borderRadius: s(17),
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTextWrap: {
    position: 'absolute', left: 0, right: 0, zIndex: 20,
    alignItems: 'center', paddingHorizontal: s(24),
  },
  heroTitle: {
    fontSize: s(22), fontFamily: Fonts.bold,
    color: Colors.white, textAlign: 'center', letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  heroSub: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: 'rgba(255,255,255,0.88)', textAlign: 'center', marginTop: s(6),
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
});
