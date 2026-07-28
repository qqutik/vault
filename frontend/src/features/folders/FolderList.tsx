import { useEffect, useState } from 'react';
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  updateFolder,
  type Folder,
} from '../../api/client';

interface Props {
  /** Called after any change so the parent can refresh dependent data (stats). */
  onChange?: () => void;
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function load() {
    setFolders(await fetchFolders());
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load folders.'));
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChange?.();
    } catch (err) {
      const parentError =
        (err as { response?: { data?: { errors?: { parent_id?: string[] } } } })
          .response?.data?.errors?.parent_id?.[0];
      setError(parentError ?? 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run(() => createFolder(name, newParentId)).then(() => {
      setNewName('');
      setNewParentId(null);
    });
  }

  function startEdit(folder: Folder) {
    setEditingId(folder.id);
    setEditName(folder.name);
    setEditParentId(folder.parent_id);
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = editName.trim();
    if (!name || editingId === null) return;
    const id = editingId;
    run(() => updateFolder(id, name, editParentId)).then(() => setEditingId(null));
  }

  function handleDelete(folder: Folder) {
    if (!confirm(`Delete folder “${folder.name}”? Subfolders are deleted too.`)) return;
    run(() => deleteFolder(folder.id));
  }

  const term = search.trim().toLowerCase();
  const tree: FolderNode[] = term
    ? folders
        .filter((f) => f.name.toLowerCase().includes(term))
        .map((f) => ({ ...f, depth: 0 }))
    : orderByTree(folders);

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

  return (
    <section className="folders">
      <h2>Folders</h2>

      <input
        className="folder-search"
        placeholder="Search folders…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <form className="folder-add" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New folder name"
        />
        <select
          value={newParentId ?? ''}
          onChange={(e) => setNewParentId(e.target.value ? Number(e.target.value) : null)}
        >
          {parentOptions()}
        </select>
        <button type="submit" disabled={busy || !newName.trim()}>
          Add
        </button>
      </form>

      {tree.length === 0 ? (
        <p className="muted">No folders yet.</p>
      ) : (
        <ul className="folder-items">
          {tree.map((folder) => (
            <li key={folder.id} style={{ marginLeft: `${folder.depth * 18}px` }}>
              {editingId === folder.id ? (
                <form className="folder-edit" onSubmit={handleRename}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <select
                    value={editParentId ?? ''}
                    onChange={(e) =>
                      setEditParentId(e.target.value ? Number(e.target.value) : null)
                    }
                  >
                    {parentOptions(folder.id)}
                  </select>
                  <button type="submit" disabled={busy}>
                    Save
                  </button>
                  <button type="button" className="link" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="folder-name">📁 {folder.name}</span>
                  <span className="folder-actions">
                    <button
                      className="icon-btn"
                      onClick={() => startEdit(folder)}
                      title="Rename / Move"
                      aria-label="Rename or move folder"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={() => handleDelete(folder)}
                      title="Delete"
                      aria-label="Delete folder"
                    >
                      <TrashIcon />
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
