self.addEventListener('push', function (event) {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: data.data || {}
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'Noesis', options)
        );
    } catch (e) {
        console.error('Push event data was not JSON:', event.data.text());
        event.waitUntil(
            self.registration.showNotification('Nova notificação no Noesis!', {
                icon: '/icon-192x192.png'
            })
        );
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Se já tem uma aba aberta, foca nela
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                        break;
                    }
                }
                return client.focus();
            }
            // Se não, abre uma nova
            return clients.openWindow('/');
        })
    );
});
