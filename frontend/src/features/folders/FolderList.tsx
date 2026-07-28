import { useEffect, useState } from 'react';
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  updateFolder,
  type Folder,
} from '../../api/client';
import { PencilIcon, TrashIcon } from '../../components/icons';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

type FolderNode = Folder & { depth: number };

type View = 'list' | 'form';

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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [view, setView] = useState<View>('list');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);

  async function load() {
    setFolders(await fetchFolders());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load folders.'));
  }, []);

  function openCreate() {
    setEditingId(null);
    setName('');
    setParentId(null);
    setError(null);
    setView('form');
  }

  function openEdit(folder: Folder) {
    setEditingId(folder.id);
    setName(folder.name);
    setParentId(folder.parent_id);
    setError(null);
    setView('form');
  }

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
      setView('list');
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

  const parentOptions = (excludeId?: number) => (
    <>
      <option value="">— No parent (root) —</option>
      {folders
        .filter((f) => f.id !== excludeId)
        .map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
    </>
  );

  if (view === 'form') {
    return (
      <section className="folders">
        <h2>{editingId ? 'Edit folder' : 'New folder'}</h2>
        <form onSubmit={save}>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
          </label>
          <label>
            Parent
            <select
              value={parentId ?? ''}
              onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
            >
              {parentOptions(editingId ?? undefined)}
            </select>
          </label>
          <div className="form-actions">
            <button type="submit" disabled={busy || !name.trim()}>
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

  const term = search.trim().toLowerCase();
  const tree: FolderNode[] = term
    ? folders
        .filter((f) => f.name.toLowerCase().includes(term))
        .map((f) => ({ ...f, depth: 0 }))
    : orderByTree(folders);

  return (
    <section className="folders">
      <div className="vault-header">
        <h2>Folders</h2>
        <button className="small" onClick={openCreate}>
          + New
        </button>
      </div>

      <input
        className="folder-search"
        placeholder="Search folders…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {tree.length === 0 ? (
        <p className="muted">No folders found.</p>
      ) : (
        <ul className="folder-items">
          {tree.map((folder) => (
            <li key={folder.id} style={{ marginLeft: `${folder.depth * 18}px` }}>
              <span className="folder-name">📁 {folder.name}</span>
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
      {error && <p className="error">{error}</p>}
    </section>
  );
}
