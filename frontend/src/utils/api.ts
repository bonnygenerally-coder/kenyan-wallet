import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Account {
  id: string;
  user_id: string;
  balance: number;
  total_interest_earned: number;
  daily_interest: number;
  estimated_annual_yield: number;
  last_interest_date?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdrawal' | 'interest';
  amount: number;
  status: string;
  description: string;
  created_at: string;
}

export interface DepositResponse {
  message: string;
  transaction_id: string;
  instructions: Record<string, string>;
  paybill: string;
  account_number: string;
  amount: number;
}

export const getAccount = async (): Promise<Account> => {
  const response = await api.get('/account');
  return response.data;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  const response = await api.get('/transactions');
  return response.data;
};

export const createDeposit = async (amount: number): Promise<DepositResponse> => {
  const response = await api.post('/deposit', { amount });
  return response.data;
};

export const confirmDeposit = async (transactionId: string) => {
  const response = await api.post(`/deposit/confirm/${transactionId}`);
  return response.data;
};

export const createWithdrawal = async (amount: number) => {
  const response = await api.post('/withdraw', { amount });
  return response.data;
};

export const calculateInterest = async () => {
  const response = await api.post('/interest/calculate');
  return response.data;
};

export default api;
