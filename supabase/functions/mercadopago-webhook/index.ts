const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[webhook] Variáveis de ambiente ausentes')
    return new Response(JSON.stringify({ error: 'Configuração incompleta' }), { status: 500 })
  }

  try {
    const body = await req.json()
    console.log('[webhook] Recebido:', JSON.stringify(body))

    // O Mercado Pago envia notificações com topic=payment ou type=payment
    const isPaymentNotification =
      body.type === 'payment' || body.topic === 'payment'

    if (!isPaymentNotification) {
      console.log('[webhook] Notificação ignorada. Tipo:', body.type || body.topic)
      return new Response(JSON.stringify({ received: true, ignored: true }), { status: 200 })
    }

    // Extrair ID do pagamento
    const paymentId = body.data?.id || body.id
    if (!paymentId) {
      console.error('[webhook] ID de pagamento não encontrado no body:', body)
      return new Response(JSON.stringify({ error: 'payment_id não encontrado' }), { status: 400 })
    }

    console.log('[webhook] Verificando pagamento:', paymentId)

    // 1. Verificar status real do pagamento na API do MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    const paymentData = await mpRes.json()

    console.log('[webhook] Status do pagamento:', paymentData.status, paymentData.status_detail)

    if (paymentData.status !== 'approved') {
      // Pagamento não aprovado — registrar se for rejeição, mas não creditar
      if (paymentData.status === 'rejected') {
        console.log('[webhook] Pagamento rejeitado:', paymentData.status_detail)
      }
      return new Response(JSON.stringify({ received: true, status: paymentData.status }), { status: 200 })
    }

    // 2. Extrair metadados do pagamento
    //    Preferimos os metadados embutidos no pagamento (mais confiável que query params)
    const metadata = paymentData.metadata || {}
    const userId: string = metadata.user_id || paymentData.external_reference || ''
    // Se for presente, creditar para o destinatário; caso contrário, para o comprador
    const creditUserId: string = metadata.credit_user_id || userId
    const nousEarned: number = Number(metadata.nous_earned) || 0
    const packId: string = metadata.pack_id || ''
    const amountCents: number = Number(metadata.amount_cents) || Math.round((paymentData.transaction_amount || 0) * 100)
    const isGift: boolean = !!metadata.is_gift && creditUserId !== userId

    if (!userId) {
      console.error('[webhook] user_id não encontrado nos metadados:', metadata)
      return new Response(JSON.stringify({ error: 'user_id não encontrado' }), { status: 400 })
    }

    const dbHeaders = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }

    // 3. Verificar idempotência — checar se este pagamento já foi processado
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/payment_history?mp_payment_id=eq.${paymentId}&status=eq.approved&select=id&limit=1`,
      { headers: dbHeaders }
    )
    const existing = await checkRes.json()

    if (existing && existing.length > 0) {
      console.log('[webhook] Pagamento já processado anteriormente:', paymentId)
      return new Response(JSON.stringify({ received: true, already_processed: true }), { status: 200 })
    }

    console.log('[webhook] Creditando', nousEarned, 'Nous para usuário', creditUserId, isGift ? '(presente de ' + userId + ')' : '')

    // 4. Buscar saldo atual do destinatário (e nome do comprador se for presente)
    const [profileRes, senderRes] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${creditUserId}&select=nous_coins,display_name&limit=1`,
        { headers: dbHeaders }
      ),
      isGift
        ? fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=display_name&limit=1`, { headers: dbHeaders })
        : Promise.resolve(null),
    ])
    const profiles = await profileRes.json()
    const senderName: string = isGift && senderRes
      ? ((await senderRes.json())?.[0]?.display_name || 'Alguém')
      : ''

    if (!profiles || profiles.length === 0) {
      console.error('[webhook] Perfil não encontrado para credit_user_id:', creditUserId)
      return new Response(JSON.stringify({ error: 'Perfil destinatário não encontrado' }), { status: 404 })
    }

    const currentNous = profiles[0].nous_coins || 0
    const newNous = currentNous + nousEarned

    // 5. Atualizar saldo do destinatário
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${creditUserId}`, {
      method: 'PATCH',
      headers: { ...dbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ nous_coins: newNous }),
    })

    if (!updateRes.ok) {
      const err = await updateRes.text()
      console.error('[webhook] Erro ao atualizar saldo:', err)
      return new Response(JSON.stringify({ error: 'Falha ao atualizar saldo' }), { status: 500 })
    }

    // 6. Registrar no histórico de pagamentos (quem pagou)
    await fetch(`${SUPABASE_URL}/rest/v1/payment_history`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        pack_id: packId || null,
        amount_cents: amountCents,
        nous_earned: nousEarned,
        mp_payment_id: String(paymentId),
        status: 'approved',
      }),
    })

    // 7. Notificações
    if (isGift) {
      // Notificar o destinatário do presente (com metadata para o GiftClaimOverlay)
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: creditUserId,
          type: 'gift_received',
          title: 'Você recebeu um presente! 🎁',
          body: `${senderName} te enviou ${nousEarned} Nous!`,
          claimed: false,
          metadata: {
            category: 'nous',            // GiftClaimOverlay detecta por este campo
            nous_amount: nousEarned,
            sender_name: senderName,
            name: `${nousEarned} Nous`,  // exibido como título do reveal
            emoji: '🪙',
          },
        }),
      })
      // Notificar o comprador
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          type: 'purchase_success',
          title: 'Presente enviado! 🎁',
          body: `${nousEarned} Nous foram enviados com sucesso para seu amigo!`,
        }),
      })
    } else {
      // Compra normal: notificar o comprador
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST',
        headers: { ...dbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: userId,
          type: 'purchase_success',
          title: 'Compra Aprovada! 🎉',
          body: `${nousEarned} Nous foram adicionados à sua conta. Aproveite!`,
        }),
      })
    }

    console.log('[webhook] Processamento concluído com sucesso.')
    return new Response(JSON.stringify({ received: true, credited: nousEarned }), { status: 200 })
  } catch (error: any) {
    console.error('[webhook] CRASH:', error.message || error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
