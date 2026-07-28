import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createFolder,
  createVaultItem,
  deleteFolder,
  deleteVaultItem,
  fetchFolders,
  fetchVaultItem,
  fetchVaultItems,
  updateFolder,
  updateVaultItem,
  type Folder,
  type VaultItemDetail,
  type VaultItemSummary,
  type VaultItemType,
} from '../../api/client';
import {
  FolderIcon,
  FolderPlusIcon,
  KeyIcon,
  KeyPlusIcon,
  LockIcon,
  PencilIcon,
  TrashIcon,
} from '../../components/icons';
import { unlockVaultItem } from '../../auth/passkey';
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

export default function VaultBrowser({ onChange }: Props) {
  const [params, setParams] = useSearchParams();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<VaultItemSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Item form state.
  const [type, setType] = useState<VaultItemType>('login');
  const [title, setTitle] = useState('');
  const [itemFolderId, setItemFolderId] = useState<number | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [requireReauth, setRequireReauth] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});

  // Item view state.
  const [detail, setDetail] = useState<VaultItemDetail | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Folder form state.
  const [folderName, setFolderName] = useState('');
  const [folderParentId, setFolderParentId] = useState<number | null>(null);

  // --- URL is the source of truth for location & overlays ---
  const currentFolderId = params.get('folder') ? Number(params.get('folder')) : null;
  const favOnly = params.get('fav') === '1';
  const viewId = params.get('view') ? Number(params.get('view')) : null;
  const itemForm = params.get('itemForm'); // 'new' | '<id>' | null
  const folderForm = params.get('folderForm'); // 'new' | '<id>' | null
  const editingItemId = itemForm && itemForm !== 'new' ? Number(itemForm) : null;
  const editingFolderId = folderForm && folderForm !== 'new' ? Number(folderForm) : null;

  function patchParams(next: Record<string, string | null>) {
    const p = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) p.delete(key);
      else p.set(key, value);
    }
    setParams(p);
  }

  const openFolder = (id: number | null) =>
    patchParams({
      folder: id != null ? String(id) : null,
      fav: null,
      view: null,
      itemForm: null,
      folderForm: null,
    });
  const openItemView = (id: number) => patchParams({ view: String(id), itemForm: null });
  const openItemNew = () => patchParams({ itemForm: 'new', view: null });
  const openItemEdit = (id: number) => patchParams({ itemForm: String(id), view: null });
  const openFolderNew = () => patchParams({ folderForm: 'new' });
  const openFolderEdit = (id: number) => patchParams({ folderForm: String(id) });
  const closeOverlay = () =>
    patchParams({ view: null, itemForm: null, folderForm: null });

  async function load() {
    const [f, i] = await Promise.all([fetchFolders(), fetchVaultItems()]);
    setFolders(f);
    setItems(i);
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load your vault.'));
  }, []);

  // Populate the item form/detail from the URL.
  useEffect(() => {
    setError(null);
    if (itemForm === 'new') {
      setType('login');
      setTitle('');
      setItemFolderId(currentFolderId);
      setFavorite(false);
      setRequireReauth(false);
      setFields({});
    } else if (editingItemId != null) {
      // Editing a protected item needs a fresh passkey to reveal its data.
      const summary = items.find((i) => i.id === editingItemId);
      const load = summary?.require_reauth
        ? unlockVaultItem(editingItemId)
        : fetchVaultItem(editingItemId);
      load
        .then((item) => {
          setType(item.type);
          setTitle(item.title);
          setItemFolderId(item.folder_id);
          setFavorite(item.favorite);
          setRequireReauth(item.require_reauth);
          setFields(item.data ?? {});
        })
        .catch(() => {
          setError('Failed to open item.');
          closeOverlay();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemForm]);

  useEffect(() => {
    if (viewId != null) {
      setRevealed({});
      setDetail(null);
      // For a protected item, go straight to the passkey unlock — never fetch
      // its data with a plain GET first. Fall back to GET only when the item
      // isn't in the loaded list (deep link); that GET withholds the secret and
      // triggers unlock if needed.
      const summary = items.find((i) => i.id === viewId);
      const load = summary
        ? summary.require_reauth
          ? unlockVaultItem(viewId)
          : fetchVaultItem(viewId)
        : fetchVaultItem(viewId).then((item) =>
            item.require_reauth ? unlockVaultItem(viewId) : item,
          );
      load.then(setDetail).catch(() => {
        setError('Passkey required to open this item.');
        closeOverlay();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  // Populate the folder form from the URL.
  useEffect(() => {
    if (folderForm === 'new') {
      setFolderName('');
      setFolderParentId(currentFolderId);
    } else if (editingFolderId != null) {
      const folder = folders.find((f) => f.id === editingFolderId);
      if (folder) {
        setFolderName(folder.name);
        setFolderParentId(folder.parent_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderForm, folders]);

  // --- Derived data for the current view ---
  const term = search.trim().toLowerCase();

  const breadcrumb = useMemo(() => {
    const chain: Folder[] = [];
    let cursor = currentFolderId;
    const byId = new Map(folders.map((f) => [f.id, f]));
    while (cursor != null) {
      const folder = byId.get(cursor);
      if (!folder) break;
      chain.unshift(folder);
      cursor = folder.parent_id;
    }
    return chain;
  }, [folders, currentFolderId]);

  const subfolders = useMemo(
    () =>
      folders
        .filter((f) => f.parent_id === currentFolderId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [folders, currentFolderId],
  );

  const visibleItems = useMemo(() => {
    let list: VaultItemSummary[];
    if (term) list = items.filter((i) => i.title.toLowerCase().includes(term));
    else if (favOnly) list = items.filter((i) => i.favorite);
    else list = items.filter((i) => i.folder_id === currentFolderId);
    return [...list].sort((a, b) => Number(b.favorite) - Number(a.favorite));
  }, [items, term, favOnly, currentFolderId]);

  const matchedFolders = useMemo(
    () => (term ? folders.filter((f) => f.name.toLowerCase().includes(term)) : subfolders),
    [term, folders, subfolders],
  );

  const showFolders = !favOnly;
  const isEmpty = (!showFolders || matchedFolders.length === 0) && visibleItems.length === 0;

  // --- Item form helpers ---
  const folderOptions: SelectOption[] = [
    { value: '', label: '— No folder —' },
    ...folders.map((f) => ({ value: String(f.id), label: f.name })),
  ];

  const parentOptions: SelectOption[] = [
    { value: '', label: '— No parent (root) —' },
    ...folders
      .filter((f) => f.id !== editingFolderId)
      .map((f) => ({ value: String(f.id), label: f.name })),
  ];

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Record<string, string> = {};
    for (const spec of SCHEMAS[type]) {
      const value = (fields[spec.key] ?? '').trim();
      if (value) data[spec.key] = value;
    }
    const payload = {
      type,
      title: title.trim(),
      data,
      folder_id: itemFolderId,
      favorite,
      require_reauth: requireReauth,
    };

    setBusy(true);
    setError(null);
    try {
      if (editingItemId) await updateVaultItem(editingItemId, payload);
      else await createVaultItem(payload);
      await load();
      onChange?.();
      closeOverlay();
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: number) {
    if (!confirm('Delete this item?')) return;
    setBusy(true);
    try {
      await deleteVaultItem(id);
      await load();
      onChange?.();
    } catch {
      setError('Failed to delete.');
    } finally {
      setBusy(false);
    }
  }

  async function saveFolder(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      if (editingFolderId) await updateFolder(editingFolderId, trimmed, folderParentId);
      else await createFolder(trimmed, folderParentId);
      await load();
      onChange?.();
      closeOverlay();
    } catch (err) {
      const errors = (err as { response?: { data?: { errors?: Record<string, string[]> } } })
        .response?.data?.errors;
      const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
      setError(firstError ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function removeFolder(folder: Folder) {
    if (!confirm(`Delete folder “${folder.name}”? Subfolders and their items go too.`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteFolder(folder.id);
      await load();
      onChange?.();
    } catch {
      setError('Failed to delete.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="vault">
      {/* Breadcrumb */}
      <nav className="crumbs" aria-label="Breadcrumb">
        <button
          type="button"
          className={`crumb${currentFolderId == null && !favOnly ? ' active' : ''}`}
          onClick={() => openFolder(null)}
        >
          Vaults
        </button>
        {favOnly && (
          <>
            <span className="crumb-sep">/</span>
            <span className="crumb active">Favorites</span>
          </>
        )}
        {breadcrumb.map((folder) => (
          <span key={folder.id} className="crumb-part">
            <span className="crumb-sep">/</span>
            <button type="button" className="crumb" onClick={() => openFolder(folder.id)}>
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="section-controls">
        <input
          placeholder="Search your whole vault..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!favOnly && (
          <button
            className="icon-btn add-folder"
            onClick={openFolderNew}
            aria-label="New folder"
            title="New folder here"
          >
            <FolderPlusIcon size={18} />
          </button>
        )}
        <button className="small add-btn" onClick={openItemNew} aria-label="New item" title="New item here">
          <KeyPlusIcon size={20} />
        </button>
      </div>

      {isEmpty ? (
        <p className="muted">
          {term ? 'Nothing found.' : favOnly ? 'No favorites yet.' : 'This folder is empty.'}
        </p>
      ) : (
        <ul className="tree">
          {showFolders &&
            matchedFolders.map((folder) => (
              <li key={`f-${folder.id}`}>
                <button
                  type="button"
                  className="folder-open"
                  onClick={() => openFolder(folder.id)}
                >
                  <span className="folder-name">
                    <FolderIcon size={18} />
                    {folder.name}
                  </span>
                  <span className="crumb-sep">▸</span>
                </button>
                <span className="row-actions">
                  <button
                    className="icon-btn"
                    title="Rename / Move"
                    aria-label="Rename or move folder"
                    onClick={() => openFolderEdit(folder.id)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Delete"
                    aria-label="Delete folder"
                    onClick={() => removeFolder(folder)}
                    disabled={busy}
                  >
                    <TrashIcon />
                  </button>
                </span>
              </li>
            ))}

          {visibleItems.map((item) => (
            <li key={`i-${item.id}`}>
              <button
                type="button"
                className={`item-open${item.favorite ? ' favorite' : ''}`}
                onClick={() => openItemView(item.id)}
              >
                <span className="item-title">
                  <span className="item-icon">
                    <KeyIcon size={17} />
                  </span>
                  {item.title}
                </span>
                <span className="item-meta">
                  {item.require_reauth && (
                    <span className="item-protected" title="Passkey required to view">
                      <LockIcon size={14} />
                    </span>
                  )}
                  <span className="item-type">{TYPE_LABEL[item.type]}</span>
                </span>
              </button>
              <span className="row-actions">
                <button
                  className="icon-btn"
                  title="Edit"
                  aria-label="Edit item"
                  onClick={() => openItemEdit(item.id)}
                >
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  aria-label="Delete item"
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {viewId == null && itemForm == null && folderForm == null && error && (
        <p className="error">{error}</p>
      )}

      {/* Item create / edit */}
      {itemForm != null && (
        <Modal title={editingItemId ? 'Edit item' : 'New item'} onClose={closeOverlay}>
          <form onSubmit={saveItem}>
            <label>
              Type
              <Select
                value={type}
                options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
                onChange={(v) => setType(v as VaultItemType)}
              />
            </label>

            <label>
              Folder
              <Select
                value={itemFolderId != null ? String(itemFolderId) : ''}
                options={folderOptions}
                onChange={(v) => setItemFolderId(v ? Number(v) : null)}
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

            <div className="field">
              <span>Require passkey to view</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={requireReauth}
                  onChange={(e) => setRequireReauth(e.target.checked)}
                />
                <span className="slider" />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={busy || !title.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="secondary" onClick={closeOverlay}>
                Cancel
              </button>
            </div>
            {error && <p className="error">{error}</p>}
          </form>
        </Modal>
      )}

      {/* Item view */}
      {viewId != null && detail && (
        <Modal title={detail.title} onClose={closeOverlay}>
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

          <p className="muted item-created">
            Created{' '}
            {new Date(detail.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>

          <div className="form-actions">
            <button type="button" onClick={() => openItemEdit(detail.id)}>
              Edit
            </button>
            <button type="button" className="secondary" onClick={closeOverlay}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Folder create / edit */}
      {folderForm != null && (
        <Modal title={editingFolderId ? 'Edit folder' : 'New folder'} onClose={closeOverlay}>
          <form onSubmit={saveFolder}>
            <label>
              Name
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label>
              Parent
              <Select
                value={folderParentId != null ? String(folderParentId) : ''}
                options={parentOptions}
                onChange={(v) => setFolderParentId(v ? Number(v) : null)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy || !folderName.trim()}>
                {busy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="secondary" onClick={closeOverlay}>
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
