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

// --- FULL APPLICATION SCRIPT ---
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
    notificationPollingInterval: null,
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

function initializeApp() {
    console.log("SteelConnect App Initializing...");
    
    // Inject notification styles
    injectNotificationStyles();
    
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

async function apiCall(endpoint, method, body = null, successMessage = null) {
    try {
        const options = { method, headers: {} };
        if (appState.jwtToken) {
            options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        }
        if (body) {
            if (body instanceof FormData) {
                options.body = body;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        
        const response = await fetch(BACKEND_URL + endpoint, options);

        if (response.status === 204 || response.headers.get("content-length") === "0") {
             if (!response.ok) {
                const errorMsg = response.headers.get('X-Error-Message') || `Request failed with status ${response.status}`;
                throw new Error(errorMsg);
             }
             if (successMessage) showNotification(successMessage, 'success');
             return { success: true };
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || `Request failed with status ${response.status}`);
        }

        if (successMessage) {
            showNotification(successMessage, 'success');
        }
        
        return responseData;

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showNotification(error.message, 'error');
        throw error;
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const form = event.target;
    const userData = {
        name: form.regName.value,
        email: form.regEmail.value,
        password: form.regPassword.value,
        type: form.regRole.value,
    };
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.')
        .then(() => renderAuthForm('login'))
        .catch(() => {});
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);
        showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
        
        if (data.user.type === 'designer') {
            loadUserQuotes();
        }
        addNotification(`Welcome back, ${data.user.name}!`, 'info');

    } catch(error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
    
    // Clear notification polling
    if (appState.notificationPollingInterval) {
        clearInterval(appState.notificationPollingInterval);
        appState.notificationPollingInterval = null;
    }
    
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
    showNotification('You have been logged out successfully.', 'info');
}

async function loadUserQuotes() {
    if (appState.currentUser.type !== 'designer') return;
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.userSubmittedQuotes.clear();
        quotes.forEach(quote => {
            if (quote.status === 'submitted') {
                appState.userSubmittedQuotes.add(quote.jobId);
            }
        });
    } catch (error) {
        console.error('Error loading user quotes:', error);
    }
}

// --- ENHANCED NOTIFICATION SYSTEM ---
async function loadNotifications() {
    if (!appState.currentUser) return;
    
    try {
        const response = await apiCall('/notifications', 'GET');
        if (response.success) {
            appState.notifications = response.data || [];
            renderNotificationPanel();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    const badge = document.getElementById('notification-badge');
    
    const unreadCount = appState.notifications.filter(n => !n.isRead).length;

    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    if (!panelList) return;

    if (appState.notifications.length === 0) {
        panelList.innerHTML = `
            <div class="notification-empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications yet</p>
                <small>You'll see updates about your projects here</small>
            </div>`;
        return;
    }

    panelList.innerHTML = appState.notifications.map(notification => {
        const iconMap = {
            job: 'fa-briefcase',
            quote: 'fa-file-invoice-dollar',
            message: 'fa-comment-alt',
            estimation: 'fa-calculator',
            user: 'fa-user-circle',
            file: 'fa-file-alt',
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };
        
        const icon = iconMap[notification.type] || 'fa-bell';
        const timeAgo = getTimeAgo(notification.createdAt);
        const isUnread = !notification.isRead;
        const metadataStr = JSON.stringify(notification.metadata || {}).replace(/"/g, '&quot;');
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}" onclick="handleNotificationClick('${notification.id}', '${notification.type}', '${metadataStr}')">
                <div class="notification-item-icon ${notification.type}">
                    <i class="fas ${icon}"></i>
                    ${isUnread ? '<div class="unread-dot"></div>' : ''}
                </div>
                <div class="notification-item-content">
                    <p class="notification-message">${notification.message}</p>
                    <span class="notification-timestamp">${timeAgo}</span>
                </div>
                <div class="notification-actions">
                    ${isUnread ? '<div class="mark-read-btn" onclick="event.stopPropagation(); markNotificationAsRead(\'' + notification.id + '\')"><i class="fas fa-check"></i></div>' : ''}
                </div>
            </div>`;
    }).join('');
}

// Handle notification clicks with navigation
async function handleNotificationClick(notificationId, type, metadataStr) {
    try {
        const metadata = JSON.parse(metadataStr.replace(/&quot;/g, '"'));
        
        // Mark as read first
        await markNotificationAsRead(notificationId);
        
        // Navigate based on notification type
        switch (type) {
            case 'job':
                if (metadata.jobId) {
                    renderAppSection('jobs');
                    // Optionally scroll to specific job
                    setTimeout(() => {
                        const jobCard = document.querySelector(`[data-job-id="${metadata.jobId}"]`);
                        if (jobCard) {
                            jobCard.scrollIntoView({ behavior: 'smooth' });
                            jobCard.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.5)';
                            setTimeout(() => jobCard.style.boxShadow = '', 2000);
                        }
                    }, 500);
                }
                break;
                
            case 'quote':
                if (appState.currentUser.type === 'designer') {
                    renderAppSection('my-quotes');
                } else {
                    renderAppSection('jobs');
                }
                break;
                
            case 'message':
                if (metadata.conversationId) {
                    renderConversationView(metadata.conversationId);
                } else {
                    renderAppSection('messages');
                }
                break;
                
            case 'estimation':
                renderAppSection('my-estimations');
                break;
                
            default:
                // Close notification panel for other types
                break;
        }
        
        // Close notification panel
        document.getElementById('notification-panel').classList.remove('active');
        
    } catch (error) {
        console.error('Error handling notification click:', error);
    }
}

// Mark single notification as read
async function markNotificationAsRead(notificationId) {
    try {
        const response = await apiCall(`/notifications/${notificationId}/read`, 'PUT');
        if (response.success) {
            // Update local state
            const notification = appState.notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.isRead = true;
                notification.readAt = new Date().toISOString();
            }
            renderNotificationPanel();
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

// Enhanced clear notifications function
async function clearNotifications() {
    try {
        const response = await apiCall('/notifications/mark-all-read', 'PUT');
        if (response.success) {
            // Update local state
            appState.notifications.forEach(n => {
                n.isRead = true;
                n.readAt = new Date().toISOString();
            });
            renderNotificationPanel();
            showNotification('All notifications marked as read', 'success');
        }
    } catch (error) {
        console.error('Error clearing notifications:', error);
        showNotification('Failed to clear notifications', 'error');
    }
}

function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        const isOpening = !panel.classList.contains('active');
        panel.classList.toggle('active');
        
        if (isOpening) {
            // Load fresh notifications when opening
            loadNotifications();
        }
    }
}

// Periodic notification polling
function startNotificationPolling() {
    if (!appState.currentUser) return;
    
    // Clear any existing polling
    if (appState.notificationPollingInterval) {
        clearInterval(appState.notificationPollingInterval);
    }
    
    // Initial load
    loadNotifications();
    
    // Poll every 30 seconds for new notifications
    appState.notificationPollingInterval = setInterval(() => {
        if (appState.currentUser) {
            loadNotifications();
        } else {
            clearInterval(appState.notificationPollingInterval);
            appState.notificationPollingInterval = null;
        }
    }, 30000);
}

// Enhanced addNotification function for better local notifications
function addNotification(message, type = 'info', link = '#') {
    const newNotification = {
        id: Date.now(),
        message,
        type,
        createdAt: new Date().toISOString(),
        link,
        isRead: false,
        metadata: {}
    };
    
    // Add to beginning of notifications array
    appState.notifications.unshift(newNotification);
    
    // Keep only last 50 notifications in memory
    if (appState.notifications.length > 50) {
        appState.notifications = appState.notifications.slice(0, 50);
    }
    
    renderNotificationPanel();
    
    // Show toast notification
    showNotification(message, type, 4000);
}

// --- ENHANCED ESTIMATION SYSTEM ---
async function loadUserEstimations() {
    if (!appState.currentUser) return;
    
    try {
        const response = await apiCall(`/estimation/contractor/${appState.currentUser.email}`, 'GET');
        appState.myEstimations = response.estimations || [];
    } catch (error) {
        console.error('Error loading user estimations:', error);
        appState.myEstimations = [];
    }
}

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
                    <div class="empty-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
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
                        <div class="meta-item"><i class="fas fa-calendar-plus"></i><span>Submitted: ${createdDate}</span></div>
                        <div class="meta-item"><i class="fas fa-clock"></i><span>Updated: ${updatedDate}</span></div>
                        ${hasFiles ? `<div class="meta-item"><i class="fas fa-paperclip"></i><span>${estimation.uploadedFiles.length} file(s) uploaded</span></div>` : ''}
                    </div>
                    <div class="estimation-actions">
                        <div class="action-buttons">
                            ${hasFiles ? `<button class="btn btn-outline btn-sm" onclick="viewEstimationFiles('${estimation._id}')"><i class="fas fa-eye"></i> View Files</button>` : ''}
                            ${hasResult ? `<button class="btn btn-success btn-sm" onclick="downloadEstimationResult('${estimation._id}')"><i class="fas fa-download"></i> Download Result</button>` : ''}
                            ${estimation.status === 'pending' ? `<button class="btn btn-danger btn-sm" onclick="deleteEstimation('${estimation._id}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');

        if(jobsListContainer) jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        if(jobsListContainer) {
            jobsListContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>We encountered an issue loading the projects. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
        }
    }
}

// Continue with other existing functions...
async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-check-circle"></i> Approved Projects</h2><p class="header-subtitle">Manage your approved projects and communicate with designers</p></div></div>
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
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here once you accept quotes from designers.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }
        
        listContainer.innerHTML = approvedJobs.map(job => {
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            return `
                <div class="job-card premium-card approved-job">
                    <div class="job-header">
                        <div class="job-title-section"><h3 class="job-title">${job.title}</h3><span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span></div>
                        <div class="approved-amount"><span class="amount-label">Approved Amount</span><span class="amount-value">${job.approvedAmount}</span></div>
                    </div>
                    <div class="job-meta"><div class="job-meta-item"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div></div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions"><div class="job-actions-group"><button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button><button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button></div></div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Approved Projects</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed? This action cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed successfully!')
            .then(() => {
                addNotification('A project has been marked as completed!', 'success');
                fetchAndRenderApprovedJobs();
            })
            .catch(() => {});
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header"><div class="header-content"><h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2><p class="header-subtitle">Track your quote submissions and manage communications</p></div></div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';
    
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;
        
        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Submitted</h3><p>You haven't submitted any quotes yet. Browse available projects to get started.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button></div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const canDelete = quote.status === 'submitted';
            const canEdit = quote.status === 'submitted';
            const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
            const statusClass = quote.status;
            const actionButtons = [];
            if (quote.status === 'approved') {
                actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit Quote</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
            }
            return `
                <div class="quote-card premium-card quote-status-${statusClass}">
                    <div class="quote-header">
                        <div class="quote-title-section"><h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
                        <div class="quote-amount-section"><span class="amount-label">Quote Amount</span><span class="amount-value">${quote.quoteAmount}</span></div>
                    </div>
                    <div class="quote-meta">
                        ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                        <div class="quote-meta-item"><i class="fas fa-clock"></i><span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span></div>
                    </div>
                    <div class="quote-description"><p>${quote.description}</p></div>
                    ${attachmentLink}
                    <div class="quote-actions"><div class="quote-actions-group">${actionButtons.join('')}</div></div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Quotes</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button></div>`;
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        
        const content = `
            <div class="modal-header premium-modal-header"><h3><i class="fas fa-edit"></i> Edit Your Quote</h3><p class="modal-subtitle">Update your quote details for: <strong>${quote.jobTitle}</strong></p></div>
            <form id="edit-quote-form" class="premium-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required min="1"></div>
                </div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach...">${quote.description}</textarea></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Supported formats: PDF, DOC, DWG, Images</small></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button></div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {}
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
            if (form[field]) formData.append(field, form[field].value);
        });
        if (form.attachment.files.length > 0) {
            formData.append('attachment', form.attachment.files[0]);
        }
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        addNotification(`Your new project "${form.title.value}" has been posted.`, 'job');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {} finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This will also delete all associated quotes and cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.')
            .then(() => fetchAndRenderJobs())
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.')
            .then(() => {
                fetchAndRenderMyQuotes();
                loadUserQuotes();
            })
            .catch(() => {});
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        
        let quotesHTML = `<div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3><p class="modal-subtitle">Review and manage quotes for this project</p></div>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received</h3><p>No quotes have been submitted for this project yet. Check back later.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list premium-quotes">`;
            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = '';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                if(canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve Quote</button>${messageButton}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${messageButton}`;
                } else {
                    actionButtons = messageButton;
                }
                const statusClass = quote.status;
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
                return `
                    <div class="quote-item premium-quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info"><div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div><div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div></div>
                            <div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div>
                        </div>
                        <div class="quote-details">
                            ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
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
        showGenericModal(`<div class="modal-header premium-modal-header"><h3><i class="fas fa-exclamation-triangle"></i> Error</h3></div><div class="error-state premium-error"><p>Could not load quotes for this project. Please try again later.</p></div>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer and reject other quotes.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!')
            .then(() => {
                addNotification('You have approved a quote and assigned a new project!', 'success');
                closeModal();
                fetchAndRenderJobs();
                showNotification('Project has been assigned! You can now communicate with the designer.', 'success');
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header premium-modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your best proposal for this project</p></div>
        <form id="quote-form" class="premium-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required min="1" step="0.01" placeholder="Enter your quote amount"></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required min="1" placeholder="Project duration"></div>
            </div>
            <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach..."></textarea></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional, max 5)</label><input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload portfolio samples or relevant documents</small></div>
            <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Quote</button></div>
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
        fetchAndRenderJobs();
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

// --- ENHANCED MESSAGING SYSTEM ---
async function openConversation(jobId, recipientId) {
    try {
        showNotification('Opening conversation...', 'info');
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {}
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-comments"></i> Messages</h2><p class="header-subtitle">Communicate with clients and designers</p></div>
        </div>
        <div id="conversations-list" class="conversations-container premium-conversations"></div>`;
    updateDynamicHeader();
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;
    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3><p>Start collaborating with professionals by messaging them from job quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button></div>`;
            return;
        }
        const conversationsHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherParticipantName = otherParticipant ? otherParticipant.name : 'Unknown User';
            const lastMessage = convo.lastMessage ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const avatarColor = getAvatarColor(otherParticipantName);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;
            return `
                <div class="conversation-card premium-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${avatarColor}">${otherParticipantName.charAt(0).toUpperCase()}${isUnread ? '<div class="unread-indicator"></div>' : ''}</div>
                    <div class="convo-details">
                        <div class="convo-header"><h4>${otherParticipantName}</h4><div class="convo-meta"><span class="participant-type ${otherParticipant ? otherParticipant.type : ''}">${otherParticipant ? otherParticipant.type : ''}</span><span class="convo-time">${timeAgo}</span></div></div>
                        <p class="convo-project"><i class="fas fa-briefcase"></i><strong>${convo.jobTitle}</strong></p>
                        <p class="convo-preview">${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? `<strong>${convo.lastMessageBy}:</strong> ` : ''}${lastMessage}</p>
                    </div>
                    <div class="convo-arrow"><i class="fas fa-chevron-right"></i></div>
                </div>`;
        }).join('');
        listContainer.innerHTML = conversationsHTML;
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Conversations</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button></div>`;
    }
}

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
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === messageDate.toDateString();

    if (isToday) {
        return `Today, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (isYesterday) {
        return `Yesterday, ${messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return messageDate.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function renderConversationView(conversationOrId) {
    let conversation;
    if (typeof conversationOrId === 'string') {
        conversation = appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId };
    } else {
        conversation = conversationOrId;
    }
    
    if (!conversation.participants) {
        try {
            const response = await apiCall('/messages', 'GET');
            appState.conversations = response.data || [];
            conversation = appState.conversations.find(c => c.id === conversation.id);
        } catch(e) {}
        if(!conversation) {
            showNotification('Conversation not found.', 'error');
            return;
        }
    }

    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants.find(p => p.id !== appState.currentUser.id);
    const avatarColor = getAvatarColor(otherParticipant ? otherParticipant.name : 'Unknown');
    
    container.innerHTML = `
        <div class="chat-container premium-chat">
            <div class="chat-header premium-chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn premium-back-btn"><i class="fas fa-arrow-left"></i></button>
                <div class="chat-header-info">
                    <div class="chat-avatar premium-avatar" style="background-color: ${avatarColor}">${otherParticipant ? otherParticipant.name.charAt(0).toUpperCase() : '?'}<div class="online-indicator"></div></div>
                    <div class="chat-details"><h3>${otherParticipant ? otherParticipant.name : 'Conversation'}</h3><p class="chat-project"><i class="fas fa-briefcase"></i> ${conversation.jobTitle || ''}</p><span class="chat-status">Active now</span></div>
                </div>
                <div class="chat-actions">
                    <span class="participant-type-badge premium-badge ${otherParticipant ? otherParticipant.type : ''}"><i class="fas ${otherParticipant && otherParticipant.type === 'designer' ? 'fa-drafting-compass' : 'fa-building'}"></i> ${otherParticipant ? otherParticipant.type : ''}</span>
                    <button class="chat-options-btn"><i class="fas fa-ellipsis-v"></i></button>
                </div>
            </div>
            <div class="chat-messages premium-messages" id="chat-messages-container"><div class="loading-messages"><div class="spinner"></div><p>Loading messages...</p></div></div>
            <div class="chat-input-area premium-input-area">
                <form id="send-message-form" class="message-form premium-message-form">
                    <div class="message-input-container">
                        <button type="button" class="attachment-btn" title="Add attachment"><i class="fas fa-paperclip"></i></button>
                        <input type="text" id="message-text-input" placeholder="Type your message..." required autocomplete="off">
                        <button type="button" class="emoji-btn" title="Add emoji"><i class="fas fa-smile"></i></button>
                        <button type="submit" class="send-button premium-send-btn" title="Send message"><i class="fas fa-paper-plane"></i></button>
                    </div>
                </form>
            </div>
        </div>`;

    document.getElementById('send-message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(conversation.id);
    });

    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        const messages = response.data || [];
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `<div class="empty-messages premium-empty-messages"><div class="empty-icon"><i class="fas fa-comment-dots"></i></div><h4>Start the conversation</h4><p>Send your first message to begin collaborating on this project.</p></div>`;
        } else {
            let messagesHTML = '';
            let lastDate = null;
            messages.forEach((msg, index) => {
                const messageDate = new Date(msg.createdAt).toDateString();
                if(messageDate !== lastDate) {
                    messagesHTML += `<div class="chat-date-separator"><span>${new Date(msg.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</span></div>`;
                    lastDate = messageDate;
                }

                const isMine = msg.senderId === appState.currentUser.id;
                const time = new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const prevMsg = messages[index - 1];
                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                const avatarColor = getAvatarColor(msg.senderName);
                messagesHTML += `
                    <div class="message-wrapper premium-message ${isMine ? 'me' : 'them'}">
                        ${!isMine && showAvatar ? `<div class="message-avatar premium-msg-avatar" style="background-color: ${avatarColor}">${msg.senderName.charAt(0).toUpperCase()}</div>` : '<div class="message-avatar-spacer" style="width: 40px; flex-shrink: 0;"></div>'}
                        <div class="message-content">
                            ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName}</div>` : ''}
                            <div class="message-bubble premium-bubble ${isMine ? 'me' : 'them'}">${msg.text}</div>
                            <div class="message-meta">${time}</div>
                        </div>
                    </div>`;
            });
            messagesContainer.innerHTML = messagesHTML;
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `<div class="error-messages premium-error-messages"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h4>Error loading messages</h4><p>Please try again later.</p></div>`;
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const sendBtn = document.querySelector('.send-button');
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<div class="btn-spinner"></div>';
    try {
        const response = await apiCall(`/messages/${conversationId}/messages`, 'POST', { text });
        input.value = '';
        addNotification('Message sent successfully!', 'message');
        const messagesContainer = document.getElementById('chat-messages-container');
        const newMessage = response.data;
        if(messagesContainer.querySelector('.empty-messages')) {
            messagesContainer.innerHTML = '';
        }
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-wrapper premium-message me';
        const time = new Date(newMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        messageBubble.innerHTML = `
            <div class="message-avatar-spacer" style="width: 40px; flex-shrink: 0;"></div>
            <div class="message-content">
                <div class="message-bubble premium-bubble me">${newMessage.text}</div>
                <div class="message-meta">${time}</div>
            </div>`;
        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch(error) {} finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        input.focus();
    }
}

// --- ENHANCED UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    <div id="modal-form-container"></div>
                </div>
            </div>`;
        modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
        renderAuthForm(view);
    }
}

function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    if (!container) return;
    container.innerHTML = view === 'login' ? getLoginTemplate() : getRegisterTemplate();
    const formId = view === 'login' ? 'login-form' : 'register-form';
    const handler = view === 'login' ? handleLogin : handleRegister;
    document.getElementById(formId).addEventListener('submit', handler);
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    if(modalContainer) {
        modalContainer.innerHTML = `
            <div class="modal-overlay premium-overlay">
                <div class="modal-content premium-modal" style="${style}" onclick="event.stopPropagation()">
                    <button class="modal-close-button premium-close" onclick="closeModal()"><i class="fas fa-times"></i></button>
                    ${innerHTML}
                </div>
            </div>`;
        modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
    }
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    
    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    // Setup user dropdown
    document.getElementById('user-info').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent global click listener from closing it immediately
        document.getElementById('user-info-dropdown').classList.toggle('active');
    });
    document.getElementById('user-settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderAppSection('settings');
        document.getElementById('user-info-dropdown').classList.remove('active');
    });
    document.getElementById('user-logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Setup notification panel
    document.getElementById('notification-bell-container').addEventListener('click', toggleNotificationPanel);
    document.getElementById('clear-notifications-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        clearNotifications();
    });
     
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('dashboard');
    renderNotificationPanel();
    
    // Start notification polling
    startNotificationPolling();
    
    if (user.type === 'designer') {
        loadUserQuotes();
    }
    if (user.type === 'contractor') {
        loadUserEstimations();
    }
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info-container').style.display = 'none';
    
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
    const container = document.getElementById('app-container');
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
                <div class="header-content"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2><p class="header-subtitle">${subtitle}</p></div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;
        if (userRole === 'contractor') updateDynamicHeader();
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
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

// --- DASHBOARD WIDGETS (ENHANCED) ---
async function renderRecentActivityWidgets() {
    const user = appState.currentUser;
    const recentProjectsContainer = document.getElementById('recent-projects-widget');
    const recentQuotesContainer = document.getElementById('recent-quotes-widget');
    
    if (user.type === 'contractor') {
        if(recentProjectsContainer) recentProjectsContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const endpoint = `/jobs/user/${user.id}?limit=3`;
            const response = await apiCall(endpoint, 'GET');
            const recentJobs = (response.data || []).slice(0, 3);
            if (recentJobs.length > 0) {
                recentProjectsContainer.innerHTML = recentJobs.map(job => `
                    <div class="widget-list-item" id="widget-item-${job.id}">
                        <div class="widget-item-header" onclick="toggleWidgetDetails('${job.id}', 'job')">
                            <div class="widget-item-info">
                                <i class="fas fa-briefcase widget-item-icon"></i>
                                <div>
                                    <p class="widget-item-title">${job.title}</p>
                                    <span class="widget-item-meta">Budget: ${job.budget}</span>
                                </div>
                            </div>
                            <span class="widget-item-status ${job.status}">${job.status}</span>
                        </div>
                        <div class="widget-item-details" id="widget-details-${job.id}"></div>
                    </div>
                `).join('');
            } else {
                recentProjectsContainer.innerHTML = '<p class="widget-empty-text">No recent projects found.</p>';
            }
        } catch(e) {
            recentProjectsContainer.innerHTML = '<p class="widget-empty-text">Could not load projects.</p>';
        }
    } else if (user.type === 'designer') {
        if(recentQuotesContainer) recentQuotesContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
        try {
            const endpoint = `/quotes/user/${user.id}?limit=3`;
            const response = await apiCall(endpoint, 'GET');
            const recentQuotes = (response.data || []).slice(0, 3);
             if (recentQuotes.length > 0) {
                recentQuotesContainer.innerHTML = recentQuotes.map(quote => `
                    <div class="widget-list-item" id="widget-item-${quote.id}">
                        <div class="widget-item-header" onclick="toggleWidgetDetails('${quote.id}', 'quote')">
                             <div class="widget-item-info">
                                <i class="fas fa-file-invoice-dollar widget-item-icon"></i>
                                <div>
                                    <p class="widget-item-title">Quote for: ${quote.jobTitle}</p>
                                    <span class="widget-item-meta">Amount: ${quote.quoteAmount}</span>
                                </div>
                            </div>
                            <span class="widget-item-status ${quote.status}">${quote.status}</span>
                        </div>
                        <div class="widget-item-details" id="widget-details-${quote.id}"></div>
                    </div>
                `).join('');
            } else {
                recentQuotesContainer.innerHTML = '<p class="widget-empty-text">No recent quotes found.</p>';
            }
        } catch(e) {
            recentQuotesContainer.innerHTML = '<p class="widget-empty-text">Could not load quotes.</p>';
        }
    }
}

async function toggleWidgetDetails(itemId, itemType) {
    const detailsContainer = document.getElementById(`widget-details-${itemId}`);
    if (!detailsContainer) return;

    if (detailsContainer.classList.contains('expanded')) {
        detailsContainer.classList.remove('expanded');
        detailsContainer.innerHTML = '';
        return;
    }

    // Close any other open details
    document.querySelectorAll('.widget-item-details.expanded').forEach(el => {
        el.classList.remove('expanded');
        el.innerHTML = '';
    });

    detailsContainer.innerHTML = '<div class="widget-loader"><div class="spinner"></div></div>';
    detailsContainer.classList.add('expanded');

    try {
        if (itemType === 'job') {
            const job = appState.jobs.find(j => j.id === itemId) || (await apiCall(`/jobs/${itemId}`, 'GET')).data;
            if (job) {
                detailsContainer.innerHTML = `
                    <p><strong>Description:</strong> ${job.description}</p>
                    <p><strong>Deadline:</strong> ${new Date(job.deadline).toLocaleDateString()}</p>
                    ${job.assignedToName ? `<p><strong>Assigned To:</strong> ${job.assignedToName}</p>` : ''}
                    <button class="btn btn-outline" onclick="renderAppSection('jobs')">View Full Details</button>
                `;
            }
        } else if (itemType === 'quote') {
            const quote = appState.myQuotes.find(q => q.id === itemId) || (await apiCall(`/quotes/${itemId}`, 'GET')).data;
            if (quote) {
                detailsContainer.innerHTML = `
                    <p><strong>Description:</strong> ${quote.description}</p>
                    <p><strong>Timeline:</strong> ${quote.timeline} days</p>
                    <button class="btn btn-outline" onclick="renderAppSection('my-quotes')">View Full Details</button>
                `;
            }
        }
    } catch (error) {
        detailsContainer.innerHTML = '<p>Could not load details.</p>';
    }
}

// --- ESTIMATION TOOL FUNCTIONS ---
function setupEstimationToolEventListeners() {
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
        uploadArea.addEventListener('dragleave', () => { uploadArea.classList.remove('drag-over'); });
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
                <div class="file-info"><i class="fas ${fileType}"></i><div class="file-details"><span class="file-name">${file.name}</span><span class="file-size">${fileSize} MB</span></div></div>
                <button type="button" class="remove-file-btn" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
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
    const projectTitle = form.projectTitle
        
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

async function viewEstimationFiles(estimationId) {
    try {
        const response = await apiCall(`/estimation/${estimationId}/files`, 'GET');
        const files = response.files || [];
        const content = `
            <div class="modal-header"><h3><i class="fas fa-folder-open"></i> Uploaded Project Files</h3><p class="modal-subtitle">Files submitted with your estimation request</p></div>
            <div class="files-list premium-files">
                ${files.length === 0 ? `<div class="empty-state"><i class="fas fa-file"></i><p>No files found for this estimation.</p></div>` : files.map(file => `
                    <div class="file-item">
                        <div class="file-info"><i class="fas fa-file-pdf"></i><div class="file-details"><h4>${file.name}</h4><span class="file-date">Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}</span></div></div>
                        <a href="${file.url}" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i> View</a>
                    </div>`).join('')}
            </div>`;
        showGenericModal(content, 'max-width: 600px;');
    } catch (error) {
        showNotification('Error loading files', 'error');
    }
}

async function downloadEstimationResult(estimationId) {
    try {
        const response = await apiCall(`/estimation/${estimationId}/result`, 'GET');
        if (response.success && response.resultFile) {
            addNotification('Your estimation result is ready for download.', 'success');
            window.open(response.resultFile.url, '_blank');
        }
    } catch (error) {
        showNotification('Error downloading result file', 'error');
    }
}

async function deleteEstimation(estimationId) {
    if (confirm('Are you sure you want to delete this estimation request? This action cannot be undone.')) {
        try {
            await apiCall(`/estimation/${estimationId}`, 'DELETE', null, 'Estimation deleted successfully');
            fetchAndRenderMyEstimations();
        } catch (error) {}
    }
}

// Continue with existing job functions...
async function fetchAndRenderJobs(loadMore = false) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!loadMore) {
        appState.jobs = [];
        appState.jobsPage = 1;
        appState.hasMoreJobs = true;
        if (jobsListContainer) jobsListContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading projects...</p></div>';
    }

    if (!jobsListContainer || !appState.hasMoreJobs) {
        if(loadMoreContainer) loadMoreContainer.innerHTML = '';
        return;
    }

    const user = appState.currentUser;
    const endpoint = user.type === 'designer' 
        ? `/jobs?page=${appState.jobsPage}&limit=6` 
        : `/jobs/user/${user.id}`;
    
    if(loadMoreContainer) loadMoreContainer.innerHTML = `<button class="btn btn-loading" disabled><div class="btn-spinner"></div>Loading...</button>`;

    try {
        const response = await apiCall(endpoint, 'GET');
        const newJobs = response.data || [];
        appState.jobs.push(...newJobs);
        
        if (user.type === 'designer') {
            appState.hasMoreJobs = response.pagination.hasNext;
            appState.jobsPage += 1;
        } else {
            appState.hasMoreJobs = false;
        }
        
        if (appState.jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-briefcase"></i></div><h3>No Projects Available</h3><p>Check back later for new opportunities or try adjusting your search criteria.</p></div>`
                : `<div class="empty-state premium-empty"><div class="empty-icon"><i class="fas fa-plus-circle"></i></div><h3>You haven't posted any projects yet</h3><p>Ready to get started? Post your first project and connect with talented professionals.</p><button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job =>
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote 
                ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`
                : user.type === 'designer' && hasUserQuoted
                ? `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : user.type === 'designer' && job.status === 'assigned'
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`
                : '';
            const actions = user.type === 'designer' ? quoteButton : `<div class="job-actions-group"><button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button><button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button></div>`;
            const statusBadge = job.status !== 'open' 
                ? `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>` 
                : `<span class="job-status-badge open"><i class="fas fa-clock"></i> Open</span>`;
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i><a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i><span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';
            
            return `
                <div class="job-card premium-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <div class="job-title-section"><h3 class="job-title">${job.title}</h3>${statusBadge}</div>
                        <div class="job-budget-section"><span class="budget-label">Budget</span><span class="budget-amount">${job.budget}</span></div>
                    </div>
                    <div class="job-meta">
                        <div class="job-meta-item"><i class="fas fa-user"></i><span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span></div>
                        ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>` : ''}
                        ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i><span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i><a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        if(jobsListContainer) jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        if(jobsListContainer) {
            jobsListContainer.innerHTML = `<div class="error-state premium-error"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>We encountered an issue loading the projects. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
        }
    }
}

// Complete the handleEstimationSubmit function that was cut off
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
        addNotification(`Your AI estimation request for "${projectTitle}" has been submitted.`, 'estimation');
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

// Enhanced notification system
function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    const notification = document.createElement('div');
    notification.className = `notification premium-notification notification-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
    notification.innerHTML = `
        <div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div>
        <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    notificationContainer.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// Inject notification styles
function injectNotificationStyles() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
/* Enhanced Notification Styles */
.notification-item {
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.notification-item:hover {
    background-color: rgba(59, 130, 246, 0.05);
    border-color: rgba(59, 130, 246, 0.2);
}

.notification-item.unread {
    background-color: rgba(59, 130, 246, 0.05);
    border-left: 3px solid #3b82f6;
}

.notification-item-icon {
    position: relative;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.notification-item-icon.job {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.notification-item-icon.quote {
    background-color: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
}

.notification-item-icon.message {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.notification-item-icon.estimation {
    background-color: rgba(139, 92, 246, 0.1);
    color: #8b5cf6;
}

.notification-item-icon.user {
    background-color: rgba(107, 114, 128, 0.1);
    color: #6b7280;
}

.notification-item-icon.file {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.notification-item-icon.info {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
}

.notification-item-icon.success {
    background-color: rgba(16, 185, 129, 0.1);
    color: #10b981;
}

.notification-item-icon.warning {
    background-color: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
}

.notification-item-icon.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #ef4444;
}

.unread-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background-color: #ef4444;
    border-radius: 50%;
    border: 2px solid white;
}

.notification-item-content {
    flex: 1;
    min-width: 0;
}

.notification-message {
    font-size: 14px;
    line-height: 1.4;
    color: #374151;
    margin: 0 0 4px 0;
    word-break: break-word;
}

.notification-timestamp {
    font-size: 12px;
    color: #6b7280;
}

.notification-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
}

.mark-read-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: #f3f4f6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s ease;
    color: #6b7280;
    font-size: 10px;
    border: none;
}

.notification-item:hover .mark-read-btn {
    opacity: 1;
}

.mark-read-btn:hover {
    background-color: #e5e7eb;
    color: #374151;
    transform: scale(1.1);
}

.notification-empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
}

.notification-empty-state i {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
}

.notification-empty-state p {
    margin: 0 0 8px 0;
    font-weight: 500;
    font-size: 16px;
}

.notification-empty-state small {
    opacity: 0.7;
    font-size: 14px;
}

#notification-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

#notification-panel {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 380px;
    max-height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    border: 1px solid #e5e7eb;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    z-index: 1000;
    overflow: hidden;
}

#notification-panel.active {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.notification-panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f9fafb;
}

.notification-panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
}

.notification-panel-list {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
}

.notification-panel-list::-webkit-scrollbar {
    width: 6px;
}

.notification-panel-list::-webkit-scrollbar-track {
    background: #f1f5f9;
}

.notification-panel-list::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.notification-panel-list::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

#clear-notifications-btn {
    padding: 6px 12px;
    font-size: 12px;
    background: none;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s ease;
}

#clear-notifications-btn:hover {
    background: #f3f4f6;
    color: #374151;
}

/* Toast notification styles */
.notification.premium-notification {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-left: 4px solid;
    transition: all 0.3s ease;
    max-width: 400px;
    min-width: 300px;
}

.notification.notification-success {
    background: #f0f9ff;
    border-left-color: #10b981;
    color: #065f46;
}

.notification.notification-error {
    background: #fef2f2;
    border-left-color: #ef4444;
    color: #991b1b;
}

.notification.notification-warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
    color: #92400e;
}

.notification.notification-info {
    background: #eff6ff;
    border-left-color: #3b82f6;
    color: #1e40af;
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
}

.notification-content i {
    font-size: 16px;
}

.notification-close {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
}

.notification-close:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.05);
}

@media (max-width: 768px) {
    #notification-panel {
        width: 340px;
        right: -20px;
    }
    
    .notification.premium-notification {
        max-width: 320px;
        min-width: 280px;
    }
}
    `;
    document.head.appendChild(styleSheet);
}

// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Welcome Back</h2><p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input premium-input" name="loginEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input premium-input" name="loginPassword" required placeholder="Enter your password"></div>
            <button type="submit" class="btn btn-primary btn-full premium-btn"><i class="fas fa-sign-in-alt"></i> Sign In</button>
        </form>
        <div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `
        <div class="auth-header premium-auth-header">
            <div class="auth-logo"><i class="fas fa-drafting-compass"></i></div>
            <h2>Join SteelConnect</h2><p>Create your professional account</p>
        </div>
        <form id="register-form" class="premium-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input premium-input" name="regName" required placeholder="Enter your full name"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email Address</label><input type="email" class="form-input premium-input" name="regEmail" required placeholder="Enter your email"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input premium-input" name="regPassword" required placeholder="Create a strong password"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select premium-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary btn-full premium-btn"><i class="fas fa-user-plus"></i> Create Account</button>
        </form>
        <div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p class="header-subtitle">Create a detailed project listing to attract qualified professionals</p></div>
        </div>
        <div class="post-job-container premium-container">
            <form id="post-job-form" class="premium-form post-job-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input premium-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div>
                    <div class="form-row">
                        <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget Range</label><input type="text" class="form-input premium-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div>
                        <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Project Deadline</label><input type="date" class="form-input premium-input" name="deadline" required></div>
                    </div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Required Skills</label><input type="text" class="form-input premium-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis"><small class="form-help">Separate skills with commas</small></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-external-link-alt"></i> Project Link (Optional)</label><input type="url" class="form-input premium-input" name="link" placeholder="https://example.com/project-details"><small class="form-help">Link to additional project information</small></div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-align-left"></i> Detailed Description</label><textarea class="form-textarea premium-textarea" name="description" required placeholder="Provide a comprehensive description of your project..."></textarea></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Project Attachments</label><input type="file" class="form-input file-input premium-file-input" name="attachment" accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png"><small class="form-help">Upload drawings or specifications (Max 10MB)</small></div>
                </div>
                <div class="form-actions"><button type="submit" class="btn btn-primary btn-large premium-btn"><i class="fas fa-rocket"></i> Post Project</button></div>
            </form>
        </div>`;
}

function getEstimationToolTemplate() {
    return `
        <div id="dynamic-feature-header" class="dynamic-feature-header"></div>
        <div class="section-header modern-header">
            <div class="header-content"><h2><i class="fas fa-calculator"></i> AI-Powered Cost Estimation</h2><p class="header-subtitle">Upload your structural drawings to get instant, accurate cost estimates</p></div>
        </div>
        <div class="estimation-tool-container premium-estimation-container">
            <div class="estimation-steps">
                <div class="step active"><div class="step-number">1</div><div class="step-content"><h4>Upload Files</h4><p>Add your project drawings</p></div></div>
                <div class="step"><div class="step-number">2</div><div class="step-content"><h4>Project Details</h4><p>Describe your requirements</p></div></div>
                <div class="step"><div class="step-number">3</div><div class="step-content"><h4>Get Estimate</h4><p>Receive detailed cost breakdown</p></div></div>
            </div>
            <form id="estimation-form" class="premium-estimation-form">
                <div class="form-section premium-section">
                    <h3><i class="fas fa-upload"></i> Upload Project Files</h3>
                    <div class="file-upload-section premium-upload-section">
                        <div id="file-upload-area" class="file-upload-area premium-upload-area">
                            <input type="file" id="file-upload-input" accept=".pdf,.dwg,.doc,.docx,.jpg,.jpeg,.png" multiple />
                            <div class="upload-content">
                                <div class="file-upload-icon"><i class="fas fa-cloud-upload-alt"></i></div>
                                <h3>Drag & Drop Your Files Here</h3><p>or click to browse</p>
                                <div class="supported-formats"><span class="format-badge">PDF</span><span class="format-badge">DWG</span><span class="format-badge">DOC</span><span class="format-badge">Images</span></div>
                                <small class="upload-limit">Maximum 10 files, 15MB each</small>
                            </div>
                        </div>
                        <div id="file-info-container" class="selected-files-container" style="display: none;"><h4><i class="fas fa-files"></i> Selected Files</h4><div id="selected-files-list" class="selected-files-list"></div></div>
                    </div>
                </div>
                <div class="form-section premium-section">
                    <h3><i class="fas fa-info-circle"></i> Project Information</h3>
                    <div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input premium-input" name="projectTitle" required placeholder="e.g., Commercial Building Steel Framework"></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Project Description</label><textarea class="form-textarea premium-textarea" name="description" required placeholder="Describe your project in detail..."></textarea></div>
                </div>
                <div class="estimation-features">
                    <div class="feature-item"><i class="fas fa-robot"></i><div><h4>AI-Powered Analysis</h4><p>Advanced algorithms analyze your drawings</p></div></div>
                    <div class="feature-item"><i class="fas fa-chart-line"></i><div><h4>Detailed Breakdown</h4><p>Get itemized costs for materials, labor, and logistics</p></div></div>
                    <div class="feature-item"><i class="fas fa-clock"></i><div><h4>Instant Results</h4><p>Receive your estimation within minutes</p></div></div>
                </div>
                <div class="form-actions estimation-actions">
                    <button type="button" id="submit-estimation-btn" class="btn btn-primary btn-large premium-btn" disabled><i class="fas fa-paper-plane"></i> Submit Estimation Request</button>
                    <p class="estimation-note"><i class="fas fa-info-circle"></i> Our expert team will review your submission and provide a detailed cost analysis.</p>
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

// --- SCRIPT INITIALIZATION AND CLOSURE ---

// Initialize the app when DOM is ready
console.log("SteelConnect Script Loaded Successfully");

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred. Please refresh the page.', 'error');
});

// Global error handler
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showNotification('A system error occurred. Please refresh if issues persist.', 'error');
});

// Export functions to global scope for HTML onclick handlers
window.showAuthModal = showAuthModal;
window.renderAuthForm = renderAuthForm;
window.closeModal = closeModal;
window.renderAppSection = renderAppSection;
window.showQuoteModal = showQuoteModal;
window.approveQuote = approveQuote;
window.deleteJob = deleteJob;
window.deleteQuote = deleteQuote;
window.editQuote = editQuote;
window.viewQuotes = viewQuotes;
window.openConversation = openConversation;
window.markJobCompleted = markJobCompleted;
window.toggleWidgetDetails = toggleWidgetDetails;
window.removeFile = removeFile;
window.viewEstimationFiles = viewEstimationFiles;
window.downloadEstimationResult = downloadEstimationResult;
window.deleteEstimation = deleteEstimation;
window.renderConversationView = renderConversationView;
window.toggleNotificationPanel = toggleNotificationPanel;
window.clearNotifications = clearNotifications;
window.handleNotificationClick = handleNotificationClick;
window.markNotificationAsRead = markNotificationAsRead;
window.showNotification = showNotification;
window.showGenericModal = showGenericModal;

// Expose appState for debugging in development
if (IS_LOCAL) {
    window.appState = appState;
    console.log('Development mode: appState exposed to window');
}

console.log("SteelConnect Application Ready - All functions loaded and notification system integrated");
