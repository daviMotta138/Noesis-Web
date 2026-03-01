import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Trophy, User } from 'lucide-react';

const TABS = [
    { path: '/', icon: Home, label: 'Início' },
    { path: '/ranking', icon: Trophy, label: 'Ranking' },
    { path: '/shop', icon: ShoppingBag, label: 'Loja' },
    { path: '/profile', icon: User, label: 'Perfil' },
];

export default function BottomNav() {
    const navigate = useNavigate();
    const { pathname } = useLocation();

    return (
        <nav className="fixed bottom-0 inset-x-0 z-50"
            style={{
                background: 'rgba(13,15,28,0.96)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
            }}>
            <div className="flex items-center justify-around max-w-lg mx-auto px-2">
                {TABS.map(({ path, icon: Icon, label }) => {
                    const active = pathname === path;
                    return (
                        <button key={path} onClick={() => navigate(path)}
                            className="flex flex-col items-center gap-1.5 py-3 px-4 flex-1 transition-all duration-200"
                            style={{ color: active ? 'var(--color-gold)' : 'var(--color-text-muted)' }}>
                            <div className="relative">
                                {active && (
                                    <div className="absolute -inset-2 rounded-xl"
                                        style={{ background: 'var(--color-gold-soft)' }} />
                                )}
                                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} className="relative"
                                    style={{ filter: active ? 'drop-shadow(0 0 6px rgba(212,168,83,0.6))' : 'none' }} />
                            </div>
                            <span className="text-[10px] font-semibold tracking-wide">{label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
