import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from '@simplewebauthn/browser';
import {
  api,
  ensureCsrf,
  type Passkey,
  type User,
  type VaultItemDetail,
} from '../api/client';

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

/** Enable the WebAuthn PRF extension so the credential can derive the vault key. */
function withPrf(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptionsJSON {
  return {
    ...options,
    extensions: {
      ...options.extensions,
      prf: {},
    } as unknown as PublicKeyCredentialCreationOptionsJSON['extensions'],
  };
}

export async function registerPasskey(
  name: string,
  email: string,
): Promise<RegisterResult> {
  await ensureCsrf();

  const { data: options } = await api.post('/auth/register/options', { name, email });

  const attestation = await startRegistration({ optionsJSON: withPrf(options) });

  const { data } = await api.post('/auth/register/verify', attestation);

  return { user: data.user, recoveryCodes: data.recovery_codes };
}

/**
 * Register an additional passkey for the already-authenticated user (a second
 * device, e.g. phone / laptop / security key). `alias` is a friendly name.
 * Returns the new credential id so the caller can enrol it for encryption.
 */
export async function addPasskey(
  alias: string,
): Promise<{ credentialId: string; passkeys: Passkey[] }> {
  await ensureCsrf();

  const { data: options } = await api.post('/passkeys/options', {});

  const attestation = await startRegistration({ optionsJSON: withPrf(options) });

  const { data } = await api.post('/passkeys/verify', { ...attestation, alias });

  return { credentialId: attestation.id, passkeys: data.passkeys };
}

/**
 * Unlock a protected item: prompt for a fresh passkey assertion, then fetch the
 * decrypted item. Every open re-prompts (no grace window). Throws if the passkey
 * ceremony is cancelled or the assertion fails.
 */
export async function unlockVaultItem(id: number): Promise<VaultItemDetail> {
  await ensureCsrf();

  const { data: options } = await api.post(`/vault-items/${id}/unlock/options`);

  const assertion = await startAuthentication({ optionsJSON: options });

  const { data } = await api.post<VaultItemDetail>(`/vault-items/${id}/unlock`, assertion);

  return data;
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
