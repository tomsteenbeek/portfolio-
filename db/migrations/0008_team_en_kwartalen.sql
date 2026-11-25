-- 0008 – Teamleden als eigenaar, ambities 2027 per kwartaal, koppeling met Planner-taken.
-- Teamleden worden NIET via de seed gevuld (geen echte namen in de publieke repository):
-- ze worden in het scherm Team toegevoegd of via een eenmalig SQL-script in Supabase.

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) between 2 and 120),
  function_title text check (function_title is null or length(function_title) <= 160),
  kind text not null default 'Vast' check (kind in ('Vast', 'Inhuur')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on team_members to app_user;
alter table team_members enable row level security;
drop policy if exists team_members_read on team_members;
drop policy if exists team_members_write on team_members;
create policy team_members_read on team_members for select using (app.authenticated());
create policy team_members_write on team_members for all
  using (app.has_any_role(array['admin','teamleider','medewerker']))
  with check (app.has_any_role(array['admin','teamleider','medewerker']));
drop trigger if exists team_members_audit on team_members;
create trigger team_members_audit after insert or update or delete on team_members for each row execute function app.audit();

-- Directe toegang via de Supabase-API blijft dicht (alleen via di_sql/di_batch).
do $$
declare r text;
begin
  foreach r in array array['anon','authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on team_members from %I', r);
    end if;
  end loop;
end $$;

-- Ambitie per kwartaal (ambition_year blijft de samenvatting voor het hele jaar)
alter table pillars add column if not exists ambition_q1 text;
alter table pillars add column if not exists ambition_q2 text;
alter table pillars add column if not exists ambition_q3 text;
alter table pillars add column if not exists ambition_q4 text;

-- Herkomst uit Planner (taak-id), zodat een herhaalde import bijwerkt in plaats van dupliceert
alter table projects add column if not exists planner_task_id text;
create unique index if not exists projects_planner_task_idx on projects(planner_task_id) where planner_task_id is not null;
