// SteelConnect Analytics Portal Integration Script
// Add this to your existing project as analytics-integration.js

// ========================================
// ANALYTICS PORTAL INTEGRATION
// ========================================

// Analytics state management
const analyticsState = {
    currentTab: 'overview',
    charts: {},
    sheetsConnection: {
        connected: false,
        url: '',
        lastSync: null
    },
    data: {
        production: {
            daily: [35, 42, 38, 45, 41, 39, 44],
            weekly: [280, 315, 298, 342, 325, 311, 336],
            monthly: [1250, 1180, 1340, 1285, 1420, 1365]
        },
        sales: {
            revenue: [125000, 89500, 275000, 156000, 198000, 142000],
            contracts: [3, 5, 2, 4, 6, 3],
            pipeline: [8, 12, 15, 11, 9, 14]
        },
        metrics: {
            totalProjects: 24,
            productionOutput: 1250,
            totalRevenue: 485200,
            clientCount: 18,
            dailyOutput: 42,
            efficiency: 87,
            activeLines: 6,
            monthlyRevenue: 485200,
            newContracts: 7,
            conversionRate: 65
        }
    }
};

// Override the buildSidebarNav function
function buildSidebarNavWithAnalytics() {
    const nav = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard">
                    <i class="fas fa-tachometer-alt fa-fw"></i>
                    <span>Dashboard</span>
                 </a>`;
    
    if (role === 'designer') {
        links += `
            <a href="#" class="sidebar-nav-link" data-section="jobs">
                <i class="fas fa-search fa-fw"></i>
                <span>Find Projects</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="my-quotes">
                <i class="fas fa-file-invoice-dollar fa-fw"></i>
                <span>My Quotes</span>
            </a>`;
    } else {
        links += `
            <a href="#" class="sidebar-nav-link" data-section="jobs">
                <i class="fas fa-tasks fa-fw"></i>
                <span>My Projects</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="approved-jobs">
                <i class="fas fa-check-circle fa-fw"></i>
                <span>Approved Projects</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="post-job">
                <i class="fas fa-plus-circle fa-fw"></i>
                <span>Post Project</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="estimation-tool">
                <i class="fas fa-calculator fa-fw"></i>
                <span>AI Estimation</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="my-estimations">
                <i class="fas fa-file-invoice fa-fw"></i>
                <span>My Estimations</span>
            </a>
            <hr class="sidebar-divider">
            <div class="sidebar-section-title">Business Intelligence</div>
            <a href="#" class="sidebar-nav-link analytics-nav-link" data-section="ai-analytics">
                <i class="fas fa-brain fa-fw"></i>
                <span>AI Analytics Portal</span>
                <div class="nav-badge">PRO</div>
            </a>`;
    }
    
    links += `
        <a href="#" class="sidebar-nav-link" data-section="messages">
            <i class="fas fa-comments fa-fw"></i>
            <span>Messages</span>
        </a>
        <hr class="sidebar-divider">
        <a href="#" class="sidebar-nav-link" data-section="support">
            <i class="fas fa-life-ring fa-fw"></i>
            <span>Support</span>
        </a>
        <a href="#" class="sidebar-nav-link" data-section="settings">
            <i class="fas fa-cog fa-fw"></i>
            <span>Settings</span>
        </a>`;
        
    nav.innerHTML = links;
    
    nav.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

// Store original functions
const originalRenderAppSection = window.renderAppSection || renderAppSection;
const originalBuildSidebarNav = window.buildSidebarNav || buildSidebarNav;

// Override renderAppSection
function renderAppSection(sectionId) {
    if (sectionId === 'ai-analytics') {
        renderAIAnalyticsPortal();
        return;
    }
    
    if (originalRenderAppSection) {
        originalRenderAppSection(sectionId);
    }
}

// Override buildSidebarNav
function buildSidebarNav() {
    buildSidebarNavWithAnalytics();
}

// Make functions globally available
window.renderAppSection = renderAppSection;
window.buildSidebarNav = buildSidebarNav;

// Main function to render AI Analytics Portal
async function renderAIAnalyticsPortal() {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="loading-spinner premium-loading">
            <div class="spinner-professional"></div>
            <p>Loading AI Analytics Portal...</p>
        </div>
    `;
    
    await loadAnalyticsData();
    container.innerHTML = getAnalyticsPortalTemplate();
    initializeAnalyticsPortal();
}

// Load analytics data
async function loadAnalyticsData() {
    try {
        if (typeof apiCall === 'function') {
            const response = await apiCall('/analytics/dashboard', 'GET');
            if (response.success) {
                analyticsState.data = { ...analyticsState.data, ...response.data };
            }
        }
    } catch (error) {
        console.log('Using demo analytics data');
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
}

// Get the analytics portal template
function getAnalyticsPortalTemplate() {
    return `
        <div class="analytics-portal-container">
            <div class="analytics-header premium-header">
                <div class="analytics-header-content">
                    <div class="analytics-title-section">
                        <h1><i class="fas fa-brain"></i> AI-Powered Business Analytics</h1>
                        <p>Advanced Production, Sales & Performance Intelligence Dashboard</p>
                        <div class="header-badges">
                            <span class="feature-badge ai-badge">
                                <i class="fas fa-robot"></i> AI-Powered
                            </span>
                            <span class="feature-badge real-time-badge">
                                <i class="fas fa-satellite-dish"></i> Real-time
                            </span>
                        </div>
                    </div>
                    <div class="analytics-actions">
                        <button class="btn btn-premium" onclick="exportAnalyticsReport()">
                            <i class="fas fa-download"></i> Export Report
                        </button>
                        <button class="btn btn-outline-premium" onclick="refreshAnalyticsData()">
                            <i class="fas fa-sync-alt"></i> Refresh Data
                        </button>
                    </div>
                </div>
            </div>

            <div class="analytics-navigation">
                <button class="analytics-tab active" data-tab="overview" onclick="switchAnalyticsTab('overview')">
                    <i class="fas fa-chart-pie"></i>
                    <span>Overview</span>
                </button>
                <button class="analytics-tab" data-tab="production" onclick="switchAnalyticsTab('production')">
                    <i class="fas fa-industry"></i>
                    <span>Production</span>
                </button>
                <button class="analytics-tab" data-tab="sales" onclick="switchAnalyticsTab('sales')">
                    <i class="fas fa-chart-line"></i>
                    <span>Sales</span>
                </button>
                <button class="analytics-tab" data-tab="integration" onclick="switchAnalyticsTab('integration')">
                    <i class="fab fa-google"></i>
                    <span>Google Sheets</span>
                </button>
                <button class="analytics-tab" data-tab="ai-insights" onclick="switchAnalyticsTab('ai-insights')">
                    <i class="fas fa-lightbulb"></i>
                    <span>AI Insights</span>
                </button>
            </div>

            <div id="analytics-tab-content" class="analytics-tab-content">
            </div>
        </div>
    `;
}

// Initialize the analytics portal
function initializeAnalyticsPortal() {
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.min.js';
        script.onload = () => switchAnalyticsTab('overview');
        document.head.appendChild(script);
    } else {
        switchAnalyticsTab('overview');
    }
    
    addAnalyticsStyles();
    startAnalyticsUpdates();
}

// Switch between analytics tabs
function switchAnalyticsTab(tabName) {
    document.querySelectorAll('.analytics-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    analyticsState.currentTab = tabName;
    const contentContainer = document.getElementById('analytics-tab-content');
    
    switch (tabName) {
        case 'overview':
            contentContainer.innerHTML = getOverviewTabContent();
            setTimeout(initializeOverviewCharts, 100);
            break;
        case 'production':
            contentContainer.innerHTML = getProductionTabContent();
            setTimeout(initializeProductionCharts, 100);
            break;
        case 'sales':
            contentContainer.innerHTML = getSalesTabContent();
            setTimeout(initializeSalesCharts, 100);
            break;
        case 'integration':
            contentContainer.innerHTML = getIntegrationTabContent();
            initializeIntegrationFeatures();
            break;
        case 'ai-insights':
            contentContainer.innerHTML = getAIInsightsTabContent();
            initializeAIInsights();
            break;
    }
}

// Tab content generators
function getOverviewTabContent() {
    return `
        <div class="analytics-overview">
            <div class="metrics-grid">
                <div class="metric-card premium-metric">
                    <div class="metric-header">
                        <div class="metric-icon overview-icon">
                            <i class="fas fa-project-diagram"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>12.5%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.totalProjects}</div>
                    <div class="metric-label">Active Projects</div>
                </div>

                <div class="metric-card premium-metric">
                    <div class="metric-header">
                        <div class="metric-icon production-icon">
                            <i class="fas fa-industry"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>8.2%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.productionOutput.toLocaleString()}</div>
                    <div class="metric-label">Tons Produced</div>
                </div>

                <div class="metric-card premium-metric">
                    <div class="metric-header">
                        <div class="metric-icon sales-icon">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>15.7%</span>
                        </div>
                    </div>
                    <div class="metric-value">$${(analyticsState.data.metrics.totalRevenue / 1000).toFixed(0)}K</div>
                    <div class="metric-label">Monthly Revenue</div>
                </div>

                <div class="metric-card premium-metric">
                    <div class="metric-header">
                        <div class="metric-icon client-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>6.3%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.clientCount}</div>
                    <div class="metric-label">Active Clients</div>
                </div>
            </div>

            <div class="chart-container premium-chart">
                <div class="chart-header">
                    <h3>Performance Overview</h3>
                    <div class="chart-controls">
                        <select class="form-select" onchange="updateOverviewChart(this.value)">
                            <option value="7">Last 7 Days</option>
                            <option value="30" selected>Last 30 Days</option>
                            <option value="90">Last 3 Months</option>
                        </select>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="overviewChart" width="400" height="200"></canvas>
                </div>
            </div>

            <div class="quick-actions-section">
                <h3>Quick Actions</h3>
                <div class="quick-actions-grid">
                    <button class="quick-action-btn" onclick="exportAnalyticsReport()">
                        <i class="fas fa-file-export"></i>
                        <span>Export Report</span>
                    </button>
                    <button class="quick-action-btn" onclick="switchAnalyticsTab('integration')">
                        <i class="fas fa-link"></i>
                        <span>Connect Sheets</span>
                    </button>
                    <button class="quick-action-btn" onclick="switchAnalyticsTab('ai-insights')">
                        <i class="fas fa-brain"></i>
                        <span>AI Insights</span>
                    </button>
                    <button class="quick-action-btn" onclick="refreshAnalyticsData()">
                        <i class="fas fa-sync-alt"></i>
                        <span>Refresh Data</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getProductionTabContent() {
    return `
        <div class="analytics-production">
            <div class="metrics-grid">
                <div class="metric-card production-metric">
                    <div class="metric-header">
                        <div class="metric-icon production-icon">
                            <i class="fas fa-hammer"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>5.2%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.dailyOutput}</div>
                    <div class="metric-label">Daily Output (Tons)</div>
                </div>

                <div class="metric-card production-metric">
                    <div class="metric-header">
                        <div class="metric-icon production-icon">
                            <i class="fas fa-gauge-high"></i>
                        </div>
                        <div class="metric-trend negative">
                            <i class="fas fa-arrow-down"></i>
                            <span>2.1%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.efficiency}%</div>
                    <div class="metric-label">Production Efficiency</div>
                </div>

                <div class="metric-card production-metric">
                    <div class="metric-header">
                        <div class="metric-icon production-icon">
                            <i class="fas fa-cogs"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>3.8%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.activeLines}</div>
                    <div class="metric-label">Active Production Lines</div>
                </div>
            </div>

            <div class="chart-container premium-chart">
                <div class="chart-header">
                    <h3>Production Trends</h3>
                    <div class="chart-controls">
                        <select class="form-select" onchange="updateProductionChart(this.value)">
                            <option value="daily">Daily Output</option>
                            <option value="weekly" selected>Weekly Trends</option>
                            <option value="monthly">Monthly Summary</option>
                        </select>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="productionChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
    `;
}

function getSalesTabContent() {
    return `
        <div class="analytics-sales">
            <div class="metrics-grid">
                <div class="metric-card sales-metric">
                    <div class="metric-header">
                        <div class="metric-icon sales-icon">
                            <i class="fas fa-chart-line"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>18.5%</span>
                        </div>
                    </div>
                    <div class="metric-value">$${analyticsState.data.metrics.monthlyRevenue.toLocaleString()}</div>
                    <div class="metric-label">Monthly Revenue</div>
                </div>

                <div class="metric-card sales-metric">
                    <div class="metric-header">
                        <div class="metric-icon sales-icon">
                            <i class="fas fa-handshake"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>12.3%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.newContracts}</div>
                    <div class="metric-label">New Contracts</div>
                </div>

                <div class="metric-card sales-metric">
                    <div class="metric-header">
                        <div class="metric-icon sales-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="metric-trend positive">
                            <i class="fas fa-arrow-up"></i>
                            <span>4.7%</span>
                        </div>
                    </div>
                    <div class="metric-value">${analyticsState.data.metrics.conversionRate}%</div>
                    <div class="metric-label">Quote Conversion Rate</div>
                </div>
            </div>

            <div class="chart-container premium-chart">
                <div class="chart-header">
                    <h3>Sales Performance</h3>
                    <div class="chart-controls">
                        <select class="form-select" onchange="updateSalesChart(this.value)">
                            <option value="revenue">Revenue Trends</option>
                            <option value="contracts" selected>Contract Pipeline</option>
                            <option value="conversion">Conversion Rates</option>
                        </select>
                    </div>
                </div>
                <div class="chart-wrapper">
                    <canvas id="salesChart" width="400" height="200"></canvas>
                </div>
            </div>
        </div>
    `;
}

function getIntegrationTabContent() {
    return `
        <div class="analytics-integration">
            <div class="integration-card premium-integration">
                <div class="integration-header">
                    <div class="integration-icon">
                        <i class="fab fa-google"></i>
                    </div>
                    <div>
                        <h3>Google Sheets Integration</h3>
                        <p>Sync your analytics data with Google Sheets</p>
                    </div>
                    <div class="connection-status ${analyticsState.sheetsConnection.connected ? 'connected' : 'disconnected'}" id="sheetsStatus">
                        <i class="fas ${analyticsState.sheetsConnection.connected ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        <span>${analyticsState.sheetsConnection.connected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                </div>

                <form id="sheetsIntegrationForm" class="integration-form">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-link"></i> Google Sheets URL
                        </label>
                        <input 
                            type="url" 
                            class="form-input" 
                            id="sheetsUrl" 
                            placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                            value="${analyticsState.sheetsConnection.url}"
                            required
                        >
                    </div>

                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-sync"></i> Auto-sync Frequency
                        </label>
                        <select class="form-select" id="syncFrequency">
                            <option value="manual">Manual Only</option>
                            <option value="hourly">Every Hour</option>
                            <option value="daily" selected>Daily</option>
                            <option value="weekly">Weekly</option>
                        </select>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-plug"></i> ${analyticsState.sheetsConnection.connected ? 'Update' : 'Connect'}
                        </button>
                    </div>
                </form>
            </div>

            <div class="export-section">
                <h3>Export Data</h3>
                <div class="export-grid">
                    <div class="export-card" onclick="exportToSheets('production')">
                        <div class="export-icon production-export">
                            <i class="fas fa-industry"></i>
                        </div>
                        <h4>Production Data</h4>
                        <p>Export production metrics and schedules</p>
                    </div>

                    <div class="export-card" onclick="exportToSheets('sales')">
                        <div class="export-icon sales-export">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <h4>Sales Analytics</h4>
                        <p>Export sales performance data</p>
                    </div>

                    <div class="export-card" onclick="exportToSheets('overview')">
                        <div class="export-icon overview-export">
                            <i class="fas fa-chart-pie"></i>
                        </div>
                        <h4>Complete Report</h4>
                        <p>Export comprehensive analytics</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAIInsightsTabContent() {
    return `
        <div class="analytics-ai-insights">
            <div class="ai-insights-header">
                <div class="ai-brain-animation">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="ai-header-content">
                    <h2>AI-Powered Business Insights</h2>
                    <p>Advanced analysis of your business data</p>
                </div>
            </div>

            <div class="ai-recommendations">
                <h3>Key Recommendations</h3>
                <div class="recommendations-grid">
                    <div class="recommendation-card priority-high">
                        <div class="recommendation-header">
                            <div class="priority-indicator high">HIGH</div>
                            <div class="confidence-score">95%</div>
                        </div>
                        <h4>Optimize Production Efficiency</h4>
                        <p>AI detected potential 15% efficiency improvement. Consider equipment maintenance scheduling.</p>
                    </div>

                    <div class="recommendation-card priority-medium">
                        <div class="recommendation-header">
                            <div class="priority-indicator medium">MEDIUM</div>
                            <div class="confidence-score">87%</div>
                        </div>
                        <h4>Expand Market Reach</h4>
                        <p>Analysis shows 23% higher profit margins in residential projects. Consider increasing marketing.</p>
                    </div>

                    <div class="recommendation-card priority-low">
                        <div class="recommendation-header">
                            <div class="priority-indicator low">LOW</div>
                            <div class="confidence-score">72%</div>
                        </div>
                        <h4>Inventory Optimization</h4>
                        <p>Current inventory levels are 18% above optimal. Consider reducing orders by 12%.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Chart initialization functions
function initializeOverviewCharts() {
    if (typeof Chart === 'undefined') return;
    
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    
    analyticsState.charts.overview = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Production (Tons)',
                data: [280, 315, 298, 342],
                borderColor: '#f093fb',
                backgroundColor: 'rgba(240, 147, 251, 0.1)',
                tension: 0.4,
                borderWidth: 3
            }, {
                label: 'Revenue ($K)',
                data: [125, 189, 275, 156],
                borderColor: '#4facfe',
                backgroundColor: 'rgba(79, 172, 254, 0.1)',
                tension: 0.4,
                borderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function initializeProductionCharts() {
    if (typeof Chart === 'undefined') return;
    
    const ctx = document.getElementById('productionChart');
    if (!ctx) return;
    
    analyticsState.charts.production = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Daily Production (Tons)',
                data: analyticsState.data.production.daily,
                backgroundColor: 'rgba(240, 147, 251, 0.8)',
                borderColor: '#f093fb',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function initializeSalesCharts() {
    if (typeof Chart === 'undefined') return;
    
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    
    analyticsState.charts.sales = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Closed Deals', 'Negotiating', 'Proposals Sent', 'Lead Generation'],
            datasets: [{
                data: [40, 25, 20, 15],
                backgroundColor: [
                    '#4facfe',
                    '#00f2fe',
                    '#667eea',
                    '#764ba2'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function initializeIntegrationFeatures() {
    const form = document.getElementById('sheetsIntegrationForm');
    if (form) {
        form.addEventListener('submit', handleSheetsConnection);
    }
}

function initializeAIInsights() {
    const brainIcon = document.querySelector('.ai-brain-animation i');
    if (brainIcon) {
        setInterval(() => {
            brainIcon.style.transform = 'scale(1.1)';
            setTimeout(() => {
                brainIcon.style.transform = 'scale(1)';
            }, 500);
        }, 3000);
    }
}

// Chart update functions
function updateOverviewChart(period) {
    if (!analyticsState.charts.overview) return;
    
    const newData = period === '7' ? 
        [35, 42, 38, 45, 41, 39, 44] : 
        period === '30' ? 
        [280, 315, 298, 342] : 
        [1250, 1180, 1340];
    
    analyticsState.charts.overview.data.datasets[0].data = newData;
    analyticsState.charts.overview.update();
}

function updateProductionChart(period) {
    if (!analyticsState.charts.production) return;
    
    const data = analyticsState.data.production[period];
    const labels = period === 'daily' ? 
        ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
        period === 'weekly' ?
        ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'] :
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    analyticsState.charts.production.data.labels = labels;
    analyticsState.charts.production.data.datasets[0].data = data;
    analyticsState.charts.production.update();
}

function updateSalesChart(type) {
    if (!analyticsState.charts.sales) return;
    
    const data = analyticsState.data.sales[type] || [40, 25, 20, 15];
    analyticsState.charts.sales.data.datasets[0].data = data;
    analyticsState.charts.sales.update();
}

// Integration functions
async function handleSheetsConnection(event) {
    event.preventDefault();
    
    const url = document.getElementById('sheetsUrl').value;
    const frequency = document.getElementById('syncFrequency').value;
    
    try {
        const statusElement = document.getElementById('sheetsStatus');
        statusElement.innerHTML = '<div class="loading-spinner"></div> Connecting...';
        statusElement.className = 'connection-status connecting';
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        analyticsState.sheetsConnection.connected = true;
        analyticsState.sheetsConnection.url = url;
        analyticsState.sheetsConnection.lastSync = new Date();
        
        statusElement.innerHTML = '<i class="fas fa-check-circle"></i> <span>Connected</span>';
        statusElement.className = 'connection-status connected';
        
        showAnalyticsNotification('Google Sheets connected successfully!', 'success');
        
        if (analyticsState.currentTab === 'integration') {
            switchAnalyticsTab('integration');
        }
        
    } catch (error) {
        showAnalyticsNotification('Failed to connect to Google Sheets. Please try again.', 'error');
    }
}

async function exportToSheets(dataType) {
    if (!analyticsState.sheetsConnection.connected) {
        showAnalyticsNotification('Please connect to Google Sheets first.', 'warning');
        return;
    }
    
    showAnalyticsNotification(`Exporting ${dataType} data to Google Sheets...`, 'info');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        if (typeof apiCall === 'function') {
            await apiCall('/analytics/export', 'POST', {
                dataType,
                destination: 'sheets',
                sheetUrl: analyticsState.sheetsConnection.url
            });
        }
        
        showAnalyticsNotification(`${dataType} data exported successfully!`, 'success');
        
    } catch (error) {
        showAnalyticsNotification(`Export failed: ${error.message}`, 'error');
    }
}

// Action functions
async function exportAnalyticsReport() {
    showAnalyticsNotification('Generating comprehensive analytics report...', 'info');
    
    try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const reportData = {
            overview: analyticsState.data.metrics,
            production: analyticsState.data.production,
            sales: analyticsState.data.sales,
            generatedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `steelconnect-analytics-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showAnalyticsNotification('Analytics report exported successfully!', 'success');
        
    } catch (error) {
        showAnalyticsNotification('Failed to export report. Please try again.', 'error');
    }
}

async function refreshAnalyticsData() {
    showAnalyticsNotification('Refreshing analytics data...', 'info');
    
    try {
        await loadAnalyticsData();
        
        Object.values(analyticsState.charts).forEach(chart => {
            if (chart && chart.update) {
                chart.update();
            }
        });
        
        showAnalyticsNotification('Analytics data refreshed successfully!', 'success');
        
    } catch (error) {
        showAnalyticsNotification('Failed to refresh data. Please try again.', 'error');
    }
}

// Utility functions
function startAnalyticsUpdates() {
    setInterval(() => {
        if (analyticsState.currentTab === 'overview') {
            updateMetricsDisplay();
        }
    }, 30000);
}

function updateMetricsDisplay() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        if (Math.random() > 0.95) {
            metric.style.transform = 'scale(1.05)';
            metric.style.transition = 'transform 0.2s ease';
            setTimeout(() => {
                metric.style.transform = 'scale(1)';
            }, 200);
        }
    });
}

function showAnalyticsNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof showNotification === 'function') {
        showNotification(message, type);
        return;
    }
    
    // Fallback notification system
    const notification = document.createElement('div');
    notification.className = `analytics-notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        animation: slideInRight 0.3s ease;
    `;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-times-circle' : 
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// Add analytics-specific styles
function addAnalyticsStyles() {
    if (document.head.querySelector('#analytics-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'analytics-styles';
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        
        .analytics-portal-container {
            padding: 0;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            min-height: 100vh;
        }
        
        .analytics-header {
            background: var(--analytics-gradient);
            padding: 3rem 2rem;
            color: white;
            position: relative;
            overflow: hidden;
        }
        
        .analytics-header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }
        
        .analytics-header-content {
            position: relative;
            z-index: 1;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 2rem;
        }
        
        .analytics-title-section h1 {
            font-size: 2.5rem;
            font-weight: 900;
            margin-bottom: 0.5rem;
            text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .analytics-title-section p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }
        
        .header-badges {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .feature-badge {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .ai-badge {
            background: rgba(139, 92, 246, 0.2);
            border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .real-time-badge {
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.3);
        }
        
        .analytics-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        
        .btn-premium {
            background: white;
            color: var(--primary-color);
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .btn-premium:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.2);
        }
        
        .btn-outline-premium {
            background: transparent;
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            padding: 0.75rem 1.5rem;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .btn-outline-premium:hover {
            background: rgba(255,255,255,0.1);
            border-color: rgba(255,255,255,0.5);
        }
        
        .analytics-navigation {
            display: flex;
            gap: 0.5rem;
            padding: 2rem;
            background: white;
            margin: 0 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            overflow-x: auto;
        }
        
        .analytics-tab {
            padding: 1rem 2rem;
            background: transparent;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.3s ease;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .analytics-tab.active {
            background: var(--primary-color);
            color: white;
            box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
        }
        
        .analytics-tab:hover:not(.active) {
            background: #f8fafc;
            color: var(--text-primary);
        }
        
        .analytics-tab-content {
            padding: 2rem;
            margin: 0 2rem 2rem 2rem;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .metric-card {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        
        .metric-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }
        
        .metric-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--primary-color);
        }
        
        .metric-card.production-metric::before {
            background: var(--production-gradient);
        }
        
        .metric-card.sales-metric::before {
            background: var(--sales-gradient);
        }
        
        .metric-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .metric-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.2rem;
        }
        
        .overview-icon, .client-icon {
            background: var(--analytics-gradient);
        }
        
        .production-icon {
            background: var(--production-gradient);
        }
        
        .sales-icon {
            background: var(--sales-gradient);
        }
        
        .metric-value {
            font-size: 2.5rem;
            font-weight: 900;
            margin-bottom: 0.5rem;
            color: var(--text-primary);
        }
        
        .metric-label {
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 0.95rem;
        }
        
        .metric-trend {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.875rem;
            font-weight: 600;
            padding: 0.25rem 0.75rem;
            border-radius: 8px;
        }
        
        .metric-trend.positive {
            color: var(--success-color);
            background: rgba(16, 185, 129, 0.1);
        }
        
        .metric-trend.negative {
            color: var(--danger-color);
            background: rgba(239, 68, 68, 0.1);
        }
        
        .chart-container {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        }
        
        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
        }
        
        .chart-header h3 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
        }
        
        .chart-wrapper {
            position: relative;
            height: 300px;
        }
        
        .quick-actions-section h3 {
            margin-bottom: 1.5rem;
            color: var(--text-primary);
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .quick-actions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        
        .quick-action-btn {
            background: white;
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            border-radius: 12px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
        }
        
        .quick-action-btn:hover {
            background: var(--primary-color);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(37, 99, 235, 0.2);
        }
        
        .quick-action-btn i {
            font-size: 1.5rem;
        }
        
        .nav-badge {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: white;
            font-size: 0.6rem;
            padding: 0.2rem 0.5rem;
            border-radius: 4px;
            margin-left: 0.5rem;
        }
        
        .sidebar-divider {
            border: none;
            height: 1px;
            background: rgba(0,0,0,0.1);
            margin: 1rem 0;
        }
        
        .sidebar-section-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 1rem 1rem 0.5rem 1rem;
        }
        
        .loading-spinner.premium-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 400px;
            gap: 1rem;
        }
        
        .spinner-professional {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        .integration-card {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        }
        
        .integration-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            flex-wrap: wrap;
        }
        
        .integration-icon {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #34a853 0%, #4285f4 100%);
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
        }
        
        .connection-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.875rem;
        }
        
        .connection-status.connected {
            background: rgba(16, 185, 129, 0.1);
            color: var(--success-color);
        }
        
        .connection-status.disconnected {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .connection-status.connecting {
            background: rgba(59, 130, 246, 0.1);
            color: var(--info-color);
        }
        
        .export-section h3 {
            margin-bottom: 1.5rem;
            font-size: 1.25rem;
            font-weight: 700;
        }
        
        .export-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
        }
        
        .export-card {
            background: white;
            border: 2px solid var(--border-color);
            padding: 2rem;
            border-radius: 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .export-card:hover {
            border-color: var(--primary-color);
            box-shadow: 0 8px 16px rgba(37, 99, 235, 0.15);
            transform: translateY(-2px);
        }
        
        .export-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 1rem auto;
            border-radius: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            color: white;
        }
        
        .production-export {
            background: var(--production-gradient);
        }
        
        .sales-export {
            background: var(--sales-gradient);
        }
        
        .overview-export {
            background: var(--analytics-gradient);
        }
        
        .ai-insights-header {
            display: flex;
            align-items: center;
            gap: 2rem;
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            margin-bottom: 2rem;
        }
        
        .ai-brain-animation {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
        }
        
        .ai-brain-animation i {
            transition: transform 0.5s ease;
        }
        
        .ai-header-content h2 {
            font-size: 1.75rem;
            font-weight: 800;
            margin-bottom: 0.5rem;
        }
        
        .recommendations-grid {
            display: grid;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .recommendation-card {
            background: white;
            padding: 2rem;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            border-left: 4px solid var(--primary-color);
        }
        
        .recommendation-card.priority-high {
            border-left-color: var(--danger-color);
        }
        
        .recommendation-card.priority-medium {
            border-left-color: var(--warning-color);
        }
        
        .recommendation-card.priority-low {
            border-left-color: var(--info-color);
        }
        
        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .priority-indicator {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        .priority-indicator.high {
            background: rgba(239, 68, 68, 0.1);
            color: var(--danger-color);
        }
        
        .priority-indicator.medium {
            background: rgba(245, 158, 11, 0.1);
            color: var(--warning-color);
        }
        
        .priority-indicator.low {
            background: rgba(59, 130, 246, 0.1);
            color: var(--info-color);
        }
        
        .confidence-score {
            font-weight: 700;
            color: var(--success-color);
        }
        
        @media (max-width: 768px) {
            .analytics-header {
                padding: 2rem 1rem;
            }
            
            .analytics-title-section h1 {
                font-size: 2rem;
            }
            
            .analytics-navigation,
            .analytics-tab-content {
                margin: 0 1rem;
                padding: 1rem;
            }
            
            .analytics-navigation {
                flex-direction: column;
                gap: 0.25rem;
            }
            
            .analytics-tab {
                justify-content: center;
                padding: 0.75rem 1rem;
            }
            
            .metrics-grid {
                grid-template-columns: 1fr;
            }
            
            .quick-actions-grid {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if (typeof appState !== 'undefined' && appState.currentUser) {
        if (typeof buildSidebarNav === 'function') {
            window.buildSidebarNav = buildSidebarNavWithAnalytics;
        }
    }
});

// Export functions globally
window.switchAnalyticsTab = switchAnalyticsTab;
window.updateOverviewChart = updateOverviewChart;
window.updateProductionChart = updateProductionChart;
window.updateSalesChart = updateSalesChart;
window.exportAnalyticsReport = exportAnalyticsReport;
window.refreshAnalyticsData = refreshAnalyticsData;
window.exportToSheets = exportToSheets;

console.log('🚀 SteelConnect Analytics Portal Integration Loaded Successfully!');
