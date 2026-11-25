-- 0003 – Importpreview: geparste rijen tijdelijk bij de batch bewaren tot bevestiging.
alter table import_batches add column if not exists payload jsonb;
alter table import_batches add column if not exists headers text[];
alter table import_batches add column if not exists committed_rows int;
comment on column import_batches.payload is 'Geparste rijen (preview). Wordt na bevestiging of annulering geleegd; oorspronkelijke medewerkersinput staat dan in source_inputs.';
