-- =====================================================================
-- 0001 – Kernschema Digitale Informatie | Strategie & Portfolio
-- Hostingonafhankelijk PostgreSQL (>= 14). Geen Supabase-specifieke
-- objecten; RLS en audit volgen in 0002/0003.
-- =====================================================================

create extension if not exists pgcrypto;

create schema if not exists app;

-- ---------------------------------------------------------------------
-- Hulpfuncties
-- ---------------------------------------------------------------------
-- Huidige gebruiker wordt per transactie gezet via
--   select set_config('app.user_id', '<uuid>', true)
-- In Supabase kan deze functie worden vervangen door auth.uid().
create or replace function app.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function app.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if app.uid() is not null then
    new.updated_by := app.uid();
  end if;
  return new;
end $$;

create or replace function app.set_created_by() returns trigger
language plpgsql as $$
begin
  if new.created_by is null then
    new.created_by := app.uid();
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Gebruikers, rollen en disciplines
-- ---------------------------------------------------------------------
create table disciplines (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (position('@' in email) > 1),
  display_name text not null check (length(display_name) between 2 and 120),
  discipline_id uuid references disciplines(id),
  job_title text,
  external_id text unique,             -- bv. Entra ID object-id (oid)
  is_active boolean not null default true,
  is_fictitious boolean not null default false,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('admin','teamleider','medewerker','projectleider','management')),
  name text not null,
  description text
);

create table user_roles (
  user_id uuid not null references users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references users(id),
  primary key (user_id, role_id)
);

create or replace function app.has_any_role(codes text[]) returns boolean
language sql stable security definer set search_path = public, app as $$
  select exists (
    select 1 from user_roles ur join roles r on r.id = ur.role_id
    join users u on u.id = ur.user_id
    where ur.user_id = app.uid() and u.is_active and r.code = any(codes)
  )
$$;

-- ---------------------------------------------------------------------
-- Strategische pijlers
-- ---------------------------------------------------------------------
create table pillars (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number between 1 and 99),
  title text not null,
  short_title text,
  description text,
  objective text not null,
  responsible_user_id uuid references users(id),
  maturity_current smallint check (maturity_current between 1 and 5),
  maturity_target smallint check (maturity_target between 1 and 5),
  maturity_rationale text,
  ambition_year text,
  ambition_multi_year text,
  progress_pct numeric(5,2) check (progress_pct between 0 and 100),  -- null = onbekend
  sort_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table pillar_objectives (
  id uuid primary key default gen_random_uuid(),
  pillar_id uuid not null references pillars(id) on delete cascade,
  kind text not null default 'gewenst_resultaat' check (kind in ('gewenst_resultaat','doelstelling','ambitie')),
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on pillar_objectives(pillar_id);

-- ---------------------------------------------------------------------
-- Programma's
-- ---------------------------------------------------------------------
create table programs (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  pillar_id uuid not null references pillars(id),
  description text,
  objective text,
  owner_user_id uuid references users(id),
  status text not null default 'Concept' check (status in ('Concept','Actief','Gepauzeerd','Afgerond','Geannuleerd')),
  start_date date,
  end_date date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- ---------------------------------------------------------------------
-- Onderwerpen (inventarisatie)
-- ---------------------------------------------------------------------
create table topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                    -- bv. 1.01
  pillar_id uuid not null references pillars(id),
  title text not null check (length(title) between 2 and 300),
  subcategory text,
  program_id uuid references programs(id) on delete set null,
  description text,
  reason text,                                  -- aanleiding
  current_situation text,
  desired_situation text,
  problem_statement text,
  intended_result text,
  owner_user_id uuid references users(id),
  strategic_contribution text,
  legal_basis text,
  legal_deadline date,
  risk_if_not_done text,
  service_impact text,
  dependencies_text text,
  maturity_current smallint check (maturity_current between 1 and 5),
  maturity_target smallint check (maturity_target between 1 and 5),
  priority_category text check (priority_category in ('P1','P2','P3','P4')),
  priority_score numeric(6,3) check (priority_score between 0 and 100),
  priority_is_final boolean not null default false,
  required_capacity_hours numeric(10,1) check (required_capacity_hours >= 0),  -- null = onbekend
  required_budget numeric(14,2) check (required_budget >= 0),                  -- null = onbekend
  status text not null default 'Te valideren' check (status in
    ('Te valideren','In beoordeling','Gevalideerd','Niet relevant','Samengevoegd','Gesplitst','Omgezet naar project')),
  is_relevant boolean,                          -- null = nog niet beoordeeld
  remarks text,
  -- markeringen verplicht/urgent
  flag_legal boolean not null default false,
  flag_hard_deadline boolean not null default false,
  flag_acute_risk boolean not null default false,
  flag_admin_decided boolean not null default false,
  flag_critical_dependency boolean not null default false,
  flag_rationale text,
  merged_into_id uuid references topics(id),
  split_from_id uuid references topics(id),
  archived_at timestamptz,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  -- markering vereist onderbouwing
  constraint topic_flag_rationale check (
    not (flag_legal or flag_hard_deadline or flag_acute_risk or flag_admin_decided or flag_critical_dependency)
    or coalesce(length(trim(flag_rationale)),0) > 0
  ),
  constraint topic_hard_deadline_date check (not flag_hard_deadline or legal_deadline is not null),
  constraint topic_not_merged_into_self check (merged_into_id is null or merged_into_id <> id)
);
create index on topics(pillar_id);
create index on topics(program_id);
create index on topics(status);
create index topics_search_idx on topics using gin (to_tsvector('dutch', coalesce(code,'') || ' ' || title || ' ' || coalesce(description,'')));

create table topic_classifications (
  topic_id uuid not null references topics(id) on delete cascade,
  classification text not null check (classification in
    ('Regulier beheer','Wettelijke verplichting','Risicobeheersing','Randvoorwaardelijk','Optimalisatie','Innovatie')),
  primary key (topic_id, classification)
);

create table topic_disciplines (
  topic_id uuid not null references topics(id) on delete cascade,
  discipline_id uuid not null references disciplines(id) on delete cascade,
  primary key (topic_id, discipline_id)
);

-- Ruwe, ongewijzigde input (bijv. Excel met medewerkersinput)
create table import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  file_name text,
  row_count int not null default 0,
  status text not null default 'Preview' check (status in ('Preview','Bevestigd','Geannuleerd')),
  mapping jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table source_inputs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references import_batches(id),
  row_number int,
  raw jsonb not null,                       -- oorspronkelijke rij, ongewijzigd
  summary text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

-- Input is onveranderlijk: updates op raw zijn niet toegestaan
create or replace function app.protect_source_inputs() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.raw is distinct from old.raw then
    raise exception 'Oorspronkelijke input mag niet worden gewijzigd';
  end if;
  return new;
end $$;
create trigger source_inputs_immutable before update on source_inputs
  for each row execute function app.protect_source_inputs();

create table topic_sources (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references topics(id) on delete cascade,
  source_type text not null check (source_type in
    ('Medewerkersinput','Managementvoorstel','Wettelijke verplichting','Externe ontwikkeling','Directiebesluit','Overige bron','Nog te valideren')),
  source_input_id uuid references source_inputs(id),
  reference text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on topic_sources(topic_id);
create index on topic_sources(source_input_id);

-- Deepdive: gezamenlijke inhoudelijke beoordeling (15 vragen)
create table topic_assessments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null unique references topics(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'Concept' check (status in ('Concept','Ter goedkeuring','Goedgekeurd')),
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

-- Volwassenheid: historie, laatste meting is actueel
create table maturity_assessments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  pillar_id uuid references pillars(id) on delete cascade,
  current_level smallint not null check (current_level between 1 and 5),
  target_level smallint not null check (target_level between 1 and 5),
  current_rationale text,
  target_rationale text,
  assessed_at timestamptz not null default now(),
  created_by uuid references users(id),
  check ((topic_id is null) <> (pillar_id is null))
);
create index on maturity_assessments(topic_id, assessed_at desc);

-- ---------------------------------------------------------------------
-- Projecten
-- ---------------------------------------------------------------------
create sequence project_number_seq start 1;

create table projects (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('PRJ-' || lpad(nextval('project_number_seq')::text, 4, '0')),
  name text not null check (length(name) between 2 and 200),
  program_id uuid references programs(id) on delete set null,
  primary_pillar_id uuid not null references pillars(id),
  reason text,
  problem_statement text,
  objective text,
  scope text,
  out_of_scope text,
  business_case text,
  sponsor text,                                  -- opdrachtgever (rol/naam)
  project_leader_id uuid references users(id),
  stakeholders text,
  steering_group text,
  priority_category text check (priority_category in ('P1','P2','P3','P4')),
  priority_score numeric(6,3),
  feasibility_score numeric(6,3),
  start_date date,
  end_date date,
  planning_status text not null default 'Gepland' check (planning_status in ('Gepland','Vastgesteld')),
  budget numeric(14,2) check (budget >= 0),
  actual_cost numeric(14,2) check (actual_cost >= 0),
  hours_required numeric(10,1) check (hours_required >= 0),
  hours_actual numeric(10,1) check (hours_actual >= 0),
  status text not null default 'Idee' check (status in ('Idee','Te onderzoeken','In voorbereiding','Ter besluitvorming',
    'Goedgekeurd','Gepland','In uitvoering','Geblokkeerd','Gepauzeerd','Afgerond','Geannuleerd')),
  progress_pct numeric(5,2) check (progress_pct between 0 and 100),
  rag_time text check (rag_time in ('groen','oranje','rood')),
  rag_money text check (rag_money in ('groen','oranje','rood')),
  rag_scope text check (rag_scope in ('groen','oranje','rood')),
  rag_quality text check (rag_quality in ('groen','oranje','rood')),
  rag_capacity text check (rag_capacity in ('groen','oranje','rood')),
  rag_risk text check (rag_risk in ('groen','oranje','rood')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index on projects(primary_pillar_id);
create index on projects(status);

create table project_pillars (
  project_id uuid not null references projects(id) on delete cascade,
  pillar_id uuid not null references pillars(id),
  primary key (project_id, pillar_id)
);  -- secundaire pijlers; primaire pijler staat op projects

create table project_topics (
  project_id uuid not null references projects(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (project_id, topic_id)
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'Projectlid',
  hours_planned numeric(10,1),
  primary key (project_id, user_id)
);

create table project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  body text not null,
  progress_pct numeric(5,2) check (progress_pct between 0 and 100),
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table project_dependencies (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  depends_on_project_id uuid not null references projects(id) on delete cascade,
  kind text not null default 'Einde-start' check (kind in ('Einde-start','Start-start','Inhoudelijk')),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (project_id, depends_on_project_id),
  check (project_id <> depends_on_project_id)
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  title text not null,
  due_date date not null,
  is_legal_deadline boolean not null default false,
  status text not null default 'Open' check (status in ('Open','Behaald','Gemist','Verschoven')),
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  title text not null,
  assignee_id uuid references users(id),
  due_date date,
  status text not null default 'Open' check (status in ('Open','Bezig','Gereed','Vervallen')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

-- ---------------------------------------------------------------------
-- Prioritering
-- ---------------------------------------------------------------------
create table priority_models (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  name text not null,
  description text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create unique index priority_models_one_active on priority_models(is_active) where is_active;

create table priority_criteria (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references priority_models(id) on delete cascade,
  code text not null,
  name text not null,
  weight numeric(5,2) not null check (weight >= 0 and weight <= 100),
  description text,
  rubric jsonb not null,           -- array van 6 omschrijvingen (score 0..5)
  sort_order int not null default 0,
  unique (model_id, code),
  check (jsonb_typeof(rubric) = 'array' and jsonb_array_length(rubric) = 6)
);

-- Som van gewichten moet exact 100 zijn (gecontroleerd aan einde transactie)
create or replace function app.check_model_weights() returns trigger language plpgsql as $$
declare s numeric; mid uuid;
begin
  mid := coalesce(new.model_id, old.model_id);
  select coalesce(sum(weight),0) into s from priority_criteria where model_id = mid;
  if exists (select 1 from priority_models where id = mid) and s <> 100 then
    raise exception 'De som van de gewichten moet 100%% zijn (nu %)', s using errcode = '23514';
  end if;
  return null;
end $$;
create constraint trigger priority_criteria_weight_sum
  after insert or update or delete on priority_criteria
  deferrable initially deferred
  for each row execute function app.check_model_weights();

create table priority_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  model_id uuid not null references priority_models(id),
  status text not null default 'Concept' check (status in ('Concept','Open voor beoordeling','Bespreking','Afgerond')),
  start_date date,
  end_date date,
  hide_individual boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table priority_session_members (
  session_id uuid not null references priority_sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (session_id, user_id)
);

create table priority_session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references priority_sessions(id) on delete cascade,
  topic_id uuid references topics(id),
  project_id uuid references projects(id),
  sort_order int not null default 0,
  consensus_score numeric(6,3),
  consensus_category text check (consensus_category in ('P1','P2','P3','P4')),
  consensus_note text,
  consensus_at timestamptz,
  check ((topic_id is null) <> (project_id is null)),
  unique (session_id, topic_id),
  unique (session_id, project_id)
);

create table priority_assessments (
  id uuid primary key default gen_random_uuid(),
  session_item_id uuid not null references priority_session_items(id) on delete cascade,
  user_id uuid not null references users(id),
  is_consensus boolean not null default false,
  rationale text,
  total_score numeric(6,3) not null,
  category text not null check (category in ('P1','P2','P3','P4')),
  revision int not null default 1,
  submitted_at timestamptz not null default now(),
  unique (session_item_id, user_id, is_consensus)
);

create table priority_scores (
  assessment_id uuid not null references priority_assessments(id) on delete cascade,
  criterion_id uuid not null references priority_criteria(id),
  score smallint not null check (score between 0 and 5),
  primary key (assessment_id, criterion_id)
);

-- Onveranderlijke revisiehistorie van beoordelingen
create table priority_assessment_revisions (
  id bigserial primary key,
  assessment_id uuid not null,
  session_item_id uuid not null,
  user_id uuid not null,
  revision int not null,
  total_score numeric(6,3) not null,
  category text not null,
  rationale text,
  scores jsonb not null,
  recorded_at timestamptz not null default now()
);

create table priority_decisions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id),
  project_id uuid references projects(id),
  session_item_id uuid references priority_session_items(id),
  consensus_category text check (consensus_category in ('P1','P2','P3','P4')),
  consensus_score numeric(6,3),
  final_category text not null check (final_category in ('P1','P2','P3','P4')),
  deviation_rationale text,
  decided_at timestamptz not null default now(),
  decided_by uuid references users(id),
  check ((topic_id is null) <> (project_id is null)),
  constraint deviation_requires_rationale check (
    consensus_category is null or final_category = consensus_category
    or coalesce(length(trim(deviation_rationale)),0) >= 10)
);

create table feasibility_assessments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  capacity smallint check (capacity between 0 and 5),
  expertise smallint check (expertise between 0 and 5),
  budget smallint check (budget between 0 and 5),
  technical_complexity smallint check (technical_complexity between 0 and 5),
  organizational_complexity smallint check (organizational_complexity between 0 and 5),
  dependencies smallint check (dependencies between 0 and 5),
  readiness smallint check (readiness between 0 and 5),
  total_score numeric(6,3),
  blocking_capacity boolean not null default false,
  blocking_expertise boolean not null default false,
  blocking_budget boolean not null default false,
  rationale text,
  assessed_at timestamptz not null default now(),
  created_by uuid references users(id),
  check ((topic_id is null) <> (project_id is null))
);
create index on feasibility_assessments(topic_id, assessed_at desc);

-- ---------------------------------------------------------------------
-- Organisatie: reguliere werkzaamheden, formatie, capaciteit
-- ---------------------------------------------------------------------
create table recurring_activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  pillar_id uuid references pillars(id),
  discipline_id uuid references disciplines(id),
  description text,
  frequency text check (frequency in ('Dagelijks','Wekelijks','Maandelijks','Per kwartaal','Halfjaarlijks','Jaarlijks','Doorlopend','Ad hoc')),
  hours_per_occurrence numeric(8,2) check (hours_per_occurrence >= 0),
  occurrences_per_year numeric(8,2) check (occurrences_per_year >= 0),
  hours_per_year numeric(10,1) check (hours_per_year >= 0),
  responsible_role text,
  backup_role text,
  criticality text check (criticality in ('Laag','Midden','Hoog','Kritiek')),
  is_legal_obligation boolean not null default false,
  dependencies text,
  automation_potential text check (automation_potential in ('Geen','Beperkt','Gemiddeld','Groot')),
  outsourcing_potential text check (outsourcing_potential in ('Geen','Beperkt','Gemiddeld','Groot')),
  quality_indicators text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table staffing_positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  discipline_id uuid not null references disciplines(id),
  subteam text,
  fte numeric(4,2) not null check (fte > 0 and fte <= 1.5),
  kind text not null check (kind in ('Vastgestelde formatie','Tijdelijke inhuur','Structurele inhuur')),
  occupancy text not null default 'Vacature' check (occupancy in ('Bezet','Vacature','Deels bezet')),
  occupied_fte numeric(4,2) check (occupied_fte >= 0),
  user_id uuid references users(id),
  annual_cost numeric(12,2) check (annual_cost >= 0),
  contract_hours_per_week numeric(5,2) check (contract_hours_per_week between 0 and 40),
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table staffing_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_baseline boolean not null default false,
  structure_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table staffing_scenario_positions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references staffing_scenarios(id) on delete cascade,
  discipline_id uuid not null references disciplines(id),
  subteam text,
  title text not null,
  fte numeric(5,2) not null check (fte >= 0),
  kind text not null default 'Intern' check (kind in ('Intern','Inhuur')),
  annual_cost numeric(12,2) check (annual_cost >= 0),
  notes text
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  discipline_id uuid references disciplines(id),
  description text,
  is_critical boolean not null default false
);

create table position_skills (
  position_id uuid not null references staffing_positions(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  level smallint check (level between 1 and 5),
  required_level smallint check (required_level between 1 and 5),
  primary key (position_id, skill_id)
);

create table capacity_periods (
  id uuid primary key default gen_random_uuid(),
  year int not null check (year between 2020 and 2100),
  quarter smallint not null check (quarter between 1 and 4),
  label text not null,
  unique (year, quarter)
);

-- Toewijzing van uren; scenario_id null = vastgestelde planning
create table capacity_allocations (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references capacity_periods(id),
  discipline_id uuid not null references disciplines(id),
  user_id uuid references users(id),
  project_id uuid references projects(id) on delete cascade,
  recurring_activity_id uuid references recurring_activities(id) on delete cascade,
  scenario_id uuid references staffing_scenarios(id) on delete cascade,
  kind text not null check (kind in ('Beschikbaar','Regulier','Project','Reservering')),
  hours numeric(10,1) not null check (hours >= 0),
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on capacity_allocations(period_id, discipline_id);

-- ---------------------------------------------------------------------
-- Financiën
-- ---------------------------------------------------------------------
create table budgets (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  pillar_id uuid references pillars(id),
  project_id uuid references projects(id) on delete cascade,
  kind text not null check (kind in ('Beschikbaar','Benodigd')),
  category text check (category in ('Incidenteel','Structureel')),
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  spent_on date not null,
  amount numeric(14,2) not null,
  description text not null,
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

-- ---------------------------------------------------------------------
-- Governance
-- ---------------------------------------------------------------------
create sequence risk_number_seq start 1;
create table risks (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('R-' || lpad(nextval('risk_number_seq')::text, 4, '0')),
  title text not null,
  description text,
  pillar_id uuid references pillars(id),
  project_id uuid references projects(id) on delete set null,
  process text,
  category text not null check (category in ('Informatiebeveiliging','Privacy','Continuïteit','Financieel','Personeel',
    'Leveranciers','Technisch','Wet- en regelgeving','Dienstverlening','Reputatie')),
  cause text,
  consequence text,
  likelihood smallint check (likelihood between 1 and 5),
  impact smallint check (impact between 1 and 5),
  gross_score smallint generated always as (likelihood * impact) stored,
  existing_controls text,
  residual_likelihood smallint check (residual_likelihood between 1 and 5),
  residual_impact smallint check (residual_impact between 1 and 5),
  residual_score smallint generated always as (residual_likelihood * residual_impact) stored,
  proposed_measures text,
  owner_user_id uuid references users(id),
  deadline date,
  stage text not null default 'Signaal' check (stage in ('Signaal','Gevalideerd','Geaccepteerd','Gesloten')),
  escalation_level text check (escalation_level in ('Team','Afdeling','Directie','Bestuur')),
  is_confidential boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table risk_measures (
  id uuid primary key default gen_random_uuid(),
  risk_id uuid not null references risks(id) on delete cascade,
  description text not null,
  owner_user_id uuid references users(id),
  due_date date,
  status text not null default 'Open' check (status in ('Open','In uitvoering','Gereed')),
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);

create sequence decision_number_seq start 1;
create table decisions (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('B-' || to_char(now(),'YYYY') || '-' || lpad(nextval('decision_number_seq')::text, 3, '0')),
  subject text not null,
  reason text,
  proposed_decision text,
  alternatives text,
  financial_consequences text,
  capacity_consequences text,
  risks text,
  decision_body text check (decision_body in ('Teamleider','MT','Directie','College van B&W','Gemeenteraad','Stuurgroep','Overig')),
  decision_date date,
  outcome text not null default 'Openstaand' check (outcome in ('Openstaand','Akkoord','Akkoord met wijzigingen','Uitgesteld','Afgewezen','Ingetrokken')),
  decision_text text,
  rationale text,
  responsible_user_id uuid references users(id),
  follow_up text,
  pillar_id uuid references pillars(id),
  program_id uuid references programs(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  topic_id uuid references topics(id) on delete set null,
  scenario_id uuid references staffing_scenarios(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id),
  check (outcome = 'Openstaand' or decision_date is not null)
);

create table kpis (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  definition text,
  measurement_method text,
  baseline_value numeric,           -- null = geen nulmeting
  baseline_date date,
  target_value numeric,
  unit text,
  owner_user_id uuid references users(id),
  frequency text check (frequency in ('Maandelijks','Per kwartaal','Halfjaarlijks','Jaarlijks')),
  direction text not null default 'Hoger is beter' check (direction in ('Hoger is beter','Lager is beter')),
  pillar_id uuid references pillars(id),
  program_id uuid references programs(id) on delete set null,
  project_id uuid references projects(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table kpi_measurements (
  id uuid primary key default gen_random_uuid(),
  kpi_id uuid not null references kpis(id) on delete cascade,
  measured_on date not null,
  value numeric not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (kpi_id, measured_on)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  services text,
  contract_owner text,
  contract_end date,
  criticality text check (criticality in ('Laag','Midden','Hoog','Kritiek')),
  has_processing_agreement boolean,     -- verwerkersovereenkomst; null = onbekend
  security_assessment text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table regulatory_requirements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  authority text,
  pillar_id uuid references pillars(id),
  effective_date date,
  deadline date,
  status text check (status in ('Te analyseren','In uitvoering','Geïmplementeerd','Niet van toepassing')),
  reference_url text check (reference_url is null or reference_url ~ '^https?://'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

-- ---------------------------------------------------------------------
-- Jaarplan
-- ---------------------------------------------------------------------
create table annual_plans (
  id uuid primary key default gen_random_uuid(),
  year int not null unique check (year between 2020 and 2100),
  title text not null,
  theme text,
  status text not null default 'Concept' check (status in ('Concept','In bespreking','Ter besluitvorming','Vastgesteld','In uitvoering','Geëvalueerd')),
  sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table annual_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references annual_plans(id) on delete cascade,
  version int not null,
  status text not null,
  snapshot jsonb not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  unique (plan_id, version)
);

create table annual_plan_projects (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references annual_plans(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade,
  program_id uuid references programs(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  check (num_nonnulls(project_id, topic_id, program_id) = 1),
  unique (plan_id, project_id),
  unique (plan_id, topic_id),
  unique (plan_id, program_id)
);

-- ---------------------------------------------------------------------
-- Generiek: opmerkingen, bijlagen, weergaven, instellingen, werksessies
-- ---------------------------------------------------------------------
create table comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('topic','project','program','pillar','risk','decision','session')),
  entity_id uuid not null,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  created_by uuid references users(id),
  archived_at timestamptz
);
create index on comments(entity_type, entity_id);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  title text not null,
  url text not null check (url ~ '^https?://'),   -- verwijzing naar goedgekeurde opslag (bv. SharePoint)
  created_at timestamptz not null default now(),
  created_by uuid references users(id)
);
create index on attachments(entity_type, entity_id);

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  page text not null,
  name text not null,
  config jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, page, name)
);

create table work_sessions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Deepdive','Prioritering','Jaarplanning')),
  title text not null,
  pillar_id uuid references pillars(id),
  priority_session_id uuid references priority_sessions(id),
  state jsonb not null default '{}'::jsonb,       -- positie/voortgang om te hervatten
  status text not null default 'Lopend' check (status in ('Lopend','Afgerond')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references users(id),
  updated_by uuid references users(id)
);

create table settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references users(id)
);

create table audit_logs (
  id bigserial primary key,
  table_name text not null,
  record_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  changed_by uuid,
  changed_at timestamptz not null default now()
);
create index on audit_logs(table_name, record_id);
create index on audit_logs(changed_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['users','pillars','programs','topics','topic_assessments','projects','tasks','priority_sessions',
    'recurring_activities','staffing_positions','staffing_scenarios','risks','decisions','kpis','suppliers',
    'regulatory_requirements','annual_plans','work_sessions']
  loop
    execute format('create trigger %I_touch before update on %I for each row execute function app.touch_updated_at()', t, t);
  end loop;
end $$;

-- created_by triggers (alle tabellen met kolom created_by)
do $$
declare r record;
begin
  for r in select table_name from information_schema.columns
           where table_schema = 'public' and column_name = 'created_by'
  loop
    execute format('create trigger %I_created_by before insert on %I for each row execute function app.set_created_by()', r.table_name, r.table_name);
  end loop;
end $$;
