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
import { getPendingVerifications, verifyDeposit, Transaction } from '@/src/utils/adminApi';
import { useAdminStore } from '@/src/store/adminStore';

export default function AdminVerifications() {
  const { admin } = useAdminStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const canVerify = admin?.role === 'transaction_manager' || admin?.role === 'super_admin';

  const fetchPendingVerifications = async () => {
    try {
      const data = await getPendingVerifications(1, 50);
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch pending verifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingVerifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingVerifications();
  }, []);

  const handleVerify = async (approve: boolean) => {
    if (!selectedTransaction) return;
    
    setProcessing(true);
    try {
      await verifyDeposit(selectedTransaction.id, approve, note);
      setShowModal(false);
      setSelectedTransaction(null);
      setNote('');
      fetchPendingVerifications();
    } catch (error) {
      console.error('Failed to verify transaction:', error);
    } finally {
      setProcessing(false);
    }
  };

  const openVerifyModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setNote('');
    setShowModal(true);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionHeader}>
        <View style={styles.typeIcon}>
          <Ionicons name="arrow-down" size={24} color="#4CAF50" />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
          <Text style={styles.transactionDate}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
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
          <Text style={styles.detailLabel}>Current Balance:</Text>
          <Text style={styles.detailValue}>{formatKES(item.account_balance)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Description:</Text>
          <Text style={styles.detailValue}>{item.description}</Text>
        </View>
      </View>

      {canVerify && (
        <View style={styles.actionButtons}>
          <Pressable
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setSelectedTransaction(item);
              setNote('');
              setShowModal(true);
            }}
          >
            <Ionicons name="close-circle" size={18} color="#F44336" />
            <Text style={styles.rejectButtonText}>Reject</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => openVerifyModal(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.approveButtonText}>Approve</Text>
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
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Pending Deposit Verifications</Text>
          <Text style={styles.headerSubtitle}>
            {transactions.length} deposit{transactions.length !== 1 ? 's' : ''} awaiting verification
          </Text>
        </View>
      </View>

      {!canVerify && (
        <View style={styles.warningBanner}>
          <Ionicons name="information-circle" size={20} color="#FF9800" />
          <Text style={styles.warningText}>
            Only Transaction Managers and Super Admins can verify deposits
          </Text>
        </View>
      )}

      {/* Transactions List */}
      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={64} color={COLORS.success} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No pending verifications at the moment</Text>
          </View>
        }
      />

      {/* Verification Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Deposit</Text>
            
            {selectedTransaction && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalCustomer}>{selectedTransaction.customer_name}</Text>
                <Text style={styles.modalAmount}>{formatKES(selectedTransaction.amount)}</Text>
                <Text style={styles.modalPhone}>{selectedTransaction.customer_phone}</Text>
              </View>
            )}

            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>Add Note (Optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Enter verification note..."
                placeholderTextColor={COLORS.textLight}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
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
                onPress={() => handleVerify(false)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#F44336" />
                ) : (
                  <>
                    <Ionicons name="close" size={18} color="#F44336" />
                    <Text style={styles.modalRejectText}>Reject</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalApproveButton]}
                onPress={() => handleVerify(true)}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.modalApproveText}>Approve</Text>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: '#E65100',
    marginLeft: SPACING.sm,
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
    backgroundColor: '#E8F5E9',
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
    color: '#4CAF50',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
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
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalInfo: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.lg,
  },
  modalCustomer: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalAmount: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: '#4CAF50',
    marginVertical: SPACING.xs,
  },
  modalPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  noteContainer: {
    marginBottom: SPACING.lg,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
    marginLeft: 4,
  },
  modalApproveButton: {
    backgroundColor: '#4CAF50',
  },
  modalApproveText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});
