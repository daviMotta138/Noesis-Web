import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Gift, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useGameStore } from '../store/useGameStore';
import { audio } from '../lib/audio';
import coinImg from '../assets/coin.webp';
import shieldImg from '../assets/shield.png';
import { TutorialOverlay } from '../components/TutorialOverlay';

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
    rarity?: string;
}

// We will dynamically fetch this from Supabase now.

export default function ShopPage() {
    const navigate = useNavigate();
    const { profile, user, fetchProfile } = useGameStore();
    const [shopSections, setShopSections] = useState<{ title: string, items: ShopItem[] }[]>([]);
    const [loadingShop, setLoadingShop] = useState(true);
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

    // Fetch dynamic shop items
    useEffect(() => {
        const fetchShop = async () => {
            setLoadingShop(true);
            const { data, error } = await supabase
                .from('shop_items')
                .select('*')
                .eq('is_visible', true)
                .eq('is_default', false)
                .order('price_nous', { ascending: true });
            if (error) {
                console.error('Error fetching shop items:', error);
                setLoadingShop(false);
                return;
            }

            // Map generic database items into the UI interface
            const mappedItems: ShopItem[] = data.map((item: any) => {
                let amount = item.shield_amount || 1;
                // Fallbacks if not set
                let bgStyle = 'linear-gradient(180deg, #FFFFFF80, #CCCCCC20)';
                let borderStyle = '#FFFFFF';
                let emoji = '📦';

                // Rarities colors (Fortnite Style)
                const rarityColors: Record<string, { bg: string, border: string }> = {
                    comum: { border: '#A0AEC0', bg: 'linear-gradient(180deg, #4A556880, #2D374820)' }, // Gray
                    incomum: { border: '#48BB78', bg: 'linear-gradient(180deg, #38A16980, #27674920)' }, // Green
                    raro: { border: '#4299E1', bg: 'linear-gradient(180deg, #3182CE80, #2B6CB020)' }, // Blue
                    epico: { border: '#9F7AEA', bg: 'linear-gradient(180deg, #805AD580, #553C9A20)' }, // Purple
                    lendario: { border: '#ECC94B', bg: 'linear-gradient(180deg, #D69E2E80, #975A1620)' }, // Gold
                };

                const r = item.rarity || 'comum';
                if (rarityColors[r]) {
                    bgStyle = rarityColors[r].bg;
                    borderStyle = rarityColors[r].border;
                }

                // Emojis based on category
                if (item.category === 'shield') emoji = '🛡️';
                else if (item.category === 'headwear') emoji = '🧢';
                else if (item.category === 'hair') emoji = '💇';
                else if (item.category === 'shirt') emoji = '👕';
                else if (item.category === 'outfits') emoji = '🛍️';
                else if (item.category === 'coat') emoji = '🧥';
                else if (item.category === 'pants') emoji = '👖';
                else if (item.category === 'shoes') emoji = '👟';
                else if (item.category === 'accessory') emoji = '🕶️';
                else if (item.category === 'effect') emoji = '✨';
                else if (item.category === 'item') emoji = '🗡️';
                else if (item.category === 'pet') emoji = '🦉';
                else if (item.category === 'gender') emoji = '👤';

                return {
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    price: item.price_nous,
                    desc: item.description,
                    emoji,
                    bgStyle,
                    borderStyle,
                    amount,
                    image: item.preview_url || undefined,
                    rarity: r
                };
            });

            // Group them into explicit user-requested categories
            const upperWear = mappedItems.filter(i => ['shirt', 'coat'].includes(i.category));
            const lowerWear = mappedItems.filter(i => ['pants', 'shoes'].includes(i.category));
            const outfits = mappedItems.filter(i => i.category === 'outfits');
            const accessories = mappedItems.filter(i => ['headwear', 'accessory', 'hair'].includes(i.category));

            const survival = mappedItems.filter(i => i.category === 'shield');
            const characters = mappedItems.filter(i => i.category === 'gender');
            const mystics = mappedItems.filter(i => ['item', 'pet'].includes(i.category));
            const effects = mappedItems.filter(i => i.category === 'effect');

            setShopSections([
                { title: 'Personagens', items: characters },
                { title: 'Conjuntos Completos', items: outfits },
                { title: 'Vestiário Superior', items: upperWear },
                { title: 'Vestiário Inferior', items: lowerWear },
                { title: 'Acessórios & Cabelo', items: accessories },
                { title: 'Vantagens (Sobrevivência)', items: survival },
                { title: 'Misticismo', items: mystics },
                { title: 'Efeitos Especiais', items: effects }
            ].filter(sec => sec.items.length > 0));

            setLoadingShop(false);
        };

        fetchShop();
    }, []);


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

            {/* Item Grid logic mapping over shopSections */}
            {loadingShop ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <Loader2 className="animate-spin w-8 h-8 mb-4" />
                    <p className="text-xs uppercase tracking-widest font-bold">Carregando Estoque...</p>
                </div>
            ) : (
                <div id="tutorial-shop-items" className="space-y-12">
                    {shopSections.map((section, idx) => (
                        <div key={idx} className="px-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent to-white/10" />
                                <h2 className="text-sm font-black uppercase tracking-widest text-white/50">{section.title}</h2>
                                <div className="h-[2px] flex-1 bg-gradient-to-l from-transparent to-white/10" />
                            </div>

                            {/* Horizontal Scroll Area */}
                            <div className="flex overflow-x-auto px-5 gap-4 pb-4 snap-x" style={{ scrollbarWidth: 'none' }}>
                                {section.items.map((item) => {
                                    // Check if user already owns the cosmetic item
                                    const isOwned = item.category !== 'shield' && item.category !== 'item' && item.category !== 'pet' && ((profile?.avatar_config as any)?.unlocked_items as string[] || []).includes(item.id);

                                    return (
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
                                                    ) : isOwned ? (
                                                        <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">Adquirido</span>
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
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Item Focus Modal (Fortnite Style Purchase Screen) */}
            <AnimatePresence>
                {selectedItem && (() => {
                    const isItemSelectedOwned = selectedItem.category !== 'shield' && selectedItem.category !== 'item' && selectedItem.category !== 'pet' && ((profile?.avatar_config as any)?.unlocked_items as string[] || []).includes(selectedItem.id);
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex flex-col justify-end md:justify-center items-center p-4 bg-[#0D0F1C]/80"
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
                                className="w-full max-w-sm rounded-[2rem] overflow-y-auto custom-scrollbar max-h-[90vh]"
                                style={{
                                    background: '#1A1D30',
                                    border: `2px solid ${selectedItem.borderStyle}`,
                                    boxShadow: `0 0 60px ${selectedItem.borderStyle}30`
                                }}
                            >
                                {/* Showcase Image Area */}
                                <div className="h-48 shrink-0 relative flex items-center justify-center border-b border-[var(--color-border)]" style={{ background: selectedItem.bgStyle }}>
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
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-2 rounded-xl border border-[#D4A853]/20 flex flex-col max-h-48 overflow-y-auto custom-scrollbar"
                                                                style={{
                                                                    background: '#1A1D30',
                                                                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
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
                                        {isGifting ? (
                                            <button
                                                onClick={handleTransaction}
                                                disabled={purchasing}
                                                className="w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
                                                style={{ background: '#FF9900', color: '#000' }}
                                            >
                                                {purchasing ? <Loader2 className="animate-spin" size={18} /> : 'CONFIRMAR PRESENTE'}
                                            </button>
                                        ) : (
                                            <>
                                                {isItemSelectedOwned ? (
                                                    <button
                                                        onClick={() => navigate('/avatar')}
                                                        className="w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
                                                        style={{ background: 'var(--color-gold)', color: '#000' }}
                                                    >
                                                        PERSONALIZAR
                                                    </button>
                                                ) : (selectedItem.id === 'shield_1' ? selectedItem.price * quantity : selectedItem.price) > coins ? (
                                                    <div className="w-full py-4 rounded-xl text-center bg-red-500/20 text-red-400 font-bold uppercase tracking-widest text-sm border border-red-500/30">
                                                        Nous Insuficientes
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={handleTransaction}
                                                        disabled={purchasing}
                                                        className="w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-sm transition-transform active:scale-95 flex items-center justify-center gap-2"
                                                        style={{ background: 'var(--color-gold)', color: '#000' }}
                                                    >
                                                        {purchasing ? <Loader2 className="animate-spin" size={18} /> : 'COMPRAR ITEM'}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => setIsGifting(true)}
                                                    className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2"
                                                    style={{ background: 'var(--color-glass)', color: 'var(--color-text-sub)', border: '1px solid var(--color-glass-strong)' }}
                                                >
                                                    <Gift size={14} /> PRESENTEAR UM AMIGO
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
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

            <TutorialOverlay
                tutorialKey="shop_seen"
                steps={[
                    {
                        target: 'body',
                        content: 'Bem-vindo à Loja Diária! Aqui você pode usar seus Nós de Conhecimento para comprar cosméticos e vantagens.',
                        placement: 'center',
                        disableBeacon: true,
                    },
                    {
                        target: '#tutorial-shop-items',
                        content: 'Navegue pelas seções! Temos conjuntos, roupas, escudos de proteção e muito mais.',
                        disableBeacon: true,
                    },
                    {
                        target: 'body',
                        content: 'Tem algum amigo jogando? Ao clicar em qualquer item, você verá a opção "PRESENTEAR UM AMIGO". Aproveite para surpreender alguém!',
                        placement: 'center',
                        disableBeacon: true,
                    }
                ]}
            />
        </div>
    );
}
