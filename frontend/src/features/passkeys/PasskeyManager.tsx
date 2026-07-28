import { useEffect, useState } from 'react';
import { deletePasskey, fetchPasskeys, type Passkey } from '../../api/client';
import { addPasskey } from '../../auth/passkey';
import { LockIcon, LockPlusIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function PasskeyManager({ onChange }: Props) {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [alias, setAlias] = useState('');

  useEffect(() => {
    fetchPasskeys()
      .then(setPasskeys)
      .catch(() => setError('Failed to load passkeys.'));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = alias.trim();
    if (!name) return;

    setBusy(true);
    setError(null);
    try {
      setPasskeys(await addPasskey(name));
      onChange?.();
      setAdding(false);
      setAlias('');
    } catch (err) {
      // A cancelled WebAuthn prompt throws; keep the modal open with a hint.
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Could not add the passkey. Try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(passkey: Passkey) {
    const label = passkey.alias ?? 'this passkey';
    if (!confirm(`Remove ${label}? You will no longer be able to sign in with it.`)) return;

    setBusy(true);
    setError(null);
    try {
      setPasskeys(await deletePasskey(passkey.id));
      onChange?.();
    } catch (err) {
      const message =
        (err as { response?: { data?: { errors?: { id?: string[] } } } }).response?.data?.errors
          ?.id?.[0] ?? 'Failed to remove passkey.';
      setError(message);
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
                <span className="passkey-date">Added {formatDate(passkey.created_at)}</span>
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
    </section>
  );
}
