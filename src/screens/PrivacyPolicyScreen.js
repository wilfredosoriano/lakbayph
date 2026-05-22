import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export default function PrivacyPolicyScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[styles.header, { paddingTop: insets.top + s(10) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={s(22)} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: s(36) }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.lastUpdated}>Last updated: May 2026</Text>

        <Text style={styles.intro}>
          LakbayPH respects your privacy. This policy explains what information we handle, what is fetched from the internet, and how we protect it.
        </Text>

        <Section title="1. Information We Collect">
          LakbayPH does not collect any personally identifiable information. All data you enter — trips, budgets, expenses, activity notes, locations, and preferences — is stored only on your device using local storage (SQLite). This personal data is never sent to our servers.
        </Section>

        <Section title="2. Nickname">
          The nickname you set in the More screen is stored locally on your device and is used only to personalize your in-app experience. It is never shared or transmitted.
        </Section>

        <Section title="3. Photo Library Access">
          LakbayPH requests access to your photo library only when you choose to attach a photo to an activity or trip. Selected photos are stored locally on your device and are never uploaded or transmitted. You can decline this permission at any time in your device settings.
        </Section>

        <Section title="4. Destination Content Updates">
          To keep place information up to date without requiring a full app update, LakbayPH periodically fetches a small content file from a remote server when your device is connected to the internet. This file contains general travel information such as new place listings, entrance fees, and travel tips. It contains no personal data and no user identifiers. The content is stored locally on your device after download and is accessible offline. You can use the app fully without an internet connection — the content update is a background enhancement only.
        </Section>

        <Section title="5. In-App Purchases">
          LakbayPH offers an optional one-time Premium upgrade processed through Apple App Store or Google Play. Payments are handled entirely by Apple or Google — LakbayPH never sees or stores your payment information.{'\n\n'}
          We use RevenueCat (revenuecat.com) to manage purchase validation and entitlements. RevenueCat may collect your device's anonymous app user ID and purchase receipt data solely to verify your Premium status. No personally identifiable information is shared with RevenueCat. You can review RevenueCat's privacy policy at revenuecat.com/privacy.{'\n\n'}
          All in-app purchase data is used exclusively to grant or verify your Premium access within LakbayPH.
        </Section>

        <Section title="6. External Links">
          If you choose to open feedback email or legal pages from LakbayPH, those actions are handled by your device's browser or mail app. LakbayPH does not collect or store that activity.
        </Section>

        <Section title="7. Feedback">
          If you choose to send feedback through the app, your message is sent directly via your device's mail app to the developer's email address. We do not intercept or store this email. It is subject to your email provider's privacy policy.
        </Section>

        <Section title="8. Analytics & Tracking">
          LakbayPH does not use any analytics services, crash reporting tools, or advertising SDKs. We do not monitor how you use the app. The only third-party SDK we use is RevenueCat, which is limited strictly to purchase validation as described in Section 5.
        </Section>

        <Section title="9. Children's Privacy">
          LakbayPH does not knowingly collect data from children under 13. All personal data stays on the device and is never transmitted. The app poses no data privacy risk to young users.
        </Section>

        <Section title="10. Data Security">
          Your personal data is stored locally on your device and is as secure as your device itself. We recommend keeping your device protected with a lock screen. Content fetched from the internet (place data) is general public information and contains no sensitive data.
        </Section>

        <Section title="11. Changes to This Policy">
          We may update this Privacy Policy from time to time. Any changes will be reflected in the "Last updated" date above. Continued use of the app after changes are posted means you accept the updated policy.
        </Section>

        <Section title="12. Contact Us">
          If you have any questions or concerns about this Privacy Policy, please reach out at: lakbayph.app@gmail.com
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
