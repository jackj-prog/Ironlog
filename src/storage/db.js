// Keep the original database name so existing local data survives the IronLog rebrand.
const DB_NAME = 'personal-fitness-tracker';
const DB_VERSION = 3;

export const STORE_NAMES = ['weightLogs', 'measurementLogs', 'workoutSessions', 'preferences', 'bodyCompositionLogs'];
const LEGACY_STORE_NAMES = ['weights', 'measurements', 'workouts', 'settings'];
const ALL_STORES = [...STORE_NAMES, ...LEGACY_STORE_NAMES];

function canUseIndexedDB() {
  return typeof indexedDB !== 'undefined';
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      ALL_STORES.forEach((store) => {
        if (!db.objectStoreNames.contains(store)) {
          const objectStore = db.createObjectStore(store, { keyPath: 'id' });
          if (STORE_NAMES.includes(store)) {
            objectStore.createIndex('date', 'date', { unique: false });
            objectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function localKey(store) {
  return `${DB_NAME}:${store}`;
}

function readLocal(store) {
  try {
    return JSON.parse(localStorage.getItem(localKey(store)) ?? '[]');
  } catch {
    return [];
  }
}

function writeLocal(store, records) {
  localStorage.setItem(localKey(store), JSON.stringify(records));
}

async function withStore(store, mode, callback) {
  const db = await openDatabase();
  if (!db.objectStoreNames.contains(store)) {
    db.close();
    return mode === 'readonly' ? [] : undefined;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const request = callback(objectStore);
    let result;

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      db.close();
      resolve(result);
    };
  });
}

export const storage = {
  async list(store) {
    if (!canUseIndexedDB()) return readLocal(store);
    try {
      return await withStore(store, 'readonly', (objectStore) => objectStore.getAll());
    } catch {
      return readLocal(store);
    }
  },

  async get(store, id) {
    if (!canUseIndexedDB()) return readLocal(store).find((item) => item.id === id) ?? null;
    try {
      return (await withStore(store, 'readonly', (objectStore) => objectStore.get(id))) ?? null;
    } catch {
      return readLocal(store).find((item) => item.id === id) ?? null;
    }
  },

  async create(store, record) {
    return this.upsert(store, record);
  },

  async update(store, id, updates) {
    const existing = await this.get(store, id);
    if (!existing) throw new Error(`No ${store} record found for ${id}`);
    return this.upsert(store, { ...existing, ...updates });
  },

  async upsert(store, record) {
    if (!canUseIndexedDB()) {
      const records = readLocal(store).filter((item) => item.id !== record.id);
      writeLocal(store, [...records, record]);
      return record;
    }

    try {
      await withStore(store, 'readwrite', (objectStore) => objectStore.put(record));
      return record;
    } catch {
      const records = readLocal(store).filter((item) => item.id !== record.id);
      writeLocal(store, [...records, record]);
      return record;
    }
  },

  async remove(store, id) {
    if (!canUseIndexedDB()) {
      writeLocal(store, readLocal(store).filter((item) => item.id !== id));
      return;
    }

    try {
      await withStore(store, 'readwrite', (objectStore) => objectStore.delete(id));
    } catch {
      writeLocal(store, readLocal(store).filter((item) => item.id !== id));
    }
  },

  async replaceAll(store, records) {
    if (!canUseIndexedDB()) {
      writeLocal(store, records);
      return records;
    }

    try {
      await withStore(store, 'readwrite', (objectStore) => objectStore.clear());
      await Promise.all(records.map((record) => this.upsert(store, record)));
    } catch {
      writeLocal(store, records);
    }
    return records;
  },

  async clearStores(stores = STORE_NAMES) {
    await Promise.all(
      stores.map(async (store) => {
        if (canUseIndexedDB()) {
          try {
            await withStore(store, 'readwrite', (objectStore) => objectStore.clear());
          } catch {
            writeLocal(store, []);
          }
        }
        writeLocal(store, []);
      }),
    );
  },
};
