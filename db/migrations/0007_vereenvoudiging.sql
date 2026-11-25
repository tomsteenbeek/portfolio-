-- 0007 – Vereenvoudigde opzet: onderwerpen als 'werk in uitvoering' met één eigenaar
-- (vrije tekst), KPI's koppelbaar aan onderwerpen, projecten/initiatieven met
-- link naar Planner. Bestaande kolommen blijven bestaan (niets verwijderd).

alter table topics add column if not exists scope text;                       -- wat valt onder dit onderwerp
alter table topics add column if not exists owner_name text
  check (owner_name is null or length(owner_name) <= 120);                    -- eigenaar (vrije tekst)

alter table kpis add column if not exists topic_id uuid references topics(id) on delete set null;
alter table kpis add column if not exists owner_name text check (owner_name is null or length(owner_name) <= 120);
create index if not exists kpis_topic_idx on kpis(topic_id);

alter table projects add column if not exists description text;
alter table projects add column if not exists lead_name text check (lead_name is null or length(lead_name) <= 120);
alter table projects add column if not exists planner_url text check (planner_url is null or planner_url ~ '^https?://');
