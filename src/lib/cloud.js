import { findDuplicate } from './deduplication';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudConfigured = Boolean(url && anonKey);
const sessionKey = 'buzzent-auth-session';
const headers = (token) => ({
  apikey: anonKey,
  Authorization: `Bearer ${token || anonKey}`,
  'Content-Type': 'application/json',
});
const fromCloud = (row) => ({ ...row, webStatus: row.web_status, nextFollow: row.next_follow });
const toCloud = (record) => { const payload = { ...record, web_status: record.webStatus, next_follow: record.nextFollow }; delete payload.webStatus; delete payload.nextFollow; delete payload.id; return payload; };

export function getSession() {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null'); } catch { return null; }
}

export async function signIn(email, password) {
  if (!cloudConfigured) throw new Error('Configurá VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.msg || 'No se pudo iniciar sesión.');
  localStorage.setItem(sessionKey, JSON.stringify(data));
  return data;
}
export async function signUp(email, password) {
  if (!cloudConfigured) throw new Error('Configurá las variables de entorno.');
  const response = await fetch(`${url}/auth/v1/signup`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.msg || data.error_description || 'No se pudo crear la cuenta.');
  if (data.access_token) localStorage.setItem(sessionKey, JSON.stringify(data));
  return data;
}

export async function signOut() { localStorage.removeItem(sessionKey); }

export async function fetchProspects() {
  const session = getSession();
  if (!cloudConfigured || !session?.access_token) return null;
  const response = await fetch(`${url}/rest/v1/prospects?select=*&order=created_at.desc`, { headers: headers(session.access_token) });
  if (!response.ok) throw new Error('No se pudieron cargar los prospectos.');
  return (await response.json()).map(fromCloud);
}

export async function saveProspect(prospect) {
  const session = getSession();
  if (!cloudConfigured || !session?.access_token) return;
  const payload = { ...toCloud(prospect), owner_id: session.user?.id, contacts: prospect.contacts || [] };
  if (prospect.id) {
    await fetch(`${url}/rest/v1/prospects?id=eq.${prospect.id}`, { method: 'PATCH', headers: { ...headers(session.access_token), Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  } else {
    const existingResponse = await fetch(`${url}/rest/v1/prospects?select=id,name,phone,whatsapp,email,instagram,facebook,city&limit=5000`, { headers: headers(session.access_token) });
    if (existingResponse.ok) {
      const duplicate = findDuplicate(prospect, await existingResponse.json());
      if (duplicate) throw new Error(`El prospecto ya existe: ${duplicate.name}.`);
    }
    await fetch(`${url}/rest/v1/prospects`, { method: 'POST', headers: { ...headers(session.access_token), Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  }
}

export async function deleteProspect(id) {
  const session = getSession();
  if (!cloudConfigured || !session?.access_token) return;
  await fetch(`${url}/rest/v1/prospects?id=eq.${id}`, { method: 'DELETE', headers: headers(session.access_token) });
}

async function cloudRequest(path, options = {}) {
  const session = getSession();
  if (!cloudConfigured || !session?.access_token) return null;
  const response = await fetch(`${url}/rest/v1/${path}`, { ...options, headers: { ...headers(session.access_token), ...(options.headers || {}) } });
  if (!response.ok) throw new Error('No se pudo sincronizar la operación con la nube.');
  return response.status === 204 ? null : response.json();
}

export async function saveAgentAction(action) {
  const session = getSession();
  if (!session?.user?.id) return;
  return cloudRequest('agent_actions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ ...action, owner_id: session.user.id }) });
}

export async function fetchConversations() {
  const rows = await cloudRequest('conversations?select=*,prospects(name,industry,city)&order=updated_at.desc');
  return rows || [];
}

export async function fetchConversationMessages(conversationId) {
  const rows = await cloudRequest(`conversation_messages?conversation_id=eq.${conversationId}&select=*&order=created_at.asc`);
  return rows || [];
}
