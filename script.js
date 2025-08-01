// --- LANDING PAGE SCRIPT ---
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
    conversations: [], // State for conversations
    participants: {},
    jobsPage: 1,
    hasMoreJobs: true,
};

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            showAlert('You have been logged out due to inactivity.', 'info');
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

    // FIX: Safely attach event listeners to prevent script errors
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
             if (successMessage) showAlert(successMessage, 'success');
             return { success: true };
        }

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.message || responseData.error || `Request failed with status ${response.status}`);
        }

        if (successMessage) {
            showAlert(successMessage, 'success');
        }
        
        return responseData;

    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showAlert(error.message, 'error');
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
        showAlert('Login successful!', 'success');
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
    } catch(error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    clearTimeout(inactivityTimer);
    showLandingPageView();
}

async function fetchAndRenderJobs(loadMore = false) {
    const jobsListContainer = document.getElementById('jobs-list');
    const loadMoreContainer = document.getElementById('load-more-container');

    if (!loadMore) {
        appState.jobs = [];
        appState.jobsPage = 1;
        appState.hasMoreJobs = true;
        if (jobsListContainer) jobsListContainer.innerHTML = '<p>Loading projects...</p>';
    }

    if (!jobsListContainer || !appState.hasMoreJobs) {
        if(loadMoreContainer) loadMoreContainer.innerHTML = '';
        return;
    }

    const user = appState.currentUser;
    const endpoint = user.type === 'designer' 
        ? `/jobs?page=${appState.jobsPage}&limit=6` 
        : `/jobs/user/${user.id}`;
    
    if(loadMoreContainer) loadMoreContainer.innerHTML = `<button class="btn" disabled>Loading...</button>`;

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
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back later for new opportunities.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects yet.</h3><p>Click 'Post a Job' to get started.</p></div>`;
            if (loadMoreContainer) loadMoreContainer.innerHTML = '';
            return;
        }

        const jobsHTML = appState.jobs.map(job => {
            const actions = user.type === 'designer'
                ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`
                : `<button class="btn btn-outline" onclick="viewQuotes('${job.id}')">View Quotes (${job.quotesCount || 0})</button>
                   <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete Job</button>`;
            
            const attachmentLink = job.attachment ? `<p style="margin-top: 12px;"><strong>Attachment:</strong> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View File</a></p>` : '';
            
            return `
                <div class="job-card">
                    <div class="job-header">
                        <div><h3>${job.title}</h3><p class="text-gray" style="font-size: 14px;">Posted by: ${job.posterName || 'N/A'}</p></div>
                        <div class="job-budget">${job.budget}</div>
                    </div>
                    <p>${job.description}</p>
                    ${job.skills?.length > 0 ? `<p style="margin-top: 12px;"><strong>Skills:</strong> ${job.skills.join(', ')}</p>` : ''}
                    ${job.link ? `<p style="margin-top: 12px;"><strong>Link:</strong> <a href="${job.link}" target="_blank" rel="noopener noreferrer">${job.link}</a></p>` : ''}
                    ${attachmentLink}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');

        jobsListContainer.innerHTML = jobsHTML;

        if (loadMoreContainer) {
            if (user.type === 'designer' && appState.hasMoreJobs) {
                loadMoreContainer.innerHTML = `<button class="btn btn-primary" id="load-more-btn">Load More</button>`;
                document.getElementById('load-more-btn').addEventListener('click', () => fetchAndRenderJobs(true));
            } else {
                loadMoreContainer.innerHTML = '';
            }
        }

    } catch(error) {
        jobsListContainer.innerHTML = '<p>Error loading jobs. Please try again later.</p>';
    }
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="section-header"><h2>My Submitted Quotes</h2></div><div id="my-quotes-list" class="jobs-grid"></div>`;
    const listContainer = document.getElementById('my-quotes-list');
    listContainer.innerHTML = '<p>Loading your quotes...</p>';
    
    try {
        const response = await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET');
        const quotes = response.data || [];
        appState.myQuotes = quotes;
        
        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>You have not submitted any quotes.</p></div>`;
            return;
        }
        
        listContainer.innerHTML = quotes.map(quote => {
            const attachments = quote.attachments || [];
            let attachmentLink = attachments.length > 0
                ? `<p><strong>Attachment:</strong> <a href="${attachments[0]}" target="_blank">View File</a></p>`
                : '';

            const canDelete = quote.status === 'submitted';
            const messageButton = quote.status === 'approved' ? `<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${quote.contractorId}')">Message Client</button>` : '';
            const deleteButton = canDelete ? `<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">Delete Quote</button>` : '';
            
            return `
                <div class="job-card quote-status-${quote.status}">
                    <div class="job-header">
                        <div>
                            <h3>Quote for: ${quote.jobTitle || 'Unknown Job'}</h3>
                            <p class="text-gray" style="font-size: 14px;">Amount: $${quote.quoteAmount}</p>
                        </div>
                        <div class="job-budget">Status: ${quote.status}</div>
                    </div>
                    <p>${quote.description}</p>
                    ${attachmentLink}
                    <div class="job-actions">${messageButton} ${deleteButton}</div>
                </div>`;
        }).join('');
    } catch(error) {
        listContainer.innerHTML = '<p>Error loading your quotes. Please try again later.</p>';
    }
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData();
    ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => {
        if (form[field]) formData.append(field, form[field].value);
    });
    if (form.attachment.files.length > 0) {
        formData.append('attachment', form.attachment.files[0]);
    }
    
    try {
        await apiCall('/jobs', 'POST', formData, 'Job posted successfully!');
        form.reset();
        renderAppSection('jobs');
    } catch(error) {
        // Error handled by apiCall
    }
}

async function deleteJob(jobId) {
    if (confirm('Are you sure you want to delete this job? This will also delete all associated quotes and cannot be undone.')) {
        await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted successfully.')
            .then(() => fetchAndRenderJobs())
            .catch(() => {});
    }
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure you want to delete this quote?')) {
        await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted successfully.')
            .then(() => fetchAndRenderMyQuotes())
            .catch(() => {});
    }
}

async function viewQuotes(jobId) {
    try {
        const response = await apiCall(`/quotes/job/${jobId}`, 'GET');
        const quotes = response.data || [];
        
        let quotesHTML = `<h3>Received Quotes</h3>`;
        if (quotes.length === 0) {
            quotesHTML += `<div class="empty-state"><p>No quotes received for this project yet.</p></div>`;
        } else {
            const job = appState.jobs.find(j => j.id === jobId);
            quotesHTML += quotes.map(quote => {
                const attachments = quote.attachments || [];
                let attachmentLink = attachments.length > 0 ? `<p><strong>Attachment:</strong> <a href="${attachments[0]}" target="_blank">View File</a></p>`: '';
                
                const canApprove = job && job.status === 'open' && quote.status === 'submitted';
                let approveButton = '';
                if(canApprove) {
                    approveButton = `<button class="btn btn-primary" onclick="approveQuote('${quote.id}', '${jobId}')">Approve</button>`;
                } else if (quote.status === 'approved') {
                    approveButton = `<span class="status-approved">Approved</span>`;
                }

                const messageButton = `<button class="btn btn-outline" onclick="openConversation('${quote.jobId}', '${quote.designerId}')">Message Designer</button>`;
                
                return `
                    <div class="quote-card quote-status-${quote.status}">
                        <p><strong>From:</strong> ${quote.designerName} | <strong>Amount:</strong> $${quote.quoteAmount}</p>
                        <p>${quote.description}</p>
                        ${attachmentLink}
                        <p><strong>Status:</strong> ${quote.status}</p>
                        <div class="quote-actions">${approveButton} ${messageButton}</div>
                    </div>`;
            }).join('');
        }
        showGenericModal(quotesHTML, 'max-width: 650px;');
    } catch (error) {
        showGenericModal('<h3>Error</h3><p>Could not load quotes for this project.</p>');
    }
}

async function approveQuote(quoteId, jobId) {
    if (confirm('Are you sure you want to approve this quote? This will assign the job to the designer and reject other quotes.')) {
        await apiCall(`/quotes/${quoteId}/approve`, 'PUT', { jobId }, 'Quote approved successfully!')
            .then(() => {
                closeModal();
                fetchAndRenderJobs();
            })
            .catch(() => {});
    }
}

function showQuoteModal(jobId) {
    const content = `
        <h3>Submit Your Quote</h3>
        <form id="quote-form" class="form-grid">
            <input type="hidden" name="jobId" value="${jobId}">
            <div class="form-group"><label class="form-label">Amount ($)</label><input type="number" class="form-input" name="amount" required></div>
            <div class="form-group"><label class="form-label">Timeline (in days)</label><input type="number" class="form-input" name="timeline" required></div>
            <div class="form-group"><label class="form-label">Proposal / Description</label><textarea class="form-textarea" name="description" required></textarea></div>
            <div class="form-group"><label class="form-label">Attachments (Optional, max 5)</label><input type="file" class="form-input" name="attachments" multiple></div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Quote</button>
        </form>`;
    showGenericModal(content, 'max-width: 500px;');
    document.getElementById('quote-form').addEventListener('submit', handleQuoteSubmit);
}

async function handleQuoteSubmit(event) {
    event.preventDefault();
    try {
        const form = event.target;
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
        
        closeModal();

    } catch (error) {
        console.error("Quote submission failed:", error);
    }
}


// --- MESSAGING ---

async function openConversation(jobId, recipientId) {
    try {
        showAlert('Opening conversation...', 'info');
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
    container.innerHTML = `<div class="section-header"><h2>Messages</h2></div><div id="conversations-list"></div>`;
    const listContainer = document.getElementById('conversations-list');
    listContainer.innerHTML = `<p>Loading conversations...</p>`;

    try {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];

        if (appState.conversations.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>You have no active conversations.</p></div>`;
            return;
        }

        const conversationsHTML = appState.conversations.map(convo => {
            const otherParticipant = convo.participants.find(p => p.id !== appState.currentUser.id);
            const otherParticipantName = otherParticipant ? otherParticipant.name : 'Unknown User';
            const lastMessage = convo.lastMessage ? convo.lastMessage.substring(0, 50) + '...' : 'No messages yet.';

            return `
                <div class="conversation-card" onclick="renderConversationView('${convo.id}')">
                    <div class="convo-avatar">${otherParticipantName.charAt(0).toUpperCase()}</div>
                    <div class="convo-details">
                        <h4>${otherParticipantName}</h4>
                        <p><strong>Project:</strong> ${convo.jobTitle}</p>
                        <p class="text-gray">${lastMessage}</p>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = conversationsHTML;
    } catch (error) {
        listContainer.innerHTML = `<p>Error loading conversations.</p>`;
    }
}

async function renderConversationView(conversationOrId) {
    let conversation;
    if (typeof conversationOrId === 'string') {
        conversation = appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId };
    } else {
        conversation = conversationOrId;
    }
    
    if (!conversation.participants) {
        const response = await apiCall('/messages', 'GET');
        appState.conversations = response.data || [];
        conversation = appState.conversations.find(c => c.id === conversation.id);
        if(!conversation) {
            showAlert('Conversation not found.', 'error');
            return;
        }
    }

    const container = document.getElementById('app-container');
    const otherParticipant = conversation.participants.find(p => p.id !== appState.currentUser.id);
    
    container.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <button onclick="renderAppSection('messages')" class="back-btn">&larr; Back to Messages</button>
                <h3>${otherParticipant ? otherParticipant.name : 'Conversation'}</h3>
                <p>${conversation.jobTitle || ''}</p>
            </div>
            <div class="chat-messages" id="chat-messages-container">
                <p>Loading messages...</p>
            </div>
            <div class="chat-input-area">
                <form id="send-message-form">
                    <input type="text" id="message-text-input" placeholder="Type a message..." required autocomplete="off">
                    <button type="submit" class="btn btn-primary">Send</button>
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
            messagesContainer.innerHTML = `<p class="text-center text-gray">No messages yet. Say hello!</p>`;
        } else {
            messagesContainer.innerHTML = messages.map(msg => {
                const isMine = msg.senderId === appState.currentUser.id;
                const messageClass = isMine ? 'my-message' : 'their-message';
                const time = msg.createdAt.seconds ? new Date(msg.createdAt.seconds * 1000) : new Date(msg.createdAt);
                return `
                    <div class="message-bubble ${messageClass}">
                        <div class="message-sender">${isMine ? 'You' : msg.senderName}</div>
                        <div class="message-text">${msg.text}</div>
                        <div class="message-time">${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `<p>Error loading messages.</p>`;
    }
}

async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await apiCall(`/messages/${conversationId}/messages`, 'POST', { text });
        input.value = '';
        
        const messagesContainer = document.getElementById('chat-messages-container');
        const newMessage = response.data;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble my-message';
        const time = newMessage.createdAt.seconds ? new Date(newMessage.createdAt.seconds * 1000) : new Date(newMessage.createdAt);
        messageBubble.innerHTML = `
            <div class="message-sender">You</div>
            <div class="message-text">${newMessage.text}</div>
            <div class="message-time">${time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        if(messagesContainer.querySelector('p')) {
            messagesContainer.innerHTML = '';
        }
        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch(error) {
        // Error handled by apiCall
    }
}


// --- UI & MODAL FUNCTIONS ---

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">&times;</button><div id="modal-form-container"></div></div></div>`;
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
    modalContainer.innerHTML = `<div class="modal-overlay"><div class="modal-content" style="${style}" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">✕</button>${innerHTML}</div></div>`;
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
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase fa-fw"></i> <span>Find Jobs</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post a Job</span></a>`;
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;

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
        container.innerHTML = `<div class="section-header"><h2>${title}</h2></div><div id="jobs-list" class="jobs-grid"></div><div id="load-more-container" style="text-align: center; margin-top: 20px;"></div>`;
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    } else if (sectionId === 'messages') {
        fetchAndRenderConversations();
    }
}


function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 4000);
}

// --- TEMPLATE GETTERS ---

function getLoginTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Sign In</h2><form id="login-form" class="form-grid"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary" style="width: 100%;">Sign In</button></form><div class="modal-switch">Don't have an account? <a onclick="renderAuthForm('register')">Sign Up</a></div>`;
}

function getRegisterTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Create an Account</h2><form id="register-form" class="form-grid"><div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label">I am a...</label><select class="form-select" name="regRole" required><option value="" disabled selected>Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button></form><div class="modal-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `<div class="section-header"><h2>Post a New Project</h2></div><form id="post-job-form" class="form-grid" style="max-width: 800px;"><div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="title" required placeholder="e.g., Structural Steel Design for Warehouse"></div><div class="form-group"><label class="form-label">Budget Range</label><input type="text" class="form-input" name="budget" required placeholder="e.g., $5,000 - $10,000"></div><div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" name="deadline" required></div><div class="form-group"><label class="form-label">Required Skills (comma-separated)</label><input type="text" class="form-input" name="skills" placeholder="e.g., AutoCAD, Revit, Structural Analysis"></div><div class="form-group"><label class="form-label">Relevant Link (Optional)</label><input type="url" class="form-input" name="link" placeholder="https://example.com/project-details"></div><div class="form-group"><label class="form-label">Attachment (PDF, DWG, etc.)</label><input type="file" class="form-input" name="attachment"></div><div class="form-group"><label class="form-label">Project Description</label><textarea class="form-input" style="min-height: 120px;" name="description" required placeholder="Provide a detailed description of the project requirements..."></textarea></div><button type="submit" class="btn btn-primary" style="justify-self: start;">Post Project</button></form>`;
}