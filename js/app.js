import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';

/**
 * app.js
 * Ponto de Entrada da Aplicação (Entrypoint) com Ingestão Múltipla Automatizada.
 * Orquestra o carregamento de múltiplos CSVs da pasta /data, unifica metadados e gerencia a UI.
 */
class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        this.chartManager = new ChartManager();
        this.ui = new UIManager();

        // Lista de datasets oficiais da pesquisa acadêmica alocados no repositório GitHub
        this.defaultDatasets = [
            'data/Fase 1 Macro.csv',
            'data/Fase 2 Micro.csv',
            'data/Phase 3A Baterias.csv',
            'data/3B Veículos Elétricos.csv'
        ];
    }

    /**
     * Bootstrap assíncrono do ecossistema analítico.
     */
    async init() {
        try {
            await this.db.init();
            this.bindEvents();
            this.setupStateReactivity();
            
            // Verifica existência de cache transacional na sessão do navegador
            const count = await this.db.getRecordCount();
            if (count > 0) {
                // 1. Restauração instantânea a partir do cache local (Zero-Latency)
                this.ui.updateDBStatus('online', count);
                this.ui.showToast('Base de dados restaurada rapidamente do cache IndexedDB.', 'success');
                await this.restoreFiltersFromMetadata();
                await this.refreshDashboard();
            } else {
                // 2. Carregamento Direto e Automático de todos os CSVs da pesquisa (Zero-Click)
                await this.autoLoadMultipleDatasets(this.defaultDatasets);
            }
        } catch (error) {
            console.error('Falha crítica na inicialização da plataforma analítica:', error);
            this.ui.showToast('Erro ao inicializar o motor do banco de dados local.', 'error');
        }
    }

    /**
     * Inscreve a camada visual para reagir automaticamente a mutações nos filtros do usuário.
     */
    setupStateReactivity() {
        this.state.subscribe(async (currentState) => {
            const loader = document.getElementById('chart-loader');
            if (loader) loader.style.display = 'flex';

            try {
                const filteredRecords = await this.db.queryTradeFlows(currentState);
                
                // Atualização do indicador visual da dimensão em análise no diagrama de Sankey
                const badge = document.getElementById('sankey-metric-badge');
                if (badge) {
                    badge.textContent = currentState.metric === 'NetWgt' ? 
                        'Exibindo: Massa Física (kg) — Espoliação e Natureza Bruta' : 
                        'Exibindo: Valor Comercial (US$) — Monopólio e Financeirização';
                }

                // Orquestração sincronizada de renderização
                this.markupManager.render(filteredRecords);
                this.chartManager.updateAll(filteredRecords, currentState.metric);

            } catch (error) {
                console.error('Erro na consulta reativa de fluxos comerciais:', error);
                this.ui.showToast('Falha ao re-computar agregações com os parâmetros selecionados.', 'error');
            } finally {
                if (loader) loader.style.display = 'none';
            }
        });
    }

    /**
     * Carrega múltiplos arquivos CSV/Excel do servidor, unifica os registros e compila metadados consolidados.
     * @param {Array<String>} filePaths - Vetor com os caminhos dos arquivos na pasta /data.
     */
    async autoLoadMultipleDatasets(filePaths) {
        this.ui.updateDBStatus('processing');
        this.ui.showToast(`Carregando ${filePaths.length} arquivos analíticos da pesquisa (Fases 1, 2 e 3)...`, 'warning');

        try {
            let combinedRecords = [];
            const mergedMetadata = {
                years: new Set(),
                reporters: new Map(),
                partners: new Map(),
                commodities: new Map(),
                flows: new Set(),
                schemaMapping: null
            };

            // Download e processamento sequencial/paralelo dos datasets
            for (const path of filePaths) {
                try {
                    const response = await fetch(path);
                    if (!response.ok) {
                        console.warn(`[Aviso] Arquivo não localizado no servidor: "${path}". Pulando leitura.`);
                        continue;
                    }

                    const arrayBuffer = await response.arrayBuffer();
                    const fileName = path.split('/').pop();

                    // Processamento via motor de inferência sem colunas pré-fixadas
                    const { records, metadata } = await this.parser.parseBuffer(arrayBuffer, fileName, (msg) => {
                        console.info(`[AutoLoad] ${msg}`);
                    });

                    // Agregação dos registros transacionados
                    combinedRecords = combinedRecords.concat(records);

                    // Fusão (Merge) dos dicionários geopolíticos e classificações HS
                    metadata.years.forEach(yr => mergedMetadata.years.add(yr));
                    metadata.reporters.forEach(rep => mergedMetadata.reporters.set(rep.iso, rep.desc));
                    metadata.partners.forEach(part => mergedMetadata.partners.set(part.iso, part.desc));
                    metadata.commodities.forEach(cmd => mergedMetadata.commodities.set(cmd.code, cmd.desc));
                    metadata.flows.forEach(fl => mergedMetadata.flows.add(fl));
                    if (!mergedMetadata.schemaMapping && metadata.schemaMapping) {
                        mergedMetadata.schemaMapping = metadata.schemaMapping;
                    }

                } catch (fileError) {
                    console.error(`Erro ao processar o dataset individual "${path}":`, fileError);
                }
            }

            if (combinedRecords.length === 0) {
                throw new Error('Nenhum dado pôde ser extraído dos arquivos na pasta /data. Verifique os caminhos no repositório.');
            }

            // Serialização final do dicionário consolidado
            const serializedMetadata = {
                years: Array.from(mergedMetadata.years).sort(),
                reporters: Array.from(mergedMetadata.reporters.entries()).map(([iso, desc]) => ({ iso, desc })),
                partners: Array.from(mergedMetadata.partners.entries()).map(([iso, desc]) => ({ iso, desc })),
                commodities: Array.from(mergedMetadata.commodities.entries()).map(([code, desc]) => ({ code, desc })),
                flows: Array.from(mergedMetadata.flows),
                schemaMapping: mergedMetadata.schemaMapping
            };

            // Limpeza e Inserção em Massa no IndexedDB
            await this.db.clearAllData();
            const insertedCount = await this.db.insertBatch(combinedRecords);
            await this.db.setMetadata('schema_dictionaries', serializedMetadata);

            // Atualização da Interface e Ativação do Dashboard
            this.ui.updateDBStatus('online', insertedCount);
            this.ui.showToast(`Pesquisa carregada com sucesso! ${insertedCount.toLocaleString('pt-BR')} fluxos integrados.`, 'success');
            
            this.populateFilterDropdowns(serializedMetadata);
            this.state.reset(); // Dispara a primeira renderização dos diagramas de Sankey

        } catch (error) {
            console.warn('Falha no carregamento automático zero-click:', error);
            this.ui.updateDBStatus('offline', 0);
            this.ui.showToast('Modo offline ativo. Utilize o botão superior para carregar uma planilha manualmente se necessário.', 'warning');
        }
    }

    /**
     * Mapeia os eventos de interface (botões, uploads manuais e selects) para o estado da aplicação.
     */
    bindEvents() {
        // 1. Upload Manual e Substituição Dinâmica (Mantido para flexibilidade futura)
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                this.ui.updateDBStatus('processing');
                this.ui.showToast(`Processando arquivo manual: "${file.name}"...`, 'warning');

                try {
                    const { records, metadata } = await this.parser.parseFile(file, (msg) => console.info(msg));

                    await this.db.clearAllData();
                    const insertedCount = await this.db.insertBatch(records);
                    await this.db.setMetadata('schema_dictionaries', metadata);

                    this.ui.updateDBStatus('online', insertedCount);
                    this.ui.showToast(`Planilha atualizada! ${insertedCount.toLocaleString('pt-BR')} registros indexados.`, 'success');

                    this.populateFilterDropdowns(metadata);
                    this.state.reset();

                } catch (error) {
                    console.error('Erro na leitura da planilha manual:', error);
                    this.ui.updateDBStatus('offline', 0);
                    this.ui.showToast(error.message || 'Falha ao processar o arquivo selecionado.', 'error');
                } finally {
                    fileInput.value = '';
                }
            });
        }

        // 2. Alternadores de Dimensão Metabólica (Massa Físico kg vs Valor Monetário US$)
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedMetric = btn.getAttribute('data-metric');
                this.state.update({ metric: selectedMetric });
            });
        });

        // 3. Leitores de Filtros Geopolíticos e Temporais
        const filterIds = ['year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'];
        filterIds.forEach(id => {
            const select = document.getElementById(`filter-${id}`);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.state.update({ [id]: e.target.value });
                });
            }
        });

        // 4. Botão de Redefinição (Limpar Parâmetros)
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterIds.forEach(id => {
                    const el = document.getElementById(`filter-${id}`);
                    if (el) el.value = 'ALL';
                });
                this.state.reset();
                this.ui.showToast('Visão global restaurada. Todos os filtros foram redefinidos.', 'success');
            });
        }

        // 5. Botão de Exportação de Auditoria Científica (CSV)
        const exportBtn = document.getElementById('export-table-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const currentRecords = await this.db.queryTradeFlows(this.state.getState());
                this.exportToCSV(currentRecords);
            });
        }
    }

    /**
     * Preenche as opções de seleção HTML (selects) usando o dicionário consolidado de metadados.
     */
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
                metadata.commodities.map(c => `<option value="${c.code}">HS ${c.code} — ${c.desc.slice(0, 42)}...</option>`).join('');
            cmdSelect.disabled = false;
        }
    }

    /**
     * Restaura os seletores a partir de um cache salvo na sessão anterior.
     */
    async restoreFiltersFromMetadata() {
        const metadata = await this.db.getMetadata('schema_dictionaries');
        if (metadata) {
            this.populateFilterDropdowns(metadata);
        }
    }

    /**
     * Força a consulta ao IndexedDB e a re-renderização de todos os painéis visuais.
     */
    async refreshDashboard() {
        const records = await this.db.queryTradeFlows(this.state.getState());
        this.markupManager.render(records);
        this.chartManager.updateAll(records, this.state.getState().metric);
    }

    /**
     * Gera e baixa um arquivo CSV contendo os dados brutos filtrados no momento da análise.
     */
    exportToCSV(records) {
        if (!records || records.length === 0) return;

        const headers = ['Ano', 'Reporter ISO', 'Reporter Nome', 'Partner ISO', 'Partner Nome', 'Fluxo', 'HS Code', 'Descricao Mercadoria', 'Peso Físico (kg)', 'Valor Comercial (USD)', 'Arquivo Origem'];
        const rows = records.map(r => [
            r.period, r.reporterISO, `"${r.reporterDesc}"`, r.partnerISO, `"${r.partnerDesc}"`, r.flowCode, r.cmdCode, `"${r.cmdDesc}"`, r.netWgt, r.tradeValue, `"${r.sourceFile || 'Manual'}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `UN_Comtrade_Metabolismo_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Inicializa a plataforma analítica assim que a árvore DOM estiver construída pelo navegador
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});