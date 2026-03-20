import { useEffect } from 'react';

declare global {
    interface Window {
        liquidGL?: (options: Record<string, unknown>) => unknown;
    }
}

/**
 * Initialise liquidGL on any elements matching `selector` once:
 *  – html2canvas takes a snapshot of `body` (the starry canvas background)
 *  – WebGL shader refracts it through the element's bevel edges
 *
 * Call this hook in a component that mounts AFTER the nav elements exist.
 */
export function useLiquidGL(selector: string, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        let cancelled = false;

        const tryInit = (retries = 0) => {
            if (cancelled) return;

            // Wait for both scripts to be ready
            if (typeof window.liquidGL !== 'function') {
                if (retries < 30) setTimeout(() => tryInit(retries + 1), 300);
                return;
            }

            const targets = document.querySelectorAll(selector);
            if (targets.length === 0) {
                if (retries < 20) setTimeout(() => tryInit(retries + 1), 300);
                return;
            }

            try {
                window.liquidGL({
                    snapshot: 'body',
                    target: selector,
                    resolution: 1.5,
                    refraction: 0.045,       // water-like bending at edges
                    bevelDepth: 0.12,        // depth of the glass rim
                    bevelWidth: 0.16,        // width of the refracting edge
                    frost: 0,                // 0 = crystal-clear (not frosted)
                    shadow: true,
                    specular: true,          // animated light highlights
                    reveal: 'fade',
                    tilt: false,
                    magnify: 1,
                });
            } catch (e) {
                console.warn('[liquidGL] init error:', e);
            }
        };

        // Small delay to let the DOM settle after React renders
        const timer = setTimeout(() => tryInit(), 800);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [selector, enabled]);
}
