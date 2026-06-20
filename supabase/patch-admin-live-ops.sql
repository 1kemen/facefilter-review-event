-- Admin live-ops RPC for authenticated staff dashboard.
-- Run after schema.sql and existing production patches.

begin;

create or replace function public.ff_get_admin_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ff_is_staff() then
    return jsonb_build_object('ok', false, 'code', 'not_staff');
  end if;

  return jsonb_build_object(
    'ok', true,
    'publicState', public.ff_get_public_state(),
    'prizes', coalesce((
      select jsonb_agg(to_jsonb(prize) order by prize.sort_order, prize.name)
      from public.review_event_prizes prize
    ), '[]'::jsonb),
    'participants', coalesce((
      select jsonb_agg(public.ff_participant_payload(p.id) order by p.created_at desc)
      from public.review_event_participants p
      where p.created_at > now() - interval '90 days'
    ), '[]'::jsonb),
    'auditLogs', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.id desc)
      from (
        select *
        from public.review_event_audit_logs
        order by id desc
        limit 500
      ) a
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.ff_get_admin_state() to authenticated;

commit;

-- After creating the admin auth user, register the owner profile:
-- select id, email from auth.users where email = 'hayashisan229@gmail.com';
-- insert into public.review_event_staff_profiles (user_id, display_name, role)
-- values ('PASTE_AUTH_USER_ID_HERE', '페이스필터 천호 관리자', 'owner')
-- on conflict (user_id) do update
-- set display_name = excluded.display_name,
--     role = excluded.role;
