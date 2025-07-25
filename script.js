// --- GLOBAL STATE & CONSTANTS ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = { currentUser: null, jwtToken: null, jobs: [], quotes: {} };

// --- This is the main function that starts the app ---
document.addEventListener('DOMContentLoaded', () => {
    // Check local storage for a saved session
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        appState.jwtToken = token;
        appState.currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
    
    // Fetch initial list of jobs
    fetchJobs();

    // --- Attach all event listeners at the end, after all functions are defined ---
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    document.getElementById('logout-button').addEventListener('click', logout);
});


// --- AUTHENTICATION FUNCTIONS ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = {
        fullName: form.querySelector('#regName').value,
        username: form.querySelector('#regUsername').value,
        email: form.querySelector('#regEmail').value,
        password: form.querySelector('#regPassword').value,
        role: form.querySelector('#regRole').value,
    };
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.', () => {
        showSection('login');
        form.reset();
    });
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.querySelector('#loginEmail').value, password: form.querySelector('#loginPassword').value };
    
    await apiCall('/auth/login', 'POST', authData, 'Login successful!', (data) => {
        appState.currentUser = data.user;
        appState.jwtToken = data.token || 'fake-jwt-token';
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', appState.jwtToken);
        updateUIForLoggedInUser();
        fetchJobs();
    });
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    updateUIForLoggedOutUser();
    showAlert('You have been logged out.', 'info');
}

// --- JOB DATA & RENDERING ---
async function fetchJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    await apiCall('/jobs', 'GET', null, null, (data) => {
        appState.jobs = data;
        renderJobs();
    });
}

function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '';
    if (!appState.jobs || appState.jobs.length === 0) {
        jobsList.innerHTML = `<div class="empty-state"><h3>No Jobs Found</h3><p>Check back later or post a new job.</p></div>`;
        return;
    }
    appState.jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        const isMyJob = appState.currentUser && appState.currentUser.id === job.posterId;

        let attachmentHTML = '';
        if (job.attachment) {
            attachmentHTML = `<div class="job-attachment"><a href="${BACKEND_URL}${job.attachment}" target="_blank">View File Attachment</a></div>`;
        } else if (job.link) {
            attachmentHTML = `<div class="job-attachment"><a href="${job.link}" target="_blank">View Link Attachment</a></div>`;
        }

        let actionButtonHTML = '';
        if (appState.currentUser) {
            if (isMyJob) {
                actionButtonHTML = `<button class="btn btn-secondary" onclick="viewQuotes('${job.id}')">View Quotes</button>`;
            } else if (appState.currentUser.role === 'designer') {
                actionButtonHTML = `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`;
            }
        } else {
            actionButtonHTML = `<button class="btn btn-secondary" onclick="showSection('login')">Sign In to Quote</button>`;
        }

        jobCard.innerHTML = `
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <div class="job-meta"><span>Posted by ${job.posterName || 'A Contractor'}</span></div>
                </div>
                <div class="job-budget">${job.budget}</div>
            </div>
            <p class="job-description">${job.description}</p>
            ${attachmentHTML}
            <div class="job-actions">${actionButtonHTML}</div>
        `;
        jobsList.appendChild(jobCard);
    });
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const fileInput = form.querySelector('#jobAttachmentFile');
    const file = fileInput.files[0];

    let attachmentPath = '';
    if (file) {
        const formData = new FormData();
        formData.append('document', file);
        try {
            showAlert('Uploading file...', 'info');
            const response = await fetch(`${BACKEND_URL}/uploads/job`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'File upload failed.');
            attachmentPath = data.filePath;
        } catch (error) {
            return showAlert(error.message, 'error');
        }
    }
    
    const jobData = {
        title: form.querySelector('#jobTitle').value,
        description: form.querySelector('#jobDescription').value,
        budget: form.querySelector('#jobBudget').value,
        deadline: form.querySelector('#jobDeadline').value,
        skills: form.querySelector('#jobSkills').value.split(',').map(s => s.trim()).filter(Boolean),
        userId: appState.currentUser.id,
        userFullName: appState.currentUser.fullName,
        attachment: attachmentPath,
        link: form.querySelector('#jobAttachmentLink').value
    };

    await apiCall('/jobs', 'POST', jobData, 'Job posted successfully!', () => {
        form.reset();
        fetchJobs();
        showSection('jobs');
    });
}

// --- QUOTE MODAL & SUBMISSION ---
function showQuoteModal(jobId) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">✕</button>
                <h3>Submit Your Quote</h3>
                <form id="quote-form" class="form-grid">
                    <div class="form-group"><label class="form-label">Quote Amount ($)</label><input type="number" class="form-input" id="quoteAmount" required></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="quoteDescription" required></textarea></div>
                    <div class="form-group"><label class="form-label">Attach Quotation (PDF/Word)</label><input type="file" class="form-input" id="quoteAttachmentFile"></div>
                    <button type="submit" class="btn btn-primary">Submit Quote</button>
                </form>
            </div>
        </div>
    `;
    document.getElementById('quote-form').addEventListener('submit', (e) => handleQuoteSubmit(e, jobId));
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

async function handleQuoteSubmit(event, jobId) {
    event.preventDefault();
    const form = event.target;
    const fileInput = form.querySelector('#quoteAttachmentFile');
    const file = fileInput.files[0];
    let attachmentPath = '';
    if (file) {
        const formData = new FormData();
        formData.append('quote_document', file);
        try {
            showAlert('Uploading quote file...', 'info');
            const response = await fetch(`${BACKEND_URL}/uploads/quote`, { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'File upload failed.');
            attachmentPath = data.filePath;
        } catch (error) {
            return showAlert(error.message, 'error');
        }
    }
    const quoteData = {
        jobId: jobId,
        amount: form.querySelector('#quoteAmount').value,
        description: form.querySelector('#quoteDescription').value,
        attachment: attachmentPath,
        quoterId: appState.currentUser.id,
        quoterName: appState.currentUser.fullName
    };
    await apiCall('/quotes', 'POST', quoteData, 'Quote submitted successfully!', closeModal);
}

// --- NEW: VIEW QUOTES FUNCTION ---
async function viewQuotes(jobId) {
    showAlert('Fetching quotes...', 'info');
    await apiCall(`/quotes/job/${jobId}`, 'GET', null, null, (quotes) => {
        const modalContainer = document.getElementById('modal-container');
        let quotesHTML = '<h3>Received Quotes</h3>';
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><p>No quotes have been submitted for this job yet.</p></div>`;
        } else {
            quotes.forEach(quote => {
                const attachmentHTML = quote.attachment ? `<div class="job-attachment"><a href="${BACKEND_URL}${quote.attachment}" target="_blank">View Quote Attachment</a></div>` : '';
                quotesHTML += `
                    <div class="quote-card">
                        <div class="quote-header">
                            <div>
                                <h4>From: ${quote.quoterName}</h4>
                                <div class="quote-amount">$${quote.amount}</div>
                            </div>
                            <div class="quote-status ${quote.status}">${quote.status}</div>
                        </div>
                        <p>${quote.description}</p>
                        ${attachmentHTML}
                    </div>
                `;
            });
        }
        
        modalContainer.innerHTML = `
            <div class="modal-overlay" onclick="closeModal()">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close-button" onclick="closeModal()">✕</button>
                    ${quotesHTML}
                </div>
            </div>
        `;
    });
}

// --- UI & UTILITY FUNCTIONS ---
function updateUIForLoggedInUser() {
    const user = appState.currentUser;
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `
        <button class="nav-link" onclick="showSection('jobs')">Find Jobs</button>
        ${user.role === 'contractor' ? `<button class="nav-link" onclick="showSection('post-job')">Post Job</button>` : ''}
        <button class="nav-link" onclick="showSection('quotes')">My Quotes</button>
    `;
    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();
    showSection('jobs');
}

function updateUIForLoggedOutUser() {
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('auth-buttons-container').innerHTML = `
        <button class="btn btn-outline" onclick="showSection('login')">Sign In</button>
        <button class="btn btn-primary" onclick="showSection('register')">Join Now</button>
    `;
    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `<button class="nav-link" onclick="showSection('jobs')">Find Jobs</button>`;
    showSection('jobs');
}

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

async function apiCall(endpoint, method, body, successMessage, callback) {
    try {
        const options = { method };
        if (body) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Request failed`);
        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(data);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}