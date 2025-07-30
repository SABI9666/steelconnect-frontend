document.addEventListener('DOMContentLoaded', initializeApp);

// --- CONSTANTS & STATE ---
const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const appState = {
    currentUser: null,
    jwtToken: null,
    jobs: [],
    myQuotes: [],
    // Keep track of participants to show names in chat
    participants: {} 
};

function initializeApp() {
    console.log("SteelConnect App Initializing...");
    document.getElementById('signin-btn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn').addEventListener('click', () => showAuthModal('register'));
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) renderAppSection('jobs');
        else {
            showLandingPageView();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    document.getElementById('logout-button').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    const token = localStorage.getItem('jwtToken');
    const user = localStorage.getItem('currentUser');
    if (token && user) {
        try {
            appState.jwtToken = token;
            appState.currentUser = JSON.parse(user);
            showAppView();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
}

async function apiCall(endpoint, method, body = null, successMessage = null, callback = null) {
    try {
        const options = { method, headers: {} };
        if (appState.jwtToken) options.headers['Authorization'] = `Bearer ${appState.jwtToken}`;
        if (body) {
            if (body instanceof FormData) options.body = body;
            else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }
        }
        const response = await fetch(BACKEND_URL + endpoint, options);
        const contentType = response.headers.get("content-type");
        if (!response.ok) {
             const errorData = contentType?.includes("application/json") ? await response.json() : await response.text();
             throw new Error(errorData.message || errorData.error || `Request failed with status ${response.status}`);
        }
        const data = contentType?.includes("application/json") ? await response.json() : await response.text();
        if (successMessage) showAlert(successMessage, 'success');
        if (callback) callback(data);
    } catch (error) {
        console.error(`API call to ${endpoint} failed:`, error);
        showAlert(error.message, 'error');
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
    await apiCall('/auth/register', 'POST', userData, 'Registration successful! Please sign in.', () => renderAuthForm('login'));
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    await apiCall('/auth/login', 'POST', authData, 'Login successful!', (data) => {
        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);
        closeModal();
        showAppView();
    });
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    localStorage.clear();
    showLandingPageView();
    showAlert('You have been logged out.', 'info');
}

async function fetchAndRenderJobs() {
    const jobsListContainer = document.getElementById('jobs-list');
    if (!jobsListContainer) return;
    jobsListContainer.innerHTML = '<p>Loading projects...</p>';
    const user = appState.currentUser;
    const endpoint = user.type === 'designer' ? '/jobs' : `/jobs/user/${user.id}`;
    await apiCall(endpoint, 'GET', null, null, (response) => {
        const jobs = response.data || [];
        appState.jobs = jobs;
        if (jobs.length === 0) {
            jobsListContainer.innerHTML = user.type === 'designer'
                ? `<div class="empty-state"><h3>No Projects Available</h3><p>Check back later.</p></div>`
                : `<div class="empty-state"><h3>You haven't posted any projects.</h3><p>Click 'Post a Job'.</p></div>`;
            return;
        }
        jobsListContainer.innerHTML = jobs.map(job => {
            const actions = user.type === 'designer'
                ? `<button class="btn btn-primary" onclick="showQuoteModal('${job.id}')">Submit Quote</button>`
                : `<button class="btn btn-outline" onclick="viewQuotes('${job.id}')">View Quotes (${job.quotesCount || 0})</button>
                   <button class="btn btn-danger" onclick="deleteJob('${job.id}')">Delete Job</button>`;
            return `
                <div class="job-card">
                    <div class="job-header">
                        <div><h3>${job.title}</h3><p class="text-gray text-sm">Posted by: ${job.posterName || 'N/A'}</p></div>
                        <div class="job-budget">${job.budget}</div>
                    </div>
                    <p>${job.description}</p>
                    ${job.skills?.length > 0 ? `<p style="margin-top: 12px;"><strong>Skills:</strong> ${job.skills.join(', ')}</p>` : ''}
                    ${job.link ? `<p style="margin-top: 12px;"><strong>Link:</strong> <a href="${job.link}" target="_blank" rel="noopener noreferrer">${job.link}</a></p>` : ''}
                    ${job.attachment ? `<p style="margin-top: 12px;"><strong>Attachment:</strong> <a href="${job.attachment}" target="_blank" rel="noopener noreferrer">View File</a></p>` : ''}
                    <div class="job-actions">${actions}</div>
                </div>`;
        }).join('');
    });
}

async function fetchAndRenderMyQuotes() {
    const container = document.getElementById('app-container');
    container.innerHTML = `<div class="section-header"><h2>My Submitted Quotes</h2></div><div id="my-quotes-list">Loading...</div>`;
    const listContainer = document.getElementById('my-quotes-list');
    await apiCall(`/quotes/user/${appState.currentUser.id}`, 'GET', null, null, (response) => {
        const quotes = response || [];
        if (quotes.length === 0) {
            listContainer.innerHTML = `<div class="empty-state"><p>You have not submitted any quotes.</p></div>`;
            return;
        }
        listContainer.innerHTML = quotes.map(quote => {
            const job = appState.jobs.find(j => j.id === quote.jobId) || { posterId: null };
            const attachmentLink = quote.attachment ? `<p><strong>Attachment:</strong> <a href="${quote.attachment}" target="_blank">View File</a></p>` : '';
            const messageButton = quote.status === 'approved' ? `<button class="btn btn-primary" onclick="openConversation('${quote.jobId}', '${job.posterId}', '${job.posterName}')">Message Contractor</button>` : '';
            const deleteButton = quote.status === 'pending' ? `<button class="btn btn-danger" onclick="deleteQuote('${quote.id}')">Delete Quote</button>` : '';
            return `
                <div class="quote-card quote-status-${quote.status}">
                    <p><strong>Quote for:</strong> ${job.title || 'Unknown Job'}</p>
                    <p><strong>Amount:</strong> $${quote.amount} | <strong>Status:</strong> ${quote.status}</p>
                    <p>${quote.description}</p>
                    ${attachmentLink}
                    <div class="quote-actions">${messageButton} ${deleteButton}</div>
                </div>`;
        }).join('');
    });
}

async function handlePostJob(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData();
    ['title', 'description', 'budget', 'deadline', 'skills', 'link'].forEach(field => formData.append(field, form[field]?.value));
    if (form.attachment.files.length > 0) formData.append('attachment', form.attachment.files[0]);
    await apiCall('/jobs', 'POST', formData, 'Job posted successfully!', () => {
        form.reset();
        renderAppSection('jobs');
    });
}

async function deleteJob(jobId) {
    if (confirm('Are you sure?')) await apiCall(`/jobs/${jobId}`, 'DELETE', null, 'Job deleted.', () => renderAppSection('jobs'));
}

async function deleteQuote(quoteId) {
    if (confirm('Are you sure?')) await apiCall(`/quotes/${quoteId}`, 'DELETE', null, 'Quote deleted.', () => fetchAndRenderMyQuotes());
}

async function viewQuotes(jobId) {
    await apiCall(`/quotes/job/${jobId}`, 'GET', null, null, (quotes) => {
        let quotesHTML = '<h3>Received Quotes</h3>';
        if (quotes.length === 0) quotesHTML += `<div class="empty-state"><p>No quotes yet.</p></div>`;
        else {
            quotesHTML += quotes.map(quote => {
                const attachmentLink = quote.attachment ? `<p><strong>Attachment:</strong> <a href="${quote.attachment}" target="_blank">View File</a></p>` : '';
                const approveButton = appState.currentUser.type === 'contractor' && quote.status === 'pending' ? `<button class="btn btn-primary" onclick="approveQuote('${quote.id}')">Approve</button>` : '';
                const messageButton = appState.currentUser.type === 'contractor' ? `<button class="btn btn-outline" onclick="openConversation('${quote.jobId}', '${quote.quoterId}', '${quote.quoterName}')">Message Designer</button>` : '';
                return `
                    <div class="quote-card quote-status-${quote.status}">
                        <p><strong>From:</strong> ${quote.quoterName} | <strong>Amount:</strong> $${quote.amount}</p>
                        <p>${quote.description}</p>
                        ${attachmentLink}
                        <p><strong>Status:</strong> ${quote.status}</p>
                        <div class="quote-actions">${approveButton} ${messageButton}</div>
                    </div>`;
            }).join('');
        }
        showGenericModal(quotesHTML);
    });
}

async function approveQuote(quoteId) {
    if (confirm('Approve this quote?')) await apiCall(`/quotes/${quoteId}/approve`, 'PUT', null, 'Quote approved!', () => {
        closeModal();
        renderAppSection('jobs');
    });
}

function showQuoteModal(jobId) {
    const content = `
        <h3>Submit Your Quote</h3>
        <form id="quote-form" class="form-grid">
            <div class="form-group"><label class="form-label">Amount ($)</label><input type="number" class="form-input" name="amount" required></div>
            <div class="form-group"><label class="form-label">Timeline (days)</label><input type="number" class="form-input" name="timeline" required></div>
            <div class="form-group"><label class="form-label">Attachment</label><input type="file" class="form-input" name="attachment"></div>
            <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description" required></textarea></div>
            <button type="submit" class="btn btn-primary">Submit Quote</button>
        </form>`;
    showGenericModal(content, 'max-width: 500px;');
    document.getElementById('quote-form').addEventListener('submit', (e) => handleQuoteSubmit(e, jobId));
}

async function handleQuoteSubmit(event, jobId) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('amount', form.amount.value);
    formData.append('timeline', form.timeline.value);
    formData.append('description', form.description.value);
    formData.append('quoterId', appState.currentUser.id);
    formData.append('quoterName', appState.currentUser.name);
    if (form.attachment.files.length > 0) formData.append('attachment', form.attachment.files[0]);
    await apiCall('/quotes', 'POST', formData, 'Quote submitted!', closeModal);
}

function showAuthModal(view) {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">&times;</button><div id="modal-form-container"></div></div></div>`;
    renderAuthForm(view);
}

function renderAuthForm(view) {
    const container = document.getElementById('modal-form-container');
    container.innerHTML = view === 'login' ? getLoginTemplate() : getRegisterTemplate();
    const formId = view === 'login' ? 'login-form' : 'register-form';
    const handler = view === 'login' ? handleLogin : handleRegister;
    document.getElementById(formId).addEventListener('submit', handler);
}

function showGenericModal(innerHTML, style = '') {
    const modalContainer = document.getElementById('modal-container');
    modalContainer.innerHTML = `<div class="modal-overlay" onclick="closeModal()"><div class="modal-content" style="${style}" onclick="event.stopPropagation()"><button class="modal-close-button" onclick="closeModal()">✕</button>${innerHTML}</div></div>`;
}

function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info').style.display = 'flex';
    document.getElementById('main-nav-menu').innerHTML = '';
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
    document.getElementById('main-nav-menu').innerHTML = `<a href="#features" class="nav-link">Features</a><a href="#showcase" class="nav-link">Showcase</a>`;
}

function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase"></i> <span>Find Jobs</span></a><a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar"></i> <span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks"></i> <span>My Projects</span></a><a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle"></i> <span>Post a Job</span></a>`;
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
    document.querySelectorAll('.sidebar-nav-link').forEach(link => link.classList.toggle('active', link.dataset.section === sectionId));
    const userRole = appState.currentUser.type;
    if (sectionId === 'jobs') {
        const title = userRole === 'designer' ? 'Available Projects' : 'My Posted Projects';
        container.innerHTML = `<div class="section-header"><h2>${title}</h2></div><div id="jobs-list" class="jobs-grid"></div>`;
        fetchAndRenderJobs();
    } else if (sectionId === 'post-job') {
        container.innerHTML = getPostJobTemplate();
        document.getElementById('post-job-form').addEventListener('submit', handlePostJob);
    } else if (sectionId === 'my-quotes') {
        fetchAndRenderMyQuotes();
    }
}

function showAlert(message, type = 'info') {
    const alertsContainer = document.getElementById('alerts-container');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    alertsContainer.prepend(alertDiv);
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 500);
    }, 5000);
}

function getLoginTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Sign In</h2><form id="login-form" class="form-grid"><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="loginEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="loginPassword" required></div><button type="submit" class="btn btn-primary">Sign In</button></form><div class="modal-switch">Don't have an account? <a onclick="renderAuthForm('register')">Sign Up</a></div>`;
}

function getRegisterTemplate() {
    return `<h2 style="text-align: center; margin-bottom: 24px;">Create an Account</h2><form id="register-form" class="form-grid"><div class="form-group"><label class="form-label">Full Name</label><input type="text" class="form-input" name="regName" required></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="regEmail" required></div><div class="form-group"><label class="form-label">Password</label><input type="password" class="form-input" name="regPassword" required></div><div class="form-group"><label class="form-label">I am a...</label><select class="form-select" name="regRole" required><option value="">Select your role</option><option value="contractor">Client / Contractor</option><option value="designer">Designer / Engineer</option></select></div><button type="submit" class="btn btn-primary">Create Account</button></form><div class="modal-switch">Already have an account? <a onclick="renderAuthForm('login')">Sign In</a></div>`;
}

function getPostJobTemplate() {
    return `<div class="section-header"><h2>Post a New Project</h2></div><form id="post-job-form" class="form-grid" style="max-width: 800px;"><div class="form-group"><label class="form-label">Project Title</label><input type="text" class="form-input" name="title" required></div><div class="form-group"><label class="form-label">Budget Range</label><input type="text" class="form-input" name="budget" required></div><div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" name="deadline" required></div><div class="form-group"><label class="form-label">Skills (comma-separated)</label><input type="text" class="form-input" name="skills"></div><div class="form-group"><label class="form-label">Relevant Link (Optional)</label><input type="url" class="form-input" name="link"></div><div class="form-group"><label class="form-label">Attachment (Optional)</label><input type="file" class="form-input" name="attachment"></div><div class="form-group"><label class="form-label">Project Description</label><textarea class="form-input" style="min-height: 120px;" name="description" required></textarea></div><button type="submit" class="btn btn-primary" style="justify-self: start;">Post Project</button></form>`;
}

async function openConversation(jobId, recipientId, recipientName) {
    appState.participants = {
        [appState.currentUser.id]: appState.currentUser.name,
        [recipientId]: recipientName
    };
    await apiCall('/messages/find', 'POST', { jobId, recipientId }, null, async (conversationResponse) => {
        const conversation = conversationResponse.data;
        await apiCall(`/messages/${conversation.id}/messages`, 'GET', null, null, (messagesResponse) => {
            showConversationModal(conversation, messagesResponse.data);
        });
    });
}

function showConversationModal(conversation, messages) {
    const messagesHTML = messages.map(msg => {
        const sender = appState.participants[msg.senderId] || 'Unknown';
        const isMe = msg.senderId === appState.currentUser.id;
        const time = new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="message-wrapper ${isMe ? 'me' : 'them'}">
                <div class="message-avatar">${sender.charAt(0).toUpperCase()}</div>
                <div>
                    <div class="message-bubble ${isMe ? 'me' : 'them'}">
                        <p>${msg.text}</p>
                    </div>
                    <div class="message-meta">
                        <span>${isMe ? 'You' : sender}</span> • <span>${time}</span>
                    </div>
                </div>
            </div>`;
    }).join('');

    const modalContent = `
        <div class="chat-header"><h3>Conversation</h3></div>
        <div id="message-list" class="message-container">${messagesHTML}</div>
        <form id="message-form" class="message-form">
            <input type="text" name="messageText" class="form-input" placeholder="Type a message..." required autocomplete="off">
            <button type="submit" class="btn btn-primary">Send</button>
        </form>`;
    
    showGenericModal(modalContent, 'max-width: 600px; padding: 24px;');
    
    const messageList = document.getElementById('message-list');
    messageList.scrollTop = messageList.scrollHeight;

    document.getElementById('message-form').addEventListener('submit', (e) => handleSendMessage(e, conversation.id));
}

async function handleSendMessage(event, conversationId) {
    event.preventDefault();
    const form = event.target;
    const text = form.messageText.value.trim();
    if (!text) return;
    form.querySelector('button').disabled = true;
    await apiCall(`/messages/${conversationId}/messages`, 'POST', { text }, null, (newMessageResponse) => {
        form.reset();
        form.querySelector('button').disabled = false;
        
        const messageList = document.getElementById('message-list');
        if (messageList) {
            const sender = appState.currentUser.name;
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            messageList.innerHTML += `
                <div class="message-wrapper me">
                    <div class="message-avatar">${sender.charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="message-bubble me">
                            <p>${newMessageResponse.data.text}</p>
                        </div>
                        <div class="message-meta">
                            <span>You</span> • <span>${time}</span>
                        </div>
                    </div>
                </div>`;
            messageList.scrollTop = messageList.scrollHeight;
        }
    });
}

function toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');
    document.querySelectorAll('.feature-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
        }
    });
    card.classList.toggle('expanded');
}