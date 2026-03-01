// SteelConnect Service Worker
// Handles: Push Notifications (incoming calls) + PWA App Update Detection + Caching
// Works with Web Push (VAPID) — no Firebase client SDK required.

const SW_VERSION = '2.0.0';
const CACHE_NAME = 'steelconnect-v' + SW_VERSION;
const BACKEND_URL = 'https://steelconnect-backend.onrender.com';
const APP_NAME = 'SteelConnect';

// Files to precache for offline shell (critical app assets)
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/analytics-styles.css',
    '/analytics-integration.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// --- INSTALL: Precache app shell and skip waiting ---
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker v' + SW_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Precaching app shell');
                return cache.addAll(PRECACHE_URLS).catch((err) => {
                    // Don't fail install if some assets are missing — cache what we can
                    console.warn('[SW] Some precache assets failed:', err);
                    return Promise.allSettled(
                        PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
                    );
                });
            })
            .then(() => self.skipWaiting()) // Activate immediately, don't wait for old tabs to close
    );
});

// --- ACTIVATE: Clean old caches and take control ---
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker v' + SW_VERSION);
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('steelconnect-') && name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // Take control of all open tabs immediately
            return clients.claim();
        }).then(() => {
            // Notify all clients that a new version is active
            return clients.matchAll({ type: 'window' }).then((windowClients) => {
                windowClients.forEach((client) => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: SW_VERSION
                    });
                });
            });
        })
    );
});

// --- FETCH: Network-first strategy for HTML/API, cache-first for static assets ---
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and cross-origin API calls
    if (request.method !== 'GET') return;
    // Skip external resources (Google, Firebase, CDNs) — let browser handle them
    if (!url.origin.includes(self.location.origin)) return;
    // Skip API calls — always go to network
    if (url.pathname.startsWith('/api/')) return;

    // For HTML pages — network-first with cache fallback
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache the fresh response
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Offline — serve cached version
                    return caches.match(request).then((cached) => cached || caches.match('/'));
                })
        );
        return;
    }

    // For JS/CSS/images — stale-while-revalidate (serve cache, update in background)
    event.respondWith(
        caches.match(request).then((cached) => {
            const fetchPromise = fetch(request).then((response) => {
                // Update cache with fresh version
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                return response;
            }).catch(() => cached); // If network fails, cached version is already served

            return cached || fetchPromise;
        })
    );
});

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

    // Handle app update notification from server
    if (data.type === 'APP_UPDATE') {
        event.waitUntil(
            self.registration.showNotification('Update Available', {
                body: data.message || 'A new version of SteelConnect is available. Tap to update.',
                icon: '/icon-192.png',
                badge: '/icon-192.png',
                tag: 'app-update',
                data: { type: 'APP_UPDATE' },
                requireInteraction: false
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

    // Handle app update notification click — reload the app
    if (callData.type === 'APP_UPDATE') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.includes(self.location.origin)) {
                        client.navigate(client.url);
                        client.focus();
                        return;
                    }
                }
                return clients.openWindow('/');
            })
        );
        return;
    }

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
    if (callData.type === 'incoming_call') {
        console.log('[SW] Notification dismissed for call:', callData.callId);
        // Don't auto-decline on dismiss — the call keeps ringing on other devices
    }
});

// --- MESSAGE: Handle messages from the main app ---
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'GET_VERSION') {
        event.source.postMessage({
            type: 'SW_VERSION',
            version: SW_VERSION
        });
    }
});
