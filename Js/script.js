document.addEventListener('DOMContentLoaded', initializeApp);

// --- GLOBAL STATE & CONSTANTS ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = {
    currentUser: null,
    jobs: []
};

// --- INITIALIZATION ---
function initializeApp() {
    // Event Listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    document.getElementById('logout-button').addEventListener('click', logout);
    document.getElementById('demo-contractor-btn').addEventListener('click', () => fillDemoCredentials('contractor'));
    document.getElementById('demo-designer-btn').addEventListener('click', () => fillDemoCredentials('designer'));
    
    // Check for logged-in user (simple version)
    // In a real app, you would verify the JWT token with the backend
    if (localStorage.getItem('currentUser')) {
        appState.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
    
    showSection('jobs');
    fetchJobs();
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

        appState.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        // In a real app with tokens: localStorage.setItem('jwtToken', data.token);

        showAlert('Login successful!', 'success');
        updateUIForLoggedInUser();
        fetchJobs(); // Re-fetch jobs to show relevant actions
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function logout() {
    appState.currentUser = null;
    localStorage.removeItem('currentUser');
    // localStorage.removeItem('jwtToken');
    updateUIForLoggedOutUser();
    showAlert('You have been logged out.', 'info');
    fetchJobs(); // Re-fetch public job list
}

function fillDemoCredentials(type) {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if(type === 'contractor') {
        emailInput.value = 'contractor@demo.com';
        passwordInput.value = 'password123';
    } else {
        emailInput.value = 'designer@demo.com';
        passwordInput.value = 'password123';
    }
    // Automatically submit the form
    document.getElementById('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// --- JOB DATA FUNCTIONS ---
async function fetchJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '<div class="spinner-container" style="padding: 50px; text-align: center;"><div class="spinner"></div></div>';
    
    try {
        // This endpoint needs to exist on your backend and should not require authentication
        // For now, we use sample data since the backend endpoint isn't created yet.
        // const response = await fetch(`${BACKEND_URL}/jobs`);
        // if (!response.ok) throw new Error('Could not fetch jobs.');
        // appState.jobs = await response.json();
        
        // --- USING SAMPLE DATA ---
        appState.jobs = [
            { id: 1, title: 'Structural Design for a Commercial Warehouse', description: 'Seeking an experienced structural engineer to design the steel framework for a 50,000 sq ft warehouse. Must be proficient in STAAD.Pro and familiar with local building codes.', budget: '15000-20000', type: 'structural', skills: ['STAAD.Pro', 'AISC', 'Structural Engineering'] },
            { id: 2, title: 'Rebar Detailing for High-Rise Foundation', description: 'We require detailed rebar drawings for a 30-story building foundation. Experience with Tekla Structures is mandatory.', budget: '8000-12000', type: 'rebar', skills: ['Tekla Structures', 'Rebar Detailing', 'ACI 318'] }
        ];
        // --- END SAMPLE DATA ---

        renderJobs();
    } catch (error) {
        jobsList.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = ''; // Clear spinner or old content

    if (appState.jobs.length === 0) {
        jobsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗂️</div>
                <h3>No Jobs Found</h3>
                <p>There are currently no open jobs. Check back later or post a new job if you're a contractor.</p>
            </div>
        `;
        return;
    }

    appState.jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <div class="job-header">
                <div>
                    <h3 class="job-title">${job.title}</h3>
                    <span class="job-type">${job.type}</span>
                </div>
                <div class="job-budget">$${job.budget}</div>
            </div>
            <p class="job-description">${job.description}</p>
            <div class="job-skills">
                ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
            </div>
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
    const form = event.target;
    const jobData = {
        title: form.querySelector('#jobTitle').value,
        description: form.querySelector('#jobDescription').value,
        // Add other fields like budget, type, skills as needed
    };

    if (!appState.currentUser) {
        showAlert('You must be logged in to post a job.', 'error');
        return;
    }

    try {
        // This endpoint needs to be created on your backend
        // const response = await fetch(`${BACKEND_URL}/jobs`, {
        //     method: 'POST',
        //     headers: { 
        //         'Content-Type': 'application/json',
        //         // 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` 
        //     },
        //     body: JSON.stringify(jobData),
        // });
        // const newJob = await response.json();
        // if (!response.ok) throw new Error(newJob.error || 'Failed to post job.');

        showAlert('Job posted successfully! (DEMO)', 'success'); // Using demo alert for now
        form.reset();
        fetchJobs(); // Refresh the job list
        showSection('jobs');

    } catch (error) {
        showAlert(error.message, 'error');
    }
}


// --- UI AND NAVIGATION HELPERS ---
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    document.getElementById('hero-section').style.display = 'none';
    document.getElementById(`${sectionId}-section`).style.display = 'block';

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[onclick*="'${sectionId}'"]`);
    if (activeLink) activeLink.classList.add('active');
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
}

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
    document.getElementById('hero-section').style.display = 'block';

    const navMenu = document.getElementById('main-nav-menu');
    navMenu.innerHTML = `<button class="nav-link" onclick="showSection('jobs')">Find Jobs</button>`;
    showSection('jobs');
}