import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { api, setAuthToken, type User } from '../api/client';

/**
 * Passkey (WebAuthn) auth flow — client side.
 *
 * The device does the crypto; we only shuttle options/results to the API.
 * The backend passkey ceremony is session-backed, so these calls rely on the
 * shared axios instance having `withCredentials: true`.
 */

export interface RegisterResult {
  user: User;
  token: string;
  recoveryCodes: string[];
}

export interface LoginResult {
  user: User;
  token: string;
}

export async function registerPasskey(
  name: string,
  email: string,
): Promise<RegisterResult> {
  const { data: options } = await api.post('/auth/register/options', { name, email });

  const attestation = await startRegistration({ optionsJSON: options });

  const { data } = await api.post('/auth/register/verify', attestation);

  setAuthToken(data.token);

  return { user: data.user, token: data.token, recoveryCodes: data.recovery_codes };
}

export async function loginWithPasskey(email?: string): Promise<LoginResult> {
  const { data: options } = await api.post(
    '/auth/login/options',
    email ? { email } : {},
  );

  const assertion = await startAuthentication({ optionsJSON: options });

  const { data } = await api.post('/auth/login/verify', assertion);

  setAuthToken(data.token);

  return { user: data.user, token: data.token };
}
