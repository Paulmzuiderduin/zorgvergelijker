alter table public.waitlist_subscribers
  add column reminder_claimed_at timestamptz,
  add column reminder_sent_at timestamptz,
  add column reminder_attempt_count integer not null default 0
    check (reminder_attempt_count between 0 and 3),
  add column reminder_last_error text;

create index waitlist_subscribers_reminder_queue_idx
  on public.waitlist_subscribers (confirmed_at, id)
  where status = 'confirmed' and reminder_sent_at is null;

create unique index waitlist_email_log_one_launch_reminder_idx
  on public.waitlist_email_log (subscriber_id)
  where kind = 'launch_reminder';

comment on column public.waitlist_subscribers.reminder_claimed_at is
  'Short-lived processing claim used to prevent concurrent reminder sends.';

comment on column public.waitlist_subscribers.reminder_sent_at is
  'Timestamp of the single seasonal reminder promised during signup.';

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-zorgvergelijker-reminder-2027',
  '*/15 9-21 13-15 11 *',
  $job$
  select net.http_post(
    url := (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'zorgvergelijker_project_url'
    ) || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'zorgvergelijker_publishable_key'
      )
    ),
    body := jsonb_build_object('campaign', 'overstapseizoen-2027'),
    timeout_milliseconds := 10000
  );
  $job$
);
