import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '@/src/constants/theme';
import { requestStatement, getMyStatementRequests, StatementRequestData } from '@/src/utils/api';

const MONTH_OPTIONS = [1, 3, 6, 12];

export default function StatementsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<StatementRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(3);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchRequests = async () => {
    try {
      const data = await getMyStatementRequests();
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch statement requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, []);

  const handleSubmitRequest = async () => {
    setSubmitting(true);
    try {
      await requestStatement(selectedMonths, email || undefined);
      setResult({ success: true, message: 'Statement request submitted successfully!' });
      setShowRequestModal(false);
      setEmail('');
      fetchRequests();
    } catch (error: any) {
      setResult({ 
        success: false, 
        message: error.response?.data?.detail || 'Failed to submit request' 
      });
    } finally {
      setSubmitting(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time';
      case 'processing': return 'refresh';
      case 'completed': return 'checkmark-circle';
      case 'sent': return 'mail';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
        <Text style={styles.title}>Account Statements</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Result Message */}
      {result && (
        <View style={[styles.resultBanner, result.success ? styles.successBanner : styles.errorBanner]}>
          <Ionicons 
            name={result.success ? "checkmark-circle" : "close-circle"} 
            size={20} 
            color={result.success ? "#4CAF50" : "#F44336"} 
          />
          <Text style={[styles.resultText, result.success ? styles.successText : styles.errorText]}>
            {result.message}
          </Text>
          <Pressable onPress={() => setResult(null)}>
            <Ionicons name="close" size={18} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="document-text" size={32} color={COLORS.primary} />
          <Text style={styles.infoTitle}>Request Account Statement</Text>
          <Text style={styles.infoText}>
            Get a detailed statement of your account activity including deposits, withdrawals, and interest earned.
          </Text>
          <Pressable style={styles.requestButton} onPress={() => setShowRequestModal(true)}>
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.requestButtonText}>Request Statement</Text>
          </Pressable>
        </View>

        {/* Previous Requests */}
        <Text style={styles.sectionTitle}>Your Requests</Text>

        {requests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No statement requests yet</Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.requestIcon}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestPeriod}>
                    {request.months} Month{request.months > 1 ? 's' : ''} Statement
                  </Text>
                  <Text style={styles.requestDate}>
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(request.status)}20` }]}>
                  <Ionicons 
                    name={getStatusIcon(request.status) as any} 
                    size={14} 
                    color={getStatusColor(request.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={styles.requestFooter}>
                <Text style={styles.requestedAt}>
                  Requested: {formatDate(request.created_at)}
                </Text>
                {request.sent_at && (
                  <Text style={styles.sentAt}>
                    Sent: {formatDate(request.sent_at)}
                  </Text>
                )}
              </View>
              {request.admin_note && (
                <View style={styles.noteBox}>
                  <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.noteText}>{request.admin_note}</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Statement</Text>
              <Pressable onPress={() => setShowRequestModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Select Period</Text>
            <View style={styles.monthOptions}>
              {MONTH_OPTIONS.map((months) => (
                <Pressable
                  key={months}
                  style={[
                    styles.monthOption,
                    selectedMonths === months && styles.monthOptionSelected
                  ]}
                  onPress={() => setSelectedMonths(months)}
                >
                  <Text style={[
                    styles.monthOptionText,
                    selectedMonths === months && styles.monthOptionTextSelected
                  ]}>
                    {months} {months === 1 ? 'Month' : 'Months'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Email (Optional)</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter email to receive statement"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.emailHint}>
              Leave blank to collect from admin office
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowRequestModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.submitButton}
                onPress={handleSubmitRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
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
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: 8,
  },
  successBanner: {
    backgroundColor: '#E8F5E9',
  },
  errorBanner: {
    backgroundColor: '#FFEBEE',
  },
  resultText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZES.sm,
  },
  successText: {
    color: '#4CAF50',
  },
  errorText: {
    color: '#F44336',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  infoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    marginTop: SPACING.lg,
  },
  requestButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
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
  requestIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  requestInfo: {
    flex: 1,
  },
  requestPeriod: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
  },
  requestDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    marginLeft: 4,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  requestedAt: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  sentAt: {
    fontSize: FONT_SIZES.xs,
    color: '#4CAF50',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.sm,
  },
  noteText: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
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
    paddingBottom: SPACING.xxl,
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
  modalLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  monthOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  monthOption: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  monthOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  monthOptionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  monthOptionTextSelected: {
    color: '#FFFFFF',
  },
  emailInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  emailHint: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  submitButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: SPACING.sm,
  },
});
