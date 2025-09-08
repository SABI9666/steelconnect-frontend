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

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
let inactivityTimer;
let warningTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);

    warningTimer = setTimeout(() => {
        if (appState.currentUser) {
            showInactivityWarning();
        }
    }, 240000); // 4 minutes

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
            <div class="warning-icon"><i class="fas fa-exclamation-triangle"></i></div>
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
        resetInactivityTimer();
    }
}

// --- APP INITIALIZATION ---
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

    const signInBtn = document.getElementById('signin-btn');
    if (signInBtn) signInBtn.addEventListener('click', () => showAuthModal('login'));
    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => showAuthModal('register'));
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => showAuthModal('register'));

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

    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
            resetInactivityTimer();
            initializeEnhancedNotifications();
            checkProfileCompletionStatus(); // Also check profile status on session restore
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }

    initializeHeaderRotation();
}

// --- DYNAMIC HEADER ---
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

async function _handleLoginLogic(authData) {
    const data = await apiCall('/auth/login', 'POST', authData);
    showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');
    appState.currentUser = data.user;
    appState.jwtToken = data.token;
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    localStorage.setItem('jwtToken', data.token);
    closeModal();
    showAppView();
    initializeEnhancedNotifications();
    if (data.user.type === 'designer') {
        loadUserQuotes();
    }
    setTimeout(() => {
        addNotification(`Welcome back, ${data.user.name}! You're now connected to real-time notifications.`, 'user');
    }, 1000);
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        await _handleLoginLogic(authData);
        if (appState.currentUser) {
            await checkProfileCompletionStatus();
        }
    } catch (error) {
        console.error("Login process failed:", error);
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
    localStorage.clear();
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
    dismissInactivityWarning();
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

// --- PROFILE COMPLETION SYSTEM ---
async function checkProfileCompletionStatus() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/profile/status', 'GET');
        const status = response.data;
        appState.currentUser.profileStatus = status;
        if (!status.profileCompleted) {
            renderProfileCompletionForm();
        } else if (status.profileStatus === 'pending') {
            renderProfilePendingView();
        } else if (status.profileStatus === 'rejected') {
            renderProfileRejectedView(status.rejectionReason);
        } else if (status.profileStatus === 'approved' && !status.canAccess) {
            renderProfileAccessDeniedView();
        }
    } catch (error) {
        console.error('Error checking profile status:', error);
    }
}

async function renderProfileCompletionForm() {
    try {
        const fieldsResponse = await apiCall('/profile/form-fields', 'GET');
        const { userType } = fieldsResponse.data;
        const container = document.getElementById('app-container');
        container.innerHTML = `
            <div class="profile-completion-container">
                <div class="profile-completion-header">
                    <div class="completion-icon"><i class="fas fa-user-edit"></i></div>
                    <h2>Complete Your Profile</h2>
                    <p>Please complete your ${userType} profile to access all features.</p>
                </div>
                <div class="profile-completion-form">
                    <form id="profile-completion-form" enctype="multipart/form-data">
                        <div class="form-sections">${renderProfileFormFields(userType)}</div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary btn-large"><i class="fas fa-paper-plane"></i> Submit for Review</button>
                            <p class="submission-note"><i class="fas fa-info-circle"></i> Your profile will be reviewed within 24-48 hours.</p>
                        </div>
                    </form>
                </div>
            </div>`;
        document.getElementById('profile-completion-form').addEventListener('submit', handleProfileSubmission);
        setupFileUploadHandlers();
    } catch (error) {
        showNotification('Failed to load profile form. Please refresh.', 'error');
    }
}

function renderProfileFormFields(userType) {
    if (userType === 'designer') {
        return `
            <div class="form-section">
                <h3><i class="fas fa-user"></i> Professional Information</h3>
                <div class="form-group"><label class="form-label required">LinkedIn Profile</label><input type="url" name="linkedinProfile" class="form-input" required placeholder="https://linkedin.com/in/yourprofile"></div>
                <div class="form-group"><label class="form-label required">Professional Skills</label><input type="text" name="skills" class="form-input" required placeholder="AutoCAD, Revit, Structural Analysis"><small class="form-help">Separate skills with commas</small></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label required">Years of Experience</label><select name="experience" class="form-select" required><option value="">Select level</option><option value="0-2">0-2</option><option value="3-5">3-5</option><option value="6-10">6-10</option><option value="11-15">11-15</option><option value="15+">15+</option></select></div>
                    <div class="form-group"><label class="form-label">Specializations</label><input type="text" name="specializations" class="form-input" placeholder="Commercial Buildings, Bridges"></div>
                </div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-graduation-cap"></i> Education & Background</h3>
                <div class="form-group"><label class="form-label required">Education</label><textarea name="education" class="form-textarea" required placeholder="Degree, Institution, Year..."></textarea></div>
                <div class="form-group"><label class="form-label required">Professional Bio</label><textarea name="bio" class="form-textarea" required placeholder="Tell clients about your expertise..."></textarea></div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-file-upload"></i> Documents</h3>
                <div class="file-upload-grid">
                    <div class="file-upload-group"><label class="form-label required">Resume/CV</label><div class="file-upload-area" id="resume-upload"><input type="file" name="resume" accept=".pdf,.doc,.docx" required hidden><div class="upload-placeholder"><i class="fas fa-file-pdf"></i><span>Click to upload resume</span><small>PDF, DOC, DOCX (Max 10MB)</small></div></div></div>
                    <div class="file-upload-group"><label class="form-label">Certificates (Optional)</label><div class="file-upload-area" id="certificates-upload"><input type="file" name="certificates" accept=".pdf,.jpg,.png" multiple hidden><div class="upload-placeholder"><i class="fas fa-certificate"></i><span>Upload certificates</span><small>PDF, JPG, PNG (Max 5 files)</small></div></div></div>
                </div>
            </div>`;
    } else { // contractor
        return `
            <div class="form-section">
                <h3><i class="fas fa-building"></i> Company Information</h3>
                <div class="form-row">
                    <div class="form-group"><label class="form-label required">Company Name</label><input type="text" name="companyName" class="form-input" required placeholder="Your Company LLC"></div>
                    <div class="form-group"><label class="form-label required">LinkedIn Profile</label><input type="url" name="linkedinProfile" class="form-input" required placeholder="https://linkedin.com/company/yourcompany"></div>
                </div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Company Website</label><input type="url" name="companyWebsite" class="form-input" placeholder="https://yourcompany.com"></div>
                    <div class="form-group"><label class="form-label required">Business Type</label><select name="businessType" class="form-select" required><option value="">Select type</option><option value="Construction">Construction</option><option value="Engineering">Engineering</option><option value="Architecture">Architecture</option><option value="Other">Other</option></select></div>
                </div>
            </div>
            <div class="form-section">
                <h3><i class="fas fa-info-circle"></i> Company Details</h3>
                <div class="form-group"><label class="form-label required">Company Description</label><textarea name="description" class="form-textarea" required placeholder="Describe your company's services..."></textarea></div>
            </div>`;
    }
}

function setupFileUploadHandlers() {
    document.querySelectorAll('.file-upload-area').forEach(area => {
        const input = area.querySelector('input[type="file"]');
        area.addEventListener('click', () => input.click());
        area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('drag-over'); });
        area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
        area.addEventListener('drop', e => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                input.files = e.dataTransfer.files;
                updateFileDisplay(area, input.files);
            }
        });
        input.addEventListener('change', () => updateFileDisplay(area, input.files));
    });
}

function updateFileDisplay(area, files) {
    if (files.length === 0) return;
    const fileList = Array.from(files).map(file => `
        <div class="selected-file">
            <i class="fas fa-file"></i><span>${file.name}</span><small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
        </div>`).join('');
    area.querySelector('.upload-placeholder').innerHTML = `
        <div class="files-selected"><i class="fas fa-check-circle"></i><span>${files.length} file(s) selected</span></div>
        <div class="selected-files-list">${fileList}</div>`;
    area.classList.add('has-files');
}

async function handleProfileSubmission(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    try {
        const formData = new FormData(form);
        const response = await apiCall('/profile/complete', 'PUT', formData);
        if (response.success) {
            showNotification('Profile submitted successfully! It is now under review.', 'success');
            renderProfilePendingView();
        }
    } catch (error) {
        showNotification(error.message || 'Failed to submit profile.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

function renderProfilePendingView() {
    document.getElementById('app-container').innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon pending"><i class="fas fa-clock"></i></div>
            <h2>Profile Under Review</h2>
            <p>Your profile is being reviewed. You will receive an email once it's approved. Until then, your account has limited functionality.</p>
            <div class="status-actions">
                <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                <button class="btn btn-secondary" onclick="checkProfileCompletionStatus()"><i class="fas fa-sync-alt"></i> Check Status</button>
            </div>
        </div>`;
}

function renderProfileRejectedView(rejectionReason) {
    document.getElementById('app-container').innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon rejected"><i class="fas fa-times-circle"></i></div>
            <h2>Profile Needs Updates</h2>
            <p>Your profile requires updates before it can be approved.</p>
            <div class="rejection-reason">
                <h3>Feedback from our team:</h3>
                <div class="reason-box"><i class="fas fa-comment-alt"></i><p>${rejectionReason || 'No reason provided.'}</p></div>
            </div>
            <p>Please update your profile based on the feedback and resubmit.</p>
            <div class="status-actions">
                <button class="btn btn-primary" onclick="renderProfileCompletionForm()"><i class="fas fa-edit"></i> Update Profile</button>
                <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>`;
}

function renderProfileAccessDeniedView() {
    document.getElementById('app-container').innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon denied"><i class="fas fa-ban"></i></div>
            <h2>Access Restricted</h2>
            <p>Your account access is currently restricted. Please contact support for assistance.</p>
            <div class="status-actions">
                <button class="btn btn-primary" onclick="window.location.href='mailto:support@steelconnect.com'"><i class="fas fa-envelope"></i> Contact Support</button>
                <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>`;
}


// --- UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = `
        <div class="modal-overlay premium-overlay" onclick="closeModal()">
            <div class="modal-content premium-modal" onclick="event.stopPropagation()">
                <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                <div id="modal-form-container"></div>
            </div>
        </div>`;
    renderAuthForm(view);
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
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'modal-container';
        document.body.appendChild(modalContainer);
    }
    modalContainer.innerHTML = `
        <div class="modal-overlay premium-overlay" onclick="closeModal()">
            <div class="modal-content premium-modal" style="${style}" onclick="event.stopPropagation()">
                <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                ${innerHTML}
            </div>
        </div>`;
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

// --- VIEW RENDERING & NAVIGATION ---
function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';

    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();

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
    
    document.getElementById('notification-bell-container').addEventListener('click', toggleNotificationPanel);
    document.getElementById('clear-notifications-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        markAllAsRead();
    });

    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('dashboard');
    resetInactivityTimer();
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;

    if (role === 'designer') {
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else { // contractor
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
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
