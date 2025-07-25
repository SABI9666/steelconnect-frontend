document.addEventListener('DOMContentLoaded', initializeApp);

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = { currentUser: null, jwtToken: null, jobs: [], quotes: {} };

function initializeApp() {
    // ... (Event listeners are the same) ...
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

// --- AUTHENTICATION (No changes needed) ---
// handleRegister, handleLogin, logout functions are the same as before

// --- JOB DATA & RENDERING (UPDATED) ---
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

        // FIXED: Attachment link now includes the backend URL
        let attachmentHTML = '';
        if (job.attachment) {
            attachmentHTML = `<div class="job-attachment"><a href="${BACKEND_URL}${job.attachment}" target="_blank">View File Attachment</a></div>`;
        } else if (job.link) {
            attachmentHTML = `<div class="job-attachment"><a href="${job.link}" target="_blank">View Link Attachment</a></div>`;
        }

        let actionButtonHTML = '';
        if (appState.currentUser) {
            if (isMyJob) {
                // If it's the contractor's own job, show "View Quotes"
                actionButtonHTML = `<button class="btn btn-secondary" onclick="viewQuotes('${job.id}')">View Quotes</button>`;
            } else if (appState.currentUser.role === 'designer') {
                // If it's a designer, show "Submit Quote"
                actionButtonHTML = `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`;
            }
        } else {
            // If logged out, show "Sign In" button
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

// handlePostJob is the same as before

// --- QUOTE MODAL & SUBMISSION (UPDATED) ---
// showQuoteModal is the same as before

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

    // FIXED: Now calls the real /quotes endpoint
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

// --- UI & UTILITY FUNCTIONS (No changes needed) ---
// closeModal, updateUI..., showSection, showAlert, apiCall are the same as before