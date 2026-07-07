/**
 * sankey-chart.js
 * Implementation of the official Google Charts Sankey Diagram API:
 * https://developers.google.com/chart/interactive/docs/gallery/sankey
 * * Includes an advanced Directed Acyclic Graph (DAG) sanitizer to prevent cyclic loop
 * crashes caused by identical Reporter/Partner names in international trade datasets.
 */
export class SankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.isGoogleChartsLoaded = false;
        
        // Initialize the official Google Charts library with the 'sankey' package
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
            });
        }
    }

    /**
     * Transforms filtered UN Comtrade records into directed edges and renders the official Sankey.
     * @param {Array} records - Filtered transactional trade flow objects.
     * @param {String} metric - 'NetWgt' (physical mass in kg) or 'TradeValue' (USD).
     */
    render(records, metric = 'NetWgt') {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded) {
            container.innerHTML = `<div class="empty-state">Loading Google Charts official Sankey visualization engine...</div>`;
            setTimeout(() => this.render(records, metric), 500);
            return;
        }

        if (!records || records.length === 0) {
            container.innerHTML = `<div class="empty-state">No commercial trade flows located for the selected analytical parameters.</div>`;
            return;
        }

        // Edge Aggregation Map: Key = "Source→Target", Value = Cumulative Weight/Monetary Value
        const edgeMap = new Map();

        records.forEach(record => {
            const val = record[metric] || 0;
            if (val <= 0) return;

            // Define directional flow based on transaction nature (Export vs Import)
            let source = record.reporterDesc || record.reporterISO;
            let target = record.partnerDesc || record.partnerISO;

            if (record.flowCode === 'M') {
                // If Import, invert directional vector: Origin (Partner) -> Destination (Reporter)
                source = record.partnerDesc || record.partnerISO;
                target = record.reporterDesc || record.reporterISO;
            }

            // CRITICAL SANKEY SAFETY: Prevent identical source and target names (cyclic self-loops)
            // The Google Charts Sankey API will crash and render a blank div if Source === Target.
            if (source === target) return;

            // Commodity Intermediate Node: Illustrates the metabolic material transition
            // Example: "Chile" -> "HS 283691: Lithium carbonates" -> "Germany"
            const shortDesc = record.cmdDesc.length > 28 ? record.cmdDesc.slice(0, 28) + '...' : record.cmdDesc;
            const cmdNode = `HS ${record.cmdCode}: ${shortDesc}`;

            // Ensure distinct node naming across levels to satisfy Directed Acyclic Graph (DAG) rules
            const sourceNode = `${source} [Origin]`;
            const targetNode = `${target} [Destination]`;
            
            // Edge 1: Origin Actor -> Commodity Node
            const key1 = `${sourceNode}→${cmdNode}`;
            edgeMap.set(key1, (edgeMap.get(key1) || 0) + val);

            // Edge 2: Commodity Node -> Destination Actor
            const key2 = `${cmdNode}→${targetNode}`;
            edgeMap.set(key2, (edgeMap.get(key2) || 0) + val);
        });

        // Initialize Google Charts DataTable exactly as mandated by the official API documentation
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

        // Styling configuration adhering strictly to the official Google Sankey Gallery design
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        
        // Official academic color palette inspired by Google's visual guidelines
        const officialPalette = [
            '#059669', // Emerald Green (Gross Nature / Primary Minerals)
            '#2563EB', // Royal Blue (Technological Hegemony / EU-27)
            '#D97706', // Amber Gold (Monetary Value / Capital Accumulation)
            '#E11D48', // Crimson Red (Downgrading / High Value-Added Capital Goods)
            '#0D9488', // Teal
            '#4F46E5', // Indigo
            '#7C3AED', // Purple
            '#DB2777'  // Pink
        ];

        const options = {
            width: '100%',
            height: 500,
            sankey: {
                node: {
                    label: {
                        fontName: 'Inter',
                        fontSize: 13,
                        color: isDarkMode ? '#F8FAFC' : '#0F172A',
                        bold: true
                    },
                    nodePadding: 28,  // Vertical spacing between nodes as shown in the official gallery
                    width: 20,        // Width of the vertical node rectangles
                    colors: officialPalette,
                    labelPadding: 10
                },
                link: {
                    colorMode: 'gradient', // Creates smooth color transitions from origin to destination
                    colors: officialPalette,
                    color: {
                        fill: isDarkMode ? '#334155' : '#CBD5E1',
                        fillOpacity: isDarkMode ? 0.45 : 0.65
                    }
                }
            },
            tooltip: { 
                textStyle: { 
                    fontName: 'Inter', 
                    fontSize: 13,
                    color: '#0F172A'
                },
                isHtml: true
            }
        };

        // Instantiate and draw the Sankey chart inside the wrapper container
        const chart = new google.visualization.Sankey(container);
        chart.draw(dataTable, options);
    }
}
