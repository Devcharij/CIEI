import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';

/**
 * app.js
 * Ponto de Entrada com Motor de Leitura Universal (Smart Fetch 3.0).
 * Resolve automaticamente problemas de encoding em nomes de arquivos e bloqueios de protocolo file://.
 */
class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        this.chartManager = new ChartManager();
        this.ui = new UIManager();

        // Nomes exatos dos seus arquivos na pasta data/ (serão codificados via encodeURI automaticamente)
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
                this.ui.showToast('Base de dados restaurada do cache IndexedDB.', 'success');
                await this.restoreFiltersFromMetadata();
                await this.refreshDashboard();
            } else {
                // Inicia o carregamento inteligente da pasta /data
                await this.autoLoadMultipleDatasets(this.defaultDatasets);
            }
        } catch (error) {
            console.error('Falha na inicialização do aplicativo:', error);
            this.ui.showToast('Erro ao inicializar o banco de dados local.', 'error');
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
                        'Exibindo: Massa Física (kg) — Espoliação e Natureza Bruta' : 
                        'Exibindo: Valor Comercial (US$) — Monopólio e Financeirização';
                }

                this.markupManager.render(filteredRecords);
                this.chartManager.updateAll(filteredRecords, currentState.metric);
            } catch (error) {
                console.error('Erro na consulta reativa de dados:', error);
                this.ui.showToast('Falha ao processar consulta com os filtros atuais.', 'error');
            } finally {
                if (loader) loader.style.display = 'none';
            }
        });
    }

    /**
     * Motor de Carregamento Blindado com resolução de URLs e fallbacks.
     */
    async autoLoadMultipleDatasets(filePaths) {
        // ALERTA DE SEGURANÇA DO NAVEGADOR: Verifica se foi aberto via duplo-clique (file://)
        if (window.location.protocol === 'file:') {
            this.ui.updateDBStatus('offline', 0);
            this.ui.showToast('⚠️ Modo file:// detectado: O navegador bloqueia leitura da pasta /data por segurança. Suba um arquivo manualmente pelo botão superior ou rode em servidor local / GitHub Pages!', 'warning');
            return;
        }

        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Buscando ${filePaths.length} arquivos da pesquisa no servidor...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = {
                years: new Set(), reporters: new Map(), partners: new Map(),
                commodities: new Map(), flows: new Set(), schemaMapping: null
            };

            let sucessCount = 0;

            for (const path of filePaths) {
                try {
                    // CODIFICAÇÃO DE URL: Transforma espaços em %20 e acentos para evitar Erro 404
                    const encodedPath = encodeURI(path);
                    console.info(`[Smart Fetch] Tentando baixar: ${encodedPath}`);
                    
                    let response = await fetch(encodedPath);
                    
                    // Se falhar, tenta com './' no início como fallback de roteamento
                    if (!response.ok) {
                        const fallbackPath = encodeURI('./' + path);
                        response = await fetch(fallbackPath);
                    }

                    if (!response.ok) {
                        console.warn(`[Aviso] Arquivo não encontrado: "${path}" (Status: ${response.status}). Verifique o nome na pasta /data.`);
                        continue;
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const fileName = path.split('/').pop();

                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, fileName, (msg) => {
                        console.info(`[Parser] ${msg}`);
                    });

                    combinedRecords = combinedRecords.concat(records);
                    sucessCount++;

                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(rep => mergedMetadata.reporters.set(rep.iso, rep.desc));
                    metadata.partners.forEach(part => mergedMetadata.partners.set(part.iso, part.desc));
                    metadata.commodities.forEach(cmd => mergedMetadata.commodities.set(cmd.code, cmd.desc));
                    metadata.flows.forEach(fl => mergedMetadata.flows.add(fl));
                    if (!mergedMetadata.schemaMapping && metadata.schemaMapping) {
                        mergedMetadata.schemaMapping = metadata.schemaMapping;
                    }

                } catch (fileError) {
                    console.error(`Erro ao processar "${path}":`, fileError);
                }
            }

            if (combinedRecords.length === 0) {
                throw new Error('Nenhum dado pôde ser extraído. Verifique se os arquivos estão na pasta /data do repositório.');
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
            this.ui.showToast(`Pronto! ${sucessCount} arquivos carregados (${insertedCount.toLocaleString('pt-BR')} registros indexados).`, 'success');
            
            this.populateFilterDropdowns(serializedMetadata);
            this.state.reset();

        } catch (error) {
            console.warn('Carregamento automático interrompido:', error);
            this.ui.updateDBStatus('offline', 0);
            this.ui.showToast('Não foi possível ler a pasta /data. Utilize o botão no topo para carregar o arquivo CSV manualmente.', 'error');
        }
    }

    bindEvents() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                this.ui.updateDBStatus('processing');
                this.ui.showToast(`Lendo arquivo: "${file.name}"...`, 'warning');

                try {
                    const { records, metadata } = await this.parser.parseFile(file, (msg) => console.info(msg));
                    await this.db.clearAllData();
                    const insertedCount = await this.db.insertBatch(records);
                    await this.db.setMetadata('schema_dictionaries', metadata);

                    this.ui.updateDBStatus('online', insertedCount);
                    this.ui.showToast(`Dataset substituído! ${insertedCount.toLocaleString('pt-BR')} registros gravados.`, 'success');
                    this.populateFilterDropdowns(metadata);
                    this.state.reset();
                } catch (error) {
                    console.error('Erro na leitura manual:', error);
                    this.ui.updateDBStatus('offline', 0);
                    this.ui.showToast(error.message || 'Falha ao ler o arquivo.', 'error');
                } finally {
                    fileInput.value = '';
                }
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
                this.ui.showToast('Filtros restaurados para a visão global.', 'success');
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
            yearSelect.innerHTML = '<option value="ALL">Todos os Anos Agregados</option>' +
                metadata.years.map(yr => `<option value="${yr}">${yr}</option>`).join('');
            yearSelect.disabled = false;
        }

        const repSelect = document.getElementById('filter-reporter');
        if (repSelect && metadata.reporters) {
            repSelect.innerHTML = '<option value="ALL">Todos os Países Disponíveis</option>' +
                metadata.reporters.map(r => `<option value="${r.iso}">${r.desc} (${r.iso})</option>`).join('');
            repSelect.disabled = false;
        }

        const partSelect = document.getElementById('filter-partner');
        if (partSelect && metadata.partners) {
            partSelect.innerHTML = '<option value="ALL">Todos os Países Disponíveis</option>' +
                metadata.partners.map(p => `<option value="${p.iso}">${p.desc} (${p.iso})</option>`).join('');
            partSelect.disabled = false;
        }

        const cmdSelect = document.getElementById('filter-commodity');
        if (cmdSelect && metadata.commodities) {
            cmdSelect.innerHTML = '<option value="ALL">Todas as Mercadorias no Dataset</option>' +
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
        const headers = ['Ano', 'Reporter ISO', 'Reporter Nome', 'Partner ISO', 'Partner Nome', 'Fluxo', 'HS Code', 'Descricao', 'Peso Liquido (kg)', 'Valor Comercial (USD)', 'Arquivo Origem'];
        const rows = records.map(r => [
            r.period, r.reporterISO, `"${r.reporterDesc}"`, r.partnerISO, `"${r.partnerDesc}"`, r.flowCode, r.cmdCode, `"${r.cmdDesc}"`, r.netWgt, r.tradeValue, `"${r.sourceFile || 'Manual'}"`
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `UN_Comtrade_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
