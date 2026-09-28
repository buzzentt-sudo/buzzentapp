-- Índices no destructivos para deduplicación y búsqueda comercial.
create index if not exists prospects_phone_idx on public.prospects (phone);
create index if not exists prospects_whatsapp_idx on public.prospects (whatsapp);
create index if not exists prospects_email_idx on public.prospects (email);
create index if not exists prospects_name_city_idx on public.prospects (name, city);
create index if not exists conversations_prospect_idx on public.conversations (prospect_id, updated_at desc);
create index if not exists conversation_messages_conversation_idx on public.conversation_messages (conversation_id, created_at asc);
create index if not exists agent_actions_owner_created_idx on public.agent_actions (owner_id, created_at desc);
