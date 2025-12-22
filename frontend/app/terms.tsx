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

const TERMS_DATA = [
  {
    title: 'Eligibility',
    content: 'You must be 18 years or older with a valid Kenyan national ID or passport to use Dolaglobo Finance services.',
  },
  {
    title: 'Investment',
    content: 'All investments go into the Dolaglobo Finance Money Market Fund (MMF). The fund invests in low-risk government securities and corporate bonds.',
  },
  {
    title: 'Deposits',
    content: 'All payments must be made via M-Pesa Paybill 4114517. Use your registered phone number as the account number. Minimum deposit is KES 50.',
  },
  {
    title: 'Withdrawals',
    content: 'Withdrawals are sent to your registered M-Pesa number only. Minimum withdrawal is KES 50. Processing is instant during normal hours.',
  },
  {
    title: 'Risk Disclosure',
    content: 'Money Market Funds are low risk investments but are not risk-free. Past performance is not a guarantee of future returns. Your capital is at risk.',
  },
  {
    title: 'Account Suspension',
    content: 'Dolaglobo Finance reserves the right to suspend or terminate accounts in cases of suspected fraud, misuse, or violation of these terms.',
  },
  {
    title: 'Regulatory Compliance',
    content: 'Dolaglobo Finance is regulated by the Capital Markets Authority (CMA) of Kenya. We comply with all applicable laws and regulations.',
  },
  {
    title: 'Amendments',
    content: 'These terms may be updated from time to time. Continued use of the service constitutes acceptance of any changes.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Terms & Conditions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Ionicons name="document-text" size={32} color={COLORS.primary} />
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>Dolaglobo Finance MMF</Text>
            <Text style={styles.introText}>
              Terms and Conditions of Service
            </Text>
          </View>
        </View>

        {TERMS_DATA.map((item, index) => (
          <View key={index} style={styles.termItem}>
            <View style={styles.termHeader}>
              <View style={styles.termNumber}>
                <Text style={styles.termNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.termTitle}>{item.title}</Text>
            </View>
            <Text style={styles.termContent}>{item.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
          <Text style={styles.footerText}>
            Regulated by the Capital Markets Authority of Kenya
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
  termItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  termNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  termNumberText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '700',
    color: COLORS.surface,
  },
  termTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  termContent: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingLeft: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  footerText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
});
