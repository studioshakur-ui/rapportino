begin;

-- ============================================================================
-- Helper: resolve ships.id from a commessa by scanning TEXT-like columns
-- in public.ships (no assumptions about column names like ship_code).
-- ============================================================================
create or replace function public.fn_resolve_ship_id_from_commessa(p_commessa text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commessa text := nullif(btrim(coalesce(p_commessa, '')), '');
  v_ship_id uuid;
  v_col record;
  v_sql text;
begin
  if v_commessa is null then
    return null;
  end if;

  -- First: if there is a direct column match somewhere (scan text-ish columns)
  for v_col in
    select c.column_name, c.data_type, c.udt_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'ships'
      and (
        c.data_type in ('text', 'character varying', 'character')
        or c.udt_name in ('text', 'varchar', 'bpchar')
      )
      and c.column_name not in ('id') -- avoid useless checks
    order by c.ordinal_position
  loop
    v_sql := format(
      'select s.id from public.ships s where upper(btrim(s.%I::text)) = upper($1) limit 1',
      v_col.column_name
    );

    execute v_sql into v_ship_id using v_commessa;

    if v_ship_id is not null then
      return v_ship_id;
    end if;
  end loop;

  return null;
end;
$$;

-- ============================================================================
-- Hydrate activity_id + previsto on rapportino_rows at INSERT/UPDATE
-- Source of truth:
--   1) catalogo_ship_commessa_attivita (ship_id + commessa + activity_id)
--   2) fallback catalogo_attivita (activity_id)
-- ============================================================================
create or replace function public.fn_hydrate_rapportino_rows_previsto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_commessa text;
  v_ship_id uuid;

  v_desc text;
  v_desc_u text;

  v_activity_id uuid;
  v_categoria text;

  v_previsto numeric;
begin
  -- Parent rapportino context (commessa)
  select r.commessa
    into v_commessa
  from public.rapportini r
  where r.id = new.rapportino_id;

  -- Resolve ship_id without assuming column names
  v_ship_id := public.fn_resolve_ship_id_from_commessa(v_commessa);

  -- Hydrate activity_id if missing (descrizione OR synonyms)
  if new.activity_id is null then
    v_desc := nullif(btrim(coalesce(new.descrizione, '')), '');
    if v_desc is not null then
      v_desc_u := upper(v_desc);

      select ca.id, ca.categoria
        into v_activity_id, v_categoria
      from public.catalogo_attivita ca
      where ca.is_active is true
        and (
          upper(ca.descrizione) = v_desc_u
          or exists (
            select 1
            from unnest(coalesce(ca.synonyms, array[]::text[])) syn
            where upper(btrim(syn)) = v_desc_u
          )
        )
      order by ca.created_at asc
      limit 1;

      if v_activity_id is not null then
        new.activity_id := v_activity_id;

        if nullif(btrim(coalesce(new.categoria, '')), '') is null
           and v_categoria is not null then
          new.categoria := v_categoria;
        end if;
      end if;
    end if;
  end if;

  -- Hydrate previsto if missing
  if new.previsto is null and new.activity_id is not null then
    v_previsto := null;

    -- 1) Ship+Commessa override
    if v_ship_id is not null
       and v_commessa is not null
       and btrim(v_commessa) <> '' then
      select c.previsto_value
        into v_previsto
      from public.catalogo_ship_commessa_attivita c
      where c.is_active is true
        and c.ship_id = v_ship_id
        and c.commessa = v_commessa
        and c.activity_id = new.activity_id
      limit 1;
    end if;

    -- 2) Fallback global
    if v_previsto is null then
      select ca.previsto_value
        into v_previsto
      from public.catalogo_attivita ca
      where ca.is_active is true
        and ca.id = new.activity_id
      limit 1;
    end if;

    if v_previsto is not null then
      new.previsto := v_previsto;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_hydrate_rapportino_rows_previsto on public.rapportino_rows;

create trigger trg_hydrate_rapportino_rows_previsto
before insert or update of descrizione, activity_id, previsto, rapportino_id, categoria
on public.rapportino_rows
for each row
execute function public.fn_hydrate_rapportino_rows_previsto();

-- Backfill: only rows with previsto NULL (will fire trigger)
update public.rapportino_rows rr
set previsto = rr.previsto
where rr.previsto is null;

commit;
