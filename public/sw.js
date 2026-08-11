/* MTrack service worker: app-shell caching, offline reads, guarded mutation outbox, and platform events. */
const VERSION = '2026.08.08.3';
const STATIC_CACHE = `mtrack-static-${VERSION}`;
const DATA_CACHE = 'mtrack-data-v1';
const CACHE_PREFIX = 'mtrack-';
const OUTBOX_DB = 'mtrack-pwa';
const OUTBOX_STORE = 'mutation-outbox';
const SYNC_TAG = 'mtrack-mutation-sync';
const PERIODIC_SYNC_TAG = 'mtrack-ticket-refresh';

const APP_SHELL = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon-32.png',
  '/apple-touch-icon.png',
  '/icon-96.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await migrateLegacyDataCaches(cacheNames);
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith(CACHE_PREFIX) && name !== STATIC_CACHE && name !== DATA_CACHE)
        .map((name) => caches.delete(name)),
    );
    await self.clients.claim();
    await refreshTicketCache();
    await broadcastQueueStatus();
  })());
});

async function migrateLegacyDataCaches(cacheNames) {
  const legacyNames = cacheNames.filter((name) => name.startsWith('mtrack-data-') && name !== DATA_CACHE);
  if (legacyNames.length === 0) return;

  const target = await caches.open(DATA_CACHE);
  for (const name of legacyNames) {
    const legacy = await caches.open(name);
    const requests = await legacy.keys();
    await Promise.all(requests.map(async (request) => {
      const response = await legacy.match(request);
      if (response) await target.put(request, response);
    }));
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(networkFirstData(request));
      return;
    }

    if (['POST', 'PUT', 'PATCH'].includes(request.method) && request.headers.get('X-MTrack-Queueable') === 'true') {
      event.respondWith(networkOrQueue(request));
    }
    return;
  }

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  if (['script', 'style', 'font', 'image', 'manifest'].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function navigationResponse(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put('/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match(request)) ||
      (await caches.match('/')) ||
      (await caches.match('/offline.html')) ||
      new Response('MTrack is offline', { status: 503, headers: { 'content-type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || (await refresh) || new Response('', { status: 504 });
}

async function networkFirstData(request) {
  const cache = await caches.open(DATA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cacheDataResponse(cache, request, response.clone());
    return response;
  } catch {
    const url = new URL(request.url);
    const cached = (await cache.match(request)) ||
      (url.pathname === '/api/tickets' ? await cache.match('/api/tickets') : null);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-MTrack-Cache', 'offline');
      return new Response(await cached.clone().blob(), {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: 'Offline and this information has not been cached on this device yet.',
    }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'X-MTrack-Offline': 'true' },
    });
  }
}

async function cacheDataResponse(cache, request, response) {
  await cache.put(request, response.clone());

  const url = new URL(request.url);
  if (url.pathname !== '/api/tickets') return;

  const canonicalRequest = new Request(new URL('/api/tickets', self.location.origin).href, {
    credentials: 'same-origin',
  });
  await cache.put(canonicalRequest, response.clone());

  try {
    const payload = await response.json();
    const tickets = payload && payload.success && Array.isArray(payload.data?.items)
      ? payload.data.items
      : [];
    await Promise.all(tickets.map((ticket) => {
      if (!ticket?.id) return Promise.resolve();
      const detailRequest = new Request(
        new URL(`/api/tickets/${encodeURIComponent(ticket.id)}`, self.location.origin).href,
        { credentials: 'same-origin' },
      );
      return cache.put(detailRequest, new Response(JSON.stringify({ success: true, data: ticket }), {
        status: 200,
        headers: { 'content-type': 'application/json', 'X-MTrack-Cache': 'ticket-snapshot' },
      }));
    }));
  } catch {
    // The list response remains cached even if its contents cannot be expanded.
  }
}

async function networkOrQueue(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const operation = await serializeMutation(request);
    await putOutboxOperation(operation);
    await requestBackgroundSync();
    await broadcast({ type: 'MUTATION_QUEUED', operation });
    await broadcastQueueStatus();

    return new Response(JSON.stringify({
      success: true,
      data: {
        queued: true,
        operationId: operation.id,
        queuedAt: operation.createdAt,
      },
    }), {
      status: 202,
      headers: { 'content-type': 'application/json', 'X-MTrack-Queued': 'true' },
    });
  }
}

async function serializeMutation(request) {
  const headers = {};
  request.headers.forEach((value, key) => {
    if (!['content-length', 'host'].includes(key.toLowerCase())) headers[key] = value;
  });

  const id = request.headers.get('X-MTrack-Operation-Id') || crypto.randomUUID();
  headers['X-MTrack-Operation-Id'] = id;

  return {
    id,
    url: request.url,
    method: request.method,
    headers,
    body: await request.clone().text(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
}

function openOutbox() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OUTBOX_DB, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        const store = database.createObjectStore(OUTBOX_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withOutbox(mode, callback) {
  const database = await openOutbox();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(OUTBOX_STORE, mode);
      const store = transaction.objectStore(OUTBOX_STORE);
      const result = callback(store);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

async function putOutboxOperation(operation) {
  await withOutbox('readwrite', (store) => store.put(operation));
}

async function deleteOutboxOperation(id) {
  await withOutbox('readwrite', (store) => store.delete(id));
}

async function getOutboxOperations() {
  const database = await openOutbox();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(OUTBOX_STORE, 'readonly');
      const request = transaction.objectStore(OUTBOX_STORE).index('createdAt').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

async function processOutbox() {
  const operations = await getOutboxOperations();
  let completed = 0;

  for (const operation of operations) {
    try {
      const response = await fetch(operation.url, {
        method: operation.method,
        headers: operation.headers,
        body: operation.body || undefined,
        credentials: 'same-origin',
      });

      if (response.ok) {
        await deleteOutboxOperation(operation.id);
        completed += 1;
        await broadcast({ type: 'MUTATION_SYNCED', operationId: operation.id });
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        await deleteOutboxOperation(operation.id);
        await broadcast({
          type: 'MUTATION_FAILED',
          operationId: operation.id,
          status: response.status,
          error: await response.text(),
        });
        continue;
      }

      operation.attempts = (operation.attempts || 0) + 1;
      await putOutboxOperation(operation);
      break;
    } catch {
      operation.attempts = (operation.attempts || 0) + 1;
      await putOutboxOperation(operation);
      break;
    }
  }

  await broadcastQueueStatus();
  if (completed > 0) await refreshTicketCache();
  return completed;
}

async function requestBackgroundSync() {
  if ('sync' in self.registration) {
    try {
      await self.registration.sync.register(SYNC_TAG);
    } catch {
      // The online event and manual sync remain as fallbacks.
    }
  }
}

async function refreshTicketCache() {
  try {
    const request = new Request(new URL('/api/tickets', self.location.origin).href, {
      credentials: 'same-origin',
    });
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DATA_CACHE);
      await cacheDataResponse(cache, request, response.clone());
      await broadcast({ type: 'DATA_REFRESHED', refreshedAt: new Date().toISOString() });
    }
  } catch {
    // A later sync/periodic event will retry.
  }
}

async function broadcast(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

async function broadcastQueueStatus(port) {
  const operations = await getOutboxOperations();
  const message = { type: 'QUEUE_STATUS', count: operations.length };
  if (port) port.postMessage(message);
  else await broadcast(message);
}

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(processOutbox());
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) event.waitUntil(refreshTicketCache());
});

self.addEventListener('message', (event) => {
  const message = event.data || {};
  if (message.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (message.type === 'SYNC_OUTBOX') {
    event.waitUntil(processOutbox());
  } else if (message.type === 'GET_QUEUE_STATUS') {
    event.waitUntil(broadcastQueueStatus(event.ports && event.ports[0]));
  } else if (message.type === 'REFRESH_DATA') {
    event.waitUntil(refreshTicketCache());
  } else if (message.type === 'SHOW_NOTIFICATION') {
    event.waitUntil(self.registration.showNotification(message.title || 'MTrack', {
      body: message.body || 'Notifications are enabled.',
      icon: '/icon-192.png',
      badge: '/icon-96.png',
      data: { url: message.url || '/' },
      tag: message.tag || 'mtrack-local',
    }));
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : 'Maintenance activity was updated.' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'MTrack update', {
    body: payload.body || 'Maintenance activity was updated.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-96.png',
    data: { url: payload.url || '/tickets' },
    tag: payload.tag || 'mtrack-update',
    renotify: Boolean(payload.renotify),
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      if ('focus' in client) {
        if ('navigate' in client) await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
