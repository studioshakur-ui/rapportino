-- Terrain image vision pipeline
-- 1. Private storage bucket for Telegram terrain images
insert into storage.buckets (id, name, public, file_size_limit)
values ('terrain-images', 'terrain-images', false, 26214400)
on conflict (id) do nothing;

-- RLS: authenticated users can read; service role (bridge/functions) bypasses RLS
drop policy if exists "terrain_images_read_auth" on storage.objects;
create policy "terrain_images_read_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'terrain-images');

-- 2. Columns on incoming_messages to track the image + its vision parse
alter table public.incoming_messages
  add column if not exists image_path      text,
  add column if not exists vision_processed boolean not null default false,
  add column if not exists vision_result    jsonb;

create index if not exists idx_incoming_messages_vision
  on public.incoming_messages (vision_processed)
  where image_path is not null;

-- 3. Apparati field snapshots — evolution terrain par équipement,
--    extrait des images de liste (couleur verte = posé, rose = priorité).
create table if not exists public.apparati_snapshots (
  id                uuid primary key default gen_random_uuid(),
  equipment_code    text not null,
  source_message_id uuid references public.incoming_messages(id) on delete set null,
  occurred_at       timestamptz not null default now(),
  total_cables      int  not null default 0,
  posati            int  not null default 0,
  priorita          int  not null default 0,
  cable_states      jsonb not null default '[]'::jsonb,  -- [{code, state, perimetro}]
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_apparati_snapshots_code
  on public.apparati_snapshots (equipment_code, occurred_at desc);

alter table public.apparati_snapshots enable row level security;

drop policy if exists "apparati_snapshots_read_auth" on public.apparati_snapshots;
create policy "apparati_snapshots_read_auth"
  on public.apparati_snapshots for select
  to authenticated using (true);;
