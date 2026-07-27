import axios from 'axios';

/**
 * Axios instance for the Vault API.
 *
 * Auth is token-based (Sanctum). The Bearer token is kept in memory (not in
 * localStorage) to reduce XSS exposure for a secrets vault.
 *
 * `withCredentials` is on because the passkey ceremony (register/login
 * options → verify) carries the WebAuthn challenge in a session cookie.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
  withCredentials: true,
});

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface DashboardStats {
  folders: number;
  vault_items: number;
  passkeys: number;
  favorites: number;
}

export interface Dashboard {
  user: User;
  stats: DashboardStats;
}

export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/dashboard');
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
  setAuthToken(null);
}
