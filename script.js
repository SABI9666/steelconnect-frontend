/* --- LANDING PAGE SLIDER LOGIC --- */
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

/* --- FULL APPLICATION SCRIPT --- */
document.addEventListener('DOMContentLoaded', initializeApp);

/* --- CONSTANTS & STATE --- */
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
    userSubmittedQuotes: new Set(),
};

/* --- INACTIVITY TIMER FOR AUTO-LOGOUT --- */
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 300000); // 5 minutes
}

/* --- INITIALIZATION --- */
function initializeApp() {
    console.log("SteelConnect App Initializing...");

    if (!document.getElementById('alerts-container')) {
        const alertsContainer = document.createElement('div');
        alertsContainer.id = 'alerts-container';
        document.body.appendChild(alertsContainer);
    }

    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

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
                renderAppSection('jobs');
            } else {
                showLandingPageView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }

    const logoutBtn = document.getElementById('logout-button');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
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
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
}

/* --- ================================== --- */
/* --- AUTHENTICATION & API LOGIC (RESTORED) --- */
/* --- ================================== --- */

/**
 * A centralized function for making API calls to the backend.
 * @param {string} endpoint - The API endpoint to call (e.g., '/auth/login').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {object|null} body - The request body for POST/PUT requests.
 * @param {string|null} successMessage - A message to show on successful API call.
 * @returns {Promise<any>} - The JSON response from the server.
 */
async function apiCall(endpoint, method = 'GET', body = null, successMessage = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (appState.jwtToken) {
        options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
    }

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'An unknown error occurred.');
        }

        if (successMessage) {
            showNotification(successMessage, 'success');
        }
        return data;
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

/**
 * Handles the user registration form submission.
 * @param {Event} event - The form submission event.
 */
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.elements.name.value;
    const email = form.elements.email.value;
    const password = form.elements.password.value;
    const type = form.elements.type.value;

    try {
        await apiCall('/auth/register', 'POST', { name, email, password, type }, 'Registration successful! Please log in.');
        showAuthModal('login'); // Switch to login modal after successful registration
    } catch (error) {
        console.error('Registration failed:', error);
    }
}

/**
 * Handles the user login form submission.
 * @param {Event} event - The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.elements.email.value;
    const password = form.elements.password.value;

    try {
        const data = await apiCall('/auth/login', 'POST', { email, password });
        appState.jwtToken = data.token;
        appState.currentUser = data.user;

        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        closeModal();
        showAppView();
        resetInactivityTimer();
        showNotification('Login successful!', 'success');
    } catch (error) {
        console.error('Login failed:', error);
    }
}

/**
 * Logs the user out, clears session data, and returns to the landing page.
 */
function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('currentUser');
    appState.jwtToken = null;
    appState.currentUser = null;
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out.', 'info');
}


/* --- ================================== --- */
/* --- UI & VIEW MANAGEMENT (RESTORED) --- */
/* --- ================================== --- */

/**
 * Displays the main application view for logged-in users.
 */
function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    
    const user = appState.currentUser;
    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userType').textContent = user.type;
        document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
        document.getElementById('sidebarUserName').textContent = user.name;
        document.getElementById('sidebarUserType').textContent = user.type;
        document.getElementById('sidebarUserAvatar').textContent = user.name.charAt(0).toUpperCase();
    }
    
    buildSidebarNav();
    renderAppSection('jobs'); // Default to jobs view
}

/**
 * Displays the landing page for logged-out users.
 */
function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
}

/**
 * Creates and displays the authentication modal (login or register).
 * @param {string} type - The type of modal to show ('login' or 'register').
 */
function showAuthModal(type) {
    const modalContainer = document.getElementById('modal-container');
    const isRegister = type === 'register';

    const modalHTML = `
        <div class="modal-overlay" id="auth-modal-overlay">
            <div class="modal-content">
                <button class="modal-close-button" onclick="closeModal()">&times;</button>
                <h2>${isRegister ? 'Create Your Account' : 'Welcome Back'}</h2>
                <form id="auth-form" class="form-grid">
                    ${isRegister ? `
                        <div class="form-group">
                            <label for="name" class="form-label">Full Name</label>
                            <input type="text" id="name" name="name" class="form-input" required>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label for="email" class="form-label">Email</label>
                        <input type="email" id="email" name="email" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" id="password" name="password" class="form-input" required>
                    </div>
                    ${isRegister ? `
                        <div class="form-group">
                            <label for="type" class="form-label">I am a...</label>
                            <select id="type" name="type" class="form-select">
                                <option value="contractor">Contractor</option>
                                <option value="designer">Designer/Engineer</option>
                            </select>
                        </div>
                    ` : ''}
                    <button type="submit" class="btn btn-primary">${isRegister ? 'Register' : 'Sign In'}</button>
                </form>
                <div class="modal-switch">
                    ${isRegister ? `Already have an account? <a onclick="showAuthModal('login')">Sign In</a>` : `Don't have an account? <a onclick="showAuthModal('register')">Join Now</a>`}
                </div>
            </div>
        </div>
    `;
    modalContainer.innerHTML = modalHTML;
    document.getElementById('auth-form').addEventListener('submit', isRegister ? handleRegister : handleLogin);
}

/**
 * Closes any open modal.
 */
function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = '';
}


/* --- ================================== --- */
/* --- ESTIMATION TOOL & OTHER FEATURES --- */
/* --- ================================== --- */

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser ? appState.currentUser.type : 'contractor';
    let links = '';

    if (role === 'designer') {
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i> <span>Find Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`;
    } else { // Contractor View
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i> <span>Approved Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post Project</span></a>
           <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i> <span>Estimation Tool</span></a>`;
    }

    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;

    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            renderAppSection(section);
            navContainer.querySelectorAll('.sidebar-nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}


function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    const reportContainer = document.getElementById('estimation-report-container');

    container.innerHTML = '';
    if (reportContainer) reportContainer.innerHTML = '';

    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    if (sectionId === 'estimation-tool') {
        renderEstimationToolUI(container);
    } else {
        if(reportContainer) reportContainer.style.display = 'none';
        
        if (sectionId === 'jobs') {
            container.innerHTML = '<h2>Loading Projects...</h2>'; // Placeholder
        } else if (sectionId === 'post-job') {
             container.innerHTML = '<h2>Post a New Project</h2>'; // Placeholder
        } else if (sectionId === 'my-quotes') {
            container.innerHTML = '<h2>Loading My Quotes...</h2>'; // Placeholder
        } else if (sectionId === 'approved-jobs') {
            container.innerHTML = '<h2>Loading Approved Projects...</h2>'; // Placeholder
        } else if (sectionId === 'messages') {
            container.innerHTML = '<h2>Loading Messages...</h2>'; // Placeholder
        }
    }
}

function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2>
            <p>Provide project details and upload your drawings for a preliminary cost estimate.</p>
        </div>

        <form id="estimation-form" class="estimation-form">
            <div class="form-grid-2-col">
                <div class="form-group">
                    <label for="project-name" class="form-label">Project Name</label>
                    <input type="text" id="project-name" class="form-input" placeholder="e.g., Downtown Office Building" required>
                </div>
                <div class="form-group">
                    <label for="project-location" class="form-label">Project Location</label>
                    <input type="text" id="project-location" class="form-input" placeholder="e.g., New York, NY" required>
                </div>
            </div>
            <div class="form-group">
                <label for="project-details" class="form-label">Project Details</label>
                <textarea id="project-details" class="form-textarea" rows="4" placeholder="Provide a brief description of the project, scope of work, and any specific requirements."></textarea>
            </div>
            
            <div class="form-group">
                 <label class="form-label">Upload PDF Drawings</label>
                <div class="file-upload-area" id="file-upload-area">
                    <input type="file" id="file-upload-input" accept=".pdf" required/>
                    <div class="file-upload-icon"><i class="fas fa-file-upload"></i></div>
                    <h3 id="upload-text-header">Drag & Drop PDF Drawings Here</h3>
                    <p id="upload-text-sub">or click to select a file</p>
                </div>
            </div>

            <button type="submit" id="generate-estimation-btn" class="btn btn-primary btn-full-width">
                <i class="fas fa-cogs"></i> Generate Estimate
            </button>
        </form>`;
    
    const reportContainer = document.getElementById('estimation-report-container');
    if (reportContainer) {
        reportContainer.style.display = 'block';
        reportContainer.innerHTML = '';
    }

    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    const estimationForm = document.getElementById('estimation-form');

    uploadArea.onclick = () => fileInput.click();
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileDisplay(fileInput.files[0]);
        }
    };
    fileInput.onchange = (e) => {
        if (e.target.files.length) handleFileDisplay(e.target.files[0]);
    };

    estimationForm.onsubmit = (e) => {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value;
        if (fileInput.files.length > 0 && projectName) {
            simulateEstimationProcess(projectName);
        } else if (!projectName) {
             showNotification("Please enter a project name.", "error");
        } 
        else {
            showNotification("Please select a PDF file to upload.", "error");
        }
    };
}

function handleFileDisplay(file) {
    const uploadTextHeader = document.getElementById('upload-text-header');
    const uploadTextSub = document.getElementById('upload-text-sub');
    if (file && file.type === "application/pdf") {
        uploadTextHeader.innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        uploadTextSub.textContent = `File size: ${(file.size / 1024).toFixed(2)} KB. Click to change file.`;
    } else {
        showNotification("Please select a valid PDF file.", "error");
        uploadTextHeader.innerHTML = `Drag & Drop PDF Drawings Here`;
        uploadTextSub.textContent = `or click to select a file`;
    }
}

function simulateEstimationProcess(projectName) {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!reportContainer) return;
    
    reportContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing drawings... Please wait.</p></div>`;

    setTimeout(() => {
        const sampleReportData = {
            projectName: projectName || "Warehouse Extension Project",
            totalCost: 185340.50,
            summary: {
                structuralSteel: 75200.00,
                concrete: 45875.00,
                reinforcement: 24265.50,
                labor: 40000.00,
            }
        };
        renderEstimationReport(sampleReportData);
    }, 2500);
}

function renderEstimationReport(data) {
    const reportContainer = document.getElementById('estimation-report-container');
     if (!reportContainer) return;

    const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

    reportContainer.innerHTML = `
        <div class="estimation-report">
            <div class="report-header">
                <h3>Estimation Report: ${data.projectName}</h3>
            </div>
            <div class="report-summary">
                <div class="summary-item">
                    <div class="label">Structural Steel</div>
                    <div class="value">${formatCurrency(data.summary.structuralSteel)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Concrete & Formwork</div>
                    <div class="value">${formatCurrency(data.summary.concrete)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Reinforcement (Rebar)</div>
                    <div class="value">${formatCurrency(data.summary.reinforcement)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Estimated Labor</div>
                    <div class="value">${formatCurrency(data.summary.labor)}</div>
                </div>
            </div>
             <div class="report-total">
                <div class="label">Total Estimated Cost</div>
                <div class="value">${formatCurrency(data.totalCost)}</div>
            </div>
            <div class="report-details">
                <h4>Detailed Cost Breakdown</h4>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="currency">Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Structural Steel Supply & Fabrication</td>
                            <td class="currency">${formatCurrency(data.summary.structuralSteel)}</td>
                        </tr>
                        <tr>
                            <td>Concrete Supply & Pouring</td>
                            <td class="currency">${formatCurrency(data.summary.concrete)}</td>
                        </tr>
                        <tr>
                            <td>Rebar & Mesh Supply</td>
                            <td class="currency">${formatCurrency(data.summary.reinforcement)}</td>
                        </tr>
                        <tr>
                            <td>Labor & Installation</td>
                            <td class="currency">${formatCurrency(data.summary.labor)}</td>
                        </tr>
                        <tr class="total-row">
                            <td>Total</td>
                            <td class="currency">${formatCurrency(data.totalCost)}</td>
                        </tr>
                    </tbody>
                </table>
                <p class="disclaimer">Disclaimer: This is an AI-generated preliminary estimate. Costs may vary and should be confirmed with detailed quotes.</p>
            </div>
        </div>`;
}

function showNotification(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    alertsContainer.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 500);
    }, 5000);
}

