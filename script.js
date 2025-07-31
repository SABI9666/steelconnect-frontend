// --- LANDING PAGE SCRIPT ---
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
    participants: {}
};

function initializeApp() {
    console.log("SteelConnect App Initializing...");
    document.getElementById('signin-btn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn').addEventListener('click', () => showAuthModal('register'));
    
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('jobs');
        } else {
            showLandingPageView();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    
    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
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
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || `Request failed with status ${response.status}`);
        }

        if (successMessage) {
            showAlert(successMessage, 'success');
        }
        
        // Return the successful data for the caller to use
        return responseData;

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showAlert(error.message, 'error');
        // Propagate the error so the caller knows the request failed
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
        .catch(() => {}); // Catch block to prevent unhandled promise rejection errors
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showAlert('Login successful!', 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
    } catch(error) {
        // Error is already shown by apiCall, just preventing crash
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    showLandingPageView();
    showAlert('You have been logged out.', 'info');
}

async function fetchAndRenderJobs() {
    const jobsListContainer = document.getElementById('jobs-list');
    if (!jobsListContainer) return;
    jobsListContainer.innerHTML = '<p>Loading projects...</p>';
    
    const user = appState.currentUser;
    // For designers, get all jobs. For contractors, get their own jobs.
    const endpoint = user.type === 'designer' ? '/jobs' : `/jobs/user/${user.id}`;
    
    try {
        const response = await apiCall(endpoint, 'GET');
        const jobs = response.data || [];
        appState.jobs = jobs;
        
        if (jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects yet.</h3><p>Click 'Post a Job' to get started.</p></div>`;
            return;
        }

        jobsListContainer.innerHTML = jobs.map(job => {
            const actions = user.type === 'designer'
                ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`
                : `<button class="btn btn-outline" onclick="viewQuotes('${job.id}')">View Quotes (${job.quotesCount || 0})</button>
                   <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete Job</button>`;
            return `
                <div class="job-card">
                    <div class="job-header">
                        <div><h3>${job.title}</h3><p class="text-gray" style="font-size: 14px;">Posted by: ${job.posterName || 'N/A'}</p></div>
                        <div class="job-budget">${job.budget}</div>
                    </div>
                    <p>${job.description}</p>
                    ${job.skills?.length > 0 ? `<p style="margin-top: 12px;"><strong>Skills:</strong> ${job.skills.join(', ')}</p>` : ''}
                    ${job.link ? `<p style="margin-top: 12px;"><strong>Link:</strong> <a href="${job.link}" target="_blank" rel="noopener noreferrer">${job.link}</a></p>` : ''}
                    ${job.attachment ? `<p style="margin-top: 12px;"><strong>Attachment:</strong> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View File</a></p>` : ''}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');
    } catch(error) {
        jobsListContainer.innerHTML = '<p>Error loading jobs. Please try again later.</p>';
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="section-header"><h2>My Submitted Quotes</h2></div><div id="my-quotes-list" class="jobs-grid"></div>`;
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<p>Loading your quotes...</p>';
    
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        
        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>You have not submitted any quotes.</p></div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            // --- FIX: Correctly handle the 'attachments' array ---
            const attachments = quote.attachments || [];
            let attachmentLink = '';
            if (attachments.length > 0) {
                // For simplicity, link to the first attachment. Can be modified to show all.
                attachmentLink = `<p><strong>Attachment:</strong> <a href="${attachments[0]}" target="_blank">View File</a></p>`;
            }

            const messageButton = quote.status === 'approved' ? `<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')">Message Client</button>` : '';
            const deleteButton = quote.status === 'submitted' ? `<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">Delete Quote</button>` : '';
            
            return `
                <div class="job-card quote-status-${quote.status}">
                    <div class="job-header">
                        <div>
                            <h3>Quote for: ${quote.jobTitle || 'Unknown Job'}</h3>
                            <p class="text-gray" style="font-size: 14px;">Amount: $${quote.quoteAmount}</p>
                        </div>
                        <div class="job-budget">Status: ${quote.status}</div>
                    </div>
                    <p>${quote.description}</p>
                    ${attachmentLink}
                    <div class="job-actions">${messageButton} ${deleteButton}</div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = '<p>Error loading your quotes. Please try again later.</p>';
    }
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData();
    ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => {
        if (form[field]) formData.append(field, form[field].value);
    });
    if (form.attachment.files.length > 0) {
        formData.append('attachment', form.attachment.files[0]);
    }
    
    try {
        await apiCall('/jobs', 'POST', formData, 'Job posted successfully!');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        // Error handled by apiCall
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', 'Job deleted.')
            .then(() => renderAppSection('jobs'))
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', 'Quote deleted.')
            .then(() => fetchAndRenderMyQuotes())
            .catch(() => {});
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        
        let quotesHTML = `<h3>Received Quotes</h3>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><p>No quotes received yet.</p></div>`;
        } else {
            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = '';
                if (attachments.length > 0) {
                    attachmentLink = `<p><strong>Attachment:</strong> <a href="${attachments[0]}" target="_blank">View File</a></p>`;
                }
                const approveButton = appState.currentUser.type === 'contractor' && quote.status === 'submitted' ? `<button class="btn btn-primary" onclick="approveQuote('${quote.id}')">Approve</button>` : '';
                const messageButton = `<button class="btn btn-outline" onclick="openConversation('${quote.jobId}', '${quote.designerId}')">Message Designer</button>`;
                
                return `
                    <div class="quote-card quote-status-${quote.status}">
                        <p><strong>From:</strong> ${quote.designerName} | <strong>Amount:</strong> $${quote.quoteAmount}</p>
                        <p>${quote.description}</p>
                        ${attachmentLink}
                        <p><strong>Status:</strong> ${quote.status}</p>
                        <div class="quote-actions">${approveButton} ${messageButton}</div>
                    </div>`;
            }).join('');
        }
        showGenericModal(quotesHTML, 'max-width: 650px;');
    } catch (error) {
        showGenericModal('<h3>Error</h3><p>Could not load quotes. You may not have permission to view them.</p>');
    }
}

async function approveQuote(quoteId) {
    if (confirm('Are you sure you want to approve this quote? This will notify the designer.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', 'Quote approved!')
            .then(() => {
                closeModal();
                renderAppSection('jobs');
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <h3>Submit Your Quote</h3>
        <form id="quote-form" class="form-grid">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-group"><label class="form-label">Amount ($)</label><input type="number" class="form-input" name="amount" required></div>
            <div class="form-group"><label class="form-label">Timeline (in days)</label><input type="number" class="form-input" name="timeline" required></div>
            <div class="form-group"><label class="form-label">Proposal / Description</label><textarea class="form-textarea" name="description" required></textarea></div>
            <div class="form-group"><label class="form-label">Attachment (Optional)</label><input type="file" class="form-input" name="attachment"></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Quote</button>
        </form>`;
    showGenericModal(content, 'max-width: 500px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData();

    // --- FIX: Correctly map form fields to what the backend expects ---
    formData.append('jobId', form['jobId'].value);
    formData.append('quoteAmount', form['amount'].value); // Maps 'amount' to 'quoteAmount'
    formData.append('timeline', form['timeline'].value);
    formData.append('description', form['description'].value);

    // No need to manually add quoterId or quoterName; the backend gets this from the authenticated user token.

    if (form.attachment.files.length > 0) {
        formData.append('attachment', form.attachment.files[0]);
    }
    
    try {
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        closeModal();
    } catch (error) {
        // Error already shown by apiCall
    }
}

// --- UI & MODAL FUNCTIONS ---

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">&times;</button><div id="modal-form-container"></div></div></div>`;
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
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" style="${style}" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">✕</button>${innerHTML}</div></div>`;
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
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase fa-fw"></i> <span>Find Jobs</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post a Job</span></a>`;
    
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
        container.innerHTML = `<div class="section-header"><h2>${title}</h2></div><div id="jobs-list" class="jobs-grid"></div>`;
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    }
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 4000);
}

async function openConversation(jobId, recipientId) {
    // This function can be expanded later
    showAlert('Messaging feature is under development.', 'info');
}

// --- TEMPLATE GETTERS ---

function getLoginTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Sign In</h2><form id="login-form" class="form-grid"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button></form><div class="modal-switch">Don't have an account? <a onclick="renderAuthForm('register')">Sign Up</a></div>`;
}

function getRegisterTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Create an Account</h2><form id="register-form" class="form-grid"><div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label">I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button></form><div class="modal-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `<div class="section-header"><h2>Post a New Project</h2></div><form id="post-job-form" class="form-grid" style="max-width: 800px;"><div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div><div class="form-group"><label class="form-label">Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div><div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" name="deadline" required></div><div class="form-group"><label class="form-label">Required Skills (comma-separated)</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis"></div><div class="form-group"><label class="form-label">Relevant Link (Optional)</label><input type="url" class="form-input" name="link" placeholder="https://example.com/project-details"></div><div class="form-group"><label class="form-label">Attachment (PDF, DWG, etc.)</label><input type="file" class="form-input" name="attachment"></div><div class="form-group"><label class="form-label">Project Description</label><textarea class="form-input" style="min-height: 120px;" name="description" required placeholder="Provide a detailed description of the project requirements..."></textarea></div><button type="submit" class="btn btn-primary" style="justify-self: start;">Post Project</button></form>`;
}