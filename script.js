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
        showNotification(`Welcome to SteelConnect, ${data.user.name}!`, 'success');
    } catch (error) {
        // Error is already shown by apiCall
    }
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
        const response = await apiCall('/notifications?markSeen=true', 'GET');
        if (response.success) {
            const serverNotifications = response.notifications || [];
            notificationState.notifications = serverNotifications;
            appState.notifications = serverNotifications;
            notificationState.unreadCount = response.unreadCount || 0;
            notificationState.unseenCount = response.unseenCount || 0;
            notificationState.lastFetchTime = new Date();
            saveNotificationsToStorage();
            renderNotificationPanel();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        loadStoredNotifications();
        if (notificationState.notifications.length > 0) {
            appState.notifications = notificationState.notifications;
            renderNotificationPanel();
            updateNotificationBadge();
        }
    }
}

function loadStoredNotifications() {
    try {
        const stored = localStorage.getItem(notificationState.storageKey);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.notifications)) {
                notificationState.notifications = parsed.notifications;
                notificationState.lastFetchTime = parsed.lastFetchTime ? new Date(parsed.lastFetchTime) : null;
                notificationState.unreadCount = parsed.unreadCount || 0;
                notificationState.unseenCount = parsed.unseenCount || 0;
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
            unreadCount: notificationState.unreadCount,
            unseenCount: notificationState.unseenCount,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(notificationState.storageKey, JSON.stringify(dataToStore));
    } catch (error) {
        console.error('Error saving notifications to storage:', error);
    }
}

function getNotificationIcon(type) {
    const iconMap = {
        info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle', message: 'fa-comment-alt', job: 'fa-briefcase',
        quote: 'fa-file-invoice-dollar', estimation: 'fa-calculator', profile: 'fa-user-circle',
        user: 'fa-user', file: 'fa-paperclip'
    };
    return iconMap[type] || 'fa-info-circle';
}

function getNotificationColor(type) {
    const colorMap = {
        info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
        message: '#8b5cf6', job: '#06b6d4', quote: '#f97316', estimation: '#84cc16',
        profile: '#6366f1', user: '#64748b', file: '#94a3b8'
    };
    return colorMap[type] || '#6b7280';
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    if (!panelList) return;
    const notifications = notificationState.notifications || [];
    if (notifications.length === 0) {
        panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p><small>You'll see updates here when things happen</small></div>`;
        return;
    }
    try {
        const groupedNotifications = groupNotificationsByDate(notifications);
        let notificationsHTML = '';
        Object.keys(groupedNotifications).forEach(dateGroup => {
            notificationsHTML += `
                <div class="notification-date-group">
                    <div class="notification-date-header">${dateGroup}</div>
                    ${groupedNotifications[dateGroup].map(n => {
                        const icon = getNotificationIcon(n.type);
                        const color = getNotificationColor(n.type);
                        const timeAgo = formatMessageTimestamp(n.createdAt);
                        const metadataString = JSON.stringify(n.metadata || {}).replace(/"/g, '&quot;');
                        return `
                            <div class="notification-item ${n.isRead || n.read ? 'read' : 'unread'}" data-id="${n.id}" onclick="handleNotificationClick('${n.id}', '${n.type}', ${metadataString})">
                                <div class="notification-item-icon" style="background-color: ${color}20; color: ${color}"><i class="fas ${icon}"></i></div>
                                <div class="notification-item-content">
                                    <div class="notification-item-header">
                                        <span class="notification-title">${n.title || 'Notification'}</span>
                                        <span class="notification-time">${timeAgo}</span>
                                    </div>
                                    <p class="notification-message">${n.message}</p>
                                    ${getNotificationActionButtons(n)}
                                </div>
                                ${!n.isRead && !n.read ? '<div class="unread-indicator"></div>' : ''}
                            </div>`;
                    }).join('')}
                </div>`;
        });
        panelList.innerHTML = notificationsHTML;
    } catch (error) {
        console.error('Error rendering notifications:', error);
        panelList.innerHTML = `<div class="notification-error-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading notifications</p><button onclick="fetchNotifications()" class="btn btn-sm btn-outline">Retry</button></div>`;
    }
}

function groupNotificationsByDate(notifications) {
    const groups = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    notifications.forEach(notification => {
        const notificationDate = new Date(notification.createdAt);
        let groupKey;
        if (isSameDay(notificationDate, today)) groupKey = 'Today';
        else if (isSameDay(notificationDate, yesterday)) groupKey = 'Yesterday';
        else if (isWithinDays(notificationDate, 7)) groupKey = notificationDate.toLocaleDateString([], { weekday: 'long' });
        else groupKey = notificationDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: notificationDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
        if (!groups[groupKey]) groups[groupKey] = [];
        groups[groupKey].push(notification);
    });
    return groups;
}

function isSameDay(date1, date2) { return date1.toDateString() === date2.toDateString(); }
function isWithinDays(date, days) {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
}

function getNotificationActionButtons(notification) {
    const { type, metadata } = notification;
    let buttons = '';
    switch (type) {
        case 'message':
            buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata?.jobId}', '${metadata?.senderId}')"><i class="fas fa-reply"></i> Reply</button>`;
            break;
        case 'quote':
            if (metadata?.action === 'quote_submitted' && appState.currentUser?.type === 'contractor') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); viewQuotes('${metadata?.jobId}')"><i class="fas fa-eye"></i> View Quote</button>`;
            } else if (metadata?.action === 'quote_approved' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata?.jobId}', '${metadata?.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`;
            }
            break;
        case 'job':
            if (metadata?.action === 'job_created' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('jobs')"><i class="fas fa-search"></i> View Job</button>`;
            }
            break;
        case 'estimation':
            if (metadata?.action === 'estimation_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('my-estimations')"><i class="fas fa-download"></i> View Result</button>`;
            }
            break;
        case 'profile':
            if (metadata?.action === 'profile_approved') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('dashboard')"><i class="fas fa-tachometer-alt"></i> Explore Features</button>`;
            } else if (metadata?.action === 'profile_rejected') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button>`;
            }
            break;
    }
    return buttons ? `<div class="notification-actions">${buttons}</div>` : '';
}

function handleNotificationClick(notificationId, type, metadata) {
    markNotificationAsRead(notificationId);
    switch (type) {
        case 'message':
            if (metadata.conversationId) renderConversationView(metadata.conversationId);
            else if (metadata.jobId && metadata.senderId) openConversation(metadata.jobId, metadata.senderId);
            else renderAppSection('messages');
            break;
        case 'quote':
            if (metadata.action === 'quote_submitted' && appState.currentUser.type === 'contractor') {
                renderAppSection('jobs');
                if (metadata.jobId) setTimeout(() => viewQuotes(metadata.jobId), 500);
            } else if (appState.currentUser.type === 'designer') renderAppSection('my-quotes');
            break;
        case 'job':
            renderAppSection('jobs');
            break;
        case 'estimation':
            renderAppSection('my-estimations');
            break;
        case 'profile':
            if (metadata.action === 'profile_rejected') renderAppSection('profile-completion');
            else renderAppSection('settings');
            break;
        default:
            renderAppSection('dashboard');
            break;
    }
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.remove('active');
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
                n.isRead = true; n.read = true; hasUnread = true;
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
    if (clearBtn) clearBtn.addEventListener('click', (e) => { e.stopPropagation(); markAllAsRead(); });
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
        id: `local_${Date.now()}`, title, message, type, metadata,
        createdAt: new Date().toISOString(), isRead: false, read: false,
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
        // CORRECTED: Only show download button if status is 'completed'
        const canDownloadResult = est.status === 'completed';
        const progress = getEstimationProgress(est.status);
        const canEdit = est.status === 'pending';
        return `
            <div class="estimation-card-professional" data-status="${est.status}" data-title="${est.projectTitle.toLowerCase()}">
                <div class="estimation-card-header">
                    <div class="estimation-title-section">
                        <h3 class="estimation-title">${est.projectTitle}</h3>
                        <p class="estimation-meta">Submitted: ${createdDate}</p>
                    </div>
                    <span class="estimation-status-badge ${est.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span>
                </div>
                <div class="estimation-progress-bar"><div class="progress-bar-fill ${est.status}" style="width: ${progress}%"></div></div>
                <div class="estimation-description"><p>${est.description.length > 150 ? est.description.substring(0, 150) + '...' : est.description}</p></div>
                ${est.estimatedAmount ? `<div class="estimation-amount-section"><span class="amount-label">Estimated Cost</span><span class="amount-value">$${Number(est.estimatedAmount).toLocaleString()}</span></div>` : ''}
                <div class="estimation-actions">
                    ${hasFiles ? `<button class="btn btn-outline btn-sm" onclick="viewEstimationFiles('${est._id}')"><i class="fas fa-folder-open"></i> View Files</button>` : ''}
                    ${canDownloadResult ? `<button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${est._id}')"><i class="fas fa-download"></i> Download Result</button>` : ''}
                    <button class="btn btn-outline btn-sm" onclick="viewEstimationDetails('${est._id}')"><i class="fas fa-eye"></i> Details</button>
                    ${canEdit ? `<button class="btn btn-outline btn-sm" onclick="editEstimation('${est._id}')"><i class="fas fa-edit"></i> Edit</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="deleteEstimation('${est._id}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>`;
    }).join('');
}

function getEstimationProgress(status) {
    const progressMap = { 'pending': 25, 'in-progress': 65, 'completed': 100, 'rejected': 0, 'cancelled': 0 };
    return progressMap[status] || 0;
}

function formatEstimationDate(date) {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function showEstimatesLoading(show) {
    const loading = document.getElementById('estimates-loading');
    const list = document.getElementById('estimations-list');
    if (loading && list) {
        loading.style.display = show ? 'flex' : 'none';
        list.style.display = show ? 'none' : 'grid';
    }
}

function showEmptyEstimatesState() {
    document.getElementById('estimations-list').innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-calculator"></i></div><h3>Start Your First AI Estimation</h3><p>Upload your project drawings to get accurate cost estimates from our AI-powered system.</p><button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')"><i class="fas fa-rocket"></i> Create First Estimation</button></div>`;
}

function showEstimatesError() {
    document.getElementById('estimations-list').innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Unable to Load Estimations</h3><p>We're having trouble loading your requests. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()"><i class="fas fa-redo"></i> Try Again</button></div>`;
}

function viewEstimationDetails(estimationId) {
    const estimation = appState.myEstimations.find(e => e._id === estimationId);
    if (!estimation) return;
    const statusConfig = getEstimationStatusConfig(estimation.status);
    const content = `
        <div class="modal-header estimation-modal-header"><h3>${estimation.projectTitle}</h3><p class="modal-subtitle">Estimation Request Details</p></div>
        <div class="estimation-details-content">
            <p><strong>Status:</strong> <span class="status-${estimation.status}">${statusConfig.label}</span></p>
            <p><strong>Description:</strong> ${estimation.description}</p>
            ${estimation.estimatedAmount ? `<p><strong>Estimated Cost:</strong> $${Number(estimation.estimatedAmount).toLocaleString()}</p>` : ''}
            <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>
        </div>`;
    showGenericModal(content, 'max-width: 800px;');
}

async function editEstimation(estimationId) {
    try {
        const est = appState.myEstimations.find(e => e._id === estimationId);
        if (!est) throw new Error('Estimation not found.');

        const content = `
            <div class="modal-header premium-modal-header"><h3><i class="fas fa-edit"></i> Edit Estimation Request</h3></div>
            <form id="edit-estimation-form" class="premium-form">
                <input type="hidden" name="estimationId" value="${est._id}">
                <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input" name="projectTitle" value="${est.projectTitle}" required></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Description</label><textarea class="form-textarea" name="description" required>${est.description}</textarea></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Request</button></div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-estimation-form').addEventListener('submit', handleEstimationEdit);
    } catch (error) {
        addLocalNotification('Error', 'Failed to load estimation details for editing.', 'error');
    }
}

async function handleEstimationEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const estimationId = form.estimationId.value;
        const updatedData = {
            projectTitle: form.projectTitle.value,
            description: form.description.value,
        };
        await apiCall(`/estimation/${estimationId}`, 'PUT', updatedData, 'Estimation request updated successfully!');
        addLocalNotification('Updated', 'Your estimation request has been updated.', 'success');
        closeModal();
        fetchAndRenderMyEstimations();
    } catch (error) {
        addLocalNotification('Error', 'Failed to update estimation request.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function getEstimationStatusConfig(status) {
    const configs = {
        'pending': { icon: 'fa-clock', label: 'Under Review' }, 'in-progress': { icon: 'fa-cogs', label: 'Processing' },
        'completed': { icon: 'fa-check-circle', label: 'Complete' }, 'rejected': { icon: 'fa-times-circle', label: 'Rejected' },
        'cancelled': { icon: 'fa-ban', label: 'Cancelled' }
    };
    return configs[status] || { icon: 'fa-question-circle', label: status };
}

// --- FILE DOWNLOAD FUNCTIONS ---

async function downloadEstimationResult(estimationId) {
    try {
        addLocalNotification('Download', 'Preparing your download...', 'info');
        const response = await apiCall(`/estimation/${estimationId}/result/download`, 'GET');
        if (response.success && response.downloadUrl) {
            downloadFileDirect(response.downloadUrl, response.filename || 'estimation_result.pdf');
        } else {
            throw new Error(response.message || 'Download URL not available');
        }
    } catch (error) {
        console.error('Download error:', error);
        addLocalNotification('Error', `Download failed: ${error.message}`, 'error');
    }
}

async function viewEstimationFiles(estimationId) {
    try {
        addLocalNotification('Loading Files', 'Loading estimation files...', 'info');
        const response = await apiCall(`/estimation/${estimationId}/files`, 'GET');
        const files = response.files || [];
        const content = `
            <div class="modal-header">
                <h3><i class="fas fa-folder-open"></i> Uploaded Project Files</h3>
                <p class="modal-subtitle">Files submitted with your estimation request</p>
            </div>
            <div class="files-list premium-files">
                ${files.length === 0 ?
                    `<div class="empty-state"><i class="fas fa-file"></i><p>No files found.</p></div>` :
                    files.map(file => `
                        <div class="file-item">
                            <div class="file-info">
                                <i class="fas fa-file-pdf"></i>
                                <div class="file-details">
                                    <h4>${file.name}</h4>
                                    <span class="file-date">Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button class="btn btn-outline btn-sm" onclick="downloadFileDirect('${file.url}', '${file.name}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    `).join('')
                }
            </div>`;
        showGenericModal(content, 'max-width: 600px;');
    } catch (error) {
        addLocalNotification('Error', 'Failed to load estimation files.', 'error');
    }
}

// Universal direct download function
function downloadFileDirect(url, filename) {
    try {
        if (!url) {
            throw new Error('Download URL not provided');
        }
        showNotification('Starting download...', 'info');
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'download';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Direct download error:', error);
        showNotification(`Download failed: ${error.message}`, 'error');
    }
}


async function deleteEstimation(estimationId) {
    if (confirm('Are you sure you want to delete this estimation request? This cannot be undone.')) {
        try {
            await apiCall(`/estimation/${estimationId}`, 'DELETE', null, 'Estimation deleted successfully');
            addLocalNotification('Deleted', 'Estimation request has been deleted.', 'info');
            fetchAndRenderMyEstimations();
        } catch (error) {
            addLocalNotification('Error', 'Failed to delete estimation request.', 'error');
        }
    }
}

// --- ENHANCED JOB FUNCTIONS ---
async function fetchAndRenderJobs(loadMore = false) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');
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
    const endpoint = user.type === 'designer'
        ? `/jobs?page=${appState.jobsPage}&limit=6`
        : `/jobs/user/${user.id}`;
    if (loadMoreContainer) loadMoreContainer.innerHTML = `<button class="btn btn-loading" disabled><div class="btn-spinner"></div>Loading...</button>`;
    try {
        const response = await apiCall(endpoint, 'GET');
        const newJobs = response.data || [];
        appState.jobs.push(...newJobs);
        if (user.type === 'designer') {
            appState.hasMoreJobs = response.pagination.hasNext;
            appState.jobsPage += 1;
        } else {
            appState.hasMoreJobs = false;
        }
        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Post your first project and connect with talented professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }
        const jobsHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote
                ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`
                : user.type === 'designer' && hasUserQuoted
                ? `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : user.type === 'designer' && job.status === 'assigned'
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>` : '';
            const actions = user.type === 'designer' ? quoteButton : `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-outline" onclick="editJob('${job.id}')"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            const statusBadge = `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>`;
            const attachmentLinks = job.attachments && job.attachments.length > 0 ? `
                <div class="job-attachments">
                    <i class="fas fa-paperclip"></i>
                    <span>Attachments (${job.attachments.length}):</span>
                    <div class="attachment-links">
                        ${job.attachments.map((attachment, index) => `<a href="${attachment.url}" target="_blank" rel="noopener noreferrer" class="attachment-link"><i class="fas fa-file"></i> ${attachment.name || `File ${index + 1}`}</a>`).join('')}
                    </div>
                </div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            return `
                <div class="job-card premium-card" data-job-id="${job.id}">
                    <div class="job-header"><div class="job-title-section"><h3 class="job-title">${job.title}</h3>${statusBadge}</div><div class="job-budget-section"><span class="budget-label">Budget</span><span class="budget-amount">${job.budget}</span></div></div>
                    <div class="job-meta">
                        <div class="job-meta-item"><i class="fas fa-user"></i><span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span></div>
                        ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>` : ''}
                        ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i><span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank">Project Link</a></div>` : ''}
                    ${attachmentLinks}
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
    } catch (error) {
        if (jobsListContainer) jobsListContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
    }
}

async function editJob(jobId) {
    try {
        const response = await apiCall(`/jobs/${jobId}`, 'GET');
        const job = response.data;
        const deadline = job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '';
        const skills = job.skills ? job.skills.join(', ') : '';
        const content = `
            <div class="modal-header premium-modal-header"><h3><i class="fas fa-edit"></i> Edit Your Project</h3></div>
            <form id="edit-job-form" class="premium-form">
                <input type="hidden" name="jobId" value="${job.id}">
                <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input" name="title" value="${job.title}" required></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label><input type="text" class="form-input" name="budget" value="${job.budget}" required></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Deadline</label><input type="date" class="form-input" name="deadline" value="${deadline}" required></div>
                </div>
                <div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Skills</label><input type="text" class="form-input" name="skills" value="${skills}"></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Description</label><textarea class="form-textarea" name="description" required>${job.description}</textarea></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Project</button></div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-job-form').addEventListener('submit', handleJobEdit);
    } catch (error) {
        addLocalNotification('Error', 'Failed to load project details for editing.', 'error');
    }
}

async function handleJobEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const jobId = form.jobId.value;
        const updatedData = {
            title: form.title.value,
            description: form.description.value,
            budget: form.budget.value,
            deadline: form.deadline.value,
            skills: form.skills.value,
        };
        await apiCall(`/jobs/${jobId}`, 'PUT', updatedData, 'Project updated successfully!');
        addLocalNotification('Updated', 'Your project has been updated successfully.', 'success');
        closeModal();
        fetchAndRenderJobs();
    } catch (error) {
        addLocalNotification('Error', 'Failed to update project. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}


async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-check-circle"></i> Approved Projects</h2><p class="header-subtitle">Manage your approved projects and communicate</p></div></div>
        <div id="approved-jobs-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('approved-jobs-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading approved projects...</p></div>';
    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        const approvedJobs = (response.data || []).filter(job => job.status === 'assigned');
        appState.approvedJobs = approvedJobs;
        if (approvedJobs.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }
        listContainer.innerHTML = approvedJobs.map(job => {
             const attachmentLinks = job.attachments && job.attachments.length > 0 ? `
                <div class="job-attachments">
                    <i class="fas fa-paperclip"></i>
                    <span>Attachments (${job.attachments.length}):</span>
                    <div class="attachment-links">
                        ${job.attachments.map((attachment, index) => `<a href="${attachment.url}" target="_blank" rel="noopener noreferrer" class="attachment-link"><i class="fas fa-file"></i> ${attachment.name || `File ${index + 1}`}</a>`).join('')}
                    </div>
                </div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            return `
                <div class="job-card premium-card approved-job">
                    <div class="job-header"><div class="job-title-section"><h3 class="job-title">${job.title}</h3><span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span></div><div class="approved-amount"><span class="amount-label">Amount</span><span class="amount-value">${job.approvedAmount}</span></div></div>
                    <div class="job-meta"><div class="job-meta-item"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div></div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank">Project Link</a></div>` : ''}
                    ${attachmentLinks}
                    <div class="job-actions"><div class="job-actions-group"><button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button><button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button></div></div>
                </div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Approved Projects</h3><p>Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed?')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed!');
            addLocalNotification('Completed', 'Project marked as completed!', 'job');
            fetchAndRenderApprovedJobs();
        } catch (error) {
            addLocalNotification('Error', 'Failed to mark job as completed.', 'error');
        }
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2>
                <p class="header-subtitle">Track your quote submissions</p>
            </div>
        </div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;
        updateDynamicHeader();
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';

    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;

        if (quotes.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Submitted</h3>
                    <p>You haven't submitted any quotes yet. Find projects to get started.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button>
                </div>`;
            return;
        }

        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            const hasAttachments = attachments.length > 0;

            let attachmentSection = '';
            if (hasAttachments) {
                attachmentSection = `
                    <div class="quote-attachment">
                        <i class="fas fa-paperclip"></i>
                        <span>Attachments (${attachments.length})</span>
                        <button class="btn btn-xs btn-outline" onclick="viewQuoteAttachments('${quote.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>`;
            }

            const canDelete = quote.status === 'submitted';
            const canEdit = quote.status === 'submitted';
            const statusIcon = {
                'submitted': 'fa-clock',
                'approved': 'fa-check-circle',
                'rejected': 'fa-times-circle'
            }[quote.status] || 'fa-question-circle';
            const statusClass = quote.status;

            const actionButtons = [];
            if (quote.status === 'approved') {
                actionButtons.push(`
                    <button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')">
                        <i class="fas fa-comments"></i> Message Client
                    </button>`);
            }
            if (canEdit) {
                actionButtons.push(`
                    <button class="btn btn-outline" onclick="editQuote('${quote.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>`);
            }
            if (canDelete) {
                actionButtons.push(`
                    <button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>`);
            }

            return `
                <div class="quote-card premium-card quote-status-${statusClass}">
                    <div class="quote-header">
                        <div class="quote-title-section">
                            <h3 class="quote-title">Quote for: ${quote.jobTitle || 'N/A'}</h3>
                            <span class="quote-status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i>
                                 ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                        </div>
                        <div class="quote-amount-section">
                            <span class="amount-label">Amount</span>
                            <span class="amount-value">${quote.quoteAmount}</span>
                        </div>
                    </div>
                    <div class="quote-meta">
                        ${quote.timeline ? `
                            <div class="quote-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Timeline: <strong>${quote.timeline} days</strong></span>
                            </div>
                        ` : ''}
                        <div class="quote-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span>
                        </div>
                    </div>
                    <div class="quote-description">
                        <p>${quote.description}</p>
                    </div>
                    ${attachmentSection}
                    <div class="quote-actions">
                        <div class="quote-actions-group">${actionButtons.join('')}</div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Error loading quotes:', error);
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Quotes</h3>
                <p>Please try again.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button>
            </div>`;
    }
}

// --- QUOTE FILE HANDLING FUNCTIONS (NEW) ---
let quoteFiles = []; // Global array to store quote files
function handleQuoteFileChange(event) {
    const input = event.target;
    const files = Array.from(input.files);
    if (quoteFiles.length + files.length > 5) {
        showNotification('Maximum 5 files allowed for quotes', 'warning');
        return;
    }
    const maxSize = 15 * 1024 * 1024; // 15MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
        showNotification(`Some files exceed 15MB limit: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
        return;
    }
    // Validate file types for quotes
    const allowedTypes = ['application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg', 'image/jpg', 'image/png', 'application/dwg',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'dwg', 'xls', 'xlsx', 'txt'];
    const invalidTypeFiles = files.filter(file => {
        const ext = file.name.toLowerCase().split('.').pop();
        return !allowedTypes.includes(file.type) && !allowedExtensions.includes(ext);
    });
    if (invalidTypeFiles.length > 0) {
        showNotification(`Unsupported file types: ${invalidTypeFiles.map(f => f.name).join(', ')}. Supported: PDF, DOC, DOCX, JPG, PNG, DWG, XLS, XLSX, TXT`, 'error');
        return;
    }
    quoteFiles.push(...files);
    renderQuoteFileList();
}

function removeQuoteFile(index) {
    quoteFiles.splice(index, 1);
    renderQuoteFileList();
}

function renderQuoteFileList() {
    const container = document.getElementById('quote-attachments-list');
    const label = document.getElementById('quote-attachments-label');
    if (!container || !label) return;
    if (quoteFiles.length === 0) {
        container.innerHTML = '';
        label.textContent = 'Click to upload or drag & drop';
        return;
    }
    container.innerHTML = quoteFiles.map((file, index) => `
        <div class="file-list-item">
            <div class="file-list-item-info">
                <i class="fas ${getQuoteFileIcon(file)}"></i>
                <span>${file.name}</span>
                <span class="file-size">(${(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
            </div>
            <button type="button" class="remove-file-button" onclick="removeQuoteFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    label.textContent = `${quoteFiles.length} file(s) selected`;
}

function getQuoteFileIcon(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'xls': 'fa-file-excel',
        'xlsx': 'fa-file-excel',
        'txt': 'fa-file-alt',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image',
        'dwg': 'fa-drafting-compass'
    };
    return iconMap[ext] || 'fa-file';
}

// UPDATED: Enhanced Quote Modal with File Upload
function showQuoteModal(jobId) {
    quoteFiles = []; // Reset files for new quote
    const content = `
        <div class="modal-header premium-modal-header">
            <h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3>
            <p class="modal-subtitle">Provide your proposal with supporting documents</p>
        </div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-dollar-sign"></i> Amount ($)</label>
                    <input type="number" class="form-input" name="amount" required min="1" step="0.01">
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label>
                    <input type="number" class="form-input" name="timeline" required min="1">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-file-alt"></i> Description</label>
                <textarea class="form-textarea" name="description" required placeholder="Describe your approach, methodology, and deliverables..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-paperclip"></i> Supporting Documents</label>
                <div class="custom-file-input-wrapper">
                    <input type="file" name="attachments" id="quote-attachments-input"
                            onchange="handleQuoteFileChange(event)"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg,.xls,.xlsx,.txt" multiple>
                    <div class="custom-file-input">
                        <span class="custom-file-input-label">
                            <i class="fas fa-upload"></i>
                            <span id="quote-attachments-label">Click to upload or drag & drop</span>
                        </span>
                    </div>
                </div>
                <div id="quote-attachments-list" class="file-list-container"></div>
                <small class="form-help">Optional. Up to 5 files, 15MB each. Supported: PDF, DOC, DOCX, JPG, PNG, DWG, XLS, XLSX, TXT</small>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Quote</button>
            </div>
        </form>
    `;
    showGenericModal(content, 'max-width: 700px;');
    // Setup drag and drop for quote files
    setupQuoteFileDragDrop();
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

function setupQuoteFileDragDrop() {
    const wrapper = document.querySelector('.custom-file-input-wrapper');
    const customInput = wrapper.querySelector('.custom-file-input');
    const realInput = wrapper.querySelector('input[type="file"]');
    if (customInput && realInput) {
        customInput.addEventListener('click', () => realInput.click());
        customInput.addEventListener('dragover', (e) => {
            e.preventDefault();
            customInput.classList.add('drag-over');
        });
        customInput.addEventListener('dragleave', () => {
            customInput.classList.remove('drag-over');
        });
        customInput.addEventListener('drop', (e) => {
            e.preventDefault();
            customInput.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const event = {
                    target: {
                        files: e.dataTransfer.files
                    }
                };
                handleQuoteFileChange(event);
            }
        });
    }
}

// UPDATED: Quote submission with file upload
async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData();
        formData.append('jobId', form['jobId'].value);
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        // Add multiple files
        if (quoteFiles && quoteFiles.length > 0) {
            for (let i = 0; i < quoteFiles.length; i++) {
                formData.append('attachments', quoteFiles[i]);
            }
        }
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        addLocalNotification('Submitted', 'Your quote has been submitted with supporting documents.', 'quote');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        fetchAndRenderJobs();
    } catch (error) {
        addLocalNotification('Error', 'Failed to submit quote.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// UPDATED: Edit quote modal with file support
async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        // Reset quote files for editing
        quoteFiles = [];
        const content = `
            <div class="modal-header premium-modal-header">
                <h3><i class="fas fa-edit"></i> Edit Your Quote</h3>
                <p class="modal-subtitle">Update quote for: <strong>${quote.jobTitle}</strong></p>
            </div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-dollar-sign"></i> Amount ($)</label>
                        <input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label>
                        <input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-file-alt"></i> Description</label>
                    <textarea class="form-textarea" name="description" required>${quote.description}</textarea>
                </div>
                ${quote.attachments && quote.attachments.length > 0 ? `
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-folder"></i> Current Attachments</label>
                        <div class="existing-attachments">
                            ${quote.attachments.map((attachment, index) => `
                                <div class="existing-attachment-item">
                                    <i class="fas ${getQuoteFileIcon({name: attachment.name})}"></i>
                                    <span>${attachment.name}</span>
                                    <a href="${attachment.url}" target="_blank" class="btn btn-xs">
                                        <i class="fas fa-external-link-alt"></i> View
                                    </a>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-paperclip"></i> Add More Documents</label>
                    <div class="custom-file-input-wrapper">
                        <input type="file" name="attachments" id="quote-attachments-input"
                                onchange="handleQuoteFileChange(event)"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg,.xls,.xlsx,.txt" multiple>
                        <div class="custom-file-input">
                            <span class="custom-file-input-label">
                                <i class="fas fa-upload"></i>
                                <span id="quote-attachments-label">Click to upload additional files</span>
                            </span>
                        </div>
                    </div>
                    <div id="quote-attachments-list" class="file-list-container"></div>
                    <small class="form-help">Optional. Add up to 5 additional files, 15MB each.</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button>
                </div>
            </form>
        `;
        showGenericModal(content, 'max-width: 700px;');
        setupQuoteFileDragDrop();
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {
        addLocalNotification('Error', 'Failed to load quote details for editing.', 'error');
    }
}

// UPDATED: Handle quote edit with files
async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData();
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        // Add new files if any
        if (quoteFiles && quoteFiles.length > 0) {
            for (let i = 0; i < quoteFiles.length; i++) {
                formData.append('attachments', quoteFiles[i]);
            }
        }
        await apiCall(`/quotes/${form['quoteId'].value}`, 'PUT', formData, 'Quote updated successfully!');
        addLocalNotification('Updated', 'Your quote has been updated.', 'quote');
        closeModal();
        fetchAndRenderMyQuotes();
    } catch (error) {
        addLocalNotification('Error', 'Failed to update quote.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// --- JOB FILE HANDLING FUNCTIONS (NEW) ---
function handleJobFileChange(event) {
    const input = event.target;
    const files = Array.from(input.files);
    if (appState.jobFiles.length + files.length > 10) {
        showNotification('Maximum 10 files allowed', 'warning');
        return;
    }
    const maxSize = 15 * 1024 * 1024; // 15MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
        showNotification(`Some files exceed 15MB limit: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
        return;
    }
    appState.jobFiles.push(...files);
    renderJobFileList();
}

function removeJobFile(index) {
    appState.jobFiles.splice(index, 1);
    renderJobFileList();
}

function renderJobFileList() {
    const container = document.getElementById('job-attachments-list');
    const label = document.getElementById('job-attachments-label');
    if (!container || !label) return;

    if (appState.jobFiles.length === 0) {
        container.innerHTML = '';
        label.textContent = 'Click to upload or drag & drop';
        return;
    }
    container.innerHTML = appState.jobFiles.map((file, index) => `
        <div class="file-list-item">
            <div class="file-list-item-info">
                <i class="fas fa-file-alt"></i>
                <span>${file.name}</span>
                <span class="file-size">(${(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
            </div>
            <button type="button" class="remove-file-button" onclick="removeJobFile(${index})"><i class="fas fa-times"></i></button>
        </div>`).join('');
    label.textContent = `${appState.jobFiles.length} file(s) selected`;
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData();
        ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => {
            if (form[field] && form[field].value) formData.append(field, form[field].value);
        });
        if (appState.jobFiles && appState.jobFiles.length > 0) {
            appState.jobFiles.forEach(file => {
                formData.append('attachments', file);
            });
        }
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addLocalNotification('Posted', `Your project "${form.title.value}" has been posted.`, 'job');
        form.reset();
        appState.jobFiles = [];
        renderJobFileList();
        renderAppSection('jobs');
    } catch (error) {
        addLocalNotification('Error', 'Failed to post project.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This will delete all associated quotes and cannot be undone.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.');
            addLocalNotification('Deleted', 'Project has been deleted.', 'info');
            fetchAndRenderJobs();
        } catch (error) {
            addLocalNotification('Error', 'Failed to delete project.', 'error');
        }
    }
}


async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.');
            addLocalNotification('Deleted', 'Quote has been deleted.', 'info');
            fetchAndRenderMyQuotes();
            loadUserQuotes();
        } catch (error) {
            addLocalNotification('Error', 'Failed to delete quote.', 'error');
        }
    }
}

// --- START: CORRECTED QUOTE ATTACHMENT FUNCTIONS ---

// Download a single quote attachment
async function downloadQuoteAttachment(quoteId, attachmentIndex, filename) {
    if (typeof attachmentIndex === 'undefined' || attachmentIndex === null) {
        console.error('Download aborted: attachmentIndex is undefined.');
        showNotification('Cannot download file: Invalid attachment data.', 'error');
        return;
    }
    try {
        showNotification('Preparing download...', 'info');
        const response = await apiCall(`/quotes/${quoteId}/attachments/${attachmentIndex}/download`, 'GET');
        if (response.success && response.downloadUrl) {
            downloadFileDirect(response.downloadUrl, filename || response.filename);
        } else {
            throw new Error(response.error || 'Download URL not available');
        }
    } catch (error) {
        console.error('Quote attachment download error:', error);
        showNotification(`Download failed: ${error.message}`, 'error');
    }
}

// View all attachments for a quote in a modal
async function viewQuoteAttachments(quoteId) {
    try {
        showNotification('Loading attachments...', 'info');
        const response = await apiCall(`/quotes/${quoteId}/attachments`, 'GET');
        if (response.success) {
            const attachments = response.attachments || [];
            const content = `
                <div class="modal-header">
                    <h3><i class="fas fa-paperclip"></i> Quote Attachments</h3>
                    <p class="modal-subtitle">Files submitted with this quote (${attachments.length} files)</p>
                </div>
                <div class="attachments-list premium-attachments">
                    ${attachments.length === 0 ?
                        `<div class="empty-state"><i class="fas fa-file"></i><p>No attachments found.</p></div>` :
                        attachments.map(attachment => `
                            <div class="attachment-item">
                                <div class="attachment-info">
                                    <i class="fas ${getFileIcon(attachment.mimetype)}"></i>
                                    <div class="attachment-details">
                                        <h4>${attachment.name}</h4>
                                        <span class="attachment-meta">
                                            ${formatFileSize(attachment.size)}
                                            ${attachment.uploadedAt ? ` • ${formatAttachmentDate(attachment.uploadedAt)}` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div class="attachment-actions">
                                    <button class="btn btn-primary btn-sm" onclick="downloadQuoteAttachment('${quoteId}', ${attachment.index}, '${attachment.name}')">
                                        <i class="fas fa-download"></i> Download
                                    </button>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
                ${attachments.length > 0 ? `
                    <div class="modal-footer">
                        <button class="btn btn-outline" onclick="downloadAllAttachments('${quoteId}')">
                            <i class="fas fa-download"></i> Download All
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    </div>` : 
                    `<div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Close</button></div>`
                }
            `;
            showGenericModal(content, 'max-width: 700px;');
        } else {
            throw new Error(response.error || 'Failed to load attachments');
        }
    } catch (error) {
        console.error('Error viewing quote attachments:', error);
        showNotification('Failed to load attachments', 'error');
    }
}

// CORRECTED: Download all attachments for a quote
async function downloadAllAttachments(quoteId) {
    try {
        showNotification('Preparing to download all files...', 'info');
        // First, get the fresh list of attachments to ensure we have the correct indices
        const response = await apiCall(`/quotes/${quoteId}/attachments`, 'GET');
        if (!response.success || !response.attachments) {
            throw new Error('Could not retrieve attachment list.');
        }
        const attachmentsList = response.attachments;
        if (attachmentsList.length === 0) {
            showNotification('No attachments to download.', 'info');
            return;
        }
        // Download each file with a delay
        attachmentsList.forEach((attachment, i) => {
            setTimeout(() => {
                downloadQuoteAttachment(quoteId, attachment.index, attachment.name);
            }, i * 1000);
        });
        showNotification(`Downloading ${attachmentsList.length} files...`, 'info');
    } catch (error) {
        console.error('Error downloading all attachments:', error);
        showNotification(`Failed to start download all: ${error.message}`, 'error');
    }
}


// CORRECTED: Enhanced viewQuotes function with better attachment handling
async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        let quotesHTML = `
            <div class="modal-header premium-modal-header">
                <h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3>
                <p class="modal-subtitle">Review quotes for this project (${quotes.length} quotes)</p>
            </div>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received</h3><p>No quotes have been submitted yet.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">`;
            quotes.forEach(quote => {
                const attachments = quote.attachments || [];
                const hasAttachments = attachments.length > 0;
                let attachmentSection = '';
                if (hasAttachments) {
                    attachmentSection = `
                        <div class="quote-attachments">
                            <div class="attachments-header"><i class="fas fa-paperclip"></i><span>Attachments (${attachments.length}):</span></div>
                            <div class="attachment-actions">
                                <button class="btn btn-outline btn-sm" onclick="viewQuoteAttachments('${quote.id}')"><i class="fas fa-folder-open"></i> View All</button>
                                ${attachments.length > 1 ? `<button class="btn btn-success btn-sm" onclick="downloadAllAttachments('${quote.id}')"><i class="fas fa-download"></i> Download All</button>` : ''}
                            </div>
                        </div>`;
                }
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = '';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                if (canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve</button>${messageButton}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${messageButton}`;
                } else {
                    actionButtons = messageButton;
                }
                const statusClass = quote.status;
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
                quotesHTML += `
                    <div class="quote-item premium-quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info">
                                <div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div>
                                <div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
                            </div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        <div class="quote-details">
                            ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                            <div class="quote-description"><p>${quote.description}</p></div>
                            ${attachmentSection}
                        </div>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            });
            quotesHTML += `</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');
    } catch (error) {
        console.error('Error viewing quotes:', error);
        showGenericModal(`<div class="modal-header premium-modal-header"><h3><i class="fas fa-exclamation-triangle"></i> Error</h3></div><div class="error-state premium-error"><p>Could not load quotes. Please try again.</p><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`);
    }
}

// Helper functions for files
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(mimetype) {
    if (!mimetype) return 'fa-file';
    const iconMap = {
        'application/pdf': 'fa-file-pdf', 'application/msword': 'fa-file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'fa-file-word',
        'application/vnd.ms-excel': 'fa-file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'fa-file-excel',
        'text/plain': 'fa-file-alt', 'image/jpeg': 'fa-file-image',
        'image/png': 'fa-file-image', 'image/gif': 'fa-file-image'
    };
    return iconMap[mimetype] || 'fa-file';
}

function formatAttachmentDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString();
    } catch {
        return '';
    }
}
// --- END: CORRECTED QUOTE ATTACHMENT FUNCTIONS ---


async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer.')) {
        try {
            await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!');
            addLocalNotification('Approved', 'You have approved a quote!', 'quote');
            closeModal();
            fetchAndRenderJobs();
        } catch (error) {
            addLocalNotification('Error', 'Failed to approve quote.', 'error');
        }
    }
}


// --- ENHANCED MESSAGING SYSTEM ---
async function openConversation(jobId, recipientId) {
    try {
        showNotification('Opening conversation...', 'info');
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {
        addLocalNotification('Error', 'Failed to open conversation.', 'error');
    }
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-comments"></i> Messages</h2><p class="header-subtitle">Communicate with clients and designers</p></div></div>
        <div id="conversations-list" class="conversations-container premium-conversations"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;
    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3><p>Start collaborating by messaging from job quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button></div>`;
            return;
        }
        const conversationsHTML = appState.conversations.map(convo => {
            const other = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherName = other ? other.name : 'Unknown User';
            const lastMsg = convo.lastMessage ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const avatarColor = getAvatarColor(otherName);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;
            return `
                <div class="conversation-card premium-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${avatarColor}">${otherName.charAt(0).toUpperCase()}${isUnread ? '<div class="unread-indicator"></div>' : ''}</div>
                    <div class="convo-details">
                        <div class="convo-header"><h4>${otherName}</h4><div class="convo-meta"><span class="participant-type ${other ? other.type : ''}">${other ? other.type : ''}</span><span class="convo-time">${timeAgo}</span></div></div>
                        <p class="convo-project"><i class="fas fa-briefcase"></i><strong>${convo.jobTitle}</strong></p>
                        <p class="convo-preview">${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? `<strong>${convo.lastMessageBy}:</strong> ` : ''}${lastMsg}</p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
        listContainer.innerHTML = conversationsHTML;
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Conversations</h3><p>Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button></div>`;
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diff = Math.floor((now - time) / (1000 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    return time.toLocaleDateString();
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

function formatDetailedTimestamp(date) {
    try {
        if (!date) return 'Unknown time';
        let msgDate;
        if (date && typeof date === 'object' && typeof date.toDate === 'function') msgDate = date.toDate();
        else if (date && typeof date === 'object' && date.seconds !== undefined) msgDate = new Date(date.seconds * 1000);
        else if (date instanceof Date) msgDate = date;
        else if (typeof date === 'string') msgDate = new Date(date);
        else if (typeof date === 'number') msgDate = new Date(date);
        else return 'Invalid time';
        if (!msgDate || isNaN(msgDate.getTime())) return 'Invalid date';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        const time = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        if (today.getTime() === msgDay.getTime()) return time;
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === msgDay.getTime()) return `Yesterday, ${time}`;
        return `${msgDate.toLocaleDateString()}, ${time}`;
    } catch (error) {
        console.error('formatDetailedTimestamp error:', error, 'Input:', date);
        return 'Invalid date';
    }
}

function formatMessageTimestamp(date) {
    try {
        if (!date) return 'Unknown time';
        let msgDate;
        if (date && typeof date === 'object' && typeof date.toDate === 'function') msgDate = date.toDate();
        else if (date && typeof date === 'object' && date.seconds !== undefined) msgDate = new Date(date.seconds * 1000);
        else if (date instanceof Date) msgDate = date;
        else if (typeof date === 'string') msgDate = new Date(date);
        else if (typeof date === 'number') msgDate = new Date(date);
        else return 'Invalid time';
        if (!msgDate || isNaN(msgDate.getTime())) return 'Invalid date';
        const now = new Date();
        const diffS = Math.floor((now - msgDate) / 1000);
        const diffM = Math.floor(diffS / 60);
        const diffH = Math.floor(diffM / 60);
        const diffD = Math.floor(diffH / 24);
        if (diffS < 30) return 'Just now';
        if (diffM < 60) return `${diffM}m ago`;
        if (diffH < 24) return `${diffH}h ago`;
        if (diffD === 1) return 'Yesterday';
        if (diffD < 7) return `${diffD}d ago`;
        return msgDate.toLocaleDateString();
    } catch (error) {
        console.error('formatMessageTimestamp error:', error, 'Input:', date);
        return 'Invalid date';
    }
}

function formatMessageDate(date) {
    try {
        if (!date) return 'Unknown Date';
        let msgDate;
        if (date && typeof date === 'object' && typeof date.toDate === 'function') msgDate = date.toDate();
        else if (date && typeof date === 'object' && date.seconds !== undefined) msgDate = new Date(date.seconds * 1000);
        else if (date instanceof Date) msgDate = date;
        else if (typeof date === 'string') msgDate = new Date(date);
        else if (typeof date === 'number') msgDate = new Date(date);
        else return 'Unknown Date';
        if (!msgDate || isNaN(msgDate.getTime())) return 'Unknown Date';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        if (today.getTime() === msgDay.getTime()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === msgDay.getTime()) return 'Yesterday';
        return msgDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (error) {
        console.error('formatMessageDate error:', error, 'Input:', date);
        return 'Invalid Date';
    }
}

async function renderConversationView(conversationOrId) {
    let convo;
    if (typeof conversationOrId === 'string') convo = appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId };
    else convo = conversationOrId;
    if (!convo.participants && convo.id) {
        try {
            const response = await apiCall('/messages', 'GET');
            appState.conversations = response.data || [];
            convo = appState.conversations.find(c => c.id === convo.id);
            if (!convo) throw new Error('Conversation not found');
        } catch (error) {
            showNotification('Failed to load conversation.', 'error');
            renderAppSection('messages');
            return;
        }
    }
    const container = document.getElementById('app-container');
    const other = convo.participants ? convo.participants.find(p => p.id !== appState.currentUser.id) : { name: 'N/A', type: 'user' };
    const avatarColor = getAvatarColor(other.name || 'U');
    container.innerHTML = `
        <div class="chat-container premium-chat">
            <div class="chat-header premium-chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn premium-back-btn"><i class="fas fa-arrow-left"></i></button>
                <div class="chat-header-info">
                    <div class="chat-avatar premium-avatar" style="background-color: ${avatarColor}">${(other.name || 'U').charAt(0).toUpperCase()}<div class="online-indicator"></div></div>
                    <div class="chat-details"><h3>${other.name || 'Conversation'}</h3><p class="chat-project"><i class="fas fa-briefcase"></i> ${convo.jobTitle || 'Project Discussion'}</p><span class="chat-status">Active now</span></div>
                </div>
                <div class="chat-actions"><span class="participant-type-badge premium-badge ${other.type || ''}"><i class="fas ${other.type === 'designer' ? 'fa-drafting-compass' : 'fa-building'}"></i> ${other.type || 'User'}</span></div>
            </div>
            <div class="chat-messages premium-messages" id="chat-messages-container"><div class="loading-messages"><div class="spinner"></div><p>Loading...</p></div></div>
            <div class="chat-input-area premium-input-area"><form id="send-message-form" class="message-form premium-message-form"><div class="message-input-container"><input type="text" id="message-text-input" placeholder="Type your message..." required autocomplete="off"><button type="submit" class="send-button premium-send-btn" title="Send"><i class="fas fa-paper-plane"></i></button></div></form></div>
        </div>`;
    document.getElementById('send-message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(convo.id); });
    const msgContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${convo.id}/messages`, 'GET');
        const messages = response.data || [];
        if (messages.length === 0) {
            msgContainer.innerHTML = `<div class="empty-messages premium-empty-messages"><div class="empty-icon"><i class="fas fa-comment-dots"></i></div><h4>Start the conversation</h4><p>Send your first message.</p></div>`;
        } else {
            let messagesHTML = '';
            let lastDate = null;
            messages.forEach((msg, index) => {
                const msgDate = formatMessageDate(msg.createdAt);
                if (msgDate !== lastDate) {
                    messagesHTML += `<div class="chat-date-separator"><span>${msgDate}</span></div>`;
                    lastDate = msgDate;
                }
                const isMine = msg.senderId === appState.currentUser.id;
                const timestamp = formatDetailedTimestamp(msg.createdAt);
                const prevMsg = messages[index - 1];
                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                const senderAvatarColor = getAvatarColor(msg.senderName || 'U');
                messagesHTML += `
                    <div class="message-wrapper premium-message ${isMine ? 'me' : 'them'}">
                        ${!isMine && showAvatar ? `<div class="message-avatar premium-msg-avatar" style="background-color: ${senderAvatarColor}">${(msg.senderName || 'U').charAt(0).toUpperCase()}</div>` : '<div class="message-avatar-spacer"></div>'}
                        <div class="message-content">
                            ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName || 'N/A'}</div>` : ''}
                            <div class="message-bubble premium-bubble ${isMine ? 'me' : 'them'}">${msg.text || ''}</div>
                            <div class="message-meta">${timestamp}</div>
                        </div>
                    </div>`;
            });
            msgContainer.innerHTML = messagesHTML;
        }
        msgContainer.scrollTop = msgContainer.scrollHeight;
        document.getElementById('message-text-input')?.focus();
    } catch (error) {
        msgContainer.innerHTML = `<div class="error-messages premium-error-messages"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h4>Error loading messages</h4><p>Please try again.</p><button class="btn btn-primary" onclick="renderConversationView('${convo.id}')">Retry</button></div>`;
    }
}

async function refreshNotificationsAfterMessage() {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
        await fetchNotifications();
        setTimeout(async () => await fetchNotifications(), 3000);
    } catch (error) {
        console.error('Refresh failed:', error);
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const sendBtn = document.querySelector('.send-button');
    const text = input.value.trim();
    if (!text) return;
    const originalBtnContent = sendBtn.innerHTML;
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="btn-spinner"></div>';
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
            const msgContainer = document.getElementById('chat-messages-container');
            msgContainer.querySelector('.empty-messages')?.remove();
            const newMsg = data.data;
            const timestamp = formatDetailedTimestamp(newMsg.createdAt);
            const msgBubble = document.createElement('div');
            msgBubble.className = 'message-wrapper premium-message me';
            msgBubble.innerHTML = `<div class="message-avatar-spacer"></div><div class="message-content"><div class="message-bubble premium-bubble me">${newMsg.text}</div><div class="message-meta">${timestamp}</div></div>`;
            msgContainer.appendChild(msgBubble);
            msgContainer.scrollTop = msgContainer.scrollHeight;
            refreshNotificationsAfterMessage();
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch (error) {
        showNotification(error.message || 'Failed to send message.', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnContent;
        input?.focus();
    }
}


// --- UI & MODAL FUNCTIONS ---

// FIX for UI SHAKING
function lockBodyScroll() {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
    document.body.style.paddingRight = '';
    document.body.style.overflow = '';
}

function showAuthModal(view) {
    const modal = document.getElementById('modal-container');
    if (modal) {
        lockBodyScroll();
        modal.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    <div id="modal-form-container"></div>
                </div>
            </div>`;
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
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
    const modal = document.getElementById('modal-container');
    if (modal) {
        lockBodyScroll();
        modal.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" style="${style}" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    ${innerHTML}
                </div>
            </div>`;
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    }
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    if (modal) {
        modal.innerHTML = '';
        unlockBodyScroll();
    }
}

// ========================================
// INTEGRATION WITH EXISTING APP
// ========================================

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    initializeNotificationSystem();
    checkProfileAndRoute();
}

function logout() {
    cleanupNotificationSystem();
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
    appState.profileFiles = {};
    localStorage.clear();
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
    dismissInactivityWarning();
    showLandingPageView();
    showNotification('You have been logged out.', 'info');
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = `
        <a href="#ai-estimation" class="nav-link">AI Estimation</a><a href="#how-it-works" class="nav-link">How It Works</a>
        <a href="#why-steelconnect" class="nav-link">Why Choose Us</a><a href="#showcase" class="nav-link">Showcase</a>`;
}

function buildSidebarNav() {
    const nav = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;
    if (role === 'designer') {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Estimation</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="my-estimations"><i class="fas fa-file-invoice fa-fw"></i><span>My Estimations</span></a>`;
    }
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>
              <hr class="sidebar-divider"><a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
    nav.innerHTML = links;
    nav.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); renderAppSection(link.dataset.section); });
    });
}

// --- PROFILE & ROUTING FUNCTIONS ---

async function checkProfileAndRoute() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading your dashboard...</p></div>`;
    try {
        const response = await apiCall('/profile/status', 'GET');
        const { profileStatus, canAccess, rejectionReason } = response.data;
        appState.currentUser.profileStatus = profileStatus;
        appState.currentUser.canAccess = canAccess;
        appState.currentUser.rejectionReason = rejectionReason;
        document.querySelector('.sidebar').style.display = 'flex';
        document.getElementById('sidebarUserName').textContent = appState.currentUser.name;
        document.getElementById('sidebarUserType').textContent = appState.currentUser.type;
        document.getElementById('sidebarUserAvatar').textContent = (appState.currentUser.name || "A").charAt(0).toUpperCase();
        buildSidebarNav();
        renderAppSection('dashboard');
        if (appState.currentUser.type === 'designer') loadUserQuotes();
        if (appState.currentUser.type === 'contractor') loadUserEstimations();
        resetInactivityTimer();
        if (profileStatus === 'incomplete') showNotification('Complete your profile to unlock all features.', 'info', 8000);
        else if (profileStatus === 'pending') showNotification('Your profile is under review.', 'info', 8000);
        else if (profileStatus === 'rejected') showNotification('Please update your profile.', 'warning', 10000);
    } catch (error) {
        showNotification('Could not verify profile status.', 'error');
        container.innerHTML = `<div class="error-state"><h2>Error</h2><p>Could not load dashboard.</p><button class="btn btn-primary" onclick="logout()">Logout</button></div>`;
    }
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
    const profileStatus = appState.currentUser.profileStatus;
    const isApproved = profileStatus === 'approved';
    const restrictedSections = ['post-job', 'jobs', 'my-quotes', 'approved-jobs', 'estimation-tool', 'my-estimations', 'messages'];
    if (restrictedSections.includes(sectionId) && !isApproved) {
        container.innerHTML = getRestrictedAccessTemplate(sectionId, profileStatus);
        return;
    }
    if (sectionId === 'profile-completion') { renderProfileCompletionView(); return; }
    if (sectionId === 'settings') { container.innerHTML = getSettingsTemplate(appState.currentUser); return; }
    if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        if (isApproved) renderRecentActivityWidgets();
    } else if (sectionId === 'jobs') {
        const role = appState.currentUser.type;
        const title = role === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = role === 'designer' ? 'Browse and submit quotes' : 'Manage your project listings';
        container.innerHTML = `<div class="section-header modern-header"><div class="header-content"><h2><i class="fas ${role === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2><p class="header-subtitle">${subtitle}</p></div></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container" class="load-more-section"></div>`;
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        appState.jobFiles = []; // Reset files
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
        const wrapper = document.querySelector('.custom-file-input-wrapper');
        const customInput = wrapper.querySelector('.custom-file-input');
        const realInput = wrapper.querySelector('input[type="file"]');
        customInput.addEventListener('click', () => realInput.click());
        customInput.addEventListener('dragover', (e) => { e.preventDefault(); customInput.classList.add('drag-over'); });
        customInput.addEventListener('dragleave', () => customInput.classList.remove('drag-over'));
        customInput.addEventListener('drop', (e) => {
            e.preventDefault();
            customInput.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const event = { target: { files: e.dataTransfer.files } };
                handleJobFileChange(event);
            }
        });
    } else if (sectionId === 'my-quotes') fetchAndRenderMyQuotes();
    else if (sectionId === 'approved-jobs') fetchAndRenderApprovedJobs();
    else if (sectionId === 'messages') fetchAndRenderConversations();
    else if (sectionId === 'estimation-tool') {
        container.innerHTML = getEstimationToolTemplate();
        setupEstimationToolEventListeners();
    } else if (sectionId === 'my-estimations') fetchAndRenderMyEstimations();
}

function getRestrictedAccessTemplate(sectionId, profileStatus) {
    const sectionNames = { 'post-job': 'Post Projects', 'jobs': 'Browse Projects', 'my-quotes': 'My Quotes', 'approved-jobs': 'Approved Projects', 'estimation-tool': 'AI Estimation', 'my-estimations': 'My Estimations', 'messages': 'Messages' };
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

async function renderProfileCompletionView() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading profile form...</p></div>`;
    appState.profileFiles = {};
    try {
        const response = await apiCall('/profile/form-fields', 'GET');
        const { fields, userType } = response.data;
        const formFieldsHTML = fields.map(field => {
            if (field.type === 'textarea') return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '<span style="color:red">*</span>' : ''}</label><textarea class="form-textarea premium-input" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"></textarea></div>`;
            else if (field.type === 'file') return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '<span style="color:red">*</span>' : ''}</label><div class="custom-file-input-wrapper"><input type="file" name="${field.name}" data-field-name="${field.name}" onchange="handleProfileFileChange(event)" accept="${field.accept || ''}" ${field.multiple ? 'multiple' : ''} ${field.required ? 'required' : ''}><div class="custom-file-input"><span class="custom-file-input-label"><i class="fas fa-upload"></i> <span id="label-${field.name}">Click to upload</span></span></div></div><div id="file-list-${field.name}" class="file-list-container"></div></div>`;
            else if (field.type === 'select') {
                const options = (field.options || []).map(opt => `<option value="${opt}">${opt}</option>`).join('');
                return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '*' : ''}</label><select name="${field.name}" class="form-select premium-select" ${field.required ? 'required' : ''}><option value="" disabled selected>Select...</option>${options}</select></div>`;
            } else return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '*' : ''}</label><input type="${field.type}" class="form-input premium-input" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}"></div>`;
        }).join('');
        container.innerHTML = `
            <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-user-check"></i> Complete Your Profile</h2><p class="header-subtitle">We require all ${userType}s to complete their profile for review.</p></div></div>
            <div class="profile-completion-container"><form id="profile-completion-form" class="profile-completion-form"><div class="form-section"><h3><i class="fas fa-user-circle"></i> Profile Information</h3><div class="profile-form-grid">${formFieldsHTML}</div></div><div class="form-actions" style="text-align:center;"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> Submit for Review</button></div></form></div>`;
        document.querySelectorAll('.custom-file-input-wrapper').forEach(wrapper => {
            const custom = wrapper.querySelector('.custom-file-input');
            const real = wrapper.querySelector('input[type="file"]');
            if (custom && real) {
                custom.addEventListener('click', () => real.click());
                custom.addEventListener('dragover', (e) => { e.preventDefault(); custom.classList.add('drag-over'); });
                custom.addEventListener('dragleave', () => custom.classList.remove('drag-over'));
                custom.addEventListener('drop', (e) => {
                    e.preventDefault();
                    custom.classList.remove('drag-over');
                    if (e.dataTransfer.files.length > 0) {
                        real.files = e.dataTransfer.files;
                        real.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });
            }
        });
        document.getElementById('profile-completion-form').addEventListener('submit', handleProfileCompletionSubmit);
    } catch (error) {
        container.innerHTML = `<div class="error-state"><h2>Error Loading Form</h2><p>Please try again later.</p></div>`;
    }
}

function handleProfileFileChange(event) {
    const input = event.target;
    const fieldName = input.dataset.fieldName;
    const files = input.files;
    if (!files || files.length === 0) return;
    appState.profileFiles[fieldName] = input.multiple ? [...(appState.profileFiles[fieldName] || []), ...files] : [files[0]];
    if (appState.profileFiles[fieldName].length > 0) input.removeAttribute('required');
    renderProfileFileList(fieldName);
}

function removeProfileFile(fieldName, index) {
    if (appState.profileFiles[fieldName]) {
        appState.profileFiles[fieldName].splice(index, 1);
        renderProfileFileList(fieldName);
        const input = document.querySelector(`input[data-field-name="${fieldName}"]`);
        if (appState.profileFiles[fieldName].length === 0 && (fieldName === 'resume' || fieldName === 'idProof')) {
            input.setAttribute('required', 'true');
        }
    }
}

function renderProfileFileList(fieldName) {
    const container = document.getElementById(`file-list-${fieldName}`);
    const label = document.getElementById(`label-${fieldName}`);
    const files = appState.profileFiles[fieldName] || [];
    if (files.length === 0) {
        container.innerHTML = '';
        label.textContent = 'Click to upload';
        return;
    }
    container.innerHTML = files.map((file, index) => `<div class="file-list-item"><div class="file-list-item-info"><i class="fas fa-file-alt"></i><span>${file.name}</span></div><button type="button" class="remove-file-button" onclick="removeProfileFile('${fieldName}', ${index})"><i class="fas fa-times"></i></button></div>`).join('');
    label.textContent = `${files.length} file(s) selected`;
}

async function handleProfileCompletionSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    btn.disabled = true;
    try {
        const formData = new FormData(form);
        for (const fieldName in appState.profileFiles) formData.delete(fieldName);
        for (const fieldName in appState.profileFiles) {
            const files = appState.profileFiles[fieldName];
            if (files && files.length > 0) files.forEach(file => formData.append(fieldName, file, file.name));
        }
        await apiCall('/profile/complete', 'PUT', formData);
        showNotification('Profile submitted for review!', 'success');
        await checkProfileAndRoute();
    } catch (error) {
        showNotification('Failed to submit profile.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}


// --- DASHBOARD WIDGETS ---
async function renderRecentActivityWidgets() {
    const user = appState.currentUser;
    const projectsContainer = document.getElementById('recent-projects-widget');
    const quotesContainer = document.getElementById('recent-quotes-widget');
    if (user.type === 'contractor') {
        if (projectsContainer) projectsContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const response = await apiCall(`/jobs/user/${user.id}?limit=3`, 'GET');
            const recentJobs = (response.data || []).slice(0, 3);
            if (recentJobs.length > 0) projectsContainer.innerHTML = recentJobs.map(job => `<div class="widget-list-item" id="widget-item-${job.id}"><div class="widget-item-header" onclick="toggleWidgetDetails('${job.id}', 'job')"><div class="widget-item-info"><i class="fas fa-briefcase widget-item-icon"></i><div><p class="widget-item-title">${job.title}</p><span class="widget-item-meta">Budget: ${job.budget}</span></div></div><span class="widget-item-status ${job.status}">${job.status}</span></div><div class="widget-item-details" id="widget-details-${job.id}"></div></div>`).join('');
            else projectsContainer.innerHTML = '<p class="widget-empty-text">No recent projects.</p>';
        } catch (e) {
            projectsContainer.innerHTML = '<p class="widget-empty-text">Could not load projects.</p>';
        }
    } else if (user.type === 'designer') {
        if (quotesContainer) quotesContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const response = await apiCall(`/quotes/user/${user.id}?limit=3`, 'GET');
            const recentQuotes = (response.data || []).slice(0, 3);
            if (recentQuotes.length > 0) quotesContainer.innerHTML = recentQuotes.map(quote => `<div class="widget-list-item" id="widget-item-${quote.id}"><div class="widget-item-header" onclick="toggleWidgetDetails('${quote.id}', 'quote')"><div class="widget-item-info"><i class="fas fa-file-invoice-dollar widget-item-icon"></i><div><p class="widget-item-title">Quote for: ${quote.jobTitle}</p><span class="widget-item-meta">Amount: ${quote.quoteAmount}</span></div></div><span class="widget-item-status ${quote.status}">${quote.status}</span></div><div class="widget-item-details" id="widget-details-${quote.id}"></div></div>`).join('');
            else quotesContainer.innerHTML = '<p class="widget-empty-text">No recent quotes.</p>';
        } catch (e) {
            quotesContainer.innerHTML = '<p class="widget-empty-text">Could not load quotes.</p>';
        }
    }
}

async function toggleWidgetDetails(itemId, itemType) {
    const details = document.getElementById(`widget-details-${itemId}`);
    if (!details) return;
    if (details.classList.contains('expanded')) {
        details.classList.remove('expanded');
        details.innerHTML = '';
        return;
    }
    document.querySelectorAll('.widget-item-details.expanded').forEach(el => {
        el.classList.remove('expanded');
        el.innerHTML = '';
    });
    details.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
    details.classList.add('expanded');
    try {
        if (itemType === 'job') {
            const job = appState.jobs.find(j => j.id === itemId) || (await apiCall(`/jobs/${itemId}`, 'GET')).data;
            if (job) details.innerHTML = `<p><strong>Description:</strong> ${job.description}</p><p><strong>Deadline:</strong> ${new Date(job.deadline).toLocaleDateString()}</p><button class="btn btn-outline" onclick="renderAppSection('jobs')">View Full Details</button>`;
        } else if (itemType === 'quote') {
            const quote = appState.myQuotes.find(q => q.id === itemId) || (await apiCall(`/quotes/${itemId}`, 'GET')).data;
            if (quote) details.innerHTML = `<p><strong>Description:</strong> ${quote.description}</p><p><strong>Timeline:</strong> ${quote.timeline} days</p><button class="btn btn-outline" onclick="renderAppSection('my-quotes')">View Full Details</button>`;
        }
    } catch (error) {
        details.innerHTML = '<p>Could not load details.</p>';
    }
}

// --- ESTIMATION TOOL FUNCTIONS ---
function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
        });
    }
    if (fileInput) fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelect(e.target.files); });
    const submitBtn = document.getElementById('submit-estimation-btn');
    if (submitBtn) submitBtn.addEventListener('click', handleEstimationSubmit);
}

function handleFileSelect(files) {
    const fileList = document.getElementById('selected-files-list');
    const submitBtn = document.getElementById('submit-estimation-btn');
    appState.uploadedFile = files;
    let filesHTML = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const fileType = getFileTypeIcon(file.type, file.name);
        filesHTML += `<div class="selected-file-item"><div class="file-info"><i class="fas ${fileType.icon}"></i><div class="file-details"><span class="file-name">${file.name}</span><span class="file-size">${fileSize} MB</span></div></div><button type="button" class="remove-file-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button></div>`;
    }
    fileList.innerHTML = filesHTML;
    document.getElementById('file-info-container').style.display = 'block';
    submitBtn.disabled = false;
    updateEstimationStep(2);
    showNotification(`${files.length} file(s) selected`, 'success');
}

function getFileTypeIcon(mimeType, fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const types = { 'pdf': { icon: 'fa-file-pdf' }, 'dwg': { icon: 'fa-drafting-compass' }, 'doc': { icon: 'fa-file-word' }, 'docx': { icon: 'fa-file-word' }, 'jpg': { icon: 'fa-file-image' }, 'jpeg': { icon: 'fa-file-image' }, 'png': { icon: 'fa-file-image' } };
    return types[ext] || { icon: 'fa-file' };
}

function updateEstimationStep(activeStep) {
    document.querySelectorAll('.estimation-steps .step').forEach((step, index) => {
        const stepNum = index + 1;
        if (stepNum < activeStep) step.classList.add('completed'); else step.classList.remove('completed');
        if (stepNum === activeStep) step.classList.add('active'); else step.classList.remove('active');
    });
}

function removeFile(index) {
    const filesArray = Array.from(appState.uploadedFile);
    filesArray.splice(index, 1);
    if (filesArray.length === 0) {
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        document.getElementById('submit-estimation-btn').disabled = true;
        updateEstimationStep(1);
    } else {
        const dt = new DataTransfer();
        filesArray.forEach(file => dt.items.add(file));
        appState.uploadedFile = dt.files;
        handleFileSelect(appState.uploadedFile);
    }
}

async function handleEstimationSubmit() {
    const form = document.getElementById('estimation-form');
    const submitBtn = document.getElementById('submit-estimation-btn');
    if (!appState.uploadedFile || appState.uploadedFile.length === 0) {
        showNotification('Please select files', 'warning');
        return;
    }
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    if (!projectTitle || !description) {
        showNotification('Please fill in all fields', 'warning');
        return;
    }
    updateEstimationStep(3);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    try {
        const formData = new FormData();
        formData.append('projectTitle', projectTitle);
        formData.append('description', description);
        formData.append('contractorName', appState.currentUser.name);
        formData.append('contractorEmail', appState.currentUser.email);
        for (let i = 0; i < appState.uploadedFile.length; i++) {
            formData.append('files', appState.uploadedFile[i]);
        }
        await apiCall('/estimation/contractor/submit', 'POST', formData, 'Estimation request submitted!');
        addLocalNotification('Submitted', `Estimation request for "${projectTitle}" submitted.`, 'estimation');
        form.reset();
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        updateEstimationStep(1);
        renderAppSection('my-estimations');
    } catch (error) {
        addLocalNotification('Error', 'Failed to submit estimation.', 'error');
        updateEstimationStep(2);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        // CORRECTED: Set a high z-index to appear over modals
        container.style.zIndex = '10001';
        document.body.appendChild(container);
    }
    const notif = document.createElement('div');
    notif.className = `notification premium-notification notification-${type}`;
    notif.innerHTML = `<div class="notification-content"><i class="fas ${getNotificationIcon(type)}"></i><span>${message}</span></div><button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(notif);
    setTimeout(() => {
        if (notif.parentElement) {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 300);
        }
    }, duration);
}

function showRestrictedFeature(featureName) {
    const status = appState.currentUser.profileStatus;
    let msg = '';
    if (status === 'incomplete') msg = 'Complete your profile to access this.';
    else if (status === 'pending') msg = 'This will be available once your profile is approved.';
    else if (status === 'rejected') msg = 'Please update your profile to access this.';
    showNotification(msg, 'warning', 6000);
}


// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Welcome Back</h2><p>Sign in to your account</p></div><form id="login-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button></form><div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')">Create one</a></div>`;
}

function getRegisterTemplate() {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Join SteelConnect</h2><p>Create your professional account</p></div><form id="register-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button></form><div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p class="header-subtitle">Create a listing to attract qualified professionals</p></div></div>
        <div class="post-job-container premium-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div>
                        <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Deadline</label><input type="date" class="form-input" name="deadline" required></div>
                    </div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Skills</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit"><small>Separate with commas</small></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-external-link-alt"></i> Project Link (Optional)</label><input type="url" class="form-input" name="link" placeholder="https://example.com/details"></div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-align-left"></i> Detailed Description</label><textarea class="form-textarea" name="description" required placeholder="Provide a comprehensive description..."></textarea></div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-paperclip"></i> Project Attachments (Optional)</label>
                        <div class="custom-file-input-wrapper">
                            <input type="file" name="attachments" id="job-attachments-input" onchange="handleJobFileChange(event)" accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png" multiple>
                            <div class="custom-file-input">
                                <span class="custom-file-input-label">
                                    <i class="fas fa-upload"></i>
                                    <span id="job-attachments-label">Click to upload or drag & drop</span>
                                </span>
                            </div>
                        </div>
                        <div id="job-attachments-list" class="file-list-container"></div>
                        <small class="form-help">Upload up to 10 files, 15MB each. Supported formats: PDF, DOC, DWG, Images</small>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-robot"></i> AI-Powered Cost Estimation</h2><p class="header-subtitle">Upload your drawings and get instant cost estimates</p></div>
        </div>
        <div class="estimation-tool-container premium-estimation-container">
            <div class="estimation-steps">
                <div class="step active" data-step="1"><div class="step-number">1</div><div class="step-content"><h4>Upload Files</h4><p>Add your drawings</p></div></div>
                <div class="step" data-step="2"><div class="step-number">2</div><div class="step-content"><h4>Project Details</h4><p>Describe requirements</p></div></div>
                <div class="step" data-step="3"><div class="step-number">3</div><div class="step-content"><h4>Get Estimate</h4><p>Receive detailed cost breakdown</p></div></div>
            </div>
            <form id="estimation-form" class="premium-estimation-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-upload"></i> Upload Project Files</h3>
                    <div class="file-upload-section premium-upload-section">
                        <div id="file-upload-area" class="file-upload-area premium-upload-area">
                            <input type="file" id="file-upload-input" accept=".pdf,.dwg,.doc,.docx,.jpg,.jpeg,.png" multiple />
                            <div class="upload-content"><div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><h3>Drag & Drop Files Here</h3><p>or click to browse</p><small class="upload-limit">Max 10 files, 15MB each</small></div>
                        </div>
                        <div id="file-info-container" class="selected-files-container" style="display: none;"><h4><i class="fas fa-files"></i> Selected Files</h4><div id="selected-files-list" class="selected-files-list"></div></div>
                    </div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input premium-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Project Description</label><textarea class="form-textarea premium-textarea" name="description" required placeholder="Describe your project..."></textarea></div>
                </div>
                <div class="form-actions estimation-actions"><button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large premium-btn" disabled><i class="fas fa-paper-plane"></i> Submit Request</button></div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name.split(' ')[0];
    const profileStatus = user.profileStatus || 'incomplete';
    const isApproved = profileStatus === 'approved';
    let profileStatusCard = '';
    if (profileStatus === 'incomplete') profileStatusCard = `<div class="dashboard-profile-status-card"><h3><i class="fas fa-exclamation-triangle"></i> Complete Your Profile</h3><p>Complete your profile to unlock all features.</p><button class="btn btn-primary" onclick="renderAppSection('profile-completion')"><i class="fas fa-user-edit"></i> Complete Profile</button></div>`;
    else if (profileStatus === 'pending') profileStatusCard = `<div class="dashboard-profile-status-card"><h3><i class="fas fa-clock"></i> Profile Under Review</h3><p>Your profile is under review. You'll get full access once approved.</p></div>`;
    else if (profileStatus === 'rejected') profileStatusCard = `<div class="dashboard-profile-status-card"><h3><i class="fas fa-times-circle"></i> Profile Needs Update</h3><p>Your profile needs updates. ${user.rejectionReason ? `<strong>Reason:</strong> ${user.rejectionReason}` : ''}</p><button class="btn btn-primary" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button></div>`;
    else if (profileStatus === 'approved') profileStatusCard = `<div class="dashboard-profile-status-card" style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-color: #10b981;"><h3 style="color: #059669;"><i class="fas fa-check-circle"></i> Profile Approved</h3><p style="color: #059669;">You have full access to all platform features.</p></div>`;
    const contractorQuickActions = `
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'post-job\')' : 'showRestrictedFeature(\'post-job\')'}"><i class="fas fa-plus-circle card-icon"></i><h3>Create Project</h3><p>Post a new listing</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'jobs\')' : 'showRestrictedFeature(\'jobs\')'}"><i class="fas fa-tasks card-icon"></i><h3>My Projects</h3><p>Manage your listings</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'estimation-tool\')' : 'showRestrictedFeature(\'estimation-tool\')'}"><i class="fas fa-calculator card-icon"></i><h3>AI Estimation</h3><p>Get instant cost estimates</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'approved-jobs\')' : 'showRestrictedFeature(\'approved-jobs\')'}"><i class="fas fa-check-circle card-icon"></i><h3>Approved</h3><p>Track assigned work</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>`;
    const contractorWidgets = `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Projects</h3><div id="recent-projects-widget" class="widget-content">${!isApproved ? '<p class="widget-empty-text">Complete your profile to post projects.</p>' : ''}</div></div>`;
    const designerQuickActions = `
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'jobs\')' : 'showRestrictedFeature(\'jobs\')'}"><i class="fas fa-search card-icon"></i><h3>Browse Projects</h3><p>Find new opportunities</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'my-quotes\')' : 'showRestrictedFeature(\'my-quotes\')'}"><i class="fas fa-file-invoice-dollar card-icon"></i><h3>My Quotes</h3><p>Track your submissions</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>
        <div class="quick-action-card ${!isApproved ? 'restricted-card' : ''}" onclick="${isApproved ? 'renderAppSection(\'messages\')' : 'showRestrictedFeature(\'messages\')'}"><i class="fas fa-comments card-icon"></i><h3>Messages</h3><p>Communicate with clients</p>${!isApproved ? '<div class="restriction-overlay"><i class="fas fa-lock"></i></div>' : ''}</div>`;
    const designerWidgets = `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Quotes</h3><div id="recent-quotes-widget" class="widget-content">${!isApproved ? '<p class="widget-empty-text">Complete your profile to submit quotes.</p>' : ''}</div></div>`;
    return `
        <div class="dashboard-container">
            <div class="dashboard-hero"><div><h2>Welcome back, ${name} 👋</h2><p>You are logged in to your <strong>${isContractor ? 'Contractor' : 'Designer'} Portal</strong>.</p></div></div>
            ${profileStatusCard}
            <h3 class="dashboard-section-title">Quick Actions</h3>
            <div class="dashboard-grid">${isContractor ? contractorQuickActions : designerQuickActions}</div>
            <div class="dashboard-columns">${isContractor ? contractorWidgets : designerWidgets}</div>
        </div>`;
}

function getSettingsTemplate(user) {
    const profileStatus = user.profileStatus || 'incomplete';
    let profileSection = '';
    if (profileStatus === 'incomplete') profileSection = `<div class="settings-card"><h3><i class="fas fa-user-edit"></i> Complete Your Profile</h3><p>Your profile is incomplete. Complete it to unlock all features.</p><button class="btn btn-primary" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Complete Profile</button></div>`;
    else if (profileStatus === 'pending') profileSection = `<div class="settings-card"><h3><i class="fas fa-clock"></i> Profile Under Review</h3><p>Your profile is under review by our admin team.</p></div>`;
    else if (profileStatus === 'rejected') profileSection = `<div class="settings-card"><h3><i class="fas fa-exclamation-triangle"></i> Profile Needs Update</h3><p>Your profile needs updates. ${user.rejectionReason ? `<strong>Reason:</strong> ${user.rejectionReason}` : ''}</p><button class="btn btn-primary" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button></div>`;
    else if (profileStatus === 'approved') profileSection = `<div class="settings-card"><h3><i class="fas fa-check-circle"></i> Profile Approved</h3><p>Your profile is approved.</p><button class="btn btn-outline" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Information</button></div>`;
    return `
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-cog"></i> Settings</h2><p class="header-subtitle">Manage your account and profile</p></div></div>
        <div class="settings-container">
            ${profileSection}
            <div class="settings-card"><h3><i class="fas fa-user-edit"></i> Personal Information</h3><form class="premium-form" onsubmit="event.preventDefault(); showNotification('Profile updated!', 'success');"><div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" value="${user.name}" required></div><div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" value="${user.email}" disabled></div><button type="submit" class="btn btn-primary">Save Changes</button></form></div>
            <div class="settings-card"><h3><i class="fas fa-shield-alt"></i> Security</h3><form class="premium-form" onsubmit="event.preventDefault(); showNotification('Password functionality not implemented.', 'info');"><div class="form-group"><label class="form-label">New Password</label><input type="password" class="form-input"></div><button type="submit" class="btn btn-primary">Change Password</button></form></div>
        </div>`;
}
