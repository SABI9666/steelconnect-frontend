// SteelConnect Analytics Portal - World-Class Premium Dashboard System
// View-only: Clients see approved dashboards only. Admin uploads & approves all data.

const analyticsState = {
    currentTab: 'overview',
    charts: {},
    dashboards: [],
    activeDashboard: null,
    loading: false,
    fullscreen: false
};

const CHART_COLORS = [
    { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', fill: 'rgba(99, 102, 241, 0.08)' },
    { bg: 'rgba(16, 185, 129, 0.15)', border: '#10b981', fill: 'rgba(16, 185, 129, 0.08)' },
    { bg: 'rgba(245, 158, 11, 0.15)', border: '#f59e0b', fill: 'rgba(245, 158, 11, 0.08)' },
    { bg: 'rgba(239, 68, 68, 0.15)', border: '#ef4444', fill: 'rgba(239, 68, 68, 0.08)' },
    { bg: 'rgba(139, 92, 246, 0.15)', border: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.08)' },
    { bg: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4', fill: 'rgba(6, 182, 212, 0.08)' },
    { bg: 'rgba(236, 72, 153, 0.15)', border: '#ec4899', fill: 'rgba(236, 72, 153, 0.08)' },
    { bg: 'rgba(34, 197, 94, 0.15)', border: '#22c55e', fill: 'rgba(34, 197, 94, 0.08)' }
];

const CHART_SOLIDS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#22c55e'];

let originalRenderAppSection = null;
let originalBuildSidebarNav = null;

function initializeAnalyticsIntegration() {
    if (typeof window.renderAppSection === 'function') originalRenderAppSection = window.renderAppSection;
    if (typeof window.buildSidebarNav === 'function') originalBuildSidebarNav = window.buildSidebarNav;
    window.renderAppSection = renderAppSectionWithAnalytics;
    window.buildSidebarNav = buildSidebarNavWithAnalytics;
    window.switchAnalyticsDashboard = switchAnalyticsDashboard;
    window.refreshAnalyticsDashboards = refreshAnalyticsDashboards;
    window.toggleFullscreenChart = toggleFullscreenChart;
    window.exportChartImage = exportChartImage;
    addAnalyticsStyles();
}

function buildSidebarNavWithAnalytics() {
    const nav = document.getElementById('sidebar-nav-menu');
    if (!nav || !window.appState || !window.appState.currentUser) return;
    const role = window.appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;
    if (role === 'designer') {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
            <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
            <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a>
            <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
            <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Estimation</span></a>
            <a href="#" class="sidebar-nav-link" data-section="my-estimations"><i class="fas fa-file-invoice fa-fw"></i><span>My Estimations</span></a>
            <hr class="sidebar-divider">
            <div class="sidebar-section-title">Business Intelligence</div>
            <a href="#" class="sidebar-nav-link analytics-nav-link" data-section="ai-analytics">
                <i class="fas fa-chart-bar fa-fw"></i><span>Analytics Dashboard</span><div class="nav-badge" style="background:linear-gradient(135deg,#6366f1,#8b5cf6)">PRO</div>
            </a>`;
    }
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>
        <hr class="sidebar-divider">
        <a href="#" class="sidebar-nav-link" data-section="community-feed"><i class="fas fa-newspaper fa-fw"></i><span>Community</span></a>
        <a href="#" class="sidebar-nav-link" data-section="support"><i class="fas fa-life-ring fa-fw"></i><span>Support</span></a>
        <a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
    nav.innerHTML = links;
    nav.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); renderAppSectionWithAnalytics(link.dataset.section); });
    });
}

function renderAppSectionWithAnalytics(sectionId) {
    if (sectionId === 'ai-analytics' || sectionId === 'business-analytics') {
        renderAnalyticsDashboard();
        document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === 'ai-analytics'));
        return;
    }
    if (originalRenderAppSection) originalRenderAppSection(sectionId);
}

// ===== MAIN DASHBOARD RENDER =====
async function renderAnalyticsDashboard() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
    <div class="ad-portal">
        <div class="ad-loading-screen">
            <div class="ad-loading-orb">
                <div class="ad-orb-ring"></div>
                <div class="ad-orb-ring"></div>
                <div class="ad-orb-ring"></div>
                <i class="fas fa-chart-bar ad-orb-icon"></i>
            </div>
            <h3>Loading Analytics Dashboard</h3>
            <p>Preparing your business intelligence reports...</p>
            <div class="ad-loading-bar"><div class="ad-loading-fill"></div></div>
        </div>
    </div>`;
    await fetchDashboards();
    container.innerHTML = getDashboardHTML();
    initializeDashboardCharts();
}

async function fetchDashboards() {
    try {
        analyticsState.loading = true;
        const response = await window.apiCall('/analysis/dashboards', 'GET');
        analyticsState.dashboards = response.dashboards || [];
        if (analyticsState.dashboards.length > 0 && !analyticsState.activeDashboard) {
            analyticsState.activeDashboard = analyticsState.dashboards[0];
        }
    } catch (error) {
        console.error('Failed to fetch dashboards:', error);
        analyticsState.dashboards = [];
    } finally {
        analyticsState.loading = false;
    }
}

async function refreshAnalyticsDashboards() {
    analyticsState.activeDashboard = null;
    await renderAnalyticsDashboard();
    if (typeof showNotification === 'function') showNotification('Dashboards refreshed', 'success');
}

function switchAnalyticsDashboard(index) {
    analyticsState.activeDashboard = analyticsState.dashboards[index];
    Object.values(analyticsState.charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    analyticsState.charts = {};
    const container = document.getElementById('app-container');
    container.innerHTML = getDashboardHTML();
    initializeDashboardCharts();
}

function getDashboardHTML() {
    const db = analyticsState.activeDashboard;
    const hasDashboards = analyticsState.dashboards.length > 0;
    const totalDashboards = analyticsState.dashboards.length;

    // Dashboard selector tabs
    let selectorHTML = '';
    if (totalDashboards > 1) {
        selectorHTML = `<div class="ad-db-selector">${analyticsState.dashboards.map((d, i) =>
            `<button class="ad-db-tab ${d._id === (db && db._id) ? 'active' : ''}" onclick="switchAnalyticsDashboard(${i})">
                <i class="fas fa-chart-pie"></i> ${d.title || 'Dashboard ' + (i+1)}
            </button>`
        ).join('')}</div>`;
    }

    if (!hasDashboards) {
        return `
        <div class="ad-portal">
            ${getHeaderHTML()}
            <div class="ad-empty-state">
                <div class="ad-empty-visual">
                    <div class="ad-empty-circle">
                        <div class="ad-empty-pulse"></div>
                        <i class="fas fa-chart-area"></i>
                    </div>
                </div>
                <h2>No Dashboards Available Yet</h2>
                <p>Your business analytics dashboards will appear here once your admin team prepares and approves them. You'll be notified when they're ready.</p>
                <div class="ad-empty-features">
                    <div class="ad-empty-feature">
                        <i class="fas fa-shield-alt"></i>
                        <span>Admin-managed data</span>
                    </div>
                    <div class="ad-empty-feature">
                        <i class="fas fa-chart-line"></i>
                        <span>Auto-generated charts</span>
                    </div>
                    <div class="ad-empty-feature">
                        <i class="fas fa-bell"></i>
                        <span>Instant notifications</span>
                    </div>
                </div>
                <button class="ad-btn-refresh-main" onclick="refreshAnalyticsDashboards()"><i class="fas fa-sync-alt"></i> Check for Updates</button>
            </div>
        </div>`;
    }

    // Build KPI cards from all charts
    let allKpis = [];
    (db.charts || []).forEach(chart => {
        if (chart.kpis) allKpis = allKpis.concat(chart.kpis);
    });
    const topKpis = allKpis.slice(0, 8);

    const kpisHTML = topKpis.map((kpi, i) => {
        const color = CHART_SOLIDS[i % CHART_SOLIDS.length];
        const trendUp = kpi.trend >= 0;
        const sparkData = generateSparklineData(kpi.trend);
        return `
        <div class="ad-kpi-card" style="--kpi-accent: ${color}; animation-delay: ${i * 0.08}s">
            <div class="ad-kpi-header">
                <div class="ad-kpi-icon-wrap" style="background: ${CHART_COLORS[i % CHART_COLORS.length].bg}; color: ${color}">
                    <i class="fas ${getKpiIcon(kpi.label)}"></i>
                </div>
                <div class="ad-kpi-trend-badge ${trendUp ? 'up' : 'down'}">
                    <i class="fas fa-arrow-${trendUp ? 'up' : 'down'}"></i>
                    <span>${Math.abs(kpi.trend).toFixed(1)}%</span>
                </div>
            </div>
            <div class="ad-kpi-body">
                <div class="ad-kpi-number">${formatKpiValue(kpi.total)}</div>
                <div class="ad-kpi-title">${kpi.label}</div>
            </div>
            <div class="ad-kpi-footer">
                <div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Avg</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.avg)}</span></div>
                <div class="ad-kpi-divider"></div>
                <div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Max</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.max)}</span></div>
                ${kpi.min !== undefined ? `<div class="ad-kpi-divider"></div><div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Min</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.min)}</span></div>` : ''}
            </div>
            <div class="ad-kpi-glow" style="background: ${color}"></div>
        </div>`;
    }).join('');

    // Build chart cards
    const chartsHTML = (db.charts || []).map((chart, idx) => {
        const chartId = `ad-chart-${idx}`;
        return `
        <div class="ad-chart-card" style="animation-delay: ${(topKpis.length * 0.08 + idx * 0.1)}s">
            <div class="ad-chart-header">
                <div class="ad-chart-title-area">
                    <h3>${chart.customTitle || chart.sheetName}</h3>
                    <div class="ad-chart-badges">
                        <span class="ad-chart-badge"><i class="fas fa-table"></i> ${chart.rowCount} records</span>
                        <span class="ad-chart-badge"><i class="fas fa-columns"></i> ${chart.dataColumns.length} metrics</span>
                    </div>
                </div>
                <div class="ad-chart-actions">
                    <select class="ad-chart-type-select" onchange="changeChartType(${idx}, this.value)">
                        <option value="line" ${chart.chartType === 'line' ? 'selected' : ''}>Line Chart</option>
                        <option value="bar" ${chart.chartType === 'bar' ? 'selected' : ''}>Bar Chart</option>
                        <option value="doughnut" ${chart.chartType === 'doughnut' ? 'selected' : ''}>Doughnut</option>
                        <option value="radar" ${chart.chartType === 'radar' ? 'selected' : ''}>Radar</option>
                        <option value="polarArea" ${chart.chartType === 'polarArea' ? 'selected' : ''}>Polar Area</option>
                    </select>
                    <button class="ad-chart-action-btn" onclick="toggleFullscreenChart(${idx})" title="Fullscreen">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="ad-chart-action-btn" onclick="exportChartImage(${idx})" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                </div>
            </div>
            <div class="ad-chart-body">
                <canvas id="${chartId}"></canvas>
            </div>
        </div>`;
    }).join('');

    // Data table preview
    const firstChart = db.charts && db.charts[0];
    let tableHTML = '';
    if (firstChart) {
        const maxRows = Math.min(firstChart.labels.length, 20);
        tableHTML = `
        <div class="ad-data-panel" style="animation-delay: ${(topKpis.length * 0.08 + (db.charts || []).length * 0.1 + 0.1)}s">
            <div class="ad-data-header">
                <div class="ad-data-title">
                    <i class="fas fa-database"></i>
                    <h3>Data Preview</h3>
                    <span class="ad-data-sheet-name">${firstChart.sheetName}</span>
                </div>
                <div class="ad-data-meta">
                    <span class="ad-data-count"><i class="fas fa-list-ol"></i> ${firstChart.rowCount} total rows</span>
                </div>
            </div>
            <div class="ad-table-container">
                <table class="ad-premium-table">
                    <thead><tr>
                        <th class="ad-th-index">#</th>
                        <th class="ad-th-label">${firstChart.labelColumn}</th>
                        ${firstChart.dataColumns.map(c => `<th class="ad-th-value">${c}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                        ${firstChart.labels.slice(0, maxRows).map((label, ri) => `
                            <tr class="ad-tr-animate" style="animation-delay: ${ri * 0.02}s">
                                <td class="ad-td-index">${ri + 1}</td>
                                <td class="ad-td-label">${label}</td>
                                ${firstChart.datasets.map(ds => `<td class="ad-td-value">${formatKpiValue(ds.data[ri])}</td>`).join('')}
                            </tr>
                        `).join('')}
                        ${firstChart.rowCount > maxRows ? `<tr><td colspan="${firstChart.dataColumns.length + 2}" class="ad-td-more"><i class="fas fa-ellipsis-h"></i> ${firstChart.rowCount - maxRows} more rows</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    // Summary section
    const totalCharts = (db.charts || []).length;
    const totalRecords = (db.charts || []).reduce((sum, c) => sum + (c.rowCount || 0), 0);

    return `
    <div class="ad-portal">
        ${getHeaderHTML()}
        ${selectorHTML}
        <div class="ad-content">
            <div class="ad-dashboard-bar">
                <div class="ad-dashboard-info">
                    <div class="ad-dashboard-icon"><i class="fas fa-chart-bar"></i></div>
                    <div>
                        <h2>${db.title || 'Dashboard'}</h2>
                        ${db.description ? `<p class="ad-dashboard-desc">${db.description}</p>` : ''}
                    </div>
                </div>
                <div class="ad-dashboard-meta-pills">
                    <div class="ad-meta-pill frequency"><i class="fas fa-sync-alt"></i> ${(db.frequency || 'daily').charAt(0).toUpperCase() + (db.frequency || 'daily').slice(1)}</div>
                    <div class="ad-meta-pill date"><i class="fas fa-calendar-check"></i> ${new Date(db.approvedAt || db.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    <div class="ad-meta-pill charts"><i class="fas fa-chart-pie"></i> ${totalCharts} Charts</div>
                    <div class="ad-meta-pill records"><i class="fas fa-database"></i> ${formatKpiValue(totalRecords)} Records</div>
                </div>
            </div>
            ${topKpis.length > 0 ? `<div class="ad-kpi-grid">${kpisHTML}</div>` : ''}
            <div class="ad-charts-grid">${chartsHTML}</div>
            ${tableHTML}
            <div class="ad-footer-note">
                <i class="fas fa-shield-alt"></i> Data managed and approved by your admin team. Dashboard updates automatically with new approved data.
            </div>
        </div>
    </div>`;
}

function getHeaderHTML() {
    const count = analyticsState.dashboards.length;
    return `
    <div class="ad-hero-header">
        <div class="ad-hero-bg">
            <div class="ad-hero-gradient"></div>
            <div class="ad-hero-pattern"></div>
            <div class="ad-hero-orb ad-hero-orb-1"></div>
            <div class="ad-hero-orb ad-hero-orb-2"></div>
            <div class="ad-hero-orb ad-hero-orb-3"></div>
        </div>
        <div class="ad-hero-content">
            <div class="ad-hero-left">
                <div class="ad-hero-icon-box">
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="ad-hero-text">
                    <h1>Analytics Dashboard</h1>
                    <p>Real-time business intelligence &middot; ${count} report${count !== 1 ? 's' : ''} available</p>
                </div>
            </div>
            <div class="ad-hero-right">
                <button class="ad-hero-btn" onclick="refreshAnalyticsDashboards()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>
        </div>
    </div>`;
}

function generateSparklineData(trend) {
    const points = [];
    let val = 50;
    for (let i = 0; i < 8; i++) {
        val += (trend >= 0 ? 1 : -1) * (Math.random() * 10 - 3);
        points.push(Math.max(10, Math.min(90, val)));
    }
    return points;
}

function getKpiIcon(label) {
    const l = label.toLowerCase();
    if (l.includes('revenue') || l.includes('sales') || l.includes('amount') || l.includes('price') || l.includes('cost') || l.includes('profit')) return 'fa-dollar-sign';
    if (l.includes('production') || l.includes('output') || l.includes('quantity') || l.includes('qty') || l.includes('manufactured')) return 'fa-industry';
    if (l.includes('client') || l.includes('customer') || l.includes('user') || l.includes('employee')) return 'fa-users';
    if (l.includes('order') || l.includes('project') || l.includes('task')) return 'fa-clipboard-list';
    if (l.includes('weight') || l.includes('ton') || l.includes('kg')) return 'fa-weight-hanging';
    if (l.includes('rate') || l.includes('percent') || l.includes('efficiency') || l.includes('yield')) return 'fa-percentage';
    if (l.includes('time') || l.includes('hour') || l.includes('duration') || l.includes('days')) return 'fa-clock';
    if (l.includes('delivery') || l.includes('ship') || l.includes('dispatch')) return 'fa-truck';
    if (l.includes('inventory') || l.includes('stock') || l.includes('warehouse')) return 'fa-warehouse';
    if (l.includes('growth') || l.includes('increase')) return 'fa-arrow-trend-up';
    return 'fa-chart-line';
}

function formatKpiValue(val) {
    if (val === null || val === undefined) return '0';
    const num = parseFloat(val);
    if (isNaN(num)) return String(val);
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1) + 'K';
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(2);
}

// ===== CHART ACTIONS =====
function toggleFullscreenChart(idx) {
    const card = document.querySelectorAll('.ad-chart-card')[idx];
    if (!card) return;
    card.classList.toggle('ad-fullscreen');
    const icon = card.querySelector('.ad-chart-action-btn i.fa-expand, .ad-chart-action-btn i.fa-compress');
    if (icon) icon.className = card.classList.contains('ad-fullscreen') ? 'fas fa-compress' : 'fas fa-expand';
    // Resize chart
    setTimeout(() => {
        if (analyticsState.charts[idx]) analyticsState.charts[idx].resize();
    }, 300);
}

function exportChartImage(idx) {
    const canvas = document.getElementById(`ad-chart-${idx}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `chart-${idx + 1}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    if (typeof showNotification === 'function') showNotification('Chart exported as image', 'success');
}

// ===== CHART RENDERING =====
function initializeDashboardCharts() {
    if (typeof Chart === 'undefined' || !analyticsState.activeDashboard) return;
    const db = analyticsState.activeDashboard;
    (db.charts || []).forEach((chart, idx) => {
        const canvasId = `ad-chart-${idx}`;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        createChart(ctx, chart, idx);
    });
}

function createChart(ctx, chartConfig, idx) {
    const isCircular = ['doughnut', 'pie', 'polarArea'].includes(chartConfig.chartType);
    const datasets = chartConfig.datasets.map((ds, di) => {
        const color = CHART_COLORS[di % CHART_COLORS.length];
        if (isCircular) {
            return {
                label: ds.label,
                data: ds.data,
                backgroundColor: ds.data.map((_, i) => CHART_SOLIDS[i % CHART_SOLIDS.length] + 'DD'),
                hoverBackgroundColor: ds.data.map((_, i) => CHART_SOLIDS[i % CHART_SOLIDS.length]),
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 8
            };
        }
        return {
            label: ds.label,
            data: ds.data,
            borderColor: color.border,
            backgroundColor: chartConfig.chartType === 'bar' ? color.border + 'CC' : color.fill,
            borderWidth: chartConfig.chartType === 'line' ? 3 : 1,
            tension: 0.4,
            fill: chartConfig.chartType === 'line',
            pointBackgroundColor: color.border,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: chartConfig.chartType === 'line' ? 5 : 0,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderWidth: 3,
            pointHoverBorderColor: color.border,
            borderRadius: chartConfig.chartType === 'bar' ? 8 : 0,
            barPercentage: 0.7,
            categoryPercentage: 0.8
        };
    });

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                display: true,
                position: isCircular ? 'right' : 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12, weight: '600', family: "'Inter', 'Segoe UI', sans-serif" }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleFont: { size: 14, weight: '700', family: "'Inter', sans-serif" },
                bodyFont: { size: 13, family: "'Inter', sans-serif" },
                padding: 16,
                cornerRadius: 12,
                displayColors: true,
                usePointStyle: true,
                boxPadding: 6,
                callbacks: {
                    label: (ctx2) => ` ${ctx2.dataset.label}: ${formatKpiValue(ctx2.parsed.y !== undefined ? ctx2.parsed.y : ctx2.parsed)}`
                }
            }
        }
    };

    if (!isCircular) {
        options.scales = {
            x: {
                grid: { display: false },
                ticks: { font: { size: 11, weight: '500' }, maxRotation: 45, color: '#64748b' },
                border: { display: false }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
                ticks: { font: { size: 11, weight: '500' }, callback: v => formatKpiValue(v), color: '#64748b', padding: 8 },
                border: { display: false }
            }
        };
    }

    if (analyticsState.charts[idx]) { analyticsState.charts[idx].destroy(); }

    analyticsState.charts[idx] = new Chart(ctx, {
        type: chartConfig.chartType,
        data: { labels: chartConfig.labels, datasets },
        options
    });
}

window.changeChartType = function(idx, newType) {
    const db = analyticsState.activeDashboard;
    if (!db || !db.charts[idx]) return;
    db.charts[idx].chartType = newType;
    const ctx = document.getElementById(`ad-chart-${idx}`);
    if (ctx) createChart(ctx, db.charts[idx], idx);
};

// ===== WORLD-CLASS PREMIUM CSS =====
function addAnalyticsStyles() {
    if (document.head.querySelector('#analytics-styles')) return;
    const style = document.createElement('style');
    style.id = 'analytics-styles';
    style.textContent = `
/* ===== STEELCONNECT ANALYTICS - WORLD-CLASS PREMIUM UI ===== */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.ad-portal {
    background: linear-gradient(165deg, #f0f2ff 0%, #f8fafc 30%, #faf5ff 60%, #f0fdfa 100%);
    min-height: 100vh;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ===== LOADING SCREEN ===== */
.ad-loading-screen {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 70vh; gap: 24px; text-align: center;
}
.ad-loading-orb {
    position: relative; width: 100px; height: 100px;
    display: flex; align-items: center; justify-content: center;
}
.ad-orb-ring {
    position: absolute; inset: 0; border: 3px solid transparent;
    border-top-color: #6366f1; border-radius: 50%;
    animation: adOrbSpin 1.5s cubic-bezier(.5,.15,.5,.85) infinite;
}
.ad-orb-ring:nth-child(2) { inset: 8px; border-top-color: #8b5cf6; animation-delay: -.5s; animation-duration: 2s; }
.ad-orb-ring:nth-child(3) { inset: 16px; border-top-color: #a78bfa; animation-delay: -1s; animation-duration: 2.5s; }
.ad-orb-icon { position: relative; z-index: 1; font-size: 1.5rem; color: #6366f1; }
@keyframes adOrbSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.ad-loading-screen h3 { font-size: 1.3rem; font-weight: 800; color: #1e293b; margin: 0; }
.ad-loading-screen p { color: #64748b; font-size: .95rem; margin: 0; }
.ad-loading-bar { width: 200px; height: 4px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
.ad-loading-fill { width: 40%; height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6, #6366f1);
    background-size: 200% 100%; border-radius: 4px; animation: adLoadSlide 1.5s ease infinite; }
@keyframes adLoadSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }

/* ===== HERO HEADER ===== */
.ad-hero-header {
    position: relative; padding: 48px 40px 44px; overflow: hidden;
    border-radius: 0 0 32px 32px;
}
.ad-hero-bg {
    position: absolute; inset: 0;
}
.ad-hero-gradient {
    position: absolute; inset: 0;
    background: linear-gradient(135deg, #0f0a2e 0%, #1e1b4b 20%, #312e81 45%, #4338ca 70%, #6366f1 100%);
}
.ad-hero-pattern {
    position: absolute; inset: 0; opacity: 0.06;
    background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0);
    background-size: 24px 24px;
}
.ad-hero-orb {
    position: absolute; border-radius: 50%; filter: blur(60px);
}
.ad-hero-orb-1 { width: 300px; height: 300px; background: rgba(139,92,246,.35); top: -80px; right: -40px; animation: adOrbFloat 8s ease-in-out infinite; }
.ad-hero-orb-2 { width: 200px; height: 200px; background: rgba(99,102,241,.25); bottom: -60px; left: 10%; animation: adOrbFloat 10s ease-in-out infinite reverse; }
.ad-hero-orb-3 { width: 150px; height: 150px; background: rgba(6,182,212,.2); top: 20%; right: 30%; animation: adOrbFloat 12s ease-in-out infinite; }
@keyframes adOrbFloat { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,-20px) scale(1.1); } }

.ad-hero-content {
    position: relative; z-index: 1; display: flex; justify-content: space-between;
    align-items: center; flex-wrap: wrap; gap: 20px; max-width: 1400px; margin: 0 auto;
}
.ad-hero-left { display: flex; align-items: center; gap: 20px; }
.ad-hero-icon-box {
    width: 60px; height: 60px; background: rgba(255,255,255,.12); backdrop-filter: blur(16px);
    border-radius: 18px; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 1.6rem; border: 1px solid rgba(255,255,255,.18);
    box-shadow: 0 8px 32px rgba(0,0,0,.15);
}
.ad-hero-text h1 {
    color: #fff; font-size: 2rem; font-weight: 900; margin: 0;
    letter-spacing: -.03em; line-height: 1.1;
}
.ad-hero-text p { color: rgba(255,255,255,.6); margin: 6px 0 0; font-size: .92rem; font-weight: 500; }
.ad-hero-btn {
    background: rgba(255,255,255,.12); backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,.2); color: #fff; padding: 12px 24px;
    border-radius: 14px; font-weight: 600; cursor: pointer; transition: all .3s;
    display: flex; align-items: center; gap: 8px; font-size: .9rem;
}
.ad-hero-btn:hover { background: rgba(255,255,255,.22); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.2); }

/* ===== EMPTY STATE ===== */
.ad-empty-state {
    text-align: center; padding: 80px 40px 100px;
    animation: adFadeUp .6s ease-out;
}
.ad-empty-visual { margin-bottom: 32px; }
.ad-empty-circle {
    position: relative; width: 120px; height: 120px; margin: 0 auto;
    background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.08));
    border-radius: 32px; display: flex; align-items: center; justify-content: center;
    font-size: 3rem; color: #6366f1;
}
.ad-empty-pulse {
    position: absolute; inset: -8px; border-radius: 36px;
    border: 2px solid rgba(99,102,241,.15);
    animation: adPulse 2s ease-in-out infinite;
}
@keyframes adPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: .5; } }
.ad-empty-state h2 { font-size: 1.7rem; font-weight: 800; color: #1e293b; margin: 0 0 12px; }
.ad-empty-state p { color: #64748b; font-size: 1rem; max-width: 500px; margin: 0 auto 32px; line-height: 1.7; }
.ad-empty-features { display: flex; justify-content: center; gap: 32px; margin-bottom: 36px; flex-wrap: wrap; }
.ad-empty-feature {
    display: flex; align-items: center; gap: 8px; color: #475569; font-size: .88rem; font-weight: 600;
}
.ad-empty-feature i { color: #6366f1; font-size: 1rem; }
.ad-btn-refresh-main {
    background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; border: none;
    padding: 14px 32px; border-radius: 14px; font-weight: 700; cursor: pointer;
    font-size: .95rem; display: inline-flex; align-items: center; gap: 10px;
    transition: all .3s; box-shadow: 0 4px 20px rgba(99,102,241,.35);
}
.ad-btn-refresh-main:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(99,102,241,.45); }

/* ===== DASHBOARD SELECTOR TABS ===== */
.ad-db-selector {
    display: flex; gap: 6px; padding: 0 40px; margin-top: -20px;
    position: relative; z-index: 2; flex-wrap: wrap;
}
.ad-db-tab {
    background: rgba(255,255,255,.8); backdrop-filter: blur(12px);
    border: 1px solid rgba(0,0,0,.06); padding: 12px 22px;
    border-radius: 14px 14px 0 0; font-weight: 600; color: #64748b;
    cursor: pointer; transition: all .3s; display: flex; align-items: center;
    gap: 8px; font-size: .88rem;
}
.ad-db-tab.active {
    background: #fff; color: #6366f1; border-bottom-color: transparent;
    box-shadow: 0 -4px 20px rgba(99,102,241,.12);
}
.ad-db-tab:hover:not(.active) { color: #1e293b; background: rgba(255,255,255,.95); }

/* ===== CONTENT AREA ===== */
.ad-content { padding: 32px 40px 60px; max-width: 1400px; margin: 0 auto; }

/* ===== DASHBOARD BAR ===== */
.ad-dashboard-bar {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 32px; flex-wrap: wrap; gap: 16px;
    animation: adFadeUp .5s ease-out;
}
.ad-dashboard-info { display: flex; align-items: center; gap: 16px; }
.ad-dashboard-icon {
    width: 52px; height: 52px; background: linear-gradient(135deg, #6366f1, #8b5cf6);
    border-radius: 16px; display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 1.3rem; box-shadow: 0 4px 16px rgba(99,102,241,.3);
}
.ad-dashboard-info h2 { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -.02em; }
.ad-dashboard-desc { color: #64748b; margin: 4px 0 0; font-size: .9rem; }
.ad-dashboard-meta-pills { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ad-meta-pill {
    display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px;
    border-radius: 10px; font-size: .8rem; font-weight: 600;
    background: #fff; border: 1px solid rgba(0,0,0,.06);
    box-shadow: 0 1px 3px rgba(0,0,0,.04);
}
.ad-meta-pill.frequency { color: #6366f1; }
.ad-meta-pill.date { color: #059669; }
.ad-meta-pill.charts { color: #8b5cf6; }
.ad-meta-pill.records { color: #f59e0b; }
.ad-meta-pill i { font-size: .75rem; }

/* ===== KPI CARDS ===== */
.ad-kpi-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 18px; margin-bottom: 32px;
}
.ad-kpi-card {
    background: #fff; border-radius: 20px; padding: 24px; position: relative;
    overflow: hidden; border: 1px solid rgba(0,0,0,.04);
    box-shadow: 0 1px 3px rgba(0,0,0,.03), 0 4px 20px rgba(0,0,0,.04);
    transition: all .4s cubic-bezier(.4,0,.2,1);
    animation: adFadeUp .5s ease-out backwards;
}
.ad-kpi-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 12px 40px rgba(0,0,0,.1);
}
.ad-kpi-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--kpi-accent);
    border-radius: 3px 3px 0 0;
}
.ad-kpi-glow {
    position: absolute; top: -40px; right: -40px; width: 100px; height: 100px;
    border-radius: 50%; opacity: .06; filter: blur(20px); pointer-events: none;
}
.ad-kpi-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.ad-kpi-icon-wrap {
    width: 48px; height: 48px; border-radius: 14px;
    display: flex; align-items: center; justify-content: center; font-size: 1.15rem;
}
.ad-kpi-trend-badge {
    display: flex; align-items: center; gap: 4px; font-size: .78rem;
    font-weight: 700; padding: 5px 12px; border-radius: 20px;
}
.ad-kpi-trend-badge.up { color: #059669; background: rgba(16,185,129,.1); }
.ad-kpi-trend-badge.down { color: #dc2626; background: rgba(239,68,68,.1); }
.ad-kpi-body { margin-bottom: 14px; }
.ad-kpi-number {
    font-size: 2.2rem; font-weight: 900; color: #0f172a;
    line-height: 1.1; letter-spacing: -.03em;
}
.ad-kpi-title {
    color: #64748b; font-weight: 600; font-size: .85rem;
    margin-top: 4px; text-transform: capitalize;
}
.ad-kpi-footer {
    display: flex; align-items: center; gap: 12px;
    padding-top: 14px; border-top: 1px solid #f1f5f9;
}
.ad-kpi-stat { display: flex; flex-direction: column; gap: 2px; }
.ad-kpi-stat-label { font-size: .7rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
.ad-kpi-stat-val { font-size: .85rem; color: #334155; font-weight: 700; }
.ad-kpi-divider { width: 1px; height: 28px; background: #e2e8f0; }

/* ===== CHART CARDS ===== */
.ad-charts-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 24px; margin-bottom: 32px;
}
.ad-chart-card {
    background: #fff; border-radius: 22px; overflow: hidden;
    border: 1px solid rgba(0,0,0,.04);
    box-shadow: 0 1px 3px rgba(0,0,0,.03), 0 4px 20px rgba(0,0,0,.04);
    transition: all .4s cubic-bezier(.4,0,.2,1);
    animation: adFadeUp .5s ease-out backwards;
}
.ad-chart-card:hover { box-shadow: 0 12px 40px rgba(0,0,0,.1); }
.ad-chart-card.ad-fullscreen {
    position: fixed; inset: 20px; z-index: 9999;
    border-radius: 24px; box-shadow: 0 24px 80px rgba(0,0,0,.3);
}
.ad-chart-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 24px 28px 0; flex-wrap: wrap; gap: 12px;
}
.ad-chart-title-area h3 { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0; }
.ad-chart-badges { display: flex; gap: 8px; margin-top: 6px; }
.ad-chart-badge {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: .75rem; color: #94a3b8; font-weight: 500;
}
.ad-chart-badge i { font-size: .65rem; }
.ad-chart-actions { display: flex; gap: 6px; align-items: center; }
.ad-chart-type-select {
    padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px;
    font-size: .82rem; font-weight: 600; color: #475569;
    background: #f8fafc; cursor: pointer; outline: none; transition: all .2s;
}
.ad-chart-type-select:hover { border-color: #6366f1; }
.ad-chart-type-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
.ad-chart-action-btn {
    width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0;
    background: #f8fafc; color: #64748b; cursor: pointer; transition: all .2s;
    display: flex; align-items: center; justify-content: center; font-size: .85rem;
}
.ad-chart-action-btn:hover { background: #6366f1; color: #fff; border-color: #6366f1; }
.ad-chart-body {
    padding: 20px 28px 24px; height: 360px; position: relative;
}
.ad-chart-card.ad-fullscreen .ad-chart-body { height: calc(100% - 80px); }

/* ===== DATA TABLE ===== */
.ad-data-panel {
    background: #fff; border-radius: 22px; overflow: hidden;
    border: 1px solid rgba(0,0,0,.04);
    box-shadow: 0 1px 3px rgba(0,0,0,.03), 0 4px 20px rgba(0,0,0,.04);
    animation: adFadeUp .5s ease-out backwards;
}
.ad-data-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 22px 28px; border-bottom: 1px solid #f1f5f9;
}
.ad-data-title {
    display: flex; align-items: center; gap: 12px;
}
.ad-data-title i { color: #6366f1; font-size: 1.1rem; }
.ad-data-title h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }
.ad-data-sheet-name {
    background: linear-gradient(135deg, rgba(99,102,241,.08), rgba(139,92,246,.08));
    color: #6366f1; padding: 4px 12px; border-radius: 8px;
    font-size: .78rem; font-weight: 700;
}
.ad-data-count {
    display: flex; align-items: center; gap: 6px;
    color: #64748b; font-size: .85rem; font-weight: 600;
}
.ad-data-count i { font-size: .75rem; }
.ad-table-container { overflow-x: auto; max-height: 500px; overflow-y: auto; }
.ad-premium-table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.ad-premium-table thead { position: sticky; top: 0; z-index: 1; }
.ad-premium-table thead th {
    background: #f8fafc; padding: 14px 18px; text-align: left;
    font-weight: 700; color: #475569; font-size: .78rem;
    text-transform: uppercase; letter-spacing: .05em;
    border-bottom: 2px solid #e2e8f0;
}
.ad-th-index { width: 50px; text-align: center; }
.ad-th-value { text-align: right; }
.ad-premium-table tbody tr { transition: background .15s; }
.ad-premium-table tbody tr:hover { background: #f8fafc; }
.ad-premium-table tbody td { padding: 13px 18px; border-bottom: 1px solid #f1f5f9; color: #334155; }
.ad-td-index { text-align: center; color: #94a3b8; font-weight: 500; font-size: .8rem; }
.ad-td-label { font-weight: 600; color: #1e293b; }
.ad-td-value { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; color: #334155; }
.ad-td-more { text-align: center; color: #94a3b8; font-style: italic; padding: 16px; font-size: .85rem; }
.ad-tr-animate { animation: adFadeIn .3s ease-out backwards; }

/* ===== FOOTER NOTE ===== */
.ad-footer-note {
    text-align: center; padding: 32px 20px; color: #94a3b8; font-size: .82rem;
    font-weight: 500; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.ad-footer-note i { color: #6366f1; }

/* ===== ANIMATIONS ===== */
@keyframes adFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes adFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
    .ad-charts-grid { grid-template-columns: 1fr; }
    .ad-kpi-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
}
@media (max-width: 768px) {
    .ad-hero-header { padding: 32px 20px 36px; border-radius: 0 0 24px 24px; }
    .ad-hero-text h1 { font-size: 1.5rem; }
    .ad-content { padding: 24px 16px 48px; }
    .ad-kpi-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .ad-kpi-card { padding: 18px; }
    .ad-kpi-number { font-size: 1.7rem; }
    .ad-chart-body { height: 280px; }
    .ad-db-selector { padding: 0 16px; }
    .ad-dashboard-bar { flex-direction: column; }
    .ad-chart-header { padding: 18px 20px 0; }
    .ad-chart-body { padding: 16px 20px 20px; }
    .ad-data-header { padding: 18px 20px; flex-direction: column; gap: 8px; align-items: flex-start; }
}
@media (max-width: 480px) {
    .ad-kpi-grid { grid-template-columns: 1fr 1fr; }
    .ad-hero-left { flex-direction: column; align-items: flex-start; gap: 12px; }
    .ad-hero-icon-box { width: 48px; height: 48px; font-size: 1.2rem; }
    .ad-dashboard-meta-pills { gap: 6px; }
    .ad-meta-pill { padding: 6px 10px; font-size: .75rem; }
}
`;
    document.head.appendChild(style);
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function retry() {
        if (typeof window.appState !== 'undefined' && typeof window.buildSidebarNav === 'function') {
            initializeAnalyticsIntegration();
            if (window.appState.currentUser && window.appState.currentUser.type === 'contractor') {
                buildSidebarNav();
            }
        } else {
            setTimeout(retry, 1000);
        }
    }, 500);
});

window.initializeAnalyticsIntegration = initializeAnalyticsIntegration;
