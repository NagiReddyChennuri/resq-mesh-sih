import { openDB } from 'idb';

const DB_NAME = 'ResQMeshDB';
const STORE_NAME = 'sos_buffer';

export async function initDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

// Save SOS locally when offline
export async function saveOfflineSOS(packet) {
    const db = await initDB();
    return db.add(STORE_NAME, {
        ...packet,
        timestamp: new Date().toISOString(),
        status: 'buffered_offline',
    });
}

// Get all unsent offline packets
export async function getBufferedSOS() {
    const db = await initDB();
    return db.getAll(STORE_NAME);
}

// Clear packets after successful sync
export async function clearBufferedSOS() {
    const db = await initDB();
    return db.clear(STORE_NAME);
}