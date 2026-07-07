/**
 * sankey-chart.js
 * Official Google Charts Sankey Diagram implementation with Interactive Pan/Zoom.
 * Includes a bulletproof loader to prevent infinite "Loading..." loops.
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

        // BULLETPROOF GOOGLE CHARTS LOADER
        this.initGoogleCharts();
        this.initPanZoom();
    }

    initGoogleCharts() {
        if (typeof google !== 'undefined' && google.charts) {
            google.charts.load('current', { packages: ['sankey'] });
            google.charts.setOnLoadCallback(() => {
                this.isGoogleChartsLoaded = true;
                if (this.lastRecords) this.drawChart(this.lastRecords, this.lastMetric);
            });
        } else {
            // Fallback se a internet oscilar ou o script do Google demorar
            const retryInterval = setInterval(() => {
                if (typeof google !== 'undefined' && google.charts) {
                    clearInterval(retryInterval);
                    google.charts.load('current', { packages: ['sankey'] });
                    google.charts.setOnLoadCallback(() => {
                        this.isGoogleChartsLoaded = true;
                        if (this.lastRecords) this.drawChart(this.lastRecords, this.lastMetric);
                    });
                }
            }, 500);
        }
    }

    initPanZoom() {
        const wrapper = document.getElementById(this.wrapperId);
        if (!wrapper) return;

        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = wrapper.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const xs = (mouseX - this.pointX) / this.scale;
            const ys = (mouseY - this.pointY) / this.scale;

            const delta = -e.deltaY;
            this.scale *= (delta > 0) ? 1.15 : (1 / 1.15);

            if (this.scale < 0.5) this.scale = 0.5;
            if (this.scale > 5) this.scale = 5;

            this.pointX = mouseX - xs * this.scale;
            this.pointY = mouseY - ys * this.scale;
            this.updateTransform();
        }, { passive: false });

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
        if (chart) chart.style.transform = `translate(${this.pointX}px, ${this.pointY}px) scale(${this.scale})`;
    }

    render(records, metric = 'NetWgt') {
        this.lastRecords = records;
        this.lastMetric = metric;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Verificação dupla para evitar o loop infinito
        if (!this.isGoogleChartsLoaded || typeof google === 'undefined' || !google.visualization || !google.visualization.Sankey) {
            container.innerHTML = `<div class="empty-state">Loading Google Charts engine... please wait.</div>`;
            setTimeout(() => this.render(records, metric), 500);
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
        container.innerHTML = ''; // Limpa o canvas

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
        
        // Aumentei
