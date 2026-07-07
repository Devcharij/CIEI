/**
 * sankey-chart.js
 * Official Google Charts Sankey Diagram implementation.
 * Includes dynamic DOM width calculation and responsive resize listeners
 * to prevent squeezed rendering or layout breaking.
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        this.lastRecords = null;
        this.lastMetric = 'NetWgt';
        
        // Initialize Google Charts API
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                if (this.lastRecords) {
                    this.render(this.lastRecords, this.lastMetric);
                }
            });
        }

        // Responsive auto-redraw on window resize
        window.addEventListener('resize', () => {
            if (this.lastRecords && this.isGoogleChartsLoaded) {
                this.drawChart(this.lastRecords, this.lastMetric);
            }
        });
    }

    render(records, metric = 'NetWgt') {
        this.lastRecords = records;
        this.lastMetric = metric;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded) {
            container.innerHTML = `<div class="empty-state">Initializing Google Charts visualization engine...</div>`;
            return;
        }

        if (!records || records.length === 0) {
            container.innerHTML = `<div class="empty-state">No commercial trade flows located for the selected analytical parameters.</div>`;
            return;
        }

        this.drawChart(records, metric);
    }

    drawChart(records, metric) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Clear previous SVG to prevent layout squeezing
        container.innerHTML = '';

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

            // Prevent cyclic self-loops (Source === Target crashes Google Charts)
            if (source === target) return;

            const shortDesc = record.cmdDesc.length > 30 ? record.cmdDesc.slice(0, 30) + '...' : record.cmdDesc;
            const cmdNode = `HS ${record.cmdCode}: ${shortDesc}`;

            const sourceNode = `${source} [Origin]`;
            const targetNode = `${target} [Destination]`;
            
            const key1 = `${sourceNode}→${cmdNode}`;
            edgeMap.set(key1, (edgeMap.get(key1) || 0) + val);

            const key2 = `${cmdNode}→${targetNode}`;
            edgeMap.set(key2, (edgeMap.get(key2) || 0) + val);
        });

        const dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'From');
        dataTable.addColumn('string', 'To');
        dataTable.addColumn('number', metric === 'NetWgt' ? 'Physical Mass (kg)' : 'Trade Value (USD)');

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
        
        // Dynamically measure the exact pixel width of the DOM card
        const containerWidth = container.parentElement.clientWidth || container.clientWidth || 900;

        const officialPalette = [
            '#059669', '#2563EB', '#D97706', '#E11D48', 
            '#0D9488', '#4F46E5', '#7C3AED', '#DB2777'
        ];

        const options = {
            width: containerWidth,
            height: 520,
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
                    colors: officialPalette
                },
                link: {
                    colorMode: 'gradient',
                    colors: officialPalette,
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
