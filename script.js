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
    link.addEventListener('click', function (e) {
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
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        const userInfoContainer = document.getElementById('user-info-container');
        if (userInfoDropdown && userInfoContainer && !userInfoContainer.contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
        const notificationPanel = document.getElementById('notification-panel');
        const notificationBellContainer = document.getElementById('notification-bell-container');
        if (notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)) {
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
                </div>
                <div class="feature-indicators">
                    ${headerFeatures.map((_, index) => `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`).join('')}
                </div>
            </div>`;
    }
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
            if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
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
        await showAppView();
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        if (data.user.type === 'designer') loadUserQuotes();
    } catch (error) {}
}

function logout() {
    Object.keys(appState).forEach(key => {
        if (Array.isArray(appState[key])) appState[key] = [];
        else if (typeof appState[key] === 'object' && appState[key] !== null) {
            if (appState[key] instanceof Set) appState[key].clear();
            else appState[key] = {};
        }
         else appState[key] = null;
    });
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

// --- DATA FETCHING ---
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

// --- NOTIFICATION SYSTEM ---
async function fetchUserNotifications() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/notifications', 'GET');
        appState.notifications = response.data || [];
        renderNotificationPanel();
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        const panelList = document.getElementById('notification-panel-list');
        if (panelList) panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load</p></div>`;
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
    const iconMap = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', message: 'fa-comment-alt', job: 'fa-briefcase', quote: 'fa-file-invoice-dollar' };
    panelList.innerHTML = appState.notifications.map(n => `
        <div class="notification-item ${n.isRead ? '' : 'unread-notification'}" data-id="${n.id}">
            <div class="notification-item-icon ${n.type}"><i class="fas ${iconMap[n.type] || 'fa-info-circle'}"></i></div>
            <div class="notification-item-content">
                <p>${n.message}</p>
                <span class="timestamp">${getTimeAgo(n.createdAt)}</span>
            </div>
        </div>`).join('');
}

async function markNotificationsAsRead() {
    const unreadIds = appState.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    appState.notifications.forEach(n => n.isRead = true);
    renderNotificationPanel();
    try {
        await apiCall('/notifications/mark-read', 'PUT', { ids: unreadIds });
    } catch (error) { console.error('Failed to mark notifications as read:', error); }
}

async function clearNotifications() {
    if (confirm('Are you sure you want to clear all notifications?')) {
        try {
            await apiCall('/notifications', 'DELETE', null, 'All notifications cleared.');
            appState.notifications = [];
            renderNotificationPanel();
        } catch (err) { console.error("Failed to clear notifications", err); }
    }
}

function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) markNotificationsAsRead();
    }
}

// --- PROFILE SETTINGS ---
async function handleProfileUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Saving...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const response = await apiCall('/auth/profile', 'PUT', formData);
        appState.currentUser = response.data;
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
        showNotification('Your profile has been saved!', 'success');
        document.getElementById('user-info-name').textContent = appState.currentUser.name;
        document.getElementById('sidebarUserName').textContent = appState.currentUser.name;
    } catch (error) {
        console.error("Profile update failed:", error);
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

function setupSkillsInput() {
    const skillsInput = document.getElementById('skills-input');
    const tagsContainer = document.getElementById('skills-tags-container');
    const hiddenSkillsInput = document.querySelector('input[name="skills"]');
    if (!skillsInput || !tagsContainer || !hiddenSkillsInput) return;

    let skills = [];
    try {
        skills = JSON.parse(hiddenSkillsInput.value || '[]');
    } catch { skills = []; }

    const renderTags = () => {
        tagsContainer.innerHTML = skills.map((skill, index) => `
            <div class="skill-tag">
                <span>${skill}</span>
                <button type="button" class="remove-tag-btn" data-index="${index}">&times;</button>
            </div>`).join('');
        hiddenSkillsInput.value = JSON.stringify(skills);
    };
    skillsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const skill = skillsInput.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                skillsInput.value = '';
                renderTags();
            }
        }
    });
    tagsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.remove-tag-btn');
        if (button) {
            skills.splice(button.dataset.index, 1);
            renderTags();
        }
    });
    renderTags();
}

// --- JOBS & QUOTES ---
// (Placeholder for job/quote functions - you should have these already)
async function fetchAndRenderJobs() { console.log('Fetching jobs...'); /* Add full logic */ }
async function handlePostJob(e) { e.preventDefault(); console.log('Posting job...'); /* Add full logic */ }
async function fetchAndRenderMyQuotes() { console.log('Fetching my quotes...'); /* Add full logic */ }
async function fetchAndRenderApprovedJobs() { console.log('Fetching approved jobs...'); /* Add full logic */ }

// --- MESSAGING ---
// (Placeholder for messaging functions)
async function fetchAndRenderConversations() { console.log('Fetching conversations...'); /* Add full logic */ }

// --- ESTIMATION ---
// (Placeholder for estimation functions)
async function fetchAndRenderMyEstimations() { console.log('Fetching my estimations...'); /* Add full logic */ }
function setupEstimationToolEventListeners() { console.log('Setting up estimation listeners...'); /* Add full logic */ }

// --- DASHBOARD ---
function renderRecentActivityWidgets() { console.log('Rendering dashboard widgets...'); /* Add full logic */ }

// --- UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
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

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
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
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    document.getElementById('user-info').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-info-dropdown').classList.toggle('active');
    });
    document.getElementById('user-settings-link').addEventListener('click', (e) => { e.preventDefault(); renderAppSection('settings'); document.getElementById('user-info-dropdown').classList.remove('active'); });
    document.getElementById('user-logout-link').addEventListener('click', (e) => { e.preventDefault(); logout(); });
    document.getElementById('notification-bell-container').addEventListener('click', toggleNotificationPanel);
    document.getElementById('clear-notifications-btn').addEventListener('click', (e) => { e.stopPropagation(); clearNotifications(); });

    buildSidebarNav();
    renderAppSection('dashboard');
    await fetchUserNotifications();
    if (user.type === 'designer') loadUserQuotes();
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
    switch(sectionId) {
        case 'settings':
            container.innerHTML = getSettingsTemplate(appState.currentUser);
            document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
            if (appState.currentUser.type === 'designer') setupSkillsInput();
            break;
        case 'dashboard':
            container.innerHTML = getDashboardTemplate(appState.currentUser);
            renderRecentActivityWidgets();
            break;
        case 'jobs':
            const userRole = appState.currentUser.type;
            const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
            container.innerHTML = `<div class="section-header modern-header"><h2><i class="fas fa-tasks"></i> ${title}</h2></div><div id="jobs-list" class="jobs-grid"></div>`;
            fetchAndRenderJobs();
            break;
        case 'post-job':
            container.innerHTML = getPostJobTemplate();
            document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
            break;
        case 'my-quotes':
            fetchAndRenderMyQuotes();
            break;
        case 'approved-jobs':
            fetchAndRenderApprovedJobs();
            break;
        case 'messages':
            fetchAndRenderConversations();
            break;
        case 'estimation-tool':
            container.innerHTML = getEstimationToolTemplate();
            setupEstimationToolEventListeners();
            break;
        case 'my-estimations':
            fetchAndRenderMyEstimations();
            break;
        default:
            container.innerHTML = `<h2>Page not found</h2>`;
    }
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
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')">Create Account</a></div>`;
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
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getSettingsTemplate(user) {
    const isContractor = user.type === 'contractor';
    const contractorFields = `
        <div class="form-group"><label class="form-label">Company Name</label><input type="text" name="companyName" class="form-input" value="${user.companyName || ''}"></div>
        <div class="form-group"><label class="form-label">LinkedIn URL</label><input type="url" name="linkedInUrl" class="form-input" value="${user.linkedInUrl || ''}"></div>`;
    const designerFields = `
        <div class="form-group"><label class="form-label">Resume</label><input type="file" name="resume" class="form-input file-input" accept=".pdf,.doc,.docx"><small class="form-help">Upload new resume</small>${user.resumeUrl ? `<a href="${user.resumeUrl}" target="_blank" class="form-help">View current</a>` : ''}</div>
        <div class="form-group"><label class="form-label">Skills</label><div class="skills-input-container"><div id="skills-tags-container"></div><input type="text" id="skills-input" class="form-input" placeholder="Type skill & press Enter"></div><input type="hidden" name="skills" value='${JSON.stringify(user.skills || [])}'></div>
        <div class="form-group"><label class="form-label">Certificates</label><input type="file" name="certificates" class="form-input file-input" multiple><small class="form-help">Upload new certificates</small><div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px;">${(user.certificates || []).map(c => `<div class="skill-tag"><a href="${c.url}" target="_blank" style="color:white;text-decoration:none;" title="${c.name}">${c.name.substring(0,20)}...</a></div>`).join('')}</div></div>`;
    return `
        <div class="section-header modern-header"><h2><i class="fas fa-cog"></i> Settings</h2><p>Manage your account and profile</p></div>
        <div class="settings-container">
            <div class="settings-card"><h3><i class="fas fa-user-edit"></i> Profile Information</h3><form id="profile-form" class="premium-form"><div class="form-group"><label class="form-label">Full Name</label><input type="text" name="name" class="form-input" value="${user.name}" required></div><div class="form-group"><label class="form-label">Email Address</label><input type="email" class="form-input" value="${user.email}" disabled><small class="form-help">Email cannot be changed.</small></div>${isContractor ? contractorFields : designerFields}<button type="submit" class="btn btn-primary">Save Changes</button></form></div>
            <div class="settings-card"><h3><i class="fas fa-shield-alt"></i> Security</h3><form class="premium-form" onsubmit="event.preventDefault();showNotification('Password change is not implemented.','info');"><div class="form-group"><label class="form-label">Current Password</label><input type="password" class="form-input"></div><div class="form-group"><label class="form-label">New Password</label><input type="password" class="form-input"></div><button type="submit" class="btn btn-primary">Change Password</button></form></div>
        </div>`;
}

function getPostJobTemplate() { return `<div><h2>Post a Job</h2><form id="post-job-form">...</form></div>`; }
function getDashboardTemplate(user) { return `<h2>Welcome back, ${user.name}!</h2><p>Your dashboard is ready.</p><div id="recent-activity"></div>`; }
function getEstimationToolTemplate() { return `<div><h2>AI Estimation Tool</h2></div>`; }

// --- HELPERS ---
function getTimeAgo(timestamp) {
    if (!timestamp) return '...';
    const now = new Date();
    const time = timestamp._seconds ? new Date(timestamp._seconds * 1000) : new Date(timestamp);
    const diff = Math.floor((now - time) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
    notification.innerHTML = `<div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div><button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}
