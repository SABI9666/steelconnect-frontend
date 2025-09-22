// --- LANDING PAGE SLIDER & SMOOTH SCROLL ---
let currentSlide = 0;
const sliderWrapper = document.getElementById('slider-wrapper');
const sliderDots = document.querySelectorAll('.slider-dot');
const totalSlides = sliderWrapper ? sliderWrapper.children.length : 0;

function changeSlide(direction) {
    if (!sliderWrapper) return;
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    goToSlide(currentSlide);
}

function goToSlide(slideIndex) {
    if (!sliderWrapper) return;
    sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
    sliderDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
    currentSlide = slideIndex;
}

if (totalSlides > 0) {
    setInterval(() => changeSlide(1), 8000);
}

document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// --- FULL APPLICATION SCRIPT ---
document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
const BACKEND_URL = IS_LOCAL ? 'http://localhost:10000/api' : PROD_BACKEND_URL;

const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: [],
    approvedJobs: [],
    conversations: [],
    participants: {},
    jobsPage: 1,
    hasMoreJobs: true,
    userSubmittedQuotes: new Set(),
    uploadedFile: null, // For AI estimation tool
    jobFiles: [],      // For posting a new job
    myEstimations: [],
    currentHeaderSlide: 0,
    notifications: [],
    profileFiles: {}, // For profile completion uploads
};

// === ANALYSIS PORTAL STATE (REFACTORED FOR REQUEST-BASED WORKFLOW) ===
const analysisState = {
    currentRequest: null,
    history: [],
    isLoading: false,
};


// ===================================
// --- BUSINESS ANALYTICS PORTAL (FIXED) ---
// ===================================
// Update the state object name
const businessAnalyticsState = {
    currentRequest: null,
    history: [],
    isLoading: false,
};

/**
 * Main function to render the Business Analytics Portal.
 */
async function renderBusinessAnalyticsPortal() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-chart-line"></i> Business Analytics</h2>
                <p class="header-subtitle">Request and view comprehensive business analytics reports from your project data.</p>
            </div>
             <div class="header-actions">
                <button class="btn btn-outline" onclick="showBusinessAnalyticsHistory()"><i class="fas fa-history"></i> View History</button>
            </div>
        </div>
        <div id="business-analytics-content" class="business-analytics-container">
            <div class="loading-spinner"><div class="spinner"></div><p>Loading Business Analytics Portal...</p></div>
        </div>
    `;
    await loadAndDisplayBusinessAnalyticsRequest();
}

/**
 * Fetches the user's latest business analytics request and renders the correct view.
 */
async function loadAndDisplayBusinessAnalyticsRequest() {
    const contentArea = document.getElementById('business-analytics-content');
    businessAnalyticsState.isLoading = true;

    try {
        const response = await apiCall('/analysis/my-request', 'GET');
        businessAnalyticsState.currentRequest = response.request;

        if (!businessAnalyticsState.currentRequest || businessAnalyticsState.currentRequest.status === 'completed') {
            // No active request or last one is completed, show the new request form
            contentArea.innerHTML = getBusinessAnalyticsNewRequestTemplate(businessAnalyticsState.currentRequest);

            // Setup form listener
            const form = document.getElementById('business-analytics-request-form');
            if (form) {
                form.addEventListener('submit', handleBusinessAnalyticsSubmit);
            }
        } else {
            // An active request is pending
            contentArea.innerHTML = getBusinessAnalyticsPendingTemplate(businessAnalyticsState.currentRequest);
        }

    } catch (error) {
        console.error('Error loading business analytics:', error);
        contentArea.innerHTML = `
            <div class="error-state">
                <h3>Error Loading Portal</h3>
                <p>Could not retrieve your business analytics request status. Please try again.</p>
                <button class="btn btn-primary" onclick="renderBusinessAnalyticsPortal()">Retry</button>
            </div>`;
    } finally {
        businessAnalyticsState.isLoading = false;
    }
}

/**
 * Template for submitting a new business analytics request.
 */
function getBusinessAnalyticsNewRequestTemplate(lastRequest = null) {
    return `
        ${lastRequest ? getBusinessAnalyticsCompletedTemplate(lastRequest) : ''}
        <div class="analysis-card">
            <h3><i class="fas fa-plus-circle"></i> Submit a New Business Analytics Request</h3>
            <p>Provide your data source URL and describe what analytics you need for your business insights.</p>
            <form id="business-analytics-request-form" class="premium-form">
                 <div class="form-row">
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-database"></i> Data Type</label>
                        <select class="form-select" name="dataType" required>
                            <option value="Production Update" selected>Production Update</option>
                            <option value="Sales Analytics">Sales Analytics</option>
                            <option value="Financial Report">Financial Report</option>
                            <option value="Project Analytics">Project Analytics</option>
                            <option value="Performance Metrics">Performance Metrics</option>
                            <option value="Custom Analysis">Custom Analysis</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-sync-alt"></i> Report Frequency</label>
                        <select class="form-select" name="frequency" required>
                            <option value="Daily" selected>Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-link"></i> Data Source URL</label>
                    <input type="url" class="form-input" name="googleSheetUrl" placeholder="https://docs.google.com/spreadsheets/d/... or any data source URL" required>
                    <small>Please ensure the data source is accessible or shared with our analytics team.</small>
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-file-alt"></i> Analytics Requirements</label>
                    <textarea class="form-textarea" name="description" rows="4" placeholder="Describe what business insights you need, key metrics to analyze, charts/graphs required, or specific questions you want answered..." required></textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> Submit Analytics Request</button>
                </div>
            </form>
        </div>
    `;
}

/**
 * Template for displaying a pending business analytics request.
 */
function getBusinessAnalyticsPendingTemplate(request) {
    return `
        <div class="analysis-card status-pending">
            <h3><i class="fas fa-clock"></i> Your Analytics Request is Being Processed</h3>
            <p>Our analytics team has received your request and is working on your business intelligence report. You will be notified once it's complete.</p>
            <div class="request-summary">
                <h4>Request Summary</h4>
                <ul>
                    <li><strong>Request ID:</strong> <span>${request._id}</span></li>
                    <li><strong>Status:</strong> <span class="status-badge pending">Processing</span></li>
                    <li><strong>Submitted:</strong> <span>${formatDetailedDate(request.createdAt)}</span></li>
                    <li><strong>Data Type:</strong> <span>${request.dataType}</span></li>
                    <li><strong>Frequency:</strong> <span>${request.frequency}</span></li>
                    <li><strong>Data Source:</strong> <a href="${request.googleSheetUrl}" target="_blank">View Source</a></li>
                </ul>
            </div>
            <div class="form-actions">
                <button class="btn btn-outline" onclick="showEditBusinessAnalyticsModal('${request._id}')"><i class="fas fa-edit"></i> Edit Request</button>
                <button class="btn btn-danger" onclick="handleBusinessAnalyticsCancel('${request._id}')"><i class="fas fa-times"></i> Cancel Request</button>
            </div>
        </div>
    `;
}

/**
 * Template for displaying a completed business analytics report.
 */
function getBusinessAnalyticsCompletedTemplate(request) {
    if (!request.vercelUrl) {
        return `
            <div class="analysis-card status-completed">
                <h3><i class="fas fa-check-circle"></i> Your Report is Ready</h3>
                <p>Your business analytics report for request #${request._id} is complete.</p>
                <div class="report-container">
                    <div class="report-placeholder">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h4>Report URL is missing.</h4>
                        <p>Please contact support for assistance.</p>
                    </div>
                </div>
            </div>
        `;
    }
    return `
        <div class="analysis-card status-completed">
            <h3><i class="fas fa-check-circle"></i> Your Business Analytics Report is Ready</h3>
            <p>Your comprehensive business analytics report for request #${request._id} is complete. View the interactive dashboard below.</p>
            <div class="report-container">
                <iframe
                     src="${request.vercelUrl}"
                     class="analysis-iframe"
                     frameborder="0"
                    allow="fullscreen"
                    loading="lazy">
                </iframe>
            </div>
            <div class="form-actions">
                <a href="${request.vercelUrl}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-expand"></i> Open Full Report
                </a>
                <button class="btn btn-outline" onclick="downloadBusinessAnalyticsReport('${request.vercelUrl}', '${request._id}')">
                    <i class="fas fa-download"></i> Download Report
                </button>
            </div>
        </div>
    `;
}

/**
 * Handles the form submission for a new business analytics request.
 */
async function handleBusinessAnalyticsSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    try {
        const requestData = {
            dataType: form.dataType.value,
            frequency: form.frequency.value,
            googleSheetUrl: form.googleSheetUrl.value,
            description: form.description.value,
        };
        // Basic validation for URL
        if (!requestData.googleSheetUrl.includes('http')) {
            throw new Error('Please provide a valid URL.');
        }
        await apiCall('/analysis/submit-request', 'POST', requestData, 'Business analytics request submitted successfully!');

        addLocalNotification(
            'Request Submitted',
             'Your business analytics request has been submitted and is being processed.',
             'success'
        );

        // Refresh the portal view to show the pending status
        await loadAndDisplayBusinessAnalyticsRequest();

    } catch (error) {
        showNotification(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Shows a modal to edit a pending business analytics request.
 */
function showEditBusinessAnalyticsModal(requestId) {
    const request = businessAnalyticsState.currentRequest;
    if (!request || request._id !== requestId) return;
    const modalContent = `
        <div class="modal-header">
            <h3><i class="fas fa-edit"></i> Edit Business Analytics Request</h3>
        </div>
        <form id="edit-business-analytics-request-form" class="premium-form">
            <input type="hidden" name="requestId" value="${request._id}">
            <div class="form-group">
                <label class="form-label">Data Type</label>
                <select class="form-select" name="dataType">
                    <option value="Production Update" ${request.dataType === 'Production Update' ? 'selected' : ''}>Production Update</option>
                    <option value="Sales Analytics" ${request.dataType === 'Sales Analytics' ? 'selected' : ''}>Sales Analytics</option>
                    <option value="Financial Report" ${request.dataType === 'Financial Report' ? 'selected' : ''}>Financial Report</option>
                    <option value="Project Analytics" ${request.dataType === 'Project Analytics' ? 'selected' : ''}>Project Analytics</option>
                    <option value="Performance Metrics" ${request.dataType === 'Performance Metrics' ? 'selected' : ''}>Performance Metrics</option>
                    <option value="Custom Analysis" ${request.dataType === 'Custom Analysis' ? 'selected' : ''}>Custom Analysis</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Data Source URL</label>
                <input type="url" class="form-input" name="googleSheetUrl" value="${request.googleSheetUrl}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Analytics Requirements</label>
                <textarea class="form-textarea" name="description" rows="4" required>${request.description}</textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Save Changes</button>
            </div>
        </form>
    `;
    showGenericModal(modalContent, 'max-width: 600px;');
    document.getElementById('edit-business-analytics-request-form').addEventListener('submit', handleBusinessAnalyticsEdit);
}

/**
 * Handles the submission of the edit business analytics request form.
 */
async function handleBusinessAnalyticsEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Saving...';
    const requestId = form.requestId.value;
    const updatedData = {
        dataType: form.dataType.value,
        googleSheetUrl: form.googleSheetUrl.value,
        description: form.description.value,
    };
    try {
        await apiCall(`/analysis/request/${requestId}`, 'PUT', updatedData, 'Request updated successfully!');
        addLocalNotification('Updated', 'Your business analytics request has been updated.', 'success');
        closeModal();
        await loadAndDisplayBusinessAnalyticsRequest(); // Refresh view
    } catch (error) {
        showNotification(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

/**
 * Handles the cancellation of a pending business analytics request.
 */
async function handleBusinessAnalyticsCancel(requestId) {
    if (confirm('Are you sure you want to cancel this business analytics request? This action cannot be undone.')) {
        try {
            await apiCall(`/analysis/request/${requestId}`, 'DELETE', null, 'Request cancelled successfully.');
            addLocalNotification('Cancelled', 'Your business analytics request has been cancelled.', 'info');
            businessAnalyticsState.currentRequest = null;
            await loadAndDisplayBusinessAnalyticsRequest(); // Refresh view
        } catch (error) {
             showNotification(error.message, 'error');
        }
    }
}

/***
 * Fetches and displays the user's business analytics request history in a modal.
 */
async function showBusinessAnalyticsHistory() {
    showGenericModal('<div class="loading-spinner"><div class="spinner"></div><p>Loading History...</p></div>', 'max-width: 800px;');
    try {
        const response = await apiCall('/analysis/history', 'GET');
        const requests = response.requests || [];
        businessAnalyticsState.history = requests;
        const historyHTML = requests.length === 0 ?
        `<div class="empty-state">
            <i class="fas fa-history"></i>
            <h3>No History Found</h3>
            <p>You have not submitted any business analytics requests yet.</p>
        </div>` :
        `<div class="analysis-history-list">
            ${requests.map(req => `
                <div class="history-item status-${req.status}">
                    <div class="history-item-header">
                        <span class="history-item-date">${formatDetailedDate(req.createdAt)}</span>
                        <span class="status-badge ${req.status}">${req.status}</span>
                    </div>
                    <div class="history-item-body">
                        <p><strong>Data Type:</strong> ${req.dataType}</p>
                        <p><strong>Description:</strong> ${truncateText(req.description, 100)}</p>
                    </div>
                     <div class="history-item-footer">
                       ${req.vercelUrl ? `<a href="${req.vercelUrl}" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-eye"></i> View Report</a>` : `<span>Report not yet available</span>`}
                    </div>
                </div>
            `).join('')}
        </div>`;
        const modalContent = `
            <div class="modal-header"><h3><i class="fas fa-history"></i> Business Analytics Request History</h3></div>
            ${historyHTML}
        `;
        showGenericModal(modalContent, 'max-width: 800px;');
    } catch (error) {
        showGenericModal(`<div class="error-state"><h3>Error</h3><p>Could not load your request history.</p></div>`, 'max-width: 800px;');
    }
}

/**
 * Downloads the business analytics report
 */
function downloadBusinessAnalyticsReport(reportUrl, requestId) {
    try {
        // For HTML reports hosted on external platforms, we'll open in new tab
        // and inform user how to save
        const newWindow = window.open(reportUrl, '_blank');
        if (newWindow) {
            showNotification('Report opened in new tab. Use Ctrl+S or Cmd+S to save the HTML file.', 'info', 8000);
        } else {
            showNotification('Please allow popups to view the report.', 'warning');
        }
    } catch (error) {
        console.error('Error opening report:', error);
        showNotification('Unable to open report. Please contact support.', 'error');
    }
}


// Professional Features Header Data
const headerFeatures = [
    {
        icon: 'fa-calculator',
        title: 'AI Cost Estimation',
        subtitle: 'Advanced algorithms for precise cost analysis',
        description: 'Upload your drawings and get instant, accurate estimates powered by machine learning',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
        icon: 'fa-drafting-compass',
        title: 'Expert Engineering',
        subtitle: 'Connect with certified professionals',
        description: 'Access a network of qualified structural engineers and designers worldwide',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
        icon: 'fa-comments',
        title: 'Real-time Collaboration',
        subtitle: 'Seamless project communication',
        description: 'Built-in messaging system for efficient project coordination and updates',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
        icon: 'fa-shield-alt',
        title: 'Secure & Reliable',
        subtitle: 'Enterprise-grade security',
        description: 'Your project data is protected with bank-level encryption and security',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
];

// --- INACTIVITY TIMER FOR AUTO-LOGOUT (ENHANCED) ---
let inactivityTimer;
let warningTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);

    // Warning at 4 minutes (1 minute before logout)
    warningTimer = setTimeout(() => {
        if (appState.currentUser) {
            showInactivityWarning();
        }
    }, 240000); // 4 minutes

    // Logout at 5 minutes
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'warning');
            logout();
        }
    }, 300000); // 5 minutes
}

function showInactivityWarning() {
    // Dismiss any previous warning
    dismissInactivityWarning();

    const warning = document.createElement('div');
    warning.id = 'inactivity-warning';
    warning.className = 'inactivity-warning-modal';
    warning.innerHTML = `
        <div class="warning-content">
            <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Session Timeout Warning</h3>
            <p>You will be logged out in 1 minute due to inactivity.</p>
            <p>Click anywhere to stay logged in.</p>
            <div class="warning-actions">
                <button class="btn btn-primary" onclick="dismissInactivityWarning()">Stay Logged In</button>
            </div>
        </div>
    `;

    document.body.appendChild(warning);

    const dismissHandler = () => {
        dismissInactivityWarning();
        document.removeEventListener('click', dismissHandler);
        document.removeEventListener('keydown', dismissHandler);
        document.removeEventListener('mousemove', dismissHandler);
    };

    document.addEventListener('click', dismissHandler);
    document.addEventListener('keydown', dismissHandler);
    document.addEventListener('mousemove', dismissHandler);
}

function dismissInactivityWarning() {
    const warning = document.getElementById('inactivity-warning');
    if (warning) {
        warning.remove();
        resetInactivityTimer(); // Reset the timer
    }
}

// ============================================
// CONNECTION STATUS INDICATOR
// ============================================
let connectionStatus = 'online';
function setupConnectionMonitoring() {
    function updateConnectionStatus() {
        connectionStatus = navigator.onLine ? 'online' : 'offline';

        if (connectionStatus === 'offline') {
            showNotification('You are offline. Some features may not work.', 'warning', 0);
        }
    }

    window.addEventListener('online', () => {
        connectionStatus = 'online';
        showNotification('Connection restored', 'success');
    });

    window.addEventListener('offline', () => {
        connectionStatus = 'offline';
        showNotification('Connection lost. Please check your internet.', 'error', 0);
    });

    updateConnectionStatus();
}

// ============================================
// PERFORMANCE MONITORING
// ============================================
function monitorDownloadPerformance() {
    const originalFetch = window.fetch;

    window.fetch = function(...args) {
        const startTime = performance.now();
        const url = args[0];

        return originalFetch.apply(this, args)
            .then(response => {
                const endTime = performance.now();
                const duration = endTime - startTime;

                if (duration > 5000 && url.includes('/download')) {
                    console.warn(`Slow download detected: ${url} took ${duration}ms`);
                }

                return response;
            })
            .catch(error => {
                console.error(`Fetch failed for ${url}:`, error);
                throw error;
            });
    };
}

function initializePerformanceImprovements() {
    // Enable performance monitoring in development
    if (IS_LOCAL) {
        monitorDownloadPerformance();
    }

    // Preload critical resources
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // Preload user data if needed
            if (appState.currentUser) {
                loadUserQuotes().catch(() => {});
                loadUserEstimations().catch(() => {});
            }
        });
    }
}


function initializeApp() {
    console.log("SteelConnect App Initializing...");

    // Global click listener to close pop-ups
    window.addEventListener('click', (event) => {
        // Close user dropdown if click is outside
        const userInfoContainer = document.getElementById('user-info-container');
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        if (userInfoDropdown && userInfoContainer && !userInfoContainer.contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
    });

    // One-time listener setup to prevent re-binding
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('user-info-dropdown').classList.toggle('active');
        });
    }

    const settingsLink = document.getElementById('user-settings-link');
    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection('settings');
            document.getElementById('user-info-dropdown').classList.remove('active');
        });
    }

    const logoutLink = document.getElementById('user-logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Comprehensive activity listeners for 5-minute auto-logout
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove', 'wheel'];
    activityEvents.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Auth button listeners
    const signInBtn = document.getElementById('signin-btn');
    if (signInBtn) signInBtn.addEventListener('click', () => showAuthModal('login'));
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => showAuthModal('register'));
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => showAuthModal('register'));

    // Logo navigation
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentUser) {
                renderAppSection('dashboard');
            }
            else {
                showLandingPageView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    // Check for existing session
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
            console.log('Restored user session');
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }

    initializeHeaderRotation();
    initializePerformanceImprovements();
    setupConnectionMonitoring();
}


// --- DYNAMIC HEADER SYSTEM ---
function initializeHeaderRotation() {
    setInterval(() => {
        appState.currentHeaderSlide = (appState.currentHeaderSlide + 1) % headerFeatures.length;
        updateDynamicHeader();
    }, 5000);
}

function updateDynamicHeader() {
    const headerElement = document.getElementById('dynamic-feature-header');
    if (headerElement) {
        const feature = headerFeatures[appState.currentHeaderSlide];
        headerElement.innerHTML = `
            <div class="feature-header-content" style="background: ${feature.gradient};">
                <div class="feature-icon-container">
                    <i class="fas ${feature.icon}"></i>
                </div>
                <div class="feature-text-content">
                    <h2 class="feature-title">${feature.title}</h2>
                    <p class="feature-subtitle">${feature.subtitle}</p>
                    <p class="feature-description">${feature.description}</p>
                </div>
                <div class="feature-indicators">
                    ${headerFeatures.map((_, index) =>
                        `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
}

// Optimized API call function with better error handling
async function apiCall(endpoint, method, body = null, successMessage = null) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
        const options = {
             method,
             headers: {},
            signal: controller.signal
        };

        if (appState.jwtToken) {
            options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        }

        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        clearTimeout(timeoutId);
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (!response.ok) {
                const errorMsg = response.headers.get('X-Error-Message') ||
                               `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
            }
            if (successMessage) showNotification(successMessage, 'success');
            return { success: true };
        }
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || responseData.error ||
                           `Request failed with status ${response.status}`);
        }
        if (successMessage) {
            showNotification(successMessage, 'success');
        }
        return responseData;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.error(`API call to ${endpoint} timed out`);
            showNotification('Request timed out. Please try again.', 'error');
            throw new Error('Request timed out. Please check your network and try again.');
        } else if (error.message.includes('Failed to fetch')) {
            showNotification('Network error. Please check your connection.', 'error');
            throw new Error('Network error. Please check your connection.');
        } else {
            console.error('API call failed:', error);
            throw error;
        }
    }
}

// Function to handle showing notifications.
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification notification-${type} animate__animated animate__fadeInRight`;
    notification.innerHTML = `<span class="notification-message">${message}</span>`;
    container.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('animate__fadeInRight');
        notification.classList.add('animate__fadeOutRight');
        notification.addEventListener('animationend', () => notification.remove());
    }, duration);
}

// Function to handle global modals.
function showGenericModal(content, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error('Modal container not found!');
        return;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal-content" style="${style}">
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
            ${content}
        </div>
    `;
    modalContainer.classList.add('active');
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.classList.remove('active');
        // Clear content to prevent old data from flashing
        setTimeout(() => {
            modalContainer.innerHTML = '';
        }, 300); // Corresponds to CSS fade-out duration
    }
}

function renderLoadingPage() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <h3>Loading...</h3>
            <p>Please wait while we prepare your dashboard.</p>
        </div>
    `;
}


// --- AUTHENTICATION & SESSION MANAGEMENT ---
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Authenticating...';

    try {
        const response = await apiCall('/auth/login', 'POST', { email, password });
        if (response.token && response.user) {
            appState.jwtToken = response.token;
            appState.currentUser = response.user;
            localStorage.setItem('jwtToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            closeModal();
            showAppView();
            showNotification('Login successful! Welcome back.', 'success');
        } else {
            throw new Error('Invalid response from server.');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const email = form.email.value;
    const password = form.password.value;
    const userType = form.userType.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    if (password.length < 6) {
        showNotification('Password must be at least 6 characters.', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Registering...';

    try {
        await apiCall('/auth/register', 'POST', { name, email, password, userType });
        showNotification('Registration successful! Please log in.', 'success');
        showAuthModal('login');
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function showAuthModal(type) {
    const modalContent = type === 'login' ? getLoginForm() : getRegisterForm();
    showGenericModal(modalContent);
    // Add event listeners to forms inside the modal
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        if (type === 'login') {
            authForm.addEventListener('submit', handleLogin);
        } else {
            authForm.addEventListener('submit', handleRegister);
        }
    }
}

function getLoginForm() {
    return `
        <div class="modal-header">
            <h3>Login to SteelConnect</h3>
        </div>
        <form id="auth-form" class="auth-form">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-full">Login</button>
            </div>
            <p class="auth-switch">Don't have an account? <a href="#" onclick="event.preventDefault(); showAuthModal('register');">Register here</a></p>
        </form>
    `;
}

function getRegisterForm() {
    return `
        <div class="modal-header">
            <h3>Join SteelConnect</h3>
        </div>
        <form id="auth-form" class="auth-form">
            <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="password">Password</label>
                <input type="password" id="password" name="password" required>
            </div>
            <div class="form-group">
                <label for="userType">I am a...</label>
                <select id="userType" name="userType" class="form-select">
                    <option value="client">Client</option>
                    <option value="designer">Designer / Fabricator</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="submit" class="btn btn-primary btn-full">Register</button>
            </div>
            <p class="auth-switch">Already have an account? <a href="#" onclick="event.preventDefault(); showAuthModal('login');">Login here</a></p>
        </form>
    `;
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.jobs = [];
    appState.myQuotes = [];
    appState.approvedJobs = [];
    appState.myEstimations = [];
    appState.conversations = [];
    appState.participants = {};
    appState.uploadedFile = null;
    appState.userSubmittedQuotes.clear();
    appState.jobFiles = [];
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('steelconnect_notifications'); // Clear notifications on logout
    cleanupNotificationSystem();
    showLandingPageView();
    showNotification('You have been logged out.', 'info');
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
}

// --- VIEW RENDERING ---
function showLandingPageView() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = getLandingPageTemplate();
}

function showAppView() {
    const appContainer = document.getElementById('app-container');
    appContainer.innerHTML = getAppTemplate();
    buildSidebarNav();
    updateProfilePicture();
    renderAppSection('dashboard');
    initializeNotificationSystem();
    resetInactivityTimer();
}

function getLandingPageTemplate() {
    return `
        <div class="hero-section">
            <div class="hero-content">
                <h1>The Future of Steel Fabrication</h1>
                <p class="subtitle">Connect with top-tier designers and fabricators for your structural steel projects. Get instant AI estimations and manage everything in one place.</p>
                <button id="get-started-btn" class="btn btn-cta">Get Started Now</button>
            </div>
        </div>
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section" id="how-it-works">
            <h2>How It Works</h2>
            <div class="steps-container">
                <div class="step-card">
                    <div class="step-icon"><i class="fas fa-1"></i></div>
                    <h3>Post Your Project</h3>
                    <p>Describe your structural steel needs and upload your design files. Our platform makes it easy and fast.</p>
                </div>
                <div class="step-card">
                    <div class="step-icon"><i class="fas fa-2"></i></div>
                    <h3>Get Matched</h3>
                    <p>Our intelligent system matches your project with qualified designers and fabricators from our network.</p>
                </div>
                <div class="step-card">
                    <div class="step-icon"><i class="fas fa-3"></i></div>
                    <h3>Receive Quotes</h3>
                    <p>Review competitive quotes and profiles of vetted professionals. Choose the best fit for your project.</p>
                </div>
                <div class="step-card">
                    <div class="step-icon"><i class="fas fa-4"></i></div>
                    <h3>Collaborate & Build</h3>
                    <p>Communicate, share files, and manage milestones seamlessly through our integrated project dashboard.</p>
                </div>
            </div>
        </div>
        <div class="section bg-light" id="features">
            <h2>Why Choose SteelConnect?</h2>
            <div class="features-grid">
                <div class="feature-item">
                    <i class="fas fa-check-circle feature-icon"></i>
                    <h3>Vetted Professionals</h3>
                    <p>We ensure all designers and fabricators on our platform are certified and have a proven track record.</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-shield-alt feature-icon"></i>
                    <h3>Secure Transactions</h3>
                    <p>All payments and project details are handled securely, giving you peace of mind from start to finish.</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-calculator feature-icon"></i>
                    <h3>AI Estimation Tool</h3>
                    <p>Get instant, preliminary cost estimates for your project based on your designs, saving you time and money.</p>
                </div>
                <div class="feature-item">
                    <i class="fas fa-search feature-icon"></i>
                    <h3>Extensive Network</h3>
                    <p>Access a wide range of professionals, from small, specialized shops to large-scale fabrication firms.</p>
                </div>
            </div>
        </div>
        <div class="section cta-section">
            <div class="cta-content">
                <h2>Ready to Start Your Project?</h2>
                <p>Post your project in minutes and connect with the right professionals today.</p>
                <button onclick="showAuthModal('register')" class="btn btn-cta">Join Now</button>
            </div>
        </div>
    `;
}

function getAppTemplate() {
    return `
        <header class="app-header">
            <div class="logo">
                <img src="/assets/logo.png" alt="SteelConnect Logo">
                <span>SteelConnect</span>
            </div>
            <div class="user-profile">
                 <div id="notification-bell-container" class="notification-bell-container">
                    <i class="fas fa-bell"></i>
                    <span id="notification-badge" class="notification-badge"></span>
                    <div id="notification-panel" class="notification-panel">
                        <div class="notification-panel-header">
                            <h4>Notifications</h4>
                            <button id="clear-notifications-btn" class="clear-notifications-btn">Clear All</button>
                        </div>
                        <div id="notification-panel-list" class="notification-panel-list">
                            <div class="notification-empty-state">
                                <i class="fas fa-bell-slash"></i>
                                <p>No notifications</p>
                                <small>Sign in to see your notifications</small>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="user-info-container" class="user-info-container">
                    <div id="user-info" class="user-info">
                        <div id="profile-picture" class="profile-picture"></div>
                        <span id="user-name-display"></span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div id="user-info-dropdown" class="user-info-dropdown">
                        <a href="#" id="user-settings-link" class="dropdown-link"><i class="fas fa-user-circle"></i> Profile & Settings</a>
                        <a href="#" id="user-logout-link" class="dropdown-link"><i class="fas fa-sign-out-alt"></i> Logout</a>
                    </div>
                </div>
            </div>
        </header>
        <div class="app-main-content">
            <aside class="app-sidebar">
                <nav id="sidebar-nav-menu" class="sidebar-nav"></nav>
            </aside>
            <main id="app-container" class="app-content-area">
                </main>
        </div>
        <div id="modal-container" class="modal-container"></div>
        <div id="notification-container" class="notification-container"></div>
    `;
}

function updateProfilePicture() {
    const profilePicElement = document.getElementById('profile-picture');
    const userNameElement = document.getElementById('user-name-display');
    if (profilePicElement && userNameElement && appState.currentUser) {
        const user = appState.currentUser;
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('') : user.email.split('@')[0][0];
        profilePicElement.textContent = initials.toUpperCase();
        userNameElement.textContent = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];
        profilePicElement.style.backgroundColor = getProfileColor(user.email);
    }
}

function getProfileColor(email) {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#ff9800', '#ff5722'];
    const hash = email.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

// ===================================
// INTEGRATION UPDATES FOR BUSINESS ANALYTICS
// ===================================
// 1. UPDATE THE buildSidebarNav FUNCTION
// Replace the existing analysis-portal link with business-analytics
function buildSidebarNav() {
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
            <div class="sidebar-section-title">Analytics & Reports</div>
            <a href="#" class="sidebar-nav-link business-analytics-link" data-section="business-analytics">
                <i class="fas fa-chart-line fa-fw"></i>
                <span>Business Analytics</span>
                <span class="nav-badge">NEW</span>
            </a>`;
    }
    // Common links for both user types
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
    // Add event listeners
    nav.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

// 2. UPDATE THE renderAppSection FUNCTION
// Add this case to your existing renderAppSection function, right after the support case:
function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));

    const profileStatus = appState.currentUser.profileStatus;
    const isApproved = profileStatus === 'approved';

    // UPDATE: Add business-analytics to restricted sections
    const restrictedSections = ['post-job', 'jobs', 'my-quotes', 'approved-jobs', 'estimation-tool', 'my-estimations', 'messages', 'business-analytics'];

    if (restrictedSections.includes(sectionId) && !isApproved) {
        container.innerHTML = getRestrictedAccessTemplate(sectionId, profileStatus);
        return;
    }

    if (sectionId === 'dashboard') {
        renderDashboard();
    } else if (sectionId === 'jobs') {
        renderJobsPortal();
    } else if (sectionId === 'post-job') {
        renderPostJobForm();
    } else if (sectionId === 'my-quotes') {
        renderMyQuotesPage();
    } else if (sectionId === 'approved-jobs') {
        renderApprovedJobsPage();
    } else if (sectionId === 'estimation-tool') {
        renderEstimationTool();
    } else if (sectionId === 'my-estimations') {
        fetchAndRenderMyEstimations();
    } else if (sectionId === 'messages') {
        renderMessagesPortal();
    } else if (sectionId === 'support') {
        renderSupportSection();
    }
    // ADD THIS NEW CASE:
    else if (sectionId === 'business-analytics') {
        renderBusinessAnalyticsPortal();
    } else if (sectionId === 'profile-completion') {
        renderProfileCompletion();
    } else if (sectionId === 'settings') {
        renderSettingsPage();
    } else {
        container.innerHTML = '<h2>404 - Page Not Found</h2>';
    }
}

// 3. UPDATE THE getRestrictedAccessTemplate FUNCTION
// Add business-analytics to the section names
function getRestrictedAccessTemplate(sectionId, profileStatus) {
    const sectionNames = {
         'post-job': 'Post Projects',
         'jobs': 'Browse Projects',
         'my-quotes': 'My Quotes',
         'approved-jobs': 'Approved Projects',
         'estimation-tool': 'AI Estimation',
         'my-estimations': 'My Estimations',
         'messages': 'Messages',
         'business-analytics': 'Business Analytics'  // ADD THIS LINE
    };

    const sectionName = sectionNames[sectionId] || 'This Feature';
    let msg = '', btn = '', icon = 'fa-lock', color = '#f59e0b';

    if (profileStatus === 'incomplete') {
        msg = 'Complete your profile to unlock this feature.';
        btn = `<button class="btn btn-primary" onclick="renderAppSection('profile-completion')">Complete Profile</button>`;
        icon = 'fa-user-edit';
    } else if (profileStatus === 'pending') {
        msg = 'Your profile is under review. This feature will be available once approved.';
        btn = `<button class="btn btn-outline" onclick="renderAppSection('settings')">Check Status</button>`;
        icon = 'fa-clock'; color = '#0ea5e9';
    } else if (profileStatus === 'rejected') {
        msg = 'Please update your profile to access this feature.';
        btn = `<button class="btn btn-primary" onclick="renderAppSection('profile-completion')">Update Profile</button>`;
        icon = 'fa-exclamation-triangle'; color = '#ef4444';
    }

    return `<div class="restricted-access-container"><div class="restricted-icon" style="color: ${color};"><i class="fas ${icon}"></i></div><h2>${sectionName} - Access Restricted</h2><p>${msg}</p>${btn}</div>`;
}

// 4. UPDATE NOTIFICATION HANDLING
// Add business analytics case to handleNotificationClick function
function handleNotificationClick(notificationId, type, metadata = {}) {
    // Mark as read first
    markNotificationAsRead(notificationId);

    // Handle navigation based on type
    switch (type) {
        case 'message':
            if (metadata.conversationId) {
                renderConversationView(metadata.conversationId);
            } else if (metadata.jobId && metadata.senderId) {
                openConversation(metadata.jobId, metadata.senderId);
            } else {
                renderAppSection('messages');
            }
            break;
        case 'quote':
            if (metadata.action === 'quote_submitted' && appState.currentUser.type === 'contractor') {
                renderAppSection('jobs');
                if (metadata.jobId) {
                    setTimeout(() => viewQuotes(metadata.jobId), 500);
                }
            } else {
                renderAppSection('my-quotes');
            }
            break;
        case 'job':
            renderAppSection('jobs');
            break;
        case 'estimation':
            renderAppSection('my-estimations');
            break;
        // ADD THIS CASE:
        case 'business_analytics':
            renderAppSection('business-analytics');
            break;
        case 'profile':
            if (metadata.action === 'profile_rejected') {
                renderAppSection('profile-completion');
            } else {
                renderAppSection('settings');
            }
            break;
        case 'support':
            renderAppSection('support');
            if (metadata.ticketId) {
                setTimeout(() => viewSupportTicketDetails(metadata.ticketId), 500);
            }
            break;
        default:
            renderAppSection('dashboard');
            break;
    }

    // Close notification panel
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// 5. UPDATE NOTIFICATION ACTIONS
// Add business analytics case to getNotificationActionButtons function
function getNotificationActionButtons(notification) {
    const { type, metadata } = notification;
    let buttons = '';

    switch (type) {
        case 'message':
            if (metadata.conversationId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderConversationView('${metadata.conversationId}')"><i class="fas fa-eye"></i> View Message</button>`;
            } else if (metadata.jobId && metadata.senderId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata.jobId}', '${metadata.senderId}')"><i class="fas fa-comments"></i> Reply</button>`;
            }
            break;
        case 'quote':
            if (metadata?.action === 'quote_received' && appState.currentUser?.type === 'client') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderApprovedJobsPage()"><i class="fas fa-file-invoice-dollar"></i> View Quote</button>`;
            } else if (metadata?.action === 'quote_accepted' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('approved-jobs')"><i class="fas fa-check-circle"></i> View Approved Job</button>`;
            }
            break;
        case 'job':
             if (metadata?.action === 'job_created' && appState.currentUser?.type === 'designer') {
                 buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('jobs')"><i class="fas fa-search"></i> View Jobs</button>`;
             } else if (metadata?.action === 'job_status_update' && appState.currentUser?.type === 'client') {
                 buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderApprovedJobsPage()"><i class="fas fa-tasks"></i> View Job</button>`;
             }
             break;
        case 'estimation':
            if (metadata?.action === 'estimation_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('my-estimations')"><i class="fas fa-download"></i> View Result</button>`;
            }
            break;
        // ADD THIS CASE:
        case 'business_analytics':
            if (metadata?.action === 'analytics_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('business-analytics')"><i class="fas fa-chart-line"></i> View Report</button>`;
            }
            break;
        case 'profile':
            if (metadata?.action === 'profile_approved') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</button>`;
            } else if (metadata?.action === 'profile_rejected') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button>`;
            }
            break;
        case 'support':
            if (metadata?.ticketId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); viewSupportTicketDetails('${metadata.ticketId}')"><i class="fas fa-eye"></i> View Ticket</button>`;
            } else {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('support')"><i class="fas fa-life-ring"></i> Support Center</button>`;
            }
            break;
        default:
            buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</button>`;
            break;
    }

    return buttons ? `<div class="notification-actions">${buttons}</div>` : '';
}

function renderDashboard() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-tachometer-alt"></i> Dashboard</h2>
                <p class="header-subtitle">Welcome back, ${appState.currentUser.name || appState.currentUser.email}. Here's a quick overview of your projects.</p>
            </div>
        </div>
        <div class="dashboard-grid">
            <div class="summary-card">
                <h3><i class="fas fa-tasks"></i> My Projects</h3>
                <p>Track your active and approved projects.</p>
                <button class="btn btn-secondary" onclick="renderAppSection('jobs')">View Projects</button>
            </div>
            ${appState.currentUser.type === 'client' ? `
            <div class="summary-card">
                <h3><i class="fas fa-plus-circle"></i> Post New Project</h3>
                <p>Have a new project? Post it to get quotes from designers.</p>
                <button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Project</button>
            </div>
            ` : `
            <div class="summary-card">
                <h3><i class="fas fa-file-invoice-dollar"></i> My Quotes</h3>
                <p>Review the quotes you've submitted and their statuses.</p>
                <button class="btn btn-primary" onclick="renderAppSection('my-quotes')">View Quotes</button>
            </div>
            `}
            <div class="summary-card">
                <h3><i class="fas fa-calculator"></i> AI Estimation Tool</h3>
                <p>Get instant cost estimates for your designs.</p>
                <button class="btn btn-outline" onclick="renderAppSection('estimation-tool')">Use Tool</button>
            </div>
            <div class="summary-card">
                <h3><i class="fas fa-comments"></i> Messages</h3>
                <p>Stay connected and collaborate with clients and designers.</p>
                <button class="btn btn-outline" onclick="renderAppSection('messages')">View Messages</button>
            </div>
        </div>
    `;
    updateDashboardSummary();
}

// Function to update summary cards on the dashboard (if needed)
async function updateDashboardSummary() {
    // This is a placeholder. A real implementation would fetch live data.
}

// --- JOBS PORTAL FUNCTIONS ---
async function renderJobsPortal() {
    renderLoadingPage();
    try {
        const response = await apiCall('/jobs', 'GET');
        appState.jobs = response.jobs || [];
        const container = document.getElementById('app-container');
        container.innerHTML = getJobsPortalTemplate();
        renderJobList();
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('app-container').innerHTML = `<div class="error-state"><h3>Error</h3><p>Could not load jobs. Please try again.</p></div>`;
    }
}

function getJobsPortalTemplate() {
    const role = appState.currentUser.type;
    const title = role === 'client' ? 'My Projects' : 'Find Projects';
    const subtitle = role === 'client' ? 'Manage your active projects and track their progress.' : 'Browse projects and submit quotes to potential clients.';
    const actionBtn = role === 'client' ? `<button class="btn btn-primary" onclick="renderAppSection('post-job')"><i class="fas fa-plus-circle"></i> Post New Project</button>` : '';

    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-tasks"></i> ${title}</h2>
                <p class="header-subtitle">${subtitle}</p>
            </div>
            <div class="header-actions">
                ${actionBtn}
            </div>
        </div>
        <div id="jobs-list" class="jobs-list"></div>
    `;
}

function renderJobList() {
    const listContainer = document.getElementById('jobs-list');
    if (!listContainer) return;
    if (appState.jobs.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><h3>No Projects Found</h3><p>There are no projects currently available. Check back later!</p></div>`;
        return;
    }
    listContainer.innerHTML = appState.jobs.map(job => getJobCardTemplate(job)).join('');
}

function getJobCardTemplate(job) {
    const formattedDate = new Date(job.createdAt).toLocaleDateString();
    const isOwner = appState.currentUser.id === job.clientId;
    const actionButton = isOwner ? `
        <button class="btn btn-secondary" onclick="viewQuotes('${job._id}')"><i class="fas fa-eye"></i> View Quotes</button>
    ` : `
        ${appState.userSubmittedQuotes.has(job._id) ? `
            <span class="status-badge submitted">Quote Submitted</span>
        ` : `
            <button class="btn btn-primary" onclick="showSubmitQuoteModal('${job._id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>
        `}
    `;

    return `
        <div class="job-card">
            <div class="job-card-header">
                <h3>${job.title}</h3>
                <span class="job-status ${job.status}">${job.status}</span>
            </div>
            <p class="job-description">${job.description.substring(0, 150)}...</p>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location || 'N/A'}</span>
                <span><i class="fas fa-calendar-alt"></i> Posted: ${formattedDate}</span>
            </div>
            <div class="job-actions">
                <button class="btn btn-outline" onclick="viewJobDetails('${job._id}')"><i class="fas fa-info-circle"></i> Details</button>
                ${actionButton}
            </div>
        </div>
    `;
}

async function viewJobDetails(jobId) {
    try {
        const job = await apiCall(`/jobs/${jobId}`, 'GET');
        const modalContent = `
            <div class="modal-header">
                <h3>${job.title}</h3>
            </div>
            <div class="job-details-content">
                <p><strong>Status:</strong> <span class="job-status ${job.status}">${job.status}</span></p>
                <p><strong>Description:</strong> ${job.description}</p>
                <p><strong>Location:</strong> ${job.location || 'N/A'}</p>
                <p><strong>Posted:</strong> ${new Date(job.createdAt).toLocaleDateString()}</p>
                ${job.files && job.files.length > 0 ? `
                <div class="file-list-container">
                    <h4>Attached Files:</h4>
                    <ul class="file-list">
                        ${job.files.map(file => `
                            <li>
                                <i class="fas fa-file-alt"></i>
                                <a href="${BACKEND_URL}/files/${file.url}" target="_blank">${file.fileName}</a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        `;
        showGenericModal(modalContent, 'max-width: 700px;');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// --- POST JOB FUNCTIONS ---
function renderPostJobForm() {
    const container = document.getElementById('app-container');
    container.innerHTML = getPostJobFormTemplate();
    setupFileUpload();
    document.getElementById('post-job-form').addEventListener('submit', handlePostJobSubmit);
}

function getPostJobFormTemplate() {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-plus-circle"></i> Post a New Project</h2>
                <p class="header-subtitle">Fill in the details below to find the right professionals for your structural steel project.</p>
            </div>
        </div>
        <div class="form-card">
            <form id="post-job-form" class="premium-form">
                <div class="form-group">
                    <label for="title">Project Title</label>
                    <input type="text" id="title" name="title" required>
                </div>
                <div class="form-group">
                    <label for="description">Project Description</label>
                    <textarea id="description" name="description" rows="6" required></textarea>
                </div>
                <div class="form-group">
                    <label for="location">Location</label>
                    <input type="text" id="location" name="location">
                </div>
                <div class="form-group">
                    <label for="files">Attach Design Files</label>
                    <div id="file-drop-area" class="file-drop-area">
                        <i class="fas fa-cloud-upload-alt file-upload-icon"></i>
                        <p>Drag & drop files here or <span class="file-browse-link">browse</span></p>
                        <input type="file" id="file-input" multiple hidden>
                    </div>
                    <ul id="file-list" class="file-list"></ul>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> Post Project</button>
                </div>
            </form>
        </div>
    `;
}

function setupFileUpload() {
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('file-drop-area');
    const fileList = document.getElementById('file-list');
    const fileBrowseLink = dropArea.querySelector('.file-browse-link');

    fileBrowseLink.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', handleDrop, false);
    fileInput.addEventListener('change', handleFileSelect, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = [...dt.files];
        handleFiles(files);
    }

    function handleFileSelect(e) {
        const files = [...e.target.files];
        handleFiles(files);
    }

    function handleFiles(files) {
        files.forEach(file => {
            const fileItem = document.createElement('li');
            fileItem.innerHTML = `<i class="fas fa-file-alt"></i> ${file.name}`;
            fileList.appendChild(fileItem);
            appState.jobFiles.push(file);
        });
    }
}

async function handlePostJobSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';

    const formData = new FormData();
    formData.append('title', form.title.value);
    formData.append('description', form.description.value);
    formData.append('location', form.location.value);
    appState.jobFiles.forEach(file => {
        formData.append('files', file);
    });

    try {
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        appState.jobFiles = []; // Clear file state
        renderAppSection('jobs');
    } catch (error) {
        showNotification(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// --- MY QUOTES & APPROVED JOBS ---
async function renderMyQuotesPage() {
    renderLoadingPage();
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        appState.myQuotes = response.data || [];
        const container = document.getElementById('app-container');
        container.innerHTML = getMyQuotesTemplate();
        renderQuotesList();
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('app-container').innerHTML = `<div class="error-state"><h3>Error</h3><p>Could not load your quotes. Please try again.</p></div>`;
    }
}

function getMyQuotesTemplate() {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Quotes</h2>
                <p class="header-subtitle">View the status of the quotes you have submitted to clients.</p>
            </div>
        </div>
        <div id="quotes-list" class="quotes-list"></div>
    `;
}

function renderQuotesList() {
    const listContainer = document.getElementById('quotes-list');
    if (appState.myQuotes.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><h3>No Quotes Submitted</h3><p>You haven't submitted any quotes yet. Find a project and submit one!</p></div>`;
        return;
    }
    listContainer.innerHTML = appState.myQuotes.map(quote => getQuoteCardTemplate(quote)).join('');
}

function getQuoteCardTemplate(quote) {
    const formattedDate = new Date(quote.createdAt).toLocaleDateString();
    return `
        <div class="quote-card">
            <div class="quote-card-header">
                <h3>Quote for ${quote.jobId}</h3>
                <span class="quote-status ${quote.status}">${quote.status}</span>
            </div>
            <p><strong>Amount:</strong> $${quote.amount.toFixed(2)}</p>
            <p><strong>Submitted:</strong> ${formattedDate}</p>
            <p><strong>Notes:</strong> ${quote.notes || 'N/A'}</p>
            <div class="quote-actions">
                <button class="btn btn-outline" onclick="viewQuoteDetails('${quote._id}')"><i class="fas fa-eye"></i> Details</button>
            </div>
        </div>
    `;
}

async function renderApprovedJobsPage() {
    renderLoadingPage();
    try {
        const response = await apiCall(`/approved-jobs/user/${appState.currentUser.id}`, 'GET');
        appState.approvedJobs = response.jobs || [];
        const container = document.getElementById('app-container');
        container.innerHTML = getApprovedJobsTemplate();
        renderApprovedJobsList();
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('app-container').innerHTML = `<div class="error-state"><h3>Error</h3><p>Could not load approved jobs. Please try again.</p></div>`;
    }
}

function getApprovedJobsTemplate() {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-check-circle"></i> Approved Projects</h2>
                <p class="header-subtitle">View projects that have been approved for fabrication.</p>
            </div>
        </div>
        <div id="approved-jobs-list" class="approved-jobs-list"></div>
    `;
}

function renderApprovedJobsList() {
    const listContainer = document.getElementById('approved-jobs-list');
    if (appState.approvedJobs.length === 0) {
        listContainer.innerHTML = `<div class="empty-state"><h3>No Approved Projects</h3><p>No projects have been approved yet.</p></div>`;
        return;
    }
    listContainer.innerHTML = appState.approvedJobs.map(job => getApprovedJobCardTemplate(job)).join('');
}

function getApprovedJobCardTemplate(job) {
    const formattedDate = new Date(job.createdAt).toLocaleDateString();
    return `
        <div class="approved-job-card">
            <div class="approved-job-card-header">
                <h3>${job.title}</h3>
                <span class="job-status approved">Approved</span>
            </div>
            <p class="job-description">${job.description.substring(0, 150)}...</p>
            <div class="job-meta">
                <span><i class="fas fa-calendar-alt"></i> Approved: ${formattedDate}</span>
            </div>
            <div class="job-actions">
                <button class="btn btn-primary" onclick="openConversation('${job._id}')"><i class="fas fa-comments"></i> Message</button>
                <button class="btn btn-outline" onclick="viewJobDetails('${job._id}')"><i class="fas fa-info-circle"></i> Details</button>
            </div>
        </div>
    `;
}

// --- ESTIMATION TOOL FUNCTIONS ---
function renderEstimationTool() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> AI Estimation Tool</h2>
                <p class="header-subtitle">Upload your design files to get an instant AI-powered cost estimation for your project.</p>
            </div>
        </div>
        <div class="form-card estimation-card">
            <form id="estimation-form" class="premium-form">
                <div class="form-group">
                    <label for="estimation-title">Estimation Title</label>
                    <input type="text" id="estimation-title" name="estimation-title" placeholder="e.g., Warehouse Frame" required>
                </div>
                <div class="form-group">
                    <label for="estimation-description">Project Description</label>
                    <textarea id="estimation-description" name="estimation-description" rows="4" placeholder="Briefly describe the scope of your project..." required></textarea>
                </div>
                <div class="form-group">
                    <label for="drawing-file">Upload Drawing File (PDF/DWG/DXF)</label>
                    <div id="estimation-drop-area" class="file-drop-area">
                        <i class="fas fa-upload file-upload-icon"></i>
                        <p>Drag & drop your file here or <span class="file-browse-link">browse</span></p>
                        <input type="file" id="estimation-file-input" accept=".pdf,.dwg,.dxf" hidden>
                    </div>
                    <ul id="estimation-file-list" class="file-list"></ul>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> Get Estimate</button>
                </div>
            </form>
        </div>
    `;
    updateDynamicHeader();
    setupEstimationFileUpload();
    document.getElementById('estimation-form').addEventListener('submit', handleEstimationSubmit);
}

function setupEstimationFileUpload() {
    const fileInput = document.getElementById('estimation-file-input');
    const dropArea = document.getElementById('estimation-drop-area');
    const fileList = document.getElementById('estimation-file-list');
    const fileBrowseLink = dropArea.querySelector('.file-browse-link');

    fileBrowseLink.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    dropArea.addEventListener('drop', handleEstimationDrop, false);
    fileInput.addEventListener('change', handleEstimationFileSelect, false);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleEstimationDrop(e) {
        const dt = e.dataTransfer;
        const files = [...dt.files];
        handleEstimationFiles(files);
    }

    function handleEstimationFileSelect(e) {
        const files = [...e.target.files];
        handleEstimationFiles(files);
    }

    function handleEstimationFiles(files) {
        if (files.length > 1) {
            showNotification('Please upload only one file.', 'warning');
            return;
        }
        if (files.length === 0) return;

        const file = files[0];
        appState.uploadedFile = file;
        fileList.innerHTML = `<li class="file-item-single"><i class="fas fa-file-alt"></i> ${file.name}</li>`;
    }
}

async function handleEstimationSubmit(event) {
    event.preventDefault();
    if (!appState.uploadedFile) {
        showNotification('Please upload a file before submitting.', 'warning');
        return;
    }

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Analyzing...';

    const formData = new FormData();
    formData.append('file', appState.uploadedFile);
    formData.append('title', form['estimation-title'].value);
    formData.append('description', form['estimation-description'].value);
    formData.append('contractorEmail', appState.currentUser.email);

    try {
        const response = await apiCall('/estimation', 'POST', formData, 'Estimation request submitted!');
        addLocalNotification('Estimation Submitted', 'Your AI estimation is being processed.', 'info');
        appState.uploadedFile = null;
        renderAppSection('my-estimations');
    } catch (error) {
        showNotification(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

async function handleCancelEstimation(estimationId) {
    if (confirm('Are you sure you want to cancel this estimation request? This action cannot be undone.')) {
        try {
            await apiCall(`/estimation/${estimationId}`, 'DELETE', null, 'Estimation cancelled successfully.');
            showNotification('Estimation has been cancelled.', 'info');
            await fetchAndRenderMyEstimations(); // Refresh view
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
}

async function handleDownloadReport(reportId, fileName) {
    showNotification('Preparing your download...', 'info');
    try {
        const response = await apiCall(`/estimation/download/${reportId}`, 'GET');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        showNotification('Report downloaded successfully!', 'success');
    } catch (error) {
        showNotification('Failed to download report.', 'error');
    }
}

function getEstimationStatusConfig(status) {
    switch (status) {
        case 'completed': return { icon: 'fas fa-check-circle', color: '#10b981', text: 'Completed', pulse: false };
        case 'pending': return { icon: 'fas fa-clock', color: '#f59e0b', text: 'Pending', pulse: true };
        case 'cancelled': return { icon: 'fas fa-times-circle', color: '#ef4444', text: 'Cancelled', pulse: false };
        case 'error': return { icon: 'fas fa-exclamation-triangle', color: '#ef4444', text: 'Error', pulse: false };
        default: return { icon: 'fas fa-cog', color: '#6b7280', text: 'Processing', pulse: true };
    }
}

function formatEstimationDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showEmptyEstimatesState() {
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-calculator"></i>
            <h3>No Estimations Found</h3>
            <p>You have not submitted any AI estimation requests yet.</p>
            <button class="btn btn-primary" onclick="renderAppSection('estimation-tool')">
                <i class="fas fa-plus"></i> Submit a New Request
            </button>
        </div>
    `;
}

function showEstimatesLoading(show) {
    const loadingState = document.getElementById('estimates-loading');
    if (loadingState) loadingState.style.display = show ? 'flex' : 'none';
}

function showEstimatesError() {
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = `<div class="error-state"><h3>Error</h3><p>Could not load your estimations. Please try again.</p></div>`;
}

function getEstimationProgress(status) {
    if (status === 'completed') return 100;
    if (status === 'pending') return 50;
    return 0;
}

// --- MESSAGES PORTAL ---
function renderMessagesPortal() {
    renderLoadingPage();
    // This is a placeholder. A real implementation would fetch conversations.
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-comments"></i> Messages</h2>
                <p class="header-subtitle">Communicate with your clients and designers in real-time.</p>
            </div>
        </div>
        <div class="message-app-container">
            <div class="conversation-list" id="conversation-list">
                <h3>Conversations</h3>
                <p class="empty-state">Loading...</p>
            </div>
            <div class="chat-area" id="chat-area">
                <div class="chat-placeholder">
                    <i class="fas fa-comment-dots"></i>
                    <h3>Select a conversation</h3>
                    <p>Click on a conversation to start chatting.</p>
                </div>
            </div>
        </div>
    `;
    fetchConversations();
}

async function fetchConversations() {
    try {
        const response = await apiCall(`/conversations/user/${appState.currentUser.id}`, 'GET');
        appState.conversations = response.conversations || [];
        appState.participants = response.participants || {};
        renderConversationList();
    } catch (error) {
        showNotification(error.message, 'error');
        document.getElementById('conversation-list').innerHTML = `<div class="empty-state"><h3>Error</h3><p>Could not load messages.</p></div>`;
    }
}

function renderConversationList() {
    const listContainer = document.getElementById('conversation-list');
    if (!listContainer) return;
    if (appState.conversations.length === 0) {
        listContainer.innerHTML = `
            <h3>Conversations</h3>
            <div class="empty-state">
                <i class="fas fa-comment-slash"></i>
                <p>No conversations yet.</p>
            </div>`;
        return;
    }
    const convListHTML = appState.conversations.map(conv => {
        const otherParticipantId = conv.participants.find(p => p !== appState.currentUser.id);
        const otherParticipant = appState.participants[otherParticipantId] || { name: 'Unknown User' };
        const lastMessage = conv.lastMessage ? truncateText(conv.lastMessage.content, 50) : 'No messages yet.';
        const activeClass = appState.currentConversationId === conv._id ? 'active' : '';
        return `
            <div class="conversation-item ${activeClass}" onclick="renderConversationView('${conv._id}')">
                <div class="conversation-details">
                    <p class="conversation-title">${otherParticipant.name}</p>
                    <small>${lastMessage}</small>
                </div>
            </div>
        `;
    }).join('');
    listContainer.innerHTML = `<h3>Conversations</h3>` + convListHTML;
}

// --- SUPPORT PORTAL ---
function renderSupportSection() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-life-ring"></i> Support Center</h2>
                <p class="header-subtitle">Find answers to common questions or submit a support ticket for assistance.</p>
            </div>
        </div>
        <div class="support-container">
            <div class="faq-section">
                <h3>Frequently Asked Questions</h3>
                <div class="accordion-container" id="faq-accordion">
                    </div>
            </div>
            <div class="ticket-section">
                <h3><i class="fas fa-ticket-alt"></i> Submit a Support Ticket</h3>
                <form id="support-ticket-form" class="premium-form">
                    <div class="form-group">
                        <label for="ticket-subject">Subject</label>
                        <input type="text" id="ticket-subject" name="subject" required>
                    </div>
                    <div class="form-group">
                        <label for="ticket-description">Description</label>
                        <textarea id="ticket-description" name="description" rows="6" required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Ticket</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    loadFAQs();
    document.getElementById('support-ticket-form').addEventListener('submit', handleSupportTicketSubmit);
}

// ========================================
// START: NEW NOTIFICATION SYSTEM
// ========================================
const notificationState = {
    notifications: [],
    maxStoredNotifications: 100,
    storageKey: 'steelconnect_notifications',
    lastFetchTime: null,
    pollingInterval: null,
    unreadCount: 0,
    unseenCount: 0,
};

async function fetchNotifications() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/notifications', 'GET');
        const newNotifications = response.notifications.filter(
            newNotif => !notificationState.notifications.some(existingNotif => existingNotif.id === newNotif.id)
        );
        let unreadCount = 0;
        let unseenCount = 0;
        const allNotifications = [...newNotifications, ...notificationState.notifications];
        allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        allNotifications.forEach(notif => {
            if (!notif.read) unreadCount++;
            if (!notif.seen) unseenCount++;
        });

        notificationState.notifications = allNotifications.slice(0, notificationState.maxStoredNotifications);
        notificationState.unreadCount = unreadCount;
        notificationState.unseenCount = unseenCount;
        appState.notifications = notificationState.notifications;
        renderNotificationPanel();
        updateNotificationBadge();
        saveNotificationsToStorage();
        if (unseenCount > 0) {
            markNotificationsAsSeen();
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

async function markNotificationsAsSeen() {
    try {
        await apiCall('/notifications/mark-seen', 'POST');
    } catch (error) {
        console.warn('Failed to sync seen status:', error);
    }
}

function renderNotificationPanel() {
    const listContainer = document.getElementById('notification-panel-list');
    if (!listContainer) return;
    if (notificationState.notifications.length === 0) {
        listContainer.innerHTML = `<div class="notification-empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>`;
        return;
    }
    const notificationsHTML = notificationState.notifications.map(notif => {
        const unreadClass = notif.read ? '' : 'notification-unread';
        return `
            <div class="notification-item ${unreadClass}" onclick="handleNotificationClick('${notif.id}', '${notif.type}', ${JSON.stringify(notif.metadata)})">
                <div class="notification-icon-container">
                    <i class="fas fa-info-circle notification-icon"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <span class="notification-title">${notif.title}</span>
                        <span class="notification-date">${timeAgo(notif.createdAt)}</span>
                    </div>
                    <p class="notification-message">${notif.message}</p>
                    ${getNotificationActionButtons(notif)}
                </div>
            </div>
        `;
    }).join('');
    listContainer.innerHTML = notificationsHTML;
}

function timeAgo(dateString) {
    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.round((now - then) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);
    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

function getNotificationActionButtons(notification) {
    const { type, metadata } = notification;
    let buttons = '';

    switch (type) {
        case 'message':
            if (metadata.conversationId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderConversationView('${metadata.conversationId}')"><i class="fas fa-eye"></i> View Message</button>`;
            } else if (metadata.jobId && metadata.senderId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata.jobId}', '${metadata.senderId}')"><i class="fas fa-comments"></i> Reply</button>`;
            }
            break;
        case 'quote':
            if (metadata?.action === 'quote_received' && appState.currentUser?.type === 'client') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderApprovedJobsPage()"><i class="fas fa-file-invoice-dollar"></i> View Quote</button>`;
            } else if (metadata?.action === 'quote_accepted' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('approved-jobs')"><i class="fas fa-check-circle"></i> View Approved Job</button>`;
            }
            break;
        case 'job':
             if (metadata?.action === 'job_created' && appState.currentUser?.type === 'designer') {
                 buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('jobs')"><i class="fas fa-search"></i> View Jobs</button>`;
             } else if (metadata?.action === 'job_status_update' && appState.currentUser?.type === 'client') {
                 buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderApprovedJobsPage()"><i class="fas fa-tasks"></i> View Job</button>`;
             }
             break;
        case 'estimation':
            if (metadata?.action === 'estimation_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('my-estimations')"><i class="fas fa-download"></i> View Result</button>`;
            }
            break;
        // ADD THIS CASE:
        case 'business_analytics':
            if (metadata?.action === 'analytics_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('business-analytics')"><i class="fas fa-chart-line"></i> View Report</button>`;
            }
            break;
        case 'profile':
            if (metadata?.action === 'profile_approved') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</button>`;
            } else if (metadata?.action === 'profile_rejected') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button>`;
            }
            break;
        case 'support':
            if (metadata?.ticketId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); viewSupportTicketDetails('${metadata.ticketId}')"><i class="fas fa-eye"></i> View Ticket</button>`;
            } else {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('support')"><i class="fas fa-life-ring"></i> Support Center</button>`;
            }
            break;
        default:
            buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('dashboard')"><i class="fas fa-tachometer-alt"></i> Dashboard</button>`;
            break;
    }

    return buttons ? `<div class="notification-actions">${buttons}</div>` : '';
}

function handleNotificationClick(notificationId, type, metadata = {}) {
    // Mark as read first
    markNotificationAsRead(notificationId);

    // Handle navigation based on type
    switch (type) {
        case 'message':
            if (metadata.conversationId) {
                renderConversationView(metadata.conversationId);
            } else if (metadata.jobId && metadata.senderId) {
                openConversation(metadata.jobId, metadata.senderId);
            } else {
                renderAppSection('messages');
            }
            break;
        case 'quote':
            if (metadata.action === 'quote_submitted' && appState.currentUser.type === 'contractor') {
                renderAppSection('jobs');
                if (metadata.jobId) {
                    setTimeout(() => viewQuotes(metadata.jobId), 500);
                }
            } else {
                renderAppSection('my-quotes');
            }
            break;
        case 'job':
            renderAppSection('jobs');
            break;
        case 'estimation':
            renderAppSection('my-estimations');
            break;
        // ADD THIS CASE:
        case 'business_analytics':
            renderAppSection('business-analytics');
            break;
        case 'profile':
            if (metadata.action === 'profile_rejected') {
                renderAppSection('profile-completion');
            } else {
                renderAppSection('settings');
            }
            break;
        case 'support':
            renderAppSection('support');
            if (metadata.ticketId) {
                setTimeout(() => viewSupportTicketDetails(metadata.ticketId), 500);
            }
            break;
        default:
            renderAppSection('dashboard');
            break;
    }

    // Close notification panel
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.remove('active');
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const notification = notificationState.notifications.find(n => n.id === notificationId);
        if (notification && !notification.isRead && !notification.read) {
            notification.isRead = true;
            notification.read = true;
            if (notificationState.unreadCount > 0) notificationState.unreadCount--;
            updateNotificationBadge();
            renderNotificationPanel();
            saveNotificationsToStorage();
        }
        apiCall(`/notifications/${notificationId}/read`, 'PATCH').catch(e => console.warn('Failed to sync read status:', e));
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        let hasUnread = false;
        notificationState.notifications.forEach(n => {
            if (!n.isRead && !n.read) {
                n.isRead = true;
                n.read = true;
                hasUnread = true;
            }
        });
        if (hasUnread) {
            notificationState.unreadCount = 0;
            updateNotificationBadge();
            renderNotificationPanel();
            saveNotificationsToStorage();
        }
        await apiCall('/notifications/mark-all-read', 'POST');
        showNotification('All notifications marked as read.', 'success');
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        showNotification('Marked as read locally (server sync failed)', 'warning');
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        const unreadCount = notificationState.unreadCount;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
            if (!badge.classList.contains('pulse')) {
                badge.classList.add('pulse');
                setTimeout(() => badge.classList.remove('pulse'), 2000);
            }
        } else {
            badge.style.display = 'none';
            badge.classList.remove('pulse');
        }
    }
}

function startNotificationPolling() {
    if (notificationState.pollingInterval) clearInterval(notificationState.pollingInterval);
    fetchNotifications();
    notificationState.pollingInterval = setInterval(() => {
        if (appState.currentUser) fetchNotifications();
        else stopNotificationPolling();
    }, 20000);
    console.log('🔔 Notification polling started');
}

function stopNotificationPolling() {
    if (notificationState.pollingInterval) {
        clearInterval(notificationState.pollingInterval);
        notificationState.pollingInterval = null;
        console.log('🔕 Notification polling stopped');
    }
}

async function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (!panel) return;
    const isActive = panel.classList.toggle('active');
    if (isActive) {
        const panelList = document.getElementById('notification-panel-list');
        if (panelList && notificationState.notifications.length === 0) {
            panelList.innerHTML = `<div class="notification-loading-state"><div class="spinner"></div><p>Loading notifications...</p></div>`;
        }
        await fetchNotifications();
        if (notificationState.unseenCount > 0) {
            notificationState.unseenCount = 0;
            saveNotificationsToStorage();
        }
    }
}

function initializeNotificationSystem() {
    console.log('🚀 Initializing notification system...');
    loadStoredNotifications();
    if (notificationState.notifications.length > 0) {
        appState.notifications = notificationState.notifications;
        renderNotificationPanel();
        updateNotificationBadge();
    }
    if (appState.currentUser) startNotificationPolling();
    setupNotificationEventListeners();
    console.log('✅ Notification system initialized');
}

function setupNotificationEventListeners() {
    const bell = document.getElementById('notification-bell-container');
    if (bell) bell.addEventListener('click', toggleNotificationPanel);
    const clearBtn = document.getElementById('clear-notifications-btn');
    if (clearBtn) clearBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        markAllAsRead();
    });
    document.addEventListener('click', (event) => {
        const panel = document.getElementById('notification-panel');
        const bellContainer = document.getElementById('notification-bell-container');
        if (panel && bellContainer && !bellContainer.contains(event.target) && !panel.contains(event.target)) {
            panel.classList.remove('active');
        }
    });
}

function cleanupNotificationSystem() {
    stopNotificationPolling();
    if (notificationState.notifications.length > 0) saveNotificationsToStorage();
    notificationState.notifications = [];
    notificationState.unreadCount = 0;
    notificationState.unseenCount = 0;
    appState.notifications = [];
    updateNotificationBadge();
    const panelList = document.getElementById('notification-panel-list');
    if (panelList) panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p><small>Sign in to see your notifications</small></div>`;
    console.log('🧹 Notification system cleaned up');
}

function addLocalNotification(title, message, type = 'info', metadata = {}) {
    const newNotification = {
        id: `local_${Date.now()}`,
        title,
        message,
        type,
        metadata,
        createdAt: new Date().toISOString(),
        isRead: false,
        read: false,
    };
    notificationState.notifications.unshift(newNotification);
    appState.notifications.unshift(newNotification);
    notificationState.unreadCount++;
    if (notificationState.notifications.length > notificationState.maxStoredNotifications) {
        notificationState.notifications = notificationState.notifications.slice(0, notificationState.maxStoredNotifications);
    }
    saveNotificationsToStorage();
    renderNotificationPanel();
    updateNotificationBadge();
    showNotification(message, type);
}

// ========================================
// END: NEW NOTIFICATION SYSTEM
// ========================================
async function loadUserQuotes() {
    if (appState.currentUser.type !== 'designer') return;
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.userSubmittedQuotes.clear();
        quotes.forEach(quote => {
            if (quote.status === 'submitted') {
                appState.userSubmittedQuotes.add(quote.jobId);
            }
        });
    } catch (error) {
        console.error('Error loading user quotes:', error);
    }
}
// --- ENHANCED ESTIMATION SYSTEM ---
async function loadUserEstimations() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall(`/estimation/contractor/${appState.currentUser.email}`, 'GET');
        appState.myEstimations = response.estimations || [];
    } catch (error) {
        console.error('Error loading user estimations:', error);
        appState.myEstimations = [];
    }
}

async function fetchAndRenderMyEstimations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header estimates-header">
            <div class="header-content">
                <h2><i class="fas fa-chart-line"></i> My AI Estimation Requests</h2>
                <p class="header-subtitle">Track your cost estimation submissions, view AI analysis results, and manage project estimates</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary btn-new-estimate" onclick="renderAppSection('estimation-tool')">
                    <i class="fas fa-plus"></i> New Estimation Request
                </button>
            </div>
        </div>
        <div class="estimates-dashboard">
            <div id="estimations-list" class="estimations-grid-professional"></div>
            <div id="estimates-loading" class="estimates-loading" style="display: none;">
                <div class="loading-animation"><div class="spinner-professional"></div><p>Loading your estimation requests...</p></div>
            </div>
        </div>`;
    updateDynamicHeader();
    showEstimatesLoading(true);
    try {
        await loadUserEstimations();
        renderEstimatesGrid();
        if (appState.myEstimations.length === 0) showEmptyEstimatesState();
    } catch (error) {
        showEstimatesError();
    } finally {
        showEstimatesLoading(false);
    }
}

function renderEstimatesGrid(filteredEstimates = null) {
    const listContainer = document.getElementById('estimations-list');
    const estimates = filteredEstimates || appState.myEstimations;
    if (estimates.length === 0) {
        if (filteredEstimates !== null) listContainer.innerHTML = `<div class="no-results-state"><i class="fas fa-search"></i><h3>No estimates found</h3><p>Try adjusting your search or filter criteria</p></div>`;
        return;
    }
    listContainer.innerHTML = estimates.map(est => {
        const statusConfig = getEstimationStatusConfig(est.status);
        const createdDate = formatEstimationDate(est.createdAt);
        const hasFiles = est.uploadedFiles && est.uploadedFiles.length > 0;
        const canDownloadResult = est.status === 'completed';
        const progress = getEstimationProgress(est.status);
        const canEdit = est.status === 'pending';
        return `
            <div class="estimation-card-pro status-${est.status}">
                <div class="estimation-card-header">
                    <div class="estimation-icon-container">
                        <i class="${statusConfig.icon}" style="color: ${statusConfig.color};"></i>
                    </div>
                    <div class="estimation-info">
                        <h3>${est.title}</h3>
                        <p class="estimation-date">${createdDate}</p>
                    </div>
                    <span class="status-badge ${est.status} ${statusConfig.pulse ? 'pulse' : ''}">${statusConfig.text}</span>
                </div>
                <div class="estimation-card-body">
                    <p class="description-text">${est.description || 'No description provided.'}</p>
                    <div class="estimation-progress-container">
                        <div class="estimation-progress-bar" style="width: ${progress}%;"></div>
                    </div>
                    <p class="estimation-progress-label">${progress}% Complete</p>
                </div>
                <div class="estimation-card-actions">
                    ${canDownloadResult ? `<button class="btn btn-outline" onclick="handleDownloadReport('${est._id}', 'Estimation_Report_${est._id}.html')"><i class="fas fa-download"></i> Download Report</button>` : ''}
                    ${canEdit ? `<button class="btn btn-danger" onclick="handleCancelEstimation('${est._id}')"><i class="fas fa-times"></i> Cancel</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function loadStoredNotifications() {
    try {
        const stored = localStorage.getItem(notificationState.storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.notifications)) {
                notificationState.notifications = parsed.notifications;
                notificationState.unreadCount = parsed.unreadCount || 0;
                notificationState.unseenCount = parsed.unseenCount || 0;
            }
        }
    } catch (e) {
        console.error("Failed to load notifications from storage", e);
        localStorage.removeItem(notificationState.storageKey);
    }
}

function saveNotificationsToStorage() {
    try {
        const dataToStore = {
            notifications: notificationState.notifications.slice(0, 50), // Store only a subset
            unreadCount: notificationState.unreadCount,
            unseenCount: notificationState.unseenCount,
        };
        localStorage.setItem(notificationState.storageKey, JSON.stringify(dataToStore));
    } catch (e) {
        console.error("Failed to save notifications to storage", e);
    }
}

// Global functions (stubs for functionality not fully implemented here)
function renderConversationView(conversationId) { console.log('Rendering conversation:', conversationId); }
function openConversation(jobId, senderId) { console.log('Opening new conversation for job:', jobId, 'with sender:', senderId); }
function viewQuotes(jobId) { console.log('Viewing quotes for job:', jobId); }
function showSubmitQuoteModal(jobId) { console.log('Showing submit quote modal for job:', jobId); }
function viewQuoteDetails(quoteId) { console.log('Viewing quote details:', quoteId); }
function renderProfileCompletion() { console.log('Rendering profile completion page'); }
function renderSettingsPage() { console.log('Rendering settings page'); }
function viewSupportTicketDetails(ticketId) { console.log('Viewing support ticket:', ticketId); }
function loadFAQs() { console.log('Loading FAQs'); }
function handleSupportTicketSubmit(event) { event.preventDefault(); console.log('Support ticket submitted'); }
function formatDetailedDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return date.toLocaleDateString(undefined, options);
    } catch (e) {
        return 'Invalid Date';
    }
}
// Add the new CSS
const businessAnalyticsStyles = `.business-analytics-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}.analysis-card {
    background: white;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}.analysis-card.status-pending {
    border-left: 4px solid #f59e0b;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}.analysis-card.status-completed {
    border-left: 4px solid #10b981;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}.analysis-iframe {
    width: 100%;
    height: 600px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    margin: 20px 0;
}.report-container {
    margin: 20px 0;
}.report-placeholder {
    text-align: center;
    padding: 60px 20px;
    background: #f9fafb;
    border: 2px dashed #d1d5db;
    border-radius: 8px;
}.report-placeholder i {
    font-size: 48px;
    color: #9ca3af;
    margin-bottom: 16px;
}.request-summary ul {
    list-style: none;
    padding: 0;
}.request-summary li {
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
}.request-summary li:last-child {
    border-bottom: none;
}.analysis-history-list {
    max-height: 500px;
    overflow-y: auto;
}.history-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    background: white;
}.history-item.status-completed {
    border-left: 4px solid #10b981;
}.history-item.status-pending {
    border-left: 4px solid #f59e0b;
}.history-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}.history-item-date {
    font-weight: 500;
    color: #374151;
}.history-item-footer {
    margin-top: 12px;
    text-align: right;
}.business-analytics-link .nav-badge {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    margin-left: 8px;
}`;
// Inject the styles
const styleSheet = document.createElement('style');
styleSheet.textContent = businessAnalyticsStyles;
document.head.appendChild(styleSheet);
