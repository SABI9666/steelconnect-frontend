/ --- FULL APPLICATION SCRIPT ---
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
    }, 300000);
}

function initializeApp() {
    console.log("SteelConnect App Initializing...");
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    document.getElementById('signin-btn').addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn').addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn').addEventListener('click', () => showAuthModal('register'));
    
    document.querySelector('.logo').addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('jobs');
        } else {
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
            resetInactivityTimer();
        } catch (error) {
            console.error("Error parsing user data from localStorage:", error);
            logout();
        }
    } else {
        showLandingPageView();
    }
}

// ... (apiCall, handleRegister, handleLogin, logout, fetchAndRenderJobs, etc. remain the same as previous response) ...
// NOTE: Make sure your `apiCall` and other functions from the previous correction are here.

// NEW: Opens a conversation or navigates to an existing one.
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

// NEW: Renders the main "Messages" page with a list of conversations
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
            // Find the other participant's name
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

// NEW: Renders the detailed view for a single conversation (the chat window)
async function renderConversationView(conversationOrId) {
    let conversation;
    // Handle both object and ID being passed
    if (typeof conversationOrId === 'string') {
        conversation = appState.conversations.find(c => c.id === conversationOrId) || { id: conversationOrId };
    } else {
        conversation = conversationOrId;
    }
    
    // Fetch full conversation details if we only have the ID
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

    // Fetch and display messages
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
                return `
                    <div class="message-bubble ${messageClass}">
                        <div class="message-sender">${isMine ? 'You' : msg.senderName}</div>
                        <div class="message-text">${msg.text}</div>
                        <div class="message-time">${new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </div>
                `;
            }).join('');
        }
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
        messagesContainer.innerHTML = `<p>Error loading messages.</p>`;
    }
}

// NEW: Handles the submission of the send message form
async function handleSendMessage(conversationId) {
    const input = document.getElementById('message-text-input');
    const text = input.value.trim();
    if (!text) return;

    try {
        const response = await apiCall(`/messages/${conversationId}/messages`, 'POST', { text });
        input.value = ''; // Clear the input
        
        // Optimistically add the new message to the UI
        const messagesContainer = document.getElementById('chat-messages-container');
        const newMessage = response.data;
        const messageBubble = document.createElement('div');
        messageBubble.className = 'message-bubble my-message';
        messageBubble.innerHTML = `
            <div class="message-sender">You</div>
            <div class="message-text">${newMessage.text}</div>
            <div class="message-time">${new Date(newMessage.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        `;
        // If it was the first message, clear the placeholder text
        if(messagesContainer.querySelector('p')) {
            messagesContainer.innerHTML = '';
        }
        messagesContainer.appendChild(messageBubble);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch(error) {
        // Error handled by apiCall
    }
}

// --- UI Rendering ---

// UPDATED: Main navigation logic to include the new 'messages' section
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
        // Now calls the function to render the conversations list
        fetchAndRenderConversations();
    }
}

// UPDATED: Sidebar navigation to include the Messages link
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = (role === 'designer')
        ? `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-briefcase fa-fw"></i> <span>Find Jobs</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`
        : `<a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post a Job</span></a>`;
    
    // Add messages link for all logged-in users
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;

    navContainer.innerHTML = links;
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}