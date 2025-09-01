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

// Professional Features Header Data
const headerFeatures = [
    { icon: 'fa-calculator', title: 'AI Cost Estimation', subtitle: 'Advanced algorithms for precise cost analysis', description: 'Upload your drawings and get instant, accurate estimates powered by machine learning', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { icon: 'fa-drafting-compass', title: 'Expert Engineering', subtitle: 'Connect with certified professionals', description: 'Access a network of qualified structural engineers and designers worldwide', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { icon: 'fa-comments', title: 'Real-time Collaboration', subtitle: 'Seamless project communication', description: 'Built-in messaging system for efficient project coordination and updates', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { icon: 'fa-shield-alt', title: 'Secure & Reliable', subtitle: 'Enterprise-grade security', description: 'Your project data is protected with bank-level encryption and security', gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }
];

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
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
        if(notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)){
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

// --- API & AUTH ---
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

        // **MODIFIED**: Trigger backend to send login email
        apiCall('/auth/notify-login', 'POST', { email: data.user.email, name: data.user.name })
            .catch(err => console.error("Failed to send login notification:", err));

        closeModal();
        await showAppView(); // Changed to await
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        
        if (data.user.type === 'designer') {
            loadUserQuotes();
        }

    } catch(error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

async function loadUserQuotes() {
    if (!appState.currentUser || appState.currentUser.type !== 'designer') return;
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

// --- NOTIFICATION SYSTEM (MODIFIED) ---
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
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>`;
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

// --- ESTIMATION SYSTEM ---
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
            <div class="header-content"><h2><i class="fas fa-file-invoice-dollar"></i> My Estimation Requests</h2><p>Track your cost estimation submissions</p></div>
            <div class="header-actions"><button class="btn btn-primary" onclick="renderAppSection('estimation-tool')"><i class="fas fa-plus"></i> New Request</button></div>
        </div>
        <div id="estimations-list" class="estimations-grid"></div>`;
    
    updateDynamicHeader();
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading requests...</p></div>';
    
    try {
        await loadUserEstimations();
        if (appState.myEstimations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><h3>No Estimation Requests Yet</h3><p>Upload project drawings for AI-powered cost estimates.</p><button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')"><i class="fas fa-upload"></i> Upload First Project</button></div>`;
            return;
        }
        listContainer.innerHTML = appState.myEstimations.map(estimation => {
            const statusConfig = getEstimationStatusConfig(estimation.status);
            const createdDate = new Date(estimation.createdAt).toLocaleDateString();
            return `
                <div class="estimation-card premium-card">
                    <h3>${estimation.projectTitle}</h3>
                    <p>Status: <span class="estimation-status-badge ${estimation.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span></p>
                    <p>Submitted: ${createdDate}</p>
                </div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Estimations</h3><button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()">Retry</button></div>`;
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

// ... Other estimation functions like viewEstimationFiles, deleteEstimation etc.

// --- JOBS & QUOTES LOGIC ---
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
                ? `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Post your first project to connect with professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            let actions = '';
            if (user.type === 'designer') {
                if (canQuote) actions = `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`;
                else if (hasUserQuoted) actions = `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`;
                else actions = `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`;
            } else {
                actions = `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            }

            const statusBadge = `<span class="job-status-badge ${job.status}">${job.status}</span>`;
            
            return `
                <div class="job-card premium-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <div class="job-title-section"><h3 class="job-title">${job.title}</h3>${statusBadge}</div>
                        <div class="job-budget-section"><span class="budget-label">Budget</span><span class="budget-amount">${job.budget}</span></div>
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
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
            jobsListContainer.innerHTML = `<div class="error-state premium-error"><h3>Error Loading Projects</h3><p>We encountered an issue loading projects. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
        }
    }
}

async function fetchAndRenderApprovedJobs() {
    // Full implementation needed
}

async function markJobCompleted(jobId) {
    // Full implementation needed
}

async function fetchAndRenderMyQuotes() {
    // Full implementation needed
}

// ... other functions like handlePostJob, editQuote, deleteJob, viewQuotes, approveQuote, showQuoteModal, handleQuoteSubmit etc.

// --- MESSAGING ---
async function fetchAndRenderConversations() {
    // Full implementation needed
}

// ... other messaging functions like openConversation, renderConversationView etc.

// --- UI & MODAL FUNCTIONS ---
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
    const handler = view === 'login' ? handleLogin : handleRegister;
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

async function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    
    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
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
    await fetchUserNotifications(); // Fetch notifications on app view
    
    if (user.type === 'designer') loadUserQuotes();
    if (user.type === 'contractor') loadUserEstimations();
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
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
                  <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Cost Estimation</span></a>
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
    
    const userRole = appState.currentUser.type;
    if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        renderRecentActivityWidgets();
    } else if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        container.innerHTML = `<div id="dynamic-feature-header" class="dynamic-feature-header"></div><div class="section-header modern-header"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container"></div>`;
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
        document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
        if (appState.currentUser.type === 'designer') setupSkillsInput();
    }
}

// --- DASHBOARD WIDGETS ---
async function renderRecentActivityWidgets() {
    // This is a simplified version. Add your full implementation.
    const container = document.getElementById('recent-projects-widget') || document.getElementById('recent-quotes-widget');
    if (container) container.innerHTML = 'Loading recent activity...';
}

async function toggleWidgetDetails(itemId, itemType) {
    // This is a simplified version. Add your full implementation.
    const detailsContainer = document.getElementById(`widget-details-${itemId}`);
    if (detailsContainer) detailsContainer.innerHTML = `Details for ${itemType} ${itemId}`;
}

// --- ESTIMATION TOOL FUNCTIONS ---
function setupEstimationToolEventListeners() {
    // This is a simplified version. Add your full implementation.
}

// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `<div class="auth-header"><h2>Welcome Back</h2></div><form id="login-form"><div class="form-group"><label>Email</label><input type="email" name="loginEmail" required></div><div class="form-group"><label>Password</label><input type="password" name="loginPassword" required></div><button type="submit" class="btn btn-primary">Sign In</button></form><div class="auth-switch">No account? <a onclick="renderAuthForm('register')">Sign Up</a></div>`;
}

function getRegisterTemplate() {
    return `<div class="auth-header"><h2>Join SteelConnect</h2></div><form id="register-form"><div class="form-group"><label>Full Name</label><input type="text" name="regName" required></div><div class="form-group"><label>Email</label><input type="email" name="regEmail" required></div><div class="form-group"><label>Password</label><input type="password" name="regPassword" required></div><div class="form-group"><label>I am a...</label><select name="regRole" required><option value="contractor">Contractor</option><option value="designer">Designer</option></select></div><button type="submit" class="btn btn-primary">Create Account</button></form><div class="auth-switch">Have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2></div>
        <form id="post-job-form" class="premium-form post-job-form">
            <div class="form-group"><label>Project Title</label><input type="text" name="title" required></div>
            <div class="form-group"><label>Budget Range</label><input type="text" name="budget" required></div>
            <div class="form-group"><label>Deadline</label><input type="date" name="deadline" required></div>
            <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
            <button type="submit" class="btn btn-primary">Post Project</button>
        </form>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2></div>
        <form id="estimation-form" class="premium-estimation-form">
            <div class="form-group"><label>Project Title</label><input type="text" name="projectTitle" required></div>
            <div class="form-group"><label>Description</label><textarea name="description" required></textarea></div>
            <div class="file-upload-section"><div id="file-upload-area"><input type="file" id="file-upload-input" multiple /><p>Drag & Drop or Click to Upload</p></div><div id="file-info-container" style="display:none;"><div id="selected-files-list"></div></div></div>
            <button type="button" id="submit-estimation-btn" class="btn btn-primary" disabled>Submit for Estimation</button>
        </form>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name.split(' ')[0];
    const contractorWidgets = `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Projects</h3><div id="recent-projects-widget"></div></div>`;
    const designerWidgets = `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Quotes</h3><div id="recent-quotes-widget"></div></div>`;
    return `
        <div class="dashboard-container">
            <div class="dashboard-hero"><h2>Welcome back, ${name} 👋</h2></div>
            <div class="dashboard-columns">
                ${isContractor ? contractorWidgets : designerWidgets}
                <div class="widget-card"><h3><i class="fas fa-user-circle"></i> Your Profile</h3><button class="btn btn-outline" onclick="renderAppSection('settings')">Update Profile</button></div>
            </div>
        </div>`;
}

function getSettingsTemplate(user) {
    const isContractor = user.type === 'contractor';
    const contractorFields = `<div class="form-group"><label>Company Name</label><input type="text" name="companyName" value="${user.companyName || ''}"></div><div class="form-group"><label>LinkedIn URL</label><input type="url" name="linkedInUrl" value="${user.linkedInUrl || ''}"></div>`;
    const designerFields = `<div class="form-group"><label>Resume</label><input type="file" name="resume" accept=".pdf,.doc,.docx"><small>Upload new resume</small>${user.resumeUrl ? `<a href="${user.resumeUrl}" target="_blank">View current</a>` : ''}</div><div class="form-group"><label>Skills</label><div class="skills-input-container"><div id="skills-tags-container"></div><input type="text" id="skills-input" placeholder="Type skill & press Enter"></div><input type="hidden" name="skills" value='${JSON.stringify(user.skills || [])}'></div>`;
    return `
        <div class="section-header modern-header"><h2><i class="fas fa-cog"></i> Settings</h2></div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Profile Information</h3>
                <form id="profile-form" class="premium-form">
                    <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${user.name}" required></div>
                    <div class="form-group"><label>Email</label><input type="email" value="${user.email}" disabled></div>
                    ${isContractor ? contractorFields : designerFields}
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                <form onsubmit="event.preventDefault();showNotification('Not implemented.','info');"><div class="form-group"><label>Current Password</label><input type="password"></div><div class="form-group"><label>New Password</label><input type="password"></div><button type="submit" class="btn btn-primary">Change Password</button></form>
            </div>
        </div>`;
}

// --- HELPERS ---
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    notification.innerHTML = `<i class="fas ${icons[type]}"></i><p>${message}</p>`;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}
I need to add the backend functionality to the `script.js` file for notifications. Currently, the notifications are only stored locally and will be lost on page refresh. I need to make the following changes:

* **Modify `showAppView`:** The `showAppView` function should call `fetchUserNotifications` to get the latest notifications from the backend when the user logs in.
* **Create `fetchUserNotifications`:** This function will make an API call to the `/notifications` endpoint to get the user's notifications.
* **Create `markNotificationsAsRead`:** This function will send a request to the backend to mark notifications as read.
* **Update `toggleNotificationPanel`:** The `toggleNotificationPanel` function should call `markNotificationsAsRead` when the notification panel is opened.
* **Update `clearNotifications`:** The `clearNotifications` function should send a request to the backend to delete all notifications.
* **Remove `addNotification`:** The `addNotification` function should be removed, as notifications will now be created on the backend. Any calls to `addNotification` should also be removed.

Here's the code I'll use to update the `script.js` file:
```javascript
// --- NOTIFICATION SYSTEM (MODIFIED) ---
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
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>`;
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
