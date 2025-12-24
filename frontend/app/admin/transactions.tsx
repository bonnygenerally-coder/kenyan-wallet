import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { getTransactions, Transaction } from '@/src/utils/adminApi';

const STATUS_OPTIONS = ['all', 'pending', 'processing', 'completed', 'failed', 'cancelled'];
const TYPE_OPTIONS = ['all', 'deposit', 'withdrawal', 'interest'];

export default function AdminTransactions() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchTransactions = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const filters: any = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (typeFilter !== 'all') filters.type = typeFilter;
      if (search) filters.customer_search = search;

      const data = await getTransactions(currentPage, 20, filters);
      setTransactions(reset ? data.transactions : [...transactions, ...data.transactions]);
      setTotalPages(data.pages);
      if (reset) setPage(1);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions(true);
  }, [statusFilter, typeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTransactions(true);
  }, [statusFilter, typeFilter, search]);

  const handleSearch = () => {
    setLoading(true);
    fetchTransactions(true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      setPage(page + 1);
      fetchTransactions();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'processing': return '#2196F3';
      case 'failed': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return COLORS.textSecondary;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return 'arrow-down';
      case 'withdrawal': return 'arrow-up';
      case 'interest': return 'sparkles';
      default: return 'cash';
    }
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Pressable
      style={styles.transactionCard}
      onPress={() => router.push(`/admin/transaction/${item.id}`)}
    >
      <View style={[
        styles.typeIcon,
        { backgroundColor: item.type === 'withdrawal' ? '#FFEBEE' : '#E8F5E9' }
      ]}>
        <Ionicons
          name={getTypeIcon(item.type) as any}
          size={20}
          color={item.type === 'withdrawal' ? '#F44336' : '#4CAF50'}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.customerName}>{item.customer_name}</Text>
        <Text style={styles.customerPhone}>{item.customer_phone}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[
          styles.amount,
          { color: item.type === 'withdrawal' ? '#F44336' : '#4CAF50' }
        ]}>
          {item.type === 'withdrawal' ? '-' : '+'}{formatKES(item.amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search & Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name or phone"
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
          />
          {search ? (
            <Pressable onPress={() => { setSearch(''); handleSearch(); }}>
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[styles.filterButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="filter" size={20} color={showFilters ? COLORS.surface : COLORS.text} />
        </Pressable>
      </View>

      {/* Filter Options */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {STATUS_OPTIONS.map((status) => (
                <Pressable
                  key={status}
                  style={[
                    styles.filterChip,
                    statusFilter === status && styles.filterChipActive
                  ]}
                  onPress={() => setStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterChipText,
                    statusFilter === status && styles.filterChipTextActive
                  ]}>
                    {status}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Type</Text>
            <View style={styles.filterOptions}>
              {TYPE_OPTIONS.map((type) => (
                <Pressable
                  key={type}
                  style={[
                    styles.filterChip,
                    typeFilter === type && styles.filterChipActive
                  ]}
                  onPress={() => setTypeFilter(type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    typeFilter === type && styles.filterChipTextActive
                  ]}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Transactions List */}
      {loading && transactions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          ListFooterComponent={
            loading && transactions.length > 0 ? (
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
  searchContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filtersContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterGroup: {
    marginBottom: SPACING.md,
  },
  filterLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginRight: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: COLORS.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  transactionRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
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
});
