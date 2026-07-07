import { ComtradeDB } from './db/idb-manager.js';
import { ExcelParser } from './parser/excel-parser.js';
import { FilterState } from './state/filter-state.js';
import { CountryMarkupManager } from './components/country-markup.js';
import { ChartManager } from './charts/chart-manager.js';
import { UIManager } from './components/ui-manager.js';
import { BUNDLED_DATASETS } from './data-bundle.js';

export class App {
    constructor() {
        this.db = new ComtradeDB();
        this.parser = new ExcelParser();
        this.state = new FilterState();
        this.markupManager = new CountryMarkupManager('markup-container');
        // NOVO: Passando os dois IDs para a classe ChartManager (que por sua vez passará pro Sankey)
        this.chartManager = new ChartManager(); 
        this.ui = new UIManager();
    }
    // ... [Mantenha a inicialização idêntica]

    bindEvents() {
        // ... [Código de leitura de arquivos e botões de zoom]
        
        // NOVO: Adicionado 'phase' ao vetor de IDs de filtros
        const filterIds = ['phase', 'year', 'geogroup', 'reporter', 'partner', 'flow', 'commodity'];
        filterIds.forEach(id => {
            const select = document.getElementById(`filter-${id}`);
            if (select) select.addEventListener('change', (e) => this.state.update({ [id]: e.target.value }));
        });

        const resetBtn = document.getElementById('reset-filters-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                filterIds.forEach(id => {
                    const el = document.getElementById(`filter-${id}`);
                    if (el) el.value = 'ALL';
                });
                this.state.reset();
                this.ui.showToast('Filters reset to global overview.', 'success');
            });
        }
        // ... [Restante do código igual]
    }
}
// ...
