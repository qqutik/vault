/**
 * Zero-knowledge crypto (data-only). All key material stays in the browser.
 *
 * Flow: passkey PRF → HKDF → KEK → (un)wrap VMK. The VMK (AES-256-GCM) encrypts
 * each item's `data`. The server only ever sees the PRF salt (non-secret) and the
 * wrapped VMK (ciphertext). See ZK-DESIGN.md.
 */


// --- base64 helpers ---

function toB64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromB64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Decode a base64url string (as WebAuthn credential ids use) to bytes. */
function fromB64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromB64(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

/** Bytes of a UTF-8 string, typed as ArrayBuffer-backed for Web Crypto. */
function utf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;
}

// --- passkey PRF ceremony (local; never sent to the server) ---

export interface PrfResult {
  credentialId: string;
  prfOutput: ArrayBuffer;
}

/**
 * Run a WebAuthn assertion with the PRF extension to derive a stable secret from
 * the passkey. The assertion is NOT verified server-side — the PRF output alone
 * is what unlocks the vault. Throws if PRF is unsupported or the user cancels.
 */
export async function runPrf(prfSaltB64: string, credentialId?: string): Promise<PrfResult> {
  const salt = fromB64(prfSaltB64);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const allowCredentials = credentialId
    ? [{ id: fromB64Url(credentialId), type: 'public-key' as const }]
    : undefined;

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: location.hostname,
      userVerification: 'required',
      allowCredentials,
      // `prf` isn't in the DOM lib types yet.
      extensions: { prf: { eval: { first: salt } } } as unknown as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey assertion was cancelled.');
  }

  const results = credential.getClientExtensionResults() as {
    prf?: { results?: { first?: ArrayBuffer } };
  };
  const first = results.prf?.results?.first;
  if (!first) {
    throw new Error('This passkey / browser does not support the PRF extension.');
  }

  return { credentialId: credential.id, prfOutput: first };
}

// --- key derivation & wrapping ---

/** HKDF-SHA256(PRF output) → non-extractable AES-GCM key-encryption key. */
async function deriveKek(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const hkdf = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8('vault-kek-v1') },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Import raw VMK bytes as an AES-GCM key. Extractable so it can be re-wrapped
 * for additional passkeys / recovery — the raw bytes stay inside this module.
 */
async function importVmk(rawVmk: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', rawVmk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

/** AES-GCM wrap raw VMK bytes under a KEK. */
async function wrapRaw(kek: CryptoKey, rawVmk: Uint8Array<ArrayBuffer>): Promise<WrappedVmk> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, rawVmk);
  return { wrapped: toB64(ciphertext), iv: toB64(iv) };
}

/** Export an in-memory VMK to raw bytes (used only to re-wrap it). */
async function exportVmk(vmk: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', vmk));
}

export interface WrappedVmk {
  wrapped: string;
  iv: string;
}

/**
 * First-time setup for a passkey: generate a fresh VMK, wrap it under the PRF-
 * derived KEK, and return both the in-memory VMK key and the wrapped blob to
 * persist. The raw VMK bytes are zeroed before returning.
 */
export async function createVmkForPrf(
  prf: PrfResult,
): Promise<{ vmk: CryptoKey; wrapped: WrappedVmk }> {
  const kek = await deriveKek(prf.prfOutput);
  const rawVmk = crypto.getRandomValues(new Uint8Array(32));
  try {
    const wrapped = await wrapRaw(kek, rawVmk);
    return { vmk: await importVmk(rawVmk), wrapped };
  } finally {
    rawVmk.fill(0);
  }
}

/** Wrap an existing VMK under another passkey's PRF (enrol a second device). */
export async function wrapVmkForPrf(prf: PrfResult, vmk: CryptoKey): Promise<WrappedVmk> {
  const kek = await deriveKek(prf.prfOutput);
  const rawVmk = await exportVmk(vmk);
  try {
    return await wrapRaw(kek, rawVmk);
  } finally {
    rawVmk.fill(0);
  }
}

/** Unwrap a stored VMK with the PRF-derived KEK into an in-memory VMK key. */
export async function unwrapVmkWithPrf(
  prf: PrfResult,
  wrappedVmkB64: string,
  wrapIvB64: string,
): Promise<CryptoKey> {
  const kek = await deriveKek(prf.prfOutput);
  const rawBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(wrapIvB64) },
    kek,
    fromB64(wrappedVmkB64),
  );
  const rawVmk = new Uint8Array(rawBuffer);
  try {
    return await importVmk(rawVmk);
  } finally {
    rawVmk.fill(0);
  }
}

// --- recovery key (high-entropy random key → HKDF; no slow KDF needed) ---

/** HKDF a 256-bit recovery key + salt into an AES-GCM KEK. */
async function deriveRecoveryKek(
  recoveryKey: Uint8Array<ArrayBuffer>,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const hkdf = await crypto.subtle.importKey('raw', recoveryKey, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: utf8('vault-recovery-v1') },
    hkdf,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface RecoveryWrap {
  recoveryKey: string;
  wrapped: string;
  iv: string;
  salt: string;
}

/**
 * Generate a fresh recovery key and wrap the VMK under it. The recovery key is
 * returned once (show it to the user); the server stores only the wrapped blob.
 */
export async function wrapVmkWithNewRecoveryKey(vmk: CryptoKey): Promise<RecoveryWrap> {
  const recovery = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rawVmk = await exportVmk(vmk);
  try {
    const kek = await deriveRecoveryKek(recovery, salt);
    const wrap = await wrapRaw(kek, rawVmk);
    return { recoveryKey: toB64(recovery), wrapped: wrap.wrapped, iv: wrap.iv, salt: toB64(salt) };
  } finally {
    rawVmk.fill(0);
    recovery.fill(0);
  }
}

/** Unwrap the VMK using a recovery key (fallback when PRF is unavailable). */
export async function unwrapVmkWithRecoveryKey(
  recoveryKeyB64: string,
  wrappedVmkB64: string,
  wrapIvB64: string,
  saltB64: string,
): Promise<CryptoKey> {
  const kek = await deriveRecoveryKek(fromB64(recoveryKeyB64.trim()), fromB64(saltB64));
  const rawBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(wrapIvB64) },
    kek,
    fromB64(wrappedVmkB64),
  );
  const rawVmk = new Uint8Array(rawBuffer);
  try {
    return await importVmk(rawVmk);
  } finally {
    rawVmk.fill(0);
  }
}

// --- item data encryption ---

export interface EncryptedBlob {
  v: number;
  iv: string;
  ct: string;
}

/** Whether a fetched `data` value is a zero-knowledge blob (vs legacy plaintext). */
export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as EncryptedBlob).v === 'number' &&
    typeof (value as EncryptedBlob).iv === 'string' &&
    typeof (value as EncryptedBlob).ct === 'string'
  );
}

/** Encrypt an item's `data` map under the VMK. */
export async function encryptData(
  vmk: CryptoKey,
  data: Record<string, string>,
): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, vmk, plaintext);
  return { v: 1, iv: toB64(iv), ct: toB64(ciphertext) };
}

/** Decrypt an item blob back into its `data` map. */
export async function decryptData(
  vmk: CryptoKey,
  blob: EncryptedBlob,
): Promise<Record<string, string>> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(blob.iv) },
    vmk,
    fromB64(blob.ct),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as Record<string, string>;
}
