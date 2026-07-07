/**
 * filter-state.js
 * Gerenciador de estado reativo e dicionários geopolíticos.
 * Emite eventos quando os filtros de visualização são alterados.
 */
export class FilterState {
    constructor() {
        this.state = {
            metric: 'NetWgt', // Padrão: Volume físico (kg) para provar perda de natureza bruta
            year: 'ALL',
            geogroup: 'ALL',
            reporter: 'ALL',
            partner: 'ALL',
            flow: 'ALL',
            commodity: 'ALL'
        };

        this.listeners = [];

        // Agrupamentos geopolíticos teóricos autônomos
        this.geopoliticalGroups = {
            EU27: ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'EUN'],
            LITHIUM_TRIANGLE: ['CHL', 'ARG', 'BOL'],
            MERCOSUR: ['ARG', 'BRA', 'PRY', 'URY', 'BOL'],
            CORE_HEGEMONY: ['USA', 'GBR', 'JPN', 'CAN', 'AUS', 'KOR', 'CHN']
        };
    }

    /**
     * Registra um listener que será invocado quando o estado mudar.
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Notifica os assinantes sobre mutações no estado.
     */
    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    /**
     * Atualiza um ou múltiplos parâmetros de filtro e dispara re-renderização.
     */
    update(newValues = {}) {
        let changed = false;
        for (const [key, value] of Object.entries(newValues)) {
            if (this.state[key] !== undefined && this.state[key] !== value) {
                this.state[key] = value;
                changed = true;
            }
        }
        if (changed) {
            this.notify();
        }
    }

    /**
     * Retorna uma cópia do estado atual enriquecida com vetores geopolíticos.
     */
    getState() {
        const currentState = { ...this.state };
        
        // Se houver um grupo geopolítico selecionado, injeta o array de ISOs
        if (currentState.geogroup !== 'ALL' && this.geopoliticalGroups[currentState.geogroup]) {
            currentState.geodescArray = this.geopoliticalGroups[currentState.geogroup];
        } else {
            currentState.geodescArray = null;
        }

        return currentState;
    }

    /**
     * Reseta os filtros para os valores padrão iniciais.
     */
    reset() {
        this.state = {
            metric: 'NetWgt',
            year: 'ALL',
            geogroup: 'ALL',
            reporter: 'ALL',
            partner: 'ALL',
            flow: 'ALL',
            commodity: 'ALL'
        };
        this.notify();
    }
}