import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  encryptionBootstrap,
  fetchRecoveryMaterial,
  fetchWrappedKey,
  storeRecovery,
  storeWrappedKey,
} from '../../api/client';
import {
  createVmkForPrf,
  decryptData,
  encryptData,
  runPrf,
  unwrapVmkWithPrf,
  unwrapVmkWithRecoveryKey,
  wrapVmkForPrf,
  wrapVmkWithNewRecoveryKey,
  type EncryptedBlob,
} from '../../lib/crypto';
import { clearVmk, loadVmk, saveVmk } from '../../lib/vaultStore';

/** Auto-lock the vault after this long without user interaction. */
const IDLE_LOCK_MS = 30 * 60 * 1000;

type Status = 'locked' | 'unlocking' | 'unlocked';

interface VaultKeyValue {
  status: Status;
  /** Prompt the passkey and load (or first-time create) the vault key. */
  unlock: () => Promise<void>;
  /** Unlock only if still locked (no-op when already unlocked). */
  ensureUnlocked: () => Promise<void>;
  /** Forget the in-memory key. */
  lock: () => void;
  /** Encrypt an item's data map (requires an unlocked vault). */
  encrypt: (data: Record<string, string>) => Promise<EncryptedBlob>;
  /** Decrypt an item blob (requires an unlocked vault). */
  decrypt: (blob: EncryptedBlob) => Promise<Record<string, string>>;
  /** Enrol another passkey for the (unlocked) vault. */
  enroll: (credentialId: string) => Promise<void>;
  /** Wrap the VMK under a fresh recovery key; returns the key to show once. */
  setupRecovery: () => Promise<string>;
  /** Unlock with a recovery key (fallback when PRF is unavailable). */
  unlockWithRecovery: (recoveryKey: string) => Promise<void>;
}

const VaultKeyContext = createContext<VaultKeyValue | null>(null);

export function VaultKeyProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('locked');
  const vmkRef = useRef<CryptoKey | null>(null);

  const unlock = useCallback(async () => {
    setStatus('unlocking');
    try {
      const boot = await encryptionBootstrap();
      const prf = await runPrf(boot.prf_salt);

      if (boot.initialized) {
        const wrapped = await fetchWrappedKey(prf.credentialId);
        if (!wrapped) {
          throw new Error('This passkey is not enrolled for encryption yet. Use an enrolled device.');
        }
        vmkRef.current = await unwrapVmkWithPrf(prf, wrapped.wrapped_vmk, wrapped.wrap_iv);
      } else {
        // First-time setup: mint a VMK and enrol this passkey.
        const { vmk, wrapped } = await createVmkForPrf(prf);
        await storeWrappedKey({
          credential_id: prf.credentialId,
          wrapped_vmk: wrapped.wrapped,
          wrap_iv: wrapped.iv,
        });
        vmkRef.current = vmk;
      }

      if (vmkRef.current) await saveVmk(vmkRef.current);
      setStatus('unlocked');
    } catch (error) {
      vmkRef.current = null;
      setStatus('locked');
      throw error;
    }
  }, []);

  const ensureUnlocked = useCallback(async () => {
    if (vmkRef.current) return;
    await unlock();
  }, [unlock]);

  const lock = useCallback(() => {
    vmkRef.current = null;
    setStatus('locked');
    void clearVmk();
  }, []);

  const encrypt = useCallback(async (data: Record<string, string>) => {
    if (!vmkRef.current) throw new Error('Vault is locked.');
    return encryptData(vmkRef.current, data);
  }, []);

  const decrypt = useCallback(async (blob: EncryptedBlob) => {
    if (!vmkRef.current) throw new Error('Vault is locked.');
    return decryptData(vmkRef.current, blob);
  }, []);

  const enroll = useCallback(
    async (credentialId: string) => {
      await ensureUnlocked();
      if (!vmkRef.current) throw new Error('Vault is locked.');
      const boot = await encryptionBootstrap();
      const prf = await runPrf(boot.prf_salt, credentialId);
      const wrapped = await wrapVmkForPrf(prf, vmkRef.current);
      await storeWrappedKey({
        credential_id: prf.credentialId,
        wrapped_vmk: wrapped.wrapped,
        wrap_iv: wrapped.iv,
      });
    },
    [ensureUnlocked],
  );

  const setupRecovery = useCallback(async () => {
    await ensureUnlocked();
    if (!vmkRef.current) throw new Error('Vault is locked.');
    const recovery = await wrapVmkWithNewRecoveryKey(vmkRef.current);
    await storeRecovery({
      wrapped_vmk: recovery.wrapped,
      wrap_iv: recovery.iv,
      salt: recovery.salt,
    });
    return recovery.recoveryKey;
  }, [ensureUnlocked]);

  const unlockWithRecovery = useCallback(async (recoveryKey: string) => {
    setStatus('unlocking');
    try {
      const material = await fetchRecoveryMaterial();
      if (!material) throw new Error('No recovery key is set up for this account.');
      vmkRef.current = await unwrapVmkWithRecoveryKey(
        recoveryKey,
        material.wrapped_vmk,
        material.wrap_iv,
        material.salt,
      );
      if (vmkRef.current) await saveVmk(vmkRef.current);
      setStatus('unlocked');
    } catch (error) {
      vmkRef.current = null;
      setStatus('locked');
      throw error;
    }
  }, []);

  // Restore a persisted key on load so a page reload doesn't re-prompt.
  useEffect(() => {
    loadVmk().then((key) => {
      if (key) {
        vmkRef.current = key;
        setStatus('unlocked');
      }
    });
  }, []);

  // Auto-lock after a period of inactivity.
  useEffect(() => {
    if (status !== 'unlocked') return;
    let timer = window.setTimeout(lock, IDLE_LOCK_MS);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, IDLE_LOCK_MS);
    };
    const events = ['click', 'keydown', 'pointerdown'];
    events.forEach((e) => window.addEventListener(e, reset));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, lock]);

  const value = useMemo<VaultKeyValue>(
    () => ({
      status,
      unlock,
      ensureUnlocked,
      lock,
      encrypt,
      decrypt,
      enroll,
      setupRecovery,
      unlockWithRecovery,
    }),
    [status, unlock, ensureUnlocked, lock, encrypt, decrypt, enroll, setupRecovery, unlockWithRecovery],
  );

  return <VaultKeyContext.Provider value={value}>{children}</VaultKeyContext.Provider>;
}

/** Access the vault-key context. Must be used within a VaultKeyProvider. */
export function useVaultKey(): VaultKeyValue {
  const context = useContext(VaultKeyContext);
  if (!context) {
    throw new Error('useVaultKey must be used within a VaultKeyProvider');
  }
  return context;
}
