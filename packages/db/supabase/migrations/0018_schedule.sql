-- Scheduled jobs. pg_cron exists only on Supabase; elsewhere this migration does nothing.
-- Times are UTC. Edge Function jobs (push delivery, account purge) are scheduled in Supabase Cron, see docs/DEPLOYMENT.md.
do $$
begin
  if to_regnamespace('cron') is null then
    return;
  end if;
  perform cron.schedule('verify-redemptions', '* * * * *', 'select app.verify_due_redemptions()');
  perform cron.schedule('open-drops', '* * * * *', 'select app.open_drops()');
  perform cron.schedule('send-campaigns', '* * * * *', 'select app.send_due_campaigns()');
  perform cron.schedule('expire-items', '*/5 * * * *', 'select app.expire_items()');
  perform cron.schedule('release-credits', '0 * * * *', 'select app.release_held_credits()');
  perform cron.schedule('detect-fraud', '15 * * * *', 'select app.detect_fraud()');
  perform cron.schedule('evaluate-badges', '30 20 * * *', 'select app.evaluate_badges()');
  perform cron.schedule('monthly-invoices', '0 21 * * *', 'select app.run_monthly_invoices()');
  perform cron.schedule('mark-overdue', '30 21 * * *', 'select app.mark_overdue_invoices()');
  perform cron.schedule('accrue-boosts', '25 18 * * *', 'select app.accrue_boost_fees()');
  perform cron.schedule('purge-logs', '0 22 * * *', 'select app.purge_logs()');
  perform cron.schedule('anonymise-accounts', '30 22 * * *', 'select app.anonymise_deleted_accounts()');
end $$;
