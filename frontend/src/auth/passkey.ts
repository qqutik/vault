import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import { api, setAuthToken } from '../api/client';

/**
 * Passkey (WebAuthn) auth flow — client side.
 *
 * The device does the crypto; we only shuttle options/results to the API.
 *
 * NOTE: the backend auth endpoints are Phase 2 (see backend/routes/api.php).
 * The option payload from laragear/webauthn may need a thin adapter to match
 * the JSON shape @simplewebauthn/browser expects — verify when wiring up.
 */

export async function registerPasskey(name: string, email: string): Promise<void> {
  const { data: options } = await api.post('/auth/register/options', { name, email });
  const attestation = await startRegistration({ optionsJSON: options });
  const { data } = await api.post('/auth/register/verify', attestation);
  if (data?.token) setAuthToken(data.token);
}

export async function loginWithPasskey(email?: string): Promise<void> {
  const { data: options } = await api.post('/auth/login/options', email ? { email } : {});
  const assertion = await startAuthentication({ optionsJSON: options });
  const { data } = await api.post('/auth/login/verify', assertion);
  if (data?.token) setAuthToken(data.token);
}
