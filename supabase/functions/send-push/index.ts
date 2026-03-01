import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

// ============================================================================
// NATIVE WEB PUSH IMPL (Sem AES-GCM, apenas PUSH vazio)
// ============================================================================
// Funções helper para Base64URL
function base64UrlEncode(buffer: Uint8Array): string {
    let str = "";
    for (let i = 0; i < buffer.length; i++) {
        str += String.fromCharCode(buffer[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
        base64 += "=";
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

const textEncoder = new TextEncoder();

async function createVapidHeaders(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string) {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const header = { typ: "JWT", alg: "ES256" };
    const now = Math.floor(Date.now() / 1000);
    const payload = { aud: audience, exp: now + (12 * 60 * 60), sub: "mailto:admin@noesis.com" };

    const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(textEncoder.encode(JSON.stringify(payload)));
    const unsignedToken = `${encodedHeader}.${encodedPayload}`;

    // WebCrypto Import & Sign (Importando via JWK para evitar erro de PKCS#8)
    const pubKeyBytes = base64UrlDecode(vapidPublicKey);
    const x = base64UrlEncode(pubKeyBytes.slice(1, 33));
    const y = base64UrlEncode(pubKeyBytes.slice(33, 65));

    const jwk = {
        kty: "EC",
        crv: "P-256",
        x,
        y,
        d: vapidPrivateKey,
        ext: true
    };

    const key = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
    );

    const signatureBytes = await crypto.subtle.sign(
        { name: "ECDSA", hash: { name: "SHA-256" } },
        key,
        textEncoder.encode(unsignedToken) as any
    );

    const signedToken = `${unsignedToken}.${base64UrlEncode(new Uint8Array(signatureBytes))}`;
    return {
        "Authorization": `vapid t=${signedToken}, k=${vapidPublicKey}`,
        "TTL": "2419200", // 28 Dias de validade na fila
        // "Content-Encoding" omitido pois num payload vazio ele não é necessário nem suportado p/ AES.
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = 'https://pceyeeasnwzcztjcvngb.supabase.co';
        const supabaseKey = Deno.env.get('NOESIS_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        let dataBody: any;
        try { dataBody = await req.json(); }
        catch (_) { return new Response(JSON.stringify({ success: false, error: 'Body parsing failed' }), { status: 200, headers: corsHeaders }); }

        if (!dataBody) return new Response(JSON.stringify({ success: false, error: 'Payload vazio' }), { status: 200, headers: corsHeaders });

        const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || 'BN_ZyLSlhySNgzZbAseSBBt_vvAMn_wOtDR8oYmB75FKYMfmwjp16tflI3p1LHBv1vM18dBXuN0kUovtdH9z5Xs';
        const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || 'CSnnvTNbWdL7u_aXCKxQIPvzyvD-W1pwVmQZO6SsQyY';

        let subscriptions: any[] = [];
        let dbError: any = null;

        if (dataBody.type === 'INSERT' && dataBody.record?.recipient_id) {
            const { data, error } = await supabaseClient.from('push_subscriptions').select('*').eq('user_id', dataBody.record.recipient_id);
            subscriptions = data || [];
            dbError = error;
        }
        else if (dataBody.adminDispatch) {
            let query = supabaseClient.from('push_subscriptions').select('*');
            if (dataBody.target === 'specific' && dataBody.targetUserId) {
                query = query.eq('user_id', dataBody.targetUserId);
            }
            const { data, error } = await query;
            subscriptions = data || [];
            dbError = error;
        }
        else if (dataBody.dailyReminder) {
            const { data, error } = await supabaseClient.from('push_subscriptions').select('*');
            subscriptions = data || [];
            dbError = error;
        }

        if (subscriptions.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                delivered: 0,
                msg: "No subscriptions found.",
                v: "2.0",
                debugQueryErr: dbError,
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        let delivered = 0;
        let debugResults: any[] = [];
        const sendPromises = subscriptions.map(async (sub: any) => {
            try {
                const headers = await createVapidHeaders(sub.endpoint, vapidPublicKey, vapidPrivateKey);
                const reqPush = await fetch(sub.endpoint, { method: "POST", headers });
                const status = reqPush.status;

                if (status === 410 || status === 404) {
                    await supabaseClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                    debugResults.push({ endpoint: sub.endpoint.substring(0, 30) + '...', status, msg: 'Expired/Deleted' });
                } else if (reqPush.ok) {
                    delivered++;
                    debugResults.push({ endpoint: sub.endpoint.substring(0, 30) + '...', status, msg: 'OK' });
                } else {
                    const errorText = await reqPush.text();
                    debugResults.push({ endpoint: sub.endpoint.substring(0, 30) + '...', status, error: errorText });
                }
            } catch (fail: any) {
                debugResults.push({ endpoint: sub.endpoint?.substring(0, 30) + '...', error: fail.message || 'Fetch failed' });
            }
        });

        await Promise.all(sendPromises);

        return new Response(JSON.stringify({
            success: true,
            total: subscriptions.length,
            delivered,
            v: "2.0",
            debugResults
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        console.error('Fatal Edge Error:', err);
        return new Response(JSON.stringify({ success: false, error: err.message || JSON.stringify(err) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
