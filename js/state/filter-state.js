export class FilterState {
    constructor() {
        this.state = {
            phase: 'ALL', // NOVO: Filtro de Fase da Pesquisa
            metric: 'NetWgt',
            year: 'ALL',
            geogroup: 'ALL',
            reporter: 'ALL',
            partner: 'ALL',
            flow: 'ALL',
            commodity: 'ALL'
        };

        this.listeners = [];

        this.geopoliticalGroups = {
            EU27: ['EUN', 'EU27', 'EU', 'EU-27', 'DEU', 'FRA', 'BEL', 'ITA', 'ESP', 'NLD', 'AUT', 'POL', 'SWE', 'FIN', 'DNK', 'GERMANY', 'FRANCE', 'BELGIUM', 'EUROPEAN UNION'],
            LITHIUM_TRIANGLE: ['CHL', 'ARG', 'BOL', 'CHILE', 'ARGENTINA', 'BOLIVIA'],
            MERCOSUR: ['ARG', 'BRA', 'PRY', 'URY', 'BOL', 'ARGENTINA', 'BRAZIL'],
            CORE_HEGEMONY: ['USA', 'GBR', 'JPN', 'CAN', 'AUS', 'CHN', 'UNITED STATES', 'UNITED KINGDOM', 'CHINA']
        };
    }

    subscribe(callback) {
        if (typeof callback === 'function') this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    update(newValues = {}) {
        let changed = false;
        for (const [key, value] of Object.entries(newValues)) {
            if (this.state[key] !== undefined && this.state[key] !== value) {
                this.state[key] = value;
                changed = true;
            }
        }
        if (changed) this.notify();
    }

    getState() {
        const currentState = { ...this.state };
        if (currentState.geogroup !== 'ALL' && this.geopoliticalGroups[currentState.geogroup]) {
            currentState.geodescArray = this.geopoliticalGroups[currentState.geogroup];
        } else {
            currentState.geodescArray = null;
        }
        return currentState;
    }

    reset() {
        this.state = {
            phase: 'ALL',
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
