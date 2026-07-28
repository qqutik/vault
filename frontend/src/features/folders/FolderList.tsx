import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  updateFolder,
  type Folder,
} from '../../api/client';
import { PencilIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';
import Select, { type SelectOption } from '../../components/Select';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

type FolderNode = Folder & { depth: number };

/** Flatten folders into display order (parents before children) with a depth. */
function orderByTree(folders: Folder[]): FolderNode[] {
  const byParent = new Map<number | null, Folder[]>();
  for (const folder of folders) {
    const list = byParent.get(folder.parent_id) ?? [];
    list.push(folder);
    byParent.set(folder.parent_id, list);
  }

  const result: FolderNode[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const folder of byParent.get(parentId) ?? []) {
      result.push({ ...folder, depth });
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 0);
  return result;
}

export default function FolderList({ onChange }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);

  // Derive the modal from the URL (the URL is the source of truth).
  const parts = location.pathname.split('/').filter(Boolean); // e.g. ['folders', '5', 'edit']
  const sub = parts[1];
  const editMode = parts[2] === 'edit';
  const routeId = sub && sub !== 'new' ? Number(sub) : null;
  const showForm = sub === 'new' || (routeId != null && editMode);
  const editingId = routeId != null && editMode ? routeId : null;

  async function load() {
    setFolders(await fetchFolders());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load folders.'));
  }, []);

  // Populate the form based on the current route (uses the loaded folder list).
  useEffect(() => {
    setError(null);
    if (sub === 'new') {
      setName('');
      setParentId(null);
    } else if (editingId != null) {
      const folder = folders.find((f) => f.id === editingId);
      if (folder) {
        setName(folder.name);
        setParentId(folder.parent_id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, folders]);

  const openCreate = () => navigate('/folders/new');
  const openEdit = (folder: Folder) => navigate(`/folders/${folder.id}/edit`);
  const close = () => navigate('/folders');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      if (editingId) await updateFolder(editingId, trimmed, parentId);
      else await createFolder(trimmed, parentId);
      await load();
      onChange?.();
      close();
    } catch (err) {
      const parentError =
        (err as { response?: { data?: { errors?: { parent_id?: string[] } } } })
          .response?.data?.errors?.parent_id?.[0];
      setError(parentError ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(folder: Folder) {
    if (!confirm(`Delete folder “${folder.name}”? Subfolders are deleted too.`)) return;
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

  const parentOptions = (excludeId?: number): SelectOption[] => [
    { value: '', label: '— No parent (root) —' },
    ...folders
      .filter((f) => f.id !== excludeId)
      .map((f) => ({ value: String(f.id), label: f.name })),
  ];

  const term = search.trim().toLowerCase();
  const tree: FolderNode[] = term
    ? folders
        .filter((f) => f.name.toLowerCase().includes(term))
        .map((f) => ({ ...f, depth: 0 }))
    : orderByTree(folders);

  return (
    <section className="folders">
      <div className="section-controls">
        <input
          placeholder="Find your keys..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="small add-btn" onClick={openCreate} aria-label="New folder" title="New folder">
          +
        </button>
      </div>

      {tree.length === 0 ? (
        <p className="muted">No folders found.</p>
      ) : (
        <ul className="folder-items">
          {tree.map((folder) => (
            <li key={folder.id} style={{ marginLeft: `${folder.depth * 18}px` }}>
              <div className="folder-row">
                <span className="folder-name">📁 {folder.name}</span>
              </div>
              <span className="row-actions">
                <button
                  className="icon-btn"
                  title="Rename / Move"
                  aria-label="Rename or move folder"
                  onClick={() => openEdit(folder)}
                >
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn danger"
                  title="Delete"
                  aria-label="Delete folder"
                  onClick={() => handleDelete(folder)}
                  disabled={busy}
                >
                  <TrashIcon />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {!showForm && error && <p className="error">{error}</p>}

      {showForm && (
        <Modal title={editingId ? 'Edit folder' : 'New folder'} onClose={close}>
          <form onSubmit={save}>
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
            </label>
            <label>
              Parent
              <Select
                value={parentId != null ? String(parentId) : ''}
                options={parentOptions(editingId ?? undefined)}
                onChange={(v) => setParentId(v ? Number(v) : null)}
              />
            </label>
            <div className="form-actions">
              <button type="submit" disabled={busy || !name.trim()}>
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
    </section>
  );
}
