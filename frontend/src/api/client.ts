import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';
export const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

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

export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export async function fetchFolders(): Promise<Folder[]> {
  const { data } = await api.get<Folder[]>('/folders');
  return data;
}

export async function createFolder(
  name: string,
  parentId: number | null = null,
): Promise<Folder> {
  await ensureCsrf();
  const { data } = await api.post<Folder>('/folders', { name, parent_id: parentId });
  return data;
}

export async function updateFolder(
  id: number,
  name: string,
  parentId: number | null = null,
): Promise<Folder> {
  await ensureCsrf();
  const { data } = await api.put<Folder>(`/folders/${id}`, { name, parent_id: parentId });
  return data;
}

export async function deleteFolder(id: number): Promise<void> {
  await ensureCsrf();
  await api.delete(`/folders/${id}`);
}

export type VaultItemType = 'login' | 'secure_note' | 'card' | 'identity' | 'custom';

export interface VaultItemSummary {
  id: number;
  folder_id: number | null;
  type: VaultItemType;
  title: string;
  favorite: boolean;
  require_reauth: boolean;
  created_at: string;
  updated_at: string;
}

export interface VaultItemDetail extends VaultItemSummary {
  data: Record<string, string>;
}

export interface VaultItemPayload {
  type: VaultItemType;
  title: string;
  data: Record<string, string>;
  folder_id: number | null;
  favorite: boolean;
  require_reauth: boolean;
}

export interface VaultItemFilters {
  search?: string;
  type?: VaultItemType | '';
  folder_id?: number | null;
  favorite?: boolean;
}

export async function fetchVaultItems(filters: VaultItemFilters = {}): Promise<VaultItemSummary[]> {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.type) params.type = filters.type;
  if (filters.folder_id != null) params.folder_id = String(filters.folder_id);
  if (filters.favorite) params.favorite = '1';

  const { data } = await api.get<VaultItemSummary[]>('/vault-items', { params });
  return data;
}

export async function fetchVaultItem(id: number): Promise<VaultItemDetail> {
  const { data } = await api.get<VaultItemDetail>(`/vault-items/${id}`);
  return data;
}

export async function createVaultItem(payload: VaultItemPayload): Promise<VaultItemDetail> {
  await ensureCsrf();
  const { data } = await api.post<VaultItemDetail>('/vault-items', payload);
  return data;
}

export async function updateVaultItem(
  id: number,
  payload: VaultItemPayload,
): Promise<VaultItemDetail> {
  await ensureCsrf();
  const { data } = await api.put<VaultItemDetail>(`/vault-items/${id}`, payload);
  return data;
}

export async function deleteVaultItem(id: number): Promise<void> {
  await ensureCsrf();
  await api.delete(`/vault-items/${id}`);
}

export interface Passkey {
  id: string;
  alias: string | null;
  disabled: boolean;
  created_at: string;
}

export async function fetchPasskeys(): Promise<Passkey[]> {
  const { data } = await api.get<Passkey[]>('/passkeys');
  return data;
}

export async function deletePasskey(id: string): Promise<Passkey[]> {
  await ensureCsrf();
  const { data } = await api.delete<{ passkeys: Passkey[] }>('/passkeys', { data: { id } });
  return data.passkeys;
}

export interface SessionInfo {
  id: string;
  ip: string | null;
  device: string;
  last_active: string;
  current: boolean;
}

export async function fetchSessions(): Promise<SessionInfo[]> {
  const { data } = await api.get<SessionInfo[]>('/sessions');
  return data;
}

export async function revokeSession(id: string): Promise<SessionInfo[]> {
  await ensureCsrf();
  const { data } = await api.delete<SessionInfo[]>(`/sessions/${id}`);
  return data;
}

export async function revokeOtherSessions(): Promise<SessionInfo[]> {
  await ensureCsrf();
  const { data } = await api.post<SessionInfo[]>('/sessions/revoke-others');
  return data;
}

export interface AuditLog {
  id: number;
  action: string;
  auditable_type: string | null;
  auditable_id: number | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export async function fetchAuditLogs(page = 1): Promise<Paginated<AuditLog>> {
  const { data } = await api.get<Paginated<AuditLog>>('/audit-logs', { params: { page } });
  return data;
}
