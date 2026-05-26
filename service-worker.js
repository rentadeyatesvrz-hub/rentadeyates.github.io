// service-worker.js
self.addEventListener('install', () => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline');
    })
  );
});

// Listener para notificaciones Push en segundo plano (Offline)
self.addEventListener('push', event => {
  let payload = {
    title: '⛵ ¡Nueva Reserva Recibida!',
    body: 'Revisa el panel de administración para ver los detalles.'
  };
  
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200],
      requireInteraction: true
    })
  );
});
