document.addEventListener('DOMContentLoaded', initializeApp);

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = { currentUser: null, jwtToken: null, jobs: [], myQuotes: [] };

function initializeApp() {
    // Event listeners are attached when UI is rendered
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

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    
    await apiCall('/auth/login', 'POST', authData, 'Login successful!', (data) => {
        // **FIX: Store the token received from the backend**
        appState.currentUser = data.user;
        appState.jwtToken = data.token; // <-- The crucial new line
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', appState.jwtToken); // <-- Save token
        
        updateUIForLoggedInUser();
        closeModal();
    });
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    updateUIForLoggedOutUser();
    showAlert('You have been logged out.', 'info');
    fetchJobs(); // Re-fetch jobs for public view
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

// ... other rendering functions ...

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

        // UPDATED: Show file/link attachments if they exist
        let attachmentHTML = '';
        if (appState.currentUser) {
            if (job.attachment) attachmentHTML += `<div class="job-attachment"><a href="${BACKEND_URL}${job.attachment}" target="_blank">📄 View File</a></div>`;
            if (job.link) attachmentHTML += `<div class="job-attachment"><a href="${job.link}" target="_blank">🔗 View Link</a></div>`;
        }
        
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
            <div class="job-header"><h3>${job.title}</h3><div class="job-budget">${job.budget}</div></div>
            <p class="job-description">${job.description}</p>
            ${attachmentHTML}
            <div class="job-actions">${actionButtonHTML}</div>`;
        jobsList.appendChild(jobCard);
    });
}


// --- ACTIONS (CREATE, DELETE, UPDATE) ---
async function handlePostJob(event) {
    event.preventDefault();
    if (!appState.currentUser) {
        return showAlert('You must be logged in to post a job.', 'error');
    }
    const form = event.target;
    const fileInput = form.querySelector('#jobAttachmentFile');
    const file = fileInput.files[0];
    let attachmentPath = '';

    // Step 1: If there's a file, upload it first
    if (file) {
        const formData = new FormData();
        formData.append('document', file);
        try {
            showAlert('Uploading file...', 'info');
            // Use apiCall to handle the upload, which will include the token
            const uploadData = await apiCall('/uploads/job', 'POST', formData);
            if (!uploadData || !uploadData.filePath) throw new Error('File path not returned from server.');
            attachmentPath = uploadData.filePath;
        } catch (error) {
            return showAlert(error.message, 'error');
        }
    }

    // Step 2: Create the job post with the file path
    const jobData = {
        title: form.querySelector('#jobTitle').value,
        description: form.querySelector('#jobDescription').value,
        budget: form.querySelector('#jobBudget').value,
        deadline: form.querySelector('#jobDeadline').value,
        skills: form.querySelector('#jobSkills').value.split(',').map(s => s.trim()).filter(Boolean),
        attachment: attachmentPath,
        link: form.querySelector('#jobAttachmentLink').value
    };
    
    // apiCall will automatically add the user ID from the token on the backend
    await apiCall('/jobs', 'POST', jobData, 'Job posted successfully!', () => {
        form.reset();
        fetchJobs();
        showSection('jobs');
    });
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job? This will also delete its attachment.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted successfully!', fetchJobs);
    }
}

// ... other action handlers like deleteQuote, approveQuote ...

// --- MODALS and UI ---

// Your modal functions (showAuthModal, showQuoteModal, etc.) remain the same.
// Your UI update functions (updateUIForLoggedInUser, etc.) also remain the same.

// --- API CALL ABSTRACTION (CRITICAL UPDATE) ---
/**
 * A generic function for making API calls to the backend.
 * FIX: It now correctly attaches the JWT Authorization header to all requests.
 */
async function apiCall(endpoint, method, body, successMessage, callback) {
    try {
        const options = { method, headers: {} };

        // **FIX: Automatically add the token to the Authorization header if it exists**
        if (appState.jwtToken) {
            options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        }

        if (body) {
            // If body is FormData, let the browser set the Content-Type
            if (body instanceof FormData) {
                options.body = body;
            } else {
                // Otherwise, it's JSON
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        
        const response = await fetch(BACKEND_URL + endpoint, options);
        const contentType = response.headers.get("content-type");
        let data;

        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await response.json();
        } else {
            // Handle cases where the response might not be JSON
            const text = await response.text();
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
        }

        if (!response.ok) {
            throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
        }
        
        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(data);
        return data; // Return data for promise-based handling

    } catch (error) {
        showAlert(error.message, 'error');
        // We throw the error so that the calling function knows the API call failed
        throw error; 
    }
}

// --- The rest of your UI, modal, and utility functions go here ---
// (No changes needed for them)