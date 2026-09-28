const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await request.json();
    const { to, subject, html, mode = 'DEMO' } = body;
    if (mode !== 'REAL') return Response.json({ ok: true, simulated: true, message: 'DEMO: el correo no fue enviado.' }, { headers: corsHeaders });
    if (Deno.env.get('EMAIL_REAL_ENABLED') !== 'true') return Response.json({ ok: false, code: 'REAL_EMAIL_DISABLED' }, { status: 403, headers: corsHeaders });
    if (!to || !subject || !html) return Response.json({ ok: false, code: 'INVALID_EMAIL_PAYLOAD' }, { status: 400, headers: corsHeaders });
    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('EMAIL_FROM');
    if (!apiKey || !from) return Response.json({ ok: false, code: 'EMAIL_NOT_CONFIGURED' }, { status: 503, headers: corsHeaders });
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, html }) });
    const result = await response.json();
    return Response.json({ ok: response.ok, provider: 'resend', result }, { status: response.ok ? 200 : 502, headers: corsHeaders });
  } catch (error) {
    return Response.json({ ok: false, code: 'EMAIL_FUNCTION_ERROR', message: error.message }, { status: 500, headers: corsHeaders });
  }
});
