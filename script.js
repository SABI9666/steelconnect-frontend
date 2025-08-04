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
    
    // Setup inactivity listeners
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    // Attach event listeners safely
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
        // Error is handled by apiCall
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
                ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')"><i class="fas fa-file-invoice-dollar"></i> Submit Quote</button>`
                : user.type === 'designer' && hasUserQuoted
                ? `<button class="btn btn-success" disabled><i class="fas fa-check-circle"></i> Quote Submitted</button>`
                : user.type === 'designer' && job.status === 'assigned'
                ? `<span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span>`
                : '';

            const actions = user.type === 'designer'
                ? quoteButton
                : `<div class="job-actions-group">
                     <button class="btn btn-outline" onclick="viewQuotes('${job.id}')"><i class="fas fa-eye"></i> View Quotes (${job.quotesCount || 0})</button>
                     <button class="btn btn-danger btn-sm" onclick="deleteJob('${job.id}')"><i class="fas fa-trash"></i> Delete</button>
                   </div>`;
            
            const statusBadge = `<span class="job-status-badge ${job.status}">${job.status}</span>`;
            
            const attachmentLink = job.attachment 
                ? `<div class="job-attachment"><i class="fas fa-paperclip"></i> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View Attachment</a></div>` 
                : '';
            
            const skillsDisplay = job.skills?.length > 0 
                ? `<div class="job-skills">
                     <span><i class="fas fa-tools"></i> Skills:</span>
                     <div class="skills-tags">
                       ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                     </div>
                   </div>` 
                : '';
            
            return `
                <div class="modern-card job-card" data-job-id="${job.id}">
                    <div class="job-header">
                        <div class="job-title-section">
                            <h3 class="job-title">${job.title}</h3>
                            ${statusBadge}
                        </div>
                        <div class="budget-section">
                            <span class="budget-label">Budget</span>
                            <span class="budget-amount">${job.budget}</span>
                        </div>
                    </div>
                    <div class="job-meta">
                        <div class="job-meta-item"><i class="fas fa-user"></i><span>Posted by: <strong>${job.posterName || 'N/A'}</strong></span></div>
                        ${job.assignedToName ? `<div class="job-meta-item"><i class="fas fa-user-check"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>` : ''}
                        ${job.deadline ? `<div class="job-meta-item"><i class="fas fa-calendar-alt"></i><span>Deadline: <strong>${new Date(job.deadline).toLocaleDateString()}</strong></span></div>` : ''}
                    </div>
                    <div class="job-description"><p>${job.description}</p></div>
                    ${skillsDisplay}
                    ${job.link ? `<div class="job-link"><i class="fas fa-external-link-alt"></i> <a href="${job.link}" target="_blank" rel="noopener noreferrer">View Project Link</a></div>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        if (loadMore) {
            jobsListContainer.insertAdjacentHTML('beforeend', jobsHTML);
        } else {
            jobsListContainer.innerHTML = jobsHTML;
        }
        
        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-outline" id="load-more-btn"><i class="fas fa-chevron-down"></i> Load More Projects</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        jobsListContainer.innerHTML = `<div class="error-state">
                <div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <h3>Error Loading Projects</h3><p>We couldn't load the projects. Please try again.</p>
                <button class="btn btn-primary" onclick="fetchAndRenderJobs()">Retry</button>
            </div>`;
    }
}


async function fetchAndRenderApprovedJobs() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-check-circle"></i> Approved Projects</h2>
            <p>Manage your approved projects and communicate with designers.</p>
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
            listContainer.innerHTML = `<div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-clipboard-check"></i></div>
                    <h3>No Approved Projects</h3>
                    <p>Your approved projects will appear here once you accept a quote.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">View My Projects</button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = approvedJobs.map(job => `
            <div class="modern-card job-card approved-job">
                <div class="job-header">
                    <div class="job-title-section">
                        <h3 class="job-title">${job.title}</h3>
                        <span class="job-status-badge assigned"><i class="fas fa-user-check"></i> Assigned</span>
                    </div>
                    <div class="budget-section"><span class="budget-label">Approved Amount</span><span class="budget-amount">$${job.approvedAmount}</span></div>
                </div>
                <div class="job-meta">
                    <div class="job-meta-item"><i class="fas fa-user-cog"></i><span>Assigned to: <strong>${job.assignedToName}</strong></span></div>
                </div>
                <div class="job-description"><p>${job.description}</p></div>
                <div class="job-actions">
                    <div class="job-actions-group">
                        <button class="btn btn-primary" onclick="openConversation('${job.id}', '${job.assignedTo}')"><i class="fas fa-comments"></i> Message Designer</button>
                        <button class="btn btn-success" onclick="markJobCompleted('${job.id}')"><i class="fas fa-check-double"></i> Mark Completed</button>
                    </div>
                </div>
            </div>`).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Approved Projects</h3><p>Please try again later.</p></div>`;
    }
}


async function markJobCompleted(jobId) {
    if (confirm('Are you sure you want to mark this job as completed?')) {
        await apiCall(`/jobs/${jobId}`, 'PUT', { status: 'completed' }, 'Project marked as completed!')
            .then(() => fetchAndRenderApprovedJobs())
            .catch(() => {});
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-file-invoice-dollar"></i> My Submitted Quotes</h2>
            <p>Track your quote submissions and manage communications.</p>
            <div style="margin-top: 16px;">
                <button class="btn btn-outline" onclick="analyzeDesignerStats()"><i class="fas fa-chart-bar"></i> View My Stats</button>
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
            listContainer.innerHTML = `<div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-invoice"></i></div>
                    <h3>No Quotes Submitted</h3>
                    <p>You haven't submitted any quotes yet. Browse available projects to get started.</p>
                    <button class="btn btn-primary" onclick="renderAppSection('jobs')">Find Projects</button>
                </div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            const canEdit = quote.status === 'submitted';
            const canDelete = quote.status === 'submitted';
            
            const actionButtons = [];
            if (quote.status === 'approved') {
                actionButtons.push(`<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')"><i class="fas fa-comments"></i> Message Client</button>`);
            }
            if (canEdit) {
                actionButtons.push(`<button class="btn btn-outline" onclick="editQuote('${quote.id}')"><i class="fas fa-edit"></i> Edit</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button class="btn btn-danger btn-sm" onclick="deleteQuote('${quote.id}')"><i class="fas fa-trash"></i> Delete</button>`);
            }

            return `
                <div class="modern-card quote-card quote-status-${quote.status}">
                    <div class="quote-header">
                        <div class="quote-title-section">
                            <h3 class="quote-title">Quote for: ${quote.jobTitle || 'Unknown'}</h3>
                            <span class="quote-status-badge ${quote.status}"><i class="fas fa-info-circle"></i> ${quote.status}</span>
                        </div>
                        <div class="quote-amount-section"><span class="amount-label">Quote</span><span class="amount-value">$${quote.quoteAmount}</span></div>
                    </div>
                    <div class="quote-meta">
                        ${quote.timeline ? `<div class="quote-meta-item"><i class="fas fa-calendar-alt"></i><span>Timeline: <strong>${quote.timeline} days</strong></span></div>` : ''}
                        <div class="quote-meta-item"><i class="fas fa-clock"></i><span>Submitted: <strong>${new Date(quote.createdAt?.toDate ? quote.createdAt.toDate() : quote.createdAt).toLocaleDateString()}</strong></span></div>
                    </div>
                    <div class="quote-description"><p>${quote.description}</p></div>
                    <div class="quote-actions"><div class="quote-actions-group">${actionButtons.join('')}</div></div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Quotes</h3><p>Please try again later.</p></div>`;
    }
}

async function editQuote(quoteId) {
    try {
        const response = await apiCall(`/quotes/${quoteId}`, 'GET');
        const quote = response.data;
        
        const content = `
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Your Quote</h3>
                <p class="modal-subtitle">Update your quote for: <strong>${quote.jobTitle}</strong></p>
            </div>
            <form id="edit-quote-form" class="modern-form">
                <input type="hidden" name="quoteId" value="${quote.id}">
                <div class="form-row">
                    <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" value="${quote.quoteAmount}" required></div>
                    <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" value="${quote.timeline || ''}" required></div>
                </div>
                <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required>${quote.description}</textarea></div>
                <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Update Quote</button></div>
            </form>`;
        showGenericModal(content);
        document.getElementById('edit-quote-form').addEventListener('submit', handleQuoteEdit);
    } catch (error) {}
}


async function handleQuoteEdit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Updating...';
    submitBtn.disabled = true;

    const formData = new FormData();
    formData.append('quoteAmount', form['amount'].value);
    formData.append('timeline', form['timeline'].value);
    formData.append('description', form['description'].value);

    await apiCall(`/quotes/${form['quoteId'].value}`, 'PUT', formData, 'Quote updated successfully!')
        .then(() => {
            closeModal();
            fetchAndRenderMyQuotes();
        })
        .catch(() => {})
        .finally(() => {
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Quote';
            submitBtn.disabled = false;
        });
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Posting...';
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(form);
        await apiCall('/jobs', 'POST', formData, 'Project posted successfully!');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        // Error handled by apiCall
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-rocket"></i> Post Project';
        submitBtn.disabled = false;
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this project? This is irreversible.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Project deleted.')
            .then(() => fetchAndRenderJobs())
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted.')
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
        const job = appState.jobs.find(j => j.id === jobId);

        let quotesHTML = `<div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Received Quotes</h3>
            <div class="modal-actions" style="margin-top: 16px;"><button class="btn btn-primary" onclick="analyzeJobQuotes('${jobId}')"><i class="fas fa-chart-bar"></i> Analyze All Quotes</button></div></div>`;
            
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state" style="padding: 40px 20px;"><div class="empty-icon" style="font-size: 2rem;"><i class="fas fa-file-invoice"></i></div><h3>No Quotes Received Yet</h3></div>`;
        } else {
            quotesHTML += `<div class="quotes-list" style="padding: 24px;">` + quotes.map(quote => {
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let actionButtons = `<button class="btn btn-outline btn-sm" onclick="openConversation('${quote.jobId}', '${quote.designerId}')"><i class="fas fa-comments"></i> Message</button>`;
                
                if(canApprove) {
                    actionButtons += `<button class="btn btn-success btn-sm" onclick="approveQuote('${quote.id}', '${jobId}')"><i class="fas fa-check"></i> Approve</button>`;
                } else if (quote.status === 'approved') {
                    actionButtons += `<span class="quote-status-badge approved" style="margin-left: 10px;"><i class="fas fa-check-circle"></i> Approved</span>`;
                }

                return `
                    <div class="modern-card quote-item quote-status-${quote.status}" style="padding: 16px; margin-bottom: 16px;">
                        <div class="quote-item-header" style="display: flex; justify-content: space-between; align-items: center;">
                            <h4>${quote.designerName}</h4>
                            <div class="quote-amount-section"><span class="amount-value">$${quote.quoteAmount}</span></div>
                        </div>
                        <p>${quote.description}</p>
                        <div class="quote-actions" style="margin-top: 10px; border-top: none; padding-top: 0;"><div class="quote-actions-group">${actionButtons}</div></div>
                    </div>`;
            }).join('') + `</div>`;
        }
        
        showGenericModal(quotesHTML, 'max-width: 800px;');
    } catch (error) {
        showGenericModal(`<div class="modal-header"><h3>Error</h3></div><p style="padding: 24px;">Could not load quotes.</p>`);
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote?')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved!')
            .then(() => {
                closeModal();
                fetchAndRenderJobs();
                showNotification('Project assigned! You can now message the designer.', 'success');
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <div class="modal-header"><h3><i class="fas fa-file-invoice-dollar"></i> Submit Your Quote</h3><p class="modal-subtitle">Provide your proposal for this project.</p></div>
        <form id="quote-form" class="modern-form">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-row">
                <div class="form-group"><label class="form-label"><i class="fas fa-dollar-sign"></i> Quote Amount ($)</label><input type="number" class="form-input" name="amount" required placeholder="e.g., 5000"></div>
                <div class="form-group"><label class="form-label"><i class="fas fa-calendar-alt"></i> Timeline (days)</label><input type="number" class="form-input" name="timeline" required placeholder="e.g., 14"></div>
            </div>
            <div class="form-group"><label class="form-label"><i class="fas fa-file-alt"></i> Proposal Description</label><textarea class="form-textarea" name="description" required placeholder="Describe your approach..."></textarea></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-paperclip"></i> Attachments (Optional)</label><input type="file" class="form-input" name="attachments" multiple></div>
            <div class="form-actions"><button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button><button type="submit" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Submit</button></div>
        </form>`;
    showGenericModal(content, 'max-width: 650px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Submitting...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        await apiCall('/quotes', 'POST', formData, 'Quote submitted successfully!');
        appState.userSubmittedQuotes.add(form['jobId'].value);
        closeModal();
        fetchAndRenderJobs();
        showNotification('Your quote has been submitted!', 'success');
    } catch (error) {
        console.error("Quote submission failed:", error);
    } finally {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
        submitBtn.disabled = false;
    }
}

// --- ENHANCED MESSAGING SYSTEM ---
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
    container.innerHTML = `<div class="section-header"><h2><i class="fas fa-comments"></i> Messages</h2><p>Communicate with clients and designers.</p></div><div id="conversations-list" class="conversations-container"></div>`;
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;

    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-comments"></i></div><h3>No Conversations Yet</h3></div>`;
            return;
        }
        listContainer.innerHTML = appState.conversations.map(convo => {
            const other = convo.participants.find(p => p.id !== appState.currentUser.id);
            return `
                <div class="conversation-card modern-card ${convo.lastMessageBy && convo.lastMessageBy !== appState.currentUser.name ? 'unread' : ''}" onclick="renderConversationView('${convo.id}')" style="padding: 1rem;">
                    <div class="convo-avatar" style="background-color: ${getAvatarColor(other.name)}">${other.name.charAt(0)}</div>
                    <div class="convo-details">
                        <div class="convo-header"><h4>${other.name}</h4><span class="convo-time">${getTimeAgo(convo.updatedAt)}</span></div>
                        <p class="convo-project"><strong>Project:</strong> ${convo.jobTitle}</p>
                        <p class="convo-preview">${convo.lastMessage || 'No messages yet.'}</p>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        listContainer.innerHTML = `<div class="error-state"><h3>Error Loading Conversations</h3></div>`;
    }
}

function getTimeAgo(timestamp) {
    const diff = new Date() - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function getAvatarColor(name) {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[name.charCodeAt(0) % colors.length];
}

async function renderConversationView(conversationOrId) {
    let convo = typeof conversationOrId === 'string' ? appState.conversations.find(c => c.id === conversationOrId) : conversationOrId;
    if (!convo || !convo.participants) {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        convo = appState.conversations.find(c => c.id === (convo.id || conversationOrId));
        if(!convo) { showNotification('Conversation not found.', 'error'); return; }
    }

    const other = convo.participants.find(p => p.id !== appState.currentUser.id);
    document.getElementById('app-container').innerHTML = `
        <div class="modern-chat">
            <div class="chat-header"><button onclick="renderAppSection('messages')" class="back-btn"><i class="fas fa-arrow-left"></i></button><div class="chat-avatar" style="background-color: ${getAvatarColor(other.name)}">${other.name.charAt(0)}</div><div class="chat-details"><h3>${other.name}</h3><p class="chat-project">${convo.jobTitle}</p></div></div>
            <div class="chat-messages" id="chat-messages-container"><div class="loading-spinner"><div class="spinner"></div></div></div>
            <div class="chat-input-area"><form id="send-message-form" class="message-form"><input type="text" id="message-text-input" placeholder="Type a message..." required autocomplete="off"><button type="submit" class="send-button"><i class="fas fa-paper-plane"></i></button></form></div>
        </div>`;

    document.getElementById('send-message-form').addEventListener('submit', e => { e.preventDefault(); handleSendMessage(convo.id); });

    const messagesContainer = document.getElementById('chat-messages-container');
    try {
        const response = await apiCall(`/messages/${convo.id}/messages`, 'GET');
        const messages = response.data || [];
        messagesContainer.innerHTML = messages.length ? messages.map(msg => {
            const isMine = msg.senderId === appState.currentUser.id;
            return `<div class="message-wrapper ${isMine ? 'me' : 'them'}"><div class="message-content"><div class="message-bubble ${isMine ? 'me' : 'them'}">${msg.text}</div><div class="message-meta">${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div></div></div>`;
        }).join('') : `<div class="empty-state" style="padding: 40px;"><div class="empty-icon"><i class="fas fa-comment-dots"></i></div><h4>Start the conversation.</h4></div>`;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `<div class="error-state"><h4>Error loading messages.</h4></div>`;
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const text = input.value.trim();
    if (!text) return;

    input.disabled = true;
    const sendBtn = document.querySelector('.send-button');
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<div class="btn-spinner"></div>`;

    try {
        await apiCall(`/messages/${conversationId}/messages`, 'POST', { text });
        input.value = '';
        renderConversationView(conversationId); // Re-render to show new message
    } catch(error) {
        // Error is handled
    } finally {
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerHTML = `<i class="fas fa-paper-plane"></i>`;
        input.focus();
    }
}

// --- UI & MODAL FUNCTIONS ---
function showAuthModal(view) {
    const content = `
        <div class="modal-content">
            <button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>
            <div id="modal-form-container"></div>
        </div>`;
    showGenericModal(content, '', false); // Use a wrapper to avoid double content class
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

function showGenericModal(innerHTML, style = '', wrapInContent = true) {
    const modalContainer = document.getElementById('modal-container');
    const content = wrapInContent ? `<div class="modal-content" style="${style}"><button class="modal-close-button" onclick="closeModal()"><i class="fas fa-times"></i></button>${innerHTML}</div>` : innerHTML;
    modalContainer.innerHTML = `<div class="modal-overlay" onclick="closeModal()"><div onclick="event.stopPropagation()">${content}</div></div>`;
}

function closeModal() {
    const modalContainer = document.getElementById('modal-container');
    if (modalContainer) modalContainer.innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'block'; // Or flex
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
    
    if (user.type === 'designer') {
        loadUserQuotes();
    }
}

function showLandingPageView() {
    // For this upgraded version, we keep the user in the app shell
    // but could show a welcome/landing component inside the content-area.
    // To preserve original functionality, we'll hide the app view.
    document.getElementById('landing-page-content').style.display = 'block'; // Or whatever was original
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('auth-buttons-container').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i><span>Find Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i><span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i><span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i><span>Approved</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i><span>Post Project</span></a>`;
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i><span>Messages</span></a>`;

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
    document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`.sidebar-nav-link[data-section="${sectionId}"]`)?.classList.add('active');
    
    const userRole = appState.currentUser.type;
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        container.innerHTML = `<div class="section-header"><h2><i class="fas ${userRole === 'designer' ? 'fa-search' : 'fa-tasks'}"></i> ${title}</h2></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container" style="text-align: center; margin-top: 2rem;"></div>`;
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

// --- NOTIFICATION SYSTEM ---
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-triangle', info: 'fa-info-circle' };
    
    notif.innerHTML = `
        <div class="notification-content"><i class="fas ${icons[type]}"></i><span>${message}</span></div>
        <button class="notification-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>`;
    
    container.appendChild(notif);
    setTimeout(() => notif.remove(), duration);
}

// --- TEMPLATE GETTERS ---
function getLoginTemplate() {
    return `<div class="modal-header"><h3><i class="fas fa-sign-in-alt"></i> Welcome Back</h3><p class="modal-subtitle">Sign in to your SteelConnect account</p></div>
        <form id="login-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="loginEmail" required placeholder="your.email@example.com"></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="loginPassword" required></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button>
        </form><div class="auth-switch">Don't have an account? <a onclick="renderAuthForm('register')" class="auth-link">Create One</a></div>`;
}

function getRegisterTemplate() {
    return `<div class="modal-header"><h3><i class="fas fa-user-plus"></i> Join SteelConnect</h3><p class="modal-subtitle">Create your professional account</p></div>
        <form id="register-form" class="modern-form">
            <div class="form-group"><label class="form-label"><i class="fas fa-user"></i> Full Name</label><input type="text" class="form-input" name="regName" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-envelope"></i> Email</label><input type="email" class="form-input" name="regEmail" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-lock"></i> Password</label><input type="password" class="form-input" name="regPassword" required></div>
            <div class="form-group"><label class="form-label"><i class="fas fa-user-tag"></i> I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
        </form><div class="auth-switch">Already have an account? <a onclick="renderAuthForm('login')" class="auth-link">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `<div class="section-header"><h2><i class="fas fa-plus-circle"></i> Post a New Project</h2><p>Detail your project to attract the best talent.</p></div>
        <form id="post-job-form" class="modern-form">
            <div class="form-section"><h3><i class="fas fa-info-circle"></i> Basic Details</h3>
                <div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="title" required></div>
                <div class="form-row">
                    <div class="form-group"><label class="form-label">Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="$5,000 - $10,000"></div>
                    <div class="form-group"><label class="form-label">Project Deadline</label><input type="date" class="form-input" name="deadline" required></div>
                </div>
                <div class="form-group"><label class="form-label">Required Skills</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit"><small class="form-help">Comma-separated</small></div>
            </div>
            <div class="form-section"><h3><i class="fas fa-file-alt"></i> Description & Files</h3>
                <div class="form-group"><label class="form-label">Detailed Description</label><textarea class="form-textarea" name="description" required></textarea></div>
                <div class="form-group"><label class="form-label">Project Attachment</label><input type="file" class="form-input" name="attachment"></div>
            </div>
            <div class="form-actions"><button type="submit" class="btn btn-primary"><i class="fas fa-rocket"></i> Post Project</button></div>
        </form>`;
}

// --- ANALYSIS FUNCTIONS ---
async function analyzeJobQuotes(jobId) {
    try {
        const response = await apiCall(`/analysis/job/${jobId}`, 'GET');
        const analysis = response.data;
        const analysisHtml = `
            <div class="modal-header"><h3><i class="fas fa-chart-bar"></i> Quote Analysis</h3><p class="modal-subtitle">${analysis.jobTitle}</p></div>
            <div class="analysis-results">
                <div class="analysis-stat"><span>Total Quotes</span><strong>${analysis.totalQuotes}</strong></div><hr>
                <h4>Amount Analysis</h4>
                <div class="analysis-stat"><span>Average Quote</span><strong>$${analysis.averageAmount}</strong></div>
                <div class="analysis-stat"><span>Lowest Quote</span><strong style="color: var(--success-600);">$${analysis.lowestAmount}</strong></div>
                <div class="analysis-stat"><span>Highest Quote</span><strong style="color: var(--error-600);">$${analysis.highestAmount}</strong></div><hr>
                <h4>Timeline Analysis</h4>
                <div class="analysis-stat"><span>Average Time</span><strong>${analysis.averageDeliveryTime} days</strong></div>
            </div>`;
        showGenericModal(analysisHtml, 'max-width: 500px;');
    } catch (error) {}
}

async function analyzeDesignerStats() {
    try {
        const response = await apiCall('/analysis/designer/stats', 'GET');
        const stats = response.data;
        const statsHtml = `
            <div class="modal-header"><h3><i class="fas fa-user-chart"></i> Your Designer Stats</h3></div>
            <div class="analysis-results">
                <div class="analysis-stat"><span>Total Quotes</span><strong>${stats.totalQuotes}</strong></div>
                <div class="analysis-stat"><span>Accepted Quotes</span><strong style="color: var(--success-600);">${stats.acceptedQuotes}</strong></div>
                <div class="analysis-stat"><span>Acceptance Rate</span><strong style="color: var(--primary-600);">${stats.acceptanceRate}%</strong></div><hr>
                <div class="analysis-stat"><span>Average Quote Amount</span><strong>$${stats.averageQuoteAmount}</strong></div>
            </div>`;
        showGenericModal(statsHtml, 'max-width: 500px;');
    } catch (error) {}
}