alter table public.inca_cavi
  add column if not exists perimetro text,
  add column if not exists data_consegna_perimetro date,
  add column if not exists collegato text;

create index if not exists idx_inca_cavi_perimetro
  on public.inca_cavi (perimetro);
