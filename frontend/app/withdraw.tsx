import React, { useState, useEffect } from 'react';
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
import { createWithdrawal, getAccount } from '@/src/utils/api';

export default function WithdrawScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const account = await getAccount();
        setBalance(account.balance);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    };
    fetchBalance();
  }, []);

  const handleWithdraw = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50) {
      Alert.alert('Error', 'Minimum withdrawal is KES 50');
      return;
    }
    if (numAmount > balance) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setLoading(true);
    try {
      const response = await createWithdrawal(numAmount);
      Alert.alert(
        'Success',
        response.message,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to process withdrawal';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawAll = () => {
    if (balance >= 50) {
      setAmount(balance.toString());
    }
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
          <Text style={styles.title}>Withdraw</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>{formatKES(balance)}</Text>
          </View>

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

          <TouchableOpacity style={styles.withdrawAllButton} onPress={handleWithdrawAll}>
            <Text style={styles.withdrawAllText}>Withdraw All</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Ionicons name="flash" size={24} color={COLORS.success} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Instant to M-Pesa</Text>
              <Text style={styles.infoText}>
                Your withdrawal will be sent directly to your registered M-Pesa number.
                Minimum withdrawal is KES 50.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.withdrawButton, loading && styles.withdrawButtonDisabled]}
            onPress={handleWithdraw}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <>
                <Ionicons name="arrow-up" size={20} color={COLORS.surface} />
                <Text style={styles.withdrawButtonText}>
                  Withdraw {amount ? formatKES(parseFloat(amount) || 0) : ''}
                </Text>
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
  balanceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  balanceValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xs,
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
    marginBottom: SPACING.md,
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
  withdrawAllButton: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.lg,
  },
  withdrawAllText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    paddingVertical: SPACING.md,
  },
  withdrawButtonDisabled: {
    opacity: 0.7,
  },
  withdrawButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: SPACING.sm,
  },
});
