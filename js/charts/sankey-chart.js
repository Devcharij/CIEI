/**
 * sankey-chart.js
 * Implementação do Diagrama de Sankey usando a Google Charts API.
 * Visualização primária e obrigatória para demonstrar o Funil Metabólico.
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        
        // Inicializa biblioteca gráfica do Google
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
            });
        }
    }

    /**
     * Renderiza o Sankey transformando registros de comércio em nós conectados.
     * @param {Array} records - Array de registros transacionais do Comtrade.
     * @param {String} metric - 'NetWgt' (massa física kg) ou 'TradeValue' (valor US$).
     */
    render(records, metric = 'NetWgt') {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded) {
            container.innerHTML = `<div class="empty-state">Aguardando inicialização da API Google Charts...</div>`;
            setTimeout(() => this.render(records, metric), 500);
            return;
        }

        if (!records || records.length === 0) {
            container.innerHTML = `<div class="empty-state">Nenhum fluxo de comércio encontrado para os filtros selecionados.</div>`;
            return;
        }

        // Agregação de Arestas: [Origem, Destino, Peso/Valor]
        const edgeMap = new Map();

        records.forEach(record => {
            const val = record[metric] || 0;
            if (val <= 0) return;

            // Define sentido do fluxo com base na natureza (Export/Import)
            let source = record.reporterDesc || record.reporterISO;
            let target = record.partnerDesc || record.partnerISO;

            if (record.flowCode === 'M') {
                // Se for importação, inverte nós para manter o fluxo visual coerente da Origem -> Destino
                source = record.partnerDesc || record.partnerISO;
                target = record.reporterDesc || record.reporterISO;
            }

            // Evita auto-referências ou ciclos que quebram a API do Sankey
            if (source === target) return;

            // Nó intermediário de mercadoria para demonstrar o salto técnico (Ex: Chile -> Lítio Bruto -> Alemanha)
            const cmdNode = `HS ${record.cmdCode}: ${record.cmdDesc.slice(0, 25)}...`;
            
            // Aresta 1: Origem -> Mercadoria
            const key1 = `${source}→${cmdNode}`;
            edgeMap.set(key1, (edgeMap.get(key1) || 0) + val);

            // Aresta 2: Mercadoria -> Destino
            const key2 = `${cmdNode}→${target}`;
            edgeMap.set(key2, (edgeMap.get(key2) || 0) + val);
        });

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Origem');
        dataTable.addColumn('string', 'Destino');
        dataTable.addColumn('number', metric === 'NetWgt' ? 'Peso Físico (kg)' : 'Valor Comercial (US$)');

        const rows = [];
        edgeMap.forEach((weight, key) => {
            const [src, tgt] = key.split('→');
            rows.push([src, tgt, weight]);
        });

        if (rows.length === 0) {
            container.innerHTML = `<div class="empty-state">Não foi possível construir conexões de fluxo entre as entidades selecionadas.</div>`;
            return;
        }

        dataTable.addRows(rows);

        // Opções de Estilização Acadêmica do Sankey
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const options = {
            width: '100%',
            height: 500,
            sankey: {
                node: {
                    label: {
                        fontName: 'Inter',
                        fontSize: 12,
                        color: isDarkMode ? '#F8FAFC' : '#0F172A',
                        bold: true
                    },
                    nodePadding: 24,
                    width: 16,
                    colors: ['#059669', '#2563EB', '#D97706', '#E11D48', '#0D9488', '#4F46E5']
                },
                link: {
                    colorMode: 'gradient',
                    color: {
                        fill: isDarkMode ? '#334155' : '#CBD5E1',
                        fillOpacity: isDarkMode ? 0.4 : 0.6
                    }
                }
            },
            tooltip: { textStyle: { fontName: 'Inter', fontSize: 13 } }
        };

        const chart = new google.visualization.Sankey(container);
        chart.draw(dataTable, options);
    }
}