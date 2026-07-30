import { useCallback, useEffect, useState } from 'react';
import {
  deletePasskey,
  fetchEnrolledCredentials,
  fetchPasskeys,
  fetchRecoveryMaterial,
  type Passkey,
} from '../../api/client';
import { addPasskey } from '../../auth/passkey';
import { useVaultKey } from '../encryption/vaultKey';
import { LockIcon, LockPlusIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';
import { useDialog } from '../../components/DialogProvider';
import { useToast } from '../../components/ToastProvider';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

export default function PasskeyManager({ onChange }: Props) {
  const { enroll, setupRecovery } = useVaultKey();
  const { confirm } = useDialog();
  const toast = useToast();

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [recoverySet, setRecoverySet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [alias, setAlias] = useState('');
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const refreshEnrolled = useCallback(() => {
    fetchEnrolledCredentials().then(setEnrolled).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchPasskeys()
      .then(setPasskeys)
      .catch(() => setError('Failed to load passkeys.'));
    refreshEnrolled();
    fetchRecoveryMaterial()
      .then((m) => setRecoverySet(m !== null))
      .catch(() => undefined);
  }, [refreshEnrolled]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = alias.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    try {
      const { credentialId, passkeys: updated } = await addPasskey(name);
      setPasskeys(updated);
      onChange?.();
      setAdding(false);
      setAlias('');
      // Enrol the new device for encryption (wraps the vault key under its passkey).
      try {
        await enroll(credentialId);
        refreshEnrolled();
      } catch {
        setError('Passkey added, but enabling encryption on it failed. Use “Enable encryption”.');
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not add the passkey. Try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function enableEncryption(passkey: Passkey) {
    setBusy(true);
    setError(null);
    try {
      await enroll(passkey.id);
      refreshEnrolled();
    } catch {
      setError('Could not enable encryption on this passkey (PRF/passkey unavailable).');
    } finally {
      setBusy(false);
    }
  }

  async function createRecoveryKey() {
    setBusy(true);
    setError(null);
    try {
      setRecoveryKey(await setupRecovery());
      setRecoverySet(true);
    } catch {
      setError('Could not set up a recovery key (unlock the vault first).');
    } finally {
      setBusy(false);
    }
  }

  async function remove(passkey: Passkey) {
    const label = passkey.alias ?? 'this passkey';
    const ok = await confirm({
      title: 'Remove passkey?',
      message: `You will no longer be able to sign in with ${label}.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      setPasskeys(await deletePasskey(passkey.id));
      onChange?.();
      refreshEnrolled();
      toast.success('Passkey removed');
    } catch (err) {
      const message =
        (err as { response?: { data?: { errors?: { id?: string[] } } } }).response?.data?.errors
          ?.id?.[0] ?? 'Failed to remove passkey.';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="passkeys">
      <nav className="crumbs" aria-label="Breadcrumb">
        <span className="crumb active">Passkeys</span>
      </nav>

      <div className="section-controls">
        <p className="muted passkeys-hint">
          Register several devices — phone, laptop, security key. If you lose one, sign in with
          another.
        </p>
        <button
          className="small add-btn"
          onClick={() => {
            setError(null);
            setAlias('');
            setAdding(true);
          }}
          aria-label="Add passkey"
          title="Add passkey"
        >
          <LockPlusIcon size={20} />
        </button>
      </div>

      {passkeys.length === 0 ? (
        <p className="muted">No passkeys yet.</p>
      ) : (
        <ul className="passkey-items">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <div className="passkey-row">
                <span className="passkey-name">
                  <LockIcon size={17} />
                  {passkey.alias ?? 'Unnamed device'}
                </span>
                <span className="passkey-date">
                  {enrolled.includes(passkey.id) ? (
                    <span className="tag-ok">encrypted</span>
                  ) : (
                    <button
                      className="link"
                      onClick={() => enableEncryption(passkey)}
                      disabled={busy}
                    >
                      Enable encryption
                    </button>
                  )}
                </span>
              </div>
              <span className="row-actions">
                <button
                  className="icon-btn danger"
                  title="Remove"
                  aria-label="Remove passkey"
                  onClick={() => remove(passkey)}
                  disabled={busy}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {!adding && error && <p className="error">{error}</p>}

      <div className="recovery-row">
        <span className="muted">
          Recovery key {recoverySet ? '· set' : '· not set'} — unlocks your vault if you lose every
          passkey.
        </span>
        <button className="link" onClick={createRecoveryKey} disabled={busy}>
          {recoverySet ? 'Regenerate' : 'Set up recovery key'}
        </button>
      </div>

      {adding && (
        <Modal title="Add a passkey" onClose={() => setAdding(false)}>
          <form onSubmit={add}>
            <label>
              Device name
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="e.g. iPhone, Work laptop, YubiKey"
                autoFocus
                required
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy || !alias.trim()}>
                {busy ? 'Waiting for passkey…' : 'Create passkey'}
              </button>
              <button type="button" className="secondary" onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        </Modal>
      )}

      {recoveryKey && (
        <Modal title="Save your recovery key" onClose={() => setRecoveryKey(null)}>
          <p className="muted">
            Store this somewhere safe. It’s shown once and is the only way back in if you lose all
            your passkeys.
          </p>
          <p className="mono recovery-key">{recoveryKey}</p>
          <div className="form-actions">
            <button type="button" onClick={() => navigator.clipboard?.writeText(recoveryKey)}>
              Copy
            </button>
            <button type="button" className="secondary" onClick={() => setRecoveryKey(null)}>
              I saved it
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
