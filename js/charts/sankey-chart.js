/**
 * sankey-chart.js
 * Full-screen responsive implementation of the official Google Charts Sankey API.
 * Guarantees 100% horizontal width occupation and implements a Directed Acyclic Graph (DAG)
 * sanitizer to eliminate cyclic self-loops (Source === Target).
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        this.lastRecords = null;
        this.lastMetric = 'NetWgt';
        this.resizeTimeout = null;
        
        // Initialize the official Google Charts library
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                if (this.lastRecords) {
                    this.drawChart(this.lastRecords, this.lastMetric);
                }
            });
        }

        // Debounced resize listener ensures responsive redrawing without horizontal squeezing
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
            container.innerHTML = `<div class="empty-state">Initializing official Google Charts visualization engine...</div>`;
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

        // Clear existing SVG drawing to prevent rendering artifacts or right-side blank gaps
        container.innerHTML = '';

        const edgeMap = new Map();

        // CRITICAL BUG FIX: Map the UI metric state ('NetWgt') to the exact JS Object property ('netWgt')
        const dataProperty = metric === 'NetWgt' ? 'netWgt' : 'tradeValue';

        records.forEach(record => {
            // Extract the value. If value is 0, the Sankey line has 0 thickness and Google API refuses to draw it!
            const val = Number(record[dataProperty]) || 0;
            if (val <= 0) return;

            // Determine directional vectors based on trade flow type (Export Outflow vs Import Inflow)
            let source = record.reporterDesc || record.reporterISO || 'Unknown Origin';
            let target = record.partnerDesc || record.partnerISO || 'Unknown Destination';

            if (record.flowCode === 'M') {
                source = record.partnerDesc || record.partnerISO || 'Unknown Origin';
                target = record.reporterDesc || record.reporterISO || 'Unknown Destination';
            }

            // DAG Safety: Exclude identical origin and destination nodes to prevent Google API crash
            if (source === target) return;

            const shortDesc = record.cmdDesc && record.cmdDesc.length > 32 
                ? record.cmdDesc.slice(0, 32) + '...' 
                : (record.cmdDesc || 'Commodity');
            const cmdNode = `HS ${record.cmdCode || '0000'}: ${shortDesc}`;

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
            const parts = key.split('→');
            if (parts.length === 2) {
                rows.push([parts[0], parts[1], weight]);
            }
        });

        // If after processing there are no valid edges, display the academic notification
        if (rows.length === 0) {
            container.innerHTML = `<div class="empty-state">Unable to construct valid directed flow edges between the selected actors.</div>`;
            return;
        }

        dataTable.addRows(rows);

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Dynamically compute exact pixel width of parent container to ensure 100% full-width stretch
        const parentWrapper = container.parentElement;
        const exactWidth = parentWrapper && parentWrapper.clientWidth > 0 
            ? parentWrapper.clientWidth 
            : (container.clientWidth || 1000);

        const officialPalette = [
            '#059669', // Emerald Green (Extraction Periphery / Nature)
            '#2563EB', // Royal Blue (Technological Hegemony / EU-27)
            '#D97706', // Amber Gold (Monetary Capital)
            '#E11D48', // Crimson Red (High Value-Added Downgrading)
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
                    nodePadding: 26,
                    width: 22,
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
