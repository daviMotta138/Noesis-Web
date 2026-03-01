// src/components/ChangelogModal.tsx — v2.0, shown once per user per version
import { useState, useEffect } from 'react';
import { X, Sparkles, Trophy, Shield, Bell } from 'lucide-react';

const VERSION_KEY = 'changelog_v5.1';

const ENTRIES = [
    {
        Icon: Sparkles,
        title: 'Acesso com Google',
        desc: 'Entre no Noesis com apenas um clique usando sua conta Google. Mais rápido e seguro.',
    },
    {
        Icon: Trophy,
        title: 'Ligas Competitivas',
        desc: 'O Ranking agora tem divisões! Lute para subir de liga e ganhar recompensas exclusivas.',
    },
    {
        Icon: Bell,
        title: 'Alertas em Tempo Real',
        desc: 'Receba notificações instantâneas de novas mensagens de amigos e presentes recebidos.',
    },
    {
        Icon: Shield,
        title: 'Área Playground',
        desc: 'Explore a nova seção "Outros Modos" e descubra novas formas de treinar sua memória.',
    },
];

export const ChangelogModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(VERSION_KEY)) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        localStorage.setItem(VERSION_KEY, 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            style={{ background: 'rgba(7,8,15,0.82)', backdropFilter: 'blur(6px)' }}
        >
            <div
                className="w-full max-w-sm"
                style={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border-glow)',
                    borderRadius: 4,
                    boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-7 pt-7 pb-5"
                    style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                    <div>
                        <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>
                            Atualização
                        </p>
                        <h2 className="text-2xl font-black text-display text-gradient-gold">Versão 5.1</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}
                    >
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Entries */}
                <div className="px-7 py-5 space-y-4">
                    {ENTRIES.map(({ Icon, title, desc }) => (
                        <div key={title} className="flex items-start gap-4">
                            <div
                                className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{
                                    background: 'rgba(212,168,83,0.1)',
                                    border: '1px solid rgba(212,168,83,0.22)',
                                }}
                            >
                                <Icon size={15} style={{ color: 'var(--color-gold)' }} strokeWidth={1.5} />
                            </div>
                            <div>
                                <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-text)' }}>
                                    {title}
                                </p>
                                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-sub)' }}>
                                    {desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA */}
                <div className="px-7 pb-7">
                    <button onClick={handleClose} className="btn-gold w-full">
                        CONTINUAR
                    </button>
                </div>
            </div>
        </div>
    );
};