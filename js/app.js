import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';

/**
 * app.js
 * Ponto de Entrada da Aplicação (Entrypoint). Orquestra os módulos,
 * vincula os event listeners ao DOM e gerencia o ciclo de vida dos dados.
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
     * Bootstrap assíncrono do sistema.
     */
    async init() {
        try {
            await this.db.init();
            this.bindEvents();
            this.setupStateReactivity();
            
            // Verifica se o usuário já possui um dataset salvo na sessão anterior
            const count = await this.db.getRecordCount();
            if (count > 0) {
                this.ui.updateDBStatus('online', count);
                this.ui.showToast('Base de dados restaurada do cache IndexedDB com sucesso.', 'success');
                await this.restoreFiltersFromMetadata();
                await this.refreshDashboard();
            } else {
                this.ui.updateDBStatus('offline', 0);
            }
        } catch (error) {
            console.error('Falha na inicialização do aplicativo:', error);
            this.ui.showToast('Erro ao inicializar o banco de dados local.', 'error');
        }
    }

    /**
     * Inscreve a UI para reagir automaticamente a mutações no FilterState.
     */
    setupStateReactivity() {
        this.state.subscribe(async (currentState) => {
            // Mostra overlay de carregamento no gráfico principal
            const loader = document.getElementById('chart-loader');
            if (loader) loader.style.display = 'flex';

            try {
                const filteredRecords = await this.db.queryTradeFlows(currentState);
                
                // Atualiza o indicador visual da métrica ativa (Massa Físico ou Monetário)
                const badge = document.getElementById('sankey-metric-badge');
                if (badge) {
                    badge.textContent = currentState.metric === 'NetWgt' ? 
                        'Exibindo: Massa Física (kg) — Espoliação' : 
                        'Exibindo: Valor Comercial (US$) — Financeirização';
                }

                // Orquestra atualização sequencial de toda a tela
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
     * Mapeia os eventos dos elementos DOM para as ações da arquitetura.
     */
    bindEvents() {
        // 1. Upload e Ingestão de Planilha Comtrade
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                this.ui.updateDBStatus('processing');
                this.ui.showToast(`Iniciando leitura e inferência da planilha: "${file.name}"...`, 'warning');

                try {
                    // Processa planilha com o motor de inferência sem hardcodes
                    const { records, metadata } = await this.parser.parseFile(file, (msg) => {
                        console.info(msg);
                    });

                    // Persiste em IndexedDB (substitui dados antigos para manter coerência analítica)
                    await this.db.clearAllData();
                    const insertedCount = await this.db.insertBatch(records);
                    
                    // Salva dicionários para renderização instantânea dos menus de seleção
                    await this.db.setMetadata('schema_dictionaries', metadata);

                    this.ui.updateDBStatus('online', insertedCount);
                    this.ui.showToast(`Planilha importada! ${insertedCount.toLocaleString('pt-BR')} registros gravados no banco local.`, 'success');

                    // Preenche seletores HTML e aciona primeira renderização do dashboard
                    this.populateFilterDropdowns(metadata);
                    this.state.reset(); // Dispara re-renderização por consequência

                } catch (error) {
                    console.error('Erro na ingestão do arquivo Excel:', error);
                    this.ui.updateDBStatus('offline', 0);
                    this.ui.showToast(error.message || 'Falha ao importar o arquivo Excel/CSV selecionado.', 'error');
                } finally {
                    fileInput.value = ''; // Limpa input para permitir re-upload de mesmo arquivo se necessário
                }
            });
        }

        // 2. Botões de Alternância de Métrica (Massa Física vs Monetário)
        const toggleButtons = document.querySelectorAll('.toggle-btn');
        toggleButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toggleButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const selectedMetric = btn.getAttribute('data-metric');
                this.state.update({ metric: selectedMetric });
            });
        });

        // 3. Modificadores de Filtros (Selects do Painel Lateral)
        const filterIds = ['year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'];
        filterIds.forEach(id => {
            const select = document.getElementById(`filter-${id}`);
            if (select) {
                select.addEventListener('change', (e) => {
                    this.state.update({ [id]: e.target.value });
                });
            }
        });

        // 4. Botão Limpar Filtros
        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterIds.forEach(id => {
                    const el = document.getElementById(`filter-${id}`);
                    if (el) el.value = 'ALL';
                });
                this.state.reset();
                this.ui.showToast('Filtros analíticos redefinidos para a visão global agregada.', 'success');
            });
        }

        // 5. Exportação em CSV da Tabela de Auditoria
        const exportBtn = document.getElementById('export-table-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const currentRecords = await this.db.queryTradeFlows(this.state.getState());
                this.exportToCSV(currentRecords);
            });
        }
    }

    /**
     * Preenche dinamicamente as opções dos selects HTML baseando-se nos metadados da planilha.
     */
    populateFilterDropdowns(metadata) {
        // Preenche Anos
        const yearSelect = document.getElementById('filter-year');
        if (yearSelect && metadata.years) {
            yearSelect.innerHTML = '<option value="ALL">Todos os Anos Agregados</option>' +
                metadata.years.map(yr => `<option value="${yr}">${yr}</option>`).join('');
            yearSelect.disabled = false;
        }

        // Preenche Reporters (Exportadores/Importadores de origem)
        const repSelect = document.getElementById('filter-reporter');
        if (repSelect && metadata.reporters) {
            repSelect.innerHTML = '<option value="ALL">Todos os Países Disponíveis</option>' +
                metadata.reporters.map(r => `<option value="${r.iso}">${r.desc} (${r.iso})</option>`).join('');
            repSelect.disabled = false;
        }

        // Preenche Partners
        const partSelect = document.getElementById('filter-partner');
        if (partSelect && metadata.partners) {
            partSelect.innerHTML = '<option value="ALL">Todos os Países Disponíveis</option>' +
                metadata.partners.map(p => `<option value="${p.iso}">${p.desc} (${p.iso})</option>`).join('');
            partSelect.disabled = false;
        }

        // Preenche Commodities HS
        const cmdSelect = document.getElementById('filter-commodity');
        if (cmdSelect && metadata.commodities) {
            cmdSelect.innerHTML = '<option value="ALL">Todas as Mercadorias no Dataset</option>' +
                metadata.commodities.map(c => `<option value="${c.code}">HS ${c.code} — ${c.desc.slice(0, 40)}...</option>`).join('');
            cmdSelect.disabled = false;
        }
    }

    /**
     * Restaura os filtros na inicialização caso a base local já contenha dados.
     */
    async restoreFiltersFromMetadata() {
        const metadata = await this.db.getMetadata('schema_dictionaries');
        if (metadata) {
            this.populateFilterDropdowns(metadata);
        }
    }

    /**
     * Força a consulta e recarga visual a partir do estado atual da aplicação.
     */
    async refreshDashboard() {
        const records = await this.db.queryTradeFlows(this.state.getState());
        this.markupManager.render(records);
        this.chartManager.updateAll(records, this.state.getState().metric);
    }

    /**
     * Gerador de CSV para exportar os dados brutos filtrados.
     */
    exportToCSV(records) {
        if (!records || records.length === 0) return;

        const headers = ['Ano', 'Reporter ISO', 'Reporter Nome', 'Partner ISO', 'Partner Nome', 'Fluxo', 'HS Code', 'Descricao', 'Peso Liquido (kg)', 'Valor Comercial (USD)'];
        const rows = records.map(r => [
            r.period, r.reporterISO, `"${r.reporterDesc}"`, r.partnerISO, `"${r.partnerDesc}"`, r.flowCode, r.cmdCode, `"${r.cmdDesc}"`, r.netWgt, r.tradeValue
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

// Inicia o ecossistema assim que a estrutura HTML estiver totalmente pronta
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});