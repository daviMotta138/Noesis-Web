const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get('MP_ACCESS_TOKEN')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://pceyeeasnwzcztjcvngb.supabase.co'

    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'MP_ACCESS_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { packId, userId, packName, amountCents, nousEarned } = await req.json()

    if (!packId || !userId || !amountCents) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios ausentes: packId, userId, amountCents' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const APP_URL = 'https://noesis-web.vercel.app'

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: packId,
            title: packName || `Pacote de ${nousEarned} Nous`,
            unit_price: amountCents / 100,
            quantity: 1,
            currency_id: 'BRL',
          },
        ],
        payer: {
          id: userId,
        },
        back_urls: {
          success: `${APP_URL}/nous-store?payment=success`,
          failure: `${APP_URL}/nous-store?payment=failure`,
          pending: `${APP_URL}/nous-store?payment=pending`,
        },
        auto_return: 'approved',
        notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
        external_reference: userId,
        metadata: {
          user_id: userId,
          pack_id: packId,
          nous_earned: nousEarned || 0,
          amount_cents: amountCents,
        },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[create-preference] Erro MP:', data)
      return new Response(
        JSON.stringify({ error: data.message || 'Falha ao criar preferência' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ init_point: data.init_point, preferenceId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[create-preference] CRASH:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
