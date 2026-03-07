// src/pages/AvatarPage.tsx — Fortnite-style avatar customization page

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar2D, DEFAULT_AVATAR_CONFIG } from '../components/Avatar2D';
import type { AvatarConfig } from '../components/Avatar2D';
import { useGameStore } from '../store/useGameStore';

// ─── Item catalogue ────────────────────────────────────────────────────────────

type Tab = 'outfit' | 'pants' | 'shirt' | 'footwear';

interface CatalogueItem {
    id: string;
    label: string;
    color?: string;          // swatch color
    emoji?: string;          // icon if no swatch
    owned: boolean;          // owned by default or purchased
    isDefault?: boolean;
}

const CATALOGUE: Record<Tab, CatalogueItem[]> = {
    outfit: [
        { id: 'man', label: 'Menino', emoji: '👦', owned: true, isDefault: true },
        { id: 'woman', label: 'Menina', emoji: '👧', owned: false },
    ],
    pants: [
        { id: 'calca-bege', label: 'Bege', color: '#C4A882', owned: true, isDefault: true },
        { id: 'calca-preta', label: 'Preta', color: '#2a2a2a', owned: true },
        // Future purchasable items:
        { id: 'calca-azul', label: 'Azul', color: '#3B82F6', owned: false },
        { id: 'calca-verde', label: 'Verde', color: '#22C55E', owned: false },
    ],
    shirt: [
        { id: 'camisa-branca', label: 'Branca', color: '#F0F0F0', owned: true, isDefault: true },
        { id: 'camisa-preta', label: 'Preta', color: '#2a2a2a', owned: true },
        { id: 'camisa-roxa', label: 'Roxa', color: '#A855F7', owned: false },
        { id: 'camisa-vermelha', label: 'Vermelha', color: '#EF4444', owned: false },
    ],
    footwear: [
        { id: 'chinelo', label: 'Chinelo', emoji: '🩴', owned: true, isDefault: true },
        { id: 'tenis', label: 'Tênis', emoji: '👟', owned: true },
        { id: 'none', label: 'Nenhum', emoji: '🦶', owned: true },
        { id: 'bota', label: 'Bota', emoji: '🥾', owned: false },
    ],
};

const TAB_LABELS: Record<Tab, string> = {
    outfit: 'Personagem',
    pants: 'Calça',
    shirt: 'Camisa',
    footwear: 'Calçado',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfigKey(tab: Tab): keyof AvatarConfig | null {
    if (tab === 'outfit') return 'gender';
    if (tab === 'pants') return 'pants';
    if (tab === 'shirt') return 'shirt';
    if (tab === 'footwear') return 'footwear';
    return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AvatarPage() {
    const { profile, updateProfile } = useGameStore();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('outfit');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const avatarConfig: AvatarConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        ...(profile?.avatar_config ?? {}),
    };
    const [draft, setDraft] = useState<AvatarConfig>(avatarConfig);

    const activeKey = getConfigKey(tab);
    const activeValue = activeKey ? draft[activeKey] : null;

    const selectItem = (item: CatalogueItem) => {
        if (!item.owned || !activeKey) return;
        // Footwear mutual exclusion is handled naturally via single-select
        setDraft(prev => ({
            ...prev,
            [activeKey]: item.id,
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        await updateProfile({ avatar_config: draft as any });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const items = CATALOGUE[tab];

    return (
        <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--color-bg)' }}>

            {/* ── Left panel: avatar preview ── */}
            <div className="relative flex flex-col items-center justify-end md:w-[40%]"
                style={{
                    minHeight: '38vh',
                    background: 'radial-gradient(ellipse at 50% 110%, rgba(168,85,247,0.18) 0%, transparent 70%)',
                    borderBottom: '1px solid var(--color-border)',
                }}>

                {/* Glow under feet */}
                <div
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-12 blur-3xl opacity-40"
                    style={{ background: '#A855F7' }}
                />

                {/* Page title */}
                <div className="absolute top-4 left-0 right-0 text-center">
                    <p className="text-[10px] tracking-[0.35em] uppercase font-bold"
                        style={{ color: 'rgba(192,132,252,0.7)' }}>
                        Meu Personagem
                    </p>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        Avatar
                    </h1>
                </div>

                {/* Full-body avatar */}
                <motion.div
                    key={JSON.stringify(draft)}
                    initial={{ scale: 0.96, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="mb-3">
                    <Avatar2D config={draft} mode="full" width={150} />
                </motion.div>
            </div>

            {/* ── Right panel: tabs + grid ── */}
            <div className="flex-1 flex flex-col">

                {/* Category tabs */}
                <div className="flex overflow-x-auto gap-1 px-4 pt-4 pb-3"
                    style={{ scrollbarWidth: 'none', borderBottom: '1px solid var(--color-border)' }}>
                    {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            style={{
                                background: tab === t
                                    ? 'rgba(168,85,247,0.2)'
                                    : 'var(--color-glass)',
                                color: tab === t ? '#C084FC' : 'var(--color-text-muted)',
                                border: tab === t
                                    ? '1px solid rgba(168,85,247,0.4)'
                                    : '1px solid transparent',
                            }}>
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>

                {/* Items grid */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    <div className="grid grid-cols-3 gap-3">
                        {items.map(item => {
                            const isSelected = activeValue === item.id;
                            const isLocked = !item.owned;

                            return (
                                <motion.button
                                    key={item.id}
                                    whileTap={{ scale: isLocked ? 1 : 0.95 }}
                                    onClick={() => selectItem(item)}
                                    disabled={isLocked}
                                    className="relative flex flex-col items-center justify-center gap-2 rounded-2xl py-5 transition-all"
                                    style={{
                                        background: isSelected
                                            ? 'rgba(168,85,247,0.2)'
                                            : isLocked
                                                ? 'rgba(255,255,255,0.02)'
                                                : 'var(--color-glass)',
                                        border: isSelected
                                            ? '2px solid #A855F7'
                                            : isLocked
                                                ? '2px solid rgba(255,255,255,0.05)'
                                                : '2px solid var(--color-border)',
                                        opacity: isLocked ? 0.5 : 1,
                                        boxShadow: isSelected
                                            ? '0 0 16px rgba(168,85,247,0.3)'
                                            : 'none',
                                    }}>

                                    {/* Color swatch or emoji */}
                                    {item.color ? (
                                        <div className="w-10 h-10 rounded-full border-2 flex-shrink-0"
                                            style={{
                                                background: item.color,
                                                borderColor: isSelected ? '#A855F7' : 'rgba(255,255,255,0.15)',
                                            }} />
                                    ) : (
                                        <span className="text-3xl">{item.emoji}</span>
                                    )}

                                    <span className="text-[10px] font-black uppercase tracking-wider"
                                        style={{ color: isSelected ? '#C084FC' : 'var(--color-text-sub)' }}>
                                        {item.label}
                                    </span>

                                    {/* Selected checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                                            style={{ background: '#A855F7' }}>
                                            <Check size={11} className="text-white" />
                                        </div>
                                    )}

                                    {/* Locked badge */}
                                    {isLocked && (
                                        <div className="absolute top-1.5 right-1.5">
                                            <ShoppingBag size={13} style={{ color: 'var(--color-text-muted)' }} />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom action bar */}
                <div className="px-4 py-4 flex gap-3"
                    style={{ borderTop: '1px solid var(--color-border)' }}>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex-1 py-3.5 rounded-2xl text-sm font-black transition-all"
                        style={{
                            background: 'var(--color-glass)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                        }}>
                        Voltar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-2 flex-grow-[2] py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all"
                        style={{
                            background: saved
                                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                                : 'linear-gradient(135deg, #7C3AED, #A855F7)',
                            color: '#fff',
                            boxShadow: '0 4px 20px rgba(168,85,247,0.35)',
                        }}>
                        {saving ? 'Salvando...' : saved ? <><Check size={15} /> Salvo!</> : 'Salvar Avatar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
