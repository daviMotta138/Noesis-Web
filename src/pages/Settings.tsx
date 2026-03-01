// src/pages/Settings.tsx
import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Volume2, Music, Bell, Moon, Sun, FileText, Info, LogOut, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { supabase } from '../lib/supabase';

export default function SettingsPage() {
    const navigate = useNavigate();
    const { soundEnabled, setSoundEnabled, musicEnabled, setMusicEnabled, notificationsEnabled, setNotificationsEnabled, setUser, setProfile } = useGameStore();

    // Local state for theme, syncing with localStorage
    const [isLight, setIsLight] = useState(() => localStorage.getItem('theme') === 'light');

    useEffect(() => {
        if (isLight) {
            document.documentElement.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light');
            localStorage.setItem('theme', 'dark');
        }
    }, [isLight]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        navigate('/login');
    };

    const handleTogglePush = async () => {
        console.log("Iniciando assinatura Push...");
        if (!notificationsEnabled) {
            if ('Notification' in window) {
                const perm = await Notification.requestPermission();
                if (perm === 'granted' && 'serviceWorker' in navigator) {
                    try {
                        const registration = await navigator.serviceWorker.register('/sw.js');
                        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

                        if (!vapidKey) {
                            console.error("ERRO FATAL: VITE_VAPID_PUBLIC_KEY não está acessível no front-end!");
                            return;
                        }

                        console.log(`Registrando Service Worker... Vapid OK`);
                        const subscription = await registration.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: vapidKey
                        });
                        const subJson = subscription.toJSON();

                        // Save safely
                        const { data: userData } = await supabase.auth.getUser();
                        const userId = userData?.user?.id;

                        if (subJson.endpoint && subJson.keys && userId) {
                            const { data: insertedData, error: upsertErr } = await supabase.from('push_subscriptions').upsert({
                                user_id: userId,
                                endpoint: subJson.endpoint,
                                auth_key: subJson.keys.auth,
                                p256dh_key: subJson.keys.p256dh
                            }, { onConflict: 'endpoint' }).select();

                            if (upsertErr) {
                                console.error("Falhou ao salvar Banco de Dados (ERRO):", upsertErr.message);
                            } else if (!insertedData || insertedData.length === 0) {
                                console.warn("Falhou silenciosamente (RLS block). Nenhuma linha inserida.");
                            } else {
                                console.log("Inscrição salva com sucesso no banco real!");
                            }
                        } else {
                            console.warn("Dados incompletos! Endpoint:", !!subJson.endpoint, "| userId:", userId);
                        }
                    } catch (err: any) {
                        console.error('Failed to subscribe:', err);
                    }
                } else if (perm === 'denied') {
                    console.warn('As notificações estão bloqueadas no navegador!');
                    return;
                } else {
                    console.warn('Permissão não foi concedida:', perm);
                }
            } else {
                console.warn('Navegador não suporta Push API');
            }
            setNotificationsEnabled(true);
        } else {
            setNotificationsEnabled(false);
        }
    };

    const ToggleSwitch = ({ label, icon: Icon, enabled, onToggle, color = 'var(--color-gold)' }: any) => (
        <div className="flex items-center justify-between p-4 rounded-2xl transition-all"
            style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-card)', color: 'var(--color-text-muted)' }}>
                    <Icon size={16} />
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{label}</span>
            </div>
            <button
                onClick={onToggle}
                className={`w-11 h-6 rounded-full flex items-center px-1 transition-colors ${enabled ? 'bg-opacity-100' : 'bg-gray-700'}`}
                style={{ backgroundColor: enabled ? color : '' }}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    const LinkButton = ({ label, icon: Icon, onClick, danger = false }: any) => (
        <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl transition-all group hover:opacity-80"
            style={{
                background: danger ? 'rgba(248,113,113,0.05)' : 'var(--color-glass)',
                border: danger ? '1px solid rgba(248,113,113,0.2)' : '1px solid var(--color-border)',
                color: danger ? 'var(--color-danger)' : 'var(--color-text)'
            }}>
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: danger ? 'rgba(248,113,113,0.1)' : 'var(--color-card)', color: danger ? 'inherit' : 'var(--color-text-muted)' }}>
                    <Icon size={16} />
                </div>
                <span className="text-sm font-bold">{label}</span>
            </div>
            {!danger && <ChevronLeft size={16} className="rotate-180 opacity-40 group-hover:opacity-100 transition-opacity" />}
        </button>
    );

    return (
        <div className="max-w-md mx-auto space-y-6 pb-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--color-gold-dim), var(--color-gold))', color: '#0D0F1C' }}>
                    <SettingsIcon size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-display text-gradient-gold">Ajustes</h1>
                    <p className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>Configure sua experiência no app</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest pl-2 mb-2" style={{ color: 'var(--color-text-muted)' }}>Preferências</p>
                    <div className="space-y-2">
                        <ToggleSwitch label="Efeitos Sonoros" icon={Volume2} enabled={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
                        <ToggleSwitch label="Música de Fundo" icon={Music} enabled={musicEnabled} onToggle={() => setMusicEnabled(!musicEnabled)} />
                        <ToggleSwitch label="Alertas Push" icon={Bell} enabled={notificationsEnabled} onToggle={handleTogglePush} color="#818cf8" />
                        <ToggleSwitch label="Modo Claro" icon={isLight ? Sun : Moon} enabled={isLight} onToggle={() => setIsLight(!isLight)} color="#fbbf24" />
                    </div>
                </div>

                <div className="pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest pl-2 mb-2" style={{ color: 'var(--color-text-muted)' }}>Sobre</p>
                    <div className="space-y-2">
                        <LinkButton label="Termos de Uso" icon={FileText} onClick={() => alert('Em breve: Termos de Uso do Noesis.')} />
                        <LinkButton label="Informações do App" icon={Info} onClick={() => alert('App: Palácio da Memória\nVersão: 3.0.0 (Phase 5)\nDesenvolvido com ❤️')} />
                    </div>
                </div>

                <div className="pt-4">
                    <LinkButton label="Sair da Conta" icon={LogOut} onClick={handleLogout} danger />
                </div>
            </div>

            <div className="text-center pt-8 opacity-50">
                <p className="text-[10px] tracking-widest font-mono" style={{ color: 'var(--color-text-muted)' }}>NOESIS © {new Date().getFullYear()}</p>
            </div>
        </div>
    );
}
