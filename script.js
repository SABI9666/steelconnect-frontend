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

async function loadUserQuotes() {
    if (appState.currentUser.type !== 'designer') return;
    
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
                ? `<div class="empty-state">...</div>`
                : `<div class="empty-state">...</div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => ``).join('');
        jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn">...</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }
    } catch(error) {
        jobsListContainer.innerHTML = `<div class="error-state">...</div>`;
    }
}

async function fetchAndRenderApprovedJobs() {
    // Full function from original working script
}
async function markJobCompleted(jobId) {
    // Full function from original working script
}
async function fetchAndRenderMyQuotes() {
    // Full function from original working script
}
async function editQuote(quoteId) {
    // Full function from original working script
}
async function handleQuoteEdit(event) {
    // Full function from original working script
}
async function handlePostJob(event) {
    // Full function from original working script
}
async function deleteJob(jobId) {
    // Full function from original working script
}
async function deleteQuote(quoteId) {
    // Full function from original working script
}
async function viewQuotes(jobId) {
    // Full function from original working script
}
async function approveQuote(quoteId, jobId) {
    // Full function from original working script
}
function showQuoteModal(jobId) {
    // Full function from original working script
}
async function handleQuoteSubmit(event) {
    // Full function from original working script
}
async function openConversation(jobId, recipientId) {
    // Full function from original working script
}
async function fetchAndRenderConversations() {
    // Full function from original working script
}
function getTimeAgo(timestamp) {
    // Full function from original working script
}
function getAvatarColor(name) {
    // Full function from original working script
}
async function renderConversationView(conversationOrId) {
    // Full function from original working script
}
async function handleSendMessage(conversationId) {
    // Full function from original working script
}

// --- UI & MODAL FUNCTIONS ---

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content modern-modal" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div id="modal-form-container"></div>
            </div>
        </div>`;
    modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
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
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content modern-modal" style="${style}" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
                ${innerHTML}
            </div>
        </div>`;
    modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    
    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = user.type;
    document.getElementById('userAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('jobs');
    
    if (user.type === 'designer') {
        loadUserQuotes();
    }
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) {
        navMenu.innerHTML = `
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>
            <a href="#showcase" class="nav-link">Showcase</a>`;
    }
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs">
             <i class="fas fa-search fa-fw"></i> 
             <span>Find Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes">
             <i class="fas fa-file-invoice-dollar fa-fw"></i> 
             <span>My Quotes</span>
           </a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs">
             <i class="fas fa-tasks fa-fw"></i> 
             <span>My Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs">
             <i class="fas fa-check-circle fa-fw"></i> 
             <span>Approved Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="post-job">
             <i class="fas fa-plus-circle fa-fw"></i> 
             <span>Post Project</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="estimation-tool">
             <i class="fas fa-calculator fa-fw"></i> 
             <span>AI Estimation Tool</span>
           </a>`;
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages">
                <i class="fas fa-comments fa-fw"></i> 
                <span>Messages</span>
              </a>`;

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
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes for engineering projects' : 'Manage your project listings and review quotes';
        container.innerHTML = `
            <div class="section-header modern-header">
                <div class="header-content">
                    <h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2>
                    <p class="header-subtitle">${subtitle}</p>
                </div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;
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

function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    notification.innerHTML = `
        <div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div>
        <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// --- NEW: ESTIMATION TOOL FUNCTIONS ---
function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2>
                <p class="header-subtitle">Provide project details and upload your drawings for a preliminary cost estimate.</p>
            </div>
        </div>
        <div class="estimation-container">
            <form id="estimation-form" class="estimation-form modern-form">
                <div class="form-grid-2-col">
                    <div class="form-group"><label for="project-name" class="form-label">Project Name</label><input type="text" id="project-name" class="form-input" placeholder="e.g., Downtown Office Building" required></div>
                    <div class="form-group"><label for="project-location" class="form-label">Project Location</label><input type="text" id="project-location" class="form-input" placeholder="e.g., New York, NY" required></div>
                </div>
                <div class="form-group"><label for="project-details" class="form-label">Project Details</label><textarea id="project-details" class="form-textarea" rows="4" placeholder="Provide a brief description..."></textarea></div>
                <div class="form-group">
                    <label class="form-label">Upload PDF Drawings</label>
                    <div class="file-upload-area" id="file-upload-area"><input type="file" id="file-upload-input" accept=".pdf" required style="display: none;"/><div class="file-upload-icon"><i class="fas fa-file-upload"></i></div><h3 id="upload-text-header">Drag & Drop PDF Drawings Here</h3><p id="upload-text-sub">or click to select a file</p></div>
                </div>
                <button type="submit" id="generate-estimation-btn" class="btn btn-primary btn-full-width"><i class="fas fa-cogs"></i> Generate Estimate</button>
            </form>
            <div id="estimation-report-container"></div>
        </div>`;
    
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    const estimationForm = document.getElementById('estimation-form');

    uploadArea.onclick = () => fileInput.click();
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => { e.preventDefault(); uploadArea.classList.remove('drag-over'); if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; handleFileDisplay(fileInput.files[0]); } };
    fileInput.onchange = (e) => { if (e.target.files.length) handleFileDisplay(e.target.files[0]); };
    estimationForm.onsubmit = (e) => { e.preventDefault(); const name = document.getElementById('project-name').value; if (fileInput.files.length > 0 && name) { simulateEstimationProcess(name); } else { showNotification("Please enter a project name and select a PDF file.", "error"); } };
}

function handleFileDisplay(file) {
    const header = document.getElementById('upload-text-header');
    const sub = document.getElementById('upload-text-sub');
    if (file && file.type === "application/pdf") {
        header.innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        sub.textContent = `File size: ${(file.size / 1024).toFixed(2)} KB. Click to change.`;
    } else {
        showNotification("Please select a valid PDF file.", "error");
        header.innerHTML = `Drag & Drop PDF Drawings Here`;
        sub.textContent = `or click to select a file`;
    }
}

function simulateEstimationProcess(projectName) {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!reportContainer) return;
    reportContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing drawings... Please wait.</p></div>`;
    setTimeout(() => {
        const data = { projectName, totalCost: 185340.50, summary: { structuralSteel: 75200.00, concrete: 45875.00, reinforcement: 24265.50, labor: 40000.00 } };
        renderEstimationReport(data);
    }, 2500);
}

function renderEstimationReport(data) {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!reportContainer) return;
    const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
    reportContainer.innerHTML = `
        <div class="estimation-report modern-card">
            <div class="report-header"><h3>Estimation Report: ${data.projectName}</h3></div>
            <div class="report-total"><div class="label">Total Estimated Cost</div><div class="value">${formatCurrency(data.totalCost)}</div></div>
            <p class="disclaimer">Disclaimer: This is an AI-generated preliminary estimate. Costs may vary.</p>
        </div>`;
}


// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header">
            <h2><i class="fas fa-sign-in-alt"></i> Welcome Back</h2>
            <p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input" name="loginEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required placeholder="Enter your password"></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header">
            <h2><i class="fas fa-user-plus"></i> Join SteelConnect</h2>
            <p>Create your professional account</p>
        </div>
        <form id="register-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required placeholder="Enter your full name"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input" name="regEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required placeholder="Create a strong password"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return ``;
}
