-- Remove the old survey-linked extra draw behavior from the live API surface.
-- This keeps existing historical rows intact, but blocks any new non-primary draw RPC call.

begin;

drop function if exists public.ff_mark_survey_opened(uuid, uuid);
drop function if exists public.ff_set_survey_completed(uuid, uuid, boolean);

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
    return jsonb_build_object('ok', false, 'code', 'review_required');
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
