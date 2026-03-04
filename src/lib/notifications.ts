// src/lib/notifications.ts
import { useGameStore } from '../store/useGameStore';
import { audio } from './audio';

// Dynamically import Capacitor plugins only in native context
async function getLocalNotifications() {
    try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        return LocalNotifications;
    } catch {
        return null;
    }
}

async function getCapacitorPush() {
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        return PushNotifications;
    } catch {
        return null;
    }
}

/** Call once after user logs in. Requests permissions and shows welcome notification on first access. */
export async function initCapacitorNotifications() {
    const LN = await getLocalNotifications();
    const PN = await getCapacitorPush();

    // Request push permission (native) or browser fallback
    if (PN) {
        const { receive } = await PN.requestPermissions();
        if (receive === 'granted') {
            useGameStore.getState().setNotificationsEnabled(true);
            await PN.register();
        }
    } else if ('Notification' in window) {
        const p = await Notification.requestPermission();
        useGameStore.getState().setNotificationsEnabled(p === 'granted');
    }

    // Welcome notification — exactly once per install
    if (!localStorage.getItem('noesis_welcomed')) {
        localStorage.setItem('noesis_welcomed', '1');
        setTimeout(async () => {
            if (LN) {
                await LN.requestPermissions();
                await LN.schedule({
                    notifications: [{
                        id: 100001,
                        title: '🧠 Bem-vindo ao Noesis!',
                        body: 'Sua jornada de memória começa agora. Bons estudos!',
                        smallIcon: 'ic_launcher_foreground',
                        iconColor: '#D4A853',
                        schedule: { at: new Date(Date.now() + 2000) },
                    }],
                });
            } else if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🧠 Bem-vindo ao Noesis!', {
                    body: 'Sua jornada de memória começa agora. Bons estudos!',
                    icon: '/logo-noesis.png',
                });
            }
        }, 800);
    }
}

export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
        const permission = await Notification.requestPermission();
        useGameStore.getState().setNotificationsEnabled(permission === 'granted');
        return permission === 'granted';
    } catch (e) {
        console.error('Error requesting notification permission', e);
        return false;
    }
}

export function sendPushNotification(title: string, options?: NotificationOptions) {
    if (!useGameStore.getState().notificationsEnabled) return;

    if (document.hidden) {
        audio.play('success');
    }

    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notif = new Notification(title, {
                icon: '/logo-noesis.png',
                ...options,
            });
            notif.onclick = () => { window.focus(); notif.close(); };
        } catch (e) {
            console.error('Failed to send push notification', e);
        }
    }
}
