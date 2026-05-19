import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { setSetting } from '../database/db';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const handleStartAdventure = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });

    setSetting('has_seen_welcome', 'true').catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require('../../assets/images/onboarding/background.webp')}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Top: logo + tagline */}
        <View style={styles.topSection}>
          <View style={styles.logoRow}>
            <Text style={styles.starLeft}>✦</Text>
            <Text style={styles.logoText}>LakbayPH</Text>
            <Text style={styles.starRight}>✦</Text>
          </View>
          <Text style={styles.tagline}>
            Your offline travel companion{'\n'}in the Philippines
          </Text>
        </View>

        {/* Mascot — absolutely placed so feet land on the ground */}
        <Image
          source={require('../../assets/images/onboarding/mascot.png')}
          style={styles.mascot}
          resizeMode="contain"
        />

        {/* Bottom text + button */}
        <View style={styles.bottomOverlay}>
          <Text style={[styles.sparkle, { top: -8, left: 8 }]}>✦</Text>
          <Text style={[styles.sparkle, { top: -14, right: 48, fontSize: 10 }]}>✦</Text>
          <Text style={[styles.sparkle, { bottom: 110, right: 20, fontSize: 10 }]}>✦</Text>

          <Text style={styles.headline}>Plan your{'\n'}journey offline</Text>
          <Text style={styles.subtext}>
            No signal? No problem.{'\n'}All your trips, itineraries, and guides{'\n'}always with you.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleStartAdventure}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Start Your Adventure</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width,
    height,
  },

  // Top logo
  topSection: {
    alignItems: 'center',
    marginTop: 54,
    paddingHorizontal: 20,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontFamily: Fonts.black,
    fontSize: 44,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  starLeft: {
    color: Colors.accent,
    fontSize: 24,
    marginBottom: 4,
  },
  starRight: {
    color: Colors.accent,
    fontSize: 16,
    marginTop: 10,
  },
  tagline: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Mascot pinned so feet touch the ground (~55% from top)
  mascot: {
    position: 'absolute',
    width: width * 0.68,
    height: height * 0.48,
    // center horizontally, slightly right like the mockup
    right: width * 0.02,
    // bottom of mascot = bottom of visible ground area
    bottom: height * 0.15,
  },

  // Text + button at the bottom of the screen
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 30,
    paddingBottom: 44,
    paddingTop: 12,
  },
  sparkle: {
    position: 'absolute',
    color: Colors.accent,
    fontSize: 14,
  },
  headline: {
    fontFamily: Fonts.black,
    fontSize: 34,
    color: Colors.white,
    lineHeight: 40,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtext: {
    fontFamily: Fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
    marginBottom: 20,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 50,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    color: Colors.white,
  },
});
