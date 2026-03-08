import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Plus, Edit2, Trash2, Image as ImageIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShopItem {
    id: string;
    name: string;
    description: string;
    category: string;
    price_nous: number;
    price_brl: number | null;
    asset_key: string;
    preview_url: string | null;
    rarity?: string;
    target_gender?: string;
    is_visible?: boolean;
    is_default?: boolean;
    disabled_categories?: string[];
    variations?: any[];
}

export function ShopTab({ addLog }: { addLog: (msg: string) => void }) {
    const [items, setItems] = useState<ShopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('shop_items').select('*').order('created_at', { ascending: false });
        console.log('ShopItems DB Response:', data);
        if (error) {
            addLog(`Erro ao carregar itens da loja: ${error.message}`);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este item da loja permanentemente? Os usuários que já o possuem não o perderão, mas ele sumirá da loja.')) return;
        const { error } = await supabase.from('shop_items').delete().eq('id', id);
        if (error) {
            addLog(`Erro ao excluir item: ${error.message}`);
        } else {
            addLog(`Item ${id} excluído com sucesso.`);
            fetchItems();
        }
    };

    const handleSave = async (item: Partial<ShopItem>) => {
        if (!item.id || !item.name || !item.category) {
            alert('Campos ID, Nome e Categoria são obrigatórios.');
            return;
        }

        const payload = {
            id: item.id,
            name: item.name,
            description: item.description || '',
            category: item.category,
            price_nous: item.price_nous || 0,
            price_brl: item.price_brl || null,
            asset_key: item.asset_key || '',
            preview_url: item.preview_url || '',
            rarity: item.rarity || 'comum',
            target_gender: item.target_gender || 'all',
            is_visible: item.is_visible !== false,
            is_default: item.is_default === true,
            disabled_categories: item.disabled_categories || [],
            variations: item.variations || []
        };

        if (editingItem && editingItem.id !== '') {
            // Update
            const { error } = await supabase.from('shop_items').update(payload).eq('id', editingItem.id);
            if (error) {
                addLog(`Erro ao atualizar item: ${error.message}`);
            } else {
                addLog(`Item ${item.name} atualizado.`);
                setIsModalOpen(false);
                fetchItems();
            }
        } else {
            // Insert
            const { error } = await supabase.from('shop_items').insert(payload);
            if (error) {
                addLog(`Erro ao criar item: ${error.message}`);
            } else {
                addLog(`Item ${item.name} criado.`);
                setIsModalOpen(false);
                fetchItems();
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black text-white">Gerenciar Loja</h3>
                <button
                    onClick={() => {
                        setEditingItem({
                            id: '', name: '', description: '', category: 'headwear', price_nous: 100, price_brl: null, asset_key: '', preview_url: '', rarity: 'comum', target_gender: 'all', is_visible: true, is_default: false, disabled_categories: [], variations: []
                        });
                        setIsModalOpen(true);
                    }}
                    className="btn-gold py-2 px-4 flex items-center gap-2 text-sm"
                >
                    <Plus size={16} /> NOVO ITEM
                </button>
            </div>

            {loading ? (
                <div className="flexjustify-center py-10"><Loader2 className="animate-spin text-white/50 w-8 h-8 mx-auto" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => (
                        <div key={item.id} className="panel p-4 flex flex-col justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
                                    {item.preview_url ? (
                                        <img src={item.preview_url} alt={item.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <ImageIcon size={24} className="text-white/20" />
                                    )}
                                    <div className="absolute bottom-1 right-1 flex flex-col items-end gap-1">
                                        <div className="text-[9px] bg-black/80 px-1 rounded text-white/90 uppercase">{item.rarity || 'comum'}</div>
                                        <div className="text-[9px] bg-blue-500/80 px-1 rounded text-white uppercase">{item.target_gender || 'all'}</div>
                                        <div className="text-[10px] bg-black/80 px-1 rounded text-white/50 uppercase">{item.category}</div>
                                        {item.is_default && <div className="text-[8px] bg-green-500/80 px-1 rounded text-white uppercase">Padrão</div>}
                                        {!item.is_visible && <div className="text-[8px] bg-red-500/80 px-1 rounded text-white uppercase">Oculto</div>}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg leading-tight">{item.name}</h4>
                                    <p className="text-xs text-white/50 mt-1">{item.description}</p>
                                    <p className="text-xs font-mono text-gold mt-2">{item.price_nous} Nous</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/5">
                                <button
                                    onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && editingItem && (
                    <ItemModal
                        item={editingItem}
                        onClose={() => setIsModalOpen(false)}
                        onSave={handleSave}
                        addLog={addLog}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function ItemModal({ item, onClose, onSave, addLog }: { item: ShopItem, onClose: () => void, onSave: (i: Partial<ShopItem>) => void, addLog: (m: string) => void }) {
    const [draft, setDraft] = useState<Partial<ShopItem>>({ ...item });
    const [uploadingObj, setUploadingObj] = useState<'preview' | 'asset' | null>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'preview_url' | 'asset_key') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingObj(field === 'preview_url' ? 'preview' : 'asset');
        try {
            const ext = file.name.split('.').pop() || 'png';
            const fileName = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

            const { data, error } = await supabase.storage.from('shop_assets').upload(fileName, file, { upsert: false });
            if (error) throw error;

            const { data: publicData } = supabase.storage.from('shop_assets').getPublicUrl(data.path);

            if (field.startsWith('var_preview_') || field.startsWith('var_asset_')) {
                const [, type, idxStr] = field.split('_');
                const idx = parseInt(idxStr);
                const isPreview = type === 'preview';
                const vars = [...(draft.variations || [])];
                if (vars[idx]) {
                    vars[idx] = { ...vars[idx], [isPreview ? 'preview_url' : 'asset_key']: publicData.publicUrl };
                    setDraft(prev => ({ ...prev, variations: vars }));
                }
            } else {
                setDraft(prev => ({ ...prev, [field]: publicData.publicUrl }));
            }
            addLog(`Imagem enviada: ${fileName}`);
        } catch (err: any) {
            addLog(`Erro no upload: ${err.message}`);
            alert(`Falha no upload: ${err.message}`);
        } finally {
            setUploadingObj(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="panel w-full max-w-2xl bg-deep/90 border-white/10 p-6 relative z-10 flex flex-col max-h-[90vh]"
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{draft.id === '' ? 'Novo Item' : 'Editar Item'}</h2>
                    <button onClick={onClose} className="p-2 text-white/50 hover:bg-white/5 rounded-full hover:bg-white/10">
                        <Plus size={16} className="rotate-45" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1">ID Único (ex: bone_vermelho)</label>
                            <input
                                type="text"
                                value={draft.id || ''}
                                onChange={e => setDraft({ ...draft, id: e.target.value })}
                                disabled={item.id !== ''}
                                className="field bg-black/50"
                                placeholder="ID do item"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1">Nome no App</label>
                            <input
                                type="text"
                                value={draft.name || ''}
                                onChange={e => setDraft({ ...draft, name: e.target.value })}
                                className="field bg-black/50"
                                placeholder="Ex: Boné de Fogo"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/50 mb-1">Descrição</label>
                        <input
                            type="text"
                            value={draft.description || ''}
                            onChange={e => setDraft({ ...draft, description: e.target.value })}
                            className="field bg-black/50"
                            placeholder="Descrição curta"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1">Preço em Nous</label>
                            <input
                                type="number"
                                value={draft.price_nous || 0}
                                onChange={e => setDraft({ ...draft, price_nous: parseInt(e.target.value) || 0 })}
                                className="field bg-black/50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1">Categoria</label>
                            <select
                                value={draft.category || 'shirt'}
                                onChange={e => setDraft({ ...draft, category: e.target.value })}
                                className="field bg-black/50"
                            >
                                <option value="shield">Vantagens (Sobrevivência/Escudo)</option>
                                <option value="outfits">Conjuntos (Equipa tudo)</option>
                                <option value="shirt">Vestuário Superior (Camisa)</option>
                                <option value="coat">Casacos (Jaqueta/Por cima)</option>
                                <option value="pants">Vestuário Inferior (Calça)</option>
                                <option value="shoes">Calçado (Tênis/Chinelo)</option>
                                <option value="headwear">Acessório de Cabeça (Boné/Chapéu)</option>
                                <option value="accessory">Acessório de Rosto</option>
                                <option value="effect">Efeito de Partículas (Aura)</option>
                                <option value="pet">Mascote</option>
                                <option value="item">Item Místico (Ex: Espada)</option>
                                <option value="gender">Personagem (Gênero)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold w-full text-white/50 mb-1">Raridade</label>
                            <select
                                value={draft.rarity || 'comum'}
                                onChange={e => setDraft({ ...draft, rarity: e.target.value })}
                                className="field bg-black/50 font-bold"
                            >
                                <option value="comum" className="text-gray-400">Cinza (Comum)</option>
                                <option value="incomum" className="text-green-400">Verde (Incomum)</option>
                                <option value="raro" className="text-blue-400">Azul (Raro)</option>
                                <option value="epico" className="text-purple-400">Roxo (Épico)</option>
                                <option value="lendario" className="text-yellow-400">Dourado (Lendário)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold w-full text-white/50 mb-1">Compatível com</label>
                            <select
                                value={draft.target_gender || 'all'}
                                onChange={e => setDraft({ ...draft, target_gender: e.target.value })}
                                className="field bg-black/50"
                            >
                                <option value="all">Sem Gênero (Todos)</option>
                                <option value="man">Masculino (Menino)</option>
                                <option value="woman">Feminino (Menina)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={draft.is_visible !== false}
                                onChange={e => setDraft({ ...draft, is_visible: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-black/50 text-gold focus:ring-gold"
                            />
                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                                Mostrar item na Loja
                            </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={draft.is_default === true}
                                onChange={e => setDraft({ ...draft, is_default: e.target.checked })}
                                className="w-4 h-4 rounded border-white/10 bg-black/50 text-gold focus:ring-gold"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
                                    Adquirido por padrão (Sem comprar)
                                </span>
                            </div>
                        </label>
                    </div>

                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-white/50 mb-1">Desativar Categorias ao Equipar</label>
                            <p className="text-[10px] text-white/40 leading-tight">
                                Selecione as categorias que serão impedidas de serem usadas junto com este item (ex: se for um Peitoral grande, selecione "Casacos").
                            </p>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                            {[
                                { id: 'outfits', label: 'Conjuntos' },
                                { id: 'shirt', label: 'Camisa' },
                                { id: 'coat', label: 'Casacos' },
                                { id: 'pants', label: 'Calças' },
                                { id: 'shoes', label: 'Calçados' },
                                { id: 'headwear', label: 'A. Cabeça' },
                                { id: 'accessory', label: 'A. Rosto' },
                            ].map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={(draft.disabled_categories || []).includes(cat.id)}
                                        onChange={(e) => {
                                            const cats = draft.disabled_categories || [];
                                            if (e.target.checked) {
                                                setDraft({ ...draft, disabled_categories: [...cats, cat.id] });
                                            } else {
                                                setDraft({ ...draft, disabled_categories: cats.filter(c => c !== cat.id) });
                                            }
                                        }}
                                        className="w-3.5 h-3.5 rounded border-white/10 bg-black/50 text-gold focus:ring-gold"
                                    />
                                    <span className="text-[11px] font-bold text-white/70 group-hover:text-white transition-colors">
                                        {cat.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <hr className="border-white/5 my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-white/50">Imagem p/ Loja (Icone)</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-black/50 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                    {draft.preview_url ? (
                                        <img src={draft.preview_url} alt="Preview" className="w-full h-full object-contain" />
                                    ) : <ImageIcon size={20} className="text-white/20" />}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleUpload(e, 'preview_url')}
                                        className="hidden"
                                        id="upload-preview"
                                        disabled={uploadingObj === 'preview'}
                                    />
                                    <label
                                        htmlFor="upload-preview"
                                        className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-xs cursor-pointer"
                                    >
                                        {uploadingObj === 'preview' ? <Loader2 size={14} className="animate-spin" /> : 'FAZER UPLOAD'}
                                    </label>
                                    <input
                                        type="text"
                                        value={draft.preview_url || ''}
                                        onChange={e => setDraft({ ...draft, preview_url: e.target.value })}
                                        className="field bg-black/50 text-[10px] mt-2 py-1.5"
                                        placeholder="Ou cole a URL direta..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-white/50">Asset do Avatar (Imagem Usável)</label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-black/50 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                    {draft.asset_key && (draft.asset_key.startsWith('http') || draft.asset_key.startsWith('data:')) ? (
                                        <img src={draft.asset_key} alt="Asset" className="w-full h-full object-contain" />
                                    ) : <ImageIcon size={20} className="text-white/20" />}
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleUpload(e, 'asset_key')}
                                        className="hidden"
                                        id="upload-asset"
                                        disabled={uploadingObj === 'asset'}
                                    />
                                    <label
                                        htmlFor="upload-asset"
                                        className="btn-ghost w-full flex items-center justify-center gap-2 py-2 text-xs cursor-pointer"
                                    >
                                        {uploadingObj === 'asset' ? <Loader2 size={14} className="animate-spin" /> : 'FAZER UPLOAD'}
                                    </label>
                                    <input
                                        type="text"
                                        value={draft.asset_key || ''}
                                        onChange={e => setDraft({ ...draft, asset_key: e.target.value })}
                                        className="field bg-black/50 text-[10px] mt-2 py-1.5"
                                        placeholder="Ou cole a URL direta..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-white/5 my-4" />

                    {/* Variations Manager */}
                    <div className="bg-black/30 p-4 rounded-xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div>
                                <h3 className="text-sm font-bold text-white">Variações do Item (Cores, Estilos)</h3>
                                <p className="text-[10px] text-white/50">Adicione variações opcionais que o jogador pode escolher ao vestir este item.</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newVars = [...(draft.variations || []), { id: `var_${Date.now()}`, label: 'Nova Cor', asset_key: '', preview_url: '' }];
                                    setDraft({ ...draft, variations: newVars });
                                }}
                                className="px-3 py-1 bg-gold/10 text-gold hover:bg-gold/20 rounded text-xs font-bold flex items-center gap-1"
                            >
                                <Plus size={14} /> ADICIONAR VARIAÇÃO
                            </button>
                        </div>

                        {(draft.variations || []).length > 0 ? (
                            <div className="space-y-4">
                                {(draft.variations || []).map((v: any, idx: number) => (
                                    <div key={idx} className="bg-deep/50 p-3 rounded-lg border border-white/5 relative group">
                                        <button
                                            onClick={() => {
                                                const newVars = [...(draft.variations || [])];
                                                newVars.splice(idx, 1);
                                                setDraft({ ...draft, variations: newVars });
                                            }}
                                            className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-500/10 rounded"
                                        >
                                            <Trash2 size={14} />
                                        </button>

                                        <div className="grid grid-cols-2 gap-3 mb-3 pr-8">
                                            <div>
                                                <label className="text-[10px] text-white/50 mb-1 block">ID da Variação (inglês, sem espaço)</label>
                                                <input
                                                    type="text"
                                                    value={v.id}
                                                    onChange={(e) => {
                                                        const newVars = [...(draft.variations || [])];
                                                        newVars[idx].id = e.target.value;
                                                        setDraft({ ...draft, variations: newVars });
                                                    }}
                                                    className="field bg-black/50 text-xs py-1"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-white/50 mb-1 block">Rótulo visível (ex: Azul, Verde)</label>
                                                <input
                                                    type="text"
                                                    value={v.label}
                                                    onChange={(e) => {
                                                        const newVars = [...(draft.variations || [])];
                                                        newVars[idx].label = e.target.value;
                                                        setDraft({ ...draft, variations: newVars });
                                                    }}
                                                    className="field bg-black/50 text-xs py-1"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex gap-2">
                                                <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center shrink-0">
                                                    {v.preview_url ? <img src={v.preview_url} className="w-full h-full object-contain" /> : <ImageIcon size={14} className="text-white/20" />}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-white/50 mb-1 block">Ícone (Preview)</label>
                                                    <input
                                                        type="file"
                                                        id={`upload_vprev_${idx}`}
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleUpload(e, `var_preview_${idx}` as any)}
                                                    />
                                                    <label htmlFor={`upload_vprev_${idx}`} className="text-[9px] cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 inline-block mb-1">Upload</label>
                                                    <input type="text" value={v.preview_url} onChange={(e) => {
                                                        const newVars = [...(draft.variations || [])];
                                                        newVars[idx].preview_url = e.target.value;
                                                        setDraft({ ...draft, variations: newVars });
                                                    }} className="w-full bg-black/50 border border-white/10 text-[9px] px-1 py-0.5 rounded" placeholder="URL" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="w-10 h-10 bg-black/50 rounded flex items-center justify-center shrink-0">
                                                    {v.asset_key ? <img src={v.asset_key} className="w-full h-full object-contain" /> : <ImageIcon size={14} className="text-white/20" />}
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-[9px] text-white/50 mb-1 block">Imagem no Boneco</label>
                                                    <input
                                                        type="file"
                                                        id={`upload_vast_${idx}`}
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => handleUpload(e, `var_asset_${idx}` as any)}
                                                    />
                                                    <label htmlFor={`upload_vast_${idx}`} className="text-[9px] cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10 inline-block mb-1">Upload</label>
                                                    <input type="text" value={v.asset_key} onChange={(e) => {
                                                        const newVars = [...(draft.variations || [])];
                                                        newVars[idx].asset_key = e.target.value;
                                                        setDraft({ ...draft, variations: newVars });
                                                    }} className="w-full bg-black/50 border border-white/10 text-[9px] px-1 py-0.5 rounded" placeholder="URL" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-white/30 text-center py-2">Este item não possui variações além da principal.</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="btn-ghost">Cancelar</button>
                    <button onClick={() => onSave(draft)} className="btn-gold flex items-center gap-2">
                        <Check size={18} /> SALVAR ITEM
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
