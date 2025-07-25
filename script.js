document.addEventListener('DOMContentLoaded', initializeApp);

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = { currentUser: null, jwtToken: null, jobs: [], myQuotes: [] };

function initializeApp() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    document.getElementById('logout-button').addEventListener('click', logout);
    
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        appState.jwtToken = token;
        appState.currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
    fetchJobs();
}

// --- AUTHENTICATION ---
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

// --- DATA FETCHING & RENDERING ---
async function fetchJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '<div class="spinner-container" style="display:flex; justify-content:center; padding: 40px;"><div class="spinner"></div></div>';
    await apiCall('/jobs', 'GET', null, null, (data) => {
        appState.jobs = data;
        renderJobs();
    });
}

async function fetchMyQuotes() {
    if (!appState.currentUser || appState.currentUser.role !== 'designer') return;
    const myQuotesList = document.getElementById('my-quotes-list');
    myQuotesList.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET', null, null, (data) => {
        appState.myQuotes = data;
        renderMyQuotes();
    });
}

function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '';
    if (!appState.jobs || appState.jobs.length === 0) {
        jobsList.innerHTML = `<div class="empty-state"><h3>No Jobs Found</h3><p>Log in as a contractor to post the first job!</p></div>`;
        return;
    }
    appState.jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        const isMyJob = appState.currentUser?.id === job.posterId;

        let attachmentHTML = '';
        if (job.attachment) attachmentHTML += `<div class="job-attachment"><a href="${BACKEND_URL}${job.attachment}" target="_blank">📄 View File</a></div>`;
        if (job.link) attachmentHTML += `<div class="job-attachment"><a href="${job.link}" target="_blank">🔗 View Link</a></div>`;

        let actionButtonHTML = '';
        if (appState.currentUser) {
            if (isMyJob) {
                actionButtonHTML = `<button class="btn btn-secondary" onclick="viewQuotes('${job.id}')">View Quotes</button> <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete</button>`;
            } else if (appState.currentUser.role === 'designer') {
                actionButtonHTML = `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`;
            }
        } else {
            actionButtonHTML = `<button class="btn btn-secondary" onclick="showSection('login')">Sign In to Quote</button>`;
        }
        
        jobCard.innerHTML = `
            <div class="job-header"><h3>${job.title}</h3><div class="job-budget">${job.budget}</div></div>
            <p class="job-description">${job.description}</p>
            ${attachmentHTML}
            <div class="job-actions">${actionButtonHTML}</div>`;
        jobsList.appendChild(jobCard);
    });
}

function renderMyQuotes() {
    const myQuotesList = document.getElementById('my-quotes-list');
    myQuotesList.innerHTML = '';
    if (appState.myQuotes.length === 0) {
        myQuotesList.innerHTML = `<div class="empty-state"><h3>You haven't submitted any quotes.</h3></div>`;
        return;
    }
    appState.myQuotes.forEach(quote => {
        const job = appState.jobs.find(j => j.id === quote.jobId);
        const quoteCard = document.createElement('div');
        quoteCard.className = 'quote-card';
        const attachmentHTML = quote.attachment ? `<div class="job-attachment"><a href="${BACKEND_URL}${quote.attachment}" target="_blank">📄 View My Attachment</a></div>` : '';
        quoteCard.innerHTML = `
            <div class="quote-header"><div><h4>Quote for: ${job?.title || 'Job not found'}</h4><div class="quote-amount">$${quote.amount}</div></div><div class="quote-status ${quote.status}">${quote.status}</div></div>
            <p>${quote.description}</p>
            ${attachmentHTML}
            <div class="job-actions"><button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">Delete Quote</button></div>`;
        myQuotesList.appendChild(quoteCard);
    });
}

// --- ACTIONS (CREATE, DELETE, UPDATE) ---
async function handlePostJob(event) {
    event.preventDefault();
    // FIXED: Added a check to ensure user is logged in
    if (!appState.currentUser) {
        return showAlert('You must be logged in to post a job.', 'error');
    }

    const form = event.target;
    const fileInput = form.querySelector('#jobAttachmentFile');
    const file = fileInput.files[0];

    let attachmentPath = '';
    if (file) {
        const formData = new FormData();
        formData.append('document', file);
        try {
            showAlert('Uploading file...', 'info');
            const response = await fetch(`${BACKEND_URL}/uploads/job`, { method: 'POST', body: formData });
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

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted successfully!', fetchJobs);
    }
}
async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully!', fetchMyQuotes);
    }
}
async function approveQuote(quoteId) {
    if (confirm('Approve this quote? All others for this job will be rejected.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', null, 'Quote approved!', () => {
            closeModal();
            fetchJobs();
        });
    }
}

// --- MODALS ---
async function viewQuotes(jobId) {
    await apiCall(`/quotes/job/${jobId}`, 'GET', null, null, (quotes) => {
        const modalContainer = document.getElementById('modal-container');
        let quotesHTML = '<h3>Received Quotes</h3>';
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><p>No quotes yet.</p></div>`;
        } else {
            quotes.forEach(quote => {
                const attachmentHTML = quote.attachment ? `<div class="job-attachment"><a href="${BACKEND_URL}${quote.attachment}" target="_blank">📄 View Attachment</a></div>` : '';
                quotesHTML += `
                    <div class="quote-card">
                        <p><strong>From:</strong> ${quote.quoterName} | <strong>Amount:</strong> $${quote.amount}</p>
                        <p>${quote.description}</p>
                        ${attachmentHTML}
                        <div class="job-actions">
                            ${quote.status === 'pending' ? `<button class="btn btn-primary" onclick="approveQuote('${quote.id}')">Approve</button>` : `<span class="quote-status ${quote.status}">${quote.status}</span>`}
                            <button class="btn btn-secondary" onclick="openMessageModal('${quote.quoterId}')">Message</button>
                        </div>
                    </div>`;
            });
        }
        modalContainer.innerHTML = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">✕</button>${quotesHTML}</div></div>`;
    });
}

function showQuoteModal(jobId) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()">
            <button class="modal-close-button" onclick="closeModal()">✕</button>
            <h3>Submit Your Quote</h3>
            <form id="quote-form" class="form-grid">
                <div class="form-group"><label class="form-label">Quote Amount ($)</label><input type="number" class="form-input" id="quoteAmount" required></div>
                <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="quoteDescription" required></textarea></div>
                <div class="form-group"><label class="form-label">Attach Quotation (PDF/Word)</label><input type="file" class="form-input" id="quoteAttachmentFile"></div>
                <button type="submit" class="btn btn-primary">Submit Quote</button>
            </form>
        </div></div>`;
    document.getElementById('quote-form').addEventListener('submit', (e) => handleQuoteSubmit(e, jobId));
}

async function handleQuoteSubmit(event, jobId) {
    event.preventDefault();
    // FIXED: Added a check to ensure user is logged in
    if (!appState.currentUser) {
        return showAlert('You must be logged in to submit a quote.', 'error');
    }
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

function openMessageModal(recipientId) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()">
            <button class="modal-close-button" onclick="closeModal()">✕</button>
            <h3>Send a Message</h3>
            <form id="message-form" class="form-grid">
                <div class="form-group"><label>Message</label><textarea id="messageText" class="form-textarea" required></textarea></div>
                <button type="submit" class="btn btn-primary">Send</button>
            </form>
        </div></div>`;
    document.getElementById('message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showAlert('Message sent! (DEMO)', 'success');
        closeModal();
    });
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
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
    if (sectionId === 'quotes') {
        fetchMyQuotes();
    }
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
        const options = { method, headers: {} };
        if (body) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        if (!response.ok) {
            // Try to parse error json, fallback to status text
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                throw new Error(response.statusText);
            }
            throw new Error(errorData.error || response.statusText);
        }
        // Handle cases where there is no JSON body in the response (e.g., DELETE)
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const data = await response.json();
            if (successMessage) showAlert(successMessage, 'success');
            if (callback) callback(data);
        } else {
            if (successMessage) showAlert(successMessage, 'success');
            if (callback) callback();
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}