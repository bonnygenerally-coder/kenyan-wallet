import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '@/src/store/adminStore';
import { ADMIN_COLORS as COLORS, SPACING, FONT_SIZES } from '@/src/constants/theme';

const SIDEBAR_WIDTH = 260;

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: 'grid', route: '/admin' },
  { label: 'Verifications', icon: 'checkmark-circle', route: '/admin/verifications', badge: true },
  { label: 'Transactions', icon: 'swap-horizontal', route: '/admin/transactions' },
  { label: 'Customers', icon: 'people', route: '/admin/customers' },
  { label: 'Audit Logs', icon: 'document-text', route: '/admin/audit' },
];

export default function AdminLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isAuthenticated, isLoading, loadToken, logout } = useAdminStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  useEffect(() => {
    loadToken();
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/admin/login');
    }
  }, [isLoading, isAuthenticated]);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const isActive = (route: string) => {
    if (route === '/admin') return pathname === '/admin';
    return pathname.startsWith(route);
  };

  // Show login screen without layout
  if (pathname === '/admin/login' || pathname === '/admin/register') {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    );
  }

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      {sidebarOpen && (
        <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
          <View style={styles.sidebarHeader}>
            <View style={styles.logoContainer}>
              <Ionicons name="leaf" size={28} color={COLORS.surface} />
              <Text style={styles.logoText}>Dolaglobo</Text>
            </View>
            <Text style={styles.adminLabel}>Admin Portal</Text>
          </View>

          <ScrollView style={styles.navContainer}>
            {NAV_ITEMS.map((item) => (
              <Pressable
                key={item.route}
                style={[
                  styles.navItem,
                  isActive(item.route) && styles.navItemActive,
                ]}
                onPress={() => {
                  router.push(item.route as any);
                  if (isMobile) setSidebarOpen(false);
                }}
              >
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={isActive(item.route) ? COLORS.surface : 'rgba(255,255,255,0.7)'}
                />
                <Text
                  style={[
                    styles.navText,
                    isActive(item.route) && styles.navTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sidebarFooter}>
            <View style={styles.adminInfo}>
              <View style={styles.adminAvatar}>
                <Ionicons name="person" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.adminDetails}>
                <Text style={styles.adminName} numberOfLines={1}>
                  {admin?.name}
                </Text>
                <Text style={styles.adminRole}>
                  {admin?.role?.replace('_', ' ')}
                </Text>
              </View>
            </View>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={18} color="#FF6B6B" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Pressable
            style={styles.menuButton}
            onPress={() => setSidebarOpen(!sidebarOpen)}
          >
            <Ionicons name={sidebarOpen ? 'close' : 'menu'} size={24} color={COLORS.text} />
          </Pressable>
          <Text style={styles.pageTitle}>
            {NAV_ITEMS.find(item => isActive(item.route))?.label || 'Admin'}
          </Text>
          <View style={styles.topBarRight}>
            <View style={styles.roleTag}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
              <Text style={styles.roleTagText}>{admin?.role?.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Stack Navigator for content */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="transactions" />
          <Stack.Screen name="customers" />
          <Stack.Screen name="customer/[id]" />
          <Stack.Screen name="transaction/[id]" />
          <Stack.Screen name="audit" />
        </Stack>
      </View>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <Pressable
          style={styles.overlay}
          onPress={() => setSidebarOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.sidebar,
    paddingTop: 20,
  },
  sidebarMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebarHeader: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.surface,
    marginLeft: SPACING.sm,
  },
  adminLabel: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  navContainer: {
    flex: 1,
    paddingTop: SPACING.md,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginHorizontal: SPACING.sm,
    marginBottom: 4,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: COLORS.primary,
  },
  navText: {
    fontSize: FONT_SIZES.md,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: SPACING.md,
  },
  navTextActive: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  sidebarFooter: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  adminInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  adminAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminDetails: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  adminName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.surface,
  },
  adminRole: {
    fontSize: FONT_SIZES.xs,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'capitalize',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: FONT_SIZES.sm,
    color: '#FF6B6B',
    marginLeft: SPACING.xs,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.primary,
    marginLeft: 4,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: SIDEBAR_WIDTH,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 99,
  },
});
