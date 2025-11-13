import { Channel, PlaylistMeta } from '@/app/types';

export const DB_NAME = 'iptv_db_v1';
export const DB_VERSION = 1;
export const STORE_PLAYLISTS = 'playlists';
export const STORE_CHANNELS = 'channels';

export function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        // keyPath: listName
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'listName' });
      }
      if (!db.objectStoreNames.contains(STORE_CHANNELS)) {
        // keyPath: listName; value: { listName, channels: Channel[] }
        db.createObjectStore(STORE_CHANNELS, { keyPath: 'listName' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function idbTxComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export async function dbLoadIndex(): Promise<PlaylistMeta[]> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
  const store = tx.objectStore(STORE_PLAYLISTS);
  const all = await reqToPromise<PlaylistMeta[]>(store.getAll());
  await idbTxComplete(tx);
  db.close();
  // ordenar por nombre (opcional)
  return all.sort((a, b) => a.listName.localeCompare(b.listName));
}

export async function dbUpsertMeta(meta: PlaylistMeta): Promise<void> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  const store = tx.objectStore(STORE_PLAYLISTS);
  store.put(meta);
  await idbTxComplete(tx);
  db.close();
}

export async function dbDeleteMeta(listName: string): Promise<void> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).delete(listName);
  await idbTxComplete(tx);
  db.close();
}

export async function dbLoadChannels(listName: string): Promise<Channel[]> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_CHANNELS, 'readonly');
  const store = tx.objectStore(STORE_CHANNELS);
  const row = await reqToPromise<{ listName: string; channels: Channel[] } | undefined>(
    store.get(listName),
  );
  await idbTxComplete(tx);
  db.close();
  return row?.channels ?? [];
}

export async function dbSaveChannels(listName: string, channels: Channel[]): Promise<void> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_CHANNELS, 'readwrite');
  const store = tx.objectStore(STORE_CHANNELS);
  store.put({ listName, channels });
  await idbTxComplete(tx);
  db.close();
}

export async function dbDeleteChannels(listName: string): Promise<void> {
  const db = await idbOpen();
  const tx = db.transaction(STORE_CHANNELS, 'readwrite');
  tx.objectStore(STORE_CHANNELS).delete(listName);
  await idbTxComplete(tx);
  db.close();
}

export async function dbPutPlaylist(meta: PlaylistMeta, channels: Channel[]) {
  const db = await idbOpen();
  const tx = db.transaction([STORE_PLAYLISTS, STORE_CHANNELS], 'readwrite');
  tx.objectStore(STORE_PLAYLISTS).put(meta);
  tx.objectStore(STORE_CHANNELS).put({ listName: meta.listName, channels });
  await idbTxComplete(tx);
  db.close();
}
