import { emptyState, validateBackup, type State } from './domain';
const DB_NAME = 'bolchefitness';
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('data');
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () =>
      reject(new Error('Não foi possível acessar os dados deste dispositivo.'));
    request.onblocked = () =>
      reject(new Error('Feche outras abas do aplicativo e tente novamente.'));
  });
}
export async function loadState(): Promise<State> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readonly');
    const request = tx.objectStore('data').get('state');
    tx.oncomplete = () => {
      db.close();
      try {
        resolve(request.result === undefined ? emptyState() : validateBackup(request.result));
      } catch (e) {
        reject(e);
      }
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error('Não foi possível ler os treinos salvos.'));
    };
  });
}
// The read and write share one transaction: concurrent tabs cannot overwrite stale snapshots.
export async function mutateState(change: (state: State) => State): Promise<State> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('data', 'readwrite');
    let result: State;
    let failure: unknown;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        failure ??
          new Error('Não foi possível salvar. Libere espaço no dispositivo e tente novamente.')
      );
    };
    const store = tx.objectStore('data');
    const request = store.get('state');
    request.onsuccess = () => {
      try {
        const latest = request.result === undefined ? emptyState() : validateBackup(request.result);
        result = validateBackup(change(latest));
        store.put(result, 'state');
      } catch (e) {
        failure = e;
        tx.abort();
      }
    };
  });
}
export async function saveState(state: State): Promise<void> {
  await mutateState(() => state);
}
