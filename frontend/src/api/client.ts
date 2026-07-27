import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

/**
 * Axios instance for the Vault API.
 *
 * Auth is Sanctum SPA (stateful): the session lives in an httpOnly cookie, so
 * there is no token in JS. `withCredentials` sends the cookie; `withXSRFToken`
 * echoes the XSRF-TOKEN cookie back as the X-XSRF-TOKEN header.
 */
export const api = axios.create({
  baseURL: API_BASE,
  headers: { Accept: 'application/json' },
  withCredentials: true,
  withXSRFToken: true,
});

/** Fetch the CSRF cookie before a state-changing request (Sanctum SPA). */
export async function ensureCsrf(): Promise<void> {
  await axios.get(`${BACKEND_ORIGIN}/sanctum/csrf-cookie`, { withCredentials: true });
}

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

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/me');
  return data;
}

export async function fetchDashboard(): Promise<Dashboard> {
  const { data } = await api.get<Dashboard>('/dashboard');
  return data;
}

export async function logout(): Promise<void> {
  await ensureCsrf();
  await api.post('/auth/logout');
}
