import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { PencilIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';
import Select, { type SelectOption } from '../../components/Select';

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

export default function VaultItems({ onChange }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const [items, setItems] = useState<VaultItemSummary[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<VaultItemType>('login');
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  const [detail, setDetail] = useState<VaultItemDetail | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const [fSearch, setFSearch] = useState('');

  // Derive the active overlay from the URL (the URL is the source of truth).
  const parts = location.pathname.split('/').filter(Boolean); // e.g. ['items', '5', 'edit']
  const sub = parts[1];
  const editMode = parts[2] === 'edit';
  const routeId = sub && sub !== 'new' ? Number(sub) : null;
  const overlay: 'none' | 'form' | 'view' =
    sub === 'new' || (routeId != null && editMode) ? 'form' : routeId != null ? 'view' : 'none';
  const editingId = routeId != null && editMode ? routeId : null;

  async function loadItems() {
    setItems(await fetchVaultItems({ search: fSearch }));
  }

  useEffect(() => {
    fetchFolders().then(setFolders).catch(() => setError('Failed to load folders.'));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadItems().catch(() => setError('Failed to load items.'));
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fSearch]);

  // Populate the form / detail based on the current route.
  useEffect(() => {
    setError(null);
    if (sub === 'new') {
      setType('login');
      setTitle('');
      setFolderId(null);
      setFavorite(false);
      setFields({});
    } else if (routeId != null && editMode) {
      fetchVaultItem(routeId)
        .then((item) => {
          setType(item.type);
          setTitle(item.title);
          setFolderId(item.folder_id);
          setFavorite(item.favorite);
          setFields(item.data ?? {});
        })
        .catch(() => setError('Failed to open item.'));
    } else if (routeId != null) {
      setRevealed({});
      fetchVaultItem(routeId).then(setDetail).catch(() => setError('Failed to open item.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const openCreate = () => navigate('/items/new');
  const openEdit = (id: number) => navigate(`/items/${id}/edit`);
  const openView = (id: number) => navigate(`/items/${id}`);
  const close = () => navigate('/items');

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
      await loadItems();
      onChange?.();
      close();
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
      await loadItems();
      onChange?.();
    } catch {
      setError('Failed to delete.');
    } finally {
      setBusy(false);
    }
  }

  const folderOptions: SelectOption[] = [
    { value: '', label: '— No folder —' },
    ...folders.map((f) => ({ value: String(f.id), label: f.name })),
  ];

  // Favorites first (stable within each group).
  const sortedItems = [...items].sort(
    (a, b) => Number(b.favorite) - Number(a.favorite),
  );

  return (
    <section className="vault">
      <div className="section-controls">
        <input
          placeholder="Find your keys..."
          value={fSearch}
          onChange={(e) => setFSearch(e.target.value)}
        />
        <button className="small add-btn" onClick={openCreate} aria-label="New item" title="New item">
          +
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <p className="muted">No items found.</p>
      ) : (
        <ul className="vault-items">
          {sortedItems.map((item) => (
            <li key={item.id}>
              <button
                className={`item-open${item.favorite ? ' favorite' : ''}`}
                onClick={() => openView(item.id)}
              >
                <span className="item-title">
                  <span className="item-icon">🔑</span>
                  {item.title}
                </span>
                <span className="item-type">{TYPE_LABEL[item.type]}</span>
              </button>
              <span className="row-actions">
                <button
                  className="icon-btn"
                  title="Edit"
                  aria-label="Edit item"
                  onClick={() => openEdit(item.id)}
                >
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  aria-label="Delete item"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {overlay === 'none' && error && <p className="error">{error}</p>}

      {overlay === 'form' && (
        <Modal title={editingId ? 'Edit item' : 'New item'} onClose={close}>
          <form onSubmit={save}>
            <label>
              Type
              <Select
                value={type}
                options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
                onChange={(v) => setType(v as VaultItemType)}
              />
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
              <Select
                value={folderId != null ? String(folderId) : ''}
                options={folderOptions}
                onChange={(v) => setFolderId(v ? Number(v) : null)}
              />
            </label>

            <div className="field">
              <span>Favorite</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={favorite}
                  onChange={(e) => setFavorite(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={busy || !title.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="secondary" onClick={close}>
                Cancel
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        </Modal>
      )}

      {overlay === 'view' && detail && (
        <Modal title={detail.title} onClose={close}>
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
            <button type="button" className="secondary" onClick={close}>
              Close
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
