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
import { ADMIN_COLORS as COLORS, SPACING, FONT_SIZES, formatKES } from '@/src/constants/theme';
import { getCustomers, Customer } from '@/src/utils/adminApi';

export default function AdminCustomers() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchCustomers = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const data = await getCustomers(currentPage, 20, search || undefined);
      setCustomers(reset ? data.customers : [...customers, ...data.customers]);
      setTotalPages(data.pages);
      if (reset) setPage(1);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers(true);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(true);
  }, [search]);

  const handleSearch = () => {
    setLoading(true);
    fetchCustomers(true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      setPage(page + 1);
      fetchCustomers();
    }
  };

  const renderCustomer = ({ item }: { item: Customer }) => (
    <Pressable
      style={styles.customerCard}
      onPress={() => router.push(`/admin/customer/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{item.name}</Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
        <Text style={styles.joinDate}>
          Joined {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.customerRight}>
        <Text style={styles.balance}>{formatKES(item.balance)}</Text>
        <Text style={styles.transactionCount}>{item.transaction_count} txns</Text>
        <View style={[
          styles.statusDot,
          { backgroundColor: item.is_active ? '#4CAF50' : '#9E9E9E' }
        ]} />
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or phone"
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
        <Pressable style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsSummary}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{customers.length}</Text>
          <Text style={styles.statLabel}>Showing</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatKES(customers.reduce((sum, c) => sum + c.balance, 0))}
          </Text>
          <Text style={styles.statLabel}>Total Balance</Text>
        </View>
      </View>

      {/* Customers List */}
      {loading && customers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderCustomer}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No customers found</Text>
            </View>
          }
          ListFooterComponent={
            loading && customers.length > 0 ? (
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
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
  },
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.surface,
  },
  customerInfo: {
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
  joinDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
  },
  customerRight: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.primary,
  },
  transactionCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
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
