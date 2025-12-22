import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { getAccount, calculateInterest, Account } from '@/src/utils/api';
import { useAuthStore } from '@/src/store/authStore';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calculatingInterest, setCalculatingInterest] = useState(false);

  const fetchAccount = async () => {
    try {
      const data = await getAccount();
      setAccount(data);
    } catch (error) {
      console.error('Failed to fetch account:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAccount();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAccount();
  }, []);

  const handleCalculateInterest = async () => {
    if (!account || account.balance <= 0) {
      Alert.alert('No Balance', 'You need a balance to earn interest. Make a deposit first!');
      return;
    }
    setCalculatingInterest(true);
    try {
      const result = await calculateInterest();
      Alert.alert(
        'Interest Credited',
        `${formatKES(result.interest)} has been added to your balance!`
      );
      fetchAccount();
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate interest');
    } finally {
      setCalculatingInterest(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Investor'}</Text>
            <Text style={styles.welcomeText}>Welcome to Dolaglobo Finance</Text>
          </View>
          <View style={styles.cmaTag}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
            <Text style={styles.cmaText}>CMA Regulated</Text>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatKES(account?.balance || 0)}
          </Text>
          <View style={styles.yieldContainer}>
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>Daily Interest</Text>
              <Text style={styles.yieldValue}>
                +{formatKES(account?.daily_interest || 0)}
              </Text>
            </View>
            <View style={styles.yieldDivider} />
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>Est. Annual Yield</Text>
              <Text style={styles.yieldValue}>
                {formatKES(account?.estimated_annual_yield || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Interest Info */}
        <View style={styles.interestInfo}>
          <Ionicons name="trending-up" size={20} color={COLORS.primary} />
          <Text style={styles.interestText}>
            Earning <Text style={styles.interestRate}>15% p.a.</Text> daily interest
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/deposit')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary }]}>
              <Ionicons name="add" size={28} color={COLORS.surface} />
            </View>
            <Text style={styles.actionText}>Deposit</Text>
            <Text style={styles.actionSubtext}>via M-Pesa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/withdraw')}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary }]}>
              <Ionicons name="arrow-up" size={28} color={COLORS.surface} />
            </View>
            <Text style={styles.actionText}>Withdraw</Text>
            <Text style={styles.actionSubtext}>to M-Pesa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCalculateInterest}
            disabled={calculatingInterest}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent }]}>
              {calculatingInterest ? (
                <ActivityIndicator size="small" color={COLORS.surface} />
              ) : (
                <Ionicons name="sparkles" size={28} color={COLORS.surface} />
              )}
            </View>
            <Text style={styles.actionText}>Earn</Text>
            <Text style={styles.actionSubtext}>Interest</Text>
          </TouchableOpacity>
        </View>

        {/* Total Interest Earned */}
        {account && account.total_interest_earned > 0 && (
          <View style={styles.totalInterestCard}>
            <Ionicons name="gift" size={24} color={COLORS.primary} />
            <View style={styles.totalInterestText}>
              <Text style={styles.totalInterestLabel}>Total Interest Earned</Text>
              <Text style={styles.totalInterestValue}>
                {formatKES(account.total_interest_earned)}
              </Text>
            </View>
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Why Dolaglobo?</Text>
          
          <View style={styles.infoCard}>
            <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Capital Safety</Text>
              <Text style={styles.infoDescription}>
                Your money is invested in low-risk government securities and corporate bonds
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="flash" size={24} color={COLORS.warning} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Fast Access</Text>
              <Text style={styles.infoDescription}>
                Withdraw to M-Pesa within minutes, anytime you need your money
              </Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="calendar" size={24} color={COLORS.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Daily Interest</Text>
              <Text style={styles.infoDescription}>
                Watch your money grow every day with competitive 15% annual returns
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  greeting: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  welcomeText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  cmaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
  },
  cmaText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: FONT_SIZES.hero,
    fontWeight: '700',
    color: COLORS.surface,
    marginBottom: SPACING.md,
  },
  yieldContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: SPACING.md,
  },
  yieldItem: {
    flex: 1,
    alignItems: 'center',
  },
  yieldDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  yieldLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  yieldValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.surface,
  },
  interestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  interestText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  interestRate: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  actionSubtext: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  totalInterestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  totalInterestText: {
    marginLeft: SPACING.md,
  },
  totalInterestLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  totalInterestValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoSection: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  infoContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  infoTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
