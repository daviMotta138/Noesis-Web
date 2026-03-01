import { motion } from 'framer-motion';
import { Gamepad2, Sparkles, Trophy, Zap } from 'lucide-react';

export default function PlaygroundPage() {
    const modes = [
        { id: 'classic', title: 'Clássico', desc: 'O modo original de memorização.', icon: Sparkles, color: '#FFD700', active: true },
        { id: 'speed', title: 'Modo Rápido', desc: 'Menos tempo para memorizar, mais recompensas.', icon: Zap, color: '#FF4B4B', active: false },
        { id: 'league', title: 'Campeonatos', desc: 'Torneios semanais com prêmios exclusivos.', icon: Trophy, color: '#1CB0F6', active: false },
    ];

    return (
        <div className="min-h-screen pb-20 pt-10 px-6">
            <header className="mb-10 text-center">
                <h1 className="text-4xl font-black text-display mb-2">
                    <span className="text-gradient-gold">Outros</span> MODOS
                </h1>
                <p className="text-sm text-[var(--color-text-muted)]">Explore novas formas de treinar sua mente.</p>
            </header>

            <div className="grid gap-4 max-w-md mx-auto">
                {modes.map((mode) => (
                    <motion.div
                        key={mode.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`relative p-6 rounded-3xl border-2 transition-all ${mode.active ? 'border-[var(--color-gold-dim)]' : 'border-white/5 opacity-60'}`}
                        style={{ background: mode.active ? 'var(--color-glass-strong)' : 'var(--color-glass)' }}
                    >
                        <div className="flex gap-4 items-center">
                            <div className="p-3 rounded-2xl" style={{ background: `${mode.color}20`, color: mode.color }}>
                                <mode.icon size={28} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-black text-[var(--color-text)]">{mode.title}</h3>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">{mode.desc}</p>
                            </div>
                        </div>
                        {!mode.active && (
                            <div className="absolute top-4 right-4 bg-white/10 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                Em Breve
                            </div>
                        )}
                        {mode.active && (
                            <div className="mt-4 flex justify-end">
                                <span className="text-[10px] font-black text-[var(--color-gold)] uppercase tracking-wider flex items-center gap-1">
                                    Jogar Agora <Gamepad2 size={12} />
                                </span>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
