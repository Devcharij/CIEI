export class SankeyChart {
    constructor(containerId, wrapperId) {
        this.chartContainer = document.getElementById(containerId);
        this.wrapper = document.getElementById(wrapperId);
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
        this.isDragging = false;
        
        google.charts.load('current', {'packages':['sankey']});
        
        this.initPanZoom();
    }

    initPanZoom() {
        this.wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.scale *= delta;
            this.applyTransform();
        });

        this.wrapper.addEventListener('pointerdown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX - this.posX;
            this.startY = e.clientY - this.posY;
        });

        window.addEventListener('pointermove', (e) => {
            if(!this.isDragging) return;
            this.posX = e.clientX - this.startX;
            this.posY = e.clientY - this.startY;
            this.applyTransform();
        });

        window.addEventListener('pointerup', () => this.isDragging = false);

        document.getElementById('zoom-in').onclick = () => { this.scale *= 1.2; this.applyTransform(); };
        document.getElementById('zoom-out').onclick = () => { this.scale /= 1.2; this.applyTransform(); };
        document.getElementById('zoom-reset').onclick = () => { this.scale = 1; this.posX = 0; this.posY = 0; this.applyTransform(); };
    }

    applyTransform() {
        this.chartContainer.style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`;
    }

    draw(data) {
        const dataTable = google.visualization.arrayToDataTable(data);
        const chart = new google.visualization.Sankey(this.chartContainer);
        chart.draw(dataTable, { width: '100%', height: '100%' });
    }
}
