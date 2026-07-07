import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';
import { BUNDLED_DATASETS } from './data-bundle.js';

/**
 * app.js
 * Master Application Entrypoint. Controls automated multi-file ingestion from /data,
 * resolves file:// protocol restrictions via fallback bundles, and manages reactive UI state.
 */
class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        this.chartManager = new ChartManager();
        this.ui = new UIManager();

        // Target official CSV datasets in the repository
        this.defaultDatasets = [
            'data/Fase 1 Macro.csv',
            'data/Fase 2 Micro.csv',
            'data/Phase 3A Baterias.csv',
            'data/3B Veículos Elétricos.csv'
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
                this.ui.showToast('Database restored from local IndexedDB cache.', 'success');
                await this.restoreFiltersFromMetadata();
                await this.refreshDashboard();
            } else {
                // If opening via file:// double-click, automatically load bundled fallback datasets
                if (window.location.protocol === 'file:') {
                    await this.loadBundledDatasets();
                } else {
                    await this.autoLoadMultipleDatasets(this.defaultDatasets);
                }
            }
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.ui.showToast('Error initializing local database engine.', 'error');
        }
    }

    setupStateReactivity() {
        this.state.subscribe(async (currentState) => {
            const loader = document.getElementById('chart-loader');
            if (loader) loader.style.display = 'flex';

            try {
                const filteredRecords = await this.db.queryTradeFlows(currentState);
                const badge = document.getElementById('sankey-metric-badge');
                if (badge) {
                    badge.textContent = currentState.metric === 'NetWgt' ? 
                        'Displaying: Physical Volume (kg) — Gross Nature Outflow' : 
                        'Displaying: Monetary Value (US$) — Capital & Monopoly';
                }

                this.markupManager.render(filteredRecords);
                this.chartManager.updateAll(filteredRecords, currentState.metric);
            } catch (error) {
                console.error('Error executing reactive trade flow query:', error);
                this.ui.showToast('Failed to recompute aggregations with selected filters.', 'error');
            } finally {
                if (loader) loader.style.display = 'none';
            }
        });
    }

    async autoLoadMultipleDatasets(filePaths) {
        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Fetching ${filePaths.length} research datasets from server...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = {
                years: new Set(), reporters: new Map(), partners: new Map(),
                commodities: new Map(), flows: new Set(), schemaMapping: null
            };
            let successCount = 0;

            for (const path of filePaths) {
                try {
                    const encodedPath = encodeURI(path);
                    let response = await fetch(encodedPath);
                    if (!response.ok) response = await fetch(encodeURI('./' + path));
                    if (!response.ok) continue;

                    const arrayBuffer = await response.arrayBuffer();
                    const fileName = path.split('/').pop();

                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, fileName, (msg) => console.info(`[Smart Fetch] ${msg}`));
                    combinedRecords = combinedRecords.concat(records);
                    successCount++;

                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(rep => mergedMetadata.reporters.set(rep.iso, rep.desc));
                    metadata.partners.forEach(part => mergedMetadata.partners.set(part.iso, part.desc));
                    metadata.commodities.forEach(cmd => mergedMetadata.commodities.set(cmd.code, cmd.desc));
                    metadata.flows.forEach(fl => mergedMetadata.flows.add(fl));
                    if (!mergedMetadata.schemaMapping && metadata.schemaMapping) mergedMetadata.schemaMapping = metadata.schemaMapping;
                } catch (err) { console.error(`Error processing "${path}":`, err); }
            }

            if (combinedRecords.length === 0) {
                console.warn('Network fetch returned zero datasets. Falling back to embedded bundled data...');
                return await this.loadBundledDatasets();
            }

            const serializedMetadata = {
                years: Array.from(mergedMetadata.years).sort(),
                reporters: Array.from(mergedMetadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                partners: Array.from(mergedMetadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                commodities: Array.from(mergedMetadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                flows: Array.from(mergedMetadata.flows),
                schemaMapping: mergedMetadata.schemaMapping
            };

            await this.db.clearAllData();
            const insertedCount = await this.db.insertBatch(combinedRecords);
            await this.db.setMetadata('schema_dictionaries', serializedMetadata);

            this.ui.updateDBStatus('online', insertedCount);
            this.ui.showToast(`Ready! ${successCount} datasets loaded (${insertedCount.toLocaleString('en-US')} records indexed).`, 'success');
            this.populateFilterDropdowns(serializedMetadata);
            this.state.reset();

        } catch (error) {
            console.error('Auto-load failed:', error);
            await this.loadBundledDatasets();
        }
    }

    async loadBundledDatasets() {
        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Loading ${BUNDLED_DATASETS.length} embedded zero-CORS research datasets...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = {
                years: new Set(), reporters: new Map(), partners: new Map(),
                commodities: new Map(), flows: new Set(), schemaMapping: null
            };

            for (const dataset of BUNDLED_DATASETS) {
                try {
                    const encoder = new TextEncoder();
                    const arrayBuffer = encoder.encode(dataset.content).buffer;
                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, dataset.name, (msg) => console.info(`[Bundle Parser] ${msg}`));
                    combinedRecords = combinedRecords.concat(records);

                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(rep => mergedMetadata.reporters.set(rep.iso, rep.desc));
                    metadata.partners.forEach(part => mergedMetadata.partners.set(part.iso, part.desc));
                    metadata.commodities.forEach(cmd => mergedMetadata.commodities.set(cmd.code, cmd.desc));
                    metadata.flows.forEach(fl => mergedMetadata.flows.add(fl));
                    if (!mergedMetadata.schemaMapping && metadata.schemaMapping) mergedMetadata.schemaMapping = metadata.schemaMapping;
                } catch (err) { console.error(`Error processing bundled dataset "${dataset.name}":`, err); }
            }

            if (combinedRecords.length === 0) throw new Error('No data could be extracted from embedded datasets.');

            const serializedMetadata = {
                years: Array.from(mergedMetadata.years).sort(),
                reporters: Array.from(mergedMetadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                partners: Array.from(mergedMetadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                commodities: Array.from(mergedMetadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                flows: Array.from(mergedMetadata.flows),
                schemaMapping: mergedMetadata.schemaMapping
            };

            await this.db.clearAllData();
            const insertedCount = await this.db.insertBatch(combinedRecords);
            await this.db.setMetadata('schema_dictionaries', serializedMetadata);

            this.ui.updateDBStatus('online', insertedCount);
            this.ui.showToast(`Ready! Embedded datasets loaded (${insertedCount.toLocaleString('en-US')} records indexed).`, 'success');
            this.populateFilterDropdowns(serializedMetadata);
            this.state.reset();

        } catch (error) {
            this.ui.updateDBStatus('offline', 0);
            this.ui.showToast('Error loading embedded data. Please use the top button to upload a file manually.', 'error');
        }
    }

    bindEvents() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                this.ui.updateDBStatus('processing');
                this.ui.showToast(`Reading manual file: "${file.name}"...`, 'warning');
                try {
                    const { records, metadata } = await this.parser.parseFile(file, (msg) => console.info(msg));
                    await this.db.clearAllData();
                    const insertedCount = await this.db.insertBatch(records);
                    await this.db.setMetadata('schema_dictionaries', metadata);
                    this.ui.updateDBStatus('online', insertedCount);
                    this.ui.showToast(`Dataset replaced! ${insertedCount.toLocaleString('en-US')} records saved.`, 'success');
                    this.populateFilterDropdowns(metadata);
                    this.state.reset();
                } catch (error) {
                    this.ui.updateDBStatus('offline', 0);
                    this.ui.showToast(error.message || 'Failed to read file.', 'error');
                } finally { fileInput.value = ''; }
            });
        }

        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.update({ metric: btn.getAttribute('data-metric') });
            });
        });

        const filterIds = ['year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'];
        filterIds.forEach(id => {
            const select = document.getElementById(`filter-${id}`);
            if (select) select.addEventListener('change', (e) => this.state.update({ [id]: e.target.value }));
        });

        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterIds.forEach(id => {
                    const el = document.getElementById(`filter-${id}`);
                    if (el) el.value = 'ALL';
                });
                this.state.reset();
                this.ui.showToast('Filters reset to global overview.', 'success');
            });
        }

        const exportBtn = document.getElementById('export-table-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const currentRecords = await this.db.queryTradeFlows(this.state.getState());
                this.exportToCSV(currentRecords);
            });
        }
    }

    populateFilterDropdowns(metadata) {
        const yearSelect = document.getElementById('filter-year');
        if (yearSelect && metadata.years) {
            yearSelect.innerHTML = '<option value="ALL">All Aggregated Years</option>' +
                metadata.years.map(yr => `<option value="${yr}">${yr}</option>`).join('');
            yearSelect.disabled = false;
        }

        const repSelect = document.getElementById('filter-reporter');
        if (repSelect && metadata.reporters) {
            repSelect.innerHTML = '<option value="ALL">All Available Reporting Countries</option>' +
                metadata.reporters.map(r => `<option value="${r.iso}">${r.desc} (${r.iso})</option>`).join('');
            repSelect.disabled = false;
        }

        const partSelect = document.getElementById('filter-partner');
        if (partSelect && metadata.partners) {
            partSelect.innerHTML = '<option value="ALL">All Available Partner Countries</option>' +
                metadata.partners.map(p => `<option value="${p.iso}">${p.desc} (${p.iso})</option>`).join('');
            partSelect.disabled = false;
        }

        const cmdSelect = document.getElementById('filter-commodity');
        if (cmdSelect && metadata.commodities) {
            cmdSelect.innerHTML = '<option value="ALL">All Commodities in Dataset</option>' +
                metadata.commodities.map(c => `<option value="${c.code}">HS ${c.code} — ${c.desc.slice(0, 40)}...</option>`).join('');
            cmdSelect.disabled = false;
        }
    }

    async restoreFiltersFromMetadata() {
        const metadata = await this.db.getMetadata('schema_dictionaries');
        if (metadata) this.populateFilterDropdowns(metadata);
    }

    async refreshDashboard() {
        const records = await this.db.queryTradeFlows(this.state.getState());
        this.markupManager.render(records);
        this.chartManager.updateAll(records, this.state.getState().metric);
    }

    exportToCSV(records) {
        if (!records || records.length === 0) return;
        const headers = ['Year', 'Reporter ISO', 'Reporter Name', 'Partner ISO', 'Partner Name', 'Flow', 'HS Code', 'Commodity Description', 'Physical Mass (kg)', 'Trade Value (USD)', 'Source File'];
        const rows = records.map(r => [
            r.period, r.reporterISO, `"${r.reporterDesc}"`, r.partnerISO, `"${r.partnerDesc}"`, r.flowCode, r.cmdCode, `"${r.cmdDesc}"`, r.netWgt, r.tradeValue, `"${r.sourceFile || 'Manual'}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `UN_Comtrade_Metabolism_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
