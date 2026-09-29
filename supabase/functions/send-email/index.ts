const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const base64Url = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

async function sendWithGmail(to: string, subject: string, html: string) {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
  const from = Deno.env.get('GMAIL_FROM');
  if (!clientId || !clientSecret || !refreshToken || !from) {
    return { ok: false, code: 'GMAIL_NOT_CONFIGURED' };
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) return { ok: false, code: 'GMAIL_TOKEN_ERROR', detail: token };

  const mime = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: base64Url(mime) }),
  });
  const result = await response.json();
  return { ok: response.ok, provider: 'gmail', result };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await request.json();
    const { to, subject, html, mode = 'DEMO' } = body;
    if (mode !== 'REAL') return Response.json({ ok: true, simulated: true, message: 'DEMO: el correo no fue enviado.' }, { headers: corsHeaders });
    if (Deno.env.get('EMAIL_REAL_ENABLED') !== 'true') return Response.json({ ok: false, code: 'REAL_EMAIL_DISABLED' }, { status: 403, headers: corsHeaders });
    if (!to || !subject || !html) return Response.json({ ok: false, code: 'INVALID_EMAIL_PAYLOAD' }, { status: 400, headers: corsHeaders });
    if (Deno.env.get('GMAIL_REFRESH_TOKEN')) {
      const gmail = await sendWithGmail(to, subject, html);
      return Response.json(gmail, { status: gmail.ok ? 200 : 502, headers: corsHeaders });
    }
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
