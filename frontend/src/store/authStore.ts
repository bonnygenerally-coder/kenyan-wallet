import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  phone: string;
  name: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, pin: string) => Promise<void>;
  signup: (phone: string, pin: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  login: async (phone: string, pin: string) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, { phone, pin });
    const { access_token, user } = response.data;
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token: access_token, user, isAuthenticated: true });
  },

  signup: async (phone: string, pin: string, name: string) => {
    const response = await axios.post(`${API_URL}/api/auth/signup`, { phone, pin, name });
    const { access_token, user } = response.data;
    await AsyncStorage.setItem('auth_token', access_token);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    set({ token: access_token, user, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
