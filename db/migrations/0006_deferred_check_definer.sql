-- 0006 – De uitgestelde controle op de modelgewichten (som = 100%) draait bij het
-- afronden van de transactie, wanneer de API-rol al terug is op 'anon'. Laat de
-- controle daarom met de rechten van de eigenaar lezen.
alter function app.check_model_weights() security definer set search_path = public, app;
