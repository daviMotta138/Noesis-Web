import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, Trophy, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        /* Outer safe-area wrapper */
        <div className="fixed bottom-0 inset-x-0 z-50 flex justify-center"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>

            {/* ── Liquid Glass Pill ── */}
            <nav
                style={{
                    /* Glass body */
                    background: 'rgba(255, 255, 255, 0.07)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(180%)',

                    /* Capsule shape */
                    borderRadius: 9999,
                    padding: '6px 10px',

                    /* Layered border: top specular highlight + subtle outer ring */
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: `
                        /* Top specular shine */
                        inset 0 1.5px 0 rgba(255,255,255,0.22),
                        /* Bottom inner shadow */
                        inset 0 -1px 0 rgba(0,0,0,0.25),
                        /* Outer ambient shadow */
                        0 8px 32px rgba(0,0,0,0.55),
                        0 2px 8px rgba(0,0,0,0.35)
                    `,
                }}>

                {/* ── Inner frosted layer (adds depth) ── */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 9999,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 55%)',
                        pointerEvents: 'none',
                    }}
                />

                <div className="flex items-center gap-1 relative">
                    {TABS.map(({ path, icon: Icon, label }) => {
                        const active = pathname === path;
                        return (
                            <button
                                key={path}
                                onClick={() => navigate(path)}
                                className="relative flex flex-col items-center gap-1 transition-all duration-200"
                                style={{
                                    padding: '8px 18px',
                                    minWidth: 64,
                                    color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.42)',
                                }}
                            >
                                {/* Active bubble — liquid glass pill within pill */}
                                <AnimatePresence>
                                    {active && (
                                        <motion.div
                                            layoutId="nav-bubble"
                                            initial={{ opacity: 0, scale: 0.85 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.85 }}
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: 9999,
                                                /* Inner glass bubble */
                                                background: 'rgba(255,255,255,0.13)',
                                                border: '1px solid rgba(255,255,255,0.26)',
                                                boxShadow: `
                                                    inset 0 1.5px 0 rgba(255,255,255,0.30),
                                                    inset 0 -1px 0 rgba(0,0,0,0.15),
                                                    0 4px 16px rgba(0,0,0,0.3)
                                                `,
                                            }}
                                        />
                                    )}
                                </AnimatePresence>

                                {/* Icon */}
                                <div className="relative z-10">
                                    <Icon
                                        size={21}
                                        strokeWidth={active ? 2.2 : 1.6}
                                        style={{
                                            filter: active
                                                ? 'drop-shadow(0 0 8px rgba(255,255,255,0.45))'
                                                : 'none',
                                            transition: 'filter 0.2s, stroke-width 0.2s',
                                        }}
                                    />
                                </div>

                                {/* Label */}
                                <span
                                    className="relative z-10 leading-none"
                                    style={{
                                        fontSize: 10,
                                        fontWeight: active ? 700 : 500,
                                        letterSpacing: '0.04em',
                                        transition: 'font-weight 0.2s, color 0.2s',
                                    }}
                                >
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
