import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const adminApi = axios.create({
  baseURL: `${API_URL}/api/admin`,
});

adminApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface DashboardStats {
  total_aum: number;
  total_customers: number;
  active_customers: number;
  pending_transactions: number;
  pending_verifications: number;
  daily_deposits: number;
  daily_withdrawals: number;
  total_interest_paid: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  is_active: boolean;
  balance: number;
  total_interest_earned: number;
  transaction_count: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  account_balance: number;
}

export interface CustomerDetail {
  customer: {
    id: string;
    name: string;
    phone: string;
    created_at: string;
    is_active: boolean;
  };
  account: {
    id: string;
    balance: number;
    total_interest_earned: number;
    last_interest_date?: string;
  };
  transactions: Transaction[];
  stats: {
    total_deposits: number;
    total_withdrawals: number;
    total_interest: number;
    transaction_count: number;
  };
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  timestamp: string;
}

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await adminApi.get('/dashboard/stats');
  return response.data;
};

export const getDashboardCharts = async () => {
  const response = await adminApi.get('/dashboard/charts');
  return response.data;
};

export const getCustomers = async (page = 1, limit = 20, search?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.append('search', search);
  const response = await adminApi.get(`/customers?${params}`);
  return response.data;
};

export const getCustomerDetail = async (customerId: string): Promise<CustomerDetail> => {
  const response = await adminApi.get(`/customers/${customerId}`);
  return response.data;
};

export const updateCustomer = async (customerId: string, data: { name?: string; phone?: string }) => {
  const response = await adminApi.put(`/customers/${customerId}`, data);
  return response.data;
};

export const getTransactions = async (
  page = 1,
  limit = 20,
  filters?: {
    type?: string;
    status?: string;
    customer_search?: string;
    date_from?: string;
    date_to?: string;
  }
) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filters?.type) params.append('type', filters.type);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.customer_search) params.append('customer_search', filters.customer_search);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  const response = await adminApi.get(`/transactions?${params}`);
  return response.data;
};

export const getTransactionDetail = async (transactionId: string) => {
  const response = await adminApi.get(`/transactions/${transactionId}`);
  return response.data;
};

export const updateTransactionStatus = async (
  transactionId: string,
  status: string,
  note?: string
) => {
  const response = await adminApi.put(`/transactions/${transactionId}/status`, { status, note });
  return response.data;
};

export const getAuditLogs = async (page = 1, limit = 50) => {
  const response = await adminApi.get(`/audit-logs?page=${page}&limit=${limit}`);
  return response.data;
};

// ============== NEW VERIFICATION APIs ==============

export const getPendingVerifications = async (page = 1, limit = 20) => {
  const response = await adminApi.get(`/pending-verifications?page=${page}&limit=${limit}`);
  return response.data;
};

export const verifyDeposit = async (transactionId: string, approve: boolean, note?: string) => {
  const params = new URLSearchParams({ approve: String(approve) });
  if (note) params.append('note', note);
  const response = await adminApi.post(`/transactions/${transactionId}/verify?${params}`);
  return response.data;
};

export const adjustCustomerBalance = async (
  customerId: string,
  amount: number,
  type: 'credit' | 'debit',
  reason: string
) => {
  const response = await adminApi.post(`/customers/${customerId}/adjust-balance`, {
    amount,
    type,
    reason
  });
  return response.data;
};

// ============== INTEREST DISTRIBUTION APIs ==============

export const distributeInterestToAll = async (customRate?: number) => {
  const response = await adminApi.post('/distribute-interest', {
    custom_rate: customRate
  });
  return response.data;
};

export const distributeInterestToCustomer = async (customerId: string, customRate?: number) => {
  const params = customRate ? `?custom_rate=${customRate}` : '';
  const response = await adminApi.post(`/distribute-interest/${customerId}${params}`);
  return response.data;
};

// ============== STATEMENT MANAGEMENT APIs ==============
export interface StatementRequest {
  id: string;
  user_id: string;
  customer_name: string;
  customer_phone: string;
  customer_balance: number;
  months: number;
  start_date: string;
  end_date: string;
  status: string;
  email?: string;
  created_at: string;
  processed_by?: string;
  processed_at?: string;
  sent_at?: string;
  admin_note?: string;
}

export const getStatementRequests = async (page = 1, limit = 20, status?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.append('status', status);
  const response = await adminApi.get(`/statements?${params}`);
  return response.data;
};

export const getPendingStatements = async () => {
  const response = await adminApi.get('/statements/pending');
  return response.data;
};

export const getStatementDetail = async (requestId: string) => {
  const response = await adminApi.get(`/statements/${requestId}`);
  return response.data;
};

export const processStatementRequest = async (
  requestId: string,
  action: 'process' | 'complete' | 'send' | 'reject',
  note?: string,
  emailSentTo?: string
) => {
  const response = await adminApi.post(`/statements/${requestId}/action`, {
    action,
    note,
    email_sent_to: emailSentTo
  });
  return response.data;
};

// ============== WITHDRAWAL MANAGEMENT APIs ==============
export const getPendingWithdrawals = async (page = 1, limit = 20) => {
  const response = await adminApi.get(`/pending-withdrawals?page=${page}&limit=${limit}`);
  return response.data;
};

export const approveWithdrawal = async (transactionId: string, note?: string) => {
  const params = note ? `?note=${encodeURIComponent(note)}` : '';
  const response = await adminApi.post(`/withdrawals/${transactionId}/approve${params}`);
  return response.data;
};

export const rejectWithdrawal = async (transactionId: string, note?: string) => {
  const params = note ? `?note=${encodeURIComponent(note)}` : '';
  const response = await adminApi.post(`/withdrawals/${transactionId}/reject${params}`);
  return response.data;
};

export const reverseWithdrawal = async (transactionId: string, reason: string) => {
  const response = await adminApi.post(`/withdrawals/${transactionId}/reverse?reason=${encodeURIComponent(reason)}`);
  return response.data;
};

export default adminApi;
