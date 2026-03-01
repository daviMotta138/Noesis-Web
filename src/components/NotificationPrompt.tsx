import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';

export const NotificationPrompt = () => {
    const { user, setNotificationsEnabled } = useGameStore();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only show if the browser supports notifications and we haven't asked yet
        if ('Notification' in window && Notification.permission === 'default') {
            // Small delay so it doesn't pop up INSTANTLY upon login 
            const t = setTimeout(() => setIsVisible(true), 2500);
            return () => clearTimeout(t);
        }
    }, []);

    if (!isVisible) return null;

    const handleAllow = async () => {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
            setNotificationsEnabled(true);

            // Web Push Registration
            if ('serviceWorker' in navigator && user?.id) {
                try {
                    const registration = await navigator.serviceWorker.register('/sw.js');
                    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

                    if (vapidKey) {
                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: vapidKey
                        });

                        const subJson = subscription.toJSON();

                        // Save to Supabase
                        if (subJson.endpoint && subJson.keys) {
                            await supabase.from('push_subscriptions').upsert({
                                user_id: user.id,
                                endpoint: subJson.endpoint,
                                auth_key: subJson.keys.auth,
                                p256dh_key: subJson.keys.p256dh
                            }, { onConflict: 'endpoint' });
                        }
                    }
                } catch (err) {
                    console.error('Failed to subscribe to Web Push:', err);
                }
            }
        }
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-20 md:bottom-10 right-4 md:right-10 z-[100] max-w-sm w-[calc(100%-2rem)] p-5 rounded-2xl"
                style={{
                    background: 'rgba(13, 15, 28, 0.95)',
                    border: '1px solid var(--color-border-glow)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(212,168,83,0.15)',
                    backdropFilter: 'blur(16px)'
                }}
            >
                <button onClick={handleDismiss} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
                    <X size={16} />
                </button>
                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(212,168,83,0.1)', color: 'var(--color-gold)' }}>
                        <Bell size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white mb-1 leading-tight">Ativar Notificações</h3>
                        <p className="text-xs mb-4" style={{ color: 'var(--color-text-muted)' }}>
                            Fique sabendo quando enviarem presentes, perder ofensivas ou mudanças na sua liga!
                        </p>
                        <div className="flex gap-2 text-sm font-bold">
                            <button onClick={handleDismiss}
                                className="px-4 py-2 rounded-lg transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)' }}>
                                Agora não
                            </button>
                            <button onClick={handleAllow}
                                className="px-4 py-2 rounded-lg transition-colors"
                                style={{ background: 'var(--color-gold)', color: '#000' }}>
                                Permitir
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
