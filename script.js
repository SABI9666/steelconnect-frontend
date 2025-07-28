

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: []
};

/**
 * Initializes the application by setting up event listeners and
 * checking for an existing user session in localStorage.
 */
function initializeApp() {
    // Landing page listeners
    document.querySelectorAll('.btn-outline, .btn-primary').forEach(btn => {
        if (btn.textContent.includes('Sign In')) {
            btn.addEventListener('click', () => showAuthModal('login'));
        } else if (btn.textContent.includes('Join Now') || btn.textContent.includes('Get Started')) {
            btn.addEventListener('click', () => showAuthModal('register'));
        }
    });

    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            showAppView();
        } else {
            showLandingPageView();
        }
    });

    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Check for stored user session
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout(); // Clear corrupted data
        }
    } else {
        showLandingPageView();
    }
}

// --- API ABSTRACTION ---
/**
 * A generic function for making API calls to the backend.
 * It automatically handles headers, authorization, and error parsing.
 * @param {string} endpoint - The API endpoint (e.g., '/jobs').
 * @param {string} method - The HTTP method (e.g., 'GET', 'POST').
 * @param {object|FormData} [body] - The request body for POST/PUT requests.
 * @param {string|null} [successMessage] - A message to show on success.
 * @param {function} [callback] - A function to call with the response data on success.
 */
async function apiCall(endpoint, method, body = null, successMessage = null, callback = null) {
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
                // Let the browser set the Content-Type header for FormData
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }

        const response = await fetch(BACKEND_URL + endpoint, options);
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const errorMessage = (data && (data.error || data.message)) ? (data.error || data.message) : `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        if (successMessage) {
            showAlert(successMessage, 'success');
        }

        if (callback) {
            callback(data);
        }

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showAlert(error.message, 'error');
    }
}


// --- AUTHENTICATION ---
/**
 * Handles user registration form submission.
 * @param {Event} event - The form submission event.
 */
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = {
        fullName: form.regName.value,
        username: form.regUsername.value,
        email: form.regEmail.value,
        password: form.regPassword.value,
        role: form.regRole.value,
    };
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.', () => {
        renderAuthForm('login');
    });
}

/**
 * Handles user login form submission.
 * @param {Event} event - The form submission event.
 */
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = {
        email: form.loginEmail.value,
        password: form.loginPassword.value
    };
    await apiCall('/auth/login', 'POST', authData, 'Login successful!', (data) => {
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
    });
}

/**
 * Logs the current user out, clears storage, and returns to the landing page.
 */
function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    showLandingPageView();
    showAlert('You have been logged out.', 'info');
}

// --- DATA FETCHING & RENDERING ---
/**
 * Fetches all jobs from the backend and renders them.
 */
async function fetchAndRenderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = `<div style="text-align:center; padding: 40px;">Loading projects...</div>`;

    await apiCall('/jobs', 'GET', null, null, (jobs) => {
        appState.jobs = jobs;
        jobsList.innerHTML = '';
        if (!jobs || jobs.length === 0) {
            jobsList.innerHTML = `<div class="empty-state"><h3>No Jobs Found</h3><p>Check back later or post a job if you are a contractor.</p></div>`;
            return;
        }

        jobs.forEach(job => {
            const jobCard = document.createElement('div');
            jobCard.className = 'job-card';

            const isMyJob = appState.currentUser ? .id === job.posterId;
            let actionButtonHTML = '';

            if (appState.currentUser) {
                if (isMyJob) {
                    actionButtonHTML = `<button class="btn btn-secondary" onclick="viewQuotes('${job.id}')">View Quotes</button> <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete</button>`;
                } else if (appState.currentUser.role === 'designer') {
                    actionButtonHTML = `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`;
                }
            } else {
                actionButtonHTML = `<button class="btn btn-secondary" onclick="showAuthModal('login')">Sign In to Quote</button>`;
            }

            jobCard.innerHTML = `
                <div class="job-header">
                    <h3>${job.title}</h3>
                    <div class="job-budget">${job.budget}</div>
                </div>
                <p class="job-description">${job.description}</p>
                <div class="job-actions">${actionButtonHTML}</div>
            `;
            jobsList.appendChild(jobCard);
        });
    });
}

// --- ACTIONS (CREATE, DELETE) ---
/**
 * Handles the submission of the 'Post a Job' form.
 * @param {Event} event - The form submission event.
 */
async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const jobData = {
        title: form.jobTitle.value,
        description: form.jobDescription.value,
        budget: form.jobBudget.value,
        skills: (form.jobSkills.value || "").split(',').map(s => s.trim()).filter(Boolean),
        userId: appState.currentUser.id,
        userFullName: appState.currentUser.fullName,
    };
    await apiCall('/jobs', 'POST', jobData, 'Job posted successfully!', () => {
        form.reset();
        renderAppSection('jobs');
    });
}

/**
 * Deletes a job after user confirmation.
 * @param {string} jobId - The ID of the job to delete.
 */
async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job and all its quotes?')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted successfully!', fetchAndRenderJobs);
    }
}


// --- MODALS ---
/**
 * Displays a modal for a contractor to view quotes for their job.
 * @param {string} jobId - The ID of the job to view quotes for.
 */
async function viewQuotes(jobId) {
    await apiCall(`/quotes/job/${jobId}`, 'GET', null, null, (quotes) => {
        const modalContainer = document.getElementById('modal-container');
        let quotesHTML = '<h3>Received Quotes</h3>';
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><p>No quotes yet.</p></div>`;
        } else {
            quotes.forEach(quote => {
                quotesHTML += `
                    <div class="quote-card">
                        <p><strong>From:</strong> ${quote.quoterName} | <strong>Amount:</strong> $${quote.amount}</p>
                        <p>${quote.description}</p>
                    </div>`;
            });
        }
        modalContainer.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close-button" onclick="closeModal()">✕</button>
                    ${quotesHTML}
                </div>
            </div>`;
    });
}

/**
 * Shows the modal for a designer to submit a quote.
 * @param {string} jobId - The job ID to submit a quote for.
 */
function showQuoteModal(jobId) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="max-width: 500px;" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">✕</button>
                <h3>Submit Your Quote</h3>
                <form id="quote-form" class="form-grid">
                    <div class="form-group">
                        <label class="form-label">Quote Amount ($)</label>
                        <input type="number" class="form-input" id="quoteAmount" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Description / Cover Letter</label>
                        <textarea class="form-textarea" style="min-height: 120px;" id="quoteDescription" required></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Quote</button>
                </form>
            </div>
        </div>`;
    document.getElementById('quote-form').addEventListener('submit', (e) => handleQuoteSubmit(e, jobId));
}

/**
 * Handles the submission of a quote form.
 * @param {Event} event - The form submission event.
 * @param {string} jobId - The job ID the quote is for.
 */
async function handleQuoteSubmit(event, jobId) {
    event.preventDefault();
    const form = event.target;
    const quoteData = {
        jobId: jobId,
        amount: form.querySelector('#quoteAmount').value,
        description: form.querySelector('#quoteDescription').value,
        quoterId: appState.currentUser.id,
        quoterName: appState.currentUser.fullName
    };
    await apiCall('/quotes', 'POST', quoteData, 'Quote submitted successfully!', closeModal);
}

/**
 * Renders the authentication modal for either login or registration.
 * @param {'login'|'register'} view - The form to display.
 */
function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">&times;</button>
                <div id="modal-form-container"></div>
            </div>
        </div>`;
    renderAuthForm(view);
}

/**
 * Renders the specific login or register form inside the auth modal.
 * @param {'login'|'register'} view
 */
function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    if (view === 'login') {
        container.innerHTML = getLoginTemplate();
        document.getElementById('login-form').addEventListener('submit', handleLogin);
    } else {
        container.innerHTML = getRegisterTemplate();
        document.getElementById('register-form').addEventListener('submit', handleRegister);
    }
}

/**
 * Clears and hides any active modal.
 */
function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}


// --- UI & VIEW MANAGEMENT ---
/**
 * Switches the view to the main application dashboard for logged-in users.
 */
function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';

    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('userAvatar').textContent = (user.fullName || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('jobs'); // Default to jobs view
}

/**
 * Switches the view to the public landing page for logged-out users.
 */
function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('main-nav-menu').innerHTML = `
        <a href="#features" class="nav-link">Features</a>
        <a href="#showcase" class="nav-link">Showcase</a>
    `;
    fetchAndRenderJobs(); // Also fetch jobs for the landing page view if desired
}


/**
 * Builds the sidebar navigation links based on the current user's role.
 */
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.role;
    let links = '';

    if (role === 'designer') {
        links = `
            <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase"></i> <span>Find Jobs</span></a>
            <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar"></i> <span>My Quotes</span></a>`;
    } else { // contractor
        links = `
            <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks"></i> <span>My Projects</span></a>
            <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle"></i> <span>Post a Job</span></a>`;
    }
    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

/**
 * Renders a specific section (e.g., 'jobs', 'post-job') in the main content area.
 * @param {string} sectionId - The ID of the section to render.
 */
function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    if (sectionId === 'jobs') {
        const title = appState.currentUser.role === 'designer' ? 'Available Projects' : 'My Posted Projects';
        container.innerHTML = `<div class="section-header"><h2>${title}</h2></div><div id="jobs-list" class="jobs-grid"></div>`;
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'my-quotes') {
        container.innerHTML = `<div class="section-header"><h2>My Submitted Quotes</h2></div><p>This feature is coming soon!</p>`;
        // In the future, you would call a function like fetchAndRenderMyQuotes() here.
    }
}

/**
 * Displays a temporary notification alert at the top of the screen.
 * @param {string} message - The message to display.
 * @param {'success'|'error'|'info'} type - The type of alert.
 */
function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}


// --- HTML TEMPLATE FUNCTIONS ---
function getLoginTemplate() {
    return `
        <h2 style="text-align: center; margin-bottom: 24px;">Sign In</h2>
        <form id="login-form" class="form-grid">
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="loginEmail" name="loginEmail" required></div>
            <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="loginPassword" name="loginPassword" required></div>
            <button type="submit" class="btn btn-primary">Sign In</button>
        </form>
        <div class="modal-switch">Don't have an account? <a onclick="renderAuthForm('register')">Sign Up</a></div>`;
}

function getRegisterTemplate() {
    return `
        <h2 style="text-align: center; margin-bottom: 24px;">Create an Account</h2>
        <form id="register-form" class="form-grid">
            <div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" id="regName" name="regName" required></div>
            <div class="form-group"><label class="form-label">Username</label><input type="text" class="form-input" id="regUsername" name="regUsername" required></div>
            <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="regEmail" name="regEmail" required></div>
            <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" id="regPassword" name="regPassword" required></div>
            <div class="form-group">
                <label class="form-label">I am a...</label>
                <select class="form-select" id="regRole" name="regRole" required>
                    <option value="">Select your role</option>
                    <option value="contractor">Client / Contractor</option>
                    <option value="designer">Designer / Engineer</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Create Account</button>
        </form>
        <div class="modal-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div class="section-header"><h2>Post a New Project</h2></div>
        <form id="post-job-form" class="form-grid" style="max-width: 800px;">
            <div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" id="jobTitle" name="jobTitle" required></div>
            <div class="form-group"><label class="form-label">Budget Range (e.g., $500 - $1000)</label><input type="text" class="form-input" id="jobBudget" name="jobBudget" required></div>
            <div class="form-group"><label class="form-label">Required Skills (comma-separated)</label><input type="text" class="form-input" id="jobSkills" name="jobSkills"></div>
            <div class="form-group"><label class="form-label">Project Description</label><textarea class="form-input" style="min-height: 120px;" id="jobDescription" name="jobDescription" required></textarea></div>
            <button type="submit" class="btn btn-primary" style="justify-self: start;">Post Project</button>
        </form>`;
}

function toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');
    document.querySelectorAll('.feature-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
        }
    });
    card.classList.toggle('expanded');
}