

// **IMPORTANT:** Replace this with your actual Render Backend URL!
const RENDER_BACKEND_URL = 'https://steelconnect-backend.onrender.com'; // <--- !!! CHANGE THIS !!!

// ... (rest of appState and initializeSampleData)

// Function to handle job document upload
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
    formData.append('file', file); // 'file' must match the field name in your backend Multer config
    formData.append('context', 'job'); // Add context for backend to put it in correct folder

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/file`, { // <-- Changed endpoint
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${appState.currentUser?.token || ''}` // Send JWT token if user is logged in
            }
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">File "${result.originalName}" uploaded!</span>`; // <-- Changed originalname
            fileInput.value = ''; // Clear the input

            const attachmentInfo = {
                type: 'file',
                url: result.url, // Expecting backend to return a URL
                filename: result.originalName,
                description: `Job Document: ${result.originalName}`
            };
            appState.tempJobAttachments.push(attachmentInfo);

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

// Function to handle adding links for jobs
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
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/link`, { // <-- Changed endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.currentUser?.token || ''}` // Send JWT token
            },
            body: JSON.stringify({ url: link, context: 'job' }),
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">Link added successfully!</span>`;
            linkInput.value = '';

            const attachmentInfo = {
                type: 'link',
                url: result.submittedUrl,
                description: `External Link: ${result.submittedUrl.substring(0, 40)}...`
            };
            appState.tempJobAttachments.push(attachmentInfo);

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

// ... (similar updates for uploadQuoteDocument and addQuoteLink functions)

// Function to handle quote document upload within the modal
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
    formData.append('file', file); // 'file' is the field name your backend expects
    formData.append('context', 'quote'); // Add context for backend

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/file`, { // <-- Changed endpoint
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${appState.currentUser?.token || ''}` // Send JWT token
            }
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">File "${result.originalName}" uploaded!</span>`; // <-- Changed originalname
            fileInput.value = '';

            const attachmentInfo = {
                type: 'file',
                url: result.url,
                filename: result.originalName,
                description: `Quotation Document: ${result.originalName}`
            };
            appState.tempQuoteAttachments.push(attachmentInfo);

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
        const response = await fetch(`${RENDER_BACKEND_URL}/uploads/link`, { // <-- Changed endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${appState.currentUser?.token || ''}` // Send JWT token
            },
            body: JSON.stringify({ url: link, context: 'quote' }),
        });

        if (response.ok) {
            const result = await response.json();
            statusDiv.innerHTML = `<span style="color: green;">Link added successfully!</span>`;
            linkInput.value = '';

            const attachmentInfo = {
                type: 'link',
                url: result.submittedUrl,
                description: `Portfolio Link: ${result.submittedUrl.substring(0, 40)}...`
            };
            appState.tempQuoteAttachments.push(attachmentInfo);

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


// ... (rest of script.js functions)

// Integrate token handling for all authenticated requests
// You'll need to update your handleLogin function to store the token:
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${RENDER_BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            // Store the token and user info
            localStorage.setItem('jwtToken', data.token);
            appState.currentUser = { ...data.user, token: data.token }; // Add token to appState.currentUser
            updateUIForLoggedInUser();
            showAlert('Login successful!', 'success');
            showSection('jobs');
        } else {
            const errorData = await response.json();
            showAlert(errorData.message || 'Login failed.', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('An error occurred during login.', 'error');
    }
}

// And ensure logout clears the token
function logout() {
    appState.currentUser = null;
    localStorage.removeItem('jwtToken'); // Clear token on logout
    updateUIForLoggedOutUser();
    showSection('jobs');
    showAlert('Logged out successfully!', 'info');
}

// In any function that makes an authenticated request, retrieve the token:
// const token = localStorage.getItem('jwtToken');
// if (token) { headers: { 'Authorization': `Bearer ${token}` } }
// This is done in uploadDocument, addLink, etc. above.

// Update initializeSampleData to optionally load from backend on startup (more complex)
// For now, keep mock data as is, but be aware of the shift to real data.
Step 4: Admin Panel Frontend Strategy (Next.js or Vanilla JS)

You'll have an /admin route on your backend. Your frontend needs to consume this.

a. Frontend Authentication for Admin Access:

When a user logs in, the handleLogin function (in script.js or your Next.js auth logic) receives the role (or type) from the JWT payload.

Store this role (along with the token) in your frontend's state or local storage.

Based on this role, conditionally render admin-specific navigation items or pages.

Crucially: All actual API calls to /admin endpoints must include the JWT and the backend must verify the token and the role on every request using verifyToken and verifyAdmin middleware.

b. Building the Admin UI:

For Next.js: Create pages like pages/admin/dashboard.js, pages/admin/users.js. Fetch data using fetch or a data-fetching library (e.g., SWR, React Query).

For Vanilla JS: Create HTML elements within your index.html (or dynamically inject them) and use script.js to fetch and render admin data.

Example fetch for admin dashboard:

JavaScript

// Example fetch in your frontend admin component/script
async function getAdminDashboardStats() {
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    showAlert('Not authenticated.', 'error');
    return;
  }

  try {
    const response = await fetch(`${RENDER_BACKEND_URL}/admin/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Admin Dashboard Stats:', data.stats);
      // Update your UI with data.stats.totalUsers, totalJobs, etc.
      // You would replace the mock updates in index.html like document.getElementById('heroActiveJobs').textContent
      // with actual backend data.
    } else {
      const errorData = await response.json();
      showAlert(`Failed to load admin stats: ${errorData.message || 'Access denied'}`, 'error');
    }
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    showAlert('An error occurred while fetching admin dashboard.', 'error');
  }
}

// Call this function when an admin user navigates to the admin dashboard section
