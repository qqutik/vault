import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { api, ensureCsrf, type User } from '../api/client';

/**
 * Passkey (WebAuthn) auth flow — client side.
 *
 * The device does the crypto; we only shuttle options/results to the API.
 * Auth is session-based (Sanctum SPA), so a successful verify sets the httpOnly
 * cookie — nothing is stored in JS. `ensureCsrf()` primes the CSRF token first.
 */

export interface RegisterResult {
  user: User;
  recoveryCodes: string[];
}

export async function registerPasskey(
  name: string,
  email: string,
): Promise<RegisterResult> {
  await ensureCsrf();

  const { data: options } = await api.post('/auth/register/options', { name, email });

  const attestation = await startRegistration({ optionsJSON: options });

  const { data } = await api.post('/auth/register/verify', attestation);

  return { user: data.user, recoveryCodes: data.recovery_codes };
}

export async function loginWithPasskey(email?: string): Promise<{ user: User }> {
  await ensureCsrf();

  const { data: options } = await api.post(
    '/auth/login/options',
    email ? { email } : {},
  );

  const assertion = await startAuthentication({ optionsJSON: options });

  const { data } = await api.post('/auth/login/verify', assertion);

  return { user: data.user };
}
