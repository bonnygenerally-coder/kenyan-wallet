import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '@/src/constants/theme';

const PRIVACY_DATA = [
  {
    icon: 'person-circle',
    title: 'Information We Collect',
    items: [
      'Basic personal information (name, phone number)',
      'Transaction data (deposits, withdrawals, balances)',
      'Device information for security purposes',
      'KYC documents as required by regulation',
    ],
  },
  {
    icon: 'shield-checkmark',
    title: 'How We Use Your Data',
    items: [
      'Account management and transactions',
      'KYC and regulatory compliance',
      'Customer support and communication',
      'Fraud prevention and security',
    ],
  },
  {
    icon: 'lock-closed',
    title: 'Data Protection',
    items: [
      'We do not sell your personal data',
      'Data is encrypted and securely stored',
      'Access is restricted to authorized personnel',
      'Regular security audits are conducted',
    ],
  },
  {
    icon: 'share-social',
    title: 'Data Sharing',
    items: [
      'Data may be shared when required by law',
      'Regulatory bodies (CMA, CBK) upon request',
      'Service providers under strict agreements',
      'No sharing with third parties for marketing',
    ],
  },
  {
    icon: 'finger-print',
    title: 'Your Rights',
    items: [
      'Access your personal data',
      'Request correction of inaccurate data',
      'Request deletion (subject to legal requirements)',
      'Opt-out of marketing communications',
    ],
  },
];

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Your Privacy Matters</Text>
            <Text style={styles.introText}>
              We are committed to protecting your personal information
            </Text>
          </View>
        </View>

        {PRIVACY_DATA.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name={section.icon as any} size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.itemList}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.item}>
                  <View style={styles.bullet} />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Questions about your privacy?</Text>
          <Text style={styles.contactText}>
            Contact our Data Protection Officer at privacy@dolaglobo.co.ke
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last updated: July 2025
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  placeholder: {
    width: 44,
  },
  content: {
    padding: SPACING.md,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  introContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  introTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  introText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemList: {
    paddingLeft: 44,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: SPACING.sm,
  },
  itemText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  contactSection: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.surface,
    marginBottom: SPACING.xs,
  },
  contactText: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  footerText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
});
