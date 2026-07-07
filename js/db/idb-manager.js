/**
 * idb-manager.js
 * Wrapper assíncrono para o IndexedDB compatível com GitHub Pages.
 * Gerencia a persistência de registros transacionados e índices analíticos.
 */
export class ComtradeDB {
    constructor() {
        this.dbName = 'UNComtradeAnalyticsDB';
        this.version = 1;
        this.db = null;
    }

    /**
     * Inicializa o banco de dados e constrói o schema relacional se não existir.
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error('Erro fatal ao abrir o IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.info('IndexedDB (ComtradeAnalyticsDB) inicializado com sucesso.');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Tabela de fluxos comerciais
                if (!db.objectStoreNames.contains('trade_flows')) {
                    const store = db.createObjectStore('trade_flows', { keyPath: 'id', autoIncrement: true });
                    
                    // Índices de busca unitária
                    store.createIndex('by_year', 'period', { unique: false });
                    store.createIndex('by_reporter', 'reporterISO', { unique: false });
                    store.createIndex('by_partner', 'partnerISO', { unique: false });
                    store.createIndex('by_commodity', 'cmdCode', { unique: false });
                    store.createIndex('by_flow', 'flowCode', { unique: false });
                    
                    // Índice composto para queries analíticas rápidas sem scan completo
                    store.createIndex('by_composite', ['period', 'reporterISO', 'flowCode', 'cmdCode'], { unique: false });
                }

                // Tabela de metadados e dicionários
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Limpa completamente o banco de dados para importar novo dataset Excel.
     */
    async clearAllData() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows', 'metadata'], 'readwrite');
            transaction.objectStore('trade_flows').clear();
            transaction.objectStore('metadata').clear();
            
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Inserção transacional em lote (Batch Insert) para alta performance na thread principal.
     * @param {Array} records - Array de objetos normalizados pelo parser.
     */
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

    /**
     * Armazena ou atualiza os metadados inferidos da planilha.
     */
    async setMetadata(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    /**
     * Recupera metadados armazenados.
     */
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
     * Executa consulta com base nos filtros selecionados no painel lateral.
     * Utiliza varredura por cursor para agrupar e retornar os dados filtrados sem esgotar a RAM.
     * @param {Object} filters - Objeto contendo { year, reporter, partner, flow, commodity, geogroup }
     */
    async queryTradeFlows(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows'], 'readonly');
            const store = transaction.objectStore('trade_flows');
            const results = [];

            // Aceleração via índice se possível
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

                    // Aplicação dinâmica dos critérios analíticos
                    if (filters.reporter && filters.reporter !== 'ALL' && record.reporterISO !== filters.reporter) match = false;
                    if (filters.partner && filters.partner !== 'ALL' && record.partnerISO !== filters.partner) match = false;
                    if (filters.flow && filters.flow !== 'ALL' && record.flowCode !== filters.flow) match = false;
                    if (filters.commodity && filters.commodity !== 'ALL' && record.cmdCode !== filters.commodity) match = false;

                    // Filtro de Agrupamento Geopolítico (sem hardcode de estrutura interna)
                    if (filters.geogroup && filters.geogroup !== 'ALL' && filters.geodescArray) {
                        const inGroup = filters.geodescArray.includes(record.reporterISO) || filters.geodescArray.includes(record.partnerISO);
                        if (!inGroup) match = false;
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

    /**
     * Retorna a contagem total de registros na base.
     */
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