import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ImageBackground, Image, Dimensions, StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePremium } from '../context/PremiumContext';

const { width, height } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

const MASCOT_SIZE  = s(270);
const SHEET_H      = height * 0.60;
const MASCOT_COVER = MASCOT_SIZE * 0.26;

const FEATURES = [
  { icon: 'briefcase',   title: 'Unlimited Trips',     sub: 'Free plan is limited to 3 trips. Go unlimited with Premium.' },
  { icon: 'chatbubbles', title: 'Lakbay Assistant',    sub: 'Your offline planning buddy — trips, budget, packing lists, and destinations.' },
  { icon: 'images',      title: 'Memories Slideshow',  sub: 'Relive every trip with autoplay and easy sharing.' },
  { icon: 'image',       title: 'Trip Cover Photos',   sub: 'Set a personal cover photo for each of your trips.' },
  { icon: 'headset',     title: 'Priority Support',    sub: 'Get faster help whenever you need it.' },
];

export default function PremiumScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { isPremium, isLoading, premiumPackage, purchasePremium, restorePurchases } = usePremium();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring,  setRestoring]  = useState(false);

  // ── Already premium ────────────────────────────────────────────────────────
  if (!isLoading && isPremium) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ImageBackground
          source={require('../../assets/images/premium/background.webp')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <Image
          source={require('../../assets/images/premium/mascot.webp')}
          style={styles.mascot}
          resizeMode="contain"
          pointerEvents="none"
        />
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + s(10) }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={s(20)} color={Colors.white} />
        </TouchableOpacity>

        <View style={[styles.sheet, styles.alreadyPremiumSheet]}>
          <Text style={styles.alreadyEmoji}>🎉</Text>
          <Text style={styles.alreadyTitle}>You're Premium!</Text>
          <Text style={styles.alreadySub}>
            All premium features are unlocked. Thank you for supporting LakbayPH!
          </Text>
          {FEATURES.map((feat, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={[styles.featureIconBg, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark" size={s(16)} color="#16A34A" />
              </View>
              <Text style={styles.featureTitle}>{feat.title}</Text>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: '#16A34A', marginTop: s(20) }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Back to the app</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Purchase handler ───────────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (purchasing || restoring) return;
    setPurchasing(true);
    const result = await purchasePremium();
    setPurchasing(false);

    if (result.success) {
      Alert.alert(
        '🎉 Welcome to Premium!',
        'All features are now unlocked. Enjoy your adventures!',
        [{ text: "Let's go!", onPress: () => navigation.goBack() }],
      );
    } else if (!result.cancelled) {
      Alert.alert('Purchase failed', result.error || 'Something went wrong. Please try again.');
    }
  };

  // ── Restore handler ────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (purchasing || restoring) return;
    setRestoring(true);
    const result = await restorePurchases();
    setRestoring(false);

    if (!result.success) {
      Alert.alert('Restore failed', result.error || 'Could not restore purchases. Please try again.');
      return;
    }

    if (result.isPremium) {
      Alert.alert(
        'Restored!',
        'Your Premium access has been restored.',
        [{ text: 'Great!', onPress: () => navigation.goBack() }],
      );
    } else {
      Alert.alert('Nothing to restore', 'No previous Premium purchase was found on this account.');
    }
  };

  // ── Main paywall ───────────────────────────────────────────────────────────
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

      {/* ── 3. White sheet ── */}
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
          style={[styles.ctaBtn, (purchasing || isLoading) && { opacity: 0.7 }]}
          onPress={handlePurchase}
          disabled={purchasing || restoring || isLoading}
          activeOpacity={0.85}
        >
          {purchasing ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.ctaText}>Get Premium — ₱199</Text>
          )}
        </TouchableOpacity>

        {/* Restore + legal line */}
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom || s(10) }]}>
          <Text style={styles.cancelNote}>
            One-time payment · No subscription · Yours forever
          </Text>
          <TouchableOpacity onPress={handleRestore} disabled={purchasing || restoring}>
            {restoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={styles.restoreLink}>Restore purchases</Text>
            )}
          </TouchableOpacity>
        </View>
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

  // ── Already-premium variant
  alreadyPremiumSheet: {
    paddingTop: MASCOT_COVER + s(-30),
    alignItems: 'center',
    gap: s(8),
    justifyContent: 'flex-start',
  },
  alreadyEmoji: { fontSize: s(42), marginBottom: s(4) },
  alreadyTitle: { fontSize: s(22), fontFamily: Fonts.bold, color: Colors.textPrimary },
  alreadySub: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, textAlign: 'center', lineHeight: s(19),
    paddingHorizontal: s(8), marginBottom: s(8),
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
    minHeight: s(50), justifyContent: 'center',
  },
  ctaText: { fontSize: s(16), fontFamily: Fonts.bold, color: Colors.white },

  // ── Bottom
  bottomRow: { alignItems: 'center', gap: s(6) },
  cancelNote: {
    textAlign: 'center',
    fontSize: s(11), fontFamily: Fonts.regular, color: Colors.textSecondary,
  },
  restoreLink: {
    fontSize: s(12), fontFamily: Fonts.bold, color: Colors.primary,
    textDecorationLine: 'underline',
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
