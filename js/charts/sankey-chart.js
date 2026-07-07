/**
 * sankey-chart.js
 * Sankey Metabolic Flow Diagram implementation using Google Charts API.
 * Demonstrates the structural asymmetry between physical volume and monetary valuation.
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
            });
        }
    }

    render(records, metric = 'NetWgt') {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded) {
            container.innerHTML = `<div class="empty-state">Initializing Google Charts visualization engine...</div>`;
            setTimeout(() => this.render(records, metric), 500);
            return;
        }

        if (!records || records.length === 0) {
            container.innerHTML = `<div class="empty-state">No commercial trade flows located for the selected analytical filters.</div>`;
            return;
        }

        const edgeMap = new Map();

        records.forEach(record => {
            const val = record[metric] || 0;
            if (val <= 0) return;

            let source = record.reporterDesc || record.reporterISO;
            let target = record.partnerDesc || record.partnerISO;

            if (record.flowCode === 'M') {
                source = record.partnerDesc || record.partnerISO;
                target = record.reporterDesc || record.reporterISO;
            }

            if (source === target) return;

            const cmdNode = `HS ${record.cmdCode}: ${record.cmdDesc.slice(0, 25)}...`;
            
            const key1 = `${source}→${cmdNode}`;
            edgeMap.set(key1, (edgeMap.get(key1) || 0) + val);

            const key2 = `${cmdNode}→${target}`;
            edgeMap.set(key2, (edgeMap.get(key2) || 0) + val);
        });

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'Origin');
        dataTable.addColumn('string', 'Destination');
        dataTable.addColumn('number', metric === 'NetWgt' ? 'Physical Volume (kg)' : 'Monetary Value (US$)');

        const rows = [];
        edgeMap.forEach((weight, key) => {
            const [src, tgt] = key.split('→');
            rows.push([src, tgt, weight]);
        });

        if (rows.length === 0) {
            container.innerHTML = `<div class="empty-state">Unable to construct valid directed flow edges between the selected actors.</div>`;
            return;
        }

        dataTable.addRows(rows);

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
