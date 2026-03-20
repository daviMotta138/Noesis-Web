import { useEffect, useRef, useState } from 'react';

// Based on: nextjs-starry-background project
// Physics: spring/damping attraction, mouse pull, orbital drift, shooting stars

interface Star {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    twinkleSpeed: number;
    twinkleOffset: number;
    driftAngle: number;
    driftSpeed: number;
}

interface ShootingStar {
    x: number;
    y: number;
    length: number;
    speed: number;
    angle: number;
    opacity: number;
    active: boolean;
}

interface Mouse {
    x: number;
    y: number;
    active: boolean;
}

const ATTRACT_RADIUS = 180;
const ATTRACT_FORCE = 0.018;
const SPRING = 0.012;
const DAMPING = 0.88;
const DRIFT_SPEED = 0.12;

// Warp event (kept for backwards compat with the rest of the app)
const WARP_EVENT = 'warp-speed';

export const StarBackground = ({ interactive = false }: { interactive?: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const starsRef = useRef<Star[]>([]);
    const shootingStarsRef = useRef<ShootingStar[]>([]);
    const animationFrameRef = useRef<number>();
    const mouseRef = useRef<Mouse>({ x: -9999, y: -9999, active: false });
    const [isWarping, setIsWarping] = useState(false);

    // Listen for external warp-speed event (e.g. BattleRoyale screen transition)
    useEffect(() => {
        const handleWarp = () => {
            setIsWarping(true);
            setTimeout(() => setIsWarping(false), 2000);
        };
        window.addEventListener(WARP_EVENT, handleWarp);
        return () => window.removeEventListener(WARP_EVENT, handleWarp);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initStars();
        };

        const initStars = () => {
            starsRef.current = [];
            const numStars = Math.floor((canvas.width * canvas.height) / 10000);
            for (let i = 0; i < numStars; i++) {
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                starsRef.current.push({
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                    vx: 0,
                    vy: 0,
                    size: Math.random() * 1.2 + 0.2,
                    opacity: Math.random() * 0.45 + 0.25,
                    twinkleSpeed: Math.random() * 0.04 + 0.008,
                    twinkleOffset: Math.random() * Math.PI * 2,
                    driftAngle: Math.random() * Math.PI * 2,
                    driftSpeed: Math.random() * DRIFT_SPEED + 0.02,
                });
            }
        };

        const createShootingStar = () => {
            const startFromTop = Math.random() > 0.5;
            const s: ShootingStar = {
                x: startFromTop ? Math.random() * canvas.width : canvas.width,
                y: startFromTop ? 0 : Math.random() * canvas.height * 0.5,
                length: Math.random() * 100 + 60,
                speed: Math.random() * 4 + 5,
                angle: startFromTop
                    ? Math.PI / 4 + Math.random() * 0.3
                    : Math.PI / 3 + Math.random() * 0.2,
                opacity: 1,
                active: true,
            };
            shootingStarsRef.current.push(s);
        };

        const updateStar = (star: Star) => {
            const mouse = mouseRef.current;
            if (mouse.active && interactive) {
                const dx = mouse.x - star.x;
                const dy = mouse.y - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < ATTRACT_RADIUS && dist > 0) {
                    const strength = (1 - dist / ATTRACT_RADIUS) * ATTRACT_FORCE;
                    star.vx += (dx / dist) * strength * dist;
                    star.vy += (dy / dist) * strength * dist;
                }
            }
            star.vx += (star.baseX - star.x) * SPRING;
            star.vy += (star.baseY - star.y) * SPRING;
            if (!mouse.active) {
                star.driftAngle += 0.004;
                star.vx += Math.cos(star.driftAngle) * star.driftSpeed * 0.008;
                star.vy += Math.sin(star.driftAngle) * star.driftSpeed * 0.008;
            }
            star.vx *= DAMPING;
            star.vy *= DAMPING;
            star.x += star.vx;
            star.y += star.vy;
        };

        const drawStar = (star: Star, time: number) => {
            const twinkle = Math.sin(time * star.twinkleSpeed + star.twinkleOffset) * 0.45 + 0.55;
            const currentOpacity = star.opacity * twinkle;

            if (star.size > 0.7) {
                const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 3);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${currentOpacity * 0.7})`);
                gradient.addColorStop(0.4, `rgba(200, 220, 255, ${currentOpacity * 0.2})`);
                gradient.addColorStop(1, 'rgba(150, 180, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        };

        const drawShootingStar = (s: ShootingStar) => {
            const tailX = s.x - Math.cos(s.angle) * s.length;
            const tailY = s.y - Math.sin(s.angle) * s.length;

            const glowGradient = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 15);
            glowGradient.addColorStop(0, `rgba(255, 255, 255, ${s.opacity * 0.9})`);
            glowGradient.addColorStop(0.3, `rgba(200, 230, 255, ${s.opacity * 0.5})`);
            glowGradient.addColorStop(1, 'rgba(150, 200, 255, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 15, 0, Math.PI * 2);
            ctx.fill();

            const grad = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
            grad.addColorStop(0.3, `rgba(200, 230, 255, ${s.opacity * 0.6})`);
            grad.addColorStop(0.7, `rgba(150, 200, 255, ${s.opacity * 0.2})`);
            grad.addColorStop(1, 'rgba(100, 150, 255, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
            ctx.fill();
        };

        // Mouse handlers (only fire when interactive)
        const onMouseMove = (e: MouseEvent) => {
            if (!interactive) return;
            mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
        };
        const onMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999, active: false };
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseleave', onMouseLeave);

        let time = 0;
        let shootingStarTimer = Math.random() * 3000 + 2000;

        const animate = () => {
            time++;

            // Background gradient — slightly tinted toward the app's dark purple
            ctx.fillStyle = '#07080f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Subtle radial glow from top centre (matches app's existing aesthetic)
            const radial = ctx.createRadialGradient(
                canvas.width / 2, 0, 0,
                canvas.width / 2, canvas.height * 0.5, canvas.width * 0.7
            );
            radial.addColorStop(0, 'rgba(80, 40, 160, 0.18)');
            radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = radial;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            starsRef.current.forEach(star => {
                updateStar(star);
                drawStar(star, time);
            });

            shootingStarsRef.current = shootingStarsRef.current.filter(s => {
                if (!s.active) return false;
                s.x += Math.cos(s.angle) * s.speed;
                s.y += Math.sin(s.angle) * s.speed;
                s.opacity -= 0.013;
                if (s.opacity <= 0 || s.x > canvas.width + 100 || s.y > canvas.height + 100) {
                    s.active = false;
                    return false;
                }
                drawShootingStar(s);
                return true;
            });

            shootingStarTimer -= 16;
            if (shootingStarTimer <= 0) {
                createShootingStar();
                shootingStarTimer = Math.random() * 5000 + 3000;
            }

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseleave', onMouseLeave);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [interactive]);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 w-full h-full pointer-events-none"
            style={{
                zIndex: 0,
                // Warp effect: handled by CSS filter when isWarping
                filter: isWarping ? 'blur(2px) brightness(2)' : 'none',
                transition: 'filter 0.3s ease',
            }}
        />
    );
};
