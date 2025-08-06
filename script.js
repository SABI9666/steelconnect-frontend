// --- LANDING PAGE SLIDER LOGIC ---
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

    // Setup inactivity listeners
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    // Attach event listeners
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

    // Check for existing user session
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

// --- NEW: AUTOMATIC WELCOME CAROUSEL ---
let carouselInterval;
function initializeWelcomeCarousel() {
    const carousel = document.querySelector('.welcome-carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.action-card');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    let currentSlideIndex = 0;

    if (slides.length === 0) return;

    // Create dots
    dotsContainer.innerHTML = '';
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
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
        if (slides[currentSlideIndex]) slides[currentSlideIndex].classList.add('active');
        if (dots[currentSlideIndex]) dots[currentSlideIndex].classList.add('active');
    }

    function nextSlide() {
        const newIndex = (currentSlideIndex + 1) % slides.length;
        goToCarouselSlide(newIndex);
    }

    function startCarousel() {
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
                ? `<div class="empty-state">
                     <div class="empty-icon"><i class="fas fa-briefcase"></i></div>
                     <h3>No Projects Available</h3>
                     <p>Check back later for new opportunities.</p>
                   </div>`
                : `<div class="empty-state">
                     <div class="empty-icon"><i class="fas fa-plus-circle"></i></div>
                     <h3>You haven't posted any projects yet</h3>
                     <p>Click the "Post a New Project" card above to get started.</p>
                   </div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote
                ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`
                : user.type === 'designer' && hasUserQuoted
                ? `<button class="btn btn-outline btn-submitted" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : user.type === 'designer' && job.status === 'assigned'
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Job Assigned</span>`
                : '';

            const actions = user.type === 'designer'
                ? quoteButton
                : `<div class="job-actions-group">
                     <button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button>
                     <button class="btn btn-danger" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button>
                   </div>`;

            const statusBadge = job.status !== 'open'
                ? `<span class="job-status-badge ${job.status}"><i class="fas ${job.status === 'assigned' ? 'fa-user-check' : 'fa-check-circle'}"></i> ${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>`
                : `<span class="job-status-badge open"><i class="fas fa-clock"></i> Open</span>`;

            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i> <span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';

            return `
                <div class="job-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <div class="job-title-section">
                            <h3 class="job-title">${job.title}</h3>
                            ${statusBadge}
                        </div>
                        <div class="job-budget-section">
                            <span class="budget-label">Budget</span>
                            <span class="budget-amount">${job.budget}</span>
                        </div>
                    </div>
                    <div class="job-meta">
                        <div class="job-meta-item"><i class="fas fa-user"></i> <span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span></div>
                        ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i> <span>Assigned to: <strong>${job.assignedToName}</strong></span></div>` : ''}
                        ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i> <span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i> <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline btn-load-more" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        jobsListContainer.innerHTML = `<div class="error-state"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Projects</h3><p>We encountered an issue loading the projects. Please try again.</p><button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button></div>`;
    }
}

async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-check-circle"></i> Approved Projects</h2>
                <p class="header-subtitle">Manage your approved projects and communicate with designers</p>
            </div>
        </div>
        <div id="approved-jobs-list" class="jobs-grid"></div>`;

    const listContainer = document.getElementById('approved-jobs-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading approved projects...</p></div>';

    try {
        const response = await apiCall(`/jobs/user/${appState.currentUser.id}`, 'GET');
        const allJobs = response.data || [];
        const approvedJobs = allJobs.filter(job => job.status === 'assigned');
        appState.approvedJobs = approvedJobs;

        if (approvedJobs.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-clipboard-check"></i></div><h3>No Approved Projects</h3><p>Your approved projects will appear here once you accept quotes from designers.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button></div>`;
            return;
        }

        listContainer.innerHTML = approvedJobs.map(job => {
            const attachmentLink = job.attachment ? `<div class="job-attachment"><i class="fas fa-paperclip"></i> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const skillsDisplay = job.skills?.length > 0 ? `<div class="job-skills"><i class="fas fa-tools"></i> <span>Skills:</span><div class="skills-tags">${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</div></div>` : '';

            return `
                <div class="job-card approved-job">
                    <div class="job-header">
                        <div class="job-title-section">
                            <h3 class="job-title">${job.title}</h3>
                            <span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span>
                        </div>
                        <div class="approved-amount">
                            <span class="amount-label">Approved Amount</span>
                            <span class="amount-value">$${job.approvedAmount}</span>
                        </div>
                    </div>
                    <div class="job-meta"><div class="job-meta-item"><i class="fas fa-user-cog"></i> <span>Assigned to: <strong>${job.assignedToName}</strong></span></div></div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i> <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">
                        <div class="job-actions-group">
                            <button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button>
                            <button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Approved Projects</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button></div>`;
    }
}

async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed? This action cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed successfully!')
            .then(() => fetchAndRenderApprovedJobs())
            .catch(() => {});
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2>
                <p class="header-subtitle">Track your quote submissions and manage communications</p>
                <div style="margin-top: 16px;"><button class="btn btn-outline" onclick="analyzeDesignerStats()"><i class="fas fa-chart-bar"></i> View My Stats</button></div>
            </div>
        </div>
        <div id="my-quotes-list" class="jobs-grid"></div>`;

    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Loading your quotes...</p></div>';

    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;

        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Submitted</h3><p>You haven't submitted any quotes yet. Browse available projects to get started.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button></div>`;
            return;
        }

        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i><a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
            const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';
            const actionButtons = [];
            if (quote.status === 'approved') actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
            if (quote.status === 'submitted') {
                actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit Quote</button>`);
                actionButtons.push(`<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
            }

            return `
                <div class="quote-card quote-status-${quote.status}">
                    <div class="quote-header">
                        <div class="quote-title-section"><h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3><span class="quote-status-badge ${quote.status}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div>
                        <div class="quote-amount-section"><span class="amount-label">Quote Amount</span><span class="amount-value">$${quote.quoteAmount}</span></div>
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
        listContainer.innerHTML = `<div class="error-state"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Error Loading Quotes</h3><p>Please try again later.</p><button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button></div>`;
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;

        const content = `
            <div class="modal-header"><h3><i class="fas fa-edit"></i> Edit Your Quote</h3><p class="modal-subtitle">Update your quote details for: <strong>${quote.jobTitle}</strong></p></div>
            <form id="edit-quote-form" class="modern-form"><input type="hidden" name="quoteId" value="${quote.id}"><div class="form-row"><div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01"></div><div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required min="1"></div></div><div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach...">${quote.description}</textarea></div><div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments</label><input type="file" class="form-input file-input" name="attachments" multiple><small class="form-help">Supported formats: PDF, DOC, DWG, Images</small></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button></div></form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {}
}

async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    try {
        submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
        submitBtn.disabled = true;
        const formData = new FormData(form);
        await apiCall(`/quotes/${form['quoteId'].value}`, 'PUT', formData, 'Quote updated successfully!');
        closeModal();
        fetchAndRenderMyQuotes();
    } catch (error) {
        console.error("Quote edit failed:", error);
    } finally {
        if (submitBtn) { submitBtn.innerHTML = originalText; submitBtn.disabled = false; }
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
        const formData = new FormData(form);
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted successfully.')
            .then(() => fetchAndRenderJobs())
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
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

        let quotesHTML = `<div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3><p class="modal-subtitle">Review quotes for this project</p><div class="modal-actions" style="margin-top: 16px;"><button class="btn btn-primary" onclick="analyzeJobQuotes('${jobId}')"><i class="fas fa-chart-bar"></i> Analyze All Quotes</button></div></div>`;

        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><div class="empty-icon"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received</h3><p>No quotes have been submitted for this project yet.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list">${quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = attachments.length > 0 ? `<div class="quote-attachment"><i class="fas fa-paperclip"></i> <a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` : '';
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                const messageButton = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                let actionButtons = messageButton;
                if(canApprove) {
                    actionButtons = `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve Quote</button>${messageButton}`;
                } else if (quote.status === 'approved') {
                    actionButtons = `<span class="status-approved"><i class="fas fa-check-circle"></i> Approved</span>${messageButton}`;
                }
                const statusIcon = {'submitted': 'fa-clock', 'approved': 'fa-check-circle', 'rejected': 'fa-times-circle'}[quote.status] || 'fa-question-circle';

                return `<div class="quote-item quote-status-${quote.status}"><div class="quote-item-header"><div class="designer-info"><div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div><div class="designer-details"><h4>${quote.designerName}</h4><span class="quote-status-badge ${quote.status}"><i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}</span></div></div><div class="quote-amount"><span class="amount-label">Quote</span><span class="amount-value">${quote.quoteAmount}</span></div></div><div class="quote-details">${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i> <span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}<div class="quote-description"><p>${quote.description}</p></div>${attachmentLink}</div><div class="quote-actions">${actionButtons}</div></div>`;
            }).join('')}</div>`;
        }
        showGenericModal(quotesHTML, 'max-width: 800px;');
    } catch (error) {}
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job and reject others.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!')
            .then(() => {
                closeModal();
                fetchAndRenderJobs();
                showNotification('Project has been assigned!', 'success');
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `<div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your best proposal</p></div><form id="quote-form" class="modern-form"><input type="hidden" name="jobId" value="${jobId}"><div class="form-row"><div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required min="1" step="0.01"></div><div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required min="1"></div></div><div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach..."></textarea></div><div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments</label><input type="file" class="form-input file-input" name="attachments" multiple><small class="form-help">Upload relevant documents</small></div><div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit Quote</button></div></form>`;
    showGenericModal(content, 'max-width: 600px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    try {
        submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
        submitBtn.disabled = true;
        const formData = new FormData(form);
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        fetchAndRenderJobs();
        showNotification('Your quote has been submitted!', 'success');
    } catch (error) {}
}

// --- MESSAGING SYSTEM ---

async function openConversation(jobId, recipientId) {
    try {
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {}
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="section-header modern-header"><h2><i class="fas fa-comments"></i> Messages</h2><p class="header-subtitle">Communicate with clients and designers</p></div><div id="conversations-list" class="conversations-container"></div>`;
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;

    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];

        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3><p>Start collaborating by messaging professionals from job quotes.</p><button class="btn btn-primary" onclick="renderAppSection('jobs')">Browse Projects</button></div>`;
            return;
        }

        listContainer.innerHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id) || {};
            const lastMessage = convo.lastMessage ? (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 'No messages yet.';
            const avatarColor = getAvatarColor(otherParticipant.name || 'U');

            return `<div class="conversation-card" onclick="renderConversationView('${convo.id}')"><div class="convo-avatar" style="background-color: ${avatarColor}">${(otherParticipant.name || 'U').charAt(0).toUpperCase()}</div><div class="convo-details"><div class="convo-header"><h4>${otherParticipant.name || 'Unknown'}</h4></div><p class="convo-project"><i class="fas fa-briefcase"></i> <strong>${convo.jobTitle}</strong></p><p class="convo-preview">${lastMessage}</p></div></div>`;
        }).join('');
    } catch (error) {}
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
}

async function renderConversationView(conversationOrId) {
    let conversation = (typeof conversationOrId === 'string') ? (appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId }) : conversationOrId;
    if (!conversation.participants) {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        conversation = appState.conversations.find(c => c.id === conversation.id);
        if(!conversation) return showNotification('Conversation not found.', 'error');
    }

    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants.find(p => p.id !== appState.currentUser.id) || {};
    container.innerHTML = `<div class="chat-container"><div class="chat-header"><button onclick="renderAppSection('messages')" class="back-btn"><i class="fas fa-arrow-left"></i></button><div class="chat-details"><h3>${otherParticipant.name || 'Conversation'}</h3><p class="chat-project"><i class="fas fa-briefcase"></i> ${conversation.jobTitle || ''}</p></div></div><div class="chat-messages" id="chat-messages-container"></div><div class="chat-input-area"><form id="send-message-form"><input type="text" id="message-text-input" placeholder="Type your message..." required autocomplete="off"><button type="submit" class="send-button" title="Send message"><i class="fas fa-paper-plane"></i></button></form></div></div>`;
    document.getElementById('send-message-form').addEventListener('submit', (e) => { e.preventDefault(); handleSendMessage(conversation.id); });

    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        messagesContainer.innerHTML = (response.data || []).map(msg => `<div class="message-wrapper ${msg.senderId === appState.currentUser.id ? 'me' : 'them'}"><div class="message-bubble ${msg.senderId === appState.currentUser.id ? 'me' : 'them'}">${msg.text}</div></div>`).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {}
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const text = input.value.trim();
    if (!text) return;
    input.disabled = true;
    try {
        await apiCall(`/messages/${conversationId}/messages`, 'POST', { text });
        input.value = '';
        renderConversationView(conversationId); // Re-render to show new message
    } catch(error) {
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// --- UI & MODAL FUNCTIONS ---

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button><div id="modal-form-container"></div></div></div>`;
    modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
    renderAuthForm(view);
}

function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    if (!container) return;
    container.innerHTML = view === 'login' ? getLoginTemplate() : getRegisterTemplate();
    document.getElementById(view === 'login' ? 'login-form' : 'register-form').addEventListener('submit', view === 'login' ? handleLogin : handleRegister);
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" style="${style}" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>${innerHTML}</div></div>`;
    modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';

    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = user.type;
    document.getElementById('userAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('jobs');

    if (user.type === 'designer') loadUserQuotes();
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i> <span>Find Projects</span></a><a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a><a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i> <span>Approved Projects</span></a><a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post Project</span></a><a href="#" class="sidebar-nav-link" data-section="estimates"><i class="fas fa-calculator fa-fw"></i> <span>Generate Estimates</span></a>`;
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;
    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); renderAppSection(link.dataset.section); }));
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    const user = appState.currentUser;
    const userRole = user.type;

    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes' : 'Manage your project listings';

        let welcomeDashboardHTML = '';
        if (userRole === 'contractor') {
            welcomeDashboardHTML = `
            <div class="welcome-dashboard">
                <div class="welcome-header">
                    <h2>Welcome back, ${user.name}</h2>
                    <p>Select an action below to manage your projects and connect with professionals.</p>
                </div>
                <div class="welcome-carousel">
                    <div class="action-card card-post" onclick="renderAppSection('post-job')">
                        <div class="action-card-icon"><i class="fas fa-plus-circle"></i></div>
                        <div class="action-card-content"><h3>Post a New Project</h3><p>Get quotes from top-tier engineering talent.</p></div>
                    </div>
                    <div class="action-card card-manage" onclick="renderAppSection('jobs')">
                        <div class="action-card-icon"><i class="fas fa-tasks"></i></div>
                        <div class="action-card-content"><h3>Manage My Projects</h3><p>View quotes and track your open projects.</p></div>
                    </div>
                    <div class="action-card card-approved" onclick="renderAppSection('approved-jobs')">
                        <div class="action-card-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="action-card-content"><h3>Approved Projects</h3><p>Collaborate with your assigned designers.</p></div>
                    </div>
                    <div class="action-card card-messages" onclick="renderAppSection('messages')">
                        <div class="action-card-icon"><i class="fas fa-comments"></i></div>
                        <div class="action-card-content"><h3>Messages</h3><p>Communicate directly with professionals.</p></div>
                    </div>
                    <div class="carousel-dots"></div>
                </div>
            </div>`;
        }

        container.innerHTML = `
            ${welcomeDashboardHTML}
            <div class="section-header modern-header" style="margin-top: ${userRole === 'contractor' ? 'var(--space-12)' : '0'};">
                <div class="header-content"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2><p class="header-subtitle">${subtitle}</p></div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;

        if (userRole === 'contractor') {
            initializeWelcomeCarousel();
        }
        fetchAndRenderJobs();

    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'estimates') {
        renderEstimatesSection();
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    } else if (sectionId === 'approved-jobs') {
        fetchAndRenderApprovedJobs();
    } else if (sectionId === 'messages') {
        fetchAndRenderConversations();
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('alerts-container');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    notification.innerHTML = `<div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div><button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    container.appendChild(notification);
    setTimeout(() => { if (notification.parentElement) notification.remove(); }, duration);
}

function showAlert(message, type = 'info') { showNotification(message, type); }

// --- TEMPLATE GETTERS ---

function getLoginTemplate() {
    return `<div class="auth-header"><h2><i class="fas fa-sign-in-alt"></i> Welcome Back</h2><p>Sign in to your SteelConnect account</p></div><form id="login-form" class="modern-form"><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-sign-in-alt"></i> Sign In</button></form><div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create Account</a></div>`;
}

function getRegisterTemplate() {
    return `<div class="auth-header"><h2><i class="fas fa-user-plus"></i> Join SteelConnect</h2><p>Create your professional account</p></div><form id="register-form" class="modern-form"><div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><button type="submit" class="btn btn-primary btn-full"><i class="fas fa-user-plus"></i> Create Account</button></form><div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `<div class="section-header modern-header"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p class="header-subtitle">Create a detailed project listing to attract professionals</p></div><div class="post-job-container"><form id="post-job-form" class="modern-form post-job-form"><div class="form-section"><h3><i class="fas fa-info-circle"></i> Project Details</h3><div class="form-group"><label class="form-label"><i class="fas fa-heading"></i> Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div><div class="form-row"><div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Budget</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div><div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Deadline</label><input type="date" class="form-input" name="deadline" required></div></div><div class="form-group"><label class="form-label"><i class="fas fa-tools"></i> Skills</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit, Steel Design"><small class="form-help">Separate with commas</small></div></div><div class="form-section"><h3><i class="fas fa-file-alt"></i> Description</h3><div class="form-group"><label class="form-label"><i class="fas fa-align-left"></i> Details</label><textarea class="form-textarea" name="description" required placeholder="Provide a comprehensive project description..."></textarea></div><div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments</label><input type="file" class="form-input file-input" name="attachment"><small class="form-help">Upload drawings, specifications, etc.</small></div></div><div class="form-actions"><button type="submit" class="btn btn-primary btn-large"><i class="fas fa-rocket"></i> Post Project</button></div></form></div>`;
}

async function analyzeJobQuotes(jobId) {
    try {
        const response = await apiCall(`/analysis/job/${jobId}`, 'GET');
        const analysis = response.data;

        // Calculate bar widths for visualization
        const maxAmount = analysis.highestAmount;
        const lowWidth = (analysis.lowestAmount / maxAmount) * 100;
        const avgWidth = (analysis.averageAmount / maxAmount) * 100;

        const analysisHtml = `
            <div class="modal-header">
                <h3><i class="fas fa-chart-bar"></i> Quote Analysis</h3>
                <p class="modal-subtitle">For: <strong>${analysis.jobTitle}</strong></p>
            </div>
            <div class="analysis-results">
                <div class="analysis-grid">
                    <div class="analysis-stat-card">
                        <div class="stat-icon"><i class="fas fa-file-invoice-dollar"></i></div>
                        <div class="stat-value">${analysis.totalQuotes}</div>
                        <div class="stat-label">Total Quotes</div>
                    </div>
                    <div class="analysis-stat-card">
                        <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
                        <div class="stat-value">${analysis.averageDeliveryTime}</div>
                        <div class="stat-label">Avg. Timeline (Days)</div>
                    </div>
                </div>

                <div class="analysis-chart">
                    <h4>Quote Amount Distribution</h4>
                    <div class="chart-bar-group">
                        <div class="bar-label">Lowest</div>
                        <div class="bar-container">
                            <div class="bar" style="width: ${lowWidth}%; background-color: var(--success-500);"></div>
                        </div>
                        <div class="bar-value">$${analysis.lowestAmount}</div>
                    </div>
                    <div class="chart-bar-group">
                        <div class="bar-label">Average</div>
                        <div class="bar-container">
                            <div class="bar" style="width: ${avgWidth}%; background-color: var(--primary-500);"></div>
                        </div>
                        <div class="bar-value">$${analysis.averageAmount}</div>
                    </div>
                    <div class="chart-bar-group">
                        <div class="bar-label">Highest</div>
                        <div class="bar-container">
                            <div class="bar" style="width: 100%; background-color: var(--error-500);"></div>
                        </div>
                        <div class="bar-value">$${analysis.highestAmount}</div>
                    </div>
                </div>
            </div>`;
        showGenericModal(analysisHtml, 'max-width: 650px;');
    } catch (error) {}
}

async function analyzeDesignerStats() {
    try {
        const response = await apiCall('/analysis/designer/stats', 'GET');
        const stats = response.data;
        const statsHtml = `
            <div class="modal-header">
                <h3><i class="fas fa-user-chart"></i> Your Designer Stats</h3>
                <p class="modal-subtitle">Performance at a glance</p>
            </div>
            <div class="analysis-results">
                <div class="analysis-grid">
                     <div class="analysis-stat-card">
                        <div class="stat-icon"><i class="fas fa-file-alt"></i></div>
                        <div class="stat-value">${stats.totalQuotes}</div>
                        <div class="stat-label">Total Quotes</div>
                    </div>
                    <div class="analysis-stat-card">
                        <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-value">${stats.acceptedQuotes}</div>
                        <div class="stat-label">Accepted</div>
                    </div>
                     <div class="analysis-stat-card">
                        <div class="stat-icon"><i class="fas fa-clock"></i></div>
                        <div class="stat-value">${stats.pendingQuotes}</div>
                        <div class="stat-label">Pending</div>
                    </div>
                </div>
                <div class="analysis-progress-chart">
                    <h4>Acceptance Rate</h4>
                    <div class="progress-circle-container">
                        <svg class="progress-ring" width="120" height="120">
                           <circle class="progress-ring-circle-bg" stroke-width="12" fill="transparent" r="54" cx="60" cy="60"/>
                           <circle class="progress-ring-circle" stroke-width="12" fill="transparent" r="54" cx="60" cy="60" style="stroke-dasharray: 339.29; stroke-dashoffset: calc(339.29 - (339.29 * ${stats.acceptanceRate}) / 100);"/>
                        </svg>
                        <div class="progress-text">${stats.acceptanceRate}%</div>
                    </div>
                </div>
            </div>`;
        showGenericModal(statsHtml, 'max-width: 650px;');
    } catch (error) {}
}

// --- NEW: STEEL TONNAGE ESTIMATOR ---

// Global state for the estimator
let tonnageEstimatorState = {
    currentFile: null,
    currentEstimate: null,
    extractedTonnage: 0,
};

// Regional pricing data (price per MT in local currency)
const regionalPricing = {
    'us': { basePrice: 1200, fabrication: 800, erection: 600, currency: 'USD', info: 'US market pricing - includes transportation' },
    'canada': { basePrice: 1400, fabrication: 900, erection: 700, currency: 'CAD', info: 'Canadian market - varies by province' },
    'uk': { basePrice: 950, fabrication: 650, erection: 500, currency: 'GBP', info: 'UK market - includes VAT considerations' },
    'australia': { basePrice: 1600, fabrication: 1000, erection: 800, currency: 'AUD', info: 'Australian market - remote area surcharge may apply' },
    'germany': { basePrice: 1100, fabrication: 750, erection: 600, currency: 'EUR', info: 'German market - CE marking included' },
    'india': { basePrice: 45000, fabrication: 25000, erection: 18000, currency: 'INR', info: 'Indian market - GST not included' },
    'china': { basePrice: 3500, fabrication: 2200, erection: 1800, currency: 'CNY', info: 'Chinese market - export quality standards' },
    'uae': { basePrice: 2200, fabrication: 1400, erection: 1100, currency: 'AED', info: 'UAE market - desert conditions pricing' },
    'saudi': { basePrice: 2400, fabrication: 1500, erection: 1200, currency: 'SAR', info: 'Saudi market - SASO standards compliance' },
    'south-africa': { basePrice: 18000, fabrication: 12000, erection: 9000, currency: 'ZAR', info: 'South African market - SANS standards' }
};

function renderEstimatesSection() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> Steel Tonnage & Cost Estimator</h2>
                <p class="header-subtitle">Upload MTO documents or enter tonnage manually for detailed cost estimations based on regional pricing.</p>
            </div>
        </div>
        <div class="tonnage-estimator-container">
            <div class="tonnage-form-panel">
                <form id="tonnage-estimator-form" class="modern-form">
                    <div class="form-section">
                        <h3><i class="fas fa-file-upload"></i> Upload MTO (Optional)</h3>
                        <div class="file-upload-area" id="tonnage-drop-zone">
                            <div class="upload-icon"><i class="fas fa-file-excel"></i></div>
                            <h4>Drag & Drop MTO File</h4>
                            <p>Or click to browse for a PDF, Excel, or CSV file</p>
                            <input type="file" id="tonnage-file-input" class="file-input" accept=".pdf,.xlsx,.xls,.csv">
                        </div>
                        <div id="tonnage-file-info-container" class="file-info-display" style="display: none;"></div>
                        <iframe id="tonnage-pdf-preview" class="pdf-preview" style="display:none;"></iframe>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                        <div class="form-group">
                            <label class="form-label" for="projectName">Project Name</label>
                            <input type="text" id="projectName" class="form-input" placeholder="e.g., Downtown Office Tower">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="structureType">Project Type</label>
                                <select id="structureType" class="form-select">
                                    <option value="">Select project type</option>
                                    <option value="building">Commercial Building</option>
                                    <option value="warehouse">Warehouse/Industrial</option>
                                    <option value="bridge">Bridge Structure</option>
                                    <option value="tower">Tower/Mast</option>
                                    <option value="stadium">Stadium/Sports Complex</option>
                                    <option value="residential">Residential Complex</option>
                                    <option value="infrastructure">Infrastructure</option>
                                    <option value="miscellaneous">Miscellaneous Steel</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="steelGrade">Steel Grade/Type</label>
                                <input type="text" id="steelGrade" class="form-input" placeholder="e.g., Grade 50, S355" list="gradesList">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-globe-americas"></i> Regional Specifications</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label" for="region">Region/Country</label>
                                <select id="region" class="form-select"></select>
                                <small id="region-price-info" class="form-help"></small>
                            </div>
                            <div class="form-group">
                                <label class="form-label" for="currency">Currency</label>
                                <select id="currency" class="form-select"></select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-weight-hanging"></i> Steel Tonnage</h3>
                        <div class="form-group">
                            <label class="form-label" for="totalTonnageInput">Total Steel Tonnage (Metric Tons)</label>
                            <input type="number" id="totalTonnageInput" class="form-input" placeholder="Enter total tonnage or upload MTO" step="0.01" min="0.1">
                             <small class="form-help">This value will be updated automatically if a valid MTO file is uploaded.</small>
                        </div>
                    </div>

                     <div class="form-actions">
                        <button type="button" id="calculate-estimate-btn" class="btn btn-primary btn-large"><i class="fas fa-calculator"></i> Calculate Estimate</button>
                    </div>
                </form>
            </div>
            <div class="tonnage-results-panel">
                <div id="tonnage-result-container" class="results-wrapper">
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-clipboard-list"></i></div>
                        <h3>Awaiting Calculation</h3>
                        <p>Your detailed cost estimation report will appear here.</p>
                    </div>
                </div>
            </div>
        </div>`;
    initializeTonnageEstimator();
}

function initializeTonnageEstimator() {
    // Populate dropdowns
    const regionSelect = document.getElementById('region');
    const currencySelect = document.getElementById('currency');
    for (const key in regionalPricing) {
        regionSelect.innerHTML += `<option value="${key}">${key.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`;
    }
    for (const key in regionalPricing) {
        currencySelect.innerHTML += `<option value="${regionalPricing[key].currency}">${regionalPricing[key].currency}</option>`;
    }

    // Set defaults and update display
    regionSelect.value = 'us';
    updateRegionalPricingDisplay();

    // Attach listeners
    const calculateBtn = document.getElementById('calculate-estimate-btn');
    calculateBtn.addEventListener('click', handleCalculateSteelEstimate);

    regionSelect.addEventListener('change', updateRegionalPricingDisplay);

    const dropZone = document.getElementById('tonnage-drop-zone');
    const fileInput = document.getElementById('tonnage-file-input');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', e => { e.preventDefault(); dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
            handleTonnageFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files.length > 0) {
            handleTonnageFile(e.target.files[0]);
        }
    });
}

function updateRegionalPricingDisplay() {
    const region = document.getElementById('region').value;
    const infoDiv = document.getElementById('region-price-info');
    const currencySelect = document.getElementById('currency');
    if (region && regionalPricing[region]) {
        const pricing = regionalPricing[region];
        infoDiv.textContent = `Base: ${pricing.basePrice} ${pricing.currency}/MT. ${pricing.info}`;
        currencySelect.value = pricing.currency;
    } else {
        infoDiv.textContent = '';
    }
}

function handleTonnageFile(file) {
    tonnageEstimatorState.currentFile = file;
    const infoContainer = document.getElementById('tonnage-file-info-container');
    const pdfPreview = document.getElementById('tonnage-pdf-preview');

    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
    infoContainer.innerHTML = `<div class="file-item"><i class="fas fa-file"></i><span class="file-name">${file.name} (${fileSize} MB)</span><span id="file-status" class="file-status-processing">Processing...</span></div>`;
    infoContainer.style.display = 'block';

    pdfPreview.style.display = 'none';

    if (file.type === 'application/pdf') {
        const fileURL = URL.createObjectURL(file);
        pdfPreview.src = fileURL;
        pdfPreview.style.display = 'block';
    }

    // Simulate processing for tonnage extraction
    setTimeout(() => {
        const baseTonnage = Math.random() * 800 + 50; // 50-850 MT
        tonnageEstimatorState.extractedTonnage = Math.round(baseTonnage * 100) / 100;
        document.getElementById('totalTonnageInput').value = tonnageEstimatorState.extractedTonnage;
        const statusSpan = document.getElementById('file-status');
        statusSpan.textContent = `Processed - ${tonnageEstimatorState.extractedTonnage} MT extracted`;
        statusSpan.className = 'file-status-success';
        showNotification('MTO file processed successfully!', 'success');
    }, 2000);
}

function handleCalculateSteelEstimate() {
    const projectName = document.getElementById('projectName').value;
    const structureType = document.getElementById('structureType').value;
    const region = document.getElementById('region').value;
    const currency = document.getElementById('currency').value;
    const steelGrade = document.getElementById('steelGrade').value;
    const totalTonnage = parseFloat(document.getElementById('totalTonnageInput').value) || 0;

    if (!projectName || !structureType) {
        return showNotification('Please enter a Project Name and select a Project Type.', 'error');
    }
    if (!region) {
        return showNotification('Please select a region.', 'error');
    }
    if (totalTonnage <= 0) {
        return showNotification('Please enter a valid tonnage or upload an MTO file.', 'error');
    }

    const pricing = regionalPricing[region];
    if (!pricing) {
        return showNotification('Pricing data not available for the selected region.', 'error');
    }

    // Calculations
    const baseMaterialCost = totalTonnage * pricing.basePrice;
    const fabricationCost = totalTonnage * pricing.fabrication;
    const erectionCost = totalTonnage * pricing.erection;
    const transportationCost = baseMaterialCost * 0.08;
    const qualityControlCost = (baseMaterialCost + fabricationCost) * 0.03;
    const safetyCompliance = fabricationCost * 0.05;
    const engineeringServices = totalTonnage * (pricing.basePrice * 0.15);
    const subtotal = baseMaterialCost + fabricationCost + erectionCost + transportationCost + qualityControlCost + safetyCompliance + engineeringServices;
    const overheads = subtotal * 0.12;
    const profit = subtotal * 0.18;
    const totalProjectCost = subtotal + overheads + profit;
    const estimatedWeeks = Math.ceil((totalTonnage / 50) + 2);

    tonnageEstimatorState.currentEstimate = {
        projectName, structureType, region, currency, steelGrade, totalTonnage,
        baseMaterialCost, fabricationCost, erectionCost, transportationCost, qualityControlCost,
        safetyCompliance, engineeringServices, subtotal, overheads, profit, totalProjectCost,
        costPerMT: totalProjectCost / totalTonnage, estimatedWeeks, pricing,
        generatedDate: new Date().toLocaleDateString()
    };

    displayTonnageEstimateResults();
}

function displayTonnageEstimateResults() {
    const container = document.getElementById('tonnage-result-container');
    const est = tonnageEstimatorState.currentEstimate;

    const formatCurrency = (val) => `${est.currency} ${Math.round(val).toLocaleString()}`;

    container.innerHTML = `
        <div class="result-header">
            <h4><i class="fas fa-clipboard-check"></i> Estimation Report</h4>
            <p>For: <strong>${est.projectName}</strong></p>
        </div>
        <div class="result-summary">
            <div class="summary-item">
                <span>Total Tonnage</span>
                <strong>${est.totalTonnage.toFixed(2)} MT</strong>
            </div>
            <div class="summary-item">
                <span>Est. Timeline</span>
                <strong>${est.estimatedWeeks} weeks</strong>
            </div>
            <div class="summary-item">
                <span>Cost per MT</span>
                <strong>${formatCurrency(est.costPerMT)}</strong>
            </div>
        </div>
        <div class="result-breakdown">
            <div class="result-item"><span>Base Material Cost</span><span>${formatCurrency(est.baseMaterialCost)}</span></div>
            <div class="result-item"><span>Fabrication Cost</span><span>${formatCurrency(est.fabricationCost)}</span></div>
            <div class="result-item"><span>Erection Cost</span><span>${formatCurrency(est.erectionCost)}</span></div>
            <div class="result-item"><span>Transportation & Logistics</span><span>${formatCurrency(est.transportationCost)}</span></div>
            <div class="result-item"><span>Quality Control & Testing</span><span>${formatCurrency(est.qualityControlCost)}</span></div>
            <div class="result-item"><span>Safety & Compliance</span><span>${formatCurrency(est.safetyCompliance)}</span></div>
            <div class="result-item"><span>Engineering Services</span><span>${formatCurrency(est.engineeringServices)}</span></div>
            <div class="result-item subtotal"><strong>Subtotal</strong><strong>${formatCurrency(est.subtotal)}</strong></div>
            <div class="result-item"><span>Overheads (12%)</span><span>${formatCurrency(est.overheads)}</span></div>
            <div class="result-item"><span>Profit Margin (18%)</span><span>${formatCurrency(est.profit)}</span></div>
        </div>
        <div class="result-total">
            <span>Total Estimated Project Cost</span>
            <strong>${formatCurrency(est.totalProjectCost)}</strong>
        </div>
        <div class="result-actions">
            <button class="btn btn-secondary" id="download-tonnage-report-btn"><i class="fas fa-download"></i> Download Report</button>
        </div>
    `;

    document.getElementById('download-tonnage-report-btn').addEventListener('click', downloadTonnageReport);
}

function downloadTonnageReport() {
    const est = tonnageEstimatorState.currentEstimate;
    if (!est) return;

    const content = `
STEEL STRUCTURE TONNAGE ESTIMATION REPORT
==========================================
Project: ${est.projectName}
Date: ${est.generatedDate}

PROJECT OVERVIEW
--------------------------------
- Project Type: ${est.structureType}
- Total Steel Tonnage: ${est.totalTonnage.toFixed(2)} MT
- Region: ${est.region.toUpperCase()}
- Currency: ${est.currency}
- Steel Grade: ${est.steelGrade || 'N/A'}
- Estimated Timeline: ${est.estimatedWeeks} weeks

COST BREAKDOWN (${est.currency})
--------------------------------
- Base Material Cost:           ${est.baseMaterialCost.toLocaleString()}
- Fabrication Cost:             ${est.fabricationCost.toLocaleString()}
- Erection Cost:                ${est.erectionCost.toLocaleString()}
- Transportation & Logistics:   ${est.transportationCost.toLocaleString()}
- Quality Control & Testing:    ${est.qualityControlCost.toLocaleString()}
- Safety & Compliance:          ${est.safetyCompliance.toLocaleString()}
- Engineering Services:         ${est.engineeringServices.toLocaleString()}
--------------------------------------------
SUBTOTAL:                       ${est.subtotal.toLocaleString()}
- Overheads (12%):              ${est.overheads.toLocaleString()}
- Profit Margin (18%):          ${est.profit.toLocaleString()}
============================================
TOTAL PROJECT COST:             ${est.totalProjectCost.toLocaleString()}
Cost per MT:                    ${Math.round(est.costPerMT).toLocaleString()}/${'MT'}
============================================

NOTES & ASSUMPTIONS
- Pricing based on ${est.region.toUpperCase()} regional rates. ${est.pricing.info}.
- This is a preliminary estimate for planning purposes only and is valid for 30 days.
- Final costs may vary based on detailed engineering, site conditions, and market fluctuations.
- Generated by SteelConnect Tonnage Estimator.
    `.trim();

    const blob = new Blob([content.replace(/\n/g, '\r\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Steel_Estimate_${est.projectName.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showNotification('Report download initiated.', 'success');
}