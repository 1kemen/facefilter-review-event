begin;

alter table public.review_event_participants
add column if not exists promoter_name text,
add column if not exists gift_staff_name text;

create or replace function public.ff_keep_saved_staff_names()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(old.promoter_name, '')), '') is not null
    and new.promoter_name is distinct from old.promoter_name then
    new.promoter_name := old.promoter_name;
  end if;

  if nullif(btrim(coalesce(old.gift_staff_name, '')), '') is not null
    and new.gift_staff_name is distinct from old.gift_staff_name then
    new.gift_staff_name := old.gift_staff_name;
  end if;

  return new;
end;
$$;

drop trigger if exists review_event_participants_keep_saved_staff_names
on public.review_event_participants;

create trigger review_event_participants_keep_saved_staff_names
before update of promoter_name, gift_staff_name
on public.review_event_participants
for each row
execute function public.ff_keep_saved_staff_names();

create or replace function public.ff_update_participant_staff_fields(
  p_participant_id uuid,
  p_promoter_name text default null,
  p_gift_staff_name text default null,
  p_staff_memo text default null
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
      'staffUid', auth.uid()
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

create or replace function public.ff_complete_gift_v2(
  p_participant_id uuid,
  p_staff_memo text default null,
  p_gift_staff_name text default null,
  p_promoter_name text default null
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
      'giftStaffName', v_participant.gift_staff_name
    )
  );

  return jsonb_build_object('ok', true, 'payload', public.ff_participant_payload(p_participant_id));
end;
$$;

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

drop policy if exists "staff can manage settings" on public.review_event_settings;
drop policy if exists "owners can manage settings" on public.review_event_settings;
create policy "owners can manage settings"
on public.review_event_settings
for all
to authenticated
using (public.ff_is_owner())
with check (public.ff_is_owner());

drop policy if exists "staff can manage prizes" on public.review_event_prizes;
drop policy if exists "owners can manage prizes" on public.review_event_prizes;
create policy "owners can manage prizes"
on public.review_event_prizes
for all
to authenticated
using (public.ff_is_owner())
with check (public.ff_is_owner());

revoke execute on function public.ff_update_participant_staff_fields(uuid, text, text, text) from public;
revoke execute on function public.ff_complete_gift_v2(uuid, text, text, text) from public;
revoke execute on function public.ff_delete_participant(uuid) from public;
grant execute on function public.ff_update_participant_staff_fields(uuid, text, text, text) to authenticated;
grant execute on function public.ff_complete_gift_v2(uuid, text, text, text) to authenticated;
grant execute on function public.ff_delete_participant(uuid) to authenticated;

commit;
