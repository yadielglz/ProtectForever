// Modern Service Worker for Protect PWA
const CACHE_NAME = 'protect-v3';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/config.js',
    '/manifest.json',
    '/sw.js',
    'https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Icons that should NOT be cached aggressively (cache bust on update)
const ICON_FILES = [
    '/app-icon.png',
    '/icon-192x192.png',
    '/icon-512x512.png',
    '/favicon-16x16.png',
    '/favicon-32x32.png',
    '/favicon.ico',
    '/favicon.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                console.log('Service Worker installed successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker installation failed:', error);
                // Don't fail the installation completely
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Clear icon cache specifically to force refresh
                return caches.open(CACHE_NAME).then(cache => {
                    return Promise.all(
                        ICON_FILES.map(iconPath => {
                            return cache.delete(iconPath).catch(() => {});
                        })
                    );
                });
            })
            .then(() => {
                console.log('Service Worker activated successfully');
                // Force all clients to reload to get fresh icons
                return self.clients.matchAll().then(clients => {
                    clients.forEach(client => {
                        client.postMessage({ type: 'SW_UPDATED', cacheVersion: 'v3' });
                    });
                }).then(() => self.clients.claim());
            })
            .catch(error => {
                console.error('Service Worker activation failed:', error);
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!event.request.url.startsWith('http')) {
        return;
    }
    
    // Skip requests to external domains that might cause issues
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('fonts.googleapis.com') &&
        !event.request.url.includes('cdnjs.cloudflare.com')) {
        return;
    }
    
    const requestUrl = new URL(event.request.url);
    const isIconFile = ICON_FILES.some(icon => requestUrl.pathname.includes(icon.split('/').pop()));
    
    // For icons and favicons: Always try network first, then cache (allows updates)
    if (isIconFile) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // Cache the updated icon
                    if (response && response.status === 200 && response.type === 'basic') {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        }).catch(() => {});
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails, try cache as fallback
                    return caches.match(event.request);
                })
        );
        return;
    }
    
    // For other files: Cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }
                
                // Otherwise fetch from network
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response for caching
                        const responseToCache = response.clone();
                        
                        // Cache the response for future use
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            })
                            .catch(error => {
                                console.error('Cache put failed:', error);
                            });
                        
                        return response;
                    })
                    .catch(error => {
                        console.error('Fetch failed:', error);
                        
                        // Return offline page for navigation requests
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        
                        throw error;
                    });
            })
            .catch(error => {
                console.error('Cache match failed:', error);
                
                // Return offline page for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
                
                throw error;
            })
    );
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // Perform background sync operations
            syncData()
        );
    }
});

// Push notifications
self.addEventListener('push', event => {
    console.log('Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update available',
        icon: '/app-icon.png',
        badge: '/favicon-32x32.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Details',
                icon: '/app-icon.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/favicon-32x32.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Protect', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    console.log('Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then(clientList => {
                    // Try to focus existing window first
                    for (const client of clientList) {
                        if (client.url === self.location.origin + '/' && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    
                    // If no existing window, open new one
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
                .catch(error => {
                    console.error('Error handling notification click:', error);
                    // Fallback: try to open window anyway
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
    console.log('Service Worker received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
    
    if (event.data && event.data.type === 'CLEAR_ICON_CACHE') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
                return Promise.all(
                    ICON_FILES.map(iconPath => cache.delete(iconPath))
                );
            })
        );
    }
});

// Helper function for background sync
async function syncData() {
    try {
        // Perform any necessary data synchronization
        console.log('Performing background sync...');
        
        // This could include:
        // - Syncing offline data
        // - Updating cached content
        // - Sending queued requests
        
        return Promise.resolve();
    } catch (error) {
        console.error('Background sync failed:', error);
        throw error;
    }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', event => {
    console.log('Periodic background sync triggered:', event.tag);
    
    if (event.tag === 'content-sync') {
        event.waitUntil(
            syncData()
        );
    }
});

console.log('Service Worker loaded successfully');