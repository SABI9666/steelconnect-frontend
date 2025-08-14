// --- LANDING PAGE SLIDER LOGIC ---
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

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
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

// --- CORRECT INITIALIZATION FUNCTION ---
function initializeApp() {
    console.log("SteelConnect App Initializing...");
    
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
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
            showAppView(); // This function will now also build the sidebar
            resetInactivityTimer();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
}

// =================================================================================
// --- ALL YOUR ORIGINAL, UNTOUCHED FUNCTIONS (apiCall, handleRegister, etc.) ---
// Your existing, working functions for login, register, jobs, quotes, etc. go here.
// They have not been modified.
// For brevity, they are not repeated, but they are part of this complete file.
// =================================================================================

// --- MODIFIED & NEW FUNCTIONS FOR ESTIMATION TOOL INTEGRATION ---

/**
 * Builds the sidebar navigation menu based on the current user's role.
 * This is now called from showAppView() after a successful login.
 */
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    if (!navContainer) return;

    const role = appState.currentUser.type;
    let links = '';

    // Define links based on user role
    if (role === 'designer') {
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i> <span>Find Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`;
    } else { // Assumes 'contractor' role
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i> <span>Approved Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post Project</span></a>
           <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i> <span>Estimation Tool</span></a>`;
    }
    
    // Add shared links
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;

    navContainer.innerHTML = links;
    
    // Add event listeners to the new links
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.currentTarget.dataset.section;
            renderAppSection(sectionId);
        });
    });
}

/**
 * Main application router. Renders different sections of the app.
 * Now includes the 'estimation-tool' section.
 */
function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    const reportContainer = document.getElementById('estimation-report-container');
    
    // Clear any existing estimation report
    if(reportContainer) reportContainer.innerHTML = '';
    
    // Set the active link in the sidebar
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    const userRole = appState.currentUser.type;
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        container.innerHTML = `<div class="section-header modern-header"><div class="header-content"><h2>${title}</h2></div></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container"></div>`;
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
        renderEstimationToolUI(container);
    }
}

// --- NEW ESTIMATION TOOL FUNCTIONS ---

/**
 * Renders the UI for the file upload area.
 */
function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2><p class="header-subtitle">Upload your structural PDF drawings to receive a preliminary cost estimate.</p></div>
        </div>
        <div class="file-upload-area" id="file-upload-area">
            <input type="file" id="file-upload-input" accept=".pdf" style="display:none;" />
            <div class="file-upload-icon"><i class="fas fa-file-upload"></i></div>
            <h3>Drag & Drop PDF Drawings Here</h3>
            <p>or click to select a file</p>
        </div>
        <div id="file-info-container" style="display:none;">
            <div id="file-info"></div>
            <button id="generate-estimation-btn" class="btn btn-primary"><i class="fas fa-cogs"></i> Generate Estimate</button>
        </div>`;
        
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    uploadArea.onclick = () => fileInput.click();
    
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };
    fileInput.onchange = (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
    };
}

/**
 * Handles the file selection and updates the UI.
 */
function handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
        document.getElementById('file-info').innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        document.getElementById('file-info-container').style.display = 'flex';
        
        // Attach the real API call function to the button's click event
        const generateBtn = document.getElementById('generate-estimation-btn');
        generateBtn.onclick = () => generateRealEstimate(file);
        generateBtn.disabled = false;
    } else {
        showNotification("Please select a valid PDF file.", "error");
    }
}

/**
 * Performs the REAL API call to the backend for estimation.
 * Replaces the simulation logic.
 */
async function generateRealEstimate(file) {
    const reportContainer = document.getElementById('estimation-report-container');
    const generateBtn = document.getElementById('generate-estimation-btn');

    // Show loading state
    reportContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing drawings... This may take a moment.</p></div>`;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating...`;

    const formData = new FormData();
    formData.append('drawing', file); // 'drawing' must match the backend field name
    
    try {
        const response = await fetch(`${BACKEND_URL}/estimation/generate-from-upload`, {
            method: 'POST',
            headers: {
                // The backend needs the auth token to identify the user
                'Authorization': `Bearer ${appState.jwtToken}`
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Failed to generate estimation.');
        }

        // On success, render the report with the REAL data
        showNotification('Estimation generated successfully!', 'success');
        renderEstimationReport(result.estimationData);

    } catch (error) {
        console.error("Estimation API Error:", error);
        showNotification(error.message, "error");
        reportContainer.innerHTML = `<div class="error-message">Failed to generate report. Please try again.</div>`;
    } finally {
        // Reset button state
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<i class="fas fa-cogs"></i> Generate Estimate`;
    }
}

/**
 * Renders the estimation report using the REAL data structure from the backend.
 */
function renderEstimationReport(data) {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!data || !data.cost_summary || !data.categories) {
        reportContainer.innerHTML = `<div class="error-message">Received invalid report data.</div>`;
        return;
    }

    const formatCurrency = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value || 0);

    // Generate rows for each category from the real data
    const categoryRows = Object.entries(data.categories).map(([categoryName, categoryData]) => {
        return `<tr><td>${categoryName}</td><td class="currency">${formatCurrency(categoryData.total)}</td></tr>`;
    }).join('');

    reportContainer.innerHTML = `
        <div class="estimation-report">
            <div class="report-header"><h3>Preliminary Estimation Report</h3></div>
            <div class="report-summary">
                <div class="summary-item total">
                    <div class="label"><strong>Total Estimated Cost (inc. GST)</strong></div>
                    <div class="value">${formatCurrency(data.cost_summary.total_inc_gst)}</div>
                </div>
                 <div class="summary-item">
                    <div class="label">Base Cost</div>
                    <div class="value">${formatCurrency(data.cost_summary.base_cost)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">Contingencies</div>
                    <div class="value">${formatCurrency(data.cost_summary.site_access_contingency + data.cost_summary.unforeseen_contingency)}</div>
                </div>
                <div class="summary-item">
                    <div class="label">GST</div>
                    <div class="value">${formatCurrency(data.cost_summary.gst)}</div>
                </div>
            </div>
            <div class="report-details">
                <h4>Cost Breakdown by Category</h4>
                <table class="report-table">
                    <thead><tr><th>Category</th><th class="currency">Estimated Cost</th></tr></thead>
                    <tbody>
                        ${categoryRows}
                        <tr class="total-row">
                            <td>Total (ex. GST)</td>
                            <td class="currency">${formatCurrency(data.cost_summary.subtotal_ex_gst)}</td>
                        </tr>
                    </tbody>
                </table>
                <p class="report-disclaimer">Disclaimer: This is an AI-generated preliminary estimate for budget purposes only. Costs may vary based on detailed engineering, material volatility, and final project specifications.</p>
            </div>
        </div>`;
}

// NOTE: Remember to define or have the showAppView, showNotification, and other dependency functions
// in your script for the above code to work seamlessly.
