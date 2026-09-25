import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratamento de pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Kiwify Webhook] Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();

    console.log('[Kiwify Webhook] Payload recebido:', JSON.stringify(payload));

    // A Kiwify envia os dados do comprador no objeto Customer ou no root
    const email = (payload?.Customer?.email || payload?.customer?.email || payload?.email || '').trim().toLowerCase();
    const fullName = payload?.Customer?.full_name || payload?.customer?.name || payload?.full_name || 'Assinante SaldoCerto';
    const orderId = payload?.order_id || payload?.orderId || payload?.id || 'KIWIFY-' + Date.now();
    const orderStatus = (payload?.order_status || payload?.status || '').toLowerCase();
    const subscriptionStatus = (payload?.subscription_status || '').toLowerCase();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email ausente no payload da Kiwify' }), { status: 400, headers: corsHeaders });
    }

    // Determina o status da assinatura no sistema
    let newStatus = 'active';
    if (orderStatus === 'refunded' || orderStatus === 'chargedback' || subscriptionStatus === 'canceled' || subscriptionStatus === 'past_due') {
      newStatus = 'inactive';
    }

    // 1. Atualiza ou insere na tabela authorized_subscribers
    const { error: subError } = await supabase
      .from('authorized_subscribers')
      .upsert({
        email: email,
        full_name: fullName,
        order_id: orderId,
        status: newStatus,
        product_name: payload?.Product?.name || 'SaldoCerto Mensal R$ 19,90',
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (subError) {
      console.error('[Kiwify Webhook] Erro ao salvar em authorized_subscribers:', subError);
    }

    // 2. Se o usuário já criou conta no SaldoCerto, atualiza o status de assinatura no perfil
    const { error: profError } = await supabase
      .from('profiles')
      .update({
        subscription_status: newStatus,
        kiwify_order_id: orderId,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (profError) {
      console.warn('[Kiwify Webhook] Aviso ao atualizar profiles (usuário pode ainda não ter se cadastrado):', profError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Assinante ${email} atualizado para status: ${newStatus}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[Kiwify Webhook] Erro no processamento:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
