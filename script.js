// server.js - SIMPLIFIED VERSION with Direct Imports
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Import routes directly
import authRoutes from './src/routes/auth.js';
import jobsRoutes from './src/routes/jobs.js';
import quotesRoutes from './src/routes/quotes.js';
import messagesRoutes from './src/routes/messages.js';
import notificationsRoutes from './src/routes/notifications.js'; // Added

// Import estimation routes (now fixed)
let estimationRoutes;
try {
    const estimationModule = await import('./src/routes/estimation.js');
    estimationRoutes = estimationModule.default;
    console.log('✅ Estimation routes imported successfully');
} catch (error) {
    console.warn('⚠️ Estimation routes not available:', error.message);
}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

console.log('🚀 SteelConnect Backend Starting...');
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`⏰ Started at: ${new Date().toISOString()}`);

// --- Database Connection ---
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('✅ MongoDB connected'))
        .catch(err => console.error('❌ MongoDB connection error:', err));
} else {
    console.warn('⚠️ MONGODB_URI not found in environment variables');
}

// --- Middleware ---
const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').filter(origin => origin.trim());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin) ||
            origin.endsWith('.vercel.app') ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1')) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS Warning: Origin "${origin}" not in allowed list`);
            if (process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Request logging middleware ---
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// --- Health check route ---
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'SteelConnect Backend is healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// --- Root route ---
app.get('/', (req, res) => {
    res.json({
        message: 'SteelConnect Backend API is running',
        version: '1.0.0',
        status: 'healthy',
        endpoints: {
            health: '/health',
            auth: '/api/auth',
            jobs: '/api/jobs',
            quotes: '/api/quotes',
            messages: '/api/messages',
            estimation: '/api/estimation',
            notifications: '/api/notifications' // Added
        }
    });
});

// --- Register Routes ---
console.log('🔄 Registering routes...');

// Auth routes
if (authRoutes) {
    app.use('/api/auth', authRoutes);
    console.log('✅ Auth routes registered');
} else {
    console.error('❌ Auth routes failed to load');
}

// Jobs routes  
if (jobsRoutes) {
    app.use('/api/jobs', jobsRoutes);
    console.log('✅ Jobs routes registered');
} else {
    console.error('❌ Jobs routes failed to load');
}

// Quotes routes
if (quotesRoutes) {
    app.use('/api/quotes', quotesRoutes);
    console.log('✅ Quotes routes registered');
} else {
    console.error('❌ Quotes routes failed to load');
}

// Messages routes
if (messagesRoutes) {
    app.use('/api/messages', messagesRoutes);
    console.log('✅ Messages routes registered');
} else {
    console.error('❌ Messages routes failed to load');
}

// Notifications routes (Added)
if (notificationsRoutes) {
    app.use('/api/notifications', notificationsRoutes);
    console.log('✅ Notifications routes registered');
} else {
    console.error('❌ Notifications routes failed to load');
}

// Estimation routes
if (estimationRoutes) {
    app.use('/api/estimation', estimationRoutes);
    console.log('✅ Estimation routes registered');
} else {
    console.warn('⚠️ Estimation routes unavailable - some services may be missing');
}

console.log('📦 Route registration completed');

// --- API test endpoint ---
app.get('/api', (req, res) => {
    res.json({
        message: 'SteelConnect API',
        version: '1.0.0',
        available_endpoints: [
            'GET /health',
            'GET /api',
            'GET /api/auth/*',
            'POST /api/auth/register',
            'POST /api/auth/login',
            'GET /api/jobs/*',
            'GET /api/quotes/*',
            'GET /api/messages/*',
            'GET /api/estimation/*',
            'GET /api/notifications/*' // Added
        ]
    });
});

// --- Error handling middleware ---
app.use((error, req, res, next) => {
    console.error('❌ Global Error Handler:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 50MB.'
        });
    }

    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            error: 'CORS policy violation'
        });
    }

    res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// --- 404 handler ---
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
        available_routes: [
            '/',
            '/health',
            '/api',
            '/api/auth/*',
            '/api/jobs/*',
            '/api/quotes/*',
            '/api/messages/*',
            '/api/estimation/*',
            '/api/notifications/*' // Added
        ]
    });
});

// --- Graceful shutdown ---
process.on('SIGTERM', () => {
    console.log('🔴 SIGTERM received, shutting down gracefully...');
    if (mongoose.connection.readyState === 1) {
        mongoose.connection.close();
    }
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🔴 SIGINT received, shutting down gracefully...');
    if (mongoose.connection.readyState === 1) {
        mongoose.connection.close();
    }
    process.exit(0);
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('🎉 SteelConnect Backend Server Started');
    console.log(`📍 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);

    console.log('\n📋 Environment Check:');
    console.log(`   MongoDB: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Anthropic API: ${process.env.ANTHROPIC_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   Firebase: ${process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   CORS Origins: ${process.env.CORS_ORIGIN ? '✅ Configured' : '⚠️ Using defaults'}`);
    console.log(`   Resend API: ${process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Missing'}`);


    console.log('\n🔗 Available endpoints:');
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API: http://localhost:${PORT}/api`);
    console.log('');
});
src/routes/notifications.js
This is a new file that handles all notification-related API calls.

JavaScript

// src/routes/notifications.js
import express from 'express';
import { adminDb } from '../config/firebase.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to protect all notification routes
router.use(authMiddleware);

// GET all notifications for the logged-in user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationsRef = adminDb.collection('notifications');
        const snapshot = await notificationsRef
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.empty) {
            return res.status(200).json({ success: true, data: [] });
        }

        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json({ success: true, data: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
    }
});

// PUT to mark notifications as read
router.put('/mark-read', async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ success: false, error: 'Notification IDs are required.' });
        }

        const batch = adminDb.batch();
        ids.forEach(id => {
            const docRef = adminDb.collection('notifications').doc(id);
            batch.update(docRef, { isRead: true });
        });

        await batch.commit();
        res.status(200).json({ success: true, message: 'Notifications marked as read.' });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ success: false, error: 'Failed to update notifications.' });
    }
});

// DELETE all notifications for the logged-in user
router.delete('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const notificationsRef = adminDb.collection('notifications');
        const snapshot = await notificationsRef.where('userId', '==', userId).get();

        if (snapshot.empty) {
            return res.status(200).json({ success: true, message: 'No notifications to delete.' });
        }

        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        res.status(200).json({ success: true, message: 'All notifications cleared.' });
    } catch (error) {
        console.error('Error deleting notifications:', error);
        res.status(500).json({ success: false, error: 'Failed to clear notifications.' });
    }
});

export default router;
src/middleware/authMiddleware.js
This existing file has been updated to be more generic and reusable.

JavaScript

// src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authorization token is required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_default_secret_key_change_in_production');
        req.user = decoded; // Add decoded payload (e.g., userId, email, type) to the request object
        next();
    } catch (error) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    }
};

export const isAdmin = (req, res, next) => {
    // This middleware should run after authMiddleware
    if (!req.user || (req.user.type !== 'admin' && req.user.role !== 'admin')) {
        return res.status(403).json({ success: false, error: 'Access denied. Admin privileges required.' });
    }
    next();
};
src/routes/auth.js
This file is heavily updated to handle role-specific profile updates with file uploads to Firebase Storage and to add the Resend email notification logic.

JavaScript

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { adminDb, adminStorage } from '../config/firebase.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import multer from 'multer';
import { Resend } from 'resend';

const router = express.Router();
const resend = new Resend(process.env.RESEND_API_KEY);

// Multer setup for handling file uploads in memory
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit per file
});

// --- Test Route ---
router.get('/test', (req, res) => {
    res.json({ message: 'Auth routes working!' });
});

// --- POST /login/admin (No changes) ---
// ... (Your existing admin login code remains here)

// --- POST /register (No changes) ---
// ... (Your existing user registration code remains here)

// --- Regular User Login with Email Notification ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.', success: false });
        }
        console.log('Regular user login attempt for:', email);

        const usersRef = adminDb.collection('users');
        const userSnapshot = await usersRef
            .where('email', '==', email.toLowerCase().trim())
            .where('type', 'in', ['contractor', 'designer'])
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials.', success: false });
        }
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        if (userData.isActive === false) {
            return res.status(401).json({ error: 'Account is deactivated.', success: false });
        }
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials.', success: false });
        }
        await userDoc.ref.update({ lastLoginAt: new Date().toISOString() });

        const payload = { userId: userDoc.id, email: userData.email, type: userData.type, name: userData.name };
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'your_default_secret_key_change_in_production', { expiresIn: '7d' });

        console.log('✅ Regular user login successful');

        // --- NEW: Send login notification email via Resend ---
        if (process.env.RESEND_API_KEY) {
            try {
                await resend.emails.send({
                    from: 'SteelConnect <noreply@yourdomain.com>', // Replace with your verified Resend domain
                    to: userData.email,
                    subject: 'New Login to Your SteelConnect Account',
                    html: `<p>Hi ${userData.name},</p><p>We detected a new login to your SteelConnect account at ${new Date().toLocaleString()}.</p><p>If this was not you, please secure your account immediately.</p>`,
                });
                console.log(`✅ Login notification sent to ${userData.email}`);
            } catch (emailError) {
                console.error('❌ Failed to send login notification email:', emailError);
            }
        } else {
            console.warn('⚠️ RESEND_API_KEY not set. Skipping login notification email.');
        }

        res.status(200).json({
            message: 'Login successful',
            success: true,
            token: token,
            user: {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                type: userData.type,
                createdAt: userData.createdAt,
                lastLoginAt: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('LOGIN ERROR:', error);
        res.status(500).json({ error: 'An error occurred during login.', success: false });
    }
});


// --- GET /profile (No changes) ---
// ... (Your existing get profile code remains here)


// --- UPDATE User Profile (Contractor & Designer) ---
router.put(
    '/profile',
    authMiddleware,
    upload.fields([
        { name: 'resume', maxCount: 1 },
        { name: 'certificates' } // Allows multiple certificate files
    ]),
    async (req, res) => {
        try {
            const userId = req.user.userId;
            const userRef = adminDb.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                return res.status(404).json({ success: false, error: 'User not found.' });
            }

            const userData = userDoc.data();
            const updateData = { updatedAt: new Date().toISOString() };
            const { name } = req.body;

            if (name) updateData.name = name.trim();

            // --- File Upload Helper ---
            const uploadFile = async (file, path) => {
                const bucket = adminStorage.bucket();
                const blob = bucket.file(path);
                const blobStream = blob.createWriteStream({
                    metadata: { contentType: file.mimetype },
                });

                return new Promise((resolve, reject) => {
                    blobStream.on('error', reject);
                    blobStream.on('finish', async () => {
                        await blob.makePublic();
                        resolve(blob.publicUrl());
                    });
                    blobStream.end(file.buffer);
                });
            };


            // --- Handle Role-Specific Fields ---
            if (userData.type === 'contractor') {
                if (req.body.companyName) updateData.companyName = req.body.companyName;
                if (req.body.linkedInUrl) updateData.linkedInUrl = req.body.linkedInUrl;
            } else if (userData.type === 'designer') {
                if (req.body.skills) {
                    try {
                        updateData.skills = JSON.parse(req.body.skills);
                    } catch {
                        return res.status(400).json({ success: false, error: 'Invalid skills format.' });
                    }
                }

                // Handle Resume Upload
                if (req.files && req.files.resume) {
                    const resumeFile = req.files.resume[0];
                    const filePath = `profiles/${userId}/resume/${resumeFile.originalname}`;
                    updateData.resumeUrl = await uploadFile(resumeFile, filePath);
                }

                // Handle Certificate Uploads
                if (req.files && req.files.certificates) {
                    const certificateFiles = req.files.certificates;
                    const existingCertificates = userData.certificates || [];
                    
                    const uploadPromises = certificateFiles.map(file => {
                        const filePath = `profiles/${userId}/certificates/${Date.now()}-${file.originalname}`;
                        return uploadFile(file, filePath);
                    });
                    
                    const newUrls = await Promise.all(uploadPromises);

                    // For simplicity, we'll just store URLs. In a real app, you'd handle names/metadata from the form.
                    const newCertificates = newUrls.map(url => ({ url, name: url.split('/').pop(), uploadedAt: new Date().toISOString() }));

                    updateData.certificates = [...existingCertificates, ...newCertificates];
                }
            }

            // Update user document
            await userRef.update(updateData);

            const updatedUserDoc = await userRef.get();
            const { password, ...userProfile } = updatedUserDoc.data();

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully.',
                data: { id: updatedUserDoc.id, ...userProfile },
            });

        } catch (error) {
            console.error('PROFILE UPDATE ERROR:', error);
            res.status(500).json({ success: false, error: 'An error occurred while updating profile.' });
        }
    }
);

// --- PUT /change-password (No changes) ---
// ... (Your existing change password code remains here)

// --- POST /logout (No changes) ---
// ... (Your existing logout code remains here)

// --- GET /verify (No changes) ---
// ... (Your existing token verification code remains here)

export default router;
firebase.js
This file has been corrected as noted. The storageBucket URL has been fixed.

JavaScript

import admin from 'firebase-admin';

// Check for the required environment variable
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 is not set in environment variables.');
}

// Decode the Base64 service account key from environment variables
const serviceAccountJson = Buffer.from(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64,
  'base64'
).toString('utf8');

const serviceAccount = JSON.parse(serviceAccountJson);

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    // --- FIX: The bucket name should not include 'gs://' or 'firebasestorage.app' ---
    storageBucket: 'steelconnect-backend-3f684.appspot.com'
  });
}

// Export the initialized services
const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { admin, adminDb, adminStorage };
script.js
This file contains the majority of the new frontend logic for notifications and the dynamic settings page, plus the login notification trigger. The logout mechanism was reviewed and is functioning as expected for an inactivity timer.

JavaScript

// --- LANDING PAGE SLIDER & SMOOTH SCROLL ---
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
    link.addEventListener('click', function (e) {
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
const IS_LOCAL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PROD_BACKEND_URL = 'https://steelconnect-backend.onrender.com/api';
const BACKEND_URL = IS_LOCAL ? 'http://localhost:10000/api' : PROD_BACKEND_URL;

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
    uploadedFile: null,
    myEstimations: [],
    currentHeaderSlide: 0,
    notifications: [], // Will be populated from Firestore
};

// Professional Features Header Data
const headerFeatures = [
    {
        icon: 'fa-calculator',
        title: 'AI Cost Estimation',
        subtitle: 'Advanced algorithms for precise cost analysis',
        description: 'Upload your drawings and get instant, accurate estimates powered by machine learning',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
        icon: 'fa-drafting-compass',
        title: 'Expert Engineering',
        subtitle: 'Connect with certified professionals',
        description: 'Access a network of qualified structural engineers and designers worldwide',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
        icon: 'fa-comments',
        title: 'Real-time Collaboration',
        subtitle: 'Seamless project communication',
        description: 'Built-in messaging system for efficient project coordination and updates',
        gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
        icon: 'fa-shield-alt',
        title: 'Secure & Reliable',
        subtitle: 'Enterprise-grade security',
        description: 'Your project data is protected with bank-level encryption and security',
        gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
];

// --- INACTIVITY TIMER FOR AUTO-LOGOUT ---
let inactivityTimer;

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    // Set to 30 minutes (1800000 ms) for a better user experience
    inactivityTimer = setTimeout(() => {
        if (appState.currentUser) {
            // This is the auto-logout flow. It shows a notification and then redirects.
            // It's not a "popup" but an informational message before action.
            showNotification('You have been logged out due to inactivity.', 'info');
            logout();
        }
    }, 1800000);
}


function initializeApp() {
    console.log("SteelConnect App Initializing...");

    // Global click listener to close pop-ups
    window.addEventListener('click', (event) => {
        const userInfoDropdown = document.getElementById('user-info-dropdown');
        const userInfoContainer = document.getElementById('user-info-container');
        if (userInfoDropdown && userInfoContainer && !userInfoContainer.contains(event.target)) {
            userInfoDropdown.classList.remove('active');
        }
        const notificationPanel = document.getElementById('notification-panel');
        const notificationBellContainer = document.getElementById('notification-bell-container');
        if (notificationPanel && notificationBellContainer && !notificationBellContainer.contains(event.target)) {
            notificationPanel.classList.remove('active');
        }
    });

    // Inactivity listeners
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keydown', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);

    // Auth button listeners
    document.getElementById('signin-btn')?.addEventListener('click', () => showAuthModal('login'));
    document.getElementById('join-btn')?.addEventListener('click', () => showAuthModal('register'));
    document.getElementById('get-started-btn')?.addEventListener('click', () => showAuthModal('register'));

    // Logo navigation
    document.querySelector('.logo')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (appState.currentUser) {
            renderAppSection('dashboard');
        } else {
            showLandingPageView();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });

    // Check for existing session
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

    initializeHeaderRotation();
}

// --- DYNAMIC HEADER SYSTEM ---
function initializeHeaderRotation() {
    setInterval(() => {
        appState.currentHeaderSlide = (appState.currentHeaderSlide + 1) % headerFeatures.length;
        updateDynamicHeader();
    }, 5000);
}

function updateDynamicHeader() {
    const headerElement = document.getElementById('dynamic-feature-header');
    if (headerElement) {
        const feature = headerFeatures[appState.currentHeaderSlide];
        headerElement.innerHTML = `
            <div class="feature-header-content" style="background: ${feature.gradient};">
                <div class="feature-icon-container"><i class="fas ${feature.icon}"></i></div>
                <div class="feature-text-content">
                    <h2 class="feature-title">${feature.title}</h2>
                    <p class="feature-subtitle">${feature.subtitle}</p>
                </div>
                <div class="feature-indicators">
                    ${headerFeatures.map((_, index) =>
            `<div class="indicator ${index === appState.currentHeaderSlide ? 'active' : ''}"></div>`
        ).join('')}
                </div>
            </div>`;
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
        .catch(() => { });
}

async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    const authData = { email: form.loginEmail.value, password: form.loginPassword.value };
    try {
        const data = await apiCall('/auth/login', 'POST', authData);

        appState.currentUser = data.user;
        appState.jwtToken = data.token;
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.setItem('jwtToken', data.token);

        closeModal();
        await showAppView();
        showNotification(`Welcome back to SteelConnect, ${data.user.name}!`, 'success');

        if (data.user.type === 'designer') {
            loadUserQuotes();
        }

    } catch (error) {
        // Error is already shown by apiCall
    }
}

function logout() {
    appState.currentUser = null;
    appState.jwtToken = null;
    appState.userSubmittedQuotes.clear();
    appState.myEstimations = [];
    appState.notifications = [];
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

// --- NOTIFICATION SYSTEM (NEW/UPDATED) ---
async function fetchUserNotifications() {
    if (!appState.currentUser) return;
    try {
        const response = await apiCall('/notifications', 'GET');
        appState.notifications = response.data || [];
        renderNotificationPanel();
    } catch (error) {
        console.error('Failed to fetch notifications:', error);
        const panelList = document.getElementById('notification-panel-list');
        if (panelList) {
            panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-exclamation-triangle"></i><p>Could not load</p></div>`;
        }
    }
}

function renderNotificationPanel() {
    const panelList = document.getElementById('notification-panel-list');
    const badge = document.getElementById('notification-badge');
    const unreadCount = appState.notifications.filter(n => !n.isRead).length;

    if (badge) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
    if (!panelList) return;

    if (appState.notifications.length === 0) {
        panelList.innerHTML = `<div class="notification-empty-state"><i class="fas fa-bell-slash"></i><p>No new notifications</p></div>`;
        return;
    }

    panelList.innerHTML = appState.notifications.map(n => {
        const iconMap = { info: 'fa-info-circle', success: 'fa-check-circle', warning: 'fa-exclamation-triangle', error: 'fa-times-circle', message: 'fa-comment-alt', job: 'fa-briefcase', quote: 'fa-file-invoice-dollar' };
        const icon = iconMap[n.type] || 'fa-info-circle';
        return `
            <div class="notification-item ${n.isRead ? '' : 'unread-notification'}" data-id="${n.id}">
                <div class="notification-item-icon ${n.type}"><i class="fas ${icon}"></i></div>
                <div class="notification-item-content">
                    <p>${n.message}</p>
                    <span class="timestamp">${getTimeAgo(n.createdAt)}</span>
                </div>
            </div>`;
    }).join('');
}


async function markNotificationsAsRead() {
    const unreadIds = appState.notifications.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;

    // Optimistically update UI
    appState.notifications.forEach(n => n.isRead = true);
    renderNotificationPanel();

    try {
        await apiCall('/notifications/mark-read', 'PUT', { ids: unreadIds });
    } catch (error) {
        console.error('Failed to mark notifications as read:', error);
        // Optionally revert UI change on failure
    }
}

async function clearNotifications() {
    if (confirm('Are you sure you want to clear all notifications? This cannot be undone.')) {
        try {
            await apiCall('/notifications', 'DELETE', null, 'All notifications cleared.');
            appState.notifications = [];
            renderNotificationPanel();
        } catch (err) {
            console.error("Failed to clear notifications", err);
        }
    }
}


function toggleNotificationPanel(event) {
    event.stopPropagation();
    const panel = document.getElementById('notification-panel');
    if (panel) {
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            markNotificationsAsRead();
        }
    }
}

// ... (Your other existing functions like estimation, jobs, quotes, messages remain largely the same)
// ... (Make sure to paste them back in here if needed)

// --- PROFILE SETTINGS (NEW/UPDATED) ---
async function handleProfileUpdate(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Saving...';
    submitBtn.disabled = true;

    try {
        const formData = new FormData(form);
        const response = await apiCall('/auth/profile', 'PUT', formData); // Changed endpoint to match auth.js

        // Update local state and localStorage with the returned fresh user data
        appState.currentUser = response.data;
        localStorage.setItem('currentUser', JSON.stringify(appState.currentUser));

        showNotification('Your profile has been saved!', 'success');
        // Optionally re-render parts of the UI that depend on user info
        document.getElementById('user-info-name').textContent = appState.currentUser.name;
        document.getElementById('sidebarUserName').textContent = appState.currentUser.name;

    } catch (error) {
        console.error("Profile update failed:", error);
        // Error notification is handled by apiCall
    } finally {
        if (submitBtn) {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
}


function setupSkillsInput() {
    const skillsInput = document.getElementById('skills-input');
    const tagsContainer = document.getElementById('skills-tags-container');
    const hiddenSkillsInput = document.querySelector('input[name="skills"]');
    if (!skillsInput || !tagsContainer || !hiddenSkillsInput) return;

    let skills = [];
    try {
        skills = JSON.parse(hiddenSkillsInput.value || '[]');
    } catch {
        skills = [];
    }

    const renderTags = () => {
        tagsContainer.innerHTML = '';
        skills.forEach((skill, index) => {
            const tag = document.createElement('div');
            tag.className = 'skill-tag';
            tag.innerHTML = `<span>${skill}</span><button type="button" class="remove-tag-btn" data-index="${index}">&times;</button>`;
            tagsContainer.appendChild(tag);
        });
        hiddenSkillsInput.value = JSON.stringify(skills);
    };

    skillsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const skill = skillsInput.value.trim();
            if (skill && !skills.includes(skill)) {
                skills.push(skill);
                skillsInput.value = '';
                renderTags();
            }
        }
    });

    tagsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-tag-btn') || e.target.parentElement.classList.contains('remove-tag-btn')) {
            const button = e.target.classList.contains('remove-tag-btn') ? e.target : e.target.parentElement;
            const index = button.dataset.index;
            skills.splice(index, 1);
            renderTags();
        }
    });

    renderTags(); // Initial render
}


// --- UI RENDERING FUNCTIONS ---
async function showAppView() {
    document.getElementById('landing-page-content').style.display = 'none';
    document.getElementById('app-content').style.display = 'flex';
    document.getElementById('auth-buttons-container').style.display = 'none';
    document.getElementById('user-info-container').style.display = 'flex';

    document.getElementById('main-nav-menu').innerHTML = '';

    const user = appState.currentUser;
    document.getElementById('user-info-name').textContent = user.name;
    document.getElementById('user-info-avatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    // Setup user dropdown
    document.getElementById('user-info').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('user-info-dropdown').classList.toggle('active');
    });
    document.getElementById('user-settings-link').addEventListener('click', (e) => {
        e.preventDefault();
        renderAppSection('settings');
        document.getElementById('user-info-dropdown').classList.remove('active');
    });
    document.getElementById('user-logout-link').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Setup notification panel
    document.getElementById('notification-bell-container').addEventListener('click', toggleNotificationPanel);
    document.getElementById('clear-notifications-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        clearNotifications();
    });

    document.getElementById('sidebarUserName').textContent = user.name;
    document.getElementById('sidebarUserType').textContent = user.type;
    document.getElementById('sidebarUserAvatar').textContent = (user.name || "A").charAt(0).toUpperCase();

    buildSidebarNav();
    renderAppSection('dashboard');

    // Fetch notifications from Firestore
    await fetchUserNotifications();

    if (user.type === 'designer') loadUserQuotes();
    if (user.type === 'contractor') loadUserEstimations();
}

function renderAppSection(sectionId) {
    const container = document.getElementById('app-container');
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === sectionId);
    });

    // ... (Your existing renderAppSection logic)

    if (sectionId === 'settings') {
        container.innerHTML = getSettingsTemplate(appState.currentUser);
        document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
        if (appState.currentUser.type === 'designer') {
            setupSkillsInput();
        }
    } else if (sectionId === 'dashboard') {
        container.innerHTML = getDashboardTemplate(appState.currentUser);
        // renderRecentActivityWidgets(); // Make sure this function exists
    }
    // ... (Add other sections like 'jobs', 'post-job', etc.)
}

// ... (Your existing template functions like getLoginTemplate, getDashboardTemplate, etc.)

function getSettingsTemplate(user) {
    const isContractor = user.type === 'contractor';

    const contractorFields = `
        <div class="form-group">
            <label class="form-label">Company Name</label>
            <input type="text" name="companyName" class="form-input" placeholder="Your Company LLC" value="${user.companyName || ''}">
        </div>
        <div class="form-group">
            <label class="form-label">LinkedIn URL</label>
            <input type="url" name="linkedInUrl" class="form-input" placeholder="https://linkedin.com/company/your-company" value="${user.linkedInUrl || ''}">
        </div>
    `;

    const designerFields = `
        <div class="form-group">
            <label class="form-label">Resume</label>
            <input type="file" name="resume" class="form-input file-input" accept=".pdf,.doc,.docx">
            <small class="form-help">Upload your latest resume (PDF, DOC, DOCX).</small>
            ${user.resumeUrl ? `<a href="${user.resumeUrl}" target="_blank" class="form-help">View current resume</a>` : ''}
        </div>
        <div class="form-group">
            <label class="form-label">Skills</label>
            <div class="skills-input-container">
                <div id="skills-tags-container" class="skills-tags-container"></div>
                <input type="text" id="skills-input" class="form-input" placeholder="e.g., Revit, AutoCAD (then press Enter)">
            </div>
             <input type="hidden" name="skills" value='${JSON.stringify(user.skills || [])}'>
        </div>
        <div class="form-group">
            <label class="form-label">Certificates</label>
            <input type="file" name="certificates" class="form-input file-input" accept=".pdf,.jpg,.jpeg,.png" multiple>
            <small class="form-help">Upload any relevant certificates.</small>
            <div id="certificates-list" style="margin-top: 10px;">
                ${(user.certificates || []).map(cert => `
                    <div class="skill-tag">
                        <a href="${cert.url}" target="_blank" style="color: white; text-decoration: none;">${cert.name.substring(0, 20)}...</a>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    return `
        <div class="section-header modern-header">
            <div class="header-content">
                <h2><i class="fas fa-cog"></i> Settings</h2>
                <p class="header-subtitle">Manage your account and professional profile</p>
            </div>
        </div>
        <div class="settings-container">
            <div class="settings-card">
                <h3><i class="fas fa-user-edit"></i> Profile Information</h3>
                <form id="profile-form" class="premium-form">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" name="name" class="form-input" value="${user.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email Address</label>
                        <input type="email" class="form-input" value="${user.email}" disabled>
                        <small class="form-help">Email cannot be changed.</small>
                    </div>
                    ${isContractor ? contractorFields : designerFields}
                    <button type="submit" class="btn btn-primary">Save Profile Changes</button>
                </form>
            </div>
            <div class="settings-card">
                <h3><i class="fas fa-shield-alt"></i> Security</h3>
                 <form class="premium-form" onsubmit="event.preventDefault(); showNotification('Password change is not yet implemented.', 'info');">
                    <div class="form-group">
                        <label class="form-label">Current Password</label>
                        <input type="password" class="form-input" autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label class="form-label">New Password</label>
                        <input type="password" class="form-input" autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn btn-primary">Change Password</button>
                </form>
            </div>
        </div>
    `;
}
