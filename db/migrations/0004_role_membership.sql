-- 0004 – Zorg dat het verbindingsaccount de applicatierol mag aannemen
-- (SET LOCAL ROLE app_user). Nodig wanneer de app niet als superuser verbindt
-- (Azure, Neon, Supabase). PostgreSQL 16+ vereist expliciet SET-recht.
do $$
declare ok boolean;
begin
  select pg_has_role(current_user, 'app_user', 'SET') into ok;
  if ok then return; end if;
  begin
    execute format('grant app_user to %I with set true, inherit false', current_user);  -- PG16+
  exception when syntax_error then
    execute format('grant app_user to %I', current_user);                              -- PG14/15
  end;
exception when insufficient_privilege then
  raise exception 'Account % mag rol app_user niet aannemen. Laat een beheerder uitvoeren: GRANT app_user TO %;', current_user, current_user;
end $$;
