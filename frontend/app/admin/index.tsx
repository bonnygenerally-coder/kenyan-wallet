import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS as COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { getDashboardStats, DashboardStats } from '@/src/utils/adminApi';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 768;

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Stats Cards Row 1 */}
      <View style={styles.statsRow}>
        <StatCard
          title="Total AUM"
          value={formatKES(stats?.total_aum || 0)}
          icon="wallet"
          color="#4CAF50"
          subtitle="Assets Under Management"
        />
        <StatCard
          title="Total Customers"
          value={stats?.total_customers?.toString() || '0'}
          icon="people"
          color="#2196F3"
          subtitle={`${stats?.active_customers || 0} active`}
        />
      </View>

      {/* Stats Cards Row 2 */}
      <View style={styles.statsRow}>
        <StatCard
          title="Pending Transactions"
          value={stats?.pending_transactions?.toString() || '0'}
          icon="time"
          color="#FF9800"
          subtitle="Awaiting processing"
        />
        <StatCard
          title="Interest Paid"
          value={formatKES(stats?.total_interest_paid || 0)}
          icon="trending-up"
          color="#9C27B0"
          subtitle="Total distributed"
        />
      </View>

      {/* Today's Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.activityCard}>
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="arrow-down" size={20} color="#4CAF50" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityLabel}>Deposits</Text>
              <Text style={styles.activityValue}>{formatKES(stats?.daily_deposits || 0)}</Text>
            </View>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="arrow-up" size={20} color="#F44336" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityLabel}>Withdrawals</Text>
              <Text style={styles.activityValue}>{formatKES(stats?.daily_withdrawals || 0)}</Text>
            </View>
          </View>
          <View style={styles.activityDivider} />
          <View style={styles.activityItem}>
            <View style={[styles.activityIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="swap-horizontal" size={20} color="#2196F3" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityLabel}>Net Flow</Text>
              <Text style={[styles.activityValue, { 
                color: (stats?.daily_deposits || 0) >= (stats?.daily_withdrawals || 0) ? '#4CAF50' : '#F44336' 
              }]}>
                {formatKES((stats?.daily_deposits || 0) - (stats?.daily_withdrawals || 0))}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fund Information</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Annual Interest Rate" value="15% p.a." />
          <InfoRow label="Daily Rate" value="0.0411%" />
          <InfoRow label="Minimum Deposit" value="KES 50" />
          <InfoRow label="Minimum Withdrawal" value="KES 50" />
          <InfoRow label="Paybill Number" value="4114517" highlight />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ title, value, icon, color, subtitle }: {
  title: string;
  value: string;
  icon: string;
  color: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statHeader}>
        <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    marginBottom: SPACING.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    marginRight: isSmallScreen ? 0 : SPACING.md,
    marginBottom: isSmallScreen ? SPACING.md : 0,
  },
  statHeader: {
    marginBottom: SPACING.md,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.text,
  },
  statTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: isSmallScreen ? 'column' : 'row',
  },
  activityItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  activityContent: {
    flex: 1,
  },
  activityLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  activityValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  activityDivider: {
    width: isSmallScreen ? '100%' : 1,
    height: isSmallScreen ? 1 : '100%',
    backgroundColor: COLORS.border,
    marginVertical: isSmallScreen ? SPACING.sm : 0,
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
  infoValueHighlight: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
  },
});
