// SteelConnect Analytics Portal - World-Class Premium Dashboard System
// Flow: Contractor uploads sheet → Auto-generates dashboard → Admin approves → Contractor views premium dashboard

const analyticsState = {
    currentView: 'portal', // 'portal' or 'dashboard'
    charts: {},
    approvedDashboards: [],
    allDashboards: [],
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

function initializeAnalyticsIntegration() {
    if (typeof window.renderAppSection === 'function') originalRenderAppSection = window.renderAppSection;
    window.renderAppSection = renderAppSectionWithAnalytics;
    window.switchAnalyticsDashboard = switchAnalyticsDashboard;
    window.refreshAnalyticsDashboards = refreshAnalyticsDashboards;
    window.toggleFullscreenChart = toggleFullscreenChart;
    window.exportChartImage = exportChartImage;
    window.showAnalyticsUploadView = showAnalyticsUploadView;
    window.showApprovedDashboards = showApprovedDashboards;
    window.handleSheetUpload = handleSheetUpload;
    window.deletePendingDashboard = deletePendingDashboard;
    window.showDashboardStatus = showDashboardStatus;
    window.renderAnalyticsPortal = renderAnalyticsPortal;
    addAnalyticsStyles();
}

function renderAppSectionWithAnalytics(sectionId) {
    if (sectionId === 'ai-analytics' || sectionId === 'business-analytics') {
        renderAnalyticsPortal();
        document.querySelectorAll('.sidebar-nav-link').forEach(link =>
            link.classList.toggle('active', link.dataset.section === 'ai-analytics' || link.dataset.section === 'business-analytics')
        );
        return;
    }
    if (originalRenderAppSection) originalRenderAppSection(sectionId);
}

// ===== MAIN PORTAL - Shows upload form + pending + approved dashboards =====
async function renderAnalyticsPortal() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
    <div class="ad-portal">
        <div class="ad-loading-screen">
            <div class="ad-loading-orb">
                <div class="ad-orb-ring"></div><div class="ad-orb-ring"></div><div class="ad-orb-ring"></div>
                <i class="fas fa-chart-bar ad-orb-icon"></i>
            </div>
            <h3>Loading Analytics Portal</h3>
            <p>Preparing your business intelligence...</p>
            <div class="ad-loading-bar"><div class="ad-loading-fill"></div></div>
        </div>
    </div>`;

    try {
        const response = await window.apiCall('/analysis/my-dashboards', 'GET');
        analyticsState.allDashboards = response.dashboards || [];
        analyticsState.approvedDashboards = analyticsState.allDashboards.filter(d => d.status === 'approved');
    } catch (error) {
        console.error('Failed to fetch dashboards:', error);
        analyticsState.allDashboards = [];
        analyticsState.approvedDashboards = [];
    }

    container.innerHTML = getPortalHTML();
}

function getPortalHTML() {
    const all = analyticsState.allDashboards;
    const pending = all.filter(d => d.status === 'pending');
    const approved = all.filter(d => d.status === 'approved');
    const rejected = all.filter(d => d.status === 'rejected');

    return `
    <div class="ad-portal">
        ${getHeroHeader()}
        <div class="ad-content">
            <!-- Upload Section -->
            <div class="ad-upload-section">
                <div class="ad-upload-card">
                    <div class="ad-upload-left">
                        <div class="ad-upload-icon-box"><i class="fas fa-cloud-upload-alt"></i></div>
                        <div>
                            <h3>Upload Your Data</h3>
                            <p>Upload an Excel file or paste a Google Sheet link. We'll auto-generate a premium dashboard and send it to your admin for approval.</p>
                        </div>
                    </div>
                    <button class="ad-upload-btn" onclick="showAnalyticsUploadView()">
                        <i class="fas fa-file-excel"></i> Upload Sheet
                    </button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="ad-portal-stats">
                <div class="ad-portal-stat">
                    <div class="ad-ps-icon" style="background:rgba(99,102,241,.1);color:#6366f1"><i class="fas fa-chart-bar"></i></div>
                    <div class="ad-ps-num">${all.length}</div>
                    <div class="ad-ps-label">Total</div>
                </div>
                <div class="ad-portal-stat">
                    <div class="ad-ps-icon" style="background:rgba(245,158,11,.1);color:#f59e0b"><i class="fas fa-hourglass-half"></i></div>
                    <div class="ad-ps-num">${pending.length}</div>
                    <div class="ad-ps-label">Pending</div>
                </div>
                <div class="ad-portal-stat">
                    <div class="ad-ps-icon" style="background:rgba(16,185,129,.1);color:#10b981"><i class="fas fa-check-circle"></i></div>
                    <div class="ad-ps-num">${approved.length}</div>
                    <div class="ad-ps-label">Approved</div>
                </div>
                <div class="ad-portal-stat">
                    <div class="ad-ps-icon" style="background:rgba(239,68,68,.1);color:#ef4444"><i class="fas fa-times-circle"></i></div>
                    <div class="ad-ps-num">${rejected.length}</div>
                    <div class="ad-ps-label">Rejected</div>
                </div>
            </div>

            <!-- Pending Dashboards -->
            ${pending.length > 0 ? `
            <div class="ad-section-header">
                <h3><i class="fas fa-hourglass-half"></i> Pending Admin Approval</h3>
                <span class="ad-section-count">${pending.length}</span>
            </div>
            <div class="ad-pending-grid">
                ${pending.map(db => `
                    <div class="ad-pending-card" style="cursor:pointer" onclick="showDashboardStatus('${db._id}')">
                        <div class="ad-pending-status-bar"></div>
                        <div class="ad-pending-body">
                            <div class="ad-pending-head">
                                <div class="ad-pending-icon"><i class="fas fa-chart-pie"></i></div>
                                <div class="ad-pending-info">
                                    <h4>${db.title}</h4>
                                    <span class="ad-pending-file">
                                        ${db.fileName ? `<i class="fas fa-file-excel"></i> ${db.fileName}` : ''}
                                        ${db.googleSheetUrl ? `<i class="fab fa-google-drive" style="color:#34a853"></i> Google Sheet linked` : ''}
                                        ${!db.fileName && !db.googleSheetUrl ? '<i class="fas fa-file-excel"></i> Uploaded file' : ''}
                                    </span>
                                </div>
                                <span class="ad-status-pill pending"><i class="fas fa-clock"></i> Pending</span>
                            </div>
                            <div class="ad-pending-meta">
                                <span><i class="fas fa-chart-bar"></i> ${db.chartsCount || 0} charts${db.chartsCount > 0 ? ' auto-generated' : ' (pending from link)'}</span>
                                <span><i class="fas fa-sync-alt"></i> ${db.frequency || 'daily'}</span>
                                <span><i class="fas fa-calendar"></i> ${new Date(db.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                            <div class="ad-pending-footer">
                                <span class="ad-pending-note"><i class="fas fa-info-circle"></i> Click to view status details</span>
                                <button class="ad-pending-delete" onclick="event.stopPropagation();deletePendingDashboard('${db._id}')" title="Cancel & Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}

            <!-- Rejected Dashboards -->
            ${rejected.length > 0 ? `
            <div class="ad-section-header">
                <h3><i class="fas fa-times-circle"></i> Rejected</h3>
            </div>
            <div class="ad-rejected-list">
                ${rejected.map(db => `
                    <div class="ad-rejected-item" style="cursor:pointer" onclick="showDashboardStatus('${db._id}')">
                        <i class="fas fa-chart-pie"></i>
                        <div style="flex:1"><strong>${db.title}</strong><br><small>${db.fileName || ''} &middot; ${new Date(db.createdAt).toLocaleDateString()}</small></div>
                        <span class="ad-status-pill rejected"><i class="fas fa-times"></i> Rejected</span>
                        <i class="fas fa-chevron-right" style="color:#cbd5e1;font-size:.75rem"></i>
                    </div>
                `).join('')}
            </div>` : ''}

            <!-- Approved Dashboards -->
            <div class="ad-section-header" style="margin-top:${pending.length > 0 || rejected.length > 0 ? '32px' : '0'}">
                <h3><i class="fas fa-check-circle"></i> Your Approved Dashboards</h3>
                <span class="ad-section-count success">${approved.length}</span>
            </div>
            ${approved.length > 0 ? `
            <div class="ad-approved-grid">
                ${approved.map((db, i) => `
                    <div class="ad-approved-card" onclick="showApprovedDashboards(${i})" style="cursor:pointer">
                        <div class="ad-approved-strip" ${db.manualDashboardUrl ? 'style="background:linear-gradient(90deg,#6366f1,#8b5cf6)"' : ''}></div>
                        <div class="ad-approved-body">
                            <div class="ad-approved-head">
                                <div class="ad-approved-icon" ${db.manualDashboardUrl ? 'style="background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.08));color:#6366f1"' : ''}>
                                    <i class="fas ${db.manualDashboardUrl ? 'fa-external-link-alt' : 'fa-chart-bar'}"></i>
                                </div>
                                <div>
                                    <h4>${db.title}</h4>
                                    <p>${db.description || 'Business analytics dashboard'}</p>
                                </div>
                            </div>
                            <div class="ad-approved-meta">
                                ${db.manualDashboardUrl
                                    ? '<span style="color:#6366f1;font-weight:600"><i class="fas fa-user-shield"></i> Admin Curated</span>'
                                    : `<span><i class="fas fa-chart-pie"></i> ${db.chartsCount || (db.charts ? db.charts.length : 0)} charts</span>`
                                }
                                <span><i class="fas fa-sync-alt"></i> ${(db.frequency || 'daily').charAt(0).toUpperCase() + (db.frequency || 'daily').slice(1)}</span>
                                <span><i class="fas fa-calendar-check"></i> ${db.approvedAt ? new Date(db.approvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                                ${db.googleSheetUrl ? `<span style="color:${db.linkType === 'sharepoint' ? '#0078d4' : '#34a853'}"><i class="fas ${db.linkType === 'sharepoint' ? 'fa-cloud' : 'fa-link'}"></i> ${db.linkType === 'sharepoint' ? 'SharePoint' : db.linkType === 'google' ? 'Google Sheet' : 'Linked'}</span>` : ''}
                                ${db.syncInterval && db.syncInterval !== 'manual' ? `<span style="color:#6366f1"><i class="fas fa-sync"></i> Auto-sync: ${db.syncInterval}</span>` : ''}
                            </div>
                            <div class="ad-approved-actions" style="display:flex;align-items:center;justify-content:space-between">
                                <div class="ad-approved-cta" style="flex:1">
                                    <span><i class="fas fa-eye"></i> View ${db.manualDashboardUrl ? 'Custom Dashboard' : 'Full Dashboard'}</span>
                                    <i class="fas fa-arrow-right"></i>
                                </div>
                                ${db.googleSheetUrl ? `<button class="ad-sync-btn" onclick="event.stopPropagation(); syncDashboard('${db._id}')" title="Refresh data from linked sheet" style="background:none;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.78rem;color:#6366f1;display:flex;align-items:center;gap:5px;transition:all .2s"><i class="fas fa-sync-alt"></i> Sync</button>` : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : `
            <div class="ad-no-approved">
                <div class="ad-no-approved-icon"><i class="fas fa-chart-area"></i></div>
                <h4>No Approved Dashboards Yet</h4>
                <p>Upload your data above. Once the admin approves your dashboard, it will appear here with interactive charts and KPIs.</p>
            </div>
            `}

            <div class="ad-footer-note">
                <i class="fas fa-shield-alt"></i> Your data is securely processed. Dashboards go through admin approval before being published.
            </div>
        </div>
    </div>`;
}

// ===== UPLOAD MODAL =====
function showAnalyticsUploadView() {
    const modalContent = `
    <div class="ad-upload-modal">
        <div class="ad-upload-modal-header">
            <div class="ad-upload-modal-icon"><i class="fas fa-file-excel"></i></div>
            <div>
                <h3>Upload Your Data</h3>
                <p>Upload a spreadsheet file and/or provide a Google Sheet link to auto-generate a dashboard</p>
            </div>
        </div>
        <form id="ad-upload-form" class="ad-upload-form" onsubmit="handleSheetUpload(event)">
            <div class="ad-form-row">
                <div class="ad-form-group">
                    <label><i class="fas fa-heading"></i> Dashboard Title *</label>
                    <input type="text" id="ad-sheet-title" class="ad-form-input" placeholder="e.g., Monthly Production Report" required>
                </div>
                <div class="ad-form-group">
                    <label><i class="fas fa-database"></i> Data Type</label>
                    <select id="ad-sheet-type" class="ad-form-select">
                        <option value="Production Update">Production Update</option>
                        <option value="Sales Analytics">Sales Analytics</option>
                        <option value="Financial Report">Financial Report</option>
                        <option value="Project Analytics">Project Analytics</option>
                        <option value="Performance Metrics">Performance Metrics</option>
                        <option value="Custom Analysis">Custom Analysis</option>
                    </select>
                </div>
            </div>
            <div class="ad-form-row">
                <div class="ad-form-group">
                    <label><i class="fas fa-sync-alt"></i> Report Frequency</label>
                    <select id="ad-sheet-freq" class="ad-form-select">
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly" selected>Monthly</option>
                        <option value="quarterly">Quarterly</option>
                    </select>
                </div>
                <div class="ad-form-group">
                    <label><i class="fas fa-file-alt"></i> Description</label>
                    <input type="text" id="ad-sheet-desc" class="ad-form-input" placeholder="Brief description of the data...">
                </div>
            </div>

            <!-- Sheet Link (Google Sheets / SharePoint / OneDrive) -->
            <div class="ad-form-group">
                <label><i class="fas fa-link"></i> Sheet Link <span style="font-weight:400;color:#94a3b8">(Google Sheets, SharePoint, or OneDrive)</span></label>
                <div class="ad-gsheet-input-wrap">
                    <div class="ad-gsheet-icon"><i class="fas fa-cloud"></i></div>
                    <input type="url" id="ad-sheet-link" class="ad-form-input ad-gsheet-field" placeholder="Paste Google Sheet, SharePoint, or OneDrive link..." oninput="validateUploadInputs()">
                </div>
                <small class="ad-gsheet-hint"><i class="fas fa-info-circle"></i> Supports Google Sheets, SharePoint (.xlsx), and OneDrive. Make sure the file is shared publicly.</small>
            </div>

            <!-- Auto-Sync Interval -->
            <div class="ad-form-group">
                <label><i class="fas fa-sync-alt"></i> Auto-Sync Interval <span style="font-weight:400;color:#94a3b8">(auto-refresh when sheet is updated)</span></label>
                <select id="ad-sync-interval" class="ad-form-select">
                    <option value="daily" selected>Daily</option>
                    <option value="hourly">Hourly</option>
                    <option value="realtime">Every 5 minutes (Realtime)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="manual">Manual only</option>
                </select>
                <small class="ad-gsheet-hint"><i class="fas fa-info-circle"></i> Dashboard will automatically re-fetch data from the linked sheet at this interval.</small>
            </div>

            <!-- Divider -->
            <div class="ad-upload-divider">
                <span>and / or</span>
            </div>

            <!-- File Upload -->
            <div class="ad-form-group">
                <label><i class="fas fa-cloud-upload-alt"></i> Upload Spreadsheet File <span style="font-weight:400;color:#94a3b8">(for auto-generated dashboard)</span></label>
                <div class="ad-file-drop" id="ad-file-drop" onclick="document.getElementById('ad-sheet-file').click()">
                    <input type="file" id="ad-sheet-file" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFileSelect(this)">
                    <div class="ad-file-drop-content" id="ad-file-drop-content">
                        <i class="fas fa-cloud-upload-alt"></i>
                        <span>Click to browse or drag & drop your file</span>
                        <small>Supported: .xlsx, .xls, .csv (Max 50MB)</small>
                    </div>
                </div>
            </div>
            <div class="ad-upload-actions">
                <button type="submit" class="ad-submit-btn" id="ad-upload-submit-btn">
                    <i class="fas fa-rocket"></i> Submit & Generate Dashboard
                </button>
                <button type="button" class="ad-cancel-btn" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    </div>`;

    if (typeof showGenericModal === 'function') {
        showGenericModal(modalContent, 'max-width: 680px;');
    } else if (typeof showModal === 'function') {
        showModal(modalContent);
    }

    // Drag & drop setup
    setTimeout(() => {
        const dropZone = document.getElementById('ad-file-drop');
        if (!dropZone) return;
        ['dragover', 'dragenter'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.classList.add('dragover'); }));
        ['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); dropZone.classList.remove('dragover'); }));
        dropZone.addEventListener('drop', (ev) => {
            const fileInput = document.getElementById('ad-sheet-file');
            if (ev.dataTransfer.files.length > 0) {
                fileInput.files = ev.dataTransfer.files;
                handleFileSelect(fileInput);
            }
        });
    }, 200);
}

window.handleFileSelect = function(input) {
    const content = document.getElementById('ad-file-drop-content');
    if (input.files && input.files[0]) {
        const f = input.files[0];
        const maxSize = 50 * 1024 * 1024; // 50MB
        const size = f.size > 1024 * 1024 ? (f.size / (1024 * 1024)).toFixed(1) + ' MB' : (f.size / 1024).toFixed(0) + ' KB';

        if (f.size > maxSize) {
            content.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color:#ef4444"></i>
                <span style="font-weight:700;color:#ef4444">${f.name}</span>
                <small style="color:#ef4444">${size} — exceeds 50MB limit</small>
            `;
            document.getElementById('ad-file-drop').classList.remove('has-file');
            document.getElementById('ad-file-drop').classList.add('has-error');
            input.value = '';
            if (typeof showNotification === 'function') showNotification('File exceeds 50MB limit. Please use a smaller file.', 'error');
            return;
        }

        document.getElementById('ad-file-drop').classList.remove('has-error');
        content.innerHTML = `
            <i class="fas fa-file-excel" style="color:#10b981"></i>
            <span style="font-weight:700;color:#1e293b">${f.name}</span>
            <small style="color:#64748b">${size}</small>
        `;
        document.getElementById('ad-file-drop').classList.add('has-file');
    }
};

window.validateUploadInputs = function() {
    const linkInput = document.getElementById('ad-sheet-link');
    const fileInput = document.getElementById('ad-sheet-file');
    const wrap = linkInput ? linkInput.closest('.ad-gsheet-input-wrap') : null;
    if (wrap && linkInput && linkInput.value.trim()) {
        wrap.classList.add('has-link');
    } else if (wrap) {
        wrap.classList.remove('has-link');
    }
};

async function handleSheetUpload(event) {
    event.preventDefault();
    const title = document.getElementById('ad-sheet-title').value.trim();
    const dataType = document.getElementById('ad-sheet-type').value;
    const frequency = document.getElementById('ad-sheet-freq').value;
    const description = document.getElementById('ad-sheet-desc').value.trim();
    const fileInput = document.getElementById('ad-sheet-file');
    const linkInput = document.getElementById('ad-sheet-link');
    const btn = document.getElementById('ad-upload-submit-btn');

    const hasFile = fileInput && fileInput.files && fileInput.files[0];
    const hasLink = linkInput && linkInput.value.trim();
    const syncIntervalSelect = document.getElementById('ad-sync-interval');
    const syncInterval = syncIntervalSelect ? syncIntervalSelect.value : 'daily';

    if (!title) {
        if (typeof showNotification === 'function') showNotification('Please fill in the dashboard title', 'error');
        return;
    }
    if (!hasFile && !hasLink) {
        if (typeof showNotification === 'function') showNotification('Please upload a file or provide a sheet link (Google Sheets, SharePoint, or OneDrive)', 'error');
        return;
    }
    if (hasFile && fileInput.files[0].size > 50 * 1024 * 1024) {
        if (typeof showNotification === 'function') showNotification('File exceeds 50MB limit. Please use a smaller file.', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<div class="ad-btn-spinner"></div> Processing your data...';

    try {
        const formData = new FormData();
        if (hasFile) formData.append('spreadsheet', fileInput.files[0]);
        if (hasLink) formData.append('googleSheetUrl', linkInput.value.trim());
        formData.append('title', title);
        formData.append('dataType', dataType);
        formData.append('frequency', frequency);
        formData.append('description', description);
        if (hasLink) formData.append('syncInterval', syncInterval);

        const response = await window.apiCall('/analysis/upload-sheet', 'POST', formData);

        if (typeof closeModal === 'function') closeModal();
        if (typeof showNotification === 'function') {
            showNotification(`Dashboard auto-generated with ${response.chartsGenerated || 0} charts! Sent to admin for approval.`, 'success');
        }

        // Refresh portal
        await renderAnalyticsPortal();
    } catch (error) {
        console.error('Upload error:', error);
        if (typeof showNotification === 'function') showNotification(error.message || 'Failed to upload. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Submit & Generate Dashboard';
    }
}

async function deletePendingDashboard(id) {
    if (!confirm('Delete this pending dashboard? This action cannot be undone.')) return;
    try {
        await window.apiCall(`/analysis/dashboard/${id}`, 'DELETE');
        if (typeof showNotification === 'function') showNotification('Dashboard deleted', 'success');
        await renderAnalyticsPortal();
    } catch (error) {
        if (typeof showNotification === 'function') showNotification(error.message || 'Failed to delete', 'error');
    }
}

// ===== SYNC DASHBOARD FROM LINKED SHEET =====
window.syncDashboard = async function(id) {
    const btn = document.querySelector(`.ad-sync-btn[onclick*="${id}"]`);
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Syncing...';
    }
    try {
        const result = await window.apiCall(`/analysis/dashboard/${id}/sync`, 'POST');
        if (typeof showNotification === 'function') {
            showNotification(result.dataChanged
                ? 'Dashboard synced! Data has been updated with the latest sheet data.'
                : 'Dashboard synced. No changes detected in the sheet data.',
                result.dataChanged ? 'success' : 'info'
            );
        }
        if (result.dataChanged) await renderAnalyticsPortal();
    } catch (error) {
        if (typeof showNotification === 'function') showNotification(error.message || 'Failed to sync dashboard', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Sync';
        }
    }
};

// ===== DASHBOARD STATUS DETAIL VIEW =====
function showDashboardStatus(dashboardId) {
    const db = analyticsState.allDashboards.find(d => d._id === dashboardId);
    if (!db) return;

    const statusConfig = {
        pending: { icon: 'fa-hourglass-half', color: '#f59e0b', bg: 'rgba(245,158,11,.08)', label: 'Pending Review', desc: 'Your dashboard is being reviewed by the admin team. You will be notified once a decision is made.' },
        approved: { icon: 'fa-check-circle', color: '#10b981', bg: 'rgba(16,185,129,.08)', label: 'Approved', desc: 'Your dashboard has been approved and is ready to view.' },
        rejected: { icon: 'fa-times-circle', color: '#ef4444', bg: 'rgba(239,68,68,.08)', label: 'Rejected', desc: 'Your dashboard was not approved. You may re-upload with updated data.' }
    };
    const sc = statusConfig[db.status] || statusConfig.pending;

    const modalContent = `
    <div class="ad-upload-modal" style="max-width:520px">
        <div style="text-align:center;padding:20px 0 10px">
            <div style="width:72px;height:72px;border-radius:22px;background:${sc.bg};display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:1.8rem;color:${sc.color}">
                <i class="fas ${sc.icon}"></i>
            </div>
            <h3 style="margin:0 0 6px;font-size:1.2rem;font-weight:800;color:#0f172a">${db.title}</h3>
            <span style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:20px;font-size:.78rem;font-weight:700;color:${sc.color};background:${sc.bg};text-transform:uppercase;letter-spacing:.03em">
                <i class="fas ${sc.icon}"></i> ${sc.label}
            </span>
        </div>
        <div style="background:#f8fafc;border-radius:14px;padding:18px;margin:16px 0;font-size:.88rem;color:#475569;line-height:1.7;text-align:center">
            ${sc.desc}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:16px 0">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Charts</div>
                <div style="font-size:1.3rem;font-weight:800;color:#0f172a">${db.chartsCount || (db.charts ? db.charts.length : 0)}</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Frequency</div>
                <div style="font-size:1.3rem;font-weight:800;color:#0f172a">${(db.frequency || 'daily').charAt(0).toUpperCase() + (db.frequency || 'daily').slice(1)}</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Submitted</div>
                <div style="font-size:.88rem;font-weight:700;color:#0f172a">${new Date(db.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;text-align:center">
                <div style="font-size:.72rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px">Source</div>
                <div style="font-size:.88rem;font-weight:700;color:#0f172a">${db.fileName ? 'File Upload' : db.googleSheetUrl ? 'Google Sheet' : 'N/A'}</div>
            </div>
        </div>
        ${db.description ? `<div style="font-size:.85rem;color:#64748b;padding:0 4px;margin-bottom:12px"><strong>Description:</strong> ${db.description}</div>` : ''}
        ${db.googleSheetUrl ? `<div style="font-size:.82rem;color:#34a853;display:flex;align-items:center;gap:6px;margin-bottom:12px;padding:0 4px"><i class="fab fa-google-drive"></i> Google Sheet linked</div>` : ''}
        ${db.status === 'approved' ? `
            <button class="ad-submit-btn" style="width:100%;margin-top:4px" onclick="closeModal();showApprovedDashboards(${analyticsState.approvedDashboards.findIndex(d => d._id === db._id)})">
                <i class="fas fa-eye"></i> View Dashboard
            </button>
        ` : db.status === 'pending' ? `
            <div style="text-align:center;padding-top:8px">
                <button class="ad-cancel-btn" onclick="closeModal()" style="min-width:120px">Close</button>
                <button style="margin-left:8px;background:none;border:1px solid #fca5a5;color:#dc2626;padding:10px 20px;border-radius:12px;font-weight:600;cursor:pointer;font-size:.85rem" onclick="closeModal();deletePendingDashboard('${db._id}')">
                    <i class="fas fa-trash-alt"></i> Cancel Request
                </button>
            </div>
        ` : `
            <button class="ad-cancel-btn" style="width:100%;margin-top:4px" onclick="closeModal()">Close</button>
        `}
    </div>`;

    if (typeof showGenericModal === 'function') {
        showGenericModal(modalContent, 'max-width: 520px;');
    } else if (typeof showModal === 'function') {
        showModal(modalContent);
    }
}

// ===== APPROVED DASHBOARD VIEWER =====
async function showApprovedDashboards(index) {
    // Fetch full approved dashboards with chart data
    const container = document.getElementById('app-container');
    container.innerHTML = `
    <div class="ad-portal">
        <div class="ad-loading-screen">
            <div class="ad-loading-orb">
                <div class="ad-orb-ring"></div><div class="ad-orb-ring"></div><div class="ad-orb-ring"></div>
                <i class="fas fa-chart-bar ad-orb-icon"></i>
            </div>
            <h3>Loading Dashboard</h3>
            <p>Rendering your analytics...</p>
            <div class="ad-loading-bar"><div class="ad-loading-fill"></div></div>
        </div>
    </div>`;

    try {
        const response = await window.apiCall('/analysis/dashboards', 'GET');
        analyticsState.approvedDashboards = response.dashboards || [];
    } catch (error) {
        console.error('Failed to fetch dashboards:', error);
        analyticsState.approvedDashboards = [];
    }

    if (analyticsState.approvedDashboards.length === 0) {
        await renderAnalyticsPortal();
        return;
    }

    const idx = Math.min(index || 0, analyticsState.approvedDashboards.length - 1);
    analyticsState.activeDashboard = analyticsState.approvedDashboards[idx];

    // For link-based dashboards with no/empty charts, fetch live data from the linked sheet
    const db = analyticsState.activeDashboard;
    if (db && db.googleSheetUrl && (!db.charts || db.charts.length === 0)) {
        try {
            console.log('[ANALYTICS] Fetching live data for linked dashboard:', db._id);
            const liveData = await window.apiCall(`/analysis/dashboard/${db._id}/live-data`, 'GET');
            if (liveData.charts && liveData.charts.length > 0) {
                db.charts = liveData.charts;
                db.predictiveAnalysis = liveData.predictiveAnalysis || db.predictiveAnalysis;
                db.sheetNames = liveData.sheetNames || db.sheetNames;
            }
        } catch (liveErr) {
            console.error('[ANALYTICS] Live data fetch failed:', liveErr.message);
        }
    }

    // Destroy old charts
    Object.values(analyticsState.charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    analyticsState.charts = {};

    container.innerHTML = getDashboardViewHTML();
    initializeDashboardCharts();
}

async function refreshAnalyticsDashboards() {
    analyticsState.activeDashboard = null;
    await renderAnalyticsPortal();
    if (typeof showNotification === 'function') showNotification('Dashboards refreshed', 'success');
}

async function switchAnalyticsDashboard(index) {
    analyticsState.activeDashboard = analyticsState.approvedDashboards[index];

    // For link-based dashboards, fetch live data if charts are empty
    const db = analyticsState.activeDashboard;
    if (db && db.googleSheetUrl && (!db.charts || db.charts.length === 0)) {
        try {
            const liveData = await window.apiCall(`/analysis/dashboard/${db._id}/live-data`, 'GET');
            if (liveData.charts && liveData.charts.length > 0) {
                db.charts = liveData.charts;
                db.predictiveAnalysis = liveData.predictiveAnalysis || db.predictiveAnalysis;
            }
        } catch (e) { console.error('[ANALYTICS] Live data fetch failed:', e.message); }
    }

    Object.values(analyticsState.charts).forEach(c => { if (c && c.destroy) c.destroy(); });
    analyticsState.charts = {};
    document.getElementById('app-container').innerHTML = getDashboardViewHTML();
    initializeDashboardCharts();
}

function getDashboardViewHTML() {
    const db = analyticsState.activeDashboard;
    if (!db) return '<div class="ad-portal"><p>No dashboard found.</p></div>';

    const hasManualUrl = db.manualDashboardUrl && db.manualDashboardUrl.trim();

    // Dashboard selector tabs
    let selectorHTML = '';
    if (analyticsState.approvedDashboards.length > 1) {
        selectorHTML = `<div class="ad-db-selector">${analyticsState.approvedDashboards.map((d, i) =>
            `<button class="ad-db-tab ${d._id === db._id ? 'active' : ''}" onclick="switchAnalyticsDashboard(${i})">
                <i class="fas fa-chart-pie"></i> ${d.title || 'Dashboard ' + (i+1)}
                ${d.manualDashboardUrl ? '<span class="ad-db-tab-link-badge"><i class="fas fa-external-link-alt"></i></span>' : ''}
            </button>`
        ).join('')}</div>`;
    }

    // If admin provided a manual dashboard URL, show that instead of auto-generated charts
    if (hasManualUrl) {
        return `
        <div class="ad-portal">
            <div class="ad-hero-header">
                <div class="ad-hero-bg"><div class="ad-hero-gradient"></div><div class="ad-hero-pattern"></div>
                    <div class="ad-hero-orb ad-hero-orb-1"></div><div class="ad-hero-orb ad-hero-orb-2"></div></div>
                <div class="ad-hero-content">
                    <div class="ad-hero-left">
                        <div class="ad-hero-icon-box"><i class="fas fa-chart-bar"></i></div>
                        <div class="ad-hero-text">
                            <h1>${db.title || 'Analytics Dashboard'}</h1>
                            <p>Custom dashboard curated by your admin team</p>
                        </div>
                    </div>
                    <div class="ad-hero-right">
                        <button class="ad-hero-btn" onclick="renderAnalyticsPortal()"><i class="fas fa-arrow-left"></i> Back to Portal</button>
                        <a href="${db.manualDashboardUrl}" target="_blank" rel="noopener" class="ad-hero-btn" style="text-decoration:none"><i class="fas fa-external-link-alt"></i> Open in New Tab</a>
                    </div>
                </div>
            </div>
            ${selectorHTML}
            <div class="ad-content">
                <div class="ad-dashboard-bar">
                    <div class="ad-dashboard-info">
                        <div class="ad-dashboard-icon" style="background:linear-gradient(135deg,#10b981,#059669)"><i class="fas fa-external-link-alt"></i></div>
                        <div>
                            <h2>${db.title || 'Dashboard'}</h2>
                            ${db.description ? `<p class="ad-dashboard-desc">${db.description}</p>` : ''}
                        </div>
                    </div>
                    <div class="ad-dashboard-meta-pills">
                        <div class="ad-meta-pill frequency"><i class="fas fa-sync-alt"></i> ${(db.frequency || 'daily').charAt(0).toUpperCase() + (db.frequency || 'daily').slice(1)}</div>
                        <div class="ad-meta-pill date"><i class="fas fa-calendar-check"></i> ${new Date(db.approvedAt || db.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div class="ad-meta-pill charts" style="color:#10b981"><i class="fas fa-user-shield"></i> Admin Curated</div>
                    </div>
                </div>
                <div class="ad-external-dashboard">
                    <iframe src="${db.manualDashboardUrl}" class="ad-external-iframe" frameborder="0" allowfullscreen loading="lazy"></iframe>
                    <div class="ad-external-fallback">
                        <div class="ad-external-fallback-icon"><i class="fas fa-external-link-alt"></i></div>
                        <h4>Your Dashboard is Ready</h4>
                        <p>If the dashboard doesn't load above, click below to open it directly.</p>
                        <a href="${db.manualDashboardUrl}" target="_blank" rel="noopener" class="ad-external-open-btn">
                            <i class="fas fa-external-link-alt"></i> Open Dashboard
                        </a>
                    </div>
                </div>
                <div class="ad-footer-note"><i class="fas fa-shield-alt"></i> Dashboard curated and approved by your admin team.</div>
            </div>
        </div>`;
    }

    // Auto-generated dashboard with charts, KPIs, data table
    // KPIs
    let allKpis = [];
    (db.charts || []).forEach(chart => { if (chart.kpis) allKpis = allKpis.concat(chart.kpis); });
    const topKpis = allKpis.slice(0, 8);

    const kpisHTML = topKpis.map((kpi, i) => {
        const color = CHART_SOLIDS[i % CHART_SOLIDS.length];
        const trendUp = kpi.trend >= 0;
        return `
        <div class="ad-kpi-card" style="--kpi-accent: ${color}; animation-delay: ${i * 0.08}s">
            <div class="ad-kpi-header">
                <div class="ad-kpi-icon-wrap" style="background: ${CHART_COLORS[i % CHART_COLORS.length].bg}; color: ${color}">
                    <i class="fas ${getKpiIcon(kpi.label)}"></i>
                </div>
                <div class="ad-kpi-trend-badge ${trendUp ? 'up' : 'down'}">
                    <i class="fas fa-arrow-${trendUp ? 'up' : 'down'}"></i> ${Math.abs(kpi.trend).toFixed(1)}%
                </div>
            </div>
            <div class="ad-kpi-body">
                <div class="ad-kpi-number">${formatKpiValue(kpi.total)}</div>
                <div class="ad-kpi-title">${kpi.label}</div>
            </div>
            <div class="ad-kpi-footer">
                <div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Avg</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.avg)}</span></div>
                <div class="ad-kpi-divider"></div>
                ${kpi.median !== undefined ? `<div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Median</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.median)}</span></div><div class="ad-kpi-divider"></div>` : ''}
                <div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Max</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.max)}</span></div>
                ${kpi.min !== undefined ? `<div class="ad-kpi-divider"></div><div class="ad-kpi-stat"><span class="ad-kpi-stat-label">Min</span><span class="ad-kpi-stat-val">${formatKpiValue(kpi.min)}</span></div>` : ''}
            </div>
            ${kpi.growthRate !== undefined ? `<div class="ad-kpi-growth" style="margin-top:6px;font-size:11px;color:${kpi.growthRate >= 0 ? '#10b981' : '#ef4444'};text-align:center;">
                <i class="fas fa-chart-line"></i> Growth: ${kpi.growthRate >= 0 ? '+' : ''}${kpi.growthRate.toFixed(1)}%${kpi.peakLabel ? ` &middot; Peak: ${kpi.peakLabel}` : ''}
            </div>` : ''}
            <div class="ad-kpi-glow" style="background: ${color}"></div>
        </div>`;
    }).join('');

    // Charts
    const chartsHTML = (db.charts || []).map((chart, idx) => `
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
                        <option value="line" ${chart.chartType === 'line' ? 'selected' : ''}>Line</option>
                        <option value="bar" ${chart.chartType === 'bar' ? 'selected' : ''}>Bar</option>
                        <option value="doughnut" ${chart.chartType === 'doughnut' ? 'selected' : ''}>Doughnut</option>
                        <option value="radar" ${chart.chartType === 'radar' ? 'selected' : ''}>Radar</option>
                        <option value="polarArea" ${chart.chartType === 'polarArea' ? 'selected' : ''}>Polar</option>
                    </select>
                    <button class="ad-chart-action-btn" onclick="toggleFullscreenChart(${idx})" title="Fullscreen"><i class="fas fa-expand"></i></button>
                    <button class="ad-chart-action-btn" onclick="exportChartImage(${idx})" title="Download"><i class="fas fa-download"></i></button>
                </div>
            </div>
            <div class="ad-chart-body"><canvas id="ad-chart-${idx}"></canvas></div>
        </div>`).join('');

    // Data Table
    const firstChart = db.charts && db.charts[0];
    let tableHTML = '';
    if (firstChart) {
        const maxRows = Math.min(firstChart.labels.length, 20);
        tableHTML = `
        <div class="ad-data-panel">
            <div class="ad-data-header">
                <div class="ad-data-title"><i class="fas fa-database"></i><h3>Data Preview</h3><span class="ad-data-sheet-name">${firstChart.sheetName}</span></div>
                <span class="ad-data-count"><i class="fas fa-list-ol"></i> ${firstChart.rowCount} rows</span>
            </div>
            <div class="ad-table-container">
                <table class="ad-premium-table">
                    <thead><tr><th class="ad-th-index">#</th><th>${firstChart.labelColumn}</th>${firstChart.dataColumns.map(c => `<th class="ad-th-value">${c}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${firstChart.labels.slice(0, maxRows).map((label, ri) => `
                            <tr><td class="ad-td-index">${ri + 1}</td><td class="ad-td-label">${label}</td>${firstChart.datasets.map(ds => `<td class="ad-td-value">${formatKpiValue(ds.data[ri])}</td>`).join('')}</tr>
                        `).join('')}
                        ${firstChart.rowCount > maxRows ? `<tr><td colspan="${firstChart.dataColumns.length + 2}" class="ad-td-more"><i class="fas fa-ellipsis-h"></i> ${firstChart.rowCount - maxRows} more rows</td></tr>` : ''}
                    </tbody>
                </table>
            </div>
        </div>`;
    }

    const totalCharts = (db.charts || []).length;
    const totalRecords = (db.charts || []).reduce((sum, c) => sum + (c.rowCount || 0), 0);
    const pa = db.predictiveAnalysis;

    // === PREDICTIVE ANALYSIS SECTION ===
    let predictiveHTML = '';
    if (pa) {
        // AI Insights
        const insightsHTML = (pa.insights || []).length > 0 ? `
        <div class="ad-pa-section">
            <div class="ad-pa-section-head"><i class="fas fa-brain"></i><h3>AI-Powered Insights</h3></div>
            <div class="ad-insights-grid">
                ${pa.insights.map(ins => `
                    <div class="ad-insight-card ad-insight-${ins.type}">
                        <div class="ad-insight-icon"><i class="fas ${ins.type === 'positive' ? 'fa-arrow-trend-up' : ins.type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
                        <p>${ins.text}</p>
                    </div>
                `).join('')}
            </div>
        </div>` : '';

        // Forecasts
        const forecastsHTML = (pa.forecasts || []).length > 0 ? `
        <div class="ad-pa-section">
            <div class="ad-pa-section-head"><i class="fas fa-crystal-ball"></i><h3>Predictive Forecasts</h3><span class="ad-pa-badge">Linear Regression</span></div>
            <div class="ad-forecast-grid">
                ${pa.forecasts.map((fc, fi) => `
                    <div class="ad-forecast-card">
                        <div class="ad-forecast-head">
                            <span class="ad-forecast-col">${fc.column}</span>
                            <span class="ad-forecast-r2" title="R-squared: ${fc.regression.rSquared}">R&sup2; = ${fc.regression.rSquared}</span>
                        </div>
                        <div class="ad-forecast-body">
                            <div class="ad-forecast-direction ${fc.regression.slope >= 0 ? 'up' : 'down'}">
                                <i class="fas fa-arrow-${fc.regression.slope >= 0 ? 'up' : 'down'}"></i>
                                <span>${fc.regression.slope >= 0 ? 'Upward' : 'Downward'} Trend</span>
                                <small>slope: ${fc.regression.slope}/period</small>
                            </div>
                            <div class="ad-forecast-values">
                                ${fc.values.map((v, vi) => `<div class="ad-forecast-val"><span class="ad-fv-label">Period +${vi + 1}</span><span class="ad-fv-num">${formatKpiValue(v)}</span></div>`).join('')}
                            </div>
                        </div>
                        <canvas id="ad-forecast-chart-${fi}" style="height:120px;margin-top:12px"></canvas>
                    </div>
                `).join('')}
            </div>
        </div>` : '';

        // Correlation Matrix
        const corrHTML = pa.correlations && pa.correlations.columns.length >= 2 ? `
        <div class="ad-pa-section">
            <div class="ad-pa-section-head"><i class="fas fa-project-diagram"></i><h3>Correlation Matrix</h3><span class="ad-pa-badge">Pearson r</span></div>
            <div class="ad-corr-wrap">
                <table class="ad-corr-table">
                    <thead><tr><th></th>${pa.correlations.columns.map(c => `<th title="${c}">${c.length > 12 ? c.substring(0, 10) + '..' : c}</th>`).join('')}</tr></thead>
                    <tbody>
                        ${pa.correlations.matrix.map((row, ri) => `
                            <tr><td class="ad-corr-label">${pa.correlations.columns[ri].length > 12 ? pa.correlations.columns[ri].substring(0, 10) + '..' : pa.correlations.columns[ri]}</td>
                            ${row.map((val, ci) => {
                                const abs = Math.abs(val);
                                const bg = ri === ci ? 'rgba(99,102,241,.15)' : val > 0 ? `rgba(16,185,129,${abs * 0.4})` : `rgba(239,68,68,${abs * 0.4})`;
                                return `<td style="background:${bg};font-weight:${abs > 0.7 ? 700 : 400};color:${abs > 0.5 ? '#1e293b' : '#64748b'}" title="${pa.correlations.columns[ri]} vs ${pa.correlations.columns[ci]}">${val.toFixed(2)}</td>`;
                            }).join('')}</tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${pa.correlations.insights.length > 0 ? `
                <div class="ad-corr-insights">
                    ${pa.correlations.insights.slice(0, 4).map(ins => `
                        <div class="ad-corr-insight"><i class="fas fa-link" style="color:${ins.direction === 'positive' ? '#10b981' : '#ef4444'}"></i>
                        <strong>${ins.col1}</strong> &harr; <strong>${ins.col2}</strong>: ${ins.strength} ${ins.direction} (r=${ins.correlation})</div>
                    `).join('')}
                </div>` : ''}
        </div>` : '';

        // Anomalies
        const anomalyHTML = (pa.anomalies || []).length > 0 ? `
        <div class="ad-pa-section">
            <div class="ad-pa-section-head"><i class="fas fa-exclamation-triangle"></i><h3>Anomaly Detection</h3><span class="ad-pa-badge">Z-Score Method</span></div>
            <div class="ad-anomaly-grid">
                ${pa.anomalies.map(ag => ag.anomalies.map(a => `
                    <div class="ad-anomaly-card ad-anomaly-${a.type}">
                        <div class="ad-anomaly-type"><i class="fas fa-${a.type === 'high' ? 'arrow-up' : 'arrow-down'}"></i> ${a.type.toUpperCase()}</div>
                        <div class="ad-anomaly-detail">
                            <span class="ad-anomaly-col">${ag.column}</span>
                            <span class="ad-anomaly-label">${a.label}</span>
                            <span class="ad-anomaly-val">${formatKpiValue(a.value)}</span>
                            <span class="ad-anomaly-z">Z=${a.zScore}</span>
                        </div>
                    </div>
                `).join('')).join('')}
            </div>
        </div>` : '';

        // Seasonality
        const seasonHTML = pa.seasonality ? `
        <div class="ad-pa-section ad-pa-seasonality">
            <div class="ad-pa-section-head"><i class="fas fa-calendar-alt"></i><h3>Seasonality Detected</h3></div>
            <div class="ad-season-badge"><i class="fas fa-wave-square"></i> ${pa.seasonality.label} cycle (period: ${pa.seasonality.period}, strength: ${(pa.seasonality.strength * 100).toFixed(0)}%)</div>
        </div>` : '';

        predictiveHTML = `
        <div class="ad-predictive-analysis" id="ad-predictive-section">
            <div class="ad-pa-title-bar">
                <div class="ad-pa-title"><i class="fas fa-brain"></i><h2>Predictive Analysis & Intelligence</h2></div>
                <span class="ad-pa-powered">Powered by SteelConnect AI Engine</span>
            </div>
            ${insightsHTML}${forecastsHTML}${corrHTML}${anomalyHTML}${seasonHTML}
        </div>`;
    }

    return `
    <div class="ad-portal" id="ad-portal-root">
        <div class="ad-hero-header">
            <div class="ad-hero-bg"><div class="ad-hero-gradient"></div><div class="ad-hero-pattern"></div>
                <div class="ad-hero-orb ad-hero-orb-1"></div><div class="ad-hero-orb ad-hero-orb-2"></div></div>
            <div class="ad-hero-content">
                <div class="ad-hero-left">
                    <div class="ad-hero-icon-box"><i class="fas fa-chart-bar"></i></div>
                    <div class="ad-hero-text">
                        <h1>${db.title || 'Analytics Dashboard'}</h1>
                        <p>Real-time business intelligence &middot; ${totalCharts} charts &middot; ${formatKpiValue(totalRecords)} records${pa ? ' &middot; AI Insights' : ''}</p>
                    </div>
                </div>
                <div class="ad-hero-right">
                    <button class="ad-hero-btn" onclick="renderAnalyticsPortal()"><i class="fas fa-arrow-left"></i> Back</button>
                    <button class="ad-hero-btn" onclick="exportDashboardPDF()" id="ad-pdf-btn"><i class="fas fa-file-pdf"></i> Download PDF</button>
                    <button class="ad-hero-btn" onclick="showApprovedDashboards(0)"><i class="fas fa-sync-alt"></i> Refresh</button>
                </div>
            </div>
        </div>
        ${selectorHTML}
        <div class="ad-content" id="ad-content-root">
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
                    <div class="ad-meta-pill" style="color:#10b981"><i class="fas fa-magic"></i> Auto-Generated</div>
                    ${pa ? '<div class="ad-meta-pill" style="color:#8b5cf6"><i class="fas fa-brain"></i> AI Insights</div>' : ''}
                </div>
            </div>
            ${topKpis.length > 0 ? `<div class="ad-kpi-grid">${kpisHTML}</div>` : ''}
            <div class="ad-charts-grid">${chartsHTML}</div>
            ${predictiveHTML}
            ${tableHTML}
            <div class="ad-footer-note"><i class="fas fa-shield-alt"></i> Data uploaded by you, reviewed and approved by your admin team. Analysis generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.</div>
        </div>
    </div>`;
}

// ===== HERO HEADER =====
function getHeroHeader() {
    const count = analyticsState.approvedDashboards.length;
    return `
    <div class="ad-hero-header">
        <div class="ad-hero-bg"><div class="ad-hero-gradient"></div><div class="ad-hero-pattern"></div>
            <div class="ad-hero-orb ad-hero-orb-1"></div><div class="ad-hero-orb ad-hero-orb-2"></div><div class="ad-hero-orb ad-hero-orb-3"></div></div>
        <div class="ad-hero-content">
            <div class="ad-hero-left">
                <div class="ad-hero-icon-box"><i class="fas fa-chart-bar"></i></div>
                <div class="ad-hero-text">
                    <h1>Analytics Portal</h1>
                    <p>Upload data, track approvals, view premium dashboards &middot; ${count} approved report${count !== 1 ? 's' : ''}</p>
                </div>
            </div>
            <div class="ad-hero-right">
                <button class="ad-hero-btn" onclick="renderAnalyticsPortal()"><i class="fas fa-sync-alt"></i> Refresh</button>
            </div>
        </div>
    </div>`;
}

// ===== HELPERS =====
function getKpiIcon(label) {
    const l = label.toLowerCase();
    if (l.includes('revenue') || l.includes('sales') || l.includes('amount') || l.includes('price') || l.includes('cost') || l.includes('profit')) return 'fa-dollar-sign';
    if (l.includes('production') || l.includes('output') || l.includes('quantity') || l.includes('qty')) return 'fa-industry';
    if (l.includes('client') || l.includes('customer') || l.includes('user') || l.includes('employee')) return 'fa-users';
    if (l.includes('order') || l.includes('project') || l.includes('task')) return 'fa-clipboard-list';
    if (l.includes('weight') || l.includes('ton') || l.includes('kg')) return 'fa-weight-hanging';
    if (l.includes('rate') || l.includes('percent') || l.includes('efficiency')) return 'fa-percentage';
    if (l.includes('time') || l.includes('hour') || l.includes('duration') || l.includes('days')) return 'fa-clock';
    if (l.includes('delivery') || l.includes('ship')) return 'fa-truck';
    if (l.includes('inventory') || l.includes('stock')) return 'fa-warehouse';
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

function toggleFullscreenChart(idx) {
    const card = document.querySelectorAll('.ad-chart-card')[idx];
    if (!card) return;
    card.classList.toggle('ad-fullscreen');
    const icon = card.querySelector('.ad-chart-action-btn i.fa-expand, .ad-chart-action-btn i.fa-compress');
    if (icon) icon.className = card.classList.contains('ad-fullscreen') ? 'fas fa-compress' : 'fas fa-expand';
    setTimeout(() => { if (analyticsState.charts[idx]) analyticsState.charts[idx].resize(); }, 300);
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

// ===== PDF EXPORT =====
window.exportDashboardPDF = async function() {
    const db = analyticsState.activeDashboard;
    if (!db) return;
    const btn = document.getElementById('ad-pdf-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...'; }

    try {
        // Dynamically load jsPDF if not loaded
        if (typeof window.jspdf === 'undefined') {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
                s.onload = resolve; s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const W = 210, H = 297, M = 15;
        let y = M;

        // === HEADER ===
        pdf.setFillColor(30, 41, 59);
        pdf.rect(0, 0, W, 40, 'F');
        pdf.setFillColor(99, 102, 241);
        pdf.rect(0, 38, W, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(22); pdf.setFont(undefined, 'bold');
        pdf.text(db.title || 'Analytics Dashboard', M, 18);
        pdf.setFontSize(10); pdf.setFont(undefined, 'normal');
        pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}  |  Frequency: ${db.frequency || 'daily'}  |  ${(db.charts || []).length} charts`, M, 28);
        if (db.description) { pdf.setFontSize(9); pdf.text(db.description.substring(0, 100), M, 34); }
        y = 48;

        // === KPI SUMMARY ===
        const allKpis = [];
        (db.charts || []).forEach(c => { if (c.kpis) allKpis.push(...c.kpis); });
        if (allKpis.length > 0) {
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(14); pdf.setFont(undefined, 'bold');
            pdf.text('Key Performance Indicators', M, y); y += 8;
            const kpiCols = Math.min(allKpis.length, 4);
            const kpiW = (W - M * 2) / kpiCols;
            allKpis.slice(0, 8).forEach((kpi, i) => {
                const col = i % kpiCols;
                const row = Math.floor(i / kpiCols);
                const kx = M + col * kpiW;
                const ky = y + row * 28;
                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(kx, ky, kpiW - 4, 24, 3, 3, 'F');
                pdf.setFontSize(14); pdf.setFont(undefined, 'bold');
                pdf.setTextColor(30, 41, 59);
                pdf.text(formatKpiValue(kpi.total), kx + 4, ky + 10);
                pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
                pdf.setTextColor(100, 116, 139);
                pdf.text(kpi.label.substring(0, 20), kx + 4, ky + 16);
                const trendColor = kpi.trend >= 0 ? [16, 185, 129] : [239, 68, 68];
                pdf.setTextColor(...trendColor);
                pdf.text(`${kpi.trend >= 0 ? '+' : ''}${kpi.trend}%`, kx + 4, ky + 21);
            });
            y += Math.ceil(Math.min(allKpis.length, 8) / kpiCols) * 28 + 8;
        }

        // === CHARTS ===
        const charts = db.charts || [];
        for (let idx = 0; idx < charts.length; idx++) {
            const canvas = document.getElementById(`ad-chart-${idx}`);
            if (!canvas) continue;
            if (y + 90 > H - M) { pdf.addPage(); y = M; }
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(11); pdf.setFont(undefined, 'bold');
            pdf.text(charts[idx].customTitle || charts[idx].sheetName || `Chart ${idx + 1}`, M, y);
            pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
            pdf.setTextColor(100, 116, 139);
            pdf.text(`${charts[idx].chartType} | ${charts[idx].rowCount} records | ${charts[idx].dataColumns.length} metrics`, M + 100, y);
            y += 4;
            try {
                const imgData = canvas.toDataURL('image/png', 0.92);
                const imgW = W - M * 2;
                const imgH = 70;
                pdf.addImage(imgData, 'PNG', M, y, imgW, imgH);
                y += imgH + 8;
            } catch (e) { y += 10; }
        }

        // === PREDICTIVE ANALYSIS ===
        const pa = db.predictiveAnalysis;
        if (pa) {
            if (y + 30 > H - M) { pdf.addPage(); y = M; }
            pdf.setFillColor(99, 102, 241);
            pdf.rect(M, y, W - M * 2, 8, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(12); pdf.setFont(undefined, 'bold');
            pdf.text('Predictive Analysis & Intelligence', M + 4, y + 6);
            y += 14;

            // Insights
            if (pa.insights && pa.insights.length > 0) {
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
                pdf.text('AI Insights', M, y); y += 6;
                pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
                for (const ins of pa.insights.slice(0, 6)) {
                    if (y + 8 > H - M) { pdf.addPage(); y = M; }
                    const icon = ins.type === 'positive' ? '+' : ins.type === 'warning' ? '!' : 'i';
                    const color = ins.type === 'positive' ? [16, 185, 129] : ins.type === 'warning' ? [245, 158, 11] : [99, 102, 241];
                    pdf.setTextColor(...color);
                    pdf.text(`[${icon}]`, M, y);
                    pdf.setTextColor(51, 65, 85);
                    pdf.text(ins.text.substring(0, 120), M + 8, y);
                    y += 6;
                }
                y += 4;
            }

            // Forecasts
            if (pa.forecasts && pa.forecasts.length > 0) {
                if (y + 20 > H - M) { pdf.addPage(); y = M; }
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
                pdf.text('Forecasts (Linear Regression)', M, y); y += 6;
                pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
                for (const fc of pa.forecasts.slice(0, 4)) {
                    if (y + 12 > H - M) { pdf.addPage(); y = M; }
                    pdf.setTextColor(99, 102, 241);
                    pdf.text(fc.column, M, y);
                    pdf.setTextColor(100, 116, 139);
                    pdf.text(`  Slope: ${fc.regression.slope}  |  R²: ${fc.regression.rSquared}  |  Next: ${fc.values.slice(0, 3).map(v => formatKpiValue(v)).join(', ')}`, M + 40, y);
                    y += 5;
                }
                // Render forecast chart images
                for (let fi = 0; fi < Math.min(pa.forecasts.length, 3); fi++) {
                    const fCanvas = document.getElementById(`ad-forecast-chart-${fi}`);
                    if (fCanvas) {
                        if (y + 50 > H - M) { pdf.addPage(); y = M; }
                        try { pdf.addImage(fCanvas.toDataURL('image/png', 0.9), 'PNG', M, y, W - M * 2, 40); y += 44; } catch (e) {}
                    }
                }
                y += 4;
            }

            // Correlation insights
            if (pa.correlations && pa.correlations.insights.length > 0) {
                if (y + 15 > H - M) { pdf.addPage(); y = M; }
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
                pdf.text('Correlations', M, y); y += 6;
                pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
                for (const ci of pa.correlations.insights.slice(0, 5)) {
                    pdf.setTextColor(51, 65, 85);
                    pdf.text(`${ci.col1} <-> ${ci.col2}: ${ci.strength} ${ci.direction} (r=${ci.correlation})`, M, y);
                    y += 5;
                }
                y += 4;
            }

            // Anomalies
            if (pa.anomalies && pa.anomalies.length > 0) {
                if (y + 15 > H - M) { pdf.addPage(); y = M; }
                pdf.setTextColor(30, 41, 59);
                pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
                pdf.text('Anomalies Detected', M, y); y += 6;
                pdf.setFontSize(8); pdf.setFont(undefined, 'normal');
                for (const ag of pa.anomalies.slice(0, 3)) {
                    for (const a of ag.anomalies.slice(0, 3)) {
                        if (y + 6 > H - M) { pdf.addPage(); y = M; }
                        pdf.setTextColor(a.type === 'high' ? 239 : 59, a.type === 'high' ? 68 : 130, a.type === 'high' ? 68 : 246);
                        pdf.text(`[${a.type.toUpperCase()}] ${ag.column} at "${a.label}": ${formatKpiValue(a.value)} (Z=${a.zScore})`, M, y);
                        y += 5;
                    }
                }
            }
        }

        // === DATA TABLE ===
        const firstChart = charts[0];
        if (firstChart) {
            if (y + 30 > H - M) { pdf.addPage(); y = M; }
            pdf.setTextColor(30, 41, 59);
            pdf.setFontSize(10); pdf.setFont(undefined, 'bold');
            pdf.text(`Data Table: ${firstChart.sheetName} (${firstChart.rowCount} rows)`, M, y); y += 6;
            pdf.setFontSize(7); pdf.setFont(undefined, 'normal');
            const cols = [firstChart.labelColumn, ...firstChart.dataColumns.slice(0, 5)];
            const colW = (W - M * 2) / cols.length;
            // Header
            pdf.setFillColor(241, 245, 249);
            pdf.rect(M, y, W - M * 2, 6, 'F');
            pdf.setTextColor(51, 65, 85); pdf.setFont(undefined, 'bold');
            cols.forEach((c, ci) => pdf.text(c.substring(0, 15), M + ci * colW + 2, y + 4));
            y += 7; pdf.setFont(undefined, 'normal');
            const maxRows = Math.min(firstChart.labels.length, 25);
            for (let ri = 0; ri < maxRows; ri++) {
                if (y + 5 > H - M) { pdf.addPage(); y = M; }
                if (ri % 2 === 0) { pdf.setFillColor(248, 250, 252); pdf.rect(M, y - 1, W - M * 2, 5, 'F'); }
                pdf.setTextColor(51, 65, 85);
                pdf.text(String(firstChart.labels[ri] || '').substring(0, 18), M + 2, y + 3);
                firstChart.datasets.slice(0, 5).forEach((ds, di) => {
                    pdf.text(String(formatKpiValue(ds.data[ri])), M + (di + 1) * colW + 2, y + 3);
                });
                y += 5;
            }
        }

        // === FOOTER ===
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
            pdf.text(`SteelConnect Analytics Report  |  ${db.title}  |  Page ${i} of ${pageCount}`, W / 2, H - 8, { align: 'center' });
        }

        pdf.save(`${(db.title || 'Dashboard').replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        if (typeof showNotification === 'function') showNotification('PDF report downloaded successfully!', 'success');
    } catch (error) {
        console.error('PDF export error:', error);
        if (typeof showNotification === 'function') showNotification('Failed to generate PDF. Please try again.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-pdf"></i> Download PDF'; }
    }
};

// ===== CHART RENDERING =====
function initializeDashboardCharts() {
    if (typeof Chart === 'undefined' || !analyticsState.activeDashboard) return;
    const db = analyticsState.activeDashboard;
    (db.charts || []).forEach((chart, idx) => {
        const ctx = document.getElementById(`ad-chart-${idx}`);
        if (!ctx) return;
        createChart(ctx, chart, idx);
    });
    // Render forecast mini-charts
    if (db.predictiveAnalysis && db.predictiveAnalysis.forecasts) {
        db.predictiveAnalysis.forecasts.forEach((fc, fi) => {
            const ctx = document.getElementById(`ad-forecast-chart-${fi}`);
            if (!ctx || typeof Chart === 'undefined') return;
            const maKey = Object.keys(db.predictiveAnalysis.movingAverages || {})[fi];
            const maData = maKey ? db.predictiveAnalysis.movingAverages[maKey] : null;
            const original = maData ? maData.original : [];
            const forecastVals = fc.values || [];
            const allLabels = [...original.map((_, i) => `${i + 1}`), ...forecastVals.map((_, i) => `F${i + 1}`)];
            const actualData = [...original, ...forecastVals.map(() => null)];
            const predictedData = [...original.map(() => null), ...forecastVals];
            // Fill the gap: connect last actual to first forecast
            if (original.length > 0 && forecastVals.length > 0) {
                predictedData[original.length - 1] = original[original.length - 1];
            }
            const datasets = [
                { label: 'Actual', data: actualData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,.08)', fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 },
                { label: 'Forecast', data: predictedData, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.08)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2, borderDash: [5, 5] }
            ];
            if (maData && maData.ma3) {
                datasets.push({ label: 'MA(3)', data: [...maData.ma3, ...forecastVals.map(() => null)], borderColor: '#10b981', borderWidth: 1.5, pointRadius: 0, tension: 0.5, fill: false });
            }
            new Chart(ctx, {
                type: 'line', data: { labels: allLabels, datasets },
                options: { responsive: true, maintainAspectRatio: false, animation: { duration: 800 },
                    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, font: { size: 10 }, padding: 8 } }, tooltip: { backgroundColor: 'rgba(15,23,42,.9)', cornerRadius: 8 } },
                    scales: { x: { display: true, grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 10 } }, y: { display: true, grid: { color: 'rgba(0,0,0,.03)' }, ticks: { font: { size: 9 }, callback: v => formatKpiValue(v) } } }
                }
            });
        });
    }
}

function createChart(ctx, chartConfig, idx) {
    const isCircular = ['doughnut', 'pie', 'polarArea'].includes(chartConfig.chartType);
    const datasets = chartConfig.datasets.map((ds, di) => {
        const color = CHART_COLORS[di % CHART_COLORS.length];
        if (isCircular) {
            return { label: ds.label, data: ds.data,
                backgroundColor: ds.data.map((_, i) => CHART_SOLIDS[i % CHART_SOLIDS.length] + 'DD'),
                hoverBackgroundColor: ds.data.map((_, i) => CHART_SOLIDS[i % CHART_SOLIDS.length]),
                borderWidth: 3, borderColor: '#fff', hoverOffset: 8 };
        }
        return { label: ds.label, data: ds.data, borderColor: color.border,
            backgroundColor: chartConfig.chartType === 'bar' ? color.border + 'CC' : color.fill,
            borderWidth: chartConfig.chartType === 'line' ? 3 : 1, tension: 0.4,
            fill: chartConfig.chartType === 'line', pointBackgroundColor: color.border,
            pointBorderColor: '#fff', pointBorderWidth: 2,
            pointRadius: chartConfig.chartType === 'line' ? 5 : 0, pointHoverRadius: 8,
            borderRadius: chartConfig.chartType === 'bar' ? 8 : 0, barPercentage: 0.7 };
    });

    const options = {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 1000, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: true, position: isCircular ? 'right' : 'top',
                labels: { usePointStyle: true, padding: 20, font: { size: 12, weight: '600' } } },
            tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleFont: { size: 14, weight: '700' },
                bodyFont: { size: 13 }, padding: 16, cornerRadius: 12, displayColors: true, usePointStyle: true,
                callbacks: { label: (ctx2) => ` ${ctx2.dataset.label}: ${formatKpiValue(ctx2.parsed.y !== undefined ? ctx2.parsed.y : ctx2.parsed)}` } }
        }
    };
    if (!isCircular) {
        options.scales = {
            x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45, color: '#64748b' }, border: { display: false } },
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 }, callback: v => formatKpiValue(v), color: '#64748b' }, border: { display: false } }
        };
    }
    if (analyticsState.charts[idx]) analyticsState.charts[idx].destroy();
    analyticsState.charts[idx] = new Chart(ctx, { type: chartConfig.chartType, data: { labels: chartConfig.labels, datasets }, options });
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
    // Load CSS via <link> tag for reliability (inline style injection can fail silently)
    const link = document.createElement('link');
    link.id = 'analytics-styles';
    link.rel = 'stylesheet';
    link.href = 'analytics-styles.css';
    document.head.appendChild(link);
}

// Legacy inline CSS removed - now served from analytics-styles.css
function _addAnalyticsStylesLegacy() {
    if (document.head.querySelector('#analytics-styles-legacy')) return;
    const style = document.createElement('style');
    style.id = 'analytics-styles-legacy';
    style.textContent = `
.ad-portal {
    background: linear-gradient(165deg, #f0f2ff 0%, #f8fafc 25%, #faf5ff 50%, #f0fdfa 75%, #f8fafc 100%);
    min-height: 100vh;
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

/* Premium Scrollbar */
.ad-portal ::-webkit-scrollbar { width: 6px; height: 6px; }
.ad-portal ::-webkit-scrollbar-track { background: transparent; }
.ad-portal ::-webkit-scrollbar-thumb { background: rgba(99,102,241,.2); border-radius: 10px; }
.ad-portal ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,.35); }

/* ========== LOADING SCREEN ========== */
.ad-loading-screen { display:flex; flex-direction:column; align-items:center; justify-content:center; height:70vh; gap:28px; text-align:center; }
.ad-loading-orb { position:relative; width:110px; height:110px; display:flex; align-items:center; justify-content:center; }
.ad-orb-ring { position:absolute; inset:0; border:3px solid transparent; border-top-color:#6366f1; border-radius:50%; animation:adSpin 1.5s cubic-bezier(.5,.15,.5,.85) infinite; }
.ad-orb-ring:nth-child(2) { inset:10px; border-top-color:#8b5cf6; animation-delay:-.5s; animation-duration:2s; }
.ad-orb-ring:nth-child(3) { inset:20px; border-top-color:#a78bfa; animation-delay:-1s; animation-duration:2.5s; }
.ad-orb-icon { position:relative; z-index:1; font-size:1.6rem; color:#6366f1; animation:adPulse 2s ease-in-out infinite; }
@keyframes adSpin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
@keyframes adPulse { 0%,100%{opacity:.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.15)} }
.ad-loading-screen h3 { font-size:1.4rem; font-weight:800; color:#1e293b; margin:0; letter-spacing:-.02em; }
.ad-loading-screen p { color:#64748b; font-size:.92rem; margin:0; font-weight:500; }
.ad-loading-bar { width:220px; height:4px; background:#e2e8f0; border-radius:4px; overflow:hidden; }
.ad-loading-fill { width:40%; height:100%; background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa,#6366f1); background-size:300% 100%; border-radius:4px; animation:adSlide 1.5s ease infinite; }
@keyframes adSlide { 0%{transform:translateX(-100%)} 100%{transform:translateX(350%)} }

/* ========== HERO HEADER ========== */
.ad-hero-header { position:relative; padding:52px 40px 48px; overflow:hidden; border-radius:0 0 36px 36px; }
.ad-hero-bg { position:absolute; inset:0; }
.ad-hero-gradient { position:absolute; inset:0; background:linear-gradient(135deg,#0a0520 0%,#1a1145 15%,#1e1b4b 30%,#312e81 50%,#4338ca 75%,#6366f1 100%); }
.ad-hero-pattern { position:absolute; inset:0; opacity:.04; background-image:
    radial-gradient(circle at 1px 1px, rgba(255,255,255,.8) 1px, transparent 0),
    radial-gradient(ellipse at 50% 0%, rgba(139,92,246,.3) 0%, transparent 60%);
    background-size: 24px 24px, 100% 100%;
}
.ad-hero-orb { position:absolute; border-radius:50%; filter:blur(70px); will-change:transform; }
.ad-hero-orb-1 { width:350px; height:350px; background:rgba(139,92,246,.3); top:-100px; right:-60px; animation:adFloat 8s ease-in-out infinite; }
.ad-hero-orb-2 { width:250px; height:250px; background:rgba(99,102,241,.2); bottom:-80px; left:8%; animation:adFloat 10s ease-in-out infinite reverse; }
.ad-hero-orb-3 { width:180px; height:180px; background:rgba(6,182,212,.18); top:15%; right:28%; animation:adFloat 12s ease-in-out infinite; }
@keyframes adFloat { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(15px,-25px) scale(1.08)} 66%{transform:translate(-10px,15px) scale(.95)} }
.ad-hero-content { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; max-width:1400px; margin:0 auto; }
.ad-hero-left { display:flex; align-items:center; gap:22px; }
.ad-hero-icon-box {
    width:64px; height:64px; background:rgba(255,255,255,.1); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
    border-radius:20px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.7rem;
    border:1px solid rgba(255,255,255,.15); box-shadow:0 8px 32px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.1);
    animation:adFadeUp .6s ease-out;
}
.ad-hero-text h1 { color:#fff; font-size:2.1rem; font-weight:900; margin:0; letter-spacing:-.04em; text-shadow:0 2px 10px rgba(0,0,0,.2); }
.ad-hero-text p { color:rgba(255,255,255,.55); margin:6px 0 0; font-size:.9rem; font-weight:500; letter-spacing:.01em; }
.ad-hero-right { display:flex; gap:10px; }
.ad-hero-btn {
    background:rgba(255,255,255,.1); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(255,255,255,.18); color:#fff; padding:12px 24px; border-radius:14px;
    font-weight:600; cursor:pointer; transition:all .3s cubic-bezier(.4,0,.2,1); display:flex; align-items:center; gap:8px; font-size:.88rem;
    box-shadow:0 4px 12px rgba(0,0,0,.1);
}
.ad-hero-btn:hover { background:rgba(255,255,255,.2); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.15); }

/* ========== CONTENT ========== */
.ad-content { padding:36px 40px 64px; max-width:1400px; margin:0 auto; }

/* ========== UPLOAD SECTION ========== */
.ad-upload-section { margin-bottom:32px; animation:adFadeUp .5s ease-out; }
.ad-upload-card {
    display:flex; justify-content:space-between; align-items:center;
    background:rgba(255,255,255,.85); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
    padding:30px 34px; border-radius:22px;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 8px 32px rgba(99,102,241,.06);
    gap:20px; flex-wrap:wrap; transition:all .4s;
}
.ad-upload-card:hover { box-shadow:0 1px 3px rgba(0,0,0,.02),0 12px 40px rgba(99,102,241,.1); }
.ad-upload-left { display:flex; align-items:center; gap:20px; flex:1; }
.ad-upload-icon-box {
    width:58px; height:58px; background:linear-gradient(135deg,#10b981,#06b6d4);
    border-radius:18px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.4rem; flex-shrink:0;
    box-shadow:0 4px 16px rgba(16,185,129,.25);
}
.ad-upload-left h3 { margin:0; font-size:1.15rem; font-weight:800; color:#0f172a; letter-spacing:-.02em; }
.ad-upload-left p { margin:5px 0 0; font-size:.84rem; color:#64748b; line-height:1.6; }
.ad-upload-btn {
    background:linear-gradient(135deg,#10b981 0%,#059669 100%); color:#fff; border:none; padding:15px 30px; border-radius:16px;
    font-weight:700; cursor:pointer; font-size:.95rem; display:flex; align-items:center; gap:10px;
    transition:all .35s cubic-bezier(.4,0,.2,1); box-shadow:0 4px 16px rgba(16,185,129,.3); white-space:nowrap;
    position:relative; overflow:hidden;
}
.ad-upload-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.2),transparent); opacity:0; transition:opacity .3s; }
.ad-upload-btn:hover { transform:translateY(-3px) scale(1.02); box-shadow:0 8px 32px rgba(16,185,129,.4); }
.ad-upload-btn:hover::before { opacity:1; }
.ad-upload-btn:active { transform:translateY(-1px) scale(.98); }

/* ========== PORTAL STATS ========== */
.ad-portal-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:36px; animation:adFadeUp .5s ease-out .1s backwards; }
.ad-portal-stat {
    background:rgba(255,255,255,.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:18px; padding:22px 16px; text-align:center;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 16px rgba(0,0,0,.03);
    transition:all .35s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden;
}
.ad-portal-stat::after { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(99,102,241,.02),transparent); opacity:0; transition:opacity .3s; pointer-events:none; }
.ad-portal-stat:hover { transform:translateY(-4px); box-shadow:0 8px 28px rgba(0,0,0,.08); }
.ad-portal-stat:hover::after { opacity:1; }
.ad-ps-icon { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:1.15rem; margin:0 auto 14px; transition:transform .3s; }
.ad-portal-stat:hover .ad-ps-icon { transform:scale(1.1); }
.ad-ps-num { font-size:2rem; font-weight:900; color:#0f172a; letter-spacing:-.03em; }
.ad-ps-label { font-size:.76rem; color:#64748b; font-weight:600; margin-top:4px; text-transform:uppercase; letter-spacing:.04em; }

/* ========== SECTION HEADER ========== */
.ad-section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; animation:adFadeUp .4s ease-out; }
.ad-section-header h3 { font-size:1.1rem; font-weight:700; color:#1e293b; margin:0; display:flex; align-items:center; gap:10px; letter-spacing:-.01em; }
.ad-section-header h3 i { font-size:.9rem; }
.ad-section-count { background:rgba(245,158,11,.1); color:#d97706; padding:5px 14px; border-radius:10px; font-size:.76rem; font-weight:700; letter-spacing:.02em; }
.ad-section-count.success { background:rgba(16,185,129,.1); color:#059669; }

/* ========== PENDING CARDS ========== */
.ad-pending-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(400px,1fr)); gap:18px; margin-bottom:28px; }
.ad-pending-card {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:20px; overflow:hidden;
    border:1px solid rgba(245,158,11,.12); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 20px rgba(245,158,11,.06);
    transition:all .35s; animation:adFadeUp .5s ease-out backwards;
}
.ad-pending-card:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(245,158,11,.12); }
.ad-pending-status-bar { height:3px; background:linear-gradient(90deg,#f59e0b,#fbbf24,#f59e0b); background-size:200% 100%; animation:adShimmer 3s ease infinite; }
@keyframes adShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.ad-pending-body { padding:24px; }
.ad-pending-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
.ad-pending-icon { width:44px; height:44px; background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(251,191,36,.08)); border-radius:13px; display:flex; align-items:center; justify-content:center; color:#f59e0b; font-size:1.1rem; flex-shrink:0; }
.ad-pending-info { flex:1; min-width:0; }
.ad-pending-info h4 { margin:0; font-size:.95rem; font-weight:700; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:-.01em; }
.ad-pending-file { font-size:.76rem; color:#64748b; display:flex; align-items:center; gap:5px; margin-top:3px; }
.ad-status-pill { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:20px; font-size:.73rem; font-weight:700; white-space:nowrap; letter-spacing:.02em; text-transform:uppercase; }
.ad-status-pill.pending { background:rgba(245,158,11,.1); color:#d97706; }
.ad-status-pill.rejected { background:rgba(239,68,68,.08); color:#dc2626; }
.ad-pending-meta { display:flex; flex-wrap:wrap; gap:16px; font-size:.78rem; color:#94a3b8; font-weight:500; margin-bottom:16px; }
.ad-pending-meta span { display:flex; align-items:center; gap:5px; }
.ad-pending-footer { display:flex; justify-content:space-between; align-items:center; padding-top:16px; border-top:1px solid rgba(241,245,249,.8); gap:12px; }
.ad-pending-note { font-size:.76rem; color:#64748b; display:flex; align-items:center; gap:6px; flex:1; line-height:1.5; }
.ad-pending-delete { width:34px; height:34px; border-radius:10px; border:1px solid #e2e8f0; background:rgba(255,255,255,.8); color:#94a3b8; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .25s; flex-shrink:0; }
.ad-pending-delete:hover { color:#dc2626; background:rgba(239,68,68,.06); border-color:#fca5a5; transform:scale(1.08); }

/* ========== REJECTED ========== */
.ad-rejected-list { margin-bottom:28px; }
.ad-rejected-item {
    display:flex; align-items:center; gap:14px;
    background:rgba(255,255,255,.8); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    padding:16px 22px; border-radius:14px; border:1px solid rgba(239,68,68,.08);
    margin-bottom:10px; font-size:.88rem; transition:all .3s;
}
.ad-rejected-item:hover { background:rgba(255,255,255,.95); }
.ad-rejected-item i { color:#ef4444; font-size:1rem; }

/* ========== APPROVED CARDS ========== */
.ad-approved-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(380px,1fr)); gap:20px; margin-bottom:36px; }
.ad-approved-card {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:22px; overflow:hidden;
    border:1px solid rgba(16,185,129,.1); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 24px rgba(16,185,129,.06);
    transition:all .4s cubic-bezier(.4,0,.2,1); animation:adFadeUp .5s ease-out backwards;
    position:relative;
}
.ad-approved-card::before {
    content:''; position:absolute; inset:0; border-radius:22px;
    background:linear-gradient(135deg,rgba(16,185,129,.03),rgba(99,102,241,.03)); opacity:0; transition:opacity .4s; pointer-events:none;
}
.ad-approved-card:hover { transform:translateY(-6px); box-shadow:0 16px 48px rgba(16,185,129,.12),0 4px 12px rgba(0,0,0,.04); }
.ad-approved-card:hover::before { opacity:1; }
.ad-approved-strip { height:3px; background:linear-gradient(90deg,#10b981,#06b6d4,#10b981); background-size:200% 100%; }
.ad-approved-card:hover .ad-approved-strip { animation:adShimmer 2s ease infinite; }
.ad-approved-body { padding:26px; position:relative; }
.ad-approved-head { display:flex; align-items:center; gap:16px; margin-bottom:16px; }
.ad-approved-icon {
    width:48px; height:48px; background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(6,182,212,.08));
    border-radius:15px; display:flex; align-items:center; justify-content:center; color:#10b981; font-size:1.2rem; flex-shrink:0;
    transition:transform .3s, box-shadow .3s;
}
.ad-approved-card:hover .ad-approved-icon { transform:scale(1.08); box-shadow:0 4px 12px rgba(16,185,129,.15); }
.ad-approved-head h4 { margin:0; font-size:1.05rem; font-weight:700; color:#1e293b; letter-spacing:-.01em; }
.ad-approved-head p { margin:3px 0 0; font-size:.82rem; color:#64748b; }
.ad-approved-meta { display:flex; flex-wrap:wrap; gap:14px; font-size:.78rem; color:#94a3b8; font-weight:500; margin-bottom:18px; }
.ad-approved-meta span { display:flex; align-items:center; gap:5px; }
.ad-approved-cta {
    display:flex; justify-content:space-between; align-items:center; padding-top:16px;
    border-top:1px solid rgba(241,245,249,.8); color:#6366f1; font-weight:600; font-size:.88rem;
    transition:color .3s;
}
.ad-approved-card:hover .ad-approved-cta { color:#4f46e5; }
.ad-approved-cta span { display:flex; align-items:center; gap:7px; }
.ad-approved-cta i.fa-arrow-right { transition:transform .3s; }
.ad-approved-card:hover .ad-approved-cta i.fa-arrow-right { transform:translateX(4px); }

/* ========== NO APPROVED STATE ========== */
.ad-no-approved {
    text-align:center; padding:72px 24px;
    background:rgba(255,255,255,.7); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:24px; border:2px dashed rgba(203,213,225,.6); position:relative; overflow:hidden;
}
.ad-no-approved::before {
    content:''; position:absolute; inset:0;
    background:radial-gradient(ellipse at 50% 30%,rgba(99,102,241,.04),transparent 70%); pointer-events:none;
}
.ad-no-approved-icon { font-size:3rem; color:#cbd5e1; margin-bottom:20px; position:relative; }
.ad-no-approved h4 { margin:0 0 10px; font-size:1.15rem; font-weight:700; color:#475569; position:relative; }
.ad-no-approved p { margin:0; color:#94a3b8; font-size:.88rem; max-width:420px; margin:0 auto; line-height:1.7; position:relative; }

/* ========== UPLOAD MODAL ========== */
.ad-upload-modal { padding:8px; }
.ad-upload-modal-header { display:flex; align-items:center; gap:18px; margin-bottom:26px; }
.ad-upload-modal-icon {
    width:52px; height:52px; background:linear-gradient(135deg,#10b981,#06b6d4);
    border-radius:16px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.3rem; flex-shrink:0;
    box-shadow:0 4px 14px rgba(16,185,129,.25);
}
.ad-upload-modal-header h3 { margin:0; font-size:1.25rem; font-weight:800; color:#0f172a; letter-spacing:-.02em; }
.ad-upload-modal-header p { margin:4px 0 0; font-size:.82rem; color:#64748b; }
.ad-upload-form { display:flex; flex-direction:column; gap:18px; }
.ad-form-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.ad-form-group { display:flex; flex-direction:column; gap:7px; }
.ad-form-group label { font-size:.82rem; font-weight:600; color:#475569; display:flex; align-items:center; gap:7px; }
.ad-form-group label i { font-size:.75rem; color:#6366f1; }
.ad-form-input, .ad-form-select {
    padding:11px 16px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:.88rem; color:#1e293b;
    background:#fff; outline:none; transition:all .25s; font-family:inherit;
}
.ad-form-input:focus, .ad-form-select:focus { border-color:#6366f1; box-shadow:0 0 0 4px rgba(99,102,241,.08); }
.ad-form-input::placeholder { color:#94a3b8; }
.ad-file-drop {
    border:2px dashed #d4d8e8; border-radius:16px; padding:36px 20px; text-align:center; cursor:pointer;
    transition:all .3s; background:linear-gradient(135deg,#fafbff,#f8f9ff); position:relative; overflow:hidden;
}
.ad-file-drop::before { content:''; position:absolute; inset:0; background:radial-gradient(ellipse at 50% 50%,rgba(99,102,241,.03),transparent 70%); pointer-events:none; }
.ad-file-drop:hover, .ad-file-drop.dragover { border-color:#6366f1; background:linear-gradient(135deg,rgba(99,102,241,.04),rgba(139,92,246,.03)); }
.ad-file-drop.has-file { border-color:#10b981; border-style:solid; background:linear-gradient(135deg,rgba(16,185,129,.04),rgba(6,182,212,.03)); }
.ad-file-drop-content { display:flex; flex-direction:column; align-items:center; gap:10px; position:relative; }
.ad-file-drop-content i { font-size:2.2rem; color:#c4c9de; transition:color .3s; }
.ad-file-drop:hover .ad-file-drop-content i { color:#6366f1; }
.ad-file-drop-content span { font-size:.9rem; font-weight:600; color:#475569; }
.ad-file-drop-content small { font-size:.76rem; color:#94a3b8; }

/* Google Sheet Link */
.ad-gsheet-input-wrap {
    display:flex; align-items:center; gap:0;
    border:1.5px solid #e2e8f0; border-radius:12px; overflow:hidden; transition:all .25s; background:#fff;
}
.ad-gsheet-input-wrap:focus-within { border-color:#34a853; box-shadow:0 0 0 4px rgba(52,168,83,.08); }
.ad-gsheet-input-wrap.has-link { border-color:#34a853; }
.ad-gsheet-icon { display:flex; align-items:center; justify-content:center; padding:0 16px; color:#94a3b8; font-size:1.15rem; background:#f8fafc; border-right:1.5px solid #e2e8f0; min-height:44px; transition:all .3s; }
.ad-gsheet-input-wrap.has-link .ad-gsheet-icon { color:#34a853; background:rgba(52,168,83,.04); }
.ad-gsheet-field { border:none !important; border-radius:0 !important; box-shadow:none !important; flex:1; }
.ad-gsheet-hint { display:flex; align-items:center; gap:5px; font-size:.73rem; color:#94a3b8; margin-top:5px; }
.ad-gsheet-hint i { font-size:.68rem; color:#34a853; }

/* Upload Divider */
.ad-upload-divider { display:flex; align-items:center; gap:16px; margin:6px 0; }
.ad-upload-divider::before, .ad-upload-divider::after { content:''; flex:1; height:1px; background:linear-gradient(90deg,transparent,#e2e8f0,transparent); }
.ad-upload-divider span { font-size:.76rem; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:.08em; }

.ad-upload-actions { display:flex; gap:12px; margin-top:10px; }
.ad-submit-btn {
    flex:1; background:linear-gradient(135deg,#6366f1 0%,#7c3aed 50%,#8b5cf6 100%); color:#fff; border:none;
    padding:15px 24px; border-radius:14px; font-weight:700; cursor:pointer; font-size:.95rem;
    display:flex; align-items:center; justify-content:center; gap:10px;
    transition:all .35s cubic-bezier(.4,0,.2,1); position:relative; overflow:hidden;
    box-shadow:0 4px 16px rgba(99,102,241,.25);
}
.ad-submit-btn::before { content:''; position:absolute; inset:0; background:linear-gradient(135deg,rgba(255,255,255,.15),transparent); opacity:0; transition:opacity .3s; }
.ad-submit-btn:hover { transform:translateY(-2px); box-shadow:0 8px 28px rgba(99,102,241,.4); }
.ad-submit-btn:hover::before { opacity:1; }
.ad-submit-btn:disabled { opacity:.5; cursor:not-allowed; transform:none; box-shadow:none; }
.ad-cancel-btn { background:#f1f5f9; color:#475569; border:none; padding:15px 24px; border-radius:14px; font-weight:600; cursor:pointer; font-size:.9rem; transition:all .25s; }
.ad-cancel-btn:hover { background:#e2e8f0; transform:translateY(-1px); }
.ad-btn-spinner { width:18px; height:18px; border:2.5px solid rgba(255,255,255,.3); border-top-color:#fff; border-radius:50%; animation:adSpin .6s linear infinite; display:inline-block; }

/* ========== DASHBOARD VIEWER ========== */
.ad-db-selector { display:flex; gap:6px; padding:0 40px; margin-top:-22px; position:relative; z-index:2; flex-wrap:wrap; }
.ad-db-tab {
    background:rgba(255,255,255,.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border:1px solid rgba(0,0,0,.06); padding:13px 24px; border-radius:16px 16px 0 0;
    font-weight:600; color:#64748b; cursor:pointer; transition:all .3s; display:flex; align-items:center; gap:8px; font-size:.88rem;
}
.ad-db-tab.active { background:rgba(255,255,255,.95); color:#6366f1; border-bottom-color:transparent; box-shadow:0 -4px 24px rgba(99,102,241,.1); }
.ad-db-tab:hover:not(.active) { color:#4f46e5; background:rgba(255,255,255,.9); }
.ad-dashboard-bar { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:36px; flex-wrap:wrap; gap:18px; animation:adFadeUp .5s ease-out; }
.ad-dashboard-info { display:flex; align-items:center; gap:18px; }
.ad-dashboard-icon {
    width:56px; height:56px; background:linear-gradient(135deg,#6366f1,#8b5cf6); border-radius:18px;
    display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.35rem;
    box-shadow:0 6px 20px rgba(99,102,241,.3);
}
.ad-dashboard-info h2 { font-size:1.7rem; font-weight:800; color:#0f172a; margin:0; letter-spacing:-.03em; }
.ad-dashboard-desc { color:#64748b; margin:5px 0 0; font-size:.9rem; }
.ad-dashboard-meta-pills { display:flex; gap:10px; flex-wrap:wrap; }
.ad-meta-pill {
    display:inline-flex; align-items:center; gap:7px; padding:9px 18px; border-radius:12px; font-size:.8rem; font-weight:600;
    background:rgba(255,255,255,.85); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px);
    border:1px solid rgba(0,0,0,.05); transition:all .3s;
}
.ad-meta-pill:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(0,0,0,.06); }
.ad-meta-pill.frequency { color:#6366f1; }
.ad-meta-pill.date { color:#059669; }
.ad-meta-pill.charts { color:#8b5cf6; }
.ad-meta-pill i { font-size:.75rem; }

/* ========== KPI GRID ========== */
.ad-kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:20px; margin-bottom:36px; }
.ad-kpi-card {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:22px; padding:26px; position:relative; overflow:hidden;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 24px rgba(0,0,0,.04);
    transition:all .4s cubic-bezier(.4,0,.2,1); animation:adFadeUp .5s ease-out backwards;
}
.ad-kpi-card:hover { transform:translateY(-6px); box-shadow:0 16px 48px rgba(0,0,0,.1); }
.ad-kpi-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--kpi-accent); }
.ad-kpi-card::after {
    content:''; position:absolute; top:-50%; right:-50%; width:200%; height:200%;
    background:radial-gradient(ellipse at center,var(--kpi-accent),transparent 70%); opacity:.02; pointer-events:none; transition:opacity .4s;
}
.ad-kpi-card:hover::after { opacity:.05; }
.ad-kpi-glow { position:absolute; top:-40px; right:-40px; width:120px; height:120px; border-radius:50%; opacity:.05; filter:blur(24px); pointer-events:none; }
.ad-kpi-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
.ad-kpi-icon-wrap { width:50px; height:50px; border-radius:15px; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition:transform .3s; }
.ad-kpi-card:hover .ad-kpi-icon-wrap { transform:scale(1.1) rotate(-5deg); }
.ad-kpi-trend-badge { display:flex; align-items:center; gap:4px; font-size:.76rem; font-weight:700; padding:6px 14px; border-radius:20px; }
.ad-kpi-trend-badge.up { color:#059669; background:rgba(16,185,129,.1); }
.ad-kpi-trend-badge.down { color:#dc2626; background:rgba(239,68,68,.08); }
.ad-kpi-number { font-size:2.3rem; font-weight:900; color:#0f172a; line-height:1.1; letter-spacing:-.04em; }
.ad-kpi-title { color:#64748b; font-weight:600; font-size:.84rem; margin-top:5px; text-transform:capitalize; }
.ad-kpi-footer { display:flex; align-items:center; gap:14px; padding-top:16px; border-top:1px solid rgba(241,245,249,.8); }
.ad-kpi-stat { display:flex; flex-direction:column; gap:2px; }
.ad-kpi-stat-label { font-size:.68rem; color:#94a3b8; font-weight:600; text-transform:uppercase; letter-spacing:.05em; }
.ad-kpi-stat-val { font-size:.85rem; color:#334155; font-weight:700; }
.ad-kpi-divider { width:1px; height:28px; background:#e2e8f0; }

/* ========== CHARTS GRID ========== */
.ad-charts-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(500px,1fr)); gap:24px; margin-bottom:36px; }
.ad-chart-card {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:24px; overflow:hidden;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 24px rgba(0,0,0,.04);
    transition:all .4s cubic-bezier(.4,0,.2,1); animation:adFadeUp .5s ease-out backwards;
}
.ad-chart-card:hover { box-shadow:0 16px 48px rgba(0,0,0,.08); transform:translateY(-2px); }
.ad-chart-card.ad-fullscreen {
    position:fixed; inset:20px; z-index:9999; border-radius:28px;
    box-shadow:0 24px 80px rgba(0,0,0,.3); background:#fff; backdrop-filter:none;
}
.ad-chart-header { display:flex; justify-content:space-between; align-items:center; padding:26px 30px 0; flex-wrap:wrap; gap:12px; }
.ad-chart-title-area h3 { font-size:1.15rem; font-weight:700; color:#1e293b; margin:0; letter-spacing:-.01em; }
.ad-chart-badges { display:flex; gap:10px; margin-top:8px; }
.ad-chart-badge { display:inline-flex; align-items:center; gap:5px; font-size:.73rem; color:#94a3b8; font-weight:500; }
.ad-chart-badge i { font-size:.65rem; }
.ad-chart-actions { display:flex; gap:8px; align-items:center; }
.ad-chart-type-select {
    padding:9px 16px; border:1.5px solid #e2e8f0; border-radius:11px; font-size:.82rem; font-weight:600; color:#475569;
    background:#f8fafc; cursor:pointer; outline:none; transition:all .25s; font-family:inherit;
}
.ad-chart-type-select:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
.ad-chart-action-btn {
    width:38px; height:38px; border-radius:11px; border:1.5px solid #e2e8f0; background:rgba(248,250,252,.8);
    color:#64748b; cursor:pointer; transition:all .25s; display:flex; align-items:center; justify-content:center; font-size:.85rem;
}
.ad-chart-action-btn:hover { background:#6366f1; color:#fff; border-color:#6366f1; transform:scale(1.08); box-shadow:0 4px 12px rgba(99,102,241,.25); }
.ad-chart-body { padding:20px 30px 28px; height:380px; position:relative; }
.ad-chart-card.ad-fullscreen .ad-chart-body { height:calc(100% - 80px); }

/* ========== DATA TABLE ========== */
.ad-data-panel {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:24px; overflow:hidden;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 4px 24px rgba(0,0,0,.04);
    margin-bottom:36px; animation:adFadeUp .5s ease-out backwards;
}
.ad-data-header { display:flex; justify-content:space-between; align-items:center; padding:24px 30px; border-bottom:1px solid #f1f5f9; }
.ad-data-title { display:flex; align-items:center; gap:14px; }
.ad-data-title i { color:#6366f1; font-size:1.1rem; }
.ad-data-title h3 { font-size:1.1rem; font-weight:700; color:#1e293b; margin:0; }
.ad-data-sheet-name { background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(139,92,246,.06)); color:#6366f1; padding:5px 14px; border-radius:10px; font-size:.76rem; font-weight:700; }
.ad-data-count { display:flex; align-items:center; gap:7px; color:#64748b; font-size:.85rem; font-weight:600; }
.ad-table-container { overflow-x:auto; max-height:500px; overflow-y:auto; }
.ad-premium-table { width:100%; border-collapse:collapse; font-size:.88rem; }
.ad-premium-table thead { position:sticky; top:0; z-index:1; }
.ad-premium-table thead th {
    background:linear-gradient(180deg,#f8fafc,#f1f5f9); padding:14px 20px; text-align:left;
    font-weight:700; color:#475569; font-size:.76rem; text-transform:uppercase; letter-spacing:.06em; border-bottom:2px solid #e2e8f0;
}
.ad-th-index { width:50px; text-align:center; }
.ad-th-value { text-align:right; }
.ad-premium-table tbody tr { transition:all .2s; }
.ad-premium-table tbody tr:hover { background:rgba(99,102,241,.02); }
.ad-premium-table tbody tr:nth-child(even) { background:rgba(248,250,252,.5); }
.ad-premium-table tbody tr:nth-child(even):hover { background:rgba(99,102,241,.03); }
.ad-premium-table tbody td { padding:14px 20px; border-bottom:1px solid rgba(241,245,249,.8); color:#334155; }
.ad-td-index { text-align:center; color:#94a3b8; font-weight:500; font-size:.78rem; }
.ad-td-label { font-weight:600; color:#1e293b; }
.ad-td-value { text-align:right; font-variant-numeric:tabular-nums; font-weight:600; color:#334155; }
.ad-td-more { text-align:center; color:#94a3b8; font-style:italic; padding:18px; }

/* ========== EXTERNAL/MANUAL DASHBOARD ========== */
.ad-external-dashboard {
    background:rgba(255,255,255,.9); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    border-radius:24px; overflow:hidden;
    border:1px solid rgba(255,255,255,.7); box-shadow:0 1px 3px rgba(0,0,0,.02),0 8px 32px rgba(0,0,0,.06);
    margin-bottom:36px;
}
.ad-external-iframe { width:100%; height:78vh; min-height:520px; border:none; display:block; }
.ad-external-fallback {
    text-align:center; padding:48px 24px;
    background:linear-gradient(135deg,rgba(240,242,255,.8),rgba(250,245,255,.8)); border-top:1px solid rgba(226,232,240,.6);
}
.ad-external-fallback-icon { font-size:2.2rem; color:#6366f1; margin-bottom:14px; }
.ad-external-fallback h4 { margin:0 0 10px; font-size:1.15rem; font-weight:700; color:#1e293b; }
.ad-external-fallback p { margin:0 0 20px; color:#64748b; font-size:.88rem; }
.ad-external-open-btn {
    display:inline-flex; align-items:center; gap:9px; padding:14px 32px;
    background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border-radius:14px;
    font-weight:700; font-size:.9rem; text-decoration:none; transition:all .35s;
    box-shadow:0 4px 20px rgba(99,102,241,.3);
}
.ad-external-open-btn:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(99,102,241,.4); }
.ad-db-tab-link-badge { margin-left:4px; font-size:.65rem; color:#10b981; }

/* ========== FOOTER ========== */
.ad-footer-note {
    text-align:center; padding:36px 20px; color:#94a3b8; font-size:.82rem; font-weight:500;
    display:flex; align-items:center; justify-content:center; gap:9px;
}
.ad-footer-note i { color:#6366f1; font-size:.85rem; }

/* ========== ANIMATIONS ========== */
@keyframes adFadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }

/* ========== RESPONSIVE ========== */
@media (max-width:1024px) {
    .ad-charts-grid { grid-template-columns:1fr; }
    .ad-kpi-grid { grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); }
}
@media (max-width:768px) {
    .ad-hero-header { padding:36px 20px 40px; border-radius:0 0 28px 28px; }
    .ad-hero-text h1 { font-size:1.5rem; }
    .ad-content { padding:24px 16px 48px; }
    .ad-kpi-grid { grid-template-columns:repeat(2,1fr); }
    .ad-chart-body { height:280px; }
    .ad-portal-stats { grid-template-columns:repeat(2,1fr); }
    .ad-pending-grid { grid-template-columns:1fr; }
    .ad-approved-grid { grid-template-columns:1fr; }
    .ad-form-row { grid-template-columns:1fr; }
    .ad-upload-card { flex-direction:column; text-align:center; }
    .ad-upload-left { flex-direction:column; }
    .ad-dashboard-bar { flex-direction:column; }
    .ad-db-selector { padding:0 16px; }
}
@media (max-width:480px) {
    .ad-kpi-grid { grid-template-columns:1fr 1fr; }
    .ad-hero-left { flex-direction:column; align-items:flex-start; gap:12px; }
    .ad-portal-stats { grid-template-columns:1fr 1fr; }
    .ad-hero-content { gap:16px; }
    .ad-hero-right { width:100%; }
    .ad-hero-btn { flex:1; justify-content:center; }
}
`;
    document.head.appendChild(style);
}

// Also add the link tag to index.html as backup via JS
(function loadAnalyticsCSS() {
    if (!document.head.querySelector('#analytics-styles') && !document.head.querySelector('link[href*="analytics-styles"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'analytics-styles.css';
        document.head.appendChild(link);
    }
})();

// Initialize - script is loaded dynamically after DOM is ready, so init immediately
(function initRetry() {
    if (typeof window.appState !== 'undefined' && typeof window.buildSidebarNav === 'function') {
        initializeAnalyticsIntegration();
    } else {
        setTimeout(initRetry, 500);
    }
})();

window.initializeAnalyticsIntegration = initializeAnalyticsIntegration;
