begin;

create or replace function public.ff_delete_participant(
  p_participant_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.review_event_participants%rowtype;
  v_adjustments jsonb := '[]'::jsonb;
begin
  if not public.ff_is_owner() then
    raise exception 'owner permission required';
  end if;

  select *
  into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  with prize_counts as (
    select prize_id, count(*)::integer as draw_count
    from public.review_event_draws
    where participant_id = p_participant_id
      and status = 'active'
    group by prize_id
  ),
  updated as (
    update public.review_event_prizes prize
    set awarded_count = greatest(prize.awarded_count - prize_counts.draw_count, 0)
    from prize_counts
    where prize.id = prize_counts.prize_id
    returning prize.id, prize.name, prize_counts.draw_count
  )
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'prizeId', id,
      'prizeName', name,
      'count', draw_count
    )),
    '[]'::jsonb
  )
  into v_adjustments
  from updated;

  delete from public.review_event_participants
  where id = p_participant_id;

  perform public.ff_write_audit(
    'staff',
    'participant_deleted',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    null,
    jsonb_build_object(
      'customerName', v_participant.customer_name,
      'chartCode', v_participant.chart_code,
      'naverHandle', v_participant.naver_handle,
      'adjustedPrizes', v_adjustments,
      'staffUid', auth.uid()
    )
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'participant_deleted',
    'deletedId', p_participant_id
  );
end;
$$;

revoke execute on function public.ff_delete_participant(uuid) from public;
grant execute on function public.ff_delete_participant(uuid) to authenticated;

commit;
