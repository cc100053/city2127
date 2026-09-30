-- Run once in the Supabase SQL Editor or with `supabase db push`.
begin;

create table public.sessions (
  id text primary key check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  status text not null default 'queued'
    check (status in ('queued', 'uploading', 'ready', 'failed')),
  proposal_number bigint generated always as identity unique not null,
  -- Permanent private Storage object URL; API exchanges it for a short-lived URL.
  media_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ready_has_media check ((status = 'ready') = (media_url is not null))
);

create function public.touch_session_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_updated_at before update on public.sessions
for each row execute function public.touch_session_updated_at();

alter table public.sessions enable row level security;
-- All database access is through the authenticated server, including public reads.
-- No anonymous list/read/write policies are intentionally provided.
revoke all on public.sessions from anon, authenticated;
grant select, insert, update on public.sessions to service_role;
grant usage, select on sequence public.sessions_proposal_number_seq to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('session-media', 'session-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- This dedicated private bucket has no anon/authenticated object policies.
-- The server's secret/service_role key uploads and signs media URLs.

commit;
