const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Servidor não configurado: MP_ACCESS_TOKEN ausente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const {
      payment_method_id,
      token,
      issuer_id,
      installments,
      payer,
      pack_id,
      user_id,
      gift_user_id,  // se presente, os Nous vão para este usuário
      amount_cents,
      nous_earned,
    } = body

    // userId que receberá os Nous (presente ou comprador)
    const credit_user_id = gift_user_id || user_id
    const is_gift = !!gift_user_id && gift_user_id !== user_id

    // --- Validação de payload ---
    if (!payment_method_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: payment_method_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente: user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!amount_cents || isNaN(Number(amount_cents)) || Number(amount_cents) <= 0) {
      return new Response(
        JSON.stringify({ error: 'Campo inválido: amount_cents deve ser um número positivo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (payment_method_id !== 'pix' && !token) {
      return new Response(
        JSON.stringify({ error: 'Campo obrigatório ausente para cartão: token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transaction_amount = Number(amount_cents) / 100
    const description = `Pacote de ${nous_earned || 0} Nous - Noesis`
    const idempotencyKey = crypto.randomUUID()

    // Webhook URL para receber confirmação de pagamento
    const notification_url = SUPABASE_URL
      ? `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
      : undefined

    console.log('[process-payment] Iniciando:', {
      method: payment_method_id,
      user: user_id,
      amount: transaction_amount,
      nous: nous_earned,
    })

    // --- Montar payload ---
    const paymentPayload: Record<string, any> = {
      transaction_amount,
      description,
      payment_method_id,
      payer: {
        email: payer?.email || 'comprador@teste.com',
        ...(payer?.identification ? { identification: payer.identification } : {}),
        ...(payer?.first_name ? { first_name: payer.first_name } : {}),
        ...(payer?.last_name ? { last_name: payer.last_name } : {}),
      },
      external_reference: user_id,
      // Metadados que o webhook pode ler diretamente
      metadata: {
        user_id,
        credit_user_id,     // quem receberá os Nous
        is_gift,
        pack_id: pack_id || '',
        nous_earned: nous_earned || 0,
        amount_cents,
      },
    }

    if (notification_url) {
      paymentPayload.notification_url = notification_url
    }

    // Campos exclusivos de cartão de crédito
    if (payment_method_id !== 'pix') {
      paymentPayload.token = token
      paymentPayload.installments = Number(installments) || 1
      if (issuer_id) paymentPayload.issuer_id = String(issuer_id)
    }

    // --- Chamada à API do Mercado Pago ---
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(paymentPayload),
    })

    const data = await mpResponse.json()

    console.log('[process-payment] Resposta MP:', {
      status: data.status,
      status_detail: data.status_detail,
      id: data.id,
    })

    if (!mpResponse.ok) {
      console.error('[process-payment] Erro da API MP:', data)
      return new Response(
        JSON.stringify({
          error: data.message || 'Erro ao processar pagamento no Mercado Pago',
          cause: data.cause,
        }),
        { status: mpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se pagamento aprovado imediatamente (cartão), creditar nous agora
    // (webhook também fará isso, mas a verificação de idempotência evitará duplicidade)
    if (data.status === 'approved') {
      console.log('[process-payment] Pagamento aprovado imediatamente, creditando nous via DB...')
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        try {
          // Verificar se já foi processado
          const checkRes = await fetch(
            `${SUPABASE_URL}/rest/v1/payment_history?mp_payment_id=eq.${data.id}&status=eq.approved&select=id&limit=1`,
            {
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
            }
          )
          const existing = await checkRes.json()

          if (!existing || existing.length === 0) {
            // Buscar saldo atual
            const profileRes = await fetch(
              `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=nous_coins&limit=1`,
              {
                headers: {
                  apikey: SUPABASE_SERVICE_ROLE_KEY,
                  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
              }
            )
            const profiles = await profileRes.json()
            const currentNous = profiles?.[0]?.nous_coins || 0
            const newNous = currentNous + (nous_earned || 0)

            // Atualizar saldo
            await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}`, {
              method: 'PATCH',
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({ nous_coins: newNous }),
            })

            // Registrar no histórico
            await fetch(`${SUPABASE_URL}/rest/v1/payment_history`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id,
                pack_id: pack_id || null,
                amount_cents: Number(amount_cents),
                nous_earned: nous_earned || 0,
                mp_payment_id: String(data.id),
                status: 'approved',
              }),
            })

            // Notificação
            await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
              method: 'POST',
              headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
              },
              body: JSON.stringify({
                user_id,
                type: 'purchase_success',
                title: 'Compra Aprovada! 🎉',
                body: `${nous_earned || 0} Nous foram adicionados à sua conta.`,
              }),
            })

            console.log('[process-payment] Nous creditados com sucesso.')
          }
        } catch (creditErr: any) {
          console.error('[process-payment] Erro ao creditar nous:', creditErr.message)
          // Não retornamos erro — o pagamento foi aprovado, o webhook tentará novamente
        }
      }
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('[process-payment] CRASH:', error.message || error)
    return new Response(
      JSON.stringify({ error: `Erro interno: ${error.message || 'Erro desconhecido'}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
