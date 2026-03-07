// src/components/AvatarEditor.tsx — Bottom-sheet avatar customizer

import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { Avatar2D, DEFAULT_AVATAR_CONFIG } from './Avatar2D';
import type { AvatarConfig } from './Avatar2D';

interface AvatarEditorProps {
    open: boolean;
    current: AvatarConfig;
    onSave: (cfg: AvatarConfig) => void;
    onClose: () => void;
}

const PANTS_OPTIONS = [
    { id: 'calca-bege' as const, label: 'Bege', color: '#C4A882' },
    { id: 'calca-preta' as const, label: 'Preta', color: '#1E1E1E' },
];

const SHIRT_OPTIONS = [
    { id: 'camisa-branca' as const, label: 'Branca', color: '#F0F0F0' },
    { id: 'camisa-preta' as const, label: 'Preta', color: '#1E1E1E' },
];

const FOOTWEAR_OPTIONS = [
    { id: 'chinelo' as const, label: 'Chinelo', emoji: '🩴' },
    { id: 'tenis' as const, label: 'Tênis', emoji: '👟' },
    { id: 'none' as const, label: 'Nenhum', emoji: '🦶' },
];

const GENDER_OPTIONS = [
    { id: 'man' as const, label: 'Menino', emoji: '👦', available: true },
    { id: 'woman' as const, label: 'Menina', emoji: '👧', available: false },
];

export function AvatarEditor({ open, current, onSave, onClose }: AvatarEditorProps) {
    const [draft, setDraft] = useState<AvatarConfig>({ ...DEFAULT_AVATAR_CONFIG, ...current });

    const set = <K extends keyof AvatarConfig>(key: K, val: AvatarConfig[K]) => {
        setDraft(prev => {
            const next = { ...prev, [key]: val };
            // Footwear mutual exclusion: resetting if same type is re-clicked is handled by the button logic
            return next;
        });
    };

    const handleSave = () => {
        onSave(draft);
        onClose();
    };

    const SectionLabel = ({ children }: { children: ReactNode }) => (
        <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-3"
            style={{ color: 'var(--color-text-muted)' }}>
            {children}
        </p>
    );

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-[200] flex items-end"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                    onClick={onClose}>

                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                        className="w-full max-h-[90vh] overflow-y-auto"
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: '28px 28px 0 0',
                            borderTop: '1px solid var(--color-border-glow)',
                        }}
                        onClick={e => e.stopPropagation()}>

                        {/* Handle bar */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3">
                            <h2 className="text-lg font-black" style={{ color: 'var(--color-text)' }}>
                                Personalizar Avatar
                            </h2>
                            <button onClick={onClose}
                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                                <X size={16} style={{ color: 'var(--color-text-muted)' }} />
                            </button>
                        </div>

                        {/* Live preview */}
                        <div className="flex justify-center items-end py-4"
                            style={{ background: 'linear-gradient(to bottom, rgba(168,85,247,0.05), transparent)' }}>
                            <Avatar2D config={draft} mode="full" width={120} />
                        </div>

                        <div className="px-5 pb-8 space-y-6">
                            {/* Gender */}
                            <div>
                                <SectionLabel>Personagem</SectionLabel>
                                <div className="flex gap-3">
                                    {GENDER_OPTIONS.map(g => (
                                        <button key={g.id}
                                            disabled={!g.available}
                                            onClick={() => g.available && set('gender', 'man')}
                                            className="flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 relative transition-all"
                                            style={{
                                                background: draft.gender === g.id && g.available
                                                    ? 'rgba(168,85,247,0.15)'
                                                    : 'var(--color-glass)',
                                                border: draft.gender === g.id && g.available
                                                    ? '2px solid #A855F7'
                                                    : '2px solid var(--color-border)',
                                                opacity: g.available ? 1 : 0.45,
                                            }}>
                                            <span className="text-2xl">{g.emoji}</span>
                                            <span className="text-xs font-bold"
                                                style={{ color: 'var(--color-text-sub)' }}>
                                                {g.label}
                                            </span>
                                            {!g.available && (
                                                <span className="absolute top-1.5 right-1.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                                                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)' }}>
                                                    Em breve
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Pants */}
                            <div>
                                <SectionLabel>Calça</SectionLabel>
                                <div className="flex gap-3">
                                    {PANTS_OPTIONS.map(p => {
                                        const active = draft.pants === p.id;
                                        return (
                                            <button key={p.id}
                                                onClick={() => set('pants', p.id)}
                                                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                                                style={{
                                                    background: active ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                                                    border: active ? '2px solid #A855F7' : '2px solid var(--color-border)',
                                                }}>
                                                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                                                    style={{ background: p.color, borderColor: active ? '#A855F7' : 'var(--color-border)' }} />
                                                <span className="text-sm font-bold"
                                                    style={{ color: active ? '#C084FC' : 'var(--color-text-sub)' }}>
                                                    {p.label}
                                                </span>
                                                {active && <Check size={14} style={{ color: '#A855F7' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Shirt */}
                            <div>
                                <SectionLabel>Camisa</SectionLabel>
                                <div className="flex gap-3">
                                    {SHIRT_OPTIONS.map(s => {
                                        const active = draft.shirt === s.id;
                                        return (
                                            <button key={s.id}
                                                onClick={() => set('shirt', s.id)}
                                                className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
                                                style={{
                                                    background: active ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                                                    border: active ? '2px solid #A855F7' : '2px solid var(--color-border)',
                                                }}>
                                                <div className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                                                    style={{
                                                        background: s.color,
                                                        borderColor: s.id === 'camisa-branca' ? '#888' : active ? '#A855F7' : 'var(--color-border)'
                                                    }} />
                                                <span className="text-sm font-bold"
                                                    style={{ color: active ? '#C084FC' : 'var(--color-text-sub)' }}>
                                                    {s.label}
                                                </span>
                                                {active && <Check size={14} style={{ color: '#A855F7' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footwear */}
                            <div>
                                <SectionLabel>Calçado</SectionLabel>
                                <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                                    Escolha apenas um tipo de calçado
                                </p>
                                <div className="flex gap-3">
                                    {FOOTWEAR_OPTIONS.map(f => {
                                        const active = draft.footwear === f.id;
                                        return (
                                            <button key={f.id}
                                                onClick={() => set('footwear', f.id)}
                                                className="flex-1 py-3 rounded-2xl flex flex-col items-center gap-1 transition-all"
                                                style={{
                                                    background: active ? 'rgba(168,85,247,0.15)' : 'var(--color-glass)',
                                                    border: active ? '2px solid #A855F7' : '2px solid var(--color-border)',
                                                }}>
                                                <span className="text-xl">{f.emoji}</span>
                                                <span className="text-xs font-bold"
                                                    style={{ color: active ? '#C084FC' : 'var(--color-text-sub)' }}>
                                                    {f.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Save button */}
                            <button onClick={handleSave}
                                className="w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2"
                                style={{
                                    background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
                                    color: '#fff',
                                    boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
                                }}>
                                <Check size={16} />
                                Salvar Avatar
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
export default AvatarEditor;
