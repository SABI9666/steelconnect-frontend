// Service Worker for SteelConnect Push Notifications (Incoming Calls)
// Handles background notifications when the app tab is not active or browser is closed.
// Works with Web Push (VAPID) — no Firebase client SDK required.

const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const APP_NAME = 'SteelConnect';

// --- PUSH EVENT: Triggered by Web Push or FCM ---
// This fires even when the browser tab is closed or the user is in another app.
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch (e) {
        console.log('[SW] Push data not JSON:', event.data.text());
        return;
    }

    console.log('[SW] Push received:', data);

    // Handle incoming call push
    if (data.type === 'incoming_call' || (data.data && data.data.type === 'incoming_call')) {
        const callData = data.data || data;
        event.waitUntil(showIncomingCallNotification(callData));
        return;
    }

    // Handle FCM notification payload (when Firebase is configured)
    if (data.notification) {
        const callPayload = data.data || {};
        if (callPayload.type === 'incoming_call') {
            event.waitUntil(showIncomingCallNotification(callPayload));
            return;
        }
        // Generic notification
        event.waitUntil(
            self.registration.showNotification(data.notification.title || APP_NAME, {
                body: data.notification.body || '',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'general-notification',
                data: callPayload
            })
        );
    }
});

// Show incoming call notification with answer/decline actions
function showIncomingCallNotification(data) {
    const { callId, callerId, callerName, conversationId } = data;
    const displayName = callerName || 'Someone';

    const options = {
        body: `${displayName} is calling you`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: `incoming-call-${callId}`,
        requireInteraction: true,     // Notification stays until user acts (like a phone call)
        renotify: true,               // Re-alert even if same tag exists
        vibrate: [300, 100, 300, 100, 300, 100, 300, 100, 300],  // Long vibration pattern
        silent: false,
        urgency: 'high',
        actions: [
            { action: 'answer', title: 'Answer', icon: '/icon-192.png' },
            { action: 'decline', title: 'Decline' }
        ],
        data: { callId, callerId, callerName, conversationId, type: 'incoming_call' },
        timestamp: Date.now()
    };

    return self.registration.showNotification(`Incoming Call - ${APP_NAME}`, options);
}

// --- NOTIFICATION CLICK: User tapped the notification ---
self.addEventListener('notificationclick', (event) => {
    const notification = event.notification;
    const callData = notification.data || {};
    const action = event.action;

    notification.close();

    // User clicked "Decline"
    if (action === 'decline') {
        if (callData.callId) {
            event.waitUntil(
                fetch(`${BACKEND_URL}/api/voice-calls/decline`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ callId: callData.callId, reason: 'declined' })
                }).catch(() => { /* backend will timeout the call */ })
            );
        }
        return;
    }

    // User clicked "Answer" or tapped the notification body — open/focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Try to find and focus an existing app window
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    // Tell the app to show/accept the incoming call
                    client.postMessage({
                        type: 'CALL_ANSWER',
                        callId: callData.callId,
                        callerId: callData.callerId,
                        callerName: callData.callerName,
                    });
                    return;
                }
            }
            // No existing window — open a new one with call parameters
            const params = new URLSearchParams({
                callId: callData.callId || '',
                callerId: callData.callerId || '',
                callerName: callData.callerName || ''
            });
            return clients.openWindow('/?' + params.toString());
        })
    );
});

// --- NOTIFICATION CLOSE: User dismissed without answering ---
self.addEventListener('notificationclose', (event) => {
    const callData = event.notification.data || {};
    console.log('[SW] Notification dismissed for call:', callData.callId);
    // Don't auto-decline on dismiss — the call keeps ringing on other devices
});

// --- INSTALL & ACTIVATE: Take control immediately ---
self.addEventListener('install', () => {
    console.log('[SW] Service worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Service worker activated');
    event.waitUntil(clients.claim());
});
