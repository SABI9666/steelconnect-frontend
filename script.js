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

// Google OAuth Client ID - replace with your actual Google Client ID
const GOOGLE_CLIENT_ID = window.GOOGLE_CLIENT_ID || '453964978221-v6q3scndk3b8je38ueirovsqa28nu5pv.apps.googleusercontent.com';

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
    communityPosts: [],
    communityPage: 1,
    communityHasMore: true,
    newPostImages: [],
    newPostImageFiles: [],
    messageAttachments: [],
    trackingProjects: [],
};

// === BUSINESS ANALYTICS STATE ===
// Business analytics state removed - clients view approved dashboards only (no uploads)


// Professional Features Header Data
const headerFeatures = [
    {
        icon: 'fa-calculator',
        title: 'AI Cost Estimation',
        subtitle: 'Advanced algorithms for precise cost analysis',
        description: 'Upload your drawings and get instant, accurate estimates powered by machine learning',
        gradient: 'linear-gradient(135deg, #4338ca 0%, #7c3aed 100%)'
    },
    {
        icon: 'fa-drafting-compass',
        title: 'Expert Engineering',
        subtitle: 'Connect with certified professionals',
        description: 'Access a network of qualified structural engineers and designers worldwide',
        gradient: 'linear-gradient(135deg, #a855f7 0%, #f43f5e 100%)'
    },
    {
        icon: 'fa-comments',
        title: 'Real-time Collaboration',
        subtitle: 'Seamless project communication',
        description: 'Built-in messaging system for efficient project coordination and updates',
        gradient: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)'
    },
    {
        icon: 'fa-shield-alt',
        title: 'Secure & Reliable',
        subtitle: 'Enterprise-grade security',
        description: 'Your project data is protected with bank-level encryption and security',
        gradient: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)'
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
        // Auto-open register modal if URL has ?action=register (from invite email)
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'register') {
            showAuthModal('register');
        }
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
        // Fade out, swap content, fade in - prevents layout jitter
        headerElement.style.transition = 'opacity 0.3s ease';
        headerElement.style.opacity = '0';
        setTimeout(() => {
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
            headerElement.style.opacity = '1';
        }, 300);
    }
}

// Optimized API call function with better error handling
async function apiCall(endpoint, method, body = null, successMessage = null) {
    const controller = new AbortController();
    // Use longer timeout for file uploads (FormData), shorter for regular API calls
    const isFileUpload = body instanceof FormData;
    const timeout = isFileUpload ? 120000 : 30000; // 2 min for file uploads, 30s for rest
    const timeoutId = setTimeout(() => controller.abort(), timeout);

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
        } else {
            console.error(`API call to ${endpoint} failed:`, error);
            showNotification(error.message, 'error');
        }

        throw error;
    }
}


async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;

    // Validate Terms & Conditions checkbox
    const termsCheckbox = form.termsAccepted;
    const termsError = document.getElementById('terms-error');
    if (!termsCheckbox || !termsCheckbox.checked) {
        if (termsError) {
            termsError.style.display = 'flex';
            termsError.classList.add('terms-error-shake');
            setTimeout(() => termsError.classList.remove('terms-error-shake'), 600);
        }
        const termsGroup = form.querySelector('.terms-checkbox-group');
        if (termsGroup) termsGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }
    if (termsError) termsError.style.display = 'none';

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Creating Account...';
    submitBtn.disabled = true;

    const userData = {
        name: form.regName.value,
        email: form.regEmail.value,
        password: form.regPassword.value,
        type: form.regRole.value,
        termsAccepted: true,
    };
    try {
        await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.');
        renderAuthForm('login');
    } catch (error) {
        const errorMsg = error.message || 'Registration failed. Please try again.';
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${errorMsg}</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        } else {
            showNotification(errorMsg, 'error');
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// --- GOOGLE SIGN-IN ---
// Track pending Google credential for role-selection step
let pendingGoogleCredential = null;

function initGoogleSignIn(buttonId, context) {
    if (typeof google === 'undefined' || !google.accounts) {
        console.warn('Google Identity Services not loaded');
        return;
    }
    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleCallback(response, context),
        auto_select: false,
        cancel_on_tap_outside: true
    });
    const btnEl = document.getElementById(buttonId);
    if (btnEl) {
        // Attach a manual click handler that triggers Google One Tap prompt
        btnEl.addEventListener('click', (e) => {
            e.preventDefault();
            // For register context, validate role & T&C first
            if (context === 'register') {
                const roleSelect = document.querySelector('[name="regRole"]');
                const termsCheckbox = document.querySelector('[name="termsAccepted"]');
                const termsError = document.getElementById('terms-error');
                if (!roleSelect || !roleSelect.value) {
                    showNotification('Please select your role (Contractor or Designer) before continuing with Google.', 'warning');
                    if (roleSelect) roleSelect.focus();
                    return;
                }
                if (!termsCheckbox || !termsCheckbox.checked) {
                    if (termsError) {
                        termsError.style.display = 'flex';
                        termsError.classList.add('terms-error-shake');
                        setTimeout(() => termsError.classList.remove('terms-error-shake'), 600);
                    }
                    showNotification('Please accept the Terms & Conditions to continue.', 'warning');
                    return;
                }
                if (termsError) termsError.style.display = 'none';
            }
            google.accounts.id.prompt();
        });
    }
}

async function handleGoogleCallback(response, context) {
    if (!response || !response.credential) {
        showNotification('Google Sign-In was cancelled or failed.', 'error');
        return;
    }

    const credential = response.credential;

    // Gather role & terms from register form if available
    let type = null;
    let termsAccepted = false;

    if (context === 'register') {
        const roleSelect = document.querySelector('[name="regRole"]');
        const termsCheckbox = document.querySelector('[name="termsAccepted"]');
        type = roleSelect ? roleSelect.value : null;
        termsAccepted = termsCheckbox ? termsCheckbox.checked : false;
    }

    // For login context, first try without role/terms (existing user)
    // If backend says requiresRegistration, show role selection step
    try {
        const payload = { credential };
        if (type) payload.type = type;
        if (termsAccepted) payload.termsAccepted = termsAccepted;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(BACKEND_URL + '/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (!res.ok) {
            if (data.requiresRegistration) {
                // New user from login page - show Google role selection step
                pendingGoogleCredential = credential;
                renderAuthForm('google-role-select');
                return;
            }
            throw new Error(data.message || 'Google authentication failed');
        }

        // Success - complete login
        completeLogin(data);
    } catch (error) {
        let errorMsg = error.message || 'Google authentication failed. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout. Please check your connection and try again.';
        }
        showNotification(errorMsg, 'error');
    }
}

async function handleGoogleRoleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const type = form.googleRole.value;
    const termsCheckbox = form.googleTermsAccepted;
    const termsError = document.getElementById('google-terms-error');

    if (!type) {
        showNotification('Please select your role.', 'warning');
        return;
    }
    if (!termsCheckbox || !termsCheckbox.checked) {
        if (termsError) {
            termsError.style.display = 'flex';
            termsError.classList.add('terms-error-shake');
            setTimeout(() => termsError.classList.remove('terms-error-shake'), 600);
        }
        return;
    }
    if (termsError) termsError.style.display = 'none';

    if (!pendingGoogleCredential) {
        showNotification('Google session expired. Please try again.', 'error');
        renderAuthForm('login');
        return;
    }

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Creating Account...';
    submitBtn.disabled = true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(BACKEND_URL + '/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                credential: pendingGoogleCredential,
                type: type,
                termsAccepted: true
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Google registration failed');
        }

        pendingGoogleCredential = null;
        completeLogin(data);
    } catch (error) {
        let errorMsg = error.message || 'Registration failed. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout. Please check your connection and try again.';
        }
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="auth-inline-error"><i class="fas fa-exclamation-circle"></i><span>${errorMsg}</span><button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button></div>`;
        } else {
            showNotification(errorMsg, 'error');
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Optimized handleLogin
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Signing in...';
    submitBtn.disabled = true;

    const authData = {
         email: form.loginEmail.value,
         password: form.loginPassword.value
     };

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(BACKEND_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();

        // Check if 2FA is required
        if (data.requires2FA) {
            window._otpEmail = data.email;
            window._otpLoginType = 'user';
            renderAuthForm('otp-verify');
            return;
        }

        // Direct login (fallback if 2FA not enabled)
        completeLogin(data);

    } catch (error) {
        let errorMsg = error.message || 'Login failed. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Login timeout. Please check your connection and try again.';
        }
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${errorMsg}</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        } else {
            showNotification(errorMsg, 'error');
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Complete login after OTP verification or direct login
function completeLogin(data) {
    appState.currentUser = data.user;
    appState.jwtToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    localStorage.setItem('jwtToken', data.token);
    closeModal();
    showAppView();
    setTimeout(() => {
        showNotification(`Welcome to SteelConnect, ${data.user.name}!`, 'success');
    }, 600);
}

// Handle OTP verification
async function handleOTPVerify(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const otpCode = form.otpCode.value.trim();
    const email = window._otpEmail || '';
    const loginType = window._otpLoginType || 'user';

    if (!otpCode || otpCode.length !== 6) {
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="auth-inline-error"><i class="fas fa-exclamation-circle"></i><span>Please enter the 6-digit code</span><button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button></div>`;
        }
        return;
    }

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Verifying...';
    submitBtn.disabled = true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(BACKEND_URL + '/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp: otpCode, loginType }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Verification failed');
        }

        // OTP verified - complete login
        window._otpEmail = '';
        window._otpLoginType = '';
        completeLogin(data);

    } catch (error) {
        let errorMsg = error.message || 'Verification failed. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout. Please check your connection.';
        }
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `<div class="auth-inline-error"><i class="fas fa-exclamation-circle"></i><span>${errorMsg}</span><button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button></div>`;
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Resend OTP code
async function resendOTP() {
    const email = window._otpEmail || '';
    const loginType = window._otpLoginType || 'user';
    if (!email) return;

    try {
        const response = await fetch(BACKEND_URL + '/auth/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, loginType })
        });
        const data = await response.json();
        const successContainer = document.getElementById('auth-success-container');
        if (successContainer) {
            successContainer.innerHTML = `<div class="auth-inline-success"><i class="fas fa-check-circle"></i><span>${data.message || 'New code sent!'}</span></div>`;
            setTimeout(() => { successContainer.innerHTML = ''; }, 5000);
        }
    } catch (error) {
        showNotification('Failed to resend code.', 'error');
    }
}


// ========================================
// FORGOT / RESET PASSWORD HANDLERS
// ========================================

async function handleForgotPassword(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Sending...';
    submitBtn.disabled = true;

    const email = form.resetEmail.value.trim();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(BACKEND_URL + '/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send reset code');
        }

        // Store email for reset form
        window._resetEmail = email;

        // Show success message
        const successContainer = document.getElementById('auth-success-container');
        if (successContainer) {
            successContainer.innerHTML = `
                <div class="auth-inline-success">
                    <i class="fas fa-check-circle"></i>
                    <span>Reset code sent! Check your email inbox.</span>
                </div>`;
        }

        // Auto-navigate to reset password form after a brief delay
        setTimeout(() => {
            renderAuthForm('reset-password');
        }, 2000);

    } catch (error) {
        let errorMsg = error.message || 'Failed to send reset code. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout. Please check your connection and try again.';
        }
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${errorMsg}</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    const email = form.resetEmail.value.trim();
    const code = form.resetCode.value.trim();
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Passwords do not match</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        }
        return;
    }

    if (newPassword.length < 6) {
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>Password must be at least 6 characters</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        }
        return;
    }

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Resetting...';
    submitBtn.disabled = true;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(BACKEND_URL + '/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPassword }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to reset password');
        }

        // Show success
        const successContainer = document.getElementById('auth-success-container');
        if (successContainer) {
            successContainer.innerHTML = `
                <div class="auth-inline-success">
                    <i class="fas fa-check-circle"></i>
                    <span>Password reset successful! Redirecting to login...</span>
                </div>`;
        }

        // Clear stored email
        window._resetEmail = '';

        // Redirect to login
        setTimeout(() => {
            renderAuthForm('login');
        }, 2000);

    } catch (error) {
        let errorMsg = error.message || 'Failed to reset password. Please try again.';
        if (error.name === 'AbortError') {
            errorMsg = 'Request timeout. Please check your connection and try again.';
        }
        const errorContainer = document.getElementById('auth-error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="auth-inline-error">
                    <i class="fas fa-exclamation-circle"></i>
                    <span>${errorMsg}</span>
                    <button class="auth-error-dismiss" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>`;
        }
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
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
            // Process notifications and ensure proper timestamps
            const processedNotifications = serverNotifications.map(notification => ({
                ...notification,
                createdAt: notification.createdAt || new Date().toISOString(),
                updatedAt: notification.updatedAt || notification.createdAt || new Date().toISOString(),
                // Ensure boolean values
                isRead: Boolean(notification.isRead || notification.read),
                read: Boolean(notification.isRead || notification.read),
                seen: Boolean(notification.seen)
            }));
            notificationState.notifications = processedNotifications;
            appState.notifications = processedNotifications;
            notificationState.unreadCount = response.unreadCount || 0;
            notificationState.unseenCount = response.unseenCount || 0;
            notificationState.lastFetchTime = new Date();
            saveNotificationsToStorage();
            renderNotificationPanel();
            updateNotificationBadge();
            console.log(`📬 Fetched ${processedNotifications.length} notifications`);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
        // Load from storage if server fetch fails
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
        user: 'fa-user', file: 'fa-paperclip', support: 'fa-life-ring'
    };
    return iconMap[type] || 'fa-info-circle';
}

function getNotificationColor(type) {
    const colorMap = {
        info: '#3b82f6', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
        message: '#8b5cf6', job: '#06b6d4', quote: '#f97316', estimation: '#84cc16',
        profile: '#6366f1', user: '#64748b', file: '#94a3b8', support: '#d946ef'
    };
    return colorMap[type] || '#6b7280';
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    if (!panelList) return;
    const notifications = notificationState.notifications || [];
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
                        // Safely handle metadata
                        let metadataString = '{}';
                        try {
                            metadataString = JSON.stringify(n.metadata || {}).replace(/"/g, '&quot;');
                        } catch (e) {
                            console.warn('Error stringifying notification metadata:', e);
                        }
                        return `
                            <div class="notification-item ${n.isRead || n.read ? 'read' : 'unread'}"
                                  data-id="${n.id}"
                                  onclick="handleNotificationClick('${n.id}', '${n.type}', ${metadataString})">
                                <div class="notification-item-icon" style="background-color: ${color}20; color: ${color}">
                                    <i class="fas ${icon}"></i>
                                </div>
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
        panelList.innerHTML = `
            <div class="notification-error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading notifications</p>
                <button onclick="fetchNotifications()" class="btn btn-sm btn-outline">Retry</button>
            </div>`;
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
            if (metadata?.conversationId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderConversationView('${metadata.conversationId}')"><i class="fas fa-reply"></i> Reply</button>`;
            } else if (metadata?.jobId && metadata?.senderId) {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata.jobId}', '${metadata.senderId}')"><i class="fas fa-reply"></i> Reply</button>`;
            } else {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('messages')"><i class="fas fa-comments"></i> View Messages</button>`;
            }
            break;
        case 'quote':
            if (metadata?.action === 'quote_submitted' && appState.currentUser?.type === 'contractor') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); viewQuotes('${metadata?.jobId}')"><i class="fas fa-eye"></i> View Quote</button>`;
            } else if (metadata?.action === 'quote_approved' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); openConversation('${metadata?.jobId}', '${metadata?.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`;
            } else {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('my-quotes')"><i class="fas fa-file-invoice-dollar"></i> View Quotes</button>`;
            }
            break;
        case 'job':
            if (metadata?.action === 'job_created' && appState.currentUser?.type === 'designer') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('jobs')"><i class="fas fa-search"></i> View Jobs</button>`;
            }
            break;
        case 'estimation':
            if (metadata?.action === 'estimation_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('my-estimations')"><i class="fas fa-download"></i> View Result</button>`;
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
        case 'business_analytics':
            if (metadata?.action === 'analytics_completed') {
                buttons = `<button class="notification-action-btn" onclick="event.stopPropagation(); renderAppSection('ai-analytics')"><i class="fas fa-chart-line"></i> View Report</button>`;
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
        case 'business_analytics':
            renderAppSection('ai-analytics');
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
        const response = await apiCall(`/estimation/contractor/${encodeURIComponent(appState.currentUser.email)}`, 'GET');
        appState.myEstimations = response.estimations || response.data || [];
        console.log(`Loaded ${appState.myEstimations.length} estimations for ${appState.currentUser.email}`);
    } catch (error) {
        console.error('Error loading user estimations:', error);
        showNotification('Could not load estimations. Please try again.', 'error');
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
        const isCompleted = est.status === 'completed';
        const hasManualResult = est.resultFile;
        const hasAIReport = est.aiEstimate && (est.resultType === 'ai-report' || isCompleted);
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
                    ${isCompleted && hasAIReport ? `<button class="btn btn-success btn-sm" onclick="viewMyAIReport('${est._id}')"><i class="fas fa-robot"></i> View AI Report</button>` : ''}
                    ${isCompleted && hasManualResult ? `<button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${est._id}')"><i class="fas fa-download"></i> Download Result</button>` : ''}
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
    const d = parseDate(date);
    if (!d) return 'Unknown date';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
    const el = document.getElementById('estimations-list');
    if (!el) return;
    el.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-calculator"></i></div><h3>Start Your First AI Estimation</h3><p>Upload your project drawings to get accurate cost estimates from our AI-powered system.</p><button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')"><i class="fas fa-rocket"></i> Create First Estimation</button></div>`;
}

function showEstimatesError() {
    const el = document.getElementById('estimations-list');
    if (!el) return;
    el.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Unable to Load Estimations</h3><p>We're having trouble loading your requests. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()"><i class="fas fa-redo"></i> Try Again</button></div>`;
}

function viewMyAIReport(estimationId) {
    const estimation = appState.myEstimations.find(e => e._id === estimationId);
    if (!estimation || !estimation.aiEstimate) { showNotification('AI report not available.', 'error'); return; }
    renderAIEstimateResult(estimation.aiEstimate, { projectTitle: estimation.projectTitle, description: estimation.description });
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
function escapeAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function downloadFileDirect(url, filename) {
    try {
        if (!url) {
            throw new Error('Download URL not provided');
        }
        // Ensure URL is properly encoded (handle spaces and special chars)
        let safeUrl = url;
        try {
            const urlObj = new URL(url);
            safeUrl = urlObj.href;
        } catch (_) {
            // If URL parsing fails, try encoding the path portion
            safeUrl = encodeURI(url);
        }
        showNotification('Preparing download...', 'info');
        const response = await fetch(safeUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${appState.jwtToken}`
            }
        });
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('File not found on server. It may have been moved or deleted.');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'download';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
        showNotification('Download started successfully', 'success');
    } catch (error) {
        console.error('Download error:', error);
        // Fallback: Try opening in new tab
        if (url) {
            try {
                const newTab = window.open(url, '_blank');
                if (newTab) {
                    showNotification('Opening file in new tab...', 'info');
                } else {
                    showNotification(`Download failed: ${error.message}`, 'error');
                }
            } catch (fallbackError) {
                showNotification(`Download failed: ${error.message}`, 'error');
            }
        } else {
            showNotification(`Download failed: ${error.message}`, 'error');
        }
    }
}

async function downloadWithRetry(apiCall, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await apiCall();
            if (response.success && response.downloadUrl) {
                return response;
            }
            throw new Error(response.message || 'Download URL not available');
        } catch (error) {
            lastError = error;
            console.log(`Download attempt ${i + 1} failed:`, error.message);
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    throw lastError;
}

async function downloadEstimationResult(estimationId) {
    try {
        showNotification('Preparing your download...', 'info');

        const response = await downloadWithRetry(() =>
             apiCall(`/estimation/${estimationId}/result/download`, 'GET')
        );

        if (response.downloadUrl) {
            // Ensure URL is absolute
            let downloadUrl = response.downloadUrl;
            if (!downloadUrl.startsWith('http')) {
                downloadUrl = `${BACKEND_URL}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
            }

            downloadFileDirect(downloadUrl, response.filename || 'estimation_result.pdf');
        }
    } catch (error) {
        console.error('Download error:', error);
        showNotification(`Download failed: ${error.message}. Please try again.`, 'error');
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
                    files.map((file, index) => `
                        <div class="file-item">
                            <div class="file-info">
                                <i class="fas fa-file-pdf"></i>
                                <div class="file-details">
                                    <h4>${file.name}</h4>
                                    <span class="file-date">Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <button class="btn btn-outline btn-sm" onclick="downloadEstFileByIndex('${escapeAttr(estimationId)}', ${index}, '${escapeAttr(file.name)}')">
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

async function downloadEstFileByIndex(estimationId, fileIndex, fileName) {
    try {
        showNotification('Preparing download...', 'info');
        const response = await apiCall(`/estimation/${estimationId}/files/${fileIndex}/download`, 'GET');
        if (response.downloadUrl) {
            downloadFileDirect(response.downloadUrl, fileName || response.filename || 'file.pdf');
        } else {
            showNotification('Could not generate download link.', 'error');
        }
    } catch (error) {
        showNotification('Download failed: ' + (error.message || 'Please try again.'), 'error');
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
    const maxSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
        showNotification(`Some files exceed 50MB limit: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
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
                <small class="form-help">Optional. Up to 5 files, 50MB each. Supported: PDF, DOC, DOCX, JPG, PNG, DWG, XLS, XLSX, TXT</small>
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
                    <small class="form-help">Optional. Add up to 5 additional files, 50MB each.</small>
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
    const maxSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
        showNotification(`Some files exceed 50MB limit: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
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

async function downloadQuoteAttachment(quoteId, attachmentIndex, filename) {
    if (typeof attachmentIndex === 'undefined' || attachmentIndex === null) {
        console.error('Download aborted: attachmentIndex is undefined.');
        showNotification('Cannot download file: Invalid attachment data.', 'error');
        return;
    }

    try {
        showNotification('Preparing download...', 'info');

        const response = await downloadWithRetry(() =>
             apiCall(`/quotes/${quoteId}/attachments/${attachmentIndex}/download`, 'GET')
        );

        if (response.downloadUrl) {
            let downloadUrl = response.downloadUrl;
            if (!downloadUrl.startsWith('http')) {
                downloadUrl = `${BACKEND_URL}${downloadUrl.startsWith('/') ? '' : '/'}${downloadUrl}`;
            }

            downloadFileDirect(downloadUrl, filename || response.filename);
        }
    } catch (error) {
        console.error('Quote attachment download error:', error);
        showNotification(`Download failed: ${error.message}. Please try again.`, 'error');
    }
}

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
                        `<div class="empty-state"><i class="fas fa-file"></i><p>No files found.</p></div>` :
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
                                    <button class="btn btn-primary btn-sm" onclick="downloadQuoteAttachment('${quoteId}', ${attachment.index}, '${escapeAttr(attachment.name)}')">
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

async function downloadAllAttachments(quoteId) {
    try {
        showNotification('Preparing to download all files...', 'info');

        const response = await apiCall(`/quotes/${quoteId}/attachments`, 'GET');
        if (!response.success || !response.attachments) {
            throw new Error('Could not retrieve attachment list.');
        }

        const attachmentsList = response.attachments;
        if (attachmentsList.length === 0) {
            showNotification('No attachments to download.', 'info');
            return;
        }

        const maxConcurrent = 2;

        for (let i = 0; i < attachmentsList.length; i += maxConcurrent) {
            const batch = attachmentsList.slice(i, i + maxConcurrent);

            await Promise.all(batch.map((attachment, batchIndex) =>
                new Promise(resolve => {
                    setTimeout(() => {
                        downloadQuoteAttachment(quoteId, attachment.index, attachment.name)
                            .finally(resolve);
                    }, batchIndex * 500);
                })
            ));

            if (i + maxConcurrent < attachmentsList.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        showNotification(`Downloaded ${attachmentsList.length} files successfully`, 'success');
    } catch (error) {
        console.error('Error downloading all attachments:', error);
        showNotification(`Failed to download all files: ${error.message}`, 'error');
    }
}


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
            for (const quote of quotes) {
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

                // Build designer profile - use enriched data or placeholder for lazy load
                const dp = quote.designerProfile || {};
                const designerProfileSection = buildDesignerProfileHTML(dp, quote.designerName, quote.designerId);

                quotesHTML += `
                    <div class="quote-item premium-quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info">
                                <div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div>
                                <div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
                            </div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        ${designerProfileSection}
                        <div class="quote-details">
                            ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                            <div class="quote-description"><p>${quote.description}</p></div>
                            ${attachmentSection}
                        </div>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            }
            quotesHTML += `</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');

        // After rendering, lazy-load designer profiles that weren't enriched by the backend
        quotes.forEach(quote => {
            if (!quote.designerProfile || (!quote.designerProfile.skills?.length && !quote.designerProfile.bio && !quote.designerProfile.experience)) {
                loadDesignerProfileIntoCard(quote.designerId, quote.designerName);
            }
        });
    } catch (error) {
        console.error('Error viewing quotes:', error);
        showGenericModal(`<div class="modal-header premium-modal-header"><h3><i class="fas fa-exclamation-triangle"></i> Error</h3></div><div class="error-state premium-error"><p>Could not load quotes. Please try again.</p><button class="btn btn-primary" onclick="closeModal()">Close</button></div>`);
    }
}

function buildDesignerProfileHTML(dp, designerName, designerId) {
    const hasDetailedProfile = dp.skills?.length > 0 || dp.experience || dp.bio || dp.education || dp.hourlyRate || dp.linkedinProfile || dp.specializations?.length > 0 || dp.resume;
    const skillsHTML = dp.skills && dp.skills.length > 0
        ? `<div class="dp-skills">${dp.skills.slice(0, 8).map(s => `<span class="dp-skill-tag">${s}</span>`).join('')}${dp.skills.length > 8 ? `<span class="dp-skill-more">+${dp.skills.length - 8} more</span>` : ''}</div>` : '';
    const specsHTML = dp.specializations && dp.specializations.length > 0
        ? `<div class="dp-specs"><i class="fas fa-star"></i> <strong>Specializations:</strong> ${dp.specializations.join(', ')}</div>` : '';
    const resumeHTML = dp.resume && dp.resume.url
        ? `<div class="dp-resume"><a href="${dp.resume.url}" target="_blank" class="dp-resume-link"><i class="fas fa-file-pdf"></i> <span>View Resume</span> <small>(${dp.resume.filename || 'Resume'})</small></a></div>` : '';
    const certsHTML = dp.certificates && dp.certificates.length > 0
        ? `<div class="dp-certs"><span class="dp-certs-label"><i class="fas fa-certificate"></i> Certificates (${dp.certificates.length}):</span>${dp.certificates.map(c => `<a href="${c.url || '#'}" target="_blank" class="dp-cert-link">${c.filename || 'Certificate'}</a>`).join('')}</div>` : '';

    const profileBodyContent = hasDetailedProfile ? `
        ${dp.bio ? `<div class="dp-bio"><p>${dp.bio}</p></div>` : ''}
        <div class="dp-details-grid">
            ${dp.experience ? `<div class="dp-detail"><i class="fas fa-briefcase"></i><div><span class="dp-detail-label">Experience</span><span class="dp-detail-value">${dp.experience}</span></div></div>` : ''}
            ${dp.education ? `<div class="dp-detail"><i class="fas fa-graduation-cap"></i><div><span class="dp-detail-label">Education</span><span class="dp-detail-value">${dp.education}</span></div></div>` : ''}
            ${dp.hourlyRate ? `<div class="dp-detail"><i class="fas fa-dollar-sign"></i><div><span class="dp-detail-label">Hourly Rate</span><span class="dp-detail-value">$${dp.hourlyRate}/hr</span></div></div>` : ''}
            ${dp.email ? `<div class="dp-detail"><i class="fas fa-envelope"></i><div><span class="dp-detail-label">Email</span><span class="dp-detail-value">${dp.email}</span></div></div>` : ''}
            ${dp.linkedinProfile ? `<div class="dp-detail"><i class="fab fa-linkedin"></i><div><span class="dp-detail-label">LinkedIn</span><a href="${dp.linkedinProfile}" target="_blank" class="dp-detail-link">View Profile</a></div></div>` : ''}
            ${dp.profileStatus ? `<div class="dp-detail"><i class="fas fa-shield-alt"></i><div><span class="dp-detail-label">Profile Status</span><span class="dp-detail-value dp-status-${dp.profileStatus}">${dp.profileStatus.charAt(0).toUpperCase() + dp.profileStatus.slice(1)}</span></div></div>` : ''}
        </div>
        ${skillsHTML}
        ${specsHTML}
        ${resumeHTML}
        ${certsHTML}
    ` : `<div class="dp-loading" id="dp-loading-${designerId}"><div class="spinner" style="width:20px;height:20px;border-width:2px;"></div> <span>Loading profile...</span></div>`;

    return `
        <div class="designer-profile-card expanded" id="dp-card-${designerId}">
            <div class="dp-header" onclick="this.parentElement.classList.toggle('expanded')">
                <div class="dp-header-left">
                    <i class="fas fa-user-circle"></i>
                    <span>Designer Profile - ${designerName}</span>
                </div>
                <i class="fas fa-chevron-down dp-toggle-icon"></i>
            </div>
            <div class="dp-body">
                ${profileBodyContent}
            </div>
        </div>`;
}

async function loadDesignerProfileIntoCard(designerId, designerName) {
    try {
        const response = await apiCall(`/quotes/designer-profile/${designerId}`, 'GET');
        if (response.success && response.data) {
            const dp = response.data;
            const card = document.getElementById(`dp-card-${designerId}`);
            if (card) {
                const bodyEl = card.querySelector('.dp-body');
                if (bodyEl) {
                    const hasDetailedData = dp.skills?.length > 0 || dp.experience || dp.bio || dp.education || dp.resume || dp.hourlyRate || dp.linkedinProfile || dp.specializations?.length > 0;
                    if (hasDetailedData) {
                        bodyEl.innerHTML = buildDesignerProfileBodyHTML(dp);
                    } else {
                        // Show basic info even without detailed profile
                        bodyEl.innerHTML = `
                            <div class="dp-basic-info">
                                <div class="dp-details-grid">
                                    ${dp.name ? `<div class="dp-detail"><i class="fas fa-user"></i><div><span class="dp-detail-label">Name</span><span class="dp-detail-value">${dp.name}</span></div></div>` : ''}
                                    ${dp.email ? `<div class="dp-detail"><i class="fas fa-envelope"></i><div><span class="dp-detail-label">Email</span><span class="dp-detail-value">${dp.email}</span></div></div>` : ''}
                                    ${dp.profileStatus ? `<div class="dp-detail"><i class="fas fa-shield-alt"></i><div><span class="dp-detail-label">Profile Status</span><span class="dp-detail-value dp-status-${dp.profileStatus}">${dp.profileStatus.charAt(0).toUpperCase() + dp.profileStatus.slice(1)}</span></div></div>` : ''}
                                </div>
                                <p class="dp-no-details" style="margin-top:10px;">Designer has not yet completed their detailed profile.</p>
                            </div>`;
                    }
                }
            }
        }
    } catch (error) {
        const loadingEl = document.getElementById(`dp-loading-${designerId}`);
        if (loadingEl) loadingEl.innerHTML = `<p class="dp-no-details">Could not load designer profile details.</p>`;
    }
}

function buildDesignerProfileBodyHTML(dp) {
    const skillsHTML = dp.skills && dp.skills.length > 0
        ? `<div class="dp-skills">${dp.skills.slice(0, 8).map(s => `<span class="dp-skill-tag">${s}</span>`).join('')}${dp.skills.length > 8 ? `<span class="dp-skill-more">+${dp.skills.length - 8} more</span>` : ''}</div>` : '';
    const specsHTML = dp.specializations && dp.specializations.length > 0
        ? `<div class="dp-specs"><i class="fas fa-star"></i> <strong>Specializations:</strong> ${dp.specializations.join(', ')}</div>` : '';
    const resumeHTML = dp.resume && dp.resume.url
        ? `<div class="dp-resume"><a href="${dp.resume.url}" target="_blank" class="dp-resume-link"><i class="fas fa-file-pdf"></i> <span>View Resume</span> <small>(${dp.resume.filename || 'Resume'})</small></a></div>` : '';
    const certsHTML = dp.certificates && dp.certificates.length > 0
        ? `<div class="dp-certs"><span class="dp-certs-label"><i class="fas fa-certificate"></i> Certificates (${dp.certificates.length}):</span>${dp.certificates.map(c => `<a href="${c.url || '#'}" target="_blank" class="dp-cert-link">${c.filename || 'Certificate'}</a>`).join('')}</div>` : '';
    return `
        ${dp.bio ? `<div class="dp-bio"><p>${dp.bio}</p></div>` : ''}
        <div class="dp-details-grid">
            ${dp.experience ? `<div class="dp-detail"><i class="fas fa-briefcase"></i><div><span class="dp-detail-label">Experience</span><span class="dp-detail-value">${dp.experience}</span></div></div>` : ''}
            ${dp.education ? `<div class="dp-detail"><i class="fas fa-graduation-cap"></i><div><span class="dp-detail-label">Education</span><span class="dp-detail-value">${dp.education}</span></div></div>` : ''}
            ${dp.hourlyRate ? `<div class="dp-detail"><i class="fas fa-dollar-sign"></i><div><span class="dp-detail-label">Hourly Rate</span><span class="dp-detail-value">$${dp.hourlyRate}/hr</span></div></div>` : ''}
            ${dp.email ? `<div class="dp-detail"><i class="fas fa-envelope"></i><div><span class="dp-detail-label">Email</span><span class="dp-detail-value">${dp.email}</span></div></div>` : ''}
            ${dp.linkedinProfile ? `<div class="dp-detail"><i class="fab fa-linkedin"></i><div><span class="dp-detail-label">LinkedIn</span><a href="${dp.linkedinProfile}" target="_blank" class="dp-detail-link">View Profile</a></div></div>` : ''}
            ${dp.profileStatus ? `<div class="dp-detail"><i class="fas fa-shield-alt"></i><div><span class="dp-detail-label">Profile Status</span><span class="dp-detail-value dp-status-${dp.profileStatus}">${dp.profileStatus.charAt(0).toUpperCase() + dp.profileStatus.slice(1)}</span></div></div>` : ''}
        </div>
        ${skillsHTML}
        ${specsHTML}
        ${resumeHTML}
        ${certsHTML}
    `;
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
    const time = parseDate(timestamp);
    if (!time) return 'Just now';
    const now = new Date();
    const diff = Math.floor((now - time) / (1000 * 60));
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[time.getMonth()]} ${time.getDate()}`;
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
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
            <div id="msg-file-preview" class="msg-file-preview" style="display:none"></div>
            <div class="chat-input-area premium-input-area"><form id="send-message-form" class="message-form premium-message-form"><div class="message-input-container"><input type="file" id="msg-file-input" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.zip" style="display:none"><button type="button" class="msg-attach-btn" title="Attach files (PDF, documents, images)" onclick="document.getElementById('msg-file-input').click()"><i class="fas fa-paperclip"></i></button><input type="text" id="message-text-input" placeholder="Type your message..." autocomplete="off"><button type="submit" class="send-button premium-send-btn" title="Send"><i class="fas fa-paper-plane"></i></button></div></form></div>
        </div>`;
    document.getElementById('send-message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(convo.id); });
    appState.messageAttachments = [];
    document.getElementById('msg-file-input').addEventListener('change', (e) => handleMessageFileSelect(e));
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
                const msgAttachments = (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) ? msg.attachments : [];
                const attachmentsHtml = msgAttachments.length > 0 ? `<div class="msg-attachments">${msgAttachments.map(att => {
                    const icon = getMsgFileIcon(att.name || att.type || '');
                    const size = att.size ? formatFileSize(att.size) : '';
                    const fileUrl = att.url || att.downloadURL || '#';
                    return `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="msg-attachment-item" ${fileUrl !== '#' ? 'download' : ''}><i class="fas ${icon}"></i><div class="msg-att-info"><span class="msg-att-name">${att.name || 'File'}</span>${size ? `<span class="msg-att-size">${size}</span>` : ''}</div><i class="fas fa-download msg-att-dl"></i></a>`;
                }).join('')}</div>` : '';
                const bubbleContent = (msg.text || '') + attachmentsHtml;
                messagesHTML += `
                    <div class="message-wrapper premium-message ${isMine ? 'me' : 'them'}">
                        ${!isMine && showAvatar ? `<div class="message-avatar premium-msg-avatar" style="background-color: ${senderAvatarColor}">${(msg.senderName || 'U').charAt(0).toUpperCase()}</div>` : '<div class="message-avatar-spacer"></div>'}
                        <div class="message-content">
                            ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName || 'N/A'}</div>` : ''}
                            <div class="message-bubble premium-bubble ${isMine ? 'me' : 'them'}">${bubbleContent || '<span class="msg-empty-placeholder">Message</span>'}</div>
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
    const files = appState.messageAttachments || [];
    if (!text && files.length === 0) return;
    const originalBtnContent = sendBtn.innerHTML;
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="btn-spinner"></div>';
    if (files.length > 0) {
        showNotification(`Uploading ${files.length} file(s)...`, 'info', 3000);
    }
    try {
        let response;
        if (files.length > 0) {
            // Use FormData for file uploads
            const formData = new FormData();
            if (text) formData.append('text', text);
            files.forEach(f => formData.append('attachments', f));
            response = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${appState.jwtToken}` },
                body: formData
            });
        } else {
            response = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${appState.jwtToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send message');
        if (data.success) {
            input.value = '';
            clearMessageAttachments();
            const msgContainer = document.getElementById('chat-messages-container');
            msgContainer.querySelector('.empty-messages')?.remove();
            const newMsg = data.data;
            const timestamp = formatDetailedTimestamp(newMsg.createdAt);
            const sentAttachments = (newMsg.attachments && Array.isArray(newMsg.attachments) && newMsg.attachments.length > 0) ? newMsg.attachments : [];
            const attHtml = sentAttachments.length > 0 ? `<div class="msg-attachments">${sentAttachments.map(att => {
                const icon = getMsgFileIcon(att.name || att.type || '');
                const size = att.size ? formatFileSize(att.size) : '';
                const fileUrl = att.url || att.downloadURL || '#';
                return `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="msg-attachment-item" ${fileUrl !== '#' ? 'download' : ''}><i class="fas ${icon}"></i><div class="msg-att-info"><span class="msg-att-name">${att.name || 'File'}</span>${size ? `<span class="msg-att-size">${size}</span>` : ''}</div><i class="fas fa-download msg-att-dl"></i></a>`;
            }).join('')}</div>` : '';
            const sentContent = (newMsg.text || '') + attHtml;
            const msgBubble = document.createElement('div');
            msgBubble.className = 'message-wrapper premium-message me';
            msgBubble.innerHTML = `<div class="message-avatar-spacer"></div><div class="message-content"><div class="message-bubble premium-bubble me">${sentContent || 'File sent'}</div><div class="message-meta">${timestamp}</div></div>`;
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


// --- MESSAGE FILE ATTACHMENT HELPERS ---
function handleMessageFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const maxSize = 25 * 1024 * 1024; // 25MB
    const maxFiles = 20;
    const current = appState.messageAttachments || [];
    if (current.length + files.length > maxFiles) {
        showNotification(`Maximum ${maxFiles} files allowed per message.`, 'warning');
        return;
    }
    for (const f of files) {
        if (f.size > maxSize) {
            showNotification(`"${f.name}" exceeds 25MB limit.`, 'error');
            return;
        }
    }
    appState.messageAttachments = [...current, ...files];
    renderMessageFilePreview();
    // Remove 'required' from text input since we have files
    const textInput = document.getElementById('message-text-input');
    if (textInput) textInput.removeAttribute('required');
}

function removeMessageAttachment(index) {
    appState.messageAttachments.splice(index, 1);
    renderMessageFilePreview();
    if (appState.messageAttachments.length === 0) {
        const textInput = document.getElementById('message-text-input');
        if (textInput && !textInput.value.trim()) textInput.setAttribute('required', '');
    }
}

function clearMessageAttachments() {
    appState.messageAttachments = [];
    const preview = document.getElementById('msg-file-preview');
    if (preview) { preview.style.display = 'none'; preview.innerHTML = ''; }
    const fileInput = document.getElementById('msg-file-input');
    if (fileInput) fileInput.value = '';
}

function renderMessageFilePreview() {
    const preview = document.getElementById('msg-file-preview');
    if (!preview) return;
    const files = appState.messageAttachments || [];
    if (files.length === 0) { preview.style.display = 'none'; preview.innerHTML = ''; return; }
    preview.style.display = 'flex';
    preview.innerHTML = files.map((f, i) => {
        const icon = getMsgFileIcon(f.name);
        const size = formatFileSize(f.size);
        return `<div class="msg-file-chip"><i class="fas ${icon}"></i><span class="msg-file-chip-name">${f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name}</span><span class="msg-file-chip-size">${size}</span><button type="button" class="msg-file-chip-remove" onclick="removeMessageAttachment(${i})"><i class="fas fa-times"></i></button></div>`;
    }).join('');
}

function getMsgFileIcon(nameOrType) {
    const ext = (nameOrType || '').toLowerCase().split('.').pop();
    const map = { 'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'txt': 'fa-file-alt', 'zip': 'fa-file-archive' };
    return map[ext] || 'fa-file';
}

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// --- UI & MODAL FUNCTIONS ---
function lockBodyScroll() {
    document.body.style.overflow = 'hidden';
}

function unlockBodyScroll() {
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
    if (view === 'login') {
        container.innerHTML = getLoginTemplate();
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else if (view === 'register') {
        container.innerHTML = getRegisterTemplate();
        document.getElementById('register-form').addEventListener('submit', handleRegister);
    } else if (view === 'forgot-password') {
        container.innerHTML = getForgotPasswordTemplate();
        document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
    } else if (view === 'reset-password') {
        container.innerHTML = getResetPasswordTemplate(window._resetEmail || '');
        document.getElementById('reset-password-form').addEventListener('submit', handleResetPassword);
    } else if (view === 'otp-verify') {
        container.innerHTML = getOTPVerifyTemplate();
        document.getElementById('otp-verify-form').addEventListener('submit', handleOTPVerify);
        // Auto-focus the OTP input
        const otpInput = document.querySelector('.otp-code-input');
        if (otpInput) setTimeout(() => otpInput.focus(), 100);
    } else if (view === 'google-role-select') {
        container.innerHTML = getGoogleRoleSelectTemplate();
        document.getElementById('google-role-form').addEventListener('submit', handleGoogleRoleSubmit);
    }

    // Initialize Google Sign-In buttons after rendering
    if (view === 'login') {
        setTimeout(() => initGoogleSignIn('google-login-btn', 'login'), 100);
    } else if (view === 'register') {
        setTimeout(() => initGoogleSignIn('google-register-btn', 'register'), 100);
    }
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
    const appContent = document.getElementById('app-content');
    // Prepare: show app-content off-screen so layout computes without visible shift
    appContent.classList.remove('app-ready');
    appContent.style.display = 'flex';

    // Batch all DOM changes before the user sees anything
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    // Show portal sidebar toggle, hide landing hamburger
    const portalMenuBtn = document.getElementById('portalMenuBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (portalMenuBtn) portalMenuBtn.style.display = '';
    if (mobileMenuBtn) mobileMenuBtn.style.display = 'none';
    // Restore sidebar visibility (it may have been hidden by showLandingPageView)
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = '';
    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    initializeNotificationSystem();

    // Let checkProfileAndRoute do its work, then fade in
    checkProfileAndRoute().then(() => {
        requestAnimationFrame(() => {
            appContent.classList.add('app-ready');
        });
    }).catch(() => {
        requestAnimationFrame(() => {
            appContent.classList.add('app-ready');
        });
    });
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
    const appContent = document.getElementById('app-content');
    appContent.classList.remove('app-ready');
    appContent.style.display = 'none';
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) { sidebar.style.display = 'none'; sidebar.classList.remove('sidebar-open'); }
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    // Show landing hamburger, hide portal menu button
    const portalMenuBtn = document.getElementById('portalMenuBtn');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (portalMenuBtn) portalMenuBtn.style.display = 'none';
    if (mobileMenuBtn) mobileMenuBtn.style.display = '';
    document.body.style.overflow = '';
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = `
        <a href="#ai-estimation" class="nav-link">AI Estimation</a><a href="#how-it-works" class="nav-link">How It Works</a>
        <a href="#why-steelconnect" class="nav-link">Why Choose Us</a><a href="#showcase" class="nav-link">Showcase</a>`;
}

// --- PROFILE & ROUTING FUNCTIONS ---

async function checkProfileAndRoute() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="loading-spinner" style="opacity:0.5"><div class="spinner"></div><p>Loading your dashboard...</p></div>`;
    try {
        const response = await apiCall('/profile/status', 'GET');
        const { profileStatus, canAccess, rejectionReason } = response.data;
        appState.currentUser.profileStatus = profileStatus;
        appState.currentUser.canAccess = canAccess;
        appState.currentUser.rejectionReason = rejectionReason;
        // Sync updated profile status to localStorage so page refreshes show correct state
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
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
    // Smooth scroll to top on section change
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
    if (!appState.currentUser) return;
    const profileStatus = appState.currentUser.profileStatus;
    const isApproved = profileStatus === 'approved';
    const restrictedSections = ['post-job', 'jobs', 'my-quotes', 'approved-jobs', 'estimation-tool', 'my-estimations', 'messages', 'ai-analytics', 'project-tracking', 'community-feed', 'quote-analysis'];
    if (restrictedSections.includes(sectionId) && !isApproved) {
        container.innerHTML = getRestrictedAccessTemplate(sectionId, profileStatus);
        return;
    }
    if (sectionId === 'profile-completion') { renderProfileCompletionView(); return; }
    if (sectionId === 'settings') { container.innerHTML = getSettingsTemplate(appState.currentUser); return; }
    if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        loadPortalAnnouncements();
        if (isApproved) { renderRecentActivityWidgets(); initDashboardCharts(); }
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
        appState.uploadedFile = null;
        appState._aiProjectInfo = {};
        container.innerHTML = getEstimationToolTemplate();
        setupEstimationToolEventListeners();
    } else if (sectionId === 'my-estimations') fetchAndRenderMyEstimations();
    else if (sectionId === 'support') {
        renderSupportSection();
    }
    else if (sectionId === 'subscription') {
        renderSubscriptionPage();
    }
    else if (sectionId === 'project-tracking') {
        renderProjectTrackingDashboard();
    }
    else if (sectionId === 'community-feed') {
        renderCommunityFeed();
    }
    else if (sectionId === 'ai-analytics' || sectionId === 'business-analytics') {
        // Premium AI Analytics dashboard - contractor uploads sheet, admin approves, contractor views dashboard
        if (typeof window.renderAnalyticsPortal === 'function') {
            window.renderAnalyticsPortal();
        } else if (typeof window.initializeAnalyticsIntegration === 'function') {
            window.initializeAnalyticsIntegration();
            if (typeof window.renderAnalyticsPortal === 'function') window.renderAnalyticsPortal();
        } else {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:60vh;flex-direction:column;gap:16px"><div class="spinner"></div><p>Loading Analytics Dashboard...</p></div>';
            setTimeout(() => renderAppSection(sectionId), 1500);
        }
    }
    else if (sectionId === 'quote-analysis') {
        renderQuoteAnalysisSection();
    }
}

function getRestrictedAccessTemplate(sectionId, profileStatus) {
    const sectionNames = { 'post-job': 'Post Projects', 'jobs': 'Browse Projects', 'my-quotes': 'My Quotes', 'approved-jobs': 'Approved Projects', 'estimation-tool': 'AI Estimation', 'my-estimations': 'My Estimations', 'messages': 'Messages', 'ai-analytics': 'Analytics Dashboard', 'project-tracking': 'Project Tracking', 'community-feed': 'Community Feed', 'quote-analysis': 'Quote Analysis' };
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
    appState.existingProfileData = null;
    try {
        // Fetch form fields AND existing profile data in parallel
        const [fieldsResponse, profileResponse] = await Promise.all([
            apiCall('/profile/form-fields', 'GET'),
            apiCall('/profile/data', 'GET').catch(() => null)
        ]);
        const { fields, userType } = fieldsResponse.data;
        const savedData = profileResponse?.data || {};
        appState.existingProfileData = savedData;
        const isResubmit = savedData.profileCompleted || savedData.profileStatus === 'pending' || savedData.profileStatus === 'rejected' || savedData.profileStatus === 'approved';

        const formFieldsHTML = fields.map(field => {
            // Get saved value for this field
            let savedValue = savedData[field.name] || '';
            if (Array.isArray(savedValue)) savedValue = savedValue.join(', ');
            if (savedValue && typeof savedValue === 'number') savedValue = savedValue.toString();

            if (field.type === 'textarea') {
                return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '<span style="color:red">*</span>' : ''}</label><textarea class="form-textarea premium-input" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}">${savedValue}</textarea></div>`;
            } else if (field.type === 'file') {
                // Check for existing uploaded files
                const existingFile = savedData[field.name];
                const hasExisting = field.name === 'resume' ? (existingFile && existingFile.filename) : (Array.isArray(existingFile) && existingFile.length > 0);
                const isRequired = field.required && !hasExisting;
                let existingHTML = '';
                if (field.name === 'resume' && existingFile && existingFile.filename) {
                    existingHTML = `<div class="existing-files-section" id="existing-${field.name}">
                        <div class="existing-file-item">
                            <div class="existing-file-info"><i class="fas fa-file-pdf"></i><div><span class="existing-file-name">${existingFile.filename}</span><span class="existing-file-meta">${existingFile.size ? formatFileSize(existingFile.size) : ''} ${existingFile.uploadedAt ? '• Uploaded ' + new Date(existingFile.uploadedAt).toLocaleDateString() : ''}</span></div></div>
                            <div class="existing-file-actions">
                                ${existingFile.url ? `<a href="${existingFile.url}" target="_blank" class="btn btn-outline btn-xs"><i class="fas fa-eye"></i> View</a>` : ''}
                                <button type="button" class="btn btn-danger btn-xs" onclick="deleteExistingProfileFile('resume')"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>
                        <p class="existing-file-hint"><i class="fas fa-info-circle"></i> Upload a new file to replace the existing one, or keep it.</p>
                    </div>`;
                } else if (field.name === 'certificates' && Array.isArray(existingFile) && existingFile.length > 0) {
                    existingHTML = `<div class="existing-files-section" id="existing-${field.name}">
                        ${existingFile.map((cert, idx) => `<div class="existing-file-item" id="existing-cert-${idx}">
                            <div class="existing-file-info"><i class="fas fa-certificate"></i><div><span class="existing-file-name">${cert.filename || 'Certificate ' + (idx + 1)}</span><span class="existing-file-meta">${cert.size ? formatFileSize(cert.size) : ''} ${cert.uploadedAt ? '• Uploaded ' + new Date(cert.uploadedAt).toLocaleDateString() : ''}</span></div></div>
                            <div class="existing-file-actions">
                                ${cert.url ? `<a href="${cert.url}" target="_blank" class="btn btn-outline btn-xs"><i class="fas fa-eye"></i> View</a>` : ''}
                                <button type="button" class="btn btn-danger btn-xs" onclick="deleteExistingProfileFile('certificate', ${idx})"><i class="fas fa-trash"></i> Delete</button>
                            </div>
                        </div>`).join('')}
                        <p class="existing-file-hint"><i class="fas fa-info-circle"></i> Upload new certificates to add more, or delete existing ones.</p>
                    </div>`;
                }
                return `<div class="form-group"><label class="form-label">${field.label} ${isRequired ? '<span style="color:red">*</span>' : ''} ${hasExisting ? '<span class="existing-badge">Current file on record</span>' : ''}</label>${existingHTML}<div class="custom-file-input-wrapper"><input type="file" name="${field.name}" data-field-name="${field.name}" onchange="handleProfileFileChange(event)" accept="${field.accept || ''}" ${field.multiple ? 'multiple' : ''} ${isRequired ? 'required' : ''}><div class="custom-file-input"><span class="custom-file-input-label"><i class="fas fa-upload"></i> <span id="label-${field.name}">${hasExisting ? 'Upload new file to replace' : 'Click to upload'}</span></span></div></div><div id="file-list-${field.name}" class="file-list-container"></div></div>`;
            } else if (field.type === 'select') {
                const options = (field.options || []).map(opt => `<option value="${opt}" ${savedValue === opt ? 'selected' : ''}>${opt}</option>`).join('');
                return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '*' : ''}</label><select name="${field.name}" class="form-select premium-select" ${field.required ? 'required' : ''}><option value="" disabled ${!savedValue ? 'selected' : ''}>Select...</option>${options}</select></div>`;
            } else {
                return `<div class="form-group"><label class="form-label">${field.label} ${field.required ? '*' : ''}</label><input type="${field.type}" class="form-input premium-input" name="${field.name}" ${field.required ? 'required' : ''} placeholder="${field.placeholder || ''}" value="${savedValue}"></div>`;
            }
        }).join('');

        const headerText = isResubmit ? 'Update Your Profile' : 'Complete Your Profile';
        const headerSubtext = isResubmit ? 'Update your profile information below. Your changes will be submitted for review.' : `We require all ${userType}s to complete their profile for review.`;
        const submitText = isResubmit ? 'Update & Resubmit for Review' : 'Submit for Review';
        const statusBanner = savedData.profileStatus && savedData.profileStatus !== 'incomplete' ? `<div class="profile-status-banner profile-status-${savedData.profileStatus}"><i class="fas ${savedData.profileStatus === 'approved' ? 'fa-check-circle' : savedData.profileStatus === 'rejected' ? 'fa-times-circle' : 'fa-clock'}"></i> Profile Status: <strong>${savedData.profileStatus.charAt(0).toUpperCase() + savedData.profileStatus.slice(1)}</strong>${savedData.rejectionReason ? ` — ${savedData.rejectionReason}` : ''}</div>` : '';

        container.innerHTML = `
            <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-user-check"></i> ${headerText}</h2><p class="header-subtitle">${headerSubtext}</p></div></div>
            ${statusBanner}
            <div class="profile-completion-container"><form id="profile-completion-form" class="profile-completion-form"><div class="form-section"><h3><i class="fas fa-user-circle"></i> Profile Information</h3><div class="profile-form-grid">${formFieldsHTML}</div></div><div class="form-actions" style="text-align:center;"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> ${submitText}</button></div></form></div>`;
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

async function deleteExistingProfileFile(type, index) {
    const confirmMsg = type === 'resume' ? 'Are you sure you want to delete your resume?' : 'Are you sure you want to delete this certificate?';
    if (!confirm(confirmMsg)) return;
    try {
        const endpoint = type === 'certificate' ? `/profile/attachment/certificate?index=${index}` : `/profile/attachment/resume`;
        console.log('Deleting profile attachment:', endpoint);
        const response = await apiCall(endpoint, 'DELETE');
        console.log('Delete response:', response);
        showNotification(`${type === 'resume' ? 'Resume' : 'Certificate'} deleted successfully`, 'success');
        if (type === 'resume') {
            const section = document.getElementById('existing-resume');
            if (section) section.remove();
            const resumeInput = document.querySelector('input[data-field-name="resume"]');
            if (resumeInput) resumeInput.setAttribute('required', 'true');
            const label = document.getElementById('label-resume');
            if (label) label.textContent = 'Click to upload';
            if (appState.existingProfileData) appState.existingProfileData.resume = null;
        } else {
            const certItem = document.getElementById(`existing-cert-${index}`);
            if (certItem) certItem.remove();
            if (appState.existingProfileData?.certificates) {
                appState.existingProfileData.certificates.splice(index, 1);
                if (appState.existingProfileData.certificates.length === 0) {
                    const section = document.getElementById('existing-certificates');
                    if (section) section.remove();
                }
            }
        }
    } catch (error) {
        console.error('Delete attachment error:', error);
    }
}

window.deleteExistingProfileFile = deleteExistingProfileFile;

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
// Global inline handler for file input onchange (most reliable - cannot be missed)
window._onEstFileChange = function(input) {
    console.log('[EST-FILE] onchange fired, files:', input.files?.length);
    try {
        if (input.files && input.files.length > 0) {
            handleFileSelect(input.files);
            input.value = '';
        }
    } catch (err) {
        console.error('[EST-FILE] Error in onchange:', err);
        alert('Error selecting files: ' + err.message);
    }
};

function setupEstimationToolEventListeners() {
    console.log('[EST-SETUP] Setting up estimation event listeners...');
    const uploadArea = document.getElementById('file-upload-area');

    if (uploadArea) {
        // File input is positioned as transparent overlay (same pattern as post-job uploads)
        // User clicks directly on the real input - no display:none, no label-for, no dynamic inputs
        // The onchange on the input calls handleFileSelect directly

        // Drag and drop on the upload area
        ['dragover', 'dragenter'].forEach(evt => {
            uploadArea.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.add('drag-over'); });
        });
        uploadArea.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); uploadArea.classList.remove('drag-over'); });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer && e.dataTransfer.files.length > 0) {
                console.log('[EST-DROP] Files dropped:', e.dataTransfer.files.length);
                handleFileSelect(e.dataTransfer.files);
            }
        });
    }

    // Prevent form submit on Enter key
    const form = document.getElementById('estimation-form');
    if (form) form.addEventListener('submit', (e) => e.preventDefault());

    // Submit button
    const submitBtn = document.getElementById('submit-estimation-btn');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleEstimationSubmit);
    }
    console.log('[EST-SETUP] Ready');
}

function handleFileSelect(files, isRerender) {
    try {
        console.log('[FILE-SELECT] Called with', files?.length, 'files, isRerender:', isRerender);
        const fileList = document.getElementById('selected-files-list');
        const submitBtn = document.getElementById('submit-estimation-btn');
        const fileInfoContainer = document.getElementById('file-info-container');
        const maxSize = 50 * 1024 * 1024; // 50MB

        if (!files || files.length === 0) {
            console.log('[FILE-SELECT] No files provided');
            return;
        }

        // Accumulate files: merge new files with existing ones
        let existing = [];
        if (!isRerender && appState.uploadedFile) {
            try { existing = Array.from(appState.uploadedFile); } catch (e) { existing = []; }
        }
        const newFiles = Array.from(files);

        // Validate individual file sizes
        const oversized = newFiles.filter(f => f.size > maxSize);
        if (oversized.length > 0) {
            showNotification('Some files exceed 50MB limit: ' + oversized.map(f => f.name).join(', '), 'error');
            return;
        }

        // Merge and deduplicate by name+size
        const merged = isRerender ? newFiles : [...existing];
        if (!isRerender) {
            newFiles.forEach(nf => {
                const dup = merged.find(ef => ef.name === nf.name && ef.size === nf.size);
                if (!dup) merged.push(nf);
            });
        }

        // Validate total file count
        if (merged.length > 20) {
            showNotification('Maximum 20 files allowed. Please remove some first.', 'warning');
            return;
        }

        // Store files - use DataTransfer if available, otherwise store as array
        try {
            const dt = new DataTransfer();
            merged.forEach(file => dt.items.add(file));
            appState.uploadedFile = dt.files;
        } catch (dtError) {
            console.warn('[FILE-SELECT] DataTransfer not available, using array fallback');
            appState.uploadedFile = merged;
        }

        console.log('[FILE-SELECT] Stored', merged.length, 'files in appState');

        // Render file list
        let filesHTML = '';
        let totalSize = 0;
        for (let i = 0; i < merged.length; i++) {
            const file = merged[i];
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            totalSize += file.size;
            const ext = file.name.split('.').pop().toLowerCase();
            const iconMap = { 'pdf': 'fa-file-pdf', 'dwg': 'fa-drafting-compass', 'dxf': 'fa-drafting-compass', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel', 'csv': 'fa-file-csv', 'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'tif': 'fa-file-image', 'tiff': 'fa-file-image', 'txt': 'fa-file-alt', 'zip': 'fa-file-archive', 'rar': 'fa-file-archive' };
            const icon = iconMap[ext] || 'fa-file';
            filesHTML += '<div class="selected-file-item"><div class="file-info"><i class="fas ' + icon + '"></i><div class="file-details"><span class="file-name">' + file.name + '</span><span class="file-size">' + fileSize + ' MB</span></div></div><button type="button" class="remove-file-btn" onclick="removeFile(' + i + ')"><i class="fas fa-times"></i></button></div>';
        }
        const totalMB = (totalSize / 1024 / 1024).toFixed(2);
        filesHTML += '<div class="selected-files-total"><strong>' + merged.length + ' file(s)</strong> &middot; Total: ' + totalMB + ' MB</div>';

        if (fileList) fileList.innerHTML = filesHTML;
        if (fileInfoContainer) fileInfoContainer.style.display = 'block';
        if (submitBtn) submitBtn.disabled = false;
        updateEstimationStep(2);
        if (!isRerender) showNotification(newFiles.length + ' file(s) added. Total: ' + merged.length + ' file(s) (' + totalMB + ' MB)', 'success');
        console.log('[FILE-SELECT] Rendered', merged.length, 'files successfully');
    } catch (error) {
        console.error('[FILE-SELECT] Error:', error);
        showNotification('Error processing files: ' + error.message, 'error');
    }
}

function getFileTypeIcon(mimeType, fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const types = { 'pdf': { icon: 'fa-file-pdf' }, 'dwg': { icon: 'fa-drafting-compass' }, 'dxf': { icon: 'fa-drafting-compass' }, 'doc': { icon: 'fa-file-word' }, 'docx': { icon: 'fa-file-word' }, 'xls': { icon: 'fa-file-excel' }, 'xlsx': { icon: 'fa-file-excel' }, 'csv': { icon: 'fa-file-csv' }, 'jpg': { icon: 'fa-file-image' }, 'jpeg': { icon: 'fa-file-image' }, 'png': { icon: 'fa-file-image' }, 'tif': { icon: 'fa-file-image' }, 'tiff': { icon: 'fa-file-image' }, 'txt': { icon: 'fa-file-alt' }, 'zip': { icon: 'fa-file-archive' }, 'rar': { icon: 'fa-file-archive' } };
    return types[ext] || { icon: 'fa-file' };
}

function updateEstimationStep(activeStep) {
    document.querySelectorAll('.est-steps-bar .est-step').forEach((step, index) => {
        const stepNum = index + 1;
        if (stepNum < activeStep) { step.classList.add('completed'); step.classList.remove('active'); }
        else if (stepNum === activeStep) { step.classList.add('active'); step.classList.remove('completed'); }
        else { step.classList.remove('completed'); step.classList.remove('active'); }
    });
    // Animate the connecting lines
    document.querySelectorAll('.est-step-line').forEach((line, index) => {
        if (index + 1 < activeStep) line.classList.add('completed'); else line.classList.remove('completed');
    });
}

function removeFile(index) {
    try {
        const filesArray = Array.from(appState.uploadedFile);
        filesArray.splice(index, 1);
        if (filesArray.length === 0) {
            appState.uploadedFile = null;
            document.getElementById('file-info-container').style.display = 'none';
            document.getElementById('submit-estimation-btn').disabled = true;
            updateEstimationStep(1);
            showNotification('All files removed', 'info');
        } else {
            try {
                const dt = new DataTransfer();
                filesArray.forEach(file => dt.items.add(file));
                appState.uploadedFile = dt.files;
            } catch (e) {
                appState.uploadedFile = filesArray;
            }
            handleFileSelect(filesArray, true);
            showNotification('File removed. ' + filesArray.length + ' file(s) remaining', 'info');
        }
    } catch (error) {
        console.error('[REMOVE-FILE] Error:', error);
    }
}

async function handleEstimationSubmit() {
    const form = document.getElementById('estimation-form');
    const submitBtn = document.getElementById('submit-estimation-btn');
    if (!appState.uploadedFile || appState.uploadedFile.length === 0) {
        showNotification('Please select at least one file (PDF, DWG, DOC, etc.)', 'warning');
        return;
    }
    // Verify files are still valid File objects
    let uploadedFiles;
    try {
        uploadedFiles = Array.from(appState.uploadedFile);
        const invalidFiles = uploadedFiles.filter(f => !(f instanceof File) || !f.size);
        if (invalidFiles.length > 0 || uploadedFiles.length === 0) {
            showNotification('Selected files are no longer valid. Please re-select your files.', 'error');
            appState.uploadedFile = null;
            const fileInfoContainer = document.getElementById('file-info-container');
            if (fileInfoContainer) fileInfoContainer.style.display = 'none';
            submitBtn.disabled = true;
            updateEstimationStep(1);
            return;
        }
    } catch (e) {
        showNotification('Error reading files. Please re-select your files.', 'error');
        appState.uploadedFile = null;
        return;
    }
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    const designStandard = form.designStandard ? form.designStandard.value : '';
    const projectType = form.projectType ? form.projectType.value : '';
    const region = form.region ? form.region.value.trim() : '';
    if (!projectTitle || !description) {
        showNotification('Please fill in Project Title and Description', 'warning');
        return;
    }
    if (submitBtn.disabled) return;
    updateEstimationStep(3);
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Uploading & Generating AI Estimate...';
    try {
        const formData = new FormData();
        formData.append('projectTitle', projectTitle);
        formData.append('description', description);
        formData.append('designStandard', designStandard);
        formData.append('projectType', projectType);
        formData.append('region', region);
        formData.append('contractorName', appState.currentUser.name || '');
        formData.append('contractorEmail', appState.currentUser.email || '');
        const fileNames = uploadedFiles.map(f => f.name);
        formData.append('fileNames', JSON.stringify(fileNames));
        uploadedFiles.forEach(file => formData.append('files', file));
        console.log('[EST-SUBMIT] Submitting', uploadedFiles.length, 'files, total size:', uploadedFiles.reduce((s, f) => s + f.size, 0), 'bytes');
        await apiCall('/estimation/contractor/submit', 'POST', formData, 'Estimation submitted successfully! AI estimate is being generated.');
        addLocalNotification('Submitted', `Estimation request for "${projectTitle}" submitted with AI analysis.`, 'estimation');
        form.reset();
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        updateEstimationStep(1);
        renderAppSection('my-estimations');
    } catch (error) {
        console.error('[EST-SUBMIT] Error:', error);
        showNotification('Upload failed: ' + (error.message || 'Please check your connection and try again.'), 'error');
        addLocalNotification('Error', 'Failed to submit estimation: ' + (error.message || 'Unknown error'), 'error');
        updateEstimationStep(2);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Estimation Request';
    }
}

// --- AI ESTIMATION FUNCTIONS ---
async function handleAIEstimate() {
    const form = document.getElementById('estimation-form');
    const aiBtn = document.getElementById('ai-estimate-btn');
    if (!appState.uploadedFile || appState.uploadedFile.length === 0) {
        showNotification('Please upload project files first (PDF, DWG, DOC, etc.)', 'warning');
        return;
    }
    // Validate files are still valid
    let filesArray;
    try {
        filesArray = Array.from(appState.uploadedFile);
        const validFiles = filesArray.filter(f => f instanceof File && f.size > 0);
        if (validFiles.length === 0) {
            showNotification('Selected files are no longer valid. Please re-select your files.', 'error');
            appState.uploadedFile = null;
            return;
        }
    } catch (e) {
        showNotification('Error reading files. Please re-select your files.', 'error');
        appState.uploadedFile = null;
        return;
    }
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    const designStandard = form.designStandard ? form.designStandard.value : '';
    const projectType = form.projectType ? form.projectType.value : '';
    const region = form.region ? form.region.value.trim() : '';
    if (!projectTitle || !description) {
        showNotification('Please fill in Project Title and Description', 'warning');
        return;
    }
    if (!designStandard) {
        showNotification('Please select a Design Standard', 'warning');
        return;
    }
    const fileNames = filesArray.map(f => f.name);
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<div class="btn-spinner"></div> Generating Questions...';
    try {
        const resp = await apiCall('/estimation/ai/questions', 'POST', {
            projectTitle,
            description,
            designStandard,
            projectType,
            region,
            fileCount: appState.uploadedFile.length,
            fileNames
        });
        if (resp.success && resp.data) {
            renderAIQuestionnaire(resp.data, { projectTitle, description, designStandard, projectType, region, fileNames });
        } else {
            showNotification('Failed to generate questionnaire. Please try again.', 'error');
        }
    } catch (err) {
        console.error('AI Questions error:', err);
    } finally {
        aiBtn.disabled = false;
        aiBtn.innerHTML = '<i class="fas fa-robot"></i> Get AI Estimate <span class="est-ai-badge">Instant</span>';
    }
}

function renderAIQuestionnaire(questionData, projectInfo) {
    const container = document.getElementById('app-container');
    const groups = questionData.questionGroups || [];
    let groupsHTML = '';
    groups.forEach((group, gi) => {
        let questionsHTML = '';
        group.questions.forEach(q => {
            let inputHTML = '';
            const hasDefault = q.defaultValue && q.defaultValue.trim();
            const autoDetectedBadge = hasDefault ? `<span class="aiq-auto-badge"><i class="fas fa-magic"></i> Auto-detected from drawings</span>` : '';
            if (q.type === 'select') {
                const opts = (q.options || []).map(o => `<option value="${o}" ${q.defaultValue === o ? 'selected' : ''}>${o}</option>`).join('');
                inputHTML = `<select class="aiq-input aiq-select ${hasDefault ? 'aiq-prefilled' : ''}" name="${q.id}" ${q.required ? 'required' : ''}><option value="">-- Select --</option>${opts}</select>`;
            } else if (q.type === 'multiselect') {
                const checks = (q.options || []).map(o => `<label class="aiq-check-label"><input type="checkbox" name="${q.id}" value="${o}" class="aiq-checkbox" /><span>${o}</span></label>`).join('');
                inputHTML = `<div class="aiq-checks-grid">${checks}</div>`;
            } else if (q.type === 'textarea') {
                inputHTML = `<textarea class="aiq-input aiq-textarea ${hasDefault ? 'aiq-prefilled' : ''}" name="${q.id}" placeholder="${q.placeholder || ''}" rows="3" ${q.required ? 'required' : ''}>${q.defaultValue || ''}</textarea>`;
            } else {
                inputHTML = `<input type="${q.inputType || 'text'}" class="aiq-input ${hasDefault ? 'aiq-prefilled' : ''}" name="${q.id}" placeholder="${q.placeholder || ''}" value="${q.defaultValue || ''}" ${q.required ? 'required' : ''} />`;
            }
            questionsHTML += `
                <div class="aiq-question">
                    <label class="aiq-label">${q.question} ${q.required ? '<span class="aiq-req">*</span>' : ''} ${autoDetectedBadge}</label>
                    ${inputHTML}
                    ${q.helpText ? `<small class="aiq-help">${q.helpText}</small>` : ''}
                </div>`;
        });
        groupsHTML += `
            <div class="aiq-group">
                <div class="aiq-group-header">
                    <div class="aiq-group-icon"><i class="fas ${group.groupIcon || 'fa-clipboard-list'}"></i></div>
                    <h3 class="aiq-group-title">${group.groupTitle}</h3>
                </div>
                <div class="aiq-group-body">${questionsHTML}</div>
            </div>`;
    });

    container.innerHTML = `
        <div class="aiq-page">
            <div class="portal-breadcrumb-nav">
                <a href="#" onclick="renderAppSection('dashboard'); return false;"><i class="fas fa-home"></i> Dashboard</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <a href="#" onclick="renderAppSection('estimation-tool'); return false;">AI Estimation</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <span class="breadcrumb-current">Questionnaire</span>
            </div>
            <div class="aiq-hero">
                <div class="aiq-hero-glow"></div>
                <div class="air-hero-nav-buttons">
                    <button class="aiq-back-btn" onclick="renderAppSection('dashboard')"><i class="fas fa-home"></i> Main Portal</button>
                    <button class="aiq-back-btn" onclick="renderAppSection('estimation-tool')"><i class="fas fa-arrow-left"></i> Back</button>
                </div>
                <div class="aiq-hero-content">
                    <div class="aiq-hero-badge"><i class="fas fa-brain"></i> AI Analysis</div>
                    <h1 class="aiq-hero-title">Project Questionnaire</h1>
                    <p class="aiq-hero-sub">Answer these questions to help our AI generate a comprehensive, world-class cost estimate for <strong>${projectInfo.projectTitle}</strong></p>
                </div>
            </div>
            <div class="aiq-container">
                <div class="aiq-progress-bar">
                    <div class="aiq-progress-step active"><span class="aiq-prog-num">1</span><span class="aiq-prog-label">Upload</span></div>
                    <div class="aiq-prog-line done"></div>
                    <div class="aiq-progress-step active"><span class="aiq-prog-num">2</span><span class="aiq-prog-label">Details</span></div>
                    <div class="aiq-prog-line done"></div>
                    <div class="aiq-progress-step active current"><span class="aiq-prog-num">3</span><span class="aiq-prog-label">Questionnaire</span></div>
                    <div class="aiq-prog-line"></div>
                    <div class="aiq-progress-step"><span class="aiq-prog-num">4</span><span class="aiq-prog-label">AI Result</span></div>
                </div>
                <form id="aiq-form" class="aiq-form">
                    ${groupsHTML}
                    <div class="aiq-submit-section">
                        <div class="aiq-tier-section">
                            <h3 class="aiq-tier-title"><i class="fas fa-layer-group"></i> Choose Estimation Mode</h3>
                            <div class="aiq-tier-cards">
                                <label class="aiq-tier-card" data-tier="quick">
                                    <input type="radio" name="estimationTier" value="quick" class="aiq-tier-radio" />
                                    <div class="aiq-tier-icon"><i class="fas fa-bolt"></i></div>
                                    <div class="aiq-tier-name">Quick</div>
                                    <div class="aiq-tier-cost">Free</div>
                                    <div class="aiq-tier-desc">Instant estimate from regional cost database. No AI cost. Best for feasibility studies.</div>
                                    <div class="aiq-tier-accuracy">Accuracy: ~30-50%</div>
                                    <div class="aiq-tier-time"><i class="fas fa-clock"></i> Instant</div>
                                </label>
                                <label class="aiq-tier-card selected" data-tier="standard">
                                    <input type="radio" name="estimationTier" value="standard" class="aiq-tier-radio" checked />
                                    <div class="aiq-tier-badge">Recommended</div>
                                    <div class="aiq-tier-icon"><i class="fas fa-brain"></i></div>
                                    <div class="aiq-tier-name">Standard</div>
                                    <div class="aiq-tier-cost">Low AI Cost</div>
                                    <div class="aiq-tier-desc">AI analyzes your drawings in a single pass. Great balance of cost and accuracy.</div>
                                    <div class="aiq-tier-accuracy">Accuracy: ~15-25%</div>
                                    <div class="aiq-tier-time"><i class="fas fa-clock"></i> 15-30 seconds</div>
                                </label>
                                <label class="aiq-tier-card" data-tier="detailed">
                                    <input type="radio" name="estimationTier" value="detailed" class="aiq-tier-radio" />
                                    <div class="aiq-tier-icon"><i class="fas fa-microscope"></i></div>
                                    <div class="aiq-tier-name">Detailed</div>
                                    <div class="aiq-tier-cost">Higher AI Cost</div>
                                    <div class="aiq-tier-desc">5-pass deep analysis with sheet classification, extraction, takeoff, costing & validation.</div>
                                    <div class="aiq-tier-accuracy">Accuracy: ~5-15%</div>
                                    <div class="aiq-tier-time"><i class="fas fa-clock"></i> 1-3 minutes</div>
                                </label>
                            </div>
                        </div>
                        <button type="button" id="aiq-generate-btn" class="aiq-generate-btn" onclick="submitAIQuestionnaire()">
                            <i class="fas fa-wand-magic-sparkles"></i> Generate Estimate
                            <span class="aiq-gen-badge">Powered by Claude AI</span>
                        </button>
                        <p class="aiq-note" id="aiq-tier-note"><i class="fas fa-clock"></i> Standard mode: 15-30 seconds for a comprehensive estimate</p>
                    </div>
                </form>
            </div>
        </div>`;
    // Store project info for the generate step
    appState._aiProjectInfo = projectInfo;

    // Setup tier card selection
    document.querySelectorAll('.aiq-tier-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.aiq-tier-card').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('.aiq-tier-radio').checked = true;
            const tier = this.dataset.tier;
            const note = document.getElementById('aiq-tier-note');
            const btn = document.getElementById('aiq-generate-btn');
            if (tier === 'quick') {
                note.innerHTML = '<i class="fas fa-bolt"></i> Quick mode: Instant estimate using cost database (zero AI cost)';
                btn.innerHTML = '<i class="fas fa-bolt"></i> Generate Quick Estimate <span class="aiq-gen-badge">Free - No AI Cost</span>';
            } else if (tier === 'standard') {
                note.innerHTML = '<i class="fas fa-clock"></i> Standard mode: 15-30 seconds for a comprehensive estimate';
                btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Estimate <span class="aiq-gen-badge">Powered by Claude AI</span>';
            } else {
                note.innerHTML = '<i class="fas fa-clock"></i> Detailed mode: 1-3 minutes for maximum accuracy multi-pass analysis';
                btn.innerHTML = '<i class="fas fa-microscope"></i> Generate Detailed Estimate <span class="aiq-gen-badge">Multi-Pass AI Analysis</span>';
            }
        });
    });
}

async function submitAIQuestionnaire() {
    const form = document.getElementById('aiq-form');
    const btn = document.getElementById('aiq-generate-btn');
    if (!form || !btn) return;

    // Collect answers
    const answers = {};
    const inputs = form.querySelectorAll('.aiq-input, .aiq-select, .aiq-textarea');
    inputs.forEach(input => {
        if (input.name && input.value) answers[input.name] = input.value;
    });
    // Collect multiselect checkboxes
    const checkboxes = form.querySelectorAll('.aiq-checkbox:checked');
    checkboxes.forEach(cb => {
        if (!answers[cb.name]) answers[cb.name] = [];
        if (typeof answers[cb.name] === 'string') answers[cb.name] = [answers[cb.name]];
        answers[cb.name].push(cb.value);
    });

    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    let valid = true;
    requiredFields.forEach(f => {
        if (!f.value || f.value.trim() === '') {
            f.classList.add('aiq-error');
            valid = false;
        } else {
            f.classList.remove('aiq-error');
        }
    });
    if (!valid) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    const projectInfo = appState._aiProjectInfo || {};
    const selectedTier = form.querySelector('input[name="estimationTier"]:checked')?.value || 'standard';
    btn.disabled = true;

    if (selectedTier === 'quick') {
        btn.innerHTML = '<div class="btn-spinner"></div> Generating quick estimate...';
    } else {
        btn.innerHTML = '<div class="btn-spinner"></div> AI is analyzing your project...';
    }

    // Show immersive loading screen (skip for quick mode)
    if (selectedTier !== 'quick') {
        showAIGeneratingOverlay();
    }

    try {
        // Use FormData to include actual files alongside project info
        const formData = new FormData();
        formData.append('projectTitle', projectInfo.projectTitle || '');
        formData.append('description', projectInfo.description || '');
        formData.append('designStandard', projectInfo.designStandard || '');
        formData.append('projectType', projectInfo.projectType || '');
        formData.append('region', projectInfo.region || '');
        formData.append('totalArea', answers.totalArea || projectInfo.totalArea || '');
        formData.append('answers', JSON.stringify(answers));
        formData.append('fileNames', JSON.stringify(projectInfo.fileNames || []));
        formData.append('estimationTier', selectedTier);

        // Attach actual files for upload to server - validate files are still valid
        let fileCount = 0;
        if (appState.uploadedFile && appState.uploadedFile.length > 0) {
            try {
                const filesArray = Array.from(appState.uploadedFile);
                for (let i = 0; i < filesArray.length; i++) {
                    if (filesArray[i] instanceof File && filesArray[i].size > 0) {
                        formData.append('files', filesArray[i]);
                        fileCount++;
                    }
                }
            } catch (fileErr) {
                console.warn('[AI-SUBMIT] Error reading files:', fileErr);
            }
        }
        console.log('[AI-SUBMIT] Submitting with', fileCount, 'valid files');

        const resp = await apiCall('/estimation/ai/generate', 'POST', formData);
        if (selectedTier !== 'quick') hideAIGeneratingOverlay();
        if (resp.success && resp.data) {
            if (resp.warning) {
                showNotification(resp.warning, 'warning');
            }
            if (resp.cached) {
                showNotification('Loaded from cache - no additional AI cost!', 'success');
            }
            renderAIEstimateResult(resp.data, projectInfo);
        } else {
            showNotification(resp.message || 'Estimate generation failed. Please try again.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Estimate <span class="aiq-gen-badge">Powered by Claude AI</span>';
        }
    } catch (err) {
        if (selectedTier !== 'quick') hideAIGeneratingOverlay();
        console.error('Estimate error:', err);
        showNotification('Estimation failed: ' + (err.message || 'Please try again.'), 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Generate Estimate <span class="aiq-gen-badge">Powered by Claude AI</span>';
    }
}

function showAIGeneratingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'ai-gen-overlay';
    overlay.className = 'ai-gen-overlay';
    overlay.innerHTML = `
        <div class="ai-gen-modal">
            <div class="ai-gen-animation">
                <div class="ai-gen-rings">
                    <div class="ai-gen-ring ring-1"></div>
                    <div class="ai-gen-ring ring-2"></div>
                    <div class="ai-gen-ring ring-3"></div>
                </div>
                <div class="ai-gen-icon"><i class="fas fa-robot"></i></div>
            </div>
            <h2 class="ai-gen-title">Multi-Pass AI Estimation Engine</h2>
            <p class="ai-gen-subtitle">Our AI is running a 5-pass analysis pipeline for maximum accuracy</p>
            <div class="ai-gen-steps">
                <div class="ai-gen-step active" id="aiStep1"><i class="fas fa-spinner fa-spin"></i> <span>Pass 1: Classifying drawing sheets</span></div>
                <div class="ai-gen-step" id="aiStep2"><i class="fas fa-circle"></i> <span>Pass 2: Extracting structural details</span></div>
                <div class="ai-gen-step" id="aiStep3"><i class="fas fa-circle"></i> <span>Pass 3: Quantity takeoff & cross-reference</span></div>
                <div class="ai-gen-step" id="aiStep4"><i class="fas fa-circle"></i> <span>Pass 4: Applying database-backed rates</span></div>
                <div class="ai-gen-step" id="aiStep5"><i class="fas fa-circle"></i> <span>Pass 5: Validation & benchmarking</span></div>
            </div>
            <div class="ai-gen-progress-bar"><div class="ai-gen-progress-fill" id="aiProgressFill"></div></div>
            <p class="ai-gen-timer" id="aiGenTimer">Elapsed: 0s</p>
        </div>`;
    document.body.appendChild(overlay);
    // Timer
    let elapsed = 0;
    const timerInterval = setInterval(() => {
        elapsed++;
        const timerEl = document.getElementById('aiGenTimer');
        if (timerEl) timerEl.textContent = `Elapsed: ${elapsed}s`;
        else clearInterval(timerInterval);
    }, 1000);
    overlay._timerInterval = timerInterval;
    // Animate steps through passes
    const steps = ['aiStep1', 'aiStep2', 'aiStep3', 'aiStep4', 'aiStep5'];
    const durations = [8000, 25000, 45000, 60000, 75000]; // cumulative timing
    steps.forEach((id, i) => {
        if (i === 0) return; // first already active
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) { el.classList.add('active'); el.querySelector('i').className = 'fas fa-spinner fa-spin'; }
            // Mark previous as done
            const prevEl = document.getElementById(steps[i - 1]);
            if (prevEl) { prevEl.classList.add('done'); prevEl.querySelector('i').className = 'fas fa-check-circle'; }
            // Update progress bar
            const fill = document.getElementById('aiProgressFill');
            if (fill) fill.style.width = `${(i / (steps.length - 1)) * 100}%`;
        }, durations[i - 1]);
    });
}

function hideAIGeneratingOverlay() {
    const overlay = document.getElementById('ai-gen-overlay');
    if (overlay) {
        if (overlay._timerInterval) clearInterval(overlay._timerInterval);
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
    }
}

function renderAIEstimateResult(estimate, projectInfo) {
    const container = document.getElementById('app-container');
    const s = estimate.summary || {};
    const curr = s.currencySymbol || '$';
    const trades = estimate.trades || [];
    const breakdown = estimate.costBreakdown || {};
    const assumptions = estimate.assumptions || [];
    const exclusions = estimate.exclusions || [];
    const notes = estimate.notes || [];
    const insights = estimate.marketInsights || {};
    const structuralAnalysis = estimate.structuralAnalysis || {};
    const drawingExtraction = estimate.drawingExtraction || {};
    const matSchedule = estimate.materialSchedule || {};
    const validation = estimate.validationReport || {};
    const confidenceScore = validation.finalConfidenceScore || validation.confidenceScore || 0;
    const confidenceLevel = validation.confidenceLevel || s.confidenceLevel || 'Medium';
    const confidenceFactors = validation.confidenceFactors || [];
    const benchmark = validation.benchmarkComparison || {};
    const rateSource = validation.rateSourceSummary || {};
    const rateSourceBreakdown = (estimate.structuralAnalysis || {}).rateSourceBreakdown || {};
    const validationIssues = validation.issues || [];
    const multiPassMeta = estimate._multiPassMeta || {};
    const passesCompleted = (estimate.structuralAnalysis || {}).passesCompleted || 0;

    // Build confidence ring SVG
    const confPct = Math.min(100, Math.max(0, confidenceScore));
    const confColor = confPct >= 70 ? '#10b981' : confPct >= 40 ? '#f59e0b' : '#ef4444';
    const confDash = (confPct / 100) * 251.2;
    const confidenceRingHTML = confidenceScore > 0 ? `
        <div class="air-confidence-ring-wrap">
            <svg class="air-confidence-ring" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="40" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                <circle cx="45" cy="45" r="40" fill="none" stroke="${confColor}" stroke-width="6" stroke-dasharray="${confDash} 251.2" stroke-dashoffset="0" stroke-linecap="round" transform="rotate(-90 45 45)"/>
                <text x="45" y="42" text-anchor="middle" font-size="18" font-weight="700" fill="${confColor}">${confPct}</text>
                <text x="45" y="56" text-anchor="middle" font-size="8" fill="#6b7280">${confidenceLevel}</text>
            </svg>
            <div class="air-confidence-label">Confidence Score</div>
        </div>` : '';

    // Build benchmark bar
    const benchmarkHTML = benchmark.benchmarkLow ? `
        <div class="air-benchmark-section">
            <h4><i class="fas fa-chart-bar"></i> Benchmark Comparison</h4>
            <div class="air-benchmark-bar-wrap">
                <div class="air-benchmark-range">
                    <span class="air-bm-low">${curr}${fmtNum(benchmark.benchmarkLow)}</span>
                    <span class="air-bm-high">${curr}${fmtNum(benchmark.benchmarkHigh)}</span>
                </div>
                <div class="air-benchmark-track">
                    <div class="air-benchmark-zone" style="left:0;width:100%;background:linear-gradient(90deg,#fecaca 0%,#bbf7d0 30%,#bbf7d0 70%,#fecaca 100%)"></div>
                    <div class="air-benchmark-marker" style="left:${Math.min(100, Math.max(0, ((benchmark.costPerUnit - benchmark.benchmarkLow) / (benchmark.benchmarkHigh - benchmark.benchmarkLow)) * 100))}%">
                        <div class="air-bm-marker-dot"></div>
                        <span class="air-bm-marker-label">${curr}${fmtNum(benchmark.costPerUnit)}/${benchmark.unit || 'sqft'}</span>
                    </div>
                </div>
                <div class="air-benchmark-status air-bm-${benchmark.status || 'within'}">${benchmark.status === 'within' ? 'Within typical range' : benchmark.status === 'above' ? 'Above typical range' : 'Below typical range'}</div>
            </div>
        </div>` : '';

    // Build validation issues panel
    const criticalIssues = validationIssues.filter(i => i.severity === 'critical');
    const warningIssues = validationIssues.filter(i => i.severity === 'warning');
    const validationHTML = validationIssues.length > 0 ? `
        <div class="air-validation-panel">
            <div class="air-validation-header" onclick="this.parentElement.classList.toggle('expanded')">
                <h4><i class="fas fa-shield-alt"></i> Validation Report</h4>
                <div class="air-validation-badges">
                    ${criticalIssues.length > 0 ? `<span class="air-val-badge air-val-critical">${criticalIssues.length} Critical</span>` : ''}
                    ${warningIssues.length > 0 ? `<span class="air-val-badge air-val-warning">${warningIssues.length} Warning</span>` : ''}
                    <i class="fas fa-chevron-down air-val-chevron"></i>
                </div>
            </div>
            <div class="air-validation-body">
                ${validationIssues.map(issue => `
                    <div class="air-val-issue air-val-${issue.severity}">
                        <i class="fas ${issue.severity === 'critical' ? 'fa-exclamation-circle' : issue.severity === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
                        <span>${issue.message}</span>
                        ${issue.autoFixed ? '<span class="air-val-fixed">Auto-fixed</span>' : ''}
                    </div>`).join('')}
            </div>
        </div>` : '';

    // Rate source summary
    const dbCount = rateSource.dbBacked || rateSourceBreakdown.database || 0;
    const estCount = rateSource.aiEstimated || rateSourceBreakdown.estimated || 0;
    const totalRateCount = dbCount + estCount;
    const dbPctVal = rateSource.dbPercentage || (totalRateCount > 0 ? Math.round((dbCount / totalRateCount) * 100) : 0);
    const rateSourceHTML = totalRateCount > 0 ? `
        <div class="air-rate-source-summary">
            <span class="air-rs-badge air-rs-db"><i class="fas fa-database"></i> ${dbCount} DB-Backed</span>
            <span class="air-rs-badge air-rs-est"><i class="fas fa-robot"></i> ${estCount} AI-Estimated</span>
            <span class="air-rs-pct">${dbPctVal}% database coverage</span>
        </div>` : '';

    // Confidence factors breakdown
    const confidenceFactorsHTML = confidenceFactors.length > 0 ? `
        <div class="air-section" style="padding:16px;">
            <div class="air-section-header"><h3><i class="fas fa-tasks"></i> Confidence Score Breakdown</h3></div>
            <div style="display:grid;gap:8px;">
                ${confidenceFactors.map(f => {
                    const fColor = f.score >= 70 ? '#10b981' : f.score >= 40 ? '#f59e0b' : '#ef4444';
                    return `<div style="display:flex;align-items:center;gap:12px;">
                        <span style="width:140px;font-size:0.85rem;color:#475569;">${f.name}</span>
                        <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                            <div style="height:100%;width:${f.score}%;background:${fColor};border-radius:4px;transition:width 0.5s;"></div>
                        </div>
                        <span style="width:40px;text-align:right;font-size:0.85rem;font-weight:700;color:${fColor};">${f.score}%</span>
                        <span style="width:20px;font-size:0.7rem;color:#94a3b8;">w:${f.weight}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>` : '';

    // Multi-pass metadata bar
    const multiPassBarHTML = (passesCompleted > 0 || multiPassMeta.engineVersion) ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 16px;font-size:0.78rem;">
            ${passesCompleted > 0 ? `<span style="background:#eff6ff;color:#1e40af;padding:4px 12px;border-radius:16px;"><i class="fas fa-layer-group"></i> ${passesCompleted}/5 Passes Completed</span>` : ''}
            ${multiPassMeta.totalDurationSeconds ? `<span style="background:#f0fdf4;color:#166534;padding:4px 12px;border-radius:16px;"><i class="fas fa-clock"></i> ${multiPassMeta.totalDurationSeconds}s analysis</span>` : ''}
            ${multiPassMeta.engineVersion ? `<span style="background:#f8fafc;color:#64748b;padding:4px 12px;border-radius:16px;">${multiPassMeta.engineVersion}</span>` : ''}
        </div>` : '';

    // Build trades rows
    let tradesHTML = '';
    trades.forEach((trade, i) => {
        let lineItemsHTML = '';
        (trade.lineItems || []).forEach(item => {
            const rsBadge = item.rateSource === 'DB' ? '<span class="air-li-rs air-li-rs-db" title="Rate from cost database">DB</span>'
                : item.rateSource === 'EST' ? '<span class="air-li-rs air-li-rs-est" title="AI-estimated rate">EST</span>' : '';
            lineItemsHTML += `
                <tr class="air-line-row">
                    <td class="air-li-desc">${item.description}${item.materialDetails ? `<div class="air-li-spec">${item.materialDetails}</div>` : ''}${item.quantitySource ? `<div class="air-li-source">${item.quantitySource}</div>` : ''}</td>
                    <td>${fmtNum(item.quantity)} ${item.unit}</td>
                    <td>${curr}${fmtNum(item.unitRate || item.unitTotal || 0)} ${rsBadge}</td>
                    <td class="air-li-total">${curr}${fmtNum(item.lineTotal)}</td>
                </tr>`;
        });

        const tradeColors = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1','#14b8a6','#f97316','#84cc16','#a855f7','#0ea5e9','#d946ef','#22d3ee'];
        const color = tradeColors[i % tradeColors.length];
        tradesHTML += `
            <div class="air-trade-card">
                <div class="air-trade-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="air-trade-left">
                        <div class="air-trade-icon" style="background:${color}20;color:${color}"><i class="fas ${trade.tradeIcon || 'fa-hard-hat'}"></i></div>
                        <div>
                            <h4 class="air-trade-name">${trade.tradeName}</h4>
                            <span class="air-trade-div">Division ${trade.division}</span>
                        </div>
                    </div>
                    <div class="air-trade-right">
                        <span class="air-trade-pct" style="color:${color}">${(trade.percentOfTotal || 0).toFixed(1)}%</span>
                        <span class="air-trade-total">${curr}${fmtNum(trade.subtotal)}</span>
                        <i class="fas fa-chevron-down air-trade-chevron"></i>
                    </div>
                </div>
                <div class="air-trade-body">
                    <table class="air-line-table">
                        <thead><tr><th>Description</th><th>Quantity</th><th>Unit Rate</th><th>Total</th></tr></thead>
                        <tbody>${lineItemsHTML}</tbody>
                    </table>
                </div>
            </div>`;
    });

    // Breakdown items
    const breakdownHTML = `
        <div class="air-breakdown-row"><span>Direct Costs</span><span class="air-bd-val">${curr}${fmtNum(breakdown.directCosts)}</span></div>
        <div class="air-breakdown-row"><span>General Conditions (${breakdown.generalConditionsPercent || 0}%)</span><span class="air-bd-val">${curr}${fmtNum(breakdown.generalConditions)}</span></div>
        <div class="air-breakdown-row"><span>Overhead (${breakdown.overheadPercent || 0}%)</span><span class="air-bd-val">${curr}${fmtNum(breakdown.overhead)}</span></div>
        <div class="air-breakdown-row"><span>Profit (${breakdown.profitPercent || 0}%)</span><span class="air-bd-val">${curr}${fmtNum(breakdown.profit)}</span></div>
        <div class="air-breakdown-row"><span>Contingency (${breakdown.contingencyPercent || 0}%)</span><span class="air-bd-val">${curr}${fmtNum(breakdown.contingency)}</span></div>
        <div class="air-breakdown-row"><span>Escalation (${breakdown.escalationPercent || 0}%)</span><span class="air-bd-val">${curr}${fmtNum(breakdown.escalation)}</span></div>
        <div class="air-breakdown-row air-breakdown-total"><span>Total with Markups</span><span>${curr}${fmtNum(breakdown.totalWithMarkups)}</span></div>`;

    // Material Schedule section - Complete BOQ with all trades and prices
    const steelMembers = matSchedule.steelMembers || [];
    const concreteItems = matSchedule.concreteItems || [];
    const mepItems = matSchedule.mepItems || [];
    const archItems = matSchedule.architecturalItems || [];
    const roofItems = matSchedule.roofingItems || [];
    const siteItems = matSchedule.siteworkItems || [];
    const otherMaterials = matSchedule.otherMaterials || [];
    const steelSum = matSchedule.steelSummary || {};
    const concreteSum = matSchedule.concreteSummary || {};
    const mepSum = matSchedule.mepSummary || {};
    const archSum = matSchedule.architecturalSummary || {};
    const hasMaterialSchedule = steelMembers.length > 0 || concreteItems.length > 0 || mepItems.length > 0 || archItems.length > 0 || roofItems.length > 0 || otherMaterials.length > 0;

    // Helper to build a generic material table with material cost + labor + total columns
    function buildMatTable(items, columns, colorAccent) {
        if (!items || items.length === 0) return '';
        let totalMatCost = items.reduce((s, i) => s + (Number(i.materialCost) || 0), 0);
        let totalLabCost = items.reduce((s, i) => s + (Number(i.laborCost) || 0), 0);
        let totalLabHrs = items.reduce((s, i) => s + (Number(i.laborHours) || 0), 0);
        let totalCost = items.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
        const hasLabor = totalLabHrs > 0 || totalLabCost > 0;
        return `<div style="overflow-x:auto;"><table class="air-line-table" style="font-size:0.82rem;width:100%;">
            <thead><tr>${columns.map(c => `<th style="${c.align ? 'text-align:'+c.align : ''}">${c.label}</th>`).join('')}<th style="text-align:right;">Material</th>${hasLabor ? '<th style="text-align:right;">Labor Hrs</th><th style="text-align:right;">Labor Cost</th>' : ''}<th style="text-align:right;">Total Cost</th></tr></thead>
            <tbody>${items.map(item => `<tr>${columns.map(c => `<td style="${c.style || ''}">${c.render ? c.render(item) : (item[c.key] || '-')}</td>`).join('')}
                <td style="text-align:right;">${curr}${fmtNum(item.materialCost || item.unitRate || 0)}</td>
                ${hasLabor ? `<td style="text-align:right;color:#6b7280;">${fmtNum(item.laborHours || 0)}</td><td style="text-align:right;">${curr}${fmtNum(item.laborCost || 0)}</td>` : ''}
                <td style="text-align:right;font-weight:600;">${curr}${fmtNum(item.totalCost || 0)}</td></tr>`).join('')}</tbody>
            ${totalCost > 0 ? `<tfoot><tr style="background:${colorAccent}10;font-weight:700;"><td colspan="${columns.length}">Subtotal</td><td style="text-align:right;">${curr}${fmtNum(totalMatCost)}</td>${hasLabor ? `<td style="text-align:right;">${fmtNum(totalLabHrs)}</td><td style="text-align:right;">${curr}${fmtNum(totalLabCost)}</td>` : ''}<td style="text-align:right;color:${colorAccent};">${curr}${fmtNum(totalCost)}</td></tr></tfoot>` : ''}
        </table></div>`;
    }

    let materialScheduleHTML = '';
    if (hasMaterialSchedule) {
        // Steel members
        let steelTableHTML = '';
        if (steelMembers.length > 0) {
            let steelCost = steelSum.totalSteelCost || steelMembers.reduce((s, m) => s + (Number(m.totalCost) || 0), 0);
            const steelHasLabor = steelMembers.some(m => m.laborHours > 0 || m.laborCost > 0);
            const steelColSpan = steelHasLabor ? 12 : 9;
            steelTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#1e40af;"><i class="fas fa-i-cursor"></i> Structural Steel ${steelSum.totalSteelTons ? `<span style="font-size:0.8rem;font-weight:400;color:#6b7280;"> - ${fmtNum(steelSum.totalSteelTons)} tons</span>` : ''} ${steelCost ? `<span style="font-size:0.8rem;font-weight:600;color:#1e40af;float:right;">${curr}${fmtNum(steelCost)}</span>` : ''}</h4>
                <div style="overflow-x:auto;"><table class="air-line-table" style="font-size:0.82rem;width:100%;">
                    <thead><tr><th>Mark</th><th>Section</th><th>Grade</th><th>Count</th><th>Length</th><th>Wt/ft</th><th style="text-align:right;">Weight (tons)</th><th style="text-align:right;">Material</th>${steelHasLabor ? '<th style="text-align:right;">Labor Hrs</th><th style="text-align:right;">Labor Cost</th><th style="text-align:right;">Equip</th>' : ''}<th style="text-align:right;">Total Cost</th></tr></thead>
                    <tbody>${steelMembers.map(m => `<tr>
                        <td><strong>${m.mark || '-'}</strong> <span style="color:#94a3b8;font-size:0.75rem;">${m.type || ''}</span></td>
                        <td style="color:#6366f1;font-weight:600;">${m.section || '-'}</td>
                        <td style="font-size:0.75rem;">${m.grade || '-'}</td>
                        <td style="text-align:center;font-weight:600;">${m.count || 0}</td>
                        <td>${m.lengthEach || (m.lengthFt ? m.lengthFt + "'" : '-')}</td>
                        <td>${m.weightPerFt || '-'}</td>
                        <td style="text-align:right;">${fmtNum(m.totalWeightTons)}</td>
                        <td style="text-align:right;">${m.materialCost ? curr + fmtNum(m.materialCost) : (m.unitRate ? curr + fmtNum(m.unitRate) : '-')}</td>
                        ${steelHasLabor ? `<td style="text-align:right;color:#6b7280;">${fmtNum(m.laborHours || 0)}</td><td style="text-align:right;">${curr}${fmtNum(m.laborCost || 0)}</td><td style="text-align:right;">${m.equipmentCost ? curr + fmtNum(m.equipmentCost) : '-'}</td>` : ''}
                        <td style="text-align:right;font-weight:600;">${m.totalCost ? curr + fmtNum(m.totalCost) : '-'}</td>
                    </tr>${m.calculation ? `<tr><td colspan="${steelColSpan}" style="padding:2px 8px;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;"><i class="fas fa-calculator"></i> ${m.calculation}</td></tr>` : ''}`).join('')}</tbody>
                    ${steelSum.totalSteelTons ? `<tfoot><tr style="background:#eff6ff;font-weight:700;">
                        <td colspan="6">Total (Main: ${fmtNum(steelSum.mainSteelTons)} + Misc: ${fmtNum(steelSum.connectionMiscTons)})</td>
                        <td style="text-align:right;color:#1e40af;">${fmtNum(steelSum.totalSteelTons)} tons</td>
                        <td style="text-align:right;">${steelSum.totalMaterialCost ? curr + fmtNum(steelSum.totalMaterialCost) : ''}</td>
                        ${steelHasLabor ? `<td></td><td style="text-align:right;">${steelSum.totalLaborCost ? curr + fmtNum(steelSum.totalLaborCost) : ''}</td><td></td>` : ''}
                        <td style="text-align:right;color:#1e40af;">${curr}${fmtNum(steelCost)}</td>
                    </tr>${steelSum.steelPSF ? `<tr style="background:#f0f9ff;"><td colspan="${steelColSpan}" style="font-size:0.78rem;color:#3b82f6;">Steel intensity: ${fmtNum(steelSum.steelPSF)} PSF</td></tr>` : ''}</tfoot>` : ''}
                </table></div></div>`;
        }

        // Concrete
        let concreteTableHTML = '';
        if (concreteItems.length > 0) {
            let concCost = concreteSum.totalConcreteCost || concreteItems.reduce((s, c) => s + (Number(c.totalCost) || 0), 0);
            const concHasLabor = concreteItems.some(c => c.laborHours > 0 || c.laborCost > 0);
            const concColSpan = concHasLabor ? 12 : 9;
            concreteTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#166534;"><i class="fas fa-cube"></i> Concrete & Rebar ${concreteSum.totalConcreteCY ? `<span style="font-size:0.8rem;font-weight:400;color:#6b7280;"> - ${fmtNum(concreteSum.totalConcreteCY)} CY</span>` : ''} ${concCost ? `<span style="font-size:0.8rem;font-weight:600;color:#166534;float:right;">${curr}${fmtNum(concCost)}</span>` : ''}</h4>
                <div style="overflow-x:auto;"><table class="air-line-table" style="font-size:0.82rem;width:100%;">
                    <thead><tr><th>Element</th><th>Dimensions</th><th>Count</th><th style="text-align:right;">Vol/ea</th><th style="text-align:right;">Total CY</th><th>Grade</th><th style="text-align:right;">Rebar lbs</th><th style="text-align:right;">Material</th>${concHasLabor ? '<th style="text-align:right;">Labor Hrs</th><th style="text-align:right;">Labor Cost</th><th style="text-align:right;">Equip</th>' : ''}<th style="text-align:right;">Total Cost</th></tr></thead>
                    <tbody>${concreteItems.map(c => `<tr>
                        <td><strong>${c.element || '-'}</strong> <span style="color:#94a3b8;font-size:0.75rem;">${c.type || ''}</span></td>
                        <td style="color:#059669;">${c.dimensions || '-'}</td>
                        <td style="text-align:center;font-weight:600;">${c.count || 0}</td>
                        <td style="text-align:right;">${fmtNum(c.volumeEachCY)}</td>
                        <td style="text-align:right;font-weight:600;">${fmtNum(c.totalCY)}</td>
                        <td>${c.concreteGrade || '-'}</td>
                        <td style="text-align:right;">${fmtNum(c.rebarTotalLbs)}</td>
                        <td style="text-align:right;">${c.materialCost ? curr + fmtNum(c.materialCost) : (c.unitRate ? curr + fmtNum(c.unitRate) : '-')}</td>
                        ${concHasLabor ? `<td style="text-align:right;color:#6b7280;">${fmtNum(c.laborHours || 0)}</td><td style="text-align:right;">${curr}${fmtNum(c.laborCost || 0)}</td><td style="text-align:right;">${c.equipmentCost ? curr + fmtNum(c.equipmentCost) : '-'}</td>` : ''}
                        <td style="text-align:right;font-weight:600;">${c.totalCost ? curr + fmtNum(c.totalCost) : '-'}</td>
                    </tr>${c.calculation ? `<tr><td colspan="${concColSpan}" style="padding:2px 8px;font-size:0.72rem;color:#6b7280;border-bottom:1px solid #e5e7eb;"><i class="fas fa-calculator"></i> ${c.calculation}</td></tr>` : ''}`).join('')}</tbody>
                    ${concreteSum.totalConcreteCY ? `<tfoot><tr style="background:#f0fdf4;font-weight:700;">
                        <td colspan="4">Totals</td><td style="text-align:right;color:#166534;">${fmtNum(concreteSum.totalConcreteCY)} CY</td><td></td>
                        <td style="text-align:right;">${concreteSum.totalRebarTons ? fmtNum(concreteSum.totalRebarTons) + ' tons' : '-'}</td>
                        <td style="text-align:right;">${concreteSum.totalMaterialCost ? curr + fmtNum(concreteSum.totalMaterialCost) : ''}</td>
                        ${concHasLabor ? `<td></td><td style="text-align:right;">${concreteSum.totalLaborCost ? curr + fmtNum(concreteSum.totalLaborCost) : ''}</td><td></td>` : ''}
                        <td style="text-align:right;color:#166534;">${curr}${fmtNum(concCost)}</td>
                    </tr></tfoot>` : ''}
                </table></div></div>`;
        }

        // MEP Items
        let mepTableHTML = '';
        if (mepItems.length > 0) {
            const mepCost = mepSum.totalMEPCost || mepItems.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
            mepTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#7c3aed;"><i class="fas fa-plug"></i> MEP (Mechanical / Electrical / Plumbing) <span style="font-size:0.8rem;font-weight:600;color:#7c3aed;float:right;">${curr}${fmtNum(mepCost)}</span></h4>
                ${buildMatTable(mepItems, [
                    {label:'Category', key:'category', style:'font-weight:600;color:#7c3aed;'},
                    {label:'Item', key:'item', style:'font-weight:600;'},
                    {label:'Specification', key:'specification', style:'font-size:0.78rem;'},
                    {label:'Qty', key:'quantity', align:'right', render: i => fmtNum(i.quantity)},
                    {label:'Unit', key:'unit'},
                ], '#7c3aed')}</div>`;
        }

        // Architectural Items
        let archTableHTML = '';
        if (archItems.length > 0) {
            const archCost = archSum.totalArchitecturalCost || archItems.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
            archTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#b45309;"><i class="fas fa-paint-roller"></i> Architectural Finishes <span style="font-size:0.8rem;font-weight:600;color:#b45309;float:right;">${curr}${fmtNum(archCost)}</span></h4>
                ${buildMatTable(archItems, [
                    {label:'Category', key:'category', style:'font-weight:600;color:#b45309;'},
                    {label:'Item', key:'item', style:'font-weight:600;'},
                    {label:'Specification', key:'specification', style:'font-size:0.78rem;'},
                    {label:'Qty', key:'quantity', align:'right', render: i => fmtNum(i.quantity)},
                    {label:'Unit', key:'unit'},
                ], '#b45309')}</div>`;
        }

        // Roofing
        let roofTableHTML = '';
        if (roofItems.length > 0) {
            roofTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#0369a1;"><i class="fas fa-home"></i> Roofing</h4>
                ${buildMatTable(roofItems, [
                    {label:'Item', key:'item', style:'font-weight:600;'},
                    {label:'Specification', key:'specification', style:'font-size:0.78rem;'},
                    {label:'Qty', key:'quantity', align:'right', render: i => fmtNum(i.quantity)},
                    {label:'Unit', key:'unit'},
                    {label:'Notes', key:'notes', style:'font-size:0.75rem;color:#6b7280;'},
                ], '#0369a1')}</div>`;
        }

        // Sitework
        let siteTableHTML = '';
        if (siteItems.length > 0) {
            siteTableHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#65a30d;"><i class="fas fa-tree"></i> Sitework</h4>
                ${buildMatTable(siteItems, [
                    {label:'Item', key:'item', style:'font-weight:600;'},
                    {label:'Specification', key:'specification', style:'font-size:0.78rem;'},
                    {label:'Qty', key:'quantity', align:'right', render: i => fmtNum(i.quantity)},
                    {label:'Unit', key:'unit'},
                    {label:'Notes', key:'notes', style:'font-size:0.75rem;color:#6b7280;'},
                ], '#65a30d')}</div>`;
        }

        // Other materials
        let otherMatHTML = '';
        if (otherMaterials.length > 0) {
            otherMatHTML = `<div style="margin-bottom:16px;">
                <h4 style="margin-bottom:8px;color:#92400e;"><i class="fas fa-boxes"></i> Other Materials</h4>
                ${buildMatTable(otherMaterials, [
                    {label:'Material', key:'material', style:'font-weight:600;', render: i => i.material || i.item || '-'},
                    {label:'Specification', key:'specification', style:'font-size:0.78rem;'},
                    {label:'Qty', key:'quantity', align:'right', render: i => fmtNum(i.quantity)},
                    {label:'Unit', key:'unit'},
                    {label:'Notes', key:'notes', style:'font-size:0.75rem;color:#6b7280;'},
                ], '#92400e')}</div>`;
        }

        // Manpower Summary
        const manpower = matSchedule.manpowerSummary || {};
        const crewBreakdown = manpower.crewBreakdown || [];
        let manpowerHTML = '';
        if (manpower.totalLaborHours > 0 || crewBreakdown.length > 0) {
            manpowerHTML = `<div style="margin-top:20px;padding:16px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;">
                <h4 style="margin-bottom:12px;color:#7c3aed;"><i class="fas fa-hard-hat"></i> Manpower / Labor Summary</h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:12px;">
                    <div style="background:#fff;padding:10px;border-radius:8px;text-align:center;border:1px solid #e9d5ff;">
                        <div style="font-size:0.72rem;color:#6b7280;">Total Labor Hours</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#7c3aed;">${fmtNum(manpower.totalLaborHours || 0)}</div>
                    </div>
                    <div style="background:#fff;padding:10px;border-radius:8px;text-align:center;border:1px solid #e9d5ff;">
                        <div style="font-size:0.72rem;color:#6b7280;">Total Labor Cost</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#7c3aed;">${curr}${fmtNum(manpower.totalLaborCost || 0)}</div>
                    </div>
                    <div style="background:#fff;padding:10px;border-radius:8px;text-align:center;border:1px solid #e9d5ff;">
                        <div style="font-size:0.72rem;color:#6b7280;">Total Material Cost</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#1e40af;">${curr}${fmtNum(manpower.totalMaterialCost || 0)}</div>
                    </div>
                    <div style="background:#fff;padding:10px;border-radius:8px;text-align:center;border:1px solid #e9d5ff;">
                        <div style="font-size:0.72rem;color:#6b7280;">Equipment Cost</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#b45309;">${curr}${fmtNum(manpower.totalEquipmentCost || 0)}</div>
                    </div>
                </div>
                ${manpower.estimatedProjectDuration ? `<div style="font-size:0.85rem;color:#475569;margin-bottom:10px;"><i class="fas fa-calendar-alt"></i> Est. Duration: <strong>${manpower.estimatedProjectDuration}</strong></div>` : ''}
                ${crewBreakdown.length > 0 ? `<div style="overflow-x:auto;"><table class="air-line-table" style="font-size:0.82rem;width:100%;">
                    <thead><tr><th>Trade</th><th>Crew</th><th style="text-align:center;">Headcount</th><th style="text-align:center;">Weeks</th><th style="text-align:right;">Labor Hours</th><th style="text-align:right;">Labor Cost</th></tr></thead>
                    <tbody>${crewBreakdown.map(c => `<tr>
                        <td style="font-weight:600;">${c.trade || '-'}</td>
                        <td style="color:#6b7280;">${c.crew || '-'}</td>
                        <td style="text-align:center;">${c.headcount || 0}</td>
                        <td style="text-align:center;">${c.durationWeeks || 0}</td>
                        <td style="text-align:right;">${fmtNum(c.laborHours || 0)}</td>
                        <td style="text-align:right;font-weight:600;">${curr}${fmtNum(c.laborCost || 0)}</td>
                    </tr>`).join('')}</tbody>
                    <tfoot><tr style="background:#f5f3ff;font-weight:700;"><td colspan="4">Total</td><td style="text-align:right;">${fmtNum(manpower.totalLaborHours || 0)}</td><td style="text-align:right;color:#7c3aed;">${curr}${fmtNum(manpower.totalLaborCost || 0)}</td></tr></tfoot>
                </table></div>` : ''}
            </div>`;
        }

        // BOQ Markups
        const markups = matSchedule.boqMarkups || {};
        let markupsHTML = '';
        if (markups.grandTotalWithMarkups > 0 || markups.subtotalDirectCost > 0) {
            const mkItems = [
                {label:'General Conditions', pct:markups.generalConditionsPercent, amt:markups.generalConditions},
                {label:'Overhead', pct:markups.overheadPercent, amt:markups.overhead},
                {label:'Profit', pct:markups.profitPercent, amt:markups.profit},
                {label:'Contingency', pct:markups.contingencyPercent, amt:markups.contingency},
                {label:'Escalation', pct:markups.escalationPercent, amt:markups.escalation},
            ];
            markupsHTML = `<div style="margin-top:20px;padding:16px;background:#fefce8;border:1px solid #fde68a;border-radius:10px;">
                <h4 style="margin-bottom:12px;color:#92400e;"><i class="fas fa-percentage"></i> BOQ Markups & Final Total</h4>
                <div style="display:flex;flex-direction:column;gap:6px;">
                    <div style="display:flex;justify-content:space-between;padding:8px 12px;background:#fff;border-radius:6px;font-weight:600;">
                        <span>Subtotal (Direct Costs)</span><span style="color:#1e40af;">${curr}${fmtNum(markups.subtotalDirectCost || 0)}</span>
                    </div>
                    ${mkItems.filter(m => m.amt > 0 || m.pct > 0).map(m => `<div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:0.88rem;">
                        <span>${m.label} <span style="color:#6b7280;">(${m.pct || 0}%)</span></span><span>${curr}${fmtNum(m.amt || 0)}</span>
                    </div>`).join('')}
                    <div style="display:flex;justify-content:space-between;padding:6px 12px;font-size:0.88rem;border-top:1px solid #fde68a;">
                        <span style="font-weight:600;">Total Markups</span><span style="font-weight:600;">${curr}${fmtNum(markups.totalMarkups || 0)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;padding:10px 12px;background:#92400e;color:#fff;border-radius:6px;font-weight:700;font-size:1.05rem;">
                        <span>Grand Total (with Markups)</span><span>${curr}${fmtNum(markups.grandTotalWithMarkups || 0)}</span>
                    </div>
                </div>
            </div>`;
        }

        const grandMatCost = matSchedule.grandTotalMaterialCost || 0;
        materialScheduleHTML = `
            <div class="air-section">
                <div class="air-section-header">
                    <h3><i class="fas fa-clipboard-list"></i> Complete Material Schedule (BOQ)</h3>
                    <div style="text-align:right;">
                        ${matSchedule.totalMaterialWeight ? `<div style="font-size:0.78rem;color:#475569;">${matSchedule.totalMaterialWeight}</div>` : ''}
                        ${grandMatCost ? `<div style="font-size:1rem;font-weight:700;color:#1e40af;">${curr}${fmtNum(grandMatCost)}</div>` : ''}
                    </div>
                </div>
                ${steelTableHTML}
                ${concreteTableHTML}
                ${mepTableHTML}
                ${archTableHTML}
                ${roofTableHTML}
                ${siteTableHTML}
                ${otherMatHTML}
                ${manpowerHTML}
                ${markupsHTML}
            </div>`;
    }

    // Top 5 trades for visual chart bars
    const sortedTrades = [...(estimate.tradesSummary || [])].sort((a, b) => b.amount - a.amount).slice(0, 8);
    const maxAmt = sortedTrades[0]?.amount || 1;
    let chartBarsHTML = '';
    sortedTrades.forEach((t, i) => {
        const pct = ((t.amount / maxAmt) * 100).toFixed(0);
        const clr = ['#3b82f6','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899','#6366f1'][i % 8];
        chartBarsHTML += `
            <div class="air-chart-bar-row">
                <span class="air-chart-label">${t.tradeName}</span>
                <div class="air-chart-bar-bg"><div class="air-chart-bar-fill" style="width:${pct}%;background:${clr}"></div></div>
                <span class="air-chart-val">${curr}${fmtNum(t.amount)}</span>
            </div>`;
    });

    container.innerHTML = `
        <div class="air-page">
            <div class="portal-breadcrumb-nav">
                <a href="#" onclick="renderAppSection('dashboard'); return false;"><i class="fas fa-home"></i> Dashboard</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <a href="#" onclick="renderAppSection('estimation-tool'); return false;">AI Estimation</a>
                <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
                <span class="breadcrumb-current">Estimate Result</span>
            </div>
            <div class="air-hero">
                <div class="air-hero-glow"></div>
                <div class="air-hero-nav-buttons">
                    <button class="air-back-btn" onclick="renderAppSection('dashboard')"><i class="fas fa-home"></i> Main Portal</button>
                    <button class="air-back-btn" onclick="renderAppSection('estimation-tool')"><i class="fas fa-arrow-left"></i> New Estimate</button>
                    <button class="air-back-btn" onclick="renderAppSection('my-estimations')"><i class="fas fa-list"></i> My Estimations</button>
                </div>
                <div class="air-hero-content">
                    <div class="air-hero-badge"><i class="fas fa-check-circle"></i> AI Estimate Complete</div>
                    <h1 class="air-hero-title">${s.projectTitle || projectInfo.projectTitle}</h1>
                    <p class="air-hero-sub">${s.projectType || ''} ${s.location ? '| ' + s.location : ''}</p>
                </div>
            </div>

            <div class="air-container">
                <!-- Summary Cards with Confidence Ring -->
                <div class="air-summary-top">
                    ${confidenceRingHTML}
                    <div class="air-summary-grid">
                        <div class="air-summary-card air-card-primary">
                            <div class="air-sc-icon"><i class="fas fa-coins"></i></div>
                            <div class="air-sc-label">Grand Total</div>
                            <div class="air-sc-value">${curr}${fmtNum(s.grandTotal)}</div>
                            <div class="air-sc-sub">${s.currency || ''}</div>
                        </div>
                        <div class="air-summary-card air-card-indigo">
                            <div class="air-sc-icon"><i class="fas fa-ruler-combined"></i></div>
                            <div class="air-sc-label">Rate / sq ft</div>
                            <div class="air-sc-value">${curr}${fmtNum(s.costPerSqFt || s.costPerUnit)}</div>
                            <div class="air-sc-sub">${s.areaSqFt ? fmtNum(s.areaSqFt) + ' sq ft' : 'per sq ft'}</div>
                        </div>
                        <div class="air-summary-card air-card-teal">
                            <div class="air-sc-icon"><i class="fas fa-ruler"></i></div>
                            <div class="air-sc-label">Rate / sq m</div>
                            <div class="air-sc-value">${curr}${fmtNum(s.costPerSqM || Math.round((s.costPerUnit || 0) * 10.7639))}</div>
                            <div class="air-sc-sub">${s.areaSqM ? fmtNum(s.areaSqM) + ' sq m' : 'per sq m'}</div>
                        </div>
                        <div class="air-summary-card air-card-green">
                            <div class="air-sc-icon"><i class="fas fa-chart-pie"></i></div>
                            <div class="air-sc-label">Total Area</div>
                            <div class="air-sc-value">${s.totalArea || 'N/A'}</div>
                            <div class="air-sc-sub">${s.estimateClass || ''}</div>
                        </div>
                        <div class="air-summary-card air-card-amber">
                            <div class="air-sc-icon"><i class="fas fa-signal"></i></div>
                            <div class="air-sc-label">Confidence</div>
                            <div class="air-sc-value">${confidenceLevel || 'Medium'}</div>
                            <div class="air-sc-sub">${s.estimateDate || new Date().toLocaleDateString()}</div>
                        </div>
                    </div>
                </div>
                ${multiPassBarHTML}
                ${benchmarkHTML}
                ${rateSourceHTML}
                ${confidenceFactorsHTML}
                ${validationHTML}

                <!-- Cost Distribution Chart -->
                <div class="air-section">
                    <div class="air-section-header">
                        <h3><i class="fas fa-chart-bar"></i> Cost Distribution by Trade</h3>
                    </div>
                    <div class="air-chart-container">${chartBarsHTML}</div>
                </div>

                <!-- Cost Breakdown -->
                <div class="air-section">
                    <div class="air-section-header">
                        <h3><i class="fas fa-layer-group"></i> Cost Breakdown & Markups</h3>
                    </div>
                    <div class="air-breakdown">${breakdownHTML}</div>
                </div>

                <!-- Material Schedule (BOQ) -->
                ${materialScheduleHTML}

                <!-- Drawing Extraction (Vision Analysis) -->
                ${drawingExtraction.dimensionsFound && drawingExtraction.dimensionsFound.length > 0 ? `
                <div class="air-section">
                    <div class="air-section-header">
                        <h3><i class="fas fa-ruler-combined"></i> Drawing Analysis - Extracted Dimensions</h3>
                        <span class="air-vision-badge" style="background:#10b981;color:#fff;padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">VISION ANALYZED</span>
                    </div>
                    ${structuralAnalysis.analysisMethod ? `<div style="padding:8px 16px;background:#ecfdf5;color:#065f46;border-radius:8px;margin-bottom:12px;font-size:0.85rem;"><i class="fas fa-eye"></i> ${structuralAnalysis.analysisMethod}</div>` : ''}
                    ${structuralAnalysis.filesAnalyzed && structuralAnalysis.filesAnalyzed.length > 0 ? `<div style="padding:6px 16px;color:#6b7280;font-size:0.8rem;margin-bottom:10px;"><i class="fas fa-file-pdf"></i> Files analyzed: ${structuralAnalysis.filesAnalyzed.join(', ')}</div>` : ''}
                    <div class="air-structural-grid">
                        ${drawingExtraction.dimensionsFound && drawingExtraction.dimensionsFound.length > 0 ? `<div class="air-struct-item" style="grid-column:span 2;"><div class="air-struct-icon"><i class="fas fa-ruler"></i></div><div><strong>Dimensions Found</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.dimensionsFound.map(d => `<li style="font-size:0.85rem;">${d}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.memberSizesFound && drawingExtraction.memberSizesFound.length > 0 ? `<div class="air-struct-item" style="grid-column:span 2;"><div class="air-struct-icon"><i class="fas fa-columns"></i></div><div><strong>Member Sizes Found</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.memberSizesFound.map(m => `<li style="font-size:0.85rem;">${m}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.schedulesFound && drawingExtraction.schedulesFound.length > 0 ? `<div class="air-struct-item" style="grid-column:span 2;"><div class="air-struct-icon"><i class="fas fa-table"></i></div><div><strong>Schedules Found</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.schedulesFound.map(s => `<li style="font-size:0.85rem;">${s}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.materialsNoted && drawingExtraction.materialsNoted.length > 0 ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-flask"></i></div><div><strong>Materials Noted</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.materialsNoted.map(m => `<li style="font-size:0.85rem;">${m}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.designLoads && drawingExtraction.designLoads.length > 0 ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-weight-hanging"></i></div><div><strong>Design Loads</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.designLoads.map(l => `<li style="font-size:0.85rem;">${l}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.sheetsAnalyzed && drawingExtraction.sheetsAnalyzed.length > 0 ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-file-alt"></i></div><div><strong>Sheets Analyzed</strong><ul style="margin:4px 0;padding-left:18px;">${drawingExtraction.sheetsAnalyzed.map(s => `<li style="font-size:0.85rem;">${s}</li>`).join('')}</ul></div></div>` : ''}
                        ${drawingExtraction.scaleUsed ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-expand-arrows-alt"></i></div><div><strong>Drawing Scale</strong><p>${drawingExtraction.scaleUsed}</p></div></div>` : ''}
                        ${drawingExtraction.totalMembersCount ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-calculator"></i></div><div><strong>Members Count</strong><p>Beams: ${drawingExtraction.totalMembersCount.beams || 0} | Columns: ${drawingExtraction.totalMembersCount.columns || 0} | Bracing: ${drawingExtraction.totalMembersCount.bracing || 0} | Joists: ${drawingExtraction.totalMembersCount.joists || 0}</p></div></div>` : ''}
                    </div>
                </div>` : ''}

                <!-- Structural Analysis -->
                ${structuralAnalysis.structuralSystem || structuralAnalysis.foundationType ? `
                <div class="air-section">
                    <div class="air-section-header"><h3><i class="fas fa-drafting-compass"></i> Structural Analysis</h3></div>
                    <div class="air-structural-grid">
                        ${structuralAnalysis.structuralSystem ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-building"></i></div><div><strong>Structural System</strong><p>${structuralAnalysis.structuralSystem}</p></div></div>` : ''}
                        ${structuralAnalysis.foundationType ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-mountain"></i></div><div><strong>Foundation Type</strong><p>${structuralAnalysis.foundationType}</p></div></div>` : ''}
                        ${structuralAnalysis.primaryMembers ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-columns"></i></div><div><strong>Primary Members</strong><p>${structuralAnalysis.primaryMembers}</p></div></div>` : ''}
                        ${structuralAnalysis.secondaryMembers ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-grip-lines"></i></div><div><strong>Secondary Members</strong><p>${structuralAnalysis.secondaryMembers}</p></div></div>` : ''}
                        ${structuralAnalysis.connectionTypes ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-link"></i></div><div><strong>Connection Types</strong><p>${structuralAnalysis.connectionTypes}</p></div></div>` : ''}
                        ${structuralAnalysis.steelTonnage ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-weight-hanging"></i></div><div><strong>Steel Tonnage</strong><p>${structuralAnalysis.steelTonnage}</p></div></div>` : ''}
                        ${structuralAnalysis.concreteVolume ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-cube"></i></div><div><strong>Concrete Volume</strong><p>${structuralAnalysis.concreteVolume}</p></div></div>` : ''}
                        ${structuralAnalysis.rebarTonnage ? `<div class="air-struct-item"><div class="air-struct-icon"><i class="fas fa-bars"></i></div><div><strong>Rebar Tonnage</strong><p>${structuralAnalysis.rebarTonnage}</p></div></div>` : ''}
                    </div>
                    ${structuralAnalysis.drawingNotes ? `<div class="air-drawing-notes"><i class="fas fa-file-alt"></i> <strong>Drawing Analysis:</strong> ${structuralAnalysis.drawingNotes}</div>` : ''}
                </div>` : ''}

                <!-- Benchmark Check -->
                ${s.benchmarkCheck ? `
                <div class="air-section">
                    <div class="air-section-header"><h3><i class="fas fa-check-circle"></i> Cost Benchmark</h3></div>
                    <div class="air-drawing-notes" style="color:#059669"><i class="fas fa-chart-bar"></i> ${s.benchmarkCheck}</div>
                </div>` : ''}

                <!-- Trade Details -->
                <div class="air-section">
                    <div class="air-section-header">
                        <h3><i class="fas fa-hard-hat"></i> Detailed Trade Breakdown</h3>
                        <span class="air-trade-count">${trades.length} Trades</span>
                    </div>
                    <div class="air-trades-list">${tradesHTML}</div>
                </div>

                <!-- Market Insights -->
                ${insights.regionalFactor || insights.materialTrends || insights.laborMarket ? `
                <div class="air-section">
                    <div class="air-section-header"><h3><i class="fas fa-globe"></i> Market Insights</h3></div>
                    <div class="air-insights-grid">
                        ${insights.regionalFactor ? `<div class="air-insight-card"><div class="air-insight-icon"><i class="fas fa-map-marker-alt"></i></div><h4>Regional Factor</h4><p>${insights.regionalFactor}</p></div>` : ''}
                        ${insights.materialTrends ? `<div class="air-insight-card"><div class="air-insight-icon"><i class="fas fa-chart-line"></i></div><h4>Material Trends</h4><p>${insights.materialTrends}</p></div>` : ''}
                        ${insights.laborMarket ? `<div class="air-insight-card"><div class="air-insight-icon"><i class="fas fa-users"></i></div><h4>Labor Market</h4><p>${insights.laborMarket}</p></div>` : ''}
                    </div>
                </div>` : ''}

                <!-- Assumptions, Exclusions, Notes -->
                <div class="air-info-grid">
                    ${assumptions.length ? `<div class="air-info-card"><h4><i class="fas fa-clipboard-check"></i> Key Assumptions</h4><ul>${assumptions.map(a => `<li>${a}</li>`).join('')}</ul></div>` : ''}
                    ${exclusions.length ? `<div class="air-info-card air-info-warn"><h4><i class="fas fa-exclamation-triangle"></i> Exclusions</h4><ul>${exclusions.map(e => `<li>${e}</li>`).join('')}</ul></div>` : ''}
                    ${notes.length ? `<div class="air-info-card air-info-blue"><h4><i class="fas fa-info-circle"></i> Important Notes</h4><ul>${notes.map(n => `<li>${n}</li>`).join('')}</ul></div>` : ''}
                </div>

                <!-- Actions -->
                <div class="air-actions">
                    <button class="air-action-btn air-btn-primary" onclick="printAIEstimate()"><i class="fas fa-print"></i> Print Estimate</button>
                    <button class="air-action-btn air-btn-secondary" onclick="renderAppSection('estimation-tool')"><i class="fas fa-plus"></i> New Estimate</button>
                    <button class="air-action-btn air-btn-secondary" onclick="renderAppSection('dashboard')"><i class="fas fa-home"></i> Back to Dashboard</button>
                </div>

                <div class="air-footer">
                    <p><i class="fas fa-robot"></i> This estimate was generated by SteelConnect AI and should be validated by a qualified estimator for final budgeting.</p>
                </div>
            </div>
        </div>`;
}

function fmtNum(n) {
    if (n === undefined || n === null) return '0';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    if (isNaN(num)) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function printAIEstimate() {
    window.print();
}

function showNotification(message, type = 'info', duration = 4000) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        container.style.zIndex = '10001';
        document.body.appendChild(container);
    }
    const notif = document.createElement('div');
    notif.className = `notification premium-notification notification-${type}`;
    notif.innerHTML = `
        <div class="notif-icon-area"><i class="fas ${getNotificationIcon(type)}"></i></div>
        <div class="notification-content"><span>${message}</span></div>
        <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
        ${duration > 0 ? `<div class="notif-progress" style="animation-duration:${duration}ms"></div>` : ''}`;
    container.appendChild(notif);

    if (duration > 0) {
        setTimeout(() => {
            if (notif.parentElement) {
                notif.style.opacity = '0';
                notif.style.transform = 'translateX(20px)';
                setTimeout(() => notif.remove(), 300);
            }
        }, duration);
    }
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
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Welcome Back</h2><p>Sign in to your account</p></div><div id="auth-error-container"></div><form id="login-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button></form><div class="auth-forgot-password"><a onclick="renderAuthForm('forgot-password')"><i class="fas fa-key"></i> Forgot Password?</a></div><div class="auth-divider"><span>or</span></div><button type="button" id="google-login-btn" class="btn-google"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google</button><div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')">Create one</a></div>`;
}

function showTermsConditionsModal(tab = 'terms') {
    const termsContent = `
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing and using the SteelConnect platform ("Platform"), you agree to be bound by these Terms & Conditions ("Terms"). If you do not agree to these Terms, you must not use the Platform.</p>

        <h3>2. Platform Description</h3>
        <p>SteelConnect is a professional marketplace that connects steel designers, structural engineers, and contractors. The Platform provides AI-powered estimation tools, project management features, and communication services for the structural steel industry.</p>

        <h3>3. User Accounts</h3>
        <p>You must provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must notify us immediately of any unauthorized use of your account.</p>

        <h3>4. User Conduct</h3>
        <p>You agree not to:</p>
        <ul>
            <li>Provide false or misleading information in your profile or project listings</li>
            <li>Use the Platform for any unlawful or fraudulent purpose</li>
            <li>Interfere with or disrupt the Platform's functionality or security</li>
            <li>Attempt to gain unauthorized access to other user accounts or Platform systems</li>
            <li>Scrape, harvest, or collect information from the Platform without authorization</li>
            <li>Upload malicious files, viruses, or harmful content</li>
        </ul>

        <h3>5. Projects & Quotes</h3>
        <p>All project listings and quotes submitted through the Platform are subject to review. SteelConnect does not guarantee the accuracy of AI-generated estimations. Users are responsible for verifying all cost estimates and project details independently before making business decisions.</p>

        <h3>6. Intellectual Property</h3>
        <p>All content, trademarks, and technology on the Platform are owned by SteelConnect. Users retain ownership of their uploaded content but grant SteelConnect a license to use it for Platform operations. You must not reproduce or distribute Platform content without authorization.</p>

        <h3>7. Payment & Subscriptions</h3>
        <p>Certain features may require a paid subscription. Subscription fees are non-refundable unless otherwise specified. SteelConnect reserves the right to modify pricing with reasonable notice to affected users.</p>

        <h3>8. Limitation of Liability</h3>
        <p>SteelConnect provides the Platform "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform, including but not limited to losses from reliance on AI estimations or project outcomes.</p>

        <h3>9. Termination</h3>
        <p>SteelConnect may suspend or terminate your account for violations of these Terms or for any reason with reasonable notice. Upon termination, your right to access the Platform ceases immediately.</p>

        <h3>10. Modifications</h3>
        <p>We reserve the right to update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the revised Terms. Material changes will be communicated via email or Platform notification.</p>

        <h3>11. Governing Law</h3>
        <p>These Terms are governed by applicable law. Any disputes shall be resolved through binding arbitration or in the courts of the jurisdiction where SteelConnect operates.</p>

        <h3>12. Contact</h3>
        <p>For questions about these Terms, contact us at <strong>legal@steelconnectapp.com</strong>.</p>
    `;

    const privacyContent = `
        <h3>1. Information We Collect</h3>
        <p>We collect information you provide during registration (name, email, professional details), project data you submit, usage analytics, device information, and cookies to operate and improve the Platform.</p>

        <h3>2. How We Use Your Information</h3>
        <ul>
            <li>To provide and maintain Platform services</li>
            <li>To process your projects, quotes, and AI estimations</li>
            <li>To communicate with you about your account and Platform updates</li>
            <li>To improve our AI estimation accuracy and Platform features</li>
            <li>To ensure Platform security and prevent fraud</li>
            <li>To comply with legal obligations</li>
        </ul>

        <h3>3. Data Sharing</h3>
        <p>We do not sell your personal information. We may share data with: service providers who assist Platform operations, other users as necessary for project collaboration (e.g., your profile is visible to potential project partners), and law enforcement when required by law.</p>

        <h3>4. Data Security</h3>
        <p>We implement industry-standard security measures including encryption, secure authentication (OTP verification), and access controls. However, no method of electronic transmission is 100% secure, and we cannot guarantee absolute security.</p>

        <h3>5. Data Retention</h3>
        <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data by contacting our support team.</p>

        <h3>6. Your Rights</h3>
        <p>You have the right to access, correct, or delete your personal data. You may opt out of non-essential communications. To exercise these rights, contact us at <strong>privacy@steelconnectapp.com</strong>.</p>

        <h3>7. Cookies</h3>
        <p>We use essential cookies for Platform functionality and analytics cookies to understand usage patterns. You can manage cookie preferences through your browser settings.</p>

        <h3>8. Updates to This Policy</h3>
        <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or Platform notification. Continued use after changes constitutes acceptance.</p>

        <h3>9. Contact</h3>
        <p>For privacy-related inquiries, contact us at <strong>privacy@steelconnectapp.com</strong>.</p>
    `;

    const activeTerms = tab === 'terms' ? 'active' : '';
    const activePrivacy = tab === 'privacy' ? 'active' : '';

    const modalHTML = `
        <div class="terms-modal-header">
            <div class="terms-modal-icon"><i class="fas fa-file-contract"></i></div>
            <h2>Legal Agreements</h2>
            <p>Please review our terms before proceeding</p>
        </div>
        <div class="terms-tabs">
            <button class="terms-tab ${activeTerms}" onclick="switchTermsTab('terms')"><i class="fas fa-gavel"></i> Terms &amp; Conditions</button>
            <button class="terms-tab ${activePrivacy}" onclick="switchTermsTab('privacy')"><i class="fas fa-shield-alt"></i> Privacy Policy</button>
        </div>
        <div class="terms-content-scroll">
            <div id="terms-tab-content" class="terms-body ${activeTerms ? '' : 'hidden'}">${termsContent}</div>
            <div id="privacy-tab-content" class="terms-body ${activePrivacy ? '' : 'hidden'}">${privacyContent}</div>
        </div>
        <div class="terms-modal-footer">
            <span class="terms-version"><i class="fas fa-info-circle"></i> Version 1.0 &mdash; Last updated February 2026</span>
            <button class="btn btn-primary" onclick="closeTermsConditionsModal()"><i class="fas fa-check"></i> I Understand</button>
        </div>
    `;

    // Create a dedicated terms modal overlay (separate from auth modal)
    let termsOverlay = document.getElementById('terms-modal-overlay');
    if (!termsOverlay) {
        termsOverlay = document.createElement('div');
        termsOverlay.id = 'terms-modal-overlay';
        document.body.appendChild(termsOverlay);
    }
    termsOverlay.innerHTML = `
        <div class="terms-modal-backdrop" onclick="closeTermsConditionsModal()"></div>
        <div class="terms-modal-dialog" onclick="event.stopPropagation()">
            <button class="terms-modal-close" onclick="closeTermsConditionsModal()"><i class="fas fa-times"></i></button>
            ${modalHTML}
        </div>
    `;
    termsOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function switchTermsTab(tab) {
    const termsTab = document.getElementById('terms-tab-content');
    const privacyTab = document.getElementById('privacy-tab-content');
    const tabs = document.querySelectorAll('.terms-tab');

    if (tab === 'terms') {
        termsTab.classList.remove('hidden');
        privacyTab.classList.add('hidden');
        tabs[0].classList.add('active');
        tabs[1].classList.remove('active');
    } else {
        termsTab.classList.add('hidden');
        privacyTab.classList.remove('hidden');
        tabs[0].classList.remove('active');
        tabs[1].classList.add('active');
    }
}

function closeTermsConditionsModal() {
    const overlay = document.getElementById('terms-modal-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.innerHTML = ''; }, 300);
    }
    document.body.style.overflow = '';
}

function getForgotPasswordTemplate() {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-key"></i></div><h2>Forgot Password</h2><p>Enter your email to receive a reset code</p></div><div id="auth-error-container"></div><div id="auth-success-container"></div><form id="forgot-password-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input" name="resetEmail" required placeholder="Enter your registered email"></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-paper-plane"></i> Send Reset Code</button></form><div class="auth-switch">Remember your password? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getOTPVerifyTemplate() {
    const maskedEmail = (window._otpEmail || '').replace(/(.{2})(.*)(@.*)/, '$1***$3');
    return `<div class="auth-header premium-auth-header"><div class="auth-logo otp-logo"><i class="fas fa-shield-alt"></i></div><h2>Verify Your Identity</h2><p>Enter the 6-digit code sent to <strong>${maskedEmail}</strong></p></div><div id="auth-error-container"></div><div id="auth-success-container"></div><form id="otp-verify-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-hashtag"></i> Verification Code</label><input type="text" class="form-input otp-code-input" name="otpCode" required placeholder="Enter 6-digit code" maxlength="6" autocomplete="one-time-code" inputmode="numeric"></div><div class="otp-timer-info"><i class="fas fa-clock"></i> Code expires in 5 minutes</div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-check-circle"></i> Verify & Sign In</button></form><div class="auth-switch">Didn't receive the code? <a onclick="resendOTP()">Resend Code</a> | <a onclick="renderAuthForm('login')">Back to Login</a></div>`;
}

function getResetPasswordTemplate(email) {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-shield-alt"></i></div><h2>Reset Password</h2><p>Enter the code sent to your email</p></div><div id="auth-error-container"></div><div id="auth-success-container"></div><form id="reset-password-form" class="premium-form"><input type="hidden" name="resetEmail" value="${email}"><div class="form-group"><label class="form-label"><i class="fas fa-hashtag"></i> Verification Code</label><input type="text" class="form-input reset-code-input" name="resetCode" required placeholder="Enter 6-digit code" maxlength="6" autocomplete="off"></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> New Password</label><input type="password" class="form-input" name="newPassword" required placeholder="Enter new password (min 6 chars)" minlength="6"></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Confirm Password</label><input type="password" class="form-input" name="confirmPassword" required placeholder="Confirm new password" minlength="6"></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-check-circle"></i> Reset Password</button></form><div class="auth-switch">Didn't receive the code? <a onclick="renderAuthForm('forgot-password')">Resend</a> | <a onclick="renderAuthForm('login')">Back to Login</a></div>`;
}

function getRegisterTemplate() {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Join SteelConnect</h2><p>Create your professional account</p></div><div id="auth-error-container"></div><form id="register-form" class="premium-form"><div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><div class="terms-checkbox-group"><label class="terms-checkbox-label"><input type="checkbox" name="termsAccepted" id="termsAcceptedCheckbox" class="terms-checkbox-input"><span class="terms-checkbox-custom"><i class="fas fa-check"></i></span><span class="terms-checkbox-text">I agree to the <a href="javascript:void(0)" onclick="event.preventDefault();event.stopPropagation();showTermsConditionsModal('terms')" class="terms-link">Terms &amp; Conditions</a> and <a href="javascript:void(0)" onclick="event.preventDefault();event.stopPropagation();showTermsConditionsModal('privacy')" class="terms-link">Privacy Policy</a></span></label><div id="terms-error" class="terms-error-msg" style="display:none;"><i class="fas fa-exclamation-circle"></i> You must accept the Terms &amp; Conditions to continue</div></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button></form><div class="auth-divider"><span>or</span></div><button type="button" id="google-register-btn" class="btn-google"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign up with Google</button><div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getGoogleRoleSelectTemplate() {
    return `<div class="auth-header premium-auth-header"><div class="auth-logo google-logo"><svg viewBox="0 0 24 24" width="32" height="32"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg></div><h2>Complete Your Profile</h2><p>Select your role to finish signing up with Google</p></div><div id="auth-error-container"></div><form id="google-role-form" class="premium-form"><div class="google-role-cards"><label class="google-role-card"><input type="radio" name="googleRole" value="contractor" class="google-role-radio"><div class="google-role-card-inner"><div class="google-role-icon"><i class="fas fa-hard-hat"></i></div><h4>Client / Contractor</h4><p>I need steel design & engineering services</p></div></label><label class="google-role-card"><input type="radio" name="googleRole" value="designer" class="google-role-radio"><div class="google-role-card-inner"><div class="google-role-icon"><i class="fas fa-drafting-compass"></i></div><h4>Designer / Engineer</h4><p>I provide steel design & engineering services</p></div></label></div><div class="terms-checkbox-group"><label class="terms-checkbox-label"><input type="checkbox" name="googleTermsAccepted" id="googleTermsCheckbox" class="terms-checkbox-input"><span class="terms-checkbox-custom"><i class="fas fa-check"></i></span><span class="terms-checkbox-text">I agree to the <a href="javascript:void(0)" onclick="event.preventDefault();event.stopPropagation();showTermsConditionsModal(\'terms\')" class="terms-link">Terms &amp; Conditions</a> and <a href="javascript:void(0)" onclick="event.preventDefault();event.stopPropagation();showTermsConditionsModal(\'privacy\')" class="terms-link">Privacy Policy</a></span></label><div id="google-terms-error" class="terms-error-msg" style="display:none;"><i class="fas fa-exclamation-circle"></i> You must accept the Terms &amp; Conditions to continue</div></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-check-circle"></i> Continue with Google</button></form><div class="auth-switch">Want to use email instead? <a onclick="renderAuthForm(\'register\')">Create Account</a> | <a onclick="renderAuthForm(\'login\')">Sign In</a></div>`;
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
                        <small class="form-help">Upload up to 10 files, 50MB each. Supported formats: PDF, DOC, DWG, Images</small>
                    </div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div class="portal-breadcrumb-nav">
            <a href="#" onclick="renderAppSection('dashboard'); return false;"><i class="fas fa-home"></i> Dashboard</a>
            <span class="breadcrumb-sep"><i class="fas fa-chevron-right"></i></span>
            <span class="breadcrumb-current">AI Estimation</span>
        </div>
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="est-hero">
            <div class="est-hero-glow"></div>
            <div class="est-hero-content">
                <button class="est-back-to-portal-btn" onclick="renderAppSection('dashboard')"><i class="fas fa-arrow-left"></i> Back to Main Portal</button>
                <div class="est-hero-badge"><i class="fas fa-bolt"></i> AI-Powered</div>
                <h1 class="est-hero-title">Smart Cost Estimation</h1>
                <p class="est-hero-subtitle">Upload your project drawings and receive an accurate, AI-generated cost breakdown from our engineering experts</p>
            </div>
        </div>
        <div class="estimation-tool-container premium-estimation-container">
            <div class="est-steps-bar">
                <div class="est-step active" data-step="1">
                    <div class="est-step-circle"><span>1</span></div>
                    <div class="est-step-label">Upload Files <span class="est-req-dot">*</span></div>
                </div>
                <div class="est-step-line"></div>
                <div class="est-step" data-step="2">
                    <div class="est-step-circle"><span>2</span></div>
                    <div class="est-step-label">Project Details <span class="est-req-dot">*</span></div>
                </div>
                <div class="est-step-line"></div>
                <div class="est-step" data-step="3">
                    <div class="est-step-circle"><span>3</span></div>
                    <div class="est-step-label">Submit & Track</div>
                </div>
            </div>
            <form id="estimation-form" class="premium-estimation-form">
                <div class="est-card">
                    <div class="est-card-header">
                        <div class="est-card-icon blue"><i class="fas fa-cloud-upload-alt"></i></div>
                        <div>
                            <h3>Upload Project Files <span class="est-mandatory">* Required</span></h3>
                            <p class="est-card-desc">Upload your PDF drawings, blueprints, or project documents for analysis</p>
                        </div>
                    </div>
                    <div class="file-upload-section premium-upload-section">
                        <div id="file-upload-area" class="file-upload-area premium-upload-area">
                            <input type="file" id="file-upload-input" accept=".pdf,.dwg,.dxf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.tif,.tiff,.txt,.zip,.rar" multiple onchange="handleFileSelect(this.files); this.value='';" />
                            <div class="upload-content" style="pointer-events:none;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:3rem 2rem;min-height:280px;margin:0;">
                                <div class="est-upload-icon-wrap"><i class="fas fa-cloud-upload-alt"></i></div>
                                <h3 style="margin:0.5rem 0">Drag & Drop Files Here</h3>
                                <p style="margin:0.5rem 0">or <span class="est-browse-link">click to browse</span> from your computer</p>
                                <div class="est-format-tags">
                                    <span class="est-format-tag pdf"><i class="fas fa-file-pdf"></i> PDF</span>
                                    <span class="est-format-tag dwg"><i class="fas fa-drafting-compass"></i> DWG</span>
                                    <span class="est-format-tag doc"><i class="fas fa-file-word"></i> DOC</span>
                                    <span class="est-format-tag xls"><i class="fas fa-file-excel"></i> XLS</span>
                                    <span class="est-format-tag img"><i class="fas fa-file-image"></i> IMG</span>
                                </div>
                                <small class="upload-limit"><i class="fas fa-info-circle"></i> Max 20 files, 50MB each. PDF, DWG, DOC, XLS, Images & more.</small>
                            </div>
                        </div>
                        <div id="file-info-container" class="selected-files-container" style="display: none;">
                            <h4><i class="fas fa-paperclip"></i> Selected Files</h4>
                            <div id="selected-files-list" class="selected-files-list"></div>
                        </div>
                    </div>
                </div>

                <div class="est-card">
                    <div class="est-card-header">
                        <div class="est-card-icon indigo"><i class="fas fa-clipboard-list"></i></div>
                        <div>
                            <h3>Project Information <span class="est-mandatory">* Required</span></h3>
                            <p class="est-card-desc">Provide details about your project to help us deliver an accurate estimate</p>
                        </div>
                    </div>
                    <div class="est-form-body">
                        <div class="form-group">
                            <label class="form-label est-label">Project Title <span class="est-req-star">*</span></label>
                            <input type="text" class="form-input premium-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework" />
                            <small class="est-field-hint">Give your project a clear, descriptive name</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label est-label">Project Description <span class="est-req-star">*</span></label>
                            <textarea class="form-textarea premium-textarea" name="description" required rows="5" placeholder="Describe the scope, materials, dimensions, and any special requirements for your project..."></textarea>
                            <small class="est-field-hint">The more detail you provide, the more accurate your estimate will be</small>
                        </div>
                        <div class="est-form-row">
                            <div class="form-group">
                                <label class="form-label est-label">Design Standard <span class="est-req-star">*</span></label>
                                <select class="form-input premium-input est-select" name="designStandard" required>
                                    <option value="">-- Select Design Standard --</option>
                                    <optgroup label="North America">
                                        <option value="AISC 360">AISC 360 - Steel Construction (USA)</option>
                                        <option value="AISC 341">AISC 341 - Seismic Steel (USA)</option>
                                        <option value="ACI 318">ACI 318 - Concrete Design (USA)</option>
                                        <option value="ASCE 7">ASCE 7 - Loads & Structural (USA)</option>
                                        <option value="CSA S16">CSA S16 - Steel Structures (Canada)</option>
                                        <option value="CSA A23.3">CSA A23.3 - Concrete (Canada)</option>
                                        <option value="IBC">IBC - International Building Code</option>
                                    </optgroup>
                                    <optgroup label="Europe">
                                        <option value="Eurocode 3">Eurocode 3 (EN 1993) - Steel</option>
                                        <option value="Eurocode 2">Eurocode 2 (EN 1992) - Concrete</option>
                                        <option value="Eurocode 1">Eurocode 1 (EN 1991) - Actions/Loads</option>
                                        <option value="Eurocode 8">Eurocode 8 (EN 1998) - Seismic</option>
                                        <option value="BS 5950">BS 5950 - British Steel (Legacy)</option>
                                    </optgroup>
                                    <optgroup label="India & Asia">
                                        <option value="IS 800">IS 800 - Steel Structures (India)</option>
                                        <option value="IS 456">IS 456 - Concrete Design (India)</option>
                                        <option value="IS 1893">IS 1893 - Seismic Design (India)</option>
                                        <option value="JIS">JIS - Japanese Industrial Standard</option>
                                        <option value="GB 50017">GB 50017 - Steel Structures (China)</option>
                                        <option value="KBC">KBC - Korean Building Code</option>
                                    </optgroup>
                                    <optgroup label="Oceania & Middle East">
                                        <option value="AS 4100">AS 4100 - Steel Structures (Australia)</option>
                                        <option value="NZS 3404">NZS 3404 - Steel Structures (NZ)</option>
                                        <option value="SBC">SBC - Saudi Building Code</option>
                                        <option value="UAE Fire Code">UAE Fire & Life Safety Code</option>
                                    </optgroup>
                                    <optgroup label="Other">
                                        <option value="SANS 10162">SANS 10162 - Steel (South Africa)</option>
                                        <option value="NBR 8800">NBR 8800 - Steel (Brazil)</option>
                                        <option value="Other">Other / Multiple Standards</option>
                                    </optgroup>
                                </select>
                                <small class="est-field-hint">Select the primary design code for your project region</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label est-label">Project Type</label>
                                <select class="form-input premium-input est-select" name="projectType">
                                    <option value="">-- Select Type --</option>
                                    <option value="Commercial">Commercial Building</option>
                                    <option value="Industrial">Industrial / Warehouse</option>
                                    <option value="Residential">Residential</option>
                                    <option value="Infrastructure">Infrastructure / Bridge</option>
                                    <option value="Institutional">Institutional (School, Hospital)</option>
                                    <option value="Mixed-Use">Mixed-Use Development</option>
                                    <option value="Renovation">Renovation / Retrofit</option>
                                    <option value="Heavy Industrial">Heavy Industrial / Plant</option>
                                    <option value="Other">Other</option>
                                </select>
                                <small class="est-field-hint">Type of construction project</small>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label est-label">Region / Location</label>
                            <input type="text" class="form-input premium-input" name="region" placeholder="e.g., California, USA / Dubai, UAE / Mumbai, India" />
                            <small class="est-field-hint">Helps AI apply regional cost factors & labor rates</small>
                        </div>
                    </div>
                </div>

                <div class="est-info-banner">
                    <div class="est-info-icon"><i class="fas fa-robot"></i></div>
                    <div>
                        <strong>AI-Powered:</strong> Your files will be securely uploaded and an <b>instant AI cost estimate</b> will be generated automatically. Our engineering team will review and send you the final report.
                    </div>
                </div>

                <div class="est-submit-section">
                    <button type="button" id="submit-estimation-btn" class="est-submit-btn" disabled>
                        <i class="fas fa-paper-plane"></i> Submit Estimation Request
                    </button>
                    <p class="est-submit-note"><i class="fas fa-lock"></i> Your files are securely uploaded and AI cost estimate is generated automatically</p>
                </div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name ? user.name.split(' ')[0] : 'User';
    const fullName = user.name || 'User';
    const profileStatus = user.profileStatus || 'incomplete';
    const isApproved = profileStatus === 'approved';
    const avatarColor = getAvatarColor(fullName);
    const initial = fullName.charAt(0).toUpperCase();

    let profileStatusCard = '';
    if (profileStatus === 'incomplete') profileStatusCard = `<div class="db-status-card db-status-warning"><div class="db-status-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="db-status-info"><h4>Complete Your Profile</h4><p>Complete your profile to unlock all platform features and start ${isContractor ? 'posting projects' : 'submitting quotes'}.</p></div><button class="db-status-btn" onclick="renderAppSection('profile-completion')"><i class="fas fa-user-edit"></i> Complete Now</button></div>`;
    else if (profileStatus === 'pending') profileStatusCard = `<div class="db-status-card db-status-info-state"><div class="db-status-icon"><i class="fas fa-clock"></i></div><div class="db-status-info"><h4>Profile Under Review</h4><p>Your profile is being reviewed by our team. You'll get full access once approved.</p></div><div style="display:flex;align-items:center;gap:10px;"><button class="db-status-btn" onclick="renderAppSection('profile-completion')" style="white-space:nowrap;"><i class="fas fa-eye"></i> View Profile</button><div class="db-status-badge"><i class="fas fa-hourglass-half"></i> Reviewing</div></div></div>`;
    else if (profileStatus === 'rejected') profileStatusCard = `<div class="db-status-card db-status-danger"><div class="db-status-icon"><i class="fas fa-exclamation-circle"></i></div><div class="db-status-info"><h4>Profile Needs Update</h4><p>Please update your profile. ${user.rejectionReason ? `<strong>Reason:</strong> ${user.rejectionReason}` : 'Review the feedback and resubmit.'}</p></div><button class="db-status-btn db-btn-danger" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Update Profile</button></div>`;

    // Quick action cards for contractor
    const contractorQuickActions = `
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'post-job\')' : 'showRestrictedFeature(\'post-job\')'}">
            <div class="db-action-icon db-icon-blue"><i class="fas fa-plus-circle"></i></div>
            <div class="db-action-text"><h4>Create Project</h4><p>Post a new listing</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'jobs\')' : 'showRestrictedFeature(\'jobs\')'}">
            <div class="db-action-icon db-icon-indigo"><i class="fas fa-tasks"></i></div>
            <div class="db-action-text"><h4>My Projects</h4><p>Manage your listings</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'estimation-tool\')' : 'showRestrictedFeature(\'estimation-tool\')'}">
            <div class="db-action-icon db-icon-violet"><i class="fas fa-robot"></i></div>
            <div class="db-action-text"><h4>AI Estimation</h4><p>Smart cost estimates</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'approved-jobs\')' : 'showRestrictedFeature(\'approved-jobs\')'}">
            <div class="db-action-icon db-icon-green"><i class="fas fa-check-double"></i></div>
            <div class="db-action-text"><h4>Approved</h4><p>Track assigned work</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'project-tracking\')' : 'showRestrictedFeature(\'project-tracking\')'}">
            <div class="db-action-icon db-icon-cyan"><i class="fas fa-project-diagram"></i></div>
            <div class="db-action-text"><h4>Project Tracking</h4><p>Status & milestones</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'quote-analysis\')' : 'showRestrictedFeature(\'quote-analysis\')'}">
            <div class="db-action-icon db-icon-amber"><i class="fas fa-chart-line"></i></div>
            <div class="db-action-text"><h4>Quote Analysis</h4><p>Compare & analyze</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>`;

    // Quick action cards for designer
    const designerQuickActions = `
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'jobs\')' : 'showRestrictedFeature(\'jobs\')'}">
            <div class="db-action-icon db-icon-blue"><i class="fas fa-search"></i></div>
            <div class="db-action-text"><h4>Browse Projects</h4><p>Find opportunities</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'my-quotes\')' : 'showRestrictedFeature(\'my-quotes\')'}">
            <div class="db-action-icon db-icon-green"><i class="fas fa-file-invoice-dollar"></i></div>
            <div class="db-action-text"><h4>My Quotes</h4><p>Track submissions</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'project-tracking\')' : 'showRestrictedFeature(\'project-tracking\')'}">
            <div class="db-action-icon db-icon-cyan"><i class="fas fa-project-diagram"></i></div>
            <div class="db-action-text"><h4>Project Tracking</h4><p>Status & milestones</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'messages\')' : 'showRestrictedFeature(\'messages\')'}">
            <div class="db-action-icon db-icon-indigo"><i class="fas fa-comments"></i></div>
            <div class="db-action-text"><h4>Messages</h4><p>Client communication</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>
        <div class="db-action-card ${!isApproved ? 'db-locked' : ''}" onclick="${isApproved ? 'renderAppSection(\'community-feed\')' : 'showRestrictedFeature(\'community-feed\')'}">
            <div class="db-action-icon db-icon-violet"><i class="fas fa-users"></i></div>
            <div class="db-action-text"><h4>Community</h4><p>Share your work</p></div>
            ${!isApproved ? '<div class="db-lock-overlay"><i class="fas fa-lock"></i></div>' : '<i class="fas fa-chevron-right db-action-arrow"></i>'}
        </div>`;

    const contractorWidgets = `
        <div class="db-widget"><div class="db-widget-header"><h4><i class="fas fa-history"></i> Recent Projects</h4></div><div id="recent-projects-widget" class="db-widget-body">${!isApproved ? '<p class="db-widget-empty">Complete your profile to post projects.</p>' : ''}</div></div>
        <div class="db-widget"><div class="db-widget-header"><h4><i class="fas fa-users"></i> Community Feed</h4></div><div class="db-widget-body"><p class="db-widget-promo">Discover talented designers and their latest projects.</p><button class="db-widget-link" onclick="renderAppSection('community-feed')"><i class="fas fa-arrow-right"></i> Open Community</button></div></div>`;

    const designerWidgets = `
        <div class="db-widget"><div class="db-widget-header"><h4><i class="fas fa-history"></i> Recent Quotes</h4></div><div id="recent-quotes-widget" class="db-widget-body">${!isApproved ? '<p class="db-widget-empty">Complete your profile to submit quotes.</p>' : ''}</div></div>
        <div class="db-widget"><div class="db-widget-header"><h4><i class="fas fa-newspaper"></i> Community Feed</h4></div><div class="db-widget-body"><p class="db-widget-promo">Share your expertise and attract new clients.</p><button class="db-widget-link" onclick="renderAppSection('community-feed')"><i class="fas fa-arrow-right"></i> Open Community</button></div></div>`;

    // Charts section (only for approved users)
    const chartsSection = isApproved ? `
        <div class="db-section-header">
            <h3><i class="fas fa-chart-bar"></i> Performance Overview</h3>
            <span class="db-section-badge">Live Data</span>
        </div>
        <div class="dashboard-charts-row">
            <div class="dashboard-chart-card">
                <div class="chart-card-header">
                    <h4><i class="fas fa-chart-bar"></i> ${isContractor ? 'Projects & Quotes' : 'Quotes Activity'}</h4>
                    <span class="chart-badge">6 Months</span>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="dashboard-bar-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-card">
                <div class="chart-card-header">
                    <h4><i class="fas fa-chart-pie"></i> ${isContractor ? 'Project' : 'Quote'} Distribution</h4>
                    <span class="chart-badge">Current</span>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="dashboard-pie-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-card">
                <div class="chart-card-header">
                    <h4><i class="fas fa-chart-line"></i> Activity Trend</h4>
                    <span class="chart-badge">6 Months</span>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="dashboard-line-chart"></canvas>
                </div>
            </div>
            <div class="dashboard-chart-card">
                <div class="chart-card-header">
                    <h4><i class="fas fa-chart-area"></i> Performance Score</h4>
                    <span class="chart-badge">Current</span>
                </div>
                <div class="chart-canvas-wrapper">
                    <canvas id="dashboard-radar-chart"></canvas>
                </div>
            </div>
        </div>
        <div class="db-kpi-row" id="dashboard-kpi-stats">
            <div class="db-kpi db-kpi-blue">
                <div class="db-kpi-icon"><i class="fas ${isContractor ? 'fa-folder-open' : 'fa-file-invoice-dollar'}"></i></div>
                <div class="db-kpi-data"><span class="db-kpi-value" id="kpi-total">--</span><span class="db-kpi-label">${isContractor ? 'Total Projects' : 'Total Quotes'}</span></div>
            </div>
            <div class="db-kpi db-kpi-green">
                <div class="db-kpi-icon"><i class="fas ${isContractor ? 'fa-check-circle' : 'fa-thumbs-up'}"></i></div>
                <div class="db-kpi-data"><span class="db-kpi-value" id="kpi-approved">--</span><span class="db-kpi-label">${isContractor ? 'Approved' : 'Approved'}</span></div>
            </div>
            <div class="db-kpi db-kpi-amber">
                <div class="db-kpi-icon"><i class="fas ${isContractor ? 'fa-clock' : 'fa-hourglass-half'}"></i></div>
                <div class="db-kpi-data"><span class="db-kpi-value" id="kpi-pending">--</span><span class="db-kpi-label">${isContractor ? 'Pending' : 'Submitted'}</span></div>
            </div>
            <div class="db-kpi db-kpi-purple">
                <div class="db-kpi-icon"><i class="fas ${isContractor ? 'fa-spinner' : 'fa-briefcase'}"></i></div>
                <div class="db-kpi-data"><span class="db-kpi-value" id="kpi-active">--</span><span class="db-kpi-label">${isContractor ? 'In Progress' : 'Active'}</span></div>
            </div>
        </div>` : '';

    return `
        <div class="dashboard-container">
            <!-- Premium Hero -->
            <div class="db-hero">
                <div class="db-hero-bg"></div>
                <div class="db-hero-content">
                    <div class="db-hero-left">
                        <div class="db-hero-avatar" style="background-color: ${avatarColor}">${initial}</div>
                        <div class="db-hero-info">
                            <h2>Welcome back, ${name}</h2>
                            <p><i class="fas ${isContractor ? 'fa-hard-hat' : 'fa-drafting-compass'}"></i> ${isContractor ? 'Contractor' : 'Designer'} Portal <span class="db-hero-role-badge">${isContractor ? 'PRO' : 'PRO'}</span></p>
                        </div>
                    </div>
                    <div class="db-hero-right">
                        <div class="db-hero-date">
                            <i class="far fa-calendar-alt"></i>
                            <span>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            ${profileStatusCard}
            ${chartsSection}

            <div class="db-section-header">
                <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                <span class="db-section-badge">${isContractor ? 'Contractor Tools' : 'Designer Tools'}</span>
            </div>
            <div class="db-actions-grid">${isContractor ? contractorQuickActions : designerQuickActions}</div>

            <div class="db-section-header">
                <h3><i class="fas fa-layer-group"></i> Overview</h3>
                <span class="db-section-badge">Activity</span>
            </div>
            <div class="db-widgets-row">${isContractor ? contractorWidgets : designerWidgets}</div>
        </div>`;
}

// Dashboard charts initialization
let dashboardBarChart = null;
let dashboardPieChart = null;
let dashboardLineChart = null;
let dashboardRadarChart = null;

async function initDashboardCharts() {
    const isContractor = appState.currentUser.type === 'contractor';
    let stats = null;

    try {
        const response = await apiCall('/profile/dashboard-stats', 'GET');
        if (response.success && response.data) {
            stats = response.data;
        }
    } catch (error) {
        console.error('Dashboard stats API failed, using local data:', error);
    }

    // Fallback: build stats from fetched data if API failed
    if (!stats) {
        stats = {
            userType: appState.currentUser.type,
            projects: { total: 0, open: 0, assigned: 0, completed: 0 },
            quotes: { total: 0, submitted: 0, approved: 0, rejected: 0 },
            monthlyActivity: []
        };

        // Build 6-month buckets
        const now = new Date();
        const monthBuckets = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            monthBuckets.push({
                month: start.toLocaleString('default', { month: 'short' }),
                start, end, projects: 0, quotes: 0, approved: 0
            });
        }

        // Helper to parse Firestore timestamps
        function parseTimestamp(ts) {
            if (!ts) return null;
            if (ts._seconds) return new Date(ts._seconds * 1000);
            if (ts.seconds) return new Date(ts.seconds * 1000);
            const d = new Date(ts);
            return isNaN(d.getTime()) ? null : d;
        }

        try {
            if (isContractor) {
                const jobsResponse = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
                const jobs = jobsResponse.data || [];
                stats.projects.total = jobs.length;
                stats.projects.open = jobs.filter(j => j.status === 'open').length;
                stats.projects.assigned = jobs.filter(j => j.status === 'assigned').length;
                stats.projects.completed = jobs.filter(j => j.status === 'completed').length;
                stats.quotes.total = jobs.reduce((sum, j) => sum + (j.quotesCount || 0), 0);

                // Compute monthly project breakdown
                jobs.forEach(job => {
                    const created = parseTimestamp(job.createdAt);
                    if (created) {
                        for (const bucket of monthBuckets) {
                            if (created >= bucket.start && created <= bucket.end) {
                                bucket.projects++;
                                break;
                            }
                        }
                    }
                });
            } else {
                const quotesResponse = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
                const quotes = quotesResponse.data || [];
                stats.quotes.total = quotes.length;
                stats.quotes.submitted = quotes.filter(q => q.status === 'submitted').length;
                stats.quotes.approved = quotes.filter(q => q.status === 'approved').length;
                stats.quotes.rejected = quotes.filter(q => q.status === 'rejected').length;

                // Compute monthly quote breakdown
                quotes.forEach(quote => {
                    const created = parseTimestamp(quote.createdAt);
                    if (created) {
                        for (const bucket of monthBuckets) {
                            if (created >= bucket.start && created <= bucket.end) {
                                bucket.quotes++;
                                if (quote.status === 'approved') bucket.approved++;
                                break;
                            }
                        }
                    }
                });
            }
        } catch (e) {
            console.error('Fallback data fetch failed:', e);
        }

        stats.monthlyActivity = monthBuckets.map(b => ({
            month: b.month, projects: b.projects, quotes: b.quotes, approved: b.approved
        }));
    }

    // Update KPI cards
    const kpiTotal = document.getElementById('kpi-total');
    const kpiApproved = document.getElementById('kpi-approved');
    const kpiPending = document.getElementById('kpi-pending');
    const kpiActive = document.getElementById('kpi-active');

    if (isContractor) {
        if (kpiTotal) kpiTotal.textContent = stats.projects.total;
        if (kpiApproved) kpiApproved.textContent = stats.quotes.approved;
        if (kpiPending) kpiPending.textContent = stats.quotes.submitted;
        if (kpiActive) kpiActive.textContent = stats.projects.assigned;
    } else {
        if (kpiTotal) kpiTotal.textContent = stats.quotes.total;
        if (kpiApproved) kpiApproved.textContent = stats.quotes.approved;
        if (kpiPending) kpiPending.textContent = stats.quotes.submitted;
        if (kpiActive) kpiActive.textContent = stats.projects.assigned;
    }

    // Bar chart
    const barCanvas = document.getElementById('dashboard-bar-chart');
    if (barCanvas) {
        const barCtx = barCanvas.getContext('2d');
        if (dashboardBarChart) dashboardBarChart.destroy();

        const labels = stats.monthlyActivity.map(m => m.month);

        const datasets = isContractor ? [
            {
                label: 'Projects Posted',
                data: stats.monthlyActivity.map(m => m.projects || 0),
                backgroundColor: 'rgba(37, 99, 235, 0.8)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            },
            {
                label: 'Quotes Received',
                data: stats.monthlyActivity.map(m => m.quotes || 0),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }
        ] : [
            {
                label: 'Quotes Submitted',
                data: stats.monthlyActivity.map(m => m.quotes || 0),
                backgroundColor: 'rgba(99, 102, 241, 0.8)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            },
            {
                label: 'Approved',
                data: stats.monthlyActivity.map(m => m.approved || 0),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }
        ];

        dashboardBarChart = new Chart(barCtx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1500, easing: 'easeOutBounce' },
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true, padding: 20, font: { family: 'Inter', size: 12, weight: '500' } } },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter', size: 12 }, stepSize: 1 } }
                }
            }
        });
    }

    // Pie chart
    const pieCanvas = document.getElementById('dashboard-pie-chart');
    if (pieCanvas) {
        const pieCtx = pieCanvas.getContext('2d');
        if (dashboardPieChart) dashboardPieChart.destroy();

        let pieLabels, pieData, pieColors;
        if (isContractor) {
            pieLabels = ['Open', 'In Progress', 'Completed'];
            pieData = [stats.projects.open, stats.projects.assigned, stats.projects.completed];
            pieColors = ['rgba(37, 99, 235, 0.85)', 'rgba(245, 158, 11, 0.85)', 'rgba(16, 185, 129, 0.85)'];
        } else {
            pieLabels = ['Submitted', 'Approved', 'Rejected'];
            pieData = [stats.quotes.submitted, stats.quotes.approved, stats.quotes.rejected];
            pieColors = ['rgba(99, 102, 241, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'];
        }

        // If all zeros, show placeholder
        const hasData = pieData.some(v => v > 0);
        if (!hasData) {
            pieData = [1];
            pieLabels = ['No Data Yet'];
            pieColors = ['rgba(203, 213, 225, 0.5)'];
        }

        dashboardPieChart = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: pieLabels,
                datasets: [{
                    data: pieData,
                    backgroundColor: pieColors,
                    borderColor: '#ffffff',
                    borderWidth: 3,
                    hoverBorderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { animateRotate: true, animateScale: true, duration: 1500 },
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, padding: 16, font: { family: 'Inter', size: 12, weight: '500' } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.parsed;
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return ` ${context.label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Line chart - Activity Trend
    const lineCanvas = document.getElementById('dashboard-line-chart');
    if (lineCanvas) {
        const lineCtx = lineCanvas.getContext('2d');
        if (dashboardLineChart) dashboardLineChart.destroy();

        const lineLabels = stats.monthlyActivity.map(m => m.month);
        const lineData = isContractor
            ? stats.monthlyActivity.map(m => (m.projects || 0) + (m.quotes || 0))
            : stats.monthlyActivity.map(m => (m.quotes || 0) + (m.approved || 0));

        dashboardLineChart = new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: lineLabels,
                datasets: [{
                    label: 'Total Activity',
                    data: lineData,
                    borderColor: '#7c3aed',
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
                        gradient.addColorStop(0, 'rgba(124, 58, 237, 0.3)');
                        gradient.addColorStop(1, 'rgba(124, 58, 237, 0.01)');
                        return gradient;
                    },
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#7c3aed',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#7c3aed',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 2000, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12, cornerRadius: 8
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 12 } } },
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Inter', size: 12 }, stepSize: 1 } }
                }
            }
        });
    }

    // Radar chart - Performance Score
    const radarCanvas = document.getElementById('dashboard-radar-chart');
    if (radarCanvas) {
        const radarCtx = radarCanvas.getContext('2d');
        if (dashboardRadarChart) dashboardRadarChart.destroy();

        let radarLabels, radarData;
        if (isContractor) {
            radarLabels = ['Projects', 'Quotes', 'Completion', 'Response', 'Activity'];
            const total = Math.max(stats.projects.total, 1);
            radarData = [
                Math.min(stats.projects.total * 15, 100),
                Math.min(stats.quotes.total * 10, 100),
                stats.projects.total > 0 ? Math.round((stats.projects.completed / total) * 100) : 0,
                Math.min(stats.projects.assigned * 20, 100),
                Math.min(stats.monthlyActivity.reduce((s, m) => s + (m.projects || 0), 0) * 12, 100)
            ];
        } else {
            radarLabels = ['Quotes', 'Approvals', 'Success Rate', 'Activity', 'Engagement'];
            const total = Math.max(stats.quotes.total, 1);
            radarData = [
                Math.min(stats.quotes.total * 12, 100),
                Math.min(stats.quotes.approved * 20, 100),
                stats.quotes.total > 0 ? Math.round((stats.quotes.approved / total) * 100) : 0,
                Math.min(stats.monthlyActivity.reduce((s, m) => s + (m.quotes || 0), 0) * 10, 100),
                Math.min((stats.quotes.submitted || 0) * 15, 100)
            ];
        }

        dashboardRadarChart = new Chart(radarCtx, {
            type: 'radar',
            data: {
                labels: radarLabels,
                datasets: [{
                    label: 'Performance',
                    data: radarData,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    borderWidth: 2.5,
                    pointBackgroundColor: '#06b6d4',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 1800, easing: 'easeOutQuart' },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        titleFont: { family: 'Inter', size: 13, weight: '600' },
                        bodyFont: { family: 'Inter', size: 12 },
                        padding: 12, cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.label}: ${context.parsed.r}%`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { display: false, stepSize: 20 },
                        grid: { color: 'rgba(0,0,0,0.06)', circular: true },
                        angleLines: { color: 'rgba(0,0,0,0.06)' },
                        pointLabels: { font: { family: 'Inter', size: 11, weight: '500' }, color: '#475569' }
                    }
                }
            }
        });
    }
}

// --- PORTAL ANNOUNCEMENTS (Right-side Stacked Toasts) ---
let annToastQueue = [];
let annToastTimers = {};
let annCycleTimer = null;
const ANN_AUTO_HIDE = 15000;      // each toast auto-hides after 15s
const ANN_CYCLE_INTERVAL = 180000; // re-show all every 3 minutes

async function loadPortalAnnouncements() {
    try {
        const response = await apiCall('/announcements', 'GET');
        const announcements = response.data || [];
        if (announcements.length === 0) return;

        annToastQueue = announcements.slice(0, 10);
        setTimeout(() => showAllAnnouncementToasts(), 1500);
    } catch (error) {
        console.log('Announcements not available:', error.message);
    }
}

function showAllAnnouncementToasts() {
    const container = document.getElementById('announcement-popup-container');
    if (!container || annToastQueue.length === 0) return;

    // Clear previous
    Object.values(annToastTimers).forEach(t => clearTimeout(t));
    annToastTimers = {};
    container.innerHTML = '';

    const typeConfig = {
        offer: { icon: 'fa-tags', gradient: 'linear-gradient(135deg, #10b981, #059669)', bgColor: '#ecfdf5', borderColor: '#10b981', label: 'Offer' },
        maintenance: { icon: 'fa-tools', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', bgColor: '#fffbeb', borderColor: '#f59e0b', label: 'Maintenance' },
        update: { icon: 'fa-rocket', gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', bgColor: '#eff6ff', borderColor: '#3b82f6', label: 'Update' },
        general: { icon: 'fa-bullhorn', gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)', bgColor: '#eef2ff', borderColor: '#6366f1', label: 'News' },
        alert: { icon: 'fa-exclamation-triangle', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', bgColor: '#fef2f2', borderColor: '#ef4444', label: 'Alert' }
    };

    annToastQueue.forEach((ann, idx) => {
        const cfg = typeConfig[ann.type] || typeConfig.general;
        const isUrgent = ann.priority === 'urgent' || ann.priority === 'high';
        const timeAgo = getAnnouncementTimeAgo(ann.createdAt);
        const toastId = `ann-toast-${ann.id}`;

        const toastEl = document.createElement('div');
        toastEl.className = `ann-toast ${isUrgent ? 'ann-toast-urgent' : ''}`;
        toastEl.id = toastId;
        toastEl.style.animationDelay = `${idx * 0.12}s`;
        toastEl.innerHTML = `
            <div class="ann-toast-accent" style="background: ${cfg.gradient}"></div>
            <div class="ann-toast-progress" id="prog-${ann.id}"></div>
            <div class="ann-toast-header">
                <div class="ann-toast-type" style="background: ${cfg.bgColor}; border-color: ${cfg.borderColor}">
                    <i class="fas ${cfg.icon}" style="color: ${cfg.borderColor}"></i>
                    <span style="color: ${cfg.borderColor}">${cfg.label}</span>
                </div>
                <div class="ann-toast-header-right">
                    ${isUrgent ? '<span class="ann-toast-urgent-tag">URGENT</span>' : ''}
                    <button class="ann-toast-close" onclick="closeSingleToast('${ann.id}')" title="Close"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="ann-toast-body">
                <h4 class="ann-toast-title">${ann.title}</h4>
                <p class="ann-toast-text">${ann.content.length > 120 ? ann.content.substring(0, 120) + '...' : ann.content}</p>
            </div>
            <div class="ann-toast-footer">
                <span class="ann-toast-time"><i class="far fa-clock"></i> ${timeAgo}</span>
                <span class="ann-toast-by"><i class="fas fa-user-shield"></i> ${ann.createdByName || 'Admin'}</span>
            </div>`;

        container.appendChild(toastEl);

        // Stagger the slide-in
        setTimeout(() => {
            toastEl.classList.add('ann-toast-visible');
            // Start progress bar
            const prog = document.getElementById(`prog-${ann.id}`);
            if (prog) {
                prog.style.transition = 'none';
                prog.style.width = '100%';
                requestAnimationFrame(() => {
                    prog.style.transition = `width ${ANN_AUTO_HIDE}ms linear`;
                    prog.style.width = '0%';
                });
            }
        }, idx * 120 + 50);

        // Auto-hide each toast individually
        annToastTimers[ann.id] = setTimeout(() => {
            closeSingleToast(ann.id);
        }, ANN_AUTO_HIDE + (idx * 120));
    });

    // Schedule next cycle
    scheduleCycle();
}

function closeSingleToast(annId) {
    if (annToastTimers[annId]) {
        clearTimeout(annToastTimers[annId]);
        delete annToastTimers[annId];
    }
    const el = document.getElementById(`ann-toast-${annId}`);
    if (el) {
        el.classList.remove('ann-toast-visible');
        el.classList.add('ann-toast-hiding');
        setTimeout(() => el.remove(), 500);
    }
}
window.closeSingleToast = closeSingleToast;

function scheduleCycle() {
    if (annCycleTimer) clearTimeout(annCycleTimer);
    annCycleTimer = setTimeout(() => {
        showAllAnnouncementToasts();
    }, ANN_CYCLE_INTERVAL);
}

function getAnnouncementTimeAgo(dateStr) {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return '';
    }
}

function getSettingsTemplate(user) {
    const profileStatus = user.profileStatus || 'incomplete';
    let profileSection = '';
    if (profileStatus === 'incomplete') profileSection = `<div class="settings-card"><h3><i class="fas fa-user-edit"></i> Complete Your Profile</h3><p>Your profile is incomplete. Complete it to unlock all features.</p><button class="btn btn-primary" onclick="renderAppSection('profile-completion')"><i class="fas fa-edit"></i> Complete Profile</button></div>`;
    else if (profileStatus === 'pending') profileSection = `<div class="settings-card"><h3><i class="fas fa-clock"></i> Profile Under Review</h3><p>Your profile is under review by our admin team. You can view or update your profile while waiting.</p><button class="btn btn-outline" onclick="renderAppSection('profile-completion')"><i class="fas fa-eye"></i> View Profile</button></div>`;
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

// ===================================
// NEW AND UPDATED FUNCTIONS
// ===================================

// FIXED TIMESTAMP FUNCTIONS
function formatDetailedTimestamp(date) {
    try {
        const msgDate = parseDate(date);
        if (!msgDate) return 'Just now';
        const now = new Date();
        const diffMs = now - msgDate;
        if (diffMs < 60000) return 'Just now';
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        const hours = msgDate.getHours();
        const minutes = msgDate.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h = hours % 12 || 12;
        const m = minutes < 10 ? '0' + minutes : minutes;
        const time = `${h}:${m} ${ampm}`;
        if (today.getTime() === msgDay.getTime()) return time;
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === msgDay.getTime()) return `Yesterday, ${time}`;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dateStr = `${months[msgDate.getMonth()]} ${msgDate.getDate()}`;
        if (msgDate.getFullYear() !== now.getFullYear()) return `${dateStr}, ${msgDate.getFullYear()}, ${time}`;
        return `${dateStr}, ${time}`;
    } catch (error) {
        return 'Just now';
    }
}

function parseDate(date) {
    if (!date) return null;
    let d;
    if (date && typeof date === 'object' && typeof date.toDate === 'function') {
        d = date.toDate();
    } else if (date && typeof date === 'object' && typeof date.seconds === 'number') {
        d = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
    } else if (date && typeof date === 'object' && typeof date._seconds === 'number') {
        d = new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
    } else if (date && typeof date === 'object' && date.$date) {
        d = new Date(date.$date);
    } else if (date instanceof Date) {
        d = date;
    } else if (typeof date === 'string') {
        d = new Date(date);
    } else if (typeof date === 'number') {
        d = new Date(date < 10000000000 ? date * 1000 : date);
    } else if (date && typeof date === 'object') {
        d = new Date(String(date));
    } else {
        return null;
    }
    return (d && !isNaN(d.getTime())) ? d : null;
}

function formatMessageTimestamp(date) {
    try {
        const msgDate = parseDate(date);
        if (!msgDate) return 'Just now';
        const now = new Date();
        const diffMs = now - msgDate;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        if (diffSeconds < 30) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const dateStr = `${months[msgDate.getMonth()]} ${msgDate.getDate()}`;
        if (msgDate.getFullYear() !== now.getFullYear()) return `${dateStr}, ${msgDate.getFullYear()}`;
        return dateStr;
    } catch (error) {
        return 'Just now';
    }
}

function formatMessageDate(date) {
    try {
        const msgDate = parseDate(date);
        if (!msgDate) return 'Today';
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const msgDay = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        if (today.getTime() === msgDay.getTime()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (yesterday.getTime() === msgDay.getTime()) return 'Yesterday';
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dateStr = `${months[msgDate.getMonth()]} ${msgDate.getDate()}`;
        if (msgDate.getFullYear() !== now.getFullYear()) return `${dateStr}, ${msgDate.getFullYear()}`;
        return dateStr;
    } catch (error) {
        return 'Today';
    }
}


// ENHANCED SIDEBAR NAVIGATION WITH SUPPORT
function buildSidebarNav() {
    const nav = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    const profileStatus = appState.currentUser.profileStatus || 'incomplete';
    const isApproved = profileStatus === 'approved';
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard">
                    <i class="fas fa-tachometer-alt fa-fw"></i>
                    <span>Dashboard</span>
                 </a>`;
    if (!isApproved) {
        const profileLabel = profileStatus === 'incomplete' ? 'Complete Profile' : profileStatus === 'rejected' ? 'Update Profile' : 'My Profile';
        const profileIcon = profileStatus === 'rejected' ? 'fa-exclamation-circle' : 'fa-user-edit';
        links += `<a href="#" class="sidebar-nav-link sidebar-profile-link" data-section="profile-completion">
                    <i class="fas ${profileIcon} fa-fw"></i>
                    <span>${profileLabel}</span>
                    ${profileStatus === 'rejected' ? '<span class="nav-badge" style="background:#ef4444;color:#fff;">!</span>' : ''}
                 </a>`;
    }
    if (role === 'designer') {
        links += `
            <a href="#" class="sidebar-nav-link" data-section="jobs">
                <i class="fas fa-search fa-fw"></i>
                <span>Find Projects</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="my-quotes">
                <i class="fas fa-file-invoice-dollar fa-fw"></i>
                <span>My Quotes</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="project-tracking">
                <i class="fas fa-project-diagram fa-fw"></i>
                <span>Project Tracking</span>
                <span class="nav-badge">NEW</span>
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
            <a href="#" class="sidebar-nav-link" data-section="project-tracking">
                <i class="fas fa-project-diagram fa-fw"></i>
                <span>Project Tracking</span>
                <span class="nav-badge">NEW</span>
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
            <a href="#" class="sidebar-nav-link analytics-nav-link" data-section="ai-analytics">
                <i class="fas fa-chart-bar fa-fw"></i>
                <span>Analytics Dashboard</span>
                <span class="nav-badge" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:10px;padding:2px 6px;border-radius:10px;margin-left:8px">PRO</span>
            </a>
            <a href="#" class="sidebar-nav-link" data-section="quote-analysis">
                <i class="fas fa-poll fa-fw"></i>
                <span>Quote Analysis</span>
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
        <div class="sidebar-section-title">Community</div>
        <a href="#" class="sidebar-nav-link" data-section="community-feed">
            <i class="fas fa-newspaper fa-fw"></i>
            <span>Community Feed</span>
            <span class="nav-badge">NEW</span>
        </a>
        <hr class="sidebar-divider">
        <div class="sidebar-section-title">Billing</div>
        <a href="#" class="sidebar-nav-link" data-section="subscription">
            <i class="fas fa-credit-card fa-fw"></i>
            <span>Subscription</span>
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


// ============================================
// COMMUNITY FEED (LINKEDIN-STYLE)
// ============================================

async function renderCommunityFeed() {
    const container = document.getElementById('app-container');
    const isDesigner = appState.currentUser.type === 'designer';
    const user = appState.currentUser;
    const avatarColor = getAvatarColor(user.name || 'U');
    const initial = (user.name || 'U').charAt(0).toUpperCase();

    container.innerHTML = `
        <div class="cf-layout">
            <!-- Left Sidebar -->
            <aside class="cf-sidebar-left">
                <div class="cf-profile-card">
                    <div class="cf-profile-banner">
                        <div class="cf-banner-pattern"></div>
                    </div>
                    <div class="cf-profile-info">
                        <div class="cf-profile-avatar-ring">
                            <div class="cf-profile-avatar" style="background-color: ${avatarColor}">${initial}</div>
                        </div>
                        <h3>${user.name || 'User'}</h3>
                        <span class="cf-profile-role ${user.type}">
                            <i class="fas ${user.type === 'designer' ? 'fa-drafting-compass' : 'fa-hard-hat'}"></i>
                            ${user.type === 'designer' ? 'Designer' : 'Contractor'}
                        </span>
                        <p class="cf-profile-tagline">${isDesigner ? 'Steel & Rebar Design Professional' : 'Steel Construction Contractor'}</p>
                    </div>
                    <div class="cf-profile-stats">
                        <div class="cf-profile-stat">
                            <span class="cf-stat-num" id="cf-my-posts-count">0</span>
                            <span class="cf-stat-txt">Posts</span>
                        </div>
                        <div class="cf-profile-stat">
                            <span class="cf-stat-num" id="cf-my-likes-count">0</span>
                            <span class="cf-stat-txt">Likes</span>
                        </div>
                        <div class="cf-profile-stat">
                            <span class="cf-stat-num" id="cf-my-comments-count">0</span>
                            <span class="cf-stat-txt">Comments</span>
                        </div>
                    </div>
                </div>

                <div class="cf-quick-links">
                    <h4><i class="fas fa-bolt"></i> Quick Actions</h4>
                    ${isDesigner ? `
                    <button class="cf-quick-link-btn" onclick="openCreatePostModal()">
                        <i class="fas fa-plus-circle"></i> New Post
                    </button>
                    <button class="cf-quick-link-btn" onclick="renderAppSection('jobs')">
                        <i class="fas fa-briefcase"></i> Browse Projects
                    </button>` : `
                    <button class="cf-quick-link-btn" onclick="renderAppSection('post-job')">
                        <i class="fas fa-plus-circle"></i> Post a Project
                    </button>
                    <button class="cf-quick-link-btn" onclick="renderAppSection('jobs')">
                        <i class="fas fa-search"></i> Find Designers
                    </button>`}
                </div>
            </aside>

            <!-- Main Feed -->
            <main class="cf-main">
                <!-- Hero Welcome -->
                <div class="cf-hero-welcome">
                    <div class="cf-hero-content">
                        <h2><i class="fas fa-users"></i> Community Hub</h2>
                        <p>${isDesigner ? 'Showcase your expertise and connect with contractors' : 'Discover talented designers and industry insights'}</p>
                    </div>
                    <div class="cf-hero-stats">
                        <div class="cf-hero-stat">
                            <span class="cf-hero-stat-num" id="cf-total-posts">--</span>
                            <span class="cf-hero-stat-label">Posts</span>
                        </div>
                        <div class="cf-hero-stat">
                            <span class="cf-hero-stat-num" id="cf-total-members">--</span>
                            <span class="cf-hero-stat-label">Members</span>
                        </div>
                    </div>
                </div>

                ${isDesigner ? `
                <!-- Create Post -->
                <div class="cf-create-box" onclick="openCreatePostModal()">
                    <div class="cf-create-left">
                        <div class="cf-create-avatar" style="background-color: ${avatarColor}">${initial}</div>
                        <div class="cf-create-prompt">
                            <span>Share your work, insights, or project showcase...</span>
                        </div>
                    </div>
                    <div class="cf-create-actions">
                        <button class="cf-create-action" onclick="event.stopPropagation(); openCreatePostModal()">
                            <i class="fas fa-image"></i>
                        </button>
                        <button class="cf-create-action" onclick="event.stopPropagation(); openCreatePostModal()">
                            <i class="fas fa-pen-fancy"></i>
                        </button>
                        <button class="cf-create-action cf-create-action-primary" onclick="event.stopPropagation(); openCreatePostModal()">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>` : ''}

                <!-- Feed Filter -->
                <div class="cf-feed-tabs">
                    <button class="cf-tab active" data-tab="all" onclick="filterCommunityFeed('all')">
                        <i class="fas fa-layer-group"></i> All Posts
                    </button>
                    <button class="cf-tab" data-tab="trending" onclick="filterCommunityFeed('trending')">
                        <i class="fas fa-fire"></i> Trending
                    </button>
                    <button class="cf-tab" data-tab="following" onclick="filterCommunityFeed('following')">
                        <i class="fas fa-user"></i> My Posts
                    </button>
                </div>

                <!-- Posts Container -->
                <div id="cf-posts-container" class="cf-posts-container">
                    <div class="cf-loading-skeleton">
                        <div class="cf-skeleton-card"><div class="cf-skeleton-header"><div class="cf-skeleton-circle"></div><div class="cf-skeleton-lines"><div class="cf-skeleton-line w60"></div><div class="cf-skeleton-line w40"></div></div></div><div class="cf-skeleton-body"><div class="cf-skeleton-line w100"></div><div class="cf-skeleton-line w80"></div><div class="cf-skeleton-line w60"></div></div></div>
                        <div class="cf-skeleton-card"><div class="cf-skeleton-header"><div class="cf-skeleton-circle"></div><div class="cf-skeleton-lines"><div class="cf-skeleton-line w60"></div><div class="cf-skeleton-line w40"></div></div></div><div class="cf-skeleton-body"><div class="cf-skeleton-line w100"></div><div class="cf-skeleton-line w80"></div></div></div>
                    </div>
                </div>

                <div id="cf-load-more" class="cf-load-more"></div>
            </main>

            <!-- Right Sidebar -->
            <aside class="cf-sidebar-right">
                <div class="cf-trending-card">
                    <h4><i class="fas fa-fire-alt"></i> Trending Topics</h4>
                    <div class="cf-trending-list">
                        <div class="cf-trending-item" onclick="searchCommunityPosts('#SteelDesign')">
                            <div class="cf-trending-icon"><i class="fas fa-drafting-compass"></i></div>
                            <div class="cf-trending-info">
                                <span class="cf-trending-tag">#SteelDesign</span>
                                <span class="cf-trending-desc">Structural steel discussions</span>
                            </div>
                        </div>
                        <div class="cf-trending-item" onclick="searchCommunityPosts('#RebarDetailing')">
                            <div class="cf-trending-icon rebar"><i class="fas fa-ruler-combined"></i></div>
                            <div class="cf-trending-info">
                                <span class="cf-trending-tag">#RebarDetailing</span>
                                <span class="cf-trending-desc">Reinforcement techniques</span>
                            </div>
                        </div>
                        <div class="cf-trending-item" onclick="searchCommunityPosts('#StructuralEngineering')">
                            <div class="cf-trending-icon engineering"><i class="fas fa-building"></i></div>
                            <div class="cf-trending-info">
                                <span class="cf-trending-tag">#StructuralEngineering</span>
                                <span class="cf-trending-desc">Engineering insights</span>
                            </div>
                        </div>
                        <div class="cf-trending-item" onclick="searchCommunityPosts('#ProjectShowcase')">
                            <div class="cf-trending-icon showcase"><i class="fas fa-trophy"></i></div>
                            <div class="cf-trending-info">
                                <span class="cf-trending-tag">#ProjectShowcase</span>
                                <span class="cf-trending-desc">Completed projects</span>
                            </div>
                        </div>
                        <div class="cf-trending-item" onclick="searchCommunityPosts('#AIEstimation')">
                            <div class="cf-trending-icon ai"><i class="fas fa-robot"></i></div>
                            <div class="cf-trending-info">
                                <span class="cf-trending-tag">#AIEstimation</span>
                                <span class="cf-trending-desc">AI-powered tools</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="cf-activity-card">
                    <h4><i class="fas fa-chart-line"></i> Community Activity</h4>
                    <div class="cf-activity-bars">
                        <div class="cf-activity-row"><span>Mon</span><div class="cf-activity-bar"><div class="cf-activity-fill" style="width:65%"></div></div></div>
                        <div class="cf-activity-row"><span>Tue</span><div class="cf-activity-bar"><div class="cf-activity-fill" style="width:80%"></div></div></div>
                        <div class="cf-activity-row"><span>Wed</span><div class="cf-activity-bar"><div class="cf-activity-fill" style="width:45%"></div></div></div>
                        <div class="cf-activity-row"><span>Thu</span><div class="cf-activity-bar"><div class="cf-activity-fill" style="width:90%"></div></div></div>
                        <div class="cf-activity-row"><span>Fri</span><div class="cf-activity-bar"><div class="cf-activity-fill" style="width:72%"></div></div></div>
                    </div>
                    <p class="cf-activity-note">Most active on Thursdays</p>
                </div>
            </aside>
        </div>`;

    appState.communityPosts = [];
    appState.communityPage = 1;
    appState.communityHasMore = true;
    await loadCommunityPosts();
}

let communityFeedFilter = 'all';

function filterCommunityFeed(tab) {
    communityFeedFilter = tab;
    document.querySelectorAll('.cf-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    renderCommunityPostsList();
}

function searchCommunityPosts(tag) {
    communityFeedFilter = 'all';
    document.querySelectorAll('.cf-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'all'));
    renderCommunityPostsList(tag);
}

async function loadCommunityPosts(loadMore = false) {
    const postsContainer = document.getElementById('cf-posts-container');
    const loadMoreContainer = document.getElementById('cf-load-more');
    if (!loadMore) {
        appState.communityPosts = [];
        appState.communityPage = 1;
        appState.communityHasMore = true;
    }
    try {
        const response = await apiCall(`/community/posts?page=${appState.communityPage}&limit=10`, 'GET');
        const newPosts = response.data || [];
        appState.communityPosts.push(...newPosts);
        appState.communityHasMore = response.pagination ? response.pagination.hasNext : false;
        appState.communityPage += 1;
        // Sync API posts to local storage for cross-session visibility
        saveCommunityPostsLocal(appState.communityPosts);
        renderCommunityPostsList();
        updateCommunityProfileStats();
        updateCommunityHeroStats(response.totalPosts, response.totalMembers);
    } catch (error) {
        // API not available - load from localStorage so all users see shared posts
        if (appState.communityPosts.length === 0) {
            appState.communityPosts = loadCommunityPostsLocal();
        }
        appState.communityHasMore = false;
        renderCommunityPostsList();
        updateCommunityProfileStats();
    }
    if (loadMoreContainer) {
        if (appState.communityHasMore && appState.communityPosts.length > 0) {
            loadMoreContainer.innerHTML = `<button class="cf-load-more-btn" onclick="loadCommunityPosts(true)"><i class="fas fa-arrow-down"></i> Load More</button>`;
        } else {
            loadMoreContainer.innerHTML = '';
        }
    }
}

// --- Community Posts Local Storage (shared across all users) ---
function saveCommunityPostsLocal(posts) {
    try {
        localStorage.setItem('steelconnect_community_posts', JSON.stringify(posts));
    } catch (e) { /* Storage full or unavailable */ }
}

function loadCommunityPostsLocal() {
    try {
        const stored = localStorage.getItem('steelconnect_community_posts');
        return stored ? JSON.parse(stored) : [];
    } catch (e) { return []; }
}

function updateCommunityHeroStats(totalPosts, totalMembers) {
    const postsEl = document.getElementById('cf-total-posts');
    const membersEl = document.getElementById('cf-total-members');
    if (postsEl) postsEl.textContent = totalPosts || appState.communityPosts.length || '0';
    if (membersEl) membersEl.textContent = totalMembers || '--';
}

function updateCommunityProfileStats() {
    const userId = appState.currentUser.id;
    const posts = appState.communityPosts;
    const myPosts = posts.filter(p => p.authorId === userId);
    const myLikes = myPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const myComments = posts.reduce((sum, p) => {
        return sum + (p.comments || []).filter(c => c.authorId === userId).length;
    }, 0);
    const postsEl = document.getElementById('cf-my-posts-count');
    const likesEl = document.getElementById('cf-my-likes-count');
    const commentsEl = document.getElementById('cf-my-comments-count');
    if (postsEl) postsEl.textContent = myPosts.length || posts.length;
    if (likesEl) likesEl.textContent = myLikes || posts.reduce((s, p) => s + (p.likes || 0), 0);
    if (commentsEl) commentsEl.textContent = myComments || posts.reduce((s, p) => s + (p.comments || []).length, 0);
}

function renderCommunityPostsList(searchTag = null) {
    const container = document.getElementById('cf-posts-container');
    if (!container) return;
    let posts = [...appState.communityPosts];

    if (searchTag) {
        posts = posts.filter(p => p.content && p.content.toLowerCase().includes(searchTag.toLowerCase()));
    }

    if (communityFeedFilter === 'trending') {
        posts = posts.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else if (communityFeedFilter === 'following') {
        posts = posts.filter(p => p.authorId === appState.currentUser.id);
    }

    if (posts.length === 0) {
        const isDesigner = appState.currentUser.type === 'designer';
        container.innerHTML = `
            <div class="cf-empty-feed">
                <div class="cf-empty-icon">
                    <div class="cf-empty-icon-bg"></div>
                    <i class="fas ${communityFeedFilter === 'following' ? 'fa-user-edit' : 'fa-comments'}"></i>
                </div>
                <h3>${communityFeedFilter === 'following' ? 'You haven\'t posted yet' : (searchTag ? 'No posts found for ' + searchTag : 'No posts yet')}</h3>
                <p>${isDesigner ? 'Be the first to share your expertise and showcase your projects to attract new clients!' : 'The community feed will come alive as designers share their work. Check back soon!'}</p>
                ${isDesigner ? `<button class="cf-empty-cta" onclick="openCreatePostModal()"><i class="fas fa-plus"></i> Create First Post</button>` : ''}
            </div>`;
        return;
    }

    container.innerHTML = posts.map(post => renderPostCard(post)).join('');
}

function renderPostCard(post) {
    const avatarColor = getAvatarColor(post.authorName || 'U');
    const initial = (post.authorName || 'U').charAt(0).toUpperCase();
    const timeAgo = getTimeAgo(post.createdAt);
    const isLiked = (post.likedBy || []).includes(appState.currentUser.id);
    const commentsCount = (post.comments || []).length;
    const contentHTML = formatPostContent(post.content || '');
    const isOwner = post.authorId === appState.currentUser.id;

    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
        const getImgSrc = (img) => typeof img === 'object' ? (img.url || '') : img;
        if (post.images.length === 1) {
            const src = getImgSrc(post.images[0]);
            imagesHTML = `<div class="cf-post-images single"><img src="${src}" alt="Post image" onclick="openPostImageViewer('${src}')" loading="lazy"></div>`;
        } else {
            const extra = post.images.length > 4 ? post.images.length - 4 : 0;
            const displayImages = post.images.slice(0, 4);
            imagesHTML = `<div class="cf-post-images grid-${Math.min(post.images.length, 4)}">
                ${displayImages.map((img, i) => {
                    const src = getImgSrc(img);
                    return `
                    <div class="cf-post-img-wrapper ${i === 3 && extra > 0 ? 'has-more' : ''}" onclick="openPostImageViewer('${src}')">
                        <img src="${src}" alt="Post image" loading="lazy">
                        ${i === 3 && extra > 0 ? `<div class="cf-img-overlay">+${extra}</div>` : ''}
                    </div>`;
                }).join('')}
            </div>`;
        }
    }

    const previewComments = (post.comments || []).slice(-2);
    let commentsPreviewHTML = '';
    if (previewComments.length > 0) {
        commentsPreviewHTML = `
            <div class="cf-comments-preview">
                ${commentsCount > 2 ? `<button class="cf-view-all-comments" onclick="openPostDetailView('${post.id}')">View all ${commentsCount} comments</button>` : ''}
                ${previewComments.map(c => {
                    const cColor = getAvatarColor(c.authorName || 'U');
                    const cInitial = (c.authorName || 'U').charAt(0).toUpperCase();
                    const canDeleteComment = c.authorId === appState.currentUser.id || post.authorId === appState.currentUser.id;
                    return `
                    <div class="cf-comment-item">
                        <div class="cf-comment-avatar" style="background-color: ${cColor}">${cInitial}</div>
                        <div class="cf-comment-body">
                            <div class="cf-comment-header">
                                <strong>${c.authorName || 'Unknown'}</strong>
                                <span class="cf-comment-role ${c.authorType || ''}">${c.authorType || 'user'}</span>
                                <span class="cf-comment-time">${getTimeAgo(c.createdAt)}</span>
                                ${canDeleteComment ? `<button class="cf-comment-delete-btn" onclick="event.stopPropagation(); deleteComment('${post.id}', '${c.id}')" title="Delete comment"><i class="fas fa-trash-alt"></i></button>` : ''}
                            </div>
                            <p>${c.text || ''}</p>
                        </div>
                    </div>`;
                }).join('')}
            </div>`;
    }

    return `
        <article class="cf-post-card" data-post-id="${post.id}">
            <div class="cf-post-header">
                <div class="cf-post-avatar-wrap">
                    <div class="cf-post-avatar" style="background-color: ${avatarColor}">${initial}</div>
                    <span class="cf-post-avatar-badge ${post.authorType || ''}"><i class="fas ${post.authorType === 'designer' ? 'fa-drafting-compass' : 'fa-hard-hat'}"></i></span>
                </div>
                <div class="cf-post-author-info">
                    <div class="cf-post-author-top">
                        <h4>${post.authorName || 'Unknown User'}</h4>
                        <span class="cf-post-author-role ${post.authorType || ''}">${post.authorType === 'designer' ? 'Designer' : 'Contractor'}</span>
                    </div>
                    <span class="cf-post-time"><i class="far fa-clock"></i> ${timeAgo}</span>
                </div>
                ${isOwner ? `
                <div class="cf-post-menu">
                    <button class="cf-post-menu-btn" onclick="togglePostMenu('${post.id}')"><i class="fas fa-ellipsis-h"></i></button>
                    <div class="cf-post-dropdown" id="cf-menu-${post.id}">
                        <button onclick="editCommunityPost('${post.id}')"><i class="fas fa-edit"></i> Edit Post</button>
                        <button onclick="deleteCommunityPost('${post.id}')" class="danger"><i class="fas fa-trash-alt"></i> Delete</button>
                    </div>
                </div>` : ''}
            </div>
            <div class="cf-post-content">${contentHTML}</div>
            ${imagesHTML}
            <div class="cf-post-engagement">
                <div class="cf-post-stats">
                    <span class="cf-like-count">
                        <span class="cf-like-icon-group">${isLiked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'}</span>
                        ${post.likes || 0}
                    </span>
                    <span class="cf-comment-count" onclick="openPostDetailView('${post.id}')">
                        <i class="far fa-comment-dots"></i> ${commentsCount}
                    </span>
                </div>
                <div class="cf-post-actions">
                    <button class="cf-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')">
                        <i class="fas ${isLiked ? 'fa-heart' : 'fa-heart'}"></i> ${isLiked ? 'Liked' : 'Like'}
                    </button>
                    <button class="cf-action-btn" onclick="focusCommentInput('${post.id}')">
                        <i class="fas fa-comment-alt"></i> Comment
                    </button>
                    <button class="cf-action-btn" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
            ${commentsPreviewHTML}
            <div class="cf-add-comment" id="cf-comment-box-${post.id}">
                <div class="cf-comment-input-avatar" style="background-color: ${getAvatarColor(appState.currentUser.name || 'U')}">${(appState.currentUser.name || 'U').charAt(0).toUpperCase()}</div>
                <form class="cf-comment-form" onsubmit="event.preventDefault(); submitComment('${post.id}')">
                    <input type="text" id="cf-comment-input-${post.id}" placeholder="Write a comment..." autocomplete="off">
                    <button type="submit" class="cf-comment-send"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        </article>`;
}

function formatPostContent(content) {
    // Convert hashtags to styled spans
    let html = content.replace(/#(\w+)/g, '<span class="cf-hashtag">#$1</span>');
    // Convert URLs to links
    html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="cf-link">$1</a>');
    // Convert newlines to br
    html = html.replace(/\n/g, '<br>');
    return html;
}

function togglePostMenu(postId) {
    const menu = document.getElementById(`cf-menu-${postId}`);
    if (menu) {
        document.querySelectorAll('.cf-post-dropdown.visible').forEach(m => {
            if (m !== menu) m.classList.remove('visible');
        });
        menu.classList.toggle('visible');
    }
}

// Close menus on outside click
document.addEventListener('click', function(e) {
    if (!e.target.closest('.cf-post-menu')) {
        document.querySelectorAll('.cf-post-dropdown.visible').forEach(m => m.classList.remove('visible'));
    }
});

async function toggleLikePost(postId) {
    const post = appState.communityPosts.find(p => p.id === postId);
    if (!post) return;
    const userId = appState.currentUser.id;
    const likedBy = post.likedBy || [];
    const isLiked = likedBy.includes(userId);

    if (isLiked) {
        post.likedBy = likedBy.filter(id => id !== userId);
        post.likes = Math.max(0, (post.likes || 1) - 1);
    } else {
        post.likedBy = [...likedBy, userId];
        post.likes = (post.likes || 0) + 1;
    }

    saveCommunityPostsLocal(appState.communityPosts);

    try {
        await apiCall(`/community/posts/${postId}/like`, 'POST');
    } catch (e) { /* API may not exist yet */ }

    // Re-render just the post card
    const postEl = document.querySelector(`.cf-post-card[data-post-id="${postId}"]`);
    if (postEl) {
        postEl.outerHTML = renderPostCard(post);
    }
}

function focusCommentInput(postId) {
    const input = document.getElementById(`cf-comment-input-${postId}`);
    if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function submitComment(postId) {
    const input = document.getElementById(`cf-comment-input-${postId}`);
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const user = appState.currentUser;
    const newComment = {
        id: 'c-' + Date.now(),
        authorId: user.id,
        authorName: user.name,
        authorType: user.type,
        text: text,
        createdAt: new Date().toISOString()
    };

    const post = appState.communityPosts.find(p => p.id === postId);
    if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(newComment);
    }

    saveCommunityPostsLocal(appState.communityPosts);

    try {
        await apiCall(`/community/posts/${postId}/comments`, 'POST', { text });
    } catch (e) { /* API may not exist */ }

    input.value = '';

    const postEl = document.querySelector(`.cf-post-card[data-post-id="${postId}"]`);
    if (postEl) {
        postEl.outerHTML = renderPostCard(post);
    }
    showNotification('Comment added!', 'success');
}

function sharePost(postId) {
    const post = appState.communityPosts.find(p => p.id === postId);
    if (!post) return;
    const shareText = `Check out this post by ${post.authorName} on SteelConnect:\n\n${(post.content || '').substring(0, 200)}...`;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Post link copied to clipboard!', 'success');
        });
    } else {
        showNotification('Share functionality requires clipboard access.', 'info');
    }
}

// --- CREATE POST MODAL ---
function openCreatePostModal(editPost = null) {
    const isEdit = !!editPost;
    const user = appState.currentUser;
    const avatarColor = getAvatarColor(user.name || 'U');
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    appState.newPostImages = [];
    appState.newPostImageFiles = [];

    if (isEdit && editPost.images) {
        appState.newPostImages = editPost.images.map(img => typeof img === 'object' ? (img.url || img) : img);
    }

    const content = `
        <div class="cf-create-modal">
            <div class="cf-create-header">
                <h3>${isEdit ? '<i class="fas fa-edit"></i> Edit Post' : '<i class="fas fa-feather-alt"></i> Create Post'}</h3>
                <button class="cf-create-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="cf-create-author">
                <div class="cf-create-avatar-modal" style="background-color: ${avatarColor}">${initial}</div>
                <div>
                    <strong>${user.name || 'User'}</strong>
                    <span class="cf-create-role ${user.type}"><i class="fas ${user.type === 'designer' ? 'fa-drafting-compass' : 'fa-hard-hat'}"></i> ${user.type === 'designer' ? 'Designer' : 'Contractor'}</span>
                </div>
            </div>
            <div class="cf-create-body">
                <textarea id="cf-post-content-input" class="cf-post-textarea" placeholder="Share your technical expertise, project highlights, or industry insights...">${isEdit ? editPost.content : ''}</textarea>
                <div id="cf-post-image-preview" class="cf-image-preview-grid">
                    ${isEdit && editPost.images ? editPost.images.map((img, i) => {
                        const imgSrc = typeof img === 'object' ? (img.url || img) : img;
                        return `
                        <div class="cf-preview-img-item">
                            <img src="${imgSrc}" alt="Preview">
                            <button class="cf-remove-img" onclick="removePostImage(${i})"><i class="fas fa-times"></i></button>
                        </div>`;
                    }).join('') : ''}
                </div>
            </div>
            <div class="cf-create-toolbar">
                <div class="cf-toolbar-left">
                    <label class="cf-toolbar-btn" title="Add Images">
                        <i class="fas fa-image"></i>
                        <input type="file" id="cf-post-image-input" accept="image/*" multiple onchange="handlePostImageSelect(event)" style="display:none;">
                    </label>
                    <button type="button" class="cf-toolbar-btn" onclick="insertHashtag('#SteelDesign')" title="Add hashtag"><i class="fas fa-hashtag"></i></button>
                </div>
                <div class="cf-hashtag-suggestions">
                    <button type="button" class="cf-tag-btn" onclick="insertHashtag('#SteelDesign')">#SteelDesign</button>
                    <button type="button" class="cf-tag-btn" onclick="insertHashtag('#RebarDetailing')">#RebarDetailing</button>
                    <button type="button" class="cf-tag-btn" onclick="insertHashtag('#ProjectShowcase')">#ProjectShowcase</button>
                    <button type="button" class="cf-tag-btn" onclick="insertHashtag('#StructuralEngineering')">#Engineering</button>
                </div>
            </div>
            <div class="cf-create-footer">
                <span class="cf-char-hint"><i class="fas fa-info-circle"></i> Add images & hashtags to boost visibility</span>
                <button class="cf-publish-btn" id="cf-submit-post-btn" onclick="${isEdit ? `updateCommunityPost('${editPost.id}')` : 'submitNewPost()'}">
                    <i class="fas ${isEdit ? 'fa-save' : 'fa-paper-plane'}"></i> ${isEdit ? 'Save' : 'Publish'}
                </button>
            </div>
        </div>`;
    showGenericModal(content, 'max-width: 620px; padding: 0; border-radius: 20px; overflow: hidden;');
}

function handlePostImageSelect(event) {
    const files = Array.from(event.target.files);
    if (files.length + appState.newPostImages.length > 6) {
        showNotification('Maximum 6 images allowed per post.', 'warning');
        return;
    }
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) {
            showNotification(`File ${file.name} is too large. Max 10MB.`, 'warning');
            return;
        }
        appState.newPostImageFiles.push(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            appState.newPostImages.push(e.target.result);
            renderPostImagePreviews();
        };
        reader.readAsDataURL(file);
    });
}

function renderPostImagePreviews() {
    const container = document.getElementById('cf-post-image-preview');
    if (!container) return;
    container.innerHTML = appState.newPostImages.map((img, i) => {
        const src = typeof img === 'object' ? (img.url || '') : img;
        return `
        <div class="cf-preview-img-item">
            <img src="${src}" alt="Preview">
            <button class="cf-remove-img" onclick="removePostImage(${i})"><i class="fas fa-times"></i></button>
        </div>`;
    }).join('');
}

function removePostImage(index) {
    appState.newPostImages.splice(index, 1);
    appState.newPostImageFiles.splice(index, 1);
    renderPostImagePreviews();
}

function insertHashtag(tag) {
    const textarea = document.getElementById('cf-post-content-input');
    if (textarea) {
        const val = textarea.value;
        textarea.value = val + (val.endsWith(' ') || val === '' ? '' : ' ') + tag + ' ';
        textarea.focus();
    }
}

async function submitNewPost() {
    const textarea = document.getElementById('cf-post-content-input');
    const submitBtn = document.getElementById('cf-submit-post-btn');
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content) {
        showNotification('Please write something to post.', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Publishing...';

    try {
        let response;
        if (appState.newPostImageFiles && appState.newPostImageFiles.length > 0) {
            // Use FormData for actual file uploads
            const formData = new FormData();
            formData.append('content', content);
            appState.newPostImageFiles.forEach(file => {
                formData.append('images', file);
            });
            response = await apiCall('/community/posts', 'POST', formData);
        } else {
            // JSON body with base64 images or no images
            response = await apiCall('/community/posts', 'POST', { content, images: appState.newPostImages });
        }

        appState.newPostImages = [];
        appState.newPostImageFiles = [];
        closeModal();

        if (response.data && response.data.status === 'pending') {
            showNotification('Post submitted for review! It will appear in the feed after admin approval.', 'info');
        } else if (response.data) {
            appState.communityPosts.unshift(response.data);
            saveCommunityPostsLocal(appState.communityPosts);
            renderCommunityPostsList();
            updateCommunityProfileStats();
            showNotification('Post published successfully!', 'success');
        }
    } catch (e) {
        // Fallback: add locally if API fails
        const user = appState.currentUser;
        const newPost = {
            id: 'post-' + Date.now(),
            authorId: user.id,
            authorName: user.name,
            authorType: user.type,
            content: content,
            images: [...appState.newPostImages],
            likes: 0,
            comments: [],
            likedBy: [],
            createdAt: new Date().toISOString()
        };
        appState.communityPosts.unshift(newPost);
        saveCommunityPostsLocal(appState.communityPosts);
        appState.newPostImages = [];
        appState.newPostImageFiles = [];
        closeModal();
        renderCommunityPostsList();
        updateCommunityProfileStats();
        showNotification('Post saved locally (pending sync).', 'info');
    }
}

function editCommunityPost(postId) {
    const post = appState.communityPosts.find(p => p.id === postId);
    if (!post) return;
    openCreatePostModal(post);
}

async function updateCommunityPost(postId) {
    const textarea = document.getElementById('cf-post-content-input');
    const submitBtn = document.getElementById('cf-submit-post-btn');
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content) {
        showNotification('Post content cannot be empty.', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Saving...';

    try {
        let response;
        if (appState.newPostImageFiles && appState.newPostImageFiles.length > 0) {
            const formData = new FormData();
            formData.append('content', content);
            appState.newPostImageFiles.forEach(file => {
                formData.append('images', file);
            });
            response = await apiCall(`/community/posts/${postId}`, 'PUT', formData);
        } else {
            response = await apiCall(`/community/posts/${postId}`, 'PUT', { content, images: appState.newPostImages });
        }

        if (response.data) {
            const post = appState.communityPosts.find(p => p.id === postId);
            if (post) {
                post.content = content;
                post.images = response.data.images || [...appState.newPostImages];
            }
        }

        saveCommunityPostsLocal(appState.communityPosts);
        appState.newPostImageFiles = [];
        closeModal();
        renderCommunityPostsList();

        if (response && response.data && response.data.status === 'pending') {
            showNotification('Post updated and resubmitted for review!', 'info');
        } else {
            showNotification('Post updated!', 'success');
        }
    } catch (e) {
        // Fallback: update locally
        const post = appState.communityPosts.find(p => p.id === postId);
        if (post) {
            post.content = content;
            post.images = [...appState.newPostImages];
        }
        saveCommunityPostsLocal(appState.communityPosts);
        appState.newPostImageFiles = [];
        closeModal();
        renderCommunityPostsList();
        showNotification('Post updated locally.', 'info');
    }
}

async function deleteCommunityPost(postId) {
    if (!confirm('Are you sure you want to delete this post?')) return;
    appState.communityPosts = appState.communityPosts.filter(p => p.id !== postId);
    saveCommunityPostsLocal(appState.communityPosts);
    try {
        await apiCall(`/community/posts/${postId}`, 'DELETE');
    } catch (e) { /* API may not exist */ }
    renderCommunityPostsList();
    updateCommunityProfileStats();
    showNotification('Post deleted.', 'info');
}

// --- POST DETAIL VIEW (FULL COMMENT THREAD) ---
function openPostDetailView(postId) {
    const post = appState.communityPosts.find(p => p.id === postId);
    if (!post) return;
    const avatarColor = getAvatarColor(post.authorName || 'U');
    const initial = (post.authorName || 'U').charAt(0).toUpperCase();
    const timeAgo = getTimeAgo(post.createdAt);
    const contentHTML = formatPostContent(post.content || '');
    const user = appState.currentUser;
    const userAvatarColor = getAvatarColor(user.name || 'U');
    const userInitial = (user.name || 'U').charAt(0).toUpperCase();
    const isLiked = (post.likedBy || []).includes(user.id);

    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
        imagesHTML = `<div class="cf-detail-images">
            ${post.images.map(img => {
                const src = typeof img === 'object' ? (img.url || '') : img;
                return `<img src="${src}" alt="Post image" class="cf-detail-img" onclick="openPostImageViewer('${src}')">`;
            }).join('')}
        </div>`;
    }

    const commentsHTML = (post.comments || []).map(c => {
        const cColor = getAvatarColor(c.authorName || 'U');
        const cInitial = (c.authorName || 'U').charAt(0).toUpperCase();
        const canDeleteComment = c.authorId === user.id || post.authorId === user.id;
        return `
            <div class="cf-detail-comment">
                <div class="cf-detail-comment-avatar" style="background-color: ${cColor}">${cInitial}</div>
                <div class="cf-detail-comment-body">
                    <div class="cf-detail-comment-header">
                        <strong>${c.authorName || 'Unknown'}</strong>
                        <span class="cf-comment-role ${c.authorType || ''}">${c.authorType === 'designer' ? 'Designer' : 'Contractor'}</span>
                        ${canDeleteComment ? `<button class="cf-comment-delete-btn" onclick="event.stopPropagation(); deleteComment('${post.id}', '${c.id}'); closeModal(); setTimeout(() => openPostDetailView('${post.id}'), 200);" title="Delete comment"><i class="fas fa-trash-alt"></i></button>` : ''}
                    </div>
                    <p>${c.text || ''}</p>
                    <span class="cf-detail-comment-time"><i class="far fa-clock"></i> ${getTimeAgo(c.createdAt)}</span>
                </div>
            </div>`;
    }).join('');

    const modalContent = `
        <div class="cf-detail-modal">
            <div class="cf-detail-top-bar">
                <span class="cf-detail-title"><i class="fas fa-comment-dots"></i> Post Detail</span>
                <button class="cf-detail-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="cf-detail-post-header">
                <div class="cf-post-avatar-wrap">
                    <div class="cf-post-avatar" style="background-color: ${avatarColor}">${initial}</div>
                    <span class="cf-post-avatar-badge ${post.authorType || ''}"><i class="fas ${post.authorType === 'designer' ? 'fa-drafting-compass' : 'fa-hard-hat'}"></i></span>
                </div>
                <div class="cf-post-author-info">
                    <div class="cf-post-author-top">
                        <h4>${post.authorName || 'Unknown User'}</h4>
                        <span class="cf-post-author-role ${post.authorType || ''}">${post.authorType === 'designer' ? 'Designer' : 'Contractor'}</span>
                    </div>
                    <span class="cf-post-time"><i class="far fa-clock"></i> ${timeAgo}</span>
                </div>
            </div>
            <div class="cf-detail-content">${contentHTML}</div>
            ${imagesHTML}
            <div class="cf-detail-engagement">
                <div class="cf-detail-stats">
                    <span><i class="fas fa-heart" style="color: #ef4444;"></i> ${post.likes || 0} likes</span>
                    <span><i class="fas fa-comment-dots" style="color: #2563eb;"></i> ${(post.comments || []).length} comments</span>
                </div>
                <div class="cf-detail-actions">
                    <button class="cf-action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}'); closeModal(); setTimeout(() => openPostDetailView('${post.id}'), 200);">
                        <i class="fas fa-heart"></i> ${isLiked ? 'Liked' : 'Like'}
                    </button>
                    <button class="cf-action-btn" onclick="sharePost('${post.id}')">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                </div>
            </div>
            <div class="cf-detail-comments-section">
                <h4><i class="fas fa-comments"></i> Comments (${(post.comments || []).length})</h4>
                <div class="cf-detail-comments-list">
                    ${commentsHTML || '<div class="cf-no-comments"><i class="far fa-comment-dots"></i><p>No comments yet. Start the conversation!</p></div>'}
                </div>
            </div>
            <div class="cf-detail-comment-input">
                <div class="cf-comment-input-avatar" style="background-color: ${userAvatarColor}">${userInitial}</div>
                <form class="cf-comment-form" onsubmit="event.preventDefault(); submitCommentFromDetail('${post.id}')">
                    <input type="text" id="cf-detail-comment-input" placeholder="Write a comment..." autocomplete="off">
                    <button type="submit" class="cf-comment-send"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        </div>`;
    showGenericModal(modalContent, 'max-width: 680px; padding: 0; border-radius: 20px; overflow: hidden; max-height: 85vh; overflow-y: auto;');
}

async function submitCommentFromDetail(postId) {
    const input = document.getElementById('cf-detail-comment-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const user = appState.currentUser;
    const newComment = {
        id: 'c-' + Date.now(),
        authorId: user.id,
        authorName: user.name,
        authorType: user.type,
        text: text,
        createdAt: new Date().toISOString()
    };

    const post = appState.communityPosts.find(p => p.id === postId);
    if (post) {
        if (!post.comments) post.comments = [];
        post.comments.push(newComment);
    }

    saveCommunityPostsLocal(appState.communityPosts);

    try {
        await apiCall(`/community/posts/${postId}/comments`, 'POST', { text });
    } catch (e) { /* API may not exist */ }

    closeModal();
    openPostDetailView(postId);
    // Also update the feed card
    const postEl = document.querySelector(`.cf-post-card[data-post-id="${postId}"]`);
    if (postEl) {
        postEl.outerHTML = renderPostCard(post);
    }
    showNotification('Comment added!', 'success');
}

async function deleteComment(postId, commentId) {
    if (!confirm('Delete this comment?')) return;
    const post = appState.communityPosts.find(p => p.id === postId);
    if (post && post.comments) {
        post.comments = post.comments.filter(c => c.id !== commentId);
    }
    saveCommunityPostsLocal(appState.communityPosts);

    try {
        await apiCall(`/community/posts/${postId}/comments/${commentId}`, 'DELETE');
    } catch (e) { /* fallback: already removed locally */ }

    // Re-render the post card in feed
    const postEl = document.querySelector(`.cf-post-card[data-post-id="${postId}"]`);
    if (postEl && post) {
        postEl.outerHTML = renderPostCard(post);
    }
    showNotification('Comment deleted.', 'info');
}

function openPostImageViewer(imageUrl) {
    const content = `
        <div class="cf-image-viewer">
            <img src="${imageUrl}" alt="Full size image">
        </div>`;
    showGenericModal(content, 'max-width: 900px; padding: 0; background: transparent; box-shadow: none;');
}


// --- PROJECT TRACKING DASHBOARD ---
let projectTrackingFilter = 'all';

async function renderProjectTrackingDashboard() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-project-diagram"></i> Project Tracking</h2>
                <p class="header-subtitle">Monitor all your projects, statuses, and communications in one place</p>
            </div>
        </div>
        <div class="pt-dashboard">
            <div class="pt-stats-row" id="pt-stats-row"></div>
            <div class="pt-controls">
                <div class="pt-filter-group">
                    <button class="pt-filter-btn active" data-filter="all" onclick="filterProjectTracking('all')">All Projects</button>
                    <button class="pt-filter-btn" data-filter="open" onclick="filterProjectTracking('open')">Open</button>
                    <button class="pt-filter-btn" data-filter="assigned" onclick="filterProjectTracking('assigned')">In Progress</button>
                    <button class="pt-filter-btn" data-filter="completed" onclick="filterProjectTracking('completed')">Completed</button>
                </div>
                <div class="pt-search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="pt-search-input" placeholder="Search projects..." oninput="searchProjectTracking(this.value)">
                </div>
            </div>
            <div class="pt-project-list" id="pt-project-list">
                <div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div>
            </div>
        </div>`;
    await loadProjectTrackingData();
}

async function loadProjectTrackingData() {
    const statsRow = document.getElementById('pt-stats-row');
    const listContainer = document.getElementById('pt-project-list');
    try {
        const isDesigner = appState.currentUser.type === 'designer';
        const endpoint = isDesigner
            ? `/jobs/assigned/${appState.currentUser.id}`
            : `/jobs/user/${appState.currentUser.id}`;
        const response = await apiCall(endpoint, 'GET');
        const allJobs = response.data || [];
        appState.trackingProjects = allJobs;

        const totalProjects = allJobs.length;
        const openProjects = allJobs.filter(j => j.status === 'open').length;
        const assignedProjects = allJobs.filter(j => j.status === 'assigned').length;
        const completedProjects = allJobs.filter(j => j.status === 'completed').length;
        const totalQuotes = allJobs.reduce((sum, j) => sum + (j.quotesCount || 0), 0);

        statsRow.innerHTML = `
            <div class="pt-stat-card" onclick="filterProjectTracking('all')">
                <div class="pt-stat-icon total"><i class="fas fa-folder-open"></i></div>
                <div class="pt-stat-info">
                    <span class="pt-stat-number">${totalProjects}</span>
                    <span class="pt-stat-label">Total Projects</span>
                </div>
            </div>
            <div class="pt-stat-card" onclick="filterProjectTracking('open')">
                <div class="pt-stat-icon open"><i class="fas fa-door-open"></i></div>
                <div class="pt-stat-info">
                    <span class="pt-stat-number">${openProjects}</span>
                    <span class="pt-stat-label">Open</span>
                </div>
            </div>
            <div class="pt-stat-card" onclick="filterProjectTracking('assigned')">
                <div class="pt-stat-icon assigned"><i class="fas fa-spinner"></i></div>
                <div class="pt-stat-info">
                    <span class="pt-stat-number">${assignedProjects}</span>
                    <span class="pt-stat-label">In Progress</span>
                </div>
            </div>
            <div class="pt-stat-card" onclick="filterProjectTracking('completed')">
                <div class="pt-stat-icon completed"><i class="fas fa-check-double"></i></div>
                <div class="pt-stat-info">
                    <span class="pt-stat-number">${completedProjects}</span>
                    <span class="pt-stat-label">Completed</span>
                </div>
            </div>
            <div class="pt-stat-card">
                <div class="pt-stat-icon quotes"><i class="fas fa-file-invoice-dollar"></i></div>
                <div class="pt-stat-info">
                    <span class="pt-stat-number">${totalQuotes}</span>
                    <span class="pt-stat-label">Total Quotes</span>
                </div>
            </div>`;

        renderProjectTrackingList(allJobs);
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>Please try again.</p><button class="btn btn-primary" onclick="renderProjectTrackingDashboard()">Retry</button></div>`;
    }
}

function filterProjectTracking(status) {
    projectTrackingFilter = status;
    document.querySelectorAll('.pt-filter-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.filter === status));
    const searchVal = document.getElementById('pt-search-input')?.value || '';
    let filtered = appState.trackingProjects || [];
    if (status !== 'all') filtered = filtered.filter(j => j.status === status);
    if (searchVal.trim()) filtered = filtered.filter(j => j.title.toLowerCase().includes(searchVal.toLowerCase()));
    renderProjectTrackingList(filtered);
}

function searchProjectTracking(query) {
    let filtered = appState.trackingProjects || [];
    if (projectTrackingFilter !== 'all') filtered = filtered.filter(j => j.status === projectTrackingFilter);
    if (query.trim()) filtered = filtered.filter(j => j.title.toLowerCase().includes(query.toLowerCase()) || (j.description && j.description.toLowerCase().includes(query.toLowerCase())));
    renderProjectTrackingList(filtered);
}

function renderProjectTrackingList(projects) {
    const listContainer = document.getElementById('pt-project-list');
    if (!projects || projects.length === 0) {
        listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-list"></i></div><h3>No Projects Found</h3><p>No projects match your current filter.</p></div>`;
        return;
    }
    listContainer.innerHTML = projects.map(job => {
        const progress = getProjectProgress(job);
        const statusConfig = getStatusConfig(job.status);
        const deadlineStr = job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline';
        const createdStr = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        const isOverdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed';
        return `
            <div class="pt-project-card" onclick="renderProjectDetailView('${job.id}')">
                <div class="pt-project-header">
                    <div class="pt-project-title-row">
                        <h3 class="pt-project-title">${job.title}</h3>
                        <span class="pt-status-badge ${job.status}">
                            <i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}
                        </span>
                    </div>
                    <p class="pt-project-desc">${job.description ? (job.description.length > 120 ? job.description.substring(0, 120) + '...' : job.description) : 'No description'}</p>
                </div>
                <div class="pt-progress-section">
                    <div class="pt-progress-header">
                        <span class="pt-progress-label">Progress</span>
                        <span class="pt-progress-value">${progress}%</span>
                    </div>
                    <div class="pt-progress-bar">
                        <div class="pt-progress-fill ${job.status}" style="width: ${progress}%"></div>
                    </div>
                </div>
                <div class="pt-project-meta">
                    <div class="pt-meta-item">
                        <i class="fas fa-dollar-sign"></i>
                        <span>${job.budget || 'N/A'}</span>
                    </div>
                    <div class="pt-meta-item ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-calendar-alt"></i>
                        <span>${deadlineStr}${isOverdue ? ' (Overdue)' : ''}</span>
                    </div>
                    <div class="pt-meta-item">
                        <i class="fas fa-file-invoice-dollar"></i>
                        <span>${job.quotesCount || 0} Quotes</span>
                    </div>
                    ${appState.currentUser.type === 'designer' && job.posterName ? `<div class="pt-meta-item"><i class="fas fa-user-tie"></i><span>${job.posterName}</span></div>` : ''}
                    ${appState.currentUser.type !== 'designer' && job.assignedToName ? `<div class="pt-meta-item"><i class="fas fa-user-check"></i><span>${job.assignedToName}</span></div>` : ''}
                </div>
                <div class="pt-project-footer">
                    <span class="pt-created">${createdStr ? 'Created ' + createdStr : ''}</span>
                    <span class="pt-view-details"><i class="fas fa-arrow-right"></i> View Details</span>
                </div>
            </div>`;
    }).join('');
}

function getProjectProgress(job) {
    if (job.status === 'completed') return 100;
    if (job.status === 'assigned') return 60;
    if (job.status === 'open' && (job.quotesCount || 0) > 0) return 30;
    if (job.status === 'open') return 10;
    return 0;
}

function getStatusConfig(status) {
    const configs = {
        'open': { label: 'Open', icon: 'fa-door-open', color: '#3b82f6' },
        'assigned': { label: 'In Progress', icon: 'fa-spinner', color: '#f59e0b' },
        'completed': { label: 'Completed', icon: 'fa-check-double', color: '#10b981' }
    };
    return configs[status] || { label: status, icon: 'fa-question-circle', color: '#94a3b8' };
}

// --- PROJECT DETAIL VIEW WITH TIMELINE & CHAT ---
async function renderProjectDetailView(jobId) {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading project details...</p></div>`;
    try {
        const jobResponse = await apiCall(`/jobs/${jobId}`, 'GET');
        const job = jobResponse.data;
        if (!job) throw new Error('Project not found');
        // Merge poster info from tracking data (designers get posterEmail from assigned endpoint)
        const trackingJob = (appState.trackingProjects || []).find(j => j.id === jobId);
        if (trackingJob) {
            if (trackingJob.posterEmail) job.posterEmail = trackingJob.posterEmail;
            if (trackingJob.posterName) job.posterName = trackingJob.posterName;
            if (trackingJob.posterCompany) job.posterCompany = trackingJob.posterCompany;
        }
        const isDesignerView = appState.currentUser.type === 'designer';

        const progress = getProjectProgress(job);
        const statusConfig = getStatusConfig(job.status);
        const deadlineStr = job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'No deadline set';
        const createdStr = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
        const isOverdue = job.deadline && new Date(job.deadline) < new Date() && job.status !== 'completed';

        const milestones = buildProjectMilestones(job);

        const skillsHTML = job.skills?.length > 0 ? `<div class="pt-detail-skills">${job.skills.map(s => `<span class="pt-skill-tag">${s}</span>`).join('')}</div>` : '';

        const attachmentsHTML = job.attachments?.length > 0 ? `
            <div class="pt-detail-section">
                <h3><i class="fas fa-paperclip"></i> Attachments</h3>
                <div class="pt-attachments-list">
                    ${job.attachments.map((att, i) => `
                        <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="pt-attachment-item">
                            <i class="fas fa-file"></i>
                            <span>${att.name || 'File ' + (i + 1)}</span>
                            <i class="fas fa-external-link-alt"></i>
                        </a>`).join('')}
                </div>
            </div>` : '';

        container.innerHTML = `
            <div class="pt-detail-container">
                <div class="pt-detail-topbar">
                    <button class="back-btn premium-back-btn" onclick="renderProjectTrackingDashboard()">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <div class="pt-detail-breadcrumb">
                        <span onclick="renderProjectTrackingDashboard()" class="pt-breadcrumb-link">Project Tracking</span>
                        <i class="fas fa-chevron-right"></i>
                        <span class="pt-breadcrumb-current">${job.title}</span>
                    </div>
                </div>

                <div class="pt-detail-hero">
                    <div class="pt-detail-hero-info">
                        <div class="pt-detail-title-row">
                            <h2>${job.title}</h2>
                            <span class="pt-status-badge large ${job.status}">
                                <i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}
                            </span>
                        </div>
                        <p class="pt-detail-desc">${job.description || 'No description provided.'}</p>
                        ${skillsHTML}
                    </div>
                    <div class="pt-detail-hero-stats">
                        <div class="pt-hero-stat">
                            <span class="pt-hero-stat-label">Budget</span>
                            <span class="pt-hero-stat-value">${job.budget || 'N/A'}</span>
                        </div>
                        <div class="pt-hero-stat">
                            <span class="pt-hero-stat-label">Deadline</span>
                            <span class="pt-hero-stat-value ${isOverdue ? 'overdue' : ''}">${deadlineStr}${isOverdue ? ' (Overdue)' : ''}</span>
                        </div>
                        <div class="pt-hero-stat">
                            <span class="pt-hero-stat-label">Created</span>
                            <span class="pt-hero-stat-value">${createdStr}</span>
                        </div>
                        ${!isDesignerView && job.assignedToName ? `<div class="pt-hero-stat"><span class="pt-hero-stat-label">Assigned To</span><span class="pt-hero-stat-value">${job.assignedToName}</span></div>` : ''}
                        ${isDesignerView && job.posterName ? `<div class="pt-hero-stat"><span class="pt-hero-stat-label">Client</span><span class="pt-hero-stat-value">${job.posterName}</span></div>` : ''}
                        ${isDesignerView && job.posterEmail ? `<div class="pt-hero-stat"><span class="pt-hero-stat-label">Client Email</span><span class="pt-hero-stat-value"><i class="fas fa-envelope" style="margin-right:4px;font-size:12px;color:#6366f1"></i>${job.posterEmail}</span></div>` : ''}
                        ${job.approvedAmount ? `<div class="pt-hero-stat"><span class="pt-hero-stat-label">Approved Amount</span><span class="pt-hero-stat-value">${job.approvedAmount}</span></div>` : ''}
                    </div>
                </div>

                <div class="pt-detail-grid">
                    <div class="pt-detail-main">
                        <div class="pt-detail-section">
                            <h3><i class="fas fa-tasks"></i> Project Progress</h3>
                            <div class="pt-detail-progress">
                                <div class="pt-detail-progress-bar">
                                    <div class="pt-progress-fill ${job.status}" style="width: ${progress}%"></div>
                                </div>
                                <span class="pt-detail-progress-text">${progress}% Complete</span>
                            </div>
                        </div>

                        <div class="pt-detail-section">
                            <h3><i class="fas fa-stream"></i> Project Timeline</h3>
                            <div class="pt-timeline">
                                ${milestones.map(m => `
                                    <div class="pt-timeline-item ${m.status}">
                                        <div class="pt-timeline-marker">
                                            <i class="fas ${m.icon}"></i>
                                        </div>
                                        <div class="pt-timeline-content">
                                            <h4>${m.title}</h4>
                                            <p>${m.description}</p>
                                            <span class="pt-timeline-date">${m.date}</span>
                                        </div>
                                    </div>`).join('')}
                            </div>
                        </div>

                        ${attachmentsHTML}

                        <div class="pt-detail-section">
                            <h3><i class="fas fa-comments"></i> Chat History</h3>
                            <div id="pt-chat-history" class="pt-chat-history">
                                <div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>
                            </div>
                        </div>
                    </div>

                    <div class="pt-detail-sidebar">
                        <div class="pt-sidebar-card">
                            <h4><i class="fas fa-info-circle"></i> Quick Info</h4>
                            <div class="pt-quick-info">
                                <div class="pt-info-row"><span class="pt-info-label">Status</span><span class="pt-status-badge small ${job.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span></div>
                                <div class="pt-info-row"><span class="pt-info-label">Quotes</span><span class="pt-info-value">${job.quotesCount || 0}</span></div>
                                <div class="pt-info-row"><span class="pt-info-label">Budget</span><span class="pt-info-value">${job.budget || 'N/A'}</span></div>
                                ${job.link ? `<div class="pt-info-row"><span class="pt-info-label">Link</span><a href="${job.link}" target="_blank" class="pt-info-link"><i class="fas fa-external-link-alt"></i> View</a></div>` : ''}
                            </div>
                        </div>

                        ${isDesignerView && job.posterEmail ? `
                        <div class="pt-sidebar-card pt-invoice-card">
                            <h4><i class="fas fa-file-invoice-dollar"></i> Send Invoice</h4>
                            <div class="pt-invoice-info">
                                <p class="pt-invoice-hint">Send invoices to the client for this project</p>
                                ${job.posterName ? `<div class="pt-info-row"><span class="pt-info-label">Client</span><span class="pt-info-value">${job.posterName}</span></div>` : ''}
                                ${job.posterCompany ? `<div class="pt-info-row"><span class="pt-info-label">Company</span><span class="pt-info-value">${job.posterCompany}</span></div>` : ''}
                                <div class="pt-info-row pt-email-row">
                                    <span class="pt-info-label">Email</span>
                                    <span class="pt-info-value pt-email-value"><i class="fas fa-envelope"></i> ${job.posterEmail}</span>
                                </div>
                                <div class="pt-invoice-actions">
                                    <a href="mailto:${job.posterEmail}?subject=Invoice for ${encodeURIComponent(job.title)}&body=${encodeURIComponent('Dear ' + (job.posterName || 'Client') + ',\\n\\nPlease find attached the invoice for the project: ' + job.title + '.\\n\\nBest regards,\\n' + (appState.currentUser.name || 'Designer'))}" class="btn btn-primary btn-block"><i class="fas fa-envelope"></i> Email Invoice</a>
                                    <button class="btn btn-outline btn-block" onclick="openConversation('${job.id}', '${job.posterId}')"><i class="fas fa-paperclip"></i> Send via Messages</button>
                                </div>
                            </div>
                        </div>` : ''}

                        <div class="pt-sidebar-card">
                            <h4><i class="fas fa-bolt"></i> Quick Actions</h4>
                            <div class="pt-sidebar-actions">
                                ${!isDesignerView && job.status === 'open' ? `<button class="btn btn-primary btn-block" onclick="renderAppSection('jobs')"><i class="fas fa-eye"></i> View Quotes</button>` : ''}
                                ${!isDesignerView && job.status === 'assigned' && job.assignedTo ? `<button class="btn btn-primary btn-block" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button>` : ''}
                                ${isDesignerView && job.posterId ? `<button class="btn btn-primary btn-block" onclick="openConversation('${job.id}', '${job.posterId}')"><i class="fas fa-comments"></i> Message Client</button>` : ''}
                                ${!isDesignerView && job.status === 'assigned' ? `<button class="btn btn-success btn-block" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button>` : ''}
                                <button class="btn btn-outline btn-block" onclick="renderProjectTrackingDashboard()"><i class="fas fa-arrow-left"></i> Back to Tracking</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

        loadProjectChatHistory(jobId);
    } catch (error) {
        container.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Project</h3><p>Could not load project details. Please try again.</p><button class="btn btn-primary" onclick="renderProjectTrackingDashboard()">Back to Tracking</button></div>`;
    }
}

function buildProjectMilestones(job) {
    const milestones = [];
    const created = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
    milestones.push({
        title: 'Project Created',
        description: 'Project was posted and is open for quotes.',
        date: created,
        icon: 'fa-plus-circle',
        status: 'completed'
    });

    const isDesigner = appState.currentUser.type === 'designer';
    if ((job.quotesCount || 0) > 0) {
        milestones.push({
            title: isDesigner ? 'Quote Submitted' : 'Quotes Received',
            description: isDesigner ? 'Your quote has been submitted for this project.' : `${job.quotesCount} quote(s) have been submitted by designers.`,
            date: '',
            icon: 'fa-file-invoice-dollar',
            status: 'completed'
        });
    } else if (job.status === 'open') {
        milestones.push({
            title: 'Awaiting Quotes',
            description: isDesigner ? 'Submit a quote for this project.' : 'Waiting for designers to submit quotes.',
            date: '',
            icon: 'fa-clock',
            status: 'active'
        });
    }

    if (job.status === 'assigned' || job.status === 'completed') {
        milestones.push({
            title: isDesigner ? 'You Were Assigned' : 'Designer Assigned',
            description: isDesigner ? 'You have been assigned to this project.' : `${job.assignedToName || 'A designer'} has been assigned to this project.`,
            date: '',
            icon: 'fa-user-check',
            status: 'completed'
        });
        milestones.push({
            title: 'Work In Progress',
            description: 'The project is actively being worked on.',
            date: '',
            icon: 'fa-hammer',
            status: job.status === 'completed' ? 'completed' : 'active'
        });
    } else {
        milestones.push({
            title: isDesigner ? 'Get Assigned' : 'Assign Designer',
            description: isDesigner ? 'Waiting for the client to approve your quote.' : 'Review and approve a quote to assign a designer.',
            date: '',
            icon: 'fa-user-plus',
            status: 'pending'
        });
        milestones.push({
            title: 'Work In Progress',
            description: isDesigner ? 'Work begins once you are assigned.' : 'Designer will begin working once assigned.',
            date: '',
            icon: 'fa-hammer',
            status: 'pending'
        });
    }

    if (job.status === 'completed') {
        milestones.push({
            title: 'Project Completed',
            description: 'This project has been completed successfully.',
            date: '',
            icon: 'fa-trophy',
            status: 'completed'
        });
    } else {
        const deadlineStr = job.deadline ? new Date(job.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
        milestones.push({
            title: 'Project Completion',
            description: deadlineStr ? `Target deadline: ${deadlineStr}` : 'Pending completion.',
            date: '',
            icon: 'fa-flag-checkered',
            status: 'pending'
        });
    }
    return milestones;
}

async function loadProjectChatHistory(jobId) {
    const chatContainer = document.getElementById('pt-chat-history');
    if (!chatContainer) return;
    try {
        const response = await apiCall('/messages', 'GET');
        const allConversations = response.data || [];
        const projectConversations = allConversations.filter(c => c.jobId === jobId);

        if (projectConversations.length === 0) {
            chatContainer.innerHTML = `
                <div class="pt-no-chat">
                    <i class="fas fa-comment-slash"></i>
                    <p>No conversations yet for this project.</p>
                    <span>Conversations will appear here once a quote is approved and messaging begins.</span>
                </div>`;
            return;
        }

        let chatHTML = '';
        for (const convo of projectConversations) {
            const other = convo.participants ? convo.participants.find(p => p.id !== appState.currentUser.id) : null;
            const otherName = other ? other.name : 'Unknown User';
            const avatarColor = getAvatarColor(otherName);

            let messagesHTML = '';
            try {
                const msgResponse = await apiCall(`/messages/${convo.id}/messages`, 'GET');
                const messages = (msgResponse.data || []).slice(-10);
                if (messages.length > 0) {
                    messagesHTML = messages.map(msg => {
                        const isMine = msg.senderId === appState.currentUser.id;
                        const timestamp = formatDetailedTimestamp(msg.createdAt);
                        const senderColor = getAvatarColor(msg.senderName || 'U');
                        return `
                            <div class="pt-chat-message ${isMine ? 'me' : 'them'}">
                                ${!isMine ? `<div class="pt-chat-avatar" style="background-color: ${senderColor}">${(msg.senderName || 'U').charAt(0).toUpperCase()}</div>` : ''}
                                <div class="pt-chat-bubble ${isMine ? 'me' : 'them'}">
                                    ${!isMine ? `<span class="pt-chat-sender">${msg.senderName || 'Unknown'}</span>` : ''}
                                    <p>${msg.text || ''}</p>
                                    <span class="pt-chat-time">${timestamp}</span>
                                </div>
                            </div>`;
                    }).join('');
                }
            } catch (e) {
                messagesHTML = '<p class="pt-chat-error">Could not load messages.</p>';
            }

            chatHTML += `
                <div class="pt-chat-thread">
                    <div class="pt-chat-thread-header">
                        <div class="pt-chat-participant">
                            <div class="pt-chat-avatar" style="background-color: ${avatarColor}">${otherName.charAt(0).toUpperCase()}</div>
                            <div class="pt-chat-participant-info">
                                <strong>${otherName}</strong>
                                <span class="participant-type ${other?.type || ''}">${other?.type || 'user'}</span>
                            </div>
                        </div>
                        <button class="btn btn-outline btn-sm" onclick="renderConversationView('${convo.id}')">
                            <i class="fas fa-expand-alt"></i> Open Full Chat
                        </button>
                    </div>
                    <div class="pt-chat-messages-preview">
                        ${messagesHTML || '<p class="pt-chat-empty">No messages yet.</p>'}
                    </div>
                </div>`;
        }
        chatContainer.innerHTML = chatHTML;
    } catch (error) {
        chatContainer.innerHTML = `
            <div class="pt-no-chat">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Could not load chat history.</p>
                <button class="btn btn-outline btn-sm" onclick="loadProjectChatHistory('${jobId}')">Retry</button>
            </div>`;
    }
}


// --- SUPPORT SECTION FUNCTIONS (UPDATED) ---
let supportFiles = []; // Global variable for support files

function renderSupportSection() {
    const container = document.getElementById('app-container');

    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-life-ring"></i> Support Center</h2>
                <p class="header-subtitle">Get help and contact our support team</p>
            </div>
        </div>

        <div class="support-container">
            <div class="support-section">
                <h3><i class="fas fa-question-circle"></i> Frequently Asked Questions</h3>
                <div class="faq-grid">
                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <h4>How do I post a project?</h4>
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="faq-answer">
                            <p>Navigate to "Post Project" in the sidebar, fill out the project details, and click submit. Your project will be visible to designers once approved.</p>
                        </div>
                    </div>

                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <h4>How does the AI estimation work?</h4>
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="faq-answer">
                            <p>Upload your project drawings and specifications. Our AI analyzes the documents and provides cost estimates based on current market rates and material costs.</p>
                        </div>
                    </div>

                    <div class="faq-item" onclick="toggleFAQ(this)">
                        <div class="faq-question">
                            <h4>How do I communicate with designers/clients?</h4>
                            <i class="fas fa-chevron-down"></i>
                        </div>
                        <div class="faq-answer">
                            <p>Use the Messages section to communicate directly with other users. Conversations are automatically created when quotes are submitted or approved.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="support-section">
                <h3><i class="fas fa-history"></i> My Support Tickets</h3>
                <div id="support-tickets-history" class="support-tickets-container">
                    <div class="loading-spinner"><div class="spinner"></div><p>Loading your support tickets...</p></div>
                </div>
                <button class="btn btn-outline" onclick="loadSupportTickets()">
                    <i class="fas fa-sync-alt"></i> Refresh
                </button>
            </div>

            <div class="support-section">
                <h3><i class="fas fa-envelope"></i> Contact Support</h3>
                <div class="contact-support-card">
                    <div class="support-intro">
                        <p>Can't find what you're looking for? Send us a message and our support team will get back to you within 24 hours.</p>
                    </div>

                    <form id="support-form" class="premium-form support-form">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-tag"></i> Subject
                            </label>
                            <select class="form-select" name="subject" required>
                                <option value="" disabled selected>Select a topic</option>
                                <option value="Technical Issue">Technical Issue</option>
                                <option value="Account Problem">Account Problem</option>
                                <option value="Payment Issue">Payment Issue</option>
                                <option value="Project Help">Project Help</option>
                                <option value="AI Estimation">AI Estimation</option>
                                <option value="Profile/Verification">Profile/Verification</option>
                                <option value="Feature Request">Feature Request</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-exclamation-circle"></i> Priority
                            </label>
                            <select class="form-select" name="priority" required>
                                <option value="" disabled selected>Select priority</option>
                                <option value="Low">Low - General question</option>
                                <option value="Medium">Medium - Need help soon</option>
                                <option value="High">High - Urgent issue</option>
                                <option value="Critical">Critical - System down</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-file-alt"></i> Description
                            </label>
                            <textarea
                                 class="form-textarea"
                                 name="message"
                                 required
                                 rows="6"
                                placeholder="Please describe your issue or question in detail. Include any error messages, steps you tried, or specific information that might help us assist you better."
                            ></textarea>
                        </div>

                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-paperclip"></i> Attachments (Optional)
                            </label>
                            <div class="custom-file-input-wrapper">
                                <input
                                     type="file"
                                     name="attachments"
                                     id="support-attachments-input"
                                    onchange="handleSupportFileChange(event)"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                                     multiple
                                >
                                <div class="custom-file-input">
                                    <span class="custom-file-input-label">
                                        <i class="fas fa-upload"></i>
                                        <span id="support-attachments-label">Click to upload screenshots or files</span>
                                    </span>
                                </div>
                            </div>
                            <div id="support-attachments-list" class="file-list-container"></div>
                            <small class="form-help">
                                Upload screenshots, error logs, or relevant files. Max 5 files, 10MB each.
                            </small>
                        </div>

                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-large">
                                <i class="fas fa-paper-plane"></i>
                                 Send Support Request
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Load existing support tickets
    loadSupportTickets();

    // Setup form submission
    document.getElementById('support-form').addEventListener('submit', handleSupportSubmit);

    // Setup file drag and drop
    setupSupportFileDragDrop();
}

// Load user's support tickets
async function loadSupportTickets() {
    const container = document.getElementById('support-tickets-history');
    if (!container) return;
    container.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your support tickets...</p></div>';
    try {
        const response = await apiCall('/support/my-tickets', 'GET');
        const tickets = response.tickets || [];
        if (tickets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-ticket-alt"></i>
                    <h3>No Support Tickets</h3>
                    <p>You haven't submitted any support requests yet.</p>
                </div>
            `;
            return;
        }
        // Sort tickets by creation date (newest first)
        tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        container.innerHTML = `
            <div class="support-tickets-list">
                ${tickets.map(ticket => {
                    const hasResponses = ticket.responses && ticket.responses.length > 0;
                    const lastAdminResponse = hasResponses ? ticket.responses.filter(r => r.responderType === 'admin').pop() : null;
                    const hasUnreadAdminResponse = lastAdminResponse && !lastAdminResponse.isRead;
                    return `
                        <div class="support-ticket-card ${ticket.ticketStatus} ${hasUnreadAdminResponse ? 'has-unread' : ''}" data-ticket-id="${ticket.ticketId}">
                            <div class="ticket-header">
                                <div class="ticket-info">
                                    <h4 class="ticket-subject">${ticket.subject}</h4>
                                    <div class="ticket-meta">
                                        <span class="ticket-id">ID: ${ticket.ticketId}</span>
                                        <span class="priority-badge ${ticket.priority.toLowerCase()}">${ticket.priority}</span>
                                        <span class="status-badge ${ticket.ticketStatus}">
                                            ${formatTicketStatus(ticket.ticketStatus)}
                                        </span>
                                        ${hasUnreadAdminResponse ? '<span class="new-response-badge">New Response</span>' : ''}
                                    </div>
                                </div>
                                <div class="ticket-date">
                                    <small>Created: ${formatTicketDate(ticket.createdAt)}</small>
                                    ${ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ?
                                         `<small>Updated: ${formatTicketDate(ticket.updatedAt)}</small>` : ''}
                                </div>
                            </div>
                            <div class="ticket-preview">
                                <p>${truncateText(ticket.message, 120)}</p>
                            </div>
                            ${ticket.attachments && ticket.attachments.length > 0 ? `
                                <div class="ticket-attachments-indicator">
                                    <i class="fas fa-paperclip"></i>
                                    <span>${ticket.attachments.length} attachment${ticket.attachments.length > 1 ? 's' : ''}</span>
                                </div>
                            ` : ''}
                            <div class="ticket-actions">
                                <button class="btn ${hasUnreadAdminResponse ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="viewSupportTicketDetails('${ticket.ticketId}')">
                                    <i class="fas fa-eye"></i>
                                     ${hasUnreadAdminResponse ? 'View New Response' : 'View Details'}
                                </button>
                                ${hasResponses ? `
                                    <span class="responses-count">
                                        <i class="fas fa-comments"></i>
                                        ${ticket.responses.length} response${ticket.responses.length > 1 ? 's' : ''}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        // Show notification if there are unread admin responses
        const unreadCount = tickets.filter(ticket => {
            const hasResponses = ticket.responses && ticket.responses.length > 0;
            if (!hasResponses) return false;
            const lastAdminResponse = ticket.responses.filter(r => r.responderType === 'admin').pop();
            return lastAdminResponse && !lastAdminResponse.isRead;
        }).length;
        if (unreadCount > 0) {
            showNotification(`You have ${unreadCount} new support response${unreadCount > 1 ? 's' : ''}`, 'info', 6000);
        }
    } catch (error) {
        console.error('Error loading support tickets:', error);
        container.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Error Loading Tickets</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="loadSupportTickets()">Try Again</button>
            </div>
        `;
    }
}

// View detailed support ticket
async function viewSupportTicketDetails(ticketId) {
    try {
        showNotification('Loading ticket details...', 'info');
        const response = await apiCall(`/support/ticket/${ticketId}`, 'GET');
        const ticket = response.ticket;
        const modalContent = `
            <div class="support-ticket-detail-modal">
                <div class="modal-header">
                    <h3><i class="fas fa-ticket-alt"></i> Support Ticket Details</h3>
                    <div class="ticket-status-header">
                        <span class="ticket-id">ID: ${ticket.ticketId}</span>
                        <span class="priority-badge ${ticket.priority.toLowerCase()}">${ticket.priority} Priority</span>
                        <span class="status-badge ${ticket.ticketStatus}">${formatTicketStatus(ticket.ticketStatus)}</span>
                    </div>
                </div>
                <div class="ticket-detail-content">
                    <div class="ticket-info-section">
                        <h4><i class="fas fa-info-circle"></i> Ticket Information</h4>
                        <div class="info-grid">
                            <div><label>Subject:</label><span>${ticket.subject}</span></div>
                            <div><label>Priority:</label><span class="priority-${ticket.priority.toLowerCase()}">${ticket.priority}</span></div>
                            <div><label>Status:</label><span class="status-${ticket.ticketStatus}">${formatTicketStatus(ticket.ticketStatus)}</span></div>
                            <div><label>Created:</label><span>${formatDetailedDate(ticket.createdAt)}</span></div>
                            ${ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? `
                                <div><label>Last Updated:</label><span>${formatDetailedDate(ticket.updatedAt)}</span></div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="ticket-message-section">
                        <h4><i class="fas fa-comment"></i> Your Original Message</h4>
                        <div class="ticket-message-content">
                            <p>${ticket.message.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    ${ticket.attachments && ticket.attachments.length > 0 ? `
                        <div class="ticket-attachments-section">
                            <h4><i class="fas fa-paperclip"></i> Your Attachments (${ticket.attachments.length})</h4>
                            <div class="attachments-list">
                                ${ticket.attachments.map((attachment, index) => `
                                    <div class="attachment-item">
                                        <div class="attachment-info">
                                            <i class="fas ${getSupportFileIcon({name: attachment.originalName || attachment.filename || attachment.name})}"></i>
                                            <div class="attachment-details">
                                                <span class="attachment-name">${attachment.originalName || attachment.filename || attachment.name || `Attachment ${index + 1}`}</span>
                                                <span class="attachment-meta">
                                                    ${attachment.size ? formatFileSize(attachment.size) : ''}
                                                    ${attachment.uploadedAt ? ` • Uploaded ${formatDetailedDate(attachment.uploadedAt)}` : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="attachment-actions">
                                            <button class="btn btn-outline btn-sm" onclick="viewSupportAttachment('${escapeAttr(attachment.url)}', '${escapeAttr(attachment.originalName || attachment.filename || attachment.name)}')">
                                                <i class="fas fa-eye"></i> View
                                            </button>
                                            <button class="btn btn-primary btn-sm" onclick="downloadSupportAttachment('${escapeAttr(attachment.url)}', '${escapeAttr(attachment.originalName || attachment.filename || attachment.name)}')">
                                                <i class="fas fa-download"></i> Download
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            ${ticket.attachments.length > 1 ? `
                                <div class="bulk-actions">
                                    <button class="btn btn-outline" onclick="downloadAllSupportAttachments('${ticketId}')">
                                        <i class="fas fa-download"></i> Download All
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    <div class="ticket-responses-section">
                        <h4><i class="fas fa-comments"></i> Conversation History</h4>
                        ${ticket.responses && ticket.responses.length > 0 ? `
                            <div class="responses-timeline">
                                ${ticket.responses.map(response => `
                                    <div class="response-item ${response.responderType}">
                                        <div class="response-header">
                                            <div class="responder-info">
                                                <strong>${response.responderName}</strong>
                                                <span class="responder-type-badge ${response.responderType}">
                                                    <i class="fas ${response.responderType === 'admin' ? 'fa-user-shield' : 'fa-user'}"></i>
                                                    ${response.responderType === 'admin' ? 'Support Team' : 'You'}
                                                </span>
                                            </div>
                                            <span class="response-time">${formatDetailedDate(response.createdAt)}</span>
                                        </div>
                                        <div class="response-content">
                                            <p>${response.message.replace(/\n/g, '<br>')}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="no-responses-section">
                                <div class="empty-state">
                                    <i class="fas fa-comment-slash"></i>
                                    <h4>No Responses Yet</h4>
                                    <p>Our support team will respond to your ticket within 24 hours.</p>
                                </div>
                            </div>
                        `}
                    </div>
                    ${(ticket.ticketStatus === 'open' || ticket.ticketStatus === 'in_progress' || ticket.ticketStatus === 'waiting_admin_response') ? `
                        <div class="add-response-section">
                            <h4><i class="fas fa-reply"></i> Add to Conversation</h4>
                            <form id="ticket-response-form">
                                <div class="form-group">
                                    <textarea id="response-message" class="form-textarea" rows="4" placeholder="Add additional information or respond to the support team..." required></textarea>
                                </div>
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">
                                        <i class="fas fa-paper-plane"></i> Send Response
                                    </button>
                                </div>
                            </form>
                        </div>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        showGenericModal(modalContent, 'max-width: 900px;');
        // Setup response form if it exists
        const responseForm = document.getElementById('ticket-response-form');
        if (responseForm) {
            responseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                submitTicketResponse(ticketId);
            });
        }
    } catch (error) {
        console.error('Error loading ticket details:', error);
        showNotification('Failed to load ticket details', 'error');
    }
}

// Functions to handle support attachment viewing and downloading
function viewSupportAttachment(url, filename) {
    if (!url) {
        showNotification('File URL not available', 'error');
        return;
    }
    // Open in new tab/window
    try {
        window.open(url, '_blank', 'noopener,noreferrer');
        showNotification('Opening file in new tab...', 'info');
    } catch (error) {
        console.error('Error opening file:', error);
        showNotification('Unable to open file. Try downloading instead.', 'error');
    }
}

async function downloadSupportAttachment(url, filename) {
    if (!url) {
        showNotification('File URL not available', 'error');
        return;
    }
    try {
        showNotification('Preparing download...', 'info');
        // Direct download approach
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'support_attachment';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Download error:', error);
        showNotification('Download failed. Opening in new tab...', 'warning');
        // Fallback to opening in new tab
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (fallbackError) {
            showNotification('Unable to access file', 'error');
        }
    }
}

async function downloadAllSupportAttachments(ticketId) {
    try {
        const response = await apiCall(`/support/ticket/${ticketId}`, 'GET');
        const ticket = response.ticket;
        const attachments = ticket.attachments || [];
        if (attachments.length === 0) {
            showNotification('No attachments to download', 'info');
            return;
        }
        showNotification(`Downloading ${attachments.length} files...`, 'info');
        // Download files with delay to prevent browser blocking
        attachments.forEach((attachment, index) => {
            setTimeout(() => {
                downloadSupportAttachment(
                    attachment.url,
                    attachment.originalName || attachment.filename || attachment.name || `attachment_${index + 1}`
                );
            }, index * 500);
        });
    } catch (error) {
        console.error('Error downloading all attachments:', error);
        showNotification('Failed to download all files', 'error');
    }
}

// Submit response to existing ticket
async function submitTicketResponse(ticketId) {
    const messageInput = document.getElementById('response-message');
    const message = messageInput.value.trim();
    if (!message) {
        showNotification('Please enter a response message', 'warning');
        return;
    }

    const submitBtn = document.querySelector('#ticket-response-form button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.innerHTML = '<div class="btn-spinner"></div> Sending...';
        submitBtn.disabled = true;

        await apiCall(`/support/ticket/${ticketId}/respond`, 'POST', { message });

        showNotification('Response sent successfully!', 'success');

        // Refresh the modal content with the new response
        viewSupportTicketDetails(ticketId);
        // Refresh the main tickets list in the background
        loadSupportTickets();

    } catch (error) {
        console.error('Error sending response:', error);
        showNotification('Failed to send response. Please try again.', 'error');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}


// Support file handling functions
function handleSupportFileChange(event) {
    const input = event.target;
    const files = Array.from(input.files);

    // Validate file count
    if (supportFiles.length + files.length > 5) {
        showNotification('Maximum 5 files allowed for support requests', 'warning');
        return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    const invalidFiles = files.filter(file => file.size > maxSize);
    if (invalidFiles.length > 0) {
        showNotification(`Some files exceed 10MB limit: ${invalidFiles.map(f => f.name).join(', ')}`, 'error');
        return;
    }

    supportFiles.push(...files);
    renderSupportFileList();
}

function removeSupportFile(index) {
    supportFiles.splice(index, 1);
    renderSupportFileList();
}

function renderSupportFileList() {
    const container = document.getElementById('support-attachments-list');
    const label = document.getElementById('support-attachments-label');

    if (!container || !label) return;

    if (supportFiles.length === 0) {
        container.innerHTML = '';
        label.textContent = 'Click to upload screenshots or files';
        return;
    }

    container.innerHTML = supportFiles.map((file, index) => `
        <div class="file-list-item">
            <div class="file-list-item-info">
                <i class="fas ${getSupportFileIcon(file)}"></i>
                <span>${file.name}</span>
                <span class="file-size">(${(file.size / (1024 * 1024)).toFixed(2)}MB)</span>
            </div>
            <button type="button" class="remove-file-button" onclick="removeSupportFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    label.textContent = `${supportFiles.length} file(s) selected`;
}

function getSupportFileIcon(file) {
    const ext = file.name.toLowerCase().split('.').pop();
    const iconMap = {
        'pdf': 'fa-file-pdf',
        'doc': 'fa-file-word',
        'docx': 'fa-file-word',
        'txt': 'fa-file-alt',
        'jpg': 'fa-file-image',
        'jpeg': 'fa-file-image',
        'png': 'fa-file-image'
    };
    return iconMap[ext] || 'fa-file';
}

function setupSupportFileDragDrop() {
    const wrapper = document.querySelector('#support-form .custom-file-input-wrapper');
    if (!wrapper) return;
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
                handleSupportFileChange(event);
            }
        });
    }
}

async function handleSupportSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.innerHTML = '<div class="btn-spinner"></div> Sending...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('subject', form.subject.value);
        formData.append('priority', form.priority.value);
        formData.append('message', form.message.value);
        formData.append('userType', appState.currentUser.type);
        formData.append('userName', appState.currentUser.name);
        formData.append('userEmail', appState.currentUser.email);

        if (supportFiles && supportFiles.length > 0) {
            for (let i = 0; i < supportFiles.length; i++) {
                formData.append('attachments', supportFiles[i]);
            }
        }

        await apiCall('/support/submit', 'POST', formData, 'Support request submitted successfully!');

        addLocalNotification(
            'Support Request Sent',
            'Your support request has been submitted. We\'ll get back to you within 24 hours.',
            'success'
        );

        form.reset();
        supportFiles = [];
        renderSupportFileList();

        setTimeout(() => {
            loadSupportTickets();
        }, 1000);

    } catch (error) {
        addLocalNotification('Error', 'Failed to submit support request. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Utility functions for support
function formatTicketStatus(status) {
    const statusMap = {
        'open': 'Open',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'closed': 'Closed',
        'waiting_admin_response': 'Awaiting Support'
    };
    return statusMap[status] || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}


function formatTicketDate(dateString) {
    const d = parseDate(dateString);
    if (!d) return 'Unknown date';
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDetailedDate(date) {
    const d = parseDate(date);
    if (!d) return 'Unknown date';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const m = minutes < 10 ? '0' + minutes : minutes;
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${h}:${m} ${ampm}`;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function toggleFAQ(faqItem) {
    const answer = faqItem.querySelector('.faq-answer');
    const icon = faqItem.querySelector('.fas');

    document.querySelectorAll('.faq-item.active').forEach(item => {
        if (item !== faqItem) {
            item.classList.remove('active');
        }
    });

    faqItem.classList.toggle('active');
}


// ===================================
// --- BUSINESS ANALYTICS PORTAL ---
// ===================================

/**
 * Main function to render the Business Analytics Portal.
 */
// --- QUOTE ANALYSIS SECTION ---
async function renderQuoteAnalysisSection() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-chart-line"></i> Quote Analysis</h2>
                <p class="header-subtitle">Compare, analyze, and evaluate quotes across your projects</p>
            </div>
        </div>
        <div class="qa-container">
            <div class="qa-project-selector">
                <h3><i class="fas fa-folder-open"></i> Select a Project to Analyze</h3>
                <div id="qa-projects-list" class="qa-projects-grid"><div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div></div>
            </div>
            <div id="qa-analysis-result" class="qa-analysis-result"></div>
        </div>`;
    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        const jobs = response.data || [];
        const projectsList = document.getElementById('qa-projects-list');
        if (jobs.length === 0) {
            projectsList.innerHTML = '<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-folder-open"></i></div><h3>No Projects</h3><p>Create a project first to receive and analyze quotes.</p></div>';
            return;
        }
        projectsList.innerHTML = jobs.map(job => {
            const statusColors = { open: '#10b981', assigned: '#3b82f6', completed: '#8b5cf6', closed: '#6b7280' };
            const color = statusColors[job.status] || '#6b7280';
            return `<div class="qa-project-card" onclick="analyzeProjectQuotes('${job.id}', '${(job.title || '').replace(/'/g, "\\'")}')">
                <div class="qa-project-card-top">
                    <span class="qa-project-status" style="background:${color}20;color:${color};border:1px solid ${color}40">${job.status}</span>
                    <span class="qa-project-budget">${job.budget || 'N/A'}</span>
                </div>
                <h4>${job.title}</h4>
                <p class="qa-project-desc">${(job.description || '').substring(0, 80)}${(job.description || '').length > 80 ? '...' : ''}</p>
                <div class="qa-project-footer"><i class="fas fa-arrow-right"></i> Analyze Quotes</div>
            </div>`;
        }).join('');
    } catch (error) {
        const el = document.getElementById('qa-projects-list');
        if (el) el.innerHTML = '<p class="widget-empty-text">Could not load projects.</p>';
    }
}
window.renderQuoteAnalysisSection = renderQuoteAnalysisSection;

async function analyzeProjectQuotes(jobId, jobTitle) {
    const resultContainer = document.getElementById('qa-analysis-result');
    resultContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Analyzing quotes for "${jobTitle}"...</p></div>`;
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
        const response = await apiCall(`/quotes/analyze/${jobId}`, 'GET');
        if (!response.success) throw new Error(response.message);
        const { job, analysis } = response.data;

        if (!analysis) {
            resultContainer.innerHTML = `<div class="qa-no-quotes"><i class="fas fa-inbox"></i><h3>No Quotes Yet</h3><p>No quotes have been submitted for this project yet.</p></div>`;
            return;
        }

        const { totalQuotes, priceStats, timelineStats, scoredQuotes, recommendations, summary } = analysis;

        // Build recommendation cards
        const recCards = [];
        if (recommendations.bestValue) recCards.push(`<div class="qa-rec-card qa-rec-best"><div class="qa-rec-icon"><i class="fas fa-trophy"></i></div><div class="qa-rec-content"><span class="qa-rec-label">Best Overall Value</span><strong>${recommendations.bestValue.designerName}</strong><p>Score: ${recommendations.bestValue.score}/100 &bull; $${recommendations.bestValue.amount.toLocaleString()}</p></div></div>`);
        if (recommendations.cheapest) recCards.push(`<div class="qa-rec-card qa-rec-cheap"><div class="qa-rec-icon"><i class="fas fa-dollar-sign"></i></div><div class="qa-rec-content"><span class="qa-rec-label">Most Affordable</span><strong>${recommendations.cheapest.designerName}</strong><p>$${recommendations.cheapest.amount.toLocaleString()}</p></div></div>`);
        if (recommendations.fastest) recCards.push(`<div class="qa-rec-card qa-rec-fast"><div class="qa-rec-icon"><i class="fas fa-bolt"></i></div><div class="qa-rec-content"><span class="qa-rec-label">Fastest Delivery</span><strong>${recommendations.fastest.designerName}</strong><p>${recommendations.fastest.timeline} days</p></div></div>`);
        if (recommendations.mostExperienced) recCards.push(`<div class="qa-rec-card qa-rec-exp"><div class="qa-rec-icon"><i class="fas fa-star"></i></div><div class="qa-rec-content"><span class="qa-rec-label">Most Experienced</span><strong>${recommendations.mostExperienced.designerName}</strong><p>Profile Score: ${recommendations.mostExperienced.profileScore}/25</p></div></div>`);

        // Build stats overview
        const statsHTML = `
            <div class="qa-stats-row">
                <div class="qa-stat-card"><div class="qa-stat-icon" style="background:#dbeafe;color:#2563eb"><i class="fas fa-file-invoice-dollar"></i></div><div><span class="qa-stat-value">${totalQuotes}</span><span class="qa-stat-label">Total Quotes</span></div></div>
                <div class="qa-stat-card"><div class="qa-stat-icon" style="background:#d1fae5;color:#059669"><i class="fas fa-arrow-down"></i></div><div><span class="qa-stat-value">$${priceStats.min.toLocaleString()}</span><span class="qa-stat-label">Lowest Price</span></div></div>
                <div class="qa-stat-card"><div class="qa-stat-icon" style="background:#fef3c7;color:#d97706"><i class="fas fa-balance-scale"></i></div><div><span class="qa-stat-value">$${priceStats.avg.toLocaleString()}</span><span class="qa-stat-label">Average Price</span></div></div>
                <div class="qa-stat-card"><div class="qa-stat-icon" style="background:#fce7f3;color:#db2777"><i class="fas fa-arrow-up"></i></div><div><span class="qa-stat-value">$${priceStats.max.toLocaleString()}</span><span class="qa-stat-label">Highest Price</span></div></div>
                ${timelineStats.count > 0 ? `<div class="qa-stat-card"><div class="qa-stat-icon" style="background:#ede9fe;color:#7c3aed"><i class="fas fa-clock"></i></div><div><span class="qa-stat-value">${timelineStats.avg} days</span><span class="qa-stat-label">Avg Timeline</span></div></div>` : ''}
            </div>`;

        // Build scored quote cards
        const quoteCardsHTML = scoredQuotes.map((sq, idx) => {
            const rank = idx + 1;
            const medal = rank === 1 ? '<span class="qa-medal qa-gold"><i class="fas fa-medal"></i> #1</span>' : rank === 2 ? '<span class="qa-medal qa-silver"><i class="fas fa-medal"></i> #2</span>' : rank === 3 ? '<span class="qa-medal qa-bronze"><i class="fas fa-medal"></i> #3</span>' : `<span class="qa-medal">#${rank}</span>`;
            const dp = sq.designerProfile || {};
            const skillsHTML = dp.skills && dp.skills.length > 0 ? `<div class="qa-quote-skills">${dp.skills.slice(0, 5).map(s => `<span class="qa-skill-tag">${s}</span>`).join('')}${dp.skills.length > 5 ? `<span class="qa-skill-more">+${dp.skills.length - 5}</span>` : ''}</div>` : '';
            const attachHTML = sq.attachmentAnalysis.length > 0 ? `<div class="qa-attachments-list"><span class="qa-attach-label"><i class="fas fa-paperclip"></i> ${sq.totalAttachments} file${sq.totalAttachments > 1 ? 's' : ''} ${sq.pdfCount > 0 ? `(${sq.pdfCount} PDF)` : ''}</span>${sq.attachmentAnalysis.map(a => `<div class="qa-attach-item"><i class="fas ${a.isPdf ? 'fa-file-pdf' : 'fa-file'}"></i><span>${a.name}</span><small>${a.sizeFormatted}</small></div>`).join('')}</div>` : '<span class="qa-no-attach"><i class="fas fa-times-circle"></i> No attachments</span>';

            // Score bar breakdown
            const scoreBar = `<div class="qa-score-breakdown">
                <div class="qa-score-bar-row"><span class="qa-score-bar-label">Price</span><div class="qa-score-bar"><div class="qa-score-fill qa-fill-price" style="width:${(sq.scores.price / 35) * 100}%"></div></div><span class="qa-score-bar-val">${sq.scores.price}/35</span></div>
                <div class="qa-score-bar-row"><span class="qa-score-bar-label">Timeline</span><div class="qa-score-bar"><div class="qa-score-fill qa-fill-timeline" style="width:${(sq.scores.timeline / 25) * 100}%"></div></div><span class="qa-score-bar-val">${sq.scores.timeline}/25</span></div>
                <div class="qa-score-bar-row"><span class="qa-score-bar-label">Profile</span><div class="qa-score-bar"><div class="qa-score-fill qa-fill-profile" style="width:${(sq.scores.profile / 25) * 100}%"></div></div><span class="qa-score-bar-val">${sq.scores.profile}/25</span></div>
                <div class="qa-score-bar-row"><span class="qa-score-bar-label">Documents</span><div class="qa-score-bar"><div class="qa-score-fill qa-fill-attach" style="width:${(sq.scores.attachment / 15) * 100}%"></div></div><span class="qa-score-bar-val">${sq.scores.attachment}/15</span></div>
            </div>`;

            return `<div class="qa-quote-card ${rank === 1 ? 'qa-top-ranked' : ''}">
                <div class="qa-quote-header">
                    <div class="qa-quote-designer">
                        <div class="qa-designer-avatar">${sq.designerName.charAt(0).toUpperCase()}</div>
                        <div><strong>${sq.designerName}</strong>${dp.experience ? `<span class="qa-exp-tag">${dp.experience.substring(0, 40)}</span>` : ''}</div>
                    </div>
                    <div class="qa-quote-rank">${medal}<div class="qa-total-score"><span class="qa-score-num">${sq.scores.total}</span><span class="qa-score-max">/100</span></div></div>
                </div>
                <div class="qa-quote-metrics">
                    <div class="qa-metric"><span class="qa-metric-label">Price</span><span class="qa-metric-value">$${sq.amount.toLocaleString()}</span></div>
                    <div class="qa-metric"><span class="qa-metric-label">Timeline</span><span class="qa-metric-value">${sq.timeline ? sq.timeline + ' days' : 'Not specified'}</span></div>
                    <div class="qa-metric"><span class="qa-metric-label">Status</span><span class="qa-metric-value qa-status-${sq.status}">${sq.status.charAt(0).toUpperCase() + sq.status.slice(1)}</span></div>
                </div>
                ${skillsHTML}
                <div class="qa-quote-desc"><p>${sq.description.substring(0, 200)}${sq.description.length > 200 ? '...' : ''}</p></div>
                ${scoreBar}
                ${attachHTML}
                <div class="qa-quote-actions">
                    <button class="btn btn-outline btn-sm" onclick="viewQuotes('${jobId}')"><i class="fas fa-eye"></i> View Full Quote</button>
                    <button class="btn btn-outline btn-sm" onclick="openConversation('${jobId}', '${sq.designerId}')"><i class="fas fa-comments"></i> Message</button>
                </div>
            </div>`;
        }).join('');

        // Build price comparison chart canvas
        const chartId = 'qa-price-chart-' + jobId.substring(0, 8);
        const timelineChartId = 'qa-timeline-chart-' + jobId.substring(0, 8);

        resultContainer.innerHTML = `
            <div class="qa-result-header">
                <h3><i class="fas fa-poll"></i> Analysis: ${job.title || 'Project'}</h3>
                <p class="qa-summary">${summary}</p>
            </div>
            ${recCards.length > 0 ? `<div class="qa-recommendations"><h4><i class="fas fa-lightbulb"></i> Recommendations</h4><div class="qa-rec-grid">${recCards.join('')}</div></div>` : ''}
            ${statsHTML}
            <div class="qa-charts-row">
                <div class="qa-chart-card"><h4><i class="fas fa-chart-bar"></i> Price Comparison</h4><div class="qa-chart-wrapper"><canvas id="${chartId}"></canvas></div></div>
                ${timelineStats.count > 1 ? `<div class="qa-chart-card"><h4><i class="fas fa-chart-bar"></i> Timeline Comparison</h4><div class="qa-chart-wrapper"><canvas id="${timelineChartId}"></canvas></div></div>` : ''}
            </div>
            <div class="qa-quotes-section"><h4><i class="fas fa-list-ol"></i> Ranked Quotes (${totalQuotes})</h4>${quoteCardsHTML}</div>`;

        // Render price comparison chart
        const priceCtx = document.getElementById(chartId);
        if (priceCtx && typeof Chart !== 'undefined') {
            new Chart(priceCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: scoredQuotes.map(q => q.designerName.split(' ')[0]),
                    datasets: [{
                        label: 'Quote Amount ($)',
                        data: scoredQuotes.map(q => q.amount),
                        backgroundColor: scoredQuotes.map((q, i) => i === 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.6)'),
                        borderColor: scoredQuotes.map((q, i) => i === 0 ? '#059669' : '#2563eb'),
                        borderWidth: 2,
                        borderRadius: 6
                    }, {
                        label: 'Average',
                        data: scoredQuotes.map(() => priceStats.avg),
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        borderDash: [6, 3],
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } } }
            });
        }

        // Render timeline chart if enough data
        const tlCtx = document.getElementById(timelineChartId);
        if (tlCtx && typeof Chart !== 'undefined' && timelineStats.count > 1) {
            new Chart(tlCtx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: scoredQuotes.filter(q => q.timeline > 0).map(q => q.designerName.split(' ')[0]),
                    datasets: [{
                        label: 'Timeline (days)',
                        data: scoredQuotes.filter(q => q.timeline > 0).map(q => q.timeline),
                        backgroundColor: scoredQuotes.filter(q => q.timeline > 0).map((q, i) => { const sorted = [...scoredQuotes].filter(sq => sq.timeline > 0).sort((a, b) => a.timeline - b.timeline); return sorted[0]?.quoteId === q.quoteId ? 'rgba(16, 185, 129, 0.8)' : 'rgba(139, 92, 246, 0.6)'; }),
                        borderColor: scoredQuotes.filter(q => q.timeline > 0).map((q, i) => { const sorted = [...scoredQuotes].filter(sq => sq.timeline > 0).sort((a, b) => a.timeline - b.timeline); return sorted[0]?.quoteId === q.quoteId ? '#059669' : '#7c3aed'; }),
                        borderWidth: 2,
                        borderRadius: 6
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: v => v + ' days' } } } }
            });
        }
    } catch (error) {
        console.error('Quote analysis error:', error);
        resultContainer.innerHTML = `<div class="qa-no-quotes"><i class="fas fa-exclamation-triangle"></i><h3>Analysis Error</h3><p>Could not analyze quotes. ${error.message || 'Please try again.'}</p></div>`;
    }
}
window.analyzeProjectQuotes = analyzeProjectQuotes;

// Business Analytics - View Only (No client uploads - admin manages all data)
// Clients can only view approved dashboards via the AI Analytics Dashboard (analytics-integration.js)

// ============================================================
// SUBSCRIPTION / PRICING PAGE
// ============================================================

async function renderSubscriptionPage() {
    const container = document.getElementById('app-container');
    if (!container) return;

    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-credit-card"></i> Subscription & Pricing</h2>
                <p class="header-subtitle">Choose a plan that fits your needs</p>
            </div>
        </div>
        <div id="subscription-content" style="padding:0 20px;">
            <div style="text-align:center; padding:40px;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:#6366f1;"></i><p style="color:#6b7280; margin-top:12px;">Loading plans...</p></div>
        </div>
    `;

    try {
        const [response, subResponse, invoicesResponse] = await Promise.all([
            apiCall('/subscriptions/plans'),
            apiCall('/subscriptions/my-subscription'),
            apiCall('/subscriptions/my-invoices').catch(() => ({ invoices: [] })),
        ]);
        const plans = response.plans || {};
        const currentSub = subResponse.subscription;
        const invoices = invoicesResponse.invoices || [];

        renderSubscriptionContent(plans, currentSub, invoices);
    } catch (error) {
        document.getElementById('subscription-content').innerHTML = `
            <div style="text-align:center; padding:40px;">
                <i class="fas fa-exclamation-circle" style="font-size:40px; color:#dc2626; margin-bottom:12px;"></i>
                <p style="color:#6b7280;">${error.message || 'Failed to load plans'}</p>
                <button class="btn btn-primary" onclick="renderSubscriptionPage()" style="margin-top:16px;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderSubscriptionContent(plans, currentSub, invoices = []) {
    const contentEl = document.getElementById('subscription-content');
    if (!contentEl) return;

    const userType = appState.currentUser?.type || 'designer';
    const isContractor = userType === 'contractor';

    // Show current subscription status if active
    let currentSubHtml = '';
    if (currentSub) {
        const statusColor = currentSub.status === 'active' || currentSub.status === 'free_override' ? '#059669' : '#d97706';
        const statusLabel = currentSub.status === 'free_override' ? 'Active (Free)' : currentSub.status;
        currentSubHtml = `
            <div class="sc-current-sub">
                <div class="sc-current-sub-icon"><i class="fas fa-check-circle"></i></div>
                <div class="sc-current-sub-info">
                    <strong>Current Plan: ${currentSub.planLabel || currentSub.plan}</strong>
                    <span>Status: <span style="color:${statusColor}; font-weight:600; text-transform:capitalize;">${statusLabel}</span></span>
                    ${currentSub.endDate ? `<span>Renews: ${new Date(currentSub.endDate).toLocaleDateString()}</span>` : ''}
                    ${currentSub.quotesAllowed ? `<span>Quotes: ${currentSub.quotesUsed || 0} / ${currentSub.quotesAllowed} used</span>` : currentSub.plan === 'designer_30' ? '<span>Quotes: Unlimited</span>' : ''}
                </div>
            </div>
        `;
    }

    // Designer plans
    const designerPlans = [
        { id: 'designer_free', ...plans.designer_free },
        { id: 'designer_5', ...plans.designer_5 },
        { id: 'designer_10', ...plans.designer_10 },
        { id: 'designer_15', ...plans.designer_15 },
        { id: 'designer_30', ...plans.designer_30 },
    ];

    // Contractor plan
    const contractorPlan = plans.contractor_pro;

    const planColors = [
        { gradient: 'linear-gradient(135deg, #16a34a, #22c55e)', check: '#16a34a' },
        { gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', check: '#2563eb' },
        { gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6)', check: '#7c3aed' },
        { gradient: 'linear-gradient(135deg, #a855f7, #c084fc)', check: '#a855f7' },
        { gradient: 'linear-gradient(135deg, #dc2626, #f43f5e)', check: '#dc2626' },
    ];

    contentEl.innerHTML = `
        ${currentSubHtml}

        ${!isContractor ? `
        <div class="sc-plans-section">
            <h3 class="sc-plans-title"><i class="fas fa-palette"></i> Designer Portal Plans</h3>
            <div class="sc-plans-grid">
                ${designerPlans.map((plan, i) => {
                    const color = planColors[i];
                    const isCurrent = currentSub && currentSub.plan === plan.id;
                    const priceDisplay = plan.price === 0 ? 'Free' : `$${plan.price}<span style="font-size:14px; font-weight:400;">/mo</span>`;
                    const isPremium = plan.id === 'designer_30';
                    return `
                        <div class="sc-plan-card ${isCurrent ? 'sc-plan-current' : ''}" ${isPremium ? 'style="border-color:#dc2626; box-shadow:0 0 0 2px rgba(220,38,38,0.2);"' : ''}>
                            ${isPremium ? '<div class="sc-plan-popular">Best Value</div>' : ''}
                            <div class="sc-plan-header" style="background:${color.gradient};">
                                <div class="sc-plan-price">${priceDisplay}</div>
                                <div class="sc-plan-label">${plan.label}</div>
                            </div>
                            <div class="sc-plan-body">
                                <p class="sc-plan-desc">${plan.description}</p>
                                <ul class="sc-plan-features">
                                    ${(plan.features || []).map(f => `<li><i class="fas fa-check" style="color:${color.check};"></i> ${f}</li>`).join('')}
                                </ul>
                                ${isCurrent ? `
                                    <button class="btn sc-plan-btn sc-plan-btn-current" disabled>
                                        <i class="fas fa-check-circle"></i> Current Plan
                                    </button>
                                ` : `
                                    <button class="btn sc-plan-btn" onclick="handleSubscribe('${plan.id}')" style="background:${color.gradient}; color:white;">
                                        ${plan.price === 0 ? 'Get Started Free' : 'Subscribe Now'}
                                    </button>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}

        ${isContractor ? `
        <div class="sc-plans-section">
            <h3 class="sc-plans-title"><i class="fas fa-hard-hat"></i> Contractor Pro Plan</h3>
            <div class="sc-contractor-pro">
                <div class="sc-contractor-pro-header">
                    <div class="sc-contractor-pro-price">
                        <span class="sc-price-amount">$49</span>
                        <span class="sc-price-period">/month</span>
                    </div>
                    <h4>Contractor Pro</h4>
                    <p>Unlock lower AI rates and priority processing for high-volume estimation</p>
                </div>
                <div class="sc-contractor-pro-body">
                    <div class="sc-pro-rates">
                        <div class="sc-pro-rate">
                            <div class="sc-pro-rate-icon"><i class="fas fa-calculator"></i></div>
                            <div>
                                <strong>$0.40 per MB</strong>
                                <span>AI Estimation</span>
                            </div>
                        </div>
                        <div class="sc-pro-rate">
                            <div class="sc-pro-rate-icon"><i class="fas fa-chart-line"></i></div>
                            <div>
                                <strong>$0.08 per MB</strong>
                                <span>AI Analysis</span>
                            </div>
                        </div>
                    </div>
                    <ul class="sc-plan-features">
                        ${(contractorPlan?.features || []).map(f => `<li><i class="fas fa-check" style="color:#ea580c;"></i> ${f}</li>`).join('')}
                    </ul>
                    ${currentSub && currentSub.plan === 'contractor_pro' ? `
                        <button class="btn sc-plan-btn sc-plan-btn-current" disabled>
                            <i class="fas fa-check-circle"></i> Current Plan
                        </button>
                    ` : `
                        <button class="btn sc-plan-btn" onclick="handleSubscribe('contractor_pro')" style="background:linear-gradient(135deg, #ea580c, #f97316); color:white;">
                            <i class="fas fa-rocket"></i> Subscribe to Pro
                        </button>
                    `}
                </div>
            </div>
        </div>
        ` : ''}

        ${isContractor ? `
        <!-- AI Analysis Pricing Tiers (Contractors Only) -->
        <div class="sc-plans-section">
            <h3 class="sc-plans-title"><i class="fas fa-brain"></i> AI Analysis Plans</h3>
            <p style="color:#6b7280; margin:-8px 0 20px; font-size:14px;">Unlock powerful AI-driven analytics, predictive insights, and estimation capacity</p>
            <div class="sc-plans-grid sc-ai-plans-grid">
                ${renderAiAnalysisPlans(plans, currentSub)}
            </div>
        </div>
        ` : ''}

        ${invoices.length > 0 ? `
        <div class="sc-invoices-section">
            <h3 class="sc-plans-title"><i class="fas fa-file-invoice"></i> Billing History</h3>
            <div class="sc-invoices-list">
                ${invoices.map(inv => {
                    const statusColor = inv.status === 'paid' ? '#059669' : inv.status === 'free' ? '#2563eb' : '#d97706';
                    const statusBg = inv.status === 'paid' ? '#ecfdf5' : inv.status === 'free' ? '#eff6ff' : '#fffbeb';
                    return `
                        <div class="sc-invoice-row">
                            <div class="sc-invoice-left">
                                <div class="sc-invoice-icon"><i class="fas fa-receipt"></i></div>
                                <div class="sc-invoice-info">
                                    <strong>${inv.invoiceNumber}</strong>
                                    <span>${inv.planLabel} — ${new Date(inv.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                </div>
                            </div>
                            <div class="sc-invoice-right">
                                <span class="sc-invoice-amount">${inv.total === 0 ? 'Free' : '$' + inv.total.toFixed(2)}</span>
                                <span class="sc-invoice-status" style="background:${statusBg}; color:${statusColor};">${inv.status.toUpperCase()}</span>
                                ${inv.pdfUrl ? `<a href="${inv.pdfUrl}" target="_blank" class="sc-invoice-download" title="Download PDF"><i class="fas fa-download"></i></a>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        ` : ''}

        <div class="sc-stripe-info">
            <i class="fas fa-lock"></i>
            <span>Payments are securely processed via Stripe. Your card details are never stored on our servers.</span>
        </div>
    `;
}

function renderAiAnalysisPlans(plans, currentSub) {
    const aiPlans = [
        { id: 'ai_analysis_daily_weekly', color: { gradient: 'linear-gradient(135deg, #0891b2, #06b6d4)', check: '#0891b2' }, icon: 'fa-chart-bar' },
        { id: 'ai_analysis_monthly', color: { gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', check: '#2563eb' }, icon: 'fa-calendar-alt' },
        { id: 'ai_analysis_premium', color: { gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', check: '#7c3aed' }, icon: 'fa-crown', popular: true },
        { id: 'ai_analysis_pro', color: { gradient: 'linear-gradient(135deg, #dc2626, #f43f5e)', check: '#dc2626' }, icon: 'fa-rocket' },
    ];

    return aiPlans.map(({ id, color, icon, popular }) => {
        const plan = plans[id];
        if (!plan) return '';
        const isCurrent = currentSub && currentSub.plan === id;
        const priceDisplay = `$${plan.price}<span style="font-size:14px; font-weight:400;">/${plan.billingCycle === 'weekly' ? 'wk' : 'mo'}</span>`;

        const storageInfo = plan.storageAllowedMB
            ? `<div class="sc-ai-plan-highlight"><i class="fas fa-database"></i> ${(plan.storageAllowedMB / 1024).toFixed(0)} GB max AI estimation</div>`
            : '';
        const quotaInfo = plan.aiAnalysisQuota
            ? `<div class="sc-ai-plan-highlight"><i class="fas fa-brain"></i> ${plan.aiAnalysisQuota} free analysis${plan.aiAnalysisQuota > 1 ? 'es' : ''} per period</div>`
            : '';

        return `
            <div class="sc-plan-card ${isCurrent ? 'sc-plan-current' : ''}" ${popular ? 'style="border-color:#7c3aed; box-shadow:0 0 0 2px rgba(124,58,237,0.2);"' : ''}>
                ${popular ? '<div class="sc-plan-popular">Best Value</div>' : ''}
                <div class="sc-plan-header" style="background:${color.gradient};">
                    <div style="font-size:20px; margin-bottom:4px;"><i class="fas ${icon}"></i></div>
                    <div class="sc-plan-price">${priceDisplay}</div>
                    <div class="sc-plan-label">${plan.label}</div>
                </div>
                <div class="sc-plan-body">
                    <p class="sc-plan-desc">${plan.description}</p>
                    ${storageInfo}
                    ${quotaInfo}
                    <ul class="sc-plan-features">
                        ${(plan.features || []).map(f => `<li><i class="fas fa-check" style="color:${color.check};"></i> ${f}</li>`).join('')}
                    </ul>
                    ${isCurrent ? `
                        <button class="btn sc-plan-btn sc-plan-btn-current" disabled>
                            <i class="fas fa-check-circle"></i> Current Plan
                        </button>
                    ` : `
                        <button class="btn sc-plan-btn" onclick="handleSubscribe('${id}')" style="background:${color.gradient}; color:white;">
                            <i class="fas fa-bolt"></i> Subscribe
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function handleSubscribe(planId) {
    try {
        showNotification('Processing subscription...', 'info');

        const response = await apiCall('/subscriptions/create-checkout', 'POST', { planId });

        if (response.checkoutUrl) {
            // Redirect to Stripe checkout
            window.location.href = response.checkoutUrl;
        } else if (response.subscription && response.subscription.status === 'active') {
            showNotification('Plan activated successfully!', 'success');
            renderSubscriptionPage();
        } else {
            showNotification(response.message || 'Subscription created. Payment will be processed when Stripe is configured.', 'info');
            renderSubscriptionPage();
        }
    } catch (error) {
        showNotification('Error: ' + error.message, 'error');
    }
}

// ================================================================
// STEELCONNECT AI CHATBOT - Landing Page Conversational Assistant
// ================================================================
(function() {
    'use strict';

    const CHATBOT_BACKEND = (typeof BACKEND_URL !== 'undefined') ? BACKEND_URL : 'https://steelconnect-backend.onrender.com/api';

    // --- Knowledge Base: Comprehensive SteelConnect Portal Information ---
    const KNOWLEDGE_BASE = {
        about: {
            keywords: ['what is steelconnect', 'about steelconnect', 'tell me about', 'what does steelconnect do', 'what is this platform', 'what is this', 'explain steelconnect', 'overview'],
            response: `<strong>SteelConnect</strong> is the world's premier AI-powered construction platform connecting steel designers, structural engineers, and contractors globally.\n\nHere's what makes us unique:\n<ul><li><strong>AI-Powered Cost Estimation</strong> — Get instant, accurate cost estimates from PDF drawings using advanced AI (Claude Opus)</li><li><strong>Global Marketplace</strong> — Connect with 2,500+ PE-licensed professionals across 50+ countries</li><li><strong>Predictive Analytics</strong> — Business intelligence dashboards with real-time insights</li><li><strong>Real-Time Collaboration</strong> — Secure messaging, file sharing, and project management</li><li><strong>Enterprise Security</strong> — SOC 2 compliant with end-to-end encryption</li></ul>\nWe've helped manage 850+ projects with 12,000+ AI estimates generated!`
        },
        aiEstimation: {
            keywords: ['ai estimation', 'cost estimate', 'how does ai', 'ai work', 'estimation work', 'pdf analysis', 'drawing analysis', 'estimate cost', 'ai-powered', 'calculate cost', 'how accurate'],
            response: `<strong>AI-Powered Cost Estimation</strong> is our flagship feature:\n\n<ul><li><strong>Upload PDFs</strong> — Submit architectural drawings, structural plans, or blueprints</li><li><strong>AI Vision Analysis</strong> — Our Claude Opus AI analyzes every element: dimensions, materials, structural components</li><li><strong>Detailed Breakdown</strong> — Get trade-by-trade costs: structural steel, concrete, MEP, finishes, sitework</li><li><strong>Material BOQ</strong> — Procurement-ready Bill of Quantities with exact quantities and unit rates</li><li><strong>Manpower & Timeline</strong> — Crew breakdown, labor hours, and estimated project duration</li><li><strong>95%+ Accuracy</strong> — Trained on 10,000+ real construction projects</li></ul>\nSupports Industrial, Commercial, Residential, Healthcare, PEB, and more. Available in USD, INR, AED, and other currencies.`
        },
        pricing: {
            keywords: ['pricing', 'price', 'cost', 'plan', 'free', 'subscription', 'how much', 'payment', 'fee', 'charge'],
            response: `<strong>SteelConnect Pricing:</strong>\n\n<ul><li><strong>Free Tier</strong> — Sign up free! Get basic AI estimates, browse the marketplace, and connect with professionals</li><li><strong>Professional</strong> — Unlimited AI estimates, PDF drawing analysis, priority matching, advanced analytics</li><li><strong>Enterprise</strong> — Custom solutions for large firms: dedicated support, API access, team management, NDA tools</li></ul>\n<strong>No credit card required to start.</strong> All tiers include real-time messaging and project management.\n\nWant a personalized quote? Share your email and our team will send you a custom pricing breakdown!`
        },
        gettingStarted: {
            keywords: ['get started', 'how to start', 'sign up', 'register', 'join', 'create account', 'new user', 'onboard', 'how do i begin', 'first step'],
            response: `<strong>Getting Started is Easy:</strong>\n\n<ul><li><strong>Step 1: Sign Up</strong> — Click "Start Building Today" on the homepage. Enter your email, name, and choose your role (Client or Contractor)</li><li><strong>Step 2: Verify Email</strong> — We'll send you a secure OTP to verify your account</li><li><strong>Step 3: Complete Profile</strong> — Add your skills, experience, certifications, and portfolio</li><li><strong>Step 4: Get Approved</strong> — Our admin team reviews and approves your profile</li><li><strong>Step 5: Start Working</strong> — Post or bid on projects, use AI estimation, and collaborate!</li></ul>\nThe entire process is smooth and guided. Our support team is available 24/7 to help.`
        },
        forContractors: {
            keywords: ['contractor', 'designer', 'engineer', 'freelance', 'bid', 'find work', 'find projects', 'job opportunities', 'for engineers'],
            response: `<strong>For Contractors & Engineers:</strong>\n\nSteelConnect opens doors to high-value projects worldwide:\n\n<ul><li><strong>Global Exposure</strong> — Get matched with clients across 50+ countries based on your expertise</li><li><strong>Verified Profile</strong> — Showcase PE licenses, certifications, portfolio, and client reviews</li><li><strong>AI Tools</strong> — Use AI estimation to create winning proposals faster</li><li><strong>Secure Payments</strong> — Escrow protection ensures you get paid for your work</li><li><strong>Quote System</strong> — Receive project briefs and submit competitive quotes</li><li><strong>Business Analytics</strong> — Track your revenue, projects, and growth with AI-powered dashboards</li></ul>\nJoin 2,500+ professionals already growing their business on SteelConnect.`
        },
        forClients: {
            keywords: ['client', 'owner', 'project owner', 'post project', 'find engineer', 'hire', 'find designer', 'looking for', 'need engineer'],
            response: `<strong>For Project Owners & Clients:</strong>\n\nFind the right talent and manage projects effortlessly:\n\n<ul><li><strong>Post a Project</strong> — Describe your requirements and get matched with qualified professionals</li><li><strong>AI Estimates First</strong> — Get instant AI cost estimates before hiring, so you know your budget</li><li><strong>Verified Professionals</strong> — Every contractor is PE-verified with background checks</li><li><strong>Real-Time Chat</strong> — Communicate directly with your team via encrypted messaging</li><li><strong>Track Progress</strong> — Monitor milestones, deliverables, and timelines in one dashboard</li><li><strong>Quality Guarantee</strong> — Built-in NDA management, insurance validation, and dispute resolution</li></ul>`
        },
        analytics: {
            keywords: ['analytics', 'dashboard', 'business intelligence', 'data', 'reports', 'insights', 'tracking', 'metrics', 'ai analytics'],
            response: `<strong>AI-Powered Business Analytics:</strong>\n\nGet enterprise-grade insights to drive smarter decisions:\n\n<ul><li><strong>Revenue Tracking</strong> — Monitor earnings, invoices, and financial trends in real-time</li><li><strong>Project Metrics</strong> — Track completion rates, timelines, and efficiency scores</li><li><strong>Market Benchmarks</strong> — Compare your rates against industry standards by region</li><li><strong>Predictive Forecasting</strong> — AI predicts revenue trends and project demand</li><li><strong>Custom Reports</strong> — Export PDF/Excel reports for stakeholders</li><li><strong>KPI Dashboard</strong> — Key performance indicators at a glance</li></ul>\nOur analytics dashboard has helped businesses achieve an average 186% ROI boost!`
        },
        security: {
            keywords: ['security', 'safe', 'secure', 'privacy', 'encryption', 'data protection', 'trust', 'compliance', 'soc'],
            response: `<strong>Enterprise-Grade Security:</strong>\n\nYour data is protected with multiple layers of security:\n\n<ul><li><strong>SOC 2 Compliant</strong> — Industry-standard security certification</li><li><strong>End-to-End Encryption</strong> — All messages and files are encrypted in transit and at rest</li><li><strong>NDA Management</strong> — Built-in tools for confidentiality agreements</li><li><strong>Verified Users</strong> — PE license checks, insurance validation, and identity verification</li><li><strong>Escrow Payments</strong> — Funds held securely until project milestones are met</li><li><strong>24/7 Monitoring</strong> — Continuous security monitoring and threat detection</li></ul>\nTrusted by companies like Turner Construction, Bechtel Group, AECOM, and Skanska.`
        },
        support: {
            keywords: ['support', 'help', 'contact', 'customer service', 'issue', 'problem', 'technical', 'assistance'],
            response: `<strong>We're Here to Help!</strong>\n\n<ul><li><strong>24/7 Support</strong> — Our dedicated team is available around the clock</li><li><strong>In-App Support</strong> — Submit tickets directly from your dashboard with priority levels</li><li><strong>Email Support</strong> — Reach us for detailed inquiries</li><li><strong>Knowledge Base</strong> — Comprehensive guides and documentation</li><li><strong>Community Forum</strong> — Connect with other professionals and share best practices</li></ul>\nPlease share your email and we'll have a support specialist reach out to you personally!`
        },
        features: {
            keywords: ['features', 'what can i do', 'capabilities', 'tools', 'functionality', 'services', 'offerings'],
            response: `<strong>SteelConnect Platform Features:</strong>\n\n<ul><li><strong>AI Cost Estimation</strong> — Instant estimates from PDF drawings</li><li><strong>PDF Drawing Analysis</strong> — AI-powered quantity takeoff from blueprints</li><li><strong>Global Marketplace</strong> — Connect with 2,500+ verified professionals</li><li><strong>Real-Time Messaging</strong> — Encrypted chat with file sharing</li><li><strong>Project Management</strong> — Track milestones, deliverables, and payments</li><li><strong>Business Analytics</strong> — AI-powered dashboards and forecasting</li><li><strong>Quote System</strong> — Submit and receive competitive project quotes</li><li><strong>Community Hub</strong> — Industry news, discussions, and networking</li><li><strong>Mobile Responsive</strong> — Full functionality on any device</li></ul>`
        },
        demo: {
            keywords: ['demo', 'trial', 'try', 'test', 'preview', 'see it', 'show me', 'walkthrough', 'tour'],
            response: `<strong>See SteelConnect in Action!</strong>\n\nYou can explore the platform right now:\n\n<ul><li><strong>Watch Our Demo Video</strong> — Scroll up to the "Platform Preview" section for a full walkthrough</li><li><strong>Try AI Estimation</strong> — Use the mini estimator on this page to get a free cost estimate instantly</li><li><strong>Free Account</strong> — Sign up with just your email to access all features</li></ul>\nShare your email and we'll send you a personalized demo link with sample projects and AI estimation results!`
        }
    };

    // State
    let chatOpen = false;
    let messageCount = 0;
    let emailCaptured = localStorage.getItem('sc_chatbot_email_captured') === 'true';
    let emailShown = false;
    let greetingShown = false;
    let greetingDismissed = false;
    let sessionId = 'cb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    let chatHistory = []; // Track all messages for saving

    // DOM Elements
    const widget = document.getElementById('sc-chatbot-widget');
    const toggle = document.getElementById('scChatbotToggle');
    const window_ = document.getElementById('scChatbotWindow');
    const messagesContainer = document.getElementById('scChatbotMessages');
    const quickActions = document.getElementById('scChatbotQuickActions');
    const emailCapture = document.getElementById('scChatbotEmailCapture');
    const emailForm = document.getElementById('scChatbotEmailForm');
    const emailInput = document.getElementById('scChatbotEmailInput');
    const emailSkip = document.getElementById('scChatbotEmailSkip');
    const chatInput = document.getElementById('scChatbotInput');
    const sendBtn = document.getElementById('scChatbotSend');
    const minimizeBtn = document.getElementById('scChatbotMinimize');
    const toggleIcon = document.getElementById('scChatbotToggleIcon');
    const toggleClose = document.getElementById('scChatbotToggleClose');
    const badge = document.getElementById('scChatbotBadge');

    if (!widget || !toggle) return;

    // Only show on landing page
    function isLandingPageVisible() {
        const landing = document.getElementById('landing-page-content');
        return landing && landing.style.display !== 'none';
    }

    // --- Toggle Chat ---
    function openChat() {
        if (!isLandingPageVisible()) return;
        chatOpen = true;
        window_.style.display = 'flex';
        window_.classList.remove('sc-closing');
        toggleIcon.style.display = 'none';
        toggleClose.style.display = 'flex';
        badge.style.display = 'none';
        // Remove greeting bubble if present
        const greet = document.querySelector('.sc-chatbot-greeting');
        if (greet) greet.remove();

        // Add welcome message if first time
        if (messagesContainer.children.length === 0) {
            addBotMessage("Hi there! I'm the <strong>SteelConnect AI Assistant</strong>. I can help you learn about our platform, AI estimation, pricing, and more.\n\nWhat would you like to know?");
        }
        chatInput.focus();
    }

    function closeChat() {
        chatOpen = false;
        window_.classList.add('sc-closing');
        setTimeout(() => {
            window_.style.display = 'none';
            window_.classList.remove('sc-closing');
        }, 250);
        toggleIcon.style.display = 'flex';
        toggleClose.style.display = 'none';
    }

    toggle.addEventListener('click', () => {
        if (chatOpen) {
            closeChat();
        } else {
            openChat();
        }
    });

    minimizeBtn.addEventListener('click', closeChat);

    // --- Auto-show greeting bubble after delay ---
    function showGreetingBubble() {
        if (greetingShown || greetingDismissed || chatOpen || !isLandingPageVisible()) return;
        greetingShown = true;

        const bubble = document.createElement('div');
        bubble.className = 'sc-chatbot-greeting';
        bubble.innerHTML = `
            <button class="sc-chatbot-greeting-close" aria-label="Close">&times;</button>
            <p class="sc-chatbot-greeting-text">Hi! Need help with <strong>AI estimation</strong> or finding the right engineer? I'm here to help!</p>
            <div class="sc-chatbot-greeting-arrow"></div>
        `;

        widget.appendChild(bubble);

        bubble.addEventListener('click', (e) => {
            if (e.target.classList.contains('sc-chatbot-greeting-close')) {
                bubble.remove();
                greetingDismissed = true;
                return;
            }
            bubble.remove();
            openChat();
        });

        // Auto-hide after 12 seconds
        setTimeout(() => {
            if (bubble.parentNode) {
                bubble.style.opacity = '0';
                bubble.style.transform = 'translateY(10px)';
                bubble.style.transition = 'all 0.3s ease';
                setTimeout(() => bubble.remove(), 300);
            }
        }, 12000);
    }

    // Show greeting after 5 seconds on landing page
    setTimeout(showGreetingBubble, 5000);

    // Also show on scroll (50% of viewport)
    let greetOnScroll = false;
    window.addEventListener('scroll', () => {
        if (greetOnScroll || greetingDismissed) return;
        const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        if (scrollPct > 0.3 && isLandingPageVisible()) {
            greetOnScroll = true;
            showGreetingBubble();
        }
    });

    // Hide chatbot when not on landing page
    const observer = new MutationObserver(() => {
        if (!isLandingPageVisible()) {
            widget.style.display = 'none';
            if (chatOpen) closeChat();
        } else {
            widget.style.display = '';
        }
    });
    const landingEl = document.getElementById('landing-page-content');
    if (landingEl) {
        observer.observe(landingEl, { attributes: true, attributeFilter: ['style'] });
    }

    // --- Message Rendering ---
    function addBotMessage(html) {
        const msg = document.createElement('div');
        msg.className = 'sc-chat-msg sc-bot';
        msg.innerHTML = `
            <div class="sc-chat-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="sc-chat-bubble">${html.replace(/\n/g, '<br>')}</div>
        `;
        messagesContainer.appendChild(msg);
        scrollToBottom();
        messageCount++;
        checkEmailPrompt();
    }

    function addUserMessage(text) {
        const msg = document.createElement('div');
        msg.className = 'sc-chat-msg sc-user';
        msg.innerHTML = `
            <div class="sc-chat-msg-avatar">You</div>
            <div class="sc-chat-bubble">${escapeHtml(text)}</div>
        `;
        messagesContainer.appendChild(msg);
        scrollToBottom();
        messageCount++;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.className = 'sc-chat-msg sc-bot';
        typing.id = 'scChatTyping';
        typing.innerHTML = `
            <div class="sc-chat-msg-avatar"><i class="fas fa-robot"></i></div>
            <div class="sc-chat-bubble sc-chat-typing">
                <div class="sc-chat-typing-dot"></div>
                <div class="sc-chat-typing-dot"></div>
                <div class="sc-chat-typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(typing);
        scrollToBottom();
    }

    function hideTyping() {
        const typing = document.getElementById('scChatTyping');
        if (typing) typing.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Email Prompt Logic ---
    function checkEmailPrompt() {
        if (emailCaptured || emailShown) return;
        if (messageCount >= 3) {
            emailShown = true;
            emailCapture.style.display = '';
        }
    }

    // Email form submit
    if (emailForm) {
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value.trim();
            if (!email) return;

            const btnText = emailForm.querySelector('.sc-chatbot-email-btn-text');
            const btnLoad = emailForm.querySelector('.sc-chatbot-email-btn-loading');
            if (btnText) btnText.style.display = 'none';
            if (btnLoad) btnLoad.style.display = 'inline';

            try {
                await fetch(CHATBOT_BACKEND + '/prospects/capture', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        source: 'chatbot-widget',
                        chatSessionId: sessionId,
                        messageCount: messageCount
                    })
                });
            } catch (err) { /* silent */ }

            emailCaptured = true;
            localStorage.setItem('sc_chatbot_email_captured', 'true');
            localStorage.setItem('sc_chatbot_email', email);
            localStorage.setItem('sc_prospect_captured', 'true');

            emailCapture.style.display = 'none';
            addBotMessage("Thank you! We've noted your email. You'll receive a personalized demo and free AI estimate shortly. Feel free to keep asking questions!");
            saveChatSession(); // Save with email
        });
    }

    if (emailSkip) {
        emailSkip.addEventListener('click', () => {
            emailCapture.style.display = 'none';
        });
    }

    // --- Quick Action Buttons ---
    if (quickActions) {
        quickActions.addEventListener('click', (e) => {
            const btn = e.target.closest('.sc-chatbot-quick-btn');
            if (!btn) return;
            const question = btn.getAttribute('data-question');
            if (question) {
                handleUserInput(question);
                // Fade out quick actions after first use
                quickActions.style.opacity = '0';
                quickActions.style.transform = 'translateY(6px)';
                quickActions.style.transition = 'all 0.3s ease';
                setTimeout(() => { quickActions.style.display = 'none'; }, 300);
            }
        });
    }

    // --- Input Handling ---
    chatInput.addEventListener('input', () => {
        sendBtn.disabled = chatInput.value.trim().length === 0;
        // Auto-resize textarea
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim()) {
                handleUserInput(chatInput.value.trim());
                chatInput.value = '';
                chatInput.style.height = 'auto';
                sendBtn.disabled = true;
            }
        }
    });

    sendBtn.addEventListener('click', () => {
        if (chatInput.value.trim()) {
            handleUserInput(chatInput.value.trim());
            chatInput.value = '';
            chatInput.style.height = 'auto';
            sendBtn.disabled = true;
        }
    });

    // --- Core: Process user input and find the best response ---
    async function handleUserInput(text) {
        addUserMessage(text);
        chatHistory.push({ role: 'user', text: text, time: new Date().toISOString() });

        // Hide quick actions after first message
        if (quickActions && quickActions.style.display !== 'none') {
            quickActions.style.opacity = '0';
            quickActions.style.transition = 'all 0.3s ease';
            setTimeout(() => { quickActions.style.display = 'none'; }, 300);
        }

        showTyping();

        // Try local knowledge base first
        const localResponse = findLocalResponse(text);
        let botReply = '';

        if (localResponse) {
            // Simulate brief thinking delay for natural feel
            await delay(800 + Math.random() * 600);
            hideTyping();
            addBotMessage(localResponse);
            botReply = localResponse;
        } else {
            // Try backend AI endpoint
            try {
                const aiResponse = await fetchAIResponse(text);
                hideTyping();
                addBotMessage(aiResponse);
                botReply = aiResponse;
            } catch (err) {
                hideTyping();
                botReply = getFallbackResponse(text);
                addBotMessage(botReply);
            }
        }

        chatHistory.push({ role: 'bot', text: botReply, time: new Date().toISOString() });
        saveChatSession();
    }

    // Save chat session to backend (debounced)
    let saveTimeout = null;
    function saveChatSession() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            try {
                fetch(CHATBOT_BACKEND + '/chatbot/save-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: sessionId,
                        messages: chatHistory,
                        email: localStorage.getItem('sc_chatbot_email') || null,
                        source: 'landing-page-chatbot',
                        capturedAt: new Date().toISOString()
                    })
                }).catch(() => {});
            } catch (e) { /* silent */ }
        }, 2000);
    }

    // --- Local Knowledge Base Matching ---
    function findLocalResponse(text) {
        const lower = text.toLowerCase().trim();

        // Check each knowledge base category
        for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
            for (const keyword of entry.keywords) {
                if (lower.includes(keyword) || fuzzyMatch(lower, keyword)) {
                    return entry.response;
                }
            }
        }

        // Greeting detection
        if (/^(hi|hello|hey|good morning|good afternoon|good evening|howdy|greetings|yo|sup)\b/i.test(lower)) {
            return "Hello! Welcome to <strong>SteelConnect</strong>. I'm your AI assistant, ready to help you explore our platform.\n\nI can tell you about:\n<ul><li>AI-powered cost estimation</li><li>How to get started</li><li>Pricing and plans</li><li>Features for contractors & clients</li><li>Business analytics</li></ul>\nWhat interests you most?";
        }

        // Thank you
        if (/^(thanks|thank you|thx|ty|cheers|appreciate)/i.test(lower)) {
            return "You're welcome! If you have any more questions about SteelConnect, feel free to ask. I'm here to help!\n\nDon't forget — you can <strong>sign up free</strong> to try our AI estimation and connect with professionals worldwide.";
        }

        // Bye
        if (/^(bye|goodbye|see you|later|cya|take care)/i.test(lower)) {
            return "Goodbye! Thanks for exploring SteelConnect. If you need anything in the future, I'm always here.\n\nRemember: <strong>Sign up is free</strong> and you can start getting AI estimates immediately!";
        }

        return null; // No local match
    }

    function fuzzyMatch(text, keyword) {
        const words = keyword.split(' ');
        if (words.length === 1) return false;
        let matchCount = 0;
        for (const word of words) {
            if (text.includes(word)) matchCount++;
        }
        return matchCount >= Math.ceil(words.length * 0.7);
    }

    // --- Backend AI Fetch ---
    async function fetchAIResponse(userMessage) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await fetch(CHATBOT_BACKEND + '/chatbot/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    sessionId: sessionId,
                    context: 'landing-page'
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) throw new Error('API error');
            const data = await res.json();
            return data.response || getFallbackResponse(userMessage);
        } catch (err) {
            clearTimeout(timeout);
            throw err;
        }
    }

    // --- Fallback Responses ---
    function getFallbackResponse(text) {
        const fallbacks = [
            "That's a great question! While I don't have a specific answer for that, here's what I can help with:\n\n<ul><li><strong>AI Estimation</strong> — Learn about our AI-powered cost estimation</li><li><strong>Getting Started</strong> — How to sign up and begin</li><li><strong>For Contractors</strong> — Opportunities for engineers</li><li><strong>For Clients</strong> — How to find the right talent</li><li><strong>Pricing</strong> — Plans and costs</li></ul>\nOr, share your email and our team will personally reach out to answer your question!",

            "I appreciate your interest! That question might need a more detailed response from our team.\n\nIn the meantime, try asking me about:\n<ul><li>How AI estimation works</li><li>Platform features and pricing</li><li>Getting started as a client or contractor</li><li>Security and compliance</li></ul>\nOr drop your email and we'll connect you with a specialist!",

            "Interesting question! I'm best at helping with SteelConnect-specific topics.\n\nHere's what I'm an expert on:\n<ul><li><strong>AI Cost Estimation</strong> from construction drawings</li><li><strong>Platform features</strong> and how to use them</li><li><strong>Marketplace</strong> for construction professionals</li><li><strong>Business analytics</strong> and insights</li></ul>\nFeel free to ask about any of these, or share your email for personalized assistance!"
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    // --- Utilities ---
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();


