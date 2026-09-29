const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEYS');
const cronSecret = Deno.env.get('OUTREACH_CRON_SECRET');
const maxPerDay = 10;

const dbHeaders = {
  apikey: serviceKey || '',
  Authorization: `Bearer ${serviceKey || ''}`,
  'Content-Type': 'application/json',
};

const base64Url = (value: string) => btoa(String.fromCharCode(...new TextEncoder().encode(value)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

async function db(path: string, options: RequestInit = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, { ...options, headers: { ...dbHeaders, ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || body?.error || `Database request failed: ${response.status}`);
  return body;
}

async function sendGmail(to: string, subject: string, html: string) {
  const clientId = Deno.env.get('GMAIL_CLIENT_ID');
  const clientSecret = Deno.env.get('GMAIL_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GMAIL_REFRESH_TOKEN');
  const from = Deno.env.get('GMAIL_FROM');
  if (!clientId || !clientSecret || !refreshToken || !from) return { ok: false, code: 'GMAIL_NOT_CONFIGURED' };
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || !token.access_token) return { ok: false, code: 'GMAIL_TOKEN_ERROR' };
  const mime = [`From: ${from}`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', '', html].join('\r\n');
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: base64Url(mime) }),
  });
  return { ok: response.ok, result: await response.json() };
}

function escapeHtml(value = '') {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]));
}

function buildMessage(prospect: any) {
  const firstName = escapeHtml((prospect.name || 'equipo').split(' ')[0]);
  const recommendation = escapeHtml(prospect.recommendation || 'una presencia digital más efectiva');
  const problem = escapeHtml(prospect.problem || 'algunas oportunidades para mejorar su presencia online');
  const subject = `Una idea para mejorar la presencia digital de ${prospect.name}`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#20362f"><p>Hola ${firstName},</p><p>Estuve revisando la presencia digital de <strong>${escapeHtml(prospect.name)}</strong> y encontré ${problem}.</p><p>Desde Buzzent podemos ayudarles con <strong>${recommendation}</strong>, de una forma simple y adaptada al negocio.</p><p>¿Te parece si te comparto dos ideas concretas sin compromiso?</p><p>Saludos,<br><strong>Equipo Buzzent</strong></p></div>`;
  return { subject, html };
}

async function run() {
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is unavailable');
  const settings = await db('commercial_settings?select=owner_id,agent_rules');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
  const summary = { date: today, owners: 0, claimed: 0, sent: 0, failed: 0, skipped: 0 };
  for (const setting of settings || []) {
    const rules = setting.agent_rules || {};
    if (rules.automation_enabled !== true || rules.demo_mode === true) continue;
    summary.owners += 1;
    const sentToday = await db(`outreach_messages?owner_id=eq.${setting.owner_id}&run_date=eq.${today}&status=in.(CLAIMED,SENT)&select=id`, { headers: { ...dbHeaders, Prefer: 'count=exact' } });
    const remaining = Math.max(0, maxPerDay - (sentToday?.length || 0));
    if (!remaining) continue;
    const prospects = await db(`prospects?owner_id=eq.${setting.owner_id}&status=eq.Pendiente&email=not.is.null&select=* &order=priority.desc,created_at.asc&limit=${remaining}`.replace('select=* ', 'select=*'));
    for (const prospect of prospects || []) {
      if (!prospect.email || ['No interesado', 'Descartado', 'No responde'].includes(prospect.status)) { summary.skipped += 1; continue; }
      const { subject, html } = buildMessage(prospect);
      const claimed = await db('outreach_messages', { method: 'POST', headers: { ...dbHeaders, Prefer: 'return=representation,resolution=ignore-duplicates' }, body: JSON.stringify({ owner_id: setting.owner_id, prospect_id: prospect.id, run_date: today, channel: 'EMAIL', status: 'CLAIMED', subject, body: html }) });
      if (!claimed?.[0]) { summary.skipped += 1; continue; }
      summary.claimed += 1;
      const delivery = await sendGmail(prospect.email, subject, html);
      if (delivery.ok) {
        summary.sent += 1;
        const contacts = Array.isArray(prospect.contacts) ? prospect.contacts : [];
        contacts.push({ date: today, medium: 'Email', message: subject, response: '', notes: 'Enviado automáticamente por Buzzent.' });
        await db(`outreach_messages?id=eq.${claimed[0].id}`, { method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'SENT', provider_id: delivery.result?.id || null, sent_at: new Date().toISOString() }) });
        await db(`prospects?id=eq.${prospect.id}&owner_id=eq.${setting.owner_id}`, { method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'Contactado', commercial_status: 'CONTACTED', last_contacted_at: new Date().toISOString(), contacts }) });
      } else {
        summary.failed += 1;
        await db(`outreach_messages?id=eq.${claimed[0].id}`, { method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'FAILED', error: delivery.code || 'GMAIL_SEND_FAILED' }) });
      }
    }
  }
  return summary;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) return Response.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401, headers: corsHeaders });
  try { return Response.json({ ok: true, ...await run() }, { headers: corsHeaders }); }
  catch (error) { return Response.json({ ok: false, code: 'DAILY_OUTREACH_ERROR', message: error.message }, { status: 500, headers: corsHeaders }); }
});
