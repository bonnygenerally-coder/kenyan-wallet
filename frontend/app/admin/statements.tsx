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
  getStatementRequests, 
  getStatementDetail,
  processStatementRequest,
  StatementRequest
} from '@/src/utils/adminApi';
import { useAdminStore } from '@/src/store/adminStore';

interface StatementDetail {
  request: StatementRequest;
  customer: {
    id: string;
    name: string;
    phone: string;
    current_balance: number;
    total_interest_earned: number;
  };
  summary: {
    total_deposits: number;
    total_withdrawals: number;
    total_interest: number;
    net_change: number;
    transaction_count: number;
  };
  transactions: any[];
}

export default function AdminStatements() {
  const { admin } = useAdminStore();
  const [requests, setRequests] = useState<StatementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StatementRequest | null>(null);
  const [statementDetail, setStatementDetail] = useState<StatementDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState<string | undefined>(undefined);

  const canProcess = admin?.role === 'transaction_manager' || admin?.role === 'super_admin';

  const fetchRequests = async () => {
    try {
      const data = await getStatementRequests(1, 50, filter);
      setRequests(data.requests);
    } catch (error) {
      console.error('Failed to fetch statement requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [filter]);

  const handleViewDetail = async (request: StatementRequest) => {
    setSelectedRequest(request);
    try {
      const detail = await getStatementDetail(request.id);
      setStatementDetail(detail);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch statement detail:', error);
    }
  };

  const handleAction = async (action: 'process' | 'complete' | 'send' | 'reject') => {
    if (!selectedRequest) return;
    
    setProcessing(true);
    try {
      await processStatementRequest(selectedRequest.id, action, note || undefined);
      setShowDetailModal(false);
      setSelectedRequest(null);
      setStatementDetail(null);
      setNote('');
      fetchRequests();
    } catch (error) {
      console.error('Failed to process request:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'processing': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'sent': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return COLORS.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderRequest = ({ item }: { item: StatementRequest }) => (
    <Pressable style={styles.requestCard} onPress={() => handleViewDetail(item)}>
      <View style={styles.requestHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.customer_name.split(' ').map(n => n[0]).join('').substring(0, 2)}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={styles.customerName}>{item.customer_name}</Text>
          <Text style={styles.customerPhone}>{item.customer_phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      <View style={styles.requestDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Period</Text>
          <Text style={styles.detailValue}>{item.months} Month{item.months > 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date Range</Text>
          <Text style={styles.detailValue}>
            {formatDate(item.start_date)} - {formatDate(item.end_date)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Requested</Text>
          <Text style={styles.detailValue}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      {item.email && (
        <View style={styles.emailRow}>
          <Ionicons name="mail" size={14} color={COLORS.textSecondary} />
          <Text style={styles.emailText}>{item.email}</Text>
        </View>
      )}
    </Pressable>
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
          <Ionicons name="document-text" size={24} color={COLORS.primary} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Statement Requests</Text>
          <Text style={styles.headerSubtitle}>
            {requests.length} request{requests.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {['all', 'pending', 'processing', 'sent', 'rejected'].map((f) => (
          <Pressable
            key={f}
            style={[styles.filterButton, filter === (f === 'all' ? undefined : f) && styles.filterButtonActive]}
            onPress={() => setFilter(f === 'all' ? undefined : f)}
          >
            <Text style={[
              styles.filterText,
              filter === (f === 'all' ? undefined : f) && styles.filterTextActive
            ]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Requests List */}
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={renderRequest}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No statement requests</Text>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Statement Request</Text>
              <Pressable onPress={() => {
                setShowDetailModal(false);
                setStatementDetail(null);
                setNote('');
              }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            {statementDetail ? (
              <>
                {/* Customer Info */}
                <View style={styles.customerCard}>
                  <Text style={styles.customerDetailName}>{statementDetail.customer.name}</Text>
                  <Text style={styles.customerDetailPhone}>{statementDetail.customer.phone}</Text>
                  <Text style={styles.customerBalance}>
                    Balance: {formatKES(statementDetail.customer.current_balance)}
                  </Text>
                </View>

                {/* Summary */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>
                    {statementDetail.request.months} Month Statement Summary
                  </Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Deposits</Text>
                    <Text style={[styles.summaryValue, { color: '#4CAF50' }]}>
                      +{formatKES(statementDetail.summary.total_deposits)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Withdrawals</Text>
                    <Text style={[styles.summaryValue, { color: '#F44336' }]}>
                      -{formatKES(statementDetail.summary.total_withdrawals)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Interest Earned</Text>
                    <Text style={[styles.summaryValue, { color: '#2196F3' }]}>
                      +{formatKES(statementDetail.summary.total_interest)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.summaryTotal]}>
                    <Text style={styles.summaryTotalLabel}>Net Change</Text>
                    <Text style={styles.summaryTotalValue}>
                      {formatKES(statementDetail.summary.net_change)}
                    </Text>
                  </View>
                  <Text style={styles.transactionCount}>
                    {statementDetail.summary.transaction_count} transactions
                  </Text>
                </View>

                {/* Note Input */}
                <View style={styles.noteSection}>
                  <Text style={styles.noteLabel}>Admin Note (Optional)</Text>
                  <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note for the customer..."
                    placeholderTextColor={COLORS.textLight}
                    value={note}
                    onChangeText={setNote}
                    multiline
                  />
                </View>

                {/* Actions */}
                {canProcess && selectedRequest?.status === 'pending' && (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleAction('reject')}
                      disabled={processing}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.processButton]}
                      onPress={() => handleAction('process')}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.processButtonText}>Start Processing</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {canProcess && selectedRequest?.status === 'processing' && (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleAction('complete')}
                      disabled={processing}
                    >
                      <Text style={styles.completeButtonText}>Mark Complete</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, styles.sendButton]}
                      onPress={() => handleAction('send')}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                          <Text style={styles.sendButtonText}>Send to Customer</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}

                {canProcess && selectedRequest?.status === 'completed' && (
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionButton, styles.sendButton, { flex: 1 }]}
                      onPress={() => handleAction('send')}
                      disabled={processing}
                    >
                      {processing ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#FFFFFF" />
                          <Text style={styles.sendButtonText}>Send to Customer</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                )}

                {selectedRequest?.status === 'sent' && (
                  <View style={styles.sentBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.sentText}>
                      Statement sent on {selectedRequest.sent_at ? formatDate(selectedRequest.sent_at) : 'N/A'}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginVertical: 40 }} />
            )}
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
  filters: {
    flexDirection: 'row',
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    gap: SPACING.xs,
  },
  filterButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.background,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: SPACING.md,
  },
  requestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestInfo: {
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
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
  },
  requestDetails: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginTop: 2,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  emailText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  customerCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  customerDetailName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  customerDetailPhone: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  customerBalance: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  summaryTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  summaryTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  summaryTotalLabel: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryTotalValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  transactionCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  noteSection: {
    marginBottom: SPACING.md,
  },
  noteLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
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
  actions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  rejectButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#F44336',
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  processButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completeButton: {
    backgroundColor: COLORS.background,
  },
  completeButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
  },
  sendButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.xs,
  },
  sentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    padding: SPACING.md,
    borderRadius: 12,
  },
  sentText: {
    fontSize: FONT_SIZES.sm,
    color: '#4CAF50',
    marginLeft: SPACING.sm,
  },
});
