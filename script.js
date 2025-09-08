// --- FULL APPLICATION SCRIPT ---
document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
const BACKEND_URL = IS_LOCAL ? 'http://localhost:10000/api' : PROD_BACKEND_URL;

const appState = {
    currentUser: null,
    jwtToken: null,
    // Other app state properties can be added here
};

// --- INITIALIZATION ---
function initializeApp() {
    console.log("SteelConnect App Initializing...");
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');

    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            // This now controls the entire app flow after login
            checkProfileStatusAndControlAccess();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
    setupGlobalEventListeners();
}

// --- PROFILE COMPLETION & ACCESS CONTROL ---
async function checkProfileStatusAndControlAccess() {
    if (!appState.currentUser) return;

    try {
        const statusData = await apiCall('/profile/status', 'GET');
        const { canAccess, profileStatus, rejectionReason } = statusData.data;

        const appContent = document.getElementById('app-content');
        const statusOverlay = document.getElementById('profile-status-overlay');
        const landingPage = document.getElementById('landing-page-content');
        
        landingPage.style.display = 'none';

        if (canAccess) {
            statusOverlay.style.display = 'none';
            appContent.style.display = 'flex';
            showAppView(); // User is approved, proceed with normal app view
        } else {
            appContent.style.display = 'none';
            statusOverlay.style.display = 'flex';
            
            setupMinimalHeader();

            if (profileStatus === 'pending') {
                statusOverlay.innerHTML = getPendingReviewTemplate();
            } else if (profileStatus === 'rejected') {
                statusOverlay.innerHTML = getRejectedTemplate(rejectionReason);
            } else {
                // If profile is just 'incomplete', show the form immediately inside the overlay
                statusOverlay.innerHTML = `<div id="app-container-overlay" class="main-container"></div>`;
                await renderProfileCompletionForm(true); // Render in overlay
            }
        }
    } catch (error) {
        console.error("Could not check profile status:", error);
        showNotification("Error verifying your profile status. Please try logging in again.", "error");
        logout();
    }
}

async function renderProfileCompletionForm(isOverlay = false) {
    const containerId = isOverlay ? 'app-container-overlay' : 'app-container';
    const container = document.getElementById(containerId);
    
    if(!container) {
        console.error(`Target container #${containerId} for profile form not found.`);
        return;
    }

    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading Profile Form...</p></div>`;

    try {
        const [fieldsResponse, profileResponse] = await Promise.all([
            apiCall('/profile/form-fields', 'GET'),
            apiCall('/profile/me', 'GET')
        ]);
        
        const fields = fieldsResponse.data.fields;
        const userProfile = profileResponse.data;

        container.innerHTML = `
            <div class="profile-completion-container">
                <div class="profile-completion-header">
                    <div class="completion-icon"><i class="fas fa-user-pen"></i></div>
                    <h2>Complete Your Professional Profile</h2>
                    <p>Provide your details for verification. This information will be reviewed by our team.</p>
                </div>
                <form id="profile-completion-form" class="profile-completion-form"></form>
            </div>`;

        const form = document.getElementById('profile-completion-form');
        form.innerHTML = generateFormHtml(fields, userProfile) + 
            `<div class="form-actions">
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit for Review</button>
            </div>`;

        form.addEventListener('submit', handleProfileSubmit);

    } catch (error) {
        container.innerHTML = `<div class="error-state"><h3>Could not load profile form</h3><p>Please refresh the page or contact support.</p></div>`;
    }
}

function generateFormHtml(fields, existingData) {
    let html = '';
    fields.forEach(field => {
        const value = Array.isArray(existingData[field.name]) 
            ? existingData[field.name].join(', ') 
            : existingData[field.name] || '';
            
        const required = field.required ? 'required' : '';
        const requiredLabelClass = field.required ? 'class="form-label required"' : 'class="form-label"';
        
        html += `<div class="form-group">`;
        html += `<label for="${field.name}" ${requiredLabelClass}>${field.label}</label>`;
        
        switch(field.type) {
            case 'textarea':
                html += `<textarea name="${field.name}" id="${field.name}" class="form-textarea" ${required}>${value}</textarea>`;
                break;
            case 'select':
                html += `<select name="${field.name}" id="${field.name}" class="form-select" ${required}>`;
                html += `<option value="">Select an option</option>`;
                field.options.forEach(opt => {
                    html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
                });
                html += `</select>`;
                break;
            case 'file':
                const multiple = field.multiple ? 'multiple' : '';
                html += `<input type="file" name="${field.name}" id="${field.name}" class="form-input" ${required} ${multiple} accept="${field.accept || ''}">`;
                if (existingData[field.name] && existingData[field.name].filename) {
                    html += `<small class="form-help">Current file: ${existingData[field.name].filename}. Uploading a new file will replace it.</small>`;
                }
                break;
            default:
                html += `<input type="${field.type}" name="${field.name}" id="${field.name}" class="form-input" value="${value}" ${required}>`;
        }
        
        html += `</div>`;
    });
    return html;
}

async function handleProfileSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="btn-spinner"></div> Submitting...`;

    try {
        const formData = new FormData(form);
        await apiCall('/profile/complete', 'PUT', formData, 'Profile submitted successfully!');
        
        showNotification("Your profile is now under review.", "success");
        await checkProfileStatusAndControlAccess();
        
    } catch (error) {
        console.error("Profile submission failed", error);
        showNotification(error.message || "Failed to submit profile.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// --- AUTH & SESSION ---
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        
        await checkProfileStatusAndControlAccess(); 
        
    } catch (error) {
       // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    showLandingPageView();
    window.location.reload();
}

// --- UI & RENDERING ---
function setupGlobalEventListeners() {
    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));

    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentUser) {
                renderAppSection('dashboard');
            } else {
                showLandingPageView();
            }
        });
    }

    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('user-info-dropdown').classList.toggle('active');
        });
    }
}

function showAppView() {
    document.getElementById('auth-buttons-container').style.display = 'none';
    
    const userInfoContainer = document.getElementById('user-info-container');
    userInfoContainer.style.display = 'flex';
    document.getElementById('user-settings-link').style.display = 'flex';
    document.getElementById('notification-bell-container').style.display = 'block';

    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    // Clear old listeners and add new ones to prevent duplication
    const logoutLink = document.getElementById('user-logout-link');
    logoutLink.replaceWith(logoutLink.cloneNode(true)); 
    document.getElementById('user-logout-link').addEventListener('click', (e) => { e.preventDefault(); logout(); });

    const settingsLink = document.getElementById('user-settings-link');
    settingsLink.replaceWith(settingsLink.cloneNode(true));
    document.getElementById('user-settings-link').addEventListener('click', (e) => { 
        e.preventDefault(); 
        renderAppSection('settings');
        document.getElementById('user-info-dropdown').classList.remove('active');
    });

    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('dashboard');
}

function setupMinimalHeader() {
    document.getElementById('auth-buttons-container').style.display = 'none';
    const userInfoContainer = document.getElementById('user-info-container');
    userInfoContainer.style.display = 'flex';
    document.getElementById('user-info-name').textContent = appState.currentUser.name;
    document.getElementById('user-info-avatar').textContent = (appState.currentUser.name || "A").charAt(0).toUpperCase();
    
    // Hide notifications and settings for locked users
    document.getElementById('user-settings-link').style.display = 'none';
    document.getElementById('notification-bell-container').style.display = 'none';
    
    // Ensure logout works
    const logoutLink = document.getElementById('user-logout-link');
    logoutLink.replaceWith(logoutLink.cloneNode(true));
    document.getElementById('user-logout-link').addEventListener('click', (e) => { e.preventDefault(); logout(); });
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    document.getElementById('profile-status-overlay').style.display = 'none';
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    if (!container) return;
    
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    if (sectionId === 'settings') {
        container.innerHTML = getSettingsTemplate(appState.currentUser);
        document.getElementById('edit-profile-btn').addEventListener('click', () => renderProfileCompletionForm(false));
    } else {
        // You can re-integrate your other view functions here (for jobs, quotes, etc.)
        container.innerHTML = `<h2>${sectionId.replace('-', ' ')} Page</h2><p>Content for this section goes here.</p>`;
    }
}

// --- TEMPLATES ---
function getSettingsTemplate(user) {
    return `
        <div class="section-header"><h2>Settings</h2></div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-cog"></i> Profile Management</h3>
                <p>Your profile status is currently: <strong>${(user.profileStatus || 'Incomplete').toUpperCase()}</strong>.</p>
                <p>Keep your details up to date to attract more opportunities and ensure your account remains active.</p>
                <button class="btn btn-primary" id="edit-profile-btn">
                    <i class="fas fa-edit"></i> View & Edit Profile
                </button>
            </div>
        </div>
    `;
}

function getPendingReviewTemplate() {
    return `
        <div class="profile-status-content">
            <div class="status-icon pending"><i class="fas fa-clock"></i></div>
            <h2>Profile Under Review</h2>
            <p>Your profile has been submitted and is currently being reviewed by our team. This usually takes 24-48 hours. You will receive an email once the review is complete and you can access your portal.</p>
            <button class="btn btn-outline" onclick="logout()">Logout</button>
        </div>
    `;
}

function getRejectedTemplate(reason) {
    return `
        <div class="profile-status-content">
            <div class="status-icon rejected"><i class="fas fa-times-circle"></i></div>
            <h2>Profile Requires Attention</h2>
            <p>Unfortunately, your profile could not be approved at this time. Please review the feedback below and resubmit your profile for another review.</p>
            <div class="rejection-reason-box">
                <h4>Admin Feedback:</h4>
                <p>${reason || 'No specific reason was provided. Please ensure all information is accurate and complete.'}</p>
            </div>
            <button class="btn btn-primary" style="margin-top: 2rem;" onclick="renderProfileCompletionForm(true)">
                <i class="fas fa-edit"></i> Edit and Resubmit Profile
            </button>
             <button class="btn btn-outline" style="margin-top: 1rem;" onclick="logout()">Logout</button>
        </div>
    `;
}

// --- API HELPER & OTHER UTILS ---
async function apiCall(endpoint, method, body = null, successMessage = null) {
    try {
        const options = { method, headers: {} };
        if (appState.jwtToken) {
            options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        }
        if (body) {
            if (body instanceof FormData) {
                // Don't set Content-Type for FormData, browser does it with boundary
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        if (response.status === 204) return { success: true };
        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.message || `Request failed with status ${response.status}`);
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

function showNotification(message, type = 'info') {
    // This is a placeholder for your full notification/toast system
    console.log(`[${type.toUpperCase()}] ${message}`);
    const container = document.getElementById('notification-container');
    if (!container) return;
    const notif = document.createElement('div');
    notif.className = `toast-notification toast-${type}`;
    notif.textContent = message;
    container.appendChild(notif);
    setTimeout(() => {
        notif.remove();
    }, 4000);
}

function showAuthModal(view) { console.log(`Showing modal for: ${view}`); }
function closeModal() { console.log("Closing modal."); }
function getDashboardTemplate(user) { return `<h2>Dashboard</h2><p>Welcome, ${user.name}!</p>`; }
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    navContainer.innerHTML = `<a href="#" class="sidebar-nav-link active" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>
    <a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

// Make functions globally accessible if used in HTML onclicks
window.logout = logout;
window.renderProfileCompletionForm = renderProfileCompletionForm;
