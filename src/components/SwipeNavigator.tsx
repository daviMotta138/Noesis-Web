// src/components/SwipeNavigator.tsx
// Instagram-style Horizontal Canvas Navigator
// – All tab screens coexist in a horizontal flex container (never destroyed/recreated)
// – Pointer-based gesture with direction detection (not Framer drag)
// – Spring snap physics on release
// – Gesture conflict resolution: vertical scroll takes priority over horizontal swipe
// – Edge-swipe (first/last 20px of screen) always activates horizontal

import { useRef, useCallback, useEffect, memo } from 'react';
import { useMotionValue, animate, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ── lazy-import the 3 canvas pages so they're not re-created on route change ──
import HomePage from '../pages/Home';
import RankingPage from '../pages/Ranking';
import ProfilePage from '../pages/Profile';

const CANVAS_TABS = ['/', '/ranking', '/profile'] as const;
const EDGE_THRESHOLD = 20;      // px from screen edge → always horizontal
const DIR_THRESHOLD = 8;        // px movement before deciding direction
const DIR_RATIO = 1.5;          // |dx| must be this × |dy| to be "horizontal"
const VEL_THRESHOLD = 0.35;     // px/ms — snap to next even if not 40% across
const DIST_THRESHOLD = 0.4;     // 40% of screen width → always snaps

// Stable page components list — defined outside to avoid re-creation
const PAGES = [HomePage, RankingPage, ProfilePage];

// ── Gesture state (not in React state to avoid re-renders during move) ──
interface GestureState {
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    startMotionX: number;
    phase: 'idle' | 'undecided' | 'horizontal' | 'vertical';
}

function isHorizontalScrollable(el: EventTarget | null): boolean {
    if (!(el instanceof Element)) return false;
    let node: Element | null = el;
    // Walk up to the SwipeNavigator wrapper (max 6 levels)
    for (let i = 0; i < 6 && node; i++) {
        const style = window.getComputedStyle(node);
        const overflow = style.overflowX;
        if (
            (overflow === 'auto' || overflow === 'scroll') &&
            node.scrollWidth > node.clientWidth
        ) return true;
        node = node.parentElement;
    }
    return false;
}

// ══════════════════════════════════════════════════════════
// Individual slide wrapper — each page gets its own scroll container
const Slide = memo(function Slide({ Page }: { Page: () => React.ReactElement | null }) {
    return (
        <div
            style={{
                width: '100vw',
                height: '100%',
                flexShrink: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                overscrollBehaviorY: 'contain',
            }}
        >
            <Page />
        </div>
    );
});

// ══════════════════════════════════════════════════════════
interface Props {
    currentIndex: number;
}

export function SwipeNavigator({ currentIndex }: Props) {
    const x = useMotionValue(-currentIndex * window.innerWidth);
    const navigate = useNavigate();
    const gesture = useRef<GestureState>({
        pointerId: -1,
        startX: 0,
        startY: 0,
        startTime: 0,
        startMotionX: 0,
        phase: 'idle',
    });
    // Track the committed index separately so animations fire correctly
    const committedIndex = useRef(currentIndex);

    // ── Sync position when currentIndex changes via BottomNav tap ──────────
    useEffect(() => {
        if (committedIndex.current === currentIndex) return;
        committedIndex.current = currentIndex;
        animate(x, -currentIndex * window.innerWidth, {
            type: 'spring',
            stiffness: 380,
            damping: 38,
        });
    }, [currentIndex]);

    // ── Update canvas size on resize (handles orientation change) ──────────
    useEffect(() => {
        const onResize = () => {
            // Recalculate absolute x after resize without animation
            x.set(-committedIndex.current * window.innerWidth);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // ── Snap canvas to a target index with spring physics ──────────────────
    const snapTo = useCallback((targetIndex: number, velocityPxMs: number) => {
        const clamped = Math.max(0, Math.min(CANVAS_TABS.length - 1, targetIndex));
        animate(x, -clamped * window.innerWidth, {
            type: 'spring',
            stiffness: 400,
            damping: 40,
            velocity: velocityPxMs * -1000, // Framer uses px/s, invert for direction
        });
        committedIndex.current = clamped;
        if (clamped !== currentIndex) {
            navigate(CANVAS_TABS[clamped]);
        }
    }, [currentIndex, navigate]);

    // ── Pointer Events ─────────────────────────────────────────────────────
    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        // Only primary pointer (ignore pinch zoom etc.)
        if (!e.isPrimary) return;
        const g = gesture.current;
        if (g.phase !== 'idle') return;

        g.pointerId = e.pointerId;
        g.startX = e.clientX;
        g.startY = e.clientY;
        g.startTime = e.timeStamp;
        g.startMotionX = x.get();
        g.phase = 'undecided';
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const g = gesture.current;
        if (g.phase === 'idle' || g.phase === 'vertical') return;
        if (e.pointerId !== g.pointerId) return;

        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (g.phase === 'undecided') {
            const isEdge = g.startX < EDGE_THRESHOLD ||
                g.startX > window.innerWidth - EDGE_THRESHOLD;

            if (absDx > DIR_THRESHOLD || isEdge) {
                // Is there a horizontal scroller under the pointer? Yield to it.
                if (!isEdge && isHorizontalScrollable(e.target)) {
                    g.phase = 'vertical'; // let it scroll
                    return;
                }
                if (isEdge || absDx > absDy * DIR_RATIO) {
                    g.phase = 'horizontal';
                    // Capture pointer so OS doesn't scroll the page
                    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
                } else if (absDy > DIR_THRESHOLD) {
                    g.phase = 'vertical';
                    return;
                }
            }
        }

        if (g.phase === 'horizontal') {
            const totalW = window.innerWidth;
            const maxX = 0;
            const minX = -(CANVAS_TABS.length - 1) * totalW;
            const rawX = g.startMotionX + dx;

            // Rubber-band resistance at edges
            const rubberBand = (overflow: number) => overflow * 0.2;
            let clampedX: number;
            if (rawX > maxX) clampedX = maxX + rubberBand(rawX - maxX);
            else if (rawX < minX) clampedX = minX + rubberBand(rawX - minX);
            else clampedX = rawX;

            x.set(clampedX);
        }
    }, []);

    const onPointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const g = gesture.current;
        if (g.pointerId !== e.pointerId) return;

        if (g.phase !== 'horizontal') {
            g.phase = 'idle';
            return;
        }

        const dx = e.clientX - g.startX;
        const dt = Math.max(1, e.timeStamp - g.startTime);
        const velocity = dx / dt; // px / ms  (+right, -left)
        const w = window.innerWidth;

        let targetIndex = committedIndex.current;
        if (velocity < -VEL_THRESHOLD || dx < -w * DIST_THRESHOLD) {
            targetIndex = Math.min(committedIndex.current + 1, CANVAS_TABS.length - 1);
        } else if (velocity > VEL_THRESHOLD || dx > w * DIST_THRESHOLD) {
            targetIndex = Math.max(committedIndex.current - 1, 0);
        }

        snapTo(targetIndex, velocity);
        g.phase = 'idle';
    }, [snapTo]);

    return (
        <div
            style={{
                flex: 1,
                overflow: 'hidden',
                position: 'relative',
                // pan-y lets the browser handle vertical scroll natively
                // while we intercept horizontal via pointer events
                touchAction: 'pan-y',
                userSelect: 'none',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
        >
            <motion.div
                style={{
                    x,
                    display: 'flex',
                    width: `${CANVAS_TABS.length * 100}vw`,
                    height: '100%',
                    willChange: 'transform',
                }}
            >
                {PAGES.map((Page, i) => (
                    <Slide key={i} Page={Page} />
                ))}
            </motion.div>
        </div>
    );
}
