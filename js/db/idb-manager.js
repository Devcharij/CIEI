/**
 * idb-manager.js
 * Asynchronous IndexedDB transactional wrapper compatible with GitHub Pages.
 * Manages high-volume trade flow persistence and analytical compound indexing.
 */
export class ComtradeDB {
    constructor() {
        this.dbName = 'UNComtradeAnalyticsDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Fatal error opening IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.info('IndexedDB (UNComtradeAnalyticsDB) successfully initialized.');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('trade_flows')) {
                    const store = db.createObjectStore('trade_flows', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('by_year', 'period', { unique: false });
                    store.createIndex('by_reporter', 'reporterISO', { unique: false });
                    store.createIndex('by_partner', 'partnerISO', { unique: false });
                    store.createIndex('by_commodity', 'cmdCode', { unique: false });
                    store.createIndex('by_flow', 'flowCode', { unique: false });
                    store.createIndex('by_composite', ['period', 'reporterISO', 'flowCode', 'cmdCode'], { unique: false });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows', 'metadata'], 'readwrite');
            transaction.objectStore('trade_flows').clear();
            transaction.objectStore('metadata').clear();
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (e) => reject(e.target.error);
        });
    }

    async insertBatch(records) {
        const BATCH_SIZE = 5000;
        let insertedCount = 0;
        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const chunk = records.slice(i, i + BATCH_SIZE);
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['trade_flows'], 'readwrite');
                const store = transaction.objectStore('trade_flows');
                chunk.forEach(record => store.add(record));
                transaction.oncomplete = () => {
                    insertedCount += chunk.length;
                    resolve();
                };
                transaction.onerror = (e) => reject(e.target.error);
            });
        }
        return insertedCount;
    }

    async setMetadata(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getMetadata(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result ? request.result.value : null);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Executes analytical queries based on sidebar filters.
     * Implements robust case-insensitive geopolitical cluster intersection checks.
     */
    async queryTradeFlows(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows'], 'readonly');
            const store = transaction.objectStore('trade_flows');
            const results = [];

            let request;
            if (filters.year && filters.year !== 'ALL') {
                const index = store.index('by_year');
                request = index.openCursor(IDBKeyRange.only(filters.year));
            } else {
                request = store.openCursor();
            }

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    let match = true;

                    // Standard Attribute Filtering
                    if (filters.reporter && filters.reporter !== 'ALL' && record.reporterISO !== filters.reporter) match = false;
                    if (filters.partner && filters.partner !== 'ALL' && record.partnerISO !== filters.partner) match = false;
                    if (filters.flow && filters.flow !== 'ALL' && record.flowCode !== filters.flow) match = false;
                    if (filters.commodity && filters.commodity !== 'ALL' && record.cmdCode !== filters.commodity) match = false;

                    // FOOLPROOF GEOPOLITICAL CLUSTER FILTERING
                    if (filters.geogroup && filters.geogroup !== 'ALL' && filters.geodescArray) {
                        const repISO = String(record.reporterISO || '').trim().toUpperCase();
                        const repDesc = String(record.reporterDesc || '').trim().toUpperCase();
                        const partISO = String(record.partnerISO || '').trim().toUpperCase();
                        const partDesc = String(record.partnerDesc || '').trim().toUpperCase();

                        const repInGroup = filters.geodescArray.some(g => repISO === g || repDesc.includes(g));
                        const partInGroup = filters.geodescArray.some(g => partISO === g || partDesc.includes(g));

                        // Retain record if EITHER the reporting actor OR the partner belongs to the selected cluster
                        if (!repInGroup && !partInGroup) match = false;
                    }

                    if (match) {
                        results.push(record);
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };

            request.onerror = (e) => reject(e.target.error);
        });
    }

    async getRecordCount() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows'], 'readonly');
            const store = transaction.objectStore('trade_flows');
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
}
