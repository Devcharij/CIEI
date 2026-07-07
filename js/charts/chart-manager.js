import { SankeyChart } from './sankey-chart.js';
import { AuxiliaryCharts } from './aux-charts.js';

/**
 * chart-manager.js
 * Orquestrador da camada de visualização. Recebe os dados do banco,
 * calcula KPIs globais e aciona os motores gráficos (Google Charts / Chart.js).
 */
export class ChartManager {
    constructor() {
        this.sankey = new SankeyChart('sankey-chart');
        this.auxCharts = new AuxiliaryCharts();
    }

    /**
     * Atualiza todos os elementos visuais com base nos registros do IndexedDB.
     */
    updateAll(records, currentMetric = 'NetWgt') {
        // 1. Renderiza KPIs Analíticos no topo
        this.renderKPIs(records);

        // 2. Renderiza o Sankey principal com a métrica selecionada
        this.sankey.render(records, currentMetric);

        // 3. Renderiza gráficos complementares
        this.auxCharts.renderTimeSeries(records);
        this.auxCharts.renderDowngradingChart(records);

        // 4. Preenche tabela de auditoria analítica
        this.renderAuditTable(records);
    }

    /**
     * Calcula e exibe as métricas agregadas de Exaustão vs. Financeirização.
     */
    renderKPIs(records) {
        let totalWeight = 0;
        let totalValue = 0;

        records.forEach(r => {
            totalWeight += (r.netWgt || 0);
            totalValue += (r.tradeValue || 0);
        });

        // Índice EUE: Razão global de dólares gerados por quilograma de natureza movimentada
        const eueRatio = totalWeight > 0 ? (totalValue / totalWeight) : 0;

        document.getElementById('kpi-total-weight').textContent = `${(totalWeight / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Tons`;
        document.getElementById('kpi-total-value').textContent = `$${totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
        document.getElementById('kpi-eue-ratio').textContent = `$${eueRatio.toFixed(2)} / kg`;
    }

    /**
     * Popula a tabela interativa com uma amostra dos registros para auditoria.
     */
    renderAuditTable(records) {
        const tbody = document.getElementById('audit-table-body');
        const exportBtn = document.getElementById('export-table-btn');
        if (!tbody) return;

        if (!records || records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center empty-state">Nenhum dado compatível com os filtros atuais.</td></tr>`;
            exportBtn.disabled = true;
            return;
        }

        exportBtn.disabled = false;
        
        // Limita renderização a 50 linhas em tela para garantir fluidez no scroll do DOM
        const sample = records.slice(0, 50);
        const rowsHTML = sample.map(r => {
            const ratio = r.netWgt > 0 ? (r.tradeValue / r.netWgt).toFixed(2) : '0.00';
            const flowBadge = r.flowCode === 'X' ? '<span style="color:var(--color-emerald);font-weight:600;">EXPORT (Saída)</span>' : '<span style="color:var(--color-amber);font-weight:600;">IMPORT (Entrada)</span>';

            return `
                <tr>
                    <td><strong>${r.period}</strong></td>
                    <td>${r.reporterDesc} <small>(${r.reporterISO})</small></td>
                    <td>${r.partnerDesc} <small>(${r.partnerISO})</small></td>
                    <td>${flowBadge}</td>
                    <td><code>HS ${r.cmdCode}</code></td>
                    <td>${r.cmdDesc.slice(0, 35)}...</td>
                    <td class="text-right">${(r.netWgt || 0).toLocaleString('pt-BR')} kg</td>
                    <td class="text-right">$${(r.tradeValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td class="text-right"><strong>$${ratio}</strong></td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHTML;
    }
}