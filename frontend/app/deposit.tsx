import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { createDeposit } from '@/src/utils/api';

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function DepositScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      Alert.alert('Error', 'Minimum deposit is KES 50');
      return;
    }

    setLoading(true);
    try {
      const response = await createDeposit(numAmount);
      router.push({
        pathname: '/deposit-instructions',
        params: {
          transactionId: response.transaction_id,
          amount: response.amount.toString(),
          paybill: response.paybill,
          accountNumber: response.account_number,
        },
      });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to create deposit';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const selectQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Deposit</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Enter Amount (KES)</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.currency}>KES</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <Text style={styles.quickLabel}>Quick Select</Text>
          <View style={styles.quickAmounts}>
            {QUICK_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.quickButton,
                  amount === value.toString() && styles.quickButtonActive,
                ]}
                onPress={() => selectQuickAmount(value)}
              >
                <Text
                  style={[
                    styles.quickButtonText,
                    amount === value.toString() && styles.quickButtonTextActive,
                  ]}
                >
                  {formatKES(value)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color={COLORS.secondary} />
            <Text style={styles.infoText}>
              Minimum deposit is KES 50. Funds will be credited to your account
              immediately after M-Pesa confirmation.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.depositButton, loading && styles.depositButtonDisabled]}
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name="wallet" size={20} color={COLORS.surface} />
                <Text style={styles.depositButtonText}>Continue to M-Pesa</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
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
    flex: 1,
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  currency: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  amountInput: {
    flex: 1,
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    color: COLORS.text,
  },
  quickLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SPACING.lg,
  },
  quickButton: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickButtonActive: {
    backgroundColor: COLORS.primary,
  },
  quickButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  quickButtonTextActive: {
    color: COLORS.surface,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  depositButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  depositButtonDisabled: {
    opacity: 0.7,
  },
  depositButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: SPACING.sm,
  },
});
