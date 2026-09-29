-- Ejecutar después de 20260929_automated_outreach.sql.
-- Corre todos los días a las 09:00 de Argentina (12:00 UTC).
select cron.unschedule('buzzent-daily-outreach')
where exists (select 1 from cron.job where jobname = 'buzzent-daily-outreach');

select cron.schedule(
  'buzzent-daily-outreach',
  '0 12 * * *',
  $$
    select net.http_post(
      url := 'https://ezenkijgrkygtkcgnjyu.supabase.co/functions/v1/daily-outreach',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', '<SET_TO_OUTREACH_CRON_SECRET_VALUE>'
          ),
      body := '{}'::jsonb
    );
  $$
);
