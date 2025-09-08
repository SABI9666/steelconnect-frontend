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
            targetSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
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

const notificationState = {
    notifications: [],
    maxStoredNotifications: 50,
    storageKey: 'steelconnect_notifications',
    lastFetchTime: null,
    pollingInterval: null,
};

const profileState = {
    isCompleting: false,
    currentStep: 1,
    formData: {},
    uploadedFiles: {
        resume: null,
        certificates: []
    }
};


// --- HEADER & INACTIVITY DATA ---
const headerFeatures = [{
    icon: 'fa-calculator',
    title: 'AI Cost Estimation',
    subtitle: 'Advanced algorithms for precise cost analysis',
    description: 'Upload your drawings and get instant, accurate estimates powered by machine learning',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}, {
    icon: 'fa-drafting-compass',
    title: 'Expert Engineering',
    subtitle: 'Connect with certified professionals',
    description: 'Access a network of qualified structural engineers and designers worldwide',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
}, {
    icon: 'fa-comments',
    title: 'Real-time Collaboration',
    subtitle: 'Seamless project communication',
    description: 'Built-in messaging system for efficient project coordination and updates',
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
}, {
    icon: 'fa-shield-alt',
    title: 'Secure & Reliable',
    subtitle: 'Enterprise-grade security',
    description: 'Your project data is protected with bank-level encryption and security',
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
}];

let inactivityTimer;
let warningTimer;


// --- INITIALIZATION & CORE APP LOGIC ---
async function initializeApp() {
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
        window.addEventListener(event, resetInactivityTimer, {
            passive: true
        });
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
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    }

    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            await showAppView(); // Changed to await
            resetInactivityTimer();
            initializeEnhancedNotifications();
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

async function apiCall(endpoint, method, body = null, successMessage = null) {
    try {
        const options = {
            method,
            headers: {}
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

        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (!response.ok) {
                const errorMsg = response.headers.get('X-Error-Message') || `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
            }
            if (successMessage) showNotification(successMessage, 'success');
            return {
                success: true
            };
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


// --- INACTIVITY TIMER ---
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


// --- AUTHENTICATION ---
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
    const authData = {
        email: form.loginEmail.value,
        password: form.loginPassword.value
    };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        await showAppView(); // Check profile status instead of showing app directly
        initializeEnhancedNotifications();
        if (data.user.type === 'designer') {
            loadUserQuotes();
        }
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
    localStorage.clear();
    clearTimeout(inactivityTimer);
    clearTimeout(warningTimer);
    dismissInactivityWarning();
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}


// --- PROFILE COMPLETION SYSTEM ---
async function checkProfileStatus() {
    try {
        const response = await apiCall('/profile/status', 'GET');
        const statusData = response.data;
        console.log('Profile status:', statusData);

        if (!statusData.profileCompleted) {
            showProfileCompletionFlow();
        } else if (statusData.profileStatus === 'pending') {
            showProfilePendingView();
        } else if (statusData.profileStatus === 'rejected') {
            showProfileRejectedView(statusData.rejectionReason);
        } else if (statusData.profileStatus === 'approved') {
            return statusData; // Allow showAppView to continue
        } else {
            return statusData; // Fallback to normal app view
        }
        return statusData;
    } catch (error) {
        console.error('Error checking profile status:', error);
        return null; // Fallback to normal app view if status check fails
    }
}

function showProfileCompletionFlow() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    const container = document.getElementById('app-container');
    container.innerHTML = getProfileCompletionTemplate();
    setupProfileCompletionEventListeners();
    loadProfileFormFields();
}

function showProfilePendingView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon pending"><i class="fas fa-clock"></i></div>
            <h2>Profile Under Review</h2>
            <p>Your profile has been submitted and is currently being reviewed by our admin team.</p>
            <div class="status-details">
                <div class="timeline-item active"><i class="fas fa-check"></i><span>Profile Submitted</span></div>
                <div class="timeline-item pending"><i class="fas fa-clock"></i><span>Under Review</span></div>
                <div class="timeline-item"><i class="fas fa-user-check"></i><span>Approval</span></div>
            </div>
            <div class="review-note">
                <p><strong>Review Time:</strong> Typically 24-48 hours</p>
                <p>You will receive an email notification once your profile is approved.</p>
            </div>
            <div class="status-actions">
                <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>`;
}

function showProfileRejectedView(rejectionReason) {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="profile-status-container">
            <div class="status-icon rejected"><i class="fas fa-times-circle"></i></div>
            <h2>Profile Needs Updates</h2>
            <p>Your profile requires some modifications before approval.</p>
            <div class="rejection-reason">
                <h3>Required Updates:</h3>
                <div class="reason-box">
                    <i class="fas fa-info-circle"></i>
                    <div><p>${rejectionReason || 'Please review and update your profile information.'}</p></div>
                </div>
            </div>
            <div class="status-actions">
                <button class="btn btn-primary" onclick="showProfileCompletionFlow()"><i class="fas fa-edit"></i> Update Profile</button>
                <button class="btn btn-outline" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
            </div>
        </div>`;
}

async function loadProfileFormFields() {
    try {
        const response = await apiCall('/profile/form-fields', 'GET');
        const fieldsData = response.data;
        renderProfileForm(fieldsData.fields, fieldsData.userType);
    } catch (error) {
        console.error('Error loading form fields:', error);
        showNotification('Error loading profile form. Please try again.', 'error');
    }
}

function renderProfileForm(fields, userType) {
    const formContainer = document.querySelector('.profile-completion-form .form-sections');
    if (!formContainer) return;

    const basicInfoFields = fields.filter(f => ['linkedinProfile'].includes(f.name));
    const professionalFields = fields.filter(f => !['linkedinProfile', 'resume', 'certificates'].includes(f.name));
    const fileFields = fields.filter(f => ['resume', 'certificates'].includes(f.name));

    let formHTML = '';
    if (basicInfoFields.length > 0) {
        formHTML += `<div class="form-section"><h3><i class="fas fa-user"></i> Basic Information</h3>${basicInfoFields.map(field => renderFormField(field)).join('')}</div>`;
    }
    if (professionalFields.length > 0) {
        formHTML += `<div class="form-section"><h3><i class="fas fa-briefcase"></i> Professional Details</h3>${professionalFields.map(field => renderFormField(field)).join('')}</div>`;
    }
    if (fileFields.length > 0) {
        formHTML += `<div class="form-section"><h3><i class="fas fa-upload"></i> Documents</h3>${fileFields.map(field => renderFileField(field)).join('')}</div>`;
    }
    formHTML += `
        <div class="status-actions">
            <button type="submit" class="btn btn-primary" id="submit-profile-btn"><i class="fas fa-paper-plane"></i> Submit for Review</button>
            <button type="button" class="btn btn-outline" onclick="logout()"><i class="fas fa-times"></i> Cancel</button>
        </div>`;
    formContainer.innerHTML = formHTML;
    setupFileUploadHandlers();
}

function renderFormField(field) {
    const isRequired = field.required ? 'required' : '';
    const requiredMark = field.required ? '<span class="required">*</span>' : '';

    if (field.type === 'select') {
        return `
            <div class="form-group">
                <label for="${field.name}" class="form-label">${field.label}${requiredMark}</label>
                <select id="${field.name}" name="${field.name}" class="form-select" ${isRequired}>
                    <option value="">Select ${field.label}</option>
                    ${field.options.map(option => `<option value="${option}">${option}</option>`).join('')}
                </select>
                ${field.placeholder ? `<small class="form-help">${field.placeholder}</small>` : ''}
            </div>`;
    } else if (field.type === 'textarea') {
        return `
            <div class="form-group">
                <label for="${field.name}" class="form-label">${field.label}${requiredMark}</label>
                <textarea id="${field.name}" name="${field.name}" class="form-textarea" ${isRequired} placeholder="${field.placeholder || ''}" rows="4"></textarea>
            </div>`;
    } else {
        return `
            <div class="form-group">
                <label for="${field.name}" class="form-label">${field.label}${requiredMark}</label>
                <input type="${field.type}" id="${field.name}" name="${field.name}" class="form-input" ${isRequired} placeholder="${field.placeholder || ''}">
            </div>`;
    }
}

function renderFileField(field) {
    const isRequired = field.required ? 'required' : '';
    const requiredMark = field.required ? '<span class="required">*</span>' : '';
    const multiple = field.multiple ? 'multiple' : '';
    return `
        <div class="file-upload-group">
            <label class="form-label">${field.label}${requiredMark}</label>
            <div class="file-upload-area" data-field="${field.name}">
                <input type="file" id="${field.name}" name="${field.name}" accept="${field.accept}" ${multiple} ${isRequired} style="display: none;">
                <div class="upload-placeholder">
                    <i class="fas fa-cloud-upload-alt"></i>
                    <span>Click to upload or drag and drop</span>
                    <small>Accepted formats: ${field.accept}</small>
                </div>
                <div class="files-selected" style="display: none;">
                    <i class="fas fa-check-circle"></i>
                    <span class="file-count">0 files selected</span>
                </div>
                <div class="selected-files-list"></div>
            </div>
        </div>`;
}

function setupFileUploadHandlers() {
    document.querySelectorAll('.file-upload-area').forEach(area => {
        const fieldName = area.dataset.field;
        const input = area.querySelector('input[type="file"]');
        area.addEventListener('click', () => input.click());
        area.addEventListener('dragover', (e) => {
            e.preventDefault();
            area.classList.add('drag-over');
        });
        area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
        area.addEventListener('drop', (e) => {
            e.preventDefault();
            area.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files, fieldName);
        });
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileSelection(e.target.files, fieldName);
        });
    });
}

function handleFileSelection(files, fieldName) {
    const area = document.querySelector(`.file-upload-area[data-field="${fieldName}"]`);
    const placeholder = area.querySelector('.upload-placeholder');
    const filesSelected = area.querySelector('.files-selected');
    const filesList = area.querySelector('.selected-files-list');

    if (fieldName === 'resume') {
        profileState.uploadedFiles.resume = files[0];
    } else if (fieldName === 'certificates') {
        profileState.uploadedFiles.certificates = Array.from(files);
    }
    placeholder.style.display = 'none';
    filesSelected.style.display = 'flex';
    const fileCount = files.length;
    filesSelected.querySelector('.file-count').textContent = `${fileCount} file${fileCount > 1 ? 's' : ''} selected`;
    filesList.innerHTML = Array.from(files).map((file, index) => `
        <div class="selected-file">
            <i class="fas fa-file"></i>
            <span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button type="button" class="btn btn-sm btn-outline" onclick="removeUploadedFile('${fieldName}', ${index})"><i class="fas fa-times"></i></button>
        </div>`).join('');
    area.classList.add('has-files');
}

function removeUploadedFile(fieldName, index) {
    if (fieldName === 'resume') {
        profileState.uploadedFiles.resume = null;
        document.getElementById('resume').value = '';
        resetFileUploadArea(fieldName);
    } else if (fieldName === 'certificates') {
        profileState.uploadedFiles.certificates.splice(index, 1);
        if (profileState.uploadedFiles.certificates.length === 0) {
            document.getElementById('certificates').value = '';
            resetFileUploadArea(fieldName);
        } else {
            updateFileList(fieldName);
        }
    }
}

function resetFileUploadArea(fieldName) {
    const area = document.querySelector(`.file-upload-area[data-field="${fieldName}"]`);
    area.querySelector('.upload-placeholder').style.display = 'block';
    area.querySelector('.files-selected').style.display = 'none';
    area.querySelector('.selected-files-list').innerHTML = '';
    area.classList.remove('has-files');
}

function updateFileList(fieldName) {
    const area = document.querySelector(`.file-upload-area[data-field="${fieldName}"]`);
    const files = profileState.uploadedFiles[fieldName] || [];
    const fileCount = files.length;
    area.querySelector('.files-selected .file-count').textContent = `${fileCount} file${fileCount > 1 ? 's' : ''} selected`;
    area.querySelector('.selected-files-list').innerHTML = files.map((file, index) => `
        <div class="selected-file">
            <i class="fas fa-file"></i><span>${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button type="button" class="btn btn-sm btn-outline" onclick="removeUploadedFile('${fieldName}', ${index})"><i class="fas fa-times"></i></button>
        </div>`).join('');
}

function setupProfileCompletionEventListeners() {
    const form = document.querySelector('.profile-completion-form');
    if (form) form.addEventListener('submit', handleProfileSubmission);
}

async function handleProfileSubmission(event) {
    event.preventDefault();
    const submitBtn = document.getElementById('submit-profile-btn');
    if (!submitBtn) return;
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData();
        const form = event.target;
        form.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.type !== 'file' && element.value) {
                formData.append(element.name, element.value);
            }
        });
        if (profileState.uploadedFiles.resume) {
            formData.append('resume', profileState.uploadedFiles.resume);
        }
        if (profileState.uploadedFiles.certificates && profileState.uploadedFiles.certificates.length > 0) {
            profileState.uploadedFiles.certificates.forEach(cert => formData.append('certificates', cert));
        }
        const response = await apiCall('/profile/complete', 'PUT', formData);
        if (response.success) {
            showNotification('Profile submitted successfully! You will receive an email once approved.', 'success');
            setTimeout(() => showProfilePendingView(), 2000);
        }
    } catch (error) {
        console.error('Profile submission error:', error);
        showNotification('Failed to submit profile. Please try again.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
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
                <div class="feature-indicators">${headerFeatures.map((_, index) => `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`).join('')}</div>
            </div>`;
    }
}


// --- NOTIFICATION SYSTEM ---
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
    storedNotifications.forEach(notification => {
        if (notification.id) notificationMap.set(notification.id, notification);
    });
    serverNotifications.forEach(notification => {
        if (notification.id) notificationMap.set(notification.id, notification);
    });
    return Array.from(notificationMap.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, notificationState.maxStoredNotifications);
}

function addNotification(message, type = 'info', metadata = {}) {
    const newNotification = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        message,
        type,
        createdAt: new Date().toISOString(),
        isRead: false,
        metadata,
        isLocal: true
    };
    appState.notifications.unshift(newNotification);
    notificationState.notifications.unshift(newNotification);
    if (appState.notifications.length > notificationState.maxStoredNotifications) {
        appState.notifications = appState.notifications.slice(0, notificationState.maxStoredNotifications);
    }
    if (notificationState.notifications.length > notificationState.maxStoredNotifications) {
        notificationState.notifications = notificationState.notifications.slice(0, notificationState.maxStoredNotifications);
    }
    saveNotificationsToStorage();
    renderNotificationPanel();
    updateNotificationBadge();
    showNotification(message, type);
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
                <div class="notification-item ${n.isRead ? 'read' : 'unread'} ${isLocalClass}" data-id="${n.id}" onclick="handleNotificationClick('${n.id}', '${n.type}', ${metadataString})">
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
            renderAppSection('jobs');
            break;
        case 'quote':
            if (appState.currentUser.type === 'designer') renderAppSection('my-quotes');
            else renderAppSection('jobs');
            break;
        case 'message':
            if (metadata.conversationId) renderConversationView(metadata.conversationId);
            else renderAppSection('messages');
            break;
        case 'estimation':
            renderAppSection('my-estimations');
            break;
    }
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.remove('active');
}

async function markNotificationAsRead(notificationId) {
    const updateNotification = (notifications) => {
        const notification = notifications.find(n => n.id == notificationId);
        if (notification && !notification.isRead) {
            notification.isRead = true;
            return true;
        }
        return false;
    };
    if (updateNotification(appState.notifications) || updateNotification(notificationState.notifications)) {
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
        if (appState.currentUser) fetchNotifications();
        else stopNotificationPolling();
    }, 15000);
    console.log('🔔 Notification polling started (15 second intervals)');
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
        if (panel.classList.toggle('active')) {
            const panelList = document.getElementById('notification-panel-list');
            if (panelList && appState.notifications.length === 0) {
                panelList.innerHTML = `
                    <div class="notification-loading-state">
                        <div class="spinner"></div><p>Loading notifications...</p>
                    </div>`;
            }
            await fetchNotifications();
        }
    }
}

function initializeEnhancedNotifications() {
    loadStoredNotifications();
    if (notificationState.notifications.length > 0) {
        appState.notifications = notificationState.notifications;
        renderNotificationPanel();
        updateNotificationBadge();
    }
    if (appState.currentUser) startNotificationPolling();
}

function enhancedLogout() {
    stopNotificationPolling();
    if (notificationState.notifications.length > 0) saveNotificationsToStorage();
    console.log('Enhanced notification system cleaned up for logout');
}


// --- DATA FETCHING & RENDERING (JOBS, QUOTES, ESTIMATIONS, ETC.) ---

async function loadUserQuotes() {
    if (appState.currentUser.type !== 'designer') return;
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.userSubmittedQuotes.clear();
        quotes.forEach(quote => {
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
                <button class="btn btn-primary" onclick="renderAppSection('estimation-tool')"><i class="fas fa-plus"></i> New Estimation Request</button>
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
                    <div class="empty-icon"><i class="fas fa-calculator"></i></div>
                    <h3>No Estimation Requests Yet</h3>
                    <p>Start by uploading your project drawings to get accurate cost estimates from our AI-powered system.</p>
                    <button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')"><i class="fas fa-upload"></i> Upload First Project</button>
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
                            <span class="estimation-status-badge ${estimation.status}"><i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}</span>
                        </div>
                        ${estimation.estimatedAmount ? `<div class="estimation-amount"><span class="amount-label">Estimated Cost</span><span class="amount-value">$${estimation.estimatedAmount.toLocaleString()}</span></div>` : ''}
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
        'pending': {
            icon: 'fa-clock',
            label: 'Under Review'
        },
        'in-progress': {
            icon: 'fa-cogs',
            label: 'Processing'
        },
        'completed': {
            icon: 'fa-check-circle',
            label: 'Complete'
        },
        'rejected': {
            icon: 'fa-times-circle',
            label: 'Rejected'
        },
        'cancelled': {
            icon: 'fa-ban',
            label: 'Cancelled'
        }
    };
    return configs[status] || {
        icon: 'fa-question-circle',
        label: status
    };
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
    const endpoint = user.type === 'designer' ?
        `/jobs?page=${appState.jobsPage}&limit=6` :
        `/jobs/user/${user.id}`;
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
            jobsListContainer.innerHTML = user.type === 'designer' ?
                `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>` :
                `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Post your first project and connect with talented professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }
        jobsListContainer.innerHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote ?
                `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>` :
                user.type === 'designer' && hasUserQuoted ?
                `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>` :
                user.type === 'designer' && job.status === 'assigned' ?
                `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>` : '';
            const actions = user.type === 'designer' ? quoteButton : `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            const statusBadge = job.status !== 'open' ?
                `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>` :
                `<span class="job-status-badge open"><i class="fas fa-clock"></i> Open</span>`;
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
                    ${job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : ''}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : ''}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');
        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }
    } catch (error) {
        if (jobsListContainer) {
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
        const approvedJobs = (response.data || []).filter(job => job.status === 'assigned');
        appState.approvedJobs = approvedJobs;
        if (approvedJobs.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here once you accept quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }
        listContainer.innerHTML = approvedJobs.map(job => `
            <div class="job-card premium-card approved-job">
                <div class="job-header">
                    <div class="job-title-section"><h3 class="job-title">${job.title}</h3><span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span></div>
                    <div class="approved-amount"><span class="amount-label">Approved Amount</span><span class="amount-value">${job.approvedAmount}</span></div>
                </div>
                <div class="job-meta"><div class="job-meta-item"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div></div>
                <div class="job-description"><p>${job.description}</p></div>
                ${job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : ''}
                ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                ${job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : ''}
                <div class="job-actions"><div class="job-actions-group"><button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button><button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button></div></div>
            </div>`).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Approved Projects</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed?')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'PUT', {
                status: 'completed'
            }, 'Project marked as completed successfully!');
            addNotification('A project has been marked as completed!', 'job');
            fetchAndRenderApprovedJobs();
        } catch (error) {
            addNotification('Failed to mark job as completed.', 'error');
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
            const attachmentLink = (quote.attachments || []).length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${quote.attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const statusIcon = {
                'submitted': 'fa-clock',
                'approved': 'fa-check-circle',
                'rejected': 'fa-times-circle'
            } [quote.status] || 'fa-question-circle';
            const actionButtons = [];
            if (quote.status === 'approved') actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
            if (quote.status === 'submitted') actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit Quote</button>`, `<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
            return `
                <div class="quote-card premium-card quote-status-${quote.status}">
                    <div class="quote-header">
                        <div class="quote-title-section"><h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3><span class="quote-status-badge ${quote.status}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
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
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Quotes</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button></div>`;
    }
}


// --- JOB & QUOTE ACTIONS ---
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
        if (form.attachment.files.length > 0) formData.append('attachment', form.attachment.files[0]);
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addNotification(`Your project "${form.title.value}" has been posted.`, 'job');
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
    if (confirm('Are you sure you want to delete this project? This will also delete all associated quotes.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.');
            addNotification('Project has been deleted.', 'info');
            fetchAndRenderJobs();
        } catch (error) {
            addNotification('Failed to delete project.', 'error');
        }
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        try {
            await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.');
            addNotification('Quote has been deleted.', 'info');
            fetchAndRenderMyQuotes();
            loadUserQuotes();
        } catch (error) {
            addNotification('Failed to delete quote.', 'error');
        }
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        let quotesHTML = `<div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3><p class="modal-subtitle">Review quotes for this project</p></div>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received</h3><p>No quotes have been submitted yet.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">${quotes.map(quote => {
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                let actionButtons = '';
                if(canApprove) actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve Quote</button>${messageButton}`;
                else if (quote.status === 'approved') actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${messageButton}`;
                else actionButtons = messageButton;
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
                return `
                    <div class="quote-item premium-quote-item quote-status-${quote.status}">
                        <div class="quote-item-header">
                            <div class="designer-info"><div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div><div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${quote.status}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div></div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        <div class="quote-details">
                            ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                            <div class="quote-description"><p>${quote.description}</p></div>
                            ${(quote.attachments || []).length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${quote.attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : ''}
                        </div>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            }).join('')}</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');
    } catch (error) {
        showGenericModal(`<div class="modal-header premium-modal-header"><h3><i class="fas fa-exclamation-triangle"></i> Error</h3></div><div class="error-state premium-error"><p>Could not load quotes for this project.</p></div>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer.')) {
        try {
            await apiCall(`/quotes/${quoteId}/approve`, 'PUT', {
                jobId
            }, 'Quote approved successfully!');
            addNotification('You have approved a quote and assigned the project!', 'quote');
            closeModal();
            fetchAndRenderJobs();
        } catch (error) {
            addNotification('Failed to approve quote.', 'error');
        }
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your proposal for this project</p></div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required min="1" step="0.01" placeholder="Enter amount"></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required min="1" placeholder="Project duration"></div>
            </div>
            <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach..."></textarea></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload relevant documents</small></div>
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
        addNotification('Your quote has been submitted.', 'quote');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        fetchAndRenderJobs();
    } catch (error) {
        addNotification('Failed to submit quote.', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        const content = `
            <div class="modal-header premium-modal-header"><h3><i class="fas fa-edit"></i> Edit Your Quote</h3><p class="modal-subtitle">Update your quote for: <strong>${quote.jobTitle}</strong></p></div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required min="1"></div>
                </div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach...">${quote.description}</textarea></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"></div>
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
        addNotification('Your quote has been updated.', 'quote');
        closeModal();
        fetchAndRenderMyQuotes();
    } catch (error) {
        addNotification('Failed to update quote.', 'error');
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
        showNotification('Opening conversation...', 'info');
        const response = await apiCall('/messages/find', 'POST', {
            jobId,
            recipientId
        });
        if (response.success) renderConversationView(response.data);
    } catch (error) {
        addNotification('Failed to open conversation.', 'error');
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
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3><p>Start collaborating by messaging from job quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button></div>`;
            return;
        }
        listContainer.innerHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherParticipantName = otherParticipant ? otherParticipant.name : 'Unknown User';
            const lastMessage = convo.lastMessage ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;
            return `
                <div class="conversation-card premium-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${getAvatarColor(otherParticipantName)}">${otherParticipantName.charAt(0).toUpperCase()}${isUnread ? '<div class="unread-indicator"></div>' : ''}</div>
                    <div class="convo-details">
                        <div class="convo-header"><h4>${otherParticipantName}</h4><div class="convo-meta"><span class="participant-type ${otherParticipant ? otherParticipant.type : ''}">${otherParticipant ? otherParticipant.type : ''}</span><span class="convo-time">${timeAgo}</span></div></div>
                        <p class="convo-project"><i class="fas fa-briefcase"></i><strong>${convo.jobTitle}</strong></p>
                        <p class="convo-preview">${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? `<strong>${convo.lastMessageBy}:</strong> ` : ''}${lastMessage}</p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Conversations</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button></div>`;
    }
}

async function renderConversationView(conversationOrId) {
    let conversation;
    if (typeof conversationOrId === 'string') {
        conversation = appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId };
    } else {
        conversation = conversationOrId;
    }
    if (!conversation.participants && conversation.id) {
        try {
            const response = await apiCall('/messages', 'GET');
            appState.conversations = response.data || [];
            conversation = appState.conversations.find(c => c.id === conversation.id);
            if (!conversation) throw new Error('Conversation not found');
        } catch (error) {
            showNotification('Failed to load conversation.', 'error');
            renderAppSection('messages');
            return;
        }
    }
    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants ? conversation.participants.find(p => p.id !== appState.currentUser.id) : { name: 'Unknown', type: 'user' };
    container.innerHTML = `
        <div class="chat-container premium-chat">
            <div class="chat-header premium-chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn premium-back-btn"><i class="fas fa-arrow-left"></i></button>
                <div class="chat-header-info">
                    <div class="chat-avatar premium-avatar" style="background-color: ${getAvatarColor(otherParticipant.name)}">${(otherParticipant.name || 'U').charAt(0).toUpperCase()}</div>
                    <div class="chat-details">
                        <h3>${otherParticipant.name || 'Conversation'}</h3>
                        <p class="chat-project"><i class="fas fa-briefcase"></i> ${conversation.jobTitle || 'Project Discussion'}</p>
                    </div>
                </div>
                <div class="chat-actions"><span class="participant-type-badge premium-badge ${otherParticipant.type || ''}"><i class="fas ${otherParticipant.type === 'designer' ? 'fa-drafting-compass' : 'fa-building'}"></i> ${otherParticipant.type || 'User'}</span></div>
            </div>
            <div class="chat-messages premium-messages" id="chat-messages-container"><div class="loading-messages"><div class="spinner"></div><p>Loading messages...</p></div></div>
            <div class="chat-input-area premium-input-area">
                <form id="send-message-form" class="message-form premium-message-form">
                    <div class="message-input-container">
                        <input type="text" id="message-text-input" placeholder="Type your message..." required autocomplete="off">
                        <button type="submit" class="send-button premium-send-btn" title="Send message"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('send-message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(conversation.id);
    });
    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        const messages = response.data || [];
        if (messages.length === 0) {
            messagesContainer.innerHTML = `<div class="empty-messages premium-empty-messages"><div class="empty-icon"><i class="fas fa-comment-dots"></i></div><h4>Start the conversation</h4><p>Send your first message to begin collaborating.</p></div>`;
        } else {
            let messagesHTML = '';
            let lastDate = null;
            messages.forEach((msg, index) => {
                const messageDate = formatMessageDate(msg.createdAt);
                if (messageDate !== lastDate && messageDate !== 'Invalid Date') {
                    messagesHTML += `<div class="chat-date-separator"><span>${messageDate}</span></div>`;
                    lastDate = messageDate;
                }
                const isMine = msg.senderId === appState.currentUser.id;
                const showAvatar = !messages[index - 1] || messages[index - 1].senderId !== msg.senderId;
                messagesHTML += `
                    <div class="message-wrapper premium-message ${isMine ? 'me' : 'them'}">
                        ${!isMine && showAvatar ? `<div class="message-avatar premium-msg-avatar" style="background-color: ${getAvatarColor(msg.senderName)}">${(msg.senderName || 'U').charAt(0).toUpperCase()}</div>` : '<div class="message-avatar-spacer"></div>'}
                        <div class="message-content">
                            ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName || 'Unknown'}</div>` : ''}
                            <div class="message-bubble premium-bubble ${isMine ? 'me' : 'them'}">${msg.text || ''}</div>
                            <div class="message-meta">${formatDetailedTimestamp(msg.createdAt)}</div>
                        </div>
                    </div>`;
            });
            messagesContainer.innerHTML = messagesHTML;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        const messageInput = document.getElementById('message-text-input');
        if (messageInput) messageInput.focus();
    } catch (error) {
        messagesContainer.innerHTML = `<div class="error-messages premium-error-messages"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h4>Error loading messages</h4><p>Please try again later.</p><button class="btn btn-primary" onclick="renderConversationView('${conversation.id}')">Retry</button></div>`;
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const sendBtn = document.querySelector('.send-button');
    const text = input.value.trim();
    if (!text) return showNotification('Please enter a message', 'warning');
    if (!conversationId) return showNotification('Conversation not found', 'error');
    const originalBtnContent = sendBtn.innerHTML;
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="btn-spinner"></div>';
    try {
        const response = await fetch(`${BACKEND_URL}/messages/${conversationId}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${appState.jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to send message');
        if (data.success) {
            input.value = '';
            const messagesContainer = document.getElementById('chat-messages-container');
            const emptyState = messagesContainer.querySelector('.empty-messages');
            if (emptyState) emptyState.remove();
            const newMessage = data.data;
            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-wrapper premium-message me';
            messageBubble.innerHTML = `
                <div class="message-avatar-spacer"></div>
                <div class="message-content">
                    <div class="message-bubble premium-bubble me">${newMessage.text}</div>
                    <div class="message-meta">${formatDetailedTimestamp(newMessage.createdAt)}</div>
                </div>`;
            messagesContainer.appendChild(messageBubble);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    } catch (error) {
        showNotification(error.message || 'Failed to send message.', 'error');
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalBtnContent;
        if (input) input.focus();
    }
}


// --- UTILITY & FORMATTING FUNCTIONS ---
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp ? .toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / 60000);
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

function parseDate(date) {
    if (!date) return null;
    if (date instanceof Date) return date;
    if (typeof date === 'object' && typeof date.toDate === 'function') return date.toDate();
    if (typeof date === 'object' && date.seconds !== undefined) return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
    if (typeof date === 'string') return new Date(date);
    if (typeof date === 'number') return new Date(date > 1000000000000 ? date : date * 1000);
    if (typeof date === 'object' && date._seconds !== undefined) return new Date(date._seconds * 1000 + (date._nanoseconds || 0) / 1000000);
    return null;
}

function formatDetailedTimestamp(date) {
    const messageDate = parseDate(date);
    if (!messageDate || isNaN(messageDate.getTime())) return 'Invalid date';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const time = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    if (today.getTime() === messageDay.getTime()) return time;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (yesterday.getTime() === messageDay.getTime()) return `Yesterday, ${time}`;
    return `${messageDate.toLocaleDateString()}, ${time}`;
}

function formatMessageTimestamp(date) {
    const messageDate = parseDate(date);
    if (!messageDate || isNaN(messageDate.getTime())) return 'Invalid date';
    const diffSeconds = Math.floor((new Date() - messageDate) / 1000);
    if (diffSeconds < 30) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return messageDate.toLocaleDateString();
}

function formatMessageDate(date) {
    const messageDate = parseDate(date);
    if (!messageDate || isNaN(messageDate.getTime())) return 'Invalid Date';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    if (today.getTime() === messageDay.getTime()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (yesterday.getTime() === messageDay.getTime()) return 'Yesterday';
    return messageDate.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}


// --- UI, MODAL & RENDERING FUNCTIONS ---
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

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
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
    const profileStatus = await checkProfileStatus();
    if (profileStatus && (
            !profileStatus.profileCompleted ||
            profileStatus.profileStatus === 'pending' ||
            profileStatus.profileStatus === 'rejected'
        )) {
        return; // Profile flow will handle the display
    }

    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';

    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';

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
    if (user.type === 'designer') loadUserQuotes();
    if (user.type === 'contractor') loadUserEstimations();
    resetInactivityTimer();
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
    links += `<hr class="sidebar-divider"><a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
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

    if (sectionId === 'settings') {
        container.innerHTML = getSettingsTemplate(appState.currentUser);
        return;
    } else if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        renderRecentActivityWidgets();
    } else if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes' : 'Manage your project listings';
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
    }
}


// --- DASHBOARD WIDGETS ---
async function renderRecentActivityWidgets() {
    const user = appState.currentUser;
    const container = user.type === 'contractor' ?
        document.getElementById('recent-projects-widget') :
        document.getElementById('recent-quotes-widget');
    if (!container) return;
    container.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
    try {
        const endpoint = user.type === 'contractor' ?
            `/jobs/user/${user.id}?limit=3` :
            `/quotes/user/${user.id}?limit=3`;
        const response = await apiCall(endpoint, 'GET');
        const items = (response.data || []).slice(0, 3);
        if (items.length > 0) {
            container.innerHTML = items.map(item => {
                const isJob = user.type === 'contractor';
                const title = isJob ? item.title : `Quote for: ${item.jobTitle}`;
                const meta = isJob ? `Budget: ${item.budget}` : `Amount: ${item.quoteAmount}`;
                return `
                    <div class="widget-list-item" id="widget-item-${item.id}">
                        <div class="widget-item-header">
                            <div class="widget-item-info">
                                <i class="fas ${isJob ? 'fa-briefcase' : 'fa-file-invoice-dollar'} widget-item-icon"></i>
                                <div>
                                    <p class="widget-item-title">${title}</p>
                                    <span class="widget-item-meta">${meta}</span>
                                </div>
                            </div>
                            <span class="widget-item-status ${item.status}">${item.status}</span>
                        </div>
                    </div>`;
            }).join('');
        } else {
            container.innerHTML = `<p class="widget-empty-text">No recent ${user.type === 'contractor' ? 'projects' : 'quotes'} found.</p>`;
        }
    } catch (e) {
        container.innerHTML = `<p class="widget-empty-text">Could not load ${user.type === 'contractor' ? 'projects' : 'quotes'}.</p>`;
    }
}


// --- ESTIMATION TOOL ---
function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
        });
    }
    if (fileInput) fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileSelect(e.target.files);
    });
    const submitBtn = document.getElementById('submit-estimation-btn');
    if (submitBtn) submitBtn.addEventListener('click', handleEstimationSubmit);
}

function handleFileSelect(files) {
    const fileList = document.getElementById('selected-files-list');
    const submitBtn = document.getElementById('submit-estimation-btn');
    appState.uploadedFile = files;
    fileList.innerHTML = Array.from(files).map((file, i) => `
        <div class="selected-file-item">
            <div class="file-info"><i class="fas fa-file"></i><div class="file-details"><span class="file-name">${file.name}</span><span class="file-size">${(file.size / 1048576).toFixed(2)} MB</span></div></div>
            <button type="button" class="remove-file-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
        </div>`).join('');
    document.getElementById('file-info-container').style.display = 'block';
    submitBtn.disabled = false;
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
    if (!appState.uploadedFile || appState.uploadedFile.length === 0) return showNotification('Please select files', 'warning');
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    if (!projectTitle || !description) return showNotification('Please fill in all fields', 'warning');
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
        addNotification(`Your request for "${projectTitle}" has been submitted.`, 'estimation');
        form.reset();
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        renderAppSection('my-estimations');
    } catch (error) {
        addNotification('Failed to submit estimation request.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Estimation Request';
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i><span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}


// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Welcome Back</h2><p>Sign in to your SteelConnect account</p></div>
        <form id="login-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="loginEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required placeholder="Enter your password"></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create one</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header"><div class="auth-logo"><i class="fas fa-drafting-compass"></i></div><h2>Join SteelConnect</h2><p>Create your professional account</p></div>
        <form id="register-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required placeholder="Enter your name"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="regEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required placeholder="Create a password"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p class="header-subtitle">Create a listing to attract qualified professionals</p></div></div>
        <div class="post-job-container premium-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label">Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div>
                        <div class="form-group"><label class="form-label">Project Deadline</label><input type="date" class="form-input" name="deadline" required></div>
                    </div>
                    <div class="form-group"><label class="form-label">Required Skills</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit"><small class="form-help">Separate with commas</small></div>
                </div>
                <div class="form-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group"><label class="form-label">Detailed Description</label><textarea class="form-textarea" name="description" required placeholder="Provide a comprehensive description..."></textarea></div>
                    <div class="form-group"><label class="form-label">Project Attachments</label><input type="file" class="form-input file-input" name="attachment"><small class="form-help">Upload drawings or specifications</small></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2><p class="header-subtitle">Upload drawings for instant, accurate cost estimates</p></div></div>
        <div class="estimation-tool-container premium-estimation-container">
            <form id="estimation-form" class="premium-estimation-form">
                <div class="form-section">
                    <h3><i class="fas fa-upload"></i> Upload Project Files</h3>
                    <div id="file-upload-area" class="file-upload-area premium-upload-area">
                        <input type="file" id="file-upload-input" multiple />
                        <div class="upload-content"><div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div><h3>Drag & Drop Files Here</h3><p>or click to browse</p></div>
                    </div>
                    <div id="file-info-container" style="display: none;"><h4><i class="fas fa-files"></i> Selected Files</h4><div id="selected-files-list"></div></div>
                </div>
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                    <div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework"></div>
                    <div class="form-group"><label class="form-label">Project Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your project..."></textarea></div>
                </div>
                <div class="form-actions"><button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large" disabled><i class="fas fa-paper-plane"></i> Submit Request</button></div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const quickActions = isContractor ?
        `<div class="quick-action-card" onclick="renderAppSection('post-job')"><i class="fas fa-plus-circle card-icon"></i><h3>Create Project</h3><p>Post a new listing.</p></div>
         <div class="quick-action-card" onclick="renderAppSection('jobs')"><i class="fas fa-tasks card-icon"></i><h3>My Projects</h3><p>View your active projects.</p></div>
         <div class="quick-action-card" onclick="renderAppSection('estimation-tool')"><i class="fas fa-calculator card-icon"></i><h3>AI Estimation</h3><p>Get instant cost estimates.</p></div>` :
        `<div class="quick-action-card" onclick="renderAppSection('jobs')"><i class="fas fa-search card-icon"></i><h3>Browse Projects</h3><p>Find new opportunities.</p></div>
         <div class="quick-action-card" onclick="renderAppSection('my-quotes')"><i class="fas fa-file-invoice-dollar card-icon"></i><h3>My Quotes</h3><p>Track your submitted quotes.</p></div>
         <div class="quick-action-card" onclick="renderAppSection('messages')"><i class="fas fa-comments card-icon"></i><h3>Messages</h3><p>Communicate with clients.</p></div>`;
    const widgets = isContractor ?
        `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Projects</h3><div id="recent-projects-widget" class="widget-content"></div></div>` :
        `<div class="widget-card"><h3><i class="fas fa-history"></i> Recent Quotes</h3><div id="recent-quotes-widget" class="widget-content"></div></div>`;
    return `
        <div class="dashboard-container">
            <div class="dashboard-hero">
                <div><h2>Welcome back, ${user.name.split(' ')[0]} 👋</h2><p>You are logged in to your <strong>${isContractor ? 'Contractor' : 'Designer'} Portal</strong>.</p></div>
                <div class="subscription-badge"><i class="fas fa-star"></i> Pro Plan</div>
            </div>
            <h3 class="dashboard-section-title">Quick Actions</h3>
            <div class="dashboard-grid">${quickActions}</div>
            <div class="dashboard-columns">${widgets}
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
    const profileSection = user.profileStatus === 'approved' ? `
        <div class="settings-card">
            <h3><i class="fas fa-id-card"></i> Professional Profile</h3>
            <form class="premium-form" onsubmit="handleProfileUpdate(event)">
                ${user.type === 'designer' ? `
                    <div class="form-group"><label class="form-label">LinkedIn Profile</label><input type="url" class="form-input" name="linkedinProfile" value="${user.linkedinProfile || ''}" required></div>
                    <div class="form-group"><label class="form-label">Skills</label><input type="text" class="form-input" name="skills" value="${(user.skills || []).join(', ')}" placeholder="AutoCAD, Revit"></div>
                    <div class="form-group"><label class="form-label">Experience</label><textarea class="form-textarea" name="experience" rows="3">${user.experience || ''}</textarea></div>` : `
                    <div class="form-group"><label class="form-label">Company Name</label><input type="text" class="form-input" name="companyName" value="${user.companyName || ''}" required></div>
                    <div class="form-group"><label class="form-label">Company Website</label><input type="url" class="form-input" name="companyWebsite" value="${user.companyWebsite || ''}"></div>`}
                <button type="submit" class="btn btn-primary">Update Profile</button>
            </form>
        </div>` : `
        <div class="settings-card">
            <h3><i class="fas fa-info-circle"></i> Profile Status</h3>
            <p>Your profile status: <strong>${user.profileStatus || 'Incomplete'}</strong></p>
            ${user.profileStatus === 'pending' ? `<p class="text-warning">Your profile is under review.</p>` : `<p class="text-info">Please complete your profile to access all features.</p>`}
        </div>`;
    return `
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-cog"></i> Settings</h2><p class="header-subtitle">Manage your account and profile</p></div></div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Personal Information</h3>
                <form class="premium-form" onsubmit="handlePersonalInfoUpdate(event)">
                    <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" name="name" value="${user.name}" required></div>
                    <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" value="${user.email}" disabled><small class="form-help">Email cannot be changed.</small></div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
            ${profileSection}
            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                <form class="premium-form" onsubmit="handlePasswordChange(event)">
                    <div class="form-group"><label class="form-label">Current Password</label><input type="password" class="form-input" name="currentPassword" required></div>
                    <div class="form-group"><label class="form-label">New Password</label><input type="password" class="form-input" name="newPassword" required></div>
                    <div class="form-group"><label class="form-label">Confirm New Password</label><input type="password" class="form-input" name="confirmPassword" required></div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>`;
}

function getProfileCompletionTemplate() {
    return `
        <div class="profile-completion-container">
            <div class="profile-completion-header">
                <div class="completion-icon"><i class="fas fa-user-edit"></i></div>
                <h2>Complete Your Professional Profile</h2>
                <p>Help us verify your credentials to access all platform features.</p>
            </div>
            <form class="profile-completion-form">
                <div class="form-sections"></div>
            </form>
        </div>`;
}


// --- SETTINGS PAGE ACTIONS ---
async function handleProfileUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall('/profile/update', 'PUT', formData, 'Profile updated successfully!');
        const updatedUser = { ...appState.currentUser
        };
        for (const [key, value] of formData.entries()) {
            updatedUser[key] = (key === 'skills') ? value.split(',').map(s => s.trim()).filter(Boolean) : value;
        }
        appState.currentUser = updatedUser;
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    } catch (error) {
        showNotification('Failed to update profile.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handlePersonalInfoUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall('/profile/update', 'PUT', formData, 'Personal information updated!');
        appState.currentUser.name = formData.get('name');
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
        document.getElementById('user-info-name').textContent = appState.currentUser.name;
        document.getElementById('sidebarUserName').textContent = appState.currentUser.name;
    } catch (error) {
        showNotification('Failed to update personal information.', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();
    showNotification('Password change functionality will be implemented soon.', 'info');
}
