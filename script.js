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
const BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
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
};

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
    
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    const signInBtn = document.getElementById('signin-btn');
    if (signInBtn) signInBtn.addEventListener('click', () => showAuthModal('login'));

    const joinBtn = document.getElementById('join-btn');
    if (joinBtn) joinBtn.addEventListener('click', () => showAuthModal('register'));
    
    const getStartedBtn = document.getElementById('get-started-btn');
    if (getStartedBtn) getStartedBtn.addEventListener('click', () => showAuthModal('register'));
    
    const logo = document.querySelector('.logo');
    if (logo) {
        logo.addEventListener('click', (e) => {
            e.preventDefault();
            if (appState.currentUser) {
                renderAppSection('jobs');
            } else {
                showLandingPageView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
    
    const logoutBtn = document.getElementById('logout-button');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

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
        showNotification('Welcome back to SteelConnect!', 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
        
        if (data.user.type === 'designer') {
            loadUserQuotes();
        }
    } catch(error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
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

async function fetchAndRenderJobs(loadMore = false) {
    // ... (This function remains the same as your provided file)
}

async function fetchAndRenderApprovedJobs() {
    // ... (This function remains the same as your provided file)
}

async function markJobCompleted(jobId) {
    // ... (This function remains the same as your provided file)
}

async function fetchAndRenderMyQuotes() {
    // ... (This function remains the same as your provided file)
}

async function editQuote(quoteId) {
    // ... (This function remains the same as your provided file)
}

async function handleQuoteEdit(event) {
    // ... (This function remains the same as your provided file)
}

async function handlePostJob(event) {
    // ... (This function remains the same as your provided file)
}

async function deleteJob(jobId) {
    // ... (This function remains the same as your provided file)
}

async function deleteQuote(quoteId) {
    // ... (This function remains the same as your provided file)
}

async function approveQuote(quoteId, jobId) {
    // ... (This function remains the same as your provided file)
}

function showQuoteModal(jobId) {
    // ... (This function remains the same as your provided file)
}

async function handleQuoteSubmit(event) {
    // ... (This function remains the same as your provided file)
}

// --- START: AI QUOTE ANALYSIS & PDF FUNCTIONS ---

async function analyzeQuote(quoteId, jobId) {
    try {
        showNotification('Analyzing quote with AI insights...', 'info');
        const response = await apiCall(`/quotes/${quoteId}/analyze`, 'POST', { jobId });
        if (response.success) {
            showQuoteAnalysisModal(response.data);
        }
    } catch (error) {
        showNotification('Failed to retrieve AI analysis. Please try again.', 'error');
    }
}

function showQuoteAnalysisModal(analysisData) {
    const { quote, job, analysis } = analysisData;
    const content = `
        <div class="modal-header analysis-header">
            <h3><i class="fas fa-chart-line"></i> AI Quote Analysis</h3>
            <p class="modal-subtitle">Comprehensive analysis for ${quote.designerName}'s quote</p>
        </div>
        <div class="analysis-container">
            </div>
        <div class="analysis-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Close Analysis</button>
            <div class="action-buttons">
                <button class="btn btn-outline" onclick="downloadAnalysisPDF('${quote.id}')">
                    <i class="fas fa-file-pdf"></i> Download PDF
                </button>
                <button class="btn btn-outline" onclick="openConversation('${job.id}', '${quote.designerId}')">
                    <i class="fas fa-comments"></i> Message Designer
                </button>
                <button class="btn btn-success" onclick="approveQuote('${quote.id}', '${job.id}')">
                    <i class="fas fa-check"></i> Approve Quote
                </button>
            </div>
        </div>
    `;
    showGenericModal(content, 'max-width: 1200px; max-height: 90vh;');
    const modalContent = document.querySelector('.modern-modal');
    if (modalContent) {
        modalContent.style.overflowY = 'auto';
    }
}

// --- NEW FUNCTION TO HANDLE PDF DOWNLOAD ---
async function downloadAnalysisPDF(quoteId) {
    try {
        showNotification('Generating your PDF report...', 'info');
        const response = await fetch(`${BACKEND_URL}/quotes/${quoteId}/report`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${appState.jwtToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to download PDF report.');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Analysis-Report-${quoteId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showNotification('PDF download started!', 'success');

    } catch (error) {
        console.error('Error downloading PDF:', error);
        showNotification(error.message, 'error');
    }
}


function getRecommendationIcon(recommendation) {
    // ... (This function remains the same as your provided file)
}
function getCostScoreClass(score) {
    // ... (This function remains the same as your provided file)
}
function getTimelineScoreClass(score) {
    // ... (This function remains the same as your provided file)
}
function getTechnicalScoreClass(score) {
    // ... (This function remains the same as your provided file)
}
function getRiskIcon(level) {
    // ... (This function remains the same as your provided file)
}
function getRecIcon(type) {
    // ... (This function remains the same as your provided file)
}

async function viewQuotes(jobId) {
    // ... (This function remains the same as your provided file)
}

// --- END: AI QUOTE ANALYSIS & PDF FUNCTIONS ---

// --- MESSAGING, UI, & TEMPLATE FUNCTIONS ---
async function openConversation(jobId, recipientId) {
    // ... (This function remains the same as your provided file)
}
async function fetchAndRenderConversations() {
    // ... (This function remains the same as your provided file)
}
function getTimeAgo(timestamp) {
    // ... (This function remains the same as your provided file)
}
function getAvatarColor(name) {
    // ... (This function remains the same as your provided file)
}
async function renderConversationView(conversationOrId) {
    // ... (This function remains the same as your provided file)
}
async function handleSendMessage(conversationId) {
    // ... (This function remains the same as your provided file)
}
function showAuthModal(view) {
    // ... (This function remains the same as your provided file)
}
function renderAuthForm(view) {
    // ... (This function remains the same as your provided file)
}
function showGenericModal(innerHTML, style = '') {
    // ... (This function remains the same as your provided file)
}
function closeModal() {
    // ... (This function remains the same as your provided file)
}
function showAppView() {
    // ... (This function remains the same as your provided file)
}
function showLandingPageView() {
    // ... (This function remains the same as your provided file)
}
function buildSidebarNav() {
    // ... (This function remains the same as your provided file)
}
function renderAppSection(sectionId) {
    // ... (This function remains the same as your provided file)
}
function showNotification(message, type = 'info', duration = 4000) {
    // ... (This function remains the same as your provided file)
}
function getLoginTemplate() {
    // ... (This function remains the same as your provided file)
}
function getRegisterTemplate() {
    // ... (This function remains the same as your provided file)
}
function getPostJobTemplate() {
    // ... (This function remains the same as your provided file)
}
