begin;

create or replace function public.ff_staff_force_draw(
  p_participant_id uuid,
  p_staff_memo text,
  p_drop_choice integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_participant public.review_event_participants%rowtype;
  v_memo text;
  v_result jsonb;
begin
  if not public.ff_is_staff() then
    raise exception 'staff permission required';
  end if;

  v_memo := left(nullif(btrim(regexp_replace(coalesce(p_staff_memo, ''), '\s+', ' ', 'g')), ''), 500);
  if v_memo is null then
    return jsonb_build_object('ok', false, 'code', 'staff_memo_required', 'message', '특이사항 메모가 필요합니다.');
  end if;

  select *
  into v_participant
  from public.review_event_participants
  where id = p_participant_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  if v_participant.gift_status = 'done' then
    return jsonb_build_object('ok', false, 'code', 'gift_completed');
  end if;

  if exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and type = 'primary'
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_drawn', 'payload', public.ff_participant_payload(p_participant_id));
  end if;

  update public.review_event_participants
  set review_status = 'approved',
      review_evidence = coalesce(review_evidence, '{}'::jsonb) || jsonb_build_object(
        'staffOverride', true,
        'staffOverrideAt', now(),
        'staffOverrideMemo', v_memo,
        'staffOverrideUid', auth.uid()
      ),
      staff_memo = v_memo
  where id = p_participant_id
  returning * into v_participant;

  perform public.ff_write_audit(
    'staff',
    'review_approved_by_staff_override',
    'review_event_participants',
    p_participant_id,
    v_participant.session_id,
    p_participant_id,
    jsonb_build_object(
      'staffUid', auth.uid(),
      'staffMemo', v_memo
    )
  );

  v_result := public.ff_run_draw(v_participant.session_id, p_participant_id, p_drop_choice, 'primary');

  if coalesce((v_result ->> 'ok')::boolean, false) then
    perform public.ff_write_audit(
      'staff',
      'staff_force_draw_completed',
      'review_event_participants',
      p_participant_id,
      v_participant.session_id,
      p_participant_id,
      jsonb_build_object(
        'staffUid', auth.uid(),
        'staffMemo', v_memo
      )
    );
  end if;

  return v_result || jsonb_build_object('staffOverride', true);
end;
$$;

revoke execute on function public.ff_staff_force_draw(uuid, text, integer) from public;
grant execute on function public.ff_staff_force_draw(uuid, text, integer) to authenticated;

commit;
