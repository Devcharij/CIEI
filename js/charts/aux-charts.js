/**
 * aux-charts.js
 * Secondary analytical charts powered by Chart.js.
 * Illustrates temporal EUE divergence (The Scissors Effect) and Value-Added Disparity.
 */
export class AuxiliaryCharts {
    constructor() {
        this.timeSeriesChart = null;
        this.downgradingChart = null;
    }

    renderTimeSeries(records) {
        const ctx = document.getElementById('timeseries-chart');
        if (!ctx) return;

        const yearlyData = {};
        records.forEach(r => {
            const yr = r.period;
            if (!yearlyData[yr]) {
                yearlyData[yr] = { expWeight: 0, expValue: 0, impWeight: 0, impValue: 0 };
            }
            if (r.flowCode === 'X') {
                yearlyData[yr].expWeight += (r.netWgt || 0);
                yearlyData[yr].expValue += (r.tradeValue || 0);
            } else if (r.flowCode === 'M') {
                yearlyData[yr].impWeight += (r.netWgt || 0);
                yearlyData[yr].impValue += (r.tradeValue || 0);
            }
        });

        const sortedYears = Object.keys(yearlyData).sort();
        const expWeights = sortedYears.map(y => (yearlyData[y].expWeight / 1000)); // Metric Tons
        const impValues = sortedYears.map(y => yearlyData[y].impValue); // USD

        if (this.timeSeriesChart) this.timeSeriesChart.destroy();

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#CBD5E1' : '#475569';
        const gridColor = isDarkMode ? '#334155' : '#E2E8F0';

        this.timeSeriesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedYears,
                datasets: [
                    {
                        label: 'Exported Physical Mass (Metric Tons / Gross Nature)',
                        data: expWeights,
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        yAxisID: 'yWeight',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Technological Import Expenditure (USD / Downgrading)',
                        data: impValues,
                        borderColor: '#D97706',
                        backgroundColor: 'transparent',
                        yAxisID: 'yValue',
                        tension: 0.3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: textColor }, grid: { color: gridColor } },
                    yWeight: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Extraction Volume (Tons)', color: '#059669' },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    yValue: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Monetary Expenditure (USD)', color: '#D97706' },
                        ticks: { color: textColor },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: { legend: { labels: { color: textColor, font: { family: 'Inter' } } } }
            }
        });
    }

    renderDowngradingChart(records) {
        const ctx = document.getElementById('downgrading-chart');
        if (!ctx) return;

        const cmdStats = {};
        records.forEach(r => {
            const code = `HS ${r.cmdCode}`;
            if (!cmdStats[code]) {
                cmdStats[code] = { wgt: 0, val: 0, desc: r.cmdDesc };
            }
            cmdStats[code].wgt += (r.netWgt || 0);
            cmdStats[code].val += (r.tradeValue || 0);
        });

        const labels = [];
        const unitValues = [];
        const colors = [];

        Object.entries(cmdStats).forEach(([code, data]) => {
            if (data.wgt > 0) {
                const ratio = (data.val / data.wgt);
                labels.push(`${code} (${data.desc.slice(0, 15)}...)`);
                unitValues.push(ratio.toFixed(2));
                colors.push(ratio > 50 ? '#E11D48' : (ratio > 10 ? '#D97706' : '#059669'));
            }
        });

        if (this.downgradingChart) this.downgradingChart.destroy();

        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDarkMode ? '#CBD5E1' : '#475569';
        const gridColor = isDarkMode ? '#334155' : '#E2E8F0';

        this.downgradingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Commodity Value-Added Ratio (USD per KG of physical mass)',
                    data: unitValues,
                    backgroundColor: colors,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: {
                        title: { display: true, text: 'Monetary-to-Physical Ratio ($ / kg)', color: textColor },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: { ticks: { color: textColor }, grid: { color: gridColor } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
}
