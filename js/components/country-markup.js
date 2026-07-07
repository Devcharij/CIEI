/**
 * country-markup.js
 * Renders visual Geopolitical Identification Cards detailing the ontological role
 * of each transacting economy within the international division of labor.
 */
export class CountryMarkupManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Academic Geopolitical Dictionary on Geopolitical Metabolism & EUE
        this.geopoliticalKnowledge = {
            CHL: {
                name: "Chile",
                role: "Primary Extraction Periphery / Salar de Atacama",
                category: "PERIPHERY_PRIMARY",
                description: "Primary exporter of raw Lithium Carbonate (HS 283691). Suffers severe physical depletion of fossil aquifers and socio-environmental degradation in the Atacama Desert to fuel the European Green Deal, capturing minimal value-added in return."
            },
            ARG: {
                name: "Argentina",
                role: "Primary Extraction Periphery / Lithium Triangle",
                category: "PERIPHERY_PRIMARY",
                description: "Strategic supplier of unrefined critical raw materials (Lithium, Copper). Insertion into Global Value Chains is characterized by gross physical nature expropriation without technological retention or industrial rent capture."
            },
            DEU: {
                name: "Germany",
                role: "Core Hegemony / Technological Monopoly",
                category: "CORE_TECH",
                description: "Industrial leader of the EU-27 green transition. Imports nature-intensive raw commodities (Lithium/Copper) and re-exports high-value manufactured capital goods (Lithium-ion Batteries HS 850760 and Electric Vehicles HS 870380)."
            },
            FRA: {
                name: "France",
                role: "Core Technological Hegemony",
                category: "CORE_TECH",
                description: "Leverages the normative framework of the European Green Deal to securitize the supply of Critical Raw Materials (CRMs) from the Global South while concentrating capital accumulation and industrial patents."
            },
            BEL: {
                name: "Belgium",
                role: "European Logistical & Refining Hub",
                category: "CORE_TECH",
                description: "Strategic entry point for unrefined mineral commodities and central processing/distribution hub for clean technologies across the European Union (EU-27)."
            },
            BRA: {
                name: "Brazil",
                role: "Regional Periphery / Mercosur Hub",
                category: "TRANSITION_HYBRID",
                description: "Massive exporter of mineral commodities (Iron, Manganese HS 260200, Graphite HS 250410). Faces structural technological barriers and dependency when importing components for domestic electrification."
            },
            EUN: {
                name: "European Union (EU-27 Aggregate)",
                role: "Hegemonic Block of the Green Transition",
                category: "CORE_TECH",
                description: "Establishes unequal terms of trade through unilateral regulatory frameworks, externalizing the socio-environmental burdens of mining to the periphery while monopolizing high-tech manufacturing value."
            }
        };
    }

    render(records) {
        if (!this.container) return;

        if (!records || records.length === 0) {
            this.container.innerHTML = `<div class="markup-placeholder"><p>No data available to generate geopolitical mapping.</p></div>`;
            return;
        }

        const activeISOs = new Set();
        records.forEach(r => {
            if (r.reporterISO) activeISOs.add(r.reporterISO);
            if (r.partnerISO) activeISOs.add(r.partnerISO);
        });

        const cardsHTML = [];
        let renderCount = 0;
        const priorityOrder = ['CHL', 'ARG', 'DEU', 'FRA', 'BEL', 'EUN', 'BRA'];
        
        const sortedISOs = Array.from(activeISOs).sort((a, b) => {
            const indexA = priorityOrder.indexOf(a);
            const indexB = priorityOrder.indexOf(b);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.localeCompare(b);
        });

        for (const iso of sortedISOs) {
            if (renderCount >= 6) break;

            const knowledge = this.geopoliticalKnowledge[iso];
            if (knowledge) {
                const stats = this.computeEntityStats(iso, records);
                const roleLabel = knowledge.category === 'CORE_TECH' ? 'Core Hegemony' : 'Extraction Periphery';

                cardsHTML.push(`
                    <div class="geopolitical-card" data-category="${knowledge.category}">
                        <div class="geopolitical-header">
                            <span class="geopolitical-country">
                                ${knowledge.name}
                                <span class="country-iso-badge">${iso}</span>
                            </span>
                            <span class="geopolitical-role-tag">${roleLabel}</span>
                        </div>
                        <p class="geopolitical-desc">${knowledge.description}</p>
                        <div class="geopolitical-metrics">
                            <span><strong>Ontological Role:</strong> ${knowledge.role}</span>
                            <span><strong>Related Volume:</strong> ${(stats.weight / 1000).toFixed(1)} tons</span>
                        </div>
                    </div>
                `);
                renderCount++;
            }
        }

        if (cardsHTML.length > 0) {
            this.container.innerHTML = `<div class="markup-grid">${cardsHTML.join('')}</div>`;
        } else {
            this.container.innerHTML = `<div class="markup-placeholder"><p>Displaying commercial actors without cataloged mineral depletion profiles in the active geopolitical dictionary.</p></div>`;
        }
    }

    computeEntityStats(iso, records) {
        let totalWeight = 0;
        records.forEach(r => {
            if (r.reporterISO === iso || r.partnerISO === iso) {
                totalWeight += (r.netWgt || 0);
            }
        });
        return { weight: totalWeight };
    }
}
