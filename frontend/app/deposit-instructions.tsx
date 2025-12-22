import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { confirmDeposit } from '@/src/utils/api';

export default function DepositInstructionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transactionId: string;
    amount: string;
    paybill: string;
    accountNumber: string;
  }>();
  const [confirming, setConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      await confirmDeposit(params.transactionId!);
      setShowSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.detail || 'Failed to confirm deposit';
      setError(message);
    } finally {
      setConfirming(false);
    }
  };

  const handleSuccessDismiss = () => {
    setShowSuccess(false);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>M-Pesa Instructions</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Amount to Deposit</Text>
          <Text style={styles.amountValue}>
            {formatKES(parseFloat(params.amount || '0'))}
          </Text>
        </View>

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Follow these steps:</Text>

          <Step number={1} text="Go to M-Pesa on your phone" />
          <Step number={2} text="Select 'Lipa na M-Pesa'" />
          <Step number={3} text="Select 'Pay Bill'" />
          <Step
            number={4}
            text={`Enter Business Number: ${params.paybill}`}
          />
          <Step
            number={5}
            text={`Enter Account Number: ${params.accountNumber}`}
          />
          <Step
            number={6}
            text={`Enter Amount: ${formatKES(parseFloat(params.amount || '0'))}`}
          />
          <Step number={7} text="Enter your M-Pesa PIN and confirm" />
        </View>

        <View style={styles.warningCard}>
          <Ionicons name="alert-circle" size={24} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Make sure to use your phone number ({params.accountNumber}) as the account
            number for proper identification.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            confirming && styles.confirmButtonDisabled,
            pressed && styles.confirmButtonPressed
          ]}
          onPress={handleConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.surface} />
              <Text style={styles.confirmButtonText}>I've Made the Payment</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.footerNote}>
          Click above after completing the M-Pesa payment to credit your account
          (Demo: Payment is simulated)
        </Text>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessDismiss}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            </View>
            <Text style={styles.modalTitle}>Deposit Successful!</Text>
            <Text style={styles.modalAmount}>
              {formatKES(parseFloat(params.amount || '0'))}
            </Text>
            <Text style={styles.modalMessage}>
              has been credited to your account
            </Text>
            <Pressable
              style={styles.modalButton}
              onPress={handleSuccessDismiss}
            >
              <Text style={styles.modalButtonText}>Go to Dashboard</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Step({
  number,
  text,
}: {
  number: number;
  text: string;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
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
  amountCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  amountValue: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    color: COLORS.surface,
    marginTop: SPACING.xs,
  },
  instructionsCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  instructionsTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '700',
    color: COLORS.surface,
  },
  stepText: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: SPACING.md,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBE6',
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  errorText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonPressed: {
    opacity: 0.9,
  },
  confirmButtonText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.surface,
    marginLeft: SPACING.sm,
  },
  footerNote: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIcon: {
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.success,
    marginTop: SPACING.sm,
  },
  modalMessage: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.surface,
  },
});
