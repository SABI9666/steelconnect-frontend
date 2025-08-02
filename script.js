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
    if (!appState.currentUser || appState.currentUser.type !== 'designer') return;
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
        
        if (user.type === 'designer' && response.pagination) {
            appState.hasMoreJobs = response.pagination.hasNext;
            appState.jobsPage += 1;
        } else {
            appState.hasMoreJobs = false;
        }
        
        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Post your first project to connect with professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Project</button></div>`;
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
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i> <span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            
            return `
                <div class="job-card modern-card" data-job-id="${job.id}">
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
                    ${skillsDisplay}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        jobsListContainer.innerHTML = loadMore ? jobsListContainer.innerHTML + jobsHTML : jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        jobsListContainer.innerHTML = `<div class="error-state"><h3>Error Loading Projects</h3><p>Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
    }
}

async function fetchAndRenderApprovedJobs() {
    // ... Omitted for brevity, paste your full function here ...
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed?')) {
        await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed!')
            .then(() => fetchAndRenderApprovedJobs())
            .catch(() => {});
    }
}

async function fetchAndRenderMyQuotes() {
    // ... Omitted for brevity, paste your full function here ...
}

async function editQuote(quoteId) {
    // ... Omitted for brevity, paste your full function here ...
}

async function handleQuoteEdit(event) {
    // ... Omitted for brevity, paste your full function here ...
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';
    submitBtn.disabled = true;
    try {
        const formData = new FormData(form);
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        // Error handled by apiCall
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project?')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted.')
            .then(() => fetchAndRenderJobs())
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted.')
            .then(() => {
                fetchAndRenderMyQuotes();
                loadUserQuotes();
            })
            .catch(() => {});
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote?')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved!')
            .then(() => {
                closeModal();
                fetchAndRenderJobs();
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your proposal for this project</p></div>
        <form id="quote-form" class="modern-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required></div>
            </div>
            <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required></textarea></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional)</label><input type="file" class="form-input file-input" name="attachments" multiple></div>
            <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit</button></div>
        </form>`;
    showGenericModal(content, 'max-width: 600px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    // ... Full implementation as provided before
}

// --- START: AI QUOTE ANALYSIS & PDF FUNCTIONS ---

async function analyzeQuote(quoteId, jobId) {
    try {
        showNotification('Analyzing quote with AI insights...', 'info');
        const response = await apiCall(`/quotes/${quoteId}/analyze`, 'POST', { jobId });
        if (response.success) {
            showQuoteAnalysisModal(response.data);
        }
    } catch (error) {
        showNotification('Failed to retrieve AI analysis. Please try again.', 'error');
    }
}

function showQuoteAnalysisModal(analysisData) {
    const { quote, job, analysis } = analysisData;
    // This function needs the full HTML template as provided before
    const content = `
        <div class="modal-header analysis-header">...</div>
        <div class="analysis-container">...</div>
        <div class="analysis-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            <div class="action-buttons">
                <button class="btn btn-outline" onclick="downloadAnalysisPDF('${quote.id}')"><i class="fas fa-file-pdf"></i> Download PDF</button>
                <button class="btn btn-outline" onclick="openConversation('${job.id}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>
                <button class="btn btn-success" onclick="approveQuote('${quote.id}', '${job.id}')"><i class="fas fa-check"></i> Approve</button>
            </div>
        </div>
    `;
    showGenericModal(content, 'max-width: 1200px; max-height: 90vh;');
}

async function downloadAnalysisPDF(quoteId) {
    try {
        showNotification('Generating your PDF report...', 'info');
        const response = await fetch(`${BACKEND_URL}/quotes/${quoteId}/report`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${appState.jwtToken}` }
        });
        if (!response.ok) throw new Error('Failed to download PDF report.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Analysis-Report-${quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showNotification('PDF download started!', 'success');
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function getRecommendationIcon(recommendation) { /* ... */ }
function getCostScoreClass(score) { /* ... */ }
// ... other helper functions

async function viewQuotes(jobId) {
    // ... Full implementation as provided before
}

// --- MESSAGING, UI, & TEMPLATE FUNCTIONS ---
async function openConversation(jobId, recipientId) { /* ... */ }
async function fetchAndRenderConversations() { /* ... */ }
function getTimeAgo(timestamp) { /* ... */ }
function getAvatarColor(name) { /* ... */ }
async function renderConversationView(conversationOrId) { /* ... */ }
async function handleSendMessage(conversationId) { /* ... */ }

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content modern-modal" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button><div id="modal-form-container"></div></div></div>`;
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
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content modern-modal" style="${style}" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>${innerHTML}</div></div>`;
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
    // ... Full implementation as provided before
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    // ... Full implementation as provided before
}

function buildSidebarNav() {
    // ... Full implementation as provided before
}

function renderAppSection(sectionId) {
    // ... Full implementation as provided before
}

function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    // ... Full implementation as provided before
}

function getLoginTemplate() {
    return `
        <div class="auth-header"><h2><i class="fas fa-sign-in-alt"></i> Welcome Back</h2><p>Sign in to your SteelConnect account</p></div>
        <form id="login-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input" name="loginEmail" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header"><h2><i class="fas fa-user-plus"></i> Join SteelConnect</h2><p>Create your professional account</p></div>
        <form id="register-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input" name="regEmail" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    // ... Full implementation as provided before
}