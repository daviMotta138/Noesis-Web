// src/components/Avatar2D.tsx — Inline SVG character, no external assets needed

export interface AvatarConfig {
    body: string; // body_01 | body_02 | body_03
    hair: string; // hair_short | hair_long | hair_curly | none
    shirt: string; // shirt_blue | shirt_red | shirt_purple | shirt_white
    accessory: string; // none | glasses_round | glasses_classic | crown_gold
    shoes: string; // shoes_white | shoes_black | shoes_sneaker
}

// ─── Color maps ──────────────────────────────────────────────────────────────
const SKIN: Record<string, { base: string; shadow: string; highlight: string }> = {
    body_01: { base: '#FDBCB4', shadow: '#E8967F', highlight: '#FFD5CC' },
    body_02: { base: '#C68642', shadow: '#A0522D', highlight: '#DDA070' },
    body_03: { base: '#4A2C17', shadow: '#321A0A', highlight: '#6B3A22' },
};

const SHIRT: Record<string, { main: string; shadow: string }> = {
    shirt_blue: { main: '#3B82F6', shadow: '#1D4ED8' },
    shirt_red: { main: '#EF4444', shadow: '#B91C1C' },
    shirt_purple: { main: '#8B5CF6', shadow: '#6D28D9' },
    shirt_white: { main: '#F1F5F9', shadow: '#CBD5E1' },
};

const HAIR: Record<string, { color: string; shadow: string }> = {
    hair_short: { color: '#3D2B1F', shadow: '#1A0F0A' },
    hair_long: { color: '#5C3D2E', shadow: '#2D1B12' },
    hair_curly: { color: '#F5A623', shadow: '#C47D0E' },
    none: { color: 'transparent', shadow: 'transparent' },
};

const SHOE: Record<string, string> = {
    shoes_white: '#F1F5F9',
    shoes_black: '#1E293B',
    shoes_sneaker: '#EF4444',
};

// ─── Accessory overlays ───────────────────────────────────────────────────────
function Glasses({ round }: { round: boolean }) {
    return (
        <g>
            <circle cx={round ? 37 : 36} cy={54} r={round ? 8 : 7} fill="none" stroke="#1E293B" strokeWidth="2.5" />
            <circle cx={round ? 63 : 64} cy={54} r={round ? 8 : 7} fill="none" stroke="#1E293B" strokeWidth="2.5" />
            <line x1={round ? 45 : 43} y1={54} x2={round ? 55 : 57} y2={54} stroke="#1E293B" strokeWidth="2.5" />
            {/* Arms */}
            <line x1={round ? 29 : 28} y1={54} x2="22" y2="56" stroke="#1E293B" strokeWidth="2" />
            <line x1={round ? 71 : 72} y1={54} x2="78" y2="56" stroke="#1E293B" strokeWidth="2" />
            {/* Lens tint */}
            <circle cx={round ? 37 : 36} cy={54} r={round ? 6.5 : 5.5} fill="rgba(148,163,184,0.3)" />
            <circle cx={round ? 63 : 64} cy={54} r={round ? 6.5 : 5.5} fill="rgba(148,163,184,0.3)" />
        </g>
    );
}

function Crown() {
    return (
        <g transform="translate(50,18)">
            <path d="M-18,-14 L-22,2 L-8,-6 L0,-20 L8,-6 L22,2 L18,-14 Z"
                fill="#D4A853" stroke="#C49333" strokeWidth="1" />
            <circle cx="-14" cy="-2" r="3" fill="#EF4444" />
            <circle cx="0" cy="-6" r="3" fill="#3B82F6" />
            <circle cx="14" cy="-2" r="3" fill="#10B981" />
        </g>
    );
}

// ─── Hair shapes ─────────────────────────────────────────────────────────────
function Hair({ type }: { type: string }) {
    const h = HAIR[type] ?? HAIR.hair_short;
    if (type === 'none') return null;
    if (type === 'hair_curly') return (
        <g>
            {/* Big curly mass */}
            <ellipse cx="50" cy="30" rx="27" ry="22" fill={h.color} />
            <circle cx="28" cy="34" r="10" fill={h.color} />
            <circle cx="72" cy="34" r="10" fill={h.color} />
            <circle cx="36" cy="22" r="9" fill={h.color} />
            <circle cx="64" cy="22" r="9" fill={h.color} />
            <circle cx="50" cy="16" r="10" fill={h.color} />
            {/* Shadow */}
            <ellipse cx="50" cy="35" rx="23" ry="8" fill={h.shadow} opacity="0.3" />
        </g>
    );
    if (type === 'hair_long') return (
        <g>
            {/* Top */}
            <ellipse cx="50" cy="30" rx="25" ry="20" fill={h.color} />
            {/* Side locks */}
            <rect x="24" y="40" width="10" height="55" rx="5" fill={h.color} />
            <rect x="66" y="40" width="10" height="55" rx="5" fill={h.color} />
            <ellipse cx="50" cy="32" rx="20" ry="6" fill={h.shadow} opacity="0.2" />
        </g>
    );
    // hair_short default
    return (
        <g>
            <ellipse cx="50" cy="30" rx="25" ry="20" fill={h.color} />
            {/* Part highlight */}
            <path d="M38,18 Q50,14 62,18" stroke={h.shadow} strokeWidth="2" fill="none" opacity="0.5" />
        </g>
    );
}

function getSkin(key: string) { return SKIN[key] ?? SKIN.body_01; }

// ─── Main Component ──────────────────────────────────────────────────────────
interface Avatar2DProps {
    config: AvatarConfig;
    size?: number;
    className?: string;
}

export const Avatar2D: React.FC<Avatar2DProps> = ({ config, size = 180, className = '' }) => {
    const skin = getSkin(config.body);
    const shirt = SHIRT[config.shirt] ?? SHIRT.shirt_blue;
    const shoe = SHOE[config.shoes] ?? SHOE.shoes_white;

    return (
        <svg
            width={size} height={size}
            viewBox="0 0 100 160"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Avatar"
        >
            {/* ── Hair (behind face) ── */}
            <Hair type={config.hair} />

            {/* ── Neck ── */}
            <rect x="43" y="75" width="14" height="14" rx="4" fill={skin.base} />

            {/* ── Face ── */}
            <ellipse cx="50" cy="50" rx="24" ry="28" fill={skin.base} />
            {/* Face shadow */}
            <ellipse cx="50" cy="62" rx="20" ry="8" fill={skin.shadow} opacity="0.15" />
            {/* Cheeks */}
            <circle cx="32" cy="56" r="6" fill={skin.shadow} opacity="0.15" />
            <circle cx="68" cy="56" r="6" fill={skin.shadow} opacity="0.15" />

            {/* Eyes */}
            <ellipse cx="37" cy="50" rx="4" ry="5" fill="white" />
            <ellipse cx="63" cy="50" rx="4" ry="5" fill="white" />
            <circle cx="37" cy="51" r="2.5" fill="#1E293B" />
            <circle cx="63" cy="51" r="2.5" fill="#1E293B" />
            {/* Eye shine */}
            <circle cx="38.2" cy="49.5" r="1" fill="white" />
            <circle cx="64.2" cy="49.5" r="1" fill="white" />
            {/* Eyebrows */}
            <path d="M32,43 Q37,40 42,43" stroke="#3D2B1F" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M58,43 Q63,40 68,43" stroke="#3D2B1F" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Mouth */}
            <path d="M44,64 Q50,70 56,64" stroke={skin.shadow} strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Nose */}
            <ellipse cx="50" cy="58" rx="2.5" ry="1.5" fill={skin.shadow} opacity="0.4" />

            {/* ── Accessory overlay on face ── */}
            {config.accessory === 'glasses_round' && <Glasses round={true} />}
            {config.accessory === 'glasses_classic' && <Glasses round={false} />}
            {config.accessory === 'crown_gold' && <Crown />}

            {/* ── Torso (shirt) ── */}
            <path d="M20,90 Q15,82 24,80 L34,78 Q42,88 50,88 Q58,88 66,78 L76,80 Q85,82 80,90 L78,130 L22,130 Z"
                fill={shirt.main} />
            {/* Shirt shadow */}
            <path d="M22,130 L78,130 L76,105 Q50,115 24,105 Z" fill={shirt.shadow} opacity="0.3" />
            {/* Collar */}
            <path d="M40,78 Q50,84 60,78 L56,88 Q50,91 44,88 Z" fill={skin.base} />

            {/* ── Arms ── */}
            {/* Left */}
            <path d="M22,92 Q12,100 14,115 L22,118 Q25,100 30,98 Z" fill={shirt.main} />
            <ellipse cx="16" cy="118" rx="6" ry="8" fill={skin.base} />
            {/* Right */}
            <path d="M78,92 Q88,100 86,115 L78,118 Q75,100 70,98 Z" fill={shirt.main} />
            <ellipse cx="84" cy="118" rx="6" ry="8" fill={skin.base} />

            {/* ── Legs ── */}
            <rect x="26" y="130" width="20" height="24" rx="4" fill="#1E293B" />
            <rect x="54" y="130" width="20" height="24" rx="4" fill="#1E293B" />
            {/* Belt */}
            <rect x="22" y="128" width="56" height="6" rx="2" fill="#0F172A" />
            <rect x="46" y="128" width="8" height="6" rx="1" fill={shirt.shadow} />

            {/* ── Shoes ── */}
            <ellipse cx="36" cy="155" rx="14" ry="6" fill={shoe} />
            <ellipse cx="64" cy="155" rx="14" ry="6" fill={shoe} />
            {/* Shoe shine */}
            <ellipse cx="32" cy="153" rx="5" ry="2" fill="white" opacity="0.2" />
            <ellipse cx="60" cy="153" rx="5" ry="2" fill="white" opacity="0.2" />
        </svg>
    );
};

import React from 'react';
export default Avatar2D;