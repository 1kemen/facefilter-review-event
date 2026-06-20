-- Monthly maintenance template for Face Filter review event.
-- Run only after monthly CSV/statistics export is complete.
-- This intentionally keeps prize settings, staff accounts, and current-month data.

begin;

-- 1) Remove old audit logs after export.
-- Audit logs are useful for issue tracking, but should not be kept forever.
delete from public.review_event_audit_logs
where occurred_at < now() - interval '180 days';

-- 2) Remove old participants after monthly statistics are saved.
-- Draw rows are deleted automatically by the participant foreign key cascade.
-- Audit rows already keep only nullable references, so they are not blocked.
delete from public.review_event_participants
where created_at < now() - interval '90 days';

-- 3) Remove stale QR sessions only when no participant still references them.
delete from public.review_event_sessions session
where session.created_at < now() - interval '30 days'
  and not exists (
    select 1
    from public.review_event_participants participant
    where participant.session_id = session.id
  );

commit;

-- Optional check after cleanup:
-- select
--   (select count(*) from public.review_event_participants) as participants,
--   (select count(*) from public.review_event_sessions) as sessions,
--   (select count(*) from public.review_event_audit_logs) as audit_logs;
