import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Avatar2D, DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '../components/Avatar2D';

const PANTS_OPTIONS = [
    { id: 'calca-bege' as const, label: 'Bege', image: '/avatars/man/calca-bege.png' },
    { id: 'calca-preta' as const, label: 'Preta', image: '/avatars/man/calca-preta.png' },
    { id: 'none' as const, label: 'Sem', isNone: true },
];

const SHIRT_OPTIONS = [
    { id: 'camisa-branca' as const, label: 'Branca', image: '/avatars/man/camisa-branca.png' },
    { id: 'camisa-preta' as const, label: 'Preta', image: '/avatars/man/camisa-preta.png' },
    { id: 'none' as const, label: 'Sem', isNone: true },
];

const FOOTWEAR_OPTIONS = [
    { id: 'chinelo' as const, label: 'Chinelo', image: '/avatars/man/chinelo.png' },
    { id: 'tenis' as const, label: 'Tênis', image: '/avatars/man/tenis.png' },
    { id: 'none' as const, label: 'Nenhum', isNone: true },
];

const HEADWEAR_OPTIONS = [
    { id: 'bone-azul' as const, label: 'Boné Azul', image: '/avatars/man/bone-azul.png' },
    { id: 'none' as const, label: 'Sem Boné', isNone: true },
];

const GENDER_OPTIONS = [
    { id: 'man' as const, label: 'Menino', image: '/avatars/man/boy.png', available: true },
    { id: 'woman' as const, label: 'Menina', emoji: '👧', available: false },
];

export default function AvatarPage() {
    const navigate = useNavigate();
    const { profile, updateProfile } = useGameStore();

    const [draft, setDraft] = useState<AvatarConfig>({
        ...DEFAULT_AVATAR_CONFIG,
        ...(profile?.avatar_config as Partial<AvatarConfig> || {}),
    });
    const [saving, setSaving] = useState(false);

    // Determines active sub-menu for mobile grid.
    const [activeTab, setActiveTab] = useState<'gender' | 'shirt' | 'pants' | 'footwear' | 'headwear'>('shirt');
    const scrollRef = useRef<HTMLDivElement>(null);

    const [flashKey, setFlashKey] = useState(0);

    const scrollTabs = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir === 'right' ? 150 : -150, behavior: 'smooth' });
        }
    };

    const set = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
        if (draft[key] !== val) {
            setDraft(prev => ({ ...prev, [key]: val }));
            setFlashKey(prev => prev + 1);
        }
    };

    const handleSave = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            await updateProfile({ avatar_config: draft as any });
            navigate(-1); // go back
        } catch (e) {
            console.error(e);
            setSaving(false);
        }
    };

    // Sub-components for options to keep render clean
    const ItemOption = ({ image, emoji, isNone, active, onClick, label, disabled = false }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl relative transition-all"
            style={{
                background: active && !disabled ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                border: active && !disabled ? '2px solid #A855F7' : '2px solid var(--color-border)',
                opacity: disabled ? 0.45 : 1,
                flex: '1 1 0px',
                minHeight: '110px'
            }}>
            <div className="flex-1 flex items-center justify-center w-full h-12 relative pointer-events-none">
                {isNone ? (
                    <span className="text-3xl opacity-30 drop-shadow-md">✖️</span>
                ) : image ? (
                    <img src={image} className="w-full h-full object-contain drop-shadow-md" alt={label} />
                ) : (
                    <span className="text-3xl drop-shadow-md">{emoji}</span>
                )}
            </div>
            <span className="text-xs font-bold truncate max-w-full px-1"
                style={{ color: active && !disabled ? '#C084FC' : 'var(--color-text-sub)' }}>
                {label}
            </span>
            {disabled && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex flex-col items-center justify-center gap-1 backdrop-blur-[1px]">
                    <AlertCircle size={14} className="text-yellow-400" />
                    <span className="text-[9px] uppercase tracking-wider font-black text-white/90">Em breve</span>
                </div>
            )}
        </button>
    );

    return (
        <div className="fixed inset-0 z-[999] bg-[#0A0A10] flex flex-col md:flex-row overflow-hidden text-white font-body">
            {/* ── Top Header (Mobile & Desktop) ── */}
            <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/80 to-transparent z-50 flex items-center justify-between px-6 pointer-events-none">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 pointer-events-auto"
                    style={{ background: 'var(--color-glass-strong)', border: '1px solid var(--color-border)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div className="flex bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md pointer-events-auto items-center gap-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <span className="text-sm font-black tracking-widest uppercase">Armário</span>
                </div>
                <div className="w-10"></div>{/* Spacer for centering */}
            </div>

            {/* ── Background Ambiance ── */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Subtle radial gradient behind avatar */}
                <div className="absolute top-[40%] md:top-1/2 left-1/2 md:left-1/3 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] md:w-[40vw] md:h-[40vw] rounded-full blur-[100px] opacity-20"
                    style={{ background: 'radial-gradient(circle, #A855F7, #3B82F6)' }} />
            </div>


            {/* ── Left/Top Area: Avatar Display ── */}
            <div className="flex-1 relative flex items-center justify-center pt-8 pb-32 md:pt-0 md:pb-0 overflow-hidden pointer-events-none">
                <motion.div layoutId="hero-avatar" className="h-[90%] md:h-[80%] max-h-[800px] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                    <Avatar2D config={draft} mode="full" className="w-auto transform-gpu relative z-10" style={{
                        height: `233%`,
                        transform: `translateY(0vh)`
                    }} />

                    {/* Blue Firefly Particle Transition */}
                    <AnimatePresence mode="wait">
                        <div key={flashKey} className="absolute inset-0 z-30 pointer-events-none overflow-hidden rounded-3xl">
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-blue-400 rounded-full"
                                    style={{
                                        left: `${10 + (Math.sin(i * 45) * 40 + 40)}%`, // Distribute roughly 10-90% width
                                        top: `${70 + (Math.cos(i * 12) * 20)}%`,   // Start near bottom
                                        boxShadow: '0 0 15px 4px rgba(96, 165, 250, 0.8)'
                                    }}
                                    initial={{ opacity: 0, scale: 0, y: 0 }}
                                    animate={{
                                        opacity: [0, 1, 0],
                                        scale: [0, 1.5, 0],
                                        y: -100 - (Math.abs(Math.sin(i)) * 150), // Fly upwards differently
                                        x: (Math.sin(i * 2) * 50) // Drift left or right slightly
                                    }}
                                    transition={{
                                        duration: 0.6 + (Math.abs(Math.cos(i)) * 0.4), // 0.6 - 1.0s fast burst
                                        ease: "easeOut",
                                        delay: Math.abs(Math.sin(i * 7)) * 0.1 // Staggered start 0-0.1s
                                    }}
                                />
                            ))}
                        </div>
                    </AnimatePresence>
                </motion.div>

                {/* Floor shadow */}
                <div className="absolute bottom-[20%] md:bottom-[10%] left-1/2 -translate-x-1/2 w-48 h-6 rounded-[100%] blur-[12px] opacity-80"
                    style={{ background: 'radial-gradient(ellipse, #A855F7 0%, transparent 70%)' }} />
            </div>

            {/* ── Right/Bottom Area: Customization Drawer ── */}
            <div className="w-full md:w-[400px] lg:w-[480px] h-1/2 md:h-full bg-black/60 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-[-20px_0_40px_rgba(0,0,0,0.5)] border-t md:border-l border-white/10 backdrop-blur-2xl flex flex-col pt-4 md:pt-24 relative z-40 rounded-t-[32px] md:rounded-l-[32px] overflow-hidden">

                {/* Handle (Mobile only) */}
                <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4 md:hidden" />

                <div className="flex-1 flex flex-col">
                    {/* Horizontal Option Tabs */}
                    <div className="relative mb-6">
                        {/* Left gradient/arrow indicator for scrolling back */}
                        <div
                            onClick={() => scrollTabs('left')}
                            className="absolute left-0 top-0 bottom-2 w-16 bg-gradient-to-r from-[#111]/90 to-transparent z-20 flex items-center justify-start pl-1 cursor-pointer"
                        >
                            <motion.div
                                animate={{ x: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <ChevronLeft className="text-white/60 w-5 h-5 drop-shadow-md" />
                            </motion.div>
                        </div>

                        <div ref={scrollRef} className="px-5 flex gap-2 overflow-x-auto pb-2 relative z-10" style={{ scrollbarWidth: 'none' }}>
                            {[
                                { id: 'gender', label: 'Personagem', emoji: '👦' },
                                { id: 'hair', label: 'Cabelo', emoji: '💇' },
                                { id: 'shirt', label: 'Superior', emoji: '👕' },
                                { id: 'pants', label: 'Inferior', emoji: '👖' },
                                { id: 'footwear', label: 'Calçados', emoji: '👟' },
                                { id: 'headwear', label: 'Acessórios', emoji: '🧢' },
                            ].map(t => (
                                <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                                    className="flex flex-col items-center justify-center p-3 rounded-2xl min-w-[80px] transition-all bg-white/5 whitespace-nowrap"
                                    style={{
                                        border: `1px solid ${activeTab === t.id ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)'}`,
                                        background: activeTab === t.id ? 'rgba(168,85,247,0.1)' : 'var(--color-glass)',
                                    }}>
                                    <span className="text-xl mb-1">{t.emoji}</span>
                                    <span className="text-[10px] uppercase tracking-wider font-bold"
                                        style={{ color: activeTab === t.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)' }}>
                                        {t.label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Right gradient/arrow indicator for scrolling forward */}
                        <div
                            onClick={() => scrollTabs('right')}
                            className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#111]/90 to-transparent z-20 flex items-center justify-end pr-1 cursor-pointer"
                        >
                            <motion.div
                                animate={{ x: [0, 5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            >
                                <ChevronRight className="text-white/60 w-5 h-5 drop-shadow-md" />
                            </motion.div>
                        </div>
                    </div>

                    {/* Content Area (Scrollable grid based on active tab) */}
                    <div className="flex-1 overflow-y-auto px-5 pb-32">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-2 lg:grid-cols-3 gap-3"
                            >
                                {activeTab === 'gender' && GENDER_OPTIONS.map(g => (
                                    <ItemOption key={g.id} id={g.id} image={(g as any).image} emoji={(g as any).emoji} label={g.label} active={draft.gender === g.id}
                                        disabled={!g.available} onClick={() => g.available && set('gender', 'man')} />
                                ))}

                                {activeTab === 'shirt' && SHIRT_OPTIONS.map(s => (
                                    <ItemOption key={s.id} id={s.id} image={(s as any).image} isNone={(s as any).isNone} label={s.label} active={draft.shirt === s.id}
                                        onClick={() => set('shirt', s.id)} />
                                ))}

                                {activeTab === 'pants' && PANTS_OPTIONS.map(p => (
                                    <ItemOption key={p.id} id={p.id} image={(p as any).image} isNone={(p as any).isNone} label={p.label} active={draft.pants === p.id}
                                        onClick={() => set('pants', p.id)} />
                                ))}

                                {activeTab === 'footwear' && FOOTWEAR_OPTIONS.map(f => (
                                    <ItemOption key={f.id} id={f.id} image={(f as any).image} isNone={(f as any).isNone} label={f.label} active={draft.footwear === f.id}
                                        onClick={() => set('footwear', f.id)} />
                                ))}

                                {activeTab === 'headwear' && HEADWEAR_OPTIONS.map(h => {
                                    // Only render if it's 'none' or exists in unlocked_items
                                    const isUnlocked = h.id === 'none' || (draft.unlocked_items || []).includes(h.id);
                                    if (!isUnlocked) return null;
                                    return (
                                        <ItemOption key={h.id} id={h.id} image={(h as any).image} isNone={(h as any).isNone} label={h.label} active={draft.headwear === h.id}
                                            onClick={() => set('headwear', h.id)} />
                                    );
                                })}

                                {activeTab === 'headwear' && (draft.unlocked_items || []).length === 0 && (
                                    <div className="col-span-2 lg:col-span-3 text-center py-8 opacity-50">
                                        <p className="text-sm font-bold tracking-widest uppercase mb-2">Sem chapéus desbloqueados</p>
                                        <p className="text-xs">Visite a Loja para adquirir novos itens!</p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Save Button sticky at bottom */}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black via-black/90 to-transparent">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{
                            background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                            boxShadow: '0 8px 30px rgba(168,85,247,0.4)',
                            opacity: saving ? 0.7 : 1
                        }}>
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Check size={18} />
                                Equipar Avatar
                            </>
                        )}
                    </button>
                </div>

            </div>

        </div>
    );
}
