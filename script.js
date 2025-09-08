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
    currentHeaderSlide: 0,
    notifications: [], // This will be managed by the enhanced system
};

// --- ENHANCED NOTIFICATION SYSTEM STATE ---
const notificationState = {
    notifications: [],
    maxStoredNotifications: 50, // Store up to 50 notifications
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

        // Close notification panel if click is outside
        const notificationPanel = document.getElementById('notification-panel');
        const notificationBellContainer = document.getElementById('notification-bell-container');
        if (notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)) {
            notificationPanel.classList.remove('active');
        }
    });

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
            } else {
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
            resetInactivityTimer();
            initializeEnhancedNotifications(); // Initialize notification system for logged-in user
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
        showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
        initializeEnhancedNotifications(); // Initialize notification system after login

        if (data.user.type === 'designer') {
            loadUserQuotes();
        }

        // Initial welcome notification after login
        setTimeout(() => {
            addNotification(`Welcome back, ${data.user.name}! You're now connected to real-time notifications.`, 'user');
        }, 1000);

        // Auto-run basic debug on login
        runBasicNotificationDebug();

    } catch (error) {
        // Error is already shown by apiCall
    }
}

// [CORRECTED] This wrapper now correctly modifies the handleLogin function
// It is defined here so any subsequent calls to renderAuthForm use the wrapped version.
const originalHandleLogin = handleLogin;
window.handleLogin = async function(event) {
    await originalHandleLogin(event);
    // Check profile completion status after successful login
    if (appState.currentUser) {
        setTimeout(checkProfileCompletionStatus, 1000);
    }
};


function logout() {
    console.log('Logging out user...');
    enhancedLogout(); // Clean up notification system

    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = []; // Clear app state notifications
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

// --- ENHANCED NOTIFICATION SYSTEM WITH LOCAL STORAGE PERSISTENCE ---

// Load notifications from localStorage on app initialization
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

// Save notifications to localStorage
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

// Enhanced notification fetching with message notification focus
async function fetchNotifications() {
    if (!appState.currentUser) return;
    try {
        console.log('🔄 [FETCH] Fetching notifications from server...');
        const response = await apiCall('/notifications', 'GET');
        const serverNotifications = response.data || [];
        console.log(`📥 [FETCH] Received ${serverNotifications.length} notifications from server`);
        // Enhanced logging for message notifications
        const messageNotifications = serverNotifications.filter(n => n.type === 'message');
        if (messageNotifications.length > 0) {
            console.log(`💬 [FETCH] Found ${messageNotifications.length} message notifications:`);
            messageNotifications.forEach((n, index) => {
                const createdTime = formatMessageTimestamp(n.createdAt);
                console.log(`  ${index + 1}. ID: ${n.id}`);
                console.log(`     From: ${n.metadata?.senderId || 'unknown'}`);
                console.log(`     Message: "${n.message.substring(0, 50)}..."`);
                console.log(`     Created: ${createdTime} (${n.createdAt})`);
                console.log(`     Read: ${n.isRead}`);
                console.log(`     Conversation: ${n.metadata?.conversationId || 'unknown'}`);
            });
        } else {
            console.log(`💬 [FETCH] No message notifications found in server response`);
        }
        // Merge and update
        const mergedNotifications = mergeNotifications(serverNotifications, notificationState.notifications);
        appState.notifications = mergedNotifications;
        notificationState.notifications = mergedNotifications;
        notificationState.lastFetchTime = new Date();
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
        console.log(`✅ [FETCH] Successfully processed ${mergedNotifications.length} total notifications`);
        // Debug: Show breakdown by type
        const notificationTypes = {};
        mergedNotifications.forEach(n => {
            notificationTypes[n.type] = (notificationTypes[n.type] || 0) + 1;
        });
        console.log(`📊 [FETCH] Notification breakdown:`, notificationTypes);
    } catch (error) {
        console.error("❌ [FETCH] Error fetching notifications:", error);
        if (notificationState.notifications.length > 0) {
            appState.notifications = notificationState.notifications;
            renderNotificationPanel();
            updateNotificationBadge();
            console.log('📱 [FETCH] Using stored notifications due to fetch error');
        }
    }
}


// Smart notification merging to avoid duplicates
function mergeNotifications(serverNotifications, storedNotifications) {
    const notificationMap = new Map();
    // Add stored notifications first (older ones)
    storedNotifications.forEach(notification => {
        if (notification.id) {
            notificationMap.set(notification.id, notification);
        }
    });
    // Add/update with server notifications (newer ones take precedence)
    serverNotifications.forEach(notification => {
        if (notification.id) {
            notificationMap.set(notification.id, notification);
        }
    });
    // Convert back to array and sort by creation date (newest first)
    const merged = Array.from(notificationMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
    });
    // Limit to max stored notifications
    return merged.slice(0, notificationState.maxStoredNotifications);
}

// Enhanced local notification addition with persistence
function addNotification(message, type = 'info', metadata = {}) {
    const newNotification = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        createdAt: new Date().toISOString(),
        isRead: false,
        metadata,
        isLocal: true // Mark as locally generated
    };
    // Add to both arrays
    appState.notifications.unshift(newNotification);
    notificationState.notifications.unshift(newNotification);
    // Maintain size limits
    if (appState.notifications.length > notificationState.maxStoredNotifications) {
        appState.notifications = appState.notifications.slice(0, notificationState.maxStoredNotifications);
    }
    if (notificationState.notifications.length > notificationState.maxStoredNotifications) {
        notificationState.notifications = notificationState.notifications.slice(0, notificationState.maxStoredNotifications);
    }
    // Save to storage
    saveNotificationsToStorage();
    // Update UI
    renderNotificationPanel();
    updateNotificationBadge();
    // Show toast notification for immediate feedback
    showNotification(message, type);
    console.log('Added local notification:', newNotification);
}

function getNotificationIcon(type) {
    const iconMap = {
        info: 'fa-info-circle',
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle',
        message: 'fa-comment-alt',
        job: 'fa-briefcase',
        quote: 'fa-file-invoice-dollar',
        estimation: 'fa-calculator',
        user: 'fa-user',
        file: 'fa-paperclip'
    };
    return iconMap[type] || 'fa-info-circle';
}

// Enhanced notification panel rendering with better error handling
function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    if (!panelList) return;
    const notifications = appState.notifications || [];
    if (notifications.length === 0) {
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
                <small>You'll see updates here when things happen</small>
            </div>`;
        return;
    }
    try {
        panelList.innerHTML = notifications.map(n => {
            const icon = getNotificationIcon(n.type);
            const timeAgo = formatMessageTimestamp(n.createdAt);
            const metadataString = JSON.stringify(n.metadata || {}).replace(/"/g, '&quot;');
            const isLocalClass = n.isLocal ? 'local-notification' : '';
            return `
                <div class="notification-item ${n.isRead ? 'read' : 'unread'} ${isLocalClass}"
                     data-id="${n.id}"
                     onclick="handleNotificationClick('${n.id}', '${n.type}', ${metadataString})">
                    <div class="notification-item-icon ${n.type}">
                        <i class="fas ${icon}"></i>
                        ${n.isLocal ? '<div class="local-indicator" title="Local notification"></div>' : ''}
                    </div>
                    <div class="notification-item-content">
                        <p>${n.message}</p>
                        <span class="timestamp">${timeAgo}</span>
                    </div>
                    ${!n.isRead ? '<div class="unread-indicator"></div>' : ''}
                </div>`;
        }).join('');
    } catch (error) {
        console.error('Error rendering notifications:', error);
        panelList.innerHTML = `
            <div class="notification-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading notifications</p>
                <button onclick="fetchNotifications()" class="btn btn-sm btn-outline">Retry</button>
            </div>`;
    }
}

function handleNotificationClick(notificationId, type, metadata) {
    markNotificationAsRead(notificationId);

    switch (type) {
        case 'job':
            if (metadata.action === 'created') {
                renderAppSection('jobs');
            } else if (metadata.jobId) {
                renderAppSection('jobs');
            }
            break;
        case 'quote':
            if (appState.currentUser.type === 'designer') {
                renderAppSection('my-quotes');
            } else {
                renderAppSection('jobs');
            }
            break;
        case 'message':
            if (metadata.conversationId) {
                renderConversationView(metadata.conversationId);
            } else {
                renderAppSection('messages');
            }
            break;
        case 'estimation':
            renderAppSection('my-estimations');
            break;
        default:
            break;
    }

    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// Enhanced mark as read with persistence
async function markNotificationAsRead(notificationId) {
    // Update in both arrays
    const updateNotification = (notifications) => {
        const notification = notifications.find(n => n.id == notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            return true;
        }
        return false;
    };
    const updatedApp = updateNotification(appState.notifications);
    const updatedStored = updateNotification(notificationState.notifications);
    if (updatedApp || updatedStored) {
        // Save to storage
        saveNotificationsToStorage();
        // Update UI
        renderNotificationPanel();
        updateNotificationBadge();
    }
    // Try to update on server (only for server notifications)
    const notification = appState.notifications.find(n => n.id == notificationId);
    if (notification && !notification.isLocal) {
        try {
            await apiCall(`/notifications/${notificationId}/read`, 'PUT');
        } catch (error) {
            console.error('Failed to mark notification as read on server:', error);
            // Don't revert - keep local state since user interaction happened
        }
    }
}

// Enhanced mark all as read
async function markAllAsRead() {
    try {
        // Mark all as read locally first
        appState.notifications.forEach(n => n.isRead = true);
        notificationState.notifications.forEach(n => n.isRead = true);
        // Save to storage
        saveNotificationsToStorage();
        // Update UI
        renderNotificationPanel();
        updateNotificationBadge();
        // Try to update server notifications
        await apiCall('/notifications/mark-all-read', 'PUT');
        showNotification('All notifications marked as read.', 'success');
    } catch (error) {
        console.error('Failed to mark all notifications as read on server:', error);
        showNotification('Marked as read locally (server sync failed)', 'warning');
    }
}

// Enhanced notification badge with better counting
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

// Enhanced notification polling with more frequent checks for messages
function startNotificationPolling() {
    // Clear any existing interval
    if (notificationState.pollingInterval) {
        clearInterval(notificationState.pollingInterval);
    }
    // Initial fetch
    fetchNotifications();
    // Set up polling every 15 seconds (more frequent for better message notification responsiveness)
    notificationState.pollingInterval = setInterval(() => {
        if (appState.currentUser) {
            fetchNotifications();
        } else {
            stopNotificationPolling();
        }
    }, 15000); // Reduced from 30 seconds to 15 seconds
    console.log('🔔 Notification polling started (15 second intervals)');
}

function stopNotificationPolling() {
    if (notificationState.pollingInterval) {
        clearInterval(notificationState.pollingInterval);
        notificationState.pollingInterval = null;
        console.log('Notification polling stopped');
    }
}

// Enhanced notification panel toggle with loading state
async function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        const isActive = panel.classList.toggle('active');
        if (isActive) {
            // Show loading state
            const panelList = document.getElementById('notification-panel-list');
            if (panelList && appState.notifications.length === 0) {
                panelList.innerHTML = `
                    <div class="notification-loading-state">
                        <div class="spinner"></div>
                        <p>Loading notifications...</p>
                    </div>`;
            }
            // Fetch fresh notifications
            await fetchNotifications();
        }
    }
}

// Clear old notifications (optional maintenance function)
function clearOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const originalCount = notificationState.notifications.length;
    notificationState.notifications = notificationState.notifications.filter(n => {
        const notificationDate = new Date(n.createdAt);
        return notificationDate > cutoffDate;
    });
    appState.notifications = appState.notifications.filter(n => {
        const notificationDate = new Date(n.createdAt);
        return notificationDate > cutoffDate;
    });
    if (originalCount !== notificationState.notifications.length) {
        saveNotificationsToStorage();
        renderNotificationPanel();
        updateNotificationBadge();
        console.log(`Cleared ${originalCount - notificationState.notifications.length} old notifications`);
    }
}

// Initialize the enhanced notification system
function initializeEnhancedNotifications() {
    // Load stored notifications first
    loadStoredNotifications();
    // If we have stored notifications, show them immediately
    if (notificationState.notifications.length > 0) {
        appState.notifications = notificationState.notifications;
        renderNotificationPanel();
        updateNotificationBadge();
    }
    // Start polling for new notifications
    if (appState.currentUser) {
        startNotificationPolling();
    }
    // Clean up old notifications on startup
    clearOldNotifications(30);
}

// Enhanced logout to stop polling and save state
function enhancedLogout() {
    stopNotificationPolling();
    // Save final state before logout
    if (notificationState.notifications.length > 0) {
        saveNotificationsToStorage();
    }
    console.log('Enhanced notification system cleaned up for logout');
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
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Estimation Requests</h2>
                <p class="header-subtitle">Track your cost estimation submissions and results</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="renderAppSection('estimation-tool')">
                    <i class="fas fa-plus"></i> New Estimation Request
                </button>
            </div>
        </div>
        <div id="estimations-list" class="estimations-grid"></div>`;

    updateDynamicHeader();

    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your estimation requests...</p></div>';

    try {
        await loadUserEstimations();

        if (appState.myEstimations.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <h3>No Estimation Requests Yet</h3>
                    <p>Start by uploading your project drawings to get accurate cost estimates from our AI-powered system.</p>
                    <button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')">
                        <i class="fas fa-upload"></i> Upload First Project
                    </button>
                </div>`;
            return;
        }

        listContainer.innerHTML = appState.myEstimations.map(estimation => {
            const statusConfig = getEstimationStatusConfig(estimation.status);
            const createdDate = new Date(estimation.createdAt).toLocaleDateString();
            const updatedDate = new Date(estimation.updatedAt).toLocaleDateString();

            const hasFiles = estimation.uploadedFiles && estimation.uploadedFiles.length > 0;
            const hasResult = estimation.resultFile;

            return `
                <div class="estimation-card premium-card">
                    <div class="estimation-header">
                        <div class="estimation-title-section">
                            <h3 class="estimation-title">${estimation.projectTitle}</h3>
                            <span class="estimation-status-badge ${estimation.status}">
                                <i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}
                            </span>
                        </div>
                        ${estimation.estimatedAmount ? `
                            <div class="estimation-amount">
                                <span class="amount-label">Estimated Cost</span>
                                <span class="amount-value">$${estimation.estimatedAmount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="estimation-description"><p>${estimation.description}</p></div>
                    <div class="estimation-meta">
                        <div class="meta-item"><i class="fas fa-calendar-plus"></i><span>Submitted: ${createdDate}</span></div>
                        <div class="meta-item"><i class="fas fa-clock"></i><span>Updated: ${updatedDate}</span></div>
                        ${hasFiles ? `<div class="meta-item"><i class="fas fa-paperclip"></i><span>${estimation.uploadedFiles.length} file(s) uploaded</span></div>` : ''}
                    </div>
                    <div class="estimation-actions">
                        <div class="action-buttons">
                            ${hasFiles ? `<button class="btn btn-outline btn-sm" onclick="viewEstimationFiles('${estimation._id}')"><i class="fas fa-eye"></i> View Files</button>` : ''}
                            ${hasResult ? `<button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${estimation._id}')"><i class="fas fa-download"></i> Download Result</button>` : ''}
                            ${estimation.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="deleteEstimation('${estimation._id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');

    } catch (error) {
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Estimations</h3>
                <p>We couldn't load your estimation requests. Please try again.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()">Retry</button>
            </div>`;
    }
}

function getEstimationStatusConfig(status) {
    const configs = {
        'pending': { icon: 'fa-clock', label: 'Under Review' },
        'in-progress': { icon: 'fa-cogs', label: 'Processing' },
        'completed': { icon: 'fa-check-circle', label: 'Complete' },
        'rejected': { icon: 'fa-times-circle', label: 'Rejected' },
        'cancelled': { icon: 'fa-ban', label: 'Cancelled' }
    };
    return configs[status] || { icon: 'fa-question-circle', label: status };
}

async function viewEstimationFiles(estimationId) {
    try {
        addNotification('Loading estimation files...', 'info');
        const response = await apiCall(`/estimation/${estimationId}/files`, 'GET');
        const files = response.files || [];
        const content = `
            <div class="modal-header"><h3><i class="fas fa-folder-open"></i> Uploaded Project Files</h3><p class="modal-subtitle">Files submitted with your estimation request</p></div>
            <div class="files-list premium-files">
                ${files.length === 0 ? `<div class="empty-state"><i class="fas fa-file"></i><p>No files found for this estimation.</p></div>` : files.map(file => `
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
        addNotification('Preparing download...', 'info');
        const response = await apiCall(`/estimation/${estimationId}/result`, 'GET');
        if (response.success && response.resultFile) {
            addNotification('Your estimation result is ready for download.', 'success');
            window.open(response.resultFile.url, '_blank');
            setTimeout(() => fetchNotifications(), 1000);
        }
    } catch (error) {
        addNotification('Failed to download estimation result.', 'error');
    }
}

async function deleteEstimation(estimationId) {
    if (confirm('Are you sure you want to delete this estimation request? This action cannot be undone.')) {
        try {
            await apiCall(`/estimation/${estimationId}`, 'DELETE', null, 'Estimation deleted successfully');
            addNotification('Estimation request has been deleted successfully.', 'info');
            fetchAndRenderMyEstimations();
        } catch (error) {
            addNotification('Failed to delete estimation request. Please try again.', 'error');
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
        if(loadMoreContainer) loadMoreContainer.innerHTML = '';
        return;
    }

    const user = appState.currentUser;
    const endpoint = user.type === 'designer'
        ? `/jobs?page=${appState.jobsPage}&limit=6`
        : `/jobs/user/${user.id}`;

    if(loadMoreContainer) loadMoreContainer.innerHTML = `<button class="btn btn-loading" disabled><div class="btn-spinner"></div>Loading...</button>`;

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
                ? `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities or try adjusting your search criteria.</p></div>`
                : `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Ready to get started? Post your first project and connect with talented professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button></div>`;
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
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`
                : '';
            const actions = user.type === 'designer' ? quoteButton : `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            const statusBadge = job.status !== 'open'
                ? `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>`
                : `<span class="job-status-badge open"><i class="fas fa-clock"></i> Open</span>`;
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';

            return `
                <div class="job-card premium-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <div class="job-title-section"><h3 class="job-title">${job.title}</h3>${statusBadge}</div>
                        <div class="job-budget-section"><span class="budget-label">Budget</span><span class="budget-amount">${job.budget}</span></div>
                    </div>
                    <div class="job-meta">
                        <div class="job-meta-item"><i class="fas fa-user"></i><span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span></div>
                        ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>` : ''}
                        ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i><span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        if(jobsListContainer) jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        if(jobsListContainer) {
            jobsListContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>We encountered an issue loading the projects. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
        }
    }
}

async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-check-circle"></i> Approved Projects</h2><p class="header-subtitle">Manage your approved projects and communicate with designers</p></div></div>
        <div id="approved-jobs-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('approved-jobs-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading approved projects...</p></div>';

    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        const allJobs = response.data || [];
        const approvedJobs = allJobs.filter(job => job.status === 'assigned');
        appState.approvedJobs = approvedJobs;

        if (approvedJobs.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here once you accept quotes from designers.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }

        listContainer.innerHTML = approvedJobs.map(job => {
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            return `
                <div class="job-card premium-card approved-job">
                    <div class="job-header">
                        <div class="job-title-section"><h3 class="job-title">${job.title}</h3><span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span></div>
                        <div class="approved-amount"><span class="amount-label">Approved Amount</span><span class="amount-value">${job.approvedAmount}</span></div>
                    </div>
                    <div class="job-meta"><div class="job-meta-item"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div></div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions"><div class="job-actions-group"><button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button><button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button></div></div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Approved Projects</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed? This action cannot be undone and will notify the designer.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed successfully!');
            addNotification('A project has been marked as completed! The designer has been notified.', 'job');
            fetchAndRenderApprovedJobs();
        } catch (error) {
            addNotification('Failed to mark job as completed. Please try again.', 'error');
        }
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2><p class="header-subtitle">Track your quote submissions and manage communications</p></div></div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';

    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;

        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Submitted</h3><p>You haven't submitted any quotes yet. Browse available projects to get started.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button></div>`;
            return;
        }

        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const canDelete = quote.status === 'submitted';
            const canEdit = quote.status === 'submitted';
            const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
            const statusClass = quote.status;
            const actionButtons = [];
            if (quote.status === 'approved') {
                actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit Quote</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
            }
            return `
                <div class="quote-card premium-card quote-status-${statusClass}">
                    <div class="quote-header">
                        <div class="quote-title-section"><h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
                        <div class="quote-amount-section"><span class="amount-label">Quote Amount</span><span class="amount-value">${quote.quoteAmount}</span></div>
                    </div>
                    <div class="quote-meta">
                        ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                        <div class="quote-meta-item"><i class="fas fa-clock"></i><span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span></div>
                    </div>
                    <div class="quote-description"><p>${quote.description}</p></div>
                    ${attachmentLink}
                    <div class="quote-actions"><div class="quote-actions-group">${actionButtons.join('')}</div></div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Quotes</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button></div>`;
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        const content = `
            <div class="modal-header premium-modal-header"><h3><i class="fas fa-edit"></i> Edit Your Quote</h3><p class="modal-subtitle">Update your quote details for: <strong>${quote.jobTitle}</strong></p></div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required min="1"></div>
                </div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach...">${quote.description}</textarea></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Supported formats: PDF, DOC, DWG, Images</small></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button></div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {
        addNotification('Failed to load quote details for editing.', 'error');
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
        const formData = new FormData();
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        if (form.attachments.files.length > 0) {
            for (let i = 0; i < form.attachments.files.length; i++) {
                formData.append('attachments', form.attachments.files[i]);
            }
        }
        await apiCall(`/quotes/${form['quoteId'].value}`, 'PUT', formData, 'Quote updated successfully!');
        addNotification('Your quote has been updated successfully. The client will be notified of the changes.', 'quote');
        closeModal();
        fetchAndRenderMyQuotes();
    } catch (error) {
        addNotification('Failed to update quote. Please try again.', 'error');
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
        const formData = new FormData();
        ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => {
            if (form[field] && form[field].value) formData.append(field, form[field].value);
        });
        if (form.attachment.files.length > 0) {
            formData.append('attachment', form.attachment.files[0]);
        }
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addNotification(`Your project "${form.title.value}" has been posted successfully.`, 'job');
        form.reset();
        renderAppSection('jobs');
    } catch (error) {
        addNotification('Failed to post project. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This will also delete all associated quotes and cannot be undone.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.');
            addNotification('Project has been deleted successfully.', 'info');
            fetchAndRenderJobs();
        } catch (error) {
            addNotification('Failed to delete project. Please try again.', 'error');
        }
    }
}


async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
        try {
            await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.');
            addNotification('Quote has been deleted successfully.', 'info');
            fetchAndRenderMyQuotes();
            loadUserQuotes();
        } catch (error) {
            addNotification('Failed to delete quote. Please try again.', 'error');
        }
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];

        let quotesHTML = `<div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3><p class="modal-subtitle">Review and manage quotes for this project</p></div>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received</h3><p>No quotes have been submitted for this project yet. Check back later.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">`;
            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = '';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                if(canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve Quote</button>${messageButton}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${messageButton}`;
                } else {
                    actionButtons = messageButton;
                }
                const statusClass = quote.status;
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
                return `
                    <div class="quote-item premium-quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info"><div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div><div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div></div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        <div class="quote-details">
                            ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                            <div class="quote-description"><p>${quote.description}</p></div>
                            ${attachmentLink}
                        </div>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            }).join('');
            quotesHTML += `</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');
    } catch (error) {
        showGenericModal(`<div class="modal-header premium-modal-header"><h3><i class="fas fa-exclamation-triangle"></i> Error</h3></div><div class="error-state premium-error"><p>Could not load quotes for this project. Please try again later.</p></div>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer and notify all participants.')) {
        try {
            await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!');
            addNotification('You have approved a quote and assigned the project!', 'quote');
            closeModal();
            fetchAndRenderJobs();
        } catch (error) {
            addNotification('Failed to approve quote. Please try again.', 'error');
        }
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your best proposal for this project</p></div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required min="1" step="0.01" placeholder="Enter your quote amount"></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required min="1" placeholder="Project duration"></div>
            </div>
            <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach..."></textarea></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload portfolio samples or relevant documents</small></div>
            <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Quote</button></div>
        </form>`;
    showGenericModal(content, 'max-width: 600px;');
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
        const formData = new FormData();
        formData.append('jobId', form['jobId'].value);
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        if (form.attachments.files.length > 0) {
            for (let i = 0; i < form.attachments.files.length; i++) {
                formData.append('attachments', form.attachments.files[i]);
            }
        }
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        addNotification('Your quote has been submitted successfully.', 'quote');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        fetchAndRenderJobs();
    } catch (error) {
        addNotification('Failed to submit quote. Please try again.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
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
        addNotification('Failed to open conversation. Please try again.', 'error');
    }
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-comments"></i> Messages</h2><p class="header-subtitle">Communicate with clients and designers</p></div>
        </div>
        <div id="conversations-list" class="conversations-container premium-conversations"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;
    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3><p>Start collaborating with professionals by messaging them from job quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button></div>`;
            return;
        }
        const conversationsHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherParticipantName = otherParticipant ? otherParticipant.name : 'Unknown User';
            const lastMessage = convo.lastMessage ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const avatarColor = getAvatarColor(otherParticipantName);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;
            return `
                <div class="conversation-card premium-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${avatarColor}">${otherParticipantName.charAt(0).toUpperCase()}${isUnread ? '<div class="unread-indicator"></div>' : ''}</div>
                    <div class="convo-details">
                        <div class="convo-header"><h4>${otherParticipantName}</h4><div class="convo-meta"><span class="participant-type ${otherParticipant ? otherParticipant.type : ''}">${otherParticipant ? otherParticipant.type : ''}</span><span class="convo-time">${timeAgo}</span></div></div>
                        <p class="convo-project"><i class="fas fa-briefcase"></i><strong>${convo.jobTitle}</strong></p>
                        <p class="convo-preview">${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? `<strong>${convo.lastMessageBy}:</strong> ` : ''}${lastMessage}</p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
        listContainer.innerHTML = conversationsHTML;
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Conversations</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button></div>`;
    }
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

// ROBUST TIMESTAMP HANDLING - Replace in your script.js
function formatDetailedTimestamp(date) {
    try {
        if (!date) {
            console.warn('formatDetailedTimestamp: No date provided');
            return 'Unknown time';
        }
        let messageDate;
        // Handle Firebase Timestamp objects
        if (date && typeof date === 'object' && typeof date.toDate === 'function') {
            messageDate = date.toDate();
        }
        // Handle Firebase server timestamp objects with seconds/nanoseconds
        else if (date && typeof date === 'object' && date.seconds !== undefined) {
            messageDate = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        }
        // Handle regular Date objects
        else if (date instanceof Date) {
            messageDate = date;
        }
        // Handle ISO date strings
        else if (typeof date === 'string') {
            messageDate = new Date(date);
        }
        // Handle Unix timestamps (numbers)
        else if (typeof date === 'number') {
            // If it's a large number, assume milliseconds; if small, assume seconds
            messageDate = new Date(date > 1000000000000 ? date : date * 1000);
        }
        // Handle objects with _seconds property (some Firebase formats)
        else if (date && typeof date === 'object' && date._seconds !== undefined) {
            messageDate = new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
        }
        else {
            console.warn('formatDetailedTimestamp: Unrecognized date format:', typeof date, date);
            return 'Invalid time';
        }
        // Validate the resulting date
        if (!messageDate || isNaN(messageDate.getTime()) || messageDate.getTime() === 0) {
            console.warn('formatDetailedTimestamp: Invalid date created from:', date);
            return 'Invalid date';
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
        const time = messageDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        // Check if it's today
        if (today.getTime() === messageDay.getTime()) {
            return time;
        }
        // Check if it's yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === messageDay.getTime()) {
            return `Yesterday, ${time}`;
        }
        // Check if it's within the last week
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        if (messageDay > weekAgo) {
            const dayName = messageDate.toLocaleDateString([], { weekday: 'long' });
            return `${dayName}, ${time}`;
        }
        // Older dates
        return `${messageDate.toLocaleDateString()}, ${time}`;
    } catch (error) {
        console.error('formatDetailedTimestamp error:', error, 'Input:', date);
        return 'Invalid date';
    }
}

function formatMessageTimestamp(date) {
    try {
        if (!date) {
            return 'Unknown time';
        }
        let messageDate;
        // Handle Firebase Timestamp objects
        if (date && typeof date === 'object' && typeof date.toDate === 'function') {
            messageDate = date.toDate();
        }
        // Handle Firebase server timestamp objects
        else if (date && typeof date === 'object' && date.seconds !== undefined) {
            messageDate = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        }
        // Handle regular Date objects
        else if (date instanceof Date) {
            messageDate = date;
        }
        // Handle ISO date strings
        else if (typeof date === 'string') {
            messageDate = new Date(date);
        }
        // Handle Unix timestamps
        else if (typeof date === 'number') {
            messageDate = new Date(date > 1000000000000 ? date : date * 1000);
        }
        // Handle objects with _seconds property
        else if (date && typeof date === 'object' && date._seconds !== undefined) {
            messageDate = new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
        }
        else {
            console.warn('formatMessageTimestamp: Unrecognized date format:', typeof date, date);
            return 'Invalid time';
        }
        if (!messageDate || isNaN(messageDate.getTime()) || messageDate.getTime() === 0) {
            console.warn('formatMessageTimestamp: Invalid date created from:', date);
            return 'Invalid date';
        }
        const now = new Date();
        const diffMs = now - messageDate;
        // Handle future dates (should not happen but just in case)
        if (diffMs < 0) {
            return 'Just now';
        }
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffSeconds < 30) return 'Just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return messageDate.toLocaleDateString();
    } catch (error) {
        console.error('formatMessageTimestamp error:', error, 'Input:', date);
        return 'Invalid date';
    }
}

function formatMessageDate(date) {
    try {
        if (!date) {
            return 'Unknown Date';
        }
        let messageDate;
        // Handle Firebase Timestamp objects
        if (date && typeof date === 'object' && typeof date.toDate === 'function') {
            messageDate = date.toDate();
        }
        // Handle Firebase server timestamp objects
        else if (date && typeof date === 'object' && date.seconds !== undefined) {
            messageDate = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        }
        // Handle regular Date objects
        else if (date instanceof Date) {
            messageDate = date;
        }
        // Handle ISO date strings
        else if (typeof date === 'string') {
            messageDate = new Date(date);
        }
        // Handle Unix timestamps
        else if (typeof date === 'number') {
            messageDate = new Date(date > 1000000000000 ? date : date * 1000);
        }
        // Handle objects with _seconds property
        else if (date && typeof date === 'object' && date._seconds !== undefined) {
            messageDate = new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
        }
        else {
            console.warn('formatMessageDate: Unrecognized date format:', typeof date, date);
            return 'Unknown Date';
        }
        if (!messageDate || isNaN(messageDate.getTime()) || messageDate.getTime() === 0) {
            console.warn('formatMessageDate: Invalid date created from:', date);
            return 'Invalid Date';
        }
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
        // Check if it's today
        if (today.getTime() === messageDay.getTime()) {
            return 'Today';
        }
        // Check if it's yesterday
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === messageDay.getTime()) {
            return 'Yesterday';
        }
        // Check if it's this year
        if (messageDate.getFullYear() === now.getFullYear()) {
            return messageDate.toLocaleDateString([], {
                month: 'long',
                day: 'numeric'
            });
        }
        // Different year
        return messageDate.toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        console.error('formatMessageDate error:', error, 'Input:', date);
        return 'Invalid Date';
    }
}

async function renderConversationView(conversationOrId) {
    let conversation;
    // Handle both conversation object and ID
    if (typeof conversationOrId === 'string') {
        conversation = appState.conversations.find(c => c.id === conversationOrId);
        if (!conversation) {
            // If not found in local state, create minimal object and fetch details
            conversation = { id: conversationOrId };
        }
    } else {
        conversation = conversationOrId;
    }
    // If conversation doesn't have full data, try to fetch it
    if (!conversation.participants && conversation.id) {
        try {
            showNotification('Loading conversation details...', 'info');
            const response = await apiCall('/messages', 'GET');
            appState.conversations = response.data || [];
            conversation = appState.conversations.find(c => c.id === conversation.id);
            if (!conversation) {
                throw new Error('Conversation not found');
            }
        } catch(error) {
            console.error('Failed to load conversation:', error);
            showNotification('Failed to load conversation. Please try again.', 'error');
            renderAppSection('messages');
            return;
        }
    }
    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants ?
         conversation.participants.find(p => p.id !== appState.currentUser.id) :
         { name: 'Unknown User', type: 'user' };
    const avatarColor = getAvatarColor(otherParticipant.name || 'Unknown');
    container.innerHTML = `
        <div class="chat-container premium-chat">
            <div class="chat-header premium-chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn premium-back-btn">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="chat-header-info">
                    <div class="chat-avatar premium-avatar" style="background-color: ${avatarColor}">
                        ${(otherParticipant.name || 'U').charAt(0).toUpperCase()}
                        <div class="online-indicator"></div>
                    </div>
                    <div class="chat-details">
                        <h3>${otherParticipant.name || 'Conversation'}</h3>
                        <p class="chat-project">
                            <i class="fas fa-briefcase"></i> ${conversation.jobTitle || 'Project Discussion'}
                        </p>
                        <span class="chat-status">Active now</span>
                    </div>
                </div>
                <div class="chat-actions">
                    <span class="participant-type-badge premium-badge ${otherParticipant.type || ''}">
                        <i class="fas ${otherParticipant.type === 'designer' ? 'fa-drafting-compass' : 'fa-building'}"></i>
                         ${otherParticipant.type || 'User'}
                    </span>
                </div>
            </div>
            <div class="chat-messages premium-messages" id="chat-messages-container">
                <div class="loading-messages">
                    <div class="spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
            <div class="chat-input-area premium-input-area">
                <form id="send-message-form" class="message-form premium-message-form">
                    <div class="message-input-container">
                        <input type="text" id="message-text-input"
                                placeholder="Type your message..."
                                required autocomplete="off">
                        <button type="submit" class="send-button premium-send-btn" title="Send message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>`;
    // Add form submit handler
    document.getElementById('send-message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(conversation.id);
    });
    // Load messages with enhanced error handling
    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        const messages = response.data || [];
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-messages premium-empty-messages">
                    <div class="empty-icon"><i class="fas fa-comment-dots"></i></div>
                    <h4>Start the conversation</h4>
                    <p>Send your first message to begin collaborating on this project.</p>
                </div>`;
        } else {
            let messagesHTML = '';
            let lastDate = null;
            messages.forEach((msg, index) => {
                try {
                    // Use improved date handling with error recovery
                    const messageDate = formatMessageDate(msg.createdAt);
                    if(messageDate !== lastDate && messageDate !== 'Invalid Date') {
                        messagesHTML += `<div class="chat-date-separator"><span>${messageDate}</span></div>`;
                        lastDate = messageDate;
                    }
                    const isMine = msg.senderId === appState.currentUser.id;
                    const timestamp = formatDetailedTimestamp(msg.createdAt);
                    const prevMsg = messages[index - 1];
                    const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                    const senderAvatarColor = getAvatarColor(msg.senderName || 'Unknown');
                    messagesHTML += `
                        <div class="message-wrapper premium-message ${isMine ? 'me' : 'them'}">
                            ${!isMine && showAvatar ?
                                 `<div class="message-avatar premium-msg-avatar" style="background-color: ${senderAvatarColor}">
                                    ${(msg.senderName || 'U').charAt(0).toUpperCase()}
                                </div>` :
                                 '<div class="message-avatar-spacer" style="width: 40px; flex-shrink: 0;"></div>'
                            }
                            <div class="message-content">
                                ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName || 'Unknown'}</div>` : ''}
                                <div class="message-bubble premium-bubble ${isMine ? 'me' : 'them'}">${msg.text || ''}</div>
                                <div class="message-meta">${timestamp}</div>
                            </div>
                        </div>`;
                } catch (msgError) {
                    console.error('Error rendering message:', msgError, msg);
                    // Skip this message but continue with others
                }
            });
            messagesContainer.innerHTML = messagesHTML;
        }
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        // Focus on input
        const messageInput = document.getElementById('message-text-input');
        if (messageInput) {
            messageInput.focus();
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = `
            <div class="error-messages premium-error-messages">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h4>Error loading messages</h4>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="renderConversationView('${conversation.id}')">
                    Retry
                </button>
            </div>`;
    }
}

// Force immediate notification refresh after message send
async function refreshNotificationsAfterMessage() {
    console.log('🔄 [REFRESH] Forcing immediate notification refresh after message...');
    // Wait a moment for server processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
        await fetchNotifications();
        console.log('✅ [REFRESH] Immediate refresh completed');
        // Schedule additional refreshes
        setTimeout(async () => {
            console.log('🔄 [REFRESH] Secondary refresh...');
            await fetchNotifications();
        }, 3000);
        setTimeout(async () => {
            console.log('🔄 [REFRESH] Final refresh...');
            await fetchNotifications();
        }, 8000);
    } catch (error) {
        console.error('❌ [REFRESH] Refresh failed:', error);
    }
}

// Enhanced message sending with immediate notification refresh
async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const sendBtn = document.querySelector('.send-button');
    const text = input.value.trim();
    if (!text) {
        showNotification('Please enter a message', 'warning');
        return;
    }
    if (!conversationId) {
        showNotification('Conversation not found', 'error');
        return;
    }
    const originalBtnContent = sendBtn.innerHTML;
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="btn-spinner"></div>';
    try {
        console.log(`📤 [SEND] Sending message to conversation ${conversationId}...`);
        const response = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || `Failed to send message: ${response.status}`);
        }
        if (data.success) {
            console.log(`✅ [SEND] Message sent successfully:`, data.data);
            input.value = '';
            const messagesContainer = document.getElementById('chat-messages-container');
            // Remove empty state if it exists
            const emptyState = messagesContainer.querySelector('.empty-messages');
            if (emptyState) {
                emptyState.remove();
            }
            // Add message to UI immediately with proper timestamp
            const newMessage = data.data;
            const timestamp = formatDetailedTimestamp(newMessage.createdAt);
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-wrapper premium-message me';
            messageBubble.innerHTML = `
                <div class="message-avatar-spacer" style="width: 40px; flex-shrink: 0;"></div>
                <div class="message-content">
                    <div class="message-bubble premium-bubble me">${newMessage.text}</div>
                    <div class="message-meta">${timestamp}</div>
                </div>`;
            messagesContainer.appendChild(messageBubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            // ENHANCED: Force immediate notification refresh
            refreshNotificationsAfterMessage();
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch(error) {
        console.error('❌ [SEND] Message send failed:', error);
        showNotification(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnContent;
        if (input) {
            input.focus();
        }
    }
}


// --- UI & MODAL FUNCTIONS ---
// ... (The rest of the script from the previous turn remains unchanged)
// [I will append the rest of the script here]
// ...

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    <div id="modal-form-container"></div>
                </div>
            </div>`;
        modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
        renderAuthForm(view);
    }
}

function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    if (!container) return;
    container.innerHTML = view === 'login' ? getLoginTemplate() : getRegisterTemplate();
    const formId = view === 'login' ? 'login-form' : 'register-form';
    // This now correctly uses the wrapped window.handleLogin if the view is 'login'
    const handler = view === 'login' ? window.handleLogin : handleRegister;
    document.getElementById(formId).addEventListener('submit', handler);
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" style="${style}" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    ${innerHTML}
                </div>
            </div>`;
        modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
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

    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';

    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    // Setup user dropdown
    document.getElementById('user-info').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-info-dropdown').classList.toggle('active');
    });

    document.getElementById('user-settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderAppSection('settings');
        document.getElementById('user-info-dropdown').classList.remove('active');
    });

    document.getElementById('user-logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Enhanced notification panel setup
    const notificationBell = document.getElementById('notification-bell-container');
    if (notificationBell) {
        notificationBell.removeEventListener('click', toggleNotificationPanel);
        notificationBell.addEventListener('click', toggleNotificationPanel);
    }

    const clearBtn = document.getElementById('clear-notifications-btn');
    if (clearBtn) {
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        newClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            markAllAsRead();
        });
    }

    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('dashboard');

    if (user.type === 'designer') {
        loadUserQuotes();
    }
    if (user.type === 'contractor') {
        loadUserEstimations();
    }

    resetInactivityTimer();
    console.log('5-minute inactivity timer started');
}


function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';

    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) {
        navMenu.innerHTML = `
            <a href="#ai-estimation" class="nav-link">AI Estimation</a>
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>
            <a href="#showcase" class="nav-link">Showcase</a>`;
    }
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;

    if (role === 'designer') {
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
          <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Cost Estimation</span></a>
          <a href="#" class="sidebar-nav-link" data-section="my-estimations"><i class="fas fa-file-invoice fa-fw"></i><span>My Estimations</span></a>`;
    }

    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>`;
    links += `<hr class="sidebar-divider">`;
    links += `<a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;

    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    const userRole = appState.currentUser.type;
    if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        renderRecentActivityWidgets();
    } else if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes for engineering projects' : 'Manage your project listings and review quotes';
        container.innerHTML = `
            ${userRole === 'contractor' ? '<div id="dynamic-feature-header" class="dynamic-feature-header"></div>' : ''}
            <div class="section-header modern-header">
                <div class="header-content"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2><p class="header-subtitle">${subtitle}</p></div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;
        if (userRole === 'contractor') updateDynamicHeader();
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    } else if (sectionId === 'approved-jobs') {
        fetchAndRenderApprovedJobs();
    } else if (sectionId === 'messages') {
        fetchAndRenderConversations();
    } else if (sectionId === 'estimation-tool') {
        container.innerHTML = getEstimationToolTemplate();
        setupEstimationToolEventListeners();
    } else if (sectionId === 'my-estimations') {
        fetchAndRenderMyEstimations();
    } else if (sectionId === 'settings') {
        container.innerHTML = getSettingsTemplate(appState.currentUser);
    }
}

// --- DASHBOARD WIDGETS (ENHANCED) ---
async function renderRecentActivityWidgets() {
    const user = appState.currentUser;
    const recentProjectsContainer = document.getElementById('recent-projects-widget');
    const recentQuotesContainer = document.getElementById('recent-quotes-widget');

    if (user.type === 'contractor') {
        if(recentProjectsContainer) recentProjectsContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const endpoint = `/jobs/user/${user.id}?limit=3`;
            const response = await apiCall(endpoint, 'GET');
            const recentJobs = (response.data || []).slice(0, 3);
            if (recentJobs.length > 0) {
                recentProjectsContainer.innerHTML = recentJobs.map(job => `
                    <div class="widget-list-item" id="widget-item-${job.id}">
                        <div class="widget-item-header" onclick="toggleWidgetDetails('${job.id}', 'job')">
                            <div class="widget-item-info">
                                <i class="fas fa-briefcase widget-item-icon"></i>
                                <div>
                                    <p class="widget-item-title">${job.title}</p>
                                    <span class="widget-item-meta">Budget: ${job.budget}</span>
                                </div>
                            </div>
                            <span class="widget-item-status ${job.status}">${job.status}</span>
                        </div>
                        <div class="widget-item-details" id="widget-details-${job.id}"></div>
                    </div>
                `).join('');
            } else {
                recentProjectsContainer.innerHTML = '<p class="widget-empty-text">No recent projects found.</p>';
            }
        } catch(e) {
            recentProjectsContainer.innerHTML = '<p class="widget-empty-text">Could not load projects.</p>';
        }
    } else if (user.type === 'designer') {
        if(recentQuotesContainer) recentQuotesContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const endpoint = `/quotes/user/${user.id}?limit=3`;
            const response = await apiCall(endpoint, 'GET');
            const recentQuotes = (response.data || []).slice(0, 3);
             if (recentQuotes.length > 0) {
                recentQuotesContainer.innerHTML = recentQuotes.map(quote => `
                    <div class="widget-list-item" id="widget-item-${quote.id}">
                        <div class="widget-item-header" onclick="toggleWidgetDetails('${quote.id}', 'quote')">
                             <div class="widget-item-info">
                                <i class="fas fa-file-invoice-dollar widget-item-icon"></i>
                                <div>
                                    <p class="widget-item-title">Quote for: ${quote.jobTitle}</p>
                                    <span class="widget-item-meta">Amount: ${quote.quoteAmount}</span>
                                </div>
                            </div>
                            <span class="widget-item-status ${quote.status}">${quote.status}</span>
                        </div>
                        <div class="widget-item-details" id="widget-details-${quote.id}"></div>
                    </div>
                `).join('');
            } else {
                recentQuotesContainer.innerHTML = '<p class="widget-empty-text">No recent quotes found.</p>';
            }
        } catch(e) {
            recentQuotesContainer.innerHTML = '<p class="widget-empty-text">Could not load quotes.</p>';
        }
    }
}

async function toggleWidgetDetails(itemId, itemType) {
    const detailsContainer = document.getElementById(`widget-details-${itemId}`);
    if (!detailsContainer) return;

    if (detailsContainer.classList.contains('expanded')) {
        detailsContainer.classList.remove('expanded');
        detailsContainer.innerHTML = '';
        return;
    }

    // Close any other open details
    document.querySelectorAll('.widget-item-details.expanded').forEach(el => {
        el.classList.remove('expanded');
        el.innerHTML = '';
    });

    detailsContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
    detailsContainer.classList.add('expanded');

    try {
        if (itemType === 'job') {
            const job = appState.jobs.find(j => j.id === itemId) || (await apiCall(`/jobs/${itemId}`, 'GET')).data;
            if (job) {
                detailsContainer.innerHTML = `
                    <p><strong>Description:</strong> ${job.description}</p>
                    <p><strong>Deadline:</strong> ${new Date(job.deadline).toLocaleDateString()}</p>
                    ${job.assignedToName ? `<p><strong>Assigned To:</strong> ${job.assignedToName}</p>` : ''}
                    <button class="btn btn-outline" onclick="renderAppSection('jobs')">View Full Details</button>
                `;
            }
        } else if (itemType === 'quote') {
            const quote = appState.myQuotes.find(q => q.id === itemId) || (await apiCall(`/quotes/${itemId}`, 'GET')).data;
            if (quote) {
                detailsContainer.innerHTML = `
                    <p><strong>Description:</strong> ${quote.description}</p>
                    <p><strong>Timeline:</strong> ${quote.timeline} days</p>
                    <button class="btn btn-outline" onclick="renderAppSection('my-quotes')">View Full Details</button>
                `;
            }
        }
    } catch (error) {
        detailsContainer.innerHTML = '<p>Could not load details.</p>';
    }
}

// --- ESTIMATION TOOL FUNCTIONS ---
function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');

    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileSelect(e.target.files);
        });
    }

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
        const fileType = file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file';
        filesHTML += `
            <div class="selected-file-item">
                <div class="file-info"><i class="fas ${fileType}"></i><div class="file-details"><span class="file-name">${file.name}</span><span class="file-size">${fileSize} MB</span></div></div>
                <button type="button" class="remove-file-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
            </div>`;
    }
    fileList.innerHTML = filesHTML;
    document.getElementById('file-info-container').style.display = 'block';
    submitBtn.disabled = false;
    showNotification(`${files.length} file(s) selected for estimation`, 'success');
}

function removeFile(index) {
    const filesArray = Array.from(appState.uploadedFile);
    filesArray.splice(index, 1);

    if (filesArray.length === 0) {
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        document.getElementById('submit-estimation-btn').disabled = true;
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
        showNotification('Please select files for estimation', 'warning');
        return;
    }
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    if (!projectTitle || !description) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting Request...';
    try {
        const formData = new FormData();
        formData.append('projectTitle', projectTitle);
        formData.append('description', description);
        formData.append('contractorName', appState.currentUser.name);
        formData.append('contractorEmail', appState.currentUser.email);
        for (let i = 0; i < appState.uploadedFile.length; i++) {
            formData.append('files', appState.uploadedFile[i]);
        }
        await apiCall('/estimation/contractor/submit', 'POST', formData, 'Estimation request submitted successfully!');
        addNotification(`Your AI estimation request for "${projectTitle}" has been submitted.`, 'estimation');
        form.reset();
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        renderAppSection('my-estimations');
    } catch (error) {
        addNotification('Failed to submit estimation request. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Estimation Request';
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    const iconClass = getNotificationIcon(type);

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>`;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}


// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Welcome Back</h2><p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input premium-input" name="loginEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input premium-input" name="loginPassword" required placeholder="Enter your password"></div>
            <button type="submit" class="btn btn-primary btn-full premium-btn"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Join SteelConnect</h2><p>Create your professional account</p>
        </div>
        <form id="register-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input premium-input" name="regName" required placeholder="Enter your full name"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input premium-input" name="regEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input premium-input" name="regPassword" required placeholder="Create a strong password"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select premium-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full premium-btn"><i class="fas fa-user-plus"></i> Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p class="header-subtitle">Create a detailed project listing to attract qualified professionals</p></div>
        </div>
        <div class="post-job-container premium-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input premium-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label><input type="text" class="form-input premium-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div>
                        <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Project Deadline</label><input type="date" class="form-input premium-input" name="deadline" required></div>
                    </div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Required Skills</label><input type="text" class="form-input premium-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis"><small class="form-help">Separate skills with commas</small></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-external-link-alt"></i> Project Link (Optional)</label><input type="url" class="form-input premium-input" name="link" placeholder="https://example.com/project-details"><small class="form-help">Link to additional project information</small></div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-align-left"></i> Detailed Description</label><textarea class="form-textarea premium-textarea" name="description" required placeholder="Provide a comprehensive description of your project..."></textarea></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Project Attachments</label><input type="file" class="form-input file-input premium-file-input" name="attachment" accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload drawings or specifications (Max 10MB)</small></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large premium-btn"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2><p class="header-subtitle">Upload your structural drawings to get instant, accurate cost estimates</p></div>
        </div>
        <div class="estimation-tool-container premium-estimation-container">
            <div class="estimation-steps">
                <div class="step active"><div class="step-number">1</div><div class="step-content"><h4>Upload Files</h4><p>Add your project drawings</p></div></div>
                <div class="step"><div class="step-number">2</div><div class="step-content"><h4>Project Details</h4><p>Describe your requirements</p></div></div>
                <div class="step"><div class="step-number">3</div><div class="step-content"><h4>Get Estimate</h4><p>Receive detailed cost breakdown</p></div></div>
            </div>
            <form id="estimation-form" class="premium-estimation-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-upload"></i> Upload Project Files</h3>
                    <div class="file-upload-section premium-upload-section">
                        <div id="file-upload-area" class="file-upload-area premium-upload-area">
                            <input type="file" id="file-upload-input" accept=".pdf,.dwg,.doc,.docx,.jpg,.jpeg,.png" multiple />
                            <div class="upload-content">
                                <div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                                <h3>Drag & Drop Your Files Here</h3><p>or click to browse</p>
                                <div class="supported-formats"><span class="format-badge">PDF</span><span class="format-badge">DWG</span><span class="format-badge">DOC</span><span class="format-badge">Images</span></div>
                                <small class="upload-limit">Maximum 10 files, 15MB each</small>
                            </div>
                        </div>
                        <div id="file-info-container" class="selected-files-container" style="display: none;"><h4><i class="fas fa-files"></i> Selected Files</h4><div id="selected-files-list" class="selected-files-list"></div></div>
                    </div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input premium-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Project Description</label><textarea class="form-textarea premium-textarea" name="description" required placeholder="Describe your project in detail..."></textarea></div>
                </div>
                <div class="estimation-features">
                    <div class="feature-item"><i class="fas fa-robot"></i><div><h4>AI-Powered Analysis</h4><p>Advanced algorithms analyze your drawings</p></div></div>
                    <div class="feature-item"><i class="fas fa-chart-line"></i><div><h4>Detailed Breakdown</h4><p>Get itemized costs for materials, labor, and logistics</p></div></div>
                    <div class="feature-item"><i class="fas fa-clock"></i><div><h4>Instant Results</h4><p>Receive your estimation within minutes</p></div></div>
                </div>
                <div class="form-actions estimation-actions">
                    <button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large premium-btn" disabled><i class="fas fa-paper-plane"></i> Submit Estimation Request</button>
                    <p class="estimation-note"><i class="fas fa-info-circle"></i> Our expert team will review your submission and provide a detailed cost analysis.</p>
                </div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name.split(' ')[0];

    const contractorQuickActions = `
        <div class="quick-action-card" onclick="renderAppSection('post-job')">
            <i class="fas fa-plus-circle card-icon"></i>
            <h3>Create New Project</h3>
            <p>Post a new listing for designers to quote on.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('jobs')">
            <i class="fas fa-tasks card-icon"></i>
            <h3>My Projects</h3>
            <p>View and manage all your active projects.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('estimation-tool')">
            <i class="fas fa-calculator card-icon"></i>
            <h3>AI Estimation</h3>
            <p>Get instant cost estimates for your drawings.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('approved-jobs')">
            <i class="fas fa-check-circle card-icon"></i>
            <h3>Approved Projects</h3>
            <p>Track progress and communicate on assigned work.</p>
        </div>`;

    const contractorWidgets = `
        <div class="widget-card">
            <h3><i class="fas fa-history"></i> Recent Projects</h3>
            <div id="recent-projects-widget" class="widget-content"></div>
        </div>`;

    const designerQuickActions = `
        <div class="quick-action-card" onclick="renderAppSection('jobs')">
            <i class="fas fa-search card-icon"></i>
            <h3>Browse Projects</h3>
            <p>Find new opportunities and submit quotes.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('my-quotes')">
            <i class="fas fa-file-invoice-dollar card-icon"></i>
            <h3>My Quotes</h3>
            <p>Track the status of your submitted quotes.</p>
        </div>
        <div class="quick-action-card" onclick="showNotification('Feature coming soon!', 'info')">
            <i class="fas fa-upload card-icon"></i>
            <h3>Submit Work</h3>
            <p>Upload deliverables for your assigned projects.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('messages')">
            <i class="fas fa-comments card-icon"></i>
            <h3>Messages</h3>
            <p>Communicate with clients about projects.</p>
        </div>`;

    const designerWidgets = `
        <div class="widget-card">
            <h3><i class="fas fa-history"></i> Recent Quotes</h3>
            <div id="recent-quotes-widget" class="widget-content"></div>
        </div>`;

    return `
        <div class="dashboard-container">
            <div class="dashboard-hero">
                <div>
                    <h2>Welcome back, ${name} 👋</h2>
                    <p>You are logged in to your <strong>${isContractor ? 'Contractor' : 'Designer'} Portal</strong>. Manage your workflows seamlessly.</p>
                </div>
                <div class="subscription-badge">
                    <i class="fas fa-star"></i> Pro Plan
                </div>
            </div>

            <h3 class="dashboard-section-title">Quick Actions</h3>
            <div class="dashboard-grid">
                ${isContractor ? contractorQuickActions : designerQuickActions}
            </div>

            <div class="dashboard-columns">
                ${isContractor ? contractorWidgets : designerWidgets}

                <div class="widget-card">
                    <h3><i class="fas fa-user-circle"></i> Your Profile</h3>
                    <div class="widget-content">
                        <p>Complete your profile to attract more opportunities.</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: 75%;"></div>
                        </div>
                        <p class="progress-label">75% Complete</p>
                        <button class="btn btn-outline" onclick="renderAppSection('settings')">
                            <i class="fas fa-edit"></i> Update Profile
                        </button>
                        <hr class="widget-divider">
                        <p>Upgrade your plan for advanced features.</p>
                        <button class="btn btn-primary" onclick="renderAppSection('settings')">
                           <i class="fas fa-arrow-up"></i> Upgrade Subscription
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getSettingsTemplate(user) {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-cog"></i> Settings</h2>
                <p class="header-subtitle">Manage your account, profile, and subscription details</p>
            </div>
        </div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Personal Information</h3>
                <form class="premium-form" onsubmit="event.preventDefault(); showNotification('Profile updated successfully!', 'success');">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" value="${user.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" value="${user.email}" disabled>
                        <small class="form-help">Email cannot be changed.</small>
                    </div>
                     <div class="form-group">
                        <label class="form-label">Company Name (Optional)</label>
                        <input type="text" class="form-input" placeholder="Your Company LLC">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>

            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                 <form class="premium-form" onsubmit="event.preventDefault(); showNotification('Password functionality not implemented.', 'info');">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-input">
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>

            <div class="settings-card subscription-card">
                <h3><i class="fas fa-gem"></i> Subscription & Billing</h3>
                <p>You are currently on the <strong>Pro Plan</strong>. This gives you access to unlimited projects and AI estimations.</p>
                <div class="subscription-plans">
                    <div class="plan-card">
                        <h4>Basic</h4>
                        <p class="price">Free</p>
                        <ul>
                            <li><i class="fas fa-check"></i> 3 Projects / month</li>
                            <li><i class="fas fa-times"></i> AI Estimations</li>
                            <li><i class="fas fa-check"></i> Standard Support</li>
                        </ul>
                        <button class="btn btn-outline" disabled>Current Plan</button>
                    </div>
                    <div class="plan-card active">
                        <h4>Pro</h4>
                        <p class="price">$49<span>/mo</span></p>
                        <ul>
                            <li><i class="fas fa-check"></i> Unlimited Projects</li>
                            <li><i class="fas fa-check"></i> AI Estimations</li>
                            <li><i class="fas fa-check"></i> Priority Support</li>
                        </ul>
                         <button class="btn btn-success" onclick="showNotification('You are on the best plan!', 'info')">Your Plan</button>
                    </div>
                     <div class="plan-card">
                        <h4>Enterprise</h4>
                        <p class="price">Contact Us</p>
                        <ul>
                            <li><i class="fas fa-check"></i> Team Accounts</li>
                            <li><i class="fas fa-check"></i> Advanced Analytics</li>
                            <li><i class="fas fa-check"></i> Dedicated Support</li>
                        </ul>
                         <button class="btn btn-primary" onclick="showNotification('Contacting sales...', 'info')">Get a Quote</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- PROFILE COMPLETION SYSTEM ---

// Check profile completion status on login
async function checkProfileCompletionStatus() {
    if (!appState.currentUser) return;

    try {
        const response = await apiCall('/profile/status', 'GET');
        const status = response.data;

        // Store profile status in app state
        appState.currentUser.profileStatus = status;

        if (!status.profileCompleted) {
            // Profile not completed - show completion form
            renderProfileCompletionForm();
        } else if (status.profileStatus === 'pending') {
            // Profile submitted but pending approval
            renderProfilePendingView();
        } else if (status.profileStatus === 'rejected') {
            // Profile rejected - show rejection reason and allow resubmission
            renderProfileRejectedView(status.rejectionReason);
        } else if (status.profileStatus === 'approved' && status.canAccess) {
            // Profile approved - user can access full functionality
            console.log('Profile approved - full access granted');
        } else {
            // Edge case - profile completed but access denied
            renderProfileAccessDeniedView();
        }
    } catch (error) {
        console.error('Error checking profile status:', error);
        // Don't block user if we can't check status
    }
}

// Render profile completion form
async function renderProfileCompletionForm() {
    try {
        // Get form fields for user type
        const fieldsResponse = await apiCall('/profile/form-fields', 'GET');
        const { userType, fields } = fieldsResponse.data;

        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="profile-completion-container">
                <div class="profile-completion-header">
                    <div class="completion-icon">
                        <i class="fas fa-user-edit"></i>
                    </div>
                    <h2>Complete Your Profile</h2>
                    <p>Please complete your ${userType} profile to access all features</p>
                    <div class="completion-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: 20%;"></div>
                        </div>
                        <span class="progress-text">Step 1 of 3: Profile Information</span>
                    </div>
                </div>
                <div class="profile-completion-form">
                    <form id="profile-completion-form" enctype="multipart/form-data">
                        <div class="form-sections">
                            ${renderProfileFormFields(fields, userType)}
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-large">
                                <i class="fas fa-paper-plane"></i>
                                Submit for Review
                            </button>
                            <p class="submission-note">
                                <i class="fas fa-info-circle"></i>
                                Your profile will be reviewed by our admin team within 24-48 hours
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add form submission handler
        document.getElementById('profile-completion-form').addEventListener('submit', handleProfileSubmission);

        // Add file upload handlers
        setupFileUploadHandlers();

    } catch (error) {
        console.error('Error rendering profile form:', error);
        showNotification('Failed to load profile form. Please refresh the page.', 'error');
    }
}

// Render form fields based on user type
function renderProfileFormFields(fields, userType) {
    let sectionsHTML = '';

    if (userType === 'designer') {
        sectionsHTML = `
            <div class="form-section">
                <h3><i class="fas fa-user"></i> Professional Information</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">LinkedIn Profile</label>
                        <input type="url" name="linkedinProfile" class="form-input" required
                                placeholder="https://linkedin.com/in/yourprofile">
                        <small class="form-help">Your professional LinkedIn profile URL</small>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label required">Professional Skills</label>
                    <input type="text" name="skills" class="form-input" required
                            placeholder="AutoCAD, Revit, Structural Analysis, Steel Design">
                    <small class="form-help">Separate skills with commas</small>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">Years of Experience</label>
                        <select name="experience" class="form-select" required>
                            <option value="">Select experience level</option>
                            <option value="0-2">0-2 years</option>
                            <option value="3-5">3-5 years</option>
                            <option value="6-10">6-10 years</option>
                            <option value="11-15">11-15 years</option>
                            <option value="15+">15+ years</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Specializations</label>
                        <input type="text" name="specializations" class="form-input"
                                placeholder="Commercial Buildings, Bridges, Industrial Structures">
                        <small class="form-help">Your areas of expertise</small>
                    </div>
                </div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-graduation-cap"></i> Education & Background</h3>
                <div class="form-group">
                    <label class="form-label required">Education</label>
                    <textarea name="education" class="form-textarea" required
                               placeholder="Degree, Institution, Year of graduation..."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label required">Professional Bio</label>
                    <textarea name="bio" class="form-textarea" required
                               placeholder="Tell clients about your expertise and experience..."></textarea>
                </div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-file-upload"></i> Documents</h3>
                <div class="file-upload-grid">
                    <div class="file-upload-group">
                        <label class="form-label required">Resume/CV</label>
                        <div class="file-upload-area" id="resume-upload">
                            <input type="file" name="resume" accept=".pdf,.doc,.docx" required hidden>
                            <div class="upload-placeholder">
                                <i class="fas fa-file-pdf"></i>
                                <span>Click to upload resume</span>
                                <small>PDF, DOC, DOCX (Max 10MB)</small>
                            </div>
                        </div>
                    </div>
                    <div class="file-upload-group">
                        <label class="form-label">Certificates (Optional)</label>
                        <div class="file-upload-area" id="certificates-upload">
                            <input type="file" name="certificates" accept=".pdf,.jpg,.png" multiple hidden>
                            <div class="upload-placeholder">
                                <i class="fas fa-certificate"></i>
                                <span>Upload certificates</span>
                                <small>PDF, JPG, PNG (Max 5 files)</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else if (userType === 'contractor') {
        sectionsHTML = `
            <div class="form-section">
                <h3><i class="fas fa-building"></i> Company Information</h3>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label required">Company Name</label>
                        <input type="text" name="companyName" class="form-input" required
                                placeholder="Your Company LLC">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">LinkedIn Profile</label>
                        <input type="url" name="linkedinProfile" class="form-input" required
                                placeholder="https://linkedin.com/company/yourcompany">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Company Website</label>
                        <input type="url" name="companyWebsite" class="form-input"
                                placeholder="https://yourcompany.com">
                    </div>
                    <div class="form-group">
                        <label class="form-label required">Business Type</label>
                        <select name="businessType" class="form-select" required>
                            <option value="">Select business type</option>
                            <option value="Construction">Construction</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Architecture">Architecture</option>
                            <option value="Consulting">Consulting</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Year Established</label>
                        <input type="number" name="yearEstablished" class="form-input"
                                min="1900" max="2024" placeholder="2020">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Company Size</label>
                        <select name="companySize" class="form-select">
                            <option value="">Select size</option>
                            <option value="1-10">1-10 employees</option>
                            <option value="11-50">11-50 employees</option>
                            <option value="51-200">51-200 employees</option>
                            <option value="201-500">201-500 employees</option>
                            <option value="500+">500+ employees</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-info-circle"></i> Company Details</h3>
                <div class="form-group">
                    <label class="form-label required">Company Description</label>
                    <textarea name="description" class="form-textarea" required
                               placeholder="Describe your company's services and expertise..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Business Address</label>
                        <textarea name="address" class="form-textarea" rows="3"
                                  placeholder="Street Address, City, State, ZIP Code"></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Business Phone</label>
                        <input type="tel" name="phone" class="form-input"
                                placeholder="+1 (555) 123-4567">
                    </div>
                </div>
            </div>
        `;
    }

    return sectionsHTML;
}

// Setup file upload handlers
function setupFileUploadHandlers() {
    const uploadAreas = document.querySelectorAll('.file-upload-area');

    uploadAreas.forEach(area => {
        const input = area.querySelector('input[type="file"]');
        const placeholder = area.querySelector('.upload-placeholder');

        area.addEventListener('click', () => input.click());

        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });

        area.addEventListener('dragleave', () => {
            area.classList.remove('drag-over');
        });

        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                updateFileDisplay(area, input.files);
            }
        });

        input.addEventListener('change', () => {
            updateFileDisplay(area, input.files);
        });
    });
}

// Update file display after selection
function updateFileDisplay(area, files) {
    const placeholder = area.querySelector('.upload-placeholder');

    if (files.length === 0) return;

    const fileList = Array.from(files).map(file => `
        <div class="selected-file">
            <i class="fas fa-file"></i>
            <span>${file.name}</span>
            <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
        </div>
    `).join('');

    placeholder.innerHTML = `
        <div class="files-selected">
            <i class="fas fa-check-circle"></i>
            <span>${files.length} file(s) selected</span>
        </div>
        <div class="selected-files-list">${fileList}</div>
    `;

    area.classList.add('has-files');
}

// Handle profile submission
async function handleProfileSubmission(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';

    try {
        // Create FormData object
        const formData = new FormData(form);

        // Validate required fields
        const requiredFields = form.querySelectorAll('[required]');
        for (let field of requiredFields) {
            if (!field.value.trim() && field.type !== 'file') {
                throw new Error(`Please fill in the required field: ${field.name}`);
            }
            if (field.type === 'file' && field.files.length === 0) {
                throw new Error(`Please upload the required file: ${field.name}`);
            }
        }

        // Submit profile
        const response = await apiCall('/profile/complete', 'PUT', formData, true);

        if (response.success) {
            showNotification('Profile submitted successfully! You will receive an email when reviewed.', 'success');
            renderProfilePendingView();
        }

    } catch (error) {
        console.error('Profile submission error:', error);
        showNotification(error.message || 'Failed to submit profile. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Render profile pending view
function renderProfilePendingView() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon pending">
                <i class="fas fa-clock"></i>
            </div>
            <h2>Profile Under Review</h2>
            <p>Your profile has been submitted and is currently being reviewed by our admin team.</p>
            <div class="status-details">
                <div class="timeline-item active">
                    <i class="fas fa-check"></i>
                    <span>Profile Submitted</span>
                </div>
                <div class="timeline-item pending">
                    <i class="fas fa-clock"></i>
                    <span>Admin Review (24-48 hours)</span>
                </div>
                <div class="timeline-item">
                    <i class="fas fa-envelope"></i>
                    <span>Email Notification</span>
                </div>
            </div>
            <p class="review-note">
                You will receive an email notification once your profile is reviewed.
                 Until approval, your account has limited functionality.
            </p>
            <div class="status-actions">
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
                <button class="btn btn-secondary" onclick="checkProfileCompletionStatus()">
                    <i class="fas fa-refresh"></i>
                    Check Status
                </button>
            </div>
        </div>
    `;
}

// Render profile rejected view
function renderProfileRejectedView(rejectionReason) {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon rejected">
                <i class="fas fa-times-circle"></i>
            </div>
            <h2>Profile Review Required</h2>
            <p>Your profile needs some updates before it can be approved.</p>
            <div class="rejection-reason">
                <h3>Feedback from our team:</h3>
                <div class="reason-box">
                    <i class="fas fa-comment-alt"></i>
                    <p>${rejectionReason}</p>
                </div>
            </div>
            <p>Please update your profile based on the feedback above and resubmit for review.</p>
            <div class="status-actions">
                <button class="btn btn-primary" onclick="renderProfileCompletionForm()">
                    <i class="fas fa-edit"></i>
                    Update Profile
                </button>
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </div>
    `;
}

// Render profile access denied view
function renderProfileAccessDeniedView() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon denied">
                <i class="fas fa-ban"></i>
            </div>
            <h2>Access Restricted</h2>
            <p>Your account access is currently restricted. Please contact support for assistance.</p>
            <div class="status-actions">
                <button class="btn btn-primary" onclick="window.open('mailto:support@steelconnect.com', '_blank')">
                    <i class="fas fa-envelope"></i>
                    Contact Support
                </button>
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i>
                    Logout
                </button>
            </div>
        </div>
    `;
}


// --- Complete Debug System for Message Notifications - Add to script.js
// Comprehensive notification system debug
async function debugNotificationFlow() {
    console.log('=== COMPREHENSIVE NOTIFICATION DEBUG ===');
    // 1. Check notification service availability
    console.log('1. Testing notification endpoints...');
    try {
        const unreadResponse = await apiCall('/notifications/unread-count', 'GET');
        console.log('✅ Notification service is accessible:', unreadResponse);
    } catch (error) {
        console.error('❌ Notification service error:', error);
    }
    // 2. Check current notifications
    console.log('2. Current notification state:');
    try {
        const response = await apiCall('/notifications', 'GET');
        const allNotifications = response.data || [];
        console.log(`Total notifications: ${allNotifications.length}`);
        const messageNotifications = allNotifications.filter(n => n.type === 'message');
        console.log(`Message notifications: ${messageNotifications.length}`);
        if (messageNotifications.length > 0) {
            console.log('Recent message notifications:');
            messageNotifications.slice(0, 3).forEach((n, i) => {
                console.log(`  ${i + 1}. "${n.message}" (${n.isRead ? 'read' : 'unread'})`);
                console.log(`     Created: ${n.createdAt}`);
                console.log(`     Metadata:`, n.metadata);
            });
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
    // 3. Check user and auth state
    console.log('3. User and authentication:');
    console.log('Current user:', appState.currentUser?.name, `(ID: ${appState.currentUser?.id})`);
    console.log('JWT token exists:', !!appState.jwtToken);
    console.log('Token length:', appState.jwtToken?.length || 0);
    // 4. Check conversations
    console.log('4. Conversation state:');
    console.log('Loaded conversations:', appState.conversations.length);
    if (appState.conversations.length > 0) {
        console.log('First conversation participants:',
             appState.conversations[0].participants?.map(p => `${p.name} (${p.id})`)
        );
    }
    // 5. Test timestamp functions
    console.log('5. Testing timestamp functions:');
    const testDates = [
        new Date(),
        new Date().toISOString(),
        Date.now(),
        { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }
    ];
    testDates.forEach((date, i) => {
        console.log(`Test ${i + 1}:`, typeof date, formatMessageTimestamp(date));
    });
    console.log('=== DEBUG COMPLETE ===');
}

// Test message sending and notification creation
async function testCompleteMessageFlow() {
    console.log('=== TESTING COMPLETE MESSAGE FLOW ===');
    // Check if we're in a conversation
    const conversationContainer = document.getElementById('chat-messages-container');
    if (!conversationContainer) {
        console.log('❌ Not in a conversation view');
        return;
    }
    // Get conversation ID from URL or form
    const messageForm = document.getElementById('send-message-form');
    if (!messageForm) {
        console.log('❌ Message form not found');
        return;
    }
    // Send a test message
    const testMessage = `Test notification message - ${new Date().toLocaleTimeString()}`;
    console.log('📤 Sending test message:', testMessage);
    const messageInput = document.getElementById('message-text-input');
    if (messageInput) {
        messageInput.value = testMessage;
        // Trigger send
        messageForm.dispatchEvent(new Event('submit'));
        // Monitor for notifications
        console.log('⏱️ Monitoring for notifications...');
        let checkCount = 0;
        const maxChecks = 6;
        const checkInterval = setInterval(async () => {
            checkCount++;
            console.log(`Check ${checkCount}/${maxChecks} - Looking for new notifications...`);
            try {
                const response = await apiCall('/notifications', 'GET');
                const notifications = response.data || [];
                const recentMessages = notifications.filter(n =>
                    n.type === 'message' &&
                    n.message.includes('Test notification message')
                );
                if (recentMessages.length > 0) {
                    console.log('✅ Found test notification!', recentMessages[0]);
                    clearInterval(checkInterval);
                    return;
                }
                if (checkCount >= maxChecks) {
                    console.log('❌ No test notification found after maximum checks');
                    clearInterval(checkInterval);
                }
            } catch (error) {
                console.error('Error checking notifications:', error);
            }
        }, 2000); // Check every 2 seconds
    }
}

// Monitor notification polling
function monitorNotificationPolling() {
    console.log('=== MONITORING NOTIFICATION POLLING ===');
    console.log('Polling active:', !!notificationState.pollingInterval);
    console.log('Last fetch time:', notificationState.lastFetchTime);
    console.log('Stored notifications:', notificationState.notifications.length);
    if (notificationState.pollingInterval) {
        console.log('✅ Polling is active');
        // Monitor next few polls
        let pollCount = 0;
        const originalFetch = fetchNotifications;
        window.fetchNotifications = async function() {
            pollCount++;
            console.log(`📡 Poll ${pollCount} starting...`);
            const startTime = Date.now();
            try {
                await originalFetch();
                const duration = Date.now() - startTime;
                console.log(`📡 Poll ${pollCount} completed in ${duration}ms`);
            } catch (error) {
                console.error(`📡 Poll ${pollCount} failed:`, error);
            }
        };
        // Restore original after 5 polls
        setTimeout(() => {
            window.fetchNotifications = originalFetch;
            console.log('📡 Monitoring complete');
        }, 75000); // 5 polls * 15 seconds
    } else {
        console.log('❌ Polling is not active - starting it...');
        startNotificationPolling();
    }
}

// Check backend notification creation
async function testBackendNotificationCreation() {
    console.log('=== TESTING BACKEND NOTIFICATION CREATION ===');
    try {
        // Get current notification count
        const beforeResponse = await apiCall('/notifications', 'GET');
        const beforeCount = beforeResponse.data.length;
        console.log('Notifications before test:', beforeCount);
        // Send a test message if in conversation
        const conversationId = getCurrentConversationId();
        if (conversationId) {
            console.log('Sending test message to trigger notification...');
            const testResponse = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${appState.jwtToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: 'Backend notification test message' })
            });
            const testData = await testResponse.json();
            console.log('Message send response:', testData);
            // Wait and check for new notifications
            setTimeout(async () => {
                const afterResponse = await apiCall('/notifications', 'GET');
                const afterCount = afterResponse.data.length;
                console.log('Notifications after test:', afterCount);
                console.log('New notifications created:', afterCount - beforeCount);
                if (afterCount > beforeCount) {
                    console.log('✅ Backend notification creation is working!');
                    const newNotifications = afterResponse.data.slice(0, afterCount - beforeCount);
                    console.log('New notifications:', newNotifications);
                } else {
                    console.log('❌ No new notifications created by backend');
                }
            }, 5000);
        } else {
            console.log('❌ Not in a conversation - cannot test message sending');
        }
    } catch (error) {
        console.error('Error testing backend notification creation:', error);
    }
}

// Helper function to get current conversation ID
function getCurrentConversationId() {
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return null;
    // Try to extract from form or URL
    const messageForm = document.getElementById('send-message-form');
    if (messageForm) {
        // Look for conversation ID in form data or URL
        const urlParts = window.location.href.split('/');
        const conversationIndex = urlParts.indexOf('messages');
        if (conversationIndex !== -1 && urlParts[conversationIndex + 1]) {
            return urlParts[conversationIndex + 1];
        }
    }
    return null;
}

// Force refresh and clear notification cache
async function forceNotificationRefresh() {
    console.log('=== FORCING COMPLETE NOTIFICATION REFRESH ===');
    // Clear local cache
    notificationState.notifications = [];
    appState.notifications = [];
    localStorage.removeItem(notificationState.storageKey);
    // Stop and restart polling
    stopNotificationPolling();
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Fresh fetch
    await fetchNotifications();
    // Restart polling
    startNotificationPolling();
    console.log('✅ Complete refresh finished');
}

// Add all debug functions to window for console access
window.debugNotificationFlow = debugNotificationFlow;
window.testCompleteMessageFlow = testCompleteMessageFlow;
window.monitorNotificationPolling = monitorNotificationPolling;
window.testBackendNotificationCreation = testBackendNotificationCreation;
window.forceNotificationRefresh = forceNotificationRefresh;

// Quick test function
window.quickNotificationTest = async function() {
    console.log('🚀 QUICK NOTIFICATION TEST');
    await debugNotificationFlow();
    monitorNotificationPolling();
    if (document.getElementById('chat-messages-container')) {
        await testCompleteMessageFlow();
    }
};

}
