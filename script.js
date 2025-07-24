const RENDER_BACKEND_URL = 'https://steelconnect-backend.onrender.com';

// Global application state
const appState = {
    currentUser: null,
    jobs: [],
    quotes: [],
    tempJobAttachments: [],
    tempQuoteAttachments: []
};

// --- CORE UI AND NAVIGATION FUNCTIONS ---

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById('hero-section').style.display = 'none';

    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

function updateUIForLoggedInUser() {
    document.getElementById('user-profile').style.display = 'flex';
    document.querySelector('.auth-buttons').style.display = 'none';
    document.getElementById('hero-section').style.display = 'none';

    if (appState.currentUser) {
        const user = appState.currentUser;
        document.getElementById('userName').textContent = user.fullName || user.username;
        document.getElementById('userType').textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        const initials = (user.fullName || 'A').charAt(0).toUpperCase();
        document.getElementById('userAvatar').textContent = initials;
    }
    showSection('jobs');
}

function updateUIForLoggedOutUser() {
    document.getElementById('user-profile').style.display = 'none';
    document.querySelector('.auth-buttons').style.display = 'flex';
    document.getElementById('hero-section').style.display = 'block';
    showSection('jobs');
}

// --- AUTHENTICATION HANDLERS ---

async function handleRegister(event) {
    event.preventDefault();
    const fullName = document.getElementById('regName').value;
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regType').value;

    const userData = { fullName, username, email, password, role };

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
        showAlert('An error occurred during registration.', 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginIdentifier').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
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
        showAlert('An error occurred during login.', 'error');
    }
}

function logout() {
    appState.currentUser = null;
    localStorage.removeItem('jwtToken');
    updateUIForLoggedOutUser();
    showAlert('Logged out successfully!', 'info');
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgotPasswordEmail').value;
    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        const data = await response.json();
        showAlert(data.message, 'info');
    } catch (error) {
        showAlert('An error occurred. Please try again.', 'error');
    }
}

async function handleResetPassword(event) {
    event.preventDefault();
    const newPassword = document.getElementById('resetPasswordNew').value;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
        showAlert('No reset token found.', 'error');
        return;
    }

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword }),
        });
        const data = await response.json();
        if (response.ok) {
            showAlert('Password reset successfully! You can now sign in.', 'success');
            window.history.pushState({}, '', window.location.pathname);
            showSection('login');
        } else {
            showAlert(data.error || 'Password reset failed.', 'error');
        }
    } catch (error) {
        showAlert('An error occurred.', 'error');
    }
}

// --- DEMO AND DATA HANDLING ---

function fillDemoCredentials(type) {
    if (type === 'contractor') {
        document.getElementById('loginIdentifier').value = 'contractor_demo';
        document.getElementById('loginPassword').value = 'demo123';
    } else {
        document.getElementById('loginIdentifier').value = 'designer_demo';
        document.getElementById('loginPassword').value = 'demo123';
    }
    showAlert(`Demo credentials for ${type} filled. Click 'Sign In'.`, 'info');
}

// --- FILE AND LINK UPLOAD FUNCTIONS ---

async function uploadDocument() {
    // This function would handle file upload for the POST JOB form
    showAlert("File upload feature for jobs is in development.", "info");
}

async function addLink() {
    // This function would handle link adding for the POST JOB form
    showAlert("Add link feature for jobs is in development.", "info");
}

async function uploadQuoteDocument() {
    // This function would handle file upload for the SUBMIT QUOTE modal
    showAlert("File upload feature for quotes is in development.", "info");
}

async function addQuoteLink() {
    // This function would handle link adding for the SUBMIT QUOTE modal
    showAlert("Add link feature for quotes is in development.", "info");
}


// --- INITIALIZATION ---

function initializeApp() {
    // Attach event listeners to forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('forgot-password-form').addEventListener('submit', handleForgotPassword);
    document.getElementById('reset-password-form').addEventListener('submit', handleResetPassword);

    // Check for password reset token in URL
    const params = new URLSearchParams(window.location.search);
    if (params.has('token')) {
        showSection('reset-password');
    } else {
        // Check for existing login session
        const token = localStorage.getItem('jwtToken');
        if (token) {
            // For now, we just update the UI. A real app would verify the token.
            appState.currentUser = { token: token, fullName: "User", role: "user" }; // Dummy object
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    }
}

// Run the app after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);