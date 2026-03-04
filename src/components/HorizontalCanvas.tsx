// src/components/HorizontalCanvas.tsx
// Instagram-style canvas with gesture conflict matrix + spring physics
import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, useMotionValue, useSpring, animate } from 'framer-motion';

// ── Canvas pages (index → route)
export const CANVAS_ROUTES = ['/', '/ranking', '/profile'] as const;
export type CanvasRoute = typeof CANVAS_ROUTES[number];

const EDGE_ZONE = 18;       // px: left-edge priority zone
const DIRECTION_THRESHOLD = 8; // px: direction lock threshold
const SNAP_VELOCITY = 400;   // px/s: velocity threshold for snap
const SNAP_DISTANCE = 0.38;  // ratio of screen width to trigger snap

type GestureState = {
    startX: number;
    startY: number;
    locked: 'none' | 'horizontal' | 'vertical';
    isEdgeSwipe: boolean;
    scrollEl: HTMLElement | null;
    scrollAtLimit: boolean;
    t0: number;
};

function getRouteIndex(path: string): number {
    const idx = CANVAS_ROUTES.findIndex(r => r === path);
    return idx >= 0 ? idx : 0;
}

function findScrollableParent(el: EventTarget | null): HTMLElement | null {
    let cur = el as HTMLElement | null;
    while (cur && cur !== document.body) {
        const overflowX = getComputedStyle(cur).overflowX;
        if (/(auto|scroll)/.test(overflowX) && cur.scrollWidth > cur.clientWidth) return cur;
        cur = cur.parentElement;
    }
    return null;
}

interface HorizontalCanvasProps {
    children: React.ReactNode[];
}

export default function HorizontalCanvas({ children }: HorizontalCanvasProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [activeIdx, setActiveIdx] = useState(() => getRouteIndex(location.pathname));
    const W = window.innerWidth;

    // Framer motion values
    const rawX = useMotionValue(-activeIdx * W);
    const springX = useSpring(rawX, { stiffness: 420, damping: 38, mass: 0.8 });
    const gesture = useRef<GestureState | null>(null);

    // Sync when route changes externally (e.g. via bottom nav link)
    useEffect(() => {
        const idx = getRouteIndex(location.pathname);
        if (idx !== activeIdx) {
            setActiveIdx(idx);
            animate(rawX, -idx * W, { type: 'spring', stiffness: 420, damping: 38, mass: 0.8 });
        }
    }, [location.pathname]);

    // Navigate to a canvas page by index
    const snapTo = useCallback((idx: number, velocity = 0) => {
        const clamped = Math.max(0, Math.min(CANVAS_ROUTES.length - 1, idx));
        setActiveIdx(clamped);
        animate(rawX, -clamped * W, {
            type: 'spring',
            stiffness: 420,
            damping: 38,
            mass: 0.8,
            velocity: -velocity,
        });
        navigate(CANVAS_ROUTES[clamped], { replace: true });
    }, [navigate, rawX, W]);

    // ── Touch Handlers ──────────────────────────────────────────
    const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const t = e.touches[0];
        const scrollEl = findScrollableParent(e.target);
        const isEdge = t.clientX <= EDGE_ZONE;
        gesture.current = {
            startX: t.clientX,
            startY: t.clientY,
            locked: 'none',
            isEdgeSwipe: isEdge,
            scrollEl,
            scrollAtLimit: false,
            t0: performance.now(),
        };
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!gesture.current) return;
        const g = gesture.current;
        const t = e.touches[0];
        const dX = t.clientX - g.startX;
        const dY = t.clientY - g.startY;
        const absDX = Math.abs(dX);
        const absDY = Math.abs(dY);

        // Direction lock
        if (g.locked === 'none') {
            if (absDX < DIRECTION_THRESHOLD && absDY < DIRECTION_THRESHOLD) return;
            if (g.isEdgeSwipe) {
                g.locked = 'horizontal'; // edge always horizontal
            } else if (absDY > absDX) {
                g.locked = 'vertical';
                return;
            } else {
                g.locked = 'horizontal';
            }
        }
        if (g.locked === 'vertical') return;

        // Check if an inner horizontal scroller is at its limit
        if (g.scrollEl) {
            const s = g.scrollEl;
            const atRight = s.scrollLeft + s.clientWidth >= s.scrollWidth - 2;
            const atLeft = s.scrollLeft <= 2;
            const goingRight = dX < 0;
            const goingLeft = dX > 0;
            g.scrollAtLimit = (goingRight && atRight) || (goingLeft && atLeft);
            if (!g.scrollAtLimit) return; // inner scroll handles it
        }

        // We own the gesture
        e.preventDefault();
        const base = -activeIdx * W;
        const damped = base + dX * 0.5; // resistance at edges
        rawX.set(damped);
        springX.set(damped);
    }, [activeIdx, rawX, springX, W]);

    const onTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        if (!gesture.current || gesture.current.locked !== 'horizontal') return;
        const g = gesture.current;
        gesture.current = null;

        const lastTouch = e.changedTouches[0];
        const dX = lastTouch.clientX - g.startX;
        const dt = (performance.now() - g.t0) / 1000;
        const velocity = dX / dt; // px/s

        const ratio = Math.abs(dX) / W;
        const fast = Math.abs(velocity) > SNAP_VELOCITY;
        const far = ratio > SNAP_DISTANCE;

        if (fast || far) {
            if (dX < 0) { snapTo(activeIdx + 1, velocity); }
            else { snapTo(activeIdx - 1, velocity); }
        } else {
            snapTo(activeIdx, 0); // snap back
        }
    }, [activeIdx, snapTo, W]);

    return (
        <div
            ref={containerRef}
            className="relative w-screen overflow-hidden"
            style={{ height: '100dvh' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <motion.div
                style={{
                    x: springX,
                    display: 'flex',
                    width: `${CANVAS_ROUTES.length * 100}vw`,
                    height: '100%',
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
                            // Virtualize: only render adjacent screens
                            visibility: Math.abs(i - activeIdx) <= 1 ? 'visible' : 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        {child}
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
