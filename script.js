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
    notifications: [],
};

const headerFeatures = [
    { icon: 'fa-calculator', title: 'AI Cost Estimation', subtitle: 'Advanced algorithms for precise cost analysis', description: 'Upload your drawings and get instant, accurate estimates powered by machine learning', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'fa-drafting-compass', title: 'Expert Engineering', subtitle: 'Connect with certified professionals', description: 'Access a network of qualified structural engineers and designers worldwide', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'fa-comments', title: 'Real-time Collaboration', subtitle: 'Seamless project communication', description: 'Built-in messaging system for efficient project coordination and updates', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'fa-shield-alt', title: 'Secure & Reliable', subtitle: 'Enterprise-grade security', description: 'Your project data is protected with bank-level encryption and security', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
];

// --- INACTIVITY TIMER ---
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 1800000); // 30 minutes
}

// --- INITIALIZATION ---
function initializeApp() {
    console.log("SteelConnect App Initializing...");
    
    window.addEventListener('click', (event) => {
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        if (userInfoDropdown && !document.getElementById('user-info-container').contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
        const notificationPanel = document.getElementById('notification-panel');
        if (notificationPanel && !document.getElementById('notification-bell-container').contains(event.target)) {
            notificationPanel.classList.remove('active');
        }
    });

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn')?.addEventListener('click', () => showAuthModal('register'));
    
    document.querySelector('.logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) renderAppSection('dashboard');
        else {
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
            resetInactivityTimer();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
    
    initializeHeaderRotation();
}

// --- DYNAMIC CONTENT & VIEWS ---
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
                <div class="feature-icon-container"><i class="fas ${feature.icon}"></i></div>
                <div class="feature-text-content">
                    <h2 class="feature-title">${feature.title}</h2>
                    <p class="feature-subtitle">${feature.subtitle}</p>
                    <p class="feature-description">${feature.description}</p>
                </div>
                <div class="feature-indicators">
                    ${headerFeatures.map((_, index) => `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`).join('')}
                </div>
            </div>`;
    }
}

async function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    
    document.getElementById('main-nav-menu').innerHTML = '';
    
    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    // Setup user dropdown & notification events
    document.getElementById('user-info').addEventListener('click', (e) => { e.stopPropagation(); document.getElementById('user-info-dropdown').classList.toggle('active'); });
    document.getElementById('user-settings-link').addEventListener('click', (e) => { e.preventDefault(); renderAppSection('settings'); document.getElementById('user-info-dropdown').classList.remove('active'); });
    document.getElementById('user-logout-link').addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('notification-bell-container').addEventListener('click', toggleNotificationPanel);
    document.getElementById('clear-notifications-btn').addEventListener('click', (e) => { e.stopPropagation(); clearNotifications(); });
     
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('dashboard');
    await fetchUserNotifications(); // Fetch notifications when app loads for the user
    
    if (user.type === 'designer') loadUserQuotes();
    if (user.type === 'contractor') loadUserEstimations();
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    
    document.getElementById('main-nav-menu').innerHTML = `
        <a href="#ai-estimation" class="nav-link">AI Estimation</a>
        <a href="#how-it-works" class="nav-link">How It Works</a>
        <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>
        <a href="#showcase" class="nav-link">Showcase</a>`;
}

// --- API & AUTHENTICATION ---
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
             if (!response.ok) throw new Error(`Request failed: ${response.status}`);
             if (successMessage) showNotification(successMessage, 'success');
             return { success: true };
        }
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || responseData.error || `Request failed`);
        if (successMessage) showNotification(successMessage, 'success');
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
    const userData = { name: form.regName.value, email: form.regEmail.value, password: form.regPassword.value, type: form.regRole.value };
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

        // Trigger backend to send login email
        apiCall('/auth/notify-login', 'POST', { email: data.user.email, name: data.user.name })
            .catch(err => console.error("Failed to send login notification:", err));

        closeModal();
        await showAppView();
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        if (data.user.type === 'designer') loadUserQuotes();
    } catch(error) {}
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

// --- DATA FETCHING & STATE ---
async function loadUserQuotes() {
    if (!appState.currentUser || appState.currentUser.type !== 'designer') return;
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        appState.userSubmittedQuotes.clear();
        (response.data || []).forEach(quote => {
            if (quote.status === 'submitted') appState.userSubmittedQuotes.add(quote.jobId);
        });
    } catch (error) {
        console.error('Error loading user quotes:', error);
    }
}

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

// --- NOTIFICATION SYSTEM (Backend Driven) ---
async function fetchUserNotifications() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/notifications', 'GET');
        appState.notifications = response.data || [];
        renderNotificationPanel();
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        const panelList = document.getElementById('notification-panel-list');
        if (panelList) {
            panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load notifications</p></div>`;
        }
    }
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    const badge = document.getElementById('notification-badge');
    if (!panelList || !badge) return;
    
    const unreadCount = appState.notifications.filter(n => !n.isRead).length;
    
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';

    if (appState.notifications.length === 0) {
        panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-bell-slash"></i><p>No new notifications</p></div>`;
        return;
    }

    panelList.innerHTML = appState.notifications.map(n => {
        const iconMap = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', message: 'fa-comment-alt', job: 'fa-briefcase', quote: 'fa-file-invoice-dollar' };
        const icon = iconMap[n.type] || 'fa-info-circle';
        return `
            <div class="notification-item ${n.isRead ? '' : 'unread-notification'}" data-id="${n.id}">
                <div class="notification-item-icon ${n.type}"><i class="fas ${icon}"></i></div>
                <div class="notification-item-content">
                    <p>${n.message}</p>
                    <span class="timestamp">${getTimeAgo(n.createdAt)}</span>
                </div>
            </div>`;
    }).join('');
}

async function markNotificationsAsRead() {
    const unreadIds = appState.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    appState.notifications.forEach(n => n.isRead = true);
    renderNotificationPanel(); // Optimistic UI update

    try {
        await apiCall('/notifications/mark-read', 'PUT', { ids: unreadIds });
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
}

async function clearNotifications() {
    if (confirm('Are you sure you want to clear all notifications?')) {
        try {
            await apiCall('/notifications', 'DELETE', null, 'All notifications cleared.');
            appState.notifications = [];
            renderNotificationPanel();
        } catch (err) {
            console.error("Failed to clear notifications", err);
        }
    }
}

function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            markNotificationsAsRead();
        }
    }
}

// --- CORE FEATURE FUNCTIONS ---
async function fetchAndRenderMyEstimations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div id="dynamic-feature-header" class="dynamic-feature-header"></div><div class="section-header modern-header"><h2><i class="fas fa-file-invoice-dollar"></i> My Estimation Requests</h2><p>Track your submissions</p></div><div id="estimations-list" class="estimations-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    try {
        await loadUserEstimations();
        if (appState.myEstimations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><h3>No Requests Yet</h3><p>Upload drawings to get AI-powered cost estimates.</p><button class="btn btn-primary" onclick="renderAppSection('estimation-tool')">New Estimation</button></div>`;
            return;
        }
        listContainer.innerHTML = appState.myEstimations.map(est => {
            const statusConfig = getEstimationStatusConfig(est.status);
            return `<div class="estimation-card"><h3>${est.projectTitle}</h3><p>Status: <span class="estimation-status-badge ${est.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span></p></div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Estimations</h3><button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()">Retry</button></div>`;
    }
}

function getEstimationStatusConfig(status) {
    const configs = { 'pending': { icon: 'fa-clock', label: 'Under Review' }, 'completed': { icon: 'fa-check-circle', label: 'Complete' } };
    return configs[status] || { icon: 'fa-question-circle', label: status };
}

async function fetchAndRenderJobs(loadMore = false) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');
    if (!loadMore) {
        appState.jobs = [];
        appState.jobsPage = 1;
        appState.hasMoreJobs = true;
        if (jobsListContainer) jobsListContainer.innerHTML = '<div class="loading-spinner"></div>';
    }
    const user = appState.currentUser;
    const endpoint = user.type === 'designer' ? `/jobs?page=${appState.jobsPage}&limit=6` : `/jobs/user/${user.id}`;
    try {
        const response = await apiCall(endpoint, 'GET');
        appState.jobs.push(...(response.data || []));
        if (user.type === 'designer') appState.hasMoreJobs = response.pagination.hasNext;
        else appState.hasMoreJobs = false;
        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = `<div class="empty-state"><h3>No Projects Found</h3>${user.type === 'contractor' ? '<button class="btn btn-primary" onclick="renderAppSection(\'post-job\')">Post a Job</button>' : ''}</div>`;
            return;
        }
        jobsListContainer.innerHTML = appState.jobs.map(job => {
            const canQuote = user.type === 'designer' && job.status === 'open' && !appState.userSubmittedQuotes.has(job.id);
            let actions = user.type === 'contractor' ? `<button class="btn btn-outline" onclick="viewQuotes('${job.id}')">View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete</button>` : '';
            if (canQuote) actions = `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`;
            else if (user.type === 'designer') actions = `<button class="btn" disabled>Quote Submitted</button>`;
            return `<div class="job-card"><h3>${job.title}</h3><p><strong>Budget:</strong> ${job.budget}</p><p>${job.description}</p><div class="job-actions">${actions}</div></div>`;
        }).join('');
        if (user.type === 'designer' && appState.hasMoreJobs) {
            loadMoreContainer.innerHTML = `<button class="btn btn-outline" id="load-more-btn">Load More</button>`;
            document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
        } else {
            loadMoreContainer.innerHTML = '';
        }
    } catch(error) {
        jobsListContainer.innerHTML = `<div class="error-state"><h3>Error Loading Projects</h3></div>`;
    }
}
async function handlePostJob(event) { /* Your full implementation */ }
async function deleteJob(jobId) { /* Your full implementation */ }
async function viewQuotes(jobId) { /* Your full implementation */ }
async function approveQuote(quoteId, jobId) { /* Your full implementation */ }
async function showQuoteModal(jobId) { /* Your full implementation */ }
async function handleQuoteSubmit(event) { /* Your full implementation */ }
async function fetchAndRenderMyQuotes() { /* Your full implementation */ }
async function fetchAndRenderApprovedJobs() { /* Your full implementation */ }
async function markJobCompleted(jobId) { /* Your full implementation */ }
async function fetchAndRenderConversations() { /* Your full implementation */ }
async function renderRecentActivityWidgets() { /* Your full implementation */ }
async function setupEstimationToolEventListeners() { /* Your full implementation */ }

// --- SIDEBAR & PAGE RENDERING ---
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link active" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;
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
              <hr class="sidebar-divider">
              <a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); renderAppSection(link.dataset.section); });
    });
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    if (sectionId === 'dashboard') { container.innerHTML = getDashboardTemplate(appState.currentUser); renderRecentActivityWidgets(); }
    else if (sectionId === 'jobs') { container.innerHTML = `<div id="dynamic-feature-header"></div><div class="section-header"><h2>Projects</h2></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container"></div>`; fetchAndRenderJobs(); }
    else if (sectionId === 'post-job') { container.innerHTML = getPostJobTemplate(); document.getElementById('post-job-form').addEventListener('submit', handlePostJob); }
    else if (sectionId === 'my-quotes') fetchAndRenderMyQuotes();
    else if (sectionId === 'approved-jobs') fetchAndRenderApprovedJobs();
    else if (sectionId === 'messages') fetchAndRenderConversations();
    else if (sectionId === 'estimation-tool') { container.innerHTML = getEstimationToolTemplate(); setupEstimationToolEventListeners(); }
    else if (sectionId === 'my-estimations') fetchAndRenderMyEstimations();
    else if (sectionId === 'settings') { container.innerHTML = getSettingsTemplate(appState.currentUser); }
}

// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header"><h2>Welcome Back</h2><p>Sign in to your SteelConnect account</p></div>
        <form id="login-form" class="premium-form">
            <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" name="loginEmail" required></div>
            <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="loginPassword" required></div>
            <button type="submit" class="btn btn-primary btn-full">Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header"><h2>Join SteelConnect</h2><p>Create your professional account</p></div>
        <form id="register-form" class="premium-form">
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" name="regName" required></div>
            <div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" name="regEmail" required></div>
            <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="regPassword" required></div>
            <div class="form-group"><label class="form-label">I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full">Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getDashboardTemplate(user) { return `<h2>Welcome, ${user.name}</h2>`; }
function getPostJobTemplate() { return `<h2>Post a Job</h2><form id="post-job-form"></form>`; }
function getEstimationToolTemplate() { return `<h2>AI Estimation Tool</h2>`; }
function getSettingsTemplate(user) { return `<h2>Settings</h2>`; }

// --- HELPERS ---
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    notification.innerHTML = `<div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div><button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

function formatMessageTimestamp(date) {
    const now = new Date();
    const messageDate = new Date(date);
    if (now.toDateString() === messageDate.toDateString()) {
        return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return messageDate.toLocaleDateString();
}
