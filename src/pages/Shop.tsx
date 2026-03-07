import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Gift, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { audio } from '../lib/audio';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';

interface ShopItem {
    id: string;
    name: string;
    category: string;
    price: number;
    desc: string;
    emoji: string;
    bgStyle: string;
    borderStyle: string;
    comingSoon?: boolean;
    amount?: number;
    image?: string;
}

const SHOP_SECTIONS = [
    {
        title: 'Sobrevivência & Vantagens',
        items: [
            { id: 'shield_1', name: 'Escudo', category: 'shield', price: 150, desc: 'Protege 1 ofensiva', emoji: '🛡️', bgStyle: 'linear-gradient(180deg, #A0522D80, #8B451320)', borderStyle: '#CD7F32', amount: 1 },
            { id: 'shield_3', name: 'Dose Tripla', category: 'shield', price: 400, desc: 'Pacote com 3 escudos', emoji: '🛡️', bgStyle: 'linear-gradient(180deg, #80808080, #A9A9A920)', borderStyle: '#C0C0C0', amount: 3 },
            { id: 'shield_5', name: 'Kit Sobrevivência', category: 'shield', price: 650, desc: 'Pacote com 5 escudos', emoji: '🛡️', bgStyle: 'linear-gradient(180deg, #B8860B80, #DAA52020)', borderStyle: '#FFD700', amount: 5 },
            { id: 'shield_10', name: 'Muralha', category: 'shield', price: 1200, desc: 'Pacote com 10 escudos', emoji: '🛡️', bgStyle: 'linear-gradient(180deg, #32CD3280, #228B2220)', borderStyle: '#00FF00', amount: 10 },
        ] as ShopItem[]
    },
    {
        title: 'Cosméticos Avatar',
        items: [
            { id: 'bone-azul', name: 'Boné Azul', category: 'headwear', price: 200, desc: 'Estiloso', emoji: '🧢', bgStyle: 'linear-gradient(180deg, #1E40AF80, #1E3A8A20)', borderStyle: '#3B82F6', image: '/avatars/man/bone-azul-store.png' },
            { id: '4', name: 'Cabelo Cacheado', category: 'hair', price: 200, desc: 'Cachos exuberantes', emoji: '💇', bgStyle: 'linear-gradient(180deg, #D2691E80, #8B451320)', borderStyle: '#D2691E' },
            { id: '6', name: 'Camisa Roxa', category: 'shirt', price: 150, desc: 'Elegância', emoji: '👕', bgStyle: 'linear-gradient(180deg, #8A2BE280, #4B008220)', borderStyle: '#8A2BE2' },
            { id: '8', name: 'Óculos Red.', category: 'accessory', price: 180, desc: 'Intelectual', emoji: '🕶️', bgStyle: 'linear-gradient(180deg, #00000080, #11111120)', borderStyle: '#333333' },
            { id: '9', name: 'Coroa Dourada', category: 'accessory', price: 500, desc: 'Para mestres', emoji: '👑', bgStyle: 'linear-gradient(180deg, #FFD70080, #DAA52020)', borderStyle: '#FFD700' },
            { id: '10', name: 'Tênis Branco', category: 'shoes', price: 120, desc: 'Atleta', emoji: '👟', bgStyle: 'linear-gradient(180deg, #FFFFFF80, #CCCCCC20)', borderStyle: '#FFFFFF' },
            { id: 'aura_1', name: 'Aura Chamas', category: 'effect', price: 2000, desc: 'Efeito Visual', emoji: '🔥', bgStyle: 'linear-gradient(180deg, #FF450080, #8B000020)', borderStyle: '#FF4500', comingSoon: true },
        ] as ShopItem[]
    },
    {
        title: 'Itens Místicos',
        items: [
            { id: '12', name: 'Espada Mág.', category: 'item', price: 350, desc: 'Poder puro', emoji: '🗡️', bgStyle: 'linear-gradient(180deg, #4682B480, #00008020)', borderStyle: '#4682B4' },
            { id: '13', name: 'Grimório', category: 'item', price: 350, desc: 'Sabedoria', emoji: '📖', bgStyle: 'linear-gradient(180deg, #8B008B80, #4B008220)', borderStyle: '#8B008B' },
            { id: '14', name: 'Cajado', category: 'item', price: 400, desc: 'Controle', emoji: '🪄', bgStyle: 'linear-gradient(180deg, #00808080, #00404020)', borderStyle: '#00FA9A' },
            { id: 'pet_1', name: 'Mascote Coruja', category: 'pet', price: 1500, desc: 'Companheiro', emoji: '🦉', bgStyle: 'linear-gradient(180deg, #A0522D80, #8B451320)', borderStyle: '#CD853F', comingSoon: true },
        ] as ShopItem[]
    }
];

export default function ShopPage() {
    const { profile, user, fetchProfile } = useGameStore();
    const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
    const [purchasing, setPurchasing] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

    // Gifting State
    const [isGifting, setIsGifting] = useState(false);
    const [giftTargetId, setGiftTargetId] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [friends, setFriends] = useState<{ id: string, name: string, friendId: string }[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [purchaseSuccess, setPurchaseSuccess] = useState<ShopItem | null>(null);
    const [giftSent, setGiftSent] = useState<{ name: string; target: string; emoji: string } | null>(null);

    // Fetch friends when gifting opens
    useEffect(() => {
        if (isGifting && user?.id) {
            const fetchFriends = async () => {
                setLoadingFriends(true);
                const { data: fs } = await supabase.from('friendships')
                    .select('user_id, friend_id')
                    .eq('status', 'accepted')
                    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

                if (fs && fs.length > 0) {
                    const ids = fs.map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id);
                    const { data: targetProfiles } = await supabase.from('profiles')
                        .select('id, display_name, friend_id')
                        .in('id', ids);
                    if (targetProfiles) {
                        setFriends(targetProfiles.map(p => ({ id: p.id, name: p.display_name, friendId: p.friend_id })));
                    }
                } else {
                    setFriends([]);
                }
                setLoadingFriends(false);
            };
            fetchFriends();
        }
    }, [isGifting, user?.id]);

    // Esc key to close modal
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedItem(null);
                setIsGifting(false);
            }
        };
        if (selectedItem) {
            window.addEventListener('keydown', handleEsc);
            setQuantity(1); // Reset quantity when opening item
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedItem]);

    const coins = profile?.nous_coins ?? 0;
    const shields = profile?.shield_count ?? 0;

    const showToast = (msg: string, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3000);
    };

    const handleTransaction = async () => {
        if (!selectedItem || !user?.id) return;
        const finalPrice = selectedItem.id === 'shield_1' ? (selectedItem.price * quantity) : selectedItem.price;
        if (coins < finalPrice) { showToast('Nous insuficientes', false); return; }

        setPurchasing(true);
        try {
            const newCoins = coins - finalPrice;
            const shieldAmt = selectedItem.id === 'shield_1' ? quantity : (selectedItem.amount || 0);

            if (isGifting) {
                if (!giftTargetId.trim()) { throw new Error('Digite o ID do amigo'); }
                if (giftTargetId.trim() === profile?.friend_id) { throw new Error('Não pode presentear a si mesmo!'); }

                // Fetch target user
                const { data: targetProfile, error: targetErr } = await supabase
                    .from('profiles')
                    .select('id, shield_count, display_name, avatar_config')
                    .eq('friend_id', giftTargetId.trim())
                    .single();

                if (targetErr || !targetProfile) throw new Error('Amigo não encontrado com este ID');

                // Deduct coins from buyer
                await supabase.from('profiles').update({ nous_coins: newCoins }).eq('id', user.id);

                // Add item to target
                if (selectedItem.category === 'shield') {
                    await supabase.from('profiles')
                        .update({ shield_count: (targetProfile.shield_count || 0) + shieldAmt })
                        .eq('id', targetProfile.id);
                } else {
                    const tCfg = targetProfile.avatar_config || {};
                    const tUnlocked = tCfg.unlocked_items || [];
                    const newUnlocked = Array.from(new Set([...tUnlocked, selectedItem.id]));
                    await supabase.from('profiles')
                        .update({ avatar_config: { ...tCfg, unlocked_items: newUnlocked } })
                        .eq('id', targetProfile.id);
                }

                // Notify target with METADATA
                await supabase.from('notifications').insert({
                    user_id: targetProfile.id,
                    type: 'gift_received',
                    title: '🎁 Presente Recebido!',
                    body: `${profile?.display_name} te enviou: ${selectedItem.name} ${selectedItem.emoji}`,
                    metadata: {
                        item_id: selectedItem.id,
                        name: selectedItem.name,
                        emoji: selectedItem.emoji,
                        category: selectedItem.category,
                        shield_amount: shieldAmt,
                        sender_name: profile?.display_name
                    },
                    claimed: false
                });

                setGiftSent({ name: selectedItem.name, target: targetProfile.display_name, emoji: selectedItem.emoji });
                setTimeout(() => setGiftSent(null), 5000);
                audio.play('success');
                setSelectedItem(null); // Close shop modal

            } else {
                // Buying for self
                if (selectedItem.category === 'shield') {
                    await supabase.from('profiles')
                        .update({ nous_coins: newCoins, shield_count: shields + shieldAmt })
                        .eq('id', user.id);

                    await supabase.from('notifications').insert({
                        user_id: user.id,
                        type: 'shield_used',
                        title: `${selectedItem.name} adquirido!`,
                        body: `Você tem agora ${shields + shieldAmt} escudo(s) de ofensiva.`,
                    });
                } else {
                    const cfg = profile?.avatar_config as any || {};
                    const unlocked = cfg.unlocked_items || [];
                    const newUnlocked = Array.from(new Set([...unlocked, selectedItem.id]));

                    await supabase.from('profiles')
                        .update({
                            nous_coins: newCoins,
                            avatar_config: { ...cfg, unlocked_items: newUnlocked }
                        })
                        .eq('id', user.id);
                }

                setPurchaseSuccess(selectedItem);
                setTimeout(() => setPurchaseSuccess(null), 5000);
                setSelectedItem(null);
                audio.play('success');
            }

            await fetchProfile(user.id);
            setSelectedItem(null);
            setIsGifting(false);
            setGiftTargetId('');
        } catch (err: any) {
            showToast(err?.message ?? 'Erro ao processar transação', false);
        } finally {
            setPurchasing(false);
        }
    };

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="px-5 pt-10 pb-6 flex items-start justify-between">
                <div>
                    <p className="text-xs tracking-[0.3em] uppercase mb-1" style={{ color: 'var(--color-gold-dim)' }}>Arsenal</p>
                    <h1 className="text-3xl font-black text-display text-gradient-gold">Loja Diária</h1>
                </div>
                <div className="badge-gold text-base mt-2 px-3 py-1.5 flex items-center gap-1.5 shadow-lg shadow-amber-900/20">
                    <img src={coinImg} className="w-4 h-4 object-contain" alt="" />
                    {coins}
                </div>
            </div>

            {/* Shield count block */}
            {shields > 0 && (
                <div className="mx-5 mb-6 px-4 py-3 rounded-xl flex items-center gap-3"
                    style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}>
                    <img src={shieldImg} className="w-4 h-4 object-contain" alt="" />
                    <p className="text-xs font-bold" style={{ color: 'var(--color-success)' }}>
                        Você tem {shields} escudo{shields > 1 ? 's' : ''} de ofensiva guardado{shields > 1 ? 's' : ''}.
                    </p>
                </div>
            )}

            {/* Fortnite-Style Horizontal Layout */}
            <div className="space-y-8">
                {SHOP_SECTIONS.map((section, idx) => (
                    <div key={idx}>
                        <div className="px-5 mb-3 flex items-center gap-2">
                            <h2 className="text-sm font-black uppercase italic tracking-widest drop-shadow-md text-[var(--color-text)]">
                                {section.title}
                            </h2>
                            <div className="flex-1 h-px bg-[var(--color-border)]" />
                        </div>

                        {/* Horizontal Scroll Area */}
                        <div className="flex overflow-x-auto px-5 gap-4 pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>
                            {section.items.map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ scale: item.comingSoon ? 1 : 1.02 }}
                                    whileTap={{ scale: item.comingSoon ? 1 : 0.98 }}
                                    onClick={() => !item.comingSoon && setSelectedItem(item)}
                                    className="relative flex-shrink-0 w-36 h-56 rounded-2xl flex flex-col snap-start overflow-hidden text-left"
                                    style={{
                                        background: item.comingSoon ? '#1A1D30' : item.bgStyle,
                                        border: `2px solid ${item.comingSoon ? '#333' : item.borderStyle}`,
                                        opacity: item.comingSoon ? 0.6 : 1,
                                        boxShadow: item.comingSoon ? 'none' : `0 4px 20px ${item.borderStyle}40`
                                    }}
                                >
                                    {/* Item Rarity Glow equivalent */}
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

                                    <div className="flex-1 flex items-center justify-center text-6xl drop-shadow-2xl z-10" style={{ filter: item.comingSoon ? 'grayscale(100%)' : 'none' }}>
                                        {item.category === 'shield' ? (
                                            <img src={shieldImg} className="w-24 h-24 object-contain" alt="" />
                                        ) : item.image ? (
                                            <img src={item.image} className="w-24 h-24 object-contain" alt={item.name} />
                                        ) : item.emoji}
                                    </div>

                                    <div className="p-3 z-10">
                                        <p className="font-black text-sm text-white leading-tight uppercase italic">{item.name}</p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {item.comingSoon ? (
                                                <span className="text-[10px] font-bold text-gray-400 bg-black/40 px-2 py-0.5 rounded-sm uppercase tracking-wider">Em Breve</span>
                                            ) : (
                                                <>
                                                    <img src={coinImg} className="w-3 h-3 object-contain" alt="" />
                                                    <span className="text-xs font-black text-white">{item.price}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Glossy overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                                </motion.button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Item Focus Modal (Fortnite Style Purchase Screen) */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center items-center p-4 bg-[var(--color-modal-overlay)] backdrop-blur-sm"
                        onClick={() => { setSelectedItem(null); setIsGifting(false); }}
                    >
                        <button onClick={() => { setSelectedItem(null); setIsGifting(false); }} className="absolute top-6 right-6 p-2 rounded-full pointer-events-auto z-10" style={{ background: 'var(--color-glass-strong)', color: 'var(--color-text)' }}>
                            <X size={24} />
                        </button>

                        <motion.div
                            initial={{ y: 100, scale: 0.9 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: 100, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-sm rounded-[2rem] overflow-hidden"
                            style={{
                                background: 'var(--color-card)',
                                border: `2px solid ${selectedItem.borderStyle}`,
                                boxShadow: `0 0 60px ${selectedItem.borderStyle}30`
                            }}
                        >
                            {/* Showcase Image Area */}
                            <div className="h-48 relative flex items-center justify-center border-b border-[var(--color-border)]" style={{ background: selectedItem.bgStyle }}>
                                <div className="text-8xl drop-shadow-2xl">
                                    {selectedItem.category === 'shield' ? (
                                        <img src={shieldImg} className="w-28 h-28 object-contain animate-pulse" alt="" />
                                    ) : selectedItem.image ? (
                                        <img src={selectedItem.image} className="w-32 h-32 object-contain" alt={selectedItem.name} />
                                    ) : selectedItem.emoji}
                                </div>
                                <div className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ background: 'var(--color-overlay)', color: '#fff' }}>
                                    <ShoppingBag size={10} /> {selectedItem.category}
                                </div>
                            </div>

                            <div className="p-6">
                                <h2 className="text-3xl font-black uppercase italic leading-none mb-1" style={{ color: 'var(--color-text)' }}>{selectedItem.name}</h2>
                                <p className="text-xs mb-4" style={{ color: 'var(--color-text-sub)' }}>{selectedItem.desc}</p>

                                {/* Quantity Selector for Single Shield */}
                                {selectedItem.id === 'shield_1' && !isGifting && (
                                    <div className="mb-4 flex items-center justify-between bg-[var(--color-glass)] p-3 rounded-xl border border-[var(--color-border)]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-sub)]">Quantidade</p>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-white/10"
                                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                            >-</button>
                                            <span className="text-xl font-black min-w-[1.5rem] text-center" style={{ color: 'var(--color-text)' }}>{quantity}</span>
                                            <button
                                                onClick={() => setQuantity(prev => Math.min(10, prev + 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-white/10"
                                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                            >+</button>
                                        </div>
                                    </div>
                                )}

                                {isGifting ? (
                                    <div className="mb-6 space-y-3">
                                        <p className="text-xs font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                            <Gift size={14} className="text-amber-400" /> Para quem?
                                        </p>
                                        {loadingFriends ? (
                                            <p className="text-xs text-gray-400 p-2">Carregando amigos...</p>
                                        ) : friends.length === 0 ? (
                                            <p className="text-xs text-red-400 p-2 bg-red-500/10 rounded-xl border border-red-500/20">Você precisa ter amigos adicionados para presentear.</p>
                                        ) : (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                                    className="w-full rounded-xl px-4 py-4 font-mono text-sm focus:border-amber-400 transition-colors flex items-center justify-between shadow-inner"
                                                    style={{ background: 'var(--color-glass)', color: 'var(--color-text)', border: '1px solid var(--color-border)', outline: isDropdownOpen ? '1px solid var(--color-gold)' : 'none' }}
                                                >
                                                    <span className={giftTargetId ? '' : 'opacity-50'}>
                                                        {giftTargetId ? (
                                                            <>
                                                                <span className="font-bold">{friends.find(f => f.friendId === giftTargetId)?.name}</span>
                                                                <span className="ml-2 opacity-50">({giftTargetId})</span>
                                                            </>
                                                        ) : 'Selecione um amigo'}
                                                    </span>
                                                    <ChevronDown size={16} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-amber-400' : 'text-gray-500'}`} />
                                                </button>

                                                <AnimatePresence>
                                                    {isDropdownOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scaleY: 1 }}
                                                            exit={{ opacity: 0, y: -10, scaleY: 0.95 }}
                                                            transition={{ duration: 0.15 }}
                                                            className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-20 origin-top flex flex-col max-h-48 overflow-y-auto custom-scrollbar"
                                                            style={{
                                                                background: '#1A1D30',
                                                                border: '1px solid var(--color-border-glow)',
                                                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                                                            }}
                                                        >
                                                            {friends.map((f, i) => (
                                                                <button
                                                                    key={f.id}
                                                                    onClick={() => { setGiftTargetId(f.friendId); setIsDropdownOpen(false); }}
                                                                    className="w-full text-left px-4 py-3 text-sm font-mono transition-colors flex items-center gap-2 hover:opacity-80"
                                                                    style={{ color: 'var(--color-text)', borderBottom: i < friends.length - 1 ? '1px solid var(--color-glass)' : 'none' }}
                                                                >
                                                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0" style={{ background: 'var(--color-glass-strong)' }}>
                                                                        🧠
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold leading-tight">{f.name}</span>
                                                                        <span className="text-[10px] opacity-50">ID: {f.friendId}</span>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mb-6 rounded-xl p-4 flex justify-between items-center" style={{ background: 'var(--color-glass)', border: '1px solid var(--color-border)' }}>
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-sub)' }}>Preço</p>
                                        <p className="text-xl font-black text-yellow-400 flex items-center gap-2">
                                            <img src={coinImg} className="w-6 h-6 object-contain" alt="" />
                                            {selectedItem.id === 'shield_1' ? selectedItem.price * quantity : selectedItem.price}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {(selectedItem.id === 'shield_1' ? selectedItem.price * quantity : selectedItem.price) > coins ? (
                                        <div className="w-full py-4 rounded-xl text-center bg-red-500/20 text-red-400 font-bold uppercase tracking-widest text-sm border border-red-500/30">
                                            Nous Insuficientes
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleTransaction}
                                                disabled={purchasing}
                                                className="w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
                                                style={{ background: isGifting ? '#FF9900' : 'var(--color-gold)', color: '#000' }}
                                            >
                                                {purchasing ? <Loader2 className="animate-spin" size={18} /> : (isGifting ? 'CONFIRMAR PRESENTE' : 'COMPRAR ITEM')}
                                            </button>

                                            {!isGifting && (
                                                <button
                                                    onClick={() => setIsGifting(true)}
                                                    className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                                                    style={{ background: 'var(--color-glass)', color: 'var(--color-text-sub)', border: '1px solid var(--color-glass-strong)' }}
                                                >
                                                    <Gift size={14} /> PRESENTEAR UM AMIGO
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Corner Notifications (Purchase & Gift) */}
            <AnimatePresence>
                {(purchaseSuccess || giftSent) && (
                    <motion.div
                        initial={{ opacity: 0, x: 50, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 50, scale: 0.9 }}
                        className="fixed top-8 right-8 z-[200] panel-gold p-4 pr-6 flex items-center gap-4 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto cursor-pointer"
                        style={{ borderLeft: '4px solid #F59E0B' }}
                        onClick={() => { setPurchaseSuccess(null); setGiftSent(null); }}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-shimmer" />

                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-3xl drop-shadow-[0_0_10px_rgba(251,191,36,0.3)] shrink-0 overflow-hidden">
                            {purchaseSuccess?.category === 'shield' || giftSent?.name?.toLowerCase().includes('escudo') ? (
                                <img src={shieldImg} className="w-8 h-8 object-contain" alt="" />
                            ) : purchaseSuccess?.image ? (
                                <img src={purchaseSuccess.image} className="w-8 h-8 object-contain" alt="" />
                            ) : (
                                <span>{purchaseSuccess?.emoji || giftSent?.emoji || '🎁'}</span>
                            )}
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 mb-0.5">
                                {purchaseSuccess ? 'Compra Concluída' : 'Presente Enviado'}
                            </p>
                            <p className="text-sm font-bold text-white leading-tight">
                                {purchaseSuccess ? (
                                    <span>Você adquiriu: <b>{purchaseSuccess.name}</b></span>
                                ) : (
                                    <span>Seu presente foi enviado com sucesso!</span>
                                )}
                            </p>
                        </div>

                        <div className="ml-2 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Toast */}
            <AnimatePresence>
                {toast && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="fixed bottom-24 left-1/2 -translate-x-1/2 panel px-5 py-3 text-sm font-bold z-[120] whitespace-nowrap"
                        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6)', border: `1px solid ${toast.ok ? 'var(--color-gold)' : 'rgba(248,113,113,0.4)'}`, color: toast.ok ? '#FFF' : 'var(--color-danger)', background: toast.ok ? 'rgba(212,168,83,0.1)' : 'rgba(248,113,113,0.1)', backdropFilter: 'blur(10px)' }}>
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
