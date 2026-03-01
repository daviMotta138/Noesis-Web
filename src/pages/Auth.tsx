import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import logoImg from '../assets/logo-vertical.png';

type Mode = 'login' | 'signup';

export default function AuthPage() {
    const [mode, setMode] = useState<Mode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleGoogleLogin = async () => {
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            });
            if (error) throw error;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro ao entrar com Google.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); setSuccess(null); setLoading(true);
        setSubmitting(true);
        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email, password,
                    options: { data: { display_name: displayName || email.split('@')[0] } },
                });
                if (error) throw error;
                setSuccess('Cadastro realizado! Verifique seu e-mail para confirmar.');
                setSubmitting(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.dispatchEvent(new Event('warp-speed'));
            }
        } catch (err: unknown) {
            let msg = err instanceof Error ? err.message : 'Ocorreu um erro.';
            if (msg.toLowerCase().includes('rate limit')) {
                msg = 'Limite de envios atingido. Aguarde alguns minutos ou aumente o limite no painel do Supabase (Auth > Settings).';
            }
            setError(msg);
            setSubmitting(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-transparent">
            {/* ── Starfield was moved to global App.tsx ── */}
            <div className="fixed inset-0 pointer-events-none z-[-1]" style={{ overflow: 'hidden' }}>
                {/* Golden burst at submit */}
                {submitting && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: [0, 3, 8], opacity: [0, 0.45, 0] }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            left: '50%', top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: 100, height: 100, borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(212,168,83,0.9) 0%, transparent 70%)',
                        }}
                    />
                )}
            </div>

            {/* ── Logo ── */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center relative z-10 flex flex-col items-center">
                <img src={logoImg} className="h-28 w-auto object-contain mb-4 drop-shadow-[0_0_20px_rgba(212,168,83,0.3)]" alt="NOESIS" />
                <div className="flex items-center justify-center gap-3">
                    <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #D4A853)' }} />
                    <p className="text-xs tracking-[0.4em] uppercase" style={{ color: 'var(--color-gold-dim)' }}>Palácio da Memória</p>
                    <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, #D4A853, transparent)' }} />
                </div>
            </motion.div>

            {/* ── Form Card ── */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="panel w-full max-w-sm p-8 relative z-10">
                <div className="absolute top-0 left-8 right-8 h-px gradient-gold" style={{ borderRadius: '0 0 4px 4px' }} />

                {/* Tabs */}
                <div className="flex rounded-xl p-1 mb-8" style={{ background: 'var(--color-deep)' }}>
                    {(['login', 'signup'] as const).map(m => (
                        <button key={m}
                            onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
                            style={{
                                background: mode === m ? 'var(--color-card)' : 'transparent',
                                color: mode === m ? 'var(--color-gold)' : 'var(--color-text-muted)',
                                border: mode === m ? '1px solid var(--color-border-glow)' : '1px solid transparent',
                            }}>
                            {m === 'login' ? 'Entrar' : 'Cadastrar'}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {mode === 'signup' && (
                        <div>
                            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
                                style={{ color: 'var(--color-text-muted)' }}>Nome</label>
                            <input className="field" type="text" value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                placeholder="Como quer ser chamado?" />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
                            style={{ color: 'var(--color-text-muted)' }}>E-mail</label>
                        <input className="field" type="email" value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="seu@email.com" required />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-widest"
                            style={{ color: 'var(--color-text-muted)' }}>Senha</label>
                        <input className="field" type="password" value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••" required minLength={6} />
                    </div>

                    {error && (
                        <div className="rounded-xl p-3 text-sm"
                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--color-danger)' }}>
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="rounded-xl p-3 text-sm"
                            style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: 'var(--color-success)' }}>
                            {success}
                        </div>
                    )}

                    <motion.button type="submit" disabled={loading}
                        className="btn-gold w-full mt-2"
                        whileTap={{ scale: 0.97 }}
                        animate={submitting
                            ? { boxShadow: ['0 0 0px rgba(212,168,83,0)', '0 0 40px rgba(212,168,83,0.8)', '0 0 0px rgba(212,168,83,0)'] }
                            : {}
                        }
                        transition={{ duration: 0.7, repeat: submitting ? Infinity : 0 }}>
                        {loading
                            ? <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>✦ Entrando...</motion.span>
                            : (mode === 'login' ? 'ENTRAR' : 'CRIAR CONTA')
                        }
                    </motion.button>

                    <div className="flex items-center gap-4 my-2 px-2">
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">ou</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 active:scale-[0.98]"
                        style={{ color: 'var(--color-text)' }}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continuar com Google
                    </button>
                </form>
            </motion.div>

            <p className="mt-6 text-xs relative z-10" style={{ color: 'var(--color-text-muted)' }}>
                Ao continuar, você concorda com os termos de uso.
            </p>
        </div>
    );
}
