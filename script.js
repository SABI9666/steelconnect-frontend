document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
// --- FIX: Added /api to the backend URL to match the server routes ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com/api'; 
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
    events.forEach(event => {
        window.addEventListener(event, resetInactivityTimer, true);
    });
}

function clearInactivityListeners() {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer, true);
    });
}

const getAttachmentUrl = (path) => {
    if (!path) return '#';
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    // If for some reason a relative path is returned, use the base URL without /api
    return `${BACKEND_URL.replace('/api', '')}${path}`;
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

async function apiCall(endpoint, method, body = null, successMessage = null, callback = null) {
    try {
        const options = { method, headers: {} };
        if (appState.jwtToken) options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        // Assume all responses are JSON, simplifies error handling
        const responseData = await response.json(); 

        if (!response.ok) {
            throw new Error(responseData.message || `Request failed with status ${response.status}`);
        }

        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(responseData);

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showAlert(error.message, 'error');
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
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.', () => renderAuthForm('login'));
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    await apiCall('/auth/login', 'POST', authData, null, (data) => {
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
    clearTimeout(inactivityTimer);
    clearInactivityListeners();

    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    showLandingPageView();

    const message = reason === 'inactive'
        ? 'You have been logged out due to inactivity.'
        : 'You have been logged out.';
    showAlert(message, 'info');
}

async function fetchAndRenderJobs() {
    const jobsListContainer = document.getElementById('jobs-list');
    if (!jobsListContainer) return;
    jobsListContainer.innerHTML = '<p>Loading projects...</p>';
    const user = appState.currentUser;
    const endpoint = user.type === 'designer' ? '/jobs' : `/jobs/user/${user.id}`;
    
    await apiCall(endpoint, 'GET', null, null, (response) => {
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
                    ${job.link ? `<p style="margin-top: 12px;"><strong>Link:</strong> <a href="${job.link}" target="_blank" rel="noopener noreferrer">${job.link}</a></p>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');
    });
}
//... The rest of the script.js file remains the same