begin;

alter table public.inca_cavi
  add column if not exists inca_data_taglio date,
  add column if not exists inca_data_posa date,
  add column if not exists inca_data_collegamento date,
  add column if not exists inca_data_richiesta_taglio date,
  add column if not exists inca_dataela_ts timestamptz,
  add column if not exists inca_data_instradamento_ts timestamptz,
  add column if not exists inca_data_creazione_instradamento_ts timestamptz;

create index if not exists inca_cavi_costr_commessa_inca_data_posa_idx
  on public.inca_cavi (costr, commessa, inca_data_posa);

create index if not exists inca_cavi_costr_commessa_inca_data_taglio_idx
  on public.inca_cavi (costr, commessa, inca_data_taglio);

create index if not exists inca_cavi_costr_commessa_inca_data_collegamento_idx
  on public.inca_cavi (costr, commessa, inca_data_collegamento);

create index if not exists inca_cavi_costr_commessa_inca_data_instradamento_ts_idx
  on public.inca_cavi (costr, commessa, inca_data_instradamento_ts);

commit;