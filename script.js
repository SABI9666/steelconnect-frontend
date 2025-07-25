document.addEventListener('DOMContentLoaded', initializeApp);

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = { currentUser: null, jwtToken: null, jobs: [] };

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
    if (appState.jobs.length === 0) {
        jobsList.innerHTML = `<div class="empty-state"><h3>No Jobs Found</h3><p>Check back later or post a new job.</p></div>`;
        return;
    }
    appState.jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        const skillsHTML = (job.skills || []).map(skill => `<span class="skill-tag">${skill}</span>`).join('');
        jobCard.innerHTML = `
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <div class="job-meta"><span>Posted by ${job.posterName || 'A Contractor'}</span></div>
                </div>
                <div class="job-budget">${job.budget}</div>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-skills">${skillsHTML}</div>
            <div class="job-actions">
                ${appState.currentUser?.role === 'designer' ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>` : ''}
                ${!appState.currentUser ? `<button class="btn btn-secondary" onclick="showSection('login')">Sign In to Quote</button>` : ''}
            </div>
        `;
        jobsList.appendChild(jobCard);
    });
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const jobData = {
        title: form.querySelector('#jobTitle').value,
        description: form.querySelector('#jobDescription').value,
        budget: form.querySelector('#jobBudget').value,
        deadline: form.querySelector('#jobDeadline').value,
        skills: form.querySelector('#jobSkills').value.split(',').map(s => s.trim()).filter(Boolean),
        userId: appState.currentUser.id,
        userFullName: appState.currentUser.fullName,
    };
    await apiCall('/jobs', 'POST', jobData, 'Job posted successfully!', () => {
        form.reset();
        fetchJobs();
        showSection('jobs');
    });
}

// --- QUOTE MODAL ---
function showQuoteModal(jobId) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <button class="modal-close-button" onclick="closeModal()">✕</button>
                <h3>Submit Your Quote</h3>
                <form id="quote-form" class="form-grid">
                    <div class="form-group"><label class="form-label">Quote Amount ($)</label><input type="number" class="form-input" id="quoteAmount" required></div>
                    <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" id="quoteDescription" required></textarea></div>
                    <button type="submit" class="btn btn-primary">Submit</button>
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
    // In a real app, you would create a /quotes endpoint on the backend.
    // For now, we'll just show a success message.
    showAlert('Quote submitted successfully! (DEMO)', 'success');
    closeModal();
}

// --- UI & UTILITY FUNCTIONS ---
function updateUIForLoggedInUser() {
    const user = appState.currentUser;
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();
    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `
        <button class="nav-link" onclick="showSection('jobs')">Find Jobs</button>
        ${user.role === 'contractor' ? `<button class="nav-link" onclick="showSection('post-job')">Post Job</button>` : ''}
        <button class="nav-link" onclick="showSection('quotes')">My Quotes</button>
    `;
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
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) options.body = JSON.stringify(body);
        if (appState.jwtToken) options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        
        const response = await fetch(BACKEND_URL + endpoint, options);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Request failed with status ${response.status}`);
        
        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(data);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}