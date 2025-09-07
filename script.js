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

// --- HELPER FUNCTIONS ---

// ROBUST TIMESTAMP HANDLING
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

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    const index = (name || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

// Helper function to check if date is valid
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Helper function to get file icon based on file type
function getFileIcon(fileType) {
    const icons = {
        'pdf': 'file-pdf', 'application/pdf': 'file-pdf',
        'doc': 'file-word', 'docx': 'file-word', 'application/msword': 'file-word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'file-word',
        'xls': 'file-excel', 'xlsx': 'file-excel', 'application/vnd.ms-excel': 'file-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
        'jpg': 'file-image', 'jpeg': 'file-image', 'png': 'file-image', 'gif': 'file-image',
        'image/jpeg': 'file-image', 'image/png': 'file-image', 'image/gif': 'file-image',
        'zip': 'file-archive', 'rar': 'file-archive', 'application/zip': 'file-archive',
        'txt': 'file-alt', 'text/plain': 'file-alt'
    };
    return icons[fileType?.toLowerCase()] || 'file';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0 || !bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


// --- INACTIVITY TIMER & APP INITIALIZATION ---

// INACTIVITY TIMER FOR AUTO-LOGOUT (ENHANCED) ---
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


// --- CORE APP LOGIC (API, AUTH, LOGOUT) ---

// **THIS IS THE CORRECTED API CALL FUNCTION**
async function apiCall(endpoint, method = 'GET', body = null, isFileUpload = false) {
    const token = localStorage.getItem('jwtToken');
    const options = {
        method,
        headers: {}, // Start with empty headers
    };

    // Only add the Authorization header if a token actually exists
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFileUpload && body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    } else if (isFileUpload && body) {
        options.body = body; // FormData for file uploads
    }

    try {
        console.log(`API Call: ${method} ${BACKEND_URL}${endpoint}`);
        const response = await fetch(`${BACKEND_URL}${endpoint}`, options);

        let responseData;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // Handle non-JSON responses gracefully
            const textResponse = await response.text();
            throw new Error(`Received non-JSON response: ${textResponse}`);
        }

        console.log(`API Response: ${response.status}`, responseData);

        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        console.error('API call error:', error);
        const errorMessage = error.name === 'TypeError' ? 'Network error: Could not connect to server.' : error.message;
        showNotification(errorMessage, 'error');
        throw new Error(errorMessage);
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
