ocument.addEventListener('DOMContentLoaded', initializeApp);

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

// --- AUTHENTICATION (No changes) ---
async function handleRegister(event) { /* ... same as before ... */ }
async function handleLogin(event) { /* ... same as before ... */ }
function logout() { /* ... same as before ... */ }

// --- DATA FETCHING & RENDERING (UPDATED) ---
async function fetchJobs() {
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
    if (appState.jobs.length === 0) {
        jobsList.innerHTML = `<div class="empty-state"><h3>No Jobs Found</h3></div>`;
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
            actionButtonHTML = `<button class="btn btn-secondary" onclick="showSection('login')">Sign In</button>`;
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
async function handlePostJob(event) { /* ... same as before ... */ }
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

function openMessageModal(recipientId) {
    // ... same placeholder message modal as before ...
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">✕</button><h3>Send a Message</h3><form id="message-form"><textarea id="messageText" required></textarea><button type="submit">Send</button></form></div></div>`;
    document.getElementById('message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showAlert('Message sent! (DEMO)', 'success');
        closeModal();
    });
}

// --- UNCHANGED FUNCTIONS ---