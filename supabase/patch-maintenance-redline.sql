-- Adds admin maintenance/redline metrics to ff_get_admin_state.
-- Safe to run repeatedly. This does not delete data.

begin;

create or replace function public.ff_get_admin_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  if not public.ff_is_staff() then
    return jsonb_build_object('ok', false, 'code', 'not_staff');
  end if;

  return jsonb_build_object(
    'ok', true,
    'staffProfile', (
      select to_jsonb(profile)
      from public.review_event_staff_profiles profile
      where profile.user_id = auth.uid()
      limit 1
    ),
    'publicState', public.ff_get_public_state(),
    'prizes', coalesce((
      select jsonb_agg(to_jsonb(prize) order by prize.sort_order, prize.name)
      from public.review_event_prizes prize
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(public.ff_participant_payload(p.id) order by p.created_at desc)
      from public.review_event_participants p
      where p.created_at > v_now - interval '90 days'
    ), '[]'::jsonb),
    'auditLogs', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.id desc)
      from (
        select *
        from public.review_event_audit_logs
        order by id desc
        limit 500
      ) a
    ), '[]'::jsonb),
    'maintenance', jsonb_build_object(
      'generatedAt', v_now,
      'retention', jsonb_build_object(
        'participantDays', 90,
        'sessionDays', 30,
        'auditDays', 180
      ),
      'participants', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where created_at < v_now - interval '90 days'),
          'oldestAt', min(created_at),
          'latestAt', max(created_at)
        )
        from public.review_event_participants
      ),
      'sessions', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where created_at < v_now - interval '30 days'),
          'oldestAt', min(created_at),
          'latestAt', max(created_at)
        )
        from public.review_event_sessions
      ),
      'auditLogs', (
        select jsonb_build_object(
          'total', count(*),
          'oldCount', count(*) filter (where occurred_at < v_now - interval '180 days'),
          'oldestAt', min(occurred_at),
          'latestAt', max(occurred_at)
        )
        from public.review_event_audit_logs
      )
    )
  );
end;
$$;

grant execute on function public.ff_get_admin_state() to authenticated;

commit;
