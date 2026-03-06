import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface TimerProps {
    targetTimestamp: number;
    onFinish?: () => void;
    size?: number;
    className?: string;
    purple?: boolean;
}

function getSecondsLeft(ts: number) { return Math.max(0, Math.floor((ts - Date.now()) / 1000)); }

function pad(n: number) { return String(n).padStart(2, '0'); }

function formatTime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return { h: pad(h), m: pad(m), s: pad(sec) };
}

export const Timer: React.FC<TimerProps> = ({ targetTimestamp, onFinish, size = 200, className = '', purple = false }) => {
    const TOTAL = 24 * 3600;
    const [left, setLeft] = useState(() => getSecondsLeft(targetTimestamp));
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const doneRef = useRef(false);
    const clearTimer = useCallback(() => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } }, []);

    useEffect(() => {
        doneRef.current = false;
        setLeft(getSecondsLeft(targetTimestamp));
        intervalRef.current = setInterval(() => {
            const l = getSecondsLeft(targetTimestamp);
            setLeft(l);
            if (l <= 0 && !doneRef.current) { doneRef.current = true; clearTimer(); onFinish?.(); }
        }, 1000);
        return clearTimer;
    }, [targetTimestamp, onFinish, clearTimer]);

    const { h, m, s } = formatTime(left);
    const ratio = Math.min(1, left / TOTAL);
    const cx = size / 2, cy = size / 2;
    const r = size * 0.44;
    const circ = 2 * Math.PI * r;
    const dash = `${circ * ratio} ${circ * (1 - ratio)}`;

    // Arc color: purple mode or gold→orange→red
    const arcColor = purple ? '#A855F7'
        : ratio > 0.3 ? '#D4A853' : ratio > 0.1 ? '#F97316' : '#EF4444';
    const arcGlow = purple ? 'rgba(168,85,247,0.6)'
        : ratio > 0.3 ? 'rgba(212,168,83,0.5)' : ratio > 0.1 ? 'rgba(249,115,22,0.5)' : 'rgba(239,68,68,0.5)';

    return (
        <div className={`inline-flex flex-col items-center ${className}`}>
            <div style={{ position: 'relative', width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Outer decorative ring */}
                    <circle cx={cx} cy={cy} r={r + size * 0.05} fill="none"
                        stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                    {/* Track */}
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke="rgba(255,255,255,0.06)" strokeWidth={size * 0.07} />
                    {/* Progress arc */}
                    <circle cx={cx} cy={cy} r={r} fill="none"
                        stroke={arcColor} strokeWidth={size * 0.07}
                        strokeDasharray={dash} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        style={{
                            transition: 'stroke-dasharray 1s ease, stroke 2s ease',
                            filter: `drop-shadow(0 0 ${size * 0.03}px ${arcGlow})`,
                        }}
                    />
                    {/* Inner glow ring */}
                    <circle cx={cx} cy={cy} r={r - size * 0.07} fill="none"
                        stroke={arcColor} strokeWidth={1} opacity={0.08} />
                </svg>

                {/* Digital display */}
                <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        {[h, m, s].map((unit, i) => (
                            <React.Fragment key={i}>
                                <div style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: size * 0.04,
                                    padding: `${size * 0.015}px ${size * 0.015}px`,
                                    fontFamily: "'Outfit', monospace",
                                    fontSize: size * 0.09,
                                    fontWeight: 800,
                                    color: arcColor,
                                    minWidth: size * 0.15,
                                    textAlign: 'center' as const,
                                    lineHeight: 1.1,
                                    textShadow: `0 0 12px ${arcGlow}`,
                                    letterSpacing: '-0.02em',
                                }}>
                                    {unit}
                                </div>
                                {i < 2 && (
                                    <span style={{ fontSize: size * 0.08, fontWeight: 800, color: arcColor, opacity: 0.5, lineHeight: 1 }}>:</span>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                    <p style={{
                        fontSize: size * 0.05,
                        color: 'var(--color-text-muted)',
                        fontWeight: 600,
                        letterSpacing: 2,
                        textTransform: 'uppercase' as const,
                        marginTop: size * 0.02
                    }}>
                        {left <= 0 ? '✓ Pronto!' : 'h  ·  min  ·  seg'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Timer;
