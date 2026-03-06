// src/components/MemoryCard.tsx — Premium playing-card design
import { motion } from 'framer-motion';
import logoImg from '../assets/logo-vertical.png';

interface MemoryCardProps {
    word: string;
    isHidden: boolean;
    weeklyGlow?: boolean;    // purple neon state
    glowAnimating?: boolean; // beams incoming (pulse)
}

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS: Record<string, string> = { '♠': '#C8D8F0', '♥': '#F87171', '♦': '#F87171', '♣': '#C8D8F0' };

function getSuit(word: string) {
    return SUITS[word.charCodeAt(0) % 4];
}

function CardBack({ purple }: { purple?: boolean }) {
    const gold = purple ? '#A855F7' : '#D4A853';
    const goldAlpha = (a: number) => purple ? `rgba(168,85,247,${a})` : `rgba(212,168,83,${a})`;
    return (
        <div className="absolute inset-0 rounded-[18px] overflow-hidden"
            style={{
                background: purple
                    ? 'linear-gradient(145deg, #2D1B4E 0%, #1A0F32 100%)'
                    : 'linear-gradient(145deg, #1A1D30 0%, #0D0F1C 100%)',
                border: `2px solid ${gold}`,
                boxShadow: purple ? '0 0 24px rgba(168,85,247,0.6), 0 0 60px rgba(168,85,247,0.2)' : undefined,
            }}>
            <div className="absolute inset-[6px] rounded-[13px]"
                style={{ border: `1px solid ${goldAlpha(0.4)}` }} />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 88 128" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id={purple ? 'diamond-p' : 'diamond'} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                        <path d="M8,1 L15,8 L8,15 L1,8 Z" fill="none" stroke={goldAlpha(0.2)} strokeWidth="0.8" />
                        <circle cx="8" cy="8" r="1.5" fill={goldAlpha(0.2)} />
                    </pattern>
                </defs>
                <rect width="88" height="128" fill={`url(#${purple ? 'diamond-p' : 'diamond'})`} />
                <g transform="translate(44,64)">
                    <circle r="18" fill="none" stroke={goldAlpha(0.35)} strokeWidth="1" />
                    <circle r="12" fill="none" stroke={goldAlpha(0.25)} strokeWidth="1" />
                    <path d="M0,-14 L4,-4 L14,-4 L6,2 L10,12 L0,6 L-10,12 L-6,2 L-14,-4 L-4,-4 Z"
                        fill={goldAlpha(0.4)} />
                </g>
                {[[8, 8], [80, 8], [8, 120], [80, 120]].map(([x, y], i) => (
                    <g key={i} transform={`translate(${x},${y})`}>
                        <path d="M0,-6 L2,-2 L6,-2 L3,1 L4,5 L0,3 L-4,5 L-3,1 L-6,-2 L-2,-2 Z"
                            fill={goldAlpha(0.5)} />
                    </g>
                ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 px-2">
                <img src={logoImg} className="h-3 w-auto object-contain opacity-60" alt="NOESIS"
                    style={{ filter: purple ? 'hue-rotate(60deg) saturate(2)' : undefined }} />
            </div>
        </div>
    );
}

export const MemoryCard = ({ word, isHidden, weeklyGlow = false, glowAnimating = false }: MemoryCardProps) => {
    const suit = getSuit(word);
    const suitColor = SUIT_COLORS[suit];
    const isBlue = suitColor === '#C8D8F0';

    return (
        <div className="perspective-1000 w-[88px] h-[128px] select-none">
            <motion.div
                animate={{ rotateY: isHidden ? 180 : 0 }}
                transition={{ duration: 0.6, type: 'spring', stiffness: 80, damping: 16 }}
                className="relative w-full h-full preserve-3d"
                style={{
                    transformStyle: 'preserve-3d',
                    filter: weeklyGlow && !isHidden
                        ? 'drop-shadow(0 0 12px rgba(168,85,247,0.9)) drop-shadow(0 0 28px rgba(168,85,247,0.5))'
                        : glowAnimating && !isHidden
                            ? 'drop-shadow(0 0 6px rgba(168,85,247,0.5))'
                            : undefined,
                }}
            >
                {/* ── Front: word visible ── */}
                <div className="backface-hidden absolute inset-0 rounded-[18px] overflow-hidden"
                    style={{
                        backfaceVisibility: 'hidden',
                        background: weeklyGlow && !isHidden
                            ? 'linear-gradient(160deg, #EDE9FF 0%, #D8CFFF 100%)'
                            : 'linear-gradient(160deg, #FAFBFF 0%, #EEF0FF 100%)',
                        border: `2px solid ${weeklyGlow && !isHidden ? '#A855F7' : '#D4A853'}`,
                        boxShadow: weeklyGlow && !isHidden
                            ? '0 4px 20px rgba(168,85,247,0.4), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(168,85,247,0.3)'
                            : '0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.9)',
                        transition: 'all 0.6s ease',
                    }}>
                    <div className="absolute inset-[5px] rounded-[13px]"
                        style={{ border: `1px solid ${weeklyGlow && !isHidden ? 'rgba(168,85,247,0.35)' : 'rgba(212,168,83,0.35)'}` }} />

                    {/* Top-left corner */}
                    <div className="absolute top-2 left-2.5 flex flex-col items-center leading-none">
                        <span className="text-[11px] font-black"
                            style={{ color: weeklyGlow && !isHidden ? '#5B0FA0' : '#1A1D30' }}>N</span>
                        <span className="text-[9px]"
                            style={{ color: weeklyGlow && !isHidden ? '#A855F7' : (isBlue ? '#2D3A8C' : '#DC2626') }}>{suit}</span>
                    </div>
                    {/* Bottom-right (rotated) */}
                    <div className="absolute bottom-2 right-2.5 flex flex-col items-center leading-none" style={{ transform: 'rotate(180deg)' }}>
                        <span className="text-[11px] font-black"
                            style={{ color: weeklyGlow && !isHidden ? '#5B0FA0' : '#1A1D30' }}>N</span>
                        <span className="text-[9px]"
                            style={{ color: weeklyGlow && !isHidden ? '#A855F7' : (isBlue ? '#2D3A8C' : '#DC2626') }}>{suit}</span>
                    </div>

                    {/* Center word */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2">
                        <span className="text-[11px] font-black text-center leading-tight"
                            style={{
                                color: weeklyGlow && !isHidden ? '#3B0764' : '#0D0F1C',
                                letterSpacing: '-0.01em', wordBreak: 'break-word',
                            }}>
                            {word}
                        </span>
                        <span className="text-base"
                            style={{ color: weeklyGlow && !isHidden ? '#A855F7' : (isBlue ? '#2D3A8C' : '#DC2626') }}>{suit}</span>
                    </div>
                </div>

                {/* ── Back: ornamental design ── */}
                <div className="backface-hidden absolute inset-0"
                    style={{
                        backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
                        boxShadow: weeklyGlow
                            ? '0 4px 20px rgba(168,85,247,0.5), 0 0 0 1px rgba(168,85,247,0.4)'
                            : '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,83,0.3)',
                    }}>
                    <CardBack purple={weeklyGlow} />
                </div>
            </motion.div>
        </div>
    );
};

export default MemoryCard;