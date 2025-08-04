// SteelConnect Premium Portal - Professional Script

document.addEventListener('DOMContentLoaded', initializeApp);

// --- A. STATE & CONSTANTS ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: [],
};
let inactivityTimer;
let carouselInterval;

// --- B. INITIALIZATION & CORE APP FLOW ---

function initializeApp() {
    console.log("SteelConnect Premium App Initializing...");
    setupEventListeners();
    checkSession();
}

function setupEventListeners() {
    // Inactivity listeners
    ['mousemove', 'keydown', 'click'].forEach(evt => window.addEventListener(evt, resetInactivityTimer, false));
    
    // UI listeners
    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));
    document.getElementById('logout-button')?.addEventListener('click', logout);
    document.querySelector('.logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('jobs');
        } else {
            showLandingPageView();
        }
    });
}

function checkSession() {
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
            resetInactivityTimer();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
}

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 300000); // 5 minutes
}

// --- C. VIEW MANAGEMENT ---

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    
    updateUserInfo();
    buildSidebarNav();
    renderAppSection('jobs');
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    // Dynamically create landing page if it doesn't exist for SPA feel
    if (!document.getElementById('hero-section')) {
        const landingPage = document.getElementById('landing-page-content');
        landingPage.innerHTML = getLandingPageTemplate();
         // Re-attach listener for the dynamically added button
        document.getElementById('get-started-btn')?.addEventListener('click', () => showAuthModal('register'));
    }
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    const userRole = appState.currentUser.type;
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Premium Project Opportunities' : 'Premium Project Dashboard';
        const subtitle = userRole === 'designer' ? 'Exclusive high-value projects' : 'Manage your premium project portfolio';
        
        let dashboardHTML = '';
        if (userRole === 'contractor') {
            dashboardHTML = getWelcomeDashboardTemplate(appState.currentUser.name);
        }

        container.innerHTML = `
            ${dashboardHTML} 
            <div class="section-header" style="margin-top: ${userRole === 'contractor' ? '48px' : '0'};">
                <h2>${title}</h2>
                <p class="header-subtitle">${subtitle}</p>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>`;
        
        if (userRole === 'contractor') {
            initializeWelcomeCarousel();
        }
        fetchAndRenderJobs();
    }
    // Implement other sections like 'post-job', 'my-quotes' etc. here
}

function updateUserInfo() {
    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = user.type + ' - Premium';
    document.getElementById('userAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type + ' - Premium';
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    const links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i> <span>Premium Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Proposals</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-crown fa-fw"></i> <span>Premium Dashboard</span></a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i> <span>Active Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post Project</span></a>`;
    
    navContainer.innerHTML = links + `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>VIP Messages</span></a>`;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

// --- D. API & DATA HANDLING ---

async function apiCall(endpoint, method, body = null) {
    // This is a placeholder for your actual API call logic.
    // To make this demonstration work without a backend, we return mock data.
    console.log(`Mock API Call: ${method} ${endpoint}`);
    if (endpoint.includes('/jobs')) {
        return getMockJobs();
    }
    return { success: true, data: {} };
}

async function fetchAndRenderJobs() {
    const jobsListContainer = document.getElementById('jobs-list');
    jobsListContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading premium projects...</p></div>`;
    
    try {
        const response = await apiCall('/jobs', 'GET');
        appState.jobs = response.data;

        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = `<div class="empty-state"><h3>No Premium Projects Found</h3><p>Check back soon for exclusive opportunities.</p></div>`;
            return;
        }

        jobsListContainer.innerHTML = appState.jobs.map(getJobCardTemplate).join('');
    } catch (error) {
        jobsListContainer.innerHTML = `<div class="empty-state"><h3>Error Loading Projects</h3><p>Please try again later.</p></div>`;
        console.error("Failed to fetch jobs:", error);
    }
}

// --- E. AUTHENTICATION ---

async function handleLogin(event) {
    event.preventDefault();
    // This is a mock login for demonstration.
    const form = event.target;
    const email = form.loginEmail.value;
    const name = email.split('@')[0].replace(/\./g, ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

    appState.currentUser = { name, email, type: 'contractor' }; // Default to contractor for demo
    appState.jwtToken = 'mock-premium-token';
    localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));
    localStorage.setItem('jwtToken', appState.jwtToken);
    
    showNotification(`Welcome back, ${name}!`, 'success');
    closeModal();
    showAppView();
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out.', 'info');
}

// --- F. PREMIUM CAROUSEL LOGIC ---

function initializeWelcomeCarousel() {
    const carousel = document.querySelector('.welcome-carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.action-card');
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'carousel-dots';
    carousel.appendChild(dotsContainer);

    let currentSlideIndex = 0;
    if (slides.length <= 1) return;

    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.addEventListener('click', () => {
            goToCarouselSlide(index);
            resetCarouselInterval();
        });
        dotsContainer.appendChild(dot);
    });
    
    const dots = dotsContainer.querySelectorAll('.dot');

    function goToCarouselSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        currentSlideIndex = index;
        slides[currentSlideIndex].classList.add('active');
        dots[currentSlideIndex].classList.add('active');
    }

    function nextSlide() {
        goToCarouselSlide((currentSlideIndex + 1) % slides.length);
    }

    function startCarousel() {
        clearInterval(carouselInterval);
        carouselInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    function resetCarouselInterval() {
        clearInterval(carouselInterval);
        startCarousel();
    }

    carousel.addEventListener('mouseenter', () => clearInterval(carouselInterval));
    carousel.addEventListener('mouseleave', startCarousel);

    goToCarouselSlide(0);
    startCarousel();
}

// --- G. UI COMPONENTS & MODALS ---

function showAuthModal(view) {
    const modalContent = view === 'login' ? getPremiumLoginTemplate() : getPremiumRegisterTemplate();
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content"><button class="modal-close-button" onclick="closeModal()">&times;</button>${modalContent}</div>`;
    
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = ''; // Clear previous modals
    modalContainer.appendChild(modal);

    modal.addEventListener('click', closeModal, { once: true });
    modal.querySelector('.modal-content').addEventListener('click', e => e.stopPropagation());
    
    document.getElementById(view === 'login' ? 'login-form' : 'register-form').addEventListener('submit', handleLogin); // Mocked for now
}


function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('alerts-container');
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.innerHTML = `<span>${message}</span>`;
    container.appendChild(notification);
    setTimeout(() => notification.remove(), duration);
}

// --- H. TEMPLATE GENERATORS ---

function getWelcomeDashboardTemplate(userName) {
    return `
    <div class="welcome-dashboard">
        <div class="welcome-header">
            <h2>Welcome to SteelConnect Premium, ${userName}</h2>
            <p>Experience the ultimate in professional steel construction services</p>
        </div>
        <div class="welcome-carousel">
            <div class="action-card" onclick="renderAppSection('post-job')">
                <div class="action-card-icon"><i class="fas fa-rocket"></i></div>
                <div class="action-card-content">
                    <h3>Launch Premium Project</h3>
                    <p>Access top-tier talent with priority matching and dedicated support.</p>
                </div>
            </div>
            <div class="action-card" onclick="renderAppSection('jobs')">
                <div class="action-card-icon"><i class="fas fa-chart-line"></i></div>
                <div class="action-card-content">
                    <h3>Project Analytics</h3>
                    <p>Advanced insights and performance metrics for your projects.</p>
                </div>
            </div>
            <div class="action-card" onclick="renderAppSection('approved-jobs')">
                <div class="action-card-icon"><i class="fas fa-shield-alt"></i></div>
                <div class="action-card-content">
                    <h3>Active Collaborations</h3>
                    <p>Work directly with certified professionals on approved projects.</p>
                </div>
            </div>
            <div class="action-card" onclick="renderAppSection('messages')">
                <div class="action-card-icon"><i class="fas fa-concierge-bell"></i></div>
                <div class="action-card-content">
                    <h3>Concierge Support</h3>
                    <p>24/7 premium support and direct communication with your team.</p>
                </div>
            </div>
        </div>
    </div>`;
}

function getJobCardTemplate(job) {
    return `
    <div class="job-card" data-job-id="${job.id}">
        <div class="job-header">
            <div class="job-title-section">
                <h3>${job.title}</h3>
                <span class="job-status-badge open"><i class="fas fa-star"></i> Premium Open</span>
            </div>
            <div class="job-budget-section">
                <span class="budget-label">Premium Budget</span>
                <span class="budget-amount">${job.budget}</span>
            </div>
        </div>
        <div class="job-meta">
            <div class="job-meta-item"><i class="fas fa-building"></i> <span>Client: <strong>${job.posterName}</strong></span></div>
            <div class="job-meta-item"><i class="fas fa-calendar-alt"></i> <span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>
        </div>
        <div class="job-description">
            <p>${job.description}</p>
        </div>
        <div class="job-actions">
            <button class="btn btn-premium" onclick="viewQuotes('${job.id}')">
                <i class="fas fa-eye"></i> View Proposals (${job.quotesCount || 0})
            </button>
        </div>
    </div>`;
}

function getPremiumLoginTemplate() {
    return `<div class="auth-header"><h2><i class="fas fa-crown"></i> Premium Access</h2><p>Sign in to your account</p></div><form id="login-form"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="loginEmail" required value="premium.client@example.com"></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="loginPassword" required value="password"></div><button type="submit" class="btn btn-premium">Access Dashboard</button></form>`;
}

function getPremiumRegisterTemplate() {
    return `<div class="auth-header"><h2><i class="fas fa-star"></i> Join Premium</h2><p>Create your exclusive account</p></div><form id="register-form"><div class="form-group"><label class="form-label">Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="regPassword" required></div><button type="submit" class="btn btn-premium">Create Premium Account</button></form>`;
}

function getLandingPageTemplate() {
    // Returns a simplified version of your landing page for SPA context.
    return `<main><section class="hero" id="hero-section"><div class="hero-background"></div><div class="hero-content"><div class="hero-text"><h1>SteelConnect: The <span class="highlight">Premium Platform</span> for Elite Contractors</h1><p>Join the exclusive marketplace where premium contractors connect with world-class steel designers and structural engineers.</p><div class="hero-cta"><button id="get-started-btn" class="btn btn-premium">Start Premium Journey <i class="fas fa-crown"></i></button></div></div></div></section></main>`;
}

function getMockJobs() {
    // Mock data for demonstration purposes
    return {
        success: true,
        data: [
            { id: '1', title: 'Premium Steel Framework for Luxury Resort', description: 'Design and engineer steel framework for a 5-star luxury resort complex. Requires expertise in seismic engineering and aesthetic integration.', budget: '$75,000 - $125,000', posterName: 'Elite Construction Group', deadline: '2025-12-31', quotesCount: 8 },
            { id: '2', title: 'High-Rise Commercial Tower Structural Design', description: 'Complete structural steel design for 45-story commercial tower in downtown financial district. Premium materials and cutting-edge engineering required.', budget: '$200,000 - $300,000', posterName: 'Metropolitan Developers', deadline: '2026-01-15', quotesCount: 12 },
        ]
    };
}