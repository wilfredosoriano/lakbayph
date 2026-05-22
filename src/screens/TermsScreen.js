import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts } from '../theme/fonts';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const scale = width / 390;
const s = (n) => Math.round(n * scale);

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function TermsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: s(36) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        <Text style={styles.intro}>
          Welcome to LakbayPH. By using this app, you agree to the following terms. Please read them carefully.
        </Text>

        <Section title="1. Acceptance of Terms">
          By downloading or using LakbayPH, you confirm that you are at least 13 years old and agree to be bound by these Terms and Conditions. If you do not agree, please do not use the app.
        </Section>

        <Section title="2. Use of the App">
          LakbayPH is a personal travel planning tool designed for exploring and planning trips within the Philippines. You agree to use the app only for lawful purposes and in a way that does not infringe the rights of others.
        </Section>

        <Section title="3. User Data">
          All personal data you create in LakbayPH — including trips, activities, notes, locations, photos, budgets, and preferences — is stored locally on your device. LakbayPH does not collect or transmit your personal data to any external server. You are responsible for backing up your own data.
        </Section>

        <Section title="4. Destination Content Updates">
          To keep place and destination information current, LakbayPH may periodically fetch updated content (such as new places, entrance fees, and travel tips) from a remote source when your device has an active internet connection. This content is general travel information — not personal data — and is stored locally on your device after download. No personal information is included in or attached to these requests.
        </Section>

        <Section title="5. Premium Features & In-App Purchases">
          LakbayPH offers an optional one-time Premium upgrade (LakbayPH Premium) that unlocks additional features including unlimited trips, the Lakbay Assistant, Memories Slideshow, and trip cover photos.{'\n\n'}
          All purchases are processed by Apple App Store or Google Play. By completing a purchase, you agree to their respective terms of service. Payments are final and non-refundable except where required by applicable law or the platform's own refund policy.{'\n\n'}
          The Premium upgrade is a one-time, non-consumable purchase — you pay once and it is yours forever, including all future feature updates included in the Premium tier. You can restore your purchase at any time using the "Restore Purchases" option in the app if you reinstall or switch devices.{'\n\n'}
          Purchase processing is handled by RevenueCat. LakbayPH does not process or store any payment or billing information.
        </Section>

        <Section title="6. Accuracy of Information">
          The destination information, place details, and travel tips provided in LakbayPH are for general reference only. We do not guarantee the accuracy, completeness, or timeliness of this information. Always verify details with official sources before traveling.
        </Section>

        <Section title="7. Third-Party Links">
          LakbayPH may open external services such as your email app or a web browser when you choose to send feedback or visit legal pages. Those services are governed by their own terms and privacy policies.
        </Section>

        <Section title="8. Intellectual Property">
          All content within LakbayPH — including design, text, icons, and graphics — is the property of LakbayPH and may not be copied, modified, or redistributed without permission.
        </Section>

        <Section title="9. Disclaimer of Warranties">
          LakbayPH is provided "as is" without warranties of any kind. We do not guarantee that the app will be error-free or uninterrupted. Use of the app is at your own risk.
        </Section>

        <Section title="10. Limitation of Liability">
          To the fullest extent permitted by law, LakbayPH shall not be liable for any direct, indirect, or incidental damages arising from your use of the app, including any travel decisions made based on information within the app.
        </Section>

        <Section title="11. Changes to Terms">
          We may update these Terms from time to time. Continued use of the app after changes are posted constitutes your acceptance of the revised Terms.
        </Section>

        <Section title="12. Contact">
          If you have questions about these Terms, please contact us at: lakbayph.app@gmail.com
        </Section>
      </ScrollView>
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
  backBtn: { width: s(36), height: s(36), alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: s(18), fontFamily: Fonts.bold, color: Colors.white,
  },

  content: { padding: s(20), paddingBottom: s(48) },

  lastUpdated: {
    fontSize: s(12), fontFamily: Fonts.regular,
    color: Colors.textSecondary, marginBottom: s(12),
  },
  intro: {
    fontSize: s(14), fontFamily: Fonts.regular,
    color: Colors.textPrimary, lineHeight: s(22),
    marginBottom: s(20),
  },

  section: {
    backgroundColor: Colors.white, borderRadius: s(14),
    padding: s(16), marginBottom: s(10),
    borderWidth: 1, borderColor: Colors.border + '60',
    shadowColor: '#000', shadowOffset: { width: 0, height: s(1) },
    shadowOpacity: 0.04, shadowRadius: s(4), elevation: 1,
  },
  sectionTitle: {
    fontSize: s(13), fontFamily: Fonts.bold,
    color: Colors.primary, marginBottom: s(8),
  },
  sectionBody: {
    fontSize: s(13), fontFamily: Fonts.regular,
    color: Colors.textSecondary, lineHeight: s(20),
  },
});
