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
 * Orchestrates UI modules, binds DOM event listeners (including Phase filters),
 * and manages data persistence via IndexedDB or bundled Zero-CORS fallbacks.
 */
class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        this.chartManager = new ChartManager();
        this.ui = new UIManager();
    }

    /**
     * Asynchronous Bootstrap.
     */
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
                // Initiates instant Zero-CORS loading from data-bundle.js
                await this.loadBundledDatasets();
            }
        } catch (error) {
            console.error('Application initialization failed:', error);
            this.ui.showToast('Error initializing local database engine.', 'error');
        }
    }

    /**
     * Establishes the reactive pipeline. When FilterState changes, UI updates automatically.
     */
    setupStateReactivity() {
        this.state.subscribe(async (currentState) => {
            const loader = document.getElementById('chart-loader');
            if (loader) loader.style.display = 'flex';

            try {
                // 1. Query IndexedDB with current active filters (Phase, Metric, Geogroup, etc.)
                const filteredRecords = await this.db.queryTradeFlows(currentState);
                
                // 2. Update descriptive badge on the Sankey section
                const badge = document.getElementById('sankey-metric-badge');
                if (badge) {
                    badge.textContent = currentState.metric === 'NetWgt' ? 
                        'Displaying: Physical Volume (kg) — Gross Nature Outflow' : 
                        'Displaying: Monetary Value (US$) — Capital & Monopoly';
                }

                // 3. Delegate rendering to visualization managers
                this.markupManager.render(filteredRecords);
                this.chartManager.updateAll(filteredRecords, currentState.metric);

            } catch (error) {
                console.error('Error executing reactive trade flow query:', error);
                this.ui.showToast('Failed to recompute aggregations with selected filters.', 'error');
            } finally {
                // Hide loading spinner safely
                if (loader) loader.style.display = 'none';
            }
        });
    }

    /**
     * Consumes embedded datasets (Phase 1, 2, 3A, 3B) mapping strings to ArrayBuffers.
     */
    async loadBundledDatasets() {
        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Processing ${BUNDLED_DATASETS.length} embedded research datasets...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = {
                years: new Set(), reporters: new Map(), partners: new Map(),
                commodities: new Map(), flows: new Set(), schemaMapping: null
            };

            for (const dataset of BUNDLED_DATASETS) {
                try {
                    // Convert embedded CSV string into an ArrayBuffer for the generic ExcelParser
                    const encoder = new TextEncoder();
                    const arrayBuffer = encoder.encode(dataset.content).buffer;

                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, dataset.name, (msg) => {
                        console.info(`[Bundle Parser] ${msg}`);
                    });

                    combinedRecords = combinedRecords.concat(records);

                    // Merge dictionaries across all phases
                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(rep => mergedMetadata.reporters.set(rep.iso, rep.desc));
                    metadata.partners.forEach(part => mergedMetadata.partners.set(part.iso, part.desc));
                    metadata.commodities.forEach(cmd => mergedMetadata.commodities.set(cmd.code, cmd.desc));
                    metadata.flows.forEach(fl => mergedMetadata.flows.add(fl));
                    if (!mergedMetadata.schemaMapping && metadata.schemaMapping) {
                        mergedMetadata.schemaMapping = metadata.schemaMapping;
                    }
                } catch (err) {
                    console.error(`Error processing bundled dataset "${dataset.name}":`, err);
                }
            }

            if (combinedRecords.length === 0) {
                throw new Error('No data could be extracted from embedded datasets.');
            }

            const serializedMetadata = {
                years: Array.from(mergedMetadata.years).sort(),
                reporters: Array.from(mergedMetadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                partners: Array.from(mergedMetadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                commodities: Array.from(mergedMetadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                flows: Array.from(mergedMetadata.flows),
                schemaMapping: mergedMetadata.schemaMapping
            };

            // Wipe old cache and store unified dataset
            await this.db.clearAllData();
            const insertedCount = await this.db.insertBatch(combinedRecords);
            await this.db.setMetadata('schema_dictionaries', serializedMetadata);

            this.ui.updateDBStatus('online', insertedCount);
            this.ui.showToast(`Ready! ${BUNDLED_DATASETS.length} datasets loaded (${insertedCount.toLocaleString('en-US')} records indexed).`, 'success');
            
            this.populateFilterDropdowns(serializedMetadata);
            
            // Trigger the initial dashboard rendering
            this.state.reset();

        } catch (error) {
            console.error('Critical failure loading bundled datasets:', error);
            this.ui.updateDBStatus('offline', 0);
            this.ui.showToast('Error loading embedded data. Please use the top button to upload a file manually.', 'error');
        }
    }

    /**
     * Binds DOM interactions to the Application State.
     */
    bindEvents() {
        // 1. Manual File Upload Handler
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
                    console.error('Manual reading error:', error);
                    this.ui.updateDBStatus('offline', 0);
                    this.ui.showToast(error.message || 'Failed to read file.', 'error');
                } finally {
                    fileInput.value = '';
                }
            });
        }

        // 2. Dimension Metric Toggle (Physical vs Monetary)
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.update({ metric: btn.getAttribute('data-metric') });
            });
        });

        // 3. Dropdown Filters (INCLUDING the new 'phase' filter)
        const filterIds = ['phase', 'year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'];
        filterIds.forEach(id => {
            const select = document.getElementById(`filter-${id}`);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.state.update({ [id]: e.target.value });
                });
            }
        });

        // 4. Global Reset Button
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

        // 5. CSV Export Feature
        const exportBtn = document.getElementById('export-table-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const currentRecords = await this.db.queryTradeFlows(this.state.getState());
                this.exportToCSV(currentRecords);
            });
        }
    }

    /**
     * Dynamically populates dropdown menus based on database metadata.
     */
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
                metadata.commodities.map(c => {
                    const cleanDesc = c.desc && c.desc.length > 40 ? c.desc.slice(0, 40) + '...' : (c.desc || 'Unknown');
                    return `<option value="${c.code}">HS ${c.code} — ${cleanDesc}</option>`;
                }).join('');
            cmdSelect.disabled = false;
        }
    }

    /**
     * Resurrects filter dropdowns using cached IndexedDB metadata.
     */
    async restoreFiltersFromMetadata() {
        const metadata = await this.db.getMetadata('schema_dictionaries');
        if (metadata) this.populateFilterDropdowns(metadata);
    }

    /**
     * Manually triggers a dashboard refresh reading the current state.
     */
    async refreshDashboard() {
        const records = await this.db.queryTradeFlows(this.state.getState());
        this.markupManager.render(records);
        this.chartManager.updateAll(records, this.state.getState().metric);
    }

    /**
     * Generates and downloads a CSV of the currently filtered dataset.
     */
    exportToCSV(records) {
        if (!records || records.length === 0) return;
        
        const headers = ['Year', 'Reporter ISO', 'Reporter Name', 'Partner ISO', 'Partner Name', 'Flow', 'HS Code', 'Commodity Description', 'Physical Mass (kg)', 'Trade Value (USD)', 'Source File'];
        
        const rows = records.map(r => [
            r.period, 
            r.reporterISO, 
            `"${r.reporterDesc}"`, 
            r.partnerISO, 
            `"${r.partnerDesc}"`, 
            r.flowCode, 
            r.cmdCode, 
            `"${(r.cmdDesc || '').replace(/"/g, '""')}"`, // Escape internal quotes safely
            r.netWgt, 
            r.tradeValue, 
            `"${r.sourceFile || 'Manual Upload'}"`
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

// Bootstrap application once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
