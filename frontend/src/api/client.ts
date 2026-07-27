import axios from 'axios';

/**
 * Axios instance for the Vault API.
 *
 * Auth is token-based (Sanctum). The Bearer token is kept in memory (not in
 * localStorage) to reduce XSS exposure for a secrets vault.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api',
  headers: { Accept: 'application/json' },
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
