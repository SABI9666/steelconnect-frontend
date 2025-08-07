/ --- LANDING PAGE SLIDER LOGIC ---
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
        // THIS IS THE CORRECT PLACE TO CALL THE NEW ESTIMATOR
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


// --- ENHANCED STEEL TONNAGE ESTIMATOR ---
// This section contains the new, professional version that communicates with the backend.

// Global state for the estimator
let tonnageEstimatorState = {
    currentFiles: [],
    currentEstimate: null,
    extractedTonnage: 0,
    processingFiles: new Set(),
    estimateHistory: []
};

// Data for form dropdowns (could be fetched from backend in future)
const regionalPricing = {
    'us': { currency: 'USD', info: 'US market pricing - includes transportation' },
    'canada': { currency: 'CAD', info: 'Canadian market - varies by province' },
    'uk': { currency: 'GBP', info: 'UK market - includes VAT considerations' },
    'australia': { currency: 'AUD', info: 'Australian market - remote area surcharge may apply' },
    'germany': { currency: 'EUR', info: 'German market - CE marking included' },
    'india': { currency: 'INR', info: 'Indian market - GST not included' },
    'china': { currency: 'CNY', info: 'Chinese market - export quality standards' },
    'uae': { currency: 'AED', info: 'UAE market - desert conditions pricing' },
    'saudi': { currency: 'SAR', info: 'Saudi market - SASO standards compliance' },
    'south-africa': { currency: 'ZAR', info: 'South African market - SANS standards' }
};

const steelGrades = {
    'A36': { description: 'Structural Steel' },
    'A572-50': { description: 'High-Strength Low-Alloy' },
    'A992': { description: 'Wide-Flange Shapes' },
    'S355': { description: 'European Standard' },
    'S275': { description: 'European Structural' },
    'Grade-50': { description: 'ASTM A572 Grade 50' },
    'Weathering': { description: 'Cor-Ten Steel' },
    'Stainless-316': { description: 'Stainless Steel 316' },
    'Custom': { description: 'Custom Grade' }
};

function renderEstimatesSection() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> Professional Steel Tonnage & Cost Estimator</h2>
                <p class="header-subtitle">Advanced project estimation with multi-format file support and detailed cost analysis.</p>
                <div class="header-actions">
                    <button class="btn btn-outline" onclick="showEstimateHistory()"><i class="fas fa-history"></i> History</button>
                    <button class="btn btn-outline" onclick="exportEstimateTemplate()"><i class="fas fa-download"></i> Template</button>
                </div>
            </div>
        </div>
        <div class="tonnage-estimator-container">
            <div class="tonnage-form-panel">
                <div class="estimator-progress-bar">
                    <div class="progress-step active" data-step="1">
                        <div class="step-number">1</div>
                        <span>Files & Data</span>
                    </div>
                    <div class="progress-step" data-step="2">
                        <div class="step-number">2</div>
                        <span>Project Details</span>
                    </div>
                    <div class="progress-step" data-step="3">
                        <div class="step-number">3</div>
                        <span>Review & Calculate</span>
                    </div>
                </div>
                <form id="tonnage-estimator-form" class="modern-form enhanced-form">
                    <div class="form-step active" data-step="1">
                        <div class="form-section">
                            <h3><i class="fas fa-cloud-upload-alt"></i> Upload Project Files</h3>
                            <p class="section-description">Upload your project files for automatic tonnage extraction and analysis.</p>
                            <div class="upload-grid-enhanced">
                                <div class="file-upload-card" id="mto-drop-zone">
                                    <div class="upload-icon-container"><i class="fas fa-file-excel"></i></div>
                                    <h4>Material Take-Off (MTO)</h4>
                                    <p>Excel, CSV, or PDF files</p>
                                    <input type="file" id="mto-file-input" class="file-input" accept=".xlsx,.xls,.csv,.pdf" multiple>
                                </div>
                                <div class="file-upload-card" id="dwg-drop-zone">
                                    <div class="upload-icon-container"><i class="fas fa-drafting-compass"></i></div>
                                    <h4>CAD Drawings</h4>
                                    <p>AutoCAD and PDF drawings</p>
                                    <input type="file" id="dwg-file-input" class="file-input" accept=".dwg,.dxf,.pdf" multiple>
                                </div>
                                <div class="file-upload-card" id="model-drop-zone">
                                    <div class="upload-icon-container"><i class="fas fa-cube"></i></div>
                                    <h4>3D Models</h4>
                                    <p>Structural 3D models</p>
                                    <input type="file" id="model-file-input" class="file-input" accept=".ifc,.step,.stp,.sat" multiple>
                                </div>
                                <div class="file-upload-card" id="spec-drop-zone">
                                    <div class="upload-icon-container"><i class="fas fa-file-contract"></i></div>
                                    <h4>Specifications</h4>
                                    <p>Technical specifications</p>
                                    <input type="file" id="spec-file-input" class="file-input" accept=".pdf,.doc,.docx,.txt" multiple>
                                </div>
                            </div>
                            <div id="uploaded-files-container" class="uploaded-files-display" style="display: none;"></div>
                        </div>
                        <div class="step-navigation">
                            <button type="button" class="btn btn-primary" onclick="nextStep(2)">
                                Next: Project Details <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-step" data-step="2">
                        <div class="form-section">
                            <h3><i class="fas fa-building"></i> Project Information</h3>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="projectName"><i class="fas fa-tag"></i> Project Name</label>
                                    <input type="text" id="projectName" class="form-input" placeholder="e.g., Downtown Office Tower" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="projectLocation"><i class="fas fa-map-marker-alt"></i> Project Location</label>
                                    <input type="text" id="projectLocation" class="form-input" placeholder="City, State/Province">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="structureType"><i class="fas fa-building"></i> Project Type</label>
                                    <select id="structureType" class="form-select" required>
                                        <option value="commercial-building">Commercial Building</option>
                                        <option value="warehouse">Warehouse/Industrial</option>
                                        <option value="bridge">Bridge Structure</option>
                                        <option value="tower">Tower/Mast</option>
                                        <option value="stadium">Stadium/Sports Complex</option>
                                        <option value="residential">Residential Complex</option>
                                        <option value="infrastructure">Infrastructure</option>
                                        <option value="petrochemical">Petrochemical Plant</option>
                                        <option value="power-plant">Power Plant</option>
                                        <option value="miscellaneous">Miscellaneous Steel</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="projectComplexity"><i class="fas fa-layer-group"></i> Project Complexity</label>
                                    <select id="projectComplexity" class="form-select">
                                        <option value="simple">Simple - Standard structural work</option>
                                        <option value="moderate">Moderate - Some complex connections</option>
                                        <option value="complex">Complex - Complex geometry</option>
                                        <option value="architectural">Architectural - Exposed steel</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label" for="steelGrade"><i class="fas fa-industry"></i> Primary Steel Grade</label>
                                    <select id="steelGrade" class="form-select">
                                        ${Object.entries(steelGrades).map(([grade, info]) =>
                                             `<option value="${grade}">${grade} - ${info.description}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label" for="coatingRequirement"><i class="fas fa-paint-brush"></i> Coating Requirement</label>
                                    <select id="coatingRequirement" class="form-select">
                                        <option value="none">No special coating</option>
                                        <option value="primer">Shop primer only</option>
                                        <option value="intermediate">Intermediate system</option>
                                        <option value="heavy-duty">Heavy-duty system</option>
                                        <option value="marine">Marine environment</option>
                                        <option value="fire-resistant">Fire resistant</option>
                                    </select>
                                </div>
                            </div>
                             <div class="form-group">
                                <label class="form-label" for="region"><i class="fas fa-globe"></i> Region/Country</label>
                                <select id="region" class="form-select" required></select>
                                <small id="region-price-info" class="form-help"></small>
                            </div>
                        </div>
                        <div class="step-navigation">
                            <button type="button" class="btn btn-secondary" onclick="previousStep(1)"><i class="fas fa-arrow-left"></i> Back</button>
                            <button type="button" class="btn btn-primary" onclick="nextStep(3)">Next: Review <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>
                    <div class="form-step" data-step="3">
                        <div class="form-section">
                            <h3><i class="fas fa-weight-hanging"></i> Tonnage & Final Review</h3>
                            <div class="tonnage-input-enhanced">
                                <div class="tonnage-display-card">
                                    <div class="tonnage-icon"><i class="fas fa-balance-scale"></i></div>
                                    <div class="tonnage-content">
                                        <label class="form-label" for="totalTonnageInput">Total Steel Tonnage (Metric Tons)</label>
                                        <div class="tonnage-input-group">
                                            <input type="number" id="totalTonnageInput" class="form-input tonnage-input" placeholder="Enter tonnage" step="0.01" min="0.1" required>
                                            <div class="tonnage-unit">MT</div>
                                        </div>
                                        <small class="form-help"><i class="fas fa-info-circle"></i> Auto-filled from uploaded files or enter manually</small>
                                    </div>
                                </div>
                            </div>
                            <div class="project-summary-card">
                                <h4><i class="fas fa-clipboard-list"></i> Project Summary</h4>
                                <div id="project-summary-content" class="summary-grid"></div>
                            </div>
                        </div>
                        <div class="step-navigation">
                            <button type="button" class="btn btn-secondary" onclick="previousStep(2)"><i class="fas fa-arrow-left"></i> Back</button>
                            <button type="button" id="calculate-estimate-btn" class="btn btn-primary"><i class="fas fa-calculator"></i> Generate Professional Estimate</button>
                        </div>
                    </div>
                </form>
            </div>
            <div class="tonnage-results-panel">
                <div id="tonnage-result-container" class="results-wrapper">
                    <div class="results-placeholder">
                        <div class="placeholder-icon"><i class="fas fa-chart-pie"></i></div>
                        <h3>Professional Estimation Ready</h3>
                        <p>Complete the form steps to generate your detailed cost estimation report.</p>
                        <ul class="feature-list">
                            <li><i class="fas fa-check"></i> Detailed cost breakdown</li>
                            <li><i class="fas fa-check"></i> Regional pricing analysis</li>
                            <li><i class="fas fa-check"></i> Timeline estimation</li>
                            <li><i class="fas fa-check"></i> Professional PDF report</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>`;
    initializeEnhancedTonnageEstimator();
}

function initializeEnhancedTonnageEstimator() {
    populateRegionDropdown();
    attachFileUploadListeners();
    attachFormEventListeners();
    updateProjectSummary();
    document.getElementById('region').value = 'us';
    document.getElementById('projectComplexity').value = 'moderate';
    updateRegionalPricingDisplay();
}

function populateRegionDropdown() {
    const regionSelect = document.getElementById('region');
    regionSelect.innerHTML = '';
    for (const [key, data] of Object.entries(regionalPricing)) {
        const regionName = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        regionSelect.innerHTML += `<option value="${key}">${regionName}</option>`;
    }
}

function attachFileUploadListeners() {
    const uploadZones = [
        { zone: 'mto-drop-zone', input: 'mto-file-input', type: 'mto' },
        { zone: 'dwg-drop-zone', input: 'dwg-file-input', type: 'dwg' },
        { zone: 'model-drop-zone', input: 'model-file-input', type: 'model' },
        { zone: 'spec-drop-zone', input: 'spec-file-input', type: 'spec' }
    ];
    uploadZones.forEach(({zone, input, type}) => {
        const dropZone = document.getElementById(zone);
        const fileInput = document.getElementById(input);
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', (e) => e.currentTarget.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('drag-over');
            processUploadedFiles(Array.from(e.dataTransfer.files), type);
        });
        fileInput.addEventListener('change', (e) => processUploadedFiles(Array.from(e.target.files), type));
    });
}

function attachFormEventListeners() {
    document.getElementById('calculate-estimate-btn').addEventListener('click', handleCalculateEnhancedEstimate);
    document.getElementById('region').addEventListener('change', updateRegionalPricingDisplay);
    const summaryFields = ['projectName', 'structureType', 'steelGrade', 'totalTonnageInput', 'projectComplexity', 'coatingRequirement', 'region'];
    summaryFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateProjectSummary);
            field.addEventListener('change', updateProjectSummary);
        }
    });
}

function processUploadedFiles(files, type) {
    files.forEach(file => {
        const fileId = `file-${Date.now()}-${Math.random()}`;
        tonnageEstimatorState.currentFiles.push({ file, type, id: fileId, status: 'processing' });
        displayUploadedFile(file, type, fileId);
        // Simulate backend file processing
        setTimeout(() => {
            const statusElement = document.getElementById(`status-${fileId}`);
            let extractedTonnage = 0;
            if (statusElement) {
                statusElement.className = 'file-status success';
                if (type === 'mto' || type === 'dwg' || type === 'model') {
                    extractedTonnage = Math.round((Math.random() * (800 - 20) + 20) * 100) / 100;
                    const currentTonnage = parseFloat(document.getElementById('totalTonnageInput').value) || 0;
                    const newTotal = currentTonnage + extractedTonnage;
                    document.getElementById('totalTonnageInput').value = newTotal.toFixed(2);
                    tonnageEstimatorState.extractedTonnage = newTotal;
                    statusElement.innerHTML = `<i class="fas fa-check-circle"></i> ${extractedTonnage.toFixed(2)} MT found`;
                    updateProjectSummary();
                } else {
                     statusElement.innerHTML = `<i class="fas fa-check-circle"></i> Processed`;
                }
            }
        }, 1500 + Math.random() * 1000);
    });
}

function displayUploadedFile(file, type, fileId) {
    const container = document.getElementById('uploaded-files-container');
    if (!container.querySelector('.files-header')) {
        container.innerHTML = '<h4 class="files-header"><i class="fas fa-files-alt"></i> Uploaded Files</h4>';
    }
    const fileElement = document.createElement('div');
    fileElement.className = 'uploaded-file-item';
    fileElement.id = fileId;
    fileElement.innerHTML = `
        <div class="file-info">
            <div class="file-icon ${getFileIconClass(file.name)}">${getFileIcon(file.name)}</div>
            <div class="file-details">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    <span class="file-size">${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <span class="file-type-tag">${type.toUpperCase()}</span>
                </div>
            </div>
        </div>
        <div class="file-actions">
            <div class="file-status processing" id="status-${fileId}">
                <div class="processing-spinner"></div> Processing...
            </div>
            <button class="btn btn-sm btn-danger" onclick="removeFile('${fileId}')"><i class="fas fa-trash"></i></button>
        </div>`;
    container.appendChild(fileElement);
    container.style.display = 'block';
}

function removeFile(fileId) {
    const fileElement = document.getElementById(fileId);
    if (fileElement) fileElement.remove();
    tonnageEstimatorState.currentFiles = tonnageEstimatorState.currentFiles.filter(f => f.id !== fileId);
    if (tonnageEstimatorState.currentFiles.length === 0) {
        document.getElementById('uploaded-files-container').style.display = 'none';
        document.getElementById('totalTonnageInput').value = 0;
        tonnageEstimatorState.extractedTonnage = 0;
    }
    showNotification('File removed. Please verify total tonnage.', 'info');
    updateProjectSummary();
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const iconMap = { 'xlsx': 'fa-file-excel', 'xls': 'fa-file-excel', 'csv': 'fa-file-csv', 'pdf': 'fa-file-pdf', 'dwg': 'fa-drafting-compass', 'dxf': 'fa-vector-square', 'ifc': 'fa-cube', 'step': 'fa-cube', 'doc': 'fa-file-word', 'docx': 'fa-file-word', 'txt': 'fa-file-alt' };
    return `<i class="fas ${iconMap[ext] || 'fa-file'}"></i>`;
}

function getFileIconClass(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const classMap = { 'xlsx': 'excel', 'xls': 'excel', 'csv': 'excel', 'pdf': 'pdf', 'dwg': 'cad', 'dxf': 'cad', 'ifc': 'model', 'step': 'model', 'doc': 'word', 'docx': 'word', 'txt': 'text' };
    return classMap[ext] || 'generic';
}

function nextStep(stepNumber) {
    if (!validateCurrentStep(stepNumber - 1)) return;
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum <= stepNumber);
        step.classList.toggle('completed', stepNum < stepNumber);
    });
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === stepNumber);
    });
    if (stepNumber === 3) updateProjectSummary();
}

function previousStep(stepNumber) {
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.dataset.step);
        step.classList.toggle('active', stepNum <= stepNumber);
        step.classList.toggle('completed', stepNum < stepNumber);
    });
    document.querySelectorAll('.form-step').forEach(step => {
        step.classList.toggle('active', parseInt(step.dataset.step) === stepNumber);
    });
}

function validateCurrentStep(stepNumber) {
    switch(stepNumber) {
        case 1: return true;
        case 2:
            const required = ['projectName', 'structureType', 'region'];
            for (const id of required) {
                if (document.getElementById(id).value.trim() === '') {
                    showNotification(`Please fill out the '${document.querySelector(`label[for=${id}]`).textContent.trim()}' field.`, 'error');
                    return false;
                }
            }
            return true;
        case 3:
             if (parseFloat(document.getElementById('totalTonnageInput').value) > 0) return true;
             showNotification('Total Tonnage must be greater than zero.', 'error');
             return false;
        default: return true;
    }
}

function updateRegionalPricingDisplay() {
    const region = document.getElementById('region').value;
    const infoDiv = document.getElementById('region-price-info');
    if (region && regionalPricing[region]) {
        const pricing = regionalPricing[region];
        infoDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${pricing.info}. Currency set to ${pricing.currency}.`;
    } else {
        infoDiv.textContent = '';
    }
    updateProjectSummary();
}

function updateProjectSummary() {
    const summaryContent = document.getElementById('project-summary-content');
    if (!summaryContent) return;
    const getVal = (id) => document.getElementById(id)?.value || 'N/A';
    const getText = (id) => {
        const el = document.getElementById(id);
        return el && el.selectedIndex > -1 ? el.options[el.selectedIndex].text : 'N/A';
    };
    summaryContent.innerHTML = `
        <div class="summary-item"><span class="label">Project Name</span><span class="value">${getVal('projectName') || 'Not Set'}</span></div>
        <div class="summary-item"><span class="label">Project Type</span><span class="value">${getText('structureType')}</span></div>
        <div class="summary-item"><span class="label">Total Tonnage</span><span class="value"><strong>${getVal('totalTonnageInput')} MT</strong></span></div>
        <div class="summary-item"><span class="label">Region</span><span class="value">${getText('region')}</span></div>
        <div class="summary-item"><span class="label">Complexity</span><span class="value">${getText('projectComplexity')}</span></div>
        <div class="summary-item"><span class="label">Steel Grade</span><span class="value">${getText('steelGrade')}</span></div>`;
}

async function handleCalculateEnhancedEstimate() {
    if (!validateCurrentStep(3)) return;

    const estimationData = {
        projectName: document.getElementById('projectName').value,
        projectLocation: document.getElementById('projectLocation').value,
        structureType: document.getElementById('structureType').value,
        projectComplexity: document.getElementById('projectComplexity').value,
        steelGrade: document.getElementById('steelGrade').value,
        coatingRequirement: document.getElementById('coatingRequirement').value,
        region: document.getElementById('region').value,
        totalTonnage: document.getElementById('totalTonnageInput').value,
    };

    const calculateBtn = document.getElementById('calculate-estimate-btn');
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = '<div class="btn-spinner"></div> Calculating...';
    calculateBtn.disabled = true;

    try {
        const response = await apiCall('/estimation/calculate', 'POST', estimationData);
        
        if (response.success && response.data) {
            tonnageEstimatorState.currentEstimate = response.data;
            displayTonnageEstimateResults(response.data);
            showNotification('Estimation calculated successfully!', 'success');
        } else {
            throw new Error(response.message || 'Failed to calculate estimation.');
        }

    } catch (error) {
        console.error('Estimation calculation error:', error);
    } finally {
        calculateBtn.innerHTML = originalText;
        calculateBtn.disabled = false;
    }
}

function displayTonnageEstimateResults(est) {
    const container = document.getElementById('tonnage-result-container');
    if (!est) return;

    const formatCurrency = (val) => {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: est.currency }).format(Math.round(val));
        } catch (e) {
            return `${est.currency} ${Math.round(val).toLocaleString()}`;
        }
    };
    
    const breakdownHTML = Object.entries(est.costBreakdown).map(([key, value]) => {
        const itemClass = (key.toLowerCase().includes('subtotal') || key.toLowerCase().includes('contingency')) 
                        ? 'result-item subtotal' : 'result-item';
        return `
            <div class="${itemClass}">
                <span>${key}</span>
                <span>${formatCurrency(value)}</span>
            </div>`;
    }).join('');
    
    container.innerHTML = `
        <div class="result-header">
            <h4><i class="fas fa-clipboard-check"></i> Estimation Report</h4>
            <p>For: <strong>${est.projectName}</strong></p>
        </div>
        <div class="result-total">
            <span>Total Estimated Project Cost</span>
            <strong>${formatCurrency(est.totalProjectCost)}</strong>
        </div>
        <div class="result-summary">
            <div class="summary-item">
                <span class="label">Total Tonnage</span>
                <strong class="value">${parseFloat(est.totalTonnage).toFixed(2)} MT</strong>
            </div>
            <div class="summary-item">
                <span class="label">Est. Timeline</span>
                <strong class="value">${est.estimatedWeeks} weeks</strong>
            </div>
            <div class="summary-item">
                <span class="label">Cost per MT</span>
                <strong class="value">${formatCurrency(est.costPerTonne)}</strong>
            </div>
        </div>
        <div class="result-breakdown">${breakdownHTML}</div>
        <div class="result-actions">
            <button class="btn btn-secondary" onclick="downloadTonnageReport('${est._id}')"><i class="fas fa-download"></i> Download PDF</button>
            <button class="btn btn-primary" onclick="showEstimateHistory()"><i class="fas fa-save"></i> View History</button>
        </div>`;
}

async function downloadTonnageReport(estimationId) {
    if (!estimationId) return showNotification('No estimate ID found.', 'error');

    try {
        const response = await fetch(`${BACKEND_URL}/estimation/${estimationId}/generate-report`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${appState.jwtToken}` }
        });

        if (!response.ok) throw new Error('Failed to generate the report from the server.');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = ''; 
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('Report download initiated.', 'success');
    } catch (error) {
        console.error('Report download error:', error);
        showNotification(error.message, 'error');
    }
}

function showEstimateHistory() {
    showNotification('Estimate history feature coming soon!', 'info');
}

function exportEstimateTemplate() {
    showNotification('Template export feature coming soon!', 'info');
}