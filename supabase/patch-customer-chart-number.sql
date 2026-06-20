begin;

alter table public.review_event_participants
add column if not exists customer_chart_no text;

create or replace function public.ff_update_participant_staff_fields_v2(
  p_participant_id uuid,
  p_promoter_name text default null,
  p_gift_staff_name text default null,
  p_staff_memo text default null,
  p_customer_chart_no text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  update public.review_event_participants
  set promoter_name = nullif(btrim(coalesce(p_promoter_name, '')), ''),
      gift_staff_name = nullif(btrim(coalesce(p_gift_staff_name, '')), ''),
      customer_chart_no = nullif(btrim(coalesce(p_customer_chart_no, '')), ''),
      staff_memo = nullif(btrim(coalesce(p_staff_memo, '')), '')
  where id = p_participant_id
  returning * into v_participant;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  perform public.ff_write_audit(
    'staff',
    'staff_record_updated',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object(
      'promoterName', v_participant.promoter_name,
      'giftStaffName', v_participant.gift_staff_name,
      'customerChartNo', v_participant.customer_chart_no,
      'staffUid', auth.uid()
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_complete_gift_v3(
  p_participant_id uuid,
  p_staff_memo text default null,
  p_gift_staff_name text default null,
  p_promoter_name text default null,
  p_customer_chart_no text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  if not exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'code', 'draw_required');
  end if;

  update public.review_event_participants
  set gift_status = 'done',
      gift_completed_at = coalesce(gift_completed_at, now()),
      promoter_name = nullif(btrim(coalesce(p_promoter_name, promoter_name, '')), ''),
      gift_staff_name = nullif(btrim(coalesce(p_gift_staff_name, gift_staff_name, '')), ''),
      customer_chart_no = nullif(btrim(coalesce(p_customer_chart_no, customer_chart_no, '')), ''),
      staff_memo = nullif(btrim(coalesce(p_staff_memo, staff_memo, '')), '')
  where id = p_participant_id
  returning * into v_participant;

  update public.review_event_sessions
  set status = 'closed',
      closed_at = coalesce(closed_at, now())
  where id = v_participant.session_id;

  perform public.ff_write_audit(
    'staff',
    'gift_completed',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object(
      'staffUid', auth.uid(),
      'promoterName', v_participant.promoter_name,
      'giftStaffName', v_participant.gift_staff_name,
      'customerChartNo', v_participant.customer_chart_no
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

revoke execute on function public.ff_update_participant_staff_fields_v2(uuid, text, text, text, text) from public;
revoke execute on function public.ff_complete_gift_v3(uuid, text, text, text, text) from public;

grant execute on function public.ff_update_participant_staff_fields_v2(uuid, text, text, text, text) to authenticated;
grant execute on function public.ff_complete_gift_v3(uuid, text, text, text, text) to authenticated;

commit;
