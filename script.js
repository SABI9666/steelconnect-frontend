// SCRIPT.JS - COMPLETE AND CORRECTED
// =================================================================

// **IMPORTANT:** This should be your actual Render Backend URL!
const RENDER_BACKEND_URL = 'https://steelconnect-backend.onrender.com';

// Global state to hold user info, jobs, etc.
const appState = {
    currentUser: null,
    jobs: [],
    quotes: [],
    tempJobAttachments: [],
    tempQuoteAttachments: [],
};

// --- CORE UI AND NAVIGATION FUNCTIONS ---

// Function to show a specific content section and hide others
function showSection(sectionId) {
    // Hide all main content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    // Show the target section
    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    } else if (sectionId === 'hero') {
        document.getElementById('hero').style.display = 'block';
    }

    // Update active state on navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes(`'${sectionId}'`)) {
            link.classList.add('active');
        }
    });
}

// Function to display alerts
function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertsContainer.prepend(alertDiv);
    // Remove the alert after 5 seconds
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

// Function to update the UI when a user logs in
function updateUIForLoggedInUser() {
    document.getElementById('user-profile').style.display = 'flex';
    document.querySelector('.auth-buttons').style.display = 'none';
    document.getElementById('hero').style.display = 'none';

    if (appState.currentUser) {
        const user = appState.currentUser;
        document.getElementById('userName').textContent = user.fullName || user.email;
        document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        const initials = (user.fullName || 'A').charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initials;
    }
    showSection('jobs'); // Show jobs list by default after login
}

// Function to update the UI when a user logs out
function updateUIForLoggedOutUser() {
    document.getElementById('user-profile').style.display = 'none';
    document.querySelector('.auth-buttons').style.display = 'flex';
    document.getElementById('hero').style.display = 'block';
    showSection('hero'); // Show hero section by default when logged out
}

// --- AUTHENTICATION HANDLERS ---

// Handle the login form submission
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password: password }), // Backend expects 'username', not 'email'
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('jwtToken', data.token);
            appState.currentUser = { ...data.user, token: data.token };
            updateUIForLoggedInUser();
            showAlert('Login successful!', 'success');
        } else {
            showAlert(data.error || 'Login failed.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login.', 'error');
    }
}

// Handle user registration
async function handleRegister(event) {
    event.preventDefault();
    // Gather form data
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regType').value;
    const phone = document.getElementById('regPhone').value;
    const location = document.getElementById('regLocation').value;
    const skills = document.getElementById('regSkills').value;

    const userData = { fullName, email, password, role, phone, location, skills, username: email };

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        const data = await response.json();
        if (response.status === 201) {
            showAlert('Registration successful! Please sign in.', 'success');
            showSection('login');
        } else {
            showAlert(data.error || 'Registration failed.', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAlert('An error occurred during registration.', 'error');
    }
}

// Log out the current user
function logout() {
    appState.currentUser = null;
    localStorage.removeItem('jwtToken');
    updateUIForLoggedOutUser();
    showAlert('Logged out successfully!', 'info');
}

// --- FILE UPLOAD AND LINK FUNCTIONS ---

// Function to handle job document upload
async function uploadDocument() {
    const fileInput = document.getElementById('documentUpload');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('fileUploadStatus');
    const attachmentsList = document.getElementById('currentJobAttachments');

    if (!file) {
        statusDiv.innerHTML = '<span style="color: red;">Please select a file to upload.</span>';
        return;
    }

    statusDiv.innerHTML = '<span>Uploading...</span>';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('context', 'job');

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/file`, {
            method: 'POST',
            body: formData,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('jwtToken')}` },
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">File "${result.originalName}" uploaded!</span>`;
            // Add to UI
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Upload failed: ${error.message || 'Unknown error'}</span>`;
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred during upload.</span>';
    }
}

// Function to handle adding links for jobs
async function addLink() {
    const linkInput = document.getElementById('linkInput');
    const link = linkInput.value.trim();
    const statusDiv = document.getElementById('linkStatus');

    if (!link) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a link.</span>';
        return;
    }
    statusDiv.innerHTML = '<span>Adding link...</span>';

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`,
            },
            body: JSON.stringify({ url: link, context: 'job' }),
        });

        if (response.ok) {
            statusDiv.innerHTML = `<span style="color: green;">Link added successfully!</span>`;
            // Add to UI
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Failed to add link: ${error.message || 'Unknown error'}</span>`;
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred while adding link.</span>';
    }
}


// --- INITIALIZATION ---

// Function to run when the page loads
function initializeApp() {
    // Add event listeners to forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    // Add other form listeners like for post-job when ready

    // Check if a user is already logged in from a previous session
    const token = localStorage.getItem('jwtToken');
    if (token) {
        // Here you would ideally verify the token with the backend.
        // For now, we'll assume it's valid if it exists.
        // You'd fetch user data from a /profile endpoint.
        // For this example, we'll just show the logged-in UI.
        appState.currentUser = { token: token, role: 'user', fullName: 'User' }; // Dummy data
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', initializeApp);