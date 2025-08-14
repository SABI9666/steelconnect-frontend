document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & GLOBAL STATE ---

// IMPORTANT: Replace with your actual backend API URL
const BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';

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
    userSubmittedQuotes: new Set(), // Track job IDs user has quoted
    estimations: [], // Track user's estimations
    currentEstimation: null // Track current estimation being viewed
};

let inactivityTimer;

// --- CORE INITIALIZATION & UTILITIES ---

/**
 * Initializes the application on page load.
 */
function initializeApp() {
    console.log("SteelConnect App Initializing...");

    // Create a container for notifications
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    // Setup inactivity listeners for auto-logout
    ['mousemove', 'keydown', 'click'].forEach(event => window.addEventListener(event, resetInactivityTimer));

    // Attach listeners for landing page buttons
    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn')?.addEventListener('click', () => showAuthModal('register'));
    
    // Main logo click behavior
    document.querySelector('.logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('jobs');
        } else {
            showLandingPageView();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Check for a saved user session
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
}

/**
 * A generic function to make authenticated API calls.
 * @param {string} endpoint - The API endpoint (e.g., '/jobs').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {object|FormData} body - The request body.
 * @param {string|null} successMessage - A message to show on success.
 * @returns {Promise<object>} - The JSON response from the API.
 */
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
        
        // Handle cases with no content in the response body (e.g., 204 No Content)
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

/**
 * Resets the inactivity timer for auto-logout.
 */
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 300000); // 5 minutes
}

// --- UI & VIEW MANAGEMENT ---

/**
 * Shows the main application view for logged-in users.
 */
function showAppView() {
    document.getElementById('landing-page')?.classList.add('hidden');
    document.getElementById('main-app')?.classList.remove('hidden');
    document.querySelector('.main-header')?.classList.add('hidden');
    document.querySelector('.app-header')?.classList.remove('hidden');

    const user = appState.currentUser;
    if (user) {
        document.getElementById('user-name-display').textContent = user.name;
        document.getElementById('user-avatar-initial').textContent = user.name.charAt(0).toUpperCase();
        
        // Setup sidebar navigation links
        const sidebar = document.querySelector('.sidebar-nav');
        sidebar.innerHTML = getSidebarLinks(user.type);
        sidebar.querySelectorAll('.sidebar-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                renderAppSection(section);
                // For mobile view, you might want to close the sidebar here
            });
        });

        // Add logout listener
        document.getElementById('logout-button').addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });

        // Load the default section
        renderAppSection(user.type === 'designer' ? 'jobs' : 'my-jobs');
    }
}


/**
 * Shows the public landing page for logged-out users.
 */
function showLandingPageView() {
    document.getElementById('landing-page')?.classList.remove('hidden');
    document.getElementById('main-app')?.classList.add('hidden');
    document.querySelector('.main-header')?.classList.remove('hidden');
    document.querySelector('.app-header')?.classList.add('hidden');
}

/**
 * Renders a specific section of the application (e.g., jobs, quotes).
 * @param {string} section - The name of the section to render.
 */
function renderAppSection(section) {
    console.log(`Rendering section: ${section}`);
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    // Highlight active link in sidebar
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-section') === section);
    });

    switch (section) {
        case 'jobs': // For designers: browse all available jobs
            fetchAndRenderJobs();
            break;
        case 'my-jobs': // For clients: view their own posted jobs
             fetchAndRenderJobs();
            break;
        case 'post-job': // For clients: show the form to post a new job
            renderPostJobForm();
            break;
        case 'my-quotes': // For designers: view quotes they have submitted
            fetchAndRenderMyQuotes();
            break;
        case 'approved-jobs': // For clients: view their projects with approved quotes
            fetchAndRenderApprovedJobs();
            break;
        case 'estimation-tool': // For both: cost estimation tool
            fetchAndRenderEstimationTool();
            break;
        default:
            container.innerHTML = '<h2>Page not found</h2>';
    }
}


/**
 * Generates the sidebar navigation links based on user type.
 * @param {string} userType - 'client' or 'designer'.
 * @returns {string} - The HTML string for the sidebar links.
 */
function getSidebarLinks(userType) {
    if (userType === 'designer') {
        return `
            <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase"></i> Browse Projects</a>
            <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar"></i> My Quotes</a>
            <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator"></i> Estimation Tool</a>
        `;
    } else { // client
        return `
            <a href="#" class="sidebar-nav-link" data-section="my-jobs"><i class="fas fa-list-alt"></i> My Projects</a>
            <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle"></i> Post a New Project</a>
            <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle"></i> Approved Projects</a>
            <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator"></i> Estimation Tool</a>
        `;
    }
}


/**
 * Displays a dismissible notification.
 * @param {string} message - The message to display.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => notification.remove();
    notification.appendChild(closeBtn);

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}


// --- MODAL MANAGEMENT ---

/**
 * Displays the main authentication modal.
 * @param {string} formType - 'login' or 'register'.
 */
function showAuthModal(formType) {
    const modalContent = `
        <div class="auth-modal-content">
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
            <div id="auth-form-container"></div>
        </div>
    `;
    showGenericModal(modalContent, 'max-width: 420px;', 'auth-modal');
    renderAuthForm(formType);
}

/**
 * Renders either the login or register form inside the auth modal.
 * @param {string} formType - 'login' or 'register'.
 */
function renderAuthForm(formType) {
    const container = document.getElementById('auth-form-container');
    if (formType === 'login') {
        container.innerHTML = `
            <h3>Welcome Back!</h3>
            <p>Sign in to continue to SteelConnect.</p>
            <form id="login-form" class="modern-form">
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" name="loginEmail" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="loginPassword" class="form-input" required>
                </div>
                <button type="submit" class="btn btn-primary btn-full">Sign In</button>
            </form>
            <p class="auth-switch">Don't have an account? <a href="#" onclick="renderAuthForm('register')">Join Now</a></p>
        `;
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else {
        container.innerHTML = `
            <h3>Join SteelConnect</h3>
            <p>Create an account to connect with professionals.</p>
            <form id="register-form" class="modern-form">
                 <div class="form-group">
                    <label class="form-label">Full Name</label>
                    <input type="text" name="regName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Email Address</label>
                    <input type="email" name="regEmail" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Password</label>
                    <input type="password" name="regPassword" class="form-input" required minlength="6">
                </div>
                 <div class="form-group">
                    <label class="form-label">I am a...</label>
                    <select name="regRole" class="form-input" required>
                        <option value="client">Client (Looking to hire)</option>
                        <option value="designer">Designer / Contractor</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary btn-full">Create Account</button>
            </form>
            <p class="auth-switch">Already have an account? <a href="#" onclick="renderAuthForm('login')">Sign In</a></p>
        `;
        document.getElementById('register-form').addEventListener('submit', handleRegister);
    }
}

/**
 * Shows a generic modal with custom content.
 * @param {string} contentHTML - The HTML content for the modal.
 * @param {string} style - Custom CSS styles for the modal content div.
 * @param {string} modalClass - An optional CSS class for the modal overlay.
 */
function showGenericModal(contentHTML, style = '', modalClass = '') {
    closeModal(); // Ensure no other modals are open
    const modal = document.createElement('div');
    modal.id = 'generic-modal';
    modal.className = `modal-overlay ${modalClass}`;
    modal.innerHTML = `
        <div class="modal-content-wrapper" style="${style}">
            ${contentHTML}
        </div>
    `;
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'generic-modal') {
            closeModal();
        }
    });
    document.body.appendChild(modal);
    document.body.classList.add('modal-open');
}

/**
 * Closes any open modal.
 */
function closeModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) {
        modal.remove();
    }
    document.body.classList.remove('modal-open');
}


// --- AUTHENTICATION HANDLERS ---

/**
 * Handles user registration form submission.
 */
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

/**
 * Handles user login form submission.
 */
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = {
        email: form.loginEmail.value,
        password: form.loginPassword.value
    };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showNotification(`Welcome back, ${data.user.name}!`, 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();

        if (data.user.type === 'designer') {
            loadUserQuotes(); // Pre-load quotes to know which jobs are already quoted
        }
    } catch (error) {
        // Error is already shown by apiCall
    }
}

/**
 * Logs the user out, clears state and localStorage.
 */
function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.estimations = [];
    appState.currentEstimation = null;
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out.', 'info');
}


// --- ESTIMATION TOOL FUNCTIONS ---

// (All functions from fetchAndRenderEstimationTool to shareEstimation are included here)
// ... The full block of estimation tool JS as provided in the previous context ...
// For brevity in this example, I'm collapsing this section. 
// The full code for the estimation tool should be pasted here.
async function fetchAndRenderEstimationTool() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> Cost Estimation Tool</h2>
                <p class="header-subtitle">Upload engineering drawings to get accurate steel structure cost estimates</p>
            </div>
        </div>
        <div class="estimation-tool-container">
            <div class="upload-section modern-card">
                <div class="file-upload-area" id="file-upload-area">
                    <div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                    <h3>Upload Your Engineering Drawing</h3>
                    <p>Drag and drop a PDF file here, or click to select</p>
                    <p class="file-requirements">Supported formats: PDF • Max size: 15MB</p>
                    <input type="file" id="file-upload-input" accept=".pdf" style="display: none;">
                </div>
                <div id="file-info-container" style="display: none;">
                    <div id="file-info">
                        <i class="fas fa-file-pdf"></i>
                        <span id="file-name"></span>
                        <small id="file-size"></small>
                    </div>
                    <button type="button" id="remove-file-btn" class="btn btn-outline btn-sm"><i class="fas fa-times"></i> Remove</button>
                </div>
                <div class="project-details-section" id="project-details-section" style="display: none;">
                    <h4><i class="fas fa-info-circle"></i> Project Details</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Project Name</label>
                            <input type="text" id="project-name-input" class="form-input" placeholder="Enter project name" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Location</label>
                            <input type="text" id="project-location-input" class="form-input" placeholder="e.g., Sydney, NSW" value="Sydney" required>
                        </div>
                    </div>
                    <button type="button" id="generate-estimation-btn" class="btn btn-primary btn-large"><i class="fas fa-calculator"></i> Generate Cost Estimation</button>
                </div>
            </div>
            <div id="estimation-results-section" style="display: none;"></div>
            <div id="my-estimations-section">
                <div class="section-header">
                    <h3><i class="fas fa-history"></i> My Previous Estimations</h3>
                </div>
                <div id="estimations-list"><div class="loading-spinner"><div class="spinner"></div></div></div>
            </div>
        </div>
    `;
    initializeEstimationTool();
    loadUserEstimations();
}

function initializeEstimationTool() {
    const fileUploadArea = document.getElementById('file-upload-area');
    const fileUploadInput = document.getElementById('file-upload-input');
    const generateBtn = document.getElementById('generate-estimation-btn');
    const removeFileBtn = document.getElementById('remove-file-btn');

    fileUploadArea.addEventListener('click', () => fileUploadInput.click());
    fileUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); fileUploadArea.classList.add('drag-over'); });
    fileUploadArea.addEventListener('dragleave', () => fileUploadArea.classList.remove('drag-over'));
    fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFileSelection(e.dataTransfer.files[0]);
    });
    fileUploadInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFileSelection(e.target.files[0]); });
    removeFileBtn.addEventListener('click', clearFileSelection);
    generateBtn.addEventListener('click', generateEstimation);
}

function handleFileSelection(file) {
    if (!file.type.includes('pdf')) {
        showNotification('Please select a PDF file.', 'error');
        return;
    }
    if (file.size > 15 * 1024 * 1024) { // 15MB
        showNotification('File size must be less than 15MB.', 'error');
        return;
    }
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-size').textContent = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    document.getElementById('file-info-container').style.display = 'flex';
    document.getElementById('project-details-section').style.display = 'block';
    document.getElementById('file-upload-input').selectedFile = file;
}

function clearFileSelection() {
    document.getElementById('file-upload-input').value = '';
    document.getElementById('file-upload-input').selectedFile = null;
    document.getElementById('file-info-container').style.display = 'none';
    document.getElementById('project-details-section').style.display = 'none';
}

async function generateEstimation() {
    const generateBtn = document.getElementById('generate-estimation-btn');
    const originalText = generateBtn.innerHTML;
    const fileInput = document.getElementById('file-upload-input');
    const projectName = document.getElementById('project-name-input').value.trim();
    const location = document.getElementById('project-location-input').value.trim();

    if (!fileInput.selectedFile || !projectName || !location) {
        showNotification('Please upload a file and fill in all project details.', 'error');
        return;
    }

    generateBtn.innerHTML = '<div class="btn-spinner"></div> Generating...';
    generateBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('drawing', fileInput.selectedFile);
        formData.append('projectName', projectName);
        formData.append('location', location);
        formData.append('userId', appState.currentUser.id);

        showNotification('Processing your drawing... This may take a moment.', 'info');
        const response = await apiCall('/estimation/generate-from-upload', 'POST', formData);
        if (response.success) {
            displayEstimationResults(response);
            loadUserEstimations();
            showNotification('Cost estimation generated successfully!', 'success');
        }
    } catch (error) {
        console.error('Estimation generation failed:', error);
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

function displayEstimationResults(response) {
    const resultsSection = document.getElementById('estimation-results-section');
    const estData = response.estimationData;
    resultsSection.innerHTML = `
        <div class="estimation-report modern-card">
            <div class="report-header"><h3><i class="fas fa-file-invoice-dollar"></i> Cost Estimation Report</h3></div>
            <div class="report-summary">
                <div class="summary-item">
                    <div class="label">Total Cost (Inc. GST)</div>
                    <div class="value total">$${estData.cost_summary?.total_inc_gst?.toLocaleString() || 'N/A'}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Materials Cost</div>
                    <div class="value">$${estData.cost_summary?.materials_total?.toLocaleString() || 'N/A'}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Labor Cost</div>
                    <div class="value">$${estData.cost_summary?.labor_total?.toLocaleString() || 'N/A'}</div>
                </div>
            </div>
            <div class="report-details">
                <h4><i class="fas fa-list"></i> Cost Breakdown</h4>
                <table class="report-table">
                    <thead><tr><th>Item</th><th>Quantity</th><th>Unit</th><th class="currency">Rate</th><th class="currency">Amount</th></tr></thead>
                    <tbody>${generateCostBreakdownRows(estData)}</tbody>
                </table>
            </div>
            <div class="report-actions">
                <button class="btn btn-primary" onclick="downloadReport('${response.projectId}', 'pdf')"><i class="fas fa-download"></i> Download PDF</button>
            </div>
        </div>
    `;
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function generateCostBreakdownRows(estData) {
    let rows = '';
    const breakdown = estData.detailed_breakdown;
    if (breakdown?.steel_sections) {
        Object.entries(breakdown.steel_sections).forEach(([section, data]) => {
            rows += `<tr><td>${section}</td><td>${data.total_length || 1}</td><td>${data.unit || 'm'}</td><td class="currency">$${data.rate_per_unit?.toLocaleString() || 0}</td><td class="currency">$${data.total_cost?.toLocaleString() || 0}</td></tr>`;
        });
    }
    if (breakdown?.labour_breakdown) {
         Object.entries(breakdown.labour_breakdown).forEach(([task, data]) => {
            rows += `<tr><td>${task.replace(/_/g, ' ')}</td><td>${data.hours || 1}</td><td>hrs</td><td class="currency">$${data.rate_per_hour?.toLocaleString() || 0}</td><td class="currency">$${data.total_cost?.toLocaleString() || 0}</td></tr>`;
        });
    }
    if (!rows) return '<tr><td colspan="5">No detailed breakdown available.</td></tr>';
    return rows;
}

async function loadUserEstimations() {
    const list = document.getElementById('estimations-list');
    try {
        const response = await apiCall(`/estimation/user/${appState.currentUser.id}`, 'GET');
        const estimations = response.data || [];
        appState.estimations = estimations;
        if (estimations.length === 0) {
            list.innerHTML = `<div class="empty-state"><h4>No estimations yet.</h4><p>Upload a drawing to get started.</p></div>`;
            return;
        }
        list.innerHTML = estimations.map(est => `
            <div class="estimation-card modern-card" onclick="viewEstimationDetails('${est._id}')">
                <div class="estimation-header">
                    <div class="estimation-info">
                        <h4>${est.projectName}</h4>
                        <p><i class="fas fa-map-marker-alt"></i> ${est.projectLocation}</p>
                    </div>
                    <div class="estimation-cost">
                        <span class="cost-value">$${est.estimationData?.cost_summary?.total_inc_gst?.toLocaleString() || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = `<div class="error-state"><h4>Error loading estimations.</h4></div>`;
    }
}

async function viewEstimationDetails(estimationId) {
    try {
        const response = await apiCall(`/estimation/${estimationId}`, 'GET');
        displayEstimationResults({
            success: true,
            projectId: estimationId,
            estimationData: response.estimationData,
        });
    } catch (error) {}
}

async function downloadReport(estimationId, format = 'pdf') {
     try {
        showNotification(`Preparing ${format.toUpperCase()} report...`, 'info');
        const response = await fetch(`${BACKEND_URL}/estimation/${estimationId}/report?format=${format}`, {
            headers: { 'Authorization': `Bearer ${appState.jwtToken}` }
        });
        if (!response.ok) throw new Error(`Failed to generate report`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `estimation-report-${estimationId}.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (error) {
        showNotification(`Failed to download report.`, 'error');
    }
}



// --- JOB & QUOTE FUNCTIONS ---

// (All functions from fetchAndRenderJobs to handleQuoteSubmit are included here)
// ... The full block of job and quote JS as provided in the previous context ...
// For brevity in this example, I'm collapsing this section.
// The full code for jobs and quotes should be pasted here.
async function fetchAndRenderJobs() {
    // This is the combined function for both clients and designers
    const container = document.getElementById('app-container');
    const userType = appState.currentUser.type;
    const isDesigner = userType === 'designer';

    // Setup the main container HTML
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-${isDesigner ? 'briefcase' : 'list-alt'}"></i> ${isDesigner ? 'Browse Projects' : 'My Projects'}</h2>
                <p class="header-subtitle">${isDesigner ? 'Find your next opportunity and submit a quote' : 'Manage your posted projects and view quotes'}</p>
            </div>
             ${!isDesigner ? '<button class="btn btn-primary" onclick="renderAppSection(\'post-job\')"><i class="fas fa-plus"></i> Post a Project</button>' : ''}
        </div>
        <div id="jobs-list" class="jobs-grid"></div>
        <div id="load-more-container" class="load-more-container"></div>
    `;

    const jobsListContainer = document.getElementById('jobs-list');
    jobsListContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    
    const endpoint = isDesigner ? `/jobs?page=1&limit=9` : `/jobs/user/${appState.currentUser.id}`;

    try {
        const response = await apiCall(endpoint, 'GET');
        const jobs = response.data || [];
        appState.jobs = jobs;

        if (jobs.length === 0) {
            jobsListContainer.innerHTML = isDesigner
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects yet.</h3><p>Click "Post a Project" to get started.</p></div>`;
            return;
        }

        jobsListContainer.innerHTML = jobs.map(job => renderJobCard(job)).join('');
        
    } catch (error) {
        jobsListContainer.innerHTML = `<div class="error-state"><h3>Error Loading Projects</h3><p>Please try again later.</p></div>`;
    }
}

function renderJobCard(job) {
    const isDesigner = appState.currentUser.type === 'designer';
    const hasQuoted = appState.userSubmittedQuotes.has(job.id);

    let actionButton = '';
    if (isDesigner) {
        if (job.status === 'open') {
            actionButton = hasQuoted
                ? `<button class="btn btn-outline" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`;
        } else {
             actionButton = `<span class="job-status-badge assigned"><i class="fas fa-lock"></i> Assigned</span>`;
        }
    } else { // Client view
        actionButton = `
            <button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button>
            <button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i></button>
        `;
    }

    return `
        <div class="job-card modern-card">
            <div class="job-header">
                <h3 class="job-title">${job.title}</h3>
                <span class="budget-amount">${job.budget}</span>
            </div>
            <p class="job-description">${job.description.substring(0, 120)}...</p>
            <div class="job-meta">
                <span><i class="fas fa-calendar-alt"></i> Deadline: ${new Date(job.deadline).toLocaleDateString()}</span>
            </div>
            <div class="job-actions">${actionButton}</div>
        </div>
    `;
}

function renderPostJobForm() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <h2><i class="fas fa-plus-circle"></i> Post a New Project</h2>
            <p>Describe your project to attract the best talent.</p>
        </div>
        <form id="post-job-form" class="modern-form post-job-layout">
            <div class="form-group">
                <label>Project Title</label>
                <input type="text" name="title" class="form-input" required>
            </div>
            <div class="form-group">
                <label>Project Description</label>
                <textarea name="description" class="form-textarea" rows="6" required></textarea>
            </div>
            <div class="form-group">
                <label>Budget ($)</label>
                <input type="text" name="budget" class="form-input" required placeholder="e.g., $5,000 - $10,000 or Fixed Price $7,500">
            </div>
            <div class="form-group">
                <label>Deadline</label>
                <input type="date" name="deadline" class="form-input" required>
            </div>
            <div class="form-actions">
                 <button type="submit" class="btn btn-primary btn-large">Post Project</button>
            </div>
        </form>
    `;
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
}

// All other job and quote functions (handlePostJob, deleteJob, viewQuotes, approveQuote, showQuoteModal, handleQuoteSubmit, fetchAndRenderMyQuotes, etc.)
// from the previous snippets would be included here to make the file truly complete.
