async queryTradeFlows(filters = {}) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['trade_flows'], 'readonly');
            const store = transaction.objectStore('trade_flows');
            const results = [];

            let request = (filters.year && filters.year !== 'ALL') 
                ? store.index('by_year').openCursor(IDBKeyRange.only(filters.year)) 
                : store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const record = cursor.value;
                    let match = true;

                    // Standard Filters
                    if (filters.reporter && filters.reporter !== 'ALL' && record.reporterISO !== filters.reporter) match = false;
                    if (filters.partner && filters.partner !== 'ALL' && record.partnerISO !== filters.partner) match = false;
                    if (filters.flow && filters.flow !== 'ALL' && record.flowCode !== filters.flow) match = false;
                    if (filters.commodity && filters.commodity !== 'ALL' && record.cmdCode !== filters.commodity) match = false;

                    // NOVO: Filtro de Fase Baseado no Nome do Arquivo CSV (SourceFile)
                    if (filters.phase && filters.phase !== 'ALL') {
                        const file = (record.sourceFile || '').toUpperCase();
                        if (filters.phase === 'PHASE1' && !file.includes('FASE 1')) match = false;
                        if (filters.phase === 'PHASE2' && !file.includes('FASE 2')) match = false;
                        if (filters.phase === 'PHASE3A' && !file.includes('3A')) match = false;
                        if (filters.phase === 'PHASE3B' && !file.includes('3B')) match = false;
                    }

                    // Geopolitical Cluster
                    if (filters.geogroup && filters.geogroup !== 'ALL' && filters.geodescArray) {
                        const repISO = String(record.reporterISO || '').trim().toUpperCase();
                        const repDesc = String(record.reporterDesc || '').trim().toUpperCase();
                        const partISO = String(record.partnerISO || '').trim().toUpperCase();
                        const partDesc = String(record.partnerDesc || '').trim().toUpperCase();

                        const repInGroup = filters.geodescArray.some(g => repISO === g || repDesc.includes(g));
                        const partInGroup = filters.geodescArray.some(g => partISO === g || partDesc.includes(g));

                        if (!repInGroup && !partInGroup) match = false;
                    }

                    if (match) results.push(record);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }
