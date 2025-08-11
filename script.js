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

// --- ALL OTHER ORIGINAL FUNCTIONS (apiCall, handleRegister, etc.) ---
// ...
// (The full script content from your original file goes here, unchanged)
// ...

// --- MODIFIED & NEW FUNCTIONS ---

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
    const reportContainer = document.getElementById('estimation-report-container');
    if(reportContainer) reportContainer.innerHTML = '';

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
function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2><p class="header-subtitle">Upload your structural PDF drawings to receive a preliminary cost estimate.</p></div>
        </div>
        <div class="file-upload-area" id="file-upload-area">
            <input type="file" id="file-upload-input" accept=".pdf" />
            <div class="file-upload-icon"><i class="fas fa-file-upload"></i></div>
            <h3>Drag & Drop PDF Drawings Here</h3>
            <p>or click to select a file</p>
        </div>
        <div id="file-info-container">
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
    reportContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing drawings... Please wait.</p></div>`;
    setTimeout(() => {
        const sampleReportData = {
            projectName: "Warehouse Extension Project", totalCost: 185340.50,
            summary: { structuralSteel: 75200.00, concrete: 45875.00, reinforcement: 24265.50, labor: 40000.00 }
        };
        renderEstimationReport(sampleReportData);
    }, 2500);
}

function renderEstimationReport(data) {
    const reportContainer = document.getElementById('estimation-report-container');
    const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    reportContainer.innerHTML = `
        <div class="estimation-report">
            <div class="report-header"><h3>Estimation Report: ${data.projectName}</h3></div>
            <div class="report-summary">
                <div class="summary-item"><div class="label">Structural Steel</div><div class="value">${formatCurrency(data.summary.structuralSteel)}</div></div>
                <div class="summary-item"><div class="label">Concrete & Formwork</div><div class="value">${formatCurrency(data.summary.concrete)}</div></div>
                <div class="summary-item"><div class="label">Reinforcement</div><div class="value">${formatCurrency(data.summary.reinforcement)}</div></div>
                <div class="summary-item"><div class="label">Estimated Labor</div><div class="value">${formatCurrency(data.summary.labor)}</div></div>
                <div class="summary-item"><div class="label"><strong>Total Estimated Cost</strong></div><div class="value total">${formatCurrency(data.totalCost)}</div></div>
            </div>
            <div class="report-details">
                <h4>Cost Breakdown</h4>
                <table class="report-table">
                    <thead><tr><th>Item</th><th class="currency">Cost</th></tr></thead>
                    <tbody>
                        <tr><td>Structural Steel Supply & Fabrication</td><td class="currency">${formatCurrency(data.summary.structuralSteel)}</td></tr>
                        <tr><td>Concrete Supply & Pouring</td><td class="currency">${formatCurrency(data.summary.concrete)}</td></tr>
                        <tr><td>Rebar & Mesh Supply</td><td class="currency">${formatCurrency(data.summary.reinforcement)}</td></tr>
                        <tr><td>Labor & Installation</td><td class="currency">${formatCurrency(data.summary.labor)}</td></tr>
                        <tr class="total-row"><td>Total</td><td class="currency">${formatCurrency(data.totalCost)}</td></tr>
                    </tbody>
                </table>
                <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">Disclaimer: This is an AI-generated preliminary estimate. Costs may vary.</p>
            </div>
        </div>`;
}
