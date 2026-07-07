/**
 * filter-state.js
 * Reactive state manager and geopolitical dictionary.
 * Emits mutation events when visualization filters are modified by the researcher.
 */
export class FilterState {
    constructor() {
        this.state = {
            metric: 'NetWgt', // Default: Physical Volume (kg) to demonstrate gross nature expropriation
            year: 'ALL',
            geogroup: 'ALL',
            reporter: 'ALL',
            partner: 'ALL',
            flow: 'ALL',
            commodity: 'ALL'
        };

        this.listeners = [];

        // Comprehensive Geopolitical Clusters (includes ISO codes, numerical codes, and textual names)
        this.geopoliticalGroups = {
            EU27: [
                'EUN', 'EU27', 'EU', 'EU-27', 'DEU', 'FRA', 'BEL', 'ITA', 'ESP', 'NLD', 'AUT', 'POL', 
                'SWE', 'FIN', 'DNK', 'IRL', 'PRT', 'GRC', 'CZE', 'HUN', 'ROU', 'BGR', 'SVK', 'HRV', 
                'SVN', 'LTU', 'LVA', 'EST', 'CYP', 'MLT', 'LUX', 'GERMANY', 'FRANCE', 'BELGIUM', 
                'ITALY', 'SPAIN', 'NETHERLANDS', 'EUROPEAN UNION'
            ],
            LITHIUM_TRIANGLE: [
                'CHL', 'ARG', 'BOL', 'CHILE', 'ARGENTINA', 'BOLIVIA', '83', '32', '68'
            ],
            MERCOSUR: [
                'ARG', 'BRA', 'PRY', 'URY', 'BOL', 'ARGENTINA', 'BRAZIL', 'PARAGUAY', 'URUGUAY', 'BOLIVIA'
            ],
            CORE_HEGEMONY: [
                'USA', 'GBR', 'JPN', 'CAN', 'AUS', 'KOR', 'CHN', 'UNITED STATES', 'UNITED KINGDOM', 
                'JAPAN', 'CANADA', 'AUSTRALIA', 'SOUTH KOREA', 'CHINA'
            ]
        };
    }

    /**
     * Registers a subscriber callback to be invoked upon state mutations.
     */
    subscribe(callback) {
        if (typeof callback === 'function') {
            this.listeners.push(callback);
        }
    }

    /**
     * Notifies all subscribed modules of state changes.
     */
    notify() {
        this.listeners.forEach(callback => callback(this.getState()));
    }

    /**
     * Updates one or multiple filter parameters and triggers synchronized re-rendering.
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
     * Returns a copy of the current analytical state enriched with geopolitical cluster arrays.
     */
    getState() {
        const currentState = { ...this.state };
        
        // Inject the target geopolitical cluster array if an aggregate is selected
        if (currentState.geogroup !== 'ALL' && this.geopoliticalGroups[currentState.geogroup]) {
            currentState.geodescArray = this.geopoliticalGroups[currentState.geogroup];
        } else {
            currentState.geodescArray = null;
        }

        return currentState;
    }

    /**
     * Resets all analytical parameters to their default global overview values.
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
