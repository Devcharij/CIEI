/**
 * sankey-chart.js
 * Official Google Charts Sankey Diagram implementation with Interactive Pan/Zoom.
 * Based on: https://developers.google.com/chart/interactive/docs/gallery/sankey
 * Zoom Logic based on: https://dev.to/alexboyko/javascript-zoom-like-in-maps-for-svghtml-2m3b
 */
export class SankeyChart {
    constructor(containerId, wrapperId) {
        this.containerId = containerId;
        this.wrapperId = wrapperId;
        this.isGoogleChartsLoaded = false;
        this.lastRecords = null;
        this.lastMetric = 'NetWgt';
        
        // Pan and Zoom State
        this.scale = 1;
        this.pointX = 0;
        this.pointY = 0;
        this.start = { x: 0, y: 0 };
        this.isDragging = false;

        // Force Google Charts to load safely
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                if (this.lastRecords) this.drawChart(this.lastRecords, this.lastMetric);
            });
        }

        this.initPanZoom();
    }

    /**
     * Initializes the Map-like Zoom and Pan functionality
     */
    initPanZoom() {
        const wrapper = document.getElementById(this.wrapperId);
        const chart = document.getElementById(this.containerId);
        if (!wrapper || !chart) return;

        // Mouse Wheel Zooming
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = wrapper.getBoundingClientRect();
            
            // Calculate cursor position relative to the wrapper
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Calculate current distance from corner divided by scale
            const xs = (mouseX - this.pointX) / this.scale;
            const ys = (mouseY - this.pointY) / this.scale;

            // Zoom In or Out (Delta Y)
            const delta = -e.deltaY;
            if (delta > 0) {
                this.scale *= 1.15; // Zoom in
            } else {
                this.scale /= 1.15; // Zoom out
            }

            // Prevent zooming out too much
            if (this.scale < 0.5) this.scale = 0.5;
            if (this.scale > 5) this.scale = 5;

            // Adjust X and Y points to keep the zoom centered on the cursor
            this.pointX = mouseX - xs * this.scale;
            this.pointY = mouseY - ys * this.scale;

            this.updateTransform();
        }, { passive: false });

        // Pointer Dragging (Pan)
        wrapper.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.start = { x: e.clientX - this.pointX, y: e.clientY - this.pointY };
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.pointX = e.clientX - this.start.x;
            this.pointY = e.clientY - this.start.y;
            this.updateTransform();
        });

        window.addEventListener('pointerup', () => {
            this.isDragging = false;
            wrapper.style.cursor = 'grab';
        });

        // UI Button Bindings
        document.getElementById('zoom-in')?.addEventListener('click', () => this.manualZoom(1.2));
        document.getElementById('zoom-out')?.addEventListener('click', () => this.manualZoom(0.8));
        document.getElementById('zoom-reset')?.addEventListener('click', () => {
            this.scale = 1; this.pointX = 0; this.pointY = 0; this.updateTransform();
        });
    }

    manualZoom(factor) {
        const wrapper = document.getElementById(this.wrapperId);
        if (!wrapper) return;
        const rect = wrapper.getBoundingClientRect();
        
        // Center of the wrapper
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const xs = (centerX - this.pointX) / this.scale;
        const ys = (centerY - this.pointY) / this.scale;

        this.scale *= factor;
        if (this.scale < 0.5) this.scale = 0.5;
        if (this.scale > 5) this.scale = 5;

        this.pointX = centerX - xs * this.scale;
        this.pointY = centerY - ys * this.scale;
        this.updateTransform();
    }

    updateTransform() {
        const chart = document.getElementById(this.containerId);
        if (chart) {
            chart.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
        }
    }

    render(records, metric = 'NetWgt') {
        this.lastRecords = records;
        this.lastMetric = metric;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        if (!this.isGoogleChartsLoaded || !google.visualization) {
            container.innerHTML = `<div class="empty-state">Loading Google Charts engine... please wait.</div>`;
            setTimeout(() => this.render(records, metric), 300);
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
        
        // Reset container to avoid drawing bugs
        container.innerHTML = '';

        const dataProperty = metric === 'NetWgt' ? 'netWgt' : 'tradeValue';
        const edgeMap = new Map();

        records.forEach(record => {
            const val = Number(record[dataProperty]) || 0;
            if (val <= 0) return;

            let source = record.reporterDesc || record.reporterISO || 'Origin';
            let target = record.partnerDesc || record.partnerISO || 'Destination';

            if (record.flowCode === 'M') {
                source = record.partnerDesc || record.partnerISO || 'Origin';
                target = record.reporterDesc || record.reporterISO || 'Destination';
            }

            // CRITICAL: Prevent circular loops which crash Google Charts
            if (source === target) return;

            const shortDesc = record.cmdDesc && record.cmdDesc.length > 25 
                ? record.cmdDesc.slice(0, 25) + '...' : (record.cmdDesc || 'Commodity');
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
            if (parts.length === 2) rows.push([parts[0], parts[1], weight]);
        });

        if (rows.length === 0) {
            container.innerHTML = `<div class="empty-state">Unable to construct valid directed flow edges.</div>`;
            return;
        }

        dataTable.addRows(rows);

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const wrapper = document.getElementById(this.wrapperId);
        const exactWidth = wrapper ? wrapper.clientWidth : 1000;
        const exactHeight = wrapper ? wrapper.clientHeight : 500;

        const officialPalette = ['#059669', '#2563EB', '#D97706', '#E11D48', '#0D9488', '#4F46E5', '#7C3AED'];

        const options = {
            width: exactWidth,
            height: exactHeight,
            sankey: {
                node: {
                    label: { fontName: 'Inter', fontSize: 13, color: isDarkMode ? '#F8FAFC' : '#0F172A', bold: true },
                    nodePadding: 30,
                    width: 20,
                    colors: officialPalette
                },
                link: {
                    colorMode: 'gradient',
                    colors: officialPalette,
                    color: { fill: isDarkMode ? '#334155' : '#CBD5E1', fillOpacity: 0.5 }
                }
            }
        };

        const chart = new google.visualization.Sankey(container);
        chart.draw(dataTable, options);
    }
}
