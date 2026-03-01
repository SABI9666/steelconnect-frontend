// Service Worker for SteelConnect Push Notifications (Incoming Calls)
// Handles background notifications when the app tab is not active

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';

// Try to import Firebase messaging for FCM support (optional)
try {
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
} catch (e) {
    console.log('[SW] Firebase SDK not loaded, using basic push only');
}

// Initialize Firebase if available (configure with your Firebase project credentials)
if (typeof firebase !== 'undefined') {
    try {
        firebase.initializeApp({
            apiKey: self.FIREBASE_API_KEY || '',
            authDomain: self.FIREBASE_AUTH_DOMAIN || '',
            projectId: self.FIREBASE_PROJECT_ID || '',
            storageBucket: self.FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: self.FIREBASE_APP_ID || '',
        });

        const messaging = firebase.messaging();

        // Handle background FCM messages
        messaging.onBackgroundMessage((payload) => {
            console.log('[SW] Background FCM message:', payload);

            if (payload.data && payload.data.type === 'incoming_call') {
                showCallNotification(payload.data);
            }
        });
    } catch (e) {
        console.log('[SW] Firebase init skipped:', e.message);
    }
}

// Show incoming call notification
function showCallNotification(data) {
    const { callId, callerId, callerName, conversationId } = data;

    const options = {
        body: `${callerName} is calling you on SteelConnect`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `call-${callId}`,
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300],
        actions: [
            { action: 'answer', title: 'Answer' },
            { action: 'decline', title: 'Decline' }
        ],
        data: { callId, callerId, callerName, conversationId }
    };

    return self.registration.showNotification('Incoming Call', options);
}

// Handle notification click actions
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const callData = notification.data;
    const action = event.action;

    notification.close();

    if (action === 'decline') {
        // Notify backend so caller is informed immediately instead of waiting for timeout
        if (callData && callData.callId) {
            event.waitUntil(
                fetch(BACKEND_URL + '/api/voice-calls/decline', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callId: callData.callId, reason: 'declined' })
                }).catch(() => { /* ignore - call will timeout on backend */ })
            );
        }
        return;
    }

    // "answer" action or notification body click - open the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Try to focus an existing window
            for (const client of clientList) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.postMessage({
                        type: 'CALL_ANSWER',
                        callId: callData.callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName,
                    });
                    return;
                }
            }
            // No existing window - open new one with call details
            const params = new URLSearchParams({
                callId: callData.callId,
                callerId: callData.callerId || '',
                callerName: callData.callerName || ''
            });
            return clients.openWindow('/?' + params.toString());
        })
    );
});

// Handle push events (for basic web push without FCM)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        if (data.type === 'incoming_call' || (data.data && data.data.type === 'incoming_call')) {
            const callData = data.data || data;
            event.waitUntil(showCallNotification(callData));
        }
    } catch (e) {
        console.log('[SW] Push parse error:', e);
    }
});

// Service worker install/activate
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));
