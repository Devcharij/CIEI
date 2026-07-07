import { SankeyChart } from './sankey-chart.js';
import { AuxiliaryCharts } from './aux-charts.js';

/**
 * chart-manager.js
 * Visualization orchestration layer. Receives filtered database records,
 * computes global EUE KPIs, and triggers graph rendering engines.
 */
export class ChartManager {
    constructor() {
        this.sankey = new SankeyChart('sankey-chart');
        this.auxCharts = new AuxiliaryCharts();
    }

    updateAll(records, currentMetric = 'NetWgt') {
        this.renderKPIs(records);
        this.sankey.render(records, currentMetric);
        this.auxCharts.renderTimeSeries(records);
        this.auxCharts.renderDowngradingChart(records);
        this.renderAuditTable(records);
    }

    renderKPIs(records) {
        let totalWeight = 0;
        let totalValue = 0;

        records.forEach(r => {
            totalWeight += (r.netWgt || 0);
            totalValue += (r.tradeValue || 0);
        });

        const eueRatio = totalWeight > 0 ? (totalValue / totalWeight) : 0;

        document.getElementById('kpi-total-weight').textContent = `${(totalWeight / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} Tons`;
        document.getElementById('kpi-total-value').textContent = `$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        document.getElementById('kpi-eue-ratio').textContent = `$${eueRatio.toFixed(2)} / kg`;
    }

    renderAuditTable(records) {
        const tbody = document.getElementById('audit-table-body');
        const exportBtn = document.getElementById('export-table-btn');
        if (!tbody) return;

        if (!records || records.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center empty-state">No records match the active analytical filters.</td></tr>`;
            exportBtn.disabled = true;
            return;
        }

        exportBtn.disabled = false;
        
        const sample = records.slice(0, 50);
        const rowsHTML = sample.map(r => {
            const ratio = r.netWgt > 0 ? (r.tradeValue / r.netWgt).toFixed(2) : '0.00';
            const flowBadge = r.flowCode === 'X' ? 
                '<span style="color:var(--color-emerald);font-weight:600;">EXPORT (Outflow)</span>' : 
                '<span style="color:var(--color-amber);font-weight:600;">IMPORT (Inflow)</span>';

            return `
                <tr>
                    <td><strong>${r.period}</strong></td>
                    <td>${r.reporterDesc} <small>(${r.reporterISO})</small></td>
                    <td>${r.partnerDesc} <small>(${r.partnerISO})</small></td>
                    <td>${flowBadge}</td>
                    <td><code>HS ${r.cmdCode}</code></td>
                    <td>${r.cmdDesc.slice(0, 35)}...</td>
                    <td class="text-right">${(r.netWgt || 0).toLocaleString('en-US')} kg</td>
                    <td class="text-right">$${(r.tradeValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td class="text-right"><strong>$${ratio}</strong></td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHTML;
    }
}
