import { ComtradeDB } from './db/idb-manager.js';
import { SankeyChart } from './charts/sankey-chart.js';

class App {
    constructor() {
        this.db = new ComtradeDB();
        this.sankey = new SankeyChart('sankey-chart', 'sankey-zoom-wrapper');
    }

    async init() {
        await this.db.init();
        // Carregamento automático da pasta /data
        const files = [
            { path: 'data/Fase 1 Macro.csv', phase: 'PHASE1' },
            { path: 'data/Fase 2 Micro.csv', phase: 'PHASE2' },
            { path: 'data/Phase 3A Baterias.csv', phase: 'PHASE3A' },
            { path: 'data/3B Veículos Elétricos.csv', phase: 'PHASE3B' }
        ];

        for (const file of files) {
            try {
                const response = await fetch(file.path);
                const text = await response.text();
                // Aqui você deve usar o ExcelParser para converter texto em JSON
                // e adicionar a propriedade: record.phase = file.phase;
                console.log(`Loaded ${file.path}`);
            } catch (e) {
                console.error(`Failed to load ${file.path}`);
            }
        }
    }
}
new App().init();
