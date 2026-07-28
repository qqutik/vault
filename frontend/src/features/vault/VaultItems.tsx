import { useEffect, useState } from 'react';
import {
  createVaultItem,
  deleteVaultItem,
  fetchFolders,
  fetchVaultItem,
  fetchVaultItems,
  updateVaultItem,
  type Folder,
  type VaultItemDetail,
  type VaultItemSummary,
  type VaultItemType,
} from '../../api/client';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

interface FieldSpec {
  key: string;
  label: string;
  secret?: boolean;
  textarea?: boolean;
}

const TYPES: { value: VaultItemType; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'secure_note', label: 'Secure note' },
  { value: 'card', label: 'Card' },
  { value: 'identity', label: 'Identity' },
  { value: 'custom', label: 'Custom' },
];

const SCHEMAS: Record<VaultItemType, FieldSpec[]> = {
  login: [
    { key: 'username', label: 'Username' },
    { key: 'password', label: 'Password', secret: true },
    { key: 'url', label: 'URL' },
    { key: 'notes', label: 'Notes', textarea: true },
  ],
  secure_note: [{ key: 'note', label: 'Note', textarea: true }],
  card: [
    { key: 'cardholder', label: 'Cardholder' },
    { key: 'number', label: 'Card number', secret: true },
    { key: 'expiry', label: 'Expiry' },
    { key: 'cvv', label: 'CVV', secret: true },
  ],
  identity: [
    { key: 'full_name', label: 'Full name' },
    { key: 'document_number', label: 'Document number', secret: true },
    { key: 'notes', label: 'Notes', textarea: true },
  ],
  custom: [{ key: 'content', label: 'Content', textarea: true }],
};

const TYPE_LABEL: Record<VaultItemType, string> = Object.fromEntries(
  TYPES.map((t) => [t.value, t.label]),
) as Record<VaultItemType, string>;

type View = 'list' | 'form' | 'view';

export default function VaultItems({ onChange }: Props) {
  const [items, setItems] = useState<VaultItemSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>('list');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState<VaultItemType>('login');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  const [detail, setDetail] = useState<VaultItemDetail | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function load() {
    const [i, f] = await Promise.all([fetchVaultItems(), fetchFolders()]);
    setItems(i);
    setFolders(f);
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load items.'));
  }, []);

  function resetForm() {
    setEditingId(null);
    setType('login');
    setTitle('');
    setFolderId(null);
    setFavorite(false);
    setFields({});
  }

  function openCreate() {
    resetForm();
    setError(null);
    setView('form');
  }

  async function openEdit(id: number) {
    setError(null);
    try {
      const item = await fetchVaultItem(id);
      setEditingId(item.id);
      setType(item.type);
      setTitle(item.title);
      setFolderId(item.folder_id);
      setFavorite(item.favorite);
      setFields(item.data ?? {});
      setView('form');
    } catch {
      setError('Failed to open item.');
    }
  }

  async function openView(id: number) {
    setError(null);
    setRevealed({});
    try {
      setDetail(await fetchVaultItem(id));
      setView('view');
    } catch {
      setError('Failed to open item.');
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Record<string, string> = {};
    for (const spec of SCHEMAS[type]) {
      const value = (fields[spec.key] ?? '').trim();
      if (value) data[spec.key] = value;
    }

    const payload = { type, title: title.trim(), data, folder_id: folderId, favorite };

    setBusy(true);
    setError(null);
    try {
      if (editingId) await updateVaultItem(editingId, payload);
      else await createVaultItem(payload);
      await load();
      onChange?.();
      setView('list');
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm('Delete this item?')) return;
    setBusy(true);
    try {
      await deleteVaultItem(id);
      await load();
      onChange?.();
      setView('list');
    } catch {
      setError('Failed to delete.');
    } finally {
      setBusy(false);
    }
  }

  if (view === 'form') {
    return (
      <section className="vault">
        <h2>{editingId ? 'Edit item' : 'New item'}</h2>
        <form onSubmit={save}>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as VaultItemType)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          {SCHEMAS[type].map((spec) =>
            spec.textarea ? (
              <label key={spec.key}>
                {spec.label}
                <textarea
                  value={fields[spec.key] ?? ''}
                  onChange={(e) => setFields({ ...fields, [spec.key]: e.target.value })}
                  rows={3}
                />
              </label>
            ) : (
              <label key={spec.key}>
                {spec.label}
                <input
                  type={spec.secret ? 'password' : 'text'}
                  value={fields[spec.key] ?? ''}
                  onChange={(e) => setFields({ ...fields, [spec.key]: e.target.value })}
                />
              </label>
            ),
          )}

          <label>
            Folder
            <select
              value={folderId ?? ''}
              onChange={(e) => setFolderId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— No folder —</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
            />
            Favorite
          </label>

          <div className="form-actions">
            <button type="submit" disabled={busy || !title.trim()}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="secondary" onClick={() => setView('list')}>
              Cancel
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    );
  }

  if (view === 'view' && detail) {
    return (
      <section className="vault">
        <h2>
          {detail.favorite ? '★ ' : ''}
          {detail.title}
        </h2>
        <p className="muted">{TYPE_LABEL[detail.type]}</p>

        <dl className="item-fields">
          {SCHEMAS[detail.type]
            .filter((spec) => detail.data[spec.key])
            .map((spec) => (
              <div key={spec.key}>
                <dt>{spec.label}</dt>
                <dd>
                  {spec.secret && !revealed[spec.key] ? (
                    <>
                      <span className="mono">••••••••</span>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setRevealed({ ...revealed, [spec.key]: true })}
                      >
                        Reveal
                      </button>
                    </>
                  ) : (
                    <span className="mono">{detail.data[spec.key]}</span>
                  )}
                </dd>
              </div>
            ))}
        </dl>

        <div className="form-actions">
          <button type="button" onClick={() => openEdit(detail.id)}>
            Edit
          </button>
          <button type="button" className="secondary" onClick={() => setView('list')}>
            Back
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    );
  }

  return (
    <section className="vault">
      <div className="vault-header">
        <h2>Items</h2>
        <button className="small" onClick={openCreate}>
          + New
        </button>
      </div>

      {items.length === 0 ? (
        <p className="muted">No items yet.</p>
      ) : (
        <ul className="vault-items">
          {items.map((item) => (
            <li key={item.id}>
              <button className="item-open" onClick={() => openView(item.id)}>
                <span className="item-title">
                  {item.favorite ? '★ ' : ''}
                  {item.title}
                </span>
                <span className="item-type">{TYPE_LABEL[item.type]}</span>
              </button>
              <button
                className="link danger"
                onClick={() => remove(item.id)}
                disabled={busy}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
