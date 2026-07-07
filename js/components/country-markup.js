/**
 * country-markup.js
 * Componente exigido pela diretriz analítica da pesquisa:
 * Exibe o Markup Geopolítico visual detalhando a função na divisão internacional do trabalho.
 */
export class CountryMarkupManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        
        // Base de conhecimento geopolítica sobre o Metabolismo e Troca Ecologicamente Desigual
        this.geopoliticalKnowledge = {
            CHL: {
                name: "Chile",
                role: "Periferia Extrativa / Salar de Atacama",
                category: "PERIPHERY_PRIMARY",
                description: "Exportador primário de Carbonato de Lítio (HS 283691). Sofre severa exaustão de aquíferos fósseis e degradação socioambiental no Atacama para abastecer a transição verde europeia, recebendo baixo valor agregado em retorno."
            },
            ARG: {
                name: "Argentina",
                role: "Periferia Extrativa / Triângulo do Lítio",
                category: "PERIPHERY_PRIMARY",
                description: "Fornecedor vital de minerais críticos brutos (Lítio, Cobre). Inserção nas GVCs caracterizada pelo esgotamento da natureza bruta sem captação tecnológica ou retenção de rendas de manufatura complexa."
            },
            DEU: {
                name: "Alemanha",
                role: "Centro Hegemônico / Monopólio Tecnológico",
                category: "CORE_TECH",
                description: "Líder industrial da UE-27 na transição verde. Importa commodities físicas intensivas em recursos naturais (Lítio/Cobre) e reexporta mercadorias de alto valor comercial (Baterias HS 850760 e Veículos Elétricos HS 870380)."
            },
            FRA: {
                name: "França",
                role: "Centro Hegemônico Tecnológico",
                category: "CORE_TECH",
                description: "Aplica o arcabouço normativo do European Green Deal para securitizar o suprimento de Matérias-Primas Críticas (CRMs) a partir do Sul Global, concentrando a agregação de capital e patentes industriais."
            },
            BEL: {
                name: "Bélgica",
                role: "Hub de Refino e Logística Europeia",
                category: "CORE_TECH",
                description: "Ponto nevrálgico de entrada de minerais brutos e centro de reprocessamento e distribuição de tecnologias limpas para o bloco europeu (EU-27)."
            },
            BRA: {
                name: "Brasil",
                role: "Periferia Regional / Hub Mercosul",
                category: "TRANSITION_HYBRID",
                description: "Exportador massivo de commodities minerais (Ferro, Manganês HS 260200, Grafite HS 250410). Enfrenta barreiras tecnológicas e dependência estrutural na importação de componentes para eletrificação."
            },
            EUN: {
                name: "União Europeia (Agregado EU-27)",
                role: "Bloco Hegemônico da Transição Verde",
                category: "CORE_TECH",
                description: "Estabelece os termos de troca desiguais através de regulações unilaterais, externalizando os custos socioambientais da mineração para a periferia enquanto detém o monopólio do valor manufaturado."
            }
        };
    }

    /**
     * Atualiza a exibição de cartões de markup geopolítico conforme o dataset processado.
     * @param {Array} records - Registros filtrados retornados pela query ao IndexedDB.
     */
    render(records) {
        if (!this.container) return;

        if (!records || records.length === 0) {
            this.container.innerHTML = `<div class="markup-placeholder"><p>Nenhum dado disponível para compor o mapeamento geopolítico.</p></div>`;
            return;
        }

        // Identifica entidades únicas presentes nos registros filtrados
        const activeISOs = new Set();
        records.forEach(r => {
            if (r.reporterISO) activeISOs.add(r.reporterISO);
            if (r.partnerISO) activeISOs.add(r.partnerISO);
        });

        // Estrutura cartões de markup para as principais entidades encontradas
        const cardsHTML = [];
        let renderCount = 0;

        // Prioriza a exibição dos países nucleares da pesquisa do usuário
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
            if (renderCount >= 6) break; // Limita a 6 cartões para não poluir o layout visual

            const knowledge = this.geopoliticalKnowledge[iso];
            if (knowledge) {
                // Calcula estatísticas rápidas do ator nesse subconjunto de dados
                const stats = this.computeEntityStats(iso, records);

                cardsHTML.push(`
                    <div class="geopolitical-card" data-category="${knowledge.category}">
                        <div class="geopolitical-header">
                            <span class="geopolitical-country">
                                ${knowledge.name}
                                <span class="country-iso-badge">${iso}</span>
                            </span>
                            <span class="geopolitical-role-tag">${knowledge.category === 'CORE_TECH' ? 'Centro Hegemônico' : 'Periferia Extrativa'}</span>
                        </div>
                        <p class="geopolitical-desc">${knowledge.description}</p>
                        <div class="geopolitical-metrics">
                            <span><strong>Papel:</strong> ${knowledge.role}</span>
                            <span><strong>Massa Relacionada:</strong> ${(stats.weight / 1000).toFixed(1)} tons</span>
                        </div>
                    </div>
                `);
                renderCount++;
            }
        }

        if (cardsHTML.length > 0) {
            this.container.innerHTML = `<div class="markup-grid">${cardsHTML.join('')}</div>`;
        } else {
            this.container.innerHTML = `<div class="markup-placeholder"><p>Exibindo entidades comerciais sem perfil de espoliação mineral catalogado no dicionário geopolítico ativo.</p></div>`;
        }
    }

    /**
     * Agrega dados rápidos para enriquecer os cartões com volume real transacionado.
     */
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