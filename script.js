document.addEventListener('DOMContentLoaded', initializeApp);

const BACKEND_URL = 'http://localhost:3000/api'; // Ensure this matches your backend port
const appState = { currentUser: null, jwtToken: null, jobs: [] };

function initializeApp() {
    // Attach persistent listeners
    document.getElementById('signin-btn').addEventListener('click', () => showSection('login'));
    document.getElementById('join-btn').addEventListener('click', () => showSection('register'));
    document.getElementById('logout-button').addEventListener('click', logout);
    document.querySelector('.logo').addEventListener('click', (e) => { e.preventDefault(); showSection('jobs'); });

    // Populate static form templates once
    document.getElementById('login-form').innerHTML = getLoginTemplate();
    document.getElementById('register-form').innerHTML = getRegisterTemplate();
    document.getElementById('post-job-form').innerHTML = getPostJobTemplate();
    
    // Attach form submission listeners
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    
    // Check for existing session
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        appState.jwtToken = token;
        appState.currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

// --- AUTHENTICATION & UI ---
async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const authData = { email: form.email.value, password: form.password.value };
    await apiCall('/auth/login', 'POST', authData, 'Login successful!', (data) => {
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        updateUIForLoggedInUser();
        form.reset();
    });
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const userData = { fullName: form.fullName.value, email: form.email.value, password: form.password.value, role: form.role.value };
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please log in.', () => {
        form.reset();
        showSection('login');
    });
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    updateUIForLoggedOutUser();
    showAlert('You have been logged out.');
}

function updateUIForLoggedInUser() {
    const user = appState.currentUser;
    document.getElementById('user-profile').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    const navMenu = document.getElementById('main-nav-menu');
    let navLinks = `<button class="nav-link" onclick="showSection('jobs')">All Jobs</button>`;
    if (user.role === 'contractor') navLinks += `<button class="nav-link" onclick="showSection('post-job')">Post Job</button>`;
    navMenu.innerHTML = navLinks;
    document.getElementById('userName').textContent = user.fullName;
    showSection('jobs');
}

function updateUIForLoggedOutUser() {
    document.getElementById('user-profile').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('main-nav-menu').innerHTML = '';
    showSection('jobs');
}

function showSection(sectionId) {
    document.querySelectorAll('main > div').forEach(s => s.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    if (sectionId === 'jobs') fetchJobs();
}

// --- DATA HANDLING & ACTIONS ---
async function fetchJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = `<h3>Loading Jobs...</h3>`;
    await apiCall('/jobs', 'GET', null, null, (response) => {
        appState.jobs = response.data;
        renderJobs();
    });
}

async function handlePostJob(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form); // Use FormData to easily handle file and text fields
    
    // No need for a separate upload step with this backend structure
    // The file and text fields are sent together
    await apiCall('/jobs', 'POST', formData, 'Job posted successfully!', () => {
        form.reset();
        showSection('jobs');
    });
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job?')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted successfully!', fetchJobs);
    }
}

function renderJobs() {
    const jobsList = document.getElementById('jobs-list');
    jobsList.innerHTML = '';
    if (!appState.jobs || appState.jobs.length === 0) {
        jobsList.innerHTML = `<h3>No jobs found.</h3>`;
        return;
    }
    appState.jobs.forEach(job => {
        const isMyJob = appState.currentUser?.id === job.posterId;
        let attachmentHTML = '';
        if (job.attachment) attachmentHTML += `<div class="job-attachment"><a href="${job.attachment}" target="_blank">📄 View Attachment</a></div>`;
        if (job.link) attachmentHTML += `<div class="job-attachment"><a href="${job.link}" target="_blank">🔗 View Link</a></div>`;

        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <div class="job-header"><h3>${job.title}</h3><div class="job-budget">$${job.budget}</div></div>
            <p>${job.description || ''}</p>
            ${attachmentHTML}
            <div class="job-actions">
                ${isMyJob ? `<button class="btn" onclick="deleteJob('${job.id}')">Delete</button>` : `<button class="btn btn-primary">Submit Quote</button>`}
            </div>
        `;
        jobsList.appendChild(jobCard);
    });
}

// --- UTILITIES ---
async function apiCall(endpoint, method, body, successMessage, callback) {
    try {
        const options = { method, headers: {} };
        if (appState.jwtToken) options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        
        if (body) {
            if (body instanceof FormData) {
                // Let the browser set the Content-Type for FormData
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        
        const response = await fetch(BACKEND_URL + endpoint, options);
        const data = await response.json();
        
        if (!response.ok || !data.success) throw new Error(data.message || 'An API error occurred.');
        
        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(data);
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alerts-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'success' ? 'alert-success' : 'alert-error'}`;
    alertDiv.textContent = message;
    container.prepend(alertDiv);
    setTimeout(() => alertDiv.remove(), 4000);
}

// --- HTML TEMPLATES ---
function getLoginTemplate() {
    return `<h2>Sign In</h2>
            <div class="form-group"><label>Email</label><input type="email" name="email" class="form-input" required></div>
            <div class="form-group"><label>Password</label><input type="password" name="password" class="form-input" required></div>
            <button type="submit" class="btn btn-primary">Login</button>`;
}

function getRegisterTemplate() {
    return `<h2>Create an Account</h2>
            <div class="form-group"><label>Full Name</label><input type="text" name="fullName" class="form-input" required></div>
            <div class="form-group"><label>Email</label><input type="email" name="email" class="form-input" required></div>
            <div class="form-group"><label>Password (min. 6 chars)</label><input type="password" name="password" class="form-input" minlength="6" required></div>
            <div class="form-group"><label>I am a...</label><select name="role" class="form-select" required><option value="contractor">Contractor</option><option value="designer">Designer</option></select></div>
            <button type="submit" class="btn btn-primary">Register</button>`;
}

function getPostJobTemplate() {
    return `<h2>Post a New Job</h2>
            <div class="form-group"><label>Title</label><input type="text" name="title" class="form-input" required></div>
            <div class="form-group"><label>Description</label><textarea name="description" class="form-textarea"></textarea></div>
            <div class="form-group"><label>Budget ($)</label><input type="number" name="budget" class="form-input" required></div>
            <div class="form-group"><label>Link to Specs</label><input type="url" name="link" class="form-input" placeholder="https://..."></div>
            <div class="form-group"><label>Attach File (PDF/Word)</label><input type="file" name="attachment" class="form-input"></div>
            <button type="submit" class="btn btn-primary">Submit Job</button>`;
}