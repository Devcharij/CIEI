/**
 * sankey-chart.js
 * Implementação robusta e responsiva do Google Charts Sankey API.
 * Inclui sanitização contra ciclos de nó (que causam travamento na API) 
 * e cálculo dinâmico de largura para evitar layouts espremidos.
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        this.lastRecords = null;
        this.lastMetric = 'NetWgt';
        this.resizeTimeout = null;

        // Inicializa a API do Google Charts
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                if (this.lastRecords) {
                    this.drawChart(this.lastRecords, this.lastMetric);
                }
            });
        }

        // Redimensionamento responsivo com debounce para evitar sobrecarga na thread
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.lastRecords && this.isGoogleChartsLoaded) {
                    this.drawChart(this.lastRecords, this.lastMetric);
                }
            }, 150);
        });
    }

    render(records, metric = 'NetWgt') {
        this.lastRecords = records;
        this.lastMetric = metric;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded) {
            container.innerHTML = `<div class="empty-state">Inicializando o motor visual do Google Charts...</div>`;
            return;
        }

        if (!records || records.length === 0) {
            container.innerHTML = `<div class="empty-state">Nenhum fluxo comercial encontrado para os parâmetros selecionados.</div>`;
            return;
        }

        this.drawChart(records, metric);
    }

    drawChart(records, metric) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Limpa o contêiner para evitar sobreposição de vetores SVG anteriores
        container.innerHTML = '';

        const edgeMap = new Map();

        records.forEach(record => {
            const val = Number(record[metric]) || 0;
            if (val <= 0) return;

            // Define a direção com base no fluxo de comércio (Exportação vs Importação)
            let source = record.reporterDesc || record.reporterISO || 'Origem Desconhecida';
            let target = record.partnerDesc || record.partnerISO || 'Destino Desconhecido';

            if (record.flowCode === 'M') {
                source = record.partnerDesc || record.partnerISO || 'Origem Desconhecida';
                target = record.reporterDesc || record.reporterISO || 'Destino Desconhecido';
            }

            // PROTEÇÃO CRÍTICA (Anti-Ciclo): O Google Charts travará com tela em branco se Source === Target
            if (source === target) return;

            // Encurta descrições muito longas do Comtrade para manter as labels legíveis
            const shortDesc = record.cmdDesc && record.cmdDesc.length > 32 
                ? record.cmdDesc.slice(0, 32) + '...' 
                : (record.cmdDesc || 'Mercadoria');
            const cmdNode = `HS ${record.cmdCode || '0000'}: ${shortDesc}`;

            // Adiciona marcadores estruturais [Origem] e [Destino]
            // Isso garante um Grafo Acíclico Dirigido (DAG), evitando que países que atuem em ambas 
            // as pontas causem um loop de dependência fatal na API
            const sourceNode = `${source} [Origem]`;
            const targetNode = `${target} [Destino]`;

            // Aresta 1: Origem -> Mercadoria
            const key1 = `${sourceNode}→${cmdNode}`;
            edgeMap.set(key1, (edgeMap.get(key1) || 0) + val);

            // Aresta 2: Mercadoria -> Destino
            const key2 = `${cmdNode}→${targetNode}`;
            edgeMap.set(key2, (edgeMap.get(key2) || 0) + val);
        });

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'De');
        dataTable.addColumn('string', 'Para');
        dataTable.addColumn('number', metric === 'NetWgt' ? 'Volume Físico (kg)' : 'Valor Comercial (USD)');

        const rows = [];
        edgeMap.forEach((weight, key) => {
            const parts = key.split('→');
            if (parts.length === 2) {
                rows.push([parts[0], parts[1], weight]);
            }
        });

        if (rows.length === 0) {
            container.innerHTML = `<div class="empty-state">Não foi possível construir conexões direcionadas válidas com os dados fornecidos.</div>`;
            return;
        }

        dataTable.addRows(rows);

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';

        // Mede a largura real do contêiner pai para garantir que o SVG ocupe 100% da tela na horizontal
        const parentWrapper = container.parentElement;
        const exactWidth = parentWrapper && parentWrapper.clientWidth > 0 
            ? parentWrapper.clientWidth 
            : (container.clientWidth || 900);

        const palette = [
            '#059669', // Verde Esmeralda (Extrativismo / Natureza Bruta)
            '#2563EB', // Azul Royal (Hegemonia Tecnológica)
            '#D97706', // Âmbar (Valor Monetário)
            '#E11D48', // Vermelho Carmim (Bens Agregados)
            '#0D9488', '#4F46E5', '#7C3AED', '#DB2777'
        ];

        const options = {
            width: exactWidth,
            height: 500,
            sankey: {
                node: {
                    label: {
                        fontName: 'Inter',
                        fontSize: 13,
                        color: isDarkMode ? '#F8FAFC' : '#0F172A',
                        bold: true
                    },
                    nodePadding: 24,
                    width: 20,
                    colors: palette
                },
                link: {
                    colorMode: 'gradient',
                    colors: palette,
                    color: {
                        fill: isDarkMode ? '#334155' : '#CBD5E1',
                        fillOpacity: isDarkMode ? 0.45 : 0.65
                    }
                }
            },
            tooltip: { 
                textStyle: { fontName: 'Inter', fontSize: 13, color: '#0F172A' },
                isHtml: true
            }
        };

        const chart = new google.visualization.Sankey(container);
        chart.draw(dataTable, options);
    }
}
