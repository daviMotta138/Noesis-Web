// src/components/SwipeNavigator.tsx
// Horizontal Canvas Swipe Navigator — Instagram-style fluid screen transitions
// Architecture: N screens coexist side-by-side in a wide canvas, controlled by a shared X offset.
// Conflict Management: Detects horizontal vs vertical intent at start of gesture.
// Edge Priority: Swipe always activates from the first 20px of the left edge.
// Physics: Spring-based snapping using Framer Motion's animate with spring config.

import { useRef, useCallback, useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { audio } from '../lib/audio';

// ─── Config ────────────────────────────────────────────────────────────────────
const SPRING = { type: 'spring' as const, stiffness: 380, damping: 38, mass: 1 };
const SNAP_VELOCITY_THRESHOLD = 300;  // px/s — swipe velocity that triggers a snap
const SNAP_OFFSET_THRESHOLD = 0.35;  // fraction of screen width that triggers a snap
const EDGE_ZONE_PX = 20;             // px from left edge where swipe always wins
const DIRECTION_LOCK_THRESHOLD = 5;  // px of movement before locking H or V gesture

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SwipeNavigatorProps {
    screens: { path: string; el: ReactNode }[];
    currentIndex: number;         // derived from current route
    onNavigate: (index: number) => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function SwipeNavigator({ screens, currentIndex, onNavigate }: SwipeNavigatorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    // Motion value for the horizontal canvas offset (in pixels)
    const x = useMotionValue(0);

    // Gesture state (not React state to avoid re-renders during drag)
    const gesture = useRef({
        startX: 0,
        startY: 0,
        startTouchX: 0,
        startOffset: 0,
        direction: null as 'h' | 'v' | null,
        active: false,
        isEdgeSwipe: false,
        startTime: 0,
    });

    // Sync motion value when currentIndex changes via tap navigation
    useEffect(() => {
        const w = window.innerWidth;
        animate(x, -currentIndex * w, SPRING);
    }, [currentIndex]);

    // ── Pointer handlers ──────────────────────────────────────────────────────
    const onPointerDown = useCallback((e: React.PointerEvent) => {
        // Only track primary touch/finger (not mouse on desktop while there's a sidebar)
        if (e.pointerType === 'mouse') return;

        const g = gesture.current;
        g.startX = e.clientX;
        g.startY = e.clientY;
        g.startTouchX = e.clientX;
        g.startOffset = x.get();
        g.direction = null;
        g.active = true;
        g.isEdgeSwipe = e.clientX <= EDGE_ZONE_PX;
        g.startTime = Date.now();

        containerRef.current?.setPointerCapture(e.pointerId);
    }, [x]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        const g = gesture.current;
        if (!g.active) return;

        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // Direction lock — decide once after DIRECTION_LOCK_THRESHOLD px
        if (!g.direction && (absDx > DIRECTION_LOCK_THRESHOLD || absDy > DIRECTION_LOCK_THRESHOLD)) {
            // Edge swipe always goes horizontal regardless of angle
            if (g.isEdgeSwipe) {
                g.direction = 'h';
            } else {
                g.direction = absDx > absDy ? 'h' : 'v';
            }
        }

        if (g.direction !== 'h') return; // vertical — let the scroller handle it

        e.preventDefault(); // prevent scroll while swiping

        const w = window.innerWidth;
        const rawOffset = g.startOffset + dx;

        // Resistance at the first and last screen
        const maxRight = 0;
        const maxLeft = -(screens.length - 1) * w;
        let clampedOffset = rawOffset;

        if (rawOffset > maxRight) {
            // Past first screen: resistance
            clampedOffset = (rawOffset - maxRight) * 0.25;
        } else if (rawOffset < maxLeft) {
            // Past last screen: resistance  
            clampedOffset = maxLeft + (rawOffset - maxLeft) * 0.25;
        }

        x.set(clampedOffset);
    }, [x, screens.length]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        const g = gesture.current;
        if (!g.active) return;
        g.active = false;

        if (g.direction !== 'h') return; // was a vertical scroll — ignore

        const w = window.innerWidth;
        const currentOffset = x.get();
        const dx = e.clientX - g.startX;
        const dt = (Date.now() - g.startTime) / 1000;
        const velocity = dx / dt; // px/s

        // Determine index to snap to
        const floatIndex = -currentOffset / w;
        let targetIndex = Math.round(floatIndex);

        // Velocity override — snap to next/prev regardless of offset
        if (velocity < -SNAP_VELOCITY_THRESHOLD) {
            targetIndex = Math.min(currentIndex + 1, screens.length - 1);
        } else if (velocity > SNAP_VELOCITY_THRESHOLD) {
            targetIndex = Math.max(currentIndex - 1, 0);
        }

        // Offset threshold fallback check
        const fraction = floatIndex - currentIndex;
        if (fraction > SNAP_OFFSET_THRESHOLD) targetIndex = currentIndex + 1;
        if (fraction < -SNAP_OFFSET_THRESHOLD) targetIndex = currentIndex - 1;

        // Clamp to valid range
        targetIndex = Math.max(0, Math.min(screens.length - 1, targetIndex));

        // Animate to target
        animate(x, -targetIndex * w, SPRING);

        // If navigating to a new screen, update the route
        if (targetIndex !== currentIndex) {
            audio.play('nav');
            onNavigate(targetIndex);
        }
    }, [x, currentIndex, screens.length, onNavigate]);

    const onPointerCancel = useCallback(() => {
        const g = gesture.current;
        g.active = false;
        // Snap back to current index
        animate(x, -currentIndex * window.innerWidth, SPRING);
    }, [x, currentIndex]);

    // ── Render ────────────────────────────────────────────────────────────────
    const width = `${screens.length * 100}%`;

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-hidden touch-none relative"
            style={{ height: '100%' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
        >
            <motion.div
                ref={trackRef}
                style={{ x, width, display: 'flex', height: '100%', willChange: 'transform' }}
            >
                {screens.map((screen, i) => {
                    // Virtualization: only render current and adjacent screens
                    const distance = Math.abs(i - currentIndex);
                    const shouldRender = distance <= 1;
                    return (
                        <div
                            key={screen.path}
                            style={{ width: `${100 / screens.length}%`, flexShrink: 0, height: '100%', overflow: 'hidden' }}
                        >
                            {shouldRender ? (
                                <div className="h-full overflow-y-auto overscroll-none pb-20">
                                    <div className="max-w-4xl mx-auto px-5 py-8 min-h-full">
                                        {screen.el}
                                    </div>
                                </div>
                            ) : (
                                <div />
                            )}
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}
