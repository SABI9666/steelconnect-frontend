document.addEventListener('DOMContentLoaded', initializeApp);

// --- GLOBAL STATE & CONSTANTS ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com'; // Your live backend URL
const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: []
};

// --- INITIALIZATION ---
function initializeApp() {
    // Attach Event Listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    document.getElementById('logout-button').addEventListener('click', logout);
    
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
    
    fetchJobs(); // Fetch initial list of jobs
}

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

    try {
        const response = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration failed.');

        showAlert('Registration successful! Please sign in.', 'success');
        showSection('login');
        form.reset();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = {
        email: form.querySelector('#loginEmail').value,
        password: form.querySelector('#loginPassword').value,
    };

    try {
        const response = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(authData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Login failed.');

        // NOTE: The backend needs to return a JWT token for a complete solution
        // For now, we'll simulate a token and save the user
        appState.currentUser = data.user;
        appState.jwtToken = 'fake-jwt-token'; // Replace with data.token when backend sends it
        
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', appState.jwtToken);

        showAlert('Login successful!', 'success');
        updateUIForLoggedInUser();
        fetchJobs();
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('jwtToken');
    updateUIForLoggedOutUser();
    showAlert('You have been logged out.', 'info');
}

// --- JOB DATA FUNCTIONS ---
async function fetchJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
    
    try {
        // This endpoint must exist on your backend.
        // For now, let's assume it doesn't and use sample data.
        // const response = await fetch(`${BACKEND_URL}/jobs`);
        // if (!response.ok) throw new Error('Could not fetch jobs.');
        // appState.jobs = await response.json();
        
        // --- USING SAMPLE DATA since /jobs endpoint is not implemented ---
        appState.jobs = [
            { id: 1, title: 'Structural Design for a Commercial Warehouse', description: 'Seeking an experienced structural engineer to design the steel framework for a 50,000 sq ft warehouse.'},
            { id: 2, title: 'Rebar Detailing for High-Rise Foundation', description: 'We require detailed rebar drawings for a 30-story building foundation. Experience with Tekla Structures is mandatory.' }
        ];
        // --- END SAMPLE DATA ---

        renderJobs();
    } catch (error) {
        jobsList.innerHTML = `<div class="empty-state"><p>Error loading jobs: ${error.message}</p></div>`;
    }
}

function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = ''; 

    if (appState.jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗂️</div>
                <h3>No Jobs Found</h3>
                <p>There are currently no open jobs.</p>
            </div>
        `;
        return;
    }

    appState.jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <h3 class="job-title">${job.title}</h3>
            <p class="job-description">${job.description}</p>
            <div class="job-actions">
                ${appState.currentUser && appState.currentUser.role === 'designer' ? '<button class="btn btn-primary">Submit Quote</button>' : ''}
                ${!appState.currentUser ? '<button class="btn btn-secondary" onclick="showSection(\'login\')">Sign In to Quote</button>' : ''}
            </div>
        `;
        jobsList.appendChild(jobCard);
    });
}

async function handlePostJob(event) {
    event.preventDefault();
    if (!appState.currentUser || !appState.jwtToken) {
        return showAlert('You must be logged in to post a job.', 'error');
    }

    const form = event.target;
    const jobData = {
        title: form.querySelector('#jobTitle').value,
        description: form.querySelector('#jobDescription').value,
    };

    try {
        // This endpoint must exist on your backend and require a token
        // const response = await fetch(`${BACKEND_URL}/jobs`, {
        //     method: 'POST',
        //     headers: { 
        //         'Content-Type': 'application/json',
        //         'Authorization': `Bearer ${appState.jwtToken}` 
        //     },
        //     body: JSON.stringify(jobData),
        // });
        // const newJob = await response.json();
        // if (!response.ok) throw new Error(newJob.error || 'Failed to post job.');

        showAlert('Job posted successfully! (DEMO)', 'success');
        form.reset();
        fetchJobs(); 
        showSection('jobs');
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

// --- UI AND NAVIGATION HELPERS ---
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if(activeLink) activeLink.classList.add('active');
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

function updateUIForLoggedInUser() {
    const user = appState.currentUser;
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('hero-section').style.display = 'none';

    document.getElementById('userName').textContent = user.fullName;
    document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('userAvatar').textContent = user.fullName.charAt(0).toUpperCase();

    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `
        <button class="nav-link" data-section="jobs" onclick="showSection('jobs')">Find Jobs</button>
        ${user.role === 'contractor' ? `<button class="nav-link" data-section="post-job" onclick="showSection('post-job')">Post Job</button>` : ''}
        <button class="nav-link" data-section="quotes" onclick="showSection('quotes')">My Quotes</button>
    `;
    showSection('jobs');
}

function updateUIForLoggedOutUser() {
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('hero-section').style.display = 'block';

    document.getElementById('auth-buttons-container').innerHTML = `
        <button class="btn btn-outline" onclick="showSection('login')">Sign In</button>
        <button class="btn btn-primary" onclick="showSection('register')">Join Now</button>
    `;
    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `<button class="nav-link" data-section="jobs" onclick="showSection('jobs')">Find Jobs</button>`;
    showSection('jobs');
}