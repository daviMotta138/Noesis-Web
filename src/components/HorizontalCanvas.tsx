// src/components/HorizontalCanvas.tsx
// Drag: direct DOM style.transform (no React re-renders, no JS animation frame)
// Snap: CSS transition (GPU-accelerated, off the JS thread)
import { useRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const CANVAS_ROUTES = ['/', '/ranking', '/profile'] as const;
export type CanvasRoute = typeof CANVAS_ROUTES[number];

const DIRECTION_THRESHOLD = 12; // px before direction lock
const SNAP_VELOCITY = 300;       // px/s
const SNAP_DISTANCE = 0.32;      // fraction of screen width

function getRouteIndex(path: string): number {
    const idx = CANVAS_ROUTES.findIndex(r => r === path);
    return idx >= 0 ? idx : 0;
}

interface HorizontalCanvasProps {
    children: React.ReactNode[];
}

export default function HorizontalCanvas({ children }: HorizontalCanvasProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const stripRef = useRef<HTMLDivElement>(null);    // the moving strip
    const [activeIdx, setActiveIdx] = useState(() => getRouteIndex(location.pathname));
    const W = window.innerWidth;

    // Refs so native handlers always see latest values without re-attaching
    const activeIdxRef = useRef(activeIdx);
    const navigateRef = useRef(navigate);
    const snapToRef = useRef<(idx: number) => void>(() => { });
    const gestureRef = useRef<{
        startX: number; startY: number;
        locked: 'none' | 'horizontal' | 'vertical';
        isEdgeSwipe: boolean; t0: number;
    } | null>(null);

    useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    // ── Direct DOM helpers (no React, no Framer Motion) ──────────────────────
    const setStrip = (px: number, animated: boolean) => {
        const el = stripRef.current;
        if (!el) return;
        el.style.transition = animated ? 'transform 0.26s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none';
        el.style.transform = `translate3d(${px}px,0,0)`;
    };

    // Sync on external route change (e.g. bottom nav)
    useEffect(() => {
        const idx = getRouteIndex(location.pathname);
        if (idx !== activeIdxRef.current) {
            setActiveIdx(idx);
            activeIdxRef.current = idx;
            setStrip(-idx * W, true);
        }
    }, [location.pathname]);

    const snapTo = (idx: number) => {
        const c = Math.max(0, Math.min(CANVAS_ROUTES.length - 1, idx));
        setActiveIdx(c);
        activeIdxRef.current = c;
        setStrip(-c * W, true); // CSS transition — no JS animation loop
        navigateRef.current(CANVAS_ROUTES[c], { replace: true });
    };
    snapToRef.current = snapTo;

    // ── Native touch listeners ────────────────────────────────────────────────
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // Set initial position imperatively (avoids a flash)
        setStrip(-activeIdxRef.current * W, false);

        const onStart = (e: TouchEvent) => {
            const t = e.touches[0];
            gestureRef.current = {
                startX: t.clientX, startY: t.clientY,
                locked: 'none',
                isEdgeSwipe: t.clientX <= 20,
                t0: performance.now(),
            };
            // Kill transition so drag feels instant
            if (stripRef.current) stripRef.current.style.transition = 'none';
        };

        const onMove = (e: TouchEvent) => {
            const g = gestureRef.current;
            if (!g) return;
            const t = e.touches[0];
            const dX = t.clientX - g.startX;
            const dY = t.clientY - g.startY;
            const absDX = Math.abs(dX);
            const absDY = Math.abs(dY);

            if (g.locked === 'none') {
                if (absDX < DIRECTION_THRESHOLD && absDY < DIRECTION_THRESHOLD) return;
                if (g.isEdgeSwipe || absDX > absDY * 1.2) {
                    g.locked = 'horizontal';
                } else if (absDY > absDX * 1.2) {
                    g.locked = 'vertical';
                    gestureRef.current = null; // hand off to inner scroller
                    return;
                } else {
                    return; // ambiguous — wait
                }
            }

            // Horizontal: block default scroll, update strip directly in DOM
            e.preventDefault();

            const base = -activeIdxRef.current * W;
            const minX = -(CANVAS_ROUTES.length - 1) * W;
            const maxX = 0;
            const raw = base + dX;
            const target = raw < minX ? minX + (raw - minX) * 0.12
                : raw > maxX ? maxX + (raw - maxX) * 0.12
                    : raw;

            // Direct style mutation — zero React involvement, zero Framer overhead
            if (stripRef.current) {
                stripRef.current.style.transform = `translate3d(${target}px,0,0)`;
            }
        };

        const onEnd = (e: TouchEvent) => {
            const g = gestureRef.current;
            if (!g || g.locked !== 'horizontal') { gestureRef.current = null; return; }
            gestureRef.current = null;

            const dX = e.changedTouches[0].clientX - g.startX;
            const dt = Math.max((performance.now() - g.t0) / 1000, 0.01);
            const velocity = dX / dt;
            const currentIdx = activeIdxRef.current;

            if (Math.abs(velocity) > SNAP_VELOCITY || Math.abs(dX) / W > SNAP_DISTANCE) {
                snapToRef.current(dX < 0 ? currentIdx + 1 : currentIdx - 1);
            } else {
                snapToRef.current(currentIdx);
            }
        };

        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchmove', onMove, { passive: false }); // false → can preventDefault
        el.addEventListener('touchend', onEnd, { passive: true });
        el.addEventListener('touchcancel', () => { gestureRef.current = null; }, { passive: true });

        return () => {
            el.removeEventListener('touchstart', onStart);
            el.removeEventListener('touchmove', onMove);
            el.removeEventListener('touchend', onEnd);
        };
    }, []); // refs keep values fresh without re-attaching

    return (
        // touch-action:none → browser won't claim touches, making preventDefault reliable
        <div
            ref={containerRef}
            className="relative w-screen overflow-hidden"
            style={{ height: '100dvh', touchAction: 'none' }}
        >
            <div
                ref={stripRef}
                style={{
                    display: 'flex',
                    width: `${CANVAS_ROUTES.length * 100}vw`,
                    height: '100%',
                    willChange: 'transform', // promote to GPU layer
                }}
            >
                {children.map((child, i) => (
                    <div
                        key={i}
                        style={{
                            width: '100vw',
                            height: '100%',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            flexShrink: 0,
                            touchAction: 'pan-y', // inner pages: allow vertical scroll
                        }}
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
}
