-- Rename Kakao channel confirmation audit data so it no longer implies an extra gift.
-- Safe to run during live service: only replaces the RPC body; participant rows are untouched.

begin;

create or replace function public.ff_set_kakao_verified(
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
  set kakao_verified = true,
      kakao_verified_at = coalesce(kakao_verified_at, now())
  where id = p_participant_id
    and session_id = p_session_id
    and gift_status <> 'done';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_available');
  end if;

  perform public.ff_write_audit(
    'customer',
    'kakao_channel_confirmed',
    'review_event_participants',
    p_participant_id,
    p_session_id,
    p_participant_id,
    jsonb_build_object('source', 'customer_channel_action')
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

grant execute on function public.ff_set_kakao_verified(uuid, uuid) to anon, authenticated;

commit;
