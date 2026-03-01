// src/lib/notifications.ts
import { useGameStore } from '../store/useGameStore';
import { audio } from './audio';

export async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;

    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            useGameStore.getState().setNotificationsEnabled(true);
        } else {
            useGameStore.getState().setNotificationsEnabled(false);
        }
        return permission === 'granted';
    } catch (e) {
        console.error('Error requesting notification permission', e);
        return false;
    }
}

export function sendPushNotification(title: string, options?: NotificationOptions) {
    if (!useGameStore.getState().notificationsEnabled) return;

    // We can play a sound when a notification arrives if not currently focusing the app
    if (document.hidden) {
        audio.play('success'); // gentle chime
    }

    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notif = new Notification(title, {
                icon: '/vite.svg', // using default vite icon as placeholder
                ...options
            });

            notif.onclick = () => {
                window.focus();
                notif.close();
            };
        } catch (e) {
            console.error('Failed to send push notification', e);
        }
    } else {
        // Fallback for when permissions are denied but in-app notifications are enabled
        console.log(`[Push Notification] ${title} - ${options?.body}`);
    }
}
