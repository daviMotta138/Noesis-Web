import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { Avatar2D, DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '../components/Avatar2D';

const PANTS_OPTIONS = [
    { id: 'calca-bege' as const, label: 'Bege', color: '#C4A882' },
    { id: 'calca-preta' as const, label: 'Preta', color: '#1E1E1E' },
    { id: 'none' as const, label: 'Sem', color: 'transparent' },
];

const SHIRT_OPTIONS = [
    { id: 'camisa-branca' as const, label: 'Branca', color: '#F0F0F0' },
    { id: 'camisa-preta' as const, label: 'Preta', color: '#1E1E1E' },
    { id: 'none' as const, label: 'Sem', color: 'transparent' },
];

const FOOTWEAR_OPTIONS = [
    { id: 'chinelo' as const, label: 'Chinelo', emoji: '🩴' },
    { id: 'tenis' as const, label: 'Tênis', emoji: '👟' },
    { id: 'none' as const, label: 'Nenhum', emoji: '🦶' },
];

const HEADWEAR_OPTIONS = [
    { id: 'bone-azul' as const, label: 'Boné Azul', emoji: '🧢' },
    { id: 'none' as const, label: 'Sem Boné', emoji: '✖️' },
];

const GENDER_OPTIONS = [
    { id: 'man' as const, label: 'Menino', emoji: '👦', available: true },
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

    const set = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
        setDraft(prev => ({ ...prev, [key]: val }));
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
    const ColorSwatch = ({ color, active, onClick, label, id }: any) => (
        <button
            onClick={onClick}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all"
            style={{
                background: active ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                border: active ? '2px solid #A855F7' : '2px solid var(--color-border)',
                flex: '1 1 0px',
            }}>
            <div className="w-8 h-8 rounded-full border-2"
                style={{
                    background: color,
                    borderColor: id === 'camisa-branca' ? '#888' : active ? '#A855F7' : 'var(--color-border)'
                }} />
            <span className="text-xs font-bold truncate max-w-full px-1"
                style={{ color: active ? '#C084FC' : 'var(--color-text-sub)' }}>
                {label}
            </span>
        </button>
    );

    const EmojiOption = ({ emoji, active, onClick, label, disabled = false }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl relative transition-all"
            style={{
                background: active && !disabled ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                border: active && !disabled ? '2px solid #A855F7' : '2px solid var(--color-border)',
                opacity: disabled ? 0.45 : 1,
                flex: '1 1 0px',
            }}>
            <span className="text-3xl drop-shadow-md">{emoji}</span>
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
            <div className="flex-1 relative flex items-center justify-center pt-8 pb-32 md:pt-0 md:pb-0 overflow-hidden">
                <Avatar2D config={draft} mode="full" className="h-[90%] md:h-[80%] max-h-[800px] w-auto drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" />

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
                    <div className="px-5 mb-6 flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                        {[
                            { id: 'gender', label: 'Personagem', emoji: '👦' },
                            { id: 'shirt', label: 'Camisa', emoji: '👕' },
                            { id: 'pants', label: 'Calça', emoji: '👖' },
                            { id: 'footwear', label: 'Calçado', emoji: '👟' },
                            { id: 'headwear', label: 'Chapéu', emoji: '🧢' },
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
                                    <EmojiOption key={g.id} id={g.id} emoji={g.emoji} label={g.label} active={draft.gender === g.id}
                                        disabled={!g.available} onClick={() => g.available && set('gender', 'man')} />
                                ))}

                                {activeTab === 'shirt' && SHIRT_OPTIONS.map(s => (
                                    <ColorSwatch key={s.id} id={s.id} color={s.color} label={s.label} active={draft.shirt === s.id}
                                        onClick={() => set('shirt', s.id)} />
                                ))}

                                {activeTab === 'pants' && PANTS_OPTIONS.map(p => (
                                    <ColorSwatch key={p.id} id={p.id} color={p.color} label={p.label} active={draft.pants === p.id}
                                        onClick={() => set('pants', p.id)} />
                                ))}

                                {activeTab === 'footwear' && FOOTWEAR_OPTIONS.map(f => (
                                    <EmojiOption key={f.id} id={f.id} emoji={f.emoji} label={f.label} active={draft.footwear === f.id}
                                        onClick={() => set('footwear', f.id)} />
                                ))}

                                {activeTab === 'headwear' && HEADWEAR_OPTIONS.map(h => {
                                    // Only render if it's 'none' or exists in unlocked_items
                                    const isUnlocked = h.id === 'none' || (draft.unlocked_items || []).includes(h.id);
                                    if (!isUnlocked) return null;
                                    return (
                                        <EmojiOption key={h.id} id={h.id} emoji={h.emoji} label={h.label} active={draft.headwear === h.id}
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
