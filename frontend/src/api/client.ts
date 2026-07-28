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
}

export async function fetchVaultItems(folderId?: number | null): Promise<VaultItemSummary[]> {
  const { data } = await api.get<VaultItemSummary[]>('/vault-items', {
    params: folderId != null ? { folder_id: folderId } : {},
  });
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
