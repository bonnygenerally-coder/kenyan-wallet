import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS as COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { 
  getCustomers, 
  distributeInterestToAll, 
  distributeInterestToCustomer,
  getDashboardStats,
  Customer,
  DashboardStats
} from '@/src/utils/adminApi';
import { useAdminStore } from '@/src/store/adminStore';

const ANNUAL_RATE = 0.15; // 15% p.a.
const DAILY_RATE = ANNUAL_RATE / 365;

export default function AdminInterest() {
  const { admin } = useAdminStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [result, setResult] = useState<any>(null);

  const isSuperAdmin = admin?.role === 'super_admin';

  const fetchData = async () => {
    try {
      const [statsData, customersData] = await Promise.all([
        getDashboardStats(),
        getCustomers(1, 100)
      ]);
      setStats(statsData);
      setCustomers(customersData.customers.filter((c: Customer) => c.balance > 0));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const handleDistributeAll = async () => {
    setDistributing(true);
    try {
      const res = await distributeInterestToAll();
      setResult(res);
      setShowConfirmModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to distribute interest:', error);
      setResult({ error: error.response?.data?.detail || 'Failed to distribute interest' });
    } finally {
      setDistributing(false);
    }
  };

  const handleDistributeToCustomer = async (customer: Customer) => {
    setDistributing(true);
    try {
      const res = await distributeInterestToCustomer(customer.id);
      setResult(res);
      setSelectedCustomer(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to distribute interest:', error);
      setResult({ error: error.response?.data?.detail || 'Failed to distribute interest' });
    } finally {
      setDistributing(false);
    }
  };

  const estimatedTotalInterest = customers.reduce((sum, c) => sum + (c.balance * DAILY_RATE), 0);

  const renderCustomer = ({ item }: { item: Customer }) => {
    const estimatedInterest = item.balance * DAILY_RATE;
    return (
      <View style={styles.customerCard}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </Text>
          </View>
          <View style={styles.customerDetails}>
            <Text style={styles.customerName}>{item.name}</Text>
            <Text style={styles.customerPhone}>{item.phone}</Text>
          </View>
        </View>
        <View style={styles.interestInfo}>
          <Text style={styles.balanceLabel}>Balance</Text>
          <Text style={styles.balanceValue}>{formatKES(item.balance)}</Text>
          <Text style={styles.interestLabel}>Est. Daily Interest</Text>
          <Text style={styles.interestValue}>{formatKES(estimatedInterest)}</Text>
        </View>
        <Pressable
          style={styles.distributeButton}
          onPress={() => setSelectedCustomer(item)}
          disabled={distributing}
        >
          <Ionicons name="cash" size={16} color={COLORS.primary} />
          <Text style={styles.distributeButtonText}>Pay</Text>
        </Pressable>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="trending-up" size={24} color={COLORS.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Interest Distribution</Text>
          <Text style={styles.headerSubtitle}>
            {customers.length} customer{customers.length !== 1 ? 's' : ''} eligible • {(ANNUAL_RATE * 100).toFixed(0)}% p.a.
          </Text>
        </View>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total AUM</Text>
            <Text style={styles.summaryValue}>{formatKES(stats?.total_aum || 0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Est. Daily Interest</Text>
            <Text style={styles.summaryValueHighlight}>{formatKES(estimatedTotalInterest)}</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Daily Rate</Text>
            <Text style={styles.summaryValue}>{(DAILY_RATE * 100).toFixed(4)}%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Interest Paid</Text>
            <Text style={styles.summaryValue}>{formatKES(stats?.total_interest_paid || 0)}</Text>
          </View>
        </View>

        {isSuperAdmin && (
          <Pressable
            style={styles.distributeAllButton}
            onPress={() => setShowConfirmModal(true)}
            disabled={distributing || customers.length === 0}
          >
            {distributing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.distributeAllText}>Distribute to All Customers</Text>
              </>
            )}
          </Pressable>
        )}

        {!isSuperAdmin && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Only Super Admins can distribute interest to all customers at once
            </Text>
          </View>
        )}
      </View>

      {/* Result Message */}
      {result && (
        <View style={[styles.resultCard, result.error ? styles.resultError : styles.resultSuccess]}>
          <Ionicons 
            name={result.error ? "close-circle" : "checkmark-circle"} 
            size={20} 
            color={result.error ? "#F44336" : "#4CAF50"} 
          />
          <Text style={[styles.resultText, result.error && styles.resultTextError]}>
            {result.error || result.message}
          </Text>
          {result.total_distributed && (
            <Text style={styles.resultAmount}>{formatKES(result.total_distributed)}</Text>
          )}
          <Pressable onPress={() => setResult(null)} style={styles.resultClose}>
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* Customers List */}
      <Text style={styles.sectionTitle}>Eligible Customers</Text>
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        renderItem={renderCustomer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No customers with positive balance</Text>
          </View>
        }
      />

      {/* Confirm All Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="cash" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>Distribute Interest</Text>
            <Text style={styles.modalSubtitle}>
              This will credit daily interest to {customers.length} customer(s)
            </Text>
            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoLabel}>Total Amount</Text>
              <Text style={styles.modalInfoValue}>{formatKES(estimatedTotalInterest)}</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
                disabled={distributing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={handleDistributeAll}
                disabled={distributing}
              >
                {distributing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Single Customer Modal */}
      <Modal
        visible={!!selectedCustomer}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pay Interest</Text>
            {selectedCustomer && (
              <>
                <Text style={styles.modalCustomerName}>{selectedCustomer.name}</Text>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Balance</Text>
                  <Text style={styles.modalInfoValue}>{formatKES(selectedCustomer.balance)}</Text>
                </View>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoLabel}>Interest Amount</Text>
                  <Text style={styles.modalInfoValueHighlight}>
                    {formatKES(selectedCustomer.balance * DAILY_RATE)}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setSelectedCustomer(null)}
                disabled={distributing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={() => selectedCustomer && handleDistributeToCustomer(selectedCustomer)}
                disabled={distributing}
              >
                {distributing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Pay Interest</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    margin: SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryValueHighlight: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  distributeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  distributeAllText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: 8,
  },
  resultSuccess: {
    backgroundColor: '#E8F5E9',
  },
  resultError: {
    backgroundColor: '#FFEBEE',
  },
  resultText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#4CAF50',
    marginLeft: SPACING.sm,
  },
  resultTextError: {
    color: '#F44336',
  },
  resultAmount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: '#4CAF50',
    marginRight: SPACING.sm,
  },
  resultClose: {
    padding: SPACING.xs,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  customerPhone: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  interestInfo: {
    alignItems: 'flex-end',
    marginRight: SPACING.md,
  },
  balanceLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  balanceValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  interestLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 4,
  },
  interestValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#4CAF50',
  },
  distributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  distributeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalCustomerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalInfo: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
  },
  modalInfoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalInfoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalInfoValueHighlight: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  modalConfirmText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
