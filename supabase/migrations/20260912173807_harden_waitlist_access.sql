create index waitlist_email_log_subscriber_id_idx
  on public.waitlist_email_log (subscriber_id);

create policy "Browser roles cannot access subscribers"
  on public.waitlist_subscribers
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "Browser roles cannot access email logs"
  on public.waitlist_email_log
  for all
  to anon, authenticated
  using (false)
  with check (false);
