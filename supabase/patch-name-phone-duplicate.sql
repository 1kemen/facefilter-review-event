-- Allow duplicate phone last-4 values by themselves.
-- A same-day duplicate is now:
-- 1) same Naver ID/review nickname, or
-- 2) same customer name + same phone last-4.

begin;

create or replace function public.ff_register_participant(
  p_session_id uuid,
  p_customer_name text,
  p_phone_last4 text,
  p_naver_handle text,
  p_visit_date date default current_date,
  p_device_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.review_event_sessions%rowtype;
  v_name text;
  v_phone text;
  v_naver_handle text;
  v_naver_key text;
  v_cooldown_days integer;
  v_basis_date date;
  v_next_date date;
  v_existing public.review_event_participants%rowtype;
  v_participant public.review_event_participants%rowtype;
  v_flags text[] := '{}';
  v_chart_code text;
begin
  select * into v_session
  from public.review_event_sessions
  where id = p_session_id
    and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'code', 'invalid_session', 'message', 'Session is not active.');
  end if;

  v_name := left(nullif(btrim(regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g')), ''), 80);
  v_phone := regexp_replace(coalesce(p_phone_last4, ''), '\D', '', 'g');
  v_naver_handle := left(nullif(btrim(regexp_replace(coalesce(p_naver_handle, ''), '\s+', ' ', 'g')), ''), 120);
  v_naver_key := public.ff_normalize_key(v_naver_handle);

  if v_name is null or v_phone !~ '^[0-9]{4}$' or v_naver_key = '' then
    return jsonb_build_object('ok', false, 'code', 'invalid_input', 'message', 'Please check name, phone last-4, and review nickname.');
  end if;

  perform pg_advisory_xact_lock(hashtext('review-event-register:' || v_naver_key)::bigint);
  perform pg_advisory_xact_lock(hashtext('review-event-register-name-phone:' || public.ff_normalize_key(v_name) || ':' || v_phone)::bigint);

  select cooldown_days into v_cooldown_days
  from public.review_event_settings
  where id = 'default';

  select *
  into v_existing
  from public.review_event_participants p
  where p.visit_date = coalesce(p_visit_date, current_date)
    and (
      p.naver_key = v_naver_key
      or (
        public.ff_normalize_key(p.customer_name) = public.ff_normalize_key(v_name)
        and p.phone_last4 = v_phone
      )
    )
  order by p.created_at desc
  limit 1;

  if found then
    perform public.ff_write_audit(
      'customer',
      'duplicate_registration_blocked',
      'review_event_participants',
      v_existing.id,
      p_session_id,
      v_existing.id,
      jsonb_build_object('visitDate', p_visit_date, 'rule', 'same_naver_or_same_name_phone')
    );

    return jsonb_build_object(
      'ok', false,
      'code', 'duplicate_today',
      'message', 'Existing same-day participation found.',
      'payload', public.ff_participant_payload(v_existing.id)
    );
  end if;

  select coalesce(gift_completed_at::date, visit_date)
  into v_basis_date
  from public.review_event_participants p
  where p.naver_key = v_naver_key
  order by coalesce(gift_completed_at::date, visit_date) desc
  limit 1;

  if v_basis_date is not null then
    v_next_date := v_basis_date + v_cooldown_days;
    if coalesce(p_visit_date, current_date) < v_next_date then
      perform public.ff_write_audit(
        'customer',
        'naver_cooldown_blocked',
        'review_event_participants',
        null,
        p_session_id,
        null,
        jsonb_build_object('nextEligibleDate', v_next_date, 'cooldownDays', v_cooldown_days)
      );

      return jsonb_build_object(
        'ok', false,
        'code', 'cooldown',
        'message', 'Naver ID/review nickname is still in cooldown.',
        'nextEligibleDate', v_next_date
      );
    end if;
  end if;

  if exists (
    select 1
    from public.review_event_participants p
    where public.ff_normalize_key(p.customer_name) = public.ff_normalize_key(v_name)
      and p.phone_last4 = v_phone
  ) then
    v_flags := array_append(v_flags, 'Same name and phone last-4 participation history exists.');
  end if;

  if p_device_key is not null and (
    select count(*)
    from public.review_event_participants p
    where p.device_key = p_device_key
      and p.created_at > now() - interval '10 minutes'
  ) >= 2 then
    v_flags := array_append(v_flags, 'Repeated participation from the same device was detected.');
  end if;

  insert into public.review_event_participants (
    session_id,
    customer_name,
    phone_last4,
    naver_handle,
    naver_key,
    visit_date,
    device_key,
    flags
  )
  values (
    p_session_id,
    v_name,
    v_phone,
    v_naver_handle,
    v_naver_key,
    coalesce(p_visit_date, current_date),
    nullif(p_device_key, ''),
    v_flags
  )
  returning * into v_participant;

  v_chart_code := 'QR-' || to_char(v_participant.visit_date, 'YYMMDD') || '-' ||
    v_phone || '-' || upper(right(replace(v_participant.id::text, '-', ''), 3));

  update public.review_event_participants
  set chart_code = v_chart_code
  where id = v_participant.id
  returning * into v_participant;

  perform public.ff_write_audit(
    'customer',
    'participant_created',
    'review_event_participants',
    v_participant.id,
    p_session_id,
    v_participant.id,
    jsonb_build_object('chartCode', v_chart_code, 'flags', v_flags)
  );

  return jsonb_build_object(
    'ok', true,
    'code', 'created',
    'payload', public.ff_participant_payload(v_participant.id)
  );
end;
$$;

commit;
