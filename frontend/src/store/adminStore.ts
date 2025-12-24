import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export type AdminRole = 'view_only' | 'transaction_manager' | 'super_admin';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  created_at: string;
}

interface AdminState {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  admin: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const adminStr = await AsyncStorage.getItem('admin');
      if (token && adminStr) {
        const admin = JSON.parse(adminStr);
        set({ token, admin, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    const response = await axios.post(`${API_URL}/api/admin/auth/login`, { email, password });
    const { access_token, admin } = response.data;
    await AsyncStorage.setItem('admin_token', access_token);
    await AsyncStorage.setItem('admin', JSON.stringify(admin));
    set({ token: access_token, admin, isAuthenticated: true });
  },

  register: async (email: string, password: string, name: string) => {
    const response = await axios.post(`${API_URL}/api/admin/auth/register`, { email, password, name });
    const { access_token, admin } = response.data;
    await AsyncStorage.setItem('admin_token', access_token);
    await AsyncStorage.setItem('admin', JSON.stringify(admin));
    set({ token: access_token, admin, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('admin_token');
    await AsyncStorage.removeItem('admin');
    set({ token: null, admin: null, isAuthenticated: false });
  },
}));
