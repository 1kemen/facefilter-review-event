-- Persist Kakao channel-open intent so customers can return from Kakao
-- and still see the sheet-mask benefit button.

begin;

alter table public.review_event_participants
add column if not exists kakao_opened_at timestamptz;

create or replace function public.ff_mark_kakao_opened(
  p_session_id uuid,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.review_event_participants
  set kakao_opened_at = coalesce(kakao_opened_at, now())
  where id = p_participant_id
    and session_id = p_session_id
    and gift_status <> 'done';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_available');
  end if;

  perform public.ff_write_audit(
    'customer',
    'kakao_channel_link_opened',
    'review_event_participants',
    p_participant_id,
    p_session_id,
    p_participant_id,
    '{}'::jsonb
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

grant execute on function public.ff_mark_kakao_opened(uuid, uuid) to anon, authenticated;

commit;
