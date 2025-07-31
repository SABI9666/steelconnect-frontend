document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com/api'; // Correct API path
const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: [],
    participants: {}
};

// --- INACTIVITY LOGOUT LOGIC ---
let inactivityTimer;

function logoutDueToInactivity() {
    logout('inactive');
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutDueToInactivity, 5 * 60 * 1000); // 5 minutes
}

function setupInactivityListeners() {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetInactivityTimer, true));
}

function clearInactivityListeners() {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.removeEventListener(event, resetInactivityTimer, true));
}

const getAttachmentUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http')) {
        return path;
    }
    // For any relative paths, use the base URL without /api
    return `${BACKEND_URL.replace('/api', '')}${path}`;
};


function initializeApp() {
    // --- Event Listeners Setup ---
    document.getElementById('signin-btn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn').addEventListener('click', () => showAuthModal('register'));
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) renderAppSection('jobs');
        else showLandingPageView();
    });
    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // --- Session Check ---
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
        } catch (error) {
            logout();
        }
    } else {
        showLandingPageView();
    }
}

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
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || 'An API error occurred.');
        }

        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(responseData);

    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// --- User Authentication Functions ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = { name: form.regName.value, email: form.regEmail.value, password: form.regPassword.value, type: form.regRole.value };
    apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.', () => renderAuthForm('login'));
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    apiCall('/auth/login', 'POST', authData, null, (data) => {
        showAlert('Login successful!', 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
    });
}

function logout(reason = null) {
    clearInactivityListeners();
    clearTimeout(inactivityTimer);
    localStorage.clear();
    appState.currentUser = null;
    appState.jwtToken = null;
    showLandingPageView();
    const message = reason === 'inactive' ? 'You have been logged out due to inactivity.' : 'You have been logged out.';
    showAlert(message, 'info');
}

// --- Core App Logic Functions (Jobs & Quotes) ---
async function fetchAndRenderJobs() {
    const jobsListContainer = document.getElementById('jobs-list');
    jobsListContainer.innerHTML = '<p>Loading projects...</p>';
    const user = appState.currentUser;
    const endpoint = user.type === 'designer' ? '/jobs' : `/jobs/user/${user.id}`;

    apiCall(endpoint, 'GET', null, null, (response) => {
        const jobs = response.data || [];
        appState.jobs = jobs;

        if (jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back for new opportunities.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects.</h3><p>Click 'Post a Job' to get started.</p></div>`;
            return;
        }

        jobsListContainer.innerHTML = jobs.map(job => {
            const actions = user.type === 'designer'
                ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`
                : `<button class="btn btn-outline" onclick="viewQuotes('${job.id}')">View Quotes (${job.quotesCount || 0})</button>
                   <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete Job</button>`;

            const attachmentLink = job.attachment
                ? `<p style="margin-top: 12px;"><strong>Attachment:</strong> <a href="${getAttachmentUrl(job.attachment)}" target="_blank" rel="noopener noreferrer">View File</a></p>`
                : '';

            return `
                <div class="job-card">
                    <div class="job-header">
                        <div><h3>${job.title}</h3><p class="text-gray" style="font-size: 14px;">Posted by: ${job.posterName || 'N/A'}</p></div>
                        <div class="job-budget">${job.budget}</div>
                    </div>
                    <p>${job.description}</p>
                    ${job.skills?.length > 0 ? `<p style="margin-top: 12px;"><strong>Skills:</strong> ${job.skills.join(', ')}</p>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');
    });
}

async function fetchAndRenderMyQuotes() {
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<p>Loading your quotes...</p>';

    apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET', null, null, (response) => {
        const quotes = response.data || [];

        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>You have not submitted any quotes.</p></div>`;
            return;
        }

        listContainer.innerHTML = quotes.map(quote => {
            const attachmentLink = quote.attachments && quote.attachments[0]
                ? `<p><strong>Attachment:</strong> <a href="${getAttachmentUrl(quote.attachments[0])}" target="_blank">View File</a></p>` : '';
            
            const messageButton = quote.status === 'approved' 
                ? `<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}', 'Client')">Message Client</button>` : '';

            return `
                <div class="job-card quote-status-${quote.status}">
                    <div class="job-header">
                        <div><h3>Quote for: ${quote.jobTitle}</h3><p>Amount: $${quote.quoteAmount}</p></div>
                        <div class="job-budget">Status: ${quote.status}</div>
                    </div>
                    <p>${quote.description}</p>
                    ${attachmentLink}
                    <div class="job-actions">${messageButton}</div>
                </div>`;
        }).join('');
    });
}
// (The rest of the UI, template, and modal functions would go here, unchanged from previous versions)