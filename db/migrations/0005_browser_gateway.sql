-- =====================================================================
-- 0005 – Toegang vanuit de browser (statische site + Supabase, demo zonder login)
--
-- De browser roept via de Supabase REST-API (rol 'anon') uitsluitend deze
-- functies aan:
--   public.di_sql(q, params, as_user)   – één SQL-opdracht
--   public.di_batch(stmts, as_user)     – meerdere opdrachten in één transactie
--   public.di_demo_users()              – lijst van (fictieve) demogebruikers
--
-- di_sql/di_batch zijn SECURITY DEFINER met eigenaar app_user: alles draait
-- met de rechten van app_user, dus Row Level Security, constraints, triggers
-- en de auditlog blijven volledig van kracht. app_user kan geen tabellen,
-- functies of rollen aanmaken of wijzigen en kan niet van rol wisselen
-- (SET ROLE is niet toegestaan binnen een security-definer-functie).
--
-- LET OP: zonder login kan iedereen met de link en de (publieke) anon-sleutel
-- gegevens lezen en wijzigen. Alleen bedoeld voor demo's met fictieve gegevens.
-- =====================================================================

-- Directe tabeltoegang via de Supabase-API afsluiten (alleen de functies hieronder)
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end $$;

-- void-functie omzetten zodat hij in een SELECT-resultaat bruikbaar is
drop function if exists app.finalize_assessment(uuid);
create function app.finalize_assessment(p_assessment uuid) returns boolean
language plpgsql security definer set search_path = public, app as $$
declare a priority_assessments;
begin
  select * into a from priority_assessments where id = p_assessment;
  if a.user_id <> app.uid() and not app.has_any_role(array['teamleider','admin']) then
    raise exception 'Geen toegang';
  end if;
  insert into priority_assessment_revisions(assessment_id, session_item_id, user_id, revision, total_score, category, rationale, scores)
  select a.id, a.session_item_id, a.user_id, a.revision, a.total_score, a.category, a.rationale,
         coalesce((select jsonb_object_agg(c.code, s.score) from priority_scores s join priority_criteria c on c.id = s.criterion_id
                   where s.assessment_id = a.id), '{}'::jsonb);
  return true;
end $$;
grant execute on function app.finalize_assessment(uuid) to app_user;

-- Kern: voert één opdracht uit en geeft de rijen als jsonb-array terug.
-- Parameters ($1, $2, …) worden als correct geciteerde literals ingevuld.
create or replace function app.di_exec(q text, params jsonb) returns jsonb
language plpgsql as $$
declare
  i int;
  s text := q;
  head text;
  res jsonb;
begin
  if params is not null and jsonb_typeof(params) = 'array' then
    for i in reverse jsonb_array_length(params)..1 loop
      s := replace(s, '$' || i, coalesce(quote_literal(params ->> (i - 1)), 'NULL'));
    end loop;
  end if;
  head := lower(substring(ltrim(s) from 1 for 6));
  if head in ('insert', 'update', 'delete') then
    if s ~* '\mreturning\M' then
      execute format('with t as (%s) select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from t', s) into res;
    else
      execute format('with t as (%s) select ''[]''::jsonb', s) into res;
    end if;
  else
    execute format('select coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from (%s) t', s) into res;
  end if;
  return res;
end $$;
grant execute on function app.di_exec(text, jsonb) to app_user;

create or replace function public.di_sql(q text, params jsonb default '[]'::jsonb, as_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public, app, pg_temp as $$
begin
  perform set_config('app.user_id', coalesce(as_user::text, ''), true);
  perform set_config('statement_timeout', '15000', true);
  return app.di_exec(q, params);
end $$;

create or replace function public.di_batch(stmts jsonb, as_user uuid default null)
returns jsonb language plpgsql security definer set search_path = public, app, pg_temp as $$
declare st jsonb; acc jsonb := '[]'::jsonb;
begin
  perform set_config('app.user_id', coalesce(as_user::text, ''), true);
  perform set_config('statement_timeout', '60000', true);
  for st in select value from jsonb_array_elements(stmts) loop
    acc := acc || jsonb_build_array(app.di_exec(st ->> 'q', coalesce(st -> 'params', '[]'::jsonb)));
  end loop;
  return acc;
end $$;

-- Eigenaar app_user: rechten van de applicatierol, niet van de beheerder.
-- (Tijdelijk CREATE-recht is nodig om eigenaar te kunnen worden.)
grant create on schema public to app_user;
alter function public.di_sql(text, jsonb, uuid) owner to app_user;
alter function public.di_batch(jsonb, uuid) owner to app_user;
revoke create on schema public from app_user;

-- Demogebruikers ophalen zonder ingelogde gebruiker (alleen fictieve, actieve accounts)
create or replace function public.di_demo_users()
returns table(id uuid, email text, display_name text, discipline text, discipline_id uuid, roles text[])
language sql stable security definer set search_path = public, app as $$
  select u.id, u.email, u.display_name, d.name, u.discipline_id,
         coalesce(array_agg(r.code order by r.code) filter (where r.code is not null), '{}')
    from users u left join disciplines d on d.id = u.discipline_id
    left join user_roles ur on ur.user_id = u.id left join roles r on r.id = ur.role_id
   where u.is_active and u.is_fictitious
   group by u.id, d.name order by u.display_name
$$;

revoke all on function public.di_sql(text, jsonb, uuid) from public;
revoke all on function public.di_batch(jsonb, uuid) from public;
revoke all on function public.di_demo_users() from public;
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant usage on schema public to %I', r);
      execute format('grant execute on function public.di_sql(text, jsonb, uuid) to %I', r);
      execute format('grant execute on function public.di_batch(jsonb, uuid) to %I', r);
      execute format('grant execute on function public.di_demo_users() to %I', r);
    end if;
  end loop;
end $$;
