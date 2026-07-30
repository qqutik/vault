/**
 * Persist the in-memory vault key (VMK) across page reloads via IndexedDB.
 *
 * IndexedDB can store a `CryptoKey` object directly. It is scoped to this origin
 * and cleared on lock / logout / auto-lock. Trade-off: while stored, a reload
 * restores the unlocked state without a passkey tap.
 */

const DB_NAME = 'vault-zk';
const STORE = 'keys';
const KEY = 'vmk';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function toPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Store the VMK for later restoration. */
export async function saveVmk(key: CryptoKey): Promise<void> {
  const db = await openDb();
  await toPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).put(key, KEY));
}

/** Restore a previously stored VMK, or null when none / unavailable. */
export async function loadVmk(): Promise<CryptoKey | null> {
  try {
    const db = await openDb();
    const value = await toPromise(db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY));
    return value instanceof CryptoKey ? value : null;
  } catch {
    return null;
  }
}

/** Forget the stored VMK (on lock / logout / auto-lock). */
export async function clearVmk(): Promise<void> {
  try {
    const db = await openDb();
    await toPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(KEY));
  } catch {
    // best effort
  }
}
