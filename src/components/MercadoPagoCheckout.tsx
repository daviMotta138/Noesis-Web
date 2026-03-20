import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, QrCode, X, Loader2, CheckCircle2,
  Copy, Check, AlertTriangle, RefreshCw, ChevronLeft,
  ShieldCheck, Gift, Search, UserCheck,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MP_PUBLIC_KEY = 'TEST-338156d9-1295-49b9-a599-ad28c046d67c';

declare global {
  interface Window { MercadoPago: any }
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Pack {
  id: string;
  nous: number;
  price: string;
  cents: number;
  label: string;
  accent?: string;
}

interface CheckoutProps {
  pack: Pack;
  userId: string;
  userEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface GiftRecipient {
  id: string;
  display_name: string;
  friend_id: string;
}

type Step = 'select-method' | 'card-form' | 'pix-waiting' | 'success' | 'error';

// ─── Utilitário: copiar texto ─────────────────────────────────────────────────
function useCopyText() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, []);
  return { copied, copy };
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const MercadoPagoCheckout = ({
  pack, userId, userEmail, onClose, onSuccess
}: CheckoutProps) => {
  const [step, setStep] = useState<Step>('select-method');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // SDK
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [mpInstance, setMpInstance] = useState<any>(null);
  const cardFormRef = useRef<any>(null);

  // Erros de validação inline do CardForm
  const [cardErrors, setCardErrors] = useState<string[]>([]);

  // Pix
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrBase64, setPixQrBase64] = useState('');
  const [pixPaymentId, setPixPaymentId] = useState<number | null>(null);
  const [pixPolling, setPixPolling] = useState(false);

  // Gift
  const [giftMode, setGiftMode] = useState(false);
  const [giftSearch, setGiftSearch] = useState('');
  const [giftSearching, setGiftSearching] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<GiftRecipient | null>(null);
  const [giftSearchError, setGiftSearchError] = useState('');

  const { copied, copy } = useCopyText();

  // ─── Carregar SDK ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (document.querySelector('script[src*="mercadopago"]')) {
      if (window.MercadoPago) {
        const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
        setMpInstance(mp);
        setIsSdkLoaded(true);
      }
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      const mp = new window.MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      setMpInstance(mp);
      setIsSdkLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // ─── Montar CardForm com retry ────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'card-form' || !mpInstance || cardFormRef.current) return;

    const requiredIds = [
      'mp-card-number', 'mp-expiration', 'mp-cvv',
      'mp-name', 'mp-email', 'mp-doc-type', 'mp-doc-number', 'mp-installments'
    ];

    let tries = 0;
    const MAX_TRIES = 20;

    // IMPORTANTE: declarar ANTES de mountCardForm para evitar TDZ
    let retryInterval: ReturnType<typeof setInterval>;

    const mountCardForm = () => {
      if (cardFormRef.current) return;

      const missing = requiredIds.filter(id => !document.getElementById(id));
      if (missing.length > 0) {
        tries++;
        if (tries < MAX_TRIES) return;
        console.error('[CardForm] Campos não encontrados após', MAX_TRIES, 'tentativas:', missing);
        clearInterval(retryInterval);
        return;
      }

      clearInterval(retryInterval);
      setCardErrors([]);

      try {
        const cf = mpInstance.cardForm({
          amount: (pack.cents / 100).toString(),
          iframe: true,
          // ── Estilo dos iframes (hack SDK) ──────────────────────────────
          customFonts: [
            { src: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500&display=swap' }
          ],
          style: {
            '.Input': {
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px',
              fontFamily: "'Outfit', system-ui, sans-serif",
              fontWeight: '500',
            },
            '.Input::placeholder': {
              color: 'rgba(255, 255, 255, 0.25)',
            },
            '.Input:focus': {
              outline: 'none',
            },
            '.Label': {
              color: 'rgba(255,255,255,0.4)',
              fontSize: '11px',
            },
            '.Input--error': {
              color: '#F87171',
            },
          },
          form: {
            id: 'mp-card-form',
            cardNumber: { id: 'mp-card-number', placeholder: '•••• •••• •••• ••••' },
            expirationDate: { id: 'mp-expiration', placeholder: 'MM/AA' },
            securityCode: { id: 'mp-cvv', placeholder: 'CVV' },
            cardholderName: { id: 'mp-name', placeholder: 'Nome no cartão' },
            cardholderEmail: { id: 'mp-email', placeholder: 'seu@email.com' },
            issuer: { id: 'mp-issuer' },
            installments: { id: 'mp-installments' },
            identificationType: { id: 'mp-doc-type' },
            identificationNumber: { id: 'mp-doc-number', placeholder: 'CPF' },
          },
          callbacks: {
            onFormMounted: (err: any) => {
              if (err) console.error('[CardForm] Erro ao montar:', err);
              else console.log('[CardForm] Montado com sucesso.');
            },
            // ── Mostrar erros de validação inline ──────────────────────
            onValidityChange: (errors: any, _field: string) => {
              if (errors && errors.length > 0) {
                // Traduzir erros comuns
                const translations: Record<string, string> = {
                  'expirationYear value should be greater or equal than': 'Data de validade expirada',
                  'is required': 'Campo obrigatório',
                  'invalid': 'Dados inválidos',
                  'should be greater or equal': 'Valor inválido',
                };
                const msgs = errors.map((e: any) => {
                  const raw = e.message || '';
                  for (const [key, val] of Object.entries(translations)) {
                    if (raw.toLowerCase().includes(key.toLowerCase())) return val;
                  }
                  return raw;
                });
                setCardErrors(prev => {
                  const combined = [...new Set([...prev, ...msgs])];
                  return combined.slice(0, 3);
                });
              } else {
                setCardErrors([]);
              }
            },
            onError: (errors: any) => {
              if (!Array.isArray(errors)) return;
              const msgs = errors.map((e: any) => {
                const raw = e.message || '';
                const translations: Record<string, string> = {
                  'expirationYear value should be greater or equal': 'Data de validade expirada — use MM/30 ou posterior',
                  'expirationMonth': 'Mês de validade inválido',
                  'cardNumber': 'Número do cartão inválido',
                  'securityCode': 'CVV inválido',
                  'cardholderName': 'Nome no cartão inválido',
                };
                for (const [key, val] of Object.entries(translations)) {
                  if (raw.toLowerCase().includes(key.toLowerCase())) return val;
                }
                return raw;
              });
              setCardErrors(msgs.filter(Boolean));
            },
            onSubmit: async (e: any) => {
              e.preventDefault();
              setCardErrors([]);
              const formData = cf.getCardFormData();
              console.log('[CardForm] Dados:', {
                method: formData?.paymentMethodId,
                hasToken: !!formData?.token,
                installments: formData?.installments,
              });
              await processCreditCard(formData);
            },
          },
        });
        cardFormRef.current = cf;
        console.log('[CardForm] Criado após', tries, 'tentativas.');
      } catch (err) {
        console.error('[CardForm] Erro ao criar:', err);
      }
    };

    mountCardForm();
    retryInterval = setInterval(mountCardForm, 200);

    return () => {
      clearInterval(retryInterval);
      if (cardFormRef.current) {
        try { cardFormRef.current.unmount?.(); } catch (_) {}
        cardFormRef.current = null;
      }
    };
  }, [step, mpInstance]);

  // ─── Desmontar CardForm ao fechar ─────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (cardFormRef.current) {
        try { cardFormRef.current.unmount?.(); } catch (_) {}
        cardFormRef.current = null;
      }
    };
  }, []);

  // ─── Polling do Pix ───────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'pix-waiting' || !pixPaymentId) return;

    setPixPolling(true);
    let tries = 0;
    const MAX_TRIES = 24;

    const interval = setInterval(async () => {
      tries++;
      try {
        const { data: payment, error } = await supabase
          .from('payment_history')
          .select('status')
          .eq('mp_payment_id', String(pixPaymentId))
          .eq('status', 'approved')
          .maybeSingle();

        if (error) {
          const code = (error as any)?.code;
          if (code !== 'PGRST116' && code !== '42P01') {
            console.warn('[Pix polling] Erro:', error.message);
          }
          if (tries >= MAX_TRIES) { clearInterval(interval); setPixPolling(false); }
          return;
        }

        if (payment) {
          clearInterval(interval);
          setPixPolling(false);
          setStep('success');
          setTimeout(() => onSuccess(), 3000);
          return;
        }
      } catch (_) {}

      if (tries >= MAX_TRIES) {
        clearInterval(interval);
        setPixPolling(false);
      }
    }, 5000);

    return () => { clearInterval(interval); setPixPolling(false); };
  }, [step, pixPaymentId]);

  // ─── Busca de destinatário do presente ───────────────────────────────────
  const searchGiftRecipient = async () => {
    if (!giftSearch.trim()) return;
    setGiftSearching(true);
    setGiftSearchError('');
    setGiftRecipient(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, friend_id')
        .or(`friend_id.ilike.${giftSearch.trim()},display_name.ilike.%${giftSearch.trim()}%`)
        .neq('id', userId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setGiftSearchError('Usuário não encontrado. Verifique o código ou nome.');
      } else {
        setGiftRecipient(data as GiftRecipient);
      }
    } catch (err: any) {
      setGiftSearchError('Erro ao buscar usuário.');
    } finally {
      setGiftSearching(false);
    }
  };

  // ─── Helper: userId para crédito (gift ou self) ───────────────────────────
  const targetUserId = giftMode && giftRecipient ? giftRecipient.id : userId;
  const effectiveNous = pack.nous + (giftMode ? Math.round(pack.nous * 0.1) : 0); // +10% quando presenteia

  // ─── Processar cartão de crédito ─────────────────────────────────────────
  const processCreditCard = async (formData: any) => {
    if (!formData?.token) {
      setErrorMsg('Não foi possível tokenizar o cartão. Verifique os dados e tente novamente.');
      setStep('error');
      return;
    }
    if (giftMode && !giftRecipient) {
      setCardErrors(['Selecione um destinatário para o presente antes de pagar.']);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-process-payment', {
        body: {
          payment_method_id: formData.paymentMethodId,
          token: formData.token,
          issuer_id: formData.issuerId,
          installments: formData.installments,
          payer: {
            email: formData.payer?.email || userEmail,
            identification: formData.payer?.identification,
          },
          pack_id: pack.id,
          user_id: userId,         // quem pagou
          gift_user_id: giftMode ? targetUserId : undefined, // quem recebe
          amount_cents: pack.cents,
          nous_earned: effectiveNous,
        },
      });

      if (error || !data) throw error || new Error('Resposta vazia da função');
      if (data.error) throw new Error(data.error);

      if (data.status === 'approved') {
        setStep('success');
        setTimeout(() => onSuccess(), 3000);
      } else if (data.status === 'rejected') {
        const reasons: Record<string, string> = {
          cc_rejected_bad_filled_card_number: 'Número do cartão inválido',
          cc_rejected_bad_filled_date: 'Data de validade inválida ou expirada',
          cc_rejected_bad_filled_security_code: 'CVV inválido',
          cc_rejected_insufficient_amount: 'Saldo insuficiente no cartão',
          cc_rejected_call_for_authorize: 'Pagamento bloqueado pelo banco — ligue para autorizar',
          cc_rejected_card_disabled: 'Cartão bloqueado — contate o banco',
          cc_rejected_duplicated_payment: 'Pagamento duplicado',
          cc_rejected_high_risk: 'Pagamento recusado por segurança',
        };
        const detail = data.status_detail || '';
        setErrorMsg(reasons[detail] || `Cartão recusado (${detail || 'motivo desconhecido'})`);
        setStep('error');
      } else {
        setErrorMsg(`Status inesperado: ${data.status}`);
        setStep('error');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao processar pagamento.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Processar Pix ────────────────────────────────────────────────────────
  const handlePix = async () => {
    if (giftMode && !giftRecipient) {
      setGiftSearchError('Selecione um destinatário antes de continuar.');
      return;
    }
    setLoading(true);
    setStep('pix-waiting');
    setPixQrCode('');
    setPixQrBase64('');
    setPixPaymentId(null);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-process-payment', {
        body: {
          payment_method_id: 'pix',
          payer: {
            email: userEmail || 'comprador@teste.com',
            identification: { type: 'CPF', number: '19119119100' },
          },
          pack_id: pack.id,
          user_id: userId,
          gift_user_id: giftMode ? targetUserId : undefined,
          amount_cents: pack.cents,
          nous_earned: effectiveNous,
        },
      });

      if (error || !data) throw error || new Error('Resposta vazia da função');
      if (data.error) throw new Error(data.error);

      const poi = data.point_of_interaction?.transaction_data;
      if (!poi?.qr_code) throw new Error('QR Code não retornado pelo Mercado Pago.');

      setPixQrCode(poi.qr_code);
      setPixQrBase64(poi.qr_code_base64 || '');
      setPixPaymentId(data.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao gerar Pix.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verificar pagamento manualmente ─────────────────────────────────────
  const checkPixManually = async () => {
    if (!pixPaymentId) return;
    setPixPolling(true);
    try {
      const { data: payment } = await supabase
        .from('payment_history')
        .select('status')
        .eq('mp_payment_id', String(pixPaymentId))
        .eq('status', 'approved')
        .maybeSingle();

      if (payment) {
        setStep('success');
        setTimeout(() => onSuccess(), 3000);
      }
    } catch (_) {}
    setPixPolling(false);
  };

  // ─── Renderização ─────────────────────────────────────────────────────────
  const accent = pack.accent || '#D4A853';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 80, opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="w-full sm:max-w-md relative"
        style={{
          background: 'linear-gradient(145deg, #14162A 0%, #0E1020 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '96dvh',
          overflowY: 'auto',
        }}
      >
        {/* Barra de cor */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl"
          style={{ background: `linear-gradient(90deg, ${accent}CC, ${accent}44, ${accent}CC)` }}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Finalizar Compra</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {pack.label} · {effectiveNous.toLocaleString()} Nous · {pack.price}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>

        {/* Toggle: Para mim / Presentear */}
        {(step === 'select-method' || step === 'card-form') && (
          <div className="px-6 pb-4">
            <div className="flex rounded-xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => { setGiftMode(false); setGiftRecipient(null); setGiftSearch(''); }}
                className="flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: !giftMode ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: !giftMode ? 'white' : 'rgba(255,255,255,0.35)',
                  borderRadius: '10px 0 0 10px',
                }}
              >
                <UserCheck size={13} /> Para mim
              </button>
              <button
                onClick={() => setGiftMode(true)}
                className="flex-1 py-2.5 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: giftMode ? `rgba(212,168,83,0.2)` : 'transparent',
                  color: giftMode ? '#D4A853' : 'rgba(255,255,255,0.35)',
                  borderRadius: '0 10px 10px 0',
                }}
              >
                <Gift size={13} /> Presentear +10%
              </button>
            </div>

            {/* Busca de destinatário */}
            <AnimatePresence>
              {giftMode && (
                <motion.div
                  key="gift-search"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2 overflow-hidden"
                >
                  {giftRecipient ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.25)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
                        style={{ background: 'rgba(212,168,83,0.2)', color: '#D4A853' }}>
                        {giftRecipient.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-white">{giftRecipient.display_name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>#{giftRecipient.friend_id}</p>
                      </div>
                      <button onClick={() => { setGiftRecipient(null); setGiftSearch(''); }}
                        className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        Trocar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          value={giftSearch}
                          onChange={e => setGiftSearch(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && searchGiftRecipient()}
                          placeholder="Código do amigo ou nome..."
                          className="mp-input-field flex-1 text-sm"
                          style={{ height: 40, fontSize: 13 }}
                        />
                        <button
                          onClick={searchGiftRecipient}
                          disabled={giftSearching || !giftSearch.trim()}
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: giftSearching ? 'rgba(255,255,255,0.05)' : 'rgba(212,168,83,0.2)',
                            color: '#D4A853',
                          }}
                        >
                          {giftSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </button>
                      </div>
                      {giftSearchError && (
                        <p className="text-xs font-medium" style={{ color: '#F87171' }}>{giftSearchError}</p>
                      )}
                      <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        Busque pelo código curto (#XXXX) ou nome de exibição do amigo.
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Conteúdo principal */}
        <div className="px-6 pb-8">
          <AnimatePresence mode="wait">

            {/* ── Seleção de método ── */}
            {step === 'select-method' && (
              <motion.div key="select"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="space-y-3"
              >
                <p className="text-xs font-semibold uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(255,255,255,0.3)' }}>Como deseja pagar?</p>

                <button
                  onClick={() => setStep('card-form')}
                  className="w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>
                    <CreditCard size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">Cartão de Crédito</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Aprovação imediata · Visa, Mastercard e mais
                    </p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8' }}>POPULAR</div>
                </button>

                <button
                  onClick={handlePix}
                  disabled={loading || (giftMode && !giftRecipient)}
                  className="w-full p-4 rounded-2xl flex items-center gap-4 text-left transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    opacity: (loading || (giftMode && !giftRecipient)) ? 0.5 : 1,
                  }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                    {loading ? <Loader2 size={22} className="animate-spin" /> : <QrCode size={22} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">Pix</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Confirmação em segundos · Sem taxas
                    </p>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>+5% bônus</div>
                </button>

                <div className="flex items-center justify-center gap-2 pt-3 pb-1">
                  <ShieldCheck size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    Pagamento seguro via Mercado Pago
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── Formulário de cartão ── */}
            {step === 'card-form' && (
              <motion.div key="card"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              >
                <button
                  onClick={() => {
                    if (cardFormRef.current) {
                      try { cardFormRef.current.unmount?.(); } catch (_) {}
                      cardFormRef.current = null;
                    }
                    setCardErrors([]);
                    setStep('select-method');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold mb-5 -ml-1"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  <ChevronLeft size={14} /> Voltar
                </button>

                {!isSdkLoaded ? (
                  <div className="flex flex-col items-center py-10 gap-3">
                    <Loader2 size={32} className="animate-spin" style={{ color: accent }} />
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Carregando formulário...</p>
                  </div>
                ) : (
                  <form id="mp-card-form" className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>Número do Cartão</label>
                      <div id="mp-card-number" className="mp-field" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>Validade</label>
                        <div id="mp-expiration" className="mp-field" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>CVV</label>
                        <div id="mp-cvv" className="mp-field" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>Nome no Cartão</label>
                      <input id="mp-name" className="mp-input-field w-full"
                        placeholder="NOME COMPLETO" autoComplete="cc-name" />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>E-mail</label>
                      <input id="mp-email" type="email" className="mp-input-field w-full"
                        placeholder="seu@email.com" defaultValue={userEmail} autoComplete="email" />
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>Tipo Doc</label>
                        <select id="mp-doc-type" className="mp-select-field w-full" />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.4)' }}>Número Doc</label>
                        <input id="mp-doc-number" className="mp-input-field w-full"
                          placeholder="000.000.000-00" autoComplete="off" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.4)' }}>Parcelas</label>
                      <select id="mp-installments" className="mp-select-field w-full" />
                    </div>

                    <select id="mp-issuer" className="hidden" />

                    {/* ── Erros de validação inline ── */}
                    <AnimatePresence>
                      {cardErrors.length > 0 && (
                        <motion.div
                          key="card-errors"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="rounded-xl px-4 py-3 space-y-1"
                          style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
                        >
                          {cardErrors.map((err, i) => (
                            <p key={i} className="text-xs font-medium flex items-center gap-2"
                              style={{ color: '#F87171' }}>
                              <AlertTriangle size={12} className="flex-shrink-0" /> {err}
                            </p>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      type="submit"
                      disabled={loading || (giftMode && !giftRecipient)}
                      className="w-full py-4 rounded-2xl font-black text-sm tracking-wider mt-2 flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: loading
                          ? 'rgba(255,255,255,0.06)'
                          : giftMode
                            ? `linear-gradient(135deg, #C49333, #E8B84B)`
                            : `linear-gradient(135deg, #6366F1, #818CF8)`,
                        color: loading ? 'rgba(255,255,255,0.3)' : (giftMode ? '#1A1000' : 'white'),
                        boxShadow: loading ? 'none' : giftMode
                          ? '0 8px 24px rgba(212,168,83,0.4)'
                          : '0 8px 24px rgba(99,102,241,0.4)',
                        opacity: (giftMode && !giftRecipient) ? 0.5 : 1,
                      }}
                    >
                      {loading
                        ? <><Loader2 size={18} className="animate-spin" /> Processando...</>
                        : giftMode
                          ? <><Gift size={16} /> PRESENTEAR {pack.price}</>
                          : `PAGAR ${pack.price}`
                      }
                    </button>
                  </form>
                )}
              </motion.div>
            )}

            {/* ── Waiting Pix ── */}
            {step === 'pix-waiting' && (
              <motion.div key="pix"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-5"
              >
                {loading && !pixQrCode && (
                  <>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mt-4"
                      style={{ background: 'rgba(52,211,153,0.1)' }}>
                      <Loader2 size={32} className="animate-spin" style={{ color: '#34D399' }} />
                    </div>
                    <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Gerando seu Pix...
                    </p>
                  </>
                )}

                {pixQrCode && (
                  <>
                    <div className="p-3 rounded-2xl bg-white shadow-2xl"
                      style={{ boxShadow: '0 0 40px rgba(52,211,153,0.3)' }}>
                      {pixQrBase64
                        ? <img src={`data:image/png;base64,${pixQrBase64}`}
                            className="w-44 h-44 block" alt="QR Code Pix"
                            style={{ imageRendering: 'pixelated' }} />
                        : <div className="w-44 h-44 flex items-center justify-center bg-gray-100">
                            <QrCode size={80} style={{ color: '#333' }} />
                          </div>
                      }
                    </div>

                    <div className="w-full space-y-3">
                      <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                        Escaneie o QR Code acima ou copie o código Pix:
                      </p>
                      <button onClick={() => copy(pixQrCode)}
                        className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
                        style={{
                          background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(52,211,153,0.1)',
                          border: `1px solid ${copied ? 'rgba(52,211,153,0.5)' : 'rgba(52,211,153,0.2)'}`,
                          color: '#34D399',
                        }}>
                        {copied ? <><Check size={16} /> Código copiado!</> : <><Copy size={16} /> Copiar código Pix</>}
                      </button>

                      <div className="flex items-center justify-between px-4 py-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FBBF24' }} />
                          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {pixPolling ? 'Aguardando confirmação...' : 'Verificação pausada'}
                          </span>
                        </div>
                        <button onClick={checkPixManually} disabled={pixPolling}
                          className="text-xs font-bold flex items-center gap-1 transition-all"
                          style={{ color: pixPolling ? 'rgba(255,255,255,0.2)' : '#34D399', cursor: pixPolling ? 'not-allowed' : 'pointer' }}>
                          <RefreshCw size={12} className={pixPolling ? 'animate-spin' : ''} /> Verificar
                        </button>
                      </div>
                    </div>

                    <button onClick={() => { setStep('select-method'); setPixQrCode(''); setPixPaymentId(null); }}
                      className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Cancelar e voltar
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ── Sucesso ── */}
            {step === 'success' && (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-5 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, damping: 16 }}
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{ background: giftMode ? 'rgba(212,168,83,0.15)' : 'rgba(52,211,153,0.15)' }}
                >
                  {giftMode
                    ? <Gift size={48} style={{ color: '#D4A853' }} />
                    : <CheckCircle2 size={52} style={{ color: '#34D399' }} />
                  }
                </motion.div>
                <div>
                  <h3 className="text-2xl font-black text-white">
                    {giftMode ? 'Presente Enviado! 🎁' : 'Pagamento Aprovado!'}
                  </h3>
                  <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {giftMode
                      ? `${effectiveNous.toLocaleString()} Nous foram enviados para ${giftRecipient?.display_name}.`
                      : `${effectiveNous.toLocaleString()} Nous foram adicionados à sua conta.`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
                  style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <Loader2 size={14} className="animate-spin" style={{ color: '#34D399' }} />
                  <span className="text-xs font-bold" style={{ color: '#34D399' }}>Redirecionando...</span>
                </div>
              </motion.div>
            )}

            {/* ── Erro ── */}
            {step === 'error' && (
              <motion.div key="error"
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-8 gap-5 text-center"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(248,113,113,0.15)' }}>
                  <AlertTriangle size={40} style={{ color: '#F87171' }} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">Pagamento Recusado</h3>
                  <p className="text-sm mt-2 max-w-xs mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {errorMsg || 'Tente novamente com outro método ou cartão.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    onClick={() => { setStep('select-method'); setErrorMsg(''); setCardErrors([]); }}
                    className="w-full py-3.5 rounded-xl font-black text-sm transition-all"
                    style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)' }}>
                    Tentar Novamente
                  </button>
                  <button onClick={onClose} className="text-xs font-bold py-2"
                    style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Fechar
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
