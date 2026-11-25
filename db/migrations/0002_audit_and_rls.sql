-- =====================================================================
-- 0002 – Auditlogging en Row Level Security
--
-- De applicatie verbindt met een eigenaar-account, maar voert ieder
-- verzoek uit in een transactie met:
--     set local role app_user;
--     select set_config('app.user_id', '<uuid>', true);
-- Daardoor gelden onderstaande RLS-policies ook voor server-side code.
-- =====================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
grant execute on all functions in schema app to app_user;
revoke insert, update, delete on audit_logs from app_user;
revoke update, delete on priority_assessment_revisions from app_user;
revoke delete on source_inputs from app_user;

-- ---------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------
create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = public, app as $$
declare
  o jsonb; n jsonb; fields text[]; rid text;
begin
  if tg_op in ('UPDATE','DELETE') then o := to_jsonb(old); end if;
  if tg_op in ('UPDATE','INSERT') then n := to_jsonb(new); end if;
  rid := coalesce(n->>'id', o->>'id');
  if tg_op = 'UPDATE' then
    select array_agg(k) into fields from jsonb_object_keys(n) k
     where k not in ('updated_at','updated_by') and (n->k) is distinct from (o->k);
    if fields is null then return new; end if;
  end if;
  insert into audit_logs(table_name, record_id, action, old_data, new_data, changed_fields, changed_by)
  values (tg_table_name, rid, tg_op, o, n, fields, app.uid());
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['users','user_roles','pillars','programs','topics','topic_classifications','topic_sources',
    'topic_assessments','maturity_assessments','projects','project_dependencies','milestones','priority_models',
    'priority_criteria','priority_sessions','priority_session_items','priority_assessments','priority_decisions',
    'feasibility_assessments','recurring_activities','staffing_positions','staffing_scenarios','risks','decisions',
    'kpis','kpi_measurements','annual_plans','annual_plan_projects','settings','budgets','suppliers','regulatory_requirements']
  loop
    execute format('create trigger %I_audit after insert or update or delete on %I for each row execute function app.audit()', t, t);
  end loop;
end $$;

-- Revisiehistorie prioriteringsbeoordelingen (immutabel)
create or replace function app.record_assessment_revision() returns trigger
language plpgsql security definer set search_path = public, app as $$
begin
  insert into priority_assessment_revisions(assessment_id, session_item_id, user_id, revision, total_score, category, rationale, scores)
  select new.id, new.session_item_id, new.user_id, new.revision, new.total_score, new.category, new.rationale,
         coalesce((select jsonb_object_agg(c.code, s.score) from priority_scores s join priority_criteria c on c.id = s.criterion_id
                   where s.assessment_id = new.id), '{}'::jsonb);
  return null;
end $$;
-- Wordt aangeroepen nadat de scores zijn opgeslagen (zie app.finalize_assessment)
create or replace function app.finalize_assessment(p_assessment uuid) returns void
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
end $$;
drop function app.record_assessment_revision();

-- Voortgang van stemmen zonder individuele scores te tonen
create or replace function app.session_progress(p_session uuid)
returns table(session_item_id uuid, submitted int, members int)
language sql stable security definer set search_path = public, app as $$
  select i.id,
         (select count(*)::int from priority_assessments a where a.session_item_id = i.id and not a.is_consensus),
         (select count(*)::int from priority_session_members m where m.session_id = p_session)
  from priority_session_items i where i.session_id = p_session
    and app.uid() is not null
$$;

-- ---------------------------------------------------------------------
-- Hulpfuncties voor policies
-- ---------------------------------------------------------------------
create or replace function app.authenticated() returns boolean language sql stable as $$
  select app.uid() is not null
$$;

create or replace function app.can_edit_project(p uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select app.has_any_role(array['admin','teamleider'])
      or exists (select 1 from projects where id = p and project_leader_id = app.uid())
      or (app.has_any_role(array['medewerker','projectleider'])
          and exists (select 1 from project_members where project_id = p and user_id = app.uid()))
$$;

create or replace function app.can_see_assessment(p_item uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public, app as $$
  select p_user = app.uid()
      or exists (select 1 from priority_session_items i join priority_sessions s on s.id = i.session_id
                 where i.id = p_item and (not s.hide_individual or s.status in ('Bespreking','Afgerond')))
$$;

-- Standaardpolicy: lezen voor iedere ingelogde gebruiker, schrijven voor opgegeven rollen
create or replace function app.std_policies(tbl text, write_roles text[], read_roles text[] default null)
returns void language plpgsql as $$
begin
  execute format('alter table %I enable row level security', tbl);
  if read_roles is null then
    execute format('create policy %I on %I for select using (app.authenticated())', tbl || '_read', tbl);
  else
    execute format('create policy %I on %I for select using (app.has_any_role(%L::text[]))', tbl || '_read', tbl, read_roles);
  end if;
  execute format('create policy %I on %I for insert with check (app.has_any_role(%L::text[]))', tbl || '_ins', tbl, write_roles);
  execute format('create policy %I on %I for update using (app.has_any_role(%L::text[])) with check (app.has_any_role(%L::text[]))', tbl || '_upd', tbl, write_roles, write_roles);
  execute format('create policy %I on %I for delete using (app.has_any_role(%L::text[]))', tbl || '_del', tbl, write_roles);
end $$;

-- Inhoudelijke tabellen
select app.std_policies('disciplines', array['admin']);
select app.std_policies('roles', array['admin']);
select app.std_policies('user_roles', array['admin']);
select app.std_policies('users', array['admin']);
select app.std_policies('pillars', array['admin','teamleider']);
select app.std_policies('pillar_objectives', array['admin','teamleider']);
select app.std_policies('programs', array['admin','teamleider','medewerker']);
select app.std_policies('topic_classifications', array['admin','teamleider','medewerker']);
select app.std_policies('topic_disciplines', array['admin','teamleider','medewerker']);
select app.std_policies('topic_sources', array['admin','teamleider','medewerker']);
select app.std_policies('import_batches', array['admin','teamleider']);
select app.std_policies('source_inputs', array['admin','teamleider']);
select app.std_policies('maturity_assessments', array['admin','teamleider','medewerker']);
select app.std_policies('feasibility_assessments', array['admin','teamleider','medewerker']);
select app.std_policies('priority_models', array['admin','teamleider']);
select app.std_policies('priority_criteria', array['admin','teamleider']);
select app.std_policies('priority_sessions', array['admin','teamleider']);
select app.std_policies('priority_session_members', array['admin','teamleider']);
select app.std_policies('priority_session_items', array['admin','teamleider']);
select app.std_policies('priority_decisions', array['teamleider']);
select app.std_policies('recurring_activities', array['admin','teamleider','medewerker']);
select app.std_policies('kpis', array['admin','teamleider','medewerker']);
select app.std_policies('kpi_measurements', array['admin','teamleider','medewerker']);
select app.std_policies('suppliers', array['admin','teamleider','medewerker']);
select app.std_policies('regulatory_requirements', array['admin','teamleider','medewerker']);
select app.std_policies('decisions', array['admin','teamleider','management']);
select app.std_policies('annual_plans', array['admin','teamleider']);
select app.std_policies('annual_plan_versions', array['admin','teamleider']);
select app.std_policies('annual_plan_projects', array['admin','teamleider']);
select app.std_policies('work_sessions', array['admin','teamleider','medewerker']);
select app.std_policies('settings', array['admin','teamleider']);
select app.std_policies('skills', array['admin','teamleider']);
select app.std_policies('capacity_periods', array['admin','teamleider']);
select app.std_policies('capacity_allocations', array['admin','teamleider']);
select app.std_policies('risk_measures', array['admin','teamleider','medewerker','projectleider']);

-- Formatie en financiën: alleen teamleider, admin en management lezen
select app.std_policies('staffing_positions', array['admin','teamleider'], array['admin','teamleider','management']);
select app.std_policies('position_skills', array['admin','teamleider'], array['admin','teamleider','management']);
select app.std_policies('staffing_scenarios', array['admin','teamleider'], array['admin','teamleider','management']);
select app.std_policies('staffing_scenario_positions', array['admin','teamleider'], array['admin','teamleider','management']);
select app.std_policies('budgets', array['admin','teamleider'], array['admin','teamleider','management']);

-- Onderwerpen: geen fysieke verwijdering voor niet-admins (archiveren)
alter table topics enable row level security;
create policy topics_read on topics for select using (app.authenticated());
create policy topics_ins on topics for insert with check (app.has_any_role(array['admin','teamleider','medewerker']));
create policy topics_upd on topics for update using (app.has_any_role(array['admin','teamleider','medewerker']))
  with check (app.has_any_role(array['admin','teamleider','medewerker']));

-- Definitieve prioriteit mag alleen door de teamleider worden gewijzigd
create or replace function app.guard_topic_priority() returns trigger language plpgsql as $$
begin
  if app.uid() is not null
     and (new.priority_category, new.priority_score, new.priority_is_final)
         is distinct from (old.priority_category, old.priority_score, old.priority_is_final)
     and not app.has_any_role(array['teamleider']) then
    raise exception 'Alleen de teamleider kan de definitieve prioriteit vaststellen' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger topics_guard_priority before update on topics for each row execute function app.guard_topic_priority();
create policy topics_del on topics for delete using (app.has_any_role(array['admin']));

-- Deepdive-beoordeling: goedkeuren alleen door teamleider/admin
alter table topic_assessments enable row level security;
create policy ta_read on topic_assessments for select using (app.authenticated());
create policy ta_ins on topic_assessments for insert with check (
  app.has_any_role(array['admin','teamleider','medewerker'])
  and (status <> 'Goedgekeurd' or app.has_any_role(array['admin','teamleider'])));
create policy ta_upd on topic_assessments for update using (app.has_any_role(array['admin','teamleider','medewerker']))
  with check (status <> 'Goedgekeurd' or app.has_any_role(array['admin','teamleider']));

-- Projecten
alter table projects enable row level security;
create policy projects_read on projects for select using (app.authenticated());
create policy projects_ins on projects for insert with check (app.has_any_role(array['admin','teamleider','medewerker']));
create policy projects_upd on projects for update using (app.can_edit_project(id)) with check (app.can_edit_project(id));
create policy projects_del on projects for delete using (app.has_any_role(array['admin']));

do $$
declare t text;
begin
  foreach t in array array['project_pillars','project_topics','project_members','project_updates','project_dependencies','milestones','tasks']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (app.authenticated())', t||'_read', t);
  end loop;
end $$;
create policy pp_w on project_pillars for all using (app.can_edit_project(project_id)) with check (app.can_edit_project(project_id));
create policy pt_w on project_topics for all using (app.can_edit_project(project_id) or app.has_any_role(array['medewerker'])) with check (app.can_edit_project(project_id) or app.has_any_role(array['medewerker']));
create policy pm_w on project_members for all using (app.can_edit_project(project_id)) with check (app.can_edit_project(project_id));
create policy pu_w on project_updates for all using (app.can_edit_project(project_id)) with check (app.can_edit_project(project_id));
create policy pd_w on project_dependencies for all using (app.can_edit_project(project_id)) with check (app.can_edit_project(project_id));
create policy ms_w on milestones for all using (
  (project_id is not null and app.can_edit_project(project_id)) or app.has_any_role(array['admin','teamleider']))
  with check ((project_id is not null and app.can_edit_project(project_id)) or app.has_any_role(array['admin','teamleider']));
create policy tasks_w on tasks for all using (
  (project_id is not null and app.can_edit_project(project_id)) or app.has_any_role(array['admin','teamleider','medewerker']))
  with check ((project_id is not null and app.can_edit_project(project_id)) or app.has_any_role(array['admin','teamleider','medewerker']));

alter table expenses enable row level security;
create policy expenses_read on expenses for select using (
  app.has_any_role(array['admin','teamleider','management']) or app.can_edit_project(project_id));
create policy expenses_w on expenses for all using (app.can_edit_project(project_id)) with check (app.can_edit_project(project_id));

-- Prioriteringsbeoordelingen: blind stemmen afgedwongen in de database
alter table priority_assessments enable row level security;
create policy pa_read on priority_assessments for select using (app.can_see_assessment(session_item_id, user_id));
create policy pa_ins on priority_assessments for insert with check (
  (not is_consensus and user_id = app.uid() and exists (
     select 1 from priority_session_items i join priority_sessions s on s.id = i.session_id
     join priority_session_members m on m.session_id = s.id and m.user_id = app.uid()
     where i.id = session_item_id and s.status = 'Open voor beoordeling'))
  or (is_consensus and app.has_any_role(array['teamleider','admin'])));
create policy pa_upd on priority_assessments for update using (
  (not is_consensus and user_id = app.uid()) or (is_consensus and app.has_any_role(array['teamleider','admin'])))
  with check (
  (not is_consensus and user_id = app.uid() and exists (
     select 1 from priority_session_items i join priority_sessions s on s.id = i.session_id
     where i.id = session_item_id and s.status = 'Open voor beoordeling'))
  or (is_consensus and app.has_any_role(array['teamleider','admin'])));
-- geen delete-policy: oorspronkelijke beoordelingen blijven bewaard

alter table priority_scores enable row level security;
create policy ps_read on priority_scores for select using (
  exists (select 1 from priority_assessments a where a.id = assessment_id));
create policy ps_w on priority_scores for all using (
  exists (select 1 from priority_assessments a where a.id = assessment_id
          and ((not a.is_consensus and a.user_id = app.uid()) or (a.is_consensus and app.has_any_role(array['teamleider','admin'])))))
  with check (exists (select 1 from priority_assessments a where a.id = assessment_id
          and ((not a.is_consensus and a.user_id = app.uid()) or (a.is_consensus and app.has_any_role(array['teamleider','admin'])))));

alter table priority_assessment_revisions enable row level security;
create policy par_read on priority_assessment_revisions for select using (
  app.can_see_assessment(session_item_id, user_id));
create policy par_ins on priority_assessment_revisions for insert with check (false);

-- Risico's: vertrouwelijke risico's beperkt zichtbaar
alter table risks enable row level security;
create policy risks_read on risks for select using (
  not is_confidential or app.has_any_role(array['admin','teamleider','management'])
  or owner_user_id = app.uid() or created_by = app.uid());
create policy risks_ins on risks for insert with check (app.has_any_role(array['admin','teamleider','medewerker','projectleider']));
create policy risks_upd on risks for update using (
  app.has_any_role(array['admin','teamleider']) or owner_user_id = app.uid() or created_by = app.uid())
  with check (app.has_any_role(array['admin','teamleider']) or owner_user_id = app.uid() or created_by = app.uid());
create policy risks_del on risks for delete using (app.has_any_role(array['admin']));

-- Opmerkingen en bijlagen
alter table comments enable row level security;
create policy comments_read on comments for select using (app.authenticated());
create policy comments_ins on comments for insert with check (app.authenticated() and created_by = app.uid());
create policy comments_upd on comments for update using (created_by = app.uid() or app.has_any_role(array['admin']));
create policy comments_del on comments for delete using (created_by = app.uid() or app.has_any_role(array['admin']));

alter table attachments enable row level security;
create policy att_read on attachments for select using (app.authenticated());
create policy att_ins on attachments for insert with check (app.authenticated() and not app.has_any_role(array['management']) or app.has_any_role(array['admin','teamleider']));
create policy att_del on attachments for delete using (created_by = app.uid() or app.has_any_role(array['admin']));

alter table saved_views enable row level security;
create policy sv_all on saved_views for all using (user_id = app.uid()) with check (user_id = app.uid());

alter table audit_logs enable row level security;
create policy audit_read on audit_logs for select using (app.has_any_role(array['admin','teamleider']));
