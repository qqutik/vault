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

export default function FolderList({ onChange }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError('Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run(() => createFolder(name)).then(() => setNewName(''));
  }

  function startEdit(folder: Folder) {
    setEditingId(folder.id);
    setEditName(folder.name);
  }

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = editName.trim();
    if (!name || editingId === null) return;
    const id = editingId;
    run(() => updateFolder(id, name)).then(() => setEditingId(null));
  }

  function handleDelete(folder: Folder) {
    if (!confirm(`Delete folder “${folder.name}”?`)) return;
    run(() => deleteFolder(folder.id));
  }

  return (
    <section className="folders">
      <h2>Folders</h2>

      <form className="folder-add" onSubmit={handleCreate}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New folder name"
        />
        <button type="submit" disabled={busy || !newName.trim()}>
          Add
        </button>
      </form>

      {folders.length === 0 ? (
        <p className="muted">No folders yet.</p>
      ) : (
        <ul className="folder-items">
          {folders.map((folder) => (
            <li key={folder.id}>
              {editingId === folder.id ? (
                <form className="folder-edit" onSubmit={handleRename}>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
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
                    <button className="link" onClick={() => startEdit(folder)}>
                      Rename
                    </button>
                    <button className="link danger" onClick={() => handleDelete(folder)}>
                      Delete
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
