-- Align daily_list_item_events with the live ingestion code (Telegram bridge
-- linkDailyListItems + dailyLists.repo persistDailyListItemEvents).
--
-- Before this, every insert into daily_list_item_events failed silently: the
-- code wrote daily_list_item_id / occurred_at / import_id / cable_code_normalized
-- / source_type / raw_note / progress_percent, but the table had item_id /
-- event_at and none of the extra columns. Option B: migrate the table to keep
-- all field-signal info (progress %, raw note, source type) rather than drop it.
--
-- INCA is untouched. The 438 existing rows keep their data; new columns are
-- nullable so they stay valid.

-- 1) Rename the two drifted columns to the names the code already writes.
alter table public.daily_list_item_events rename column item_id  to daily_list_item_id;
alter table public.daily_list_item_events rename column event_at to occurred_at;

-- keep the index name consistent with the renamed column
alter index public.idx_dlie_item_id rename to idx_dlie_daily_list_item_id;

-- 2) Add the columns the pipeline writes (nullable so existing rows stay valid).
alter table public.daily_list_item_events
  add column if not exists import_id             uuid references public.daily_list_imports(id) on delete cascade,
  add column if not exists cable_code_normalized text,
  add column if not exists source_type           text,
  add column if not exists raw_note              text,
  add column if not exists progress_percent      integer;

-- 3) Indexes for the dedup/lookup paths used by persistDailyListItemEvents.
create index if not exists idx_dlie_import_id        on public.daily_list_item_events (import_id);
create index if not exists idx_dlie_cable_code_norm  on public.daily_list_item_events (cable_code_normalized);
