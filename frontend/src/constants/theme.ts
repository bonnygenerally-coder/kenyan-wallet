export const COLORS = {
  primary: '#00875A',      // Trust green
  primaryDark: '#006644',
  secondary: '#0052CC',    // Professional blue
  background: '#F4F5F7',
  surface: '#FFFFFF',
  text: '#172B4D',
  textSecondary: '#6B778C',
  textLight: '#97A0AF',
  success: '#00875A',
  warning: '#FF8B00',
  error: '#DE350B',
  border: '#DFE1E6',
  accent: '#36B37E',
};

// Admin-specific red theme colors
export const ADMIN_COLORS = {
  primary: '#DC2626',      // Admin red
  primaryDark: '#B91C1C',
  primaryLight: '#FEE2E2',
  secondary: '#EF4444',
  accent: '#F87171',
  sidebar: '#1F1F1F',      // Dark sidebar
  sidebarText: '#FFFFFF',
  sidebarActive: '#DC2626',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  text: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
};

export const formatKES = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
