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
  getPendingWithdrawals, 
  approveWithdrawal,
  rejectWithdrawal,
  reverseWithdrawal,
  getTransactions,
  Transaction
} from '@/src/utils/adminApi';
import { useAdminStore } from '@/src/store/adminStore';

export default function AdminWithdrawals() {
  const { admin } = useAdminStore();
  const [pendingWithdrawals, setPendingWithdrawals] = useState<Transaction[]>([]);
  const [completedWithdrawals, setCompletedWithdrawals] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showReverseModal, setShowReverseModal] = useState(false);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');

  const canProcess = admin?.role === 'transaction_manager' || admin?.role === 'super_admin';
  const isSuperAdmin = admin?.role === 'super_admin';

  const fetchWithdrawals = async () => {
    try {
      const [pending, all] = await Promise.all([
        getPendingWithdrawals(1, 50),
        getTransactions(1, 100, undefined, 'withdrawal')
      ]);
      setPendingWithdrawals(pending.transactions);
      // Get completed withdrawals for reversal
      setCompletedWithdrawals(
        all.transactions.filter((t: Transaction) => t.status === 'completed' && t.type === 'withdrawal')
      );
    } catch (error) {
      console.error('Failed to fetch withdrawals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWithdrawals();
  }, []);

  const handleApprove = async () => {
    if (!selectedTransaction) return;
    setProcessing(true);
    try {
      await approveWithdrawal(selectedTransaction.id, note || undefined);
      setShowModal(false);
      setSelectedTransaction(null);
      setNote('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Failed to approve withdrawal:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTransaction) return;
    setProcessing(true);
    try {
      await rejectWithdrawal(selectedTransaction.id, note || 'Withdrawal rejected');
      setShowModal(false);
      setSelectedTransaction(null);
      setNote('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Failed to reject withdrawal:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReverse = async () => {
    if (!selectedTransaction || !reason) return;
    setProcessing(true);
    try {
      await reverseWithdrawal(selectedTransaction.id, reason);
      setShowReverseModal(false);
      setSelectedTransaction(null);
      setReason('');
      fetchWithdrawals();
    } catch (error) {
      console.error('Failed to reverse withdrawal:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openApproveModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setNote('');
    setShowModal(true);
  };

  const openReverseModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setReason('');
    setShowReverseModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderPendingItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.typeIcon}>
          <Ionicons name="arrow-up" size={24} color="#F44336" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>{formatKES(item.amount)}</Text>
          <View style={styles.statusBadge}>
            <Ionicons name="time" size={12} color="#FF9800" />
            <Text style={styles.statusText}>Pending</Text>
          </View>
        </View>
      </View>

      <View style={styles.transactionDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>M-Pesa Number:</Text>
          <Text style={styles.detailValue}>{item.mpesa_number || item.customer_phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Account Balance:</Text>
          <Text style={styles.detailValue}>{formatKES(item.account_balance)}</Text>
        </View>
      </View>

      {canProcess && (
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => openApproveModal(item)}
          >
            <Ionicons name="close-circle" size={18} color="#F44336" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => openApproveModal(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve & Send</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderCompletedItem = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={[styles.typeIcon, { backgroundColor: '#E8F5E9' }]}>
          <Ionicons name="checkmark" size={24} color="#4CAF50" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amount, { color: '#F44336' }]}>-{formatKES(item.amount)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
            <Text style={[styles.statusText, { color: '#4CAF50' }]}>Completed</Text>
          </View>
        </View>
      </View>

      {isSuperAdmin && (
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.reverseButton]}
            onPress={() => openReverseModal(item)}
          >
            <Ionicons name="refresh" size={18} color={COLORS.primary} />
            <Text style={styles.reverseButtonText}>Reverse Withdrawal</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="arrow-up-circle" size={24} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Withdrawal Management</Text>
          <Text style={styles.headerSubtitle}>
            {pendingWithdrawals.length} pending • {completedWithdrawals.length} completed
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Pending ({pendingWithdrawals.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'completed' && styles.tabActive]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed ({completedWithdrawals.length})
          </Text>
        </Pressable>
      </View>

      {/* List */}
      <FlatList
        data={activeTab === 'pending' ? pendingWithdrawals : completedWithdrawals}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === 'pending' ? renderPendingItem : renderCompletedItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={activeTab === 'pending' ? "checkmark-done-circle" : "folder-open-outline"} 
              size={48} 
              color={COLORS.textLight} 
            />
            <Text style={styles.emptyText}>
              {activeTab === 'pending' ? 'No pending withdrawals' : 'No completed withdrawals'}
            </Text>
          </View>
        }
      />

      {/* Approve/Reject Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Process Withdrawal</Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalCustomer}>{selectedTransaction.customer_name}</Text>
                <Text style={styles.modalAmount}>{formatKES(selectedTransaction.amount)}</Text>
                <Text style={styles.modalPhone}>
                  to M-Pesa {selectedTransaction.mpesa_number || selectedTransaction.customer_phone}
                </Text>
              </View>
            )}

            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Note (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note..."
                placeholderTextColor={COLORS.textLight}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#F44336" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalApproveButton]}
                onPress={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalApproveText}>Approve</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reverse Modal */}
      <Modal
        visible={showReverseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReverseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={48} color="#FF9800" />
            </View>
            <Text style={styles.modalTitle}>Reverse Withdrawal</Text>
            <Text style={styles.modalWarning}>
              This will return the funds to the customer's account
            </Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalCustomer}>{selectedTransaction.customer_name}</Text>
                <Text style={styles.modalAmount}>{formatKES(selectedTransaction.amount)}</Text>
              </View>
            )}

            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Reason for Reversal (Required)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g., M-Pesa transaction failed"
                placeholderTextColor={COLORS.textLight}
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowReverseModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalReverseButton]}
                onPress={handleReverse}
                disabled={processing || !reason.trim()}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.modalReverseText}>Reverse</Text>
                  </>
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
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    padding: SPACING.md,
  },
  transactionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  customerPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  transactionDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: '#FF9800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    color: '#FF9800',
    marginLeft: 4,
    fontWeight: '600',
  },
  transactionDetails: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: SPACING.xs,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  reverseButton: {
    backgroundColor: `${COLORS.primary}15`,
  },
  reverseButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: SPACING.xs,
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
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  modalWarning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  modalInfo: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  modalCustomer: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.primary,
    marginVertical: SPACING.xs,
  },
  modalPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  noteContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  noteLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  noteInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  modalCancelButton: {
    backgroundColor: COLORS.background,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalRejectButton: {
    backgroundColor: '#FFEBEE',
  },
  modalRejectText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#F44336',
  },
  modalApproveButton: {
    backgroundColor: '#4CAF50',
  },
  modalApproveText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalReverseButton: {
    backgroundColor: COLORS.primary,
    flex: 2,
  },
  modalReverseText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
});
