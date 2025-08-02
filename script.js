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
    userSubmittedQuotes: new Set(), // Track which jobs user has already quoted
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
                     <p>Check back later for new opportunities or try adjusting your search criteria.</p>
                   </div>`
                : `<div class="empty-state">
                     <div class="empty-icon"><i class="fas fa-plus-circle"></i></div>
                     <h3>You haven't posted any projects yet</h3>
                     <p>Ready to get started? Post your first project and connect with talented professionals.</p>
                     <button class="btn btn-primary" onclick="renderAppSection('post-job')">Post Your First Project</button>
                   </div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => {
            const hasUserQuoted = appState.userSubmittedQuotes.has(job.id);
            const canQuote = user.type === 'designer' && job.status === 'open' && !hasUserQuoted;
            const quoteButton = canQuote 
                ? `<button class="btn btn-primary btn-submit-quote" onclick="showQuoteModal('${job.id}')">
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
                     <button class="btn btn-outline" onclick="viewQuotes('${job.id}')">
                       <i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})
                     </button>
                     <button class="btn btn-danger" onclick="deleteJob('${job.id}')">
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
                <div class="job-card modern-card" data-job-id="${job.id}">
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
                        <div class="job-meta-item">
                            <i class="fas fa-user"></i>
                            <span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span>
                        </div>
                        ${job.assignedToName ? `
                            <div class="job-meta-item">
                                <i class="fas fa-user-check"></i>
                                <span>Assigned to: <strong>${job.assignedToName}</strong></span>
                            </div>
                        ` : ''}
                        ${job.deadline ? `
                            <div class="job-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="job-description">
                        <p>${job.description}</p>
                    </div>
                    
                    ${skillsDisplay}
                    
                    ${job.link ? `
                        <div class="job-link">
                            <i class="fas fa-external-link-alt"></i>
                            <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a>
                        </div>
                    ` : ''}
                    
                    ${attachmentLink}
                    
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        jobsListContainer.innerHTML = jobsHTML;

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
        jobsListContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Projects</h3>
                <p>We encountered an issue loading the projects. Please try again.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button>
            </div>`;
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
            listContainer.innerHTML = `
                <div class="empty-state">
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
                <div class="job-card modern-card approved-job">
                    <div class="job-header">
                        <div class="job-title-section">
                            <h3 class="job-title">${job.title}</h3>
                            <span class="job-status-badge assigned">
                                <i class="fas fa-user-check"></i> Assigned
                            </span>
                        </div>
                        <div class="approved-amount">
                            <span class="amount-label">Approved Amount</span>
                            <span class="amount-value">$${job.approvedAmount}</span>
                        </div>
                    </div>
                    
                    <div class="job-meta">
                        <div class="job-meta-item">
                            <i class="fas fa-user-cog"></i>
                            <span>Assigned to: <strong>${job.assignedToName}</strong></span>
                        </div>
                    </div>
                    
                    <div class="job-description">
                        <p>${job.description}</p>
                    </div>
                    
                    ${skillsDisplay}
                    
                    ${job.link ? `
                        <div class="job-link">
                            <i class="fas fa-external-link-alt"></i>
                            <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a>
                        </div>
                    ` : ''}
                    
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
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Approved Projects</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderApprovedJobs()">Retry</button>
            </div>`;
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
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Submitted</h3>
                    <p>You haven't submitted any quotes yet. Browse available projects to get started.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            let attachmentLink = attachments.length > 0
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
                actionButtons.push(`
                    <button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')">
                        <i class="fas fa-comments"></i> Message Client
                    </button>
                `);
            }
            
            if (canEdit) {
                actionButtons.push(`
                    <button class="btn btn-outline" onclick="editQuote('${quote.id}')">
                        <i class="fas fa-edit"></i> Edit Quote
                    </button>
                `);
            }
            
            if (canDelete) {
                actionButtons.push(`
                    <button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                `);
            }
            
            return `
                <div class="quote-card modern-card quote-status-${statusClass}">
                    <div class="quote-header">
                        <div class="quote-title-section">
                            <h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown Job'}</h3>
                            <span class="quote-status-badge ${statusClass}">
                                <i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                        </div>
                        <div class="quote-amount-section">
                            <span class="amount-label">Quote Amount</span>
                            <span class="amount-value">$${quote.quoteAmount}</span>
                        </div>
                    </div>
                    
                    <div class="quote-meta">
                        ${quote.timeline ? `
                            <div class="quote-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Timeline: <strong>${quote.timeline} days</strong></span>
                            </div>
                        ` : ''}
                        <div class="quote-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span>
                        </div>
                    </div>
                    
                    <div class="quote-description">
                        <p>${quote.description}</p>
                    </div>
                    
                    ${attachmentLink}
                    
                    <div class="quote-actions">
                        <div class="quote-actions-group">
                            ${actionButtons.join('')}
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Quotes</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderMyQuotes()">Retry</button>
            </div>`;
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        
        const content = `
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Your Quote</h3>
                <p class="modal-subtitle">Update your quote details for: <strong>${quote.jobTitle}</strong></p>
            </div>
            <form id="edit-quote-form" class="modern-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-dollar-sign"></i> Quote Amount ($)
                        </label>
                        <input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required min="1" step="0.01">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-calendar-alt"></i> Timeline (days)
                        </label>
                        <input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required min="1">
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-file-alt"></i> Proposal Description
                    </label>
                    <textarea class="form-textarea" name="description" required placeholder="Describe your approach, methodology, and what you'll deliver...">${quote.description}</textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-paperclip"></i> Attachments (Optional, max 5)
                    </label>
                    <input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                    <small class="form-help">Supported formats: PDF, DOC, DWG, Images</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Update Quote
                    </button>
                </div>
            </form>`;
        showGenericModal(content, 'max-width: 600px;');
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {
        // Error handled by apiCall
    }
}

async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    try {
        submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
        submitBtn.disabled = true;
        
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
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        // Error handled by apiCall
    } finally {
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
                loadUserQuotes(); // Refresh the submitted quotes tracking
            })
            .catch(() => {});
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer and reject other quotes.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!')
            .then(() => {
                closeModal();
                fetchAndRenderJobs();
                showNotification('Project has been assigned! You can now communicate with the designer.', 'success');
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header">
            <h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3>
            <p class="modal-subtitle">Provide your best proposal for this project</p>
        </div>
        <form id="quote-form" class="modern-form">
            <input type="hidden" name="jobId" value="${jobId}">
            
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-dollar-sign"></i> Quote Amount ($)
                    </label>
                    <input type="number" class="form-input" name="amount" required min="1" step="0.01" placeholder="Enter your quote amount">
                </div>
                
                <div class="form-group">
                    <label class="form-label">
                        <i class="fas fa-calendar-alt"></i> Timeline (days)
                    </label>
                    <input type="number" class="form-input" name="timeline" required min="1" placeholder="Project duration">
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-file-alt"></i> Proposal Description
                </label>
                <textarea class="form-textarea" name="description" required placeholder="Describe your approach, methodology, experience, and what you'll deliver for this project..."></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-paperclip"></i> Attachments (Optional, max 5)
                </label>
                <input type="file" class="form-input file-input" name="attachments" multiple accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                <small class="form-help">Upload portfolio samples, certifications, or relevant documents</small>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-paper-plane"></i> Submit Quote
                </button>
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
    try {
        submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
        submitBtn.disabled = true;
        
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
        
        appState.userSubmittedQuotes.add(form['jobId'].value);
        
        closeModal();
        fetchAndRenderJobs(); 
        showNotification('Your quote has been submitted! You can track its status in "My Quotes".', 'success');

    } catch (error) {
        console.error("Quote submission failed:", error);
    } finally {
        if(submitBtn){
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}

// --- START: AI QUOTE ANALYSIS FUNCTIONS ---
async function analyzeQuote(quoteId, jobId) {
    try {
        showNotification('Analyzing quote with AI insights...', 'info');
        const response = await apiCall(`/quotes/${quoteId}/analyze`, 'POST', { jobId });
        if (response.success) {
            showQuoteAnalysisModal(response.data);
        }
    } catch (error) {
        // Error is already shown by apiCall
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
            <div class="analysis-section">
                <div class="analysis-card overview-card">
                    <div class="card-header">
                        <h4><i class="fas fa-info-circle"></i> Quote Overview</h4>
                    </div>
                    <div class="quote-summary">
                        <div class="summary-item">
                            <span class="label">Designer:</span>
                            <span class="value">${quote.designerName}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Quote Amount:</span>
                            <span class="value quote-amount">$${quote.quoteAmount}</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Timeline:</span>
                            <span class="value">${quote.timeline} days</span>
                        </div>
                        <div class="summary-item">
                            <span class="label">Project Budget:</span>
                            <span class="value">${job.budget}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="analysis-section">
                <div class="analysis-card ai-insights-card">
                    <div class="card-header">
                        <h4><i class="fas fa-robot"></i> AI Insights</h4>
                        <div class="confidence-score">
                            <span class="confidence-label">Analysis Confidence:</span>
                            <div class="confidence-bar">
                                <div class="confidence-fill" style="width: ${analysis.confidence}%"></div>
                            </div>
                            <span class="confidence-value">${analysis.confidence}%</span>
                        </div>
                    </div>
                    <div class="recommendation-section">
                        <div class="recommendation-badge ${analysis.recommendation.toLowerCase()}">
                            <i class="fas ${getRecommendationIcon(analysis.recommendation)}"></i>
                            ${analysis.recommendation.replace('_', ' ')}
                        </div>
                        <p class="recommendation-text">${analysis.summary}</p>
                    </div>
                </div>
            </div>
            <div class="analysis-grid">
                <div class="analysis-card">
                    <div class="card-header">
                        <h5><i class="fas fa-dollar-sign"></i> Cost Analysis</h5>
                    </div>
                    <div class="analysis-content">
                        <div class="score-indicator">
                            <div class="score-circle ${getCostScoreClass(analysis.costAnalysis.score)}">
                                ${analysis.costAnalysis.score}/10
                            </div>
                            <span class="score-label">Cost Score</span>
                        </div>
                        <div class="analysis-details">
                            <p><strong>Budget Fit:</strong> ${analysis.costAnalysis.budgetFit}</p>
                            <p><strong>Market Rate:</strong> ${analysis.costAnalysis.marketComparison}</p>
                            <p><strong>Value Assessment:</strong> ${analysis.costAnalysis.valueAssessment}</p>
                        </div>
                        ${analysis.costAnalysis.redFlags && analysis.costAnalysis.redFlags.length > 0 ? `
                            <div class="red-flags">
                                <h6><i class="fas fa-exclamation-triangle"></i> Cost Concerns:</h6>
                                <ul>
                                    ${analysis.costAnalysis.redFlags.map(flag => `<li>${flag}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="analysis-card">
                    <div class="card-header">
                        <h5><i class="fas fa-clock"></i> Timeline Analysis</h5>
                    </div>
                    <div class="analysis-content">
                        <div class="score-indicator">
                            <div class="score-circle ${getTimelineScoreClass(analysis.timelineAnalysis.score)}">
                                ${analysis.timelineAnalysis.score}/10
                            </div>
                            <span class="score-label">Timeline Score</span>
                        </div>
                        <div class="analysis-details">
                            <p><strong>Realistic Assessment:</strong> ${analysis.timelineAnalysis.realistic}</p>
                            <p><strong>Compared to Deadline:</strong> ${analysis.timelineAnalysis.deadlineComparison}</p>
                            <p><strong>Industry Standard:</strong> ${analysis.timelineAnalysis.industryComparison}</p>
                        </div>
                        ${analysis.timelineAnalysis.concerns && analysis.timelineAnalysis.concerns.length > 0 ? `
                            <div class="concerns">
                                <h6><i class="fas fa-exclamation-circle"></i> Timeline Concerns:</h6>
                                <ul>
                                    ${analysis.timelineAnalysis.concerns.map(concern => `<li>${concern}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="analysis-card">
                    <div class="card-header">
                        <h5><i class="fas fa-cogs"></i> Technical Assessment</h5>
                    </div>
                    <div class="analysis-content">
                        <div class="score-indicator">
                            <div class="score-circle ${getTechnicalScoreClass(analysis.technicalAnalysis.score)}">
                                ${analysis.technicalAnalysis.score}/10
                            </div>
                            <span class="score-label">Technical Score</span>
                        </div>
                        <div class="analysis-details">
                            <p><strong>Approach Quality:</strong> ${analysis.technicalAnalysis.approachQuality}</p>
                            <p><strong>Completeness:</strong> ${analysis.technicalAnalysis.completeness}</p>
                            <p><strong>Expertise Level:</strong> ${analysis.technicalAnalysis.expertiseLevel}</p>
                        </div>
                        ${analysis.technicalAnalysis.strengths && analysis.technicalAnalysis.strengths.length > 0 ? `
                            <div class="strengths">
                                <h6><i class="fas fa-check-circle"></i> Technical Strengths:</h6>
                                <ul>
                                    ${analysis.technicalAnalysis.strengths.map(strength => `<li>${strength}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="analysis-card">
                    <div class="card-header">
                        <h5><i class="fas fa-shield-alt"></i> Risk Assessment</h5>
                    </div>
                    <div class="analysis-content">
                        <div class="risk-level ${analysis.riskAnalysis.level.toLowerCase()}">
                            <i class="fas ${getRiskIcon(analysis.riskAnalysis.level)}"></i>
                            ${analysis.riskAnalysis.level} Risk
                        </div>
                        <div class="analysis-details">
                            <p><strong>Overall Risk:</strong> ${analysis.riskAnalysis.overall}</p>
                            ${analysis.riskAnalysis.factors.length > 0 ? `
                                <div class="risk-factors">
                                    <h6>Risk Factors:</h6>
                                    <ul>
                                        ${analysis.riskAnalysis.factors.map(factor => `<li>${factor}</li>`).join('')}
                                    </ul>
                                </div>
                            ` : ''}
                            ${analysis.riskAnalysis.mitigation ? `
                                <div class="mitigation">
                                    <h6>Risk Mitigation:</h6>
                                    <p>${analysis.riskAnalysis.mitigation}</p>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="analysis-section">
                <div class="analysis-card recommendations-card">
                    <div class="card-header">
                        <h4><i class="fas fa-lightbulb"></i> AI Recommendations</h4>
                    </div>
                    <div class="recommendations-content">
                        ${analysis.recommendations.map((rec, index) => `
                            <div class="recommendation-item">
                                <div class="rec-icon ${rec.type}">
                                    <i class="fas ${getRecIcon(rec.type)}"></i>
                                </div>
                                <div class="rec-content">
                                    <h6>${rec.title}</h6>
                                    <p>${rec.description}</p>
                                    ${rec.action ? `<div class="rec-action">${rec.action}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            ${analysis.questionsToAsk && analysis.questionsToAsk.length > 0 ? `
                <div class="analysis-section">
                    <div class="analysis-card questions-card">
                        <div class="card-header">
                            <h4><i class="fas fa-question-circle"></i> Suggested Questions</h4>
                            <p class="card-subtitle">Important questions to ask this designer</p>
                        </div>
                        <div class="questions-list">
                            ${analysis.questionsToAsk.map((question, index) => `
                                <div class="question-item">
                                    <div class="question-number">${index + 1}</div>
                                    <div class="question-text">${question}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
        <div class="analysis-actions">
            <button class="btn btn-secondary" onclick="closeModal()">Close Analysis</button>
            <div class="action-buttons">
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

function getRecommendationIcon(recommendation) {
    const icons = {
        'HIGHLY_RECOMMENDED': 'fa-thumbs-up',
        'RECOMMENDED': 'fa-check-circle',
        'PROCEED_WITH_CAUTION': 'fa-exclamation-triangle',
        'NOT_RECOMMENDED': 'fa-thumbs-down'
    };
    return icons[recommendation.toUpperCase()] || 'fa-question-circle';
}

function getCostScoreClass(score) {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'fair';
    return 'poor';
}

function getTimelineScoreClass(score) {
    return getCostScoreClass(score);
}

function getTechnicalScoreClass(score) {
    return getCostScoreClass(score);
}

function getRiskIcon(level) {
    const icons = {
        'LOW': 'fa-shield-alt',
        'MEDIUM': 'fa-exclamation-triangle',
        'HIGH': 'fa-exclamation-circle'
    };
    return icons[level.toUpperCase()] || 'fa-question-circle';
}

function getRecIcon(type) {
    const icons = {
        'positive': 'fa-thumbs-up',
        'warning': 'fa-exclamation-triangle',
        'suggestion': 'fa-lightbulb',
        'action': 'fa-tasks'
    };
    return icons[type.toLowerCase()] || 'fa-info-circle';
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];

        let quotesHTML = `
            <div class="modal-header">
                <h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3>
                <p class="modal-subtitle">Review and manage quotes for this project</p>
            </div>`;

        if (quotes.length === 0) {
            quotesHTML += `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Received</h3>
                    <p>No quotes have been submitted for this project yet. Check back later.</p>
                </div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += `<div class="quotes-list">`;

            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = attachments.length > 0
                    ? `<div class="quote-attachment">
                         <i class="fas fa-paperclip"></i>
                         <a href="${attachments[0]}" target="_blank" rel="noopener noreferrer">View Attachment</a>
                       </div>`
                    : '';

                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = '';

                const messageButton = `
                    <button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')">
                        <i class="fas fa-comments"></i> Message
                    </button>
                `;
                const analyzeButton = `
                    <button class="btn btn-primary btn-sm" onclick="analyzeQuote('${quote.id}', '${jobId}')" title="Get AI-powered quote analysis">
                        <i class="fas fa-chart-line"></i> AI Analysis
                    </button>
                `;

                if(canApprove) {
                    actionButtons = `
                        ${analyzeButton}
                        <button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')">
                            <i class="fas fa-check"></i> Approve Quote
                        </button>
                        ${messageButton}
                    `;
                } else if (quote.status === 'approved') {
                    actionButtons = `
                        ${analyzeButton}
                        <span class="status-approved">
                            <i class="fas fa-check-circle"></i> Approved
                        </span>
                        ${messageButton}
                    `;
                } else {
                    actionButtons = `${analyzeButton} ${messageButton}`;
                }
                const statusClass = quote.status;
                const statusIcon = {
                    'submitted': 'fa-clock',
                    'approved': 'fa-check-circle',
                    'rejected': 'fa-times-circle'
                }[quote.status] || 'fa-question-circle';

                return `
                    <div class="quote-item quote-status-${statusClass}">
                        <div class="quote-item-header">
                            <div class="designer-info">
                                <div class="designer-avatar">${quote.designerName.charAt(0).toUpperCase()}</div>
                                <div class="designer-details">
                                    <h4>${quote.designerName}</h4>
                                    <span class="quote-status-badge ${statusClass}">
                                        <i class="fas ${statusIcon}"></i> ${quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                            <div class="quote-amount">
                                <span class="amount-label">Quote</span>
                                <span class="amount-value">$${quote.quoteAmount}</span>
                            </div>
                        </div>

                        <div class="quote-details">
                            ${quote.timeline ? `
                                <div class="quote-meta-item">
                                    <i class="fas fa-calendar-alt"></i>
                                    <span>Timeline: <strong>${quote.timeline} days</strong></span>
                                </div>
                            ` : ''}

                            <div class="quote-description">
                                <p>${quote.description}</p>
                            </div>

                            ${attachmentLink}
                        </div>

                        <div class="quote-actions">
                            ${actionButtons}
                        </div>
                    </div>
                `;
            }).join('');

            quotesHTML += `</div>`;
        }

        showGenericModal(quotesHTML, 'max-width: 800px;');
    } catch (error) {
        showGenericModal(`
            <div class="modal-header">
                <h3><i class="fas fa-exclamation-triangle"></i> Error</h3>
            </div>
            <div class="error-state">
                <p>Could not load quotes for this project. Please try again later.</p>
            </div>
        `);
    }
}
// --- END: AI QUOTE ANALYSIS FUNCTIONS ---

// --- ENHANCED MESSAGING SYSTEM ---
async function openConversation(jobId, recipientId) {
    try {
        showNotification('Opening conversation...', 'info');
        const response = await apiCall('/messages/find', 'POST', { jobId, recipientId });
        if (response.success) {
            renderConversationView(response.data);
        }
    } catch (error) {
        // Error is handled by apiCall
    }
}

async function fetchAndRenderConversations() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-comments"></i> Messages</h2>
                <p class="header-subtitle">Communicate with clients and designers</p>
            </div>
        </div>
        <div id="conversations-list" class="conversations-container"></div>`;
    
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>Loading conversations...</p></div>`;

    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];

        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
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
            const lastMessage = convo.lastMessage ? 
                (convo.lastMessage.length > 60 ? convo.lastMessage.substring(0, 60) + '...' : convo.lastMessage) : 
                'No messages yet.';
            const timeAgo = getTimeAgo(convo.updatedAt);
            const avatarColor = getAvatarColor(otherParticipantName);
            const isUnread = convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name;

            return `
                <div class="conversation-card modern-card ${isUnread ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar" style="background-color: ${avatarColor}">
                        ${otherParticipantName.charAt(0).toUpperCase()}
                        ${isUnread ? '<div class="unread-indicator"></div>' : ''}
                    </div>
                    <div class="convo-details">
                        <div class="convo-header">
                            <h4>${otherParticipantName}</h4>
                            <div class="convo-meta">
                                <span class="participant-type">${otherParticipant ? otherParticipant.type : ''}</span>
                                <span class="convo-time">${timeAgo}</span>
                            </div>
                        </div>
                        <p class="convo-project">
                            <i class="fas fa-briefcase"></i>
                            <strong>${convo.jobTitle}</strong>
                        </p>
                        <p class="convo-preview">
                            ${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? 
                                `<strong>${convo.lastMessageBy}:</strong> ` : ''}
                            ${lastMessage}
                        </p>
                    </div>
                    <div class="convo-arrow">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = conversationsHTML;
    } catch (error) {
        listContainer.innerHTML = `
            <div class="error-state">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Conversations</h3>
                <p>Please try again later.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderConversations()">Retry</button>
            </div>`;
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
            if(!conversation) {
                showNotification('Conversation not found.', 'error');
                return;
            }
        } catch(e) {
             showNotification('Conversation not found.', 'error');
             return;
        }
    }

    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants.find(p => p.id !== appState.currentUser.id);
    const avatarColor = getAvatarColor(otherParticipant ? otherParticipant.name : 'Unknown');
    
    container.innerHTML = `
        <div class="chat-container modern-chat">
            <div class="chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn">
                    <i class="fas fa-arrow-left"></i>
                </button>
                <div class="chat-header-info">
                    <div class="chat-avatar" style="background-color: ${avatarColor}">
                        ${otherParticipant ? otherParticipant.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="chat-details">
                        <h3>${otherParticipant ? otherParticipant.name : 'Conversation'}</h3>
                        <p class="chat-project">
                            <i class="fas fa-briefcase"></i>
                            ${conversation.jobTitle || ''}
                        </p>
                    </div>
                </div>
                <div class="chat-actions">
                    <span class="participant-type-badge ${otherParticipant ? otherParticipant.type : ''}">
                        <i class="fas ${otherParticipant && otherParticipant.type === 'designer' ? 'fa-drafting-compass' : 'fa-building'}"></i>
                        ${otherParticipant ? otherParticipant.type : ''}
                    </span>
                </div>
            </div>
            
            <div class="chat-messages" id="chat-messages-container">
                <div class="loading-messages">
                    <div class="spinner"></div>
                    <p>Loading messages...</p>
                </div>
            </div>
            
            <div class="chat-input-area">
                <form id="send-message-form" class="message-form">
                    <div class="message-input-container">
                        <input type="text" id="message-text-input" placeholder="Type your message..." required autocomplete="off">
                        <button type="submit" class="send-button" title="Send message">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('send-message-form').addEventListener('submit', (e) => {
        e.preventDefault();
        handleSendMessage(conversation.id);
    });

    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${conversation.id}/messages`, 'GET');
        const messages = response.data || [];
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-messages">
                    <div class="empty-icon"><i class="fas fa-comment-dots"></i></div>
                    <h4>Start the conversation</h4>
                    <p>Send your first message to begin collaborating on this project.</p>
                </div>`;
        } else {
            messagesContainer.innerHTML = messages.map((msg, index) => {
                const isMine = msg.senderId === appState.currentUser.id;
                const time = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
                const prevMsg = messages[index - 1];
                const showAvatar = !prevMsg || prevMsg.senderId !== msg.senderId;
                const avatarColor = getAvatarColor(msg.senderName);
                
                return `
                    <div class="message-wrapper ${isMine ? 'me' : 'them'}">
                        ${showAvatar ? `
                            <div class="message-avatar" style="background-color: ${avatarColor}">
                                ${msg.senderName.charAt(0).toUpperCase()}
                            </div>
                        ` : '<div class="message-avatar-spacer"></div>'}
                        <div class="message-content">
                            ${showAvatar && !isMine ? `<div class="message-sender">${msg.senderName}</div>` : ''}
                            <div class="message-bubble ${isMine ? 'me' : 'them'}">
                                ${msg.text}
                            </div>
                            <div class="message-meta">
                                ${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `
            <div class="error-messages">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h4>Error loading messages</h4>
                <p>Please try again later.</p>
            </div>`;
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
        
        const messagesContainer = document.getElementById('chat-messages-container');
        const newMessage = response.data;
        
        if(messagesContainer.querySelector('.empty-messages')) {
            messagesContainer.innerHTML = '';
        }
        
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-wrapper me';
        const time = newMessage.createdAt?.toDate ? newMessage.createdAt.toDate() : new Date(newMessage.createdAt);
        const avatarColor = getAvatarColor(newMessage.senderName);
        
        messageBubble.innerHTML = `
            <div class="message-avatar" style="background-color: ${avatarColor}">
                ${newMessage.senderName.charAt(0).toUpperCase()}
            </div>
            <div class="message-content">
                <div class="message-bubble me">
                    ${newMessage.text}
                </div>
                <div class="message-meta">
                    ${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        showNotification('Message sent!', 'success', 2000);
        
    } catch(error) {
        // Error handled by apiCall
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        input.focus();
    }
}

// --- UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content modern-modal" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div id="modal-form-container"></div>
            </div>
        </div>`;
    modalContainer.querySelector('.modal-overlay').addEventListener('click', closeModal);
    renderAuthForm(view);
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
    modalContainer.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content modern-modal" style="${style}" onclick="event.stopPropagation()">
                <button class="modal-close-button" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
                ${innerHTML}
            </div>
        </div>`;
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
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) navMenu.innerHTML = '';
    
    const user = appState.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userType').textContent = user.type;
    document.getElementById('userAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();
    
    buildSidebarNav();
    renderAppSection('jobs');
    
    if (user.type === 'designer') {
        loadUserQuotes();
    }
}

function showLandingPageView() {
    document.getElementById('landing-page-content').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
    
    const navMenu = document.getElementById('main-nav-menu');
    if (navMenu) {
        navMenu.innerHTML = `
            <a href="#how-it-works" class="nav-link">How It Works</a>
            <a href="#why-steelconnect" class="nav-link">Why Choose Us</a>
            <a href="#showcase" class="nav-link">Showcase</a>`;
    }
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs">
             <i class="fas fa-search fa-fw"></i> 
             <span>Find Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes">
             <i class="fas fa-file-invoice-dollar fa-fw"></i> 
             <span>My Quotes</span>
           </a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs">
             <i class="fas fa-tasks fa-fw"></i> 
             <span>My Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs">
             <i class="fas fa-check-circle fa-fw"></i> 
             <span>Approved Projects</span>
           </a>
           <a href="#" class="sidebar-nav-link" data-section="post-job">
             <i class="fas fa-plus-circle fa-fw"></i> 
             <span>Post Project</span>
           </a>`;
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages">
                <i class="fas fa-comments fa-fw"></i> 
                <span>Messages</span>
              </a>`;

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
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        const subtitle = userRole === 'designer' ? 'Browse and submit quotes for engineering projects' : 'Manage your project listings and review quotes';
        container.innerHTML = `
            <div class="section-header modern-header">
                <div class="header-content">
                    <h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2>
                    <p class="header-subtitle">${subtitle}</p>
                </div>
            </div>
            <div id="jobs-list" class="jobs-grid"></div>
            <div id="load-more-container" class="load-more-section"></div>`;
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
    }
}

function showNotification(message, type = 'info', duration = 4000) {
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
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
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `
        <div class="auth-header">
            <h2><i class="fas fa-sign-in-alt"></i> Welcome Back</h2>
            <p>Sign in to your SteelConnect account</p>
        </div>
        <form id="login-form" class="modern-form">
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-envelope"></i> Email Address
                </label>
                <input type="email" class="form-input" name="loginEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-lock"></i> Password
                </label>
                <input type="password" class="form-input" name="loginPassword" required placeholder="Enter your password">
            </div>
            <button type="submit" class="btn btn-primary btn-full">
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
        <div class="auth-header">
            <h2><i class="fas fa-user-plus"></i> Join SteelConnect</h2>
            <p>Create your professional account</p>
        </div>
        <form id="register-form" class="modern-form">
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-user"></i> Full Name
                </label>
                <input type="text" class="form-input" name="regName" required placeholder="Enter your full name">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-envelope"></i> Email Address
                </label>
                <input type="email" class="form-input" name="regEmail" required placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-lock"></i> Password
                </label>
                <input type="password" class="form-input" name="regPassword" required placeholder="Create a strong password">
            </div>
            <div class="form-group">
                <label class="form-label">
                    <i class="fas fa-user-tag"></i> I am a...
                </label>
                <select class="form-select" name="regRole" required>
                    <option value="" disabled selected>Select your role</option>
                    <option value="contractor"><i class="fas fa-building"></i> Client / Contractor</option>
                    <option value="designer"><i class="fas fa-drafting-compass"></i> Designer / Engineer</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary btn-full">
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
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-plus-circle"></i> Post a New Project</h2>
                <p class="header-subtitle">Create a detailed project listing to attract qualified professionals</p>
            </div>
        </div>
        
        <div class="post-job-container">
            <form id="post-job-form" class="modern-form post-job-form">
                <div class="form-section">
                    <h3><i class="fas fa-info-circle"></i> Project Details</h3>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-heading"></i> Project Title
                        </label>
                        <input type="text" class="form-input" name="title" required 
                               placeholder="e.g., Structural Steel Design for Warehouse Extension">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-dollar-sign"></i> Budget Range
                            </label>
                            <input type="text" class="form-input" name="budget" required 
                                   placeholder="e.g., $5,000 - $10,000">
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">
                                <i class="fas fa-calendar-alt"></i> Project Deadline
                            </label>
                            <input type="date" class="form-input" name="deadline" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-tools"></i> Required Skills
                        </label>
                        <input type="text" class="form-input" name="skills" 
                               placeholder="e.g., AutoCAD, Revit, Structural Analysis, Steel Design">
                        <small class="form-help">Separate skills with commas</small>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-external-link-alt"></i> Project Link (Optional)
                        </label>
                        <input type="url" class="form-input" name="link" 
                               placeholder="https://example.com/project-details">
                        <small class="form-help">Link to additional project information or resources</small>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3><i class="fas fa-file-alt"></i> Project Description</h3>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-align-left"></i> Detailed Description
                        </label>
                        <textarea class="form-textarea" name="description" required 
                                  placeholder="Provide a comprehensive description of your project including:&#10;• Project scope and objectives&#10;• Technical requirements&#10;• Deliverables expected&#10;• Any specific standards or codes to follow&#10;• Timeline and milestones"></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">
                            <i class="fas fa-paperclip"></i> Project Attachments
                        </label>
                        <input type="file" class="form-input file-input" name="attachment" 
                               accept=".pdf,.doc,.docx,.dwg,.jpg,.jpeg,.png">
                        <small class="form-help">Upload drawings, specifications, or reference documents (Max 10MB)</small>
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-large">
                        <i class="fas fa-rocket"></i> Post Project
                    </button>
                </div>
            </form>
        </div>`;
}