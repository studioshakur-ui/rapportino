-- Align daily_list_item_events with the live ingestion code (bridge linkDailyListItems
-- + dailyLists.repo persistDailyListItemEvents). Option B: keep all field-signal info.
-- INCA is untouched. Existing 438 rows keep their data; new columns are nullable.

-- 1) Rename the two drifted columns to the names the code already writes.
alter table public.daily_list_item_events rename column item_id  to daily_list_item_id;
alter table public.daily_list_item_events rename column event_at to occurred_at;

-- keep the index name consistent with the renamed column
alter index public.idx_dlie_item_id rename to idx_dlie_daily_list_item_id;

-- 2) Add the columns the pipeline writes (nullable so the existing rows stay valid).
alter table public.daily_list_item_events
  add column if not exists import_id             uuid references public.daily_list_imports(id) on delete cascade,
  add column if not exists cable_code_normalized text,
  add column if not exists source_type           text,
  add column if not exists raw_note              text,
  add column if not exists progress_percent      integer;

-- 3) Indexes for the dedup/lookup paths.
create index if not exists idx_dlie_import_id        on public.daily_list_item_events (import_id);
create index if not exists idx_dlie_cable_code_norm  on public.daily_list_item_events (cable_code_normalized);;
