const DB_NAME = 'A4NotesDB';
const DB_VERSION = 2; 
const STORE_NAME = 'notes_store';

const NotesDB = {
    db: null,
    
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                }
            };
            
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            
            request.onerror = (e) => reject(e.target.error);
        });
    },

    saveNote: function(pagesArray, id = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            const data = { 
                pages: pagesArray, 
                updatedAt: new Date().toISOString() 
            };
            
            if (id) data.id = id;
            
            const request = id ? store.put(data) : store.add(data);
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getAllNotes: function() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    },

    getNote: function(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
};