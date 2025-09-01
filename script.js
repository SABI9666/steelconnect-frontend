// === STEELCONNECT COMPLETE SCRIPT - PART 1 ===
// Core functionality, constants, state management, and authentication

// --- LANDING PAGE SLIDER & SMOOTH SCROLL ---
let currentSlide = 0;
const sliderWrapper = document.getElementById('slider-wrapper');
const sliderDots = document.querySelectorAll('.slider-dot');
const totalSlides = sliderWrapper ? sliderWrapper.children.length : 0;

function changeSlide(direction) {
    if (!sliderWrapper) return;
    currentSlide = (currentSlide + direction + totalSlides) % totalSlides;
    goToSlide(currentSlide);
}

function goToSlide(slideIndex) {
    if (!sliderWrapper) return;
    sliderWrapper.style.transform = `translateX(-${slideIndex * 100}%)`;
    sliderDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === slideIndex);
    });
    currentSlide = slideIndex;
}

if (totalSlides > 0) {
    setInterval(() => changeSlide(1), 8000);
}

document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// --- FULL APPLICATION INITIALIZATION ---
document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
const BACKEND_URL = IS_LOCAL ? 'http://localhost:10000/api' : PROD_BACKEND_URL;

const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: [],
    approvedJobs: [],
    conversations: [],
    participants: {},
    jobsPage: 1,
    hasMoreJobs: true,
    userSubmittedQuotes: new Set(),
    uploadedFile: null,
    myEstimations: [],
    currentHeaderSlide: 0,
    notifications: [],
};

// Professional Features Header Data
const headerFeatures = [
    {
        icon: 'fa-calculator',
        title: 'AI Cost Estimation',
        subtitle: 'Advanced algorithms for precise cost analysis',
        description: 'Upload your drawings and get instant, accurate estimates powered by machine learning',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
        icon: 'fa-drafting-compass',
        title: 'Expert Engineering',
        subtitle: 'Connect with certified professionals',
        description: 'Access a network of qualified structural engineers and designers worldwide',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
        icon: 'fa-comments',
        title: 'Real-time Collaboration',
        subtitle: 'Seamless project communication',
        description: 'Built-in messaging system for efficient project coordination and updates',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
        icon: 'fa-shield-alt',
        title: 'Secure & Reliable',
        subtitle: 'Enterprise-grade security',
        description: 'Your project data is protected with bank-level encryption and security',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
];

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 300000); // 5 minutes
}

// --- CORE INITIALIZATION ---
function initializeApp() {
    console.log("SteelConnect App Initializing...");
    console.log("Backend URL:", BACKEND_URL);
    
    // Global click listener to close pop-ups
    window.addEventListener('click', (event) => {
        // Close user dropdown if click is outside
        const userInfoContainer = document.getElementById('user-info-container');
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        if (userInfoDropdown && userInfoContainer && !userInfoContainer.contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
        // Close notification panel if click is outside
        const notificationPanel = document.getElementById('notification-panel');
        const notificationBellContainer = document.getElementById('notification-bell-container');
        if(notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)){
             notificationPanel.classList.remove('active');
        }
    });

    // Inactivity listeners
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    // Auth button listeners
    const signInBtn = document.getElementById('signin-btn');
    if (signInBtn) signInBtn.addEventListener('click', () => showAuthModal('login'));

    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => showAuthModal('register'));
    
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => showAuthModal('register'));
    
    // Logo navigation
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentUser) {
                renderAppSection('dashboard');
            } else {
                showLandingPageView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    // Check for existing session
    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            console.log("Restoring session for user:", appState.currentUser);
            showAppView();
            resetInactivityTimer();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
    
    initializeHeaderRotation();
}

// --- DYNAMIC HEADER SYSTEM ---
function initializeHeaderRotation() {
    setInterval(() => {
        appState.currentHeaderSlide = (appState.currentHeaderSlide + 1) % headerFeatures.length;
        updateDynamicHeader();
    }, 5000);
}

function updateDynamicHeader() {
    const headerElement = document.getElementById('dynamic-feature-header');
    if (headerElement) {
        const feature = headerFeatures[appState.currentHeaderSlide];
        headerElement.innerHTML = `
            <div class="feature-header-content" style="background: ${feature.gradient};">
                <div class="feature-icon-container">
                    <i class="fas ${feature.icon}"></i>
                </div>
                <div class="feature-text-content">
                    <h2 class="feature-title">${feature.title}</h2>
                    <p class="feature-subtitle">${feature.subtitle}</p>
                    <p class="feature-description">${feature.description}</p>
                </div>
                <div class="feature-indicators">
                    ${headerFeatures.map((_, index) => 
                        `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
}

// --- ENHANCED API CALL FUNCTION ---
async function apiCall(endpoint, method, body = null, successMessage = null) {
    console.log(`=== API CALL DEBUG ===`);
    console.log(`Endpoint: ${method} ${BACKEND_URL + endpoint}`);
    console.log(`Has JWT Token: ${!!appState.jwtToken}`);
    console.log(`Body type: ${body instanceof FormData ? 'FormData' : typeof body}`);
    
    try {
        const options = { 
            method, 
            headers: {
                'Accept': 'application/json'
            }
        };
        
        if (appState.jwtToken) {
            options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        }
        
        if (body) {
            if (body instanceof FormData) {
                options.body = body;
                // Don't set Content-Type for FormData, let browser handle it
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        
        console.log(`Request headers:`, options.headers);
        
        const response = await fetch(BACKEND_URL + endpoint, options);
        console.log(`Response status: ${response.status}`);
        console.log(`Response headers:`, [...response.headers.entries()]);

        // Handle 204 No Content or empty responses
        if (response.status === 204 || response.headers.get("content-length") === "0") {
             if (!response.ok) {
                const errorMsg = response.headers.get('X-Error-Message') || `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
             }
             if (successMessage) showNotification(successMessage, 'success');
             return { success: true };
        }

        // Parse JSON response
        let responseData;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            console.log(`Raw response:`, responseText);
            
            if (responseText.trim()) {
                try {
                    responseData = JSON.parse(responseText);
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    throw new Error('Invalid JSON response from server');
                }
            } else {
                responseData = { success: true };
            }
        } else {
            const textResponse = await response.text();
            console.log(`Non-JSON response:`, textResponse);
            responseData = { message: textResponse };
        }

        console.log(`Parsed response:`, responseData);

        if (!response.ok) {
            const errorMessage = responseData.message || responseData.error || `Request failed with status ${response.status}`;
            console.error('API Error:', errorMessage);
            throw new Error(errorMessage);
        }

        if (successMessage) {
            showNotification(successMessage, 'success');
        }
        
        return responseData;

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        
        // Handle specific error types
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showNotification('Network error. Please check your connection.', 'error');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            showNotification('Session expired. Please log in again.', 'error');
            logout();
            return;
        } else {
            showNotification(error.message, 'error');
        }
        
        throw error;
    }
}

// --- AUTHENTICATION FUNCTIONS ---
async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = {
        name: form.regName.value.trim(),
        email: form.regEmail.value.trim(),
        password: form.regPassword.value,
        type: form.regRole.value,
    };
    
    console.log('Registration attempt:', userData);
    
    try {
        await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.');
        addNotification(`Welcome to SteelConnect, ${userData.name}! Please sign in to continue.`, 'success');
        renderAuthForm('login');
    } catch (error) {
        console.error('Registration failed:', error);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { 
        email: form.loginEmail.value.trim(), 
        password: form.loginPassword.value 
    };
    
    console.log('Login attempt for:', authData.email);
    
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        console.log('Login response:', data);
        
        if (!data.user || !data.token) {
            throw new Error('Invalid login response - missing user or token');
        }
        
        showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');
        
        // Store user data
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        
        console.log('User logged in successfully:', appState.currentUser);
        
        closeModal();
        await showAppView();
        
        // Load user-specific data
        if (data.user.type === 'designer') {
            await loadUserQuotes();
        }
        if (data.user.type === 'contractor') {
            await loadUserEstimations();
        }
        
        // Fetch notifications
        await fetchUserNotifications();
        
        // Add welcome notification
        addNotification(`Welcome back, ${data.user.name}!`, 'info');
        
        console.log('=== POST-LOGIN DEBUG INFO ===');
        console.log('Current user:', appState.currentUser);
        console.log('JWT Token exists:', !!appState.jwtToken);
        console.log('About to load dashboard...');
        
    } catch(error) {
        console.error('Login failed:', error);
    }
}

function logout() {
    console.log('Logging out user...');
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

async function loadUserQuotes() {
    if (!appState.currentUser || appState.currentUser.type !== 'designer') return;
    
    console.log('Loading user quotes...');
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        console.log('Loaded quotes:', quotes);
        
        appState.userSubmittedQuotes.clear();
        quotes.forEach(quote => {
            if (quote.status === 'submitted') {
                appState.userSubmittedQuotes.add(quote.jobId);
            }
        });
        console.log('User submitted quotes:', appState.userSubmittedQuotes);
    } catch (error) {
        console.error('Error loading user quotes:', error);
    }
}

async function loadUserEstimations() {
    if (!appState.currentUser || appState.currentUser.type !== 'contractor') return;
    
    console.log('Loading user estimations...');
    try {
        const response = await apiCall(`/estimation/contractor/${appState.currentUser.email}`, 'GET');
        appState.myEstimations = response.estimations || [];
        console.log('Loaded estimations:', appState.myEstimations);
    } catch (error) {
        console.error('Error loading user estimations:', error);
        appState.myEstimations = [];
    }
}
// === STEELCONNECT COMPLETE SCRIPT - PART 2 ===
// Notification system and job management functions

// --- ENHANCED NOTIFICATION SYSTEM ---
function addNotification(message, type = 'info', link = '#') {
    const newNotification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date(),
        link,
        isRead: false,
    };
    appState.notifications.unshift(newNotification);
    console.log('Added notification:', newNotification);
    renderNotificationPanel();
}

async function fetchUserNotifications() {
    if (!appState.currentUser) return;
    
    console.log('Fetching user notifications...');
    try {
        const response = await apiCall('/notifications', 'GET');
        appState.notifications = response.data || [];
        console.log('Fetched notifications:', appState.notifications);
        renderNotificationPanel();
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        // Add some default notifications for demo
        addNotification('Welcome to SteelConnect! Start by exploring your dashboard.', 'info');
    }
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    const badge = document.getElementById('notification-badge');
    
    if (!panelList || !badge) return;
    
    const unreadCount = appState.notifications.filter(n => !n.isRead).length;
    
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.display = unreadCount > 0 ? 'flex' : 'none';

    if (appState.notifications.length === 0) {
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>`;
        return;
    }

    panelList.innerHTML = appState.notifications.map(n => {
        const iconMap = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle',
            message: 'fa-comment-alt',
            job: 'fa-briefcase',
            quote: 'fa-file-invoice-dollar'
        };
        const icon = iconMap[n.type] || 'fa-info-circle';
        
        return `
            <div class="notification-item ${n.isRead ? '' : 'unread-notification'}" data-id="${n.id}">
                <div class="notification-item-icon ${n.type}">
                    <i class="fas ${icon}"></i>
                </div>
                <div class="notification-item-content">
                    <p>${n.message}</p>
                    <span class="timestamp">${formatMessageTimestamp(n.timestamp)}</span>
                </div>
            </div>`;
    }).join('');
}

async function markNotificationsAsRead() {
    const unreadIds = appState.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    appState.notifications.forEach(n => n.isRead = true);
    renderNotificationPanel();

    try {
        await apiCall('/notifications/mark-read', 'PUT', { ids: unreadIds });
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
    }
}

async function clearNotifications() {
    if (confirm('Are you sure you want to clear all notifications?')) {
        try {
            await apiCall('/notifications', 'DELETE', null, 'All notifications cleared.');
            appState.notifications = [];
            renderNotificationPanel();
        } catch (err) {
            console.error("Failed to clear notifications", err);
            // For demo purposes, clear locally
            appState.notifications = [];
            renderNotificationPanel();
        }
    }
}

function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            // Mark all as read when opening
            markNotificationsAsRead();
        }
    }
}

// --- ENHANCED JOB MANAGEMENT ---
async function fetchAndRenderJobs(loadMore = false) {
    console.log('=== FETCHING JOBS ===');
    console.log('Load more:', loadMore);
    console.log('Current user:', appState.currentUser);
    
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!jobsListContainer) {
        console.error('Jobs list container not found');
        return;
    }

    if (!loadMore) {
        appState.jobs = [];
        appState.jobsPage = 1;
        appState.hasMoreJobs = true;
        jobsListContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div>';
    }

    if (!appState.hasMoreJobs) {
        if(loadMoreContainer) loadMoreContainer.innerHTML = '';
        return;
    }

    const user = appState.currentUser;
    if (!user) {
        console.error('No current user found');
        jobsListContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Authentication Error</h3>
                <p>Please log in again to view projects.</p>
                <button class="btn btn-primary" onclick="showAuthModal('login')">Sign In</button>
            </div>`;
        return;
    }

    const endpoint = user.type === 'designer' 
        ? `/jobs?page=${appState.jobsPage}&limit=6` 
        : `/jobs/user/${user.id}`;
    
    console.log('API endpoint:', BACKEND_URL + endpoint);
    
    if(loadMoreContainer) {
        loadMoreContainer.innerHTML = `<button class="btn btn-loading" disabled><div class="btn-spinner"></div>Loading...</button>`;
    }

    try {
        const response = await apiCall(endpoint, 'GET');
        console.log('Jobs response:', response);
        
        // Handle different response structures from Firebase
        let newJobs = [];
        if (response.data) {
            newJobs = Array.isArray(response.data) ? response.data : [response.data];
        } else if (Array.isArray(response)) {
            newJobs = response;
        } else if (response.jobs) {
            newJobs = response.jobs;
        } else {
            console.warn('Unexpected response structure:', response);
            newJobs = [];
        }
        
        console.log('Processed jobs:', newJobs);
        
        // Fix job IDs - Firebase might return _id or id
        newJobs = newJobs.map(job => ({
            ...job,
            id: job.id || job._id || Date.now().toString()
        }));
        
        appState.jobs.push(...newJobs);
        
        if (user.type === 'designer') {
            appState.hasMoreJobs = response.pagination ? response.pagination.hasNext : newJobs.length === 6;
            appState.jobsPage += 1;
        } else {
            appState.hasMoreJobs = false;
        }
        
        if (appState.jobs.length === 0) {
            const emptyStateMessage = user.type === 'designer'
                ? `<div class="empty-state premium-empty">
                     <div class="empty-icon"><i class="fas fa-briefcase"></i></div>
                     <h3>No Projects Available</h3>
                     <p>Check back later for new opportunities or try adjusting your search criteria.</p>
                   </div>`
                : `<div class="empty-state premium-empty">
                     <div class="empty-icon"><i class="fas fa-plus-circle"></i></div>
                     <h3>You haven't posted any projects yet</h3>
                     <p>Ready to get started? Post your first project and connect with talented professionals.</p>
                     <button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button>
                   </div>`;
            
            jobsListContainer.innerHTML = emptyStateMessage;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        renderJobsList(appState.jobs, user);

        // Handle load more button
        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn">
                    <i class="fas fa-chevron-down"></i> Load More Projects
                </button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        console.error('Error fetching jobs:', error);
        jobsListContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Projects</h3>
                <p>We encountered an issue loading the projects: ${error.message}</p>
                <button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button>
            </div>`;
        if (loadMoreContainer) loadMoreContainer.innerHTML = '';
    }
}

function renderJobsList(jobs, user) {
    const jobsListContainer = document.getElementById('jobs-list');
    if (!jobsListContainer) return;

    console.log('Rendering jobs list:', jobs);

    const jobsHTML = jobs.map(job => {
        // Ensure job has required fields
        const jobId = job.id || job._id;
        if (!jobId) {
            console.warn('Job missing ID:', job);
            return '';
        }

        const hasUserQuoted = appState.userSubmittedQuotes.has(jobId);
        const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
        
        const quoteButton = canQuote 
            ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${jobId}')">
                 <i class="fas fa-file-invoice-dollar"></i> Submit Quote
               </button>`
            : user.type === 'designer' && hasUserQuoted
            ? `<button class="btn btn-outline btn-submitted" disabled>
                 <i class="fas fa-check-circle"></i> Quote Submitted
               </button>`
            : user.type === 'designer' && job.status === 'assigned'
            ? `<span class="job-status-badge assigned">
                 <i class="fas fa-user-check"></i> Job Assigned
               </span>`
            : '';

        const actions = user.type === 'designer' 
            ? quoteButton 
            : `<div class="job-actions-group">
                 <button class="btn btn-outline" onclick="viewQuotes('${jobId}')">
                   <i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})
                 </button>
                 <button class="btn btn-danger" onclick="deleteJob('${jobId}')">
                   <i class="fas fa-trash"></i> Delete
                 </button>
               </div>`;

        const statusBadge = job.status !== 'open' 
            ? `<span class="job-status-badge ${job.status}">
                 <i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> 
                 ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}
               </span>` 
            : `<span class="job-status-badge open">
                 <i class="fas fa-clock"></i> Open
               </span>`;

        const attachmentLink = job.attachment 
            ? `<div class="job-attachment">
                 <i class="fas fa-paperclip"></i>
                 <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a>
               </div>` 
            : '';

        const skillsDisplay = job.skills?.length > 0 
            ? `<div class="job-skills">
                 <i class="fas fa-tools"></i>
                 <span>Skills:</span>
                 <div class="skills-tags">
                   ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                 </div>
               </div>` 
            : '';
        
        return `
            <div class="job-card premium-card" data-job-id="${jobId}">
                <div class="job-header">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.title || 'Untitled Job'}</h3>
                        ${statusBadge}
                    </div>
                    <div class="job-budget-section">
                        <span class="budget-label">Budget</span>
                        <span class="budget-amount">${job.budget || 'Not specified'}</span>
                    </div>
                </div>
                <div class="job-meta">
                    <div class="job-meta-item">
                        <i class="fas fa-user"></i>
                        <span>Posted by: <strong>${job.posterName || job.postedBy || 'N/A'}</strong></span>
                    </div>
                    ${job.assignedToName ? `
                        <div class="job-meta-item">
                            <i class="fas fa-user-check"></i>
                            <span>Assigned to: <strong>${job.assignedToName}</strong></span>
                        </div>` : ''}
                    ${job.deadline ? `
                        <div class="job-meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span>
                        </div>` : ''}
                </div>
                <div class="job-description">
                    <p>${job.description || 'No description provided'}</p>
                </div>
                ${skillsDisplay}
                ${job.link ? `
                    <div class="job-link">
                        <i class="fas fa-external-link-alt"></i>
                        <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a>
                    </div>` : ''}
                ${attachmentLink}
                <div class="job-actions">${actions}</div>
            </div>`;
    }).filter(html => html).join(''); // Filter out empty strings

    if (!jobsHTML) {
        jobsListContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>No Valid Jobs Found</h3>
                <p>The jobs data appears to be malformed. Please try again or contact support.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button>
            </div>`;
    } else {
        jobsListContainer.innerHTML = jobsHTML;
    }
}

// --- JOB ACTIONS ---
async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => {
            if (form[field] && form[field].value) {
                formData.append(field, form[field].value);
            }
        });
        
        if (form.attachment && form.attachment.files.length > 0) {
            formData.append('attachment', form.attachment.files[0]);
        }
        
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addNotification(`Your new project "${form.title.value}" has been posted.`, 'job');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        console.error('Job posting failed:', error);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This will also delete all associated quotes and cannot be undone.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.');
            await fetchAndRenderJobs(); // Refresh the list
        } catch (error) {
            console.error('Job deletion failed:', error);
        }
    }
}
/ === STEELCONNECT COMPLETE SCRIPT - PART 3 ===
// Quote management and messaging system

// --- QUOTE MANAGEMENT ---
function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header premium-modal-header">
            <h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3>
            <p class="modal-subtitle">Provide your best proposal for this project</p>
        </div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label>
                    <input type="number" class="form-input premium-input" name="amount" required min="1" step="0.01" placeholder="Enter your quote amount">
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label>
                    <input type="number" class="form-input premium-input" name="timeline" required min="1" placeholder="Project duration">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label>
                <textarea class="form-textarea premium-input" name="description" required placeholder="Describe your approach..."></textarea>
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label>
                <input type="file" class="form-input file-input premium-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                <small class="form-help">Upload portfolio samples or relevant documents</small>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Quote</button>
            </div>
        </form>`;
    showGenericModal(content, 'max-width: 600px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('jobId', form['jobId'].value);
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        
        if (form.attachments.files.length > 0) {
            for (let i = 0; i < form.attachments.files.length; i++) {
                formData.append('attachments', form.attachments.files[i]);
            }
        }
        
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        addNotification(`Your quote for a project has been submitted.`, 'quote');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        await fetchAndRenderJobs();
        showNotification('Your quote has been submitted! You can track its status in "My Quotes".', 'success');
    } catch (error) {
        console.error("Quote submission failed:", error);
    } finally {
        if(submitBtn) {
           submitBtn.innerHTML = originalText;
           submitBtn.disabled = false;
        }
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2>
                <p class="header-subtitle">Track your quote submissions and manage communications</p>
            </div>
        </div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';
    
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;
        
        if (quotes.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Submitted</h3>
                    <p>You haven't submitted any quotes yet. Browse available projects to get started.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            const attachmentLink = attachments.length > 0 
                ? `<div class="quote-attachment">
                     <i class="fas fa-paperclip"></i>
                     <a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a>
                   </div>` 
                : '';
            
            const canDelete = quote.status === 'submitted';
            const canEdit = quote.status === 'submitted';
            const statusIcon = {
                'submitted': 'fa-clock', 
                'approved': 'fa-check-circle', 
                'rejected': 'fa-times-circle'
            }[quote.status] || 'fa-question-circle';
            
            const statusClass = quote.status;
            const actionButtons = [];
            
            if (quote.status === 'approved') {
                actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')">
                    <i class="fas fa-comments"></i> Message Client
                </button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')">
                    <i class="fas fa-edit"></i> Edit Quote
                </button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>`);
            }
            
            return `
                <div class="quote-card premium-card quote-status-${statusClass}">
                    <div class="quote-header">
                        <div class="quote-title-section">
                            <h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3>
                            <span class="quote-status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i> 
                                ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                        </div>
                        <div class="quote-amount-section">
                            <span class="amount-label">Quote Amount</span>
                            <span class="amount-value">${quote.quoteAmount}</span>
                        </div>
                    </div>
                    <div class="quote-meta">
                        ${quote.timeline ? `
                            <div class="quote-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Timeline: <strong>${quote.timeline} days</strong></span>
                            </div>` : ''}
                        <div class="quote-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span>
                        </div>
                    </div>
                    <div class="quote-description"><p>${quote.description}</p></div>
                    ${attachmentLink}
                    <div class="quote-actions">
                        <div class="quote-actions-group">${actionButtons.join('')}</div>
                    </div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Quotes</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button>
            </div>`;
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        
        let quotesHTML = `
            <div class="modal-header premium-modal-header">
                <h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3>
                <p class="modal-subtitle">Review and manage quotes for this project</p>
            </div>`;
            
        if (quotes.length === 0) {
            quotesHTML += `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Received</h3>
                    <p>No quotes have been submitted for this project yet. Check back later.</p>
                </div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">`;
            
            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                const attachmentLink = attachments.length > 0 
                    ? `<div class="quote-attachment">
                         <i class="fas fa-paperclip"></i>
                         <a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a>
                       </div>` 
                    : '';
                
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')">
                    <i class="fas fa-comments"></i> Message
                </button>`;
                
                let actionButtons = '';
                if(canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')">
                        <i class="fas fa-check"></i> Approve Quote
                    </button>${messageButton}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved">
                        <i class="fas fa-check-circle"></i> Approved
                    </span>${messageButton}`;
                } else {
                    actionButtons = messageButton;
                }
                
                const statusClass = quote.status;
                const statusIcon = {
                    'submitted': 'fa-clock', 
                    'approved': 'fa-check-circle', 
                    'rejected': 'fa-times-circle'
                }[quote.status] || 'fa-question-circle';
                
                return `
                    <div class="quote-item premium-quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info">
                                <div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div>
                                <div class="designer-details">
                                    <h4>${quote.designerName}</h4>
                                    <span class="quote-status-badge ${statusClass}">
                                        <i class="fas ${statusIcon}"></i> 
                                        ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                            <div class="quote-amount">
                                <span class="amount-label">Quote</span>
                                <span class="amount-value">${quote.quoteAmount}</span>
                            </div>
                        </div>
                        <div class="quote-details">
                            ${quote.timeline ? `
                                <div class="quote-meta-item">
                                    <i class="fas fa-calendar-alt"></i>
                                    <span>Timeline: <strong>${quote.timeline} days</strong></span>
                                </div>` : ''}
                            <div class="quote-description"><p>${quote.description}</p></div>
                            ${attachmentLink}
                        </div>
                        <div class="quote-actions">${actionButtons}</div>
                    </div>`;
            }).join('');
            quotesHTML += `</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 900px;');
    } catch (error) {
        showGenericModal(`
            <div class="modal-header premium-modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
            </div>
            <div class="error-state premium-error">
                <p>Could not load quotes for this project. Please try again later.</p>
            </div>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer and reject other quotes.')) {
        try {
            await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!');
            addNotification('You have approved a quote and assigned a new project!', 'success');
            closeModal();
            await fetchAndRenderJobs();
            showNotification('Project has been assigned! You can now communicate with the designer.', 'success');
        } catch (error) {
            console.error('Quote approval failed:', error);
        }
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        
        const content = `
            <div class="modal-header premium-modal-header">
                <h3><i class="fas fa-edit"></i> Edit Your Quote</h3>
                <p class="modal-subtitle">Update your quote details for: <strong>${quote.jobTitle}</strong></p>
            </div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label>
                        <input type="number" class="form-input premium-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label>
                        <input type="number" class="form-input premium-input" name="timeline" value="${quote.timeline || ''}" required min="1">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label>
                    <textarea class="form-textarea premium-input" name="description" required placeholder="Describe your approach...">${quote.description}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label>
                    <input type="file" class="form-input file-input premium-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                    <small class="form-help">Supported formats: PDF, DOC, DWG, Images</small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button>
                </div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {
        console.error('Error loading quote for editing:', error);
    }
}

async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('quoteAmount', form['amount'].value);
        formData.append('timeline', form['timeline'].value);
        formData.append('description', form['description'].value);
        if (form.attachments.files.length > 0) {
            for (let i = 0; i < form.attachments.files.length; i++) {
                formData.append('attachments', form.attachments.files[i]);
            }
        }
        await apiCall(`/quotes/${form['quoteId'].value}`, 'PUT', formData, 'Quote updated successfully!');
        closeModal();
        fetchAndRenderMyQuotes();
    } catch (error) {
        console.error("Quote edit failed:", error);
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
        try {
            await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.');
            await fetchAndRenderMyQuotes();
            await loadUserQuotes();
        } catch (error) {
            console.error('Quote deletion failed:', error);
        }
    }
}

// --- MESSAGING SYSTEM ---
async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-comments"></i> Messages</h2>
                <p class="header-subtitle">Communicate with clients and designers</p>
            </div>
        </div>
        <div id="conversations-list" class="conversations-container premium-conversations"></div>`;
    updateDynamicHeader();
    
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;
    
    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-comments"></i></div>
                    <h3>No Conversations Yet</h3>
                    <p>Start collaborating with professionals by messaging them from job quotes.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button>
                </div>`;
            return;
        }
        
        const conversationsHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherParticipantName = otherParticipant ? otherParticipant.name : 'Unknown User';
            const lastMessage = convo.lastMessage 
                ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) 
                : 'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const avatarColor = getAvatarColor(otherParticipantName);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;
            
            return `
                <div class="conversation-card premium-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${avatarColor}">
                        ${otherParticipantName.charAt(0).toUpperCase()}
                        ${isUnread ? '<div class="unread-indicator"></div>' : ''}
                    </div>
                    <div class="convo-details">
                        <div class="convo-header">
                            <h4>${otherParticipantName}</h4>
                            <div class="convo-meta">
                                <span class="participant-type ${otherParticipant ? otherParticipant.type : ''}">${otherParticipant ? otherParticipant.type : ''}</span>
                                <span class="convo-time">${timeAgo}</span>
                            </div>
                        </div>
                        <p class="convo-project">
                            <i class="fas fa-briefcase"></i>
                            <strong>${convo.jobTitle}</strong>
                        </p>
                        <p class="convo-preview">
                            ${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? `<strong>${convo.lastMessageBy}:</strong> ` : ''}${lastMessage}
                        </p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
        
        listContainer.innerHTML = conversationsHTML;
        
    } catch (error) {
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Conversations</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button>
            </div>`;
    }
}

async function openConversation(jobId, recipientId) {
    try {
        showNotification('Opening conversation...', 'info');
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {
        console.error('Failed to open conversation:', error);
    }
}
// === STEELCONNECT MODAL SYSTEM FIX - PART 4 CORRECTED ===
// Fixed UI functions, modal management, and templates

// --- UTILITY FUNCTIONS ---
function getTimeAgo(timestamp) {
    const now = new Date();
    const time = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

function formatMessageTimestamp(date) {
    const now = new Date();
    const messageDate = new Date(date);
    const isToday = now.toDateString() === messageDate.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === messageDate.toDateString();

    if (isToday) {
        return `Today, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
        return `Yesterday, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return messageDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// --- FIXED MODAL FUNCTIONS ---
function showAuthModal(view) {
    console.log('Showing auth modal:', view);
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error('Modal container not found! Make sure you have a div with id="modal-container" in your HTML.');
        return;
    }

    // Clear any existing modal content
    modalContainer.innerHTML = '';
    
    // Create modal HTML
    modalContainer.innerHTML = `
        <div class="modal-overlay premium-overlay" id="modal-overlay">
            <div class="modal-content premium-modal" id="modal-content">
                <button class="modal-close-button premium-close" id="modal-close-btn" type="button">
                    <i class="fas fa-times"></i>
                </button>
                <div id="modal-form-container"></div>
            </div>
        </div>`;

    // Add event listeners
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');
    const content = document.getElementById('modal-content');

    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }

    if (content) {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Show modal
    modalContainer.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Render the form
    renderAuthForm(view);
}

function renderAuthForm(view) {
    console.log('Rendering auth form:', view);
    const container = document.getElementById('modal-form-container');
    if (!container) {
        console.error('Modal form container not found!');
        return;
    }

    // Clear container first
    container.innerHTML = '';
    
    // Add the appropriate template
    if (view === 'login') {
        container.innerHTML = getLoginTemplate();
        
        // Add form event listener
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.error('Login form not found after template insertion!');
        }
    } else if (view === 'register') {
        container.innerHTML = getRegisterTemplate();
        
        // Add form event listener
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', handleRegister);
        } else {
            console.error('Register form not found after template insertion!');
        }
    }
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
        console.error('Modal container not found!');
        return;
    }

    modalContainer.innerHTML = `
        <div class="modal-overlay premium-overlay" id="modal-overlay">
            <div class="modal-content premium-modal" id="modal-content" style="${style}">
                <button class="modal-close-button premium-close" id="modal-close-btn" type="button">
                    <i class="fas fa-times"></i>
                </button>
                ${innerHTML}
            </div>
        </div>`;

    // Add event listeners
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close-btn');
    const content = document.getElementById('modal-content');

    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeModal();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeModal();
        });
    }

    if (content) {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Show modal
    modalContainer.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    console.log('Closing modal');
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) {
        modalContainer.innerHTML = '';
        modalContainer.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Global function to handle auth form switching
window.renderAuthForm = renderAuthForm;
window.closeModal = closeModal;

// --- VIEW MANAGEMENT ---
async function showAppView() {
    console.log('Showing app view...');
    
    // Hide landing page, show app
    const landingPage = document.getElementById('landing-page-content');
    const appContent = document.getElementById('app-content');
    const authButtons = document.getElementById('auth-buttons-container');
    const userInfo = document.getElementById('user-info-container');
    
    if (landingPage) landingPage.style.display = 'none';
    if (appContent) appContent.style.display = 'flex';
    if (authButtons) authButtons.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    
    const user = appState.currentUser;
    
    // Update user info in header
    const userNameElement = document.getElementById('user-info-name');
    const userAvatarElement = document.getElementById('user-info-avatar');
    
    if (userNameElement) userNameElement.textContent = user.name;
    if (userAvatarElement) userAvatarElement.textContent = (user.name || "A").charAt(0).toUpperCase();
    
    // Setup user dropdown (avoid duplicate listeners)
    const userInfoElement = document.getElementById('user-info');
    if (userInfoElement) {
        // Remove existing listeners
        userInfoElement.replaceWith(userInfoElement.cloneNode(true));
        const newUserInfoElement = document.getElementById('user-info');
        
        newUserInfoElement.addEventListener('click', (e) => {
            e.stopPropagation();
            const dropdown = document.getElementById('user-info-dropdown');
            if (dropdown) dropdown.classList.toggle('active');
        });
    }
    
    const userSettingsLink = document.getElementById('user-settings-link');
    if (userSettingsLink) {
        userSettingsLink.replaceWith(userSettingsLink.cloneNode(true));
        const newSettingsLink = document.getElementById('user-settings-link');
        newSettingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection('settings');
            const dropdown = document.getElementById('user-info-dropdown');
            if (dropdown) dropdown.classList.remove('active');
        });
    }
    
    const userLogoutLink = document.getElementById('user-logout-link');
    if (userLogoutLink) {
        userLogoutLink.replaceWith(userLogoutLink.cloneNode(true));
        const newLogoutLink = document.getElementById('user-logout-link');
        newLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Setup notification panel
    const notificationBell = document.getElementById('notification-bell-container');
    if (notificationBell) {
        notificationBell.replaceWith(notificationBell.cloneNode(true));
        const newNotificationBell = document.getElementById('notification-bell-container');
        newNotificationBell.addEventListener('click', toggleNotificationPanel);
    }
    
    const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
    if (clearNotificationsBtn) {
        clearNotificationsBtn.replaceWith(clearNotificationsBtn.cloneNode(true));
        const newClearBtn = document.getElementById('clear-notifications-btn');
        newClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            clearNotifications();
        });
    }
    
    // Update sidebar user info
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserType = document.getElementById('sidebarUserType');
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    
    if (sidebarUserName) sidebarUserName.textContent = user.name;
    if (sidebarUserType) sidebarUserType.textContent = user.type;
    if (sidebarUserAvatar) sidebarUserAvatar.textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('dashboard');
    renderNotificationPanel();
}

function showLandingPageView() {
    console.log('Showing landing page view...');
    
    const landingPage = document.getElementById('landing-page-content');
    const appContent = document.getElementById('app-content');
    const authButtons = document.getElementById('auth-buttons-container');
    const userInfo = document.getElementById('user-info-container');
    
    if (landingPage) landingPage.style.display = 'block';
    if (appContent) appContent.style.display = 'none';
    if (authButtons) authButtons.style.display = 'flex';
    if (userInfo) userInfo.style.display = 'none';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) {
        navMenu.innerHTML = `
            <a href="#ai-estimation" class="nav-link">AI Estimation</a>
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>
            <a href="#showcase" class="nav-link">Showcase</a>`;
    }
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    if (!navContainer) {
        console.error('Sidebar nav menu not found!');
        return;
    }
    
    const role = appState.currentUser.type;
    let links = `<a href="#" class="sidebar-nav-link" data-section="dashboard"><i class="fas fa-tachometer-alt fa-fw"></i><span>Dashboard</span></a>`;

    if (role === 'designer') {
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`;
    } else {
        links += `
          <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved Projects</span></a>
          <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>
          <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i><span>AI Cost Estimation</span></a>
          <a href="#" class="sidebar-nav-link" data-section="my-estimations"><i class="fas fa-file-invoice fa-fw"></i><span>My Estimations</span></a>`;
    }
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>`;
    links += `<hr class="sidebar-divider">`;
    links += `<a href="#" class="sidebar-nav-link" data-section="settings"><i class="fas fa-cog fa-fw"></i><span>Settings</span></a>`;

    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

function renderAppSection(sectionId) {
    console.log('Rendering app section:', sectionId);
    const container = document.getElementById('app-container');
    if (!container) {
        console.error('App container not found!');
        return;
    }
    
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    const userRole = appState.currentUser.type;
    
    if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        renderRecentActivityWidgets();
    } else if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes for engineering projects' : 'Manage your project listings and review quotes';
        container.innerHTML = `
            ${userRole === 'contractor' ? '<div id="dynamic-feature-header" class="dynamic-feature-header"></div>' : ''}
            <div class="section-header modern-header">
                <div class="header-content">
                    <h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2>
                    <p class="header-subtitle">${subtitle}</p>
                </div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;
        if (userRole === 'contractor') updateDynamicHeader();
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        const postJobForm = document.getElementById('post-job-form');
        if (postJobForm) {
            postJobForm.addEventListener('submit', handlePostJob);
        }
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    } else if (sectionId === 'approved-jobs') {
        fetchAndRenderApprovedJobs();
    } else if (sectionId === 'messages') {
        fetchAndRenderConversations();
    } else if (sectionId === 'estimation-tool') {
        container.innerHTML = getEstimationToolTemplate();
        setupEstimationToolEventListeners();
    } else if (sectionId === 'my-estimations') {
        fetchAndRenderMyEstimations();
    } else if (sectionId === 'settings') {
        container.innerHTML = getSettingsTemplate(appState.currentUser);
    }
}

// --- ENHANCED NOTIFICATION SYSTEM ---
function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        console.warn('Notification container not found, creating temporary alert');
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    const icons = { 
        success: 'fa-check-circle', 
        error: 'fa-exclamation-triangle', 
        warning: 'fa-exclamation-circle', 
        info: 'fa-info-circle' 
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" type="button">
            <i class="fas fa-times"></i>
        </button>`;
    
    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, duration);
}

// --- FIXED TEMPLATES ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Welcome Back</h2>
            <p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="premium-form">
            <div class="form-group">
                <label class="form-label"><i class="fas fa-envelope"></i> Email Address</label>
                <input type="email" class="form-input premium-input" name="loginEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-lock"></i> Password</label>
                <input type="password" class="form-input premium-input" name="loginPassword" required placeholder="Enter your password">
            </div>
            <button type="submit" class="btn btn-primary btn-full premium-btn">
                <i class="fas fa-sign-in-alt"></i> Sign In
            </button>
        </form>
        <div class="auth-switch">
            Don't have an account? 
            <a href="#" onclick="renderAuthForm('register')" class="auth-link">Create Account</a>
        </div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Join SteelConnect</h2>
            <p>Create your professional account</p>
        </div>
        <form id="register-form" class="premium-form">
            <div class="form-group">
                <label class="form-label"><i class="fas fa-user"></i> Full Name</label>
                <input type="text" class="form-input premium-input" name="regName" required placeholder="Enter your full name">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-envelope"></i> Email Address</label>
                <input type="email" class="form-input premium-input" name="regEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-lock"></i> Password</label>
                <input type="password" class="form-input premium-input" name="regPassword" required placeholder="Create a strong password">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label>
                <select class="form-select premium-select" name="regRole" required>
                    <option value="" disabled selected>Select your role</option>
                    <option value="contractor">Client / Contractor</option>
                    <option value="designer">Designer / Engineer</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full premium-btn">
                <i class="fas fa-user-plus"></i> Create Account
            </button>
        </form>
        <div class="auth-switch">
            Already have an account? 
            <a href="#" onclick="renderAuthForm('login')" class="auth-link">Sign In</a>
        </div>`;
}

// Make functions globally available
window.showAuthModal = showAuthModal;
window.showGenericModal = showGenericModal;
window.closeModal = closeModal;

console.log('Fixed Modal System Loaded Successfully!');
// === STEELCONNECT COMPLETE SCRIPT - PART 5 ===
// Templates and additional features (estimation tool, approved jobs, etc.)

// --- APPROVED JOBS MANAGEMENT ---
async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-check-circle"></i> Approved Projects</h2>
                <p class="header-subtitle">Manage your approved projects and communicate with designers</p>
            </div>
        </div>
        <div id="approved-jobs-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    
    const listContainer = document.getElementById('approved-jobs-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading approved projects...</p></div>';
    
    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        const allJobs = response.data || [];
        const approvedJobs = allJobs.filter(job => job.status === 'assigned');
        appState.approvedJobs = approvedJobs;
        
        if (approvedJobs.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>
                    <h3>No Approved Projects</h3>
                    <p>Your approved projects will appear here once you accept quotes from designers.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = approvedJobs.map(job => {
            const attachmentLink = job.attachment 
                ? `<div class="job-attachment">
                     <i class="fas fa-paperclip"></i>
                     <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a>
                   </div>` 
                : '';
            const skillsDisplay = job.skills?.length > 0 
                ? `<div class="job-skills">
                     <i class="fas fa-tools"></i>
                     <span>Skills:</span>
                     <div class="skills-tags">
                       ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                     </div>
                   </div>` 
                : '';
            return `
                <div class="job-card premium-card approved-job">
                    <div class="job-header">
                        <div class="job-title-section">
                            <h3 class="job-title">${job.title}</h3>
                            <span class="job-status-badge assigned">
                                <i class="fas fa-user-check"></i> Assigned
                            </span>
                        </div>
                        <div class="approved-amount">
                            <span class="amount-label">Approved Amount</span>
                            <span class="amount-value">${job.approvedAmount}</span>
                        </div>
                    </div>
                    <div class="job-meta">
                        <div class="job-meta-item">
                            <i class="fas fa-user-cog"></i>
                            <span>Assigned to: <strong>${job.assignedToName}</strong></span>
                        </div>
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `
                        <div class="job-link">
                            <i class="fas fa-external-link-alt"></i>
                            <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a>
                        </div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">
                        <div class="job-actions-group">
                            <button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')">
                                <i class="fas fa-comments"></i> Message Designer
                            </button>
                            <button class="btn btn-success" onclick="markJobCompleted('${job.id}')">
                                <i class="fas fa-check-double"></i> Mark Completed
                            </button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Approved Projects</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button>
            </div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed? This action cannot be undone.')) {
        try {
            await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed successfully!');
            addNotification('A project has been marked as completed!', 'success');
            await fetchAndRenderApprovedJobs();
        } catch (error) {
            console.error('Job completion failed:', error);
        }
    }
}

// --- ESTIMATION TOOL ---
async function fetchAndRenderMyEstimations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Estimation Requests</h2>
                <p class="header-subtitle">Track your cost estimation submissions and results</p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="renderAppSection('estimation-tool')">
                    <i class="fas fa-plus"></i> New Estimation Request
                </button>
            </div>
        </div>
        <div id="estimations-list" class="estimations-grid"></div>`;
    
    updateDynamicHeader();
    
    const listContainer = document.getElementById('estimations-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your estimation requests...</p></div>';
    
    try {
        await loadUserEstimations();
        
        if (appState.myEstimations.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state premium-empty">
                    <div class="empty-icon"><i class="fas fa-calculator"></i></div>
                    <h3>No Estimation Requests Yet</h3>
                    <p>Start by uploading your project drawings to get accurate cost estimates from our AI-powered system.</p>
                    <button class="btn btn-primary btn-large" onclick="renderAppSection('estimation-tool')">
                        <i class="fas fa-upload"></i> Upload First Project
                    </button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = appState.myEstimations.map(estimation => {
            const statusConfig = getEstimationStatusConfig(estimation.status);
            const createdDate = new Date(estimation.createdAt).toLocaleDateString();
            const updatedDate = new Date(estimation.updatedAt).toLocaleDateString();
            
            const hasFiles = estimation.uploadedFiles && estimation.uploadedFiles.length > 0;
            const hasResult = estimation.resultFile;
            
            return `
                <div class="estimation-card premium-card">
                    <div class="estimation-header">
                        <div class="estimation-title-section">
                            <h3 class="estimation-title">${estimation.projectTitle}</h3>
                            <span class="estimation-status-badge ${estimation.status}">
                                <i class="fas ${statusConfig.icon}"></i> ${statusConfig.label}
                            </span>
                        </div>
                        ${estimation.estimatedAmount ? `
                            <div class="estimation-amount">
                                <span class="amount-label">Estimated Cost</span>
                                <span class="amount-value">$${estimation.estimatedAmount.toLocaleString()}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="estimation-description"><p>${estimation.description}</p></div>
                    <div class="estimation-meta">
                        <div class="meta-item">
                            <i class="fas fa-calendar-plus"></i>
                            <span>Submitted: ${createdDate}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Updated: ${updatedDate}</span>
                        </div>
                        ${hasFiles ? `
                            <div class="meta-item">
                                <i class="fas fa-paperclip"></i>
                                <span>${estimation.uploadedFiles.length} file(s) uploaded</span>
                            </div>` : ''}
                    </div>
                    <div class="estimation-actions">
                        <div class="action-buttons">
                            ${hasFiles ? `
                                <button class="btn btn-outline btn-sm" onclick="viewEstimationFiles('${estimation._id}')">
                                    <i class="fas fa-eye"></i> View Files
                                </button>` : ''}
                            ${hasResult ? `
                                <button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${estimation._id}')">
                                    <i class="fas fa-download"></i> Download Result
                                </button>` : ''}
                            ${estimation.status === 'pending' ? `
                                <button class="btn btn-danger btn-sm" onclick="deleteEstimation('${estimation._id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');
        
    } catch (error) {
        listContainer.innerHTML = `
            <div class="error-state premium-error">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Estimations</h3>
                <p>We couldn't load your estimation requests. Please try again.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderMyEstimations()">Retry</button>
            </div>`;
    }
}

function getEstimationStatusConfig(status) {
    const configs = {
        'pending': { icon: 'fa-clock', label: 'Under Review' },
        'in-progress': { icon: 'fa-cogs', label: 'Processing' },
        'completed': { icon: 'fa-check-circle', label: 'Complete' },
        'rejected': { icon: 'fa-times-circle', label: 'Rejected' },
        'cancelled': { icon: 'fa-ban', label: 'Cancelled' }
    };
    return configs[status] || { icon: 'fa-question-circle', label: status };
}

// Estimation tool event listeners and file handling
function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            uploadArea.classList.add('drag-over'); 
        });
        uploadArea.addEventListener('dragleave', () => { 
            uploadArea.classList.remove('drag-over'); 
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleFileSelect(e.target.files);
        });
    }

    const submitBtn = document.getElementById('submit-estimation-btn');
    if (submitBtn) submitBtn.addEventListener('click', handleEstimationSubmit);
}

function handleFileSelect(files) {
    const fileList = document.getElementById('selected-files-list');
    const submitBtn = document.getElementById('submit-estimation-btn');
    appState.uploadedFile = files;
    
    let filesHTML = '';
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        const fileType = file.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file';
        filesHTML += `
            <div class="selected-file-item">
                <div class="file-info">
                    <i class="fas ${fileType}"></i>
                    <div class="file-details">
                        <span class="file-name">${file.name}</span>
                        <span class="file-size">${fileSize} MB</span>
                    </div>
                </div>
                <button type="button" class="remove-file-btn" onclick="removeFile(${i})">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
    }
    fileList.innerHTML = filesHTML;
    document.getElementById('file-info-container').style.display = 'block';
    submitBtn.disabled = false;
    showNotification(`${files.length} file(s) selected for estimation`, 'success');
}

function removeFile(index) {
    const filesArray = Array.from(appState.uploadedFile);
    filesArray.splice(index, 1);
    
    if (filesArray.length === 0) {
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        document.getElementById('submit-estimation-btn').disabled = true;
    } else {
        const dt = new DataTransfer();
        filesArray.forEach(file => dt.items.add(file));
        appState.uploadedFile = dt.files;
        handleFileSelect(appState.uploadedFile);
    }
}

async function handleEstimationSubmit() {
    const form = document.getElementById('estimation-form');
    const submitBtn = document.getElementById('submit-estimation-btn');
    
    if (!appState.uploadedFile || appState.uploadedFile.length === 0) {
        showNotification('Please select files for estimation', 'warning');
        return;
    }
    
    const projectTitle = form.projectTitle.value.trim();
    const description = form.description.value.trim();
    if (!projectTitle || !description) {
        showNotification('Please fill in all required fields', 'warning');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting Request...';

    try {
        const formData = new FormData();
        formData.append('projectTitle', projectTitle);
        formData.append('description', description);
        formData.append('contractorName', appState.currentUser.name);
        formData.append('contractorEmail', appState.currentUser.email);
        for (let i = 0; i < appState.uploadedFile.length; i++) {
            formData.append('files', appState.uploadedFile[i]);
        }
        await apiCall('/estimation/contractor/submit', 'POST', formData, 'Estimation request submitted successfully!');
        addNotification(`Your AI estimation request for "${projectTitle}" is submitted.`, 'info');
        form.reset();
        appState.uploadedFile = null;
        document.getElementById('file-info-container').style.display = 'none';
        renderAppSection('my-estimations');
    } catch (error) {
        console.error('Estimation submission failed:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Estimation Request';
    }
}

// --- TEMPLATE FUNCTIONS ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Welcome Back</h2>
            <p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="premium-form">
            <div class="form-group">
                <label class="form-label"><i class="fas fa-envelope"></i> Email Address</label>
                <input type="email" class="form-input premium-input" name="loginEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-lock"></i> Password</label>
                <input type="password" class="form-input premium-input" name="loginPassword" required placeholder="Enter your password">
            </div>
            <button type="submit" class="btn btn-primary btn-full premium-btn">
                <i class="fas fa-sign-in-alt"></i> Sign In
            </button>
        </form>
        <div class="auth-switch">
            Don't have an account? 
            <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a>
        </div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Join SteelConnect</h2>
            <p>Create your professional account</p>
        </div>
        <form id="register-form" class="premium-form">
            <div class="form-group">
                <label class="form-label"><i class="fas fa-user"></i> Full Name</label>
                <input type="text" class="form-input premium-input" name="regName" required placeholder="Enter your full name">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-envelope"></i> Email Address</label>
                <input type="email" class="form-input premium-input" name="regEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-lock"></i> Password</label>
                <input type="password" class="form-input premium-input" name="regPassword" required placeholder="Create a strong password">
            </div>
            <div class="form-group">
                <label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label>
                <select class="form-select premium-select" name="regRole" required>
                    <option value="" disabled selected>Select your role</option>
                    <option value="contractor">Client / Contractor</option>
                    <option value="designer">Designer / Engineer</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full premium-btn">
                <i class="fas fa-user-plus"></i> Create Account
            </button>
        </form>
        <div class="auth-switch">
            Already have an account? 
            <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a>
        </div>`;
}

function getPostJobTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-plus-circle"></i> Post a New Project</h2>
                <p class="header-subtitle">Create a detailed project listing to attract qualified professionals</p>
            </div>
        </div>
        <div class="post-job-container premium-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-heading"></i> Project Title</label>
                        <input type="text" class="form-input premium-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label>
                            <input type="text" class="form-input premium-input" name="budget" required placeholder="e.g., $5,000 - $10,000">
                        </div>
                        <div class="form-group">
                            <label class="form-label"><i class="fas fa-calendar-alt"></i> Project Deadline</label>
                            <input type="date" class="form-input premium-input" name="deadline" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-tools"></i> Required Skills</label>
                        <input type="text" class="form-input premium-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis">
                        <small class="form-help">Separate skills with commas</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-external-link-alt"></i> Project Link (Optional)</label>
                        <input type="url" class="form-input premium-input" name="link" placeholder="https://example.com/project-details">
                        <small class="form-help">Link to additional project information</small>
                    </div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-align-left"></i> Detailed Description</label>
                        <textarea class="form-textarea premium-textarea" name="description" required placeholder="Provide a comprehensive description of your project..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-paperclip"></i> Project Attachments</label>
                        <input type="file" class="form-input file-input premium-file-input" name="attachment" accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                        <small class="form-help">Upload drawings or specifications (Max 10MB)</small>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large premium-btn">
                        <i class="fas fa-rocket"></i> Post Project
                    </button>
                </div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2>
                <p class="header-subtitle">Upload your structural drawings to get instant, accurate cost estimates</p>
            </div>
        </div>
        <div class="estimation-tool-container premium-estimation-container">
            <div class="estimation-steps">
                <div class="step active">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h4>Upload Files</h4>
                        <p>Add your project drawings</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h4>Project Details</h4>
                        <p>Describe your requirements</p>
                    </div>
                </div>
                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h4>Get Estimate</h4>
                        <p>Receive detailed cost breakdown</p>
                    </div>
                </div>
            </div>
            <form id="estimation-form" class="premium-estimation-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-upload"></i> Upload Project Files</h3>
                    <div class="file-upload-section premium-upload-section">
                        <div id="file-upload-area" class="file-upload-area premium-upload-area">
                            <input type="file" id="file-upload-input" accept=".pdf,.dwg,.doc,.docx,.jpg,.jpeg,.png" multiple />
                            <div class="upload-content">
                                <div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                                <h3>Drag & Drop Your Files Here</h3>
                                <p>or click to browse</p>
                                <div class="supported-formats">
                                    <span class="format-badge">PDF</span>
                                    <span class="format-badge">DWG</span>
                                    <span class="format-badge">DOC</span>
                                    <span class="format-badge">Images</span>
                                </div>
                                <small class="upload-limit">Maximum 10 files, 15MB each</small>
                            </div>
                        </div>
                        <div id="file-info-container" class="selected-files-container" style="display: none;">
                            <h4><i class="fas fa-files"></i> Selected Files</h4>
                            <div id="selected-files-list" class="selected-files-list"></div>
                        </div>
                    </div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-heading"></i> Project Title</label>
                        <input type="text" class="form-input premium-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework">
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i class="fas fa-file-alt"></i> Project Description</label>
                        <textarea class="form-textarea premium-textarea" name="description" required placeholder="Describe your project in detail..."></textarea>
                    </div>
                </div>
                <div class="estimation-features">
                    <div class="feature-item">
                        <i class="fas fa-robot"></i>
                        <div>
                            <h4>AI-Powered Analysis</h4>
                            <p>Advanced algorithms analyze your drawings</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-chart-line"></i>
                        <div>
                            <h4>Detailed Breakdown</h4>
                            <p>Get itemized costs for materials, labor, and logistics</p>
                        </div>
                    </div>
                    <div class="feature-item">
                        <i class="fas fa-clock"></i>
                        <div>
                            <h4>Instant Results</h4>
                            <p>Receive your estimation within minutes</p>
                        </div>
                    </div>
                </div>
                <div class="form-actions estimation-actions">
                    <button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large premium-btn" disabled>
                        <i class="fas fa-paper-plane"></i> Submit Estimation Request
                    </button>
                    <p class="estimation-note">
                        <i class="fas fa-info-circle"></i> Our expert team will review your submission and provide a detailed cost analysis.
                    </p>
                </div>
            </form>
        </div>`;
}

function getDashboardTemplate(user) {
    const isContractor = user.type === 'contractor';
    const name = user.name.split(' ')[0];

    const contractorQuickActions = `
        <div class="quick-action-card" onclick="renderAppSection('post-job')">
            <i class="fas fa-plus-circle card-icon"></i>
            <h3>Create New Project</h3>
            <p>Post a new listing for designers to quote on.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('jobs')">
            <i class="fas fa-tasks card-icon"></i>
            <h3>My Projects</h3>
            <p>View and manage all your active projects.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('estimation-tool')">
            <i class="fas fa-calculator card-icon"></i>
            <h3>AI Estimation</h3>
            <p>Get instant cost estimates for your drawings.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('approved-jobs')">
            <i class="fas fa-check-circle card-icon"></i>
            <h3>Approved Projects</h3>
            <p>Track progress and communicate on assigned work.</p>
        </div>`;
    
    const contractorWidgets = `
        <div class="widget-card">
            <h3><i class="fas fa-history"></i> Recent Projects</h3>
            <div id="recent-projects-widget" class="widget-content"></div>
        </div>`;

    const designerQuickActions = `
        <div class="quick-action-card" onclick="renderAppSection('jobs')">
            <i class="fas fa-search card-icon"></i>
            <h3>Browse Projects</h3>
            <p>Find new opportunities and submit quotes.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('my-quotes')">
            <i class="fas fa-file-invoice-dollar card-icon"></i>
            <h3>My Quotes</h3>
            <p>Track the status of your submitted quotes.</p>
        </div>
        <div class="quick-action-card" onclick="showNotification('Feature coming soon!', 'info')">
            <i class="fas fa-upload card-icon"></i>
            <h3>Submit Work</h3>
            <p>Upload deliverables for your assigned projects.</p>
        </div>
        <div class="quick-action-card" onclick="renderAppSection('messages')">
            <i class="fas fa-comments card-icon"></i>
            <h3>Messages</h3>
            <p>Communicate with clients about projects.</p>
        </div>`;
        
    const designerWidgets = `
        <div class="widget-card">
            <h3><i class="fas fa-history"></i> Recent Quotes</h3>
            <div id="recent-quotes-widget" class="widget-content"></div>
        </div>`;

    return `
        <div class="dashboard-container">
            <div class="dashboard-hero">
                <div>
                    <h2>Welcome back, ${name}!</h2>
                    <p>You are logged in to your <strong>${isContractor ? 'Contractor' : 'Designer'} Portal</strong>. Manage your workflows seamlessly.</p>
                </div>
                <div class="subscription-badge">
                    <i class="fas fa-star"></i> Pro Plan
                </div>
            </div>

            <h3 class="dashboard-section-title">Quick Actions</h3>
            <div class="dashboard-grid">
                ${isContractor ? contractorQuickActions : designerQuickActions}
            </div>

            <div class="dashboard-columns">
                ${isContractor ? contractorWidgets : designerWidgets}

                <div class="widget-card">
                    <h3><i class="fas fa-user-circle"></i> Your Profile</h3>
                    <div class="widget-content">
                        <p>Complete your profile to attract more opportunities.</p>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: 75%;"></div>
                        </div>
                        <p class="progress-label">75% Complete</p>
                        <button class="btn btn-outline" onclick="renderAppSection('settings')">
                            <i class="fas fa-edit"></i> Update Profile
                        </button>
                        <hr class="widget-divider">
                        <p>Upgrade your plan for advanced features.</p>
                        <button class="btn btn-primary" onclick="renderAppSection('settings')">
                           <i class="fas fa-arrow-up"></i> Upgrade Subscription
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
}

function getSettingsTemplate(user) {
    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-cog"></i> Settings</h2>
                <p class="header-subtitle">Manage your account, profile, and subscription details</p>
            </div>
        </div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Personal Information</h3>
                <form class="premium-form" onsubmit="event.preventDefault(); showNotification('Profile updated successfully!', 'success');">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" class="form-input" value="${user.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" value="${user.email}" disabled>
                        <small class="form-help">Email cannot be changed.</small>
                    </div>
                     <div class="form-group">
                        <label class="form-label">Company Name (Optional)</label>
                        <input type="text" class="form-input" placeholder="Your Company LLC">
                    </div>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </form>
            </div>
            
            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                 <form class="premium-form" onsubmit="event.preventDefault(); showNotification('Password functionality not implemented.', 'info');">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-input">
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>

            <div class="settings-card subscription-card">
                <h3><i class="fas fa-gem"></i> Subscription & Billing</h3>
                <p>You are currently on the <strong>Pro Plan</strong>. This gives you access to unlimited projects and AI estimations.</p>
                <div class="subscription-plans">
                    <div class="plan-card">
                        <h4>Basic</h4>
                        <p class="price">Free</p>
                        <ul>
                            <li><i class="fas fa-check"></i> 3 Projects / month</li>
                            <li><i class="fas fa-times"></i> AI Estimations</li>
                            <li><i class="fas fa-check"></i> Standard Support</li>
                        </ul>
                        <button class="btn btn-outline" disabled>Current Plan</button>
                    </div>
                    <div class="plan-card active">
                        <h4>Pro</h4>
                        <p class="price">$49<span>/mo</span></p>
                        <ul>
                            <li><i class="fas fa-check"></i> Unlimited Projects</li>
                            <li><i class="fas fa-check"></i> AI Estimations</li>
                            <li><i class="fas fa-check"></i> Priority Support</li>
                        </ul>
                         <button class="btn btn-success" onclick="showNotification('You are on the best plan!', 'info')">Your Plan</button>
                    </div>
                     <div class="plan-card">
                        <h4>Enterprise</h4>
                        <p class="price">Contact Us</p>
                        <ul>
                            <li><i class="fas fa-check"></i> Team Accounts</li>
                            <li><i class="fas fa-check"></i> Advanced Analytics</li>
                            <li><i class="fas fa-check"></i> Dedicated Support</li>
                        </ul>
                         <button class="btn btn-primary" onclick="showNotification('Contacting sales...', 'info')">Get a Quote</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Initialize the application
console.log('SteelConnect Complete Script Loaded Successfully!');
