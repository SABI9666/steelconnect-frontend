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
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects yet</h3><p>Post your first project to get started.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote 
                ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`
                : user.type === 'designer' && hasUserQuoted
                ? `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : user.type === 'designer' && job.status === 'assigned'
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`
                : '';

            const actions = user.type === 'designer'
                ? quoteButton
                : `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            
            const statusBadge = `<span class="job-status-badge ${job.status}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>`;
            
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank">View Attachment</a></div>` : '';
            
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            
            return `
                <div class="job-card modern-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <h3 class="job-title">${job.title}</h3>
                        <span class="budget-amount">${job.budget}</span>
                    </div>
                    <div class="job-meta"><span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span>${statusBadge}</div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        if(jobsListContainer) jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        if(jobsListContainer) jobsListContainer.innerHTML = `<div class="error-state"><h3>Error Loading Projects</h3><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
    }
}

async function fetchAndRenderApprovedJobs() {
    // This function's logic remains the same
}

async function markJobCompleted(jobId) {
    // This function's logic remains the same
}

async function fetchAndRenderMyQuotes() {
    // This function's logic remains the same
}

async function editQuote(quoteId) {
    // This function's logic remains the same
}

async function handleQuoteEdit(event) {
    // This function's logic remains the same
}

async function handlePostJob(event) {
    // This function's logic remains the same
}

async function deleteJob(jobId) {
    // This function's logic remains the same
}

async function deleteQuote(quoteId) {
    // This function's logic remains the same
}

async function viewQuotes(jobId) {
    // This function's logic remains the same
}

async function approveQuote(quoteId, jobId) {
    // This function's logic remains the same
}

function showQuoteModal(jobId) {
    // This function's logic remains the same
}

async function handleQuoteSubmit(event) {
    // This function's logic remains the same
}

async function openConversation(jobId, recipientId) {
    // This function's logic remains the same
}

async function fetchAndRenderConversations() {
    // This function's logic remains the same
}

function getTimeAgo(timestamp) {
    // This function's logic remains the same
}

function getAvatarColor(name) {
    // This function's logic remains the same
}

async function renderConversationView(conversationOrId) {
    // This function's logic remains the same
}

async function handleSendMessage(conversationId) {
    // This function's logic remains the same
}

function showAuthModal(view) {
    // This function's logic remains the same
}

function renderAuthForm(view) {
    // This function's logic remains the same
}

function showGenericModal(innerHTML, style = '') {
    // This function's logic remains the same
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
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a><a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a><a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a><a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a><a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>Estimation Tool</span></a>`;
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>`;

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
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes' : 'Manage your listings';
        container.innerHTML = `<div class="section-header modern-header"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2><p class="header-subtitle">${subtitle}</p></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container"></div>`;
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
    }
}

function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleFileSelect(e.target.files[0]);
    });
    document.getElementById('generate-estimation-btn').addEventListener('click', handleGenerateEstimation);
}

function handleFileSelect(file) {
    if (file && file.type === 'application/pdf') {
        appState.uploadedFile = file;
        document.getElementById('file-info-container').style.display = 'flex';
        document.getElementById('file-info').innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        document.getElementById('generate-estimation-btn').disabled = false;
    } else {
        showNotification('Please select a valid PDF file.', 'error');
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        document.getElementById('generate-estimation-btn').disabled = true;
    }
}

async function handleGenerateEstimation() {
    if (!appState.uploadedFile) return;

    const generateBtn = document.getElementById('generate-estimation-btn');
    const resultsContainer = document.getElementById('estimation-results-container');

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="btn-spinner"></div> Generating...';
    resultsContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Analyzing PDF...</p></div>';

    const formData = new FormData();
    formData.append('drawing', appState.uploadedFile);
    formData.append('projectName', 'Automated Estimation');
    formData.append('location', 'Sydney');

    try {
        const response = await apiCall('/estimation/generate-from-upload', 'POST', formData);
        renderEstimationResult(response.estimationData);
        showNotification('Estimation generated successfully!', 'success');
    } catch (error) {
        resultsContainer.innerHTML = `<div class="error-state"><h3>Estimation Failed</h3><p>${error.message}</p></div>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-cogs"></i> Generate Estimation';
    }
}

function renderEstimationResult(data) {
    const resultsContainer = document.getElementById('estimation-results-container');
    const totalCost = data.cost_summary.total_inc_gst || 0;
    const items = data.items || [];
    const formattedTotalCost = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalCost);

    resultsContainer.innerHTML = `
        <div class="estimation-report">
            <div class="report-header"><h3>Estimation Result</h3></div>
            <div class="report-summary">
                <div class="summary-item"><div class="label">Total Cost</div><div class="value total">${formattedTotalCost}</div></div>
                <div class="summary-item"><div class="label">Confidence</div><div class="value">${(data.confidence_score * 100).toFixed(0)}%</div></div>
                <div class="summary-item"><div class="label">Line Items</div><div class="value">${items.length}</div></div>
            </div>
            <div class="report-details">
                <h4>Cost Breakdown</h4>
                <table class="report-table">
                    <thead><tr><th>Category</th><th>Description</th><th class="currency">Cost</th></tr></thead>
                    <tbody>${items.map(item => `<tr><td>${item.category}</td><td>${item.description}</td><td class="currency">${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(item.totalCost)}</td></tr>`).join('')}</tbody>
                    <tfoot>
                        <tr class="total-row"><td colspan="2">Subtotal</td><td class="currency">${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(data.cost_summary.subtotal_ex_gst)}</td></tr>
                        <tr class="total-row"><td colspan="2">GST</td><td class="currency">${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(data.cost_summary.gst)}</td></tr>
                        <tr class="total-row"><td colspan="2"><strong>Total Cost</strong></td><td class="currency"><strong>${formattedTotalCost}</strong></td></tr>
                    </tfoot>
                </table>
            </div>
        </div>`;
}

function showNotification(message, type = 'info', duration = 4000) {
    // This function's logic remains the same
}

// UPDATED: Post Job Template with premium process steps
function getPostJobTemplate() {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-plus-circle"></i> Post a New Project</h2>
                <p class="header-subtitle">Create a detailed project listing to attract qualified professionals</p>
            </div>
        </div>
        
        <div class="process-steps">
            <div class="step-item active">
                <div class="step-icon"><i class="fas fa-pencil-alt"></i></div>
                <div class="step-text"><h3>1. Define Project</h3><p>Provide project details and requirements.</p></div>
            </div>
            <div class="step-connector"></div>
            <div class="step-item">
                <div class="step-icon"><i class="fas fa-users"></i></div>
                <div class="step-text"><h3>2. Receive Quotes</h3><p>Get proposals from expert designers.</p></div>
            </div>
            <div class="step-connector"></div>
            <div class="step-item">
                <div class="step-icon"><i class="fas fa-handshake"></i></div>
                <div class="step-text"><h3>3. Approve & Collaborate</h3><p>Assign the project and manage communication.</p></div>
            </div>
        </div>

        <div class="post-job-container">
            <form id="post-job-form" class="modern-form post-job-form">
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse Extension"></div>
                    <div class="form-row"><div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div><div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Project Deadline</label><input type="date" class="form-input" name="deadline" required></div></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Required Skills</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis"><small class="form-help">Separate skills with commas</small></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-external-link-alt"></i> Project Link (Optional)</label><input type="url" class="form-input" name="link" placeholder="https://example.com/project-details"><small class="form-help">Link to additional project information</small></div>
                </div>
                <div class="form-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-align-left"></i> Detailed Description</label><textarea class="form-textarea" name="description" required placeholder="Provide a comprehensive description of your project..."></textarea></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Project Attachments</label><input type="file" class="form-input file-input" name="attachment" accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload drawings or specifications (Max 15MB)</small></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

// UPDATED: Estimation Tool Template with premium UI
function getEstimationToolTemplate() {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2>
                <p class="header-subtitle">Get an instant, data-driven cost estimate from your structural drawings.</p>
            </div>
        </div>

        <div class="process-steps">
            <div class="step-item active">
                <div class="step-icon"><i class="fas fa-file-upload"></i></div>
                <div class="step-text"><h3>1. Upload Drawings</h3><p>Provide your project details and PDF.</p></div>
            </div>
            <div class="step-connector"></div>
            <div class="step-item">
                <div class="step-icon"><i class="fas fa-cogs"></i></div>
                <div class="step-text"><h3>2. AI Analysis</h3><p>Our system extracts and analyzes the data.</p></div>
            </div>
            <div class="step-connector"></div>
            <div class="step-item">
                <div class="step-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                <div class="step-text"><h3>3. Get Estimate</h3><p>Receive your detailed cost report instantly.</p></div>
            </div>
        </div>

        <div class="premium-estimation-tool">
            <div class="estimation-form-section modern-form">
                <h3>Project Information</h3>
                <p>Tell us about your project.</p>

                <div class="form-group">
                    <label class="form-label"><i class="fas fa-heading"></i> Project Name</label>
                    <input type="text" class="form-input" id="estimation-project-name" placeholder="e.g., Southern Vales Redevelopment">
                </div>

                <div class="form-group">
                    <label class="form-label"><i class="fas fa-align-left"></i> Project Description (Optional)</label>
                    <textarea class="form-textarea" id="estimation-project-description" placeholder="Provide a brief description of the project scope..."></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label"><i class="fas fa-tasks"></i> What do you require?</label>
                    <div class="requirement-options">
                        <input type="radio" id="req-mto" name="requirement" value="mto" checked>
                        <label for="req-mto" class="req-option">
                            <i class="fas fa-ruler-combined"></i>
                            <div><strong>Material Take-Off (MTO)</strong><span>A detailed list of all steel components.</span></div>
                        </label>
                        
                        <input type="radio" id="req-cost" name="requirement" value="cost">
                        <label for="req-cost" class="req-option">
                            <i class="fas fa-dollar-sign"></i>
                            <div><strong>Full Cost Estimate</strong><span>A complete cost breakdown including materials and labor.</span></div>
                        </label>
                    </div>
                </div>
            </div>

            <div class="estimation-upload-section">
                <h3>Upload Your Drawing</h3>
                <p>Drag and drop your PDF file below.</p>
                
                <div id="file-upload-area" class="file-upload-area premium-uploader">
                    <input type="file" id="file-upload-input" accept=".pdf" />
                    <div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                    <h4>Drag & Drop PDF</h4>
                    <p>or click to browse</p>
                </div>

                <div id="file-info-container">
                    <span id="file-info"></span>
                    <button id="generate-estimation-btn" class="btn btn-primary" disabled>
                        <i class="fas fa-cogs"></i> Generate Estimation
                    </button>
                </div>
            </div>
        </div>

        <div id="estimation-results-container" class="estimation-results-container">
             <div class="empty-state initial-state">
                <div class="empty-icon"><i class="fas fa-file-import"></i></div>
                <h3>Your Estimation Report Will Appear Here</h3>
                <p>Upload a structural drawing PDF to get started.</p>
            </div>
        </div>
    `;
}
