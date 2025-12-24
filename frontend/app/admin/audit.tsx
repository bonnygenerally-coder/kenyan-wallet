import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS as COLORS, SPACING, FONT_SIZES } from '@/src/constants/theme';
import { getAuditLogs, AuditLog } from '@/src/utils/adminApi';
import { useAdminStore } from '@/src/store/adminStore';

export default function AdminAuditLogs() {
  const { admin } = useAdminStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const data = await getAuditLogs(currentPage, 50);
      setLogs(reset ? data.logs : [...logs, ...data.logs]);
      setTotalPages(data.pages);
      if (reset) setPage(1);
    } catch (error: any) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (admin?.role === 'super_admin') {
      fetchLogs(true);
    } else {
      setLoading(false);
    }
  }, [admin]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs(true);
  }, []);

  const loadMore = () => {
    if (page < totalPages && !loading) {
      setPage(page + 1);
      fetchLogs();
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('status')) return 'swap-horizontal';
    if (action.includes('customer')) return 'person';
    if (action.includes('transaction')) return 'receipt';
    return 'document-text';
  };

  const getActionColor = (action: string) => {
    if (action.includes('status')) return '#FF9800';
    if (action.includes('customer')) return '#2196F3';
    return '#9C27B0';
  };

  if (admin?.role !== 'super_admin') {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={COLORS.textLight} />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          Only Super Admins can view audit logs
        </Text>
      </View>
    );
  }

  const renderLog = ({ item }: { item: AuditLog }) => (
    <View style={styles.logCard}>
      <View style={[
        styles.logIcon,
        { backgroundColor: `${getActionColor(item.action)}15` }
      ]}>
        <Ionicons
          name={getActionIcon(item.action) as any}
          size={20}
          color={getActionColor(item.action)}
        />
      </View>
      <View style={styles.logContent}>
        <Text style={styles.logAction}>
          {item.action.replace(/_/g, ' ')}
        </Text>
        <Text style={styles.logAdmin}>by {item.admin_name}</Text>
        <Text style={styles.logTarget}>
          {item.target_type}: {item.target_id.slice(0, 8)}...
        </Text>
        {item.details && Object.keys(item.details).length > 0 && (
          <View style={styles.detailsContainer}>
            {Object.entries(item.details).map(([key, value]) => (
              <Text key={key} style={styles.detailText}>
                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </Text>
            ))}
          </View>
        )}
      </View>
      <Text style={styles.logTime}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
        <Text style={styles.headerText}>Admin Activity Audit Trail</Text>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No audit logs yet</Text>
            </View>
          }
          ListFooterComponent={
            loading && logs.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} color={COLORS.primary} />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  logContent: {
    flex: 1,
  },
  logAction: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  logAdmin: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  logTarget: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  detailsContainer: {
    marginTop: SPACING.xs,
    padding: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: 6,
  },
  detailText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  logTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  footerLoader: {
    paddingVertical: SPACING.lg,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  accessDeniedTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  accessDeniedText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
