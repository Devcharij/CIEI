import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';
import { BUNDLED_DATASETS } from './data-bundle.js';

/**
 * app.js
 * Master Application Entrypoint. 
 * Manages the research data pipeline for Phases 1, 2, 3A, and 3B.
 */
class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        this.chartManager = new ChartManager();
        this.ui = new UIManager();

        // Datasets mapping for automated fetching
        this.defaultDatasets = [
            { path: 'data/Fase 1 Macro.csv', phase: 'PHASE1' },
            { path: 'data/Fase 2 Micro.csv', phase: 'PHASE2' },
            { path: 'data/Phase 3A Baterias.csv', phase: 'PHASE3A' },
            { path: 'data/3B Veículos Elétricos.csv', phase: 'PHASE3B' }
        ];
    }

    async init() {
        try {
            await this.db.init();
            this.bindEvents();
            this.setupStateReactivity();
            
            const count = await this.db.getRecordCount();
            if (count > 0) {
                this.ui.updateDBStatus('online', count);
                this.ui.showToast('Database restored from local cache.', 'success');
                await this.restoreFiltersFromMetadata();
                await this.refreshDashboard();
            } else {
                if (window.location.protocol === 'file:') {
                    await this.loadBundledDatasets();
                } else {
                    await this.autoLoadMultipleDatasets(this.defaultDatasets);
                }
            }
        } catch (error) {
            console.error('Initialization failed:', error);
            this.ui.showToast('Critical error initializing database.', 'error');
        }
    }

    setupStateReactivity() {
        this.state.subscribe(async (currentState) => {
            const loader = document.getElementById('chart-loader');
            if (loader) loader.style.display = 'flex';

            try {
                // Fetch filtered records from IDB
                const filteredRecords = await this.db.queryTradeFlows(currentState);
                
                // Update Badge
                const badge = document.getElementById('sankey-metric-badge');
                if (badge) {
                    badge.textContent = currentState.metric === 'NetWgt' ? 
                        'Displaying: Physical Volume (kg)' : 'Displaying: Monetary Value (USD)';
                }

                // Render Visualizations
                this.markupManager.render(filteredRecords);
                this.chartManager.updateAll(filteredRecords, currentState.metric);

            } catch (error) {
                console.error('Query execution error:', error);
                this.ui.showToast('Failed to update dashboard.', 'error');
            } finally {
                if (loader) loader.style.display = 'none';
            }
        });
    }

    // Injects the phase attribute based on the filename during parsing
    processRecordsWithPhase(records, fileName, phase) {
        return records.map(r => ({ ...r, sourceFile: fileName, phase: phase }));
    }

    async autoLoadMultipleDatasets(datasets) {
        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Loading research datasets...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = { years: new Set(), reporters: new Map(), partners: new Map(), commodities: new Map(), flows: new Set() };

            for (const item of datasets) {
                try {
                    const response = await fetch(encodeURI(item.path));
                    if (!response.ok) continue;

                    const arrayBuffer = await response.arrayBuffer();
                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, item.path.split('/').pop());
                    
                    // Inject phase logic
                    const recordsWithPhase = this.processRecordsWithPhase(records, item.path.split('/').pop(), item.phase);
                    combinedRecords = combinedRecords.concat(recordsWithPhase);

                    // Merge Metadata
                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(r => mergedMetadata.reporters.set(r.iso, r.desc));
                    metadata.partners.forEach(p => mergedMetadata.partners.set(p.iso, p.desc));
                    metadata.commodities.forEach(c => mergedMetadata.commodities.set(c.code, c.desc));
                    metadata.flows.forEach(f => mergedMetadata.flows.add(f));
                } catch (e) { console.error(`Error with ${item.path}:`, e); }
            }

            await this.finalizeDataLoad(combinedRecords, mergedMetadata);
        } catch (error) {
            await this.loadBundledDatasets();
        }
    }

    async loadBundledDatasets() {
        this.ui.updateDBStatus('processing');
        let combinedRecords = [];
        const mergedMetadata = { years: new Set(), reporters: new Map(), partners: new Map(), commodities: new Map(), flows: new Set() };

        for (const dataset of BUNDLED_DATASETS) {
            try {
                const encoder = new TextEncoder();
                const arrayBuffer = encoder.encode(dataset.content).buffer;
                const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, dataset.name);
                
                // Determine phase automatically based on filename content
                let phase = 'PHASE1';
                if (dataset.name.includes('2')) phase = 'PHASE2';
                else if (dataset.name.includes('3A')) phase = 'PHASE3A';
                else if (dataset.name.includes('3B')) phase = 'PHASE3B';

                combinedRecords = combinedRecords.concat(this.processRecordsWithPhase(records, dataset.name, phase));

                metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                metadata.reporters.forEach(r => mergedMetadata.reporters.set(r.iso, r.desc));
                metadata.partners.forEach(p => mergedMetadata.partners.set(p.iso, p.desc));
                metadata.commodities.forEach(c => mergedMetadata.commodities.set(c.code, c.desc));
                metadata.flows.forEach(f => mergedMetadata.flows.add(f));
            } catch (e) { console.error(e); }
        }
        await this.finalizeDataLoad(combinedRecords, mergedMetadata);
    }

    async finalizeDataLoad(records, metadata) {
        const serialized = {
            years: Array.from(metadata.years).sort(),
            reporters: Array.from(metadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
            partners: Array.from(metadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
            commodities: Array.from(metadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
            flows: Array.from(metadata.flows)
        };
        await this.db.clearAllData();
        const count = await this.db.insertBatch(records);
        await this.db.setMetadata('schema_dictionaries', serialized);
        this.ui.updateDBStatus('online', count);
        this.ui.showToast(`Success! ${count.toLocaleString()} records loaded.`, 'success');
        this.populateFilterDropdowns(serialized);
        this.state.reset();
    }

    bindEvents() {
        // Upload button
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const { records, metadata } = await this.parser.parseFile(file);
                await this.finalizeDataLoad(this.processRecordsWithPhase(records, file.name, 'MANUAL'), metadata);
            });
        }
        
        // Toggle Buttons
        document.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            this.state.update({ metric: e.currentTarget.dataset.metric });
        }));

        // Filter Selectors
        ['phase', 'year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'].forEach(id => {
            const el = document.getElementById(`filter-${id}`);
            if (el) el.addEventListener('change', (e) => this.state.update({ [id]: e.target.value }));
        });

        document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
            this.state.reset();
            this.ui.showToast('Filters reset.', 'success');
        });
    }

    populateFilterDropdowns(metadata) {
        const setOptions = (id, list, mapFn) => {
            const el = document.getElementById(`filter-${id}`);
            if (!el) return;
            const current = el.value;
            el.innerHTML = `<option value="ALL">All</option>` + list.map(mapFn).join('');
            el.value = current;
            el.disabled = false;
        };
        setOptions('year', metadata.years, y => `<option value="${y}">${y}</option>`);
        setOptions('reporter', metadata.reporters, r => `<option value="${r.iso}">${r.desc}</option>`);
        setOptions('partner', metadata.partners, p => `<option value="${p.iso}">${p.desc}</option>`);
        setOptions('commodity', metadata.commodities, c => `<option value="${c.code}">HS ${c.code} - ${c.desc.slice(0,30)}</option>`);
    }

    async restoreFiltersFromMetadata() {
        const meta = await this.db.getMetadata('schema_dictionaries');
        if (meta) this.populateFilterDropdowns(meta);
    }

    async refreshDashboard() {
        const records = await this.db.queryTradeFlows(this.state.getState());
        this.markupManager.render(records);
        this.chartManager.updateAll(records, this.state.getState().metric);
    }
}

document.addEventListener('DOMContentLoaded', () => new App().init());
