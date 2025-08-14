// script.js

// --- YOUR EXISTING LANDING PAGE & APP SCRIPT ---
let currentSlide = 0;
// ... (all your existing code from the top of the file)
// ...
// ... (handleRegister, handleLogin, logout, etc. are all kept as they are)

// The file is very large, so I will only show the MODIFIED and NEW parts.
// Keep all your existing functions and paste the new ones below them.

// Find this function in your script and REPLACE it with this updated version.
function buildSidebarNav() {
    const navContainer = document.getElementById('sidebar-nav-menu');
    const role = appState.currentUser.type;
    let links = '';
    
    if (role === 'designer') {
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-search fa-fw"></i> <span>Find Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="my-quotes"><i class="fas fa-file-invoice-dollar fa-fw"></i> <span>My Quotes</span></a>`;
    } else { // Contractor
        links = `
           <a href="#" class="sidebar-nav-link" data-section="jobs"><i class="fas fa-tasks fa-fw"></i> <span>My Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="approved-jobs"><i class="fas fa-check-circle fa-fw"></i> <span>Approved Projects</span></a>
           <a href="#" class="sidebar-nav-link" data-section="post-job"><i class="fas fa-plus-circle fa-fw"></i> <span>Post Project</span></a>
           <a href="#" class="sidebar-nav-link" data-section="estimation-tool"><i class="fas fa-calculator fa-fw"></i> <span>Estimation Tool</span></a>`; // <-- THIS LINE IS ADDED
    }
    
    links += `<a href="#" class="sidebar-nav-link" data-section="messages"><i class="fas fa-comments fa-fw"></i> <span>Messages</span></a>`;
    navContainer.innerHTML = links;
    
    navContainer.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            renderAppSection(link.dataset.section);
        });
    });
}

// Find this function in your script and REPLACE it with this updated version.
function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });
    
    // Your existing cases for jobs, post-job, my-quotes, etc. are here.
    if (sectionId === 'jobs') {
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
    } else if (sectionId === 'estimation-tool') { // <-- THIS CASE IS ADDED
        renderEstimationToolUI(container);
    }
}

// --- PASTE THESE NEW FUNCTIONS AT THE END OF YOUR SCRIPT.JS FILE ---

function renderEstimationToolUI(container) {
    container.innerHTML = `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-calculator"></i> AI Cost Estimation Tool</h2>
                <p class="header-subtitle">Upload your structural PDF drawings to receive a preliminary cost estimate.</p>
            </div>
        </div>
        <div class="file-upload-area" id="file-upload-area">
            <input type="file" id="file-upload-input" accept=".pdf" style="display:none;" />
            <div class="file-upload-icon"><i class="fas fa-file-upload"></i></div>
            <h3>Drag & Drop PDF Drawings Here</h3>
            <p>or click to select a file</p>
        </div>
        <div id="file-info-container" style="display:none;">
            <div id="file-info"></div>
            <button id="generate-estimation-btn" class="btn btn-primary"><i class="fas fa-cogs"></i> Generate Estimate</button>
        </div>
        <div id="estimation-report-container"></div>`;
        
    const uploadArea = document.getElementById('file-upload-area');
    const fileInput = document.getElementById('file-upload-input');
    
    uploadArea.onclick = () => fileInput.click();
    fileInput.onchange = (e) => e.target.files.length && handleFileSelect(e.target.files[0]);
    
    uploadArea.ondragover = (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); };
    uploadArea.ondragleave = () => uploadArea.classList.remove('drag-over');
    uploadArea.ondrop = (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        e.dataTransfer.files.length && handleFileSelect(e.dataTransfer.files[0]);
    };
}

function handleFileSelect(file) {
    if (file && file.type === "application/pdf") {
        document.getElementById('file-info').innerHTML = `<i class="fas fa-file-pdf"></i> ${file.name}`;
        document.getElementById('file-info-container').style.display = 'flex';
        document.getElementById('generate-estimation-btn').onclick = () => generateRealEstimate(file);
    } else {
        showNotification("Please select a valid PDF file.", "error");
    }
}

async function generateRealEstimate(file) {
    const reportContainer = document.getElementById('estimation-report-container');
    const generateBtn = document.getElementById('generate-estimation-btn');

    reportContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI is analyzing drawings... This may take a moment.</p></div>`;
    generateBtn.disabled = true;
    generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating...`;

    const formData = new FormData();
    formData.append('drawing', file);
    
    try {
        // We use a separate fetch call here because apiCall is designed for JSON, not FormData
        const response = await fetch(`${BACKEND_URL}/estimation/generate-from-upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${appState.jwtToken}` },
            body: formData
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to generate estimation.');

        showNotification('Estimation generated successfully!', 'success');
        renderEstimationReport(result.estimationData);

    } catch (error) {
        console.error("Estimation API Error:", error);
        showNotification(error.message, "error");
        reportContainer.innerHTML = `<div class="error-message">Failed to generate report. Please try again.</div>`;
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = `<i class="fas fa-cogs"></i> Generate Estimate`;
    }
}

function renderEstimationReport(data) {
    const reportContainer = document.getElementById('estimation-report-container');
    if (!data || !data.cost_summary || !data.categories) {
        reportContainer.innerHTML = `<div class="error-message">Received invalid report data.</div>`;
        return;
    }
    const formatCurrency = (value) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value || 0);
    const categoryRows = Object.entries(data.categories).map(([name, cat]) => `<tr><td>${name}</td><td class="currency">${formatCurrency(cat.total)}</td></tr>`).join('');

    reportContainer.innerHTML = `
        <div class="estimation-report">
            <div class="report-header"><h3>Preliminary Estimation Report</h3></div>
            <div class="report-summary">
                <div class="summary-item total">
                    <div class="label"><strong>Total Estimated Cost (inc. GST)</strong></div>
                    <div class="value">${formatCurrency(data.cost_summary.total_inc_gst)}</div>
                </div>
            </div>
            <div class="report-details">
                <h4>Cost Breakdown by Category</h4>
                <table class="report-table">
                    <thead><tr><th>Category</th><th class="currency">Estimated Cost</th></tr></thead>
                    <tbody>${categoryRows}</tbody>
                </table>
            </div>
        </div>`;
}

// Make sure to include your other working functions in the script.js file.
// For example: apiCall, handleRegister, logout, showAppView, fetchAndRenderJobs, fetchAndRenderMyQuotes, showNotification, etc.
