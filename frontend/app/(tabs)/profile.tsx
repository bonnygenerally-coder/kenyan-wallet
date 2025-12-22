import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '@/src/constants/theme';
import { useAuthStore } from '@/src/store/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={COLORS.primary} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userPhone}>{user?.phone || 'No phone'}</Text>
          </View>
        </View>

        {/* M-Pesa Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deposit Instructions</Text>
          <View style={styles.mpesaCard}>
            <View style={styles.mpesaRow}>
              <Text style={styles.mpesaLabel}>Paybill Number</Text>
              <Text style={styles.mpesaValue}>4114517</Text>
            </View>
            <View style={styles.mpesaDivider} />
            <View style={styles.mpesaRow}>
              <Text style={styles.mpesaLabel}>Account Number</Text>
              <Text style={styles.mpesaValue}>{user?.phone || 'Your Phone'}</Text>
            </View>
          </View>
        </View>

        {/* Fund Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fund Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Annual Return Rate" value="15% p.a." />
            <InfoRow label="Minimum Deposit" value="KES 50" />
            <InfoRow label="Minimum Withdrawal" value="KES 50" />
            <InfoRow label="Withdrawal Time" value="Instant to M-Pesa" />
          </View>
        </View>

        {/* Regulatory Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Regulatory Information</Text>
          <View style={styles.regulatoryCard}>
            <Ionicons name="shield-checkmark" size={32} color={COLORS.primary} />
            <View style={styles.regulatoryText}>
              <Text style={styles.regulatoryTitle}>CMA Regulated</Text>
              <Text style={styles.regulatoryDescription}>
                Dolaglobo Finance is licensed and regulated by the Capital Markets
                Authority of Kenya. Your investment is protected under CMA guidelines.
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="help-circle"
              label="Help & FAQ"
              onPress={() => Alert.alert('Help', 'For support, call 0800 723 456')}
            />
            <MenuItem
              icon="document-text"
              label="Terms & Conditions"
              onPress={() => Alert.alert('Terms', 'Visit our website for full terms')}
            />
            <MenuItem
              icon="lock-closed"
              label="Privacy Policy"
              onPress={() => Alert.alert('Privacy', 'Visit our website for privacy policy')}
            />
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Your capital is at risk. Past performance is not a guarantee of future
          returns. Dolaglobo Finance MMF is regulated by the Capital Markets Authority.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={COLORS.textSecondary} />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  userPhone: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  mpesaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
  },
  mpesaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  mpesaDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  mpesaLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
  },
  mpesaValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  regulatoryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
  },
  regulatoryText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  regulatoryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  regulatoryDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  logoutText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
    marginLeft: SPACING.sm,
  },
  disclaimer: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
});
