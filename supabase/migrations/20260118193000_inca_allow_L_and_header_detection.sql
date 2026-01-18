-- 20260118193000_inca_allow_L_and_header_detection.sql
-- Canon INCA: add 'L' (Libero) to situazione domain.
-- Keep NULL allowed for backward compatibility with legacy imports that stored NULL for NP.

alter table public.inca_cavi
  drop constraint if exists inca_cavi_situazione_check;

alter table public.inca_cavi
  add constraint inca_cavi_situazione_check
  check ((situazione is null) or (situazione = any (array['L','T','P','R','B','E'])));

comment on column public.inca_cavi.situazione is
  'L=libero (disponibile), R=richiesta, T=tagliato, B=bloccato, P=posato, E=eliminato. NULL legacy (NP).';
