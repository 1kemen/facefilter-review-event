-- Allow customer self draw after the Naver review link has been opened for a short wait.
-- This removes the need for a visible "review completed" checkbox while keeping a server-side gate.

begin;

create or replace function public.ff_run_draw(
  p_session_id uuid,
  p_participant_id uuid,
  p_drop_choice integer default null,
  p_draw_type text default 'primary'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session_status text;
  v_participant public.review_event_participants%rowtype;
  v_prize public.review_event_prizes%rowtype;
  v_total_weight integer;
  v_ticket double precision;
  v_confirm_code text;
  v_draw public.review_event_draws%rowtype;
  v_review_wait interval := interval '10 seconds';
begin
  if coalesce(p_draw_type, 'primary') <> 'primary' then
    return jsonb_build_object('ok', false, 'code', 'extra_draw_removed');
  end if;

  if p_drop_choice is not null and (p_drop_choice < 1 or p_drop_choice > 5) then
    return jsonb_build_object('ok', false, 'code', 'invalid_drop_choice');
  end if;

  select status into v_session_status
  from public.review_event_sessions
  where id = p_session_id;

  if v_session_status is distinct from 'active' then
    return jsonb_build_object('ok', false, 'code', 'session_closed');
  end if;

  select * into v_participant
  from public.review_event_participants
  where id = p_participant_id
    and session_id = p_session_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'participant_not_found');
  end if;

  perform pg_advisory_xact_lock(260529717::bigint);

  if v_participant.gift_status = 'done' then
    return jsonb_build_object('ok', false, 'code', 'gift_completed');
  end if;

  if v_participant.review_status not in ('self_confirmed', 'approved') then
    if v_participant.review_opened_at is null then
      return jsonb_build_object('ok', false, 'code', 'review_required');
    end if;

    if v_participant.review_opened_at > now() - v_review_wait then
      return jsonb_build_object(
        'ok', false,
        'code', 'review_wait_required',
        'waitSeconds', greatest(1, ceil(extract(epoch from (v_participant.review_opened_at + v_review_wait - now())))::integer)
      );
    end if;

    update public.review_event_participants
    set
      review_status = 'self_confirmed',
      review_evidence = jsonb_build_object(
        'mode', 'auto_after_review_open',
        'reviewOpenedAt', v_participant.review_opened_at,
        'autoConfirmedAt', now(),
        'note', 'Review draw gate opened after review link wait.'
      )
    where id = p_participant_id
    returning * into v_participant;

    perform public.ff_write_audit(
      'customer',
      'photo_review_auto_confirmed',
      'review_event_participants',
      p_participant_id,
      p_session_id,
      p_participant_id,
      jsonb_build_object(
        'reviewOpenedAt', v_participant.review_opened_at,
        'waitSeconds', extract(epoch from v_review_wait)::integer
      )
    );
  end if;

  if exists (
    select 1
    from public.review_event_draws
    where participant_id = p_participant_id
      and type = 'primary'
  ) then
    return jsonb_build_object('ok', false, 'code', 'already_drawn', 'payload', public.ff_participant_payload(p_participant_id));
  end if;

  select coalesce(sum(weight), 0)
  into v_total_weight
  from public.review_event_prizes
  where active = true
    and weight > 0
    and awarded_count < initial_stock;

  if v_total_weight <= 0 then
    return jsonb_build_object('ok', false, 'code', 'no_prizes_available');
  end if;

  v_ticket := random() * v_total_weight;

  for v_prize in
    select *
    from public.review_event_prizes
    where active = true
      and weight > 0
      and awarded_count < initial_stock
    order by sort_order, name
    for update
  loop
    v_ticket := v_ticket - v_prize.weight;
    if v_ticket <= 0 then
      exit;
    end if;
  end loop;

  if v_prize.id is null then
    return jsonb_build_object('ok', false, 'code', 'draw_failed');
  end if;

  update public.review_event_prizes
  set awarded_count = awarded_count + 1
  where id = v_prize.id
  returning * into v_prize;

  v_confirm_code := 'RE-' || upper(left(replace(p_participant_id::text, '-', ''), 4)) || '-' ||
    lpad((floor(random() * 9000) + 1000)::integer::text, 4, '0');

  insert into public.review_event_draws (
    participant_id,
    type,
    status,
    prize_id,
    prize_name,
    prize_description,
    previous_draw_id,
    confirm_code,
    drop_choice,
    random_proof
  )
  values (
    p_participant_id,
    'primary',
    'active',
    v_prize.id,
    v_prize.name,
    v_prize.description,
    null,
    v_confirm_code,
    p_drop_choice,
    encode(digest(p_participant_id::text || '|' || v_prize.id::text || '|' || now()::text || '|' || random()::text, 'sha256'), 'hex')
  )
  returning * into v_draw;

  update public.review_event_participants
  set gift_status = 'waiting'
  where id = p_participant_id;

  perform public.ff_write_audit(
    'customer',
    'draw_completed',
    'review_event_draws',
    v_draw.id,
    p_session_id,
    p_participant_id,
    jsonb_build_object(
      'prizeId', v_prize.id,
      'prizeName', v_prize.name,
      'confirmCode', v_confirm_code,
      'dropChoice', p_drop_choice
    )
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'draw_completed',
    'draw', to_jsonb(v_draw),
    'payload', public.ff_participant_payload(p_participant_id)
  );
end;
$$;

grant execute on function public.ff_run_draw(uuid, uuid, integer, text) to anon, authenticated;

commit;
