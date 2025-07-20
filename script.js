// Global application state
let appState = {
    currentUser: null,
    users: [],
    jobs: [],
    quotes: [],
    nextJobId: 1,
    nextQuoteId: 1,
    // Temporary storage for attachments *before* a job is officially posted
    tempJobAttachments: [],
    // Temporary storage for attachments *before* a quote is officially submitted
    tempQuoteAttachments: []
};

// **IMPORTANT:** Replace this with your actual Railway Backend URL!
// Example: 'https://my-steelconnect-backend.up.railway.app'
const RAILWAY_BACKEND_URL = 'YOUR_RAILWAY_BACKEND_URL'; // <--- !!! CHANGE THIS !!!

// Initialize sample data
function initializeSampleData() {
    appState.users = [
        {
            id: 1,
            name: "John Smith",
            email: "john@example.com",
            password: "demo123",
            type: "contractor",
            phone: "555-0123",
            location: "New York, NY",
            skills: ["Project Management", "AISC", "Construction"]
        },
        {
            id: 2,
            name: "Sarah Johnson",
            email: "sarah@example.com",
            password: "demo123",
            type: "designer",
            phone: "555-0124",
            location: "Chicago, IL",
            skills: ["Structural Design", "AutoCAD", "STAAD Pro", "Revit"]
        }
    ];

    appState.jobs = [
        {
            id: 1,
            title: "Steel Frame Design for Office Building",
            type: "structural",
            budget: "5000-10000",
            description: "Need structural steel frame design for a 5-story office building. Must comply with AISC standards. The building will house office spaces with standard loading requirements.",
            deadline: "2025-02-15",
            skills: ["AISC", "STAAD Pro", "AutoCAD"],
            poster: "john@example.com",
            postedDate: "2025-01-15",
            status: "active",
            attachments: [] // Add attachments array to existing jobs
        },
        {
            id: 2,
            title: "Rebar Detailing for Concrete Foundation",
            type: "rebar",
            budget: "2500-5000",
            description: "Detailed rebar drawings needed for concrete foundation of warehouse facility. Foundation dimensions: 100x200 feet. Need detailed reinforcement drawings with bar schedules.",
            deadline: "2025-01-30",
            skills: ["Rebar Detailing", "AutoCAD", "ACI 318"],
            poster: "john@example.com",
            postedDate: "2025-01-10",
            status: "active",
            attachments: [ // Example of an attachment
                { type: 'link', url: 'https://docs.google.com/document/d/1sample_design_spec', description: 'Initial Design Specifications' }
            ]
        },
        {
            id: 3,
            title: "Connection Design for Steel Bridge",
            type: "connection",
            budget: "10000+",
            description: "Design bolted and welded connections for steel pedestrian bridge. Must handle wind and seismic loads. Experience with bridge design required.",
            deadline: "2025-03-01",
            skills: ["AISC", "Bridge Design", "STAAD Pro", "Connection Design"],
            poster: "sarah@example.com", // Designer posted this one for testing
            postedDate: "2025-01-12",
            status: "active",
            attachments: []
        }
    ];

    appState.quotes = [
        {
            id: 1,
            jobId: 1,
            quoter: "sarah@example.com",
            amount: 7500,
            description: "I can complete this structural design within 3 weeks. I have 8+ years of experience with AISC standards and office building designs.",
            status: "pending",
            submittedDate: "2025-01-16",
            attachments: [ // Example of an attachment to a quote
                { type: 'file', url: `${RAILWAY_BACKEND_URL}/uploads/sarah-quote-123.pdf`, filename: 'sarah-quote-123.pdf', description: 'Quotation Document' },
                { type: 'link', url: 'https://www.linkedin.com/in/sarah-johnson-design/', description: 'My LinkedIn Portfolio' }
            ]
        },
        {
            id: 2,
            jobId: 2,
            quoter: "sarah@example.com",
            amount: 3200,
            description: "Experienced in rebar detailing with AutoCAD. Can provide detailed drawings and bar schedules within 2 weeks.",
            status: "accepted",
            submittedDate: "2025-01-11",
            attachments: []
        }
    ];

    appState.nextJobId = 4; // Next available ID for new jobs
    appState.nextQuoteId = 3; // Next available ID for new quotes
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    // Remove active state from nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.classList.add('active');
    }

    // Add active state to corresponding nav link (if it exists)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.textContent.toLowerCase().includes(sectionName.replace('-', ' '))) {
            link.classList.add('active');
        }
    });

    // Hide hero section when navigating to other sections, show it on initial load or logout
    const hero = document.getElementById('hero');
    if (hero) {
        if (sectionName === 'login' || sectionName === 'register' || appState.currentUser === null) {
            hero.style.display = 'block';
        } else {
            hero.style.display = 'none';
        }
    }

    // Adjust visibility of attachment section based on active section
    const attachmentSection = document.getElementById('attachment-section');
    if (attachmentSection) {
        if (sectionName === 'post-job') {
            attachmentSection.style.display = 'block';
        } else {
            attachmentSection.style.display = 'none';
        }
    }


    // Load section-specific data
    if (sectionName === 'jobs') {
        loadJobs();
    } else if (sectionName === 'quotes') {
        loadQuotes();
    }
    updateStats();
}

// Authentication functions
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = appState.users.find(u => u.email === email && u.password === password);
    if (user) {
        appState.currentUser = user;
        updateUIForLoggedInUser();
        showAlert('Login successful!', 'success');
        showSection('jobs'); // Show jobs section by default after login
    } else {
        showAlert('Invalid email or password.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const regName = document.getElementById('regName').value.trim();
    const regEmail = document.getElementById('regEmail').value.trim();
    const regPassword = document.getElementById('regPassword').value;
    const regType = document.getElementById('regType').value;
    const regPhone = document.getElementById('regPhone').value.trim();
    const regLocation = document.getElementById('regLocation').value.trim();
    const regSkills = document.getElementById('regSkills').value.trim();

    if (!regName || !regEmail || !regPassword || !regType) {
        showAlert('Please fill in all required fields.', 'error');
        return;
    }

    if (appState.users.find(u => u.email === regEmail)) {
        showAlert('Email already registered!', 'error');
        return;
    }

    const newUser = {
        id: appState.users.length + 1,
        name: regName,
        email: regEmail,
        password: regPassword, // In real app, hash this password!
        type: regType,
        phone: regPhone,
        location: regLocation,
        skills: regSkills ? regSkills.split(',').map(s => s.trim()).filter(s => s) : []
    };

    appState.users.push(newUser);
    appState.currentUser = newUser;

    showAlert('Registration successful! You are now logged in.', 'success');
    updateUIForLoggedInUser();
    showSection('jobs');
    document.getElementById('register-form').reset();
}

function logout() {
    appState.currentUser = null;
    updateUIForLoggedOutUser();
    showSection('jobs'); // Show jobs section after logout
    showAlert('Logged out successfully!', 'info');
}

function updateUIForLoggedInUser() {
    const userProfile = document.getElementById('user-profile');
    const hero = document.getElementById('hero');
    const authButtons = document.querySelector('.auth-buttons');
    const navMenu = document.querySelector('.nav-menu');

    if (userProfile && appState.currentUser) {
        userProfile.style.display = 'flex';
        document.getElementById('userAvatar').textContent =
            appState.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('userName').textContent = appState.currentUser.name;
        document.getElementById('userType').textContent =
            appState.currentUser.type === 'contractor' ? 'Contractor' : 'Professional Designer';
    }

    if (hero) {
        hero.style.display = 'none'; // Hide hero section once logged in
    }

    if (authButtons) {
        authButtons.innerHTML = `
            <span style="color: var(--text-gray);">Welcome, ${appState.currentUser.name}!</span>
            <button class="btn btn-secondary" onclick="logout()">Sign Out</button>
        `;
    }

    if (navMenu) {
        navMenu.innerHTML = ''; // Clear existing navigation links
        navMenu.appendChild(createNavLink('Find Jobs', 'jobs', true)); // Always available

        if (appState.currentUser.type === 'contractor') {
            navMenu.appendChild(createNavLink('Post Job', 'post-job'));
        } else if (appState.currentUser.type === 'designer') {
            navMenu.appendChild(createNavLink('My Quotes', 'quotes'));
        }
    }
    showSection('jobs'); // Always set default section after login based on type
}

function createNavLink(text, sectionName, isActive = false) {
    const button = document.createElement('button');
    button.className = `nav-link ${isActive ? 'active' : ''}`;
    button.textContent = text;
    button.onclick = () => showSection(sectionName);
    return button;
}

function updateUIForLoggedOutUser() {
    const userProfile = document.getElementById('user-profile');
    const hero = document.getElementById('hero');
    const authButtons = document.querySelector('.auth-buttons');
    const navMenu = document.querySelector('.nav-menu');

    if (userProfile) {
        userProfile.style.display = 'none';
    }
    if (hero) {
        hero.style.display = 'block'; // Show hero section when logged out
    }
    if (authButtons) {
        authButtons.innerHTML = `
            <button class="btn btn-outline" onclick="showSection('login')">Sign In</button>
            <button class="btn btn-primary" onclick="showSection('register')">Join Now</button>
        `;
    }

    if (navMenu) {
        navMenu.innerHTML = '';
        navMenu.appendChild(createNavLink('Find Jobs', 'jobs', true)); // Only 'Find Jobs' when logged out
    }
    showSection('jobs'); // Default to jobs section
}

// Job management functions
function loadJobs() {
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) return;

    const sortedJobs = [...appState.jobs].sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

    if (sortedJobs.length === 0) {
        jobsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No jobs available</h3>
                <p>Be the first to post a job!</p>
            </div>
        `;
        return;
    }

    jobsList.innerHTML = sortedJobs.map(job => {
        const poster = appState.users.find(u => u.email === job.poster);
        const quotesCount = appState.quotes.filter(q => q.jobId === job.id).length;
        const isMyJob = appState.currentUser && appState.currentUser.email === job.poster;
        const hasSubmittedQuote = appState.currentUser && appState.currentUser.type === 'designer' &&
                                  appState.quotes.some(q => q.jobId === job.id && q.quoter === appState.currentUser.email);

        // Display job attachments if any
        const jobAttachmentsHtml = job.attachments && job.attachments.length > 0 ?
            `<div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <h5 style="margin-bottom: 10px; font-weight: 600;">Job Attachments:</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${job.attachments.map(att => `
                        <a href="${att.url}" target="_blank" class="skill-tag"
                           style="background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; text-decoration: none;">
                           ${att.type === 'file' ? '📄' : '🔗'} ${att.description || att.filename || 'Attachment'}
                        </a>
                    `).join('')}
                </div>
            </div>` : '';

        return `
            <div class="job-card">
                <div class="job-header">
                    <div>
                        <h3 class="job-title">${job.title}</h3>
                        <div class="job-meta">
                            <span>📍 Posted by ${poster ? poster.name : 'Anonymous'}</span>
                            <span>📅 ${new Date(job.postedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                            <span>💬 ${quotesCount} proposal${quotesCount === 1 ? '' : 's'}</span>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-end;">
                        <div class="job-type">${job.type}</div>
                        <div class="job-budget">${job.budget.includes('$') ? job.budget : `$${job.budget}`}</div>
                    </div>
                </div>

                <p class="job-description">${job.description}</p>

                <div class="job-skills">
                    ${job.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                </div>

                ${jobAttachmentsHtml} <!-- Display job attachments here -->

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 14px; color: var(--text-gray); margin-top: 16px;">
                    <span>⏰ Deadline: ${new Date(job.deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>

                ${appState.currentUser && appState.currentUser.type === 'designer' && !isMyJob && !hasSubmittedQuote ? `
                    <div class="job-actions" style="margin-top: 20px;">
                        <button class="btn btn-primary" onclick="submitQuote(${job.id})">Submit Proposal</button>
                    </div>
                ` : ''}
                ${appState.currentUser && appState.currentUser.type === 'designer' && hasSubmittedQuote ? `
                    <div class="job-actions" style="margin-top: 20px;">
                        <span class="skill-tag" style="background: #e0f2fe; color: #0369a1; border-color: #7dd3fc;">Proposal Submitted!</span>
                    </div>
                ` : ''}
                ${appState.currentUser && appState.currentUser.type === 'contractor' && isMyJob ? `
                    <div class="job-actions" style="margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="viewProposals(${job.id})">View Proposals (${quotesCount})</button>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

async function handlePostJob(event) {
    event.preventDefault(); // Prevent default form submission

    if (!appState.currentUser || appState.currentUser.type !== 'contractor') {
        showAlert('You must be logged in as a Contractor to post a job.', 'error');
        return;
    }

    const jobTitle = document.getElementById('jobTitle').value.trim();
    const jobType = document.getElementById('jobType').value;
    const jobBudget = document.getElementById('jobBudget').value;
    const jobDeadline = document.getElementById('jobDeadline').value;
    const jobDescription = document.getElementById('jobDescription').value.trim();
    const jobSkills = document.getElementById('jobSkills').value.trim();

    if (!jobTitle || !jobType || !jobBudget || !jobDeadline || !jobDescription) {
        showAlert('Please fill in all required job details.', 'error');
        return;
    }

    const newJob = {
        id: appState.nextJobId++,
        title: jobTitle,
        type: jobType,
        budget: jobBudget,
        description: jobDescription,
        deadline: jobDeadline,
        skills: jobSkills.split(',').map(s => s.trim()).filter(s => s),
        poster: appState.currentUser.email,
        postedDate: new Date().toISOString().split('T')[0], // Current date YYYY-MM-DD
        status: 'active',
        attachments: [...appState.tempJobAttachments] // Attach all collected files/links
    };

    appState.jobs.push(newJob);
    showAlert('Job posted successfully!', 'success');
    document.getElementById('post-job-form').reset(); // Clear the form

    // Clear temporary attachments after job is posted
    appState.tempJobAttachments = [];
    document.getElementById('fileUploadStatus').innerHTML = '';
    document.getElementById('linkStatus').innerHTML = '';
    document.getElementById('currentJobAttachments').innerHTML = '';

    loadJobs(); // Refresh the job list
    updateStats(); // Update stats
    showSection('jobs'); // Go back to jobs list
}

async function uploadDocument() {
    const fileInput = document.getElementById('documentUpload');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('fileUploadStatus');
    const attachmentsList = document.getElementById('currentJobAttachments');

    if (!file) {
        statusDiv.innerHTML = '<span style="color: red;">Please select a file to upload.</span>';
        return;
    }

    const allowedTypes = [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10 MB

    if (!allowedTypes.includes(file.type)) {
        statusDiv.innerHTML = '<span style="color: red;">Invalid file type. Only PDF and Word documents are allowed.</span>';
        return;
    }
    if (file.size > maxFileSize) {
        statusDiv.innerHTML = '<span style="color: red;">File size exceeds 10MB limit.</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: var(--primary-color);">Uploading... <span class="spinner"></span></span>';

    const formData = new FormData();
    formData.append('document', file); // 'document' must match the field name in your backend

    try {
        const response = await fetch(`${RAILWAY_BACKEND_URL}/upload-document`, {
            method: 'POST',
            body: formData,
            // Optionally add authentication headers if your backend requires it
            // headers: { 'Authorization': `Bearer ${appState.currentUser.token}` }
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">File "${result.originalname}" uploaded!</span>`;
            fileInput.value = ''; // Clear the input

            const attachmentInfo = {
                type: 'file',
                url: result.filePath || result.url, // Expecting backend to return a path/URL
                filename: result.originalname,
                description: `Job Document: ${result.originalname}`
            };
            appState.tempJobAttachments.push(attachmentInfo);

            // Add to the list shown in the modal
            const listItem = document.createElement('li');
            listItem.innerHTML = `📄 ${attachmentInfo.description} (<a href="${attachmentInfo.url}" target="_blank">View</a>)`;
            attachmentsList.appendChild(listItem);

            showAlert('Document uploaded successfully!', 'success');
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Upload failed: ${error.message || 'Unknown error'}</span>`;
            showAlert(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred during upload.</span>';
        console.error('Error during document upload:', error);
        showAlert('An error occurred during document upload.', 'error');
    }
}

async function addLink() {
    const linkInput = document.getElementById('linkInput');
    const link = linkInput.value.trim();
    const statusDiv = document.getElementById('linkStatus');
    const attachmentsList = document.getElementById('currentJobAttachments');

    if (!link) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a link.</span>';
        return;
    }

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
    if (!urlRegex.test(link)) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a valid URL.</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: var(--primary-color);">Adding link... <span class="spinner"></span></span>';

    try {
        const response = await fetch(`${RAILWAY_BACKEND_URL}/submit-link`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Optionally add authentication headers
                // 'Authorization': `Bearer ${appState.currentUser.token}`
            },
            body: JSON.stringify({ url: link, context: 'job' }), // Add context if backend needs it
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">Link added successfully!</span>`;
            linkInput.value = ''; // Clear the input

            const attachmentInfo = {
                type: 'link',
                url: result.submittedUrl,
                description: `External Link: ${result.submittedUrl.substring(0, 40)}...`
            };
            appState.tempJobAttachments.push(attachmentInfo);

            // Add to the list shown in the modal
            const listItem = document.createElement('li');
            listItem.innerHTML = `🔗 ${attachmentInfo.description} (<a href="${attachmentInfo.url}" target="_blank">View</a>)`;
            attachmentsList.appendChild(listItem);

            showAlert('Link added successfully!', 'success');
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Failed to add link: ${error.message || 'Unknown error'}</span>`;
            showAlert(`Failed to add link: ${error.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred while adding link.</span>';
        console.error('Error during link submission:', error);
        showAlert('An error occurred while adding link.', 'error');
    }
}


function viewProposals(jobId) {
    const job = appState.jobs.find(j => j.id === jobId);
    const proposals = appState.quotes.filter(q => q.jobId === jobId);

    if (!job) {
        showAlert('Job not found!', 'error');
        return;
    }

    let proposalHtml = `<h3>Proposals for: ${job.title}</h3>`;
    if (proposals.length === 0) {
        proposalHtml += `<div class="empty-state">
                            <div class="empty-state-icon">🤷‍♂️</div>
                            <h3>No proposals yet</h3>
                            <p>Check back later!</p>
                          </div>`;
    } else {
        proposalHtml += `<div class="quotes-grid" style="display: grid; gap: 16px; margin-top: 20px;">`;
        proposals.forEach(quote => {
            const quoterUser = appState.users.find(u => u.email === quote.quoter);

            // Display quote attachments if any
            const quoteAttachmentsHtml = quote.attachments && quote.attachments.length > 0 ?
                `<div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                    <h5 style="margin-bottom: 10px; font-weight: 600;">Quote Attachments:</h5>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${quote.attachments.map(att => `
                            <a href="${att.url}" target="_blank" class="skill-tag"
                               style="background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; text-decoration: none;">
                               ${att.type === 'file' ? '📄' : '🔗'} ${att.description || att.filename || 'Attachment'}
                            </a>
                        `).join('')}
                    </div>
                </div>` : '';

            proposalHtml += `
                <div class="quote-card">
                    <div class="quote-header">
                        <div>
                            <h4>From: ${quoterUser ? quoterUser.name : 'Unknown Designer'}</h4>
                            <div class="quote-amount">$${quote.amount.toLocaleString()}</div>
                        </div>
                        <div class="quote-status ${quote.status}">${quote.status}</div>
                    </div>
                    <p>${quote.description}</p>
                    ${quoteAttachmentsHtml} <!-- Display quote attachments here -->
                    <div style="font-size: 14px; color: var(--text-gray); margin-top: 16px;">
                        Submitted: ${new Date(quote.submittedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div class="job-actions" style="margin-top: 20px;">
                        ${quote.status === 'pending' ? `
                            <button class="btn btn-primary" onclick="acceptQuote(${quote.id})">Accept</button>
                            <button class="btn btn-outline" onclick="rejectQuote(${quote.id})">Reject</button>
                        ` : ''}
                        ${quote.status === 'accepted' ? `<span class="skill-tag" style="background: #d1fae5; color: #065f46; border-color: #bbf7d0;">Accepted</span>` : ''}
                        ${quote.status === 'rejected' ? `<span class="skill-tag" style="background: #fee2e2; color: #991b1b; border-color: #fecaca;">Rejected</span>` : ''}
                    </div>
                </div>
            `;
        });
        proposalHtml += `</div>`;
    }

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-button" onclick="this.closest('.modal-overlay').remove()">✕</button>
            ${proposalHtml}
        </div>
    `;
    document.body.appendChild(modalOverlay);
}

function acceptQuote(quoteId) {
    const quote = appState.quotes.find(q => q.id === quoteId);
    if (quote) {
        quote.status = 'accepted';
        showAlert('Quote accepted!', 'success');
        // Reject other pending quotes for the same job
        appState.quotes.filter(q => q.jobId === quote.jobId && q.id !== quoteId).forEach(q => {
            if (q.status === 'pending') q.status = 'rejected';
        });
        const job = appState.jobs.find(j => j.id === quote.jobId);
        if (job) job.status = 'completed'; // Mark job as completed
        viewProposals(quote.jobId); // Refresh proposals view
        loadJobs(); // Refresh jobs view to update job status
        updateStats();
    }
}

function rejectQuote(quoteId) {
    const quote = appState.quotes.find(q => q.id === quoteId);
    if (quote) {
        quote.status = 'rejected';
        showAlert('Quote rejected.', 'error');
        viewProposals(quote.jobId); // Refresh proposals view
        updateStats();
    }
}

function loadQuotes() {
    const quotesList = document.getElementById('quotes-list');
    if (!quotesList) return;

    if (!appState.currentUser || appState.currentUser.type !== 'designer') {
        quotesList.innerHTML = `<div class="empty-state">
                                    <div class="empty-state-icon">🚫</div>
                                    <h3>Access Denied</h3>
                                    <p>Only professional designers can view their quotes.</p>
                                </div>`;
        return;
    }

    const designerQuotes = appState.quotes.filter(q => q.quoter === appState.currentUser.email)
                                     .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

    if (designerQuotes.length === 0) {
        quotesList.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <h3>No quotes submitted yet</h3>
                <p>Find jobs and submit your first proposal!</p>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="showSection('jobs')">Find Jobs Now</button>
            </div>
        `;
        return;
    }

    quotesList.innerHTML = designerQuotes.map(quote => {
        const job = appState.jobs.find(j => j.id === quote.jobId);
        const jobTitle = job ? job.title : 'Unknown Job';

        // Display quote attachments if any
        const quoteAttachmentsHtml = quote.attachments && quote.attachments.length > 0 ?
            `<div style="margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <h5 style="margin-bottom: 10px; font-weight: 600;">Your Attachments:</h5>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${quote.attachments.map(att => `
                        <a href="${att.url}" target="_blank" class="skill-tag"
                           style="background: #e0f2fe; color: #0369a1; border-color: #7dd3fc; text-decoration: none;">
                           ${att.type === 'file' ? '📄' : '🔗'} ${att.description || att.filename || 'Attachment'}
                        </a>
                    `).join('')}
                </div>
            </div>` : '';


        return `
            <div class="quote-card">
                <div class="quote-header">
                    <div>
                        <h3 class="job-title">${jobTitle}</h3>
                        <div class="quote-amount">$${quote.amount.toLocaleString()}</div>
                    </div>
                    <div class="quote-status ${quote.status}">${quote.status}</div>
                </div>
                <p>${quote.description}</p>
                ${quoteAttachmentsHtml} <!-- Display attachments here -->
                <div style="font-size: 14px; color: var(--text-gray); margin-top: 16px;">
                    Submitted: ${new Date(quote.submittedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
            </div>
        `;
    }).join('');
}


// Quote submission (Designer)
function submitQuote(jobId) {
    if (!appState.currentUser) {
        showAlert('Please login to submit a proposal', 'error');
        showSection('login');
        return;
    }
    if (appState.currentUser.type !== 'designer') {
        showAlert('Only professional designers can submit proposals.', 'error');
        return;
    }

    const existingQuote = appState.quotes.find(q =>
        q.jobId === jobId && q.quoter === appState.currentUser.email
    );
    if (existingQuote) {
        showAlert('You have already submitted a proposal for this job', 'error');
        return;
    }

    // Clear temporary quote attachments from previous attempts
    appState.tempQuoteAttachments = [];

    // Create a modal for quote submission
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-button" onclick="this.closest('.modal-overlay').remove()">✕</button>
            <h3 style="margin-bottom: 20px;">Submit Proposal for Job ID: ${jobId}</h3>
            <form id="submit-quote-form" class="form-grid">
                <div class="form-group">
                    <label class="form-label">Your Quote Amount ($)</label>
                    <input type="number" class="form-input" id="quoteAmount" required min="1" placeholder="e.g., 5000">
                </div>
                <div class="form-group">
                    <label class="form-label">Describe your approach and timeline</label>
                    <textarea class="form-textarea" id="quoteDescription" required
                            placeholder="e.g., I can deliver in 2 weeks. My approach involves using STAAD Pro for analysis and AutoCAD for detailing."></textarea>
                </div>
                <div class="form-group">
                    <label class="form-label">Upload Quotation Document (PDF, Word)</label>
                    <input type="file" class="form-input" id="quoteDocumentUpload"
                           accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                    <button type="button" class="btn btn-secondary" onclick="uploadQuoteDocument()">Upload File</button>
                    <small style="color: var(--text-gray); font-size: 12px; margin-top: 5px;">Max file size: 10MB</small>
                    <div id="quoteFileUploadStatus" style="margin-top: 10px;"></div>
                </div>

                <div class="form-group">
                    <label class="form-label">Add Link to Portfolio/Other Files</label>
                    <input type="url" class="form-input" id="quoteLinkInput" placeholder="e.g., https://your-portfolio.com/project">
                    <button type="button" class="btn btn-secondary" onclick="addQuoteLink()">Add Link</button>
                    <div id="quoteLinkStatus" style="margin-top: 10px;"></div>
                </div>

                <div id="quoteAttachedFiles" style="margin-top: 20px;">
                    <h4 style="margin-bottom: 10px;">Attached to Quote:</h4>
                    <ul id="currentQuoteAttachments" style="list-style: none; padding: 0;">
                        <!-- Items will be added here by uploadQuoteDocument/addQuoteLink -->
                    </ul>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 20px;">Submit Proposal</button>
            </form>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    // Add event listener for the form submission inside the modal
    document.getElementById('submit-quote-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('quoteAmount').value);
        const description = document.getElementById('quoteDescription').value.trim();

        if (isNaN(amount) || amount <= 0) {
            showAlert('Please enter a valid positive number for the quote amount.', 'error');
            return;
        }
        if (!description) {
            showAlert('Please provide a description for your proposal.', 'error');
            return;
        }

        // Create the new quote object
        const newQuote = {
            id: appState.nextQuoteId++,
            jobId: jobId,
            quoter: appState.currentUser.email,
            amount: amount,
            description: description,
            status: 'pending',
            submittedDate: new Date().toISOString().split('T')[0],
            attachments: [...appState.tempQuoteAttachments] // Attach collected files/links
        };

        appState.quotes.push(newQuote);
        showAlert('Proposal submitted successfully!', 'success');
        // Clear the temporary attachments after quote is submitted
        appState.tempQuoteAttachments = [];
        document.getElementById('quoteFileUploadStatus').innerHTML = '';
        document.getElementById('quoteLinkStatus').innerHTML = '';
        // No need to clear attachmentsList as the modal closes
        // document.getElementById('currentQuoteAttachments').innerHTML = '';

        // Close the modal
        modalOverlay.remove();
        loadJobs(); // Refresh jobs to update proposal count/status
        updateStats(); // Update global stats
    });
}

// Functions for uploading files/links within the Quote Submission Modal
async function uploadQuoteDocument() {
    const fileInput = document.getElementById('quoteDocumentUpload');
    const file = fileInput.files[0];
    const statusDiv = document.getElementById('quoteFileUploadStatus');
    const attachmentsList = document.getElementById('currentQuoteAttachments');

    if (!file) {
        statusDiv.innerHTML = '<span style="color: red;">Please select a file to upload.</span>';
        return;
    }

    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    const maxFileSize = 10 * 1024 * 1024; // 10 MB

    if (!allowedTypes.includes(file.type)) {
        statusDiv.innerHTML = '<span style="color: red;">Invalid file type. Only PDF and Word documents are allowed.</span>';
        return;
    }
    if (file.size > maxFileSize) {
        statusDiv.innerHTML = '<span style="color: red;">File size exceeds 10MB limit.</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: var(--primary-color);">Uploading... <span class="spinner"></span></span>';

    const formData = new FormData();
    formData.append('quotation', file); // 'quotation' is the field name your backend expects

    try {
        const response = await fetch(`${RAILWAY_BACKEND_URL}/upload-quotation`, {
            method: 'POST',
            body: formData,
            // Authentication if needed
            // headers: { 'Authorization': `Bearer ${appState.currentUser.token}` }
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">File "${result.originalname}" uploaded!</span>`;
            fileInput.value = ''; // Clear the input

            const attachmentInfo = {
                type: 'file',
                url: result.filePath || result.url, // Expecting backend to return a path/URL
                filename: result.originalname,
                description: `Quotation Document: ${result.originalname}`
            };
            appState.tempQuoteAttachments.push(attachmentInfo);

            // Add to the list shown in the modal
            const listItem = document.createElement('li');
            listItem.innerHTML = `📄 ${attachmentInfo.description} (<a href="${attachmentInfo.url}" target="_blank">View</a>)`;
            attachmentsList.appendChild(listItem);

            showAlert('Quotation document uploaded successfully!', 'success');
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Upload failed: ${error.message || 'Unknown error'}</span>`;
            showAlert(`Upload failed: ${error.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred during upload.</span>';
        console.error('Error during quote document upload:', error);
        showAlert('An error occurred during quote document upload.', 'error');
    }
}

async function addQuoteLink() {
    const linkInput = document.getElementById('quoteLinkInput');
    const link = linkInput.value.trim();
    const statusDiv = document.getElementById('quoteLinkStatus');
    const attachmentsList = document.getElementById('currentQuoteAttachments');

    if (!link) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a link.</span>';
        return;
    }

    const urlRegex = /^(ftp|http|https):\/\/[^ "]+$/;
    if (!urlRegex.test(link)) {
        statusDiv.innerHTML = '<span style="color: red;">Please enter a valid URL.</span>';
        return;
    }

    statusDiv.innerHTML = '<span style="color: var(--primary-color);">Adding link... <span class="spinner"></span></span>';

    try {
        const response = await fetch(`${RAILWAY_BACKEND_URL}/submit-link`, { // Re-using submit-link endpoint for simplicity
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Authentication if needed
                // 'Authorization': `Bearer ${appState.currentUser.token}`
            },
            body: JSON.stringify({ url: link, context: 'quote' }), // Add context if backend needs it
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">Link added successfully!</span>`;
            linkInput.value = ''; // Clear the input

            const attachmentInfo = {
                type: 'link',
                url: result.submittedUrl,
                description: `Portfolio Link: ${result.submittedUrl.substring(0, 40)}...`
            };
            appState.tempQuoteAttachments.push(attachmentInfo);

            // Add to the list shown in the modal
            const listItem = document.createElement('li');
            listItem.innerHTML = `🔗 ${attachmentInfo.description} (<a href="${attachmentInfo.url}" target="_blank">View</a>)`;
            attachmentsList.appendChild(listItem);

            showAlert('Link added successfully!', 'success');
        } else {
            const error = await response.json();
            statusDiv.innerHTML = `<span style="color: red;">Failed to add link: ${error.message || 'Unknown error'}</span>`;
            showAlert(`Failed to add link: ${error.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        statusDiv.innerHTML = '<span style="color: red;">An error occurred while adding link.</span>';
        console.error('Error during quote link submission:', error);
        showAlert('An error occurred while adding link.', 'error');
    }
}


// Utility functions
function fillDemoCredentials(type) {
    if (type === 'contractor') {
        document.getElementById('loginEmail').value = 'john@example.com';
        document.getElementById('loginPassword').value = 'demo123';
    } else { // designer
        document.getElementById('loginEmail').value = 'sarah@example.com';
        document.getElementById('loginPassword').value = 'demo123';
    }
    showAlert(`Demo credentials for ${type} filled. Click 'Sign In'.`, 'info');
}

function showAlert(message, type) {
    const alertsContainer = document.getElementById('alerts');
    if (!alertsContainer) return;

    // Clear previous alerts if any, or manage a queue if multiple are desired
    alertsContainer.innerHTML = '';

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; margin-left: auto; font-size: 1.2em; color: inherit;">✕</button>
    `;
    alertsContainer.appendChild(alert);

    setTimeout(() => {
        if (alert.parentElement) { // Check if element still exists before trying to remove
            alert.remove();
        }
    }, 5000);
}

function updateStats() {
    const activeJobsCount = appState.jobs.filter(j => j.status === 'active').length;
    const totalQuotesCount = appState.quotes.length;
    const totalUsersCount = appState.users.length;

    document.getElementById('activeJobs').textContent = activeJobsCount;
    document.getElementById('totalQuotes').textContent = totalQuotesCount;
    document.getElementById('totalUsers').textContent = totalUsersCount;

    document.getElementById('heroActiveJobs').textContent = activeJobsCount;
    document.getElementById('heroTotalQuotes').textContent = totalQuotesCount;
    document.getElementById('heroTotalUsers').textContent = totalUsersCount;
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSampleData();
    updateStats();
    loadJobs(); // Load initial jobs for everyone to see

    // Attach event listeners to forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('post-job-form').addEventListener('submit', handlePostJob);

    // Set minimum deadline for job posting
    const today = new Date();
    today.setDate(today.getDate() + 1); // Set minimum deadline to tomorrow
    const tomorrowISO = today.toISOString().split('T')[0];
    const jobDeadlineInput = document.getElementById('jobDeadline');
    if (jobDeadlineInput) { // Ensure element exists before setting attribute
        jobDeadlineInput.min = tomorrowISO;
    }

    // Set initial UI state based on whether a user is logged in
    if (appState.currentUser) {
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }

    // Ensure the correct section is active on initial load
    showSection('jobs');
});
