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

/* --- INITIALIZATION & CORE APP FLOW --- */
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

/* --- API & AUTHENTICATION --- */
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

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showNotification('Welcome back to SteelConnect!', 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
        
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
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

/* --- DATA FETCHING & RENDERING (JOBS, QUOTES, etc.) --- */
// All your existing functions like fetchAndRenderJobs, fetchAndRenderMyQuotes, etc., remain here unchanged.

async function loadUserQuotes() {
    // ... existing implementation
}

async function fetchAndRenderJobs(loadMore = false) {
    // ... existing implementation
}

async function fetchAndRenderApprovedJobs() {
    // ... existing implementation
}

// ... and all other feature functions ...


/* --- VIEW & UI MANAGEMENT --- */
function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    
    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = user.type;
    document.getElementById('userAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('jobs'); // Default to jobs view on login
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
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
            renderAppSection(link.dataset.section);
        });
    });
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    const reportContainer = document.getElementById('estimation-report-container'); // Check for this new container
    if(reportContainer) reportContainer.innerHTML = ''; // Clear report on any section change

    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    if (sectionId === 'estimation-tool') {
        renderEstimationToolUI(container);
    } else {
        // Logic for all your other sections (jobs, quotes, etc.)
        // This part remains unchanged
        if (sectionId === 'jobs') { /* ... existing jobs logic ... */ }
        else if (sectionId === 'post-job') { /* ... existing post-job logic ... */ }
        // ... and so on
    }
}

/* --- MODALS & NOTIFICATIONS --- */
// All existing modal and notification functions (showAuthModal, showNotification, etc.) remain here unchanged.

/* --- NEW FEATURE: ESTIMATION TOOL --- */
function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2>
        </div>
        <div class="file-upload-area" id="file-upload-area">
            <input type="file" id="file-upload-input" accept=".pdf" />
            <div class="file-upload-icon"><i class="fas fa-file-upload"></i></div>
            <h3>Drag & Drop PDF Drawings Here</h3>
            <p>or click to select a file</p>
        </div>
        <div id="file-info-container" style="display:none; margin-top: 24px; background: var(--bg-white); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; align-items: center; justify-content: space-between;">
            <div id="file-info" style="font-weight: 500; color: var(--secondary-color); display: flex; align-items: center; gap: 8px;"></div>
            <button id="generate-estimation-btn" class="btn btn-primary" style="padding: 10px 20px; font-size: 15px;">
                <i class="fas fa-cogs"></i> Generate Estimate
            </button>
        </div>`;

    // Connect to the new HTML elements
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    uploadArea.onclick = () => fileInput.click();
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0]);
    };
    fileInput.onchange = (e) => {
        if (e.target.files.length) handleFileSelect(e.target.files[0]);
    };
}

function handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
        document.getElementById('file-info').innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        document.getElementById('file-info-container').style.display = 'flex';
        document.getElementById('generate-estimation-btn').onclick = simulateEstimationProcess;
    } else {
        showNotification("Please select a valid PDF file.", "error");
    }
}

function simulateEstimationProcess() {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!reportContainer) return;

    reportContainer.innerHTML = `<div style="text-align: center; padding: 40px; color: var(--text-gray);"><div class="spinner" style="margin: 0 auto 16px;"></div><p>AI is analyzing drawings... Please wait.</p></div>`;

    // Simulate a delay for the backend analysis
    setTimeout(() => {
        const sampleReportData = {
            projectName: "Warehouse Extension Project",
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
        <div class="job-card" style="margin-top:2rem;">
            <div class="job-header">
                 <h3>Estimation Report: ${data.projectName}</h3>
                 <div class="job-budget">${formatCurrency(data.totalCost)}</div>
            </div>
            <h4>Cost Breakdown</h4>
            <table style="width:100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <th style="padding: 8px; text-align:left; color: var(--text-gray);">Item</th>
                        <th style="padding: 8px; text-align:right; color: var(--text-gray);">Cost</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 8px;">Structural Steel Supply & Fabrication</td><td style="padding: 8px; text-align:right;">${formatCurrency(data.summary.structuralSteel)}</td></tr>
                    <tr><td style="padding: 8px;">Concrete Supply & Pouring</td><td style="padding: 8px; text-align:right;">${formatCurrency(data.summary.concrete)}</td></tr>
                    <tr><td style="padding: 8px;">Rebar & Mesh Supply</td><td style="padding: 8px; text-align:right;">${formatCurrency(data.summary.reinforcement)}</td></tr>
                    <tr><td style="padding: 8px;">Labor & Installation</td><td style="padding: 8px; text-align:right;">${formatCurrency(data.summary.labor)}</td></tr>
                    <tr style="border-top: 2px solid var(--text-dark); font-weight: bold;"><td style="padding: 8px;">Total Estimated Cost</td><td style="padding: 8px; text-align:right;">${formatCurrency(data.totalCost)}</td></tr>
                </tbody>
            </table>
            <p style="font-size: 12px; color: var(--text-gray); text-align: center; margin-top: 20px;">
                Disclaimer: This is an AI-generated preliminary estimate and may vary.
            </p>
        </div>`;
}

// Dummy/Placeholder functions for original features to ensure no errors
function showNotification(msg, type) { console.log(`[${type.toUpperCase()}] Notification: ${msg}`); }
function closeModal() { /* ... existing implementation ... */ }
function showAuthModal(view) { /* ... existing implementation ... */ }
function renderAuthForm(view) { /* ... existing implementation ... */ }
function getPostJobTemplate() { return '<div>Post Job Form Placeholder</div>'; }
function handlePostJob(e) { e.preventDefault(); }
function fetchAndRenderMyQuotes() { /* ... existing implementation ... */ }
function fetchAndRenderApprovedJobs() { /* ... existing implementation ... */ }
function fetchAndRenderConversations() { /* ... existing implementation ... */ }
// NOTE: You would have the full implementation for the functions above in your actual file.
