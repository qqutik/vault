import { useEffect, useMemo, useRef, useState } from 'react';
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
  CheckIcon,
  CopyIcon,
  FolderIcon,
  FolderPlusIcon,
  KeyIcon,
  KeyPlusIcon,
  LockIcon,
  MoreIcon,
  PencilIcon,
  TrashIcon,
} from '../../components/icons';
import Menu from '../../components/Menu';
import { unlockVaultItem } from '../../auth/passkey';
import { useVaultKey } from '../encryption/vaultKey';
import { isEncryptedBlob, type EncryptedBlob } from '../../lib/crypto';
import PasswordField from './PasswordField';
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
  generate?: boolean;
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
    { key: 'password', label: 'Password', secret: true, generate: true },
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
  const { status: vaultStatus, unlock, unlockWithRecovery, ensureUnlocked, encrypt, decrypt } =
    useVaultKey();
  const migratedRef = useRef(false);
  // Track what we've already opened so a re-render (or StrictMode's double
  // effect invocation in dev) doesn't fire a second view/unlock — which would
  // duplicate the audit entry.
  const openedViewRef = useRef<number | null>(null);
  const openedFormRef = useRef<string | null>(null);

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
  const [copied, setCopied] = useState<string | null>(null);

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

  // Decrypt a fetched item's `data` (no-op for legacy plaintext items).
  async function decryptItem(item: VaultItemDetail): Promise<VaultItemDetail> {
    if (isEncryptedBlob(item.data as unknown)) {
      await ensureUnlocked();
      return { ...item, data: await decrypt(item.data as unknown as EncryptedBlob) };
    }
    return item;
  }

  // One-shot migration: re-encrypt legacy plaintext items under the vault key so
  // no plaintext remains server-side. Protected items migrate on their next edit.
  async function migrateLegacyItems() {
    let changed = false;
    for (const summary of items) {
      // Skip protected items and anything already encrypted — reading those
      // just to check would log a spurious "viewed" audit entry every unlock.
      if (summary.require_reauth || summary.encrypted) continue;
      try {
        const detail = await fetchVaultItem(summary.id);
        if (isEncryptedBlob(detail.data as unknown)) continue;
        const blob = (await encrypt(detail.data ?? {})) as unknown as Record<string, string>;
        await updateVaultItem(summary.id, {
          type: detail.type,
          title: detail.title,
          data: blob,
          folder_id: detail.folder_id,
          favorite: detail.favorite,
          require_reauth: detail.require_reauth,
        });
        changed = true;
      } catch {
        // Best effort — skip anything that fails and try again next unlock.
      }
    }
    if (changed) {
      await load();
      onChange?.();
    }
  }

  // Kick off migration once the vault is unlocked and the list has loaded.
  useEffect(() => {
    if (vaultStatus !== 'unlocked' || migratedRef.current || items.length === 0) return;
    migratedRef.current = true;
    migrateLegacyItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultStatus, items]);

  useEffect(() => {
    load().catch(() => setError('Failed to load your vault.'));
  }, []);

  // Populate the item form/detail from the URL.
  useEffect(() => {
    if (itemForm == null) {
      openedFormRef.current = null;
      return;
    }
    // Guard against a duplicate load (StrictMode / re-render) for the same form.
    if (openedFormRef.current === itemForm) return;
    openedFormRef.current = itemForm;
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
        .then(decryptItem)
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
    if (viewId == null) {
      openedViewRef.current = null;
      return;
    }
    // Guard against a duplicate open (StrictMode / re-render) for the same item.
    if (openedViewRef.current === viewId) return;
    openedViewRef.current = viewId;
    {
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
      load
        .then(decryptItem)
        .then(setDetail)
        .catch(() => {
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

    setBusy(true);
    setError(null);
    try {
      // Zero-knowledge: encrypt the secret payload in the browser before it
      // leaves. The server stores only the opaque blob.
      await ensureUnlocked();
      const encrypted = (await encrypt(data)) as unknown as Record<string, string>;

      const payload = {
        type,
        title: title.trim(),
        data: encrypted,
        folder_id: itemFolderId,
        favorite,
        require_reauth: requireReauth,
      };

      if (editingItemId) await updateVaultItem(editingItemId, payload);
      else await createVaultItem(payload);
      await load();
      onChange?.();
      closeOverlay();
    } catch {
      setError('Unlock the vault to save (passkey required).');
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

  async function copyField(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    } catch {
      // Clipboard may be unavailable (e.g. insecure context) — fail silently.
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
      {vaultStatus !== 'unlocked' && (
        <div className="lock-banner">
          <span className="lock-banner-text">
            <LockIcon size={15} /> Vault locked — secrets are end-to-end encrypted
          </span>
          <span className="lock-banner-actions">
            <button
              type="button"
              className="link"
              disabled={vaultStatus === 'unlocking'}
              onClick={() => {
                const key = window.prompt('Enter your recovery key');
                if (key) {
                  unlockWithRecovery(key).catch(() =>
                    setError('Recovery key did not work.'),
                  );
                }
              }}
            >
              Use recovery key
            </button>
            <button
              type="button"
              className="small"
              disabled={vaultStatus === 'unlocking'}
              onClick={() =>
                unlock().catch(() => setError('Could not unlock (passkey/PRF unavailable).'))
              }
            >
              {vaultStatus === 'unlocking' ? 'Unlocking…' : 'Unlock'}
            </button>
          </span>
        </div>
      )}

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
        <Menu
          label="Create"
          triggerClassName="add-btn"
          trigger={<PencilIcon size={18} />}
          items={[
            {
              label: 'New item',
              icon: <KeyPlusIcon size={17} />,
              onClick: openItemNew,
            },
            ...(favOnly
              ? []
              : [
                  {
                    label: 'New folder',
                    icon: <FolderPlusIcon size={17} />,
                    onClick: openFolderNew,
                  },
                ]),
          ]}
        />
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
                  <Menu
                    label="Folder actions"
                    trigger={<MoreIcon size={18} />}
                    items={[
                      {
                        label: 'Edit',
                        icon: <PencilIcon />,
                        onClick: () => openFolderEdit(folder.id),
                      },
                      {
                        label: 'Delete',
                        icon: <TrashIcon />,
                        danger: true,
                        disabled: busy,
                        onClick: () => removeFolder(folder),
                      },
                    ]}
                  />
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
                <Menu
                  label="Item actions"
                  trigger={<MoreIcon size={18} />}
                  items={[
                    {
                      label: 'Edit',
                      icon: <PencilIcon />,
                      onClick: () => openItemEdit(item.id),
                    },
                    {
                      label: 'Delete',
                      icon: <TrashIcon />,
                      danger: true,
                      disabled: busy,
                      onClick: () => removeItem(item.id),
                    },
                  ]}
                />
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
        <Modal title={editingItemId ? 'Edit vault' : 'New vault'} onClose={closeOverlay}>
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
              spec.generate ? (
                <PasswordField
                  key={spec.key}
                  label={spec.label}
                  value={fields[spec.key] ?? ''}
                  onChange={(v) => setFields({ ...fields, [spec.key]: v })}
                />
              ) : spec.textarea ? (
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
        <Modal title={detail.title} onClose={closeOverlay} bareHeader>
          <div className="view-head">
            <span className="view-type">{TYPE_LABEL[detail.type]}</span>
            <h2 className="view-title">{detail.title}</h2>
          </div>

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
                    <button
                      type="button"
                      className="icon-btn copy-btn"
                      title={copied === spec.key ? 'Copied' : 'Copy'}
                      aria-label={`Copy ${spec.label}`}
                      onClick={() => copyField(spec.key, detail.data[spec.key])}
                    >
                      {copied === spec.key ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
                    </button>
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
