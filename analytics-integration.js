// SteelConnect Analytics Portal - Premium Dashboard System
// Reads real data from uploaded Google Sheets, renders world-class dashboards

const analyticsState = {
    currentTab: 'overview',
    charts: {},
    dashboards: [],
    activeDashboard: null,
    loading: false
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
                <i class="fas fa-chart-bar fa-fw"></i><span>Analytics Dashboard</span><div class="nav-badge">PRO</div>
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
    if (sectionId === 'ai-analytics') {
        renderAnalyticsDashboard();
        document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
        return;
    }
    if (originalRenderAppSection) originalRenderAppSection(sectionId);
}

// ===== MAIN DASHBOARD RENDER =====
async function renderAnalyticsDashboard() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="ad-loading"><div class="ad-loading-ring"><div></div><div></div><div></div></div><p>Loading Analytics Dashboard...</p></div>`;
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
    // Destroy old charts
    Object.values(analyticsState.charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    analyticsState.charts = {};
    const container = document.getElementById('app-container');
    container.innerHTML = getDashboardHTML();
    initializeDashboardCharts();
}

function getDashboardHTML() {
    const db = analyticsState.activeDashboard;
    const hasDashboards = analyticsState.dashboards.length > 0;

    // Dashboard selector tabs
    let selectorHTML = '';
    if (analyticsState.dashboards.length > 1) {
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
            <div class="ad-empty">
                <div class="ad-empty-icon"><i class="fas fa-chart-area"></i></div>
                <h2>No Dashboards Yet</h2>
                <p>Your analytics dashboards will appear here once your admin prepares and approves them from your uploaded Google Sheets data.</p>
                <button class="ad-btn-refresh" onclick="refreshAnalyticsDashboards()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
        </div>`;
    }

    // Build KPI cards from all charts
    let allKpis = [];
    (db.charts || []).forEach(chart => {
        if (chart.kpis) allKpis = allKpis.concat(chart.kpis);
    });
    const topKpis = allKpis.slice(0, 6);

    const kpisHTML = topKpis.map((kpi, i) => {
        const color = CHART_SOLIDS[i % CHART_SOLIDS.length];
        const trendUp = kpi.trend >= 0;
        return `
        <div class="ad-kpi" style="--kpi-color: ${color}">
            <div class="ad-kpi-top">
                <div class="ad-kpi-icon" style="background: ${CHART_COLORS[i % CHART_COLORS.length].bg}; color: ${color}">
                    <i class="fas ${getKpiIcon(kpi.label)}"></i>
                </div>
                <div class="ad-kpi-trend ${trendUp ? 'up' : 'down'}">
                    <i class="fas fa-arrow-${trendUp ? 'up' : 'down'}"></i> ${Math.abs(kpi.trend)}%
                </div>
            </div>
            <div class="ad-kpi-value">${formatKpiValue(kpi.total)}</div>
            <div class="ad-kpi-label">${kpi.label}</div>
            <div class="ad-kpi-meta">
                <span>Avg: ${formatKpiValue(kpi.avg)}</span>
                <span>Max: ${formatKpiValue(kpi.max)}</span>
            </div>
        </div>`;
    }).join('');

    // Build chart cards
    const chartsHTML = (db.charts || []).map((chart, idx) => {
        const chartId = `ad-chart-${idx}`;
        return `
        <div class="ad-chart-card">
            <div class="ad-chart-head">
                <div>
                    <h3>${chart.customTitle || chart.sheetName}</h3>
                    <span class="ad-chart-meta"><i class="fas fa-table"></i> ${chart.rowCount} records &middot; ${chart.dataColumns.length} metrics</span>
                </div>
                <div class="ad-chart-controls">
                    <select class="ad-chart-type-sel" onchange="changeChartType(${idx}, this.value)">
                        <option value="line" ${chart.chartType === 'line' ? 'selected' : ''}>Line</option>
                        <option value="bar" ${chart.chartType === 'bar' ? 'selected' : ''}>Bar</option>
                        <option value="doughnut" ${chart.chartType === 'doughnut' ? 'selected' : ''}>Doughnut</option>
                        <option value="radar" ${chart.chartType === 'radar' ? 'selected' : ''}>Radar</option>
                        <option value="polarArea" ${chart.chartType === 'polarArea' ? 'selected' : ''}>Polar</option>
                    </select>
                </div>
            </div>
            <div class="ad-chart-wrap">
                <canvas id="${chartId}"></canvas>
            </div>
            <div class="ad-chart-legend" id="${chartId}-legend"></div>
        </div>`;
    }).join('');

    // Data table for the first sheet
    const firstChart = db.charts && db.charts[0];
    let tableHTML = '';
    if (firstChart) {
        const maxRows = Math.min(firstChart.labels.length, 15);
        tableHTML = `
        <div class="ad-data-section">
            <div class="ad-section-head">
                <h3><i class="fas fa-table"></i> Data Preview - ${firstChart.sheetName}</h3>
                <span class="ad-badge">${firstChart.rowCount} rows</span>
            </div>
            <div class="ad-table-wrap">
                <table class="ad-table">
                    <thead><tr>
                        <th>${firstChart.labelColumn}</th>
                        ${firstChart.dataColumns.map(c => `<th>${c}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                        ${firstChart.labels.slice(0, maxRows).map((label, ri) => `
                            <tr>
                                <td class="ad-td-label">${label}</td>
                                ${firstChart.datasets.map(ds => `<td class="ad-td-num">${formatKpiValue(ds.data[ri])}</td>`).join('')}
                            </tr>
                        `).join('')}
                        ${firstChart.rowCount > maxRows ? `<tr><td colspan="${firstChart.dataColumns.length + 1}" class="ad-td-more">... and ${firstChart.rowCount - maxRows} more rows</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    return `
    <div class="ad-portal">
        ${getHeaderHTML()}
        ${selectorHTML}
        <div class="ad-content">
            <div class="ad-dash-info">
                <div class="ad-dash-title">
                    <h2><i class="fas fa-chart-bar"></i> ${db.title || 'Dashboard'}</h2>
                    ${db.description ? `<p>${db.description}</p>` : ''}
                </div>
                <div class="ad-dash-badges">
                    <span class="ad-freq-badge"><i class="fas fa-clock"></i> ${(db.frequency || 'daily').charAt(0).toUpperCase() + (db.frequency || 'daily').slice(1)}</span>
                    <span class="ad-date-badge"><i class="fas fa-calendar"></i> ${new Date(db.approvedAt || db.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            ${topKpis.length > 0 ? `<div class="ad-kpi-grid">${kpisHTML}</div>` : ''}
            <div class="ad-charts-grid">${chartsHTML}</div>
            ${tableHTML}
        </div>
    </div>`;
}

function getHeaderHTML() {
    return `
    <div class="ad-header">
        <div class="ad-header-bg"></div>
        <div class="ad-header-content">
            <div class="ad-header-left">
                <div class="ad-header-icon"><i class="fas fa-chart-bar"></i></div>
                <div>
                    <h1>Analytics Dashboard</h1>
                    <p>Real-time business intelligence from your data</p>
                </div>
            </div>
            <div class="ad-header-actions">
                <button class="ad-btn-outline" onclick="refreshAnalyticsDashboards()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
        </div>
    </div>`;
}

function getKpiIcon(label) {
    const l = label.toLowerCase();
    if (l.includes('revenue') || l.includes('sales') || l.includes('amount') || l.includes('price') || l.includes('cost')) return 'fa-dollar-sign';
    if (l.includes('production') || l.includes('output') || l.includes('quantity') || l.includes('qty')) return 'fa-industry';
    if (l.includes('client') || l.includes('customer') || l.includes('user')) return 'fa-users';
    if (l.includes('order') || l.includes('project')) return 'fa-clipboard-list';
    if (l.includes('weight') || l.includes('ton')) return 'fa-weight-hanging';
    if (l.includes('rate') || l.includes('percent') || l.includes('efficiency')) return 'fa-percentage';
    if (l.includes('time') || l.includes('hour') || l.includes('duration')) return 'fa-clock';
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
                backgroundColor: ds.data.map((_, i) => CHART_SOLIDS[i % CHART_SOLIDS.length]),
                borderWidth: 2,
                borderColor: '#fff'
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
            pointRadius: chartConfig.chartType === 'line' ? 4 : 0,
            pointHoverRadius: 7,
            borderRadius: chartConfig.chartType === 'bar' ? 6 : 0
        };
    });

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: !isCircular, position: 'top', labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '600' } } },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { size: 13, weight: '700' },
                bodyFont: { size: 12 }, padding: 14, cornerRadius: 10, displayColors: true,
                callbacks: { label: (ctx2) => ` ${ctx2.dataset.label}: ${formatKpiValue(ctx2.parsed.y || ctx2.parsed)}` }
            }
        }
    };

    if (!isCircular) {
        options.scales = {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, callback: v => formatKpiValue(v) } }
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

// ===== PREMIUM CSS =====
function addAnalyticsStyles() {
    if (document.head.querySelector('#analytics-styles')) return;
    const style = document.createElement('style');
    style.id = 'analytics-styles';
    style.textContent = `
/* ===== ANALYTICS DASHBOARD - PREMIUM ===== */
.ad-portal { background: linear-gradient(165deg, #f0f4ff 0%, #f8fafc 40%, #faf5ff 100%); min-height: 100vh; }

/* Loading */
.ad-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; gap:24px; }
.ad-loading p { color:#64748b; font-weight:600; font-size:1.05rem; }
.ad-loading-ring { display:inline-block; position:relative; width:64px; height:64px; }
.ad-loading-ring div { box-sizing:border-box; display:block; position:absolute; width:52px; height:52px; margin:6px;
    border:5px solid; border-color:#6366f1 transparent transparent transparent; border-radius:50%; animation:adRingSpin 1.2s cubic-bezier(.5,.15,.5,.85) infinite; }
.ad-loading-ring div:nth-child(1){ animation-delay:-.45s; }
.ad-loading-ring div:nth-child(2){ animation-delay:-.3s; }
.ad-loading-ring div:nth-child(3){ animation-delay:-.15s; }
@keyframes adRingSpin { 0%{ transform:rotate(0deg); } 100%{ transform:rotate(360deg); } }

/* Header */
.ad-header { position:relative; padding:44px 36px 40px; overflow:hidden; border-radius:0 0 28px 28px; }
.ad-header-bg { position:absolute; inset:0; background:linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%); }
.ad-header-bg::after { content:''; position:absolute; inset:0;
    background:radial-gradient(circle at 80% 20%, rgba(139,92,246,.4) 0%, transparent 50%),
               radial-gradient(circle at 20% 80%, rgba(99,102,241,.3) 0%, transparent 50%); }
.ad-header-content { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; }
.ad-header-left { display:flex; align-items:center; gap:20px; }
.ad-header-icon { width:56px; height:56px; background:rgba(255,255,255,.15); backdrop-filter:blur(12px);
    border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.5rem;
    border:1px solid rgba(255,255,255,.2); }
.ad-header h1 { color:#fff; font-size:1.9rem; font-weight:800; margin:0; letter-spacing:-.02em; }
.ad-header p { color:rgba(255,255,255,.7); margin:4px 0 0; font-size:.95rem; }
.ad-header-actions { display:flex; gap:12px; }
.ad-btn-outline { background:rgba(255,255,255,.12); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,.25);
    color:#fff; padding:10px 22px; border-radius:12px; font-weight:600; cursor:pointer; transition:all .25s; display:flex; align-items:center; gap:8px; font-size:.9rem; }
.ad-btn-outline:hover { background:rgba(255,255,255,.22); transform:translateY(-1px); }

/* Empty state */
.ad-empty { text-align:center; padding:80px 40px; }
.ad-empty-icon { width:100px; height:100px; background:linear-gradient(135deg, rgba(99,102,241,.1), rgba(139,92,246,.1));
    border-radius:28px; display:flex; align-items:center; justify-content:center; margin:0 auto 28px; font-size:2.5rem; color:#6366f1; }
.ad-empty h2 { font-size:1.6rem; font-weight:800; color:#1e293b; margin:0 0 12px; }
.ad-empty p { color:#64748b; font-size:1rem; max-width:450px; margin:0 auto 28px; line-height:1.6; }
.ad-btn-refresh { background:linear-gradient(135deg, #6366f1, #8b5cf6); color:#fff; border:none; padding:12px 28px;
    border-radius:12px; font-weight:600; cursor:pointer; font-size:.95rem; display:inline-flex; align-items:center; gap:8px;
    transition:all .25s; box-shadow:0 4px 16px rgba(99,102,241,.3); }
.ad-btn-refresh:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,.4); }

/* Dashboard selector tabs */
.ad-db-selector { display:flex; gap:8px; padding:0 36px; margin-top:-18px; position:relative; z-index:2; flex-wrap:wrap; }
.ad-db-tab { background:rgba(255,255,255,.85); backdrop-filter:blur(12px); border:1px solid rgba(0,0,0,.06);
    padding:10px 20px; border-radius:12px 12px 0 0; font-weight:600; color:#64748b; cursor:pointer;
    transition:all .25s; display:flex; align-items:center; gap:8px; font-size:.88rem; }
.ad-db-tab.active { background:#fff; color:#6366f1; border-bottom-color:#fff; box-shadow:0 -4px 16px rgba(99,102,241,.1); }
.ad-db-tab:hover:not(.active) { color:#1e293b; background:rgba(255,255,255,.95); }

/* Content area */
.ad-content { padding:28px 36px 48px; }

/* Dashboard info bar */
.ad-dash-info { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; flex-wrap:wrap; gap:16px; }
.ad-dash-title h2 { font-size:1.5rem; font-weight:800; color:#1e293b; margin:0 0 4px; display:flex; align-items:center; gap:10px; }
.ad-dash-title h2 i { color:#6366f1; }
.ad-dash-title p { color:#64748b; margin:0; font-size:.92rem; }
.ad-dash-badges { display:flex; gap:10px; }
.ad-freq-badge, .ad-date-badge { display:inline-flex; align-items:center; gap:6px; padding:6px 14px;
    border-radius:8px; font-size:.82rem; font-weight:600; }
.ad-freq-badge { background:linear-gradient(135deg, rgba(99,102,241,.1), rgba(139,92,246,.1)); color:#6366f1; }
.ad-date-badge { background:rgba(16,185,129,.1); color:#059669; }

/* KPI Grid */
.ad-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:18px; margin-bottom:32px; }
.ad-kpi { background:#fff; border-radius:18px; padding:22px; position:relative; overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04);
    transition:all .3s cubic-bezier(.4,0,.2,1); border:1px solid rgba(0,0,0,.04); }
.ad-kpi:hover { transform:translateY(-4px); box-shadow:0 8px 32px rgba(0,0,0,.08); }
.ad-kpi::after { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--kpi-color); }
.ad-kpi-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }
.ad-kpi-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; }
.ad-kpi-trend { display:flex; align-items:center; gap:4px; font-size:.78rem; font-weight:700; padding:4px 10px; border-radius:8px; }
.ad-kpi-trend.up { color:#059669; background:rgba(16,185,129,.1); }
.ad-kpi-trend.down { color:#dc2626; background:rgba(239,68,68,.1); }
.ad-kpi-value { font-size:2rem; font-weight:900; color:#0f172a; line-height:1.1; margin-bottom:4px; }
.ad-kpi-label { color:#64748b; font-weight:600; font-size:.85rem; margin-bottom:10px; text-transform:capitalize; }
.ad-kpi-meta { display:flex; gap:16px; font-size:.75rem; color:#94a3b8; font-weight:500; }
.ad-kpi-meta span { display:flex; align-items:center; gap:4px; }

/* Charts Grid */
.ad-charts-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(480px, 1fr)); gap:24px; margin-bottom:32px; }
.ad-chart-card { background:#fff; border-radius:20px; overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04);
    border:1px solid rgba(0,0,0,.04); transition:all .3s; }
.ad-chart-card:hover { box-shadow:0 8px 32px rgba(0,0,0,.08); }
.ad-chart-head { display:flex; justify-content:space-between; align-items:center; padding:22px 24px 0; }
.ad-chart-head h3 { font-size:1.1rem; font-weight:700; color:#1e293b; margin:0; }
.ad-chart-meta { display:flex; align-items:center; gap:6px; font-size:.78rem; color:#94a3b8; font-weight:500; margin-top:4px; }
.ad-chart-controls { display:flex; gap:8px; }
.ad-chart-type-sel { padding:6px 12px; border:1px solid #e2e8f0; border-radius:8px; font-size:.82rem; font-weight:500;
    color:#475569; background:#f8fafc; cursor:pointer; outline:none; }
.ad-chart-type-sel:focus { border-color:#6366f1; }
.ad-chart-wrap { padding:16px 24px 20px; height:320px; position:relative; }
.ad-chart-legend { padding:0 24px 16px; }

/* Data Table */
.ad-data-section { background:#fff; border-radius:20px; overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,.04), 0 4px 16px rgba(0,0,0,.04); border:1px solid rgba(0,0,0,.04); }
.ad-section-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px;
    border-bottom:1px solid #f1f5f9; }
.ad-section-head h3 { font-size:1.05rem; font-weight:700; color:#1e293b; margin:0; display:flex; align-items:center; gap:10px; }
.ad-section-head h3 i { color:#6366f1; }
.ad-badge { background:linear-gradient(135deg, rgba(99,102,241,.1), rgba(139,92,246,.1)); color:#6366f1;
    padding:4px 12px; border-radius:6px; font-size:.78rem; font-weight:700; }
.ad-table-wrap { overflow-x:auto; }
.ad-table { width:100%; border-collapse:collapse; font-size:.88rem; }
.ad-table thead th { background:#f8fafc; padding:12px 16px; text-align:left; font-weight:700; color:#475569;
    font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; border-bottom:2px solid #e2e8f0; position:sticky; top:0; }
.ad-table tbody tr { transition:background .15s; }
.ad-table tbody tr:hover { background:#f8fafc; }
.ad-table tbody td { padding:11px 16px; border-bottom:1px solid #f1f5f9; color:#334155; }
.ad-td-label { font-weight:600; color:#1e293b; }
.ad-td-num { font-variant-numeric:tabular-nums; text-align:right; font-weight:500; }
.ad-td-more { text-align:center; color:#94a3b8; font-style:italic; padding:14px; }

/* Responsive */
@media (max-width: 768px) {
    .ad-header { padding:28px 20px 32px; border-radius:0 0 20px 20px; }
    .ad-header h1 { font-size:1.4rem; }
    .ad-content { padding:20px 16px 40px; }
    .ad-kpi-grid { grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:12px; }
    .ad-kpi { padding:16px; }
    .ad-kpi-value { font-size:1.5rem; }
    .ad-charts-grid { grid-template-columns:1fr; }
    .ad-chart-wrap { height:260px; }
    .ad-db-selector { padding:0 16px; }
    .ad-dash-info { flex-direction:column; }
}
@media (max-width: 480px) {
    .ad-kpi-grid { grid-template-columns:1fr 1fr; }
    .ad-header-left { flex-direction:column; align-items:flex-start; gap:12px; }
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
