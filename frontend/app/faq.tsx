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

const FAQ_DATA = [
  {
    question: 'What is Dolaglobo Finance?',
    answer: 'A Money Market Fund (MMF) for safe, low-risk savings. Your money is invested in government securities and corporate bonds to generate competitive returns.',
  },
  {
    question: 'How do I invest?',
    answer: 'Pay via M-Pesa Paybill 4114517, use your phone number as the account number. Minimum investment is KES 50.',
  },
  {
    question: 'How is interest calculated?',
    answer: 'Interest is earned daily at 15% per annum. Your earnings are automatically added to your balance each day.',
  },
  {
    question: 'How do I withdraw?',
    answer: 'Withdraw anytime to your M-Pesa number. Minimum withdrawal is KES 50. Funds are sent instantly to your registered M-Pesa number.',
  },
  {
    question: 'Is my money safe?',
    answer: 'Money Market Funds are low risk investments, but returns are not guaranteed. Your capital is invested in low-risk government securities and corporate bonds.',
  },
  {
    question: 'What are the fees?',
    answer: 'There are no deposit fees. The fund management fee is already factored into the returns you see.',
  },
  {
    question: 'How do I contact support?',
    answer: 'For support, call our helpline at 0800 723 456 or email support@dolaglobo.co.ke',
  },
];

export default function FAQScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Help & FAQ</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.introCard}>
          <Ionicons name="help-circle" size={32} color={COLORS.primary} />
          <Text style={styles.introText}>
            Find answers to frequently asked questions about Dolaglobo Finance MMF.
          </Text>
        </View>

        {FAQ_DATA.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <View style={styles.questionRow}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
              <Text style={styles.question}>{item.question}</Text>
            </View>
            <Text style={styles.answer}>{item.answer}</Text>
          </View>
        ))}

        <View style={styles.contactCard}>
          <Ionicons name="call" size={24} color={COLORS.surface} />
          <View style={styles.contactText}>
            <Text style={styles.contactTitle}>Need more help?</Text>
            <Text style={styles.contactInfo}>Call us: 0800 723 456</Text>
          </View>
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
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  introText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.md,
    lineHeight: 20,
  },
  faqItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  question: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  answer: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: SPACING.sm,
    paddingLeft: SPACING.lg,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  contactText: {
    marginLeft: SPACING.md,
  },
  contactTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.surface,
  },
  contactInfo: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
