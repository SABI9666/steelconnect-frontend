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
    uploadedFile: null,
    myEstimations: [],
    // Caching Timestamps
    myEstimationsLastFetched: null,
    jobsLastFetched: null,
    recentActivityLastFetched: null,
    myQuotesLastFetched: null,
    // End Caching Timestamps
    currentHeaderSlide: 0,
    notifications: [],
};

// --- ENHANCED NOTIFICATION SYSTEM STATE ---
const notificationState = {
    notifications: [],
    maxStoredNotifications: 50,
    storageKey: 'steelconnect_notifications',
    lastFetchTime: null,
    pollingInterval: null,
};


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
        ['click', 'keydown', 'mousemove'].forEach(event => document.removeEventListener(event, dismissHandler));
    };
    ['click', 'keydown', 'mousemove'].forEach(event => document.addEventListener(event, dismissHandler));
}

function dismissInactivityWarning() {
    const warning = document.getElementById('inactivity-warning');
    if (warning) {
        warning.remove();
        resetInactivityTimer();
    }
}


function initializeApp() {
    console.log("SteelConnect App Initializing...");

    window.addEventListener('click', (event) => {
        const userInfoContainer = document.getElementById('user-info-container');
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        if (userInfoDropdown && userInfoContainer && !userInfoContainer.contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
        const notificationPanel = document.getElementById('notification-panel');
        const notificationBellContainer = document.getElementById('notification-bell-container');
        if (notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)) {
            notificationPanel.classList.remove('active');
        }
    });

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart', 'touchmove', 'wheel'];
    activityEvents.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn')?.addEventListener('click', () => showAuthModal('register'));

    document.querySelector('.logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('dashboard');
        } else {
            showLandingPageView();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
            initializeEnhancedNotifications();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
    initializeHeaderRotation();
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

async function apiCall(endpoint, method, body = null, successMessage = null) {
    try {
        const options = { method, headers: {} };
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
        if (response.status === 204 || response.headers.get("content-length") === "0") {
             if (!response.ok) {
                const errorMsg = response.headers.get('X-Error-Message') || `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
             }
             if (successMessage) showNotification(successMessage, 'success');
             return { success: true };
        }
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || `Request failed with status ${response.status}`);
        }
        if (successMessage) {
            showNotification(successMessage, 'success');
        }
        return responseData;
    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = {
        name: form.regName.value,
        email: form.regEmail.value,
        password: form.regPassword.value,
        type: form.regRole.value,
    };
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.')
        .then(() => renderAuthForm('login'))
        .catch(() => {});
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
        initializeEnhancedNotifications();
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
    } catch (error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    console.log('Logging out user...');
    enhancedLogout();
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
    appState.myEstimationsLastFetched = null;
    appState.jobsLastFetched = null;
    appState.recentActivityLastFetched = null;
    appState.myQuotesLastFetched = null;
    localStorage.clear();
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
    dismissInactivityWarning();
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

async function loadUserQuotes() {
    if (appState.currentUser.type !== 'designer') return;
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        appState.userSubmittedQuotes.clear();
        (response.data || []).forEach(quote => {
            if (quote.status === 'submitted') {
                appState.userSubmittedQuotes.add(quote.jobId);
            }
        });
    } catch (error) {
        console.error('Error loading user quotes:', error);
    }
}

// --- ENHANCED NOTIFICATION SYSTEM WITH LOCAL STORAGE PERSISTENCE ---
function loadStoredNotifications() {
    try {
        const stored = localStorage.getItem(notificationState.storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.notifications)) {
                notificationState.notifications = parsed.notifications;
                notificationState.lastFetchTime = parsed.lastFetchTime ? new Date(parsed.lastFetchTime) : null;
                console.log(`Loaded ${notificationState.notifications.length} stored notifications`);
            }
        }
    } catch (error) {
        console.error('Error loading stored notifications:', error);
        notificationState.notifications = [];
    }
}

function saveNotificationsToStorage() {
    try {
        const dataToStore = {
            notifications: notificationState.notifications.slice(0, notificationState.maxStoredNotifications),
            lastFetchTime: notificationState.lastFetchTime,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(notificationState.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
        console.error('Error saving notifications to storage:', error);
    }
}

async function fetchNotifications() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/notifications', 'GET');
        const serverNotifications = response.data || [];
        const mergedNotifications = mergeNotifications(serverNotifications, notificationState.notifications);
        appState.notifications = mergedNotifications;
        notificationState.notifications = mergedNotifications;
        notificationState.lastFetchTime = new Date();
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
    } catch (error) {
        console.error("Error fetching notifications:", error);
        if (notificationState.notifications.length > 0) {
            appState.notifications = notificationState.notifications;
            renderNotificationPanel();
            updateNotificationBadge();
        }
    }
}

function mergeNotifications(serverNotifications, storedNotifications) {
    const notificationMap = new Map();
    [...storedNotifications, ...serverNotifications].forEach(notification => {
        if (notification && notification.id) {
            notificationMap.set(notification.id, notification);
        }
    });
    return Array.from(notificationMap.values())
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, notificationState.maxStoredNotifications);
}

function addNotification(message, type = 'info', metadata = {}) {
    const newNotification = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message, type, metadata,
        createdAt: new Date().toISOString(),
        isRead: false, isLocal: true
    };
    appState.notifications.unshift(newNotification);
    notificationState.notifications.unshift(newNotification);
    appState.notifications = appState.notifications.slice(0, notificationState.maxStoredNotifications);
    notificationState.notifications = notificationState.notifications.slice(0, notificationState.maxStoredNotifications);
    saveNotificationsToStorage();
    renderNotificationPanel();
    updateNotificationBadge();
    showNotification(message, type);
    console.log('Added local notification:', newNotification);
}

function getNotificationIcon(type) {
    const iconMap = {
        info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle', message: 'fa-comment-alt', job: 'fa-briefcase',
        quote: 'fa-file-invoice-dollar', estimation: 'fa-calculator', user: 'fa-user', file: 'fa-paperclip'
    };
    return iconMap[type] || 'fa-info-circle';
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    if (!panelList) return;
    const notifications = appState.notifications || [];
    if (notifications.length === 0) {
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i><p>No notifications</p>
                <small>You'll see updates here when things happen</small>
            </div>`;
        return;
    }
    try {
        panelList.innerHTML = notifications.map(n => {
            const icon = getNotificationIcon(n.type);
            const timeAgo = formatMessageTimestamp(n.createdAt);
            const metadataString = JSON.stringify(n.metadata || {}).replace(/"/g, '&quot;');
            return `
                <div class="notification-item ${n.isRead ? 'read' : 'unread'} ${n.isLocal ? 'local-notification' : ''}"
                     data-id="${n.id}" onclick="handleNotificationClick('${n.id}', '${n.type}', ${metadataString})">
                    <div class="notification-item-icon ${n.type}">
                        <i class="fas ${icon}"></i>
                        ${n.isLocal ? '<div class="local-indicator" title="Local notification"></div>' : ''}
                    </div>
                    <div class="notification-item-content">
                        <p>${n.message}</p><span class="timestamp">${timeAgo}</span>
                    </div>
                    ${!n.isRead ? '<div class="unread-indicator"></div>' : ''}
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Error rendering notifications:', error);
        panelList.innerHTML = `
            <div class="notification-error-state">
                <i class="fas fa-exclamation-triangle"></i><p>Error loading notifications</p>
                <button onclick="fetchNotifications()" class="btn btn-sm btn-outline">Retry</button>
            </div>`;
    }
}

function handleNotificationClick(notificationId, type, metadata) {
    markNotificationAsRead(notificationId);
    switch (type) {
        case 'job': renderAppSection('jobs'); break;
        case 'quote': renderAppSection(appState.currentUser.type === 'designer' ? 'my-quotes' : 'jobs'); break;
        case 'message': metadata.conversationId ? renderConversationView(metadata.conversationId) : renderAppSection('messages'); break;
        case 'estimation': renderAppSection('my-estimations'); break;
    }
    document.getElementById('notification-panel')?.classList.remove('active');
}

async function markNotificationAsRead(notificationId) {
    const updateInArray = (arr) => {
        const notification = arr.find(n => n.id == notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            return true;
        }
        return false;
    };
    if (updateInArray(appState.notifications) || updateInArray(notificationState.notifications)) {
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
    }
    const notification = appState.notifications.find(n => n.id == notificationId);
    if (notification && !notification.isLocal) {
        try {
            await apiCall(`/notifications/${notificationId}/read`, 'PUT');
        } catch (error) {
            console.error('Failed to mark notification as read on server:', error);
        }
    }
}

async function markAllAsRead() {
    try {
        appState.notifications.forEach(n => n.isRead = true);
        notificationState.notifications.forEach(n => n.isRead = true);
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
        await apiCall('/notifications/mark-all-read', 'PUT');
        showNotification('All notifications marked as read.', 'success');
    } catch (error) {
        console.error('Failed to mark all notifications as read on server:', error);
        showNotification('Marked as read locally (server sync failed)', 'warning');
    }
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        const unreadCount = (appState.notifications || []).filter(n => !n.isRead).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
            badge.classList.add('pulse');
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
        appState.currentUser ? fetchNotifications() : stopNotificationPolling();
    }, 30000);
    console.log('Notification polling started');
}

function stopNotificationPolling() {
    if (notificationState.pollingInterval) {
        clearInterval(notificationState.pollingInterval);
        notificationState.pollingInterval = null;
        console.log('Notification polling stopped');
    }
}

async function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        const isActive = panel.classList.toggle('active');
        if (isActive) {
            const panelList = document.getElementById('notification-panel-list');
            if (panelList && appState.notifications.length === 0) {
                panelList.innerHTML = `<div class="notification-loading-state"><div class="spinner"></div><p>Loading...</p></div>`;
            }
            await fetchNotifications();
        }
    }
}

function clearOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const filterFn = n => new Date(n.createdAt) > cutoffDate;
    const originalCount = notificationState.notifications.length;
    notificationState.notifications = notificationState.notifications.filter(filterFn);
    appState.notifications = appState.notifications.filter(filterFn);
    if (originalCount !== notificationState.notifications.length) {
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
        console.log(`Cleared ${originalCount - notificationState.notifications.length} old notifications`);
    }
}

function initializeEnhancedNotifications() {
    loadStoredNotifications();
    if (notificationState.notifications.length > 0) {
        appState.notifications = notificationState.notifications;
        renderNotificationPanel();
        updateNotificationBadge();
    }
    if (appState.currentUser) {
        startNotificationPolling();
    }
    clearOldNotifications(30);
}

function enhancedLogout() {
    stopNotificationPolling();
    if (notificationState.notifications.length > 0) {
        saveNotificationsToStorage();
    }
    console.log('Enhanced notification system cleaned up for logout');
}

// --- CACHED DATA FETCHING FUNCTIONS ---
async function loadUserEstimations(forceRefresh = false) {
    if (!appState.currentUser) return;
    const now = new Date();
    const minutesSinceLastFetch = appState.myEstimationsLastFetched ? (now - appState.myEstimationsLastFetched) / 60000 : Infinity;

    if (!forceRefresh && appState.myEstimations.length > 0 && minutesSinceLastFetch < 2) {
        console.log("Using cached user estimations.");
        return;
    }
    try {
        const response = await apiCall(`/estimation/contractor/${appState.currentUser.email}`, 'GET');
        appState.myEstimations = response.estimations || [];
        appState.myEstimationsLastFetched = new Date();
    } catch (error) {
        console.error('Error loading user estimations:', error);
        appState.myEstimations = [];
    }
}

async function fetchAndRenderMyEstimations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Estimation Requests</h2>
                <p class="header-subtitle">Track your cost estimation submissions and results</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="renderAppSection('estimation-tool')"><i class="fas fa-plus"></i> New Request</button>
            </div>
        </div>
        <div id="estimations-list" class="estimations-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading estimations...</p></div>';
    await loadUserEstimations();
    if (appState.myEstimations.length === 0) {
        listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-calculator"></i></div><h3>No Estimation Requests Yet</h3><p>Upload your project drawings to get accurate cost estimates.</p><button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')"><i class="fas fa-upload"></i> Upload First Project</button></div>`;
        return;
    }
    listContainer.innerHTML = appState.myEstimations.map(estimation => {
        const statusConfig = getEstimationStatusConfig(estimation.status);
        return `
            <div class="estimation-card premium-card">
                <div class="estimation-header">
                    <div class="estimation-title-section">
                        <h3 class="estimation-title">${estimation.projectTitle}</h3>
                        <span class="estimation-status-badge ${estimation.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span>
                    </div>
                    ${estimation.estimatedAmount ? `<div class="estimation-amount"><span class="amount-label">Estimated Cost</span><span class="amount-value">$${estimation.estimatedAmount.toLocaleString()}</span></div>` : ''}
                </div>
                <div class="estimation-description"><p>${estimation.description}</p></div>
                <div class="estimation-meta">
                    <div class="meta-item"><i class="fas fa-calendar-plus"></i><span>Submitted: ${new Date(estimation.createdAt).toLocaleDateString()}</span></div>
                    <div class="meta-item"><i class="fas fa-clock"></i><span>Updated: ${new Date(estimation.updatedAt).toLocaleDateString()}</span></div>
                </div>
                <div class="estimation-actions">
                    ${estimation.uploadedFiles?.length > 0 ? `<button class="btn btn-outline btn-sm" onclick="viewEstimationFiles('${estimation._id}')"><i class="fas fa-eye"></i> View Files</button>` : ''}
                    ${estimation.resultFile ? `<button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${estimation._id}')"><i class="fas fa-download"></i> Download Result</button>` : ''}
                    ${estimation.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="deleteEstimation('${estimation._id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
                </div>
            </div>`;
    }).join('');
}

function getEstimationStatusConfig(status) {
    const configs = {
        'pending': { icon: 'fa-clock', label: 'Under Review' }, 'in-progress': { icon: 'fa-cogs', label: 'Processing' },
        'completed': { icon: 'fa-check-circle', label: 'Complete' }, 'rejected': { icon: 'fa-times-circle', label: 'Rejected' },
        'cancelled': { icon: 'fa-ban', label: 'Cancelled' }
    };
    return configs[status] || { icon: 'fa-question-circle', label: status };
}

async function viewEstimationFiles(estimationId) {
    try {
        const response = await apiCall(`/estimation/${estimationId}/files`, 'GET');
        const content = `
            <div class="modal-header"><h3><i class="fas fa-folder-open"></i> Uploaded Project Files</h3></div>
            <div class="files-list premium-files">
                ${(response.files || []).length === 0 ? `<div class="empty-state"><i class="fas fa-file"></i><p>No files found.</p></div>` : response.files.map(file => `
                    <div class="file-item">
                        <div class="file-info"><i class="fas fa-file-pdf"></i><div class="file-details"><h4>${file.name}</h4><span class="file-date">Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}</span></div></div>
                        <a href="${file.url}" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i> View</a>
                    </div>`).join('')}
            </div>`;
        showGenericModal(content, 'max-width: 600px;');
    } catch (error) {
        addNotification('Failed to load estimation files.', 'error');
    }
}

async function downloadEstimationResult(estimationId) {
    try {
        const response = await apiCall(`/estimation/${estimationId}/result`, 'GET');
        if (response.success && response.resultFile) {
            window.open(response.resultFile.url, '_blank');
        }
    } catch (error) {
        addNotification('Failed to download estimation result.', 'error');
    }
}

async function deleteEstimation(estimationId) {
    if (confirm('Are you sure you want to delete this estimation request?')) {
        try {
            await apiCall(`/estimation/${estimationId}`, 'DELETE', null, 'Estimation deleted successfully');
            addNotification('Estimation request has been deleted.', 'info');
            await fetchAndRenderMyEstimations(true); // Force refresh
        } catch (error) {
            addNotification('Failed to delete estimation request.', 'error');
        }
    }
}

// --- JOB FUNCTIONS ---
async function fetchAndRenderJobs(loadMore = false, forceRefresh = false) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    const now = new Date();
    const minutesSinceLastFetch = appState.jobsLastFetched ? (now - appState.jobsLastFetched) / 60000 : Infinity;

    if (!forceRefresh && !loadMore && appState.jobs.length > 0 && minutesSinceLastFetch < 2) {
        console.log("Using cached jobs.");
        if (jobsListContainer) renderJobsHTML(appState.jobs); // Re-render from cache
        return;
    }

    if (!loadMore) {
        appState.jobs = [];
        appState.jobsPage = 1;
        appState.hasMoreJobs = true;
        if (jobsListContainer) jobsListContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div>';
    }
    if (!jobsListContainer || !appState.hasMoreJobs) {
        if (loadMoreContainer) loadMoreContainer.innerHTML = '';
        return;
    }
    const user = appState.currentUser;
    const endpoint = user.type === 'designer' ? `/jobs?page=${appState.jobsPage}&limit=6` : `/jobs/user/${user.id}`;
    if (loadMoreContainer) loadMoreContainer.innerHTML = `<button class="btn btn-loading" disabled><div class="btn-spinner"></div>Loading...</button>`;
    try {
        const response = await apiCall(endpoint, 'GET');
        const newJobs = response.data || [];
        appState.jobs.push(...newJobs);
        appState.jobsLastFetched = new Date();
        if (user.type === 'designer') {
            appState.hasMoreJobs = response.pagination.hasNext;
            appState.jobsPage += 1;
        } else {
            appState.hasMoreJobs = false;
        }
        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Post your first project and connect with professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }
        renderJobsHTML(appState.jobs);
    } catch (error) {
        if (jobsListContainer) jobsListContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs(false, true)">Retry</button></div>`;
    }
}

function renderJobsHTML(jobs) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    const user = appState.currentUser;

    const jobsHTML = jobs.map(job => {
        const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
        const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
        let actions;
        if (user.type === 'designer') {
            if (canQuote) actions = `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`;
            else if (hasUserQuoted) actions = `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`;
            else if (job.status === 'assigned') actions = `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`;
        } else {
            actions = `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
        }
        const statusIcon = job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle';
        const statusBadge = `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'open' ? 'fa-clock' : statusIcon}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>`;
        const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
        return `
            <div class="job-card premium-card" data-job-id="${job.id}">
                <div class="job-header">
                    <div class="job-title-section"><h3 class="job-title">${job.title}</h3>${statusBadge}</div>
                    <div class="job-budget-section"><span class="budget-label">Budget</span><span class="budget-amount">${job.budget}</span></div>
                </div>
                <div class="job-meta">
                    <div class="job-meta-item"><i class="fas fa-user"></i><span>By: <strong>${job.posterName || 'N/A'}</strong></span></div>
                    ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i><span>To: <strong>${job.assignedToName}</strong></span></div>` : ''}
                    ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i><span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                </div>
                <div class="job-description"><p>${job.description}</p></div>
                ${skillsDisplay}
                ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank">Project Link</a></div>` : ''}
                ${job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank">View Attachment</a></div>` : ''}
                <div class="job-actions">${actions}</div>
            </div>`;
    }).join('');

    if (jobsListContainer) jobsListContainer.innerHTML = jobsHTML;
    if (loadMoreContainer) {
        if (user.type === 'designer' && appState.hasMoreJobs) {
            loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More</button>`;
            document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }
}

async function fetchAndRenderApprovedJobs() {
    // This could also be cached if needed, following the same pattern
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><h2><i class="fas fa-check-circle"></i> Approved Projects</h2><p>Manage your approved projects</p></div>
        <div id="approved-jobs-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('approved-jobs-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div>';
    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        appState.approvedJobs = (response.data || []).filter(job => job.status === 'assigned');
        if (appState.approvedJobs.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }
        listContainer.innerHTML = appState.approvedJobs.map(job => `
            <div class="job-card premium-card approved-job">
                <div class="job-header">
                    <h3 class="job-title">${job.title}</h3><span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span>
                    <div class="approved-amount"><span class="amount-label">Approved</span><span class="amount-value">${job.approvedAmount}</span></div>
                </div>
                <div class="job-meta"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>
                <p class="job-description">${job.description}</p>
                <div class="job-actions"><button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message</button><button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button></div>
            </div>`).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><h3>Error Loading Projects</h3><button onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed?')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed!');
            addNotification('A project has been marked as completed!', 'job');
            fetchAndRenderApprovedJobs();
        } catch (error) {
            addNotification('Failed to mark job as completed.', 'error');
        }
    }
}

async function fetchAndRenderMyQuotes(forceRefresh = false) {
    const now = new Date();
    const minutesSinceLastFetch = appState.myQuotesLastFetched ? (now - appState.myQuotesLastFetched) / 60000 : Infinity;
    if (!forceRefresh && appState.myQuotes.length > 0 && minutesSinceLastFetch < 2) {
        console.log("Using cached quotes.");
        renderMyQuotesHTML(appState.myQuotes);
        return;
    }
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2><p>Track your quote submissions</p></div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    document.getElementById('my-quotes-list').innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        appState.myQuotes = response.data || [];
        appState.myQuotesLastFetched = new Date();
        renderMyQuotesHTML(appState.myQuotes);
    } catch(error) {
        document.getElementById('my-quotes-list').innerHTML = `<div class="error-state premium-error"><h3>Error Loading Quotes</h3><button onclick="fetchAndRenderMyQuotes(true)">Retry</button></div>`;
    }
}

function renderMyQuotesHTML(quotes) {
    const listContainer = document.getElementById('my-quotes-list');
    if (quotes.length === 0) {
        listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Submitted</h3><p>Browse available projects to get started.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button></div>`;
        return;
    }
    listContainer.innerHTML = quotes.map(quote => {
        const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
        const actionButtons = [];
        if (quote.status === 'approved') actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
        if (quote.status === 'submitted') {
            actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit</button>`);
            actionButtons.push(`<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
        }
        return `
            <div class="quote-card premium-card quote-status-${quote.status}">
                <div class="quote-header">
                    <h3 class="quote-title">Quote for: ${quote.jobTitle || 'N/A'}</h3>
                    <span class="quote-status-badge ${quote.status}"><i class="fas ${statusIcon}"></i> ${quote.status}</span>
                    <div class="quote-amount-section"><span class="amount-label">Amount</span><span class="amount-value">${quote.quoteAmount}</span></div>
                </div>
                <div class="quote-meta">
                    ${quote.timeline ? `<div><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                    <div><i class="fas fa-clock"></i><span>Submitted: <strong>${new Date(quote.createdAt).toLocaleDateString()}</strong></span></div>
                </div>
                <p class="quote-description">${quote.description}</p>
                <div class="quote-actions">${actionButtons.join('')}</div>
            </div>`;
    }).join('');
}


async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        showGenericModal(`
            <div class="modal-header"><h3><i class="fas fa-edit"></i> Edit Quote</h3><p>For: <strong>${quote.jobTitle}</strong></p></div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group"><label><i class="fas fa-dollar-sign"></i> Amount ($)</label><input type="number" name="amount" value="${quote.quoteAmount}" required></div>
                    <div class="form-group"><label><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" name="timeline" value="${quote.timeline || ''}" required></div>
                </div>
                <div class="form-group"><label><i class="fas fa-file-alt"></i> Description</label><textarea name="description" required>${quote.description}</textarea></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update</button></div>
            </form>`, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {
        addNotification('Failed to load quote for editing.', 'error');
    }
}

async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall(`/quotes/${form.quoteId.value}`, 'PUT', formData, 'Quote updated successfully!');
        addNotification('Your quote has been updated.', 'quote');
        closeModal();
        await fetchAndRenderMyQuotes(true);
    } catch (error) {
        addNotification('Failed to update quote.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addNotification(`Your project "${formData.get('title')}" has been posted.`, 'job');
        form.reset();
        renderAppSection('jobs');
        await fetchAndRenderJobs(false, true); // Force refresh
    } catch (error) {
        addNotification('Failed to post project.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted.');
            addNotification('Project has been deleted.', 'info');
            await fetchAndRenderJobs(false, true);
        } catch (error) {
            addNotification('Failed to delete project.', 'error');
        }
    }
}


async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted.');
            addNotification('Quote has been deleted.', 'info');
            await fetchAndRenderMyQuotes(true);
            await loadUserQuotes();
        } catch (error) {
            addNotification('Failed to delete quote.', 'error');
        }
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        let quotesHTML = `<div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3></div>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><h3>No Quotes Received</h3><p>Check back later.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">${quotes.map(quote => {
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                if (canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve</button>${actionButtons}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${actionButtons}`;
                }
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
                return `
                    <div class="quote-item premium-quote-item quote-status-${quote.status}">
                        <div class="quote-item-header">
                            <div class="designer-info"><div class="designer-avatar">${quote.designerName[0]}</div><h4>${quote.designerName}</h4></div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        <p>${quote.description}</p>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            }).join('')}</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');
    } catch (error) {
        showGenericModal(`<h3>Error</h3><p>Could not load quotes for this project.</p>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote?')) {
        try {
            await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved!');
            addNotification('You have approved a quote and assigned the project!', 'quote');
            closeModal();
            await fetchAndRenderJobs(false, true);
        } catch (error) {
            addNotification('Failed to approve quote.', 'error');
        }
    }
}

function showQuoteModal(jobId) {
    showGenericModal(`
        <div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3></div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" name="amount" required></div>
                <div class="form-group"><label><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" name="timeline" required></div>
            </div>
            <div class="form-group"><label><i class="fas fa-file-alt"></i> Proposal Description</label><textarea name="description" required></textarea></div>
            <div class="form-group"><label><i class="fas fa-paperclip"></i> Attachments (Optional)</label><input type="file" name="attachments" multiple></div>
            <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit</button></div>
        </form>`, 'max-width: 600px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        addNotification('Your quote has been submitted.', 'quote');
        appState.userSubmittedQuotes.add(formData.get('jobId'));
        closeModal();
        await fetchAndRenderJobs(false, true);
    } catch (error) {
        addNotification('Failed to submit quote.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// --- MESSAGING SYSTEM ---
async function openConversation(jobId, recipientId) {
    try {
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {
        addNotification('Failed to open conversation.', 'error');
    }
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><h2><i class="fas fa-comments"></i> Messages</h2></div>
        <div id="conversations-list" class="conversations-container premium-conversations"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;
    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3></div>`;
            return;
        }
        listContainer.innerHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherName = otherParticipant?.name || 'Unknown';
            return `
                <div class="conversation-card premium-card" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${getAvatarColor(otherName)}">${otherName[0]}</div>
                    <div class="convo-details">
                        <h4>${otherName}</h4>
                        <p><strong>${convo.jobTitle}</strong></p>
                        <p>${convo.lastMessage || 'No messages yet.'}</p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Conversations</h3></div>`;
    }
}

function getTimeAgo(timestamp) {
    const diffInMinutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[name.charCodeAt(0) % colors.length];
}

function formatDetailedTimestamp(date) {
    const today = new Date();
    const messageDate = new Date(date);
    const time = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (today.toDateString() === messageDate.toDateString()) return time;
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (yesterday.toDateString() === messageDate.toDateString()) return `Yesterday, ${time}`;
    return `${messageDate.toLocaleDateString()}, ${time}`;
}

function formatMessageTimestamp(date) {
    const diffSeconds = Math.round((new Date() - new Date(date)) / 1000);
    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
}

async function renderConversationView(conversationOrId) {
    let conversation = typeof conversationOrId === 'string'
        ? appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId }
        : conversationOrId;
    if (!conversation.participants) {
        try {
            const response = await apiCall('/messages', 'GET');
            appState.conversations = response.data || [];
            conversation = appState.conversations.find(c => c.id === conversation.id);
        } catch(e) { /* Handle error */ }
        if (!conversation) {
            showNotification('Conversation not found.', 'error');
            return;
        }
    }
    const otherParticipant = conversation.participants.find(p => p.id !== appState.currentUser.id);
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="chat-container premium-chat">
            <div class="chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn"><i class="fas fa-arrow-left"></i></button>
                <h3>${otherParticipant?.name || 'Conversation'}</h3>
            </div>
            <div class="chat-messages" id="chat-messages-container"></div>
            <form id="send-message-form" class="message-form">
                <input type="text" id="message-text-input" placeholder="Type your message..." required>
                <button type="submit" class="send-button"><i class="fas fa-paper-plane"></i></button>
            </form>
        </div>`;
    document.getElementById('send-message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(conversation.id);
    });
    const messagesContainer = document.getElementById('chat-messages-container');
    messagesContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        const messages = response.data || [];
        if (messages.length === 0) {
            messagesContainer.innerHTML = `<div class="empty-messages"><h4>Start the conversation</h4></div>`;
        } else {
            let messagesHTML = '';
            let lastDate = null;
            messages.forEach(msg => {
                const messageDate = new Date(msg.createdAt).toDateString();
                if(messageDate !== lastDate) {
                    messagesHTML += `<div class="chat-date-separator"><span>${new Date(msg.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric' })}</span></div>`;
                    lastDate = messageDate;
                }
                const isMine = msg.senderId === appState.currentUser.id;
                messagesHTML += `
                    <div class="message-wrapper ${isMine ? 'me' : 'them'}">
                        <div class="message-bubble">${msg.text}</div>
                        <div class="message-meta">${formatDetailedTimestamp(msg.createdAt)}</div>
                    </div>`;
            });
            messagesContainer.innerHTML = messagesHTML;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `<div class="error-messages"><h4>Error loading messages.</h4></div>`;
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const sendBtn = document.querySelector('.send-button');
    const text = input.value.trim();
    if (!text || !conversationId) return;
    input.disabled = true;
    sendBtn.disabled = true;
    try {
        const response = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${appState.jwtToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send message');
        if (data.success) {
            input.value = '';
            const messagesContainer = document.getElementById('chat-messages-container');
            const newMessage = data.data;
            if(messagesContainer.querySelector('.empty-messages')) messagesContainer.innerHTML = '';
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-wrapper me';
            messageBubble.innerHTML = `<div class="message-bubble">${newMessage.text}</div><div class="message-meta">${formatDetailedTimestamp(newMessage.createdAt)}</div>`;
            messagesContainer.appendChild(messageBubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch(error) {
        console.error('Message send failed:', error);
        showNotification(error.message || 'Failed to send message.', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

// --- UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    <div id="modal-form-container"></div>
                </div>
            </div>`;
        renderAuthForm(view);
    }
}

function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    if (!container) return;
    container.innerHTML = view === 'login' ? getLoginTemplate() : getRegisterTemplate();
    const formId = view === 'login' ? 'login-form' : 'register-form';
    const handler = view === 'login' ? handleLogin : handleRegister;
    document.getElementById(formId).addEventListener('submit', handler);
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" style="${style}" onclick="event.stopPropagation()">
                    <button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    ${innerHTML}
                </div>
            </div>`;
    }
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    document.getElementById('main-nav-menu').innerHTML = '';

    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('user-info').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-info-dropdown').classList.toggle('active');
    });
    document.getElementById('user-settings-link').addEventListener('click', (e) => {
        e.preventDefault(); renderAppSection('settings');
        document.getElementById('user-info-dropdown').classList.remove('active');
    });
    document.getElementById('user-logout-link').addEventListener('click', (e) => { e.preventDefault(); logout(); });

    const notificationBell = document.getElementById('notification-bell-container');
    notificationBell.removeEventListener('click', toggleNotificationPanel);
    notificationBell.addEventListener('click', toggleNotificationPanel);
    const clearBtn = document.getElementById('clear-notifications-btn');
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
    newClearBtn.addEventListener('click', (e) => { e.stopPropagation(); markAllAsRead(); });

    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = user.name.charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('dashboard');
    resetInactivityTimer();
}


function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    document.getElementById('main-nav-menu').innerHTML = `
        <a href="#ai-estimation" class="nav-link">AI Estimation</a>
        <a href="#how-it-works" class="nav-link">How It Works</a>
        <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>`;
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;
    if (role === 'designer') {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Estimation</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="my-estimations"><i class="fas fa-file-invoice fa-fw"></i><span>My Estimations</span></a>`;
    }
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>
              <hr class="sidebar-divider">
              <a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

function renderAppSection(sectionId) {
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    const container = document.getElementById('app-container');
    const userRole = appState.currentUser.type;
    switch(sectionId) {
        case 'dashboard':
            container.innerHTML = getDashboardTemplate(appState.currentUser);
            renderRecentActivityWidgets();
            break;
        case 'jobs':
            const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
            container.innerHTML = `
                <div class="section-header modern-header"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2></div>
                <div id="jobs-list" class="jobs-grid"></div>
                <div id="load-more-container" class="load-more-section"></div>`;
            fetchAndRenderJobs();
            break;
        case 'post-job':
            container.innerHTML = getPostJobTemplate();
            document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
            break;
        case 'my-quotes': fetchAndRenderMyQuotes(); break;
        case 'approved-jobs': fetchAndRenderApprovedJobs(); break;
        case 'messages': fetchAndRenderConversations(); break;
        case 'estimation-tool':
            container.innerHTML = getEstimationToolTemplate();
            setupEstimationToolEventListeners();
            break;
        case 'my-estimations': fetchAndRenderMyEstimations(); break;
        case 'settings': container.innerHTML = getSettingsTemplate(appState.currentUser); break;
    }
}

async function renderRecentActivityWidgets(forceRefresh = false) {
    const now = new Date();
    const minutesSinceLastFetch = appState.recentActivityLastFetched ? (now - appState.recentActivityLastFetched) / 60000 : Infinity;
    if (!forceRefresh && minutesSinceLastFetch < 2) {
        console.log("Using cached recent activity.");
        // We might need to re-render from cached data if it's not visible, but for now, we just skip the fetch
        return;
    }
    const user = appState.currentUser;
    const projectWidget = document.getElementById('recent-projects-widget');
    const quoteWidget = document.getElementById('recent-quotes-widget');
    appState.recentActivityLastFetched = new Date(); // Update timestamp
    if (user.type === 'contractor' && projectWidget) {
        projectWidget.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const response = await apiCall(`/jobs/user/${user.id}?limit=3`, 'GET');
            const jobs = (response.data || []).slice(0, 3);
            if (jobs.length > 0) {
                projectWidget.innerHTML = jobs.map(job => `<div class="widget-list-item"><p>${job.title}</p><span class="widget-item-status ${job.status}">${job.status}</span></div>`).join('');
            } else {
                projectWidget.innerHTML = '<p class="widget-empty-text">No recent projects.</p>';
            }
        } catch(e) { projectWidget.innerHTML = '<p class="widget-empty-text">Could not load projects.</p>'; }
    } else if (user.type === 'designer' && quoteWidget) {
        quoteWidget.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const response = await apiCall(`/quotes/user/${user.id}?limit=3`, 'GET');
            const quotes = (response.data || []).slice(0, 3);
            if (quotes.length > 0) {
                quoteWidget.innerHTML = quotes.map(quote => `<div class="widget-list-item"><p>Quote for: ${quote.jobTitle}</p><span class="widget-item-status ${quote.status}">${quote.status}</span></div>`).join('');
            } else {
                quoteWidget.innerHTML = '<p class="widget-empty-text">No recent quotes.</p>';
            }
        } catch(e) { quoteWidget.innerHTML = '<p class="widget-empty-text">Could not load quotes.</p>'; }
    }
}


// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header"><h2>Welcome Back</h2></div>
        <form id="login-form" class="premium-form">
            <div class="form-group"><label>Email Address</label><input type="email" name="loginEmail" required></div>
            <div class="form-group"><label>Password</label><input type="password" name="loginPassword" required></div>
            <button type="submit" class="btn btn-primary btn-full">Sign In</button>
        </form>
        <div class="auth-switch">No account? <a onclick="renderAuthForm('register')">Create one</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header"><h2>Join SteelConnect</h2></div>
        <form id="register-form" class="premium-form">
            <div class="form-group"><label>Full Name</label><input type="text" name="regName" required></div>
            <div class="form-group"><label>Email Address</label><input type="email" name="regEmail" required></div>
            <div class="form-group"><label>Password</label><input type="password" name="regPassword" required></div>
            <div class="form-group"><label>I am a...</label><select name="regRole" required><option value="" disabled selected>Select role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
        <div class="auth-switch">Have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div class="section-header"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2></div>
        <div class="post-job-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-group"><label>Project Title</label><input type="text" name="title" required></div>
                <div class="form-row">
                    <div class="form-group"><label>Budget Range</label><input type="text" name="budget" required></div>
                    <div class="form-group"><label>Project Deadline</label><input type="date" name="deadline" required></div>
                </div>
                <div class="form-group"><label>Required Skills (comma-separated)</label><input type="text" name="skills"></div>
                <div class="form-group"><label>Detailed Description</label><textarea name="description" required></textarea></div>
                <div class="form-group"><label>Project Attachments</label><input type="file" name="attachment"></div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large">Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div class="section-header"><h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2></div>
        <div class="estimation-tool-container">
            <form id="estimation-form" class="premium-estimation-form">
                <div class="file-upload-section">
                    <div id="file-upload-area" class="file-upload-area">
                        <input type="file" id="file-upload-input" accept=".pdf,.dwg,.jpg,.png" multiple />
                        <div class="upload-content"><i class="fas fa-cloud-upload-alt"></i><h3>Drag & Drop Files Here</h3><p>or click to browse</p></div>
                    </div>
                    <div id="file-info-container" style="display: none;"><h4>Selected Files</h4><div id="selected-files-list"></div></div>
                </div>
                <div class="form-section">
                    <div class="form-group"><label>Project Title</label><input type="text" name="projectTitle" required></div>
                    <div class="form-group"><label>Project Description</label><textarea name="description" required></textarea></div>
                </div>
                <div class="form-actions">
                    <button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large" disabled>Submit Estimation Request</button>
                </div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name.split(' ')[0];
    const contractorActions = `
        <div class="quick-action-card" onclick="renderAppSection('post-job')"><i class="fas fa-plus-circle"></i><h3>Create Project</h3></div>
        <div class="quick-action-card" onclick="renderAppSection('jobs')"><i class="fas fa-tasks"></i><h3>My Projects</h3></div>
        <div class="quick-action-card" onclick="renderAppSection('estimation-tool')"><i class="fas fa-calculator"></i><h3>AI Estimation</h3></div>
        <div class="quick-action-card" onclick="renderAppSection('approved-jobs')"><i class="fas fa-check-circle"></i><h3>Approved</h3></div>`;
    const designerActions = `
        <div class="quick-action-card" onclick="renderAppSection('jobs')"><i class="fas fa-search"></i><h3>Browse Projects</h3></div>
        <div class="quick-action-card" onclick="renderAppSection('my-quotes')"><i class="fas fa-file-invoice-dollar"></i><h3>My Quotes</h3></div>
        <div class="quick-action-card" onclick="renderAppSection('messages')"><i class="fas fa-comments"></i><h3>Messages</h3></div>`;
    return `
        <div class="dashboard-container">
            <div class="dashboard-hero">
                <h2>Welcome back, ${name} 👋</h2>
                <p>You are logged in to your <strong>${isContractor ? 'Contractor' : 'Designer'} Portal</strong>.</p>
            </div>
            <h3 class="dashboard-section-title">Quick Actions</h3>
            <div class="dashboard-grid">${isContractor ? contractorActions : designerActions}</div>
            <div class="dashboard-columns">
                <div class="widget-card">
                    <h3><i class="fas fa-history"></i> Recent Activity</h3>
                    <div id="${isContractor ? 'recent-projects-widget' : 'recent-quotes-widget'}" class="widget-content"></div>
                </div>
                <div class="widget-card">
                    <h3><i class="fas fa-user-circle"></i> Your Profile</h3>
                    <div class="widget-content">
                        <p>Complete your profile to attract more opportunities.</p>
                        <div class="progress-bar-container"><div class="progress-bar" style="width: 75%;"></div></div>
                        <p class="progress-label">75% Complete</p>
                        <button class="btn btn-outline" onclick="renderAppSection('settings')"><i class="fas fa-edit"></i> Update Profile</button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getSettingsTemplate(user) {
    return `
        <div class="section-header"><h2><i class="fas fa-cog"></i> Settings</h2></div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Personal Information</h3>
                <form onsubmit="event.preventDefault(); showNotification('Profile updated!', 'success');">
                    <div class="form-group"><label>Full Name</label><input type="text" value="${user.name}" required></div>
                    <div class="form-group"><label>Email Address</label><input type="email" value="${user.email}" disabled></div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                <form onsubmit="event.preventDefault(); showNotification('Password functionality not implemented.', 'info');">
                    <div class="form-group"><label>Current Password</label><input type="password"></div>
                    <div class="form-group"><label>New Password</label><input type="password"></div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>`;
}
