
export const DB_NAME = 'AL_HOUT_PRO_ULTIMATE_DB';
export const DB_VERSION = 3;

export interface StoreNames {
  settings: 'settings';
  products: 'products';
  transactions: 'transactions';
  expenses: 'expenses';
  debts: 'debts';
  returns: 'returns';
}

const STORES: StoreNames = {
  settings: 'settings',
  products: 'products',
  transactions: 'transactions',
  expenses: 'expenses',
  debts: 'debts',
  returns: 'returns',
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveData = async (storeName: keyof StoreNames, key: string, data: any) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data, key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
};

export const getData = async (storeName: keyof StoreNames, key: string): Promise<any> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
