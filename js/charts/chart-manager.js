import { SankeyChart } from './sankey-chart.js';
import { AuxiliaryCharts } from './aux-charts.js';

/**
 * chart-manager.js
 * Visualization Orchestration Layer.
 * Receives filtered database records, computes global EUE KPIs,
 * populates the Audit Table, and triggers graph rendering engines.
 */
export class ChartManager {
    constructor() {
        // Initialize Sankey with BOTH the inner chart container AND the outer zoom wrapper
        this.sankey = new SankeyChart('sankey-chart', 'sankey-zoom-wrapper');
        this.auxCharts = new AuxiliaryCharts();
    }

    /**
     * Master update method called reactively whenever filters change.
     */
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
            totalWeight += (Number(r.netWgt) || 0);
            totalValue += (Number(r.tradeValue) || 0);
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
            if (exportBtn) exportBtn.disabled = true;
            return;
        }

        if (exportBtn) exportBtn.disabled = false;
        
        const sample = records.slice(0, 50);
        
        const rowsHTML = sample.map(r => {
            const ratio = r.netWgt > 0 ? (r.tradeValue / r.netWgt).toFixed(2) : '0.00';
            const flowBadge = r.flowCode === 'X' 
                ? '<span style="color:var(--color-emerald);font-weight:600;">EXPORT (Outflow)</span>' 
                : '<span style="color:var(--color-amber);font-weight:600;">IMPORT (Inflow)</span>';

            const shortDesc = r.cmdDesc && r.cmdDesc.length > 35 
                ? r.cmdDesc.slice(0, 35) + '...' : (r.cmdDesc || 'Commodity');

            return `
                <tr>
                    <td><strong>${r.period}</strong></td>
                    <td>${r.reporterDesc} <small>(${r.reporterISO})</small></td>
                    <td>${r.partnerDesc} <small>(${r.partnerISO})</small></td>
                    <td>${flowBadge}</td>
                    <td><code>HS ${r.cmdCode || 'N/A'}</code></td>
                    <td title="${r.cmdDesc}">${shortDesc}</td>
                    <td class="text-right">${(r.netWgt || 0).toLocaleString('en-US')} kg</td>
                    <td class="text-right">$${(r.tradeValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td class="text-right"><strong>$${ratio}</strong></td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rowsHTML;
    }
}
